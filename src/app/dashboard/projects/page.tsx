import { auth } from "@/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { FolderKanban, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const items = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: [desc(projects.createdAt)],
  });

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
          <Sparkles className="h-3 w-3" />
          Projects
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white">Project Library</h1>
        <p className="max-w-2xl text-sm font-medium leading-relaxed text-gray-400">
          Projects help you group related workflows. This page is now live, even if your account has not created any projects yet.
        </p>
      </header>

      <section className="rounded-3xl border border-[#1C1C1F] bg-[#141417]/50 p-6">
        {items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((project) => (
              <div key={project.id} className="rounded-2xl border border-white/5 bg-[#0A0A0B] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-indigo-500/10 p-3">
                    <FolderKanban className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{project.title}</h2>
                    <p className="text-xs text-gray-500">{new Date(project.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-400">{project.description || "No description yet."}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-6 rounded-2xl border border-white/5 bg-[#1C1C1F] p-4">
              <Rocket className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">No projects yet</h2>
            <p className="mb-8 max-w-md text-sm text-gray-400">
              Projects are optional right now, so you can keep generating workflows immediately and group them later.
            </p>
            <Link href="/dashboard/workflows/new" className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition-transform active:scale-95">
              Launch a Workflow
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
