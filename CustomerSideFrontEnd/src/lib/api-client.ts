export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  description: string;
  currency?: string;
  basePriceUSD?: number;
  priceUSD: number;
  deliveryFee: string;
  mrp?: string;
  categories: Category[];
  merchantId: string;
  imageUrl?: string;
  images?: ProductImage[];
  merchant: {
    id: string;
    name: string;
  };
}

export interface ListProductsOptions {
  search?: string;
  categoryId?: string;
  categorySlug?: string;
}

export type OrderStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED';

export interface BlockchainListItem {
  id: string;
  code?: string | null;
  name: string;
  chainId: number;
  symbol?: string | null;
  rpcUrl?: string;
  explorerUrl?: string | null;
  isActive?: boolean;
}

export interface PaymentAsset {
  symbol: string;
  decimals: number;
  isNative: boolean;
  tokenAddress?: string | null;
}

export type CreateOrderResponse = {
  orderId: string;
  id?: string;
  invoiceId: string;
  walletAddress: string;
  amount: string;
  status: OrderStatus;
  createdAt?: string;
  network: {
    id?: string;
    name: string;
    chainId: number;
    code?: string | null;
    symbol?: string | null;
  };
  paymentAsset?: PaymentAsset;
  walletBalances?: {
    payment: {
      symbol: string;
      balance: string;
      tokenAddress?: string | null;
      decimals?: number;
    };
    gas: {
      symbol: string;
      balance: string;
      tokenAddress?: string | null;
      decimals?: number;
    };
  };
  currentBalance?: string | null;
  currentBalanceSymbol?: string | null;
  gasBalance?: string | null;
  gasSymbol?: string | null;
  latestPaymentTxHash?: string | null;
};

export type OrderDetailsResponse = CreateOrderResponse & {
  payout?: {
    status?: string;
    txHash?: string | null;
    gasFundingTxHash?: string | null;
    address?: string | null;
    error?: string | null;
    completedAt?: string | null;
  };
  items?: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      price: string;
      currency: string;
      images?: ProductImage[];
    };
    quantity: number;
    subtotal: string;
  }>;
};

export interface OrderListItem {
  id: string;
  status: OrderStatus;
  walletAddress: string;
  amount: string;
  paymentAmount?: string | null;
  paymentCurrency?: string | null;
  orderValueUsdt?: string | null;
  invoiceId: string;
  latestPaymentTxHash?: string | null;
  createdAt?: string;
  updatedAt?: string;
  network: {
    name: string;
    chainId: number;
    code?: string | null;
    symbol?: string | null;
  };
  product?: {
    id: string;
    name: string;
    images?: ProductImage[];
  } | null;
  items?: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      price: string;
      currency: string;
      images?: ProductImage[];
    };
    quantity: number;
    subtotal: string;
  }>;
}

export type ExtendedOrderListItem = OrderListItem;

export interface WalletBalanceResponse {
  balance: string;
  symbol: string;
  usdValue?: string;
}

export interface WalletTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
}

