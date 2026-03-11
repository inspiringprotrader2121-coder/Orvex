import type { Job, Queue } from "bullmq";
import { getMockupQueue } from "@server/queues/mockup-queue";
import { getWorkflowQueue } from "@server/queues/workflow-queue";

export type AdminQueueName = "mockups" | "workflows";

type QueueJobPayload = {
  workflowId?: string;
};

type QueueCounts = {
  active: number;
  completed: number;
  delayed: number;
  failed: number;
  waiting: number;
};

const queueStates = ["waiting", "active", "completed", "failed", "delayed"] as const;

function listQueues(): Array<{ name: AdminQueueName; queue: Queue<QueueJobPayload> }> {
  return [
    { name: "workflows", queue: getWorkflowQueue() as unknown as Queue<QueueJobPayload> },
    { name: "mockups", queue: getMockupQueue() as unknown as Queue<QueueJobPayload> },
  ];
}

export function getAdminQueue(queueName: AdminQueueName) {
  return listQueues().find((entry) => entry.name === queueName)?.queue ?? null;
}

export async function getAdminQueueCounts(): Promise<QueueCounts> {
  const queueCounts = await Promise.all(
    listQueues().map(async ({ queue }) => queue.getJobCounts(...queueStates)),
  );

  return queueCounts.reduce<QueueCounts>((totals, counts) => ({
    active: totals.active + (counts.active ?? 0),
    completed: totals.completed + (counts.completed ?? 0),
    delayed: totals.delayed + (counts.delayed ?? 0),
    failed: totals.failed + (counts.failed ?? 0),
    waiting: totals.waiting + (counts.waiting ?? 0),
  }), {
    active: 0,
    completed: 0,
    delayed: 0,
    failed: 0,
    waiting: 0,
  });
}

async function getJobsForStates(
  states: Array<"active" | "completed" | "delayed" | "failed" | "waiting">,
  limitPerQueue: number,
) {
  const jobs = await Promise.all(
    listQueues().map(async ({ queue }) => queue.getJobs(states, 0, Math.max(limitPerQueue - 1, 0), true)),
  );

  return jobs
    .flat()
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0));
}

export async function getAdminJobs(
  states: Array<"active" | "completed" | "delayed" | "failed" | "waiting">,
  limit: number,
) {
  const jobs = await getJobsForStates(states, Math.max(limit, 20));
  return jobs.slice(0, limit);
}

export async function getAdminCompletedJobs(limit: number) {
  const jobs = await getJobsForStates(["completed"], Math.max(limit, 50));
  return jobs.slice(0, limit);
}

export function getWorkflowIdFromJob(job: Job<QueueJobPayload>) {
  return typeof job.data?.workflowId === "string" ? job.data.workflowId : null;
}
