import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import { getRedisConnection } from "@/lib/redis";

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
    projectId?: string;
    url: string;
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

export type LaunchPackGenerationJob = {
  payload: {
    audience?: string;
    category?: string;
    description: string;
    keyword?: string;
    opportunityId?: string;
    productName: string;
    projectId?: string;
  };
  type: "launch_pack_generation" | "etsy_listing_launch_pack";
  userId: string;
  workflowId: string;
};

export type OrvexWorkflowJob =
  | ListingIntelligenceJob
  | CompetitorAnalysisJob
  | OpportunityAnalysisJob
  | ListingGeneratorJob
  | LaunchPackGenerationJob;

export type OrvexWorkflowJobName = OrvexWorkflowJob["type"];

const connection: ConnectionOptions = getRedisConnection();

export const defaultWorkflowJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    delay: 5_000,
    type: "exponential",
  },
  removeOnComplete: {
    age: 60 * 60,
    count: 1_000,
  },
  removeOnFail: {
    age: 60 * 60 * 24,
    count: 2_000,
  },
};

export const workflowQueue = new Queue<OrvexWorkflowJob>("workflows", { connection });

export function getWorkflowQueueConnection() {
  return connection;
}

export async function enqueueWorkflowJob(job: OrvexWorkflowJob, options?: JobsOptions) {
  return workflowQueue.add(job.type, job, {
    ...defaultWorkflowJobOptions,
    ...options,
  });
}
