import DataTable from "@/components/data-table";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { ApiClientError, getSuperAdminDashboard, listSuperAdminMerchants} from "@/lib/api-client";

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

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

export default async function AdminMerchantsPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("auth_token")?.value;
  let errorMessage: string | null = null;
  let rows: ReactNode[][] = [];

  if (!adminToken) {
    errorMessage = "Admin access token is missing from session.";
  } else {
    let merchantList: Awaited<ReturnType<typeof listSuperAdminMerchants>> = [];

    try {
      merchantList = await listSuperAdminMerchants(adminToken);
    } catch (error) {
      if (!(error instanceof ApiClientError) || (error.status !== 404 && error.status !== 405)) {
        errorMessage = error instanceof ApiClientError ? error.message : "Unable to load merchant data.";
      }
    }

    if (!errorMessage && merchantList.length > 0) {
      rows = merchantList.map((merchant) => [
        merchant.name,
        merchant.email ?? "Unknown",
        <span
          key={`${merchant.id}-status`}
          className={[
            "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
            merchant.isActive === true
              ? "bg-emerald-100 text-emerald-700"
              : merchant.isActive === false
                ? "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {merchant.isActive === true ? "Active" : merchant.isActive === false ? "Inactive" : "Unknown"}
        </span>,
        merchant.paidInvoiceCount !== null ? String(merchant.paidInvoiceCount) : "--",
        merchant.paidInvoiceVolume ?? "--",
        formatDate(merchant.createdAt),
      ]);
    }

    if (!errorMessage && rows.length === 0) {
      try {
        const dashboard = await getSuperAdminDashboard(adminToken);
        rows = dashboard.topMerchants.map((merchant) => [
          merchant.merchantName,
          merchant.merchantEmail ?? "Unknown",
          <span
            key={`${merchant.merchantId}-status`}
            className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
          >
            Unknown
          </span>,
          String(merchant.paidInvoiceCount),
          merchant.paidInvoiceVolume,
          "Unknown",
        ]);
      } catch (error) {
        errorMessage = error instanceof ApiClientError ? error.message : "Unable to load merchant data.";
      }
    }
  }

  return (
    <section className="space-y-4 md:space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-cyan-900 px-4 py-4 text-white shadow-lg md:px-5 md:py-5">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Merchants</h2>
        <p className="mt-1 text-sm text-cyan-100">Merchant rankings based on paid invoice performance.</p>
      </header>

      {errorMessage ? (
        <article className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 md:px-4">
          <p className="font-medium">Unable to load merchants</p>
          <p className="mt-0.5">{errorMessage}</p>
        </article>
      ) : null}

      <DataTable
        headers={["Merchant", "Email", "Status", "Paid Invoices", "Paid Volume", "Joined"]}
        rows={rows}
        emptyLabel="No merchants found."
        minWidths={[150, 180, 100, 120, 120, 120]}
      />
    </section>
  );
}
