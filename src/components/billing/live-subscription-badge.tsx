"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";

type SubscriptionState = {
  subscriptionStatus: "inactive" | "trialing" | "active" | "past_due" | "canceled";
  subscriptionTier: "free" | "starter" | "pro" | "growth" | "enterprise";
};

const toneClasses: Record<SubscriptionState["subscriptionStatus"], string> = {
  active: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  canceled: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  inactive: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  past_due: "border-amber-400/20 bg-amber-500/10 text-amber-300",
  trialing: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
};

export function LiveSubscriptionBadge({
  initialStatus,
  initialTier,
}: {
  initialStatus: SubscriptionState["subscriptionStatus"];
  initialTier: SubscriptionState["subscriptionTier"];
}) {
  const { socket } = useSocket();
  const [liveState, setLiveState] = useState<SubscriptionState | null>(null);
  const state = liveState ?? {
    subscriptionStatus: initialStatus,
    subscriptionTier: initialTier,
  };

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleSubscriptionUpdated = (payload: SubscriptionState) => {
      if (!payload?.subscriptionStatus || !payload?.subscriptionTier) {
        return;
      }

      setLiveState(payload);
    };

    socket.on("subscription.updated", handleSubscriptionUpdated);
    return () => {
      socket.off("subscription.updated", handleSubscriptionUpdated);
    };
  }, [socket]);

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${toneClasses[state.subscriptionStatus]}`}>
      {state.subscriptionTier} {" • "} {state.subscriptionStatus.replace("_", " ")}
    </span>
  );
}
