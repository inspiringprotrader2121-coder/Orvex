"use client";

import { AdminPageHeader, AdminSection, AdminShellCard, AdminStatCard, InlineTrendChart } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";

type FinanceData = {
  creditPurchaseCount: number;
  creditRevenueCents: number;
  refundsCents: number;
  revenueTrend: Array<{ date: string; value: number }>;
  subscriptionCount: number;
  subscriptionRevenueCents: number;
  topPayingUsers: Array<{
    email: string;
    revenueCents: number;
    userId: string;
  }>;
  totalRevenueCents: number;
};

function currency(cents: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(cents / 100);
}

export function AdminFinanceClient({
  initialData,
}: {
  initialData: FinanceData;
}) {
  const { data, error } = useAdminResource(initialData, {
    endpoint: "/api/admin/finance",
    eventNames: ["admin.user.updated", "admin.data.changed"],
    pollMs: 60_000,
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Revenue and Billing"
        subtitle="Track subscriptions, credit pack sales, refunds, and the users generating the most commercial value."
        title="Revenue"
      />

      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard accent="text-emerald-300" label="Total Revenue" note="Last 90 days" value={currency(data.totalRevenueCents)} />
        <AdminStatCard accent="text-cyan-300" label="Subscriptions" note={`${data.subscriptionCount} transactions`} value={currency(data.subscriptionRevenueCents)} />
        <AdminStatCard accent="text-sky-300" label="Credit Sales" note={`${data.creditPurchaseCount} purchases`} value={currency(data.creditRevenueCents)} />
        <AdminStatCard accent="text-rose-300" label="Refunds" note="Tracked as negative value" value={currency(data.refundsCents)} />
        <AdminStatCard accent="text-amber-300" label="ARPU Signals" note="Top payers listed below" value={data.topPayingUsers.length} />
      </div>

      <AdminSection title="Revenue Trend (90 days)">
        <InlineTrendChart color="#22d3ee" points={data.revenueTrend ?? []} />
      </AdminSection>

      <AdminSection
        action={(
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/export?dataset=revenue&format=csv" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">CSV</a>
            <a href="/api/admin/export?dataset=revenue&format=json" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">JSON</a>
            <a href="/api/admin/export?dataset=revenue&format=pdf" className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">PDF</a>
          </div>
        )}
        title="Top Paying Users"
      >
        <div className="space-y-3">
          {data.topPayingUsers.map((user) => (
            <AdminShellCard key={user.userId} className="bg-[#0b1220]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{user.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{user.userId}</p>
                </div>
                <p className="text-lg font-black text-emerald-300">{currency(user.revenueCents)}</p>
              </div>
            </AdminShellCard>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
