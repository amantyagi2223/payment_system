import { cookies } from "next/headers";

import { ApiClientError, getMerchantDashboard } from "@/lib/api-client";

function maskApiKey(value: string) {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export default async function MerchantSettingsPage() {
  const cookieStore = await cookies();
  const merchantApiKey = cookieStore.get("auth_merchant_api_key")?.value;
  const merchantToken = cookieStore.get("auth_merchant_token")?.value;
  const merchantAuth = {
    ...(merchantApiKey ? { apiKey: merchantApiKey } : {}),
    ...(merchantToken ? { accessToken: merchantToken } : {}),
  };
  let errorMessage: string | null = null;
  let dashboard: Awaited<ReturnType<typeof getMerchantDashboard>> | null = null;

  if (!merchantToken && !merchantApiKey) {
    errorMessage = "Merchant session credentials are missing.";
  } else {
    try {
      dashboard = await getMerchantDashboard(merchantAuth);
    } catch (error) {
      errorMessage = error instanceof ApiClientError ? error.message : "Unable to load merchant settings.";
    }
  }

  const networkBreakdown = dashboard?.networkBreakdown ?? [];
  const recentInvoices = dashboard?.recentInvoices ?? [];
  const topNetwork = networkBreakdown.length
    ? [...networkBreakdown].sort((a, b) => b.paymentCount - a.paymentCount)[0]
    : null;
  const latestInvoice = recentInvoices[0];
  const merchantStatusLabel =
    typeof dashboard?.merchant.isActive === "boolean"
      ? dashboard.merchant.isActive
        ? "Active"
        : "Inactive"
      : "Unknown";

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-900 px-5 py-4 text-white shadow-lg">
        <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-indigo-100">Manage merchant account configuration and payout preferences.</p>
      </header>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-medium">Unable to load settings</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Profile</h3>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <dt>Business Name</dt>
              <dd>{dashboard?.merchant.name ?? "Unavailable"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Support Email</dt>
              <dd>{dashboard?.merchant.email ?? "Unavailable"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Account Status</dt>
              <dd>{dashboard ? merchantStatusLabel : "Unavailable"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Merchant ID</dt>
              <dd>{dashboard?.merchant.id ?? "Unavailable"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Payouts</h3>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <dt>Default Currency</dt>
              <dd>{latestInvoice?.currency ?? "Unavailable"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Top Network</dt>
              <dd>{topNetwork ? `${topNetwork.networkName} (${topNetwork.chainId ?? "N/A"})` : "Unavailable"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Settlement Wallet</dt>
              <dd>{latestInvoice?.paymentAddress ?? "Unavailable"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>API Key</dt>
              <dd>{merchantApiKey ? maskApiKey(merchantApiKey) : "Unavailable"}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
