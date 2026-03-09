import type { z } from "zod";
import type { CompetitorAnalysisSchema } from "@server/schemas/competitor-analysis";
import type { LaunchPackSchema } from "@server/schemas/launch-pack";
import type { ListingGeneratorResultSchema } from "@server/schemas/listing-generator";
import type { ListingIntelligenceReportSchema } from "@server/schemas/listing-intelligence";
import type { OpportunityAnalysisAiSchema } from "@server/schemas/opportunity";
import type { WorkflowStatusSchema, WorkflowTypeSchema } from "@server/schemas/common";

export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;

export type ListingIntelligenceResult = z.infer<typeof ListingIntelligenceReportSchema>;
export type CompetitorAnalysisResult = z.infer<typeof CompetitorAnalysisSchema>;
export type LaunchPackResult = z.infer<typeof LaunchPackSchema>;
export type ListingGeneratorResult = z.infer<typeof ListingGeneratorResultSchema>;
export type OpportunityAnalysisResult = z.infer<typeof OpportunityAnalysisAiSchema> & {
  opportunityScore: number;
};

export interface WorkflowFailureResult {
  error: string;
}

export type WorkflowResultData =
  | CompetitorAnalysisResult
  | LaunchPackResult
  | ListingGeneratorResult
  | ListingIntelligenceResult
  | OpportunityAnalysisResult
  | WorkflowFailureResult
  | null;

export interface WorkflowUpdatedEvent {
  status: WorkflowStatus;
  userId: string;
  workflowId: string;
}

const workflowLabels: Record<WorkflowType, string> = {
  bulk_launch_generation: "Bulk Launch Batch",
  competitor_analysis: "Competitor Analyzer",
  etsy_listing_launch_pack: "Etsy Launch Pack",
  launch_pack_generation: "Launch Pack",
  listing_forge: "Listing Generator",
  listing_intelligence: "Listing Intelligence",
  opportunity_analysis: "Opportunity Engine",
};

export function getWorkflowLabel(type: string): string {
  if (type in workflowLabels) {
    return workflowLabels[type as WorkflowType];
  }

  return type.replace(/_/g, " ");
}

export function getProductName(value: unknown): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.productName === "string") {
      return record.productName;
    }
    if (typeof record.keyword === "string") {
      return record.keyword;
    }
    if (typeof record.ideaName === "string") {
      return record.ideaName;
    }
    if (typeof record.url === "string") {
      return record.url;
    }
  }

  return "Unnamed Workflow";
}

export function isWorkflowFailureResult(value: unknown): value is WorkflowFailureResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "error" in value &&
      typeof (value as Record<string, unknown>).error === "string",
  );
}

export function isLaunchPack(value: unknown): value is LaunchPackResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "optimizedDescription" in value &&
      "tikTokHooks" in value &&
      Array.isArray((value as Record<string, unknown>).tikTokHooks),
  );
}

export function isListingIntelligenceResult(value: unknown): value is ListingIntelligenceResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "listingScore" in value &&
      "optimizedTitle" in value &&
      "suggestedTags" in value,
  );
}

export function isCompetitorAnalysisResult(value: unknown): value is CompetitorAnalysisResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "differentiationStrategy" in value &&
      "keywordOpportunities" in value,
  );
}

export function isOpportunityAnalysisResult(value: unknown): value is OpportunityAnalysisResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "competitionScore" in value &&
      "demandScore" in value &&
      "productIdeas" in value,
  );
}

export function isListingGeneratorResult(value: unknown): value is ListingGeneratorResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "title" in value &&
      "description" in value &&
      "tags" in value &&
      Array.isArray((value as Record<string, unknown>).tags),
  );
}
