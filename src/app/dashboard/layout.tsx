import Link from "next/link";
import {
    LayoutDashboard,
    Rocket,
    Settings,
    Users,
    Wallet,
    LogOut,
    Menu,
    Sparkles,
    Command
} from "lucide-react";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen bg-[#0A0A0B] text-white">
            {/* Premium Sidebar (Linear/Notion inspired) */}
            <aside className="w-64 border-r border-[#1C1C1F] flex flex-col bg-[#0A0A0B] lg:flex shrink-0 hidden">
                <div className="p-6 flex items-center gap-3">
                    <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Rocket className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Orvex
                    </span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <SidebarLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Overview" active />
                    <SidebarLink href="/dashboard/projects" icon={<Command className="w-4 h-4" />} label="Projects" />
                    <SidebarLink href="/dashboard/workflows" icon={<Rocket className="w-4 h-4" />} label="Workflows" />
                    <SidebarLink href="/dashboard/credits" icon={<Wallet className="w-4 h-4" />} label="Billing" />
                </nav>

                <div className="p-4 border-t border-[#1C1C1F]">
                    <div className="bg-[#141417] p-4 rounded-xl mb-4 border border-[#232326]">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Growth Plan</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                            You are currently on the "Early Bird" launch plan.
                        </p>
                    </div>

                    <div className="flex items-center justify-between px-2 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-[10px] font-bold">
                                {session?.user?.email?.[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-200 truncate max-w-[100px]">{session?.user?.email?.split('@')[0]}</span>
                                <span className="text-[10px] text-gray-500">Free Account</span>
                            </div>
                        </div>
                        <form action={async () => {
                            "use server";
                            await signOut();
                        }}>
                            <button type="submit" className="p-2 hover:bg-[#1C1C1F] rounded-lg transition-colors text-gray-400 hover:text-white">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-[#0A0A0B]">
                {/* Top Mobile Bar */}
                <div className="lg:hidden h-16 border-b border-[#1C1C1F] flex items-center justify-between px-6 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <Rocket className="h-5 w-5 text-indigo-500" />
                        <span className="font-bold">Orvex</span>
                    </div>
                    <button className="p-2 bg-[#1C1C1F] rounded-lg">
                        <Menu className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-8 lg:p-12 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

function SidebarLink({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                    ? "bg-[#1C1C1F] text-white shadow-sm ring-1 ring-white/10"
                    : "text-gray-400 hover:bg-[#141417] hover:text-white"
                }`}
        >
            <span className={active ? "text-indigo-400" : ""}>{icon}</span>
            {label}
        </Link>
    );
}
