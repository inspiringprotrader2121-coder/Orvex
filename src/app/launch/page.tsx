import { auth } from "@/auth";
import { ModuleEntryPage } from "@/components/marketing/module-entry-page";
import { CalendarRange, Flame, Send } from "lucide-react";

export default async function LaunchEntryPage() {
  const session = await auth();

  return (
    <ModuleEntryPage
      description="Launch with full-funnel marketing assets generated in one ORVEX workflow. The launch pack combines SEO titles, email copy, hooks, captions, and a day-by-day plan so teams can move from idea to campaign without switching tools."
      eyebrow="Launch"
      highlights={[
        {
          description: "Bundle short-form hooks, Pinterest captions, and email sequence copy in one output.",
          icon: Send,
          title: "Multi-Channel Assets",
        },
        {
          description: "Use a structured 14-day calendar to turn generated copy into an actual rollout.",
          icon: CalendarRange,
          title: "Execution Plan",
        },
        {
          description: "Keep the launch workflow modular so new channels can be added without rewriting the queue system.",
          icon: Flame,
          title: "Extensible Growth Engine",
        },
      ]}
      isAuthenticated={Boolean(session?.user?.id)}
      mode="launch"
      title="Launch products with campaign-ready assets"
    />
  );
}
