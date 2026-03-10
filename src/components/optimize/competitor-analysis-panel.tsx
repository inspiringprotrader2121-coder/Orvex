"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Activity, ArrowRight, Loader2, Radar, Search, Swords } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { CompetitorComparisonChart } from "./competitor-comparison-chart";

type KeywordMetric = {
  competitionScore: number;
  keyword: string;
  opportunityScore: number;
  rankingScore: number;
  trendScore: number;
};

type CompetitorAnalysisRecord = {
  analysisKey: string;
  analysisVersion: number;
  comparisonSet: Array<{
    averageRating?: number | null;
    estimatedRank: number;
    keywordOverlap: number;
    priceAmount?: number | null;
    priceText?: string;
    reviewCount: number;
    shopName?: string;
    title: string;
    url: string;
  }>;
  createdAt: string;
  differentiationStrategy: string;
  id: string;
  inputLabel: string;
  keywordOpportunities: string[];
  keywords: KeywordMetric[];
  pricing: {
    marketAverage: number;
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
  sourceType: "keyword" | "listing";
  sourceUrl?: string | null;
  strengths: string[];
  summary: string;
  targetListing?: {
    averageRating?: number | null;
    estimatedRank: number;
    keywordOverlap: number;
    priceAmount?: number | null;
    priceText?: string;
    reviewCount: number;
    shopName?: string;
    title: string;
    url: string;
  } | null;
  weaknesses: string[];
  workflowId: string;
};

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }

  return data as { workflowId: string };
}

