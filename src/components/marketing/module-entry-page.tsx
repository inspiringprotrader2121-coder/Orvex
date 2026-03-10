import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Rocket } from "lucide-react";
import { WorkflowModuleShell } from "@/components/dashboard/workflow-module-shell";

type ModuleEntryPageProps = {
  description: string;
  eyebrow: string;
  highlights: Array<{
    description: string;
    icon: LucideIcon;
    title: string;
  }>;
  isAuthenticated: boolean;
  mode: "forge" | "launch" | "listing" | "opportunity";
  title: string;
};

export function ModuleEntryPage({
  description,
  eyebrow,
  highlights,
  isAuthenticated,
  mode,
  title,
}: ModuleEntryPageProps) {
  const dashboardHref = getDashboardHref(mode);
  const workflowHref = `/dashboard/workflows/new?mode=${mode}`;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0A0A0B]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">Orvex</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href={isAuthenticated ? "/dashboard" : "/login"} className="text-sm font-medium text-gray-400 transition hover:text-white">
              {isAuthenticated ? "Dashboard" : "Log in"}
            </Link>
            <Link
              href={isAuthenticated ? dashboardHref : "/register"}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-gray-200"
            >
              {isAuthenticated ? "Open Module" : "Get Started"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <WorkflowModuleShell
          primaryHref={isAuthenticated ? dashboardHref : "/register"}
          ctaLabel={isAuthenticated ? `Open ${eyebrow}` : `Start With ${eyebrow}`}
          description={description}
          eyebrow={eyebrow}
          highlights={highlights}
          mode={mode}
          secondaryHref={isAuthenticated ? workflowHref : "/login"}
          secondaryLabel={isAuthenticated ? "Run Workflow Now" : "Log In"}
          title={title}
        />

        <section className="mt-10 rounded-[1.75rem] border border-white/5 bg-[#141417] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Built on the ORVEX workflow spine</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">
                Every module routes through lightweight Next.js APIs, BullMQ workers, PostgreSQL artifact storage, and Socket.io status updates. The product surface changes, but the production architecture stays consistent.
              </p>
            </div>
            <Link
              href={isAuthenticated ? "/dashboard/workflows" : "/register"}
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-300 transition hover:text-indigo-200"
            >
              {isAuthenticated ? "View Workflow History" : "Create Your Workspace"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function getDashboardHref(mode: "forge" | "launch" | "listing" | "opportunity") {
  switch (mode) {
    case "opportunity":
      return "/dashboard/discover";
    case "forge":
      return "/dashboard/forge";
    case "listing":
      return "/dashboard/optimize";
    case "launch":
      return "/dashboard/launch";
    default:
      return "/dashboard";
  }
}
