import { auth } from "@/auth";
import { MockupGenerationStudio } from "@/components/launch/mockup-generation-studio";
import { ModuleMetricsGrid, ModuleResultsSection } from "@/components/dashboard/module-insights";
import { db } from "@/lib/db";
import { mockupGenerations } from "@/lib/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { ImageIcon, Layers3, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MockupLaunchPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [summaryRows, recentArtifacts] = await Promise.all([
    db.select({
      totalArtifacts: count(mockupGenerations.id),
      totalImages: sql<number>`coalesce(sum(jsonb_array_length(${mockupGenerations.images})), 0)`,
    }).from(mockupGenerations).where(eq(mockupGenerations.userId, userId)),
    db.query.mockupGenerations.findMany({
      limit: 6,
      orderBy: [desc(mockupGenerations.createdAt)],
      where: eq(mockupGenerations.userId, userId),
    }),
  ]);

  const summary = summaryRows[0];
  const latestArtifact = recentArtifacts[0]
    ? {
        color: recentArtifacts[0].color,
        description: recentArtifacts[0].description,
        heroPrompt: recentArtifacts[0].heroPrompt,
        images: recentArtifacts[0].images,
        productName: recentArtifacts[0].productName,
        style: recentArtifacts[0].style,
        summary: recentArtifacts[0].summary,
      }
    : null;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">
          <ImageIcon className="h-3 w-3" />
          Launch
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight text-white">AI mockup generator</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-400">
            Generate ecommerce mockups for Etsy, Shopify, and Instagram in a dedicated image queue. The image pipeline stays isolated from text workflows, and generated assets are persisted through a storage abstraction that can be swapped from local disk to object storage later.
          </p>
        </div>
      </header>

      <ModuleMetricsGrid
        metrics={[
          { accent: "text-indigo-300", label: "Mockup Runs", value: summary?.totalArtifacts ?? 0 },
          { accent: "text-emerald-300", label: "Images Stored", value: Number(summary?.totalImages ?? 0) },
          { accent: "text-sky-300", label: "Platforms", value: 3 },
          { accent: "text-amber-300", label: "Queue Mode", value: "Dedicated" },
        ]}
      />

      <MockupGenerationStudio latestArtifact={latestArtifact} latestWorkflowId={recentArtifacts[0]?.workflowId} />

      <ModuleResultsSection
        ctaHref="/dashboard/launch/mockups"
        ctaLabel="Open Mockup Studio"
        description="Mockup artifacts are stored separately from the job payload so the gallery stays quick to read even as image generations scale."
        emptyMessage="No mockups generated yet. Run one to seed the asset gallery."
        items={recentArtifacts.map((item) => ({
          href: `/dashboard/workflows/${item.workflowId}`,
          kicker: `${Array.isArray(item.images) ? item.images.length : 0} variants`,
          summary: `${item.color} • ${item.style}`,
          title: item.productName,
        }))}
        title="Recent mockup generations"
      />

      <section className="grid gap-5 lg:grid-cols-3">
        {[
          {
            description: "Separate BullMQ lanes keep image-heavy jobs from crowding out fast text workflows.",
            icon: Layers3,
            title: "Dedicated Queue",
          },
          {
            description: "Assets are persisted behind a storage service so we can move from local disk to object storage without rewriting the feature.",
            icon: Sparkles,
            title: "Upgradeable Storage",
          },
          {
            description: "Each artifact stores channel-specific ratios for listing, storefront, and social placement.",
            icon: ImageIcon,
            title: "Channel-Aware Output",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="rounded-[1.75rem] border border-white/5 bg-[#141417] p-6">
              <div className="inline-flex rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-black text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
