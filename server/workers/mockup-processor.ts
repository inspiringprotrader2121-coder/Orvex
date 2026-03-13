import type { Job } from "bullmq";
import { parseMockupGenerationJob, type MockupGenerationJob } from "@server/queues/mockup-queue";
import { MockupGenerationService } from "@server/services/mockup-generation-service";
import { WorkflowService } from "@server/services/workflow-service";
import { env } from "@server/utils/env";

export async function processMockupJob(job: Job<MockupGenerationJob>) {
  const safeJob = parseMockupGenerationJob(job.data);
  await WorkflowService.markProcessing(safeJob.workflowId, 5);

  try {
    const result = await MockupGenerationService.process({
      color: safeJob.payload.color,
      description: safeJob.payload.description,
      productName: safeJob.payload.productName,
      style: safeJob.payload.style,
      userId: safeJob.userId,
      workflowId: safeJob.workflowId,
    });

    await WorkflowService.markCompleted(safeJob.workflowId, result as Record<string, unknown>);
    return result;
  } catch (error) {
    await WorkflowService.markFailed(safeJob.workflowId, error);
    throw error;
  }
}

export const mockupWorkerRuntimeConfig = {
  concurrency: env.mockupWorkerConcurrency,
  limiter: {
    duration: env.mockupWorkerGlobalRateLimitDurationMs,
    max: env.mockupWorkerGlobalRateLimitMax,
  },
};
