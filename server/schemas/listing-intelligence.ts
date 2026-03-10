import { z } from "zod";
import { boundedScore, ProviderSchema } from "./common";

export const ListingUrlInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  url: z.string().url(),
});

export const ScrapedListingSnapshotSchema = z.object({
  averageRating: z.number().min(0).max(5).nullable().optional(),
  currency: z.string().optional(),
  description: z.string().default(""),
  images: z.array(z.string().url()).default([]),
  priceText: z.string().optional(),
  provider: ProviderSchema.default("etsy"),
  reviewCount: z.number().int().min(0).default(0),
  sellerName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  title: z.string(),
  url: z.string().url(),
});

export const ListingIntelligenceAiSchema = z.object({
  seoScore: boundedScore("SEO Score"),
  conversionScore: boundedScore("Conversion Score"),
  keywordCoverage: boundedScore("Keyword Coverage"),
  emotionalHookScore: boundedScore("Emotional Hook Score"),
  ctaStrength: boundedScore("CTA Strength"),
  strengths: z.array(z.string()).min(2).max(8),
  weaknesses: z.array(z.string()).min(2).max(8),
  keywordGaps: z.array(z.string()).min(1).max(10),
  optimizedTitle: z.string().min(10).max(200),
  optimizedDescription: z.string().min(50),
  suggestedTags: z.array(z.string()).min(3).max(20),
});

export const ListingIntelligenceReportSchema = ListingIntelligenceAiSchema.extend({
  listingScore: boundedScore("Listing Score"),
});

export type ListingUrlInput = z.infer<typeof ListingUrlInputSchema>;
export type ScrapedListingSnapshot = z.infer<typeof ScrapedListingSnapshotSchema>;
export type ListingIntelligenceAiOutput = z.infer<typeof ListingIntelligenceAiSchema>;
export type ListingIntelligenceReport = z.infer<typeof ListingIntelligenceReportSchema>;
