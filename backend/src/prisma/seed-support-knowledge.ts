import { Prisma, PrismaClient, SupportKnowledgeSourceType } from '@prisma/client';

type SeedKnowledgeItem = {
  slug: string;
  title: string;
  sourceType: SupportKnowledgeSourceType;
  sourcePath: string;
  keywords: string[];
  content: string;
};

const prisma = new PrismaClient();

const KNOWLEDGE_ITEMS: SeedKnowledgeItem[] = [
  {
    slug: 'account-login-access',
    title: 'Customer Login and Account Access',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/support/account',
    keywords: ['login', 'password', 'account', 'customer', 'access'],
    content:
      'Customers must sign in with their registered email and password. Invalid credentials, disabled account state, or token expiration can block access. For support, confirm customer email, last successful login time, and whether account was recently deactivated.',
  },
  {
    slug: 'profile-and-address-management',
    title: 'Profile and Delivery Address Management',
    sourceType: SupportKnowledgeSourceType.PAGE,
    sourcePath: '/profile/addresses',
    keywords: ['address', 'delivery', 'shipping', 'default', 'customer'],
    content:
      'A delivery address must belong to the same authenticated customer. Default address can be switched, and only active addresses are valid for checkout. If checkout fails on address, verify address ID ownership and active/default flags.',
  },
  {
    slug: 'product-availability-and-stock',
    title: 'Product Availability and Stock Validation',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/shop/products',
    keywords: ['product', 'stock', 'inventory', 'quantity', 'checkout'],
    content:
      'Only in-stock products are shown to customers. Order creation fails when requested quantity is higher than available inventory. If customer reports checkout issue, compare requested quantity against current product quantity and retry with valid quantity.',
  },
  {
    slug: 'single-merchant-order-rule',
    title: 'Single Merchant per Order Rule',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/checkout',
    keywords: ['merchant', 'order', 'cart', 'checkout', 'validation'],
    content:
      'A single order must contain products from one merchant only. Mixed-merchant carts must be split into separate orders. If customer cannot proceed with checkout, verify that all product IDs in the request belong to the same merchant ID.',
  },
  {
    slug: 'order-status-lifecycle',
    title: 'Order Status Lifecycle',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/orders',
    keywords: ['order status', 'created', 'pending', 'paid', 'failed', 'expired'],
    content:
      'Order lifecycle includes CREATED, PENDING_PAYMENT, PAID, FAILED, and EXPIRED. Support should always share the current order status and the next expected step instead of broad generic replies.',
  },
  {
    slug: 'order-created-status-meaning',
    title: 'Meaning of CREATED Order Status',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/orders',
    keywords: ['created', 'order', 'status', 'payment pending'],
    content:
      'CREATED means order exists but payment completion is not finalized. Customer should continue payment flow using provided invoice and wallet destination details. If payment was already sent, request tx hash and network immediately.',
  },
  {
    slug: 'order-pending-payment-status-meaning',
    title: 'Meaning of PENDING_PAYMENT Status',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/orders',
    keywords: ['pending payment', 'status', 'confirmations', 'invoice'],
    content:
      'PENDING_PAYMENT means payment is expected but not fully confirmed yet. This can happen if no transaction was detected or if blockchain confirmations are still in progress. Ask customer for tx hash, network, and payment timestamp.',
  },
  {
    slug: 'order-paid-status-meaning',
    title: 'Meaning of PAID Order Status',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/orders',
    keywords: ['paid', 'order', 'status', 'confirmed', 'success'],
    content:
      'PAID means required payment amount was detected and confirmed according to system rules. Support can safely communicate successful payment completion and reference associated transaction hash from latest payment records.',
  },
  {
    slug: 'order-failed-or-expired-status',
    title: 'Meaning of FAILED or EXPIRED Order Status',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/orders',
    keywords: ['failed', 'expired', 'order', 'invoice expiry', 'late payment'],
    content:
      'FAILED or EXPIRED usually indicates payment did not satisfy order conditions in allowed time window or transaction validation failed. Ask for order ID and tx hash, then compare transaction time with invoice expiry and expected asset details.',
  },
  {
    slug: 'invoice-expiry-handling',
    title: 'Invoice Expiry Handling',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/checkout/payment',
    keywords: ['invoice', 'expiry', 'expires', 'late payment', 'window'],
    content:
      'Every invoice has an expiry time. Payments sent after expiry can fail automatic order completion depending on validation rules. Support should check invoice expiresAt and payment detectedAt before promising any positive resolution.',
  },
  {
    slug: 'payment-asset-selection',
    title: 'Payment Asset Selection Rules',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/checkout/payment',
    keywords: ['asset', 'currency', 'token', 'native', 'symbol'],
    content:
      'Payment asset is resolved per network and configured token catalog. Customer must pay using expected symbol/token on selected chain. Mismatch between expected and sent asset can keep order in pending or failed state.',
  },
  {
    slug: 'supported-blockchain-families',
    title: 'Supported Blockchain Families',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/help/networks',
    keywords: ['network', 'evm', 'tron', 'blockchain', 'support'],
    content:
      'Platform currently supports EVM-family and TRON-family networks. If customer pays from unsupported network or incompatible transfer type, system may not detect payment correctly. Always confirm exact network used by customer.',
  },
  {
    slug: 'token-and-network-match',
    title: 'Token and Network Must Match',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/help/payments',
    keywords: ['token', 'network', 'wrong chain', 'mismatch', 'payment issue'],
    content:
      'A token symbol alone is not enough; chain/network must also match expected checkout network. Example: same symbol on another chain is considered different asset context for validation. Ask for tx hash and chain name before analysis.',
  },
  {
    slug: 'where-customer-should-send-payment',
    title: 'How to Identify Correct Payment Destination',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/checkout/payment',
    keywords: ['wallet address', 'destination', 'invoice wallet', 'to address'],
    content:
      'Customer must send funds to invoice wallet address shown in checkout/order details. Support should compare transaction toAddress with invoice wallet address exactly to verify expected payment destination.',
  },
  {
    slug: 'transaction-hash-required-for-support',
    title: 'Transaction Hash Requirement for Payment Support',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/help/payments',
    keywords: ['tx hash', 'transaction hash', 'support', 'trace'],
    content:
      'For unresolved payment claims, tx hash is mandatory for precise tracing. Without tx hash, support should ask for order ID, network, approximate transfer time, and paid amount but clarify that final verification needs tx hash.',
  },
  {
    slug: 'payment-confirmation-wait-time',
    title: 'Payment Confirmation Wait State',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/help/payments',
    keywords: ['confirmations', 'pending', 'blockchain', 'delay', 'waiting'],
    content:
      'A detected transaction may remain pending until required confirmations are reached. During this period, support should communicate that payment is seen but not fully confirmed yet, and advise customer to wait before re-paying.',
  },
  {
    slug: 'pending-vs-confirmed-payment-status',
    title: 'Difference Between PENDING and CONFIRMED Payment Status',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/help/payments',
    keywords: ['pending', 'confirmed', 'payment status', 'difference'],
    content:
      'PENDING means transaction observed but final validation/confirmation is incomplete. CONFIRMED means network and amount checks succeeded with required confirmation depth. Support response must reflect this distinction clearly.',
  },
  {
    slug: 'underpayment-handling',
    title: 'Underpayment Handling',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/help/payments',
    keywords: ['underpayment', 'less amount', 'insufficient payment', 'partial'],
    content:
      'If paid amount is below expected payable amount, order may not complete. Support should compare expected amount versus received amount in system records and guide customer for next valid step based on latest invoice/order state.',
  },
  {
    slug: 'overpayment-handling',
    title: 'Overpayment Handling',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/help/payments',
    keywords: ['overpayment', 'extra amount', 'more paid', 'support'],
    content:
      'When payment is higher than expected, support must not promise automatic refund unless refund workflow is explicitly confirmed. First verify transaction belongs to correct order and capture exact overpaid amount from system records.',
  },
  {
    slug: 'wrong-network-payment-troubleshooting',
    title: 'Wrong Network Payment Troubleshooting',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/help/payments',
    keywords: ['wrong network', 'wrong chain', 'payment not received', 'troubleshoot'],
    content:
      'If customer pays on wrong network, payment may not be detected for invoice context. Support should collect tx hash and network used, then explain that network mismatch can block automatic reconciliation.',
  },
  {
    slug: 'wrong-token-payment-troubleshooting',
    title: 'Wrong Token Payment Troubleshooting',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/help/payments',
    keywords: ['wrong token', 'unsupported token', 'asset mismatch', 'payment failed'],
    content:
      'Sending unsupported token or wrong asset symbol to invoice wallet can prevent successful payment validation. Support must compare expected asset symbol and token address (if token transfer) with actual transaction details.',
  },
  {
    slug: 'duplicate-payment-warning',
    title: 'Duplicate Payment Prevention',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/help/payments',
    keywords: ['duplicate payment', 'double pay', 'retry', 'warning'],
    content:
      'Customers should avoid sending multiple payments for same order while first transaction is pending confirmation. Support should ask customer to wait for status refresh unless explicit re-payment instruction is confirmed.',
  },
  {
    slug: 'manual-payment-verification-flow',
    title: 'Manual Payment Verification Flow',
    sourceType: SupportKnowledgeSourceType.PAGE,
    sourcePath: '/help/manual-verify',
    keywords: ['manual verification', 'verify', 'tx hash', 'payment validate'],
    content:
      'Manual verification checks transaction hash, network, destination address, amount, and timing against invoice/order records. If any dimension mismatches, payment may remain pending or fail according to validation outcomes.',
  },
  {
    slug: 'delivery-fee-and-total-amount',
    title: 'Delivery Fee and Total Payable Amount',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/checkout',
    keywords: ['delivery fee', 'total amount', 'checkout total', 'price'],
    content:
      'Total payable amount can include product subtotal and configured delivery fee conversion logic. Support should explain total from order snapshot values instead of recomputing from memory or assumptions.',
  },
  {
    slug: 'invalid-delivery-address-at-checkout',
    title: 'Invalid Delivery Address at Checkout',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/checkout',
    keywords: ['invalid address', 'checkout error', 'delivery address', 'address id'],
    content:
      'Checkout rejects deliveryAddressId that does not belong to customer or is inactive. Ask customer to reselect active saved address and verify default/active status from profile before retrying payment flow.',
  },
  {
    slug: 'inventory-changed-during-checkout',
    title: 'Inventory Changed During Checkout',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/checkout',
    keywords: ['inventory changed', 'stock changed', 'checkout failed'],
    content:
      'If stock changes between cart view and order creation, checkout can fail due to insufficient quantity. Support should advise refreshing product page and placing order with currently available quantity.',
  },
  {
    slug: 'idempotency-and-retry-behavior',
    title: 'Order Retry and Idempotency Behavior',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/help/orders',
    keywords: ['idempotency', 'retry', 'duplicate order', 'same request'],
    content:
      'Order creation may use idempotency key to avoid duplicate orders on retries. If customer retries quickly and receives same order reference, this can be expected behavior rather than system duplication issue.',
  },
  {
    slug: 'order-cancellation-guidance',
    title: 'Order Cancellation Guidance',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/help/orders',
    keywords: ['cancel order', 'cancellation', 'before payment', 'after payment'],
    content:
      'Cancellation handling depends on current order/payment state. Support should confirm status first: pre-payment cancellations are different from post-payment cases. Never confirm cancellation outcome without checking live order record.',
  },
  {
    slug: 'refund-communication-policy',
    title: 'Refund Communication Policy',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/help/refunds',
    keywords: ['refund', 'return', 'payment dispute', 'policy'],
    content:
      'Support must not promise refunds unless approved by defined business process and verified transaction/order context. Always collect order ID, tx hash, amount, and issue reason before sharing next refund-related steps.',
  },
  {
    slug: 'shipping-and-delivery-support',
    title: 'Shipping and Delivery Support Guidance',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/help/shipping',
    keywords: ['shipping', 'delivery', 'address', 'timeline', 'order'],
    content:
      'For shipping concerns, support should verify delivery address snapshot tied to order and current order status first. Payment confirmation does not always mean shipped status; communicate status-specific next action clearly.',
  },
  {
    slug: 'payment-detection-delay-troubleshooting',
    title: 'Payment Detection Delay Troubleshooting',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/help/payments',
    keywords: ['detection delay', 'not detected', 'pending', 'blockchain lag'],
    content:
      'Detection delay can occur due to node lag, confirmation depth, or temporary provider issues. Ask customer to keep tx hash ready and avoid repeated transfers while support verifies latest payment tracking records.',
  },
  {
    slug: 'security-best-practices-customer',
    title: 'Customer Security Best Practices',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/help/security',
    keywords: ['security', 'wallet', 'private key', 'phishing', 'safe payment'],
    content:
      'Customers should verify destination address from official checkout, never share private keys, and avoid unknown support channels requesting sensitive data. Support should ask only required identifiers, not private wallet secrets.',
  },
  {
    slug: 'testnet-vs-mainnet-clarification',
    title: 'Testnet vs Mainnet Clarification',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/help/networks',
    keywords: ['testnet', 'mainnet', 'network mismatch', 'payment'],
    content:
      'Transactions on testnet and mainnet are isolated. If customer sends funds on wrong environment, order in another environment will not auto-complete. Always verify exact network code before diagnosing missing payment cases.',
  },
  {
    slug: 'customer-support-data-required',
    title: 'Minimum Data Required for Fast Support Resolution',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/help/support',
    keywords: ['support data', 'order id', 'tx hash', 'invoice id', 'troubleshoot'],
    content:
      'For fast resolution, collect order ID, invoice ID if available, tx hash, network, amount sent, and approximate timestamp. Without these identifiers, support response should stay provisional and request missing data explicitly.',
  },
  {
    slug: 'merchant-settlement-awareness-customer',
    title: 'Merchant Settlement Awareness for Customer Replies',
    sourceType: SupportKnowledgeSourceType.FAQ,
    sourcePath: '/help/payments',
    keywords: ['settlement', 'merchant', 'paid order', 'status'],
    content:
      'Customer-facing support should focus on customer order/payment visibility. Merchant settlement is separate internal flow and should not be used as customer payment confirmation substitute. Always rely on order/payment record states.',
  },
  {
    slug: 'crypto-payment-support-checklist',
    title: 'Crypto Payment Support Checklist',
    sourceType: SupportKnowledgeSourceType.TROUBLESHOOTING,
    sourcePath: '/help/troubleshooting',
    keywords: ['checklist', 'crypto payment', 'support steps', 'diagnosis'],
    content:
      'Checklist: verify order status, invoice status, expected asset, destination address, tx hash, network used, amount sent, and confirmation state. Communicate exact mismatch found and concrete next step instead of generic advice.',
  },
  {
    slug: 'ecommerce-support-response-style',
    title: 'Support Response Style for Ecommerce Cases',
    sourceType: SupportKnowledgeSourceType.POLICY,
    sourcePath: '/help/support',
    keywords: ['support style', 'specific answer', 'next step', 'customer service'],
    content:
      'Responses should be specific, status-based, and action-oriented. Provide what system shows now, what is missing, and what customer should do next. Avoid ambiguous reassurance when transactional identifiers are not yet verified.',
  },
];

