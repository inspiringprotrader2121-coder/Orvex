"use client";

import type { DashboardCommunitySummary } from "@/lib/dashboard";

const statusTone: Record<DashboardCommunitySummary["recentItems"][number]["status"], string> = {
  approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  flagged: "border-amber-400/20 bg-amber-500/10 text-amber-300",
  pending: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
  rejected: "border-rose-400/20 bg-rose-500/10 text-rose-300",
};

export function DashboardCommunityPanel({ data }: { data: DashboardCommunitySummary }) {
  return (
    <section className="space-y-5 rounded-[2rem] border border-white/5 bg-[#141417] p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Community</p>
        <h3 className="mt-2 text-2xl font-black text-white">Template contributions</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Templates</p>
          <p className="mt-3 text-3xl font-black text-white">{data.totalTemplates}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Downloads</p>
          <p className="mt-3 text-3xl font-black text-indigo-300">{data.totalDownloads}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Approved</p>
          <p className="mt-3 text-3xl font-black text-emerald-300">{data.approvedTemplates}</p>
        </div>
      </div>

      {data.recentItems.length > 0 ? (
        <div className="space-y-3">
          {data.recentItems.map((item) => (
            <div key={item.id} className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.category} • {item.downloadsCount} downloads • {item.usageCount} uses</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${statusTone[item.status]}`}>
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">Added {new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[#0A0A0B] p-8 text-sm text-slate-400">
          No community template contributions matched the current filters.
        </div>
      )}
    </section>
  );
}
