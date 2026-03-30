"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiClientError, loginSuperAdmin } from "@/lib/api-client";
import { setAdminSession } from "@/lib/session";

export async function adminLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  console.log('[ADMIN LOGIN ACTION] Email:', email, 'Password length:', password.length);

  if (!email || !password) {
    redirect("/admin-login?error=Email%20and%20password%20are%20required");
  }

  try {
    const result = await loginSuperAdmin(email, password);
    const cookieStore = await cookies();

    setAdminSession(cookieStore, {
      email: result.admin.email,
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error('[ADMIN LOGIN ACTION ERROR]', error);
    const message =
      error instanceof ApiClientError ? error.message : "Unable to connect to backend API";
    redirect(`/admin-login?error=${encodeURIComponent(message)}`);
  }

  redirect("/admin/dashboard");
}
