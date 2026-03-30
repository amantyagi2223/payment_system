import DataTable from "@/components/data-table";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { ApiClientError, getSuperAdminDashboard } from "@/lib/api-client";

function getStatusTone(status: string) {
  if (status === "CONFIRMED") {
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

function formatDateTime(value: string) {
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

function shortId(value: string) {
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export default async function AdminPaymentsPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("auth_token")?.value;
  let errorMessage: string | null = null;
  let rows: ReactNode[][] = [];

  if (!adminToken) {
    errorMessage = "Admin access token is missing from session.";
  } else {
    try {
      const dashboard = await getSuperAdminDashboard(adminToken);
      rows = dashboard.recentPayments.map((payment) => [
        <span key={`${payment.id}-id`} className="font-mono text-xs text-slate-700" title={payment.id}>
          {shortId(payment.id)}
        </span>,
        payment.invoice?.merchantName ?? "Unlinked",
        payment.amount,
        payment.network ? `${payment.network.name} (${payment.network.chainId})` : "Unknown network",
        <span
          key={`${payment.id}-status`}
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusTone(payment.status)}`}>
          {payment.status}
        </span>,
        formatDateTime(payment.detectedAt),
      ]);
    } catch (error) {
      errorMessage = error instanceof ApiClientError ? error.message : "Unable to load payment activity.";
    }
  }

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-teal-800 to-cyan-800 px-5 py-5 text-white shadow-lg md:px-6 md:py-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Payments</h2>
        <p className="mt-1 text-sm text-cyan-100">Recent cross-merchant transaction activity.</p>
      </header>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 md:px-5">
          <p className="font-medium">Unable to load payments</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      <DataTable
        headers={["Payment ID", "Merchant", "Amount", "Network", "Status", "Created"]}
        rows={rows}
        emptyLabel="No recent payments found."
        minWidths={[140, 120, 100, 150, 100, 160]}
      />
    </section>
  );
}
