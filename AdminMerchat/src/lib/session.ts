import { cookies } from "next/headers";

import { AUTH_COOKIE_BASE_OPTIONS } from "@/lib/auth-cookies";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export function setAdminSession(
  cookieStore: CookieStore,
  session: { email: string; accessToken: string },
) {
  cookieStore.set("auth_role", "admin", AUTH_COOKIE_BASE_OPTIONS);
  cookieStore.set("auth_email", session.email, AUTH_COOKIE_BASE_OPTIONS);
  cookieStore.set("auth_token", session.accessToken, AUTH_COOKIE_BASE_OPTIONS);
  clearMerchantSession(cookieStore);
}

export function setMerchantSession(
  cookieStore: CookieStore,
  session: { id?: string; email: string; accessToken?: string; apiKey?: string },
) {
  cookieStore.set("auth_role", "merchant", AUTH_COOKIE_BASE_OPTIONS);
  cookieStore.set("auth_email", session.email, AUTH_COOKIE_BASE_OPTIONS);
  if (session.id) {
    cookieStore.set("auth_merchant_id", session.id, AUTH_COOKIE_BASE_OPTIONS);
  } else {
    cookieStore.set("auth_merchant_id", "", { path: "/", maxAge: 0 });
  }

  if (session.accessToken) {
    cookieStore.set("auth_merchant_token", session.accessToken, AUTH_COOKIE_BASE_OPTIONS);
  } else {
    cookieStore.set("auth_merchant_token", "", { path: "/", maxAge: 0 });
  }

  if (session.apiKey) {
    cookieStore.set("auth_merchant_api_key", session.apiKey, AUTH_COOKIE_BASE_OPTIONS);
  } else {
    cookieStore.set("auth_merchant_api_key", "", { path: "/", maxAge: 0 });
  }

  cookieStore.set("auth_token", "", { path: "/", maxAge: 0 });
}

export function clearMerchantSession(cookieStore: CookieStore) {
  cookieStore.set("auth_merchant_id", "", { path: "/", maxAge: 0 });
  cookieStore.set("auth_merchant_api_key", "", { path: "/", maxAge: 0 });
  cookieStore.set("auth_merchant_token", "", { path: "/", maxAge: 0 });
}
