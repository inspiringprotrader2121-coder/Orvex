"use client";

import Link from "next/link";
import type { DashboardOptimizationSnapshot } from "@/lib/dashboard";

export function DashboardOptimizationPanel({ data }: { data: DashboardOptimizationSnapshot }) {
  return (
    <section className="space-y-5 rounded-[2rem] border border-white/5 bg-[#141417] p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Optimize</p>
        <h3 className="mt-2 text-2xl font-black text-white">Optimization scores</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricBox accent="text-indigo-300" label="Avg Listing" value={data.averageListingScore} />
        <MetricBox accent="text-cyan-300" label="Avg SEO" value={data.averageSeoScore} />
        <MetricBox accent="text-emerald-300" label="Avg Conversion" value={data.averageConversionScore} />
      </div>

      {data.latestScores.length > 0 ? (
        <div className="overflow-x-auto rounded-[1.5rem] border border-white/5 bg-[#0A0A0B]">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Listing Score</th>
                <th className="px-4 py-3">SEO</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.latestScores.map((item) => (
                <tr key={item.workflowId}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{item.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-4 text-indigo-300">{item.listingScore}</td>
                  <td className="px-4 py-4 text-cyan-300">{item.seoScore}</td>
                  <td className="px-4 py-4">
                    <Link href={`/dashboard/workflows/${item.workflowId}`} className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:border-white/20 hover:bg-white/10">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[#0A0A0B] p-8 text-sm text-slate-400">
          No optimization scores matched the current filters.
        </div>
      )}
    </section>
  );
}

function MetricBox({ accent, label, value }: { accent: string; label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-black ${accent}`}>{value}</p>
    </div>
  );
}
