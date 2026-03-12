import "dotenv/config";
import os from "node:os";
import { Worker } from "bullmq";
import { getErrorMessage } from "./lib/errors";
import {
  getWorkflowQueueConnection,
  getWorkflowQueue,
  type OrvexWorkflowJob,
} from "@server/queues/workflow-queue";
import {
  getMockupQueueConnection,
  getMockupQueue,
  type MockupGenerationJob,
} from "@server/queues/mockup-queue";
import { WorkerNodeService } from "@server/services/admin/worker-node-service";
import { WorkflowOutboxService } from "@server/services/workflow-outbox-service";
import { processWorkflowJob, workflowWorkerRuntimeConfig } from "@server/workers/workflow-processor";
import { mockupWorkerRuntimeConfig, processMockupJob } from "@server/workers/mockup-processor";

const host = os.hostname();
const nodeName = process.env.WORKER_NODE_NAME || "orvex-worker";
const pm2ProcessName = "orvex-worker";

type WorkerSet = {
  mockupWorker: Worker<MockupGenerationJob> | null;
  queueNames: string[];
  workflowWorker: Worker<OrvexWorkflowJob> | null;
};

function getFallbackQueues() {
  const fromEnv = (process.env.WORKER_QUEUE_NAMES ?? "")
    .split(",")
    .map((queue) => queue.trim())
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : ["workflows", "mockups"];
}

function attachWorkerLogging(workflowWorker: Worker<OrvexWorkflowJob> | null, mockupWorker: Worker<MockupGenerationJob> | null) {
  workflowWorker?.on("completed", (job) => {
    if (job) {
      console.log(`[Worker] Workflow job ${job.id} (${job.name}) completed.`);
    }
  });

  workflowWorker?.on("failed", (job, error) => {
    console.log(`[Worker] Workflow job ${job?.id} (${job?.name}) failed: ${getErrorMessage(error)}`);
  });

  mockupWorker?.on("completed", (job) => {
    if (job) {
      console.log(`[Worker] Mockup job ${job.id} (${job.name}) completed.`);
    }
  });

  mockupWorker?.on("failed", (job, error) => {
    console.log(`[Worker] Mockup job ${job?.id} (${job?.name}) failed: ${getErrorMessage(error)}`);
  });
}

async function reportWorkerHeartbeat(queueNames: string[]) {
  const [workflowCounts, mockupCounts] = await Promise.all([
    queueNames.includes("workflows")
      ? getWorkflowQueue().getJobCounts("waiting", "active", "delayed")
      : Promise.resolve({ active: 0, delayed: 0, waiting: 0 }),
    queueNames.includes("mockups")
      ? getMockupQueue().getJobCounts("waiting", "active", "delayed")
      : Promise.resolve({ active: 0, delayed: 0, waiting: 0 }),
  ]);

  await WorkerNodeService.heartbeat({
    backlogCount:
      workflowCounts.waiting + workflowCounts.active + workflowCounts.delayed +
      mockupCounts.waiting + mockupCounts.active + mockupCounts.delayed,
    cpuPercent: Math.round((os.loadavg()[0] ?? 0) * 100),
    host,
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    nodeName,
    pm2ProcessName,
    queueNames,
    role: "worker",
    status: "healthy",
    uptimeSeconds: Math.round(process.uptime()),
  });
}

async function bootWorkers(): Promise<WorkerSet> {
  const queueNames = await WorkerNodeService.getAssignedQueues({
    fallbackQueues: getFallbackQueues(),
    host,
    pm2ProcessName,
    role: "worker",
  });

  const workflowWorker = queueNames.includes("workflows")
    ? new Worker<OrvexWorkflowJob>(
      "workflows",
      processWorkflowJob,
      {
        connection: getWorkflowQueueConnection(),
        ...workflowWorkerRuntimeConfig,
      },
    )
    : null;

  const mockupWorker = queueNames.includes("mockups")
    ? new Worker<MockupGenerationJob>(
      "mockups",
      processMockupJob,
      {
        connection: getMockupQueueConnection(),
        ...mockupWorkerRuntimeConfig,
      },
    )
    : null;

  attachWorkerLogging(workflowWorker, mockupWorker);

  console.log(`Orvex Background Task Engine Initialized for queues: ${queueNames.join(", ")}`);

  await reportWorkerHeartbeat(queueNames);
  setInterval(() => {
    void reportWorkerHeartbeat(queueNames);
  }, 60_000);

  let dispatchSweepInFlight = false;
  const drainOutbox = async () => {
    if (dispatchSweepInFlight) {
      return;
    }

    dispatchSweepInFlight = true;
    try {
      const dispatched = await WorkflowOutboxService.dispatchPending(25);
      if (dispatched > 0) {
        console.log(`[Worker] Dispatched ${dispatched} pending workflow outbox entr${dispatched === 1 ? "y" : "ies"}.`);
      }
    } catch (error) {
      console.error("[Worker] Failed to dispatch pending workflows:", getErrorMessage(error));
    } finally {
      dispatchSweepInFlight = false;
    }
  };

  void drainOutbox();
  setInterval(() => {
    void drainOutbox();
  }, 5_000);

  return {
    mockupWorker,
    queueNames,
    workflowWorker,
  };
}

void bootWorkers().catch((error) => {
  console.error("[Worker] Failed to initialize worker runtime:", getErrorMessage(error));
  process.exitCode = 1;
});
