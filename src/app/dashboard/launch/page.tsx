import { auth } from "@/auth";
import { ModuleMetricsGrid, ModuleResultsSection, ModuleSplitSection } from "@/components/dashboard/module-insights";
import { WorkflowModuleShell } from "@/components/dashboard/workflow-module-shell";
import { db } from "@/lib/db";
import { launchPacks, mockupGenerations, multiChannelLaunchPacks } from "@/lib/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { CalendarRange, Flame, Send } from "lucide-react";
import { redirect } from "next/navigation";

export default async function LaunchPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [summaryRow, multiChannelSummaryRow, mockupSummaryRow, recentItems, recentMultiChannelItems, recentMockups] = await Promise.all([
    db.select({
      avgCalendarDays: sql<number>`coalesce(round(avg(jsonb_array_length(${launchPacks.launchCalendar}))), 0)`,
      avgEmails: sql<number>`coalesce(round(avg(jsonb_array_length(${launchPacks.emailLaunchSequence}))), 0)`,
      avgHooks: sql<number>`coalesce(round(avg(jsonb_array_length(${launchPacks.tikTokHooks}))), 0)`,
      totalLaunchPacks: count(launchPacks.id),
    }).from(launchPacks).where(eq(launchPacks.userId, userId)),
    db.select({
      totalMultiChannelLaunchPacks: count(multiChannelLaunchPacks.id),
    }).from(multiChannelLaunchPacks).where(eq(multiChannelLaunchPacks.userId, userId)),
    db.select({
      totalMockups: count(mockupGenerations.id),
    }).from(mockupGenerations).where(eq(mockupGenerations.userId, userId)),
    db.query.launchPacks.findMany({
      limit: 6,
      orderBy: [desc(launchPacks.createdAt)],
      where: eq(launchPacks.userId, userId),
    }),
    db.query.multiChannelLaunchPacks.findMany({
      limit: 6,
      orderBy: [desc(multiChannelLaunchPacks.createdAt)],
      where: eq(multiChannelLaunchPacks.userId, userId),
    }),
    db.query.mockupGenerations.findMany({
      limit: 6,
      orderBy: [desc(mockupGenerations.createdAt)],
      where: eq(mockupGenerations.userId, userId),
    }),
  ]);

  const summary = summaryRow[0];
  const multiChannelSummary = multiChannelSummaryRow[0];
  const mockupSummary = mockupSummaryRow[0];

  return (
    <div className="space-y-10">
      <WorkflowModuleShell
        ctaLabel="Generate Launch Pack"
        description="Launch with full-funnel marketing assets generated in one ORVEX workflow. The launch pack combines SEO titles, email copy, hooks, captions, and a day-by-day plan so teams can move from idea to campaign without switching tools."
        eyebrow="Launch"
        highlights={[
          {
            description: "Bundle short-form hooks, Pinterest captions, and email sequence copy in one output.",
            icon: Send,
            title: "Multi-Channel Assets",
          },
          {
            description: "Use a structured 14-day calendar to turn generated copy into an actual rollout.",
            icon: CalendarRange,
            title: "Execution Plan",
          },
          {
            description: "Keep the launch workflow modular so new channels can be added without rewriting the queue system.",
            icon: Flame,
            title: "Extensible Growth Engine",
          },
        ]}
        mode="launch"
        title="Launch products with campaign-ready assets"
      />

      <ModuleMetricsGrid
        metrics={[
          { accent: "text-indigo-300", label: "Launch Packs", value: summary?.totalLaunchPacks ?? 0 },
          { accent: "text-emerald-300", label: "Avg TikTok Hooks", value: Number(summary?.avgHooks ?? 0) },
          { accent: "text-sky-300", label: "Avg Emails", value: Number(summary?.avgEmails ?? 0) },
          { accent: "text-amber-300", label: "Avg Calendar Days", value: Number(summary?.avgCalendarDays ?? 0) },
          { accent: "text-fuchsia-300", label: "Multi-Channel Packs", value: multiChannelSummary?.totalMultiChannelLaunchPacks ?? 0 },
          { accent: "text-rose-300", label: "Mockup Runs", value: mockupSummary?.totalMockups ?? 0 },
        ]}
      />

      <ModuleSplitSection
        left={(
          <ModuleResultsSection
            ctaHref="/dashboard/workflows/new?mode=launch"
            ctaLabel="Run Launch Workflow"
            description="ORVEX stores launch packs as durable artifacts so your team can revisit campaign angles without digging through raw workflow payloads."
            emptyMessage="No launch packs yet. Start with a product idea and ORVEX will return the first campaign stack."
            items={recentItems.map((item) => ({
              href: `/dashboard/workflows/${item.workflowId}`,
              kicker: `${Array.isArray(item.tikTokHooks) ? item.tikTokHooks.length : 0} hooks | ${Array.isArray(item.emailLaunchSequence) ? item.emailLaunchSequence.length : 0} emails`,
              summary: item.nicheKeyword || "No niche keyword recorded",
              title: item.ideaName,
            }))}
            title="Recent launch packs"
          />
        )}
        right={(
          <ModuleResultsSection
            ctaHref="/dashboard/launch/multi"
            ctaLabel="Open Multi-Channel Studio"
            description="Generate synchronized launch copy for marketplace, storefront, and social channels with the same worker-backed architecture."
            emptyMessage="No multi-channel launch packs yet. Open the studio to generate one across Etsy, Shopify, Amazon, TikTok, Pinterest, and Instagram."
            items={recentMultiChannelItems.map((item) => ({
              href: `/dashboard/workflows/${item.workflowId}`,
              kicker: "Artifact stored",
              summary: `${item.productType} for ${item.targetAudience}`,
              title: item.productName,
            }))}
            title="Recent multi-channel packs"
          />
        )}
      />

      <ModuleResultsSection
        ctaHref="/dashboard/launch/mockups"
        ctaLabel="Open Mockup Studio"
        description="Generate channel-ready mockups through the dedicated image queue and store the resulting assets as durable launch artifacts."
        emptyMessage="No mockups yet. Open the studio to generate Etsy, Shopify, and Instagram variants."
        items={recentMockups.map((item) => ({
          href: `/dashboard/workflows/${item.workflowId}`,
          kicker: `${Array.isArray(item.images) ? item.images.length : 0} variants`,
          summary: `${item.color} | ${item.style}`,
          title: item.productName,
        }))}
        title="Recent mockup generations"
      />
    </div>
  );
}
