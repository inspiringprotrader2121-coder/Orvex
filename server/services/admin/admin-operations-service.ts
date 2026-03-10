import os from "node:os";
import { statfs } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { db, pool } from "@/lib/db";
import { getCacheRedisClient } from "@/lib/cache";
import { adminAlerts, adminQueueMetrics, adminSettings, workerNodes } from "@/lib/db/schema";
import { createAdminRealtimeEvent } from "@/lib/admin/events";
import { notifyAdminEvent } from "@/lib/socket-internal";
import { desc, eq } from "drizzle-orm";
import { getWorkflowQueue } from "@server/queues/workflow-queue";
import { AdminAuditService } from "./admin-audit-service";
import { AdminAlertService, type AlertThresholds } from "./admin-alert-service";
import { WorkerNodeService } from "./worker-node-service";

const execAsync = promisify(exec);

type QueueActionInput = {
  action: "cancel" | "retry";
  actorUserId: string;
  ipAddress?: string | null;
  jobId: string;
};

type AlertStatusInput = {
  actorUserId: string;
  alertId: string;
  status: "acknowledged" | "resolved";
};

type ThresholdsInput = {
  actorUserId: string;
  backlogThreshold: number;
  failedJobsThreshold: number;
  paymentFailureThreshold: number;
  staleWorkerMinutes: number;
};

type WorkerActionInput = {
  action: "assign" | "restart";
  actorUserId: string;
  ipAddress?: string | null;
  nodeId: string;
  queueNames?: string[] | null;
};

type QueueMetricPoint = {
  createdAt: Date;
  queueDepth: number;
  workerCount: number;
};

type ScalingRecommendation = {
  action: "scale_down" | "scale_up" | "stable";
  backlogTrend: "falling" | "rising" | "stable";
  detail: string;
  recommendedWorkers: number;
  summary: string;
};

async function getAlertThresholds(): Promise<AlertThresholds> {
  return AdminAlertService.getAlertThresholds();
}

async function recordQueueMetric(input: {
  queueDepth: number;
  queueCounts: {
    active: number;
    completed: number;
    delayed: number;
    failed: number;
    waiting: number;
  };
  workerCount: number;
}) {
  const latest = await db.query.adminQueueMetrics.findFirst({
    orderBy: [desc(adminQueueMetrics.createdAt)],
  });

  const now = Date.now();
  if (latest && now - latest.createdAt.getTime() < 60_000) {
    return;
  }

  await db.insert(adminQueueMetrics).values({
    active: input.queueCounts.active,
    completed: input.queueCounts.completed,
    delayed: input.queueCounts.delayed,
    failed: input.queueCounts.failed,
    queueDepth: input.queueDepth,
    waiting: input.queueCounts.waiting,
    workerCount: input.workerCount,
  });
}

function computeScalingRecommendation(input: {
  backlogThreshold: number;
  metrics: QueueMetricPoint[];
  queueDepth: number;
  workerCount: number;
}): ScalingRecommendation {
  const ordered = [...input.metrics].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const delta = first && last ? last.queueDepth - first.queueDepth : 0;
  const slope = ordered.length > 1 ? delta / (ordered.length - 1) : 0;
  const backlogTrend: ScalingRecommendation["backlogTrend"] = slope > 1 ? "rising" : slope < -1 ? "falling" : "stable";

  const backlogThreshold = input.backlogThreshold;
  const highPressure = input.queueDepth >= backlogThreshold;
  const risingPressure = backlogTrend === "rising" && input.queueDepth >= Math.round(backlogThreshold * 0.7);
  const lowPressure = input.queueDepth <= Math.round(backlogThreshold * 0.35);

  if ((highPressure || risingPressure) && input.workerCount > 0) {
    const recommendedWorkers = input.workerCount + 1;
    return {
      action: "scale_up",
      backlogTrend,
      detail: `Queue depth is ${input.queueDepth} with a ${backlogTrend} backlog. Adding capacity should stabilize throughput.`,
      recommendedWorkers,
      summary: "Scale up recommended",
    };
  }

  if (lowPressure && backlogTrend !== "rising" && input.workerCount > 1) {
    const recommendedWorkers = Math.max(1, input.workerCount - 1);
    return {
      action: "scale_down",
      backlogTrend,
      detail: `Queue depth is ${input.queueDepth} with a ${backlogTrend} backlog. You can safely release capacity.`,
      recommendedWorkers,
      summary: "Scale down recommended",
    };
  }

  return {
    action: "stable",
    backlogTrend,
    detail: `Queue depth is ${input.queueDepth} and trending ${backlogTrend}. No scaling action needed.`,
    recommendedWorkers: input.workerCount,
    summary: "Capacity is stable",
  };
}

