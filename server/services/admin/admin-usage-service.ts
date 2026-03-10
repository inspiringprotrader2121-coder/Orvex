import { pool } from "@/lib/db";

type TrendPoint = {
  date: string;
  requests: number;
  tokens: number;
};

type FeatureUsage = {
  costUsdMicros: number;
  label: string;
  requests: number;
  tokens: number;
};

type TopUser = {
  costUsdMicros: number;
  email: string;
  requests: number;
  tokens: number;
  userId: string;
};

type TopWorkflow = {
  costUsdMicros: number;
  email: string;
  requests: number;
  tokens: number;
  workflowId: string;
  workflowType: string | null;
};

const FEATURE_GROUPS: Array<{
  label: string;
  features: string[];
}> = [
  { label: "Launch Packs", features: ["launch_pack_generation", "etsy_listing_launch_pack"] },
  { label: "Social Blitz", features: ["multi_channel_launch_pack"] },
  { label: "Mockups", features: ["mockup_generation"] },
  { label: "SEO", features: ["seo_keyword_analysis"] },
];

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function aggregateFeatures(rows: Array<Record<string, unknown>>) {
  const byFeature = new Map<string, { requests: number; tokens: number; costUsdMicros: number }>();
  for (const row of rows) {
    byFeature.set(String(row.feature), {
      costUsdMicros: toNumber(row.costUsdMicros),
      requests: toNumber(row.requests),
      tokens: toNumber(row.tokens),
    });
  }

  const grouped: FeatureUsage[] = FEATURE_GROUPS.map((group) => {
    const totals = group.features.reduce((acc, feature) => {
      const match = byFeature.get(feature);
      if (match) {
        acc.costUsdMicros += match.costUsdMicros;
        acc.requests += match.requests;
        acc.tokens += match.tokens;
      }
      return acc;
    }, { costUsdMicros: 0, requests: 0, tokens: 0 });

    return {
      costUsdMicros: totals.costUsdMicros,
      label: group.label,
      requests: totals.requests,
      tokens: totals.tokens,
    };
  });

  const groupedFeatures = new Set(FEATURE_GROUPS.flatMap((group) => group.features));
  const other = Array.from(byFeature.entries())
    .filter(([feature]) => !groupedFeatures.has(feature))
    .reduce((acc, [, metrics]) => {
      acc.costUsdMicros += metrics.costUsdMicros;
      acc.requests += metrics.requests;
      acc.tokens += metrics.tokens;
      return acc;
    }, { costUsdMicros: 0, requests: 0, tokens: 0 });

  if (other.requests || other.tokens) {
    grouped.push({ costUsdMicros: other.costUsdMicros, label: "Other", requests: other.requests, tokens: other.tokens });
  }

  return grouped;
}

export class AdminUsageService {
  static async getUsageSnapshot() {
    const [
      featureRows,
      dailyRows,
      weeklyRows,
      monthlyRows,
      topUsersRows,
      topWorkflowRows,
    ] = await Promise.all([
      pool.query(`
        select
          feature,
          count(*)::int as requests,
          coalesce(sum(total_tokens), 0)::int as tokens,
          coalesce(sum(cost_usd_micros), 0)::int as "costUsdMicros"
        from ai_usage_events
        where created_at >= now() - interval '30 days'
        group by feature
        order by requests desc
      `),
      pool.query(`
        select
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
          count(*)::int as requests,
          coalesce(sum(total_tokens), 0)::int as tokens
        from ai_usage_events
        where created_at >= now() - interval '30 days'
        group by 1
        order by 1 asc
      `),
      pool.query(`
        select
          to_char(date_trunc('week', created_at), 'IYYY-"W"IW') as date,
          count(*)::int as requests,
          coalesce(sum(total_tokens), 0)::int as tokens
        from ai_usage_events
        where created_at >= now() - interval '12 weeks'
        group by 1
        order by 1 asc
      `),
      pool.query(`
        select
          to_char(date_trunc('month', created_at), 'YYYY-MM') as date,
          count(*)::int as requests,
          coalesce(sum(total_tokens), 0)::int as tokens
        from ai_usage_events
        where created_at >= now() - interval '12 months'
        group by 1
        order by 1 asc
      `),
      pool.query(`
        select
          u.id as "userId",
          u.email,
          count(*)::int as requests,
          coalesce(sum(a.total_tokens), 0)::int as tokens,
          coalesce(sum(a.cost_usd_micros), 0)::int as "costUsdMicros"
        from ai_usage_events a
        inner join users u on u.id = a.user_id
        where a.created_at >= now() - interval '30 days'
        group by u.id
        order by "costUsdMicros" desc, tokens desc
        limit 10
      `),
      pool.query(`
        select
          a.workflow_id as "workflowId",
          w.type as "workflowType",
          u.email,
          count(*)::int as requests,
          coalesce(sum(a.total_tokens), 0)::int as tokens,
          coalesce(sum(a.cost_usd_micros), 0)::int as "costUsdMicros"
        from ai_usage_events a
        left join workflows w on w.id = a.workflow_id
        inner join users u on u.id = a.user_id
        where a.created_at >= now() - interval '30 days'
          and a.workflow_id is not null
        group by a.workflow_id, w.type, u.email
        order by "costUsdMicros" desc, tokens desc
        limit 10
      `),
    ]);

    const daily = dailyRows.rows.map((row) => ({
      date: String(row.date),
      requests: toNumber(row.requests),
      tokens: toNumber(row.tokens),
    }));

    const totals = daily.reduce((acc, point) => {
      acc.requests += point.requests;
      acc.tokens += point.tokens;
      return acc;
    }, { requests: 0, tokens: 0 });

    const totalCostUsdMicros = featureRows.rows.reduce((sum, row) => sum + toNumber(row.costUsdMicros), 0);

    return {
      featureUsage: aggregateFeatures(featureRows.rows),
      totals: {
        ...totals,
        costUsdMicros: totalCostUsdMicros,
      },
      topUsers: topUsersRows.rows.map((row) => ({
        costUsdMicros: toNumber(row.costUsdMicros),
        email: String(row.email),
        requests: toNumber(row.requests),
        tokens: toNumber(row.tokens),
        userId: String(row.userId),
      } satisfies TopUser)),
      topWorkflows: topWorkflowRows.rows.map((row) => ({
        costUsdMicros: toNumber(row.costUsdMicros),
        email: String(row.email),
        requests: toNumber(row.requests),
        tokens: toNumber(row.tokens),
        workflowId: String(row.workflowId),
        workflowType: row.workflowType ? String(row.workflowType) : null,
      } satisfies TopWorkflow)),
      trends: {
        daily,
        weekly: weeklyRows.rows.map((row) => ({
          date: String(row.date),
          requests: toNumber(row.requests),
          tokens: toNumber(row.tokens),
        }) satisfies TrendPoint),
        monthly: monthlyRows.rows.map((row) => ({
          date: String(row.date),
          requests: toNumber(row.requests),
          tokens: toNumber(row.tokens),
        }) satisfies TrendPoint),
      },
    };
  }
}
