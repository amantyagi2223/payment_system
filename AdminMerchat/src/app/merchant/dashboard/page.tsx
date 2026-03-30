import Link from "next/link";
import StatCard from "@/components/stat-card";
import { cookies } from "next/headers";

import { ApiClientError, getBackendHealth, getMerchantDashboard, listMerchantProducts } from "@/lib/api-client";

export default async function MerchantDashboardPage() {
  const cookieStore = await cookies();
  const merchantApiKey = cookieStore.get("auth_merchant_api_key")?.value;
  const merchantToken = cookieStore.get("auth_merchant_token")?.value;
  const merchantAuth = {
    ...(merchantApiKey ? { apiKey: merchantApiKey } : {}),
    ...(merchantToken ? { accessToken: merchantToken } : {}),
  };

  const [backendHealth, dashboardResult, productResult] = await Promise.all([
    getBackendHealth(),
    (async () => {
      if (!merchantToken && !merchantApiKey) {
        return { data: null, error: "Merchant session credentials are missing." };
      }

      try {
        return { data: await getMerchantDashboard(merchantAuth), error: null };
      } catch (error) {
        const message =
          error instanceof ApiClientError ? error.message : "Unable to load merchant dashboard metrics.";
        return { data: null, error: message };
      }
    })(),
    (async () => {
      if (!merchantToken && !merchantApiKey) {
        return { total: null };
      }

      try {
        const products = await listMerchantProducts(merchantAuth, { page: 1, limit: 1 });
        return { total: products.total };
      } catch {
        return { total: null };
      }
    })(),
  ]);

  const invoiceMetricsRaw = dashboardResult.data?.metrics?.invoices;
  const invoiceMetrics =
    typeof invoiceMetricsRaw === "number"
      ? {
          total: invoiceMetricsRaw,
          pending: 0,
          paid: 0,
          expired: 0,
          failed: 0,
        }
      : (invoiceMetricsRaw ?? {
          total: 0,
          pending: 0,
          paid: 0,
          expired: 0,
          failed: 0,
        });
  const paymentMetrics = dashboardResult.data?.metrics?.payments ?? {
    total: 0,
    confirmed: 0,
    pending: 0,
    failed: 0,
  };
  const paidVolume = dashboardResult.data?.metrics?.paidVolume ?? "0";
  const rangeDays = dashboardResult.data?.rangeDays ?? 30;
  const networkBreakdown = dashboardResult.data?.networkBreakdown ?? [];
  const recentInvoices = dashboardResult.data?.recentInvoices ?? [];

  const stats = dashboardResult.data
    ? [
        {
          label: "Open Invoices",
          value: String(invoiceMetrics.pending),
          detail: `${invoiceMetrics.total} total`,
        },
        {
          label: "Paid Invoices",
          value: String(invoiceMetrics.paid),
          detail: `${invoiceMetrics.expired} expired`,
        },
        {
          label: "Paid Volume",
          value: paidVolume,
          detail: `${rangeDays}-day range`,
        },
        {
          label: "Confirmed Payments",
          value: String(paymentMetrics.confirmed),
          detail: `${paymentMetrics.total} total`,
        },
        {
          label: "Products",
          value: productResult.total !== null ? String(productResult.total) : "--",
          detail: productResult.total !== null ? "Total products" : "Unavailable",
        },
      ]
    : [
        { label: "Open Invoices", value: "--", detail: "Unavailable" },
        { label: "Paid Invoices", value: "--", detail: "Unavailable" },
        { label: "Paid Volume", value: "--", detail: "Unavailable" },
        { label: "Confirmed Payments", value: "--", detail: "Unavailable" },
        { label: "Products", value: "--", detail: "Unavailable" },
      ];

  return (
    <section className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-700 via-cyan-700 to-teal-700 px-5 py-5 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Merchant Analytics</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Merchant Dashboard</h2>
        <p className="mt-1 text-sm text-cyan-100">Operational performance, settlement trends, and invoice activity.</p>
      </header>

      <article 
        className={[
          "rounded-2xl border px-4 py-3 text-sm shadow-sm",
          backendHealth.ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800",
        ].join(" ")}
      >
        <p className="font-medium">Backend Status: {backendHealth.ok ? "Connected" : "Issue"}</p>
        <p className="mt-1">{backendHealth.message}</p>
      </article>

      {dashboardResult.error ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-medium">Metrics Unavailable</p>
          <p className="mt-1">{dashboardResult.error}</p>
        </article>
      ) : (
        <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
          <p className="font-medium">{dashboardResult.data?.merchant.name ?? "Merchant"}</p>
          <p className="mt-1">{dashboardResult.data?.merchant.email ?? "Unavailable"}</p>
        </article>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} detail={item.detail} />
        ))}
      </div>

      <article className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm text-cyan-900 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Payout Wallets</p>
        <h3 className="mt-2 text-lg font-semibold">Manage Merchant Settlement Wallets</h3>
        <p className="mt-1 text-cyan-800">
          Add or change payout wallet per network, copy addresses, and monitor wallet balances.
        </p>
        <Link
          href="/merchant/wallets"
          className="mt-3 inline-flex rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-100"
        >
          Open Wallet Management
        </Link>
      </article>

      {dashboardResult.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Network Breakdown</h3>
            <div className="mt-3 space-y-2">
              {networkBreakdown.slice(0, 5).map((network) => (
                <div
                  key={network.networkId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{network.networkName}</p>
                    <p className="text-xs text-slate-500">Chain {network.chainId ?? "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{network.paymentCount} payments</p>
                    <p className="text-xs text-slate-500">{network.paymentVolume} volume</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Recent Invoices</h3>
            <div className="mt-3 space-y-2">
              {recentInvoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm" >
                  <div>
                    <p className="font-medium text-slate-800">{invoice.id.slice(0, 12)}...</p>
                    <p className="text-xs text-slate-500">{invoice.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{invoice.amount}</p>
                    <p className="text-xs text-slate-500">{invoice.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
