"use client";

import { AdminEmptyState, AdminPageHeader, AdminSection, AdminShellCard, AdminStatCard, InlineTrendChart, SimpleBarList, StatusPill } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";

type OverviewData = {
  autoScaling: {
    suggestedWorkerCount: number;
    summary: string;
  };
  featureUsage: Array<{
    feature: string;
    requests: number;
    tokens: number;
  }>;
  recommendations: Array<{
    detail: string;
    priority: "high" | "low" | "medium";
    title: string;
  }>;
  revenueTrend: Array<{ date: string; value: number }>;
  stats: {
    activeUsers: number;
    failedWorkflows: number;
    monthlyRevenueCents: number;
    openAlerts: number;
    paidUsers: number;
    queuedJobs: number;
  };
  topUsers: Array<{
    credits: number;
    email: string;
    lastLoginAt: string | null;
    revenueCents: number;
    role: string;
    subscriptionTier: string;
    userId: string;
    workflowCount: number;
  }>;
  trendRadar: Array<{
    competitionScore: number;
    demandScore: number;
    keyword: string;
    opportunityScore: number;
    trendScore: number;
  }>;
  usageTrend: Array<{ date: string; value: number }>;
};

function toCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

export function AdminOverviewClient({
  initialData,
}: {
  initialData: OverviewData;
}) {
  const { data, error, loading } = useAdminResource(initialData, {
    endpoint: "/api/admin/overview",
    eventNames: ["admin.queue.updated", "admin.alert.created", "admin.worker.updated", "admin.user.updated", "admin.data.changed"],
    pollMs: 45_000,
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Super Admin Overview"
        subtitle="Live operational visibility for ORVEX across users, queues, billing pressure, AI usage, and marketplace signals."
        title="Control plane"
      />

      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard accent="text-cyan-300" label="Active Users" note="Non-deleted accounts" value={data.stats.activeUsers} />
        <AdminStatCard accent="text-emerald-300" label="Paid Users" note="Starter and above" value={data.stats.paidUsers} />
        <AdminStatCard accent="text-amber-300" label="Queue Depth" note="Waiting + active + delayed jobs" value={data.stats.queuedJobs} />
        <AdminStatCard accent="text-rose-300" label="Open Alerts" note={loading ? "Refreshing…" : "Live operational alerts"} value={data.stats.openAlerts} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminSection title="Revenue Trend">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-3xl font-black text-white">{toCurrency(data.stats.monthlyRevenueCents)}</p>
              <p className="text-sm text-slate-400">Revenue booked this month</p>
            </div>
            <StatusPill tone="info">Monthly revenue</StatusPill>
          </div>
          <InlineTrendChart color="#22d3ee" points={data.revenueTrend} />
        </AdminSection>

        <AdminSection title="Auto-Scaling Suggestions">
          <div className="space-y-4">
            <AdminShellCard className="border-cyan-400/10 bg-cyan-500/5">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">Suggested Worker Count</p>
              <p className="mt-4 text-5xl font-black text-white">{data.autoScaling.suggestedWorkerCount}</p>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">{data.autoScaling.summary}</p>
            </AdminShellCard>
            <div className="rounded-3xl border border-white/6 bg-[#0b1220] p-5 text-sm leading-relaxed text-slate-400">
              Load-balancer friendly by design: admin APIs stay stateless, queue pressure lives in Redis, and process heartbeat/state is persisted in PostgreSQL.
            </div>
          </div>
        </AdminSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSection title="AI Usage Trend">
          <InlineTrendChart color="#34d399" points={data.usageTrend} />
        </AdminSection>

        <AdminSection title="Feature Usage">
          {data.featureUsage.length > 0 ? (
            <SimpleBarList
              items={data.featureUsage.map((item) => ({
                label: item.feature.replace(/_/g, " "),
                value: item.requests,
              }))}
            />
          ) : (
            <AdminEmptyState text="AI usage metrics will appear here once tracked workflow calls begin landing." />
          )}
        </AdminSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminSection title="Top Users">
          <div className="space-y-3">
            {data.topUsers.map((user) => (
              <div key={user.userId} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{user.email}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {user.subscriptionTier} • {user.role.replace("_", " ")} • {user.workflowCount} workflows
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-300">{toCurrency(user.revenueCents)}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{user.credits} credits</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Marketplace Trend Radar">
          {data.trendRadar.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.trendRadar.map((item) => (
                <div key={item.keyword} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.keyword}</p>
                      <p className="mt-2 text-sm text-slate-400">Demand {item.demandScore} • Trend {item.trendScore}</p>
                    </div>
                    <StatusPill tone={item.opportunityScore >= 70 ? "success" : "warning"}>{item.opportunityScore}</StatusPill>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">Competition {item.competitionScore}</p>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState text="Opportunity data will appear here as users run Discover workflows." />
          )}
        </AdminSection>
      </div>

      <AdminSection title="Admin Recommendations">
        <div className="grid gap-4 xl:grid-cols-3">
          {data.recommendations.map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/6 bg-[#0b1220] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-bold text-white">{item.title}</p>
                <StatusPill tone={item.priority === "high" ? "critical" : item.priority === "medium" ? "warning" : "success"}>
                  {item.priority}
                </StatusPill>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
