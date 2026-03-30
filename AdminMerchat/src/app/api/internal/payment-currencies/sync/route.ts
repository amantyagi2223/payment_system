import { NextRequest, NextResponse } from "next/server";

import { syncPaymentCurrencyRates } from "@/lib/payment-currency-store";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.PAYMENT_RATES_SYNC_SECRET ?? process.env.CRON_SECRET;
  if (!configuredSecret) {
    return true;
  }

  const headerSecret = request.headers.get("x-sync-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;

  return headerSecret === configuredSecret || querySecret === configuredSecret || bearerSecret === configuredSecret;
}

async function runSync(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncPaymentCurrencyRates();
    return NextResponse.json({
      message: "Currency rates synced successfully.",
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync currency rates.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return runSync(request);
}

export async function POST(request: NextRequest) {
  return runSync(request);
}
