import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import { z } from "zod";
import { getRedisConnection } from "@/lib/redis";
import { MockupGenerationInputSchema } from "@server/schemas/mockup-generation";
import { getWorkflowDefinition } from "@server/workflows/workflow-registry";

export type MockupGenerationJob = {
  payload: {
    color: string;
    description: string;
    productName: string;
    projectId?: string;
    style: string;
  };
  type: "mockup_generation";
  userId: string;
  workflowId: string;
};

export const MockupGenerationJobSchema = z.object({
  payload: MockupGenerationInputSchema,
  type: z.literal("mockup_generation"),
  userId: z.union([z.string().uuid(), z.literal("system")]),
  workflowId: z.union([z.string().uuid(), z.literal("system")]),
});

export function parseMockupGenerationJob(input: unknown): MockupGenerationJob {
  return MockupGenerationJobSchema.parse(input) as MockupGenerationJob;
}

const connection: ConnectionOptions = getRedisConnection();
let mockupQueue: Queue<MockupGenerationJob> | null = null;

export const defaultMockupJobOptions: JobsOptions = {
  removeOnComplete: {
    age: 60 * 60,
    count: 500,
  },
  removeOnFail: {
    age: 60 * 60 * 24,
    count: 1_000,
  },
};

export function getMockupQueue() {
  if (!mockupQueue) {
    mockupQueue = new Queue<MockupGenerationJob>("mockups", { connection });
  }

  return mockupQueue;
}

export function getMockupQueueConnection() {
  return connection;
}

export async function enqueueMockupJob(job: MockupGenerationJob, options?: JobsOptions) {
  const definition = getWorkflowDefinition(job.type);
  return getMockupQueue().add(job.type, job, {
    attempts: definition.attempts,
    backoff: {
      delay: definition.backoffDelayMs,
      type: "exponential",
    },
    ...defaultMockupJobOptions,
    priority: definition.priority,
    ...options,
  });
}
