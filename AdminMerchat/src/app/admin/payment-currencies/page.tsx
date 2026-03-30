import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import DataTable from "@/components/data-table";
import {
  createPaymentCurrency,
  listPaymentCurrencies,
  setPaymentCurrencyActive,
  syncPaymentCurrencyRates,
} from "@/lib/payment-currency-store";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null) {
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

async function ensureAdminAccess() {
  const cookieStore = await cookies();
  const role = cookieStore.get("auth_role")?.value;
  const token = cookieStore.get("auth_token")?.value;
  if (role !== "admin" || !token) {
    throw new Error("Admin session is required.");
  }
}

async function addPaymentCurrencyAction(formData: FormData) {
  "use server";

  const symbol = String(formData.get("symbol") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const coingeckoId = String(formData.get("coingeckoId") ?? "").trim();
  if (!symbol) {
    redirect("/admin/payment-currencies?error=Currency%20symbol%20is%20required");
  }

  let targetUrl = "/admin/payment-currencies?success=Currency%20added%20successfully";
  try {
    await ensureAdminAccess();
    await createPaymentCurrency({
      symbol,
      name,
      coingeckoId,
      isActive: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add currency.";
    targetUrl = `/admin/payment-currencies?error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

async function togglePaymentCurrencyAction(formData: FormData) {
  "use server";

  const currencyId = String(formData.get("currencyId") ?? "").trim();
  const nextActive = String(formData.get("nextActive") ?? "").trim() === "true";
  if (!currencyId) {
    redirect("/admin/payment-currencies?error=Currency%20id%20is%20required");
  }

  const statusText = nextActive ? "enabled" : "disabled";
  let targetUrl = `/admin/payment-currencies?success=Currency%20${statusText}%20successfully`;
  try {
    await ensureAdminAccess();
    await setPaymentCurrencyActive(currencyId, nextActive);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update currency status.";
    targetUrl = `/admin/payment-currencies?error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

async function syncRatesAction() {
  "use server";

  let targetUrl = "/admin/payment-currencies?success=Rates%20synced%20successfully";
  try {
    await ensureAdminAccess();
    const result = await syncPaymentCurrencyRates();
    const skipped = result.skippedSymbols.length ? ` Skipped: ${result.skippedSymbols.join(", ")}.` : "";
    targetUrl = `/admin/payment-currencies?success=${encodeURIComponent(
      `Rates synced. Updated ${result.updatedCount} currencies.${skipped}`,
    )}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync currency rates.";
    targetUrl = `/admin/payment-currencies?error=${encodeURIComponent(message)}`;
  }

  redirect(targetUrl);
}

export default async function AdminPaymentCurrenciesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const successMessage = readSearchParam(params, "success");
  const queryError = readSearchParam(params, "error");

  let errorMessage: string | null = queryError ?? null;
  let rows: ReactNode[][] = [];
  let canManage = false;

  try {
    await ensureAdminAccess();
    canManage = true;
    const currencies = await listPaymentCurrencies({ includeInactive: true });
    rows = currencies.map((currency) => [
      <div key={`${currency.id}-symbol`} className="space-y-1">
        <p className="font-semibold text-slate-900">{currency.symbol}</p>
        {currency.isSystem ? (
          <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            Core
          </span>
        ) : null}
      </div>,
      currency.name,
      currency.coingeckoId ?? "-",
      currency.usdtRate,
      formatDate(currency.lastRateUpdatedAt),
      <span
        key={`${currency.id}-status`}
        className={[
          "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
          currency.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
        ].join(" ")}
      >
        {currency.isActive ? "Active" : "Inactive"}
      </span>,
      <form key={`${currency.id}-toggle`} action={togglePaymentCurrencyAction}>
        <input type="hidden" name="currencyId" value={currency.id} />
        <input type="hidden" name="nextActive" value={currency.isActive ? "false" : "true"} />
        <button
          type="submit"
          disabled={currency.isSystem && currency.isActive}
          className={[
            "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
            currency.isSystem && currency.isActive
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : currency.isActive
                ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400 hover:bg-rose-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100",
          ].join(" ")}
        >
          {currency.isActive ? "Disable" : "Enable"}
        </button>
      </form>,
    ]);
  } catch (error) {
    errorMessage = errorMessage ?? (error instanceof Error ? error.message : "Unable to load currencies.");
  }

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-cyan-900 px-5 py-5 text-white shadow-lg md:px-6 md:py-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Payment Currencies</h2>
        <p className="mt-1 text-sm text-cyan-100">
          Manage merchant-allowed currencies and keep prices updated in USDT.
        </p>
      </header>

      {canManage ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Add Currency</h3>
              <p className="mt-1 text-sm text-slate-600">
                Default currencies: USDT, USDC, ETH. Add more and optionally map CoinGecko ID for auto-rate updates.
              </p>
            </div>
            <form action={syncRatesAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-100"
              >
                Sync Rates Now
              </button>
            </form>
          </div>

          <form action={addPaymentCurrencyAction} className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-700">
              Symbol
              <input
                name="symbol"
                placeholder="BTC"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 uppercase outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              Name
              <input
                name="name"
                placeholder="Bitcoin"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              CoinGecko ID
              <input
                name="coingeckoId"
                placeholder="bitcoin"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Add Currency
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {successMessage ? (
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 md:px-5">
          <p className="font-medium">Success</p>
          <p className="mt-1">{successMessage}</p>
        </article>
      ) : null}

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 md:px-5">
          <p className="font-medium">Unable to complete request</p>
          <p className="mt-1">{errorMessage}</p>
        </article>
      ) : null}

      <DataTable
        headers={["Symbol", "Name", "CoinGecko", "USDT Rate", "Rate Updated", "Status", "Action"]}
        rows={rows}
        emptyLabel="No currencies found."
        minWidths={[120, 180, 160, 120, 180, 120, 120]}
      />
    </section>
  );
}
