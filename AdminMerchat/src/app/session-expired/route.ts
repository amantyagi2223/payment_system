import { NextRequest, NextResponse } from "next/server";

function clearSessionCookies(response: NextResponse) {
  response.cookies.set("auth_role", "", { path: "/", maxAge: 0 });
  response.cookies.set("auth_email", "", { path: "/", maxAge: 0 });
  response.cookies.set("auth_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("auth_merchant_id", "", { path: "/", maxAge: 0 });
  response.cookies.set("auth_merchant_api_key", "", { path: "/", maxAge: 0 });
  response.cookies.set("auth_merchant_token", "", { path: "/", maxAge: 0 });
}

export function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role");
  const message = request.nextUrl.searchParams.get("message") ?? "Session expired. Please sign in again.";
  const target = role === "admin" ? "/admin-login" : "/login";
  const response = NextResponse.redirect(
    new URL(`${target}?error=${encodeURIComponent(message)}`, request.url),
    303,
  );

  clearSessionCookies(response);
  return response;
}

