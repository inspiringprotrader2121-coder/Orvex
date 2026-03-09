import type { Job } from "bullmq";
import type { OrvexWorkflowJob } from "@server/queues/workflow-queue";
import { CompetitorAnalysisService } from "@server/services/competitor-analysis-service";
import { LaunchPackService } from "@server/services/launch-pack-service";
import { ListingIntelligenceService } from "@server/services/listing-intelligence-service";
import { OpportunityService } from "@server/services/opportunity-service";
import { WorkflowService } from "@server/services/workflow-service";
import { env } from "@server/utils/env";

export async function processWorkflowJob(job: Job<OrvexWorkflowJob>) {
  await WorkflowService.markProcessing(job.data.workflowId);

  try {
    switch (job.data.type) {
      case "listing_intelligence": {
        const result = await ListingIntelligenceService.process({
          url: job.data.payload.url,
          userId: job.data.userId,
          workflowId: job.data.workflowId,
        });
        await WorkflowService.markCompleted(job.data.workflowId, result);
        return result;
      }
      case "competitor_analysis": {
        const result = await CompetitorAnalysisService.process({
          url: job.data.payload.url,
          userId: job.data.userId,
          workflowId: job.data.workflowId,
        });
        await WorkflowService.markCompleted(job.data.workflowId, result);
        return result;
      }
      case "opportunity_analysis": {
        const result = await OpportunityService.process({
          keyword: job.data.payload.keyword,
          userId: job.data.userId,
          workflowId: job.data.workflowId,
        });
        await WorkflowService.markCompleted(job.data.workflowId, result as Record<string, unknown>);
        return result;
      }
      case "launch_pack_generation":
      case "etsy_listing_launch_pack": {
        const result = await LaunchPackService.process({
          audience: job.data.payload.audience,
          category: job.data.payload.category,
          description: job.data.payload.description,
          keyword: job.data.payload.keyword,
          productName: job.data.payload.productName,
          userId: job.data.userId,
          workflowId: job.data.workflowId,
        });
        await WorkflowService.markCompleted(job.data.workflowId, result as Record<string, unknown>);
        return result;
      }
      default:
        throw new Error(`Unsupported job type: ${JSON.stringify(job.data)}`);
    }
  } catch (error) {
    await WorkflowService.markFailed(job.data.workflowId, error);
    throw error;
  }
}

export const workflowWorkerRuntimeConfig = {
  concurrency: env.workerConcurrency,
  limiter: {
    duration: env.workerGlobalRateLimitDurationMs,
    max: env.workerGlobalRateLimitMax,
  },
};
