import { pool } from "@/lib/db";
import { WorkerNodeService } from "./worker-node-service";
import { getAdminQueueCounts } from "./admin-queue-service";

type OverviewStat = {
  activeUsers: number;
  failedWorkflows: number;
  monthlyRevenueCents: number;
  openAlerts: number;
  paidUsers: number;
  queuedJobs: number;
};

type TrendPoint = {
  date: string;
  value: number;
};

type FeatureUsagePoint = {
  feature: string;
  requests: number;
  tokens: number;
};

type TopUser = {
  credits: number;
  email: string;
  lastLoginAt: string | null;
  revenueCents: number;
  role: string;
  subscriptionTier: string;
  userId: string;
  workflowCount: number;
};

type TrendRadarItem = {
  competitionScore: number;
  demandScore: number;
  keyword: string;
  opportunityScore: number;
  trendScore: number;
};

type Recommendation = {
  detail: string;
  priority: "high" | "medium" | "low";
  title: string;
};

export type AdminOverviewPayload = {
  autoScaling: {
    suggestedWorkerCount: number;
    summary: string;
  };
  featureUsage: FeatureUsagePoint[];
  recommendations: Recommendation[];
  revenueTrend: TrendPoint[];
  stats: OverviewStat;
  topUsers: TopUser[];
  trendRadar: TrendRadarItem[];
  usageTrend: TrendPoint[];
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function buildRecommendations(input: {
  monthlyRevenueCents: number;
  openAlerts: number;
  queueDepth: number;
  workerCount: number;
}) {
  const recommendations: Recommendation[] = [];

  if (input.queueDepth > Math.max(20, input.workerCount * 8)) {
    recommendations.push({
      detail: "Queue backlog is above the healthy threshold for the current worker pool. Add BullMQ workers before latency climbs further.",
      priority: "high",
      title: "Scale worker capacity",
    });
  }

  if (input.openAlerts > 0) {
    recommendations.push({
      detail: "There are unresolved operational alerts. Clear critical queue and worker alerts first to keep generation SLAs stable.",
      priority: "high",
      title: "Resolve open alerts",
    });
  }

  if (input.monthlyRevenueCents > 0 && input.monthlyRevenueCents < 100_000) {
    recommendations.push({
      detail: "Revenue is climbing, but not yet offsetting heavy AI demand. Tighten premium gating and beta access to protect margins.",
      priority: "medium",
      title: "Review premium feature gating",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      detail: "Queue pressure, alerts, and revenue are all within a healthy range. The current worker footprint looks stable for incremental growth.",
      priority: "low",
      title: "System is operating within healthy thresholds",
    });
  }

  return recommendations;
}

export class AdminDashboardService {
  static async getOverview(): Promise<AdminOverviewPayload> {
    await WorkerNodeService.markStaleNodesOffline();

    const queueCounts = await getAdminQueueCounts();

    const [
      statsResult,
      revenueTrendResult,
      usageTrendResult,
      featureUsageResult,
      topUsersResult,
      trendRadarResult,
      workerSummaryResult,
    ] = await Promise.all([
      pool.query(`
        select
          count(*) filter (where u.status = 'active')::int as "activeUsers",
          count(*) filter (
            where u.subscription_tier <> 'free'
              and u.subscription_status in ('active', 'trialing')
          )::int as "paidUsers",
          (
            select count(*)::int
            from workflows w
            where w.status = 'failed'
              and w.created_at >= now() - interval '30 days'
          ) as "failedWorkflows",
          (
            select coalesce(sum(br.amount_cents), 0)::int
            from billing_records br
            where br.created_at >= date_trunc('month', now())
              and br.type in ('subscription', 'credits')
              and br.status in ('active', 'trialing')
          ) as "monthlyRevenueCents",
          (
            select count(*)::int
            from admin_alerts aa
            where aa.status = 'open'
          ) as "openAlerts"
        from users u
        where u.status <> 'deleted'
      `),
      pool.query(`
        select
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
          coalesce(sum(case when type in ('subscription', 'credits') then amount_cents else 0 end), 0)::int as value
        from billing_records
        where created_at >= now() - interval '30 days'
        group by 1
        order by 1 asc
      `),
      pool.query(`
        select
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
          count(*)::int as value
        from ai_usage_events
        where created_at >= now() - interval '30 days'
        group by 1
        order by 1 asc
      `),
      pool.query(`
        select
          feature,
          count(*)::int as requests,
          coalesce(sum(total_tokens), 0)::int as tokens
        from ai_usage_events
        where created_at >= now() - interval '30 days'
        group by feature
        order by requests desc, tokens desc
        limit 8
      `),
      pool.query(`
        with workflow_totals as (
          select
            user_id,
            count(*)::int as "workflowCount"
          from workflows
          group by user_id
        ),
        billing_totals as (
          select
            user_id,
            coalesce(sum(case when type in ('subscription', 'credits') then amount_cents else 0 end), 0)::int as "revenueCents"
          from billing_records
          group by user_id
        )
        select
          u.id as "userId",
          u.email,
          u.role,
          u.subscription_tier as "subscriptionTier",
          u.last_login_at as "lastLoginAt",
          u.credits,
          coalesce(wt."workflowCount", 0)::int as "workflowCount",
          coalesce(bt."revenueCents", 0)::int as "revenueCents"
        from users u
        left join workflow_totals wt on wt.user_id = u.id
        left join billing_totals bt on bt.user_id = u.id
        where u.status <> 'deleted'
        order by "revenueCents" desc, "workflowCount" desc
        limit 8
      `),
      pool.query(`
        select
          keyword,
          demand_score as "demandScore",
          competition_score as "competitionScore",
          trend_score as "trendScore",
          opportunity_score as "opportunityScore"
        from opportunities
        where created_at >= now() - interval '30 days'
        order by opportunity_score desc, trend_score desc
        limit 8
      `),
      pool.query(`
        select
          count(*)::int as "workerCount",
          coalesce(sum(backlog_count), 0)::int as "queueBacklog"
        from worker_nodes
        where status <> 'offline'
          and role = 'worker'
      `),
    ]);

    const statsRow = (statsResult.rows[0] ?? {}) as Record<string, unknown>;
    const workerSummary = (workerSummaryResult.rows[0] ?? {}) as Record<string, unknown>;
    const queueDepth = queueCounts.waiting + queueCounts.active + queueCounts.delayed;
    const workerCount = Math.max(toNumber(workerSummary.workerCount), 1);
    const suggestedWorkerCount = Math.max(workerCount, Math.ceil(queueDepth / 8) || 1);

    return {
      autoScaling: {
        suggestedWorkerCount,
        summary: queueDepth > workerCount * 8
          ? `Queue depth is ${queueDepth}. Scaling from ${workerCount} to ${suggestedWorkerCount} workers would reduce backlog pressure.`
          : `Current queue depth is ${queueDepth}. The active worker pool of ${workerCount} nodes looks healthy.`,
      },
      featureUsage: featureUsageResult.rows.map((row) => ({
        feature: String(row.feature),
        requests: toNumber(row.requests),
        tokens: toNumber(row.tokens),
      })),
      recommendations: buildRecommendations({
        monthlyRevenueCents: toNumber(statsRow.monthlyRevenueCents),
        openAlerts: toNumber(statsRow.openAlerts),
        queueDepth,
        workerCount,
      }),
      revenueTrend: revenueTrendResult.rows.map((row) => ({
        date: String(row.date),
        value: toNumber(row.value),
      })),
      stats: {
        activeUsers: toNumber(statsRow.activeUsers),
        failedWorkflows: toNumber(statsRow.failedWorkflows),
        monthlyRevenueCents: toNumber(statsRow.monthlyRevenueCents),
        openAlerts: toNumber(statsRow.openAlerts),
        paidUsers: toNumber(statsRow.paidUsers),
        queuedJobs: queueDepth,
      },
      topUsers: topUsersResult.rows.map((row) => ({
        credits: toNumber(row.credits),
        email: String(row.email),
        lastLoginAt: row.lastLoginAt ? String(row.lastLoginAt) : null,
        revenueCents: toNumber(row.revenueCents),
        role: String(row.role),
        subscriptionTier: String(row.subscriptionTier),
        userId: String(row.userId),
        workflowCount: toNumber(row.workflowCount),
      })),
      trendRadar: trendRadarResult.rows.map((row) => ({
        competitionScore: toNumber(row.competitionScore),
        demandScore: toNumber(row.demandScore),
        keyword: String(row.keyword),
        opportunityScore: toNumber(row.opportunityScore),
        trendScore: toNumber(row.trendScore),
      })),
      usageTrend: usageTrendResult.rows.map((row) => ({
        date: String(row.date),
        value: toNumber(row.value),
      })),
    };
  }

  static async getFinanceSnapshot() {
    const [summaryResult, topPayingUsersResult, revenueTrendResult] = await Promise.all([
      pool.query(`
        select
          coalesce(sum(case when type = 'subscription' then amount_cents else 0 end), 0)::int as "subscriptionRevenueCents",
          coalesce(sum(case when type = 'credits' then amount_cents else 0 end), 0)::int as "creditRevenueCents",
          coalesce(sum(case when type = 'refund' then amount_cents else 0 end), 0)::int as "refundCents",
          count(*) filter (where type = 'subscription')::int as "subscriptionCount",
          count(*) filter (where type = 'credits')::int as "creditPurchaseCount"
        from billing_records
        where created_at >= now() - interval '90 days'
      `),
      pool.query(`
        select
          u.id as "userId",
          u.email,
          coalesce(sum(br.amount_cents), 0)::int as "revenueCents"
        from billing_records br
        inner join users u on u.id = br.user_id
        where br.type in ('subscription', 'credits')
          and br.created_at >= now() - interval '90 days'
        group by u.id
        order by "revenueCents" desc
        limit 10
      `),
      pool.query(`
        select
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
          coalesce(sum(case when type in ('subscription', 'credits') then amount_cents else 0 end), 0)::int as value
        from billing_records
        where created_at >= now() - interval '90 days'
        group by 1
        order by 1 asc
      `),
    ]);

    const summary = (summaryResult.rows[0] ?? {}) as Record<string, unknown>;

    return {
      creditPurchaseCount: toNumber(summary.creditPurchaseCount),
      creditRevenueCents: toNumber(summary.creditRevenueCents),
      refundsCents: Math.abs(toNumber(summary.refundCents)),
      revenueTrend: revenueTrendResult.rows.map((row) => ({
        date: String(row.date),
        value: toNumber(row.value),
      })),
      subscriptionCount: toNumber(summary.subscriptionCount),
      subscriptionRevenueCents: toNumber(summary.subscriptionRevenueCents),
      topPayingUsers: topPayingUsersResult.rows.map((row) => ({
        email: String(row.email),
        revenueCents: toNumber(row.revenueCents),
        userId: String(row.userId),
      })),
      totalRevenueCents: toNumber(summary.subscriptionRevenueCents) + toNumber(summary.creditRevenueCents),
    };
  }
}