export function CompetitorAnalysisPanel({
  initialAnalyses,
}: {
  initialAnalyses: CompetitorAnalysisRecord[];
}) {
  const { socket } = useSocket();
  const [analyses, setAnalyses] = useState(initialAnalyses.map(normalizeAnalysis));
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [productName, setProductName] = useState("");
  const [pendingWorkflowId, setPendingWorkflowId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refreshAnalyses() {
    const response = await fetch("/api/competitor-analysis");
    if (!response.ok) {
      throw new Error("Unable to refresh competitor analysis");
    }

    const data = await response.json() as { analyses: CompetitorAnalysisRecord[] };
    setAnalyses(data.analyses.map(normalizeAnalysis));
  }

  const refreshFromSocket = useEffectEvent(async () => {
    await refreshAnalyses();
  });

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleUpdate = (event: { status: string; workflowId: string }) => {
      const isRelevant = event.workflowId === pendingWorkflowId || analyses.some((item) => item.workflowId === event.workflowId);
      if (!isRelevant) {
        return;
      }

      if (event.status === "completed") {
        setStatus("Competitor analysis complete. Refreshing insights...");
        void refreshFromSocket().then(() => {
          setPendingWorkflowId(null);
          setStatus("Latest competitor analysis loaded.");
        }).catch(() => {
          setStatus("Analysis completed, but refresh failed.");
        });
        return;
      }

      if (event.status === "failed") {
        setPendingWorkflowId(null);
        setStatus("Competitor analysis failed.");
        return;
      }

      setStatus(`Workflow ${event.status}...`);
    };

    socket.on("workflow.updated", handleUpdate);
    return () => {
      socket.off("workflow.updated", handleUpdate);
    };
  }, [analyses, pendingWorkflowId, socket]);

  const latest = analyses[0];

  return (
    <div className="space-y-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!url.trim() && !keyword.trim()) {
            setStatus("Enter a competitor URL or a product keyword.");
            return;
          }

          startTransition(() => {
            void (async () => {
              try {
                setStatus("Queueing competitor analysis...");
                const response = await postJson("/api/competitor-analysis", {
                  keyword: keyword.trim() || undefined,
                  productName: productName.trim() || undefined,
                  url: url.trim() || undefined,
                });
                setPendingWorkflowId(response.workflowId);
                setUrl("");
                setKeyword("");
                setProductName("");
                setStatus("Analysis queued. ORVEX will update this panel when the worker finishes.");
              } catch (error) {
                setStatus(error instanceof Error ? error.message : "Unable to start competitor analysis.");
              }
            })();
          });
        }}
        className="rounded-[2rem] border border-white/5 bg-[#141417] p-6"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Competitor Analysis</p>
            <h2 className="mt-2 text-3xl font-black text-white">Benchmark against the market</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
              Run a competitor URL or a niche keyword through the worker pipeline to compare pricing, reviews,
              keyword overlap, and estimated search position against live Etsy results.
            </p>
          </div>
          {pendingWorkflowId ? (
            <Link href={`/dashboard/workflows/${pendingWorkflowId}`} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Open live workflow
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
          <label className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Competitor URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.etsy.com/listing/..."
              className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <label className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Product keyword</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder='e.g. "gift for mum"'
              className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <label className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Product label</span>
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Optional grouping label"
              className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
            {isPending ? "Queueing..." : "Run competitor analysis"}
          </button>
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                void refreshAnalyses().then(() => setStatus("Competitor history refreshed.")).catch(() => setStatus("Unable to refresh competitor history."));
              });
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            <Search className="h-4 w-4" />
            Refresh history
          </button>
          {status ? <span className="text-xs text-slate-400">{status}</span> : null}
        </div>
      </form>

      {latest ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard icon={<Activity className="h-4 w-4" />} label="Price Pressure" value={latest.pricing.pricePressureScore} accent="text-cyan-300" />
            <MetricCard icon={<Radar className="h-4 w-4" />} label="Trust Signal" value={latest.reviews.trustSignalScore} accent="text-emerald-300" />
            <MetricCard icon={<Search className="h-4 w-4" />} label="Visibility" value={latest.ranking.visibilityScore} accent="text-amber-300" />
            <MetricCard icon={<Swords className="h-4 w-4" />} label="Keyword Plays" value={latest.keywordOpportunities.length} accent="text-indigo-300" />
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      {latest.sourceType === "listing" ? "URL analysis" : "Keyword analysis"} • v{latest.analysisVersion}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-white">{latest.inputLabel}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{latest.summary}</p>
                  </div>
                  <Link href={`/dashboard/workflows/${latest.workflowId}`} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white">
                    Open full report
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <InsightCard label="Pricing" body={latest.pricing.recommendation} />
                  <InsightCard label="Reviews" body={latest.reviews.recommendation} />
                  <InsightCard label="Ranking" body={latest.ranking.recommendation} />
                </div>
              </div>

              <CompetitorComparisonChart analysis={latest} title={latest.inputLabel} />
            </div>

            <div className="space-y-8">
              <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">Keyword opportunities</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{latest.keywords.length} tracked</span>
                </div>
                <div className="mt-4 space-y-3">
                  {latest.keywords.slice(0, 5).map((item) => (
                    <div key={item.keyword} className="rounded-2xl border border-white/5 bg-[#0A0A0B] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-white">{item.keyword}</p>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">{item.opportunityScore}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <span>Trend {item.trendScore}</span>
                        <span>Comp {item.competitionScore}</span>
                        <span>Rank {item.rankingScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
                <h3 className="text-xl font-black text-white">Version history</h3>
                <div className="mt-4 space-y-3">
                  {analyses.slice(0, 6).map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/workflows/${item.workflowId}`}
                      className="block rounded-2xl border border-white/5 bg-[#0A0A0B] p-4 transition hover:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            {item.analysisKey} • v{item.analysisVersion}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white">{item.inputLabel}</p>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">{item.differentiationStrategy}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#0A0A0B] p-8 text-sm text-slate-400">
          No competitor analyses yet. Run one above and this panel will start building versioned market intelligence.
        </div>
      )}
    </div>
  );
}

function MetricCard({
  accent,
  icon,
  label,
  value,
}: {
  accent: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-white/5 bg-[#141417] p-5">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
        <span>{label}</span>
        <span className="text-indigo-300">{icon}</span>
      </div>
      <p className={`mt-4 text-4xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function InsightCard({ body, label }: { body: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0A0A0B] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}

function normalizeAnalysis(item: CompetitorAnalysisRecord): CompetitorAnalysisRecord {
  return {
    ...item,
    comparisonSet: Array.isArray(item.comparisonSet) ? item.comparisonSet : [],
    keywordOpportunities: Array.isArray(item.keywordOpportunities) ? item.keywordOpportunities : [],
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    pricing: {
      marketAverage: item.pricing?.marketAverage ?? 0,
      pricePositioning: item.pricing?.pricePositioning ?? "unknown",
      pricePressureScore: item.pricing?.pricePressureScore ?? 0,
      recommendation: item.pricing?.recommendation ?? "No pricing recommendation captured yet.",
      targetPrice: item.pricing?.targetPrice ?? null,
    },
    ranking: {
      estimatedRank: item.ranking?.estimatedRank ?? 1,
      rankingMomentumScore: item.ranking?.rankingMomentumScore ?? 0,
      recommendation: item.ranking?.recommendation ?? "No ranking recommendation captured yet.",
      visibilityScore: item.ranking?.visibilityScore ?? 0,
    },
    reviews: {
      marketAverageReviewCount: item.reviews?.marketAverageReviewCount ?? 0,
      recommendation: item.reviews?.recommendation ?? "No review recommendation captured yet.",
      targetReviewCount: item.reviews?.targetReviewCount ?? 0,
      trustSignalScore: item.reviews?.trustSignalScore ?? 0,
    },
    summary: item.summary || "This competitor analysis was generated before ORVEX stored market-summary text.",
    targetListing: item.targetListing ?? null,
  };
}
