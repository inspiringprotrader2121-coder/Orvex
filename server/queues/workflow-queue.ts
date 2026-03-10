import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import { getRedisConnection } from "@/lib/redis";
import { getWorkflowDefinition } from "@server/workflows/workflow-registry";

export type ListingIntelligenceJob = {
  payload: {
    projectId?: string;
    url: string;
  };
  type: "listing_intelligence";
  userId: string;
  workflowId: string;
};

export type CompetitorAnalysisJob = {
  payload: {
    keyword?: string;
    maxCompetitors: number;
    productName?: string;
    projectId?: string;
    url?: string;
  };
  type: "competitor_analysis";
  userId: string;
  workflowId: string;
};

export type OpportunityAnalysisJob = {
  payload: {
    keyword: string;
    projectId?: string;
  };
  type: "opportunity_analysis";
  userId: string;
  workflowId: string;
};

export type ListingGeneratorJob = {
  payload: {
    productName: string;
    targetAudience: string;
    productType: string;
    tone: string;
    projectId?: string;
  };
  type: "listing_forge";
  userId: string;
  workflowId: string;
};

type LaunchPackJobPayload = {
  audience?: string;
  category?: string;
  description: string;
  keyword?: string;
  opportunityId?: string;
  productName: string;
  projectId?: string;
};

export type LaunchPackGenerationJob = {
  payload: LaunchPackJobPayload;
  type: "launch_pack_generation";
  userId: string;
  workflowId: string;
};

export type EtsyListingLaunchPackJob = {
  payload: LaunchPackJobPayload;
  type: "etsy_listing_launch_pack";
  userId: string;
  workflowId: string;
};

export type MultiChannelLaunchPackJob = {
  payload: {
    productName: string;
    projectId?: string;
    productType: string;
    targetAudience: string;
  };
  type: "multi_channel_launch_pack";
  userId: string;
  workflowId: string;
};

export type SeoKeywordAnalysisJob = {
  payload: {
    inputText: string;
    source: "niche" | "listing";
  };
  type: "seo_keyword_analysis";
  userId: string;
  workflowId: string;
};

export type OrvexWorkflowJob =
  | ListingIntelligenceJob
  | CompetitorAnalysisJob
  | OpportunityAnalysisJob
  | ListingGeneratorJob
  | LaunchPackGenerationJob
  | EtsyListingLaunchPackJob
  | MultiChannelLaunchPackJob
  | SeoKeywordAnalysisJob;

export type OrvexWorkflowJobName = OrvexWorkflowJob["type"];

const connection: ConnectionOptions = getRedisConnection();
let workflowQueue: Queue<OrvexWorkflowJob> | null = null;

export const defaultWorkflowJobOptions: JobsOptions = {
  removeOnComplete: {
    age: 60 * 60,
    count: 1_000,
  },
  removeOnFail: {
    age: 60 * 60 * 24,
    count: 2_000,
  },
};

export function getWorkflowQueue() {
  if (!workflowQueue) {
    workflowQueue = new Queue<OrvexWorkflowJob>("workflows", { connection });
  }

  return workflowQueue;
}

export function getWorkflowQueueConnection() {
  return connection;
}

export async function enqueueWorkflowJob(job: OrvexWorkflowJob, options?: JobsOptions) {
  const definition = getWorkflowDefinition(job.type);
  return getWorkflowQueue().add(job.type, job, {
    attempts: definition.attempts,
    backoff: {
      delay: definition.backoffDelayMs,
      type: "exponential",
    },
    ...defaultWorkflowJobOptions,
    priority: definition.priority,
    ...options,
  });
}
