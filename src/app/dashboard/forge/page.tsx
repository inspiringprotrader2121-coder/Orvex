import { auth } from "@/auth";
import { ModuleMetricsGrid, ModuleResultsSection } from "@/components/dashboard/module-insights";
import { WorkflowModuleShell } from "@/components/dashboard/workflow-module-shell";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { PenTool, SearchCheck, Tags } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ForgePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [summaryRow, recentItems] = await Promise.all([
    db.select({
      avgFaqCount: sql<number>`coalesce(round(avg(jsonb_array_length(${listings.faq}))), 0)`,
      avgTags: sql<number>`coalesce(round(avg(jsonb_array_length(${listings.tags}))), 0)`,
      avgTitleLength: sql<number>`coalesce(round(avg(char_length(${listings.title}))), 0)`,
      totalListings: count(listings.id),
    }).from(listings).where(eq(listings.userId, userId)),
    db.query.listings.findMany({
      limit: 6,
      orderBy: [desc(listings.createdAt)],
      where: eq(listings.userId, userId),
    }),
  ]);

  const summary = summaryRow[0];

  return (
    <div className="space-y-10">
      <WorkflowModuleShell
        ctaLabel="Generate Listing Copy"
        description="Forge a complete Etsy listing from product fundamentals. ORVEX generates the SEO title, description, tags, and FAQ in a single worker-backed workflow so the output is fast to review and ready to publish."
        eyebrow="Forge"
        highlights={[
          {
            description: "Turn a product idea into a polished listing without hand-writing every section.",
            icon: PenTool,
            title: "Conversion Copy",
          },
          {
            description: "Keep titles under Etsy-friendly limits while preserving strong keyword intent.",
            icon: SearchCheck,
            title: "SEO Discipline",
          },
          {
            description: "Generate tags and FAQ copy that stay consistent with the audience and tone you choose.",
            icon: Tags,
            title: "Channel Fit",
          },
        ]}
        mode="forge"
        title="Forge high-converting listing copy"
      />

      <ModuleMetricsGrid
        metrics={[
          { accent: "text-indigo-300", label: "Listings", value: summary?.totalListings ?? 0 },
          { accent: "text-emerald-300", label: "Avg Tags", value: Number(summary?.avgTags ?? 0) },
          { accent: "text-sky-300", label: "Avg FAQs", value: Number(summary?.avgFaqCount ?? 0) },
          { accent: "text-amber-300", label: "Avg Title Length", value: Number(summary?.avgTitleLength ?? 0) },
        ]}
      />

      <ModuleResultsSection
        ctaHref="/dashboard/workflows/new?mode=forge"
        ctaLabel="Run Forge Workflow"
        description="Every generated listing is persisted in its own table, which lets ORVEX surface copy history and tune KPIs without relying on raw workflow blobs."
        emptyMessage="No generated listings yet. Feed ORVEX a product name, audience, product type, and tone to forge the first one."
        items={recentItems.map((item) => ({
          href: `/dashboard/workflows/${item.workflowId}`,
          kicker: `${Array.isArray(item.tags) ? item.tags.length : 0} Etsy tags`,
          summary: `${item.productType} for ${item.targetAudience}`,
          title: item.productName,
        }))}
        title="Recent generated listings"
      />
    </div>
  );
}
