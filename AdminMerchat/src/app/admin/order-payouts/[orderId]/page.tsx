import Link from "next/link";
import { cookies } from "next/headers";

import CompletePaymentButton from "@/components/complete-payment-button";
import CopyWalletButton from "@/components/copy-wallet-button";
import {
  ApiClientError,
  listSuperAdminOrderPayouts,
  type PayoutStatus,
  type SuperAdminOrderPayout,
} from "@/lib/api-client";
import { getNativeTokenSymbol, isZeroNativeBalance, readWalletBalance } from "@/lib/wallet-balance";

type PageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

const PAYOUT_STATUS_VALUES: PayoutStatus[] = ["FAILED", "NOT_STARTED", "PENDING", "COMPLETED"];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

async function findOrderById(adminToken: string, orderId: string): Promise<SuperAdminOrderPayout | null> {
  const results = await Promise.all(
    PAYOUT_STATUS_VALUES.map((status) =>
      listSuperAdminOrderPayouts(adminToken, {
        payoutStatus: status,
        limit: 100,
      }),
    ),
  );

  for (const result of results) {
    const order = result.orders.find((candidate) => candidate.id === orderId);
    if (order) {
      return order;
    }
  }

  return null;
}

export default async function AdminOrderPayoutDetailPage({ params }: PageProps) {
  const { orderId } = await params;
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("auth_token")?.value;

  let errorMessage: string | null = null;
  let order: SuperAdminOrderPayout | null = null;

  if (!adminToken) {
    errorMessage = "Admin access token is missing from session.";
  } else {
    try {
      order = await findOrderById(adminToken, orderId);
      if (!order) {
        errorMessage = "Order not found in the current payout list window.";
      }
    } catch (error) {
      errorMessage = error instanceof ApiClientError ? error.message : "Unable to load order payout details.";
    }
  }

  const walletAddress = order?.invoice.walletAddress ?? null;
  const rpcUrl = order?.invoice.network?.rpcUrl ?? undefined;
  const tokenSymbol = getNativeTokenSymbol({
    name: order?.invoice.network?.name,
    chainId: order?.invoice.network?.chainId,
  });
  const walletBalance = walletAddress && rpcUrl ? await readWalletBalance(rpcUrl, walletAddress) : null;
  const canCompleteByStatus = order ? order.payout.status === "FAILED" || order.payout.status === "NOT_STARTED" : false;
  const zeroBalance = isZeroNativeBalance(walletBalance);
  const canComplete = canCompleteByStatus && !zeroBalance;

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-cyan-900 to-teal-900 px-5 py-4 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Admin Payout Details</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Order {orderId}</h2>
        <Link href="/admin/order-payouts" className="mt-3 inline-flex text-sm text-cyan-100 underline-offset-2 hover:underline">
          Back to list
        </Link>
      </header>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-medium">Unable to load order payout detail</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      {order ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Order Overview</h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Merchant</dt>
                <dd className="text-right">
                  <p className="font-medium text-slate-900">{order.merchant?.name ?? "-"}</p>
                  <p className="text-xs text-slate-500">{order.merchant?.email ?? "-"}</p>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Customer</dt>
                <dd className="text-right">{order.customer?.email ?? "-"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Product</dt>
                <dd className="text-right">{order.product?.name ?? "-"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-semibold text-slate-900">
                  {order.amount} {order.product?.currency ?? ""}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Network</dt>
                <dd className="text-right">
                  {order.invoice.network ? `${order.invoice.network.name} (${order.invoice.network.chainId})` : "-"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Payout Status</h3>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusTone(order.payout.status)}`}>
                {order.payout.status}
              </span>
              {canComplete ? (
                <CompletePaymentButton orderId={order.id} />
              ) : canCompleteByStatus ? (
                <span className="text-xs font-medium text-slate-500">Awaiting payment</span>
              ) : (
                <span className="text-xs text-slate-400">-</span>
              )}
            </div>

            <dl className="mt-4 space-y-2 text-sm text-slate-700">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Failure Reason</dt>
                <dd className="max-w-[70%] text-right [word-break:break-word]">{order.payout.error ?? "-"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Updated At</dt>
                <dd className="text-right">{formatDateTime(order.updatedAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Completed At</dt>
                <dd className="text-right">{formatDateTime(order.payout.completedAt)}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Order Wallet</h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Wallet Address</dt>
                <dd className="flex items-center gap-2 text-right">
                  <span className="max-w-[220px] truncate font-mono text-xs">{walletAddress ?? "-"}</span>
                  {walletAddress ? <CopyWalletButton value={walletAddress} /> : null}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Wallet Balance</dt>
                <dd className="text-right">{walletBalance ? `${walletBalance} ${tokenSymbol}` : `Unavailable (${tokenSymbol})`}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Payout Address</dt>
                <dd className="max-w-[70%] text-right [word-break:break-word]">{order.payout.address ?? "-"}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Transaction Hashes</h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="space-y-1">
                <dt className="text-slate-500">Payout Tx Hash</dt>
                <dd className="font-mono text-xs [word-break:break-word]">{order.payout.txHash ?? "-"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-slate-500">Gas Funding Tx Hash</dt>
                <dd className="font-mono text-xs [word-break:break-word]">{order.payout.gasFundingTxHash ?? "-"}</dd>
              </div>
            </dl>
          </article>
        </div>
      ) : null}
    </section>
  );
}
