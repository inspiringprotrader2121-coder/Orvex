import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminRoles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class AdminAuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AdminAuthorizationError";
  }
}

type AdminPermission = string;

const FALLBACK_ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  super_admin: ["*"],
  admin: [
    "admin.access",
    "admin.overview.read",
    "admin.usage.read",
    "admin.users.read",
    "admin.users.write",
    "admin.roles.read",
    "admin.operations.read",
    "admin.operations.write",
    "admin.finance.read",
    "admin.moderation.read",
    "admin.moderation.write",
    "admin.audit.read",
    "admin.alerts.read",
    "admin.export",
    "admin.integrations.read",
    "admin.integrations.write",
    "admin.system.read",
    "admin.features.manage",
  ],
  moderator: [
    "admin.access",
    "admin.overview.read",
    "admin.users.read",
    "admin.moderation.read",
    "admin.moderation.write",
    "admin.audit.read",
  ],
  user: [],
};

function permissionMatches(granted: string, required: string) {
  if (granted === "*" || granted === required) {
    return true;
  }

  if (granted.endsWith(".*")) {
    const prefix = granted.slice(0, -2);
    return required.startsWith(prefix);
  }

  return false;
}

function hasPermission(granted: AdminPermission[], required: AdminPermission) {
  return granted.some((permission) => permissionMatches(permission, required));
}

export async function getAdminPermissions(roleKey: string) {
  try {
    const roleRecord = await db.query.adminRoles.findFirst({
      where: eq(adminRoles.key, roleKey),
    });
    const permissions = roleRecord?.permissions as string[] | undefined;
    if (roleKey === "super_admin") {
      return permissions?.length ? permissions : ["*"];
    }
    return permissions ?? FALLBACK_ROLE_PERMISSIONS[roleKey] ?? [];
  } catch {
    return FALLBACK_ROLE_PERMISSIONS[roleKey] ?? [];
  }
}

export function hasAdminPermission(granted: AdminPermission[], required: AdminPermission) {
  return hasPermission(granted, required);
}

export async function requireAdminPermission(requiredPermission: AdminPermission) {
  const session = await requireSuperAdminSession();

  const permissions = await getAdminPermissions(session.user.role);
  if (!hasPermission(permissions, requiredPermission)) {
    throw new AdminAuthorizationError("Forbidden");
  }

  return { permissions, session };
}

export async function requireSuperAdminSession() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AdminAuthorizationError("Unauthorized");
  }

  if (session.user.role !== "super_admin") {
    throw new AdminAuthorizationError("Forbidden");
  }

  return session;
}
