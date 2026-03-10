import { auth } from "@/auth";
import { ModuleEntryPage } from "@/components/marketing/module-entry-page";
import { BarChart3, ScanSearch, Swords } from "lucide-react";

export default async function OptimizeEntryPage() {
  const session = await auth();

  return (
    <ModuleEntryPage
      description="Optimize existing listings with ORVEX intelligence. Paste an Etsy URL and the worker pipeline scrapes the page, scores SEO and conversion quality, and returns structured recommendations your team can ship."
      eyebrow="Optimize"
      highlights={[
        {
          description: "Inspect listing quality through scorecards, keyword gaps, and optimized replacements.",
          icon: BarChart3,
          title: "Listing Intelligence",
        },
        {
          description: "Run competitor analysis with the same workflow spine to compare positioning and missed angles.",
          icon: Swords,
          title: "Competitive Insight",
        },
        {
          description: "Keep heavy scraping and model calls inside workers so the dashboard stays responsive.",
          icon: ScanSearch,
          title: "Worker-First Analysis",
        },
      ]}
      isAuthenticated={Boolean(session?.user?.id)}
      mode="listing"
      title="Optimize what is already live"
    />
  );
}
