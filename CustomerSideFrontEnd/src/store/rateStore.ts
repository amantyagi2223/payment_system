"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RateState {
  usdToUsdt: number;
  ethUsdPrice: number;
  bnbUsdPrice: number;
  maticUsdPrice: number;
  trxUsdPrice: number;
  usdToEth: number;
  usdToBnb: number;
  usdToMatic: number;
  usdToTrx: number;
  loading: boolean;
  lastUpdated: number | null;
  fetchAllRates: () => Promise<void>;
  getUSDTAmount: (usd: number) => number;
  getEthAmount: (usd: number) => number;
  getBnbAmount: (usd: number) => number;
  getMaticAmount: (usd: number) => number;
  getTrxAmount: (usd: number) => number;
  getCryptoAmount: (usd: number, symbol: string) => number;
  getEthPrice: () => number;
}

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3/simple/price";
const COINGECKO_MARKET_URL =
  `${COINGECKO_BASE_URL}?ids=tether,ethereum,binancecoin,matic-network,tron&vs_currencies=usd`;

export const useRateStore = create<RateState>()(
  persist(
    (set, get) => ({
      usdToUsdt: 1.0,
      ethUsdPrice: 3000,
      bnbUsdPrice: 600,
      maticUsdPrice: 1.2,
      trxUsdPrice: 0.1,
      usdToEth: 1/3000,
      usdToBnb: 1/600,
      usdToMatic: 1/1.2,
      usdToTrx: 1/0.1,
      loading: false,
      lastUpdated: null,
      
      fetchAllRates: async () => {
        const state = get();
        if (state.loading) return;
        
        set({ loading: true });
        
        try {
          const marketResponse = await fetch(COINGECKO_MARKET_URL);
          const marketData = await marketResponse.json();
          
          const usdToUsdt = marketData.tether?.usd || 1.0;
          const ethUsdPrice = marketData.ethereum?.usd || 3000;
          const bnbUsdPrice = marketData.binancecoin?.usd || 600;
          const maticUsdPrice = marketData["matic-network"]?.usd || 1.2;
          const trxUsdPrice = marketData.tron?.usd || 0.1;
          const usdToEth = 1 / ethUsdPrice;
          const usdToBnb = 1 / bnbUsdPrice;
          const usdToMatic = 1 / maticUsdPrice;
          const usdToTrx = 1 / trxUsdPrice;
          
          set({
            usdToUsdt,
            ethUsdPrice,
            bnbUsdPrice,
            maticUsdPrice,
            trxUsdPrice,
            usdToEth,
            usdToBnb,
            usdToMatic,
            usdToTrx,
            lastUpdated: Date.now(),
            loading: false,
          });
        } catch (error) {
          console.error("Failed to fetch rates:", error);
          set({ loading: false });
        }
      },
      
      getUSDTAmount: (usd: number) => {
        const { usdToUsdt } = get();
        return usd * usdToUsdt;
      },
      
      getEthAmount: (usd: number) => {
        const { usdToEth } = get();
        return usd * usdToEth;
      },

      getBnbAmount: (usd: number) => {
        const { usdToBnb } = get();
        return usd * usdToBnb;
      },

      getMaticAmount: (usd: number) => {
        const { usdToMatic } = get();
        return usd * usdToMatic;
      },

      getTrxAmount: (usd: number) => {
        const { usdToTrx } = get();
        return usd * usdToTrx;
      },
      
      getCryptoAmount: (usd: number, symbol: string) => {
        const state = get();
        const normalized = symbol.trim().toUpperCase();
        switch(normalized) {
          case 'ETH': return state.getEthAmount(usd);
          case 'BNB': return state.getBnbAmount(usd);
          case 'MATIC':
          case 'POL': return state.getMaticAmount(usd);
          case 'TRX': return state.getTrxAmount(usd);
          case 'USDT': 
          case 'USDC': return state.getUSDTAmount(usd);
          default: return usd;
        }
      },
      
      getEthPrice: () => get().ethUsdPrice,
    }),
    {
      name: "rate-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Auto-fetch on mount + every 60s
useRateStore.getState().fetchAllRates();
let intervalId: NodeJS.Timeout;
if (typeof window !== 'undefined') {
  intervalId = setInterval(() => {
    useRateStore.getState().fetchAllRates();
  }, 60000);
  
  window.addEventListener('beforeunload', () => clearInterval(intervalId));
}
