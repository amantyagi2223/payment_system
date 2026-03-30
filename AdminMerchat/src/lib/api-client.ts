export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiClientError";
  }
}

export type InvoiceStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";
export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED";
export type PayoutStatus = "NOT_STARTED" | "PENDING" | "COMPLETED" | "FAILED";

export type AdminLoginResponse = {
  accessToken: string;
  admin: {
    id: string;
    email: string;
  };
};

export type MerchantRegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type MerchantRegisterResponse = {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  createdAt: string;
};

export type MerchantLoginInput = {
  email: string;
  password: string;
};

export type MerchantSession = {
  id?: string;
  email?: string;
  name?: string;
  apiKey?: string;
  accessToken?: string;
};

export type MerchantAuth = {
  apiKey?: string;
  accessToken?: string;
};

export type SuperAdminDashboardResponse = {
  admin: {
    id: string;
    email: string;
  };
  rangeDays: number;
  metrics: {
    merchants: {
      total: number;
      active: number;
      inactive: number;
    };
    invoices: {
      total: number;
      pending: number;
      paid: number;
      expired: number;
      failed: number;
    };
    payments: {
      total: number;
      confirmed: number;
      pending: number;
      failed: number;
    };
    paidVolume: string;
    wallets?: {
      gasConfigured: number;
      feeConfigured: number;
      expected: number;
    };
  };
  networkBreakdown: {
    networkId: string;
    networkName?: string;
    chainId?: number | string | null;
    network?: {
      id: string;
      name: string;
      chainId: number | string;
      code?: string | null;
      symbol?: string | null;
    } | null;
    paymentCount: number;
    paymentVolume: string;
  }[];
  topMerchants: {
    merchantId: string;
    merchantName?: string;
    merchantEmail?: string | null;
    paidInvoiceCount: number;
    paidInvoiceVolume: string;
  }[];
  gasWallets?: {
    walletType: "GAS";
    id: string;
    networkId: string;
    address: string;
    network: {
      id: string;
      name: string;
      chainId: number | string;
      code?: string | null;
      symbol?: string | null;
    };
  }[];
  feeWallets?: {
    walletType: "FEE";
    id: string;
    networkId: string;
    address: string;
    network: {
      id: string;
      name: string;
      chainId: number | string;
      code?: string | null;
      symbol?: string | null;
    };
  }[];
  missingGasNetworks?: {
    id: string;
    name: string;
    chainId: number | string;
    code?: string | null;
    symbol?: string | null;
  }[];
  missingFeeNetworks?: {
    id: string;
    name: string;
    chainId: number | string;
    code?: string | null;
    symbol?: string | null;
  }[];
  wallets?: {
    gas: {
      title: string;
      configuredCount: number;
      expectedCount: number;
      missingCount: number;
      health: "HEALTHY" | "INCOMPLETE";
      configured: {
        walletType: "GAS";
        id: string;
        networkId: string;
        address: string;
        network: {
          id: string;
          name: string;
          chainId: number | string;
          code?: string | null;
          symbol?: string | null;
        };
      }[];
      missingNetworks: {
        id: string;
        name: string;
        chainId: number | string;
        code?: string | null;
        symbol?: string | null;
      }[];
    };
    fee: {
      title: string;
      configuredCount: number;
      expectedCount: number;
      missingCount: number;
      health: "HEALTHY" | "INCOMPLETE";
      configured: {
        walletType: "FEE";
        id: string;
        networkId: string;
        address: string;
        network: {
          id: string;
          name: string;
          chainId: number | string;
          code?: string | null;
          symbol?: string | null;
        };
      }[];
      missingNetworks: {
        id: string;
        name: string;
        chainId: number | string;
        code?: string | null;
        symbol?: string | null;
      }[];
    };
  };
  recentPayments: {
    id: string;
    txHash: string;
    amount: string;
    status: PaymentStatus;
    confirmations: number;
    detectedAt: string;
    network: {
      name: string;
      chainId: number | string;
      code?: string | null;
      symbol?: string | null;
    } | null;
    invoice: {
      id: string;
      merchantId: string;
      merchantName: string;
      merchantEmail: string | null;
    } | null;
  }[];
};

export type SuperAdminMerchantListItem = {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  paidInvoiceCount: number | null;
  paidInvoiceVolume: string | null;
};

export type MerchantDashboardResponse = {
  merchant: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
  rangeDays: number;
  metrics: {
    invoices: {
      total: number;
      pending: number;
      paid: number;
      expired: number;
      failed: number;
    };
    payments: {
      total: number;
      confirmed: number;
      pending: number;
      failed: number;
    };
    paidVolume: string;
  };
  networkBreakdown: {
    networkId: string;
    networkName: string;
    chainId: number | null;
    paymentCount: number;
    paymentVolume: string;
  }[];
  recentInvoices: MerchantInvoiceSummary[];
};

