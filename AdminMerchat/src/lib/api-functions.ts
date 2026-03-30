import { request } from './api-client';
import type { MerchantAuth, MerchantProductListOptions, MerchantProductListResponse, BlockchainNetwork, InvoicePaymentsResponse } from './api-client';
import type { MerchantProduct } from './api-client';

export interface Order {
  id: string;
  invoiceId?: string;
  status: string;
  amount: string;
  currency: string;
  // Add other order fields as needed
}

export interface VerifyOrderPaymentInput {
  txHash?: string;
  networkId?: string;
  confirmations?: number;
}

function isHttpStatusError(error: unknown, statuses: number[]) {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return false;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' && statuses.includes(status);
}

export async function listProducts(auth: string | MerchantAuth, options: MerchantProductListOptions = {}) {
  // Uses existing merchant/products endpoint from api-client patterns
  const path = `/merchant/products${createQuery(options)}`;
  return request<MerchantProductListResponse>(path, {
    method: 'GET',
    headers: getMerchantHeaders(auth),
  });
}

export async function listBlockchains(): Promise<BlockchainNetwork[]> {
  // Direct backend blockchain/networks endpoint
  const candidatePaths = ['/blockchain/networks', '/blockchains'];
  let lastError: any = null;

  for (const path of candidatePaths) {
    try {
      const response = await request<any>(path, { method: 'GET' });
      // Normalize using existing logic (reuse extractNetworkArray if possible, simple for now)
      if (Array.isArray(response)) {
        return response
          .map((net: any): BlockchainNetwork => ({
            id: String(net.id ?? net.networkId ?? ''),
            name: String(net.name ?? ''),
            chainId: Number(net.chainId),
            rpcUrl: typeof net.rpcUrl === 'string' ? net.rpcUrl : undefined,
            isActive: net.isActive !== false,
          }))
          .filter((net) => Boolean(net.id && net.name && Number.isFinite(net.chainId)));
      }
      return [];
    } catch (error) {
      if (isHttpStatusError(error, [404, 405])) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Blockchain networks endpoint not available');
}

export async function getOrder(auth: string | MerchantAuth, orderId: string): Promise<Order> {
  const candidatePaths = [`/orders/${orderId}`, `/merchant/orders/${orderId}`];
  let lastError: any = null;

  for (const path of candidatePaths) {
    try {
      return await request<Order>(path, {
        method: 'GET',
        headers: getMerchantHeaders(auth),
      });
    } catch (error) {
      if (isHttpStatusError(error, [404, 405])) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Order endpoint not available');
}

export async function verifyOrderPayment(auth: string | MerchantAuth, orderId: string, input: VerifyOrderPaymentInput) {
  const path = `/orders/${orderId}/verify-payment`;
  return await request<any>(path, {
    method: 'POST',
    headers: getMerchantHeaders(auth),
    body: JSON.stringify(input),
  });
}

// Helper functions (copied from api-client.ts for independence if needed)
function createQuery(params: Record<string, any>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function getMerchantHeaders(auth: string | MerchantAuth) {
  if (typeof auth === 'string') {
    return { 'x-api-key': auth };
  }
  return {
    ...(auth.apiKey ? { 'x-api-key': auth.apiKey } : {}),
    ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
  };
}
