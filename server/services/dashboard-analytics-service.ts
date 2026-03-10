import { and, desc, eq, gte } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { communityTemplates, listingAnalyses, workflows } from "@/lib/db/schema";
import {
  type DashboardChannel,
  type DashboardDateRange,
  type DashboardFilters,
  type DashboardOverviewData,
  type DashboardScoreTrendPoint,
  type DashboardStore,
  type DashboardTrendPoint,
} from "@/lib/dashboard";
import { getProductName, getWorkflowLabel } from "@/lib/workflows";
import type { DashboardFilterInput } from "@server/schemas/dashboard";

const STORE_OPTIONS: Array<{ label: string; value: DashboardStore }> = [
  { label: "All Stores", value: "all" },
  { label: "Etsy", value: "etsy" },
  { label: "Shopify", value: "shopify" },
  { label: "Amazon", value: "amazon" },
  { label: "Gumroad", value: "gumroad" },
  { label: "Internal", value: "internal" },
];

const CHANNEL_OPTIONS: Array<{ label: string; value: DashboardChannel }> = [
  { label: "All Channels", value: "all" },
  { label: "Discover", value: "discover" },
  { label: "Forge", value: "forge" },
  { label: "Optimize", value: "optimize" },
  { label: "Launch", value: "launch" },
];

const DATE_RANGE_OPTIONS: Array<{ label: string; value: DashboardDateRange }> = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "All Time", value: "all" },
];

function getSince(dateRange: DashboardDateRange) {
  switch (dateRange) {
    case "7d":
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function getTrendWindowDays(dateRange: DashboardDateRange) {
  switch (dateRange) {
    case "7d":
      return 7;
    case "30d":
      return 10;
    case "90d":
    case "all":
      return 14;
  }
}

function getWorkflowChannel(type: string): Exclude<DashboardChannel, "all"> {
  switch (type) {
    case "opportunity_analysis":
      return "discover";
    case "listing_forge":
      return "forge";
    case "listing_intelligence":
    case "competitor_analysis":
    case "seo_keyword_analysis":
      return "optimize";
    default:
      return "launch";
  }
}

function getWorkflowScore(type: string, resultData: unknown) {
  if (!resultData || typeof resultData !== "object") {
    return null;
  }

  const record = resultData as Record<string, unknown>;

  switch (type) {
    case "listing_intelligence":
      return typeof record.listingScore === "number" ? record.listingScore : null;
    case "opportunity_analysis":
      return typeof record.opportunityScore === "number" ? record.opportunityScore : null;
    case "competitor_analysis":
      if (record.ranking && typeof record.ranking === "object") {
        const ranking = record.ranking as Record<string, unknown>;
        return typeof ranking.visibilityScore === "number" ? ranking.visibilityScore : null;
      }
      return null;
    case "seo_keyword_analysis":
      if (Array.isArray(record.keywords)) {
        const items = record.keywords
          .map((item) => (item && typeof item === "object" ? item as Record<string, unknown> : null))
          .filter((item): item is Record<string, unknown> => Boolean(item));
        if (!items.length) {
          return null;
        }
        const average = items.reduce((total, item) => total + (typeof item.trendScore === "number" ? item.trendScore : 0), 0) / items.length;
        return Math.round(average);
      }
      return null;
    default:
      return null;
  }
}

function summarizeWorkflow(type: string, resultData: unknown) {
  if (!resultData || typeof resultData !== "object") {
    return getWorkflowLabel(type);
  }

  const record = resultData as Record<string, unknown>;

  switch (type) {
    case "listing_forge":
      return typeof record.title === "string" ? record.title : "Listing copy generated";
    case "listing_intelligence":
      return typeof record.optimizedTitle === "string" ? record.optimizedTitle : "Optimization scorecard generated";
    case "competitor_analysis":
      return typeof record.summary === "string" ? record.summary : "Competitor report generated";
    case "opportunity_analysis":
      return Array.isArray(record.productIdeas)
        ? `${record.productIdeas.length} product ideas generated`
        : "Opportunity report generated";
    case "launch_pack_generation":
    case "etsy_listing_launch_pack":
      return Array.isArray(record.seoTitles)
        ? `${record.seoTitles.length} titles and launch assets ready`
        : "Launch pack generated";
    case "multi_channel_launch_pack":
      return record.channels && typeof record.channels === "object"
        ? `${Object.keys(record.channels as Record<string, unknown>).length} channels prepared`
        : "Multi-channel launch pack generated";
    case "mockup_generation":
      return Array.isArray(record.images)
        ? `${record.images.length} mockup variants restored`
        : "Mockup set generated";
    default:
      return getWorkflowLabel(type);
  }
}

function getProductLabel(workflow: typeof workflows.$inferSelect) {
  const fromResult = getProductName(workflow.resultData);
  if (fromResult !== "Unnamed Workflow") {
    return fromResult;
  }

  return getProductName(workflow.inputData);
}

function isRollbackWorkflow(workflow: typeof workflows.$inferSelect) {
  if (!workflow.inputData || typeof workflow.inputData !== "object") {
    return false;
  }

  const record = workflow.inputData as Record<string, unknown>;
  return Boolean(record.rollback && typeof record.rollback === "object");
}

function createWorkflowTrend(workflowItems: Array<typeof workflows.$inferSelect>, dateRange: DashboardDateRange): DashboardTrendPoint[] {
  const windowDays = getTrendWindowDays(dateRange);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (windowDays - 1));

  const buckets = Array.from({ length: windowDays }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const key = current.toISOString().slice(0, 10);

    return {
      completed: 0,
      date: key,
      label: current.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      pending: 0,
    };
  });

  const bucketMap = new Map(buckets.map((item) => [item.date, item]));

  for (const workflow of workflowItems) {
    const key = workflow.createdAt.toISOString().slice(0, 10);
    const bucket = bucketMap.get(key);
    if (!bucket) {
      continue;
    }

    if (workflow.status === "completed") {
      bucket.completed += 1;
    } else if (workflow.status === "pending" || workflow.status === "queued" || workflow.status === "processing") {
      bucket.pending += 1;
    }
  }

  return buckets;
}