export type MerchantInvoiceSummary = {
  id: string;
  amount: string;
  currency: string;
  status: InvoiceStatus;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  paymentAddress: string;
  network: {
    name: string;
    chainId: number;
  };
};

export type InvoiceListOptions = {
  status?: InvoiceStatus;
  limit?: number;
};

export type InvoicePaymentsResponse = {
  invoice: {
    id: string;
    status: InvoiceStatus;
    paidAt: string | null;
  };
  payments: {
    id: string;
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    confirmations: number;
    status: PaymentStatus;
    detectedAt: string;
    confirmedAt: string | null;
    network: {
      name: string;
      chainId: number;
    };
  }[];
};

export type MerchantProductInput = {
  name: string;
  description: string;
  price?: string;
  salePrice?: string;
  mrp?: string;
  deliveryFee?: string;
  currency: string;
  quantity?: number;
  lowStockThreshold?: number;
  categoryIds?: string[];
  images?: {
    url: string;
    type?: 'IMAGE' | 'VIDEO';
    isPrimary?: boolean;
    sortOrder?: number;
  }[];
};

export type ProductCategory = {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductImage = {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  isPrimary: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type MerchantProduct = {
  id: string;
  name: string;
  description: string;
  price: string;
  salePrice?: string;
  mrp?: string;
  deliveryFee?: string;
  currency: string;
  quantity?: number;
  lowStockThreshold?: number;
  inventoryStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  merchantId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  images?: ProductImage[];
  categories?: ProductCategory[];
  stockActions?: {
    updateInventory?: string;
    manageStock?: string;
  };
};

export type MerchantProductInventoryInput = {
  quantity: number;
  lowStockThreshold?: number;
};

export type MerchantProductListOptions = {
  page?: number;
  limit?: number;
};

export type MerchantProductListResponse = {
  total: number;
  page: number;
  limit: number;
  data: MerchantProduct[];
};

export type BlockchainNetwork = {
  id: string;
  name: string;
  chainId: number;
  rpcUrl?: string;
  isActive?: boolean;
  symbol?: string;
};

export type MerchantPayoutWalletInput = {
  address: string;
  label?: string;
};

export type MerchantPayoutWallet = {
  id: string;
  networkId: string;
  address: string;
  label: string | null;
  isActive: boolean;
  network: {
    id: string;
    name: string;
    chainId: number;
    isActive?: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type SuperAdminGasWalletInput = {
  networkId: string;
  privateKey?: string;
};

export type SuperAdminGasWallet = {
  id: string;
  networkId: string;
  address: string;
  isActive: boolean;
  network: {
    id: string;
    name: string;
    chainId: number | string;
    isActive?: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type SuperAdminGasWalletBootstrapResponse = {
  totalActiveNetworks: number;
  createdCount: number;
  created: {
    networkId: string;
    chainId: number;
    name: string;
    address: string;
  }[];
};

export type SuperAdminGasWalletBalance = {
  id: string;
  networkId: string;
  address: string;
  isActive: boolean;
  network: {
    id: string;
    name: string;
    chainId: number | string;
    isActive?: boolean;
    symbol?: string;
    code?: string;
  };
  nativeBalance: {
    balance: string;
    symbol: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type SuperAdminOrderPayoutListOptions = {
  payoutStatus?: PayoutStatus;
  limit?: number;
};

export type SuperAdminOrderPayout = {
  id: string;
  status: string;
  amount: string;
  payout: {
    status: PayoutStatus;
    txHash: string | null;
    gasFundingTxHash: string | null;
    address: string | null;
    error: string | null;
    completedAt: string | null;
  };
  merchant: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  customer: {
    id: string;
    email: string;
  } | null;
  product: {
    id: string;
    name: string;
    price: string;
    currency: string;
  } | null;
  invoice: {
    id: string | null;
    paidAt: string | null;
    walletAddress: string | null;
    network: {
      id: string;
      name: string;
      chainId: number;
      rpcUrl: string | null;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type SuperAdminOrderPayoutListResponse = {
  total: number;
  limit: number;
  payoutStatus: PayoutStatus | null;
  summary: {
    totalPaidOrders: number;
    payoutStatus: Record<PayoutStatus, number>;
  };
  orders: SuperAdminOrderPayout[];
};

type UnknownRecord = Record<string, unknown>;

function getApiBaseUrl() {
  const baseUrl = process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://127.0.0.1:3000";
  return baseUrl.replace(/\/$/, "");
}

function createQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(", ");
    }

    if (data.message) {
      return data.message;
    }
  } catch {
    // Ignore parse failures and fallback to generic message.
  }

  return `Request failed with status ${response.status}`;
}

export async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Network request failed";
    throw new ApiClientError(`Unable to connect to backend API (${reason})`, 0);
  }

  if (!response.ok) {
    throw new ApiClientError(await parseError(response), response.status);
  }

  return (await response.json()) as T;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function pickString(records: Array<UnknownRecord | null>, keys: string[]) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = readString(record[key]);
      if (value) {
        return value;
      }
    }
  }

  return undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function pickNumber(records: Array<UnknownRecord | null>, keys: string[]) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = readNumber(record[key]);
      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
}

function pickBoolean(records: Array<UnknownRecord | null>, keys: string[]) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = record[key];
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "active" || normalized === "true" || normalized === "enabled") {
          return true;
        }
        if (normalized === "inactive" || normalized === "false" || normalized === "disabled") {
          return false;
        }
      }
    }
  }

  return undefined;
}