export class AdminOperationsService {
  static async getOperationsSnapshot() {
    await WorkerNodeService.heartbeat({
      cpuPercent: Math.round((os.loadavg()[0] ?? 0) * 100),
      host: os.hostname(),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      nodeName: process.env.WEB_NODE_NAME || "orvex-web",
      pm2ProcessName: "orvex-web",
      role: "web",
      status: "healthy",
      uptimeSeconds: Math.round(process.uptime()),
    });

    await WorkerNodeService.markStaleNodesOffline();

    const thresholds = await getAlertThresholds();
    const workflowQueue = getWorkflowQueue();
    const queueCounts = await workflowQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    const [jobs, completedJobs, workers, dbStatus, redisStatus, alerts] = await Promise.all([
      workflowQueue.getJobs(["active", "waiting", "failed", "delayed", "completed"], 0, 20, true),
      workflowQueue.getJobs(["completed"], 0, 50, true),
      db.query.workerNodes.findMany({
        limit: 20,
        orderBy: [desc(workerNodes.updatedAt)],
      }),
      pool.query("select 1 as ok"),
      getCacheRedisClient()?.ping().catch(() => null) ?? Promise.resolve(null),
      db.query.adminAlerts.findMany({
        limit: 12,
        orderBy: [desc(adminAlerts.createdAt)],
      }),
    ]);

    const staleWorkers = workers.filter((worker) => worker.status === "offline").length;
    const queueDepth = queueCounts.waiting + queueCounts.active + queueCounts.delayed;
    const workerCount = workers.length;

    await recordQueueMetric({
      queueCounts: {
        active: queueCounts.active ?? 0,
        completed: queueCounts.completed ?? 0,
        delayed: queueCounts.delayed ?? 0,
        failed: queueCounts.failed ?? 0,
        waiting: queueCounts.waiting ?? 0,
      },
      queueDepth,
      workerCount,
    });

    if (queueDepth >= thresholds.backlogThreshold) {
      await AdminAlertService.ensureAlert({
        message: `Queue backlog reached ${queueDepth} jobs.`,
        observedValue: queueDepth,
        severity: "warning",
        source: "bullmq",
        thresholdValue: thresholds.backlogThreshold,
        title: "Queue backlog threshold exceeded",
      });
    }

    if (queueCounts.failed >= thresholds.failedJobsThreshold) {
      await AdminAlertService.ensureAlert({
        message: `Failed job count reached ${queueCounts.failed} jobs.`,
        observedValue: queueCounts.failed,
        severity: "critical",
        source: "bullmq",
        thresholdValue: thresholds.failedJobsThreshold,
        title: "Failed jobs threshold exceeded",
      });
    }

    if (staleWorkers > 0) {
      await AdminAlertService.ensureAlert({
        message: `${staleWorkers} worker nodes have gone offline or missed their heartbeat window.`,
        observedValue: staleWorkers,
        severity: "critical",
        source: "worker-node",
        thresholdValue: 0,
        title: "Worker heartbeat missing",
      });
    }

    const diskStats = await statfs(process.cwd()).catch(() => null);
    const totalDisk = diskStats ? Number(diskStats.blocks) * Number(diskStats.bsize) : 0;
    const freeDisk = diskStats ? Number(diskStats.bavail) * Number(diskStats.bsize) : 0;
    const usedDiskPercent = totalDisk > 0 ? Math.round(((totalDisk - freeDisk) / totalDisk) * 100) : 0;

    const averageProcessingMs = (() => {
      const durations = completedJobs
        .map((job) => {
          if (!job.finishedOn) {
            return null;
          }
          const started = job.processedOn ?? job.timestamp ?? 0;
          return job.finishedOn - started;
        })
        .filter((value): value is number => typeof value === "number" && value > 0);

      if (!durations.length) {
        return 0;
      }

      const total = durations.reduce((sum, value) => sum + value, 0);
      return Math.round(total / durations.length);
    })();

    const jobStates = await Promise.all(jobs.map(async (job) => ({
      job,
      state: await job.getState(),
    })));

    const metrics = await db.query.adminQueueMetrics.findMany({
      limit: 36,
      orderBy: [desc(adminQueueMetrics.createdAt)],
    });
    const orderedMetrics = [...metrics].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const queueTrend = orderedMetrics.map((metric) => ({
      date: metric.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      value: metric.queueDepth,
    }));
    const scalingRecommendation = computeScalingRecommendation({
      backlogThreshold: thresholds.backlogThreshold,
      metrics: metrics.map((metric) => ({
        createdAt: metric.createdAt,
        queueDepth: metric.queueDepth,
        workerCount: metric.workerCount,
      })),
      queueDepth,
      workerCount,
    });

    return {
      alerts,
      averageProcessingMs,
      autoscale: {
        enabled: process.env.ENABLE_ADMIN_AUTOSCALE_ACTIONS === "true",
        recommendation: scalingRecommendation,
      },
      health: {
        cpuLoad: os.loadavg()[0] ?? 0,
        dbConnected: dbStatus.rows.length > 0,
        diskUsedPercent: usedDiskPercent,
        freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
        hostname: os.hostname(),
        queueDepth,
        redisConnected: redisStatus === "PONG",
        totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
        uptimeSeconds: Math.round(os.uptime()),
      },
      jobs: jobStates.map(({ job, state }) => ({
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason ?? null,
        id: String(job.id),
        name: job.name,
        progress: typeof job.progress === "number" ? job.progress : 0,
        queueName: job.queueName,
        state,
        timestamp: job.timestamp,
      })),
      queueTrend,
      queueCounts,
      thresholds,
      workers,
    };
  }

