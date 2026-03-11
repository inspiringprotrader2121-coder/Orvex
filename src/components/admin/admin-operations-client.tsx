"use client";

import { useState, useTransition } from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection, AdminShellCard, AdminStatCard, InlineTrendChart, StatusPill } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";
import { getErrorMessage } from "@/lib/errors";

type OperationsData = {
  averageProcessingMs: number;
  alerts: Array<{
    createdAt: string;
    id: string;
    message: string;
    severity: "critical" | "info" | "warning";
    source: string;
    status: "acknowledged" | "open" | "resolved";
    title: string;
  }>;
  autoscale: {
    enabled: boolean;
    recommendation: {
      action: "scale_down" | "scale_up" | "stable";
      backlogTrend: "falling" | "rising" | "stable";
      detail: string;
      recommendedWorkers: number;
      summary: string;
    };
  };
  health: {
    cpuLoad: number;
    dbConnected: boolean;
    diskUsedPercent: number;
    freeMemoryMb: number;
    hostname: string;
    queueDepth: number;
    redisConnected: boolean;
    totalMemoryMb: number;
    uptimeSeconds: number;
  };
  jobs: Array<{
    attemptsMade: number;
    failedReason: string | null;
    id: string;
    name: string;
    progress: number;
    queueName: string;
    state?: string;
    timestamp: number;
  }>;
  queueCounts: {
    active: number;
    completed: number;
    delayed: number;
    failed: number;
    waiting: number;
  };
  queueTrend: Array<{
    date: string;
    value: number;
  }>;
  thresholds: {
    backlogThreshold: number;
    failedJobsThreshold: number;
    paymentFailureThreshold: number;
    staleWorkerMinutes: number;
  };
  workers: Array<{
    backlogCount: number;
    canRestart: boolean;
    cpuPercent: number;
    host: string;
    id: string;
    lastHeartbeatAt: string;
    memoryMb: number;
    pm2ProcessName: string;
    queueNames: string[];
    role: string;
    status: string;
    uptimeSeconds: number;
  }>;
};