function extractMerchantArray(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const candidates: unknown[] = [
    root.merchants,
    root.items,
    root.results,
    root.rows,
    root.data,
    asRecord(root.data)?.merchants,
    asRecord(root.data)?.items,
    asRecord(root.data)?.results,
    asRecord(root.data)?.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractInvoiceArray(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const nestedData = asRecord(root.data);
  const candidates: unknown[] = [
    root.invoices,
    root.items,
    root.results,
    root.rows,
    root.data,
    nestedData?.invoices,
    nestedData?.items,
    nestedData?.results,
    nestedData?.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractProductArray(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const nestedData = asRecord(root.data);
  const candidates: unknown[] = [
    root.products,
    root.items,
    root.results,
    root.rows,
    root.data,
    nestedData?.products,
    nestedData?.items,
    nestedData?.results,
    nestedData?.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractCategoryArray(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const nestedData = asRecord(root.data);
  const candidates: unknown[] = [
    root.categories,
    root.items,
    root.results,
    root.rows,
    root.data,
    nestedData?.categories,
    nestedData?.items,
    nestedData?.results,
    nestedData?.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractNetworkArray(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const nestedData = asRecord(root.data);
  const candidates: unknown[] = [root.networks, root.items, root.results, root.rows, root.data, nestedData?.networks];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeBlockchainNetwork(payload: unknown): BlockchainNetwork | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const id = pickString([root], ["id", "networkId", "network_id"]);
  const name = pickString([root], ["name"]);
  const chainId = pickNumber([root], ["chainId", "chain_id"]);
  const rpcUrl = pickString([root], ["rpcUrl", "rpc_url"]);
  const isActive = pickBoolean([root], ["isActive", "active"]);

  if (!id || !name || chainId === undefined) {
    return null;
  }

  return {
    id,
    name,
    chainId,
    rpcUrl,
    isActive,
  };
}

function normalizeSuperAdminMerchant(payload: unknown): SuperAdminMerchantListItem | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const nestedScopes = [
    asRecord(root.merchant),
    asRecord(root.user),
    asRecord(root.account),
    asRecord(root.profile),
  ];
  const allScopes = [root, ...nestedScopes];

  const id = pickString(allScopes, ["id", "merchantId", "merchant_id", "uuid"]);
  const name = pickString(allScopes, ["name", "merchantName", "businessName", "companyName", "storeName"]);
  const email = pickString(allScopes, ["email", "merchantEmail", "merchant_email"]);
  const isActive = pickBoolean(allScopes, ["isActive", "active", "status"]);
  const createdAt = pickString(allScopes, ["createdAt", "created_at", "joinedAt", "joined_at"]) ?? null;
  const paidInvoiceCount = pickNumber(allScopes, ["paidInvoiceCount", "invoiceCount", "invoicesCount", "totalInvoices"]);
  const paidInvoiceVolume = pickString(allScopes, [
    "paidInvoiceVolume",
    "paidVolume",
    "invoiceVolume",
    "volume",
  ]);

  if (!id && !name && !email) {
    return null;
  }

  const stableId = id ?? email ?? name ?? `merchant-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: stableId,
    name: name ?? "Unknown Merchant",
    email: email ?? null,
    isActive: isActive ?? null,
    createdAt,
    paidInvoiceCount: paidInvoiceCount ?? null,
    paidInvoiceVolume: paidInvoiceVolume ?? null,
  };
}

function normalizeProductCategory(payload: unknown): ProductCategory | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const id = pickString([root], ["id", "categoryId", "category_id"]);
  const name = pickString([root], ["name", "title", "label"]);
  const slug = pickString([root], ["slug"]);
  const isActive = pickBoolean([root], ["isActive", "active"]);
  const createdAt = pickString([root], ["createdAt", "created_at"]);
  const updatedAt = pickString([root], ["updatedAt", "updated_at"]);
  const productCount = pickNumber([root, asRecord(root._count)], ["productCount", "products"]);

  if (!id && !name) {
    return null;
  }

  return {
    id: id ?? `category-${Math.random().toString(36).slice(2, 8)}`,
    name: name ?? "Uncategorized",
    slug: slug ?? undefined,
    isActive: isActive ?? undefined,
    productCount: productCount ?? undefined,
    createdAt: createdAt ?? undefined,
    updatedAt: updatedAt ?? undefined,
  };
}

function normalizeMerchantProduct(payload: unknown): MerchantProduct | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const nestedScopes = [asRecord(root.product), asRecord(root.data)];
  const allScopes = [root, ...nestedScopes];

  const id = pickString(allScopes, ["id", "productId", "product_id", "uuid"]);
  const name = pickString(allScopes, ["name", "title"]);
  const description = pickString(allScopes, ["description", "details"]);
  const rawPrice = pickString(allScopes, ["price", "amount", "value"]);
  const rawSalePrice = pickString(allScopes, ["salePrice", "sale_price"]);
  const rawMrp = pickString(allScopes, ["mrp", "listPrice", "list_price"]);
  const rawDeliveryFee = pickString(allScopes, ["deliveryFee", "delivery_fee", "shippingFee", "shipping_fee"]);
  const numericPrice = pickNumber(allScopes, ["price", "amount", "value"]);
  const currency = pickString(allScopes, ["currency", "currencyCode", "currency_code"]);
  const quantity = pickNumber(allScopes, ["quantity", "stock", "inventory"]);
  const lowStockThreshold = pickNumber(allScopes, ["lowStockThreshold", "low_stock_threshold"]);
  const inventoryStatus = pickString(allScopes, ["inventoryStatus", "inventory_status"]);
  const merchantId = pickString(allScopes, ["merchantId", "merchant_id"]);
  const createdAt = pickString(allScopes, ["createdAt", "created_at"]) ?? null;
  const updatedAt = pickString(allScopes, ["updatedAt", "updated_at"]) ?? null;
  const stockActionsRoot = asRecord(root.stockActions);
  const stockActionsNested = asRecord(asRecord(root.product)?.stockActions);
  const stockActions = {
    updateInventory: pickString([stockActionsRoot, stockActionsNested], ["updateInventory", "update_inventory"]),
    manageStock: pickString([stockActionsRoot, stockActionsNested], ["manageStock", "manage_stock"]),
  };

  // Extract images
  const imagesArray = root.images as Array<UnknownRecord | null> | undefined;
  const images: ProductImage[] = Array.isArray(imagesArray)
    ? imagesArray
        .map((img): ProductImage | null => {
          if (!img) return null;
          const url = pickString([img], ["url"]);
          if (!url) return null;
          return {
            id: pickString([img], ["id"]) ?? `img-${Math.random().toString(36).slice(2, 8)}`,
            url,
            type: (pickString([img], ["type"]) as "IMAGE" | "VIDEO") || "IMAGE",
            isPrimary: pickBoolean([img], ["isPrimary", "is_primary", "primary"]) ?? false,
            sortOrder: pickNumber([img], ["sortOrder", "sort_order", "order"]) ?? 0,
          };
        })
        .filter((img): img is ProductImage => img !== null)
    : [];

  const categoriesArray = (
    root.categories ??
    asRecord(root.data)?.categories ??
    asRecord(root.product)?.categories
  ) as Array<UnknownRecord | null> | undefined;
  const categories: ProductCategory[] = Array.isArray(categoriesArray)
    ? categoriesArray
        .map((category) => normalizeProductCategory(category))
        .filter((category): category is ProductCategory => category !== null)
    : [];

  if (!id && !name) {
    return null;
  }

  return {
    id: id ?? `product-${Math.random().toString(36).slice(2, 8)}`,
    name: name ?? "Untitled Product",
    description: description ?? "",
    price: rawPrice ?? (numericPrice !== undefined ? String(numericPrice) : "0"),
    salePrice: rawSalePrice ?? undefined,
    mrp: rawMrp ?? undefined,
    deliveryFee: rawDeliveryFee ?? undefined,
    currency: currency ?? "USD",
    quantity: quantity ?? undefined,
    lowStockThreshold: lowStockThreshold ?? undefined,
    inventoryStatus:
      inventoryStatus === "IN_STOCK" || inventoryStatus === "LOW_STOCK" || inventoryStatus === "OUT_OF_STOCK"
        ? inventoryStatus
        : undefined,
    merchantId: merchantId ?? null,
    createdAt,
    updatedAt,
    images: images.length > 0 ? images : undefined,
    categories: categories.length > 0 ? categories : undefined,
    stockActions: stockActions.updateInventory || stockActions.manageStock ? stockActions : undefined,
  };
}

function getMerchantHeaders(auth: string | MerchantAuth) {
  if (typeof auth === "string") {
    return { "x-api-key": auth };
  }

  return {
    ...(auth.apiKey ? { "x-api-key": auth.apiKey } : {}),
    ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
  };
}

export function loginSuperAdmin(email: string, password: string) {
  return request<AdminLoginResponse>("/super-admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function registerMerchant(input: MerchantRegisterInput) {
  return request<MerchantRegisterResponse>("/merchant/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginMerchant(input: MerchantLoginInput) {
  const candidatePaths = ["/merchant/login", "/merchant/signin", "/merchant/auth/login", "/auth/merchant/login", "/auth/login"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      return await request<unknown>(path, {
        method: "POST",
        body: JSON.stringify(input),
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Merchant login endpoint is not available.", 404);
}

export function normalizeMerchantSession(payload: unknown): MerchantSession | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const nestedContainers = [
    asRecord(root.data),
    asRecord(root.payload),
    asRecord(root.result),
    asRecord(root.session),
  ];

  const merchantScopes = [
    asRecord(root.merchant),
    asRecord(root.user),
    asRecord(root.account),
    ...nestedContainers.flatMap((container) => [
      asRecord(container?.merchant),
      asRecord(container?.user),
      asRecord(container?.account),
    ]),
  ];

  const allScopes = [root, ...nestedContainers, ...merchantScopes];

  const merchantId = pickString(allScopes, ["id", "merchantId", "merchant_id"]);
  const merchantEmail = pickString(allScopes, ["email", "merchantEmail", "merchant_email"]);
  const merchantName = pickString(allScopes, ["name", "merchantName", "businessName"]);
  const merchantApiKey = pickString(allScopes, ["apiKey", "api_key", "xApiKey", "x_api_key"]);
  const merchantAccessToken = pickString(allScopes, [
    "accessToken",
    "access_token",
    "token",
    "jwt",
    "jwtToken",
    "authToken",
  ]);

  if (!merchantApiKey && !merchantAccessToken) {
    return null;
  }

  return {
    id: merchantId,
    email: merchantEmail,
    name: merchantName,
    apiKey: merchantApiKey,
    accessToken: merchantAccessToken,
  };
}

export function getSuperAdminDashboard(accessToken: string, days = 30) {
  return request<SuperAdminDashboardResponse>(`/super-admin/dashboard${createQuery({ days })}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function listSuperAdminMerchants(accessToken: string) {
  const candidatePaths = ["/super-admin/merchants", "/super-admin/merchant", "/admin/merchants", "/merchants"];
  let lastNotFoundError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<unknown>(path, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const merchantRows = extractMerchantArray(response);
      if (!merchantRows.length) {
        const singleMerchant = normalizeSuperAdminMerchant(response);
        return singleMerchant ? [singleMerchant] : [];
      }

      return merchantRows
        .map((row) => normalizeSuperAdminMerchant(row))
        .filter((row): row is SuperAdminMerchantListItem => Boolean(row));
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastNotFoundError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNotFoundError ?? new ApiClientError("Merchant list endpoint is not available.", 404);
}

export async function listSuperAdminProductCategories(accessToken: string, includeInactive = true) {
  const candidatePaths = [
    `/super-admin/product-categories${createQuery({ includeInactive: includeInactive ? "true" : "false" })}`,
    `/admin/product-categories${createQuery({ includeInactive: includeInactive ? "true" : "false" })}`,
  ];
  let lastNotFoundError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<unknown>(path, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const categoryRows = extractCategoryArray(response);
      if (!categoryRows.length) {
        const singleCategory = normalizeProductCategory(response);
        return singleCategory ? [singleCategory] : [];
      }

      return categoryRows
        .map((row) => normalizeProductCategory(row))
        .filter((row): row is ProductCategory => Boolean(row));
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastNotFoundError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNotFoundError ?? new ApiClientError("Product category endpoint is not available.", 404);
}

export async function createSuperAdminProductCategory(accessToken: string, name: string) {
  const candidatePaths = ["/super-admin/product-categories", "/admin/product-categories"];
  let lastNotFoundError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<unknown>(path, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name }),
      });

      const category = normalizeProductCategory(response);
      if (!category) {
        throw new Error("Category create response is invalid.");
      }
      return category;
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastNotFoundError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNotFoundError ?? new ApiClientError("Product category create endpoint is not available.", 404);
}

export async function deleteSuperAdminProductCategory(accessToken: string, categoryId: string) {
  const candidatePaths = ["/super-admin/product-categories", "/admin/product-categories"];
  let lastNotFoundError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      return await request<unknown>(`${path}/${categoryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastNotFoundError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNotFoundError ?? new ApiClientError("Product category delete endpoint is not available.", 404);
}

export async function getMerchantDashboard(auth: string | MerchantAuth, days = 30) {
  const candidatePaths = ["/merchant/dashboard", "/dashboard", "/merchant/stats"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      return await request<MerchantDashboardResponse>(`${path}${createQuery({ days })}`, {
        method: "GET",
        headers: getMerchantHeaders(auth),
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Merchant dashboard endpoint is not available.", 404);
}

function normalizeMerchantInvoice(payload: unknown): MerchantInvoiceSummary | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const nestedScopes = [asRecord(root.invoice), asRecord(root.data)];
  const allScopes = [root, ...nestedScopes];

  const id = pickString(allScopes, ["id", "invoiceId", "invoice_id"]);
  const amount = pickString(allScopes, ["amount", "total", "value"]);
  const currency = pickString(allScopes, ["currency", "currencyCode", "currency_code"]);
  const status = pickString(allScopes, ["status", "invoiceStatus"]);
  const expiresAt = pickString(allScopes, ["expiresAt", "expires_at", "expiryDate", "expiry_date"]);
  const paidAt = pickString(allScopes, ["paidAt", "paid_at", "paidDate", "paid_date"]);
  const createdAt = pickString(allScopes, ["createdAt", "created_at"]);
  const paymentAddress = pickString(allScopes, ["paymentAddress", "payment_address", "walletAddress", "wallet_address", "address"]);

  const dataScope = asRecord(root.data);
  const network = asRecord((root as UnknownRecord).network ?? dataScope?.network);
  const networkName = pickString([network], ["name", "networkName", "network_name"]);
  const networkChainId = pickNumber([network], ["chainId", "chain_id"]);

  if (!id) {
    return null;
  }

  return {
    id,
    amount: amount ?? "0",
    currency: currency ?? "USD",
    status: (status as InvoiceStatus) ?? "PENDING",
    expiresAt: expiresAt ?? new Date().toISOString(),
    paidAt: paidAt ?? null,
    createdAt: createdAt ?? new Date().toISOString(),
    paymentAddress: paymentAddress ?? "",
    network: {
      name: networkName ?? "Unknown",
      chainId: networkChainId ?? 0,
    },
  };
}

export async function listMerchantInvoices(auth: string | MerchantAuth, options: InvoiceListOptions = {}) {
  const candidatePaths = ["/merchant/invoices", "/invoices", "/invoice", "/merchant/invoice"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<unknown>(`${path}${createQuery(options)}`, {
        method: "GET",
        headers: getMerchantHeaders(auth),
      });

      const invoiceRows = extractInvoiceArray(response);
      if (!invoiceRows.length) {
        const singleInvoice = normalizeMerchantInvoice(response);
        return singleInvoice ? [singleInvoice] : [];
      }

      return invoiceRows
        .map((row) => normalizeMerchantInvoice(row))
        .filter((row): row is MerchantInvoiceSummary => Boolean(row));
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Invoice list endpoint is not available.", 404);
}

export async function listMerchantProductCategories(auth: string | MerchantAuth) {
  const candidatePaths = [
    "/merchant/product-categories",
    "/merchant/categories",
    "/products/categories",
    "/product-categories",
    "/categories",
  ];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<unknown>(path, {
        method: "GET",
        headers: getMerchantHeaders(auth),
      });

      const rows = extractCategoryArray(response);
      if (!rows.length) {
        const singleCategory = normalizeProductCategory(response);
        return singleCategory ? [singleCategory] : [];
      }

      return rows
        .map((row) => normalizeProductCategory(row))
        .filter((row): row is ProductCategory => Boolean(row));
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Product category list endpoint is not available.", 404);
}

export async function listMerchantProducts(auth: string | MerchantAuth, options: MerchantProductListOptions = {}) {
  const response = await request<unknown>(`/merchant/products${createQuery(options)}`, {
    method: "GET",
    headers: getMerchantHeaders(auth),
  });

  const root = asRecord(response);
  const rows = extractProductArray(response);
  const products = rows
    .map((row) => normalizeMerchantProduct(row))
    .filter((row): row is MerchantProduct => Boolean(row));
  const nestedData = asRecord(root?.data);

  return {
    total: pickNumber([root, nestedData], ["total", "count"]) ?? products.length,
    page: pickNumber([root, nestedData], ["page"]) ?? options.page ?? 1,
    limit: pickNumber([root, nestedData], ["limit", "pageSize", "page_size"]) ?? options.limit ?? 10,
    data: products,
  } satisfies MerchantProductListResponse;
}

export async function createMerchantProduct(auth: string | MerchantAuth, input: MerchantProductInput) {
  const candidatePaths = ["/merchant/products", "/products"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<unknown>(path, {
        method: "POST",
        headers: getMerchantHeaders(auth),
        body: JSON.stringify(input),
      });

      const product = normalizeMerchantProduct(response);
      if (!product) {
        throw new Error("Product create response is invalid.");
      }

      return product;
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Product create endpoint is not available.", 404);
}

export async function updateMerchantProduct(auth: string | MerchantAuth, productId: string, input: MerchantProductInput) {
  const candidatePaths = ["/merchant/products", "/products"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<unknown>(`${path}/${productId}`, {
        method: "PUT",
        headers: getMerchantHeaders(auth),
        body: JSON.stringify(input),
      });

      const product = normalizeMerchantProduct(response);
      if (!product) {
        throw new Error("Product update response is invalid.");
      }

      return product;
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Product update endpoint is not available.", 404);
}

export async function updateMerchantProductInventory(
  auth: string | MerchantAuth,
  productId: string,
  input: MerchantProductInventoryInput,
) {
  const candidateEndpoints: Array<{ path: string; method: "PATCH" | "PUT" }> = [
    { path: `/merchant/products/${productId}/manage-stock`, method: "PATCH" },
    { path: `/merchant/products/${productId}/inventory`, method: "PUT" },
    { path: `/products/${productId}/inventory`, method: "PUT" },
  ];
  let lastError: ApiClientError | null = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await request<unknown>(endpoint.path, {
        method: endpoint.method,
        headers: getMerchantHeaders(auth),
        body: JSON.stringify(input),
      });

      const product = normalizeMerchantProduct(response) ?? normalizeMerchantProduct(asRecord(response)?.product);
      if (!product) {
        throw new Error("Product inventory update response is invalid.");
      }

      return product;
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Product inventory endpoint is not available.", 404);
}

export async function deleteMerchantProduct(auth: string | MerchantAuth, productId: string) {
  const candidatePaths = ["/merchant/products", "/products"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      return await request<{ message?: string }>(`${path}/${productId}`, {
        method: "DELETE",
        headers: getMerchantHeaders(auth),
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Product delete endpoint is not available.", 404);
}

// Product Image Management
export type ProductImageInput = {
  url: string;
  type?: 'IMAGE' | 'VIDEO';
  isPrimary?: boolean;
  sortOrder?: number;
};

export async function addProductImages(
  auth: string | MerchantAuth,
  productId: string,
  images: ProductImageInput[],
) {
  const response = await request<unknown>(`/merchant/products/${productId}/images`, {
    method: "POST",
    headers: getMerchantHeaders(auth),
    body: JSON.stringify(images),
  });

  const product = normalizeMerchantProduct(response);
  if (!product) {
    throw new Error("Product image add response is invalid.");
  }

  return product;
}

export async function updateProductImages(
  auth: string | MerchantAuth,
  productId: string,
  images: ProductImageInput[],
) {
  const response = await request<unknown>(`/merchant/products/${productId}/images`, {
    method: "PUT",
    headers: getMerchantHeaders(auth),
    body: JSON.stringify(images),
  });

  const product = normalizeMerchantProduct(response);
  if (!product) {
    throw new Error("Product image update response is invalid.");
  }

  return product;
}

export async function deleteProductImage(
  auth: string | MerchantAuth,
  productId: string,
  imageId: string,
) {
  return request<{ success: boolean; message: string }>(`/merchant/products/${productId}/images/${imageId}`, {
    method: "DELETE",
    headers: getMerchantHeaders(auth),
  });
}

export type UploadResponse = {
  url: string;
  filename: string;
};

export async function uploadMerchantProductImage(auth: string | MerchantAuth, productId: string, file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${getApiBaseUrl()}/merchant/products/${productId}/image`, {
    method: "POST",
    headers: getMerchantHeaders(auth),
    body: formData,
  });

  if (!response.ok) {
    throw new ApiClientError(await parseError(response), response.status);
  }

  return (await response.json()) as UploadResponse;
}

export async function uploadMerchantProductVideo(auth: string | MerchantAuth, productId: string, file: File) {
  const formData = new FormData();
  formData.append("video", file);

  const response = await fetch(`${getApiBaseUrl()}/merchant/products/${productId}/video`, {
    method: "POST",
    headers: getMerchantHeaders(auth),
    body: formData,
  });

  if (!response.ok) {
    throw new ApiClientError(await parseError(response), response.status);
  }

  return (await response.json()) as UploadResponse;
}

export async function getPaymentsForInvoice(auth: string | MerchantAuth, invoiceId: string) {
  const candidatePaths = [
    `/merchant/payments/invoice/${invoiceId}`,
    `/payment/invoice/${invoiceId}`,
    `/payments/invoice/${invoiceId}`,
    `/invoice/${invoiceId}/payments`,
  ];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      return await request<InvoicePaymentsResponse>(path, {
        method: "GET",
        headers: getMerchantHeaders(auth),
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Invoice payments endpoint is not available.", 404);
}

export async function listBlockchainNetworks() {
  const candidatePaths = ["/blockchain/networks", "/blockchains"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<unknown>(path, {
        method: "GET",
      });

      return extractNetworkArray(response)
        .map((row) => normalizeBlockchainNetwork(row))
        .filter((row): row is BlockchainNetwork => Boolean(row));
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Network list endpoint is not available.", 404);
}

export async function listMerchantPayoutWallets(auth: string | MerchantAuth) {
  const candidatePaths = ["/merchant/payout-wallets", "/payout-wallets", "/wallets"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      return await request<MerchantPayoutWallet[]>(path, {
        method: "GET",
        headers: getMerchantHeaders(auth),
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Payout wallets endpoint is not available.", 404);
}

export async function upsertMerchantPayoutWallet(
  auth: string | MerchantAuth,
  networkId: string,
  input: MerchantPayoutWalletInput,
) {
  const candidatePaths = ["/merchant/payout-wallets", "/payout-wallets"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      return await request<MerchantPayoutWallet>(`${path}/${networkId}`, {
        method: "PUT",
        headers: getMerchantHeaders(auth),
        body: JSON.stringify(input),
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Payout wallet update endpoint is not available.", 404);
}

export async function deactivateMerchantPayoutWallet(auth: string | MerchantAuth, networkId: string) {
  const candidatePaths = ["/merchant/payout-wallets", "/payout-wallets"];
  let lastError: ApiClientError | null = null;

  for (const path of candidatePaths) {
    try {
      return await request<MerchantPayoutWallet>(`${path}/${networkId}`, {
        method: "DELETE",
        headers: getMerchantHeaders(auth),
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiClientError("Payout wallet delete endpoint is not available.", 404);
}

export function listSuperAdminGasWallets(accessToken: string) {
  return request<SuperAdminGasWallet[]>("/super-admin/gas-wallets", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function upsertSuperAdminGasWallet(accessToken: string, input: SuperAdminGasWalletInput) {
  return request<SuperAdminGasWallet>("/super-admin/gas-wallets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
}

export function bootstrapSuperAdminGasWallets(accessToken: string) {
  return request<SuperAdminGasWalletBootstrapResponse>("/super-admin/gas-wallets/bootstrap", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function listSuperAdminGasWalletBalances(accessToken: string) {
  return request<SuperAdminGasWalletBalance[]>("/super-admin/gas-wallets/balances", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function listSuperAdminFeeWalletBalances(accessToken: string) {
  return request<SuperAdminGasWalletBalance[]>("/super-admin/fee-wallets/balances", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function listSuperAdminFeeWallets(accessToken: string) {
  return request<SuperAdminGasWallet[]>("/super-admin/fee-wallets", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function upsertSuperAdminFeeWallet(accessToken: string, input: SuperAdminGasWalletInput) {
  return request<SuperAdminGasWallet>("/super-admin/fee-wallets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
}

export function bootstrapSuperAdminFeeWallets(accessToken: string) {
  return request<SuperAdminGasWalletBootstrapResponse>("/super-admin/fee-wallets/bootstrap", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function listSuperAdminOrderPayouts(accessToken: string, options: SuperAdminOrderPayoutListOptions = {}) {
  return request<SuperAdminOrderPayoutListResponse>(
    `/super-admin/orders/payouts${createQuery({
      payoutStatus: options.payoutStatus,
      limit: options.limit,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

export function completeSuperAdminOrderPayment(accessToken: string, orderId: string) {
  return request<SuperAdminOrderPayout["payout"]>(`/super-admin/orders/${orderId}/complete-payment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getBackendHealth() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/`, { cache: "no-store" });

    if (!response.ok) {
      return {
        ok: false,
        message: `Unavailable (${response.status})`,
      };
    }

    return {
      ok: true,
      message: await response.text(),
    };
  } catch {
    return {
      ok: false,
      message: "Backend unreachable",
    };
  }
}
