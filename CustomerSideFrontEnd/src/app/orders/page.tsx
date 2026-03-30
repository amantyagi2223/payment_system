"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { listOrders, OrderListItem } from "@/lib/api-client";
import Protected from "@/components/Protected";
import Link from "next/link";

type OrderStatus = "CREATED" | "PENDING" | "PENDING_PAYMENT" | "PAID" | "FAILED" | "EXPIRED";

function getStatusMeta(status: OrderStatus): { badge: string; label: string; dot: string } {
  switch (status) {
    case "PAID":
      return {
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
        label: "Paid",
        dot: "bg-emerald-400",
      };
    case "PENDING_PAYMENT":
    case "PENDING":
      return {
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/25",
        label: "Pending Payment",
        dot: "bg-amber-400",
      };
    case "FAILED":
      return {
        badge: "bg-rose-500/15 text-rose-300 border-rose-500/25",
        label: "Failed",
        dot: "bg-rose-400",
      };
    case "EXPIRED":
      return {
        badge: "bg-rose-500/15 text-rose-300 border-rose-500/25",
        label: "Expired",
        dot: "bg-rose-400",
      };
    default:
      return {
        badge: "bg-slate-500/15 text-slate-300 border-slate-500/25",
        label: "Created",
        dot: "bg-slate-400",
      };
  }
}

function formatNumeric(value: string | number | null | undefined, maxFractionDigits = 6): string {
  if (value === null || value === undefined || value === "") return "--";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
}

function parseNumeric(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDateLabel(iso?: string): string {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortenAddress(address?: string | null): string {
  if (!address) return "N/A";
  if (address.length < 16) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function OrderCardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 animate-pulse">
      <div className="h-5 w-40 rounded bg-slate-800 mb-4" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-20 rounded-xl bg-slate-800" />
        <div className="h-20 rounded-xl bg-slate-800" />
      </div>
      <div className="h-10 rounded-xl bg-slate-800 mt-4" />
    </div>
  );
}

export default function OrdersPage() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listOrders(token);
        setOrders(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  const summary = useMemo(() => {
    const paid = orders.filter((o) => o.status === "PAID").length;
    const pending = orders.filter((o) =>
      o.status === "PENDING_PAYMENT" || o.status === "PENDING" || o.status === "CREATED",
    ).length;
    const usdtTotal = orders.reduce((acc, order) => acc + parseNumeric(order.orderValueUsdt ?? null), 0);

    return {
      total: orders.length,
      paid,
      pending,
      usdtTotal,
    };
  }, [orders]);

  return (
    <Protected>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/3 -left-1/3 h-[36rem] w-[36rem] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-1/3 -right-1/3 h-[36rem] w-[36rem] rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
              <p className="mt-1 text-slate-400">Review payment status and value snapshots for all your orders.</p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-500 hover:to-blue-500"
            >
              Continue Shopping
            </Link>
          </div>

          {!loading && !error && orders.length > 0 && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Total Orders</p>
                <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-300">Paid</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-200">{summary.paid}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-300">Pending</p>
                <p className="mt-2 text-2xl font-semibold text-amber-200">{summary.pending}</p>
              </div>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-300">USDT Snapshot Total</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-200">
                  {formatNumeric(summary.usdtTotal, 2)} <span className="text-sm font-medium">USDT</span>
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <OrderCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
              <p className="mb-4 text-rose-200">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-12 text-center">
              <h3 className="text-2xl font-bold">No Orders Yet</h3>
              <p className="mt-2 text-slate-400">Start shopping to see your payment history here.</p>
              <Link
                href="/products"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 font-semibold text-white transition hover:from-cyan-500 hover:to-blue-500"
              >
                Browse Products
              </Link>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = getStatusMeta(order.status as OrderStatus);
                const orderItems = order.items || [];
                const paymentAmount = order.paymentAmount || order.amount;
                const paymentCurrency = order.paymentCurrency || order.network.symbol || "N/A";
                const showPayNow =
                  order.status !== "PAID" &&
                  order.status !== "FAILED" &&
                  order.status !== "EXPIRED";

                return (
                  <div
                    key={order.id}
                    className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition-all duration-300 hover:border-slate-700 hover:shadow-xl hover:shadow-black/30"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <div className="relative">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Invoice</p>
                          <h3 className="mt-1 text-xl font-semibold">
                            #{order.invoiceId ? order.invoiceId.slice(0, 10) : order.id.slice(0, 10)}
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">{formatDateLabel(order.createdAt)}</p>
                        </div>

                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${status.badge}`}>
                          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-300">Items</p>
                            <p className="text-xs text-slate-500">{orderItems.length} item(s)</p>
                          </div>

                          <div className="space-y-2">
                            {orderItems.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2"
                              >
                                <div className="pr-3">
                                  <p className="text-sm text-slate-100">{item.product.name}</p>
                                  <p className="text-xs text-slate-400">
                                    {formatNumeric(item.product.price, 4)} {item.product.currency} x {item.quantity}
                                  </p>
                                </div>
                                <p className="text-sm font-medium text-slate-200">
                                  {formatNumeric(item.subtotal, 4)} {item.product.currency}
                                </p>
                              </div>
                            ))}
                            {orderItems.length > 3 && (
                              <p className="text-xs text-slate-500">+{orderItems.length - 3} more item(s)</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Payment Summary</p>
                          <div className="mt-3 space-y-3">
                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                              <p className="text-xs text-cyan-200/80">Payment Amount</p>
                              <p className="mt-1 text-lg font-semibold text-cyan-100">
                                {formatNumeric(paymentAmount, 6)} {paymentCurrency}
                              </p>
                            </div>
                            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                              <p className="text-xs text-blue-200/80">USDT Value Snapshot</p>
                              <p className="mt-1 text-lg font-semibold text-blue-100">
                                {formatNumeric(order.orderValueUsdt, 2)} USDT
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
                              <p>Network: {order.network.name}</p>
                              <p className="mt-1 font-mono text-slate-400">Wallet: {shortenAddress(order.walletAddress)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-400">
                          Latest Tx:{" "}
                          <span className="font-mono text-slate-300">
                            {order.latestPaymentTxHash
                              ? `${order.latestPaymentTxHash.slice(0, 10)}...${order.latestPaymentTxHash.slice(-8)}`
                              : "Not detected yet"}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {showPayNow && (
                            <Link
                              href={`/checkout/${order.id}`}
                              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-500 hover:to-blue-500"
                            >
                              Pay Now
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}
