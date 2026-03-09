import "dotenv/config";
import { Worker } from "bullmq";
import { getErrorMessage } from "./lib/errors";
import { getWorkflowQueueConnection, type OrvexWorkflowJob } from "@server/queues/workflow-queue";
import { processWorkflowJob, workflowWorkerRuntimeConfig } from "@server/workers/workflow-processor";

const worker = new Worker<OrvexWorkflowJob>(
  "workflows",
  processWorkflowJob,
  {
    connection: getWorkflowQueueConnection(),
    ...workflowWorkerRuntimeConfig,
  },
);

worker.on("completed", (job) => {
  if (job) {
    console.log(`[Worker] Job ${job.id} (${job.name}) completed.`);
  }
});

worker.on("failed", (job, error) => {
  console.log(`[Worker] Job ${job?.id} (${job?.name}) failed: ${getErrorMessage(error)}`);
});

console.log("Orvex Background Task Engine Initialized...");
