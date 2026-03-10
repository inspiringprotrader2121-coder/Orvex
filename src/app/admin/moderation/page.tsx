import { AdminModerationClient } from "@/components/admin/admin-moderation-client";
import { requireAdminPermission } from "@/lib/admin-auth";
import { AdminModerationService } from "@server/services/admin/admin-moderation-service";

export default async function AdminModerationPage() {
  await requireAdminPermission("admin.moderation.read");
  const data = await AdminModerationService.getModerationSnapshot();
  return <AdminModerationClient initialData={{
    items: data.items.map((item) => ({
      createdAt: item.createdAt.toISOString(),
      id: item.id,
      status: item.status,
      summary: item.summary,
      title: item.title,
      type: item.type,
    })),
    lowListings: data.lowListings,
    topListings: data.topListings,
    templates: data.templates.map((template) => ({
      category: template.category,
      downloadsCount: template.downloadsCount,
      id: template.id,
      name: template.name,
      popularityScore: template.popularityScore,
      status: template.status,
      usageCount: template.usageCount,
    })),
  }} />;
}