function createScoreTrend(items: Array<{ createdAt: Date; score: number }>, dateRange: DashboardDateRange): DashboardScoreTrendPoint[] {
  const windowDays = getTrendWindowDays(dateRange);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (windowDays - 1));

  const buckets = Array.from({ length: windowDays }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const key = current.toISOString().slice(0, 10);

    return {
      date: key,
      label: current.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      score: 0,
      total: 0,
    };
  });

  const bucketMap = new Map(buckets.map((item) => [item.date, item]));

  for (const item of items) {
    const key = item.createdAt.toISOString().slice(0, 10);
    const bucket = bucketMap.get(key);
    if (!bucket) {
      continue;
    }

    bucket.score += item.score;
    bucket.total += 1;
  }

  return buckets.map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    score: bucket.total > 0 ? Math.round(bucket.score / bucket.total) : 0,
  }));
}

function buildMarketplaceSuggestions(niches: DashboardOverviewData["marketplaceTrends"]["niches"]) {
  if (niches.length === 0) {
    return [{
      detail: "No trend signals yet. Generate more opportunity reports and listing optimizations to unlock stronger trend detection.",
      priority: "low" as const,
      title: "Generate more trend signals",
    }];
  }

  const sorted = [...niches].sort((a, b) => b.opportunityScore - a.opportunityScore);
  const top = sorted.slice(0, 3);

  return top.map((niche, index) => {
    const priority: "high" | "medium" | "low" = index === 0 ? "high" : index === 1 ? "medium" : "low";
    return {
      detail: `Demand ${niche.demandScore}, trend ${niche.trendScore}, competition ${niche.competitionScore}. Opportunity score ${niche.opportunityScore}.`,
      priority,
      title: `Explore ${niche.keyword}`,
    };
  });
}

