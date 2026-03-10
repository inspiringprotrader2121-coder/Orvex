import { signOut } from "@/auth";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Coins,
  LayoutDashboard,
  LogOut,
  Shield,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const adminNav = [
  { href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview" },
  { href: "/admin/users", icon: <Users className="h-4 w-4" />, label: "Users" },
  { href: "/admin/roles", icon: <Shield className="h-4 w-4" />, label: "Roles" },
  { href: "/admin/operations", icon: <Workflow className="h-4 w-4" />, label: "Operations" },
  { href: "/admin/credits", icon: <Coins className="h-4 w-4" />, label: "Credits" },
  { href: "/admin/usage", icon: <Sparkles className="h-4 w-4" />, label: "AI Usage" },
  { href: "/admin/finance", icon: <BarChart3 className="h-4 w-4" />, label: "Revenue" },
  { href: "/admin/moderation", icon: <Shield className="h-4 w-4" />, label: "Moderation" },
  { href: "/admin/audit", icon: <Activity className="h-4 w-4" />, label: "Audit" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = await requireAdminPermission("admin.access");

  return (
    <div className="min-h-screen bg-[#07111d] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-white/6 bg-[#08111d] px-6 py-8 lg:block">
          <div className="rounded-[2rem] border border-cyan-400/10 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300">Orvex Control Plane</p>
            <h1 className="mt-3 text-3xl font-black">Super Admin</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Operate queues, users, credits, revenue, moderation, and system health from one control surface.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-[2rem] border border-white/6 bg-[#0d1725] p-5">
            <p className="text-xs font-semibold text-slate-300">{session.user.email}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-cyan-300">{session.user.role.replace("_", " ")}</p>
            <div className="mt-5 flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Product App
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-6 py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
