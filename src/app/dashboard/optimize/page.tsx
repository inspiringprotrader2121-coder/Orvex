import { auth } from "@/auth";
import { ModuleMetricsGrid, ModuleResultsSection, ModuleSplitSection } from "@/components/dashboard/module-insights";
import { WorkflowModuleShell } from "@/components/dashboard/workflow-module-shell";
import { CompetitorAnalysisPanel } from "@/components/optimize/competitor-analysis-panel";
import { db } from "@/lib/db";
import { competitorAnalyses, listingAnalyses } from "@/lib/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { BarChart3, ScanSearch, Swords } from "lucide-react";
import { redirect } from "next/navigation";

export default async function OptimizePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [listingSummaryRows, competitorSummaryRows, recentListingAudits, recentCompetitors] = await Promise.all([
    db.select({
      avgListingScore: sql<number>`coalesce(round(avg(${listingAnalyses.listingScore})), 0)`,
      avgSeoScore: sql<number>`coalesce(round(avg(${listingAnalyses.seoScore})), 0)`,
      totalAudits: count(listingAnalyses.id),
    }).from(listingAnalyses).where(eq(listingAnalyses.userId, userId)),
    db.select({
      avgKeywordGaps: sql<number>`coalesce(round(avg(jsonb_array_length(${competitorAnalyses.keywordOpportunities}))), 0)`,
      totalCompetitors: count(competitorAnalyses.id),
    }).from(competitorAnalyses).where(eq(competitorAnalyses.userId, userId)),
    db.query.listingAnalyses.findMany({
      limit: 4,
      orderBy: [desc(listingAnalyses.createdAt)],
      where: eq(listingAnalyses.userId, userId),
    }),
    db.query.competitorAnalyses.findMany({
      limit: 8,
      orderBy: [desc(competitorAnalyses.createdAt)],
      where: eq(competitorAnalyses.userId, userId),
    }),
  ]);

  const listingSummary = listingSummaryRows[0];
  const competitorSummary = competitorSummaryRows[0];

  return (
    <div className="space-y-10">
      <WorkflowModuleShell
        ctaLabel="Analyze Listing"
        description="Optimize existing listings with ORVEX intelligence. Paste an Etsy URL and the worker pipeline scrapes the page, scores SEO and conversion quality, and returns structured recommendations your team can ship."
        eyebrow="Optimize"
        highlights={[
          {
            description: "Inspect listing quality through scorecards, keyword gaps, and optimized replacements.",
            icon: BarChart3,
            title: "Listing Intelligence",
          },
          {
            description: "Run competitor analysis with the same workflow spine to compare positioning and missed angles.",
            icon: Swords,
            title: "Competitive Insight",
          },
          {
            description: "Keep heavy scraping and model calls inside workers so the dashboard stays responsive.",
            icon: ScanSearch,
            title: "Worker-First Analysis",
          },
        ]}
        mode="listing"
        title="Optimize what is already live"
      />

      <ModuleMetricsGrid
        metrics={[
          { accent: "text-indigo-300", label: "Listing Audits", value: listingSummary?.totalAudits ?? 0 },
          { accent: "text-emerald-300", label: "Avg Listing Score", value: Number(listingSummary?.avgListingScore ?? 0) },
          { accent: "text-sky-300", label: "Competitor Reports", value: competitorSummary?.totalCompetitors ?? 0 },
          { accent: "text-amber-300", label: "Avg Keyword Gaps", value: Number(competitorSummary?.avgKeywordGaps ?? 0) },
        ]}
      />

      <CompetitorAnalysisPanel
        initialAnalyses={recentCompetitors.map((item) => ({
          analysisKey: item.analysisKey,
          analysisVersion: item.analysisVersion,
          comparisonSet: item.comparisonSet,
          createdAt: item.createdAt.toISOString(),
          differentiationStrategy: item.differentiationStrategy,
          id: item.id,
          inputLabel: item.inputLabel,
          keywordOpportunities: item.keywordOpportunities,
          keywords: item.keywords,
          pricing: item.pricing,
          ranking: item.ranking,
          reviews: item.reviews,
          sourceType: item.sourceType,
          sourceUrl: item.sourceUrl,
          strengths: item.strengths,
          summary: item.summary,
          targetListing: item.targetListing,
          weaknesses: item.weaknesses,
          workflowId: item.workflowId,
        }))}
      />

      <ModuleSplitSection
        left={(
          <ModuleResultsSection
            ctaHref="/dashboard/workflows/new?mode=listing"
            ctaLabel="Run Listing Audit"
            description="Recent listing audits are persisted with score dimensions so ORVEX can compare performance across your portfolio."
            emptyMessage="No listing audits yet. Paste an Etsy URL to generate your first scorecard."
            items={recentListingAudits.map((item) => ({
              href: `/dashboard/workflows/${item.workflowId}`,
              kicker: `Score ${item.listingScore} • SEO ${item.seoScore}`,
              summary: item.sourceUrl,
              title: item.listingTitle,
            }))}
            title="Recent listing audits"
          />
        )}
        right={(
          <ModuleResultsSection
            ctaHref="/dashboard/workflows/new?mode=competitor"
            ctaLabel="Run Competitor Analysis"
            description="Competitor reports help ORVEX separate listing quality issues from category-level positioning problems."
            emptyMessage="No competitor reports yet. Run one to expose missed angles and keyword opportunities."
            items={recentCompetitors.slice(0, 4).map((item) => ({
              href: `/dashboard/workflows/${item.workflowId}`,
              kicker: `v${item.analysisVersion} • ${Array.isArray(item.keywordOpportunities) ? item.keywordOpportunities.length : 0} keyword gaps`,
              summary: item.sourceUrl || item.inputLabel,
              title: item.inputLabel,
            }))}
            title="Recent competitor reports"
          />
        )}
      />
    </div>
  );
}
