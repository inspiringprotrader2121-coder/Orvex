import { z } from "zod";
import { CompetitorAnalyzerInputSchema } from "./competitor-analysis";
import { LaunchPackInputSchema } from "./launch-pack";
import { ListingGeneratorInputSchema } from "./listing-generator";
import { ListingUrlInputSchema } from "./listing-intelligence";
import { MockupGenerationInputSchema } from "./mockup-generation";
import { MultiChannelLaunchPackInputSchema } from "./multi-channel-launch-pack";
import { OpportunityInputSchema } from "./opportunity";

export const WorkflowSubmissionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("listing_intelligence"),
    payload: ListingUrlInputSchema,
  }),
  z.object({
    type: z.literal("competitor_analysis"),
    payload: CompetitorAnalyzerInputSchema,
  }),
  z.object({
    type: z.literal("opportunity_analysis"),
    payload: OpportunityInputSchema,
  }),
  z.object({
    type: z.literal("listing_forge"),
    payload: ListingGeneratorInputSchema,
  }),
  z.object({
    type: z.literal("launch_pack_generation"),
    payload: LaunchPackInputSchema,
  }),
  z.object({
    type: z.literal("multi_channel_launch_pack"),
    payload: MultiChannelLaunchPackInputSchema,
  }),
  z.object({
    type: z.literal("mockup_generation"),
    payload: MockupGenerationInputSchema,
  }),
]);

export type WorkflowSubmission = z.infer<typeof WorkflowSubmissionSchema>;
