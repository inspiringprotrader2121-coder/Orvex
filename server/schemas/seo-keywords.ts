import { z } from "zod";
import { CompetitorMarketListingSchema } from "./competitor-analysis";
import { boundedScore, ProviderSchema } from "./common";

export const SeoKeywordRequestSchema = z.object({
  inputText: z.string().min(5).max(500),
  source: z.enum(["niche", "listing"]),
});

export const SeoKeywordApplyRequestSchema = z.object({
  listingId: z.string().uuid(),
  notes: z.string().trim().max(1_000).optional().nullable(),
  suggestionId: z.string().uuid(),
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
  cacheKey: z.string().optional(),
  cacheHit: z.boolean().optional(),
  suggestionId: z.string().uuid().optional(),
});

export const SeoKeywordMarketRequestSchema = z.object({
  keyword: z.string().trim().min(2).max(120),
  provider: ProviderSchema.default("etsy"),
  limit: z.number().int().min(3).max(40).default(24),
});

export const SeoKeywordMarketStatsSchema = z.object({
  averagePrice: z.number().nullable(),
  lowPrice: z.number().nullable(),
  highPrice: z.number().nullable(),
  averageRating: z.number().nullable(),
  averageReviewCount: z.number().nullable(),
  medianReviewCount: z.number().nullable(),
  competitionScore: z.number().min(0).max(100),
  sampledListings: z.number().int().min(0),
});

export const SeoKeywordMarketResponseSchema = z.object({
  keyword: z.string(),
  provider: ProviderSchema,
  cacheHit: z.boolean(),
  capturedAt: z.string(),
  stats: SeoKeywordMarketStatsSchema,
  listings: z.array(CompetitorMarketListingSchema).max(40),
});

export type SeoKeywordRequest = z.infer<typeof SeoKeywordRequestSchema>;
export type SeoKeywordApplyRequest = z.infer<typeof SeoKeywordApplyRequestSchema>;
export type SeoKeywordAiResult = z.infer<typeof SeoKeywordAiSchema>;
export type SeoKeywordResult = z.infer<typeof SeoKeywordResultSchema>;
export type SeoKeywordMarketRequest = z.infer<typeof SeoKeywordMarketRequestSchema>;
export type SeoKeywordMarketResponse = z.infer<typeof SeoKeywordMarketResponseSchema>;
