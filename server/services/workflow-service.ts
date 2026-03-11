import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowBatches, workflows } from "@/lib/db/schema";
import { notifyJobUpdate } from "@/lib/socket-internal";
import { getErrorMessage } from "@/lib/errors";
import { enqueueWorkflowJob, type OrvexWorkflowJob } from "@server/queues/workflow-queue";
import { enqueueMockupJob, type MockupGenerationJob } from "@server/queues/mockup-queue";
import { env } from "@server/utils/env";
import { InsufficientCreditsError, RateLimitExceededError } from "@server/utils/errors";
import { getWorkflowDefinition } from "@server/workflows/workflow-registry";
import { CreditAccountService } from "./credit-service";

type EnqueueableJob = Exclude<OrvexWorkflowJob, { type: "multi_channel_child" }> | MockupGenerationJob;

type StartWorkflowInput<TJob extends EnqueueableJob> = {
  creditsCost: number;
  inputData: Record<string, unknown>;
  job: Omit<TJob, "workflowId">;
  enqueueJob?: (job: TJob) => Promise<unknown>;
  projectId?: string;
  skipRateLimit?: boolean;
  sourceProvider?: "amazon" | "etsy" | "gumroad" | "internal" | "shopify";
  storeConnectionId?: string;
  sourceUrl?: string;
};

export class WorkflowService {
  private static async enqueueQueuedJob(job: EnqueueableJob) {
    const definition = getWorkflowDefinition(job.type);

    if (definition.queueName === "mockups") {
      await enqueueMockupJob(job as MockupGenerationJob);
      return;
    }

    await enqueueWorkflowJob(job as OrvexWorkflowJob);
  }

  static async assertSubmissionRateLimit(userId: string) {
    const since = new Date(Date.now() - env.submissionLookbackMinutes * 60_000);

    const [recentCount] = await db
      .select({ count: count() })
      .from(workflows)
      .where(and(eq(workflows.userId, userId), gte(workflows.createdAt, since)));

    if ((recentCount?.count ?? 0) >= env.submissionMaxPerWindow) {
      throw new RateLimitExceededError();
    }
  }

  static async startWorkflow<TJob extends EnqueueableJob>(userId: string, input: StartWorkflowInput<TJob>) {
    if (!input.skipRateLimit) {
      await this.assertSubmissionRateLimit(userId);
    }

    let workflowId: string | null = null;

    try {
      await CreditAccountService.deductCredits({
        amount: input.creditsCost,
        metadata: { workflowType: input.job.type },
        reason: `Workflow: ${input.job.type}`,
        userId,
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }
      throw new Error(`Unable to reserve credits: ${getErrorMessage(error)}`);
    }

    try {
      const [workflow] = await db.insert(workflows).values({
        creditsSpent: input.creditsCost,
        inputData: input.inputData,
        progress: 0,
        projectId: input.projectId ?? null,
        sourceProvider: input.sourceProvider ?? "internal",
        storeConnectionId: input.storeConnectionId ?? null,
        sourceUrl: input.sourceUrl ?? null,
        status: "queued",
        type: input.job.type,
        userId,
      }).returning({ id: workflows.id });

      workflowId = workflow.id;
      const queuedJob = {
        ...input.job,
        workflowId,
      } as TJob;

      if (input.enqueueJob) {
        await input.enqueueJob(queuedJob);
      } else {
        await this.enqueueQueuedJob(queuedJob);
      }

      notifyJobUpdate(userId, workflowId, "queued");
      return workflowId;
    } catch (error) {
      await CreditAccountService.addCredits({
        amount: input.creditsCost,
        metadata: { workflowType: input.job.type },
        reason: `Refund: ${input.job.type} failed to enqueue`,
        revertUsage: true,
        userId,
        workflowId: workflowId ?? undefined,
      });

      if (workflowId) {
        await db.update(workflows)
          .set({
            errorMessage: getErrorMessage(error),
            progress: 0,
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, workflowId));
      }

      throw error;
    }
  }

  static async markProcessing(workflowId: string, progress = 15) {
    const [workflow] = await db.update(workflows)
      .set({
        progress,
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId))
      .returning({ userId: workflows.userId });

    if (workflow) {
      notifyJobUpdate(workflow.userId, workflowId, "processing");
    }
  }

  static async markCompleted(workflowId: string, resultData: Record<string, unknown>) {
    const [workflow] = await db.update(workflows)
      .set({
        errorMessage: null,
        progress: 100,
        resultData,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId))
      .returning({ batchId: workflows.batchId, userId: workflows.userId });

    if (workflow) {
      notifyJobUpdate(workflow.userId, workflowId, "completed");
      if (workflow.batchId) {
        await this.bumpBatchCounters(workflow.batchId, "completed");
      }
    }
  }

  static async markFailed(workflowId: string, error: unknown) {
    const message = getErrorMessage(error, "Workflow execution failed");
    const [workflow] = await db.update(workflows)
      .set({
        errorMessage: message,
        progress: 100,
        resultData: { error: message },
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId))
      .returning({ batchId: workflows.batchId, userId: workflows.userId });

    if (workflow) {
      notifyJobUpdate(workflow.userId, workflowId, "failed");
      if (workflow.batchId) {
        await this.bumpBatchCounters(workflow.batchId, "failed");
      }
    }
  }

  static async createBatch(userId: string, fileName: string, totalJobs: number) {
    const [batch] = await db.insert(workflowBatches).values({
      completedJobs: 0,
      failedJobs: 0,
      fileName,
      status: "pending",
      totalJobs,
      userId,
    }).returning({ id: workflowBatches.id });

    return batch.id;
  }

  static async attachWorkflowToBatch(workflowId: string, batchId: string) {
    await db.update(workflows)
      .set({ batchId, updatedAt: new Date() })
      .where(eq(workflows.id, workflowId));
  }

  static async listRecentWorkflows(userId: string, limit = 20) {
    return db.query.workflows.findMany({
      where: eq(workflows.userId, userId),
      limit,
      orderBy: [desc(workflows.createdAt)],
    });
  }

  private static async bumpBatchCounters(batchId: string, outcome: "completed" | "failed") {
    const [updated] = await db.update(workflowBatches)
      .set({
        completedJobs: outcome === "completed" ? sql`${workflowBatches.completedJobs} + 1` : workflowBatches.completedJobs,
        failedJobs: outcome === "failed" ? sql`${workflowBatches.failedJobs} + 1` : workflowBatches.failedJobs,
        updatedAt: new Date(),
      })
      .where(eq(workflowBatches.id, batchId))
      .returning({
        completedJobs: workflowBatches.completedJobs,
        failedJobs: workflowBatches.failedJobs,
        totalJobs: workflowBatches.totalJobs,
      });

    if (!updated) {
      return;
    }

    const finalStatus =
      updated.completedJobs + updated.failedJobs >= updated.totalJobs
        ? (updated.failedJobs > 0 ? "failed" : "completed")
        : "processing";

    await db.update(workflowBatches)
      .set({
        status: finalStatus,
        updatedAt: new Date(),
      })
      .where(eq(workflowBatches.id, batchId));
  }
}
