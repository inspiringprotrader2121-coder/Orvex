"use client";

import { useState } from "react";
import Link from "next/link";
import type { DashboardProductHistoryItem } from "@/lib/dashboard";

export function DashboardProductHistory({
  items,
  onRollback,
  rollbackPendingId,
}: {
  items: DashboardProductHistoryItem[];
  onRollback: (workflowId: string) => void;
  rollbackPendingId?: string | null;
}) {
  const [activeProduct, setActiveProduct] = useState(items[0]?.productName ?? "");
  const activeItem = items.find((item) => item.productName === activeProduct) ?? items[0] ?? null;

  return (
    <section className="space-y-5 rounded-[2rem] border border-white/5 bg-[#141417] p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">History</p>
        <h3 className="mt-2 text-2xl font-black text-white">Historical AI outputs per product</h3>
      </div>

      {items.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <button
                key={item.productName}
                type="button"
                onClick={() => setActiveProduct(item.productName)}
                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${
                  item.productName === (activeItem?.productName ?? "")
                    ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-300"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {item.productName}
              </button>
            ))}
          </div>

          {activeItem ? (
            <div className="overflow-x-auto rounded-[1.5rem] border border-white/5 bg-[#0A0A0B]">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activeItem.outputs.map((output, index) => (
                    <tr key={output.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{output.isRollback ? "Restored Snapshot" : `Version ${activeItem.totalOutputs - index}`}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(output.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold capitalize text-white">{output.channel}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{output.store}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{output.typeLabel}</p>
                        <p className="mt-1 max-w-xl text-sm text-slate-400">{output.summary}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-300">{output.score ?? "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/dashboard/workflows/${output.id}`} className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:border-white/20 hover:bg-white/10">
                            Open
                          </Link>
                          {output.canRollback ? (
                            <button
                              type="button"
                              onClick={() => onRollback(output.id)}
                              disabled={rollbackPendingId === output.id}
                              className="inline-flex rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300 transition hover:border-indigo-300/30 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {rollbackPendingId === output.id ? "Restoring..." : "Restore Snapshot"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[#0A0A0B] p-8 text-sm text-slate-400">
          No historical outputs matched the current filters.
        </div>
      )}
    </section>
  );
}