export interface ShippingAddress {
  id: string;
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isPrimary: boolean;
  createdAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:3000';

function toNumberChainId(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveProductImageUrl(raw: { imageUrl?: string; images?: ProductImage[] }): string | undefined {
  if (raw.imageUrl) return raw.imageUrl;
  if (!Array.isArray(raw.images)) return undefined;

  const primaryImage = raw.images.find((image) => image.type === 'IMAGE' && image.isPrimary);
  if (primaryImage?.url) return primaryImage.url;

  const firstImage = raw.images.find((image) => image.type === 'IMAGE');
  return firstImage?.url;
}

export function toProductListItem(raw: any): ProductListItem {
  const fallbackImageUrl = resolveProductImageUrl(raw);
  return {
    ...raw,
    basePriceUSD: raw.mrp ? parseFloat(raw.mrp) : undefined,
    priceUSD: parseFloat(raw.price || raw.salePrice || '0'),
    deliveryFee: String(raw.deliveryFee || '0'),
    categories: raw.categories || [],
    imageUrl: raw.imageUrl || fallbackImageUrl,
    merchant: raw.merchant || { id: '', name: '' },
  };
}

function normalizeNetwork(raw: any): CreateOrderResponse['network'] {
  return {
    id: raw?.id,
    name: raw?.name || 'Unknown Network',
    chainId: toNumberChainId(raw?.chainId),
    code: raw?.code || null,
    symbol: raw?.symbol || null,
  };
}

function normalizeCreateOrderResponse(raw: any): CreateOrderResponse {
  return {
    ...raw,
    orderId: raw.orderId || raw.id,
    id: raw.id || raw.orderId,
    status: raw.status,
    network: normalizeNetwork(raw.network),
    latestPaymentTxHash: raw.latestPaymentTxHash || raw.latestTxHash || null,
  };
}

function generateIdempotencyKey(): string {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${randomPart}-${Date.now().toString(36)}`;
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return { status: 'ok' as const };
  } catch {
    return {
      status: 'error' as const,
      message:
        'Backend not running? Start: cd ../stealth_blockchain_paument_system && npm run prisma:seed && npm run start:dev',
    };
  }
}

export async function createOrder(
  accessToken: string,
  items: OrderItemInput[],
  blockchainId?: string,
  deliveryAddressId?: string,
  paymentSymbol?: string,
  deliveryFeeUsd?: number,
): Promise<CreateOrderResponse> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items,
      ...(blockchainId && { blockchainId }),
      ...(deliveryAddressId && { deliveryAddressId }),
      ...(paymentSymbol ? { paymentSymbol: paymentSymbol.trim().toUpperCase() } : {}),
      ...(typeof deliveryFeeUsd === 'number' && deliveryFeeUsd > 0
        ? { deliveryFeeUsd: Number(deliveryFeeUsd.toFixed(2)) }
        : {}),
      idempotencyKey: generateIdempotencyKey(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create order failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  return normalizeCreateOrderResponse(data);
}

export async function getOrder(token: string, orderId: string): Promise<OrderDetailsResponse> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Get order failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  return normalizeCreateOrderResponse(data) as OrderDetailsResponse;
}

export async function verifyOrderPayment(
  token: string,
  orderId: string,
  txHash: string,
  confirm = false,
): Promise<any> {
  const normalizedHash = txHash.trim();
  const payload = normalizedHash
    ? {
        txHash: normalizedHash,
        ...(confirm ? { requiredConfirmations: 1 } : {}),
      }
    : { autoDetect: true };

  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Verify failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  return response.json();
}

export async function getWalletBalance(
  walletAddress: string,
  network: BlockchainListItem,
  tokenSymbol?: string,
): Promise<WalletBalanceResponse> {
  const response = await fetch(
    `${API_BASE_URL}/wallet/balance/${walletAddress}?chainId=${network.chainId}${
      tokenSymbol ? `&token=${tokenSymbol}` : ''
    }`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Balance fetch failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  return response.json();
}

export async function getWalletTransactions(
  walletAddress: string,
  network: BlockchainListItem,
  tokenSymbol?: string,
  options?: { minTimestampSeconds?: number },
): Promise<{ transactions: WalletTransaction[] }> {
  const params = new URLSearchParams({
    chainId: network.chainId.toString(),
    ...(tokenSymbol && { token: tokenSymbol }),
    ...(options?.minTimestampSeconds && {
      minTimestampSeconds: options.minTimestampSeconds.toString(),
    }),
  });

  const response = await fetch(`${API_BASE_URL}/wallet/transactions/${walletAddress}?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transactions fetch failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  return response.json();
}

export async function listBlockchains(): Promise<BlockchainListItem[]> {
  const response = await fetch(`${API_BASE_URL}/blockchains`);
  if (!response.ok) {
    throw new Error(`List blockchains failed: ${response.statusText}`);
  }

  const chains = await response.json();
  return chains.map((chain: any) => ({
    ...chain,
    chainId: toNumberChainId(chain.chainId),
  }));
}

export async function getDefaultBlockchain(): Promise<BlockchainListItem | null> {
  try {
    const chains = await listBlockchains();
    const active = chains.find((chain) => chain.isActive);
    return active || chains[0] || null;
  } catch {
    return null;
  }
}

export async function listProducts(options: ListProductsOptions = {}): Promise<ProductListItem[]> {
  const normalizedSearch = options.search?.trim();
  const endpoint = normalizedSearch
    ? `${API_BASE_URL}/products/search?q=${encodeURIComponent(normalizedSearch)}`
    : `${API_BASE_URL}/products`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`List products failed: ${response.statusText}`);
  }

  const rawProducts = await response.json();
  const mappedProducts = rawProducts.map(toProductListItem);

  if (!options.categoryId && !options.categorySlug) {
    return mappedProducts;
  }

  return mappedProducts.filter((product: ProductListItem) =>
    product.categories.some((category) => {
      if (options.categoryId && category.id === options.categoryId) return true;
      if (options.categorySlug && category.slug === options.categorySlug) return true;
      return false;
    }),
  );
}

export async function listCustomerProductCategories(token: string): Promise<Category[]> {
  const response = await fetch(`${API_BASE_URL}/customer/product-categories-user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`List customer product categories failed: ${response.statusText}`);
  }

  return response.json();
}

export async function listPublicProductCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE_URL}/products/categories`);
  if (!response.ok) {
    throw new Error(`List product categories failed: ${response.statusText}`);
  }
  return response.json();
}

