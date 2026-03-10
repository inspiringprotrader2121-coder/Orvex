"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

type CheckoutButtonProps = {
  className?: string;
  label?: string;
  payload?: {
    mode: "credits" | "subscription";
    planId: string;
  };
};

export function CheckoutButton({
  className = "",
  label = "Start Checkout",
  payload = {
    mode: "credits",
    planId: "credits_50",
  },
}: CheckoutButtonProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stripe", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await response.json() as { error?: string; url?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout");
      }

      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, "Unable to start checkout"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={handleCheckout}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-extrabold text-black transition-all active:scale-[0.98] disabled:opacity-50 hover:bg-gray-200 ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            {label} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      {error ? <p className="text-xs font-medium text-rose-400">{error}</p> : null}
    </div>
  );
}
