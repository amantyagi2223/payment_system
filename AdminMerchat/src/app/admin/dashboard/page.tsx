import Link from "next/link";
import StatCard from "@/components/stat-card";
import { cookies } from "next/headers";

import { ApiClientError, getBackendHealth, getSuperAdminDashboard } from "@/lib/api-client";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("auth_token")?.value;

  const [backendHealth, dashboardResult] = await Promise.all([
    getBackendHealth(),
    (async () => {
      if (!adminToken) {
        return { data: null, error: "Admin access token is missing from session." };
      }

      try {
        return { data: await getSuperAdminDashboard(adminToken), error: null };
      } catch (error) {
        const message =
          error instanceof ApiClientError ? error.message : "Unable to load admin dashboard metrics.";
        return { data: null, error: message };
      }
    })(),
  ]);

  const stats = dashboardResult.data
    ? [
        {
          label: "Total Merchants",
          value: String(dashboardResult.data.metrics.merchants.total),
          detail: `${dashboardResult.data.metrics.merchants.active} active`,
        },
        {
          label: "Total Invoices",
          value: String(dashboardResult.data.metrics.invoices.total),
          detail: `${dashboardResult.data.metrics.invoices.pending} pending`,
        },
        {
          label: "Paid Volume",
          value: dashboardResult.data.metrics.paidVolume,
          detail: `${dashboardResult.data.rangeDays}-day range`,
        },
        {
          label: "Total Payments",
          value: String(dashboardResult.data.metrics.payments.total),
          detail: `${dashboardResult.data.metrics.payments.confirmed} confirmed`,
        },
      ]
    : [
        { label: "Total Merchants", value: "--", detail: "Unavailable" },
        { label: "Total Invoices", value: "--", detail: "Unavailable" },
        { label: "Paid Volume", value: "--", detail: "Unavailable" },
        { label: "Total Payments", value: "--", detail: "Unavailable" },
      ];
  return (
    <section className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-700 via-teal-700 to-emerald-700 px-5 py-5 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Control Plane</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Admin Dashboard</h2>
        <p className="mt-1 text-sm text-cyan-100">Live overview of merchants, invoices, and payment performance.</p>
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
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} detail={item.detail} />
        ))}
      </div>

      <article className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-rose-700">Payout Recovery</p>
        <h3 className="mt-2 text-lg font-semibold">Process Failed Merchant Transfers</h3>
        <p className="mt-1 text-rose-800">
          Review paid orders, inspect order wallet balances, and manually complete failed merchant payouts.
        </p>
        <Link
          href="/admin/order-payouts"
          className="mt-3 inline-flex rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-800 transition hover:border-rose-400 hover:bg-rose-100"
        >
          Open Order Payout Processing
        </Link>
      </article>

      {dashboardResult.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Network Breakdown</h3>
            <div className="mt-3 space-y-2">
              {dashboardResult.data.networkBreakdown.slice(0, 5).map((network) => (
                <div
                  key={network.networkId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{network.network?.name ?? network.networkName ?? "Unknown network"}</p>
                    <p className="text-xs text-slate-500">
                      Chain {network.network?.chainId ?? network.chainId ?? "N/A"}
                    </p>
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
            <h3 className="text-base font-semibold text-slate-900">Top Merchants</h3>
            <div className="mt-3 space-y-2">
              {dashboardResult.data.topMerchants.slice(0, 5).map((merchant) => (
                <div
                  key={merchant.merchantId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{merchant.merchantName ?? merchant.merchantId}</p>
                    <p className="text-xs text-slate-500">{merchant.merchantEmail ?? "Unknown email"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{merchant.paidInvoiceCount} paid</p>
                    <p className="text-xs text-slate-500">{merchant.paidInvoiceVolume} volume</p>
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
