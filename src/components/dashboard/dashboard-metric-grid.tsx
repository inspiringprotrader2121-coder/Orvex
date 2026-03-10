"use client";

type Metric = {
  accent: string;
  label: string;
  note: string;
  value: number;
};

export function DashboardMetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-[1.75rem] border border-white/5 bg-[#141417] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">{metric.label}</p>
          <p className={`mt-4 text-4xl font-black ${metric.accent}`}>{metric.value}</p>
          <p className="mt-2 text-sm text-slate-400">{metric.note}</p>
        </div>
      ))}
    </div>
  );
}
