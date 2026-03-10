import { z } from "zod";
import { boundedScore, ProviderSchema } from "./common";

export const CompetitorAnalyzerInputSchema = z.object({
  keyword: z.string().trim().min(2).max(120).optional(),
  maxCompetitors: z.coerce.number().int().min(3).max(8).default(5),
  productName: z.string().trim().min(2).max(140).optional(),
  projectId: z.string().uuid().optional(),
  url: z.string().url().optional(),
}).refine((value) => Boolean(value.url || value.keyword), {
  message: "Provide a listing URL or product keyword",
  path: ["url"],
});

export const CompetitorSourceTypeSchema = z.enum(["keyword", "listing"]);

export const CompetitorMarketListingSchema = z.object({
  averageRating: z.number().min(0).max(5).nullable().optional(),
  estimatedRank: z.number().int().positive(),
  keywordOverlap: boundedScore("keywordOverlap"),
  keywords: z.array(z.string()).max(12).default([]),
  priceAmount: z.number().nonnegative().nullable().optional(),
  priceText: z.string().optional(),
  provider: ProviderSchema.default("etsy"),
  reviewCount: z.number().int().min(0).default(0),
  shopName: z.string().optional(),
  title: z.string().min(1),
  url: z.string().url(),
});

export const CompetitorTargetListingSchema = CompetitorMarketListingSchema.extend({
  description: z.string().default(""),
  sellerName: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const CompetitorPricingInsightsSchema = z.object({
  pricePositioning: z.enum(["value", "market", "premium", "unknown"]),
  pricePressureScore: boundedScore("pricePressureScore"),
  recommendation: z.string().min(20),
});

export const CompetitorPricingSchema = CompetitorPricingInsightsSchema.extend({
  currency: z.string().optional(),
  marketAverage: z.number().nonnegative(),
  marketHigh: z.number().nonnegative(),
  marketLow: z.number().nonnegative(),
  targetPrice: z.number().nonnegative().nullable(),
});

export const CompetitorReviewInsightsSchema = z.object({
  recommendation: z.string().min(20),
  trustSignalScore: boundedScore("trustSignalScore"),
});

export const CompetitorReviewSchema = CompetitorReviewInsightsSchema.extend({
  marketAverageRating: z.number().min(0).max(5).nullable(),
  marketAverageReviewCount: z.number().int().min(0),
  targetAverageRating: z.number().min(0).max(5).nullable(),
  targetReviewCount: z.number().int().min(0),
});

export const CompetitorRankingInsightsSchema = z.object({
  rankingMomentumScore: boundedScore("rankingMomentumScore"),
  recommendation: z.string().min(20),
  visibilityScore: boundedScore("visibilityScore"),
});

export const CompetitorRankingSchema = CompetitorRankingInsightsSchema.extend({
  estimatedRank: z.number().int().positive(),
});

export const CompetitorKeywordMetricSchema = z.object({
  competitionScore: boundedScore("competitionScore"),
  keyword: z.string().min(1),
  opportunityScore: boundedScore("opportunityScore"),
  rankingScore: boundedScore("rankingScore"),
  trendScore: boundedScore("trendScore"),
});

export const CompetitorAnalysisAiSchema = z.object({
  differentiationStrategy: z.string().min(50),
  keywordOpportunities: z.array(z.string()).min(2).max(12),
  keywords: z.array(CompetitorKeywordMetricSchema).min(3).max(12),
  pricing: CompetitorPricingInsightsSchema,
  ranking: CompetitorRankingInsightsSchema,
  reviews: CompetitorReviewInsightsSchema,
  strengths: z.array(z.string()).min(2).max(8),
  summary: z.string().min(40),
  weaknesses: z.array(z.string()).min(2).max(8),
});

export const CompetitorAnalysisSchema = CompetitorAnalysisAiSchema.extend({
  analysisKey: z.string().min(1),
  analysisVersion: z.number().int().positive(),
  comparisonSet: z.array(CompetitorMarketListingSchema).min(1).max(12),
  inputLabel: z.string().min(1),
  pricing: CompetitorPricingSchema,
  ranking: CompetitorRankingSchema,
  reviews: CompetitorReviewSchema,
  sourceType: CompetitorSourceTypeSchema,
  targetListing: CompetitorTargetListingSchema.nullable(),
});

export type CompetitorAnalyzerInput = z.infer<typeof CompetitorAnalyzerInputSchema>;
export type CompetitorAnalysisAiResult = z.infer<typeof CompetitorAnalysisAiSchema>;
export type CompetitorAnalysisResult = z.infer<typeof CompetitorAnalysisSchema>;
export type CompetitorKeywordMetric = z.infer<typeof CompetitorKeywordMetricSchema>;
export type CompetitorMarketListing = z.infer<typeof CompetitorMarketListingSchema>;
export type CompetitorPricing = z.infer<typeof CompetitorPricingSchema>;
export type CompetitorRanking = z.infer<typeof CompetitorRankingSchema>;
export type CompetitorReviews = z.infer<typeof CompetitorReviewSchema>;
export type CompetitorSourceType = z.infer<typeof CompetitorSourceTypeSchema>;
export type CompetitorTargetListing = z.infer<typeof CompetitorTargetListingSchema>;
