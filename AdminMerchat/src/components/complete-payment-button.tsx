"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CompletePaymentButtonProps = {
  orderId: string;
  disabled?: boolean;
};

type ActionResponse = {
  message?: string;
};

export default function CompletePaymentButton({ orderId, disabled = false }: CompletePaymentButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  async function handleCompletePayment() {
    if (disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/admin/order-payouts/complete-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const payload = (await response.json().catch(() => null)) as ActionResponse | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to complete payment.");
      }

      setFeedback({
        message: payload?.message ?? "Payment completed.",
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete payment.";
      setFeedback({
        message,
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled || isSubmitting}
        onClick={handleCompletePayment}
        className={[
          "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-semibold transition",
          disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "border border-cyan-300 bg-cyan-50 text-cyan-700 hover:border-cyan-400 hover:bg-cyan-100",
        ].join(" ")}
      >
        {isSubmitting ? "Processing..." : "Complete Payment"}
      </button>
      {feedback ? (
        <p
          className={[
            "text-[11px] [word-break:break-word]",
            feedback.tone === "error" ? "text-rose-600" : "text-emerald-600",
          ].join(" ")}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
