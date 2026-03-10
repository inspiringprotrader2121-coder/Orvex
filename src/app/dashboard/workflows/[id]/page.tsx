"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  Flame,
  Lightbulb,
  Loader2,
  Mail,
  Radar,
  Search,
  Sparkles,
  Swords,
  Tag,
  Zap,
  ImageIcon,
} from "lucide-react";
import { MultiChannelLaunchTabs } from "@/components/dashboard/multi-channel-launch-tabs";
import { MockupGallery } from "@/components/launch/mockup-gallery";
import { CompetitorComparisonChart } from "@/components/optimize/competitor-comparison-chart";
import { useSocket } from "@/components/providers/socket-provider";
import { getErrorMessage } from "@/lib/errors";
import {
  getProductName,
  getWorkflowLabel,
  isCompetitorAnalysisResult,
  isLaunchPack,
  isListingGeneratorResult,
  isListingIntelligenceResult,
  isMockupGenerationResult,
  isMultiChannelLaunchPack,
  isOpportunityAnalysisResult,
  isSeoKeywordResult,
  isWorkflowFailureResult,
  type WorkflowStatus,
} from "@/lib/workflows";

type WorkflowApiResponse = {
  artifact?: unknown;
  createdAt: string;
  errorMessage?: string | null;
  id: string;
  inputData: unknown;
  progress: number;
  resultData: unknown;
  status: WorkflowStatus;
  type: string;
};

type ScorecardArtifact = {
  id?: string;
  listingScore: number;
  seoScore: number;
  conversionScore: number;
  keywordCoverage: number;
  emotionalHookScore?: number;
  ctaStrength?: number;
  strengths: string[];
  weaknesses: string[];
  keywordGaps: string[];
  optimizedTitle: string;
  optimizedDescription: string;
  suggestedTags: string[];
};

type NormalizedCompetitorAnalysis = {
  comparisonSet: Array<{
    averageRating: number | null;
    estimatedRank: number;
    keywordOverlap: number;
    priceAmount: number | null;
    priceText?: string;
    reviewCount: number;
    shopName?: string;
    title: string;
    url: string;
  }>;
  differentiationStrategy: string;
  inputLabel: string;
  keywordOpportunities: string[];
  keywords: Array<{
    competitionScore: number;
    keyword: string;
    opportunityScore: number;
    rankingScore: number;
    trendScore: number;
  }>;
  pricing: {
    marketAverage: number;
    marketHigh: number;
    marketLow: number;
    pricePositioning: string;
    pricePressureScore: number;
    recommendation: string;
    targetPrice: number | null;
  };
  ranking: {
    estimatedRank: number;
    rankingMomentumScore: number;
    recommendation: string;
    visibilityScore: number;
  };
  reviews: {
    marketAverageReviewCount: number;
    recommendation: string;
    targetReviewCount: number;
    trustSignalScore: number;
  };
  strengths: string[];
  summary: string;
  targetListing: {
    averageRating: number | null;
    estimatedRank: number;
    keywordOverlap: number;
    priceAmount: number | null;
    priceText?: string;
    reviewCount: number;
    shopName?: string;
    title: string;
    url: string;
  } | null;
  weaknesses: string[];
};

