import { auth } from "@/auth";
import { MultiChannelLaunchStudio } from "@/components/dashboard/multi-channel-launch-studio";
import { ModuleMetricsGrid, ModuleResultsSection } from "@/components/dashboard/module-insights";
import { db } from "@/lib/db";
import { multiChannelLaunchPacks } from "@/lib/db/schema";
import type { MultiChannelLaunchPackResult } from "@/lib/workflows";
import { count, desc, eq, sql } from "drizzle-orm";
import { Layers3, RadioTower, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MultiChannelLaunchPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [summaryRows, recentArtifacts] = await Promise.all([
    db.select({
      cacheHits: sql<number>`coalesce(sum(case when ${multiChannelLaunchPacks.cacheHit} then 1 else 0 end), 0)`,
      totalArtifacts: count(multiChannelLaunchPacks.id),
    }).from(multiChannelLaunchPacks).where(eq(multiChannelLaunchPacks.userId, userId)),
    db.query.multiChannelLaunchPacks.findMany({
      limit: 6,
      orderBy: [desc(multiChannelLaunchPacks.createdAt)],
      where: eq(multiChannelLaunchPacks.userId, userId),
    }),
  ]);

  const summary = summaryRows[0];
  const latestArtifact = recentArtifacts[0]
    ? ({
        channels: recentArtifacts[0].channels,
        productName: recentArtifacts[0].productName,
        productType: recentArtifacts[0].productType,
        summary: recentArtifacts[0].summary,
        targetAudience: recentArtifacts[0].targetAudience,
      } satisfies MultiChannelLaunchPackResult)
    : null;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">
          <RadioTower className="h-3 w-3" />
          Launch
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight text-white">Multi-channel launch packs</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-400">
            Generate platform-aware launch copy for Etsy, Shopify, Amazon, TikTok, Pinterest, and Instagram through one worker-backed workflow. The request path stays thin, Redis absorbs repeat lookups, and every artifact lands in PostgreSQL for durable reads behind multiple app nodes.
          </p>
        </div>
      </header>

      <ModuleMetricsGrid
        metrics={[
          { accent: "text-indigo-300", label: "Launch Packs", value: summary?.totalArtifacts ?? 0 },
          { accent: "text-emerald-300", label: "Cache Hits", value: Number(summary?.cacheHits ?? 0) },
          { accent: "text-sky-300", label: "Channels", value: 6 },
          { accent: "text-amber-300", label: "Delivery Mode", value: "Worker + Cache" },
        ]}
      />

      <MultiChannelLaunchStudio latestArtifact={latestArtifact} latestWorkflowId={recentArtifacts[0]?.workflowId} />

      <ModuleResultsSection
        ctaHref="/dashboard/launch/multi"
        ctaLabel="Open Multi-Channel Studio"
        description="Each multi-channel launch pack is persisted as its own artifact, which keeps reads fast and makes it straightforward to shard workers, add load balancers, or introduce more channels later."
        emptyMessage="No multi-channel launch packs yet. Generate one to seed the shared launch content layer."
        items={recentArtifacts.map((item) => ({
          href: `/dashboard/workflows/${item.workflowId}`,
          kicker: item.cacheHit ? "Served from cache" : "Fresh AI generation",
          summary: `${item.productType} for ${item.targetAudience}`,
          title: item.productName,
        }))}
        title="Recent multi-channel launch packs"
      />

      <section className="grid gap-5 lg:grid-cols-3">
        {[
          {
            description: "Workers can scale horizontally without moving business logic into the web tier.",
            icon: Sparkles,
            title: "Stateless APIs",
          },
          {
            description: "Redis cache reduces duplicate AI generations when users rerun identical launch briefs.",
            icon: Layers3,
            title: "Shared Cache Layer",
          },
          {
            description: "Dedicated artifact rows keep channel output queryable for analytics, exports, and future personalization.",
            icon: RadioTower,
            title: "Durable Storage",
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
