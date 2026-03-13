import type { Job } from "bullmq";
import { parseOrvexWorkflowJob, type MultiChannelLaunchPackJob, type OrvexWorkflowJob } from "@server/queues/workflow-queue";
import { CompetitorAnalysisService } from "@server/services/competitor-analysis-service";
import { LaunchPackService } from "@server/services/launch-pack-service";
import { ListingGeneratorService } from "@server/services/listing-generator-service";
import { ListingIntelligenceService } from "@server/services/listing-intelligence-service";
import { MultiChannelLaunchPackService } from "@server/services/multi-channel-launch-pack-service";
import { SeoKeywordService } from "@server/services/seo-keyword-service";
import { OpportunityService } from "@server/services/opportunity-service";
import { WorkflowService } from "@server/services/workflow-service";
import { env } from "@server/utils/env";

type DirectWorkflowType = Exclude<OrvexWorkflowJob["type"], "multi_channel_launch_pack">;

const workflowHandlers: {
  [K in DirectWorkflowType]: (job: Extract<OrvexWorkflowJob, { type: K }>) => Promise<Record<string, unknown>>;
} = {
  competitor_analysis: async (job) => CompetitorAnalysisService.process({
    keyword: job.payload.keyword,
    maxCompetitors: job.payload.maxCompetitors,
    productName: job.payload.productName,
    url: job.payload.url,
    userId: job.userId,
    workflowId: job.workflowId,
  }),
  etsy_listing_launch_pack: async (job) => LaunchPackService.process({
    audience: job.payload.audience,
    category: job.payload.category,
    description: job.payload.description,
    keyword: job.payload.keyword,
    productName: job.payload.productName,
    userId: job.userId,
    workflowId: job.workflowId,
  }) as Promise<Record<string, unknown>>,
  launch_pack_generation: async (job) => LaunchPackService.process({
    audience: job.payload.audience,
    category: job.payload.category,
    description: job.payload.description,
    keyword: job.payload.keyword,
    productName: job.payload.productName,
    userId: job.userId,
    workflowId: job.workflowId,
  }) as Promise<Record<string, unknown>>,
  listing_forge: async (job) => ListingGeneratorService.process({
    productName: job.payload.productName,
    productType: job.payload.productType,
    projectId: job.payload.projectId,
    targetAudience: job.payload.targetAudience,
    tone: job.payload.tone,
    userId: job.userId,
    workflowId: job.workflowId,
  }) as Promise<Record<string, unknown>>,
  listing_intelligence: async (job) => ListingIntelligenceService.process({
    url: job.payload.url,
    userId: job.userId,
    workflowId: job.workflowId,
  }) as Promise<Record<string, unknown>>,
  multi_channel_child: async (job) => MultiChannelLaunchPackService.processChild({
    channelsToGenerate: job.payload.channelsToGenerate,
    productName: job.payload.productName,
    productType: job.payload.productType,
    targetAudience: job.payload.targetAudience,
    userId: job.userId,
    workflowId: job.workflowId,
  }) as Promise<Record<string, unknown>>,
  opportunity_analysis: async (job) => OpportunityService.process({
    keyword: job.payload.keyword,
    userId: job.userId,
    workflowId: job.workflowId,
  }) as Promise<Record<string, unknown>>,
  seo_keyword_analysis: async (job) => SeoKeywordService.process({
    inputText: job.payload.inputText,
    source: job.payload.source,
    userId: job.userId,
    workflowId: job.workflowId,
  }) as Promise<Record<string, unknown>>,
};

export async function processWorkflowJob(job: Job<OrvexWorkflowJob>) {
  const safeJob = parseOrvexWorkflowJob(job.data);
  const isSystemJob = safeJob.workflowId === "system";

  if (!isSystemJob) {
    await WorkflowService.markProcessing(safeJob.workflowId);
  }

  try {
    if (safeJob.type === "multi_channel_launch_pack") {
      const result = await MultiChannelLaunchPackService.processParent(job as Job<MultiChannelLaunchPackJob>, {
        channelsToGenerate: safeJob.payload.channelsToGenerate,
        productName: safeJob.payload.productName,
        productType: safeJob.payload.productType,
        targetAudience: safeJob.payload.targetAudience,
        userId: safeJob.userId,
        workflowId: safeJob.workflowId,
      });

      if (!isSystemJob) {
        await WorkflowService.markCompleted(safeJob.workflowId, result);
      }

      return result;
    }

    const handler = workflowHandlers[safeJob.type as DirectWorkflowType];
    if (!handler) {
      throw new Error(`Unsupported job type: ${JSON.stringify(safeJob)}`);
    }

    const result = await handler(safeJob as never);
    
    if (!isSystemJob) {
      await WorkflowService.markCompleted(safeJob.workflowId, result);
    }
    
    return result;
  } catch (error) {
    if (!isSystemJob) {
      await WorkflowService.markFailed(safeJob.workflowId, error);
    }
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
