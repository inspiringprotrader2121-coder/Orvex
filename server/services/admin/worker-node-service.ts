import { db } from "@/lib/db";
import { workerNodes } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";

type WorkerNodeHeartbeatInput = {
  backlogCount?: number;
  cpuPercent?: number;
  host: string;
  memoryMb?: number;
  metadata?: Record<string, unknown>;
  nodeName: string;
  pm2ProcessName: string;
  queueNames?: string[];
  role: "socket" | "web" | "worker";
  status?: "degraded" | "healthy" | "offline";
  uptimeSeconds?: number;
};

export class WorkerNodeService {
  static async getAssignedQueues(input: {
    fallbackQueues: string[];
    host: string;
    pm2ProcessName: string;
    role: "socket" | "web" | "worker";
  }) {
    const node = await db.query.workerNodes.findFirst({
      where: and(
        eq(workerNodes.host, input.host),
        eq(workerNodes.pm2ProcessName, input.pm2ProcessName),
        eq(workerNodes.role, input.role),
      ),
    });

    const assignedQueueNames = Array.isArray((node?.metadata as { assignedQueueNames?: unknown[] } | undefined)?.assignedQueueNames)
      ? ((node?.metadata as { assignedQueueNames?: unknown[] }).assignedQueueNames ?? []).map((queue) => String(queue).trim()).filter(Boolean)
      : [];
    const queueNames = assignedQueueNames.length > 0
      ? assignedQueueNames
      : Array.isArray(node?.queueNames)
        ? node.queueNames.map((queue) => String(queue).trim()).filter(Boolean)
        : [];

    return queueNames.length > 0 ? queueNames : input.fallbackQueues;
  }

  static async heartbeat(input: WorkerNodeHeartbeatInput) {
    const existing = await db.query.workerNodes.findFirst({
      where: and(
        eq(workerNodes.host, input.host),
        eq(workerNodes.pm2ProcessName, input.pm2ProcessName),
        eq(workerNodes.role, input.role),
      ),
    });

    const mergedMetadata = {
      ...((existing?.metadata as Record<string, unknown> | undefined) ?? {}),
      ...(input.metadata ?? {}),
    };
    const nextQueueNames = input.queueNames ?? (
      Array.isArray(existing?.queueNames)
        ? existing.queueNames.map((queue) => String(queue).trim()).filter(Boolean)
        : []
    );

    await db.insert(workerNodes).values({
      backlogCount: input.backlogCount ?? 0,
      cpuPercent: input.cpuPercent ?? 0,
      host: input.host,
      lastHeartbeatAt: new Date(),
      memoryMb: input.memoryMb ?? 0,
      metadata: mergedMetadata,
      nodeName: input.nodeName,
      pm2ProcessName: input.pm2ProcessName,
      queueNames: nextQueueNames,
      role: input.role,
      status: input.status ?? "healthy",
      uptimeSeconds: input.uptimeSeconds ?? 0,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [workerNodes.host, workerNodes.role, workerNodes.pm2ProcessName],
      set: {
        backlogCount: input.backlogCount ?? 0,
        cpuPercent: input.cpuPercent ?? 0,
        lastHeartbeatAt: new Date(),
        memoryMb: input.memoryMb ?? 0,
        metadata: mergedMetadata,
        nodeName: input.nodeName,
        queueNames: nextQueueNames,
        status: input.status ?? "healthy",
        updatedAt: new Date(),
        uptimeSeconds: input.uptimeSeconds ?? 0,
      },
    });
  }

  static async markStaleNodesOffline(staleAfterMs = 180_000) {
    const cutoff = new Date(Date.now() - staleAfterMs);
    await db.update(workerNodes).set({
      status: "offline",
      updatedAt: new Date(),
    }).where(and(
      eq(workerNodes.status, "healthy"),
      lt(workerNodes.lastHeartbeatAt, cutoff),
    ));
  }
}
