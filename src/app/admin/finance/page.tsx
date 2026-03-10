import { AdminFinanceClient } from "@/components/admin/admin-finance-client";
import { requireAdminPermission } from "@/lib/admin-auth";
import { AdminDashboardService } from "@server/services/admin/admin-dashboard-service";

export default async function AdminFinancePage() {
  await requireAdminPermission("admin.finance.read");
  const data = await AdminDashboardService.getFinanceSnapshot();
  return <AdminFinanceClient initialData={data} />;
}
