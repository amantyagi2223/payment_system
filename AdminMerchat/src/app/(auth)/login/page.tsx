import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ErrorPopup from "@/components/error-popup";
import { ApiClientError, loginMerchant, normalizeMerchantSession } from "@/lib/api-client";
import { setMerchantSession } from "@/lib/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function merchantLogin(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=Email%20and%20password%20are%20required");
  }

  try {
    const loginResponse = await loginMerchant({ email, password });
    const session = normalizeMerchantSession(loginResponse);

    if (!session || (!session.accessToken && !session.apiKey)) {
      redirect("/login?error=Merchant%20login%20response%20is%20invalid");
    }

    const cookieStore = await cookies();

    setMerchantSession(cookieStore, {
      id: session.id,
      email: session.email ?? email,
      accessToken: session.accessToken,
      apiKey: session.apiKey,
    });
  } catch (error) {
    const message =
      error instanceof ApiClientError ? error.message : "Unable to connect to backend API";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect("/merchant/dashboard");
}

export default async function MerchantLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorParam = params.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <ErrorPopup message={error} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(16,185,129,0.18),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.16),transparent_45%)]" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-7 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">Merchant Workspace</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Merchant Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in with your merchant credentials.</p>

        <form action={merchantLogin} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-700">
            Email
            <input
              name="email"
              type="email"
              defaultValue="merchant@example.com"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block text-sm text-slate-700">
            Password
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Sign In
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          New merchant?{" "}
          <Link href="/signup" className="font-medium text-cyan-700 hover:text-cyan-900">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
