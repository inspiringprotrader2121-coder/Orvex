import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, History, Rocket } from "lucide-react";

type WorkflowModuleShellProps = {
  ctaLabel: string;
  description: string;
  eyebrow: string;
  highlights: Array<{
    description: string;
    icon: LucideIcon;
    title: string;
  }>;
  mode: "competitor" | "forge" | "launch" | "listing" | "opportunity";
  primaryHref?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  title: string;
};

export function WorkflowModuleShell({
  ctaLabel,
  description,
  eyebrow,
  highlights,
  mode,
  primaryHref,
  secondaryHref,
  secondaryLabel = "View Workflow History",
  title,
}: WorkflowModuleShellProps) {
  const defaultPrimaryHref = `/dashboard/workflows/new?mode=${mode}`;
  const defaultSecondaryHref = "/dashboard/workflows";

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <section className="overflow-hidden rounded-[2rem] border border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_35%),linear-gradient(135deg,#141417_0%,#0A0A0B_70%)] p-8 shadow-2xl shadow-black/20 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-indigo-300">{eyebrow}</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white lg:text-5xl">{title}</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-gray-300">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={primaryHref || defaultPrimaryHref}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition hover:bg-gray-200"
              >
                <Rocket className="h-4 w-4" />
                {ctaLabel}
              </Link>
              <Link
                href={secondaryHref || defaultSecondaryHref}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                <History className="h-4 w-4" />
                {secondaryLabel}
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/5 bg-black/20 p-6 backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500">Pipeline</p>
            <div className="mt-5 space-y-4">
              <PipelineRow title="API Route" description="Accepts lightweight inputs and queues BullMQ jobs." />
              <PipelineRow title="Worker" description="Runs scraping, AI calls, storage, and retries off the request path." />
              <PipelineRow title="Realtime UI" description="Socket events refresh the dashboard as results are persisted." />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {highlights.map((highlight) => {
          const Icon = highlight.icon;

          return (
            <div key={highlight.title} className="rounded-[1.75rem] border border-white/5 bg-[#141417] p-6">
              <div className="inline-flex rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-black text-white">{highlight.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{highlight.description}</p>
            </div>
          );
        })}
      </section>

      <section className="flex items-center justify-between rounded-[1.75rem] border border-white/5 bg-[#141417] px-6 py-5">
        <div>
          <p className="text-sm font-bold text-white">Ready to run this workflow?</p>
          <p className="mt-1 text-sm text-gray-400">Everything still routes through the shared ORVEX workflow engine.</p>
        </div>
        <Link
          href={`/dashboard/workflows/new?mode=${mode}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-indigo-300 transition hover:text-indigo-200"
        >
          Open {eyebrow}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function PipelineRow({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0A0A0B] p-4">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
    </div>
  );
}
