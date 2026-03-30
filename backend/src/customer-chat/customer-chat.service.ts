import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChatRole, Prisma, SupportKnowledgeSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SendCustomerChatMessageDto } from './dto/send-customer-chat-message.dto';
import { ListCustomerChatSessionsDto } from './dto/list-customer-chat-sessions.dto';
import { ListCustomerChatMessagesDto } from './dto/list-customer-chat-messages.dto';
import { ListSupportKnowledgeEntriesDto } from './dto/list-support-knowledge-entries.dto';
import { CreateSupportKnowledgeEntryDto } from './dto/create-support-knowledge-entry.dto';
import { UpdateSupportKnowledgeEntryDto } from './dto/update-support-knowledge-entry.dto';
import { ImportSupportKnowledgeBatchDto } from './dto/import-support-knowledge-batch.dto';
import { SupportKnowledgeAutoSyncService } from './support-knowledge-auto-sync.service';
import { GetCustomerChatDiagnosticsDto } from './dto/get-customer-chat-diagnostics.dto';

type RagDocumentType =
  | 'SUMMARY'
  | 'ORDER'
  | 'PAYMENT'
  | 'WALLET'
  | 'ADDRESS'
  | 'KNOWLEDGE';

type RagDocument = {
  id: string;
  type: RagDocumentType;
  title: string;
  text: string;
  sourceType?: string;
  sourcePath?: string | null;
  keywords?: string[];
  embedding?: number[];
};

type ScoredRagDocument = RagDocument & { score: number };

type ChatOpenAiDiagnostics = {
  keyConfigured: boolean;
  chatModel: string;
  embeddingModel: string;
  lastHealthCheckAt: Date | null;
  lastChatRequestAt: Date | null;
  lastChatSuccessAt: Date | null;
  lastEmbeddingRequestAt: Date | null;
  lastEmbeddingSuccessAt: Date | null;
  chatOk: boolean | null;
  embeddingOk: boolean | null;
  lastError: string | null;
  lastFallbackAt: Date | null;
  lastFallbackReason: string | null;
  lastReplySource: 'openai' | 'fallback' | null;
  lastReplyPreview: string | null;
  lastSelectedSources: Array<{
    id: string;
    type: string;
    title: string;
    sourceType: string | null;
    sourcePath: string | null;
  }>;
};

