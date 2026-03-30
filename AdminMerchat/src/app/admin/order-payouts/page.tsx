import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import CompletePaymentButton from "@/components/complete-payment-button";
import DataTable from "@/components/data-table";
import {
  ApiClientError,
  listSuperAdminOrderPayouts,
  type PayoutStatus,
  type SuperAdminOrderPayoutListResponse,
} from "@/lib/api-client";
import { getNativeTokenSymbol, isZeroNativeBalance, readWalletBalance } from "@/lib/wallet-balance";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAYOUT_STATUS_VALUES: PayoutStatus[] = ["FAILED", "NOT_STARTED", "PENDING", "COMPLETED"];

function readSearchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function toPayoutStatus(value: string | undefined): PayoutStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return PAYOUT_STATUS_VALUES.includes(normalized as PayoutStatus) ? (normalized as PayoutStatus) : null;
}

function shortAddress(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function getStatusTone(status: PayoutStatus) {
  if (status === "COMPLETED") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "PENDING") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "FAILED") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-100 text-slate-700";
}

function parseLimit(value: string | undefined) {
  if (!value) {
    return 50;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

export default async function AdminOrderPayoutsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter = toPayoutStatus(readSearchParam(params, "status"));
  const limit = parseLimit(readSearchParam(params, "limit"));
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("auth_token")?.value;

  let errorMessage: string | null = null;
  let payload: SuperAdminOrderPayoutListResponse | null = null;

  if (!adminToken) {
    errorMessage = "Admin access token is missing from session.";
  } else {
    try {
      payload = await listSuperAdminOrderPayouts(adminToken, {
        payoutStatus: statusFilter ?? undefined,
        limit,
      });
    } catch (error) {
      errorMessage = error instanceof ApiClientError ? error.message : "Unable to load payout processing orders.";
    }
  }

  const defaultSummary = {
    NOT_STARTED: 0,
    PENDING: 0,
    COMPLETED: 0,
    FAILED: 0,
  } as const;
  const summary = payload?.summary.payoutStatus ?? defaultSummary;
  const totalPaidOrders = payload?.summary.totalPaidOrders ?? 0;
  const rowsData = payload?.orders ?? [];

  const balanceByOrderId = new Map(
    await Promise.all(
      rowsData.map(async (order) => {
        const address = order.invoice.walletAddress;
        const rpcUrl = order.invoice.network?.rpcUrl ?? undefined;
        if (!address || !rpcUrl) {
          return [order.id, null] as const;
        }

        const balance = await readWalletBalance(rpcUrl, address);
        return [order.id, balance] as const;
      }),
    ),
  );

  const statusTabs: Array<{ label: string; status: PayoutStatus | null; count: number }> = [
    { label: "All", status: null, count: totalPaidOrders },
    ...PAYOUT_STATUS_VALUES.map((status) => ({ label: status, status, count: summary[status] ?? 0 })),
  ];

  const rows: ReactNode[][] = rowsData.map((order) => {
    const canComplete = order.payout.status === "FAILED" || order.payout.status === "NOT_STARTED";
    const network = order.invoice.network;
    const tokenSymbol = getNativeTokenSymbol({
      name: network?.name,
      chainId: network?.chainId,
    });
    const balance = balanceByOrderId.get(order.id);
    const zeroBalance = isZeroNativeBalance(balance);

    return [
      <Link
        key={`${order.id}-id`}
        href={`/admin/order-payouts/${order.id}`}
        className="font-mono text-xs text-cyan-700 underline-offset-2 hover:underline"
        title={order.id}
      >
        {shortAddress(order.id)}
      </Link>,
      <div key={`${order.id}-merchant`} className="space-y-0.5">
        <p className="font-medium text-slate-900">{order.merchant?.name ?? "Unknown Merchant"}</p>
        <p className="text-xs text-slate-500">{order.merchant?.email ?? "-"}</p>
      </div>,
      <span key={`${order.id}-amount`} className="font-semibold text-slate-900">
        {order.amount} {order.product?.currency ?? ""}
      </span>,
      network ? `${network.name} (${network.chainId})` : "N/A",
      balance ? `${balance} ${tokenSymbol}` : `Unavailable (${tokenSymbol})`,
      <span
        key={`${order.id}-status`}
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusTone(order.payout.status)}`}
      >
        {order.payout.status}
      </span>,
      canComplete && !zeroBalance ? (
        <CompletePaymentButton key={`${order.id}-action`} orderId={order.id} />
      ) : canComplete ? (
        <span key={`${order.id}-action`} className="text-xs font-medium text-slate-500">
          Awaiting payment
        </span>
      ) : (
        <span key={`${order.id}-action`} className="text-xs text-slate-400">
          -
        </span>
      ),
      <Link
        key={`${order.id}-details`}
        href={`/admin/order-payouts/${order.id}`}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        View Details
      </Link>,
    ];
  });

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-cyan-900 to-teal-900 px-5 py-4 text-white shadow-lg">
        <h2 className="text-3xl font-semibold tracking-tight">Order Payout Processing</h2>
        <p className="mt-1 text-sm text-cyan-100">
          Admin-only view for paid orders awaiting merchant transfer or failed payout retries.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Paid Orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalPaidOrders}</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-rose-700">Failed Payouts</p>
          <p className="mt-2 text-2xl font-semibold text-rose-900">{summary.FAILED}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-700">Pending Payouts</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{summary.PENDING}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Completed Payouts</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{summary.COMPLETED}</p>
        </article>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {statusTabs.map((tab) => {
          const active = statusFilter === tab.status;
          const href = tab.status
            ? `/admin/order-payouts?status=${encodeURIComponent(tab.status)}&limit=${limit}`
            : `/admin/order-payouts?limit=${limit}`;

          return (
            <Link
              key={tab.label}
              href={href}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium transition",
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              {tab.label} ({tab.count})
            </Link>
          );
        })}
      </div>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-medium">Unable to load order payouts</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      <DataTable
        headers={["Order", "Merchant", "Amount", "Network", "Wallet Balance", "Payout", "Action", "Details"]}
        rows={rows}
        emptyLabel="No paid orders found for selected payout filter."
      />
    </section>
  );
}
