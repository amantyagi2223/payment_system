import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, SupportKnowledgeSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CrawledPage = {
  url: string;
  title: string;
  content: string;
  keywords: string[];
};

type PageFetchResult = {
  page: CrawledPage | null;
  reason: 'ok' | 'http_status' | 'non_html' | 'too_short' | 'fetch_error';
  status?: number;
  contentType?: string;
  error?: string;
};

type StandardKnowledgeItem = {
  slug: string;
  title: string;
  sourceType: SupportKnowledgeSourceType;
  sourcePath: string;
  keywords: string[];
  content: string;
};

@Injectable()
export class SupportKnowledgeAutoSyncService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SupportKnowledgeAutoSyncService.name);
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncStartedAt = 0;
  private lastSyncFinishedAt: Date | null = null;
  private lastSyncReason: string | null = null;
  private lastSyncSummary: Record<string, any> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.ensureStandardKnowledgeBaseline();

    if (!this.isAutoSyncEnabled()) {
      this.logger.log('Website auto-sync for support knowledge is disabled');
      return;
    }

    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      this.logger.warn(
        'Support website base URL is missing. Set SUPPORT_WEBSITE_BASE_URL (or FRONTEND_BASE_URL) for auto website RAG sync.',
      );
      return;
    }

    setTimeout(() => {
      void this.syncNow('startup');
    }, 1_500);

    this.syncTimer = setInterval(() => {
      void this.syncNow('interval');
    }, this.getSyncIntervalMs());
  }

  getStatus() {
    return {
      enabled: this.isAutoSyncEnabled(),
      baseUrl: this.getBaseUrl() || null,
      isSyncing: this.isSyncing,
      lastSyncStartedAt: this.lastSyncStartedAt
        ? new Date(this.lastSyncStartedAt).toISOString()
        : null,
      lastSyncFinishedAt: this.lastSyncFinishedAt?.toISOString() ?? null,
      lastSyncReason: this.lastSyncReason,
      lastSyncSummary: this.lastSyncSummary,
    };
  }

  onModuleDestroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  triggerBackgroundSync(reason = 'chat-request') {
    if (!this.isAutoSyncEnabled()) {
      return;
    }

    if (!this.getBaseUrl()) {
      return;
    }

    if (this.isSyncing) {
      return;
    }

    if (Date.now() - this.lastSyncStartedAt < this.getMinSyncGapMs()) {
      return;
    }

    void this.syncNow(reason);
  }

  private async ensureStandardKnowledgeBaseline() {
    const items = this.getStandardKnowledgeItems();
    let created = 0;
    let updated = 0;

    for (const item of items) {
      const existing = await this.prisma.supportKnowledgeEntry.findUnique({
        where: { slug: item.slug },
        select: { id: true, title: true, content: true, keywords: true },
      });

      const embeddingPayload = await this.generateEmbeddingPayload(
        item.title,
        item.content,
        item.keywords,
      );

      if (existing) {
        const unchanged =
          existing.title === item.title &&
          existing.content === item.content &&
          this.sameKeywords(existing.keywords, item.keywords);

        if (!unchanged) {
          await this.prisma.supportKnowledgeEntry.update({
            where: { id: existing.id },
            data: {
              title: item.title,
              content: item.content,
              sourceType: item.sourceType,
              sourcePath: item.sourcePath,
              keywords: item.keywords,
              isActive: true,
              embedding: embeddingPayload.embedding,
              embeddingModel: embeddingPayload.model,
            },
          });
          updated += 1;
        }
        continue;
      }

      await this.prisma.supportKnowledgeEntry.create({
        data: {
          title: item.title,
          slug: item.slug,
          content: item.content,
          sourceType: item.sourceType,
          sourcePath: item.sourcePath,
          keywords: item.keywords,
          isActive: true,
          embedding: embeddingPayload.embedding,
          embeddingModel: embeddingPayload.model,
        },
      });
      created += 1;
    }

    if (created > 0 || updated > 0) {
      this.logger.log(
        `Standard support knowledge baseline ensured: created=${created}, updated=${updated}`,
      );
    }
  }

  private async syncNow(reason: string) {
    if (this.isSyncing) {
      return;
    }

    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncStartedAt = Date.now();
    this.lastSyncReason = reason;

    try {
      const targetUrls = await this.resolveTargetUrls(baseUrl);
      if (targetUrls.length === 0) {
        this.logger.warn('No website URLs found for auto support knowledge sync');
        this.lastSyncSummary = {
          reason,
          urls: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          skipReasons: {},
        };
        return;
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      const skipReasons: Record<string, number> = {};

      for (const url of targetUrls) {
        try {
          const pageResult = await this.fetchWebsitePage(url);
          if (!pageResult.page) {
            skipped += 1;
            skipReasons[pageResult.reason] = (skipReasons[pageResult.reason] || 0) + 1;

            if (this.isDebugEnabled()) {
              this.logger.warn(
                `Website RAG sync skip url=${url} reason=${pageResult.reason} status=${
                  pageResult.status ?? 'n/a'
                } contentType=${pageResult.contentType ?? 'n/a'} error=${
                  pageResult.error ?? 'n/a'
                }`,
              );
            }
            continue;
          }

          const action = await this.upsertPageKnowledge(pageResult.page);
          if (action === 'created') {
            created += 1;
          } else if (action === 'updated') {
            updated += 1;
          } else {
            skipped += 1;
          }
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Website RAG sync failed for ${url}: ${message}`);
        }
      }

      this.lastSyncSummary = {
        reason,
        urls: targetUrls.length,
        created,
        updated,
        skipped,
        failed,
        skipReasons,
      };

      this.logger.log(
        `Website support sync (${reason}) completed: created=${created}, updated=${updated}, skipped=${skipped}, failed=${failed}, urls=${targetUrls.length}, skipReasons=${JSON.stringify(skipReasons)}`,
      );
    } finally {
      this.isSyncing = false;
      this.lastSyncFinishedAt = new Date();
    }
  }

  private async resolveTargetUrls(baseUrl: string) {
    const configured = this.getConfiguredUrls(baseUrl);
    if (configured.length > 0) {
      return configured;
    }

    const sitemapUrls = await this.getSitemapUrls(baseUrl);
    if (sitemapUrls.length > 0) {
      return sitemapUrls;
    }

    return this.getDefaultUrls(baseUrl);
  }

  private getConfiguredUrls(baseUrl: string) {
    const raw = process.env.SUPPORT_WEBSITE_URLS?.trim();
    if (!raw) {
      return [];
    }

    const unique = new Set<string>();
    const values = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    for (const value of values) {
      const normalized = this.toAbsoluteUrl(baseUrl, value);
      if (normalized) {
        unique.add(normalized);
      }
    }

    return Array.from(unique).slice(0, this.getMaxPages());
  }

  private async getSitemapUrls(baseUrl: string) {
    const sitemapUrl = this.toAbsoluteUrl(baseUrl, '/sitemap.xml');
    if (!sitemapUrl) {
      return [];
    }

    try {
      const response = await this.fetchWithTimeout(
        sitemapUrl,
        this.getFetchTimeoutMs(),
      );
      if (!response.ok) {
        return [];
      }

      const xml = await response.text();
      const matches = xml.match(/<loc>(.*?)<\/loc>/g) ?? [];
      const unique = new Set<string>();

      for (const match of matches) {
        const url = match.replace('<loc>', '').replace('</loc>', '').trim();
        const normalized = this.toAbsoluteUrl(baseUrl, url);
        if (normalized) {
          unique.add(normalized);
        }
      }

      return Array.from(unique).slice(0, this.getMaxPages());
    } catch {
      return [];
    }
  }

  private getDefaultUrls(baseUrl: string) {
    const defaults = [
      '/',
      '/faq',
      '/help',
      '/support',
      '/checkout',
      '/orders',
      '/payments',
      '/shipping',
      '/delivery',
      '/refund',
      '/contact',
      '/terms',
      '/privacy',
    ];

    const unique = new Set<string>();
    for (const path of defaults) {
      const normalized = this.toAbsoluteUrl(baseUrl, path);
      if (normalized) {
        unique.add(normalized);
      }
    }

    return Array.from(unique).slice(0, this.getMaxPages());
  }

  private async fetchWebsitePage(url: string): Promise<PageFetchResult> {
    let response: Response;
    try {
      response = await this.fetchWithTimeout(url, this.getFetchTimeoutMs());
    } catch (error) {
      return {
        page: null,
        reason: 'fetch_error',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    if (!response.ok) {
      return {
        page: null,
        reason: 'http_status',
        status: response.status,
      };
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml')
    ) {
      return {
        page: null,
        reason: 'non_html',
        contentType,
      };
    }

    const html = await response.text();
    const title = this.extractHtmlTitle(html) || this.deriveTitleFromUrl(url);
    const text = this.extractTextFromHtml(html);
    if (text.length < 80) {
      return {
        page: null,
        reason: 'too_short',
      };
    }

    const content = text.slice(0, this.getMaxContentChars());
    const keywords = this.deriveKeywords(title, url, content);

    return {
      page: {
        url,
        title,
        content,
        keywords,
      },
      reason: 'ok',
      contentType,
      status: response.status,
    };
  }

  private async upsertPageKnowledge(page: CrawledPage) {
    const existing = await this.prisma.supportKnowledgeEntry.findFirst({
      where: {
        sourceType: SupportKnowledgeSourceType.PAGE,
        sourcePath: page.url,
      },
      select: {
        id: true,
        title: true,
        content: true,
        keywords: true,
        embedding: true,
      },
    });

    const embeddingPayload = await this.generateEmbeddingPayload(
      page.title,
      page.content,
      page.keywords,
    );

    if (existing) {
      const unchanged =
        existing.title === page.title &&
        existing.content === page.content &&
        this.sameKeywords(existing.keywords, page.keywords);

      if (unchanged) {
        await this.prisma.supportKnowledgeEntry.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            ...(existing.embedding ? {} : { embedding: embeddingPayload.embedding }),
            ...(existing.embedding
              ? {}
              : { embeddingModel: embeddingPayload.model }),
          },
        });
        return 'skipped';
      }

      await this.prisma.supportKnowledgeEntry.update({
        where: { id: existing.id },
        data: {
          title: page.title,
          content: page.content,
          keywords: page.keywords,
          isActive: true,
          embedding: embeddingPayload.embedding,
          embeddingModel: embeddingPayload.model,
        },
      });
      return 'updated';
    }

    const slugBase = this.slugify(
      `auto-page-${new URL(page.url).hostname}-${new URL(page.url).pathname}`,
    );
    const slug = await this.ensureUniqueSlug(slugBase);

    await this.prisma.supportKnowledgeEntry.create({
      data: {
        title: page.title,
        slug,
        content: page.content,
        sourceType: SupportKnowledgeSourceType.PAGE,
        sourcePath: page.url,
        keywords: page.keywords,
        isActive: true,
        embedding: embeddingPayload.embedding,
        embeddingModel: embeddingPayload.model,
      },
    });

    return 'created';
  }

  private async generateEmbeddingPayload(
    title: string,
    content: string,
    keywords: string[],
  ): Promise<{ embedding: Prisma.InputJsonValue | null; model: string | null }> {
    const vector = await this.generateEmbedding(
      `${title}\n${content}\n${
        keywords.length ? `Keywords: ${keywords.join(', ')}` : ''
      }`,
    );

    if (!vector) {
      return { embedding: null, model: null };
    }

    const model =
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small';
    return {
      embedding: vector as unknown as Prisma.InputJsonValue,
      model,
    };
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return null;
    }

    const input = text.trim().slice(0, 7000);
    if (!input) {
      return null;
    }

    const model =
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small';

    try {
      const response = await this.fetchWithTimeout(
        'https://api.openai.com/v1/embeddings',
        this.getFetchTimeoutMs(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            input,
          }),
        },
      );

      if (!response.ok) {
        return null;
      }

      const payload: any = await response.json();
      const vector = payload?.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length === 0) {
        return null;
      }

      const normalized = vector
        .map((value: any) => Number(value))
        .filter((value: number) => Number.isFinite(value));

      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  }

  private async fetchWithTimeout(
    url: string,
    timeoutMs: number,
    init?: RequestInit,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractHtmlTitle(html: string) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match) {
      return '';
    }
    return this.decodeHtmlEntities(match[1]).trim().slice(0, 160);
  }

  private deriveTitleFromUrl(url: string) {
    try {
      const parsed = new URL(url);
      const last = parsed.pathname.split('/').filter(Boolean).pop() || 'home';
      return last
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    } catch {
      return 'Website Support Page';
    }
  }

  private extractTextFromHtml(html: string) {
    const withoutScript = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

    const withBreaks = withoutScript.replace(
      /<\/(p|div|li|h1|h2|h3|h4|h5|h6|section|article|br|tr)>/gi,
      '\n',
    );

    const stripped = withBreaks.replace(/<[^>]+>/g, ' ');
    const decoded = this.decodeHtmlEntities(stripped);

    return decoded
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
  }

  private decodeHtmlEntities(value: string) {
    return value
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  private deriveKeywords(title: string, url: string, content: string) {
    const fromTitle = title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);

    const fromPath = (() => {
      try {
        return new URL(url)
          .pathname.toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length > 2);
      } catch {
        return [] as string[];
      }
    })();

    const supportTerms = content
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) =>
        ['payment', 'order', 'wallet', 'address', 'invoice', 'shipping'].includes(
          token,
        ),
      );

    const unique = new Set<string>([
      ...fromTitle,
      ...fromPath,
      ...supportTerms,
      'website',
      'auto-sync',
    ]);

    return Array.from(unique).slice(0, 30);
  }

  private sameKeywords(a: string[], b: string[]) {
    if (a.length !== b.length) {
      return false;
    }

    const left = [...a].sort();
    const right = [...b].sort();
    return left.every((value, index) => value === right[index]);
  }

  private isDebugEnabled() {
    const value = process.env.CHAT_DEBUG_LOGS?.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160);

    return slug || 'auto-page';
  }

  private async ensureUniqueSlug(baseSlug: string) {
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.supportKnowledgeEntry.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      suffix += 1;
      candidate = `${baseSlug}-${suffix}`.slice(0, 180);
    }
  }

  private toAbsoluteUrl(baseUrl: string, pathOrUrl: string) {
    try {
      return new URL(pathOrUrl).toString();
    } catch {
      try {
        return new URL(pathOrUrl, baseUrl).toString();
      } catch {
        return null;
      }
    }
  }

  private getStandardKnowledgeItems(): StandardKnowledgeItem[] {
    return [
      {
        slug: 'std-refund-policy',
        title: 'Refund Policy and Dispute Handling',
        sourceType: SupportKnowledgeSourceType.POLICY,
        sourcePath: 'system://refund-policy',
        keywords: ['refund', 'return', 'cancel', 'chargeback', 'policy'],
        content:
          'Refund approval depends on verified order and payment records. Support must collect order ID, tx hash, amount, network, and issue reason before sharing refund next steps. Do not promise refund until verification is complete.',
      },
      {
        slug: 'std-order-status-guide',
        title: 'Order Status Guide',
        sourceType: SupportKnowledgeSourceType.POLICY,
        sourcePath: 'system://order-status',
        keywords: ['order', 'status', 'created', 'pending', 'paid', 'failed'],
        content:
          'Order statuses: CREATED, PENDING_PAYMENT, PAID, FAILED, EXPIRED. Support should explain current status first, then tell customer the next concrete action.',
      },
      {
        slug: 'std-payment-confirmation-guide',
        title: 'Payment Confirmation Guide',
        sourceType: SupportKnowledgeSourceType.FAQ,
        sourcePath: 'system://payment-confirmation',
        keywords: ['payment', 'confirmations', 'pending', 'confirmed', 'tx'],
        content:
          'PENDING means transaction detected but not fully confirmed. CONFIRMED means validations passed with required confirmations. Ask customer to avoid duplicate payments while pending.',
      },
      {
        slug: 'std-wrong-network-token',
        title: 'Wrong Network or Token Troubleshooting',
        sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
        sourcePath: 'system://wrong-network-token',
        keywords: ['wrong network', 'wrong token', 'asset mismatch', 'payment issue'],
        content:
          'Payment can fail detection when token or blockchain network does not match expected checkout asset. Always verify expected asset/network versus actual transaction data.',
      },
      {
        slug: 'std-under-over-payment',
        title: 'Underpayment and Overpayment Handling',
        sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
        sourcePath: 'system://amount-mismatch',
        keywords: ['underpayment', 'overpayment', 'amount mismatch', 'invoice'],
        content:
          'If paid amount differs from expected invoice amount, support must compare exact values from records and guide customer with status-based next steps. No generic confirmation without amount validation.',
      },
      {
        slug: 'std-address-checkout-policy',
        title: 'Address and Checkout Validation Rules',
        sourceType: SupportKnowledgeSourceType.POLICY,
        sourcePath: 'system://address-checkout',
        keywords: ['address', 'checkout', 'delivery', 'shipping'],
        content:
          'Delivery address must belong to authenticated customer and be active. If address validation fails, customer should reselect active address and retry order creation.',
      },
      {
        slug: 'std-stock-merchant-policy',
        title: 'Stock and Merchant Cart Constraints',
        sourceType: SupportKnowledgeSourceType.POLICY,
        sourcePath: 'system://stock-merchant',
        keywords: ['stock', 'inventory', 'merchant', 'cart', 'checkout'],
        content:
          'Checkout fails when requested quantity exceeds stock or products come from multiple merchants in one order. Support should verify stock and merchant consistency.',
      },
      {
        slug: 'std-support-data-checklist',
        title: 'Support Data Checklist',
        sourceType: SupportKnowledgeSourceType.POLICY,
        sourcePath: 'system://support-checklist',
        keywords: ['order id', 'invoice id', 'tx hash', 'support', 'checklist'],
        content:
          'For payment/order issues collect: order ID, invoice ID (if available), transaction hash, network, amount, and approximate payment time. Missing identifiers reduce diagnostic accuracy.',
      },
      {
        slug: 'std-ecommerce-support-style',
        title: 'Ecommerce Support Response Style',
        sourceType: SupportKnowledgeSourceType.POLICY,
        sourcePath: 'system://support-style',
        keywords: ['support style', 'specific', 'next step', 'customer service'],
        content:
          'Support replies should be specific and action-oriented: what system shows now, what is missing, and what customer should do next. Avoid vague reassurance.',
      },
      {
        slug: 'std-network-support',
        title: 'Supported Blockchain Families',
        sourceType: SupportKnowledgeSourceType.FAQ,
        sourcePath: 'system://supported-networks',
        keywords: ['network', 'evm', 'tron', 'crypto payment'],
        content:
          'The platform supports EVM-family and TRON-family networks. Network mismatch can prevent automatic payment validation for an order.',
      },
    ];
  }

  private getBaseUrl() {
    const raw =
      process.env.SUPPORT_WEBSITE_BASE_URL?.trim() ||
      process.env.FRONTEND_BASE_URL?.trim() ||
      process.env.CUSTOMER_FRONTEND_URL?.trim() ||
      '';

    if (!raw) {
      return '';
    }

    return this.toAbsoluteUrl(raw, raw) || '';
  }

  private isAutoSyncEnabled() {
    return process.env.SUPPORT_WEBSITE_AUTO_SYNC?.trim().toLowerCase() !== 'false';
  }

  private getSyncIntervalMs() {
    const value = Number(process.env.SUPPORT_WEBSITE_SYNC_INTERVAL_MS || 30 * 60_000);
    return Number.isFinite(value) && value >= 60_000 ? value : 30 * 60_000;
  }

  private getMinSyncGapMs() {
    const value = Number(process.env.SUPPORT_WEBSITE_MIN_SYNC_GAP_MS || 5 * 60_000);
    return Number.isFinite(value) && value >= 30_000 ? value : 5 * 60_000;
  }

  private getFetchTimeoutMs() {
    const value = Number(process.env.SUPPORT_WEBSITE_FETCH_TIMEOUT_MS || 12_000);
    return Number.isFinite(value) && value >= 2_000 ? value : 12_000;
  }

  private getMaxPages() {
    const value = Number(process.env.SUPPORT_WEBSITE_MAX_PAGES || 25);
    return Number.isFinite(value) && value >= 1 ? Math.min(value, 200) : 25;
  }

  private getMaxContentChars() {
    const value = Number(process.env.SUPPORT_WEBSITE_MAX_CONTENT_CHARS || 14_000);
    return Number.isFinite(value) && value >= 500
      ? Math.min(value, 40_000)
      : 14_000;
  }
}
