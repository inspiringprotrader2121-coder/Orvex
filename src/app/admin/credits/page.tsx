import { AdminCreditsClient } from "@/components/admin/admin-credits-client";
import { getAdminPermissions, hasAdminPermission, requireAdminPermission } from "@/lib/admin-auth";
import { AdminCreditsService } from "@server/services/admin/admin-credits-service";

export default async function AdminCreditsPage() {
  const { session } = await requireAdminPermission("admin.finance.read");
  const [balances, records, permissions] = await Promise.all([
    AdminCreditsService.listCreditBalances(),
    AdminCreditsService.listBillingRecords(),
    getAdminPermissions(session.user.role),
  ]);

  return (
    <AdminCreditsClient
      canManage={hasAdminPermission(permissions, "admin.users.write")}
      initialData={{
        balances,
        records,
      }}
    />
  );
}
