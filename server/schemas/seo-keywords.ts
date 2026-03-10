import { z } from "zod";
import { boundedScore } from "./common";

export const SeoKeywordRequestSchema = z.object({
  inputText: z.string().min(5).max(500),
  source: z.enum(["niche", "listing"]),
});

export const SeoKeywordInsightSchema = z.object({
  keyword: z.string().min(1),
  trendScore: boundedScore("trendScore"),
  competitionScore: boundedScore("competitionScore"),
});

export const SeoKeywordAiSchema = z.object({
  optimizedTitle: z.string(),
  optimizedDescription: z.string(),
  optimizedMetaDescription: z.string(),
  tags: z.array(z.string()).min(3).max(12),
  keywords: z.array(SeoKeywordInsightSchema).min(3),
  notes: z.string().optional(),
});

export const SeoKeywordResultSchema = SeoKeywordAiSchema.extend({
  cacheKey: z.string().uuid().optional(),
  cacheHit: z.boolean().optional(),
  suggestionId: z.string().uuid().optional(),
});

export type SeoKeywordRequest = z.infer<typeof SeoKeywordRequestSchema>;
export type SeoKeywordAiResult = z.infer<typeof SeoKeywordAiSchema>;
export type SeoKeywordResult = z.infer<typeof SeoKeywordResultSchema>;