export class DashboardAnalyticsService {
  static async getOverview(userId: string, rawFilters: DashboardFilterInput): Promise<DashboardOverviewData> {
    const filters: DashboardFilters = {
      channel: rawFilters.channel,
      dateRange: rawFilters.dateRange,
      product: rawFilters.product,
      store: rawFilters.store,
    };
    const since = getSince(filters.dateRange);

    const workflowWhere = [
      eq(workflows.userId, userId),
      ...(since ? [gte(workflows.createdAt, since)] : []),
      ...(filters.store !== "all" ? [eq(workflows.sourceProvider, filters.store)] : []),
    ];

    const listingWhere = [
      eq(listingAnalyses.userId, userId),
      ...(since ? [gte(listingAnalyses.createdAt, since)] : []),
      ...(filters.store !== "all" ? [eq(listingAnalyses.provider, filters.store)] : []),
    ];

    const templateWhere = [
      eq(communityTemplates.userId, userId),
      ...(since ? [gte(communityTemplates.createdAt, since)] : []),
    ];

    const [workflowItems, optimizationItems, templateItems, trendNichesResult, successSignalsResult] = await Promise.all([
      db.query.workflows.findMany({
        where: and(...workflowWhere),
        orderBy: [desc(workflows.createdAt)],
        limit: 250,
      }),
      db.query.listingAnalyses.findMany({
        where: and(...listingWhere),
        orderBy: [desc(listingAnalyses.createdAt)],
        limit: 120,
      }),
      db.query.communityTemplates.findMany({
        where: and(...templateWhere),
        orderBy: [desc(communityTemplates.createdAt)],
        limit: 80,
      }),
      pool.query(`
        select
          keyword,
          avg(demand_score)::int as "demandScore",
          avg(competition_score)::int as "competitionScore",
          avg(trend_score)::int as "trendScore",
          avg(opportunity_score)::int as "opportunityScore"
        from opportunities
        where created_at >= now() - interval '30 days'
        group by keyword
        order by "opportunityScore" desc, "trendScore" desc
        limit 8
      `),
      pool.query(`
        select
          listing_title as "listingTitle",
          listing_score as "listingScore",
          seo_score as "seoScore",
          conversion_score as "conversionScore",
          keyword_coverage as "keywordCoverage",
          source_url as "sourceUrl"
        from listing_analyses
        where created_at >= now() - interval '30 days'
        order by listing_score desc, seo_score desc
        limit 8
      `),
    ]);

    const filteredWorkflows = workflowItems.filter((workflow) => {
      const channel = getWorkflowChannel(workflow.type);
      if (filters.channel !== "all" && channel !== filters.channel) {
        return false;
      }

      const productName = getProductLabel(workflow).toLowerCase();
      if (filters.product && !productName.includes(filters.product.toLowerCase())) {
        return false;
      }

      return true;
    });

    const filteredOptimizations = optimizationItems.filter((item) => {
      if (!filters.product) {
        return true;
      }

      return item.listingTitle.toLowerCase().includes(filters.product.toLowerCase());
    });

    const pendingCount = filteredWorkflows.filter((workflow) =>
      workflow.status === "pending" || workflow.status === "queued" || workflow.status === "processing",
    ).length;
    const completedCount = filteredWorkflows.filter((workflow) => workflow.status === "completed").length;
    const failedCount = filteredWorkflows.filter((workflow) => workflow.status === "failed").length;

    const historyGroups = new Map<string, DashboardOverviewData["productHistory"][number]>();
    for (const workflow of filteredWorkflows) {
      const productName = getProductLabel(workflow);
      const output = {
        canRollback: workflow.status === "completed",
        channel: getWorkflowChannel(workflow.type),
        createdAt: workflow.createdAt.toISOString(),
        id: workflow.id,
        isRollback: isRollbackWorkflow(workflow),
        score: getWorkflowScore(workflow.type, workflow.resultData),
        status: workflow.status,
        store: workflow.sourceProvider as DashboardStore,
        summary: summarizeWorkflow(workflow.type, workflow.resultData),
        typeLabel: getWorkflowLabel(workflow.type),
        workflowType: workflow.type,
      };

      const existing = historyGroups.get(productName);
      if (existing) {
        existing.outputs.push(output);
        existing.totalOutputs += 1;
        if (new Date(output.createdAt).getTime() > new Date(existing.lastUpdated).getTime()) {
          existing.lastUpdated = output.createdAt;
        }
      } else {
        historyGroups.set(productName, {
          lastUpdated: output.createdAt,
          outputs: [output],
          productName,
          totalOutputs: 1,
        });
      }
    }

    const productHistory = Array.from(historyGroups.values())
      .map((item) => ({
        ...item,
        outputs: item.outputs
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .slice(0, 8),
      }))
      .sort((left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime())
      .slice(0, 10);

    const recentActive = filteredWorkflows
      .filter((workflow) => workflow.status === "pending" || workflow.status === "queued" || workflow.status === "processing")
      .slice(0, 10)
      .map((workflow) => ({
        createdAt: workflow.createdAt.toISOString(),
        creditsSpent: workflow.creditsSpent,
        id: workflow.id,
        productName: getProductLabel(workflow),
        progress: workflow.progress,
        status: workflow.status,
        store: workflow.sourceProvider as DashboardStore,
        typeLabel: getWorkflowLabel(workflow.type),
        workflowType: workflow.type,
      }));

    const averageListingScore = filteredOptimizations.length
      ? Math.round(filteredOptimizations.reduce((total, item) => total + item.listingScore, 0) / filteredOptimizations.length)
      : 0;
    const averageSeoScore = filteredOptimizations.length
      ? Math.round(filteredOptimizations.reduce((total, item) => total + item.seoScore, 0) / filteredOptimizations.length)
      : 0;
    const averageConversionScore = filteredOptimizations.length
      ? Math.round(filteredOptimizations.reduce((total, item) => total + item.conversionScore, 0) / filteredOptimizations.length)
      : 0;

    const latestScores = filteredOptimizations.slice(0, 6).map((item) => ({
      createdAt: item.createdAt.toISOString(),
      listingScore: item.listingScore,
      productName: item.listingTitle,
      seoScore: item.seoScore,
      workflowId: item.workflowId,
    }));

    const totalDownloads = templateItems.reduce((total, item) => total + item.downloadsCount, 0);
    const totalUsage = templateItems.reduce((total, item) => total + item.usageCount, 0);
    const approvedTemplates = templateItems.filter((item) => item.status === "approved").length;
    const trendNiches = (trendNichesResult.rows ?? []).map((row) => ({
      competitionScore: Number(row.competitionScore ?? 0),
      demandScore: Number(row.demandScore ?? 0),
      keyword: String(row.keyword ?? ""),
      opportunityScore: Number(row.opportunityScore ?? 0),
      trendScore: Number(row.trendScore ?? 0),
    })).filter((row) => row.keyword);
    const successSignals = (successSignalsResult.rows ?? []).map((row) => ({
      conversionScore: Number(row.conversionScore ?? 0),
      keywordCoverage: Number(row.keywordCoverage ?? 0),
      listingScore: Number(row.listingScore ?? 0),
      listingTitle: String(row.listingTitle ?? ""),
      seoScore: Number(row.seoScore ?? 0),
      sourceUrl: String(row.sourceUrl ?? ""),
    })).filter((row) => row.listingTitle);
    const marketplaceSuggestions = buildMarketplaceSuggestions(trendNiches);

    return {
      community: {
        approvedTemplates,
        recentItems: templateItems.slice(0, 6).map((item) => ({
          category: item.category,
          createdAt: item.createdAt.toISOString(),
          downloadsCount: item.downloadsCount,
          id: item.id,
          name: item.name,
          popularityScore: item.popularityScore,
          status: item.status,
          usageCount: item.usageCount,
        })),
        totalDownloads,
        totalTemplates: templateItems.length,
        totalUsage,
      },
      filterOptions: {
        channels: CHANNEL_OPTIONS,
        dateRanges: DATE_RANGE_OPTIONS,
        stores: STORE_OPTIONS,
      },
      filters,
      jobs: {
        completed: completedCount,
        failed: failedCount,
        pending: pendingCount,
        recentActive,
      },
      marketplaceTrends: {
        niches: trendNiches,
        successSignals,
        suggestions: marketplaceSuggestions,
      },
      optimization: {
        averageConversionScore,
        averageListingScore,
        averageSeoScore,
        latestScores,
      },
      productHistory,
      trends: {
        optimization: createScoreTrend(
          filteredOptimizations.map((item) => ({
            createdAt: item.createdAt,
            score: item.listingScore,
          })),
          filters.dateRange,
        ),
        templates: createScoreTrend(
          templateItems.map((item) => ({
            createdAt: item.createdAt,
            score: item.popularityScore,
          })),
          filters.dateRange,
        ),
        workflows: createWorkflowTrend(filteredWorkflows, filters.dateRange),
      },
    };
  }
}
