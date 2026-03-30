export function formatNativeBalance(weiHex: string) {
  const value = BigInt(weiHex);
  const base = BigInt("1000000000000000000");
  const whole = value / base;
  const fraction = value % base;
  const fractionText = fraction.toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
  return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
}

export function isZeroNativeBalance(balance: string | null | undefined) {
  if (!balance) {
    return false;
  }

  const digits = balance.replace(/[^0-9]/g, "");
  if (!digits) {
    return false;
  }

  return !/[1-9]/.test(digits);
}

type NetworkTokenInput = {
  name?: string | null;
  chainId?: number | null;
};

export function getNativeTokenSymbol(network: NetworkTokenInput) {
  const chainId = network.chainId ?? null;
  
  // Check by chainId first
  if (chainId === 56 || chainId === 97) {
    return "BNB";
  }
  if (chainId === 137 || chainId === 80001) {
    return "MATIC";
  }
  if (chainId === 43114 || chainId === 43113) {
    return "AVAX";
  }
  if (chainId === 8453 || chainId === 84531 || chainId === 84532) {
    return "ETH";
  }
  if (chainId === 10 || chainId === 11155420) {
    return "ETH";
  }
  if (chainId === 42161 || chainId === 421613 || chainId === 421614) {
    return "ETH";
  }
  if (chainId === 1 || chainId === 5 || chainId === 11155111) {
    return "ETH";
  }

  const name = (network.name ?? "").trim().toLowerCase();
  
  // Check for TRON networks by name
  if (name.includes("tron")) {
    return "TRX";
  }
  if (name.includes("binance") || name.includes("bsc")) {
    return "BNB";
  }
  if (name.includes("polygon") || name.includes("matic")) {
    return "MATIC";
  }
  if (name.includes("avalanche")) {
    return "AVAX";
  }
  if (name.includes("ethereum") || name.includes("optimism") || name.includes("arbitrum") || name.includes("base")) {
    return "ETH";
  }

  return "NATIVE";
}

export async function readWalletBalance(rpcUrl: string | undefined, address: string) {
  if (!rpcUrl || !address) {
    return null;
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { result?: string };
    if (!payload.result || !payload.result.startsWith("0x")) {
      return null;
    }

    return formatNativeBalance(payload.result);
  } catch {
    return null;
  }
}
