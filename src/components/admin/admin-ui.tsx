import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  subtitle,
  title,
}: {
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300">{eyebrow}</p>
      <h1 className="text-4xl font-black tracking-tight text-white">{title}</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
    </div>
  );
}

export function AdminShellCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[2rem] border border-white/6 bg-[#111826]/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${className}`}>
      {children}
    </div>
  );
}

export function AdminSection({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <AdminShellCard>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">{title}</h2>
        {action}
      </div>
      {children}
    </AdminShellCard>
  );
}

export function AdminStatCard({
  accent,
  label,
  note,
  value,
}: {
  accent: string;
  label: string;
  note: string;
  value: string | number;
}) {
  return (
    <AdminShellCard className="bg-gradient-to-br from-white/[0.03] to-transparent">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className={`mt-4 text-4xl font-black ${accent}`}>{value}</p>
      <p className="mt-3 text-sm text-slate-400">{note}</p>
    </AdminShellCard>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "critical" | "info" | "neutral" | "success" | "warning";
}) {
  const tones = {
    critical: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    info: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    neutral: "border-white/10 bg-white/5 text-slate-300",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  } satisfies Record<string, string>;

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function InlineTrendChart({
  color,
  points,
}: {
  color: string;
  points: Array<{ date: string; value: number }>;
}) {
  if (points.length === 0) {
    return <div className="rounded-3xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">No trend data yet.</div>;
  }

  const width = 600;
  const height = 180;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const stepX = width / Math.max(points.length - 1, 1);
  const line = points.map((point, index) => {
    const x = Math.round(index * stepX);
    const y = Math.round(height - ((point.value / maxValue) * (height - 30)) - 15);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#0b1220] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
        <polyline
          fill="none"
          points={line}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
      </svg>
      <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export function SimpleBarList({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>{item.label}</span>
            <span className="font-semibold">{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#0b1220]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400"
              style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminEmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
