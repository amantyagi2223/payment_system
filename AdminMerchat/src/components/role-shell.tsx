"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { NavItem } from "@/lib/navigation";

type RoleShellProps = {
  title: string;
  roleLabel: string;
  navItems: NavItem[];
  children: ReactNode;
};

export default function RoleShell({ title, roleLabel, navItems, children }: RoleShellProps) {
  const pathname = usePathname();
  const activeItem = navItems.find((item) => item.href === pathname);

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1320px] grid-cols-1 gap-4 overflow-x-hidden p-4 md:grid-cols-[280px_minmax(0,1fr)] md:gap-6 md:p-6">
        <aside className="animate-rise-in relative flex min-h-[80vh] flex-col overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950 p-5 text-slate-100 shadow-2xl md:p-6">
          <div className="pointer-events-none absolute -top-16 -right-20 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/6 via-transparent to-amber-500/8" />

          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Crypto Gateway</p>
          <h1 className="mt-3 text-xl font-semibold md:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-300">{roleLabel}</p>

          <div className="mt-5 rounded-2xl border border-slate-700/90 bg-slate-900/70 px-3 py-2 text-xs text-slate-300 md:mt-6">
            <p className="uppercase tracking-[0.18em] text-slate-500">Workspace</p>
            <p className="mt-1 text-sm text-slate-100">{activeItem?.label ?? "Overview"}</p>
          </div>

          <nav className="relative z-10 mt-6 flex flex-col gap-1.5 md:mt-8 md:gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={[
                    "flex items-center justify-between rounded-xl px-3 py-3 text-sm transition md:py-2.5",
                    active
                      ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-900/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  <span className={active ? "text-slate-950" : "text-slate-500"}>●</span>
                </Link>
              );
            })}
          </nav>

          <form action="/logout" method="post" className="relative z-10 mt-auto pt-6 md:pt-8">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white md:py-2.5">
              Logout
            </button>
          </form>
        </aside>

        <div className="min-w-0 space-y-4 md:space-y-5">
          <header className="glass-panel animate-rise-in rounded-3xl px-5 py-4 md:px-6 md:py-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{activeItem?.label ?? "Overview"}</h2>
              <p className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">{roleLabel}</p>
            </div>
          </header>

          <main className="glass-panel animate-rise-in min-w-0 overflow-x-auto rounded-3xl p-5 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
