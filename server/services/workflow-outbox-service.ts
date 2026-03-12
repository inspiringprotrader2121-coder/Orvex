import { eq } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { workflowOutbox, workflows } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/errors";
import { notifyCreditsUpdate, notifyJobUpdate } from "@/lib/socket-internal";
import { enqueueMockupJob, type MockupGenerationJob } from "@server/queues/mockup-queue";
import {
  enqueueWorkflowJob,
  getWorkflowFlowProducer,
  getWorkflowJobOptions,
  type MultiChannelChildJob,
  type MultiChannelLaunchPackJob,
  type OrvexWorkflowJob,
} from "@server/queues/workflow-queue";
import type { ChannelId } from "@server/schemas/multi-channel-launch-pack";
import { CreditAccountService } from "./credit-service";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MAX_DISPATCH_ATTEMPTS = 8;
const PROCESSING_STALE_AFTER_MS = 2 * 60_000;
const BASE_RETRY_DELAY_MS = 10_000;
const MAX_RETRY_DELAY_MS = 15 * 60_000;
const MULTI_CHANNEL_CHUNKS: ChannelId[][] = [
  ["etsy", "shopify"],
  ["amazon", "tiktok"],
  ["pinterest", "instagram"],
];

type JobWithoutWorkflowId<T extends { workflowId: string }> = Omit<T, "workflowId">;

export type DispatchableWorkflowJobData =
  | JobWithoutWorkflowId<Exclude<OrvexWorkflowJob, { type: "multi_channel_child" }>>
  | JobWithoutWorkflowId<MockupGenerationJob>;

type DispatchableWorkflowType = DispatchableWorkflowJobData["type"];

type WorkflowOutboxRow = {
  attempts: number;
  createdAt: Date;
  id: string;
  jobData: DispatchableWorkflowJobData;
  jobType: DispatchableWorkflowType;
  lastError: string | null;
  nextAttemptAt: Date;
  sentAt: Date | null;
  status: "failed" | "pending" | "processing" | "sent";
  updatedAt: Date;
  userId: string;
  workflowId: string;
};

function getRetryDelayMs(attempts: number) {
  return Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * (2 ** Math.max(attempts - 1, 0)));
}

function getProcessingStaleBefore() {
  return new Date(Date.now() - PROCESSING_STALE_AFTER_MS);
}

function getOutboxSelectSql() {
  return `
    o.id,
    o.workflow_id as "workflowId",
    o.user_id as "userId",
    o.job_type as "jobType",
    o.job_data as "jobData",
    o.status,
    o.attempts,
    o.last_error as "lastError",
    o.next_attempt_at as "nextAttemptAt",
    o.sent_at as "sentAt",
    o.created_at as "createdAt",
    o.updated_at as "updatedAt"
  `;
}

async function updateQueuedWorkflowState(tx: DbTransaction, workflowId: string) {
  const [current] = await tx.select({
    status: workflows.status,
  })
    .from(workflows)
    .where(eq(workflows.id, workflowId))
    .for("update");

  if (!current || current.status !== "pending") {
    return false;
  }

  await tx.update(workflows)
    .set({
      errorMessage: null,
      progress: 0,
      resultData: null,
      status: "queued",
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, workflowId));

  return true;
}

export class WorkflowOutboxService {
  static async dispatchPending(limit = 10) {
    const claimedEntries = await this.claimReadyEntries(limit);
    let dispatchedCount = 0;

    for (const entry of claimedEntries) {
      const outcome = await this.processClaimedEntry(entry);
      if (outcome === "sent") {
        dispatchedCount += 1;
      }
    }

    return dispatchedCount;
  }

  static async dispatchWorkflow(workflowId: string) {
    const claimedEntry = await this.claimWorkflowEntry(workflowId);
    if (!claimedEntry) {
      return false;
    }

    const outcome = await this.processClaimedEntry(claimedEntry);
    return outcome === "sent";
  }

  private static async claimReadyEntries(limit: number) {
    const { rows } = await pool.query<WorkflowOutboxRow>(`
      with candidates as (
        select o.id
        from workflow_outbox o
        where (
          (o.status = 'pending' and o.next_attempt_at <= now())
          or (o.status = 'processing' and o.updated_at <= $2)
        )
        order by o.next_attempt_at asc, o.created_at asc
        limit $1
        for update skip locked
      )
      update workflow_outbox o
      set
        status = 'processing',
        attempts = o.attempts + 1,
        updated_at = now()
      from candidates
      where o.id = candidates.id
      returning ${getOutboxSelectSql()}
    `, [limit, getProcessingStaleBefore()]);

    return rows;
  }

  private static async claimWorkflowEntry(workflowId: string) {
    const { rows } = await pool.query<WorkflowOutboxRow>(`
      with candidate as (
        select o.id
        from workflow_outbox o
        where o.workflow_id = $1
          and (
            (o.status = 'pending' and o.next_attempt_at <= now())
            or (o.status = 'processing' and o.updated_at <= $2)
          )
        for update skip locked
      )
      update workflow_outbox o
      set
        status = 'processing',
        attempts = o.attempts + 1,
        updated_at = now()
      from candidate
      where o.id = candidate.id
      returning ${getOutboxSelectSql()}
    `, [workflowId, getProcessingStaleBefore()]);

    return rows[0] ?? null;
  }

