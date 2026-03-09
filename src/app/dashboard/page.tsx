import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workflows, users } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import Link from "next/link";
import {
    Plus,
    Clock,
    CheckCircle2,
    Zap,
    Coins,
    ArrowRight,
    TrendingUp,
    History,
    Rocket
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

export default async function DashboardPage() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return null;

    // 1. Fetch User Stats (Credits)
    const userData = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { credits: true }
    });

    // 2. Fetch Recent Workflows
    const recentWorkflows = await db.query.workflows.findMany({
        where: eq(workflows.userId, userId),
        limit: 5,
        orderBy: [desc(workflows.createdAt)]
    });

    // 3. Count Metrics
    const [completedCount] = await db
        .select({ count: count() })
        .from(workflows)
        .where(eq(workflows.status, 'completed'));

    const [processingCount] = await db
        .select({ count: count() })
        .from(workflows)
        .where(eq(workflows.status, 'processing'));

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Hero / Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                        Welcome, <span className="text-indigo-400">{session?.user?.email?.split('@')[0]}</span>
                    </h1>
                    <p className="text-gray-400 font-medium">
                        Your Growth OS is ready. Let's launch something today.
                    </p>
                </div>
                <Link
                    href="/dashboard/workflows/new"
                    className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-xl shadow-white/5 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    New Generation
                </Link>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Available Credits"
                    value={userData?.credits ?? 0}
                    subtitle="Generations Remaining"
                    icon={<Coins className="w-5 h-5 text-indigo-400" />}
                    action={{ label: "Purchase More", href: "/dashboard/credits" }}
                    gradient="from-indigo-500/10 to-transparent"
                />
                <StatCard
                    title="In Progress"
                    value={processingCount?.count ?? 0}
                    subtitle="Active AI Generations"
                    icon={<Zap className="w-5 h-5 text-amber-400 animate-pulse" />}
                    gradient="from-amber-500/10 to-transparent"
                />
                <StatCard
                    title="Total Successes"
                    value={completedCount?.count ?? 0}
                    subtitle="Content Packs Generated"
                    icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    gradient="from-emerald-500/10 to-transparent"
                />
            </div>

            {/* Main Content Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Activity Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-gray-400" />
                            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                        </div>
                        <Link href="/dashboard/workflows" className="text-xs font-semibold text-gray-500 hover:text-white transition-colors">
                            View History
                        </Link>
                    </div>

                    <div className="bg-[#141417]/50 border border-[#1C1C1F] rounded-2xl overflow-hidden divide-y divide-[#1C1C1F]">
                        {recentWorkflows.length > 0 ? (
                            recentWorkflows.map((workflow) => (
                                <WorkflowRow key={workflow.id} workflow={workflow} />
                            ))
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                </div>

                {/* Side Recommendations */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 px-2">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xl font-bold text-white">Suggested</h2>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                            <Rocket className="w-16 h-16 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Listing Launch Pack</h3>
                        <p className="text-sm text-gray-300 leading-relaxed mb-6 font-medium">
                            Our most popular workflow. Generate SEO titles, keywords, and hooks in one click.
                        </p>
                        <Link href="/dashboard/workflows/new" className="text-xs font-bold bg-white text-black px-4 py-2 rounded-lg inline-block active:scale-95 transition-transform">
                            Start Optimization
                        </Link>
                    </div>

                    <div className="bg-[#141417]/30 border border-[#1C1C1F] p-6 rounded-2xl">
                        <h3 className="text-sm font-bold text-white mb-4">Product Updates</h3>
                        <ul className="space-y-4">
                            <UpdateItem date="Today" text="Launched Structured AI Output Engine" />
                            <UpdateItem date="Yesterday" text="Redesigned Dashboard for Growth OS" />
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon, action, gradient }: any) {
    return (
        <div className={`bg-[#141417] border border-[#1C1C1F] p-7 rounded-2xl relative overflow-hidden group hover:border-[#232326] transition-all bg-gradient-to-br ${gradient}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">{title}</span>
                <div className="bg-[#1C1C1F] p-2 rounded-lg ring-1 ring-white/5">{icon}</div>
            </div>
            <div className="text-4xl font-extrabold text-white tracking-tighter mb-1 mt-4">{value}</div>
            <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
            {action && (
                <Link href={action.href} className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 mt-6 transition-colors group-hover:translate-x-1 duration-300">
                    {action.label} <ArrowRight className="w-3 h-3" />
                </Link>
            )}
        </div>
    )
}

function WorkflowRow({ workflow }: any) {
    const statusColors: any = {
        completed: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
        processing: "bg-amber-500/10 text-amber-400 ring-amber-500/20 animate-pulse",
        failed: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
        pending: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
    }

    return (
        <div className="p-5 flex items-center justify-between hover:bg-[#1C1C1F]/30 group transition-colors">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#1C1C1F] flex items-center justify-center border border-white/5">
                    <Rocket className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white mb-0.5 truncate max-w-[200px]">
                        {(workflow.inputData as any)?.productName || 'Unnamed Product'}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        <span>{workflow.type.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(workflow.createdAt))} ago</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ring-1 ${statusColors[workflow.status]}`}>
                    {workflow.status}
                </span>
                <Link href={`/dashboard/workflows/${workflow.id}`} className="p-2 bg-[#1C1C1F] hover:bg-white/10 rounded-lg border border-white/5 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="w-4 h-4 text-white" />
                </Link>
            </div>
        </div>
    )
}

function UpdateItem({ date, text }: any) {
    return (
        <li className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{date}</span>
            <span className="text-xs text-gray-300 font-medium leading-relaxed">{text}</span>
        </li>
    )
}

function EmptyState() {
    return (
        <div className="p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#1C1C1F] rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                <Clock className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No activity recorded</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-8 font-medium">
                Generating your first launch pack takes less than 60 seconds. Ready to start?
            </p>
            <Link href="/dashboard/workflows/new" className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform shadow-xl shadow-white/5">
                Launch Now
            </Link>
        </div>
    )
}
