import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import DataTable from "@/components/data-table";
import { ApiClientError, listMerchantInvoices, type InvoiceStatus } from "@/lib/api-client";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ORDER_STATUS_VALUES: InvoiceStatus[] = ["PENDING", "PAID", "EXPIRED", "FAILED"];

function readSearchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function toStatus(value: string | undefined): InvoiceStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase();
  return ORDER_STATUS_VALUES.includes(normalized as InvoiceStatus) ? (normalized as InvoiceStatus) : null;
}

function getStatusTone(status: InvoiceStatus) {
  if (status === "PAID") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "PENDING") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
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

function shortId(value: string) {
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export default async function MerchantOrderBookPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter = toStatus(readSearchParam(params, "status"));
  const cookieStore = await cookies();
  const merchantApiKey = cookieStore.get("auth_merchant_api_key")?.value;
  const merchantToken = cookieStore.get("auth_merchant_token")?.value;
  const merchantAuth = {
    ...(merchantApiKey ? { apiKey: merchantApiKey } : {}),
    ...(merchantToken ? { accessToken: merchantToken } : {}),
  };
  let errorMessage: string | null = null;
  let rows: ReactNode[][] = [];
  let totals: Record<InvoiceStatus, number> = {
    PENDING: 0,
    PAID: 0,
    EXPIRED: 0,
    FAILED: 0,
  };
  let totalOrders = 0;

  if (!merchantToken && !merchantApiKey) {
    errorMessage = "Merchant session credentials are missing.";
  } else {
    try {
      const invoices = await listMerchantInvoices(merchantAuth, { limit: 100 });
      totalOrders = invoices.length;

      totals = invoices.reduce(
        (acc, invoice) => ({
          ...acc,
          [invoice.status]: acc[invoice.status] + 1,
        }),
        totals,
      );

      const filtered = statusFilter ? invoices.filter((invoice) => invoice.status === statusFilter) : invoices;

      rows = filtered.map((invoice) => [
        <span key={`${invoice.id}-id`} className="font-mono text-xs text-slate-700" title={invoice.id}>
          {shortId(invoice.id)}
        </span>,
        invoice.amount,
        invoice.currency,
        `${invoice.network.name} (${invoice.network.chainId})`,
        <span key={`${invoice.id}-address`} className="font-mono text-xs text-slate-700" title={invoice.paymentAddress}>
          {invoice.paymentAddress.slice(0, 4)}...{invoice.paymentAddress.slice(-4)}
        </span>,
        <span
          key={`${invoice.id}-status`}
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusTone(invoice.status)}`}
        >
          {invoice.status}
        </span>,
        formatDate(invoice.createdAt),
      ]);
    } catch (error) {
      errorMessage = error instanceof ApiClientError ? error.message : "Unable to load order book.";
    }
  }

  const statusTabs: Array<{ label: string; status: InvoiceStatus | null; count: number }> = [
    { label: "All", status: null, count: totalOrders },
    ...ORDER_STATUS_VALUES.map((status) => ({ label: status, status, count: totals[status] })),
  ];

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-cyan-900 px-5 py-5 text-white shadow-lg md:px-6 md:py-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Order Book</h2>
        <p className="mt-1 text-sm text-cyan-100">Track all merchant order entries and settlement status.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total Orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalOrders}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-700">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{totals.PENDING}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Paid</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{totals.PAID}</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-rose-700">Expired</p>
          <p className="mt-2 text-2xl font-semibold text-rose-900">{totals.EXPIRED}</p>
        </article>
        <article className="rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-700">Failed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.FAILED}</p>
        </article>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {statusTabs.map((tab) => {
          const active = statusFilter === tab.status;
          const href = tab.status ? `/merchant/orders?status=${tab.status}` : "/merchant/orders";

          return (
            <Link
              key={tab.label}
              href={href}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-medium transition",
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              {tab.label} ({tab.count})
            </Link>
          );
        })}
      </div>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 md:px-5">
          <p className="font-medium">Unable to load order book</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      <DataTable
        headers={["Order ID", "Amount", "Currency", "Network", "Payment Address", "Status", "Created"]}
        rows={rows}
        emptyLabel="No orders found for this merchant."
        minWidths={[140, 100, 90, 150, 180, 100, 120]}
      />
    </section>
  );
}
