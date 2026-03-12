import { AiCacheService } from "@server/services/ai-cache-service";
import { searchMarketplaceListings } from "@server/scrapers";
import type { MarketplaceProvider, MarketplaceSearchListing } from "@server/scrapers/types";
import {
  SeoKeywordMarketRequestSchema,
  SeoKeywordMarketResponseSchema,
  type SeoKeywordMarketResponse,
} from "@server/schemas/seo-keywords";
import { env } from "@server/utils/env";

const DEFAULT_SAMPLE_LIMIT = 24;

function normalizeKeyword(keyword: string) {
  return keyword.trim().replace(/\s+/g, " ");
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function min(values: number[]) {
  return values.length === 0 ? null : Math.min(...values);
}

function max(values: number[]) {
  return values.length === 0 ? null : Math.max(...values);
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function scoreCompetition(listings: MarketplaceSearchListing[], sampleLimit: number) {
  const reviews = listings
    .map((listing) => listing.reviewCount)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  const medianReviews = median(reviews) ?? 0;
  const reviewScore = clamp(medianReviews / 500, 0, 1);
  const saturationScore = clamp(listings.length / Math.max(sampleLimit, 1), 0, 1);

  return Math.round((reviewScore * 0.7 + saturationScore * 0.3) * 100);
}

function buildStats(listings: MarketplaceSearchListing[], sampleLimit: number) {
  const prices = listings
    .map((listing) => listing.priceAmount ?? null)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const ratings = listings
    .map((listing) => listing.averageRating ?? null)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const reviews = listings
    .map((listing) => listing.reviewCount ?? null)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    averagePrice: average(prices),
    lowPrice: min(prices),
    highPrice: max(prices),
    averageRating: average(ratings),
    averageReviewCount: average(reviews),
    medianReviewCount: median(reviews),
    competitionScore: scoreCompetition(listings, sampleLimit),
    sampledListings: listings.length,
  };
}

export class SeoKeywordMarketService {
  static async searchMarketplace(input: unknown): Promise<SeoKeywordMarketResponse> {
    const request = SeoKeywordMarketRequestSchema.parse(input);
    const normalizedKeyword = normalizeKeyword(request.keyword);
    const limit = request.limit ?? DEFAULT_SAMPLE_LIMIT;
    const provider = request.provider as MarketplaceProvider;
    const cacheKey = AiCacheService.buildKey("seo-market", {
      keyword: normalizedKeyword,
      limit,
      provider,
    });

    const cached = await AiCacheService.getParsed(cacheKey, SeoKeywordMarketResponseSchema);
    if (cached) {
      return SeoKeywordMarketResponseSchema.parse({
        ...cached,
        cacheHit: true,
      });
    }

    const listings = await searchMarketplaceListings(provider, normalizedKeyword, { limit });
    const stats = buildStats(listings, limit);
    const response: SeoKeywordMarketResponse = {
      keyword: normalizedKeyword,
      provider,
      cacheHit: false,
      capturedAt: new Date().toISOString(),
      stats,
      listings,
    };

    await AiCacheService.setJson(cacheKey, response, env.seoKeywordCacheTtlSeconds);
    return response;
  }
}
