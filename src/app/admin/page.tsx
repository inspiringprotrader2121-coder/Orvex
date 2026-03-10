import { AdminOverviewClient } from "@/components/admin/admin-overview-client";
import { AdminDashboardService } from "@server/services/admin/admin-dashboard-service";
import { requireAdminPermission } from "@/lib/admin-auth";

export default async function AdminOverviewPage() {
  await requireAdminPermission("admin.overview.read");
  const data = await AdminDashboardService.getOverview();
  return <AdminOverviewClient initialData={data} />;
}