async function requestJson(url: string, init: { body?: Record<string, unknown>; method: "PATCH" | "POST" }) {
  const response = await fetch(url, {
    method: init.method,
    body: init.body ? JSON.stringify(init.body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(String(errorBody.error ?? "Request failed"));
  }

  return response.json().catch(() => null);
}

export function AdminOperationsClient({
  initialData,
}: {
  initialData: OperationsData;
}) {
  const { data, error, refresh } = useAdminResource(initialData, {
    endpoint: "/api/admin/operations",
    eventNames: ["admin.queue.updated", "admin.alert.created", "admin.worker.updated", "admin.autoscale.updated"],
    pollMs: 30_000,
  });
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();
  const avgSeconds = data.averageProcessingMs ? Math.round(data.averageProcessingMs / 100) / 10 : 0;
  const formatUptime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0m";
    }
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleQueueAction = (jobId: string, queueName: string, action: "cancel" | "retry") => {
    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          await requestJson("/api/admin/queue-actions", {
            body: { action, jobId, queueName },
            method: "POST",
          });
          await refresh();
        } catch (queueError) {
          setActionError(getErrorMessage(queueError, "Queue action failed"));
        }
      })();
    });
  };

  const handleAlertStatus = (alertId: string, status: "acknowledged" | "resolved") => {
    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          await requestJson("/api/admin/alerts", {
            body: { alertId, mode: "status", status },
            method: "PATCH",
          });
          await refresh();
        } catch (alertError) {
          setActionError(getErrorMessage(alertError, "Alert update failed"));
        }
      })();
    });
  };

  const handleThresholdUpdate = () => {
    startTransition(() => {
      void (async () => {
        try {
          const backlogThreshold = Number(window.prompt("Queue backlog threshold", String(data.thresholds.backlogThreshold)) ?? data.thresholds.backlogThreshold);
          const failedJobsThreshold = Number(window.prompt("Failed jobs threshold", String(data.thresholds.failedJobsThreshold)) ?? data.thresholds.failedJobsThreshold);
          const paymentFailureThreshold = Number(window.prompt("Payment failure threshold (24h)", String(data.thresholds.paymentFailureThreshold)) ?? data.thresholds.paymentFailureThreshold);
          const staleWorkerMinutes = Number(window.prompt("Stale worker heartbeat minutes", String(data.thresholds.staleWorkerMinutes)) ?? data.thresholds.staleWorkerMinutes);

          await requestJson("/api/admin/alerts", {
            body: {
              backlogThreshold,
              failedJobsThreshold,
              mode: "thresholds",
              paymentFailureThreshold,
              staleWorkerMinutes,
            },
            method: "PATCH",
          });
          await refresh();
        } catch (thresholdError) {
          setActionError(getErrorMessage(thresholdError, "Threshold update failed"));
        }
      })();
    });
  };

  const handleWorkerRestart = (nodeId: string) => {
    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          await requestJson("/api/admin/workers", {
            body: { action: "restart", nodeId },
            method: "POST",
          });
          await refresh();
        } catch (workerError) {
          setActionError(getErrorMessage(workerError, "Worker restart failed"));
        }
      })();
    });
  };

  const handleWorkerQueues = (nodeId: string, currentQueues: string[]) => {
    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          const promptValue = window.prompt("Queue names (comma separated)", currentQueues.join(", ")) ?? "";
          const queueNames = promptValue
            .split(",")
            .map((queue) => queue.trim())
            .filter(Boolean);

          await requestJson("/api/admin/workers", {
            body: { action: "assign", nodeId, queueNames },
            method: "POST",
          });
          await refresh();
        } catch (workerError) {
          setActionError(getErrorMessage(workerError, "Queue assignment failed"));
        }
      })();
    });
  };

  const handleAutoscale = (action: "scale_down" | "scale_up") => {
    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          await requestJson("/api/admin/autoscaling", {
            body: { action },
            method: "POST",
          });
          await refresh();
        } catch (autoscaleError) {
          setActionError(getErrorMessage(autoscaleError, "Autoscale action failed"));
        }
      })();
    });
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Operations and Reliability"
        subtitle="Monitor job pressure, worker fleet health, resource saturation, and operational alerts from a live control surface."
        title="Operations"
      />

      {error || actionError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error || actionError}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard accent="text-cyan-300" label="Waiting" note="Queued for capacity" value={data.queueCounts.waiting} />
        <AdminStatCard accent="text-amber-300" label="Active" note="Running right now" value={data.queueCounts.active} />
        <AdminStatCard accent="text-rose-300" label="Failed" note="Need retry or triage" value={data.queueCounts.failed} />
        <AdminStatCard accent="text-emerald-300" label="Completed" note="Processed successfully" value={data.queueCounts.completed} />
        <AdminStatCard accent="text-sky-300" label="Avg Time" note="Recent completion sec" value={avgSeconds} />
        <AdminStatCard accent="text-violet-300" label="Workers" note="Tracked PM2 processes" value={data.workers.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSection title="Queue Health">
          <div className="grid gap-3 md:grid-cols-2">
            {data.jobs.map((job) => (
              <AdminShellCard key={job.id} className="bg-[#0b1220]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{job.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.queueName} • attempts {job.attemptsMade}</p>
                  </div>
                    <StatusPill tone={job.failedReason ? "critical" : job.state === "completed" ? "success" : "info"}>
                      {job.state ?? job.progress + "%"}
                    </StatusPill>
                  </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(job.timestamp).toLocaleString()}
                  {job.state ? ` • ${job.state}` : ""}
                </p>
                {job.failedReason ? <p className="mt-3 text-sm text-rose-200">{job.failedReason}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQueueAction(job.id, job.queueName, "retry")}
                    disabled={job.state !== "failed"}
                    className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQueueAction(job.id, job.queueName, "cancel")}
                    disabled={job.state === "active" || job.state === "completed"}
                    className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </AdminShellCard>
            ))}
          </div>
          {data.jobs.length === 0 ? <AdminEmptyState text="No active or recent queue jobs are available yet." /> : null}
        </AdminSection>

        <AdminSection
          action={(
            <button type="button" onClick={handleThresholdUpdate} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Edit Thresholds
            </button>
          )}
          title="System Health"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <AdminShellCard className="bg-[#0b1220]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Host</p>
              <p className="mt-3 text-lg font-bold text-white">{data.health.hostname}</p>
              <p className="mt-2 text-sm text-slate-400">Uptime {Math.round(data.health.uptimeSeconds / 60)} minutes</p>
            </AdminShellCard>
            <AdminShellCard className="bg-[#0b1220]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Memory</p>
              <p className="mt-3 text-lg font-bold text-white">{data.health.freeMemoryMb}MB free</p>
              <p className="mt-2 text-sm text-slate-400">Total {data.health.totalMemoryMb}MB</p>
            </AdminShellCard>
            <AdminShellCard className="bg-[#0b1220]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Disk</p>
              <p className="mt-3 text-lg font-bold text-white">{data.health.diskUsedPercent}% used</p>
              <p className="mt-2 text-sm text-slate-400">Queue depth {data.health.queueDepth}</p>
            </AdminShellCard>
            <AdminShellCard className="bg-[#0b1220]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Dependencies</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill tone={data.health.dbConnected ? "success" : "critical"}>Postgres</StatusPill>
                <StatusPill tone={data.health.redisConnected ? "success" : "critical"}>Redis</StatusPill>
                <StatusPill tone={data.health.cpuLoad < 4 ? "success" : "warning"}>CPU {data.health.cpuLoad.toFixed(2)}</StatusPill>
              </div>
            </AdminShellCard>
          </div>
        </AdminSection>
      </div>

      <AdminSection
        action={data.autoscale.enabled ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAutoscale("scale_up")}
              className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300"
            >
              Scale Up
            </button>
            <button
              type="button"
              onClick={() => handleAutoscale("scale_down")}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300"
            >
              Scale Down
            </button>
          </div>
        ) : (
          <StatusPill tone="warning">Autoscale disabled</StatusPill>
        )}
        title="Worker Auto-Scaling"
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <InlineTrendChart color="#38bdf8" points={data.queueTrend} />
          <div className="rounded-3xl border border-white/6 bg-[#0b1220] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Recommendation</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusPill tone={data.autoscale.recommendation.action === "scale_up" ? "warning" : data.autoscale.recommendation.action === "scale_down" ? "info" : "success"}>
                {data.autoscale.recommendation.action.replace("_", " ")}
              </StatusPill>
              <p className="text-sm font-semibold text-white">{data.autoscale.recommendation.summary}</p>
            </div>
            <p className="mt-3 text-sm text-slate-400">{data.autoscale.recommendation.detail}</p>
            <p className="mt-3 text-sm text-slate-400">Recommended workers: {data.autoscale.recommendation.recommendedWorkers}</p>
          </div>
        </div>
      </AdminSection>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminSection title="Alerts and Notifications">
          <div className="space-y-3">
            {data.alerts.length > 0 ? data.alerts.map((alert) => (
              <div key={alert.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{alert.title}</p>
                    <p className="mt-2 text-sm text-slate-400">{alert.message}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{alert.source}</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <StatusPill tone={alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info"}>
                      {alert.severity}
                    </StatusPill>
                    <div className="text-xs text-slate-500">{alert.status}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleAlertStatus(alert.id, "acknowledged")} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                    Acknowledge
                  </button>
                  <button type="button" onClick={() => handleAlertStatus(alert.id, "resolved")} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                    Resolve
                  </button>
                </div>
              </div>
            )) : <AdminEmptyState text="No active alerts. Slack delivery will trigger automatically when alert thresholds are crossed." />}
          </div>
        </AdminSection>

        <AdminSection title="Worker Fleet">
          <div className="space-y-3">
            {data.workers.length > 0 ? data.workers.map((worker) => (
              <div key={worker.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{worker.pm2ProcessName}</p>
                    <p className="mt-1 text-sm text-slate-400">{worker.host} • {worker.role}</p>
                  </div>
                  <StatusPill tone={worker.status === "healthy" ? "success" : worker.status === "degraded" ? "warning" : "critical"}>
                    {worker.status}
                  </StatusPill>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  CPU {worker.cpuPercent}% • RAM {worker.memoryMb}MB • backlog {worker.backlogCount} • uptime {formatUptime(worker.uptimeSeconds)} • heartbeat {new Date(worker.lastHeartbeatAt).toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-slate-500">Assigned queues: {worker.queueNames.length ? worker.queueNames.join(", ") : "unassigned"}</p>
                <button
                  type="button"
                  onClick={() => handleWorkerRestart(worker.id)}
                  disabled={!worker.canRestart}
                  className="mt-4 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Restart
                </button>
                {!worker.canRestart ? (
                  <p className="mt-2 text-xs text-amber-300">Restart is only available for worker processes on this admin host when PM2 control is enabled.</p>
                ) : null}
                <button type="button" onClick={() => handleWorkerQueues(worker.id, worker.queueNames)} className="mt-3 rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                  Assign queues
                </button>
                <p className="mt-2 text-xs text-slate-500">Queue changes apply after restart.</p>
              </div>
            )) : <AdminEmptyState text="Worker nodes will appear here once the web, worker, and socket processes begin sending heartbeats." />}
          </div>
        </AdminSection>
      </div>

      {isPending ? <div className="text-sm text-slate-400">Applying operational change…</div> : null}
    </div>
  );
}
