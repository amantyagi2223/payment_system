import DataTable from "@/components/data-table";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { ApiClientError, listMerchantInvoices } from "@/lib/api-client";

function getStatusTone(status: string) {
  if (status === "PAID") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "PENDING") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "EXPIRED" || status === "FAILED") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-100 text-slate-700";
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

export default async function MerchantInvoicesPage() {
  const cookieStore = await cookies();
  const merchantApiKey = cookieStore.get("auth_merchant_api_key")?.value;
  const merchantToken = cookieStore.get("auth_merchant_token")?.value;
  const merchantAuth = {
    ...(merchantApiKey ? { apiKey: merchantApiKey } : {}),
    ...(merchantToken ? { accessToken: merchantToken } : {}),
  };
  let errorMessage: string | null = null;
  let rows: ReactNode[][] = [];

  if (!merchantToken && !merchantApiKey) {
    errorMessage = "Merchant session credentials are missing.";
  } else {
    try {
      const invoices = await listMerchantInvoices(merchantAuth, { limit: 10 });

      rows = invoices.map((invoice) => [
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
      errorMessage = error instanceof ApiClientError ? error.message : "Unable to load invoices.";
    }
  }

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-800 to-cyan-800 px-5 py-5 text-white shadow-lg md:px-6 md:py-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Invoices</h2>
        <p className="mt-1 text-sm text-cyan-100">Track invoice status and payment activity.</p>
      </header>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 md:px-5">
          <p className="font-medium">Unable to load invoices</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      <DataTable
        headers={["Invoice ID", "Amount", "Currency", "Network", "Payment Address", "Status", "Created"]}
        rows={rows}
        emptyLabel="No invoices found for this merchant."
        minWidths={[140, 100, 90, 150, 180, 100, 120]}
      />
    </section>
  );
}