  static async handleQueueAction(input: QueueActionInput) {
    const job = await getWorkflowQueue().getJob(input.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    if (input.action === "retry") {
      await job.retry();
    } else {
      const state = await job.getState();
      if (state === "active") {
        throw new Error("Active jobs cannot be cancelled safely");
      }
      await job.remove();
    }

    await AdminAuditService.log({
      action: `queue.${input.action}`,
      actorUserId: input.actorUserId,
      entityId: String(job.id),
      entityType: "queue_job",
      ipAddress: input.ipAddress,
      metadata: {
        jobName: job.name,
        queueName: job.queueName,
      },
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: input.action,
      entity: "queue_job",
      entityId: String(job.id),
      payload: {
        jobName: job.name,
        queueName: job.queueName,
      },
      type: "admin.queue.updated",
    }));
  }

  static async updateAlertStatus(input: AlertStatusInput) {
    await db.update(adminAlerts).set({
      acknowledgedByUserId: input.actorUserId,
      resolvedAt: input.status === "resolved" ? new Date() : null,
      status: input.status,
      updatedAt: new Date(),
    }).where(eq(adminAlerts.id, input.alertId));

    await AdminAuditService.log({
      action: `alert.${input.status}`,
      actorUserId: input.actorUserId,
      entityId: input.alertId,
      entityType: "admin_alert",
    });
  }

