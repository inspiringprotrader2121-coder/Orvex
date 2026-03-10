"use client";

import { AdminEmptyState, AdminPageHeader, AdminSection, AdminShellCard, AdminStatCard, InlineTrendChart, SimpleBarList } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";

type UsagePayload = {
  featureUsage: Array<{
    costUsdMicros: number;
    label: string;
    requests: number;
    tokens: number;
  }>;
  totals: {
    costUsdMicros: number;
    requests: number;
    tokens: number;
  };
  topUsers: Array<{
    costUsdMicros: number;
    email: string;
    requests: number;
    tokens: number;
    userId: string;
  }>;
  topWorkflows: Array<{
    costUsdMicros: number;
    email: string;
    requests: number;
    tokens: number;
    workflowId: string;
    workflowType: string | null;
  }>;
  trends: {
    daily: Array<{ date: string; requests: number; tokens: number }>;
    weekly: Array<{ date: string; requests: number; tokens: number }>;
    monthly: Array<{ date: string; requests: number; tokens: number }>;
  };
};

function formatTokens(tokens: number) {
  return new Intl.NumberFormat("en-US").format(tokens);
}

function formatUsd(micros: number) {
  const value = micros / 1_000_000;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export function AdminUsageClient({
  initialData,
}: {
  initialData: UsagePayload;
}) {
  const { data, error } = useAdminResource(initialData, {
    endpoint: "/api/admin/usage",
    eventNames: ["admin.data.changed"],
    pollMs: 60_000,
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="AI Usage Intelligence"
        subtitle="Track feature demand, usage momentum, and the users consuming the most AI capacity."
        title="AI Usage"
      />

      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard accent="text-cyan-300" label="Requests (30d)" note="Total AI calls" value={data.totals.requests} />
        <AdminStatCard accent="text-emerald-300" label="Tokens (30d)" note="Total AI tokens" value={formatTokens(data.totals.tokens)} />
        <AdminStatCard accent="text-sky-300" label="Spend (30d)" note="Estimated OpenAI cost" value={formatUsd(data.totals.costUsdMicros)} />
        <AdminStatCard accent="text-amber-300" label="Top Feature" note="Most requested" value={data.featureUsage[0]?.label ?? "N/A"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminSection title="Feature Usage (30 days)">
          {data.featureUsage.length > 0 ? (
            <SimpleBarList
              items={data.featureUsage.map((feature) => ({
                label: `${feature.label} (${feature.requests} req, ${formatTokens(feature.tokens)} tokens, ${formatUsd(feature.costUsdMicros)})`,
                value: feature.requests,
              }))}
            />
          ) : (
            <AdminEmptyState text="No AI usage has been recorded yet." />
          )}
        </AdminSection>

        <AdminSection title="Top Users by Usage">
          <div className="space-y-3">
            {data.topUsers.length > 0 ? data.topUsers.map((user) => (
              <AdminShellCard key={user.userId} className="bg-[#0b1220]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{user.email}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{user.userId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-300">{user.requests} req</p>
                    <p className="text-xs text-slate-500">{formatTokens(user.tokens)} tokens • {formatUsd(user.costUsdMicros)}</p>
                  </div>
                </div>
              </AdminShellCard>
            )) : <AdminEmptyState text="No high-usage users yet." />}
          </div>
        </AdminSection>
      </div>

      <AdminSection title="Top Workflows by Cost (30 days)">
        <div className="space-y-3">
          {data.topWorkflows.length > 0 ? data.topWorkflows.map((workflow) => (
            <AdminShellCard key={workflow.workflowId} className="bg-[#0b1220]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{workflow.workflowType ?? "workflow"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{workflow.workflowId}</p>
                  <p className="mt-2 text-sm text-slate-400">{workflow.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-amber-300">{formatUsd(workflow.costUsdMicros)}</p>
                  <p className="text-xs text-slate-500">{workflow.requests} req • {formatTokens(workflow.tokens)} tokens</p>
                </div>
              </div>
            </AdminShellCard>
          )) : <AdminEmptyState text="No workflow usage has been recorded yet." />}
        </div>
      </AdminSection>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminSection title="Daily Usage">
          <InlineTrendChart color="#22d3ee" points={data.trends.daily.map((point) => ({
            date: point.date,
            value: point.requests,
          }))} />
        </AdminSection>
        <AdminSection title="Weekly Usage">
          <InlineTrendChart color="#34d399" points={data.trends.weekly.map((point) => ({
            date: point.date,
            value: point.requests,
          }))} />
        </AdminSection>
        <AdminSection title="Monthly Usage">
          <InlineTrendChart color="#f59e0b" points={data.trends.monthly.map((point) => ({
            date: point.date,
            value: point.requests,
          }))} />
        </AdminSection>
      </div>
    </div>
  );
}
