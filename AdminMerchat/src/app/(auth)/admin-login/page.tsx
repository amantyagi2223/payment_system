'use client';

import { useState } from "react";

function AdminLoginClient({ error }: { error: string | undefined }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <ErrorPopup message={error} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(14,165,233,0.2),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(20,184,166,0.14),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.14),transparent_44%)]" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-7 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.26em] text-cyan-700">Control Plane</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">Manage merchants, payments, and global account health.</p>

        <form action={adminLogin} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-700">
            Email
            <input
              name="email"
              type="email"
              defaultValue="superadmin@stealth.local"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block text-sm text-slate-700">
            Password
            <div className="relative mt-1">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                minLength={8}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-10 text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 16.056 7.773 19 12 19c4.478 0 8.268-2.943 9.543-7a9.97 9.97 0 00-1.563-3.029m5.858.908a3 3 0 11-4.243 4.243 3 3 0 014.243 4.243m0 0V13.125a5.97 5.97 0 01-.773-1.115" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243 3 3 0 01-4.243-4.243m0 0a9 9 0 108.712-7.321 9.97 9.97 0 01-5.712 7.321zm-3.39 5.856A9 9 0 0112 19c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m5.858.908a3 3 0 11-4.243 4.243 3 3 0 014.243 4.243m0 0V13.125a5.97 5.97 0 01-.773-1.115" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Sign in as Admin
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Merchant access?{" "}
          <Link href="/login" className="font-medium text-cyan-700 hover:text-cyan-900">
            Use merchant login
          </Link>
        </p>
      </section>
    </main>
  );
}

// Server Component - must be last
import { redirect } from "next/navigation";
import Link from "next/link";
import ErrorPopup from "@/components/error-popup";
import { adminLogin } from "./actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorParam = params.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return <AdminLoginClient error={error} />;
}

