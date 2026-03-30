import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiClientError, completeSuperAdminOrderPayment } from "@/lib/api-client";

const PAYMENT_RETRY_DELAY_MS = 5000;

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("auth_token")?.value;

  if (!adminToken) {
    return NextResponse.json({ message: "Admin access token is missing from session." }, { status: 401 });
  }

  let orderId = "";
  try {
    const payload = (await request.json()) as { orderId?: string };
    orderId = String(payload.orderId ?? "").trim();
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  if (!orderId) {
    return NextResponse.json({ message: "Order ID is required." }, { status: 400 });
  }

  try {
    await wait(PAYMENT_RETRY_DELAY_MS);
    const payout = await completeSuperAdminOrderPayment(adminToken, orderId);
    const txHashText = payout.txHash ? ` | Tx: ${payout.txHash}` : "";
    return NextResponse.json({
      message: `Payout status: ${payout.status}${txHashText}`,
      payout,
    });
  } catch (error) {
    const status = error instanceof ApiClientError && error.status > 0 ? error.status : 500;
    const message = error instanceof ApiClientError ? error.message : "Unable to complete payment.";
    return NextResponse.json({ message }, { status });
  }
}
