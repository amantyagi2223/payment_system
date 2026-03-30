"use client"

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  listCustomerAddresses, 
  createCustomerAddress, 
  updateCustomerAddress, 
  deleteCustomerAddress, 
  setDefaultCustomerAddress,
  mapBackendToShippingAddress,
  mapShippingToBackendAddress 
} from '../lib/api-client';


const TOKEN_KEY = 'marketplace_token';
const LEGACY_TOKEN_KEY = 'customer_token';
const USER_INFO_KEY = 'marketplace_user';
const ADDRESSES_KEY = 'marketplace_addresses';

interface UserInfo {
  id: string;
  email: string;
  name?: string;
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

interface ExtendedAuthState {
  token: string | null;
  user: UserInfo | null;
  shippingAddresses: ShippingAddress[];
  loadShippingAddresses: () => Promise<void>;
  setToken: (token: string, user?: UserInfo) => void;
  setUser: (user: UserInfo) => void;
  setShippingAddresses: (addresses: ShippingAddress[]) => void;
  addShippingAddress: (
    address: Omit<ShippingAddress, 'id' | 'createdAt' | 'isPrimary'> & { isPrimary?: boolean }
  ) => Promise<ShippingAddress>;
  updateShippingAddress: (id: string, updates: Partial<ShippingAddress>) => Promise<ShippingAddress>;
  removeShippingAddress: (id: string) => Promise<void>;
  setPrimaryAddress: (id: string) => Promise<ShippingAddress>;
  logout: () => void;
}

const getInitialToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const token = localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
  if (token && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
};

const getInitialUser = (): UserInfo | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const userStr = localStorage.getItem(USER_INFO_KEY);
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch {
    return null;
  }
  return null;
};

const getInitialAddresses = (): ShippingAddress[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const addrStr = localStorage.getItem(ADDRESSES_KEY);
    return addrStr ? JSON.parse(addrStr) : [];
  } catch {
    return [];
  }
};

export const useAuthStore = create<ExtendedAuthState>()(
  persist(
    (set, get) => ({
      token: getInitialToken(),
      user: getInitialUser(),
      shippingAddresses: getInitialAddresses(),

      setToken: (authToken, userInfo) => {
        localStorage.setItem(TOKEN_KEY, authToken);
        localStorage.setItem(LEGACY_TOKEN_KEY, authToken);

        if (userInfo) {
          localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
          set({ token: authToken, user: userInfo });
        } else {
          set({ token: authToken });
        }
      },

      setUser: (userInfo) => {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
        set({ user: userInfo });
      },

      setShippingAddresses: (addresses: ShippingAddress[]) => {
        set({ shippingAddresses: addresses });
      },


      // Async API actions - call from components
      loadShippingAddresses: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const backendAddresses = await listCustomerAddresses(token);
          const mapped = backendAddresses.map(mapBackendToShippingAddress);
          set({ shippingAddresses: mapped });
        } catch (error) {
          console.error('Failed to load addresses:', error);
        }
      },

      addShippingAddress: async (
        addressData: Omit<ShippingAddress, 'id' | 'createdAt' | 'isPrimary'> & { isPrimary?: boolean }
      ) => {
        const token = get().token;
        if (!token) throw new Error('No auth token');
        try {
          const current = get().shippingAddresses;
          const shouldSetPrimary = typeof addressData.isPrimary === 'boolean'
            ? addressData.isPrimary
            : current.length === 0;

          const backendData = mapShippingToBackendAddress({
            ...addressData,
            isPrimary: shouldSetPrimary,
          }) as any;

          let backendAddress;
          try {
            backendAddress = await createCustomerAddress(token, backendData);
          } catch (error) {
            // Fallback for old rows that can conflict with isDefault=true in first-address flow.
            if (!(current.length === 0 && shouldSetPrimary)) {
              throw error;
            }

            const retryData = mapShippingToBackendAddress({
              ...addressData,
              isPrimary: false,
            }) as any;
            backendAddress = await createCustomerAddress(token, retryData);
          }

          const newAddress = mapBackendToShippingAddress(backendAddress);
          set({ shippingAddresses: [...current, newAddress] });
          return newAddress;
        } catch (error) {
          console.error('Failed to add address:', error);
          throw error;
        }
      },

      updateShippingAddress: async (id: string, updates: Partial<ShippingAddress>) => {
        const token = get().token;
        if (!token) throw new Error('No auth token');
        try {
          const backendData = mapShippingToBackendAddress(updates) as any;
          const backendAddress = await updateCustomerAddress(token, id, backendData);
          const updatedAddress = mapBackendToShippingAddress(backendAddress);
          const current = get().shippingAddresses;
          const mappedCurrent = current.map(addr => 
            addr.id === id ? updatedAddress : addr
          );
          set({ shippingAddresses: mappedCurrent });
          return updatedAddress;
        } catch (error) {
          console.error('Failed to update address:', error);
          throw error;
        }
      },

      removeShippingAddress: async (id: string) => {
        const token = get().token;
        if (!token) throw new Error('No auth token');
        try {
          await deleteCustomerAddress(token, id);
          const current = get().shippingAddresses;
          const updated = current.filter(addr => addr.id !== id);
          set({ shippingAddresses: updated });
        } catch (error) {
          console.error('Failed to delete address:', error);
          throw error;
        }
      },

      setPrimaryAddress: async (id: string) => {
        const token = get().token;
        if (!token) throw new Error('No auth token');
        try {
          const backendAddress = await setDefaultCustomerAddress(token, id);
          const updatedAddress = mapBackendToShippingAddress(backendAddress);
          const current = get().shippingAddresses;
          const mappedCurrent = current.map(addr => 
            addr.id === id ? updatedAddress : { ...addr, isPrimary: false }
          );
          set({ shippingAddresses: mappedCurrent });
          return updatedAddress;
        } catch (error) {
          console.error('Failed to set primary address:', error);
          throw error;
        }
      },

      logout: async () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        localStorage.removeItem(USER_INFO_KEY);
        // Don't clear addresses - reload from server
        set({ token: null, user: null, shippingAddresses: [] });
      },
    }),

    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        shippingAddresses: state.shippingAddresses,
      }),
    }
  )
);
