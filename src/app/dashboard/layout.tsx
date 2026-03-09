import { auth, signOut } from "@/auth";
import {
  BarChart3,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  Rocket,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#1C1C1F] bg-[#0A0A0B] lg:flex">
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            Orvex
          </span>
        </div>

        <nav className="mt-4 flex-1 space-y-2 px-4">
          <SidebarLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Overview" />
          <SidebarLink href="/dashboard/analysis" icon={<BarChart3 className="h-4 w-4" />} label="Analysis" />
          <SidebarLink href="/dashboard/projects" icon={<Command className="h-4 w-4" />} label="Projects" />
          <SidebarLink href="/dashboard/workflows" icon={<Rocket className="h-4 w-4" />} label="Workflows" />
          <SidebarLink href="/dashboard/credits" icon={<Wallet className="h-4 w-4" />} label="Billing" />
        </nav>

        <div className="border-t border-[#1C1C1F] p-4">
          <div className="mb-4 rounded-xl border border-[#232326] bg-[#141417] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Growth Plan</span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-gray-400">
              You are currently on the &ldquo;Early Bird&rdquo; launch plan.
            </p>
          </div>

          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-[10px] font-bold">
                {session.user.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="max-w-[100px] truncate text-xs font-medium text-gray-200">{session.user.email?.split("@")[0]}</span>
                <span className="text-[10px] text-gray-500">Free Account</span>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button type="submit" className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#1C1C1F] hover:text-white">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#0A0A0B]">
        <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#1C1C1F] bg-[#0A0A0B]/80 px-6 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-indigo-500" />
            <span className="font-bold">Orvex</span>
          </div>
          <button className="rounded-lg bg-[#1C1C1F] p-2">
            <Menu className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="mx-auto max-w-7xl p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-all hover:bg-[#141417] hover:text-white"
    >
      {icon}
      {label}
    </Link>
  );
}
