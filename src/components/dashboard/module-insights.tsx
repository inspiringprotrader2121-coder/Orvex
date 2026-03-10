import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";

export function ModuleMetricsGrid({
  metrics,
}: {
  metrics: Array<{
    accent: string;
    label: string;
    value: number | string;
  }>;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-[1.75rem] border border-white/5 bg-[#141417] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500">{metric.label}</p>
          <p className={`mt-4 text-4xl font-black ${metric.accent}`}>{metric.value}</p>
        </div>
      ))}
    </section>
  );
}

export function ModuleResultsSection({
  ctaHref,
  ctaLabel,
  description,
  emptyMessage,
  items,
  title,
}: {
  ctaHref: string;
  ctaLabel: string;
  description: string;
  emptyMessage: string;
  items: Array<{
    href: string;
    kicker: string;
    summary: string;
    title: string;
  }>;
  title: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/5 bg-[#141417] p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-gray-400">{description}</p>
        </div>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-gray-200"
        >
          {ctaLabel}
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-white/5 bg-[#0A0A0B] p-5 transition hover:border-white/10"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">{item.kicker}</p>
              <h3 className="mt-2 line-clamp-2 text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-400">{item.summary}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Open Result
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0A0A0B] p-10 text-center">
          <p className="text-sm text-gray-400">{emptyMessage}</p>
          <Link
            href={ctaHref}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-gray-200"
          >
            {ctaLabel}
          </Link>
        </div>
      )}
    </section>
  );
}

export function ModuleSplitSection({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">{left}{right}</div>;
}
