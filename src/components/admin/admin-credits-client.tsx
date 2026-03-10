"use client";

import { useState, useTransition } from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection, AdminShellCard } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";
import { getErrorMessage } from "@/lib/errors";

type CreditBalance = {
  creditsAvailable: number;
  creditsUsed: number;
  email: string;
  id: string;
  lastLoginAt: string | null;
  subscriptionStatus: string;
  subscriptionTier: string;
};

type BillingRecord = {
  amountCents: number;
  createdAt: string;
  creditsAmount: number;
  currency: string;
  description: string | null;
  email: string | null;
  id: string;
  provider: string | null;
  reference: string | null;
  status: string;
  type: string;
  userId: string;
};

type CreditsPayload = {
  balances: CreditBalance[];
  records: BillingRecord[];
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency: currency || "USD",
    style: "currency",
  }).format(cents / 100);
}

async function postJson(url: string, options: { body?: Record<string, unknown>; method: "POST" }) {
  const response = await fetch(url, {
    method: options.method,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error((await response.json().catch(() => ({ error: "Request failed" }))).error ?? "Request failed");
  }

  return response.json().catch(() => null);
}

export function AdminCreditsClient({
  canManage,
  initialData,
}: {
  canManage: boolean;
  initialData: CreditsPayload;
}) {
  const { data, error, refresh } = useAdminResource(initialData, {
    endpoint: "/api/admin/credits",
    eventNames: ["admin.user.updated", "admin.data.changed"],
    pollMs: 60_000,
  });
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAdjust = (userId: string) => {
    if (!canManage) {
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          const amount = Number(window.prompt("Credit adjustment amount (negative to deduct)", "25") ?? "0");
          if (!Number.isFinite(amount) || amount === 0) {
            return;
          }

          const notes = window.prompt("Adjustment notes", "Admin credit adjustment") ?? "Admin credit adjustment";
          await postJson("/api/admin/credits", {
            body: {
              action: "adjust",
              amount,
              notes,
              userId,
            },
            method: "POST",
          });
          await refresh();
        } catch (adjustError) {
          setActionError(getErrorMessage(adjustError, "Credit adjustment failed"));
        }
      })();
    });
  };

  const handleRefund = (userId: string) => {
    if (!canManage) {
      return;
    }

    const amountCents = Number(window.prompt("Refund amount in cents", "500") ?? "0");
    const creditsAmount = Number(window.prompt("Credits to remove", "50") ?? "0");
    if (!Number.isFinite(amountCents) || !Number.isFinite(creditsAmount) || amountCents <= 0 || creditsAmount <= 0) {
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          const notes = window.prompt("Refund notes", "Manual refund") ?? "Manual refund";
          await postJson("/api/admin/credits", {
            body: {
              action: "refund",
              amountCents,
              creditsAmount,
              notes,
              userId,
            },
            method: "POST",
          });
          await refresh();
        } catch (refundError) {
          setActionError(getErrorMessage(refundError, "Refund failed"));
        }
      })();
    });
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Credits and Subscriptions"
        subtitle="Track credit balances, purchases, and subscription revenue while making controlled adjustments for customers."
        title="Credits"
      />

      {error || actionError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          {error || actionError}
        </div>
      ) : null}

      <AdminSection title="Remaining Credits per User">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Tier</th>
                <th className="px-3 py-3">Credits</th>
                <th className="px-3 py-3">Last Login</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {data.balances.map((balance) => (
                <tr key={balance.id}>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-white">{balance.email}</p>
                    <p className="mt-1 text-xs text-slate-500">{balance.id}</p>
                  </td>
                  <td className="px-3 py-4 text-slate-300">
                    <p className="font-semibold text-white">{balance.subscriptionTier}</p>
                    <p className="mt-1 text-xs text-slate-500">{balance.subscriptionStatus}</p>
                  </td>
                  <td className="px-3 py-4 text-slate-300">
                    <p className="font-semibold text-white">{balance.creditsAvailable}</p>
                    <p className="mt-1 text-xs text-slate-500">Used {balance.creditsUsed}</p>
                  </td>
                  <td className="px-3 py-4 text-slate-400">
                    {balance.lastLoginAt ? new Date(balance.lastLoginAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdjust(balance.id)}
                        disabled={!canManage}
                        className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Adjust
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefund(balance.id)}
                        disabled={!canManage}
                        className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Refund
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.balances.length === 0 ? (
            <div className="pt-6">
              <AdminEmptyState text="No credit balances are available yet." />
            </div>
          ) : null}
        </div>
      </AdminSection>

      <AdminSection title="Purchases and Subscriptions">
        <div className="space-y-3">
          {data.records.length > 0 ? data.records.map((record) => (
            <AdminShellCard key={record.id} className="bg-[#0b1220]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{record.email ?? record.userId}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {record.type} • {record.status} • {new Date(record.createdAt).toLocaleString()}
                  </p>
                  {record.description ? <p className="mt-2 text-sm text-slate-400">{record.description}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-300">{formatCurrency(record.amountCents, record.currency)}</p>
                  <p className="text-xs text-slate-500">{record.creditsAmount} credits</p>
                </div>
              </div>
            </AdminShellCard>
          )) : <AdminEmptyState text="No billing records have been captured yet." />}
        </div>
      </AdminSection>

      {isPending ? <div className="text-sm text-slate-400">Applying credit change...</div> : null}
    </div>
  );
}
