import { AdminAuditClient } from "@/components/admin/admin-audit-client";
import { requireAdminPermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { adminAuditLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function AdminAuditPage() {
  await requireAdminPermission("admin.audit.read");
  const logs = await db.query.adminAuditLogs.findMany({
    limit: 100,
    orderBy: [desc(adminAuditLogs.createdAt)],
  });

  return <AdminAuditClient initialData={{ logs: logs.map((log) => ({
    action: log.action,
    actorUserId: log.actorUserId,
    createdAt: log.createdAt.toISOString(),
    entityId: log.entityId,
    entityType: log.entityType,
    id: log.id,
    result: log.result,
  })) }} />;
}
