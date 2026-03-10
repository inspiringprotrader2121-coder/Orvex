import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { AdminUsersService } from "@server/services/admin/admin-users-service";
import { requireAdminPermission } from "@/lib/admin-auth";

export default async function AdminUsersPage() {
  const { session } = await requireAdminPermission("admin.users.read");
  const [users, connections, toggles] = await Promise.all([
    AdminUsersService.listUsers({ limit: 100 }),
    AdminUsersService.listStoreConnections(),
    AdminUsersService.listFeatureToggles(),
  ]);

  return (
    <AdminUsersClient
      currentUserId={session.user.id}
      initialConnections={{ connections: connections.map((connection) => ({
        apiStatus: connection.apiStatus,
        id: connection.id,
        lastSyncAt: connection.lastSyncAt?.toISOString?.() ?? null,
        platform: connection.platform,
        productsCount: connection.productsCount,
        status: connection.status,
        storeName: connection.storeName,
        userEmail: connection.user?.email ?? null,
        userId: connection.userId,
      })) }}
      initialToggles={{ toggles: toggles.map((toggle) => ({
        description: toggle.description,
        id: toggle.id,
        key: toggle.key,
        scope: toggle.scope,
        state: toggle.state,
        subscriptionTier: toggle.subscriptionTier,
        updatedAt: toggle.updatedAt.toISOString(),
        userId: toggle.userId,
      })) }}
      initialUsers={{ users }}
    />
  );
}
