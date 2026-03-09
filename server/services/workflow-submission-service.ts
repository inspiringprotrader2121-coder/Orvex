import { ListingUrlInputSchema } from "@server/schemas/listing-intelligence";
import { CompetitorAnalyzerInputSchema } from "@server/schemas/competitor-analysis";
import { LaunchPackInputSchema } from "@server/schemas/launch-pack";
import { OpportunityInputSchema } from "@server/schemas/opportunity";
import {
  WorkflowSubmissionSchema,
  type WorkflowSubmission,
} from "@server/schemas/workflow";
import { env } from "@server/utils/env";
import { WorkflowService } from "./workflow-service";

type WorkflowStartResult = {
  creditsCost: number;
  type: WorkflowSubmission["type"];
  workflowId: string;
};

export class WorkflowSubmissionService {
  static async start(userId: string, rawSubmission: unknown): Promise<WorkflowStartResult> {
    const submission = WorkflowSubmissionSchema.parse(rawSubmission);

    switch (submission.type) {
      case "listing_intelligence":
        return this.startListingIntelligence(userId, submission.payload);
      case "competitor_analysis":
        return this.startCompetitorAnalysis(userId, submission.payload);
      case "opportunity_analysis":
        return this.startOpportunityAnalysis(userId, submission.payload);
      case "launch_pack_generation":
        return this.startLaunchPack(userId, submission.payload);
      default:
        throw new Error(`Unsupported workflow type: ${JSON.stringify(submission)}`);
    }
  }

  static async startListingIntelligence(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = ListingUrlInputSchema.parse(rawPayload);
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.listingAnalysisCreditCost,
      inputData: payload,
      job: {
        payload,
        type: "listing_intelligence",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "etsy",
      sourceUrl: payload.url,
    });

    return {
      creditsCost: env.listingAnalysisCreditCost,
      type: "listing_intelligence",
      workflowId,
    };
  }

  static async startCompetitorAnalysis(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = CompetitorAnalyzerInputSchema.parse(rawPayload);
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.competitorCreditCost,
      inputData: payload,
      job: {
        payload,
        type: "competitor_analysis",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "etsy",
      sourceUrl: payload.url,
    });

    return {
      creditsCost: env.competitorCreditCost,
      type: "competitor_analysis",
      workflowId,
    };
  }

  static async startOpportunityAnalysis(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = OpportunityInputSchema.parse(rawPayload);
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.opportunityCreditCost,
      inputData: payload,
      job: {
        payload,
        type: "opportunity_analysis",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "internal",
    });

    return {
      creditsCost: env.opportunityCreditCost,
      type: "opportunity_analysis",
      workflowId,
    };
  }

  static async startLaunchPack(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = LaunchPackInputSchema.parse(rawPayload);
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.launchPackCreditCost,
      inputData: payload,
      job: {
        payload,
        type: "launch_pack_generation",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "internal",
    });

    return {
      creditsCost: env.launchPackCreditCost,
      type: "launch_pack_generation",
      workflowId,
    };
  }
}
