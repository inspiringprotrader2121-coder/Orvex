import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowBatches } from "@/lib/db/schema";
import type { BulkLaunchRow } from "@server/schemas/bulk-generation";
import { env } from "@server/utils/env";
import { WorkflowService } from "./workflow-service";

export class BulkGenerationService {
  static async startLaunchPackBatch(input: {
    fileName: string;
    projectId?: string;
    rows: BulkLaunchRow[];
    userId: string;
  }) {
    await WorkflowService.assertSubmissionRateLimit(input.userId);

    const batchId = await WorkflowService.createBatch(input.userId, input.fileName, input.rows.length);
    const queued: Array<{ index: number; workflowId: string }> = [];
    const failures: Array<{ index: number; reason: string }> = [];

    for (const [index, row] of input.rows.entries()) {
      try {
        const workflowId = await WorkflowService.startWorkflow(input.userId, {
          creditsCost: env.bulkLaunchCreditCost,
          inputData: row,
          job: {
            payload: row,
            type: "launch_pack_generation",
            userId: input.userId,
          },
          projectId: input.projectId,
          skipRateLimit: true,
          sourceProvider: "internal",
        });

        await WorkflowService.attachWorkflowToBatch(workflowId, batchId);
        queued.push({ index, workflowId });
      } catch (error) {
        failures.push({
          index,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (failures.length > 0) {
      await db.update(workflowBatches)
        .set({
          failedJobs: sql`${workflowBatches.failedJobs} + ${failures.length}`,
          status: queued.length > 0 ? "processing" : "failed",
          updatedAt: new Date(),
        })
        .where(eq(workflowBatches.id, batchId));
    } else if (queued.length > 0) {
      await db.update(workflowBatches)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(workflowBatches.id, batchId));
    }

    return {
      batchId,
      failures,
      queued,
      totalRows: input.rows.length,
    };
  }
}
