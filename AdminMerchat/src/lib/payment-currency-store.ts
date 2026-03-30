import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type PaymentCurrency = {
  id: string;
  symbol: string;
  name: string;
  coingeckoId: string | null;
  usdtRate: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  lastRateUpdatedAt: string | null;
};

type PaymentCurrencyStore = {
  version: 1;
  updatedAt: string;
  currencies: PaymentCurrency[];
};

type CreatePaymentCurrencyInput = {
  symbol: string;
  name?: string;
  coingeckoId?: string;
  isActive?: boolean;
};

type SyncRatesResult = {
  ranAt: string;
  updatedCount: number;
  skippedSymbols: string[];
};

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "payment-currencies.json");

const SYSTEM_CURRENCIES: Array<{
  symbol: string;
  name: string;
  coingeckoId: string;
}> = [
  { symbol: "USDT", name: "Tether USDt", coingeckoId: "tether" },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin" },
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum" },
];

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  USDT: "tether",
  USDC: "usd-coin",
  ETH: "ethereum",
  BTC: "bitcoin",
  BNB: "binancecoin",
  SOL: "solana",
  MATIC: "matic-network",
  TRX: "tron",
  LTC: "litecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
};

let mutationQueue: Promise<void> = Promise.resolve();

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function normalizeCoinGeckoId(value: string | undefined) {
  const cleaned = String(value ?? "").trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : null;
}

function formatRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  const fixed = value.toFixed(8);
  return fixed.replace(/\.?0+$/, "") || "0";
}

function assertValidSymbol(symbol: string) {
  if (!/^[A-Z0-9]{2,12}$/.test(symbol)) {
    throw new Error("Currency symbol must be 2-12 characters using A-Z or 0-9.");
  }
}

function createSystemCurrency(
  symbol: string,
  name: string,
  coingeckoId: string,
  timestamp: string,
): PaymentCurrency {
  const usdtRate = symbol === "USDT" ? "1" : "0";
  return {
    id: `system-${symbol.toLowerCase()}`,
    symbol,
    name,
    coingeckoId,
    usdtRate,
    isActive: true,
    isSystem: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastRateUpdatedAt: symbol === "USDT" ? timestamp : null,
  };
}

function sortCurrencies(currencies: PaymentCurrency[]) {
  return [...currencies].sort((a, b) => {
    if (a.isSystem !== b.isSystem) {
      return a.isSystem ? -1 : 1;
    }
    return a.symbol.localeCompare(b.symbol);
  });
}

async function ensureStoreExists() {
  await fs.mkdir(STORE_DIR, { recursive: true });

  try {
    await fs.access(STORE_FILE);
  } catch {
    const now = new Date().toISOString();
    const defaults = SYSTEM_CURRENCIES.map((entry) =>
      createSystemCurrency(entry.symbol, entry.name, entry.coingeckoId, now),
    );
    const initialStore: PaymentCurrencyStore = {
      version: 1,
      updatedAt: now,
      currencies: defaults,
    };
    await fs.writeFile(STORE_FILE, JSON.stringify(initialStore, null, 2), "utf8");
  }
}

function parseStore(raw: string): PaymentCurrencyStore {
  const parsed = JSON.parse(raw) as Partial<PaymentCurrencyStore>;
  const currencies = Array.isArray(parsed.currencies) ? parsed.currencies : [];
  const normalized: PaymentCurrency[] = currencies
    .map((item) => {
      const symbol = normalizeSymbol(String(item.symbol ?? ""));
      if (!symbol) {
        return null;
      }

      return {
        id: String(item.id ?? `currency-${symbol.toLowerCase()}`),
        symbol,
        name: String(item.name ?? symbol),
        coingeckoId: normalizeCoinGeckoId(item.coingeckoId ?? undefined),
        usdtRate: String(item.usdtRate ?? "0"),
        isActive: item.isActive !== false,
        isSystem: Boolean(item.isSystem),
        createdAt: String(item.createdAt ?? new Date().toISOString()),
        updatedAt: String(item.updatedAt ?? new Date().toISOString()),
        lastRateUpdatedAt:
          item.lastRateUpdatedAt === null || item.lastRateUpdatedAt === undefined
            ? null
            : String(item.lastRateUpdatedAt),
      } satisfies PaymentCurrency;
    })
    .filter((item): item is PaymentCurrency => item !== null);

  const now = new Date().toISOString();
  const bySymbol = new Map(normalized.map((currency) => [currency.symbol, currency]));
  for (const systemEntry of SYSTEM_CURRENCIES) {
    if (!bySymbol.has(systemEntry.symbol)) {
      const created = createSystemCurrency(systemEntry.symbol, systemEntry.name, systemEntry.coingeckoId, now);
      normalized.push(created);
      bySymbol.set(systemEntry.symbol, created);
      continue;
    }

    const existing = bySymbol.get(systemEntry.symbol);
    if (!existing) {
      continue;
    }

    existing.isSystem = true;
    existing.isActive = true;
    existing.name = existing.name || systemEntry.name;
    existing.coingeckoId = existing.coingeckoId || systemEntry.coingeckoId;
    if (existing.symbol === "USDT") {
      existing.usdtRate = "1";
      existing.lastRateUpdatedAt = existing.lastRateUpdatedAt ?? now;
    }
  }

  return {
    version: 1,
    updatedAt: String(parsed.updatedAt ?? now),
    currencies: sortCurrencies(normalized),
  };
}

