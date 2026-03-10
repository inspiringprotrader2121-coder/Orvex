import { auth } from "@/auth";
import { ModuleEntryPage } from "@/components/marketing/module-entry-page";
import { Compass, Lightbulb, Radar } from "lucide-react";

export default async function DiscoverEntryPage() {
  const session = await auth();

  return (
    <ModuleEntryPage
      description="Discover profitable digital product angles from a niche keyword. ORVEX estimates demand, pressure, and trend momentum, then turns that signal into structured product ideas your team can act on."
      eyebrow="Discover"
      highlights={[
        {
          description: "Model niche demand before you spend time building the wrong product.",
          icon: Compass,
          title: "Opportunity Mapping",
        },
        {
          description: "Surface product ideas with opportunity scores so your backlog stays commercially sharp.",
          icon: Lightbulb,
          title: "Idea Prioritization",
        },
        {
          description: "Use BullMQ workers to keep opportunity analysis off the request path and ready to scale.",
          icon: Radar,
          title: "Scalable Research",
        },
      ]}
      isAuthenticated={Boolean(session?.user?.id)}
      mode="opportunity"
      title="Discover what to sell next"
    />
  );
}
