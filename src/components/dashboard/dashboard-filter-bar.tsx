"use client";

import type { DashboardOverviewData } from "@/lib/dashboard";

export function DashboardFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: DashboardOverviewData["filters"];
  onChange: (next: DashboardOverviewData["filters"]) => void;
  options: DashboardOverviewData["filterOptions"];
}) {
  return (
    <section className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <label className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Product</span>
          <input
            value={filters.product}
            onChange={(event) => onChange({ ...filters, product: event.target.value })}
            placeholder="Search by product or keyword"
            className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Store</span>
          <select
            value={filters.store}
            onChange={(event) => onChange({ ...filters, store: event.target.value as DashboardOverviewData["filters"]["store"] })}
            className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
          >
            {options.stores.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Channel</span>
          <select
            value={filters.channel}
            onChange={(event) => onChange({ ...filters, channel: event.target.value as DashboardOverviewData["filters"]["channel"] })}
            className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
          >
            {options.channels.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Date Range</span>
          <select
            value={filters.dateRange}
            onChange={(event) => onChange({ ...filters, dateRange: event.target.value as DashboardOverviewData["filters"]["dateRange"] })}
            className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
          >
            {options.dateRanges.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