async function readStore() {
  await ensureStoreExists();
  const raw = await fs.readFile(STORE_FILE, "utf8");
  try {
    return parseStore(raw);
  } catch {
    const now = new Date().toISOString();
    const resetStore: PaymentCurrencyStore = {
      version: 1,
      updatedAt: now,
      currencies: SYSTEM_CURRENCIES.map((entry) =>
        createSystemCurrency(entry.symbol, entry.name, entry.coingeckoId, now),
      ),
    };
    await writeStore(resetStore);
    return resetStore;
  }
}

async function writeStore(store: PaymentCurrencyStore) {
  const payload: PaymentCurrencyStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    currencies: sortCurrencies(store.currencies),
  };
  await fs.writeFile(STORE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

async function withStoreMutation<T>(mutator: (store: PaymentCurrencyStore) => Promise<T>) {
  const next = mutationQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });

  mutationQueue = next.then(
    () => undefined,
    () => undefined,
  );

  return next;
}

export async function listPaymentCurrencies(options: { includeInactive?: boolean } = {}) {
  const includeInactive = options.includeInactive ?? false;
  const store = await readStore();
  const rows = includeInactive ? store.currencies : store.currencies.filter((currency) => currency.isActive);
  return sortCurrencies(rows);
}

export async function createPaymentCurrency(input: CreatePaymentCurrencyInput) {
  const symbol = normalizeSymbol(input.symbol);
  const name = String(input.name ?? "").trim() || symbol;
  const coingeckoId = normalizeCoinGeckoId(input.coingeckoId) ?? SYMBOL_TO_COINGECKO_ID[symbol] ?? null;
  const isActive = input.isActive !== false;

  assertValidSymbol(symbol);

  return withStoreMutation(async (store) => {
    const exists = store.currencies.some((currency) => currency.symbol === symbol);
    if (exists) {
      throw new Error(`Currency ${symbol} already exists.`);
    }

    const now = new Date().toISOString();
    const next: PaymentCurrency = {
      id: `custom-${randomUUID()}`,
      symbol,
      name,
      coingeckoId,
      usdtRate: symbol === "USDT" ? "1" : "0",
      isActive,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      lastRateUpdatedAt: symbol === "USDT" ? now : null,
    };

    store.currencies.push(next);
    return next;
  });
}

export async function setPaymentCurrencyActive(currencyId: string, isActive: boolean) {
  const id = String(currencyId).trim();
  if (!id) {
    throw new Error("Currency id is required.");
  }

  return withStoreMutation(async (store) => {
    const target = store.currencies.find((currency) => currency.id === id);
    if (!target) {
      throw new Error("Currency not found.");
    }

    if (target.isSystem && !isActive) {
      throw new Error(`Core currency ${target.symbol} cannot be disabled.`);
    }

    target.isActive = isActive;
    target.updatedAt = new Date().toISOString();
    return target;
  });
}

export async function syncPaymentCurrencyRates(): Promise<SyncRatesResult> {
  return withStoreMutation(async (store) => {
    const now = new Date().toISOString();
    const activeCurrencies = store.currencies.filter((currency) => currency.isActive);
    if (!activeCurrencies.length) {
      return {
        ranAt: now,
        updatedCount: 0,
        skippedSymbols: [],
      };
    }

    const ids = new Set<string>(["tether"]);
    const symbolById = new Map<string, string[]>();
    const skippedSymbols: string[] = [];

    for (const currency of activeCurrencies) {
      if (currency.symbol === "USDT") {
        continue;
      }

      const resolvedId = currency.coingeckoId ?? SYMBOL_TO_COINGECKO_ID[currency.symbol] ?? null;
      if (!resolvedId) {
        skippedSymbols.push(currency.symbol);
        continue;
      }

      ids.add(resolvedId);
      const symbols = symbolById.get(resolvedId) ?? [];
      symbols.push(currency.symbol);
      symbolById.set(resolvedId, symbols);
    }

    const endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      Array.from(ids).join(","),
    )}&vs_currencies=usd`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch currency rates (status ${response.status}).`);
    }

    const payload = (await response.json()) as Record<string, { usd?: number }>;
    const usdtUsd = payload.tether?.usd;
    if (!usdtUsd || !Number.isFinite(usdtUsd) || usdtUsd <= 0) {
      throw new Error("Unable to resolve USDT base price.");
    }

    let updatedCount = 0;
    const bySymbol = new Map(store.currencies.map((currency) => [currency.symbol, currency]));

    const usdtCurrency = bySymbol.get("USDT");
    if (usdtCurrency) {
      usdtCurrency.usdtRate = "1";
      usdtCurrency.lastRateUpdatedAt = now;
      usdtCurrency.updatedAt = now;
      updatedCount += 1;
    }

    for (const [coingeckoId, symbols] of symbolById) {
      const usdValue = payload[coingeckoId]?.usd;
      if (!usdValue || !Number.isFinite(usdValue) || usdValue <= 0) {
        skippedSymbols.push(...symbols);
        continue;
      }

      const usdtRate = usdValue / usdtUsd;
      for (const symbol of symbols) {
        const target = bySymbol.get(symbol);
        if (!target) {
          continue;
        }
        target.usdtRate = formatRate(usdtRate);
        target.lastRateUpdatedAt = now;
        target.updatedAt = now;
        updatedCount += 1;
      }
    }

    return {
      ranAt: now,
      updatedCount,
      skippedSymbols: Array.from(new Set(skippedSymbols)).sort((a, b) => a.localeCompare(b)),
    };
  });
}
