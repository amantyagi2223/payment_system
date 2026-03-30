import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import CopyWalletButton from "@/components/copy-wallet-button";
import DataTable from "@/components/data-table";
import { WalletAddressForm } from "@/components/wallet-form";
import {
  ApiClientError,
  deactivateMerchantPayoutWallet,
  listBlockchainNetworks,
  listMerchantPayoutWallets,
  type MerchantAuth,
  type MerchantPayoutWallet,
  upsertMerchantPayoutWallet,
} from "@/lib/api-client";
import { getNativeTokenSymbol, readWalletBalance } from "@/lib/wallet-balance";

// Tron chain ID - could be different based on network configuration
const TRON_CHAIN_IDS = [728126428, 0x2b665edd, 0x2b665eea];

// Validate wallet address format - accepts both Ethereum and Tron formats
function validateWalletAddress(address: string): string | null {
  if (!address) {
    return "Wallet address is required";
  }

  const trimmedAddress = address.trim();
  
  // Check if it's a valid Tron address (starts with T, length 26-35)
  if (trimmedAddress.startsWith("T") && trimmedAddress.length >= 26 && trimmedAddress.length <= 35) {
    return null;
  }
  
  // Check if it's a valid Ethereum-style address (starts with 0x, length 42)
  if (trimmedAddress.startsWith("0x") && trimmedAddress.length === 42) {
    return null;
  }

  // Invalid format
  return "Invalid wallet address format. Use '0x...' for Ethereum-style or 'T...' for Tron addresses.";
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function shortAddress(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function getMerchantAuthFromCookies() {
  const cookieStore = await cookies();
  const merchantApiKey = cookieStore.get("auth_merchant_api_key")?.value;
  const merchantToken = cookieStore.get("auth_merchant_token")?.value;
  const auth: MerchantAuth = {
    ...(merchantApiKey ? { apiKey: merchantApiKey } : {}),
    ...(merchantToken ? { accessToken: merchantToken } : {}),
  };

  return auth.apiKey || auth.accessToken ? auth : null;
}

async function savePayoutWallet(formData: FormData) {
  "use server";

  const networkId = String(formData.get("networkId") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!networkId || !address) {
    redirect("/merchant/wallets?error=Network%20and%20wallet%20address%20are%20required");
  }

  // Validate address format - accepts both Ethereum and Tron formats
  const validationError = validateWalletAddress(address);
  if (validationError) {
    redirect(`/merchant/wallets?networkId=${encodeURIComponent(networkId)}&error=${encodeURIComponent(validationError)}`);
  }

  const merchantAuth = await getMerchantAuthFromCookies();
  if (!merchantAuth) {
    redirect("/merchant/wallets?error=Merchant%20session%20credentials%20are%20missing");
  }

  try {
    await upsertMerchantPayoutWallet(merchantAuth, networkId, {
      address,
      ...(label ? { label } : {}),
    });
    redirect("/merchant/wallets?success=Payout%20wallet%20saved%20successfully");
  } catch (error) {
    const message = error instanceof ApiClientError ? error.message : "Unable to save payout wallet.";
    redirect(`/merchant/wallets?networkId=${encodeURIComponent(networkId)}&error=${encodeURIComponent(message)}`);
  }
}

async function deactivateWallet(formData: FormData) {
  "use server";

  const networkId = String(formData.get("networkId") ?? "").trim();
  if (!networkId) {
    redirect("/merchant/wallets?error=Network%20is%20required");
  }

  const merchantAuth = await getMerchantAuthFromCookies();
  if (!merchantAuth) {
    redirect("/merchant/wallets?error=Merchant%20session%20credentials%20are%20missing");
  }

  try {
    await deactivateMerchantPayoutWallet(merchantAuth, networkId);
    redirect("/merchant/wallets?success=Wallet%20deactivated%20successfully");
  } catch (error) {
    const message = error instanceof ApiClientError ? error.message : "Unable to deactivate wallet.";
    redirect(`/merchant/wallets?error=${encodeURIComponent(message)}`);
  }
}

export default async function MerchantWalletsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const networkIdParam = readSearchParam(params, "networkId");
  const successMessage = readSearchParam(params, "success");
  const queryError = readSearchParam(params, "error");

  const merchantAuth = await getMerchantAuthFromCookies();
  let errorMessage: string | null = queryError ?? null;
  let wallets: MerchantPayoutWallet[] = [];
  let networks: Awaited<ReturnType<typeof listBlockchainNetworks>> = [];

  if (!merchantAuth) {
    errorMessage = errorMessage ?? "Merchant session credentials are missing.";
  } else {
    try {
      [wallets, networks] = await Promise.all([
        listMerchantPayoutWallets(merchantAuth),
        listBlockchainNetworks(),
      ]);
    } catch (error) {
      errorMessage = errorMessage ?? (error instanceof ApiClientError ? error.message : "Unable to load wallets.");
    }
  }

  const activeNetworks = networks.filter((network) => network.isActive !== false);
  const rpcByNetworkId = new Map(activeNetworks.map((network) => [network.id, network.rpcUrl]));
  const balances = new Map(
    await Promise.all(
      wallets.map(async (wallet) => {
        const balance = await readWalletBalance(rpcByNetworkId.get(wallet.networkId), wallet.address);
        return [wallet.networkId, balance] as const;
      }),
    ),
  );

  const editingWallet = networkIdParam ? wallets.find((wallet) => wallet.networkId === networkIdParam) ?? null : null;
  const rows: ReactNode[][] = wallets.map((wallet) => [
    `${wallet.network.name} (${wallet.network.chainId})`,
    <div key={`${wallet.id}-address`} className="flex items-center gap-2">
      <span className="font-mono text-xs text-slate-700" title={wallet.address}>
        {shortAddress(wallet.address)}
      </span>
      <CopyWalletButton value={wallet.address} />
    </div>,
    (() => {
      const tokenSymbol = getNativeTokenSymbol({
        name: wallet.network.name,
        chainId: wallet.network.chainId,
      });
      const balance = balances.get(wallet.networkId);
      return balance ? `${balance} ${tokenSymbol}` : `Unavailable (${tokenSymbol})`;
    })(),
    wallet.label ?? "--",
    <span
      key={`${wallet.id}-status`}
      className={[
        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
        wallet.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {wallet.isActive ? "Active" : "Inactive"}
    </span>,
    formatDate(wallet.updatedAt),
    <div key={`${wallet.id}-actions`} className="flex items-center gap-2">
      <Link
        href={`/merchant/wallets?networkId=${encodeURIComponent(wallet.networkId)}`}
        className="inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-100"
      >
        Change
      </Link>
      <form action={deactivateWallet}>
        <input type="hidden" name="networkId" value={wallet.networkId} />
        <button
          type="submit"
          className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
        >
          Deactivate
        </button>
      </form>
    </div>,
  ]);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-900 to-cyan-900 px-4 py-4 text-white shadow-lg md:px-5 md:py-5">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Payout Wallet Management</h2>
        <p className="mt-1 text-sm text-cyan-100">Add, change, copy, and monitor merchant payout wallets.</p>
      </header>

      {successMessage ? (
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          <p className="font-medium">Success</p>
          <p className="mt-0.5">{successMessage}</p>
        </article>
      ) : null}

      {errorMessage ? (
        <article className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
          <p className="font-medium">Unable to load wallets</p>
          <p className="mt-0.5">{errorMessage}</p>
        </article>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Configured Wallets</p>
          <p className="mt-1.5 text-xl font-semibold text-slate-900">{wallets.length}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Active Wallets</p>
          <p className="mt-1.5 text-xl font-semibold text-emerald-900">{wallets.filter((wallet) => wallet.isActive).length}</p>
        </article>
        <article className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-700">Available Networks</p>
          <p className="mt-1.5 text-xl font-semibold text-cyan-900">{activeNetworks.length}</p>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <h3 className="text-lg font-semibold text-slate-900">{editingWallet ? "Change Wallet" : "Add Wallet"}</h3>
        <p className="mt-0.5 text-sm text-slate-600">Configure payout wallet per network. Existing wallet can be updated.</p>

        <WalletAddressForm
          networks={activeNetworks}
          editingWallet={editingWallet ? { networkId: editingWallet.networkId, address: editingWallet.address, label: editingWallet.label ?? undefined } : null}
          action={savePayoutWallet}
        />
      </article>

      <DataTable
        headers={["Network", "Wallet", "Balance", "Label", "Status", "Updated", "Actions"]}
        rows={rows}
        emptyLabel="No payout wallets configured yet."
      />
    </section>
  );
}
