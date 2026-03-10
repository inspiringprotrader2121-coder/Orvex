import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminRoles } from "@/lib/db/schema";
import { createAdminRealtimeEvent } from "@/lib/admin/events";
import { notifyAdminEvent } from "@/lib/socket-internal";
import { AdminAuditService } from "./admin-audit-service";

type RoleInput = {
  actorUserId: string;
  description?: string | null;
  id?: string | null;
  ipAddress?: string | null;
  isSystem?: boolean;
  key: string;
  name: string;
  permissions: string[];
};

type DeleteRoleInput = {
  actorUserId: string;
  id: string;
  ipAddress?: string | null;
};

function normalizePermissions(input: string[]) {
  return Array.from(new Set(input.map((permission) => permission.trim()).filter(Boolean)));
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

export class AdminRolesService {
  static async listRoles() {
    return db.query.adminRoles.findMany({
      orderBy: [desc(adminRoles.isSystem), adminRoles.key],
    });
  }

  static async upsertRole(input: RoleInput) {
    const key = normalizeKey(input.key);
    const permissions = normalizePermissions(input.permissions);

    if (input.id) {
      const existing = await db.query.adminRoles.findFirst({
        where: eq(adminRoles.id, input.id),
      });

      if (!existing) {
        throw new Error("Role not found");
      }

      if (existing.isSystem && key !== existing.key) {
        throw new Error("System role keys cannot be changed");
      }

      await db.update(adminRoles).set({
        description: input.description ?? null,
        isSystem: existing.isSystem,
        key,
        name: input.name.trim(),
        permissions,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      }).where(eq(adminRoles.id, existing.id));

      await AdminAuditService.log({
        action: "admin_role.updated",
        actorUserId: input.actorUserId,
        entityId: existing.id,
        entityType: "admin_role",
        ipAddress: input.ipAddress,
        metadata: { key, name: input.name, permissions },
      });
    } else {
      await db.insert(adminRoles).values({
        description: input.description ?? null,
        isSystem: input.isSystem ?? false,
        key,
        name: input.name.trim(),
        permissions,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      });

      await AdminAuditService.log({
        action: "admin_role.created",
        actorUserId: input.actorUserId,
        entityId: key,
        entityType: "admin_role",
        ipAddress: input.ipAddress,
        metadata: { key, name: input.name, permissions },
      });
    }

    notifyAdminEvent(createAdminRealtimeEvent({
      action: "updated",
      entity: "admin_role",
      entityId: key,
      payload: { key },
      type: "admin.data.changed",
    }));
  }

  static async deleteRole(input: DeleteRoleInput) {
    const existing = await db.query.adminRoles.findFirst({
      where: eq(adminRoles.id, input.id),
    });

    if (!existing) {
      throw new Error("Role not found");
    }

    if (existing.isSystem) {
      throw new Error("System roles cannot be deleted");
    }

    await db.delete(adminRoles).where(eq(adminRoles.id, existing.id));

    await AdminAuditService.log({
      action: "admin_role.deleted",
      actorUserId: input.actorUserId,
      entityId: existing.id,
      entityType: "admin_role",
      ipAddress: input.ipAddress,
      metadata: { key: existing.key, name: existing.name },
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: "deleted",
      entity: "admin_role",
      entityId: existing.id,
      payload: { key: existing.key },
      type: "admin.data.changed",
    }));
  }
}
