import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * Shared BullMQ Queue for Workflows.
 * Using 'any' for connection to resolve conflicting 'ioredis' types between packages.
 */
export const workflowQueue = new Queue('workflows', { connection: connection as any });

export async function enqueueWorkflow(workflowId: string, type: string, data: any) {
  return await workflowQueue.add(type, { workflowId, ...data });
}
