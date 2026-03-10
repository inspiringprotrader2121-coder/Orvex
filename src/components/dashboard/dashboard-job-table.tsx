"use client";

import Link from "next/link";
import type { DashboardJobItem } from "@/lib/dashboard";

export function DashboardJobTable({ items }: { items: DashboardJobItem[] }) {
  return (
    <section className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Live Queue</p>
        <h3 className="mt-2 text-2xl font-black text-white">Pending and active AI jobs</h3>
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-[1.5rem] border border-white/5 bg-[#0A0A0B]">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{item.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{item.typeLabel}</td>
                  <td className="px-4 py-4 uppercase text-slate-300">{item.store}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-24 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300" style={{ width: `${Math.max(item.progress, 8)}%` }} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{item.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{item.creditsSpent}</td>
                  <td className="px-4 py-4">
                    <Link href={`/dashboard/workflows/${item.id}`} className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:border-white/20 hover:bg-white/10">
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
          No pending jobs for the current filters.
        </div>
      )}
    </section>
  );
}