export async function listProductCategories(token?: string): Promise<Category[]> {
  if (token) {
    try {
      return await listCustomerProductCategories(token);
    } catch (error) {
      console.warn('[API] Falling back to public categories:', error);
    }
  }

  return listPublicProductCategories();
}

function toOrderListItem(raw: any): OrderListItem {
  const normalizedItems = Array.isArray(raw.items)
    ? raw.items.map((item: any) => ({
        id: item.id,
        product: {
          id: item.product?.id || "",
          name: item.product?.name || "Product",
          price: String(item.product?.price || "0"),
          currency: String(item.product?.currency || ""),
          images: Array.isArray(item.product?.images) ? item.product.images : [],
        },
        quantity: Number(item.quantity || 0),
        subtotal: String(item.subtotal || "0"),
      }))
    : [];
  const firstItem = normalizedItems[0] || null;

  return {
    id: raw.id,
    status: raw.status,
    walletAddress: String(raw.walletAddress || ""),
    amount: String(raw.amount || "0"),
    paymentAmount: raw.paymentAmount != null ? String(raw.paymentAmount) : String(raw.amount || "0"),
    paymentCurrency: raw.paymentCurrency != null ? String(raw.paymentCurrency) : null,
    orderValueUsdt: raw.orderValueUsdt != null ? String(raw.orderValueUsdt) : null,
    invoiceId: String(raw.invoiceId || ""),
    latestPaymentTxHash: raw.latestPaymentTxHash ? String(raw.latestPaymentTxHash) : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    network: normalizeNetwork(raw.network),
    product: firstItem
      ? {
          id: firstItem.product?.id,
          name: firstItem.product?.name,
          images: firstItem.product?.images || [],
        }
      : null,
    items: normalizedItems,
  };
}

export async function listOrders(token: string): Promise<OrderListItem[]> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`List orders failed: ${response.statusText}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows.map(toOrderListItem) : [];
}

export async function loginCustomer(
  emailOrPayload: string | { email: string; password: string },
  passwordMaybe?: string,
): Promise<{ token: string; accessToken: string; user: any }> {
  const payload =
    typeof emailOrPayload === 'string'
      ? { email: emailOrPayload, password: passwordMaybe || '' }
      : emailOrPayload;

  const response = await fetch(`${API_BASE_URL}/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Login failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const accessToken = data.accessToken || data.token;

  return {
    token: accessToken,
    accessToken,
    user: data.user,
  };
}

export async function registerCustomer(
  email: string,
  password: string,
  name: string,
): Promise<{ token: string; accessToken: string; user: any }> {
  const response = await fetch(`${API_BASE_URL}/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Register failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const accessToken = data.accessToken || data.token;

  return {
    token: accessToken,
    accessToken,
    user: data.user,
  };
}

export async function listCustomerAddresses(token: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/customer/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`List addresses failed: ${response.statusText}`);
  }

  return response.json();
}

export async function createCustomerAddress(token: string, data: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/customer/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create address failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  return response.json();
}

export async function updateCustomerAddress(token: string, id: string, data: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/customer/addresses/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Update address failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  return response.json();
}

export async function deleteCustomerAddress(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/customer/addresses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Delete address failed: ${response.statusText}`);
  }
}

export async function setDefaultCustomerAddress(token: string, id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/customer/addresses/${id}/default`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Set default failed: ${response.statusText}`);
  }

  return response.json();
}

export function mapBackendToShippingAddress(backend: any): ShippingAddress {
  return {
    id: backend.id,
    name: backend.name || '',
    address1: backend.street1 || backend.address1 || '',
    address2: backend.street2 || backend.address2 || null,
    city: backend.city,
    state: backend.state,
    zipCode: backend.zipCode,
    country: backend.country,
    isPrimary: Boolean(backend.isDefault ?? backend.isPrimary ?? false),
    createdAt: backend.createdAt,
  };
}

export function mapShippingToBackendAddress(shipping: Partial<ShippingAddress>): any {
  const normalizeRequired = (value: string | undefined) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  };

  const normalizeOptional = (value: string | null | undefined) => {
    if (value === null || value === undefined) return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return {
    name: normalizeRequired(shipping.name),
    street1: normalizeRequired(shipping.address1),
    street2: normalizeOptional(shipping.address2),
    city: normalizeRequired(shipping.city),
    state: normalizeOptional(shipping.state),
    zipCode: normalizeRequired(shipping.zipCode),
    country: normalizeRequired(shipping.country)?.toUpperCase(),
    ...(typeof shipping.isPrimary === 'boolean' ? { isDefault: shipping.isPrimary } : {}),
  };
}