@Injectable()
export class CustomerChatService {
  private readonly logger = new Logger(CustomerChatService.name);
  private static readonly STOPWORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'have',
    'how',
    'i',
    'in',
    'is',
    'it',
    'me',
    'my',
    'of',
    'on',
    'or',
    'our',
    'please',
    'the',
    'to',
    'was',
    'what',
    'when',
    'where',
    'which',
    'with',
    'you',
    'your',
  ]);

  private readonly openAiDiagnostics: ChatOpenAiDiagnostics = {
    keyConfigured: false,
    chatModel: '',
    embeddingModel: '',
    lastHealthCheckAt: null,
    lastChatRequestAt: null,
    lastChatSuccessAt: null,
    lastEmbeddingRequestAt: null,
    lastEmbeddingSuccessAt: null,
    chatOk: null,
    embeddingOk: null,
    lastError: null,
    lastFallbackAt: null,
    lastFallbackReason: null,
    lastReplySource: null,
    lastReplyPreview: null,
    lastSelectedSources: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly supportKnowledgeAutoSyncService: SupportKnowledgeAutoSyncService,
  ) {}

  async sendMessage(customerId: string, dto: SendCustomerChatMessageDto) {
    this.supportKnowledgeAutoSyncService.triggerBackgroundSync(
      'customer-chat-message',
    );
    this.maybeRunOpenAiHealthCheck();

    const text = dto.message.trim();
    if (!text) {
      throw new BadRequestException('Message cannot be empty');
    }

    let session = dto.sessionId
      ? await this.prisma.customerChatSession.findFirst({
          where: { id: dto.sessionId, customerId },
          select: { id: true, title: true },
        })
      : null;

    if (!session && dto.sessionId) {
      throw new NotFoundException('Chat session not found');
    }

    if (!session) {
      session = await this.prisma.customerChatSession.create({
        data: {
          customerId,
          title: this.deriveSessionTitle(text),
        },
        select: { id: true, title: true },
      });
    }

    const userMessage = await this.prisma.customerChatMessage.create({
      data: {
        sessionId: session.id,
        role: ChatRole.USER,
        content: text,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    const [history, customerDocuments, knowledgeDocuments] = await Promise.all([
      this.prisma.customerChatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 16,
      }),
      this.buildCustomerRagDocuments(customerId, text),
      this.buildKnowledgeRagDocuments(text),
    ]);

    const chronologicalHistory = [...history].reverse();
    const selectedCustomerDocs = this.selectTopDocuments(text, customerDocuments, {
      limit: 8,
    });
    const prioritizeKnowledge =
      /\b(refund|return|cancel|policy|chargeback|dispute|terms)\b/i.test(text);
    const selectedDocs = (
      prioritizeKnowledge
        ? [...knowledgeDocuments, ...selectedCustomerDocs]
        : [...selectedCustomerDocs, ...knowledgeDocuments]
    ).slice(0, 16);

    const sources = selectedDocs.map((doc) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      sourceType: doc.sourceType ?? null,
      sourcePath: doc.sourcePath ?? null,
      keywords: doc.keywords ?? [],
    }));
    this.openAiDiagnostics.lastSelectedSources = sources.map((source) => ({
      id: source.id,
      type: source.type,
      title: source.title,
      sourceType: source.sourceType,
      sourcePath: source.sourcePath,
    }));

    if (this.isDebugEnabled()) {
      this.logger.log(
        `Chat RAG selected sources: ${sources
          .map((source) => `${source.type}:${source.title}`)
          .join(' | ')}`,
      );
    }

    let assistantText: string;
    let replySource: 'openai' | 'fallback' = 'openai';
    try {
      assistantText = await this.askOpenAi(chronologicalHistory, selectedDocs);
      if (this.needsRefundTemplateOverride(text, assistantText)) {
        this.logger.warn(
          'Detected generic refund-template response for non-refund query; retrying with stricter instruction.',
        );
        assistantText = await this.askOpenAi(
          chronologicalHistory,
          selectedDocs,
          'The previous response incorrectly asked for refund details. Answer the user query directly and do not mention refund unless explicitly asked.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI chat request failed: ${message}`);
      this.openAiDiagnostics.lastFallbackAt = new Date();
      this.openAiDiagnostics.lastFallbackReason = message;
      this.openAiDiagnostics.chatOk = false;
      this.openAiDiagnostics.lastError = message;
      assistantText = this.buildFallbackReply(selectedDocs, message);
      replySource = 'fallback';
    }

    this.openAiDiagnostics.lastReplySource = replySource;
    this.openAiDiagnostics.lastReplyPreview = assistantText.slice(0, 220);
    if (this.isDebugEnabled()) {
      this.logger.log(
        `Chat response source=${replySource} preview=${assistantText
          .slice(0, 140)
          .replace(/\s+/g, ' ')}`,
      );
    }

    const assistantMessage = await this.prisma.customerChatMessage.create({
      data: {
        sessionId: session.id,
        role: ChatRole.ASSISTANT,
        content: assistantText,
        sources,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    await this.prisma.customerChatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    return {
      sessionId: session.id,
      sessionTitle: session.title,
      userMessage: {
        id: userMessage.id,
        content: text,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        content: assistantText,
        sources,
        source: replySource,
        createdAt: assistantMessage.createdAt,
      },
    };
  }

  async listSessions(customerId: string, query: ListCustomerChatSessionsDto) {
    const limit = query.limit ?? 20;

    const sessions = await this.prisma.customerChatSession.findMany({
      where: { customerId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title ?? 'New Chat',
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session._count.messages,
        lastMessage: session.messages[0]
          ? {
              id: session.messages[0].id,
              role: session.messages[0].role,
              contentPreview: session.messages[0].content.slice(0, 200),
              createdAt: session.messages[0].createdAt,
            }
          : null,
      })),
    };
  }

  async listMessages(
    customerId: string,
    sessionId: string,
    query: ListCustomerChatMessagesDto,
  ) {
    const limit = query.limit ?? 50;

    const session = await this.prisma.customerChatSession.findFirst({
      where: {
        id: sessionId,
        customerId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const messages = await this.prisma.customerChatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        sources: true,
        createdAt: true,
      },
    });

    return {
      session,
      messages: messages.reverse(),
    };
  }

  async getDiagnostics(query: GetCustomerChatDiagnosticsDto) {
    if (query.liveCheck) {
      await this.runOpenAiHealthCheck();
    }

    return {
      openAi: {
        ...this.openAiDiagnostics,
        keyConfigured: !!process.env.OPENAI_API_KEY?.trim(),
        chatModel: process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4.1-mini',
        embeddingModel:
          process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small',
        lastHealthCheckAt: this.openAiDiagnostics.lastHealthCheckAt?.toISOString() ?? null,
        lastChatRequestAt: this.openAiDiagnostics.lastChatRequestAt?.toISOString() ?? null,
        lastChatSuccessAt: this.openAiDiagnostics.lastChatSuccessAt?.toISOString() ?? null,
        lastEmbeddingRequestAt:
          this.openAiDiagnostics.lastEmbeddingRequestAt?.toISOString() ?? null,
        lastEmbeddingSuccessAt:
          this.openAiDiagnostics.lastEmbeddingSuccessAt?.toISOString() ?? null,
        lastFallbackAt: this.openAiDiagnostics.lastFallbackAt?.toISOString() ?? null,
      },
      autoSync: this.supportKnowledgeAutoSyncService.getStatus(),
    };
  }

  async listKnowledgeEntries(query: ListSupportKnowledgeEntriesDto) {
    const limit = query.limit ?? 50;
    const search = query.search?.trim();

    const where: Prisma.SupportKnowledgeEntryWhereInput = {
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              { keywords: { has: search.toLowerCase() } },
            ],
          }
        : {}),
    };

    const entries = await this.prisma.supportKnowledgeEntry.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        sourceType: true,
        sourcePath: true,
        keywords: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { entries };
  }

  async createKnowledgeEntry(dto: CreateSupportKnowledgeEntryDto) {
    const content = dto.content.trim();
    const title = dto.title.trim();

    if (!title || !content) {
      throw new BadRequestException('title and content are required');
    }

    const slugSeed = dto.slug?.trim() || title;
    const uniqueSlug = await this.ensureUniqueSlug(this.slugify(slugSeed));
    const keywords = this.normalizeKeywords(dto.keywords);
    const embeddingPayload = await this.generateEmbeddingPayload(
      title,
      content,
      keywords,
    );

    return this.prisma.supportKnowledgeEntry.create({
      data: {
        title,
        slug: uniqueSlug,
        content,
        sourceType: dto.sourceType ?? SupportKnowledgeSourceType.FAQ,
        sourcePath: dto.sourcePath?.trim() || null,
        keywords,
        embedding: embeddingPayload.embedding,
        embeddingModel: embeddingPayload.model,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateKnowledgeEntry(
    entryId: string,
    dto: UpdateSupportKnowledgeEntryDto,
  ) {
    const existing = await this.prisma.supportKnowledgeEntry.findUnique({
      where: { id: entryId },
    });

    if (!existing) {
      throw new NotFoundException('Knowledge entry not found');
    }

    const nextTitle = dto.title?.trim() ?? existing.title;
    const nextContent = dto.content?.trim() ?? existing.content;
    const nextKeywords =
      dto.keywords === undefined
        ? existing.keywords
        : this.normalizeKeywords(dto.keywords);

    const shouldRebuildEmbedding =
      dto.title !== undefined ||
      dto.content !== undefined ||
      dto.keywords !== undefined;

    const embeddingPayload = shouldRebuildEmbedding
      ? await this.generateEmbeddingPayload(nextTitle, nextContent, nextKeywords)
      : {
          embedding: existing.embedding,
          model: existing.embeddingModel,
        };

    const slugChanged = dto.slug !== undefined && dto.slug.trim().length > 0;
    const nextSlug = slugChanged
      ? await this.ensureUniqueSlug(this.slugify(dto.slug as string), entryId)
      : existing.slug;

    return this.prisma.supportKnowledgeEntry.update({
      where: { id: entryId },
      data: {
        title: nextTitle,
        slug: nextSlug,
        content: nextContent,
        sourceType: dto.sourceType ?? existing.sourceType,
        sourcePath:
          dto.sourcePath === undefined
            ? existing.sourcePath
            : dto.sourcePath.trim() || null,
        keywords: nextKeywords,
        embedding: embeddingPayload.embedding,
        embeddingModel: embeddingPayload.model,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deactivateKnowledgeEntry(entryId: string) {
    const existing = await this.prisma.supportKnowledgeEntry.findUnique({
      where: { id: entryId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Knowledge entry not found');
    }

    return this.prisma.supportKnowledgeEntry.update({
      where: { id: entryId },
      data: { isActive: false },
      select: {
        id: true,
        slug: true,
        title: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async importKnowledgeBatch(dto: ImportSupportKnowledgeBatchDto) {
    const replaceBySlug = dto.replaceBySlug ?? true;

    let created = 0;
    let updated = 0;
    const failures: Array<{ index: number; slug?: string; reason: string }> = [];

    for (let index = 0; index < dto.items.length; index += 1) {
      const item = dto.items[index];
      const providedSlug = item.slug?.trim();
      const slug = this.slugify(providedSlug || item.title);

      try {
        const existing = replaceBySlug
          ? await this.prisma.supportKnowledgeEntry.findUnique({
              where: { slug },
            })
          : null;

        if (existing) {
          await this.updateKnowledgeEntry(existing.id, {
            title: item.title,
            content: item.content,
            sourceType: item.sourceType,
            sourcePath: item.sourcePath,
            keywords: item.keywords,
            isActive: item.isActive ?? true,
          });
          updated += 1;
          continue;
        }

        await this.createKnowledgeEntry({
          ...item,
          slug,
        });
        created += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        failures.push({
          index,
          slug,
          reason,
        });
      }
    }

    return {
      requested: dto.items.length,
      created,
      updated,
      failed: failures.length,
      failures,
    };
  }

  private async buildCustomerRagDocuments(customerId: string, query: string) {
    const [customer, orders, payments, wallets, addresses] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: { customerId },
        orderBy: { updatedAt: 'desc' },
        take: 25,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          deliveryAddress: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              country: true,
              zipCode: true,
            },
          },
          items: {
            select: {
              quantity: true,
              subtotal: true,
              status: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                },
              },
            },
          },
          invoice: {
            select: {
              id: true,
              status: true,
              currency: true,
              amount: true,
              expiresAt: true,
              paidAt: true,
              wallet: {
                select: {
                  address: true,
                  network: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                      symbol: true,
                      chainId: true,
                    },
                  },
                },
              },
              payments: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 3,
                select: {
                  id: true,
                  txHash: true,
                  amount: true,
                  status: true,
                  tokenSymbol: true,
                  detectedAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.paymentTransaction.findMany({
        where: {
          invoice: {
            order: {
              customerId,
            },
          },
        },
        orderBy: { detectedAt: 'desc' },
        take: 30,
        include: {
          network: {
            select: {
              name: true,
              code: true,
              symbol: true,
              chainId: true,
            },
          },
          invoice: {
            select: {
              id: true,
              status: true,
              currency: true,
              amount: true,
              order: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.customerWallet.findMany({
        where: { customerId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          network: {
            select: {
              id: true,
              name: true,
              code: true,
              symbol: true,
              chainId: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.customerAddress.findMany({
        where: {
          customerId,
          isActive: true,
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        take: 10,
      }),
    ]);

    const documents: RagDocument[] = [];

    if (customer) {
      const paidOrderCount = orders.filter((order) => order.status === 'PAID').length;
      const pendingOrderCount = orders.filter(
        (order) => order.status === 'PENDING_PAYMENT',
      ).length;
      const failedOrderCount = orders.filter(
        (order) => order.status === 'FAILED' || order.status === 'EXPIRED',
      ).length;
      const confirmedPaymentCount = payments.filter(
        (payment) => payment.status === 'CONFIRMED',
      ).length;

      documents.push({
        id: `summary:${customer.id}`,
        type: 'SUMMARY',
        title: 'Customer Order and Payment Summary',
        text: [
          `Customer: ${customer.name} (${customer.email})`,
          `Total tracked orders: ${orders.length}`,
          `Orders paid: ${paidOrderCount}, pending payment: ${pendingOrderCount}, failed/expired: ${failedOrderCount}`,
          `Tracked payment transactions: ${payments.length}, confirmed payments: ${confirmedPaymentCount}`,
          `Saved delivery addresses: ${addresses.length}, customer wallets: ${wallets.length}`,
          `Query intent: ${query}`,
        ].join('\n'),
      });
    }

    for (const order of orders) {
      const itemPreview = order.items
        .slice(0, 5)
        .map(
          (item) =>
            `${item.quantity}x ${item.product.name} (${item.subtotal.toString()} ${item.product.currency}) [${item.status}]`,
        )
        .join('; ');

      const paymentPreview =
        order.invoice?.payments
          .map(
            (payment) =>
              `${payment.txHash} ${payment.amount.toString()} ${
                payment.tokenSymbol ?? order.invoice?.currency ?? ''
              } [${payment.status}]`,
          )
          .join('; ') ?? 'No payments detected for invoice';

      documents.push({
        id: order.id,
        type: 'ORDER',
        title: `Order ${order.id}`,
        text: [
          `Order ID: ${order.id}`,
          `Order status: ${order.status}, created: ${order.createdAt.toISOString()}, updated: ${order.updatedAt.toISOString()}`,
          `Amount: ${order.totalAmount.toString()} ${order.paymentCurrency ?? order.invoice?.currency ?? ''}`,
          `Merchant: ${order.merchant.name} (${order.merchant.email})`,
          `Invoice ID: ${order.invoice?.id ?? 'N/A'}, invoice status: ${order.invoice?.status ?? 'N/A'}, invoice amount: ${order.invoice?.amount?.toString() ?? 'N/A'} ${order.invoice?.currency ?? ''}`,
          `Invoice wallet: ${order.invoice?.wallet?.address ?? 'N/A'} on ${
            order.invoice?.wallet?.network?.code ??
            order.invoice?.wallet?.network?.name ??
            'N/A'
          }`,
          `Delivery address: ${
            order.deliveryAddress
              ? `${order.deliveryAddress.name}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state ?? ''}, ${order.deliveryAddress.country} ${order.deliveryAddress.zipCode}`
              : 'N/A'
          }`,
          `Items: ${itemPreview || 'No items'}`,
          `Latest payments: ${paymentPreview}`,
        ].join('\n'),
      });
    }

    for (const payment of payments) {
      documents.push({
        id: payment.id,
        type: 'PAYMENT',
        title: `Payment ${payment.txHash}`,
        text: [
          `Payment ID: ${payment.id}`,
          `Tx hash: ${payment.txHash}`,
          `Status: ${payment.status}, confirmations: ${payment.confirmations}`,
          `Amount: ${payment.amount.toString()} ${payment.tokenSymbol ?? payment.invoice?.currency ?? payment.network?.symbol ?? ''}`,
          `From: ${payment.fromAddress}, to: ${payment.toAddress}`,
          `Detected at: ${payment.detectedAt.toISOString()}, confirmed at: ${payment.confirmedAt?.toISOString() ?? 'N/A'}`,
          `Network: ${payment.network?.code ?? payment.network?.name ?? 'N/A'} (chainId ${payment.network?.chainId?.toString() ?? 'N/A'})`,
          `Invoice: ${payment.invoice?.id ?? 'N/A'}, invoice status: ${payment.invoice?.status ?? 'N/A'}`,
          `Order: ${payment.invoice?.order?.id ?? 'N/A'}, order status: ${payment.invoice?.order?.status ?? 'N/A'}`,
        ].join('\n'),
      });
    }

    for (const wallet of wallets) {
      documents.push({
        id: wallet.id,
        type: 'WALLET',
        title: `Customer Wallet ${wallet.address}`,
        text: [
          `Wallet ID: ${wallet.id}`,
          `Address: ${wallet.address}`,
          `Network: ${wallet.network.code ?? wallet.network.name} (${wallet.network.chainId.toString()})`,
          `Network symbol: ${wallet.network.symbol ?? 'N/A'}, network active: ${wallet.network.isActive}`,
          `Wallet used: ${wallet.isUsed}`,
          `Updated at: ${wallet.updatedAt.toISOString()}`,
        ].join('\n'),
      });
    }

    for (const address of addresses) {
      documents.push({
        id: address.id,
        type: 'ADDRESS',
        title: `Address ${address.name}`,
        text: [
          `Address ID: ${address.id}`,
          `Label: ${address.name}, type: ${address.addressType}, default: ${address.isDefault}`,
          `Street: ${address.street1}${address.street2 ? `, ${address.street2}` : ''}`,
          `City/State/Zip: ${address.city}, ${address.state ?? ''}, ${address.zipCode}`,
          `Country: ${address.country}`,
        ].join('\n'),
      });
    }

    return documents;
  }

  private async buildKnowledgeRagDocuments(query: string) {
    const dbEntries = await this.prisma.supportKnowledgeEntry.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: 400,
      select: {
        id: true,
        title: true,
        content: true,
        sourceType: true,
        sourcePath: true,
        keywords: true,
        embedding: true,
      },
    });

    const dbDocuments: RagDocument[] = dbEntries.map((entry) => ({
      id: `kb:${entry.id}`,
      type: 'KNOWLEDGE',
      title: entry.title,
      text: [
        entry.content,
        entry.keywords.length > 0 ? `Keywords: ${entry.keywords.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      sourceType: entry.sourceType,
      sourcePath: entry.sourcePath,
      keywords: entry.keywords,
      embedding: this.parseEmbedding(entry.embedding),
    }));

    const allKnowledgeDocs = [...dbDocuments, ...this.getBuiltInKnowledgeDocuments()];
    const queryEmbedding = await this.generateQueryEmbedding(query, allKnowledgeDocs);

    return this.selectTopDocuments(query, allKnowledgeDocs, {
      limit: 10,
      queryEmbedding,
    });
  }

  private getBuiltInKnowledgeDocuments(): RagDocument[] {
    return [
      {
        id: 'builtin:order-lifecycle',
        type: 'KNOWLEDGE',
        title: 'Order and Payment Lifecycle',
        sourceType: SupportKnowledgeSourceType.POLICY,
        sourcePath: 'customer-checkout-flow',
        keywords: ['order', 'invoice', 'payment', 'status', 'confirmations'],
        text: [
          'Order statuses are CREATED, PENDING_PAYMENT, PAID, FAILED, and EXPIRED.',
          'Payment transaction statuses are PENDING, CONFIRMED, and FAILED.',
          'Customers should use order ID for order updates and tx hash for payment tracing.',
          'If a payment is detected but not confirmed yet, support should communicate the confirmation wait state.',
        ].join('\n'),
      },
      {
        id: 'builtin:refund-policy',
        type: 'KNOWLEDGE',
        title: 'Refund and Cancellation Policy Guidance',
        sourceType: SupportKnowledgeSourceType.POLICY,
        sourcePath: 'refund-policy',
        keywords: ['refund', 'cancellation', 'return', 'policy', 'dispute'],
        text: [
          'Refund approval requires verified order and payment context, including order ID and tx hash.',
          'Do not promise refund completion before transaction and order checks are finished.',
          'For cancellation and refund requests, collect order ID, transaction hash, paid amount, network, and reason.',
        ].join('\n'),
      },
      {
        id: 'builtin:supported-networks',
        type: 'KNOWLEDGE',
        title: 'Supported Blockchain Families',
        sourceType: SupportKnowledgeSourceType.PAGE,
        sourcePath: 'network-support',
        keywords: ['network', 'evm', 'tron', 'token', 'currency'],
        text: [
          'The platform currently supports EVM-family and TRON-family networks only.',
          'Accepted payment assets are resolved from admin-configured network tokens.',
          'Native coin and supported tokens vary by selected blockchain network.',
        ].join('\n'),
      },
      {
        id: 'builtin:delivery-address',
        type: 'KNOWLEDGE',
        title: 'Customer Address and Checkout Rules',
        sourceType: SupportKnowledgeSourceType.FAQ,
        sourcePath: 'customer-address-management',
        keywords: ['address', 'shipping', 'delivery', 'default', 'checkout'],
        text: [
          'Checkout can include deliveryAddressId, and the address must belong to the same authenticated customer.',
          'Customer addresses support default flag and soft-active state.',
          'Address issues should be resolved by confirming address ID, name, and active/default status.',
        ].join('\n'),
      },
      {
        id: 'builtin:stock-and-product',
        type: 'KNOWLEDGE',
        title: 'Product and Stock Constraints',
        sourceType: SupportKnowledgeSourceType.FAQ,
        sourcePath: 'product-catalog',
        keywords: ['product', 'inventory', 'stock', 'quantity', 'price'],
        text: [
          'Only products with quantity greater than zero are shown to customers.',
          'Order creation fails if requested quantity is higher than available stock.',
          'All order items in a single order must belong to one merchant.',
        ].join('\n'),
      },
      {
        id: 'builtin:safety-and-troubleshooting',
        type: 'KNOWLEDGE',
        title: 'Support Troubleshooting Baseline',
        sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
        sourcePath: 'support-runbook',
        keywords: ['support', 'issue', 'failed', 'missing', 'troubleshoot'],
        text: [
          'If data is missing, support must ask for order ID, invoice ID, tx hash, and approximate timestamp.',
          'Do not promise refunds or settlements unless status and amounts are visible in system records.',
          'If network data is unavailable, instruct customer to retry after a short interval and keep tx hash ready.',
        ].join('\n'),
      },
    ];
  }

  private selectTopDocuments(
    query: string,
    documents: RagDocument[],
    options?: { limit?: number; queryEmbedding?: number[] | null },
  ) {
    const limit = options?.limit ?? 10;
    const terms = this.tokenize(query);
    const lowerQuery = query.toLowerCase();
    const uuidMatches =
      lowerQuery.match(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g,
      ) ?? [];

    const scored: ScoredRagDocument[] = documents.map((document) => {
      const haystack = `${document.title}\n${document.text}`.toLowerCase();
      const matchedTerms = terms.filter((term) => haystack.includes(term));
      let score = matchedTerms.length * 2;

      for (const uuid of uuidMatches) {
        if (haystack.includes(uuid)) {
          score += 10;
        }
      }

      if (
        /\b(order|shipment|delivery|item)\b/.test(lowerQuery) &&
        document.type === 'ORDER'
      ) {
        score += 4;
      }

      if (
        /\b(payment|transaction|tx|paid|invoice|refund)\b/.test(lowerQuery) &&
        document.type === 'PAYMENT'
      ) {
        score += 4;
      }

      if (
        /\b(fund|wallet|balance)\b/.test(lowerQuery) &&
        document.type === 'WALLET'
      ) {
        score += 4;
      }

      if (
        /\b(address|shipping|deliver)\b/.test(lowerQuery) &&
        document.type === 'ADDRESS'
      ) {
        score += 3;
      }

      if (document.type === 'SUMMARY') {
        score += 1;
      }

      if (document.type === 'KNOWLEDGE') {
        score += 3;
      }

      if (
        /\b(refund|return|cancel|policy|chargeback|dispute|terms)\b/.test(
          lowerQuery,
        ) &&
        document.type === 'KNOWLEDGE'
      ) {
        score += 8;
        if (
          document.sourceType === SupportKnowledgeSourceType.POLICY ||
          document.sourceType === SupportKnowledgeSourceType.TROUBLESHOOTING
        ) {
          score += 5;
        }
      }

      if (
        /\b(refund|return|cancel)\b/.test(lowerQuery) &&
        /\b(refund|return|cancel)\b/.test(haystack)
      ) {
        score += 4;
      }

      if (
        options?.queryEmbedding &&
        document.embedding &&
        options.queryEmbedding.length === document.embedding.length
      ) {
        const similarity = this.cosineSimilarity(
          options.queryEmbedding,
          document.embedding,
        );
        score += similarity * 6;
      }

      return { ...document, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score: _score, ...document }) => document);
  }

  private tokenize(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (token) =>
          token.length > 2 && !CustomerChatService.STOPWORDS.has(token),
      );
  }

  private async askOpenAi(
    history: any[],
    documents: RagDocument[],
    extraSystemRule?: string,
  ) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      this.openAiDiagnostics.chatOk = false;
      this.openAiDiagnostics.lastError = 'OPENAI_API_KEY is not configured';
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const model = process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4.1-mini';
    this.openAiDiagnostics.lastChatRequestAt = new Date();
    this.openAiDiagnostics.chatModel = model;
    this.openAiDiagnostics.keyConfigured = true;
    const contextPayload = documents
      .map((document, index) => {
        const sourceMeta = [
          document.sourceType ? `sourceType=${document.sourceType}` : null,
          document.sourcePath ? `sourcePath=${document.sourcePath}` : null,
          document.keywords?.length
            ? `keywords=${document.keywords.join(',')}`
            : null,
        ]
          .filter(Boolean)
          .join(' | ');

        return `[${index + 1}] ${document.type} | ${document.title}${
          sourceMeta ? ` (${sourceMeta})` : ''
        }\n${document.text}`;
      })
      .join('\n\n')
      .slice(0, 25_000);

    const messages = [
      {
        role: 'system',
        content:
          'You are the dedicated customer support specialist for Stealth blockchain payment system. Speak naturally like a real support agent. Use only provided retrieved context and chat history. Never fabricate order/payment records, balances, policies, refunds, or network support.',
      },
      {
        role: 'system',
        content:
          'Answer rules: 1) Give specific answer first. 2) For refund/cancellation/policy questions, prioritize policy context and clearly explain required verification data. 3) If customer asks account/order/payment details and IDs are missing, ask for exact missing IDs. 4) If context is insufficient, say what data is missing. 5) Provide practical next step. 6) Keep response concise but complete.',
      },
      ...(extraSystemRule
        ? [{ role: 'system', content: `Additional rule: ${extraSystemRule}` }]
        : []),
      {
        role: 'system',
        content: `Retrieved context:\n${contextPayload || 'No records found.'}`,
      },
      ...history.map((message) => ({
        role: message.role === ChatRole.USER ? 'user' : 'assistant',
        content: String(message.content ?? '').slice(0, 3500),
      })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        max_tokens: 900,
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.openAiDiagnostics.chatOk = false;
      this.openAiDiagnostics.lastError = `OpenAI request failed (${response.status})`;
      throw new Error(
        `OpenAI request failed (${response.status}): ${errorBody.slice(0, 320)}`,
      );
    }

    const payload: any = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content === 'string' && content.trim()) {
      this.openAiDiagnostics.chatOk = true;
      this.openAiDiagnostics.lastChatSuccessAt = new Date();
      this.openAiDiagnostics.lastError = null;
      return content.trim();
    }

    if (Array.isArray(content)) {
      const flattened = content
        .map((part: any) => {
          if (typeof part === 'string') {
            return part;
          }
          if (part && typeof part.text === 'string') {
            return part.text;
          }
          return '';
        })
        .join('\n')
        .trim();

      if (flattened) {
        this.openAiDiagnostics.chatOk = true;
        this.openAiDiagnostics.lastChatSuccessAt = new Date();
        this.openAiDiagnostics.lastError = null;
        return flattened;
      }
    }

    this.openAiDiagnostics.chatOk = false;
    this.openAiDiagnostics.lastError = 'OpenAI returned an empty chat response';
    throw new Error('OpenAI returned an empty chat response');
  }

  private buildFallbackReply(documents: RagDocument[], reason?: string) {
    const compact = documents.slice(0, 4);
    if (compact.length === 0) {
      return 'I could not retrieve enough account or support context right now. Please share your order ID or transaction hash and retry.';
    }

    const summary = compact
      .map((doc) => `${doc.type}: ${doc.title}`)
      .join(' | ');

    if (reason?.includes('OPENAI_API_KEY')) {
      return `Support AI is not configured on server yet (missing OPENAI_API_KEY). Relevant context found: ${summary}. Please configure the OpenAI key and retry.`;
    }

    return `I am temporarily unable to reach the AI engine. Relevant context found: ${summary}. Please retry in a moment.`;
  }

  private needsRefundTemplateOverride(query: string, reply: string) {
    const asksRefund = /\b(refund|return|cancel|chargeback|dispute)\b/i.test(query);
    if (asksRefund) {
      return false;
    }

    return /please share your order id.*reason for refund/i.test(reply);
  }

  private maybeRunOpenAiHealthCheck() {
    const last = this.openAiDiagnostics.lastHealthCheckAt?.getTime() ?? 0;
    if (Date.now() - last < 10 * 60_000) {
      return;
    }

    void this.runOpenAiHealthCheck();
  }

  private async runOpenAiHealthCheck() {
    this.openAiDiagnostics.lastHealthCheckAt = new Date();
    this.openAiDiagnostics.keyConfigured = !!process.env.OPENAI_API_KEY?.trim();
    this.openAiDiagnostics.chatModel =
      process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4.1-mini';
    this.openAiDiagnostics.embeddingModel =
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small';

    if (!this.openAiDiagnostics.keyConfigured) {
      this.openAiDiagnostics.chatOk = false;
      this.openAiDiagnostics.embeddingOk = false;
      this.openAiDiagnostics.lastError = 'OPENAI_API_KEY is not configured';
      this.logger.warn(
        'OpenAI health check failed: OPENAI_API_KEY is not configured',
      );
      return;
    }

    try {
      const apiKey = process.env.OPENAI_API_KEY!.trim();
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.openAiDiagnostics.chatModel,
          messages: [{ role: 'user', content: 'health check' }],
          max_tokens: 5,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.openAiDiagnostics.chatOk = false;
        this.openAiDiagnostics.lastError = `Chat health failed (${response.status})`;
        this.logger.error(
          `OpenAI chat health check failed (${response.status}): ${body.slice(0, 240)}`,
        );
      } else {
        this.openAiDiagnostics.chatOk = true;
        this.openAiDiagnostics.lastChatSuccessAt = new Date();
        this.openAiDiagnostics.lastError = null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.openAiDiagnostics.chatOk = false;
      this.openAiDiagnostics.lastError = `Chat health error: ${message}`;
      this.logger.error(`OpenAI chat health check error: ${message}`);
    }

    try {
      const embedding = await this.generateEmbedding('health check');
      if (embedding) {
        this.openAiDiagnostics.embeddingOk = true;
      } else if (this.openAiDiagnostics.embeddingOk === null) {
        this.openAiDiagnostics.embeddingOk = false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.openAiDiagnostics.embeddingOk = false;
      this.openAiDiagnostics.lastError = `Embedding health error: ${message}`;
      this.logger.error(`OpenAI embedding health check error: ${message}`);
    }
  }

  private isDebugEnabled() {
    const value = process.env.CHAT_DEBUG_LOGS?.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private deriveSessionTitle(message: string) {
    const plain = message.replace(/\s+/g, ' ').trim();
    if (!plain) {
      return 'New Chat';
    }

    return plain.length <= 60 ? plain : `${plain.slice(0, 57)}...`;
  }

  private normalizeKeywords(input?: string[]) {
    if (!input || input.length === 0) {
      return [];
    }

    const deduped = new Set<string>();
    for (const raw of input) {
      const normalized = raw.trim().toLowerCase();
      if (normalized) {
        deduped.add(normalized.slice(0, 50));
      }
    }

    return Array.from(deduped).slice(0, 30);
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160);

    return slug || 'support-knowledge';
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string) {
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.supportKnowledgeEntry.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === excludeId) {
        return candidate;
      }

      suffix += 1;
      candidate = `${baseSlug}-${suffix}`.slice(0, 180);
    }
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

  private async generateQueryEmbedding(
    query: string,
    docs: RagDocument[],
  ): Promise<number[] | null> {
    const hasVectorizedKnowledge = docs.some(
      (doc) => doc.type === 'KNOWLEDGE' && !!doc.embedding,
    );

    if (!hasVectorizedKnowledge) {
      return null;
    }

    return this.generateEmbedding(query);
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      this.openAiDiagnostics.embeddingOk = false;
      return null;
    }

    const input = text.trim().slice(0, 7000);
    if (!input) {
      return null;
    }

    const model =
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small';
    this.openAiDiagnostics.embeddingModel = model;
    this.openAiDiagnostics.lastEmbeddingRequestAt = new Date();

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(
          `OpenAI embedding request failed (${response.status}): ${body.slice(0, 200)}`,
        );
        this.openAiDiagnostics.embeddingOk = false;
        this.openAiDiagnostics.lastError = `Embedding failed (${response.status})`;
        return null;
      }

      const payload: any = await response.json();
      const vector = payload?.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length === 0) {
        this.openAiDiagnostics.embeddingOk = false;
        return null;
      }

      const normalized = vector
        .map((value: any) => Number(value))
        .filter((value: number) => Number.isFinite(value));

      const result = normalized.length > 0 ? normalized : null;
      this.openAiDiagnostics.embeddingOk = !!result;
      if (result) {
        this.openAiDiagnostics.lastEmbeddingSuccessAt = new Date();
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Embedding generation failed: ${message}`);
      this.openAiDiagnostics.embeddingOk = false;
      this.openAiDiagnostics.lastError = `Embedding generation failed: ${message}`;
      return null;
    }
  }

  private parseEmbedding(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const vector = value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry));

    return vector.length > 0 ? vector : undefined;
  }

  private cosineSimilarity(a: number[], b: number[]) {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i += 1) {
      const av = a[i];
      const bv = b[i];
      dot += av * bv;
      normA += av * av;
      normB += bv * bv;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
