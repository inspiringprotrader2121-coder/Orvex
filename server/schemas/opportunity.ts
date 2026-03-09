import { z } from "zod";
import { boundedScore } from "./common";

export const OpportunityInputSchema = z.object({
  keyword: z.string().min(2).max(120),
  projectId: z.string().uuid().optional(),
});

export const ProductIdeaSchema = z.object({
  competitionScore: boundedScore("Idea competition score"),
  demandScore: boundedScore("Idea demand score"),
  description: z.string().min(20),
  name: z.string().min(3).max(140),
  opportunityScore: boundedScore("Idea opportunity score"),
});

export const OpportunityAnalysisAiSchema = z.object({
  competitionScore: boundedScore("Competition score"),
  demandScore: boundedScore("Demand score"),
  trendScore: boundedScore("Trend score"),
  productIdeas: z.array(ProductIdeaSchema).min(3).max(8),
});

export type OpportunityInput = z.infer<typeof OpportunityInputSchema>;
export type ProductIdea = z.infer<typeof ProductIdeaSchema>;
export type OpportunityAnalysisAiOutput = z.infer<typeof OpportunityAnalysisAiSchema>;