  private static async processClaimedEntry(entry: WorkflowOutboxRow) {
    try {
      await this.enqueueEntry(entry);
    } catch (error) {
      return this.handleDispatchFailure(entry, error);
    }

    try {
      await this.markEntrySent(entry);
      return "sent" as const;
    } catch (error) {
      return this.handleDispatchFailure(entry, error);
    }
  }

  private static async handleDispatchFailure(entry: WorkflowOutboxRow, error: unknown) {
    const message = getErrorMessage(error, "Workflow dispatch failed");
    if (entry.attempts >= MAX_DISPATCH_ATTEMPTS) {
      await this.markEntryFailed(entry, message);
      return "failed" as const;
    }

    await this.scheduleRetry(entry, message);
    return "retry" as const;
  }

  private static async enqueueEntry(entry: WorkflowOutboxRow) {
    const baseJob = {
      ...(entry.jobData as Record<string, unknown>),
      workflowId: entry.workflowId,
    };

    if (entry.jobType === "mockup_generation") {
      await enqueueMockupJob(baseJob as MockupGenerationJob, {
        jobId: entry.workflowId,
      });
      return;
    }

    if (entry.jobType === "multi_channel_launch_pack") {
      const flowProducer = getWorkflowFlowProducer();
      const parentJob = baseJob as MultiChannelLaunchPackJob;
      const children = MULTI_CHANNEL_CHUNKS.flatMap((channels, chunkIndex) => {
        const intersectingChannels = channels.filter((channel) =>
          parentJob.payload.channelsToGenerate.includes(channel),
        );

        if (intersectingChannels.length === 0) {
          return [];
        }

        return [{
          data: {
            type: "multi_channel_child",
            userId: parentJob.userId,
            workflowId: parentJob.workflowId,
            payload: {
              ...parentJob.payload,
              channelsToGenerate: intersectingChannels,
            },
          } satisfies MultiChannelChildJob,
          name: "multi_channel_child" as const,
          opts: getWorkflowJobOptions("multi_channel_child", {
            jobId: `${entry.workflowId}:multi-channel-child:${chunkIndex}`,
          }),
          queueName: "workflows" as const,
        }];
      });

      await flowProducer.add({
        children,
        data: parentJob,
        name: "multi_channel_launch_pack",
        opts: getWorkflowJobOptions("multi_channel_launch_pack", {
          jobId: entry.workflowId,
        }),
        queueName: "workflows",
      });

      return;
    }

    await enqueueWorkflowJob(baseJob as OrvexWorkflowJob, {
      jobId: entry.workflowId,
    });
  }

  private static async markEntrySent(entry: WorkflowOutboxRow) {
    let queuedWorkflow = false;

    await db.transaction(async (tx) => {
      queuedWorkflow = await updateQueuedWorkflowState(tx, entry.workflowId);

      await tx.update(workflowOutbox)
        .set({
          lastError: null,
          sentAt: new Date(),
          status: "sent",
          updatedAt: new Date(),
        })
        .where(eq(workflowOutbox.id, entry.id));
    });

    if (queuedWorkflow) {
      notifyJobUpdate(entry.userId, entry.workflowId, "queued");
    }
  }

  private static async scheduleRetry(entry: WorkflowOutboxRow, message: string) {
    await db.update(workflowOutbox)
      .set({
        lastError: message,
        nextAttemptAt: new Date(Date.now() + getRetryDelayMs(entry.attempts)),
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(workflowOutbox.id, entry.id));
  }

  private static async markEntryFailed(entry: WorkflowOutboxRow, message: string) {
    let refundedCreditsAvailable: number | null = null;
    let shouldNotifyFailure = false;

    await db.transaction(async (tx) => {
      const [workflow] = await tx.select({
        creditsSpent: workflows.creditsSpent,
        status: workflows.status,
        type: workflows.type,
      })
        .from(workflows)
        .where(eq(workflows.id, entry.workflowId))
        .for("update");

      await tx.update(workflowOutbox)
        .set({
          lastError: message,
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(workflowOutbox.id, entry.id));

      if (!workflow || workflow.status !== "pending") {
        return;
      }

      await tx.update(workflows)
        .set({
          errorMessage: message,
          progress: 100,
          resultData: {
            error: message,
          },
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, entry.workflowId));

      if (workflow.creditsSpent > 0) {
        const refunded = await CreditAccountService.addCreditsTx(tx, {
          amount: workflow.creditsSpent,
          metadata: {
            dispatchFailed: true,
            workflowType: workflow.type,
          },
          reason: `Refund: ${workflow.type} failed to dispatch`,
          revertUsage: true,
          userId: entry.userId,
          workflowId: entry.workflowId,
        });

        refundedCreditsAvailable = refunded?.creditsAvailable ?? null;
      }

      shouldNotifyFailure = true;
    });

    if (refundedCreditsAvailable !== null) {
      notifyCreditsUpdate(entry.userId, refundedCreditsAvailable);
    }

    if (shouldNotifyFailure) {
      notifyJobUpdate(entry.userId, entry.workflowId, "failed");
    }
  }
}
