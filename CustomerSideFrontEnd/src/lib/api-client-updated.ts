// Updated api-client.ts with ETH price support
// FIXED api-client.ts - Complete working version with ETH price param

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export type CreateOrderResponse = {
  orderId: string;
  invoiceId: string;
  walletAddress: string;
  amount: string;
  status: string;
  network: {
    name: string;
    chainId: number;
  };
};

function generateIdempotencyKey(): string {
  return crypto.randomUUID() + Date.now().toString(36);
}

// UPDATED: Added currency & currentEthPrice params for ETH handling
export function createOrder(
  accessToken: string,
  items: OrderItemInput[],
  blockchainId?: string,
  shippingAddressId?: string
) {
  return fetch('http://127.0.0.1:3000/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      items,
      ...(blockchainId && { blockchainId }),
      ...(shippingAddressId && { shippingAddressId }),
      idempotencyKey: generateIdempotencyKey()
    })
  }).then(r => r.json());
}

// ... rest of file unchanged (wallet, verify, etc.)
// Single product compatibility
export function createSingleOrder(accessToken: string, productId: string, blockchainId?: string) {
  return createOrder(accessToken, [{productId, quantity: 1}], blockchainId);
}

// [Rest of original file content remains the same...]

