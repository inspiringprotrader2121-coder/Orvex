import type { Job } from "bullmq";
import type { OrvexWorkflowJob } from "@server/queues/workflow-queue";
import { CompetitorAnalysisService } from "@server/services/competitor-analysis-service";
import { LaunchPackService } from "@server/services/launch-pack-service";
import { ListingGeneratorService } from "@server/services/listing-generator-service";
import { ListingIntelligenceService } from "@server/services/listing-intelligence-service";
import { MultiChannelLaunchPackService } from "@server/services/multi-channel-launch-pack-service";
import { SeoKeywordService } from "@server/services/seo-keyword-service";
import { OpportunityService } from "@server/services/opportunity-service";
import { WorkflowService } from "@server/services/workflow-service";
import { StoreTokenRefreshService } from "@server/services/store-token-refresh-service";
import { env } from "@server/utils/env";

const workflowHandlers: {
  [K in OrvexWorkflowJob["type"]]: (job: Extract<OrvexWorkflowJob, { type: K }>) => Promise<Record<string, unknown>>;
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
  multi_channel_launch_pack: async (job) => {
    return MultiChannelLaunchPackService.processParent(job, {
      productName: job.payload.productName,
      productType: job.payload.productType,
      targetAudience: job.payload.targetAudience,
      userId: job.userId,
      workflowId: job.workflowId,
    }) as Promise<Record<string, unknown>>;
  },
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
  store_token_refresh: async () => {
    await StoreTokenRefreshService.refreshExpiringTokens();
    return { success: true };
  },
};

export async function processWorkflowJob(job: Job<OrvexWorkflowJob>) {
  const isSystemJob = job.data.workflowId === "system";

  if (!isSystemJob) {
    await WorkflowService.markProcessing(job.data.workflowId);
  }

  try {
    const handler = workflowHandlers[job.data.type];
    if (!handler) {
      throw new Error(`Unsupported job type: ${JSON.stringify(job.data)}`);
    }

    const result = await handler(job.data as never);
    
    if (!isSystemJob) {
      await WorkflowService.markCompleted(job.data.workflowId, result);
    }
    
    return result;
  } catch (error) {
    if (!isSystemJob) {
      await WorkflowService.markFailed(job.data.workflowId, error);
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
