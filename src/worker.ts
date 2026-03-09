import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { db } from './lib/db';
import { workflows } from './lib/db/schema';
import { eq } from 'drizzle-orm';
import { AIService } from './lib/ai/service';
import { notifyJobUpdate } from './lib/socket-internal';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * Orvex Background Worker
 * Processes heavy AI workloads asynchronously via BullMQ & Redis.
 */
const worker = new Worker('workflows', async job => {
  const { workflowId, productInfo, userId } = job.data;

  console.log(`[Worker] Started Workflow: ${workflowId} (${job.name})`);

  try {
    // 1. Mark as processing in DB
    await db.update(workflows)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(workflows.id, workflowId));

    if (userId) notifyJobUpdate(userId, workflowId, 'processing');

    if (job.name === 'etsy_listing_launch_pack') {
      const result = await AIService.generateLaunchPack({
        name: productInfo.name,
        category: productInfo.category || "General",
        targetAudience: productInfo.audience || "Modern Shoppers",
        baseDescription: productInfo.description
      });

      await db.update(workflows)
        .set({
          status: 'completed',
          resultData: result,
          updatedAt: new Date()
        })
        .where(eq(workflows.id, workflowId));

      if (userId) notifyJobUpdate(userId, workflowId, 'completed');

      console.log(`[Worker] Success! Workflow ${workflowId} completed.`);
      return result;
    }
  } catch (error: any) {
    console.error(`[Worker] Critical Failure on ${workflowId}:`, error);

    await db.update(workflows)
      .set({
        status: 'failed',
        resultData: { error: error.message || "Unknown AI error" },
        updatedAt: new Date()
      })
      .where(eq(workflows.id, workflowId));

    if (userId) notifyJobUpdate(userId, workflowId, 'failed');

    throw error;
  }
}, { connection: connection as any });

worker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} state: COMPLETED`);
});

worker.on('failed', (job, err) => {
  console.log(`[Worker] Job ${job?.id} state: FAILED (${err.message})`);
});

console.log('🚀 Orvex Background Task Engine Initialized...');
