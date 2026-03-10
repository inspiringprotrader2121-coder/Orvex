import type { Job } from "bullmq";
import type { MockupGenerationJob } from "@server/queues/mockup-queue";
import { MockupGenerationService } from "@server/services/mockup-generation-service";
import { WorkflowService } from "@server/services/workflow-service";
import { env } from "@server/utils/env";

export async function processMockupJob(job: Job<MockupGenerationJob>) {
  await WorkflowService.markProcessing(job.data.workflowId, 5);

  try {
    const result = await MockupGenerationService.process({
      color: job.data.payload.color,
      description: job.data.payload.description,
      productName: job.data.payload.productName,
      style: job.data.payload.style,
      userId: job.data.userId,
      workflowId: job.data.workflowId,
    });

    await WorkflowService.markCompleted(job.data.workflowId, result as Record<string, unknown>);
    return result;
  } catch (error) {
    await WorkflowService.markFailed(job.data.workflowId, error);
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
