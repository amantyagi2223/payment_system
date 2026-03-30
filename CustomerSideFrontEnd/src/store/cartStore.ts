"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductListItem } from "@/lib/api-client";

export interface CartItem {
  productId: string;
  name: string;
  priceUSD: number;
  mrp: number;
  deliveryCost: number;
  qty: number;
  merchantId: string;
  merchantName: string;
  imageUrl?: string | null;
}

function sanitizeItemsForPersistence(items: Record<string, CartItem[] | undefined>): Record<string, CartItem[]> {
  const sanitized: Record<string, CartItem[]> = {};

  for (const [merchantId, merchantItems] of Object.entries(items)) {
    if (!Array.isArray(merchantItems) || merchantItems.length === 0) {
      continue;
    }

    sanitized[merchantId] = merchantItems.map((item) => ({
      productId: item.productId,
      name: item.name,
      priceUSD: item.priceUSD,
      mrp: item.mrp,
      deliveryCost: item.deliveryCost,
      qty: item.qty,
      merchantId: item.merchantId,
      merchantName: item.merchantName,
    }));
  }

  return sanitized;
}

const cartStorage = createJSONStorage(() => ({
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        console.warn("Cart persistence quota exceeded. Cart will continue in memory for this session.");
        return;
      }
      throw error;
    }
  },
  removeItem: (name: string) => localStorage.removeItem(name),
}));

interface CartState {
  items: Record<string, CartItem[] | undefined>;
  isHydrated: boolean;
  selectedMerchantId: string | null;
  addItem: (product: ProductListItem, qty?: number) => void;

  updateQty: (merchantId: string, productId: string, qty: number) => void;
  removeItem: (merchantId: string, productId: string) => void;
  clearMerchant: (merchantId: string) => void;
  clearAll: () => void;
  setSelectedMerchantId: (merchantId: string | null) => void;
  hydrate: () => void;
  getCartForMerchant: (merchantId: string) => CartItem[];
  getDeliveryFee: (merchantId: string) => number;
  getSubtotalUSD: (merchantId: string) => number;
  getTotalUSD: (merchantId?: string) => number;
  getMerchantsWithItems: () => string[];
  getTotalItems: () => number;
  getCurrentMerchantId: () => string | null;
  getMerchantDeliveryTotal: (merchantId: string) => number;
  isEmpty: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},
      isHydrated: false,
      selectedMerchantId: null,

      hydrate: () => set({ isHydrated: true }),

      addItem: (product, qty = 1) => {
        const { items } = get();
        const merchantId = product.merchant.id;
        const existingItems = items[merchantId] || [];

        const existingIndex = existingItems.findIndex((item) => item.productId === product.id);
        const newItem: CartItem = {
          productId: product.id,
          imageUrl: product.imageUrl,
          name: product.name,
          priceUSD: product.priceUSD,
          mrp: Number(product.mrp || product.basePriceUSD || product.priceUSD),  
          deliveryCost: parseFloat(product.deliveryFee || "0"),
          qty,
          merchantId,
          merchantName: product.merchant.name,
        };

        if (existingIndex >= 0) {
          const updatedItems = [...existingItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            qty: updatedItems[existingIndex].qty + qty,
          };
          set({ items: { ...items, [merchantId]: updatedItems } });
        } else {
          set({
            items: { ...items, [merchantId]: [...existingItems, newItem] },
          });
        }
      },

      updateQty: (merchantId, productId, qty) => {
        if (qty <= 0) {
          get().removeItem(merchantId, productId);
          return;
        }

        const { items } = get();
        const merchantItems = items[merchantId] || [];
        const updatedItems = merchantItems
          .map((item) => (item.productId === productId ? { ...item, qty } : item))
          .filter((item) => item.qty > 0);

        set({
          items: {
            ...items,
            [merchantId]: updatedItems.length > 0 ? updatedItems : undefined,
          },
        });
      },
      
      removeItem: (merchantId, productId) => {
        const { items } = get();
        const merchantItems = items[merchantId] || [];
        const updatedItems = merchantItems.filter((item) => item.productId !== productId);

        set({
          items: {
            ...items,
            [merchantId]: updatedItems.length > 0 ? updatedItems : undefined,
          },
        });
      },
      
      clearMerchant: (merchantId) => {
        const { items } = get();
        const { [merchantId]: removed, ...rest } = items;
        void removed;
        set({ items: rest });
      },

      clearAll: () => set({ items: {}, selectedMerchantId: null }),

      setSelectedMerchantId: (merchantId) => set({ selectedMerchantId: merchantId }),

      getCartForMerchant: (merchantId) => {
        const { items } = get();
        return items[merchantId] || [];
      },

      getTotalItems: () => {
        const { items, isHydrated } = get();
        if (!isHydrated) return 0;
        return Object.values(items).reduce(
          (sum, merchantItems) =>
            sum + (Array.isArray(merchantItems) ? merchantItems.reduce((acc, item) => acc + item.qty, 0) : 0),
          0,
        );
      },

      getMerchantDeliveryTotal: (merchantId: string) => {
        const { items } = get();
        const merchantItems = items[merchantId] || [];
        return merchantItems.reduce((acc, item) => acc + item.deliveryCost * item.qty, 0);
      },

      getDeliveryFee: (merchantId: string) => {
        return get().getMerchantDeliveryTotal(merchantId);
      },

      getSubtotalUSD: (merchantId: string) => {
        const { items } = get();
        const merchantItems = items[merchantId] || [];
        return merchantItems.reduce((acc, item) => acc + item.priceUSD * item.qty, 0);
      },

      getTotalUSD: (merchantId?: string) => {
        const { items, isHydrated } = get();
        if (!isHydrated) return 0;

        if (merchantId) {
          const merchantItems = items[merchantId] || [];
          const subtotal = merchantItems.reduce((acc, item) => acc + item.priceUSD * item.qty, 0);
          const delivery = get().getMerchantDeliveryTotal(merchantId);
          return subtotal + delivery;
        }

        return Object.entries(items).reduce(
          (sum, [mId, mItems]) =>
            Array.isArray(mItems)
              ? sum +
                mItems.reduce((acc, item) => acc + item.priceUSD * item.qty, 0) +
                get().getMerchantDeliveryTotal(mId)
              : sum,
          0,
        );
      },

      getCurrentMerchantId: () => {
        const { items, isHydrated, selectedMerchantId } = get();
        if (!isHydrated) return null;
        if (selectedMerchantId && Array.isArray(items[selectedMerchantId])) return selectedMerchantId;
        const merchantIds = Object.keys(items).filter(key => Array.isArray(items[key]));
        return merchantIds.length === 1 ? merchantIds[0] : null;
      },

      getMerchantsWithItems: () => {
        const { items, isHydrated } = get();
        if (!isHydrated) return [];
        return Object.keys(items).filter((key) => Array.isArray(items[key]));
      },

      isEmpty: () => {
        const { items, isHydrated } = get();
        if (!isHydrated) return true;
        return Object.keys(items).filter((key) => Array.isArray(items[key])).length === 0;
      },
    }),
    {
      name: "cart-storage",
      storage: cartStorage,
      partialize: (state) => ({
        items: sanitizeItemsForPersistence(state.items),
        selectedMerchantId: state.selectedMerchantId,
      }),
    },
  ),
);
