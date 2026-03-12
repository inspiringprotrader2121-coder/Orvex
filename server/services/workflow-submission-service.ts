import { ListingUrlInputSchema } from "@server/schemas/listing-intelligence";
import { ListingGeneratorInputSchema } from "@server/schemas/listing-generator";
import { CompetitorAnalyzerInputSchema } from "@server/schemas/competitor-analysis";
import { LaunchPackInputSchema } from "@server/schemas/launch-pack";
import { OpportunityInputSchema } from "@server/schemas/opportunity";
import { MultiChannelLaunchPackInputSchema } from "@server/schemas/multi-channel-launch-pack";
import { MockupGenerationInputSchema } from "@server/schemas/mockup-generation";
import {
  WorkflowSubmissionSchema,
  type WorkflowSubmission,
} from "@server/schemas/workflow";
import { assertScrapableListingUrl } from "@server/scrapers";
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
      case "listing_forge":
        return this.startListingGenerator(userId, submission.payload);
      case "launch_pack_generation":
        return this.startLaunchPack(userId, submission.payload);
      case "multi_channel_launch_pack":
        return this.startMultiChannelLaunchPack(userId, submission.payload);
      case "mockup_generation":
        return this.startMockupGeneration(userId, submission.payload);
      default:
        throw new Error(`Unsupported workflow type: ${JSON.stringify(submission)}`);
    }
  }

  static async startListingIntelligence(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = ListingUrlInputSchema.parse(rawPayload);
    const url = assertScrapableListingUrl(payload.url);
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.listingAnalysisCreditCost,
      inputData: {
        ...payload,
        url,
      },
      job: {
        payload: {
          ...payload,
          url,
        },
        type: "listing_intelligence",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "etsy",
      sourceUrl: url,
    });

    return {
      creditsCost: env.listingAnalysisCreditCost,
      type: "listing_intelligence",
      workflowId,
    };
  }

  static async startCompetitorAnalysis(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = CompetitorAnalyzerInputSchema.parse(rawPayload);
    const url = payload.url ? assertScrapableListingUrl(payload.url) : undefined;
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.competitorCreditCost,
      inputData: {
        ...payload,
        keyword: payload.keyword?.trim() || undefined,
        productName: payload.productName?.trim() || undefined,
        url,
      },
      job: {
        payload: {
          ...payload,
          keyword: payload.keyword?.trim() || undefined,
          productName: payload.productName?.trim() || undefined,
          url,
        },
        type: "competitor_analysis",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "etsy",
      sourceUrl: url,
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

  static async startListingGenerator(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = ListingGeneratorInputSchema.parse(rawPayload);
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.listingForgeCreditCost,
      inputData: payload,
      job: {
        payload,
        type: "listing_forge",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "internal",
    });

    return {
      creditsCost: env.listingForgeCreditCost,
      type: "listing_forge",
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

  static async startMultiChannelLaunchPack(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = MultiChannelLaunchPackInputSchema.parse(rawPayload);
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.multiChannelLaunchPackCreditCost,
      inputData: payload,
      job: {
        payload,
        type: "multi_channel_launch_pack",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "internal",
    });

    return {
      creditsCost: env.multiChannelLaunchPackCreditCost,
      type: "multi_channel_launch_pack",
      workflowId,
    };
  }

  static async startMockupGeneration(userId: string, rawPayload: unknown): Promise<WorkflowStartResult> {
    const payload = MockupGenerationInputSchema.parse(rawPayload);
    const creditsCost = env.mockupCreditCostPerImage * 3;
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost,
      inputData: payload,
      job: {
        payload,
        type: "mockup_generation",
        userId,
      },
      projectId: payload.projectId,
      sourceProvider: "internal",
    });

    return {
      creditsCost,
      type: "mockup_generation",
      workflowId,
    };
  }
}
