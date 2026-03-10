import { AdminOperationsClient } from "@/components/admin/admin-operations-client";
import { requireAdminPermission } from "@/lib/admin-auth";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export default async function AdminOperationsPage() {
  await requireAdminPermission("admin.operations.read");
  const data = await AdminOperationsService.getOperationsSnapshot();
  return <AdminOperationsClient initialData={{
    averageProcessingMs: data.averageProcessingMs,
    alerts: data.alerts.map((alert) => ({
      createdAt: alert.createdAt.toISOString(),
      id: alert.id,
      message: alert.message,
      severity: alert.severity,
      source: alert.source,
      status: alert.status,
      title: alert.title,
    })),
    autoscale: data.autoscale,
    health: data.health,
    jobs: data.jobs,
    queueCounts: {
      active: data.queueCounts.active ?? 0,
      completed: data.queueCounts.completed ?? 0,
      delayed: data.queueCounts.delayed ?? 0,
      failed: data.queueCounts.failed ?? 0,
      waiting: data.queueCounts.waiting ?? 0,
    },
    queueTrend: data.queueTrend,
    thresholds: data.thresholds,
    workers: data.workers.map((worker) => {
      const assignedQueueNames = Array.isArray((worker.metadata as { assignedQueueNames?: unknown[] } | undefined)?.assignedQueueNames)
        ? ((worker.metadata as { assignedQueueNames?: unknown[] }).assignedQueueNames ?? []).map((queue) => String(queue))
        : [];

      return {
        backlogCount: worker.backlogCount,
        cpuPercent: worker.cpuPercent,
        host: worker.host,
        id: worker.id,
        lastHeartbeatAt: worker.lastHeartbeatAt.toISOString(),
        memoryMb: worker.memoryMb,
        pm2ProcessName: worker.pm2ProcessName,
        queueNames: assignedQueueNames.length > 0 ? assignedQueueNames : (worker.queueNames ?? []).map((queue) => String(queue)),
        role: worker.role,
        status: worker.status,
        uptimeSeconds: worker.uptimeSeconds,
      };
    }),
  }} />;
}