async function generateEmbedding(text: string): Promise<number[] | null> {
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

async function main() {
  console.log('Seeding support knowledge...');

  let created = 0;
  let updated = 0;

  for (const item of KNOWLEDGE_ITEMS) {
    const embedding = await generateEmbedding(
      `${item.title}\n${item.content}\nKeywords: ${item.keywords.join(', ')}`,
    );
    const model = embedding
      ? process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small'
      : null;

    const existing = await prisma.supportKnowledgeEntry.findUnique({
      where: { slug: item.slug },
      select: { id: true },
    });

    await prisma.supportKnowledgeEntry.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        content: item.content,
        sourceType: item.sourceType,
        sourcePath: item.sourcePath,
        keywords: item.keywords,
        isActive: true,
        embedding: embedding
          ? (embedding as unknown as Prisma.JsonArray)
          : Prisma.JsonNull,
        embeddingModel: model,
      },
      create: {
        title: item.title,
        slug: item.slug,
        content: item.content,
        sourceType: item.sourceType,
        sourcePath: item.sourcePath,
        keywords: item.keywords,
        isActive: true,
        embedding: embedding
          ? (embedding as unknown as Prisma.JsonArray)
          : Prisma.JsonNull,
        embeddingModel: model,
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  const total = await prisma.supportKnowledgeEntry.count({
    where: { isActive: true },
  });

  console.log(
    `Support knowledge seeding complete. created=${created} updated=${updated} active_total=${total}`,
  );
}

main()
  .catch((error) => {
    console.error('Support knowledge seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
