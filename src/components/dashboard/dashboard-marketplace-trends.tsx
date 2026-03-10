"use client";

import type { MarketplaceTrendSummary } from "@/lib/dashboard";

const priorityTone: Record<MarketplaceTrendSummary["suggestions"][number]["priority"], string> = {
  high: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  low: "border-white/10 bg-white/5 text-slate-300",
  medium: "border-amber-400/20 bg-amber-500/10 text-amber-300",
};

export function DashboardMarketplaceTrends({ data }: { data: MarketplaceTrendSummary }) {
  return (
    <section className="space-y-6 rounded-[2rem] border border-white/5 bg-[#141417] p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">Marketplace Trends</p>
        <h3 className="mt-2 text-2xl font-black text-white">Trending niches and opportunity signals</h3>
        <p className="mt-2 text-sm text-slate-400">
          Aggregated from AI opportunity reports and high-performing listing scores across the Orvex network.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {data.niches.length > 0 ? data.niches.map((item) => (
            <div key={item.keyword} className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{item.keyword}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Opportunity score {item.opportunityScore}</p>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Trend {item.trendScore}
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Demand {item.demandScore} | Competition {item.competitionScore}
              </p>
            </div>
          )) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[#0A0A0B] p-8 text-sm text-slate-400">
              No trend niches yet. Run more opportunity reports to seed detection.
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Suggested opportunities</p>
            <div className="mt-4 space-y-3">
              {data.suggestions.map((suggestion) => (
                <div key={suggestion.title} className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{suggestion.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{suggestion.detail}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${priorityTone[suggestion.priority]}`}>
                    {suggestion.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Listing success signals</p>
            <div className="mt-4 space-y-3">
              {data.successSignals.length > 0 ? data.successSignals.map((signal) => (
                <div key={signal.listingTitle} className="rounded-2xl border border-white/5 bg-[#111111] p-3">
                  <p className="font-semibold text-white">{signal.listingTitle}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Score {signal.listingScore} | SEO {signal.seoScore} | Conversion {signal.conversionScore}
                  </p>
                  <a href={signal.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                    View listing
                  </a>
                </div>
              )) : (
                <p className="text-sm text-slate-400">No high-performing listings detected yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
