import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import CopyWalletButton from "@/components/copy-wallet-button";
import DataTable from "@/components/data-table";
import {
  ApiClientError,
  bootstrapSuperAdminFeeWallets,
  listBlockchainNetworks,
  listSuperAdminFeeWalletBalances,
  type SuperAdminGasWalletBalance,
  upsertSuperAdminFeeWallet,
} from "@/lib/api-client";
import { getNativeTokenSymbol } from "@/lib/wallet-balance";

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

function resolveTokenSymbol(wallet: SuperAdminGasWalletBalance) {
  const networkChainId =
    typeof wallet.network.chainId === "string" ? Number(wallet.network.chainId) : wallet.network.chainId;

  return (
    wallet.network.symbol ||
    getNativeTokenSymbol({
      name: wallet.network.name,
      chainId: Number.isFinite(networkChainId) ? networkChainId : null,
    })
  );
}

function mapWalletRows(wallets: SuperAdminGasWalletBalance[]): ReactNode[][] {
  return wallets.map((wallet) => {
    const nativeBalance = wallet.nativeBalance;
    const balanceValue =
      nativeBalance && nativeBalance.balance !== "0"
        ? `${nativeBalance.balance} ${nativeBalance.symbol}`
        : `0 ${resolveTokenSymbol(wallet)}`;

    return [
      `${wallet.network.name} (${wallet.network.chainId})`,
      <div key={`${wallet.id}-address`} className="flex items-center gap-2">
        <span className="font-mono text-xs text-slate-700" title={wallet.address}>
          {shortAddress(wallet.address)}
        </span>
        <CopyWalletButton value={wallet.address} />
      </div>,
      balanceValue,
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
      <Link
        key={`${wallet.id}-edit`}
        href={`/admin/feewallet?form=add&networkId=${encodeURIComponent(wallet.networkId)}`}
        className="inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-100"
      >
        Change
      </Link>,
    ];
  });
}

async function getAdminTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value ?? null;
}

async function saveFeeWallet(formData: FormData) {
  "use server";

  const networkId = String(formData.get("networkId") ?? "").trim();
  const privateKey = String(formData.get("privateKey") ?? "").trim();

  if (!networkId) {
    redirect("/admin/feewallet?form=add&error=Network%20is%20required");
  }

  const adminToken = await getAdminTokenFromCookies();
  if (!adminToken) {
    redirect("/admin/feewallet?form=add&error=Admin%20access%20token%20is%20missing%20from%20session");
  }

  try {
    await upsertSuperAdminFeeWallet(adminToken, {
      networkId,
      ...(privateKey ? { privateKey } : {}),
    });
    redirect("/admin/feewallet?success=Fee%20wallet%20saved%20successfully");
  } catch (error) {
    const message = error instanceof ApiClientError ? error.message : "Unable to save fee wallet.";
    redirect(`/admin/feewallet?form=add&networkId=${encodeURIComponent(networkId)}&error=${encodeURIComponent(message)}`);
  }
}

async function bootstrapFeeWallets() {
  "use server";

  const adminToken = await getAdminTokenFromCookies();
  if (!adminToken) {
    redirect("/admin/feewallet?error=Admin%20access%20token%20is%20missing%20from%20session");
  }

  try {
    const result = await bootstrapSuperAdminFeeWallets(adminToken);
    redirect(`/admin/feewallet?success=${encodeURIComponent(`${result.createdCount} fee wallet(s) bootstrapped`)}`);
  } catch (error) {
    const message = error instanceof ApiClientError ? error.message : "Unable to bootstrap fee wallets.";
    redirect(`/admin/feewallet?error=${encodeURIComponent(message)}`);
  }
}

