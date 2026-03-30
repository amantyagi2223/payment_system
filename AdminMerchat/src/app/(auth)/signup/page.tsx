import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ErrorPopup from "@/components/error-popup";
import { ApiClientError, loginMerchant, normalizeMerchantSession, registerMerchant } from "@/lib/api-client";
import { setMerchantSession } from "@/lib/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function merchantSignup(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!name || !email || !password) {
    redirect("/signup?error=Name%2C%20email%2C%20and%20password%20are%20required");
  }

  try {
    const registered = await registerMerchant({ name, email, password });
    const registeredSession = normalizeMerchantSession(registered);
    let accessToken: string | undefined;
    let apiKey: string | undefined = registeredSession?.apiKey;
    let merchantId: string | undefined = registeredSession?.id;
    let merchantEmail = registeredSession?.email ?? email;

    try {
      const loginResponse = await loginMerchant({ email, password });
      const session = normalizeMerchantSession(loginResponse);

      if (session) {
        accessToken = session.accessToken ?? accessToken;
        apiKey = session.apiKey ?? apiKey;
        merchantId = session.id ?? merchantId;
        merchantEmail = session.email ?? merchantEmail;
      }
    } catch (error) {
      if (!(error instanceof ApiClientError) || (error.status !== 404 && error.status !== 405)) {
        throw error;
      }
    }

    if (!accessToken && !apiKey) {
      redirect("/signup?error=Signup%20succeeded%20but%20no%20session%20token%20or%20api%20key%20returned");
    }

    const cookieStore = await cookies();

    setMerchantSession(cookieStore, {
      id: merchantId,
      email: merchantEmail || email,
      accessToken,
      apiKey,
    });
  } catch (error) {
    const message =
      error instanceof ApiClientError ? error.message : "Unable to connect to backend API";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  redirect("/merchant/dashboard");
}

export default async function MerchantSignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorParam = params.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <ErrorPopup message={error} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.2),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.18),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.15),transparent_45%)]" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-7 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">Merchant Workspace</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Merchant Signup</h1>
        <p className="mt-2 text-sm text-slate-600">Create your merchant account to start using the dashboard.</p>

        <form action={merchantSignup} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-700">
            Business Name
            <input
              name="name"
              type="text"
              defaultValue="Nova Commerce"
              minLength={3}
              maxLength={80}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

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
            className="w-full rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-800"
          >
            Create Account
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-cyan-700 hover:text-cyan-900">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
