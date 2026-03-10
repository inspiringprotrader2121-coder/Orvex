"use client";

type MarketListing = {
  averageRating?: number | null;
  estimatedRank: number;
  keywordOverlap: number;
  priceAmount?: number | null;
  priceText?: string;
  reviewCount: number;
  shopName?: string;
  title: string;
  url: string;
};

type CompetitorChartAnalysis = {
  comparisonSet: MarketListing[];
  targetListing?: MarketListing | null;
};

function formatPrice(listing: MarketListing) {
  if (typeof listing.priceAmount === "number") {
    return `$${listing.priceAmount.toFixed(2)}`;
  }

  return listing.priceText || "n/a";
}

function ratio(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((value / max) * 100));
}

export function CompetitorComparisonChart({
  analysis,
  title = "Marketplace comparison",
}: {
  analysis: CompetitorChartAnalysis;
  title?: string;
}) {
  const rows = analysis.targetListing
    ? [{ ...analysis.targetListing, kind: "target" as const }, ...analysis.comparisonSet.map((item) => ({ ...item, kind: "competitor" as const }))]
    : analysis.comparisonSet.map((item) => ({ ...item, kind: "competitor" as const }));

  const maxPrice = Math.max(...rows.map((row) => row.priceAmount ?? 0), 1);
  const maxReviews = Math.max(...rows.map((row) => row.reviewCount), 1);
  const maxRank = Math.max(...rows.map((row) => row.estimatedRank), 1);

  return (
    <section className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Comparison Chart</p>
          <h3 className="mt-2 text-2xl font-black text-white">{title}</h3>
        </div>
        <p className="max-w-lg text-right text-xs leading-relaxed text-slate-400">
          Compare price, review depth, and search placement against the current marketplace field.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const rankStrength = maxRank > 1
            ? Math.max(8, Math.round(((maxRank - row.estimatedRank + 1) / maxRank) * 100))
            : 100;

          return (
            <div key={`${row.kind}-${row.url}`} className="rounded-3xl border border-white/5 bg-[#0A0A0B] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                      row.kind === "target"
                        ? "bg-cyan-500/10 text-cyan-300"
                        : "bg-indigo-500/10 text-indigo-300"
                    }`}>
                      {row.kind === "target" ? "Your Listing" : `Competitor #${row.estimatedRank}`}
                    </span>
                    {row.shopName ? <span className="text-xs text-slate-500">{row.shopName}</span> : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{row.title}</p>
                  <a href={row.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-slate-400 hover:text-white">
                    {row.url}
                  </a>
                </div>

                <div className="grid min-w-[220px] grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Price</p>
                    <p className="mt-2 font-bold text-white">{formatPrice(row)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Rating</p>
                    <p className="mt-2 font-bold text-white">
                      {typeof row.averageRating === "number" ? row.averageRating.toFixed(1) : "n/a"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Reviews</p>
                    <p className="mt-2 font-bold text-white">{row.reviewCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Overlap</p>
                    <p className="mt-2 font-bold text-white">{row.keywordOverlap}%</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <MetricBar label="Price" value={`${formatPrice(row)}`} width={ratio(row.priceAmount ?? 0, maxPrice)} color="from-cyan-400 to-sky-400" />
                <MetricBar label="Reviews" value={`${row.reviewCount}`} width={ratio(row.reviewCount, maxReviews)} color="from-emerald-400 to-lime-400" />
                <MetricBar label="Rank Strength" value={`#${row.estimatedRank}`} width={rankStrength} color="from-amber-400 to-orange-400" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricBar({
  color,
  label,
  value,
  width,
}: {
  color: string;
  label: string;
  value: string;
  width: number;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#141417] p-4">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