export default function WorkflowResultsPage() {
  const params = useParams<{ id: string }>();
  const { socket } = useSocket();
  const id = params.id;

  const [workflow, setWorkflow] = useState<WorkflowApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seoApplyStatus, setSeoApplyStatus] = useState("");

  const fetchWorkflow = useEffectEvent(async () => {
    try {
      const response = await fetch(`/api/workflows/${id}`);
      if (!response.ok) {
        throw new Error("Failed to load workflow");
      }

      const data = await response.json() as WorkflowApiResponse;
      setWorkflow(data);
      setError("");
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Failed to load workflow"));
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void fetchWorkflow();
  }, [id]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleUpdate = (data: { workflowId: string }) => {
      if (data.workflowId === id) {
        void fetchWorkflow();
      }
    };

    socket.on("workflow.updated", handleUpdate);
    return () => {
      socket.off("workflow.updated", handleUpdate);
    };
  }, [id, socket]);

  const displayData = useMemo(() => {
    if (!workflow) {
      return null;
    }

    return workflow.artifact ?? workflow.resultData;
  }, [workflow]);

  const listing = isListingIntelligenceResult(displayData) ? displayData as ScorecardArtifact : null;
  const competitor = isCompetitorAnalysisResult(displayData)
    ? normalizeCompetitorAnalysis(displayData as Record<string, unknown>)
    : null;
  const opportunity = isOpportunityAnalysisResult(displayData) ? displayData : null;
  const generatedListing = isListingGeneratorResult(displayData) ? displayData : null;
  const launchPack = isLaunchPack(displayData) ? getLaunchPackData(displayData) : null;
  const multiChannelLaunchPack = isMultiChannelLaunchPack(displayData) ? displayData : null;
  const mockupGeneration = isMockupGenerationResult(displayData) ? displayData : null;
  const seoSuggestion = isSeoKeywordResult(displayData) ? displayData : null;
  const isProcessing = workflow ? ["pending", "processing", "queued"].includes(workflow.status) : false;
  const workflowTitle = workflow ? getWorkflowTitle(workflow.inputData, workflow.artifact) : "Workflow";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
        <div className="rounded-full border border-indigo-500/20 bg-indigo-500/10 p-6">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-300" />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-black text-white">Loading workflow output</h2>
          <p className="text-sm text-gray-400">Reading the latest worker state from ORVEX.</p>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-10 text-center">
        <h2 className="mb-3 text-2xl font-black text-white">Workflow unavailable</h2>
        <p className="mx-auto max-w-xl text-sm text-gray-300">{error || "We could not find this workflow."}</p>
        <Link href="/dashboard/workflows" className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black">
          Back to workflows
        </Link>
      </div>
    );
  }

  const failureMessage = isWorkflowFailureResult(workflow.resultData)
    ? workflow.resultData.error
    : workflow.errorMessage || "This workflow failed before ORVEX could persist a result.";

  async function handleSeoApply() {
    if (!seoSuggestion) {
      return;
    }

    const listingId = window.prompt("Enter the listing ID to apply this suggestion to:");
    if (!listingId) {
      setSeoApplyStatus("No listing selected.");
      return;
    }

    try {
      setSeoApplyStatus("Applying…");
      const response = await fetch("/api/seo-keywords/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          suggestionId: seoSuggestion.suggestionId ?? workflow?.id,
          notes: "Applied from SEO panel",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to apply SEO suggestion");
      }

      setSeoApplyStatus("Applied successfully.");
    } catch (applyError) {
      setSeoApplyStatus("Auto-apply failed.");
      console.error("SEO auto-apply error:", applyError);
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <Link href="/dashboard/workflows" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-500 transition-colors hover:text-white">
            <ArrowLeft className="h-3 w-3" />
            Workflow History
          </Link>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-indigo-300">{getWorkflowLabel(workflow.type)}</p>
            <h1 className="text-4xl font-black tracking-tight text-white">{workflowTitle}</h1>
            <p className="text-sm text-gray-400">Created {new Date(workflow.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={workflow.status} />
          {listing && typeof (workflow.artifact as { id?: string } | undefined)?.id === "string" ? (
            <a
              href={`/api/listing-scorecards/${(workflow.artifact as { id: string }).id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#141417] px-5 py-3 text-sm font-bold text-white transition hover:border-white/20"
            >
              <Download className="h-4 w-4" />
              Export Scorecard
            </a>
          ) : null}
        </div>
      </header>

      {isProcessing ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">
              <Sparkles className="h-3 w-3" />
              Worker Active
            </div>
            <h2 className="text-3xl font-black text-white">ORVEX is processing this workflow</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
              The request has been handed off to BullMQ. The worker is handling scraping, AI generation, persistence,
              and will push status updates back here over the socket bridge.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                <span>Progress</span>
                <span>{workflow.progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#0A0A0B]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all"
                  style={{ width: `${Math.max(workflow.progress, 8)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-8">
            <h3 className="text-lg font-bold text-white">Worker pipeline</h3>
            <div className="mt-6 space-y-4">
              <PipelineItem title="Queued" description="Job persisted in Redis and waiting for worker capacity." />
              <PipelineItem title="Processing" description="Worker is executing scraping, AI calls, and persistence." />
              <PipelineItem title="Completed" description="Results are saved in PostgreSQL and pushed back to the dashboard." />
            </div>
          </div>
        </div>
      ) : null}

      {!isProcessing && workflow.status === "failed" ? (
        <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-8">
          <h2 className="text-2xl font-black text-white">Workflow failed</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-300">{failureMessage}</p>
          <Link href="/dashboard/workflows/new" className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black">
            Start another workflow
          </Link>
        </div>
      ) : null}

      {!isProcessing && workflow.status !== "failed" && listing ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Listing Score" value={listing.listingScore} accent="text-indigo-300" />
            <MetricCard label="SEO" value={listing.seoScore} accent="text-sky-300" />
            <MetricCard label="Conversion" value={listing.conversionScore} accent="text-emerald-300" />
            <MetricCard label="Coverage" value={listing.keywordCoverage} accent="text-amber-300" />
            <MetricCard label="Hook" value={listing.emotionalHookScore ?? 0} accent="text-orange-300" />
            <MetricCard label="CTA" value={listing.ctaStrength ?? 0} accent="text-fuchsia-300" />
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-8">
              <ResultSection title="Optimized Title" icon={<Search className="h-4 w-4" />}>
                <CopyBlock text={listing.optimizedTitle} />
              </ResultSection>
              <ResultSection title="Optimized Description" icon={<Sparkles className="h-4 w-4" />}>
                <CopyBlock text={listing.optimizedDescription} multiline />
              </ResultSection>
              <ResultSection title="Keyword Gaps" icon={<Tag className="h-4 w-4" />}>
                <TagList items={listing.keywordGaps} />
              </ResultSection>
              <ResultSection title="Suggested Tags" icon={<Zap className="h-4 w-4" />}>
                <TagList items={listing.suggestedTags} />
              </ResultSection>
            </div>

            <div className="space-y-8">
              <ResultSection title="Strengths" icon={<Sparkles className="h-4 w-4" />}>
                <BulletList items={listing.strengths} />
              </ResultSection>
              <ResultSection title="Weaknesses" icon={<Radar className="h-4 w-4" />}>
                <BulletList items={listing.weaknesses} />
              </ResultSection>
            </div>
          </div>
        </div>
      ) : null}

      {!isProcessing && workflow.status !== "failed" && generatedListing ? (
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <ResultSection title="SEO Title" icon={<Sparkles className="h-4 w-4" />}>
              <CopyBlock text={generatedListing.title} />
            </ResultSection>
            <ResultSection title="Description" icon={<Search className="h-4 w-4" />}>
              <CopyBlock text={generatedListing.description} multiline />
            </ResultSection>
          </div>
          <div className="space-y-8">
            <ResultSection title="Tags" icon={<Tag className="h-4 w-4" />}>
              <TagList items={generatedListing.tags} />
            </ResultSection>
            <ResultSection title="FAQ" icon={<Radar className="h-4 w-4" />}>
              <BulletList items={generatedListing.faq} />
            </ResultSection>
          </div>
        </div>
      ) : null}

      {!isProcessing && workflow.status !== "failed" && competitor ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Price Pressure" value={competitor.pricing.pricePressureScore} accent="text-cyan-300" />
            <MetricCard label="Trust Signal" value={competitor.reviews.trustSignalScore} accent="text-emerald-300" />
            <MetricCard label="Visibility" value={competitor.ranking.visibilityScore} accent="text-amber-300" />
            <MetricCard label="Momentum" value={competitor.ranking.rankingMomentumScore} accent="text-indigo-300" />
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <ResultSection title="Market Summary" icon={<Swords className="h-4 w-4" />}>
                <CopyBlock text={competitor.summary} multiline />
              </ResultSection>

              <div className="grid gap-4 md:grid-cols-3">
                <InsightPanel
                  title={`Pricing • ${competitor.pricing.pricePositioning}`}
                  body={competitor.pricing.recommendation}
                />
                <InsightPanel
                  title={`Reviews • ${competitor.reviews.targetReviewCount}/${competitor.reviews.marketAverageReviewCount}`}
                  body={competitor.reviews.recommendation}
                />
                <InsightPanel
                  title={`Rank • #${competitor.ranking.estimatedRank}`}
                  body={competitor.ranking.recommendation}
                />
              </div>

              <CompetitorComparisonChart analysis={competitor} title={competitor.inputLabel || workflowTitle} />

              <ResultSection title="Differentiation Strategy" icon={<Swords className="h-4 w-4" />}>
                <CopyBlock text={competitor.differentiationStrategy} multiline />
              </ResultSection>
            </div>

            <div className="space-y-8">
              <ResultSection title="Keyword Opportunities" icon={<Tag className="h-4 w-4" />}>
                <TagList items={competitor.keywordOpportunities} />
              </ResultSection>

              <ResultSection title="Keyword Metrics" icon={<Search className="h-4 w-4" />}>
                <KeywordMetricsTable items={competitor.keywords} />
              </ResultSection>

              <ResultSection title="Competitor Strengths" icon={<Sparkles className="h-4 w-4" />}>
                <BulletList items={competitor.strengths} />
              </ResultSection>
              <ResultSection title="Competitor Weaknesses" icon={<Radar className="h-4 w-4" />}>
                <BulletList items={competitor.weaknesses} />
              </ResultSection>
            </div>
          </div>
        </div>
      ) : null}

      {!isProcessing && workflow.status !== "failed" && opportunity ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Demand" value={opportunity.demandScore} accent="text-emerald-300" />
            <MetricCard label="Competition" value={opportunity.competitionScore} accent="text-rose-300" />
            <MetricCard label="Trend" value={opportunity.trendScore} accent="text-sky-300" />
            <MetricCard label="Opportunity" value={opportunity.opportunityScore} accent="text-indigo-300" />
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-500/10 p-3">
                <Lightbulb className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Product ideas</h2>
                <p className="text-sm text-gray-400">Structured opportunities generated from this niche.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {opportunity.productIdeas.map((idea) => (
                <div key={idea.name} className="rounded-3xl border border-white/5 bg-[#0A0A0B] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{idea.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">{idea.description}</p>
                    </div>
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
                      {idea.opportunityScore}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    <MiniMetric label="Demand" value={idea.demandScore} />
                    <MiniMetric label="Competition" value={idea.competitionScore} />
                    <MiniMetric label="Opportunity" value={idea.opportunityScore} />
                  </div>
                  <Link
                    href={`/dashboard/workflows/new?mode=launch`}
                    className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300"
                  >
                    Build launch pack
                    <ArrowLeft className="h-3 w-3 rotate-180" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!isProcessing && workflow.status !== "failed" && launchPack ? (
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <ResultSection title="SEO Titles" icon={<Flame className="h-4 w-4" />}>
              <div className="space-y-3">
                {launchPack.seoTitles.map((title) => (
                  <CopyBlock key={title} text={title} />
                ))}
              </div>
            </ResultSection>

            <ResultSection title="Optimized Description" icon={<Search className="h-4 w-4" />}>
              <CopyBlock text={launchPack.optimizedDescription} multiline />
            </ResultSection>

            <ResultSection title="FAQ" icon={<Sparkles className="h-4 w-4" />}>
              <div className="space-y-4">
                {launchPack.faq.map((item) => (
                  <div key={item.q} className="rounded-3xl border border-white/5 bg-[#141417] p-5">
                    <p className="text-sm font-bold text-white">{item.q}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.a}</p>
                  </div>
                ))}
              </div>
            </ResultSection>

            <ResultSection title="Email Launch Sequence" icon={<Mail className="h-4 w-4" />}>
              <div className="grid gap-4 md:grid-cols-2">
                {launchPack.emailLaunchSequence.map((item) => (
                  <div key={item.subject} className="rounded-3xl border border-white/5 bg-[#141417] p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">{item.subject}</p>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.body}</p>
                    <CopyButton text={`${item.subject}\n\n${item.body}`} className="mt-4" label="Copy Email" />
                  </div>
                ))}
              </div>
            </ResultSection>
          </div>

          <div className="space-y-8">
            <ResultSection title="Keyword Tags" icon={<Tag className="h-4 w-4" />}>
              <TagList items={launchPack.keywordTags} />
            </ResultSection>

            <ResultSection title="TikTok Hooks" icon={<Zap className="h-4 w-4" />}>
              <BulletList items={launchPack.tikTokHooks} />
            </ResultSection>

            <ResultSection title="Pinterest Captions" icon={<Sparkles className="h-4 w-4" />}>
              <BulletList items={launchPack.pinterestCaptions} />
            </ResultSection>

            <ResultSection title="14-Day Launch Calendar" icon={<Radar className="h-4 w-4" />}>
              <div className="space-y-3">
                {launchPack.launchCalendar.map((item) => (
                  <div key={`${item.day}-${item.task}`} className="rounded-3xl border border-white/5 bg-[#141417] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Day {item.day}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.objective}</p>
                    <p className="mt-1 text-sm text-gray-400">{item.task}</p>
                  </div>
                ))}
              </div>
            </ResultSection>
          </div>
        </div>
      ) : null}

      {!isProcessing && workflow.status !== "failed" && multiChannelLaunchPack ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Channels" value={Object.keys(multiChannelLaunchPack.channels).length} accent="text-indigo-300" />
            <MetricCard label="Title Variants" value={Object.keys(multiChannelLaunchPack.channels).length} accent="text-sky-300" />
            <MetricCard
              label="Hashtags"
              value={Object.values(multiChannelLaunchPack.channels).reduce((total, channel) => total + channel.hashtags.length, 0)}
              accent="text-emerald-300"
            />
            <MetricCard label="Captions" value={Object.keys(multiChannelLaunchPack.channels).length} accent="text-amber-300" />
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-8">
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Multi-Channel Launch Pack</p>
              <h2 className="mt-2 text-3xl font-black text-white">{multiChannelLaunchPack.productName}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-400">
                {multiChannelLaunchPack.productType} for {multiChannelLaunchPack.targetAudience}
              </p>
            </div>
            <MultiChannelLaunchTabs artifact={multiChannelLaunchPack} />
          </div>
        </div>
      ) : null}

      {!isProcessing && workflow.status !== "failed" && mockupGeneration ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Mockups" value={mockupGeneration.images.length} accent="text-rose-300" />
            <MetricCard label="Channels" value={new Set(mockupGeneration.images.map((image) => image.channel)).size} accent="text-indigo-300" />
            <MetricCard label="Color Direction" value={mockupGeneration.color} accent="text-amber-300" />
            <MetricCard label="Style" value={mockupGeneration.style} accent="text-cyan-300" />
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-8">
            <div className="mb-6 flex items-start gap-3">
              <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Mockup Generator</p>
                <h2 className="mt-2 text-3xl font-black text-white">{mockupGeneration.productName}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-400">{mockupGeneration.summary}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <CopyBlock text={mockupGeneration.heroPrompt} multiline />
              <div className="rounded-3xl border border-white/5 bg-[#0A0A0B] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Creative brief</p>
                <p className="mt-3 text-sm font-semibold text-white">Color</p>
                <p className="mt-1 text-sm text-gray-400">{mockupGeneration.color}</p>
                <p className="mt-4 text-sm font-semibold text-white">Style</p>
                <p className="mt-1 text-sm text-gray-400">{mockupGeneration.style}</p>
                <p className="mt-4 text-sm font-semibold text-white">Description</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-400">{mockupGeneration.description}</p>
              </div>
            </div>
          </div>

          <MockupGallery images={mockupGeneration.images} title={mockupGeneration.productName} />
        </div>
      ) : null}

      {!isProcessing && workflow.status !== "failed" && seoSuggestion ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">SEO Keyword Analysis</p>
                <h2 className="text-3xl font-black text-white">{seoSuggestion.optimizedTitle}</h2>
                <p className="mt-2 text-sm text-gray-300">{seoSuggestion.optimizedMetaDescription}</p>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Cache</div>
                <div className="text-sm text-emerald-300">{seoSuggestion.cacheHit ? "Hit" : "Miss"}</div>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <CopyBlock text={seoSuggestion.optimizedDescription} multiline />
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {seoSuggestion.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-[#0A0A0B] px-3 py-1 text-[11px] font-semibold text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
                <button type="button" onClick={handleSeoApply} className="w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Auto-apply to listing
                </button>
                {seoApplyStatus ? <p className="text-xs text-slate-400">{seoApplyStatus}</p> : null}
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Keywords</p>
              <CopyButton
                label="Copy title"
                text={seoSuggestion.optimizedTitle}
              />
            </div>
            <div className="mt-4 overflow-x-auto rounded-3xl border border-white/5 bg-[#0A0A0B]">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Keyword</th>
                      <th className="px-4 py-3">Trend</th>
                      <th className="px-4 py-3">Competition</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {seoSuggestion.keywords.map((keyword) => (
                    <tr key={keyword.keyword}>
                      <td className="px-4 py-3 text-white">{keyword.keyword}</td>
                      <td className="px-4 py-3 text-gray-300">{keyword.trendScore}</td>
                      <td className="px-4 py-3 text-gray-300">{keyword.competitionScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getLaunchPackData(value: unknown) {
  const record = value as {
    emailLaunchSequence: Array<{ body: string; subject: string }>;
    faq: Array<{ a: string; q: string }>;
    keywordTags: string[];
    launchCalendar: Array<{ day: number; objective: string; task: string }>;
    optimizedDescription: string;
    pinterestCaptions: string[];
    seoTitles: string[];
    tikTokHooks: string[];
  };

  return {
    emailLaunchSequence: record.emailLaunchSequence,
    faq: record.faq,
    keywordTags: record.keywordTags,
    launchCalendar: record.launchCalendar,
    optimizedDescription: record.optimizedDescription,
    pinterestCaptions: record.pinterestCaptions,
    seoTitles: record.seoTitles,
    tikTokHooks: record.tikTokHooks,
  };
}

function getWorkflowTitle(inputData: unknown, artifact: unknown) {
  if (artifact && typeof artifact === "object") {
    const record = artifact as Record<string, unknown>;
    if (typeof record.productName === "string" && record.productName.trim()) {
      return record.productName;
    }
    if (typeof record.listingTitle === "string" && record.listingTitle.trim()) {
      return record.listingTitle;
    }
    if (typeof record.inputLabel === "string" && record.inputLabel.trim()) {
      return record.inputLabel;
    }
    if (typeof record.keyword === "string" && record.keyword.trim()) {
      return record.keyword;
    }
    if (typeof record.ideaName === "string" && record.ideaName.trim()) {
      return record.ideaName;
    }
  }

  return getProductName(inputData);
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const styles: Record<WorkflowStatus, string> = {
    completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    failed: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    pending: "bg-white/5 text-gray-300 border-white/10",
    processing: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    queued: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  };

  return (
    <span className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] ${styles[status]}`}>
      {status}
    </span>
  );
}

function PipelineItem({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-[#0A0A0B] p-5">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
    </div>
  );
}

function MetricCard({ accent, label, value }: { accent: string; label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-[#141417] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500">{label}</p>
      <p className={`mt-4 text-4xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#141417] px-3 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function ResultSection({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">{icon}</div>
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className="rounded-3xl border border-white/5 bg-[#141417] px-5 py-4 text-sm leading-relaxed text-gray-300">
          {item}
        </div>
      ))}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-white/10 bg-[#0A0A0B] px-3 py-2 text-xs font-semibold text-gray-300">
          {item}
        </span>
      ))}
    </div>
  );
}

function normalizeCompetitorAnalysis(value: Record<string, unknown>): NormalizedCompetitorAnalysis {
  const comparisonSet = Array.isArray(value.comparisonSet) ? value.comparisonSet as Array<Record<string, unknown>> : [];
  const targetListing = value.targetListing && typeof value.targetListing === "object"
    ? value.targetListing as Record<string, unknown>
    : null;

  return {
    comparisonSet: comparisonSet.map((item, index) => ({
      averageRating: typeof item.averageRating === "number" ? item.averageRating : null,
      estimatedRank: typeof item.estimatedRank === "number" ? item.estimatedRank : index + 1,
      keywordOverlap: typeof item.keywordOverlap === "number" ? item.keywordOverlap : 0,
      priceAmount: typeof item.priceAmount === "number" ? item.priceAmount : null,
      priceText: typeof item.priceText === "string" ? item.priceText : undefined,
      reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : 0,
      shopName: typeof item.shopName === "string" ? item.shopName : undefined,
      title: typeof item.title === "string" ? item.title : "Marketplace listing",
      url: typeof item.url === "string" ? item.url : "#",
    })),
    differentiationStrategy: typeof value.differentiationStrategy === "string"
      ? value.differentiationStrategy
      : "No differentiation strategy was captured in this legacy competitor report.",
    inputLabel: typeof value.inputLabel === "string" ? value.inputLabel : "",
    keywordOpportunities: Array.isArray(value.keywordOpportunities)
      ? value.keywordOpportunities.filter((item): item is string => typeof item === "string")
      : [],
    keywords: Array.isArray(value.keywords)
      ? value.keywords.map((item) => ({
          competitionScore: typeof (item as Record<string, unknown>).competitionScore === "number" ? (item as Record<string, unknown>).competitionScore as number : 0,
          keyword: typeof (item as Record<string, unknown>).keyword === "string" ? (item as Record<string, unknown>).keyword as string : "keyword",
          opportunityScore: typeof (item as Record<string, unknown>).opportunityScore === "number" ? (item as Record<string, unknown>).opportunityScore as number : 0,
          rankingScore: typeof (item as Record<string, unknown>).rankingScore === "number" ? (item as Record<string, unknown>).rankingScore as number : 0,
          trendScore: typeof (item as Record<string, unknown>).trendScore === "number" ? (item as Record<string, unknown>).trendScore as number : 0,
        }))
      : [],
    pricing: {
      marketAverage: 0,
      marketHigh: 0,
      marketLow: 0,
      pricePositioning: "unknown",
      pricePressureScore: 0,
      recommendation: "No pricing recommendation captured in this legacy report.",
      targetPrice: null,
      ...(value.pricing && typeof value.pricing === "object" ? value.pricing as Record<string, unknown> : {}),
    },
    ranking: {
      estimatedRank: 1,
      rankingMomentumScore: 0,
      recommendation: "No ranking recommendation captured in this legacy report.",
      visibilityScore: 0,
      ...(value.ranking && typeof value.ranking === "object" ? value.ranking as Record<string, unknown> : {}),
    },
    reviews: {
      marketAverageReviewCount: 0,
      recommendation: "No review recommendation captured in this legacy report.",
      targetReviewCount: 0,
      trustSignalScore: 0,
      ...(value.reviews && typeof value.reviews === "object" ? value.reviews as Record<string, unknown> : {}),
    },
    strengths: Array.isArray(value.strengths)
      ? value.strengths.filter((item): item is string => typeof item === "string")
      : [],
    summary: typeof value.summary === "string"
      ? value.summary
      : "This competitor report was generated before ORVEX stored marketplace summary metrics.",
    targetListing: targetListing
      ? {
          averageRating: typeof targetListing.averageRating === "number" ? targetListing.averageRating : null,
          estimatedRank: typeof targetListing.estimatedRank === "number" ? targetListing.estimatedRank : 1,
          keywordOverlap: typeof targetListing.keywordOverlap === "number" ? targetListing.keywordOverlap : 100,
          priceAmount: typeof targetListing.priceAmount === "number" ? targetListing.priceAmount : null,
          priceText: typeof targetListing.priceText === "string" ? targetListing.priceText : undefined,
          reviewCount: typeof targetListing.reviewCount === "number" ? targetListing.reviewCount : 0,
          shopName: typeof targetListing.shopName === "string" ? targetListing.shopName : undefined,
          title: typeof targetListing.title === "string" ? targetListing.title : "Target listing",
          url: typeof targetListing.url === "string" ? targetListing.url : "#",
        }
      : null,
    weaknesses: Array.isArray(value.weaknesses)
      ? value.weaknesses.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function InsightPanel({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-[#141417] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-gray-300">{body}</p>
    </div>
  );
}

function KeywordMetricsTable({
  items,
}: {
  items: Array<{
    competitionScore: number;
    keyword: string;
    opportunityScore: number;
    rankingScore: number;
    trendScore: number;
  }>;
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#141417]">
      <table className="w-full text-left text-sm">
        <thead className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
          <tr>
            <th className="px-4 py-3">Keyword</th>
            <th className="px-4 py-3">Trend</th>
            <th className="px-4 py-3">Competition</th>
            <th className="px-4 py-3">Ranking</th>
            <th className="px-4 py-3">Opportunity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((item) => (
            <tr key={item.keyword}>
              <td className="px-4 py-3 text-white">{item.keyword}</td>
              <td className="px-4 py-3 text-gray-300">{item.trendScore}</td>
              <td className="px-4 py-3 text-gray-300">{item.competitionScore}</td>
              <td className="px-4 py-3 text-gray-300">{item.rankingScore}</td>
              <td className="px-4 py-3 font-semibold text-indigo-300">{item.opportunityScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopyBlock({ multiline = false, text }: { multiline?: boolean; text: string }) {
  return (
    <div className="relative rounded-3xl border border-white/5 bg-[#141417] p-5">
      <CopyButton text={text} className="absolute right-4 top-4" label="Copy" />
      {multiline ? (
        <pre className="whitespace-pre-wrap pr-16 font-sans text-sm leading-relaxed text-gray-300">{text}</pre>
      ) : (
        <p className="pr-16 text-sm text-gray-300">{text}</p>
      )}
    </div>
  );
}

function CopyButton({
  className = "",
  label,
  text,
}: {
  className?: string;
  label: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(text)}
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0B] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 ${className}`}
    >
      <Copy className="h-3 w-3" />
      {label}
    </button>
  );
}
