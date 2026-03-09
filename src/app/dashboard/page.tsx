import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getProductName, getWorkflowLabel, type WorkflowStatus } from "@/lib/workflows";
import { and, count, desc, eq, or } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Plus,
  Rocket,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CreditAccountService } from "@server/services/credit-service";

type DashboardWorkflow = typeof workflows.$inferSelect;

type StatCardAction = {
  href: string;
  label: string;
};

type StatCardProps = {
  action?: StatCardAction;
  gradient: string;
  icon: ReactNode;
  subtitle: string;
  title: string;
  value: number;
};

type WorkflowRowProps = {
  workflow: DashboardWorkflow;
};

const statusColors: Record<WorkflowStatus, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  pending: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
  processing: "bg-amber-500/10 text-amber-400 ring-amber-500/20 animate-pulse",
  queued: "bg-sky-500/10 text-sky-300 ring-sky-500/20",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const availableCredits = await CreditAccountService.getBalance(userId);

  const recentWorkflows = await db.query.workflows.findMany({
    where: eq(workflows.userId, userId),
    limit: 5,
    orderBy: [desc(workflows.createdAt)],
  });

  const [completedCount] = await db
    .select({ count: count() })
    .from(workflows)
    .where(and(eq(workflows.userId, userId), eq(workflows.status, "completed")));

  const [processingCount] = await db
    .select({ count: count() })
    .from(workflows)
    .where(and(
      eq(workflows.userId, userId),
      or(eq(workflows.status, "queued"), eq(workflows.status, "processing")),
    ));

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-white">
            Welcome, <span className="text-indigo-400">{session.user.email?.split("@")[0]}</span>
          </h1>
          <p className="font-medium text-gray-400">
            Your Growth OS is ready. Let&apos;s launch something today.
          </p>
        </div>
        <Link
          href="/dashboard/workflows/new"
          className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-black shadow-xl shadow-white/5 transition-all active:scale-95 hover:bg-gray-200"
        >
          <Plus className="h-5 w-5" />
          New Generation
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Available Credits"
          value={availableCredits}
          subtitle="Generations Remaining"
          icon={<Coins className="h-5 w-5 text-indigo-400" />}
          action={{ label: "Purchase More", href: "/dashboard/credits" }}
          gradient="from-indigo-500/10 to-transparent"
        />
        <StatCard
          title="In Progress"
          value={processingCount?.count ?? 0}
          subtitle="Active AI Generations"
          icon={<Zap className="h-5 w-5 animate-pulse text-amber-400" />}
          gradient="from-amber-500/10 to-transparent"
        />
        <StatCard
          title="Total Successes"
          value={completedCount?.count ?? 0}
          subtitle="Workflows Completed"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          gradient="from-emerald-500/10 to-transparent"
        />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-400" />
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            </div>
            <Link href="/dashboard/workflows" className="text-xs font-semibold text-gray-500 transition-colors hover:text-white">
              View History
            </Link>
          </div>

          <div className="divide-y divide-[#1C1C1F] overflow-hidden rounded-2xl border border-[#1C1C1F] bg-[#141417]/50">
            {recentWorkflows.length > 0 ? (
              recentWorkflows.map((workflow) => <WorkflowRow key={workflow.id} workflow={workflow} />)
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Suggested</h2>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 p-6">
            <div className="absolute right-0 top-0 p-4 opacity-20 transition-transform group-hover:scale-110">
              <Rocket className="h-16 w-16 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">Workflow Studio</h3>
            <p className="mb-6 text-sm font-medium leading-relaxed text-gray-300">
              Launch listing audits, competitor analysis, opportunity reports, and full launch packs from one command surface.
            </p>
            <Link href="/dashboard/workflows/new" className="inline-block rounded-lg bg-white px-4 py-2 text-xs font-bold text-black transition-transform active:scale-95">
              Open Studio
            </Link>
          </div>

          <div className="rounded-2xl border border-[#1C1C1F] bg-[#141417]/30 p-6">
            <h3 className="mb-4 text-sm font-bold text-white">Product Updates</h3>
            <ul className="space-y-4">
              <UpdateItem date="Today" text="Shipped listing intelligence, competitor analysis, and opportunity workflows" />
              <UpdateItem date="Today" text="Added scorecard export and bulk CSV queueing" />
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, action, gradient }: StatCardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-[#1C1C1F] bg-[#141417] bg-gradient-to-br p-7 transition-all hover:border-[#232326] ${gradient}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-bold uppercase tracking-widest text-gray-500">{title}</span>
        <div className="rounded-lg bg-[#1C1C1F] p-2 ring-1 ring-white/5">{icon}</div>
      </div>
      <div className="mb-1 mt-4 text-4xl font-extrabold tracking-tighter text-white">{value}</div>
      <p className="text-sm font-medium text-gray-500">{subtitle}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-6 flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 transition-colors duration-300 hover:text-indigo-300 group-hover:translate-x-1"
        >
          {action.label} <ArrowRight className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

function WorkflowRow({ workflow }: WorkflowRowProps) {
  return (
    <div className="group flex items-center justify-between p-5 transition-colors hover:bg-[#1C1C1F]/30">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-[#1C1C1F]">
          <Rocket className="h-5 w-5 text-gray-400 transition-colors group-hover:text-indigo-400" />
        </div>
        <div>
          <h4 className="mb-0.5 max-w-[200px] truncate text-sm font-bold text-white">
            {getProductName(workflow.inputData)}
          </h4>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            <span>{getWorkflowLabel(workflow.type)}</span>
            <span>&bull;</span>
            <span>{formatDistanceToNow(new Date(workflow.createdAt))} ago</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusColors[workflow.status as WorkflowStatus] ?? statusColors.pending}`}>
          {workflow.status}
        </span>
        <Link
          href={`/dashboard/workflows/${workflow.id}`}
          className="translate-x-2 rounded-lg border border-white/5 bg-[#1C1C1F] p-2 opacity-0 transition-all hover:bg-white/10 group-hover:translate-x-0 group-hover:opacity-100"
        >
          <ArrowRight className="h-4 w-4 text-white" />
        </Link>
      </div>
    </div>
  );
}

function UpdateItem({ date, text }: { date: string; text: string }) {
  return (
    <li className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{date}</span>
      <span className="text-xs font-medium leading-relaxed text-gray-300">{text}</span>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center p-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-[#1C1C1F] shadow-inner">
        <Clock className="h-8 w-8 text-gray-600" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-white">No activity recorded</h3>
      <p className="mx-auto mb-8 max-w-sm text-sm font-medium text-gray-400">
        Your first ORVEX workflow takes less than a minute to queue. Ready to generate something?
      </p>
      <Link href="/dashboard/workflows/new" className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-black shadow-xl shadow-white/5 transition-transform active:scale-95">
        Launch Now
      </Link>
    </div>
  );
}