  static async updateThresholds(input: ThresholdsInput) {
    const existing = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, "alert_thresholds"),
    });

    if (existing) {
      await db.update(adminSettings).set({
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
        value: input,
      }).where(eq(adminSettings.id, existing.id));
    } else {
      await db.insert(adminSettings).values({
        key: "alert_thresholds",
        updatedByUserId: input.actorUserId,
        value: input,
      });
    }

    await AdminAuditService.log({
      action: "alert.thresholds_updated",
      actorUserId: input.actorUserId,
      entityId: "alert_thresholds",
      entityType: "admin_setting",
      metadata: input,
    });
  }

  static async handleWorkerAction(input: WorkerActionInput) {
    const node = await db.query.workerNodes.findFirst({
      where: eq(workerNodes.id, input.nodeId),
    });

    if (!node) {
      throw new Error("Worker node not found");
    }

      if (input.action === "assign") {
        const nextQueues = (input.queueNames ?? []).map((queue) => queue.trim()).filter(Boolean);
        await db.update(workerNodes).set({
          metadata: {
            ...((node.metadata as Record<string, unknown> | undefined) ?? {}),
            assignedQueueNames: nextQueues,
          },
          updatedAt: new Date(),
        }).where(eq(workerNodes.id, node.id));

      await AdminAuditService.log({
        action: "worker.assign",
        actorUserId: input.actorUserId,
        entityId: node.id,
        entityType: "worker_node",
        ipAddress: input.ipAddress,
        metadata: {
          pm2ProcessName: node.pm2ProcessName,
          queueNames: nextQueues,
        },
      });

      notifyAdminEvent(createAdminRealtimeEvent({
        action: "assign",
        entity: "worker_node",
        entityId: node.id,
        payload: {
          pm2ProcessName: node.pm2ProcessName,
          queueNames: nextQueues,
        },
        type: "admin.worker.updated",
      }));

      return {
        executed: true,
        result: `Queues assigned: ${nextQueues.join(", ") || "none"}`,
      };
    }

    const canRunPm2 = process.env.ENABLE_ADMIN_PM2_ACTIONS === "true";
    let result = "pm2 actions disabled";

    if (canRunPm2 && input.action === "restart") {
      const { stdout, stderr } = await execAsync(`pm2 restart ${node.pm2ProcessName}`);
      result = [stdout, stderr].filter(Boolean).join("\n").trim() || "pm2 restart requested";
    }

    await AdminAuditService.log({
      action: `worker.${input.action}`,
      actorUserId: input.actorUserId,
      entityId: node.id,
      entityType: "worker_node",
      ipAddress: input.ipAddress,
      metadata: {
        pm2ProcessName: node.pm2ProcessName,
        result,
      },
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: input.action,
      entity: "worker_node",
      entityId: node.id,
      payload: {
        pm2ProcessName: node.pm2ProcessName,
        result,
      },
      type: "admin.worker.updated",
    }));

    return {
      executed: canRunPm2,
      result,
    };
  }

  static async handleAutoscaleAction(input: { action: "scale_down" | "scale_up"; actorUserId: string; ipAddress?: string | null }) {
    const autoscaleEnabled = process.env.ENABLE_ADMIN_AUTOSCALE_ACTIONS === "true";
    if (!autoscaleEnabled) {
      throw new Error("Autoscaling actions are disabled");
    }

    const scriptPath = input.action === "scale_up"
      ? process.env.AUTOSCALE_SCRIPT_UP
      : process.env.AUTOSCALE_SCRIPT_DOWN;

    if (!scriptPath) {
      throw new Error("Autoscaling script path not configured");
    }

    const { stdout, stderr } = await execAsync(scriptPath);
    const result = [stdout, stderr].filter(Boolean).join("\n").trim() || "Autoscale script executed";

    await AdminAuditService.log({
      action: `autoscale.${input.action}`,
      actorUserId: input.actorUserId,
      entityId: input.action,
      entityType: "autoscale_action",
      ipAddress: input.ipAddress,
      metadata: {
        scriptPath,
        result,
      },
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: input.action,
      entity: "autoscale_action",
      entityId: input.action,
      payload: {
        result,
      },
      type: "admin.autoscale.updated",
    }));

    return { result };
  }
}
