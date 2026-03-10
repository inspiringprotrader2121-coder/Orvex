import { AdminUsageClient } from "@/components/admin/admin-usage-client";
import { requireAdminPermission } from "@/lib/admin-auth";
import { AdminUsageService } from "@server/services/admin/admin-usage-service";

export default async function AdminUsagePage() {
  await requireAdminPermission("admin.usage.read");
  const data = await AdminUsageService.getUsageSnapshot();
  return <AdminUsageClient initialData={data} />;
}
