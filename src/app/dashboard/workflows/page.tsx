import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getProductName, getWorkflowLabel } from "@/lib/workflows";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Clock, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function WorkflowsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const items = await db.query.workflows.findMany({
    where: eq(workflows.userId, userId),
    orderBy: [desc(workflows.createdAt)],
  });

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
            <Sparkles className="h-3 w-3" />
            Workflow History
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Your Workflow Runs</h1>
          <p className="max-w-2xl text-sm font-medium leading-relaxed text-gray-400">
            Review every workflow, reopen completed artifacts, and track jobs that are still moving through the worker queue.
          </p>
        </div>
        <Link href="/dashboard/workflows/new" className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition-transform active:scale-95">
          Start New Workflow
        </Link>
      </header>

      <section className="rounded-3xl border border-[#1C1C1F] bg-[#141417]/50 p-6">
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/dashboard/workflows/${workflow.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0A0A0B] px-5 py-4 transition-colors hover:border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-[#141417] p-3">
                    <Rocket className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{getProductName(workflow.inputData)}</p>
                    <p className="text-xs uppercase tracking-wider text-gray-500">{getWorkflowLabel(workflow.type)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{workflow.status}</span>
                  <ArrowRight className="h-4 w-4 text-gray-500" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-6 rounded-2xl border border-white/5 bg-[#1C1C1F] p-4">
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">No workflows yet</h2>
            <p className="mb-8 max-w-md text-sm text-gray-400">Run your first generation and it will show up here with real-time status updates.</p>
            <Link href="/dashboard/workflows/new" className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition-transform active:scale-95">
              Create First Workflow
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
