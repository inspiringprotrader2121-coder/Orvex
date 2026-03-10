import { AdminRolesClient } from "@/components/admin/admin-roles-client";
import { getAdminPermissions, hasAdminPermission, requireAdminPermission } from "@/lib/admin-auth";
import { AdminRolesService } from "@server/services/admin/admin-roles-service";

export default async function AdminRolesPage() {
  const { session } = await requireAdminPermission("admin.roles.read");
  const [roles, permissions] = await Promise.all([
    AdminRolesService.listRoles(),
    getAdminPermissions(session.user.role),
  ]);

  return (
    <AdminRolesClient
      canManage={hasAdminPermission(permissions, "admin.roles.write")}
      initialRoles={{ roles: roles.map((role) => ({
        createdAt: role.createdAt.toISOString(),
        description: role.description ?? null,
        id: role.id,
        isSystem: role.isSystem,
        key: role.key,
        name: role.name,
        permissions: role.permissions ?? [],
        updatedAt: role.updatedAt.toISOString(),
      })) }}
    />
  );
}
