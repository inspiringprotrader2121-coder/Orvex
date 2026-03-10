"use client";

import type { DashboardScoreTrendPoint, DashboardTrendPoint } from "@/lib/dashboard";

function ChartShell({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-black text-white">{title}</h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function WorkflowTrendChart({ items }: { items: DashboardTrendPoint[] }) {
  const maxValue = Math.max(1, ...items.map((item) => Math.max(item.completed, item.pending)));

  return (
    <ChartShell eyebrow="Jobs" title="Workflow throughput">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(28px,1fr))] items-end gap-3">
        {items.map((item) => (
          <div key={item.date} className="space-y-2 text-center">
            <div className="flex h-40 items-end justify-center gap-1">
              <div
                className="w-3 rounded-full bg-indigo-400"
                style={{ height: `${Math.max(8, (item.completed / maxValue) * 160)}px` }}
                title={`${item.label}: ${item.completed} completed`}
              />
              <div
                className="w-3 rounded-full bg-amber-400"
                style={{ height: `${Math.max(8, (item.pending / maxValue) * 160)}px` }}
                title={`${item.label}: ${item.pending} pending`}
              />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-indigo-400" />Completed</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" />Pending</span>
      </div>
    </ChartShell>
  );
}

export function ScoreTrendChart({
  accentClass,
  eyebrow,
  items,
  title,
}: {
  accentClass: string;
  eyebrow: string;
  items: DashboardScoreTrendPoint[];
  title: string;
}) {
  const width = 560;
  const height = 180;
  const maxValue = Math.max(1, ...items.map((item) => item.score));
  const points = items.map((item, index) => {
    const x = items.length <= 1 ? 0 : (index / (items.length - 1)) * width;
    const y = height - (item.score / maxValue) * (height - 20) - 10;
    return `${x},${Number.isFinite(y) ? y : height - 10}`;
  }).join(" ");

  return (
    <ChartShell eyebrow={eyebrow} title={title}>
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0B] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full overflow-visible">
          <polyline
            fill="none"
            points={points}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
            className={accentClass}
          />
          {items.map((item, index) => {
            const x = items.length <= 1 ? 0 : (index / (items.length - 1)) * width;
            const y = height - (item.score / maxValue) * (height - 20) - 10;
            return <circle key={item.date} cx={x} cy={Number.isFinite(y) ? y : height - 10} r="4" className={accentClass} />;
          })}
        </svg>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(48px,1fr))] gap-2">
          {items.map((item) => (
            <div key={item.date} className="rounded-2xl border border-white/5 bg-[#141417] px-3 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-bold text-white">{item.score}</p>
            </div>
          ))}
        </div>
      </div>
    </ChartShell>
  );
}