export default async function AdminFeeWalletsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const formMode = readSearchParam(params, "form");
  const networkIdParam = readSearchParam(params, "networkId");
  const successMessage = readSearchParam(params, "success");
  const queryError = readSearchParam(params, "error");
  const adminToken = await getAdminTokenFromCookies();

  let errorMessage: string | null = queryError ?? null;
  let feeWallets: SuperAdminGasWalletBalance[] = [];
  let networks: Awaited<ReturnType<typeof listBlockchainNetworks>> = [];

  if (!adminToken) {
    errorMessage = errorMessage ?? "Admin access token is missing from session.";
  } else {
    try {
      [feeWallets, networks] = await Promise.all([
        listSuperAdminFeeWalletBalances(adminToken),
        listBlockchainNetworks(),
      ]);
    } catch (error) {
      errorMessage = errorMessage ?? (error instanceof ApiClientError ? error.message : "Unable to load fee wallets.");
    }
  }

  const activeNetworks = networks.filter((network) => network.isActive !== false);
  const editingWallet = networkIdParam
    ? feeWallets.find((wallet) => wallet.networkId === networkIdParam) ?? null
    : null;
  const showWalletForm = formMode === "add" || Boolean(editingWallet);

  const rows = mapWalletRows(feeWallets);

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-purple-900 to-fuchsia-900 px-5 py-5 text-white shadow-lg md:px-6 md:py-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Fee Wallets</h2>
        <p className="mt-1 text-sm text-purple-100">Manage fee wallets for all active blockchain networks.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-purple-700">Configured Fee Wallets</p>
          <p className="mt-2 text-2xl font-semibold text-purple-900">{feeWallets.length}</p>
        </article>
        <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-700">Active Networks</p>
          <p className="mt-2 text-2xl font-semibold text-cyan-900">{activeNetworks.length}</p>
        </article>
      </div>

      <article className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-purple-700">Fee Wallet Management</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Fee Wallet Management</h3>
            <p className="mt-1 text-sm text-slate-600">Add, update, and bootstrap one fee wallet per active blockchain network.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/feewallet?form=add"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Add Fee Wallet
            </Link>
            <form action={bootstrapFeeWallets}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-medium text-purple-700 transition hover:border-purple-400 hover:bg-purple-100"
              >
                Bootstrap Missing Fee Wallets
              </button>
            </form>
          </div>
        </div>
      </article>

      {successMessage ? (
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 md:px-5">
          <p className="font-medium">Success</p>
          <p className="mt-1">{successMessage}</p>
        </article>
      ) : null}

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 md:px-5">
          <p className="font-medium">Unable to load fee wallets</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      {showWalletForm ? (
        <article className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm md:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-purple-700">{editingWallet ? "Change Fee Wallet" : "Add Fee Wallet"}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">{editingWallet ? "Change Fee Wallet" : "Add Fee Wallet"}</h3>
            <p className="mt-1 text-sm text-slate-600">Configure one fee wallet per active blockchain network.</p>
          </div>

          <form action={saveFeeWallet} className="mt-5 grid gap-4">
            <label className="text-sm text-slate-700">
              Network
              <select
                name="networkId"
                defaultValue={editingWallet?.networkId ?? activeNetworks[0]?.id ?? ""}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              >
                {activeNetworks.length > 0 ? (
                  activeNetworks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name} ({network.chainId})
                    </option>
                  ))
                ) : (
                  <option value="">No active networks</option>
                )}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Private Key (Optional)
              <input
                name="privateKey"
                defaultValue=""
                placeholder="0x... (leave empty to auto-generate)"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                {editingWallet ? "Update Fee Wallet" : "Create Fee Wallet"}
              </button>
              <Link
                href="/admin/feewallet"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Cancel
              </Link>
            </div>
          </form>
        </article>
      ) : null}

      <DataTable
        headers={["Network", "Wallet", "Balance", "Status", "Updated", "Actions"]}
        rows={rows}
        emptyLabel="No admin fee wallets configured yet."
        minWidths={[150, 150, 120, 80, 100, 80]}
      />
    </section>
  );
}
