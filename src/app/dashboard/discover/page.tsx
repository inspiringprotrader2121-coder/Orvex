import { auth } from "@/auth";
import { WorkflowModuleShell } from "@/components/dashboard/workflow-module-shell";
import { ModuleMetricsGrid, ModuleResultsSection } from "@/components/dashboard/module-insights";
import { db } from "@/lib/db";
import { opportunities } from "@/lib/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { Compass, Lightbulb, Radar } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DiscoverPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [summaryRow, recentItems] = await Promise.all([
    db.select({
      avgDemand: sql<number>`coalesce(round(avg(${opportunities.demandScore})), 0)`,
      avgIdeas: sql<number>`coalesce(round(avg(jsonb_array_length(${opportunities.productIdeas}))), 0)`,
      avgOpportunity: sql<number>`coalesce(round(avg(${opportunities.opportunityScore})), 0)`,
      totalReports: count(opportunities.id),
    }).from(opportunities).where(eq(opportunities.userId, userId)),
    db.query.opportunities.findMany({
      limit: 6,
      orderBy: [desc(opportunities.createdAt)],
      where: eq(opportunities.userId, userId),
    }),
  ]);

  const summary = summaryRow[0];

  return (
    <div className="space-y-10">
      <WorkflowModuleShell
        ctaLabel="Generate Opportunity Report"
        description="Discover profitable digital product angles from a niche keyword. ORVEX estimates demand, pressure, and trend momentum, then turns that signal into structured product ideas your team can act on."
        eyebrow="Discover"
        highlights={[
          {
            description: "Model niche demand before you spend time building the wrong product.",
            icon: Compass,
            title: "Opportunity Mapping",
          },
          {
            description: "Surface product ideas with opportunity scores so your backlog stays commercially sharp.",
            icon: Lightbulb,
            title: "Idea Prioritization",
          },
          {
            description: "Use BullMQ workers to keep opportunity analysis off the request path and ready to scale.",
            icon: Radar,
            title: "Scalable Research",
          },
        ]}
        mode="opportunity"
        title="Discover what to sell next"
      />

      <ModuleMetricsGrid
        metrics={[
          { accent: "text-indigo-300", label: "Reports", value: summary?.totalReports ?? 0 },
          { accent: "text-emerald-300", label: "Avg Demand", value: Number(summary?.avgDemand ?? 0) },
          { accent: "text-sky-300", label: "Avg Opportunity", value: Number(summary?.avgOpportunity ?? 0) },
          { accent: "text-amber-300", label: "Avg Ideas", value: Number(summary?.avgIdeas ?? 0) },
        ]}
      />

      <ModuleResultsSection
        ctaHref="/dashboard/workflows/new?mode=opportunity"
        ctaLabel="Run Discover Workflow"
        description="Recent opportunity reports are saved separately from workflow logs, which keeps this module fast even as the ORVEX workflow catalog grows."
        emptyMessage="No opportunity reports yet. Start with a niche keyword and ORVEX will build your first idea stack."
        items={recentItems.map((item) => ({
          href: `/dashboard/workflows/${item.workflowId}`,
          kicker: `Opportunity ${item.opportunityScore}`,
          summary: `${Array.isArray(item.productIdeas) ? item.productIdeas.length : 0} product ideas generated`,
          title: item.keyword,
        }))}
        title="Recent opportunity reports"
      />
    </div>
  );
}
