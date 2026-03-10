import { db } from "@/lib/db";
import { adminAuditLogs } from "@/lib/db/schema";

type LogAdminEventInput = {
  action: string;
  actorUserId?: string | null;
  entityId?: string | null;
  entityType: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
  result?: "failure" | "success";
  targetUserId?: string | null;
};

export class AdminAuditService {
  static async log(input: LogAdminEventInput) {
    try {
      await db.insert(adminAuditLogs).values({
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        entityId: input.entityId ?? null,
        entityType: input.entityType,
        ipAddress: input.ipAddress ?? null,
        metadata: input.metadata ?? {},
        result: input.result ?? "success",
        targetUserId: input.targetUserId ?? null,
      });
    } catch (error) {
      console.error("[AdminAudit] Failed to persist log", error);
    }
  }
}
