"use client";

import { useState } from "react";

type CopyWalletButtonProps = {
  value: string;
};

export default function CopyWalletButton({ value }: CopyWalletButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1200);
    }
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      title={state === "copied" ? "Copied" : state === "error" ? "Copy failed" : "Copy wallet"}
    >
      {state === "copied" ? "Copied" : state === "error" ? "Retry" : "Copy"}
    </button>
  );
}
