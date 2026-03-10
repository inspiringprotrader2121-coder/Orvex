import { auth } from "@/auth";
import { ModuleEntryPage } from "@/components/marketing/module-entry-page";
import { PenTool, SearchCheck, Tags } from "lucide-react";

export default async function ForgeEntryPage() {
  const session = await auth();

  return (
    <ModuleEntryPage
      description="Forge a complete Etsy listing from product fundamentals. ORVEX generates the SEO title, description, tags, and FAQ in a single worker-backed workflow so the output is fast to review and ready to publish."
      eyebrow="Forge"
      highlights={[
        {
          description: "Turn a product idea into a polished listing without hand-writing every section.",
          icon: PenTool,
          title: "Conversion Copy",
        },
        {
          description: "Keep titles under Etsy-friendly limits while preserving strong keyword intent.",
          icon: SearchCheck,
          title: "SEO Discipline",
        },
        {
          description: "Generate tags and FAQ copy that stay consistent with the audience and tone you choose.",
          icon: Tags,
          title: "Channel Fit",
        },
      ]}
      isAuthenticated={Boolean(session?.user?.id)}
      mode="forge"
      title="Forge high-converting listing copy"
    />
  );
}
