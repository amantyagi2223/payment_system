"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Unable to load this page</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your session is still preserved. Try reloading this screen, or return to dashboard.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Go to home
          </Link>
        </div>
      </section>
    </main>
  );
}

