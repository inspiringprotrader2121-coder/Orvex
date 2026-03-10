import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { competitorAnalyses } from "@/lib/db/schema";
import { StructuredAiClient } from "@server/ai/client";
import {
  CompetitorAnalysisAiSchema,
  CompetitorAnalysisSchema,
  type CompetitorAnalysisResult,
  type CompetitorMarketListing,
  type CompetitorTargetListing,
} from "@server/schemas/competitor-analysis";
import { scrapeListingByUrl, searchMarketplaceListings } from "@server/scrapers";
import { env } from "@server/utils/env";
import { AiCacheService } from "./ai-cache-service";
import { WorkflowService } from "./workflow-service";

const STOP_WORDS = new Set([
  "and",
  "are",
  "but",
  "digital",
  "download",
  "for",
  "from",
  "gift",
  "listing",
  "mum",
  "printable",
  "that",
  "the",
  "this",
  "with",
  "your",
]);

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeUrl(value: string) {
  const parsed = new URL(value);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function roundNumber(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits));
}

function parsePriceAmount(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value.replace(/[^0-9.,]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extractTerms(...values: Array<string | undefined>) {
  const tokens = values
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 2 && !STOP_WORDS.has(value));

  return Array.from(new Set(tokens));
}

function computeKeywordOverlap(candidateKeywords: string[], referenceKeywords: string[]) {
  if (!referenceKeywords.length) {
    return 0;
  }

  const candidateSet = new Set(candidateKeywords.map((value) => value.toLowerCase()));
  const shared = referenceKeywords.filter((value) => candidateSet.has(value.toLowerCase())).length;
  return Math.max(0, Math.min(100, Math.round((shared / referenceKeywords.length) * 100)));
}

function buildSearchQuery(input: {
  keyword?: string;
  targetListing?: CompetitorTargetListing | null;
}) {
  if (input.keyword?.trim()) {
    return input.keyword.trim();
  }

  const target = input.targetListing;
  if (!target) {
    return "";
  }

  const keywords = extractTerms(target.title, target.tags.join(" "), target.description);
  return keywords.slice(0, 5).join(" ");
}

function getListingId(url: string) {
  const match = url.match(/\/listing\/(\d+)/i);
  return match?.[1] ?? null;
}

function buildAnalysisKey(input: {
  keyword?: string;
  productName?: string;
  projectId?: string;
  url?: string;
}) {
  if (input.projectId) {
    return `project:${input.projectId}`;
  }

  if (input.productName?.trim()) {
    return `product:${normalizeText(input.productName)}`;
  }

  if (input.keyword?.trim()) {
    return `keyword:${normalizeText(input.keyword)}`;
  }

  if (input.url) {
    return `listing:${getListingId(input.url) ?? normalizeText(new URL(input.url).pathname)}`;
  }

  return `analysis:${Date.now()}`;
}

function buildTargetListing(input: {
  averageRating?: number | null;
  description: string;
  estimatedRank: number;
  keywords: string[];
  priceText?: string;
  provider: "amazon" | "etsy" | "gumroad" | "internal" | "shopify";
  reviewCount: number;
  sellerName?: string;
  tags: string[];
  title: string;
  url: string;
}): CompetitorTargetListing {
  return {
    averageRating: input.averageRating ?? null,
    description: input.description,
    estimatedRank: input.estimatedRank,
    keywordOverlap: 100,
    keywords: input.keywords,
    priceAmount: parsePriceAmount(input.priceText),
    priceText: input.priceText,
    provider: input.provider,
    reviewCount: input.reviewCount,
    sellerName: input.sellerName,
    shopName: input.sellerName,
    tags: input.tags,
    title: input.title,
    url: normalizeUrl(input.url),
  };
}

function buildPricingContext(targetListing: CompetitorTargetListing | null, comparisonSet: CompetitorMarketListing[]) {
  const marketPrices = comparisonSet
    .map((listing) => listing.priceAmount)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const targetPrice = targetListing?.priceAmount ?? null;

  if (!marketPrices.length) {
    return {
      currency: targetListing?.provider === "etsy" ? "USD" : undefined,
      marketAverage: targetPrice ?? 0,
      marketHigh: targetPrice ?? 0,
      marketLow: targetPrice ?? 0,
      targetPrice,
    };
  }

  return {
    currency: targetListing?.provider === "etsy" ? "USD" : undefined,
    marketAverage: roundNumber(average(marketPrices)),
    marketHigh: roundNumber(Math.max(...marketPrices)),
    marketLow: roundNumber(Math.min(...marketPrices)),
    targetPrice,
  };
}

function buildReviewContext(targetListing: CompetitorTargetListing | null, comparisonSet: CompetitorMarketListing[]) {
  const reviewCounts = comparisonSet.map((listing) => listing.reviewCount);
  const ratings = comparisonSet
    .map((listing) => listing.averageRating)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    marketAverageRating: ratings.length ? roundNumber(average(ratings), 1) : null,
    marketAverageReviewCount: Math.round(average(reviewCounts)),
    targetAverageRating: targetListing?.averageRating ?? null,
    targetReviewCount: targetListing?.reviewCount ?? 0,
  };
}

function buildRankingContext(targetListing: CompetitorTargetListing | null) {
  return {
    estimatedRank: targetListing?.estimatedRank ?? 1,
  };
}

async function getNextAnalysisVersion(userId: string, analysisKey: string) {
  const [record] = await db
    .select({
      latestVersion: sql<number>`coalesce(max(${competitorAnalyses.analysisVersion}), 0)`,
    })
    .from(competitorAnalyses)
    .where(and(eq(competitorAnalyses.userId, userId), eq(competitorAnalyses.analysisKey, analysisKey)));

  return (record?.latestVersion ?? 0) + 1;
}

function buildComparisonSet(input: {
  keyword: string;
  maxCompetitors: number;
  results: CompetitorMarketListing[];
  targetListing: CompetitorTargetListing | null;
}) {
  const referenceKeywords = input.targetListing
    ? extractTerms(input.targetListing.title, input.targetListing.tags.join(" "), input.keyword)
    : extractTerms(input.keyword);

  return input.results
    .slice(0, input.maxCompetitors)
    .map((listing) => ({
      ...listing,
      keywordOverlap: computeKeywordOverlap(listing.keywords, referenceKeywords),
    }));
}

export class CompetitorAnalysisService {
  static async process(input: {
    keyword?: string;
    maxCompetitors: number;
    productName?: string;
    projectId?: string;
    url?: string;
    userId: string;
    workflowId: string;
  }): Promise<CompetitorAnalysisResult> {
    await WorkflowService.markProcessing(input.workflowId, 20);

    const sourceType = input.url ? "listing" : "keyword";
    let targetListing: CompetitorTargetListing | null = null;
    let rawTargetData: Record<string, unknown> | null = null;

    if (input.url) {
      const snapshot = await scrapeListingByUrl(input.url);
      targetListing = buildTargetListing({
        averageRating: snapshot.averageRating,
        description: snapshot.description,
        estimatedRank: input.maxCompetitors + 1,
        keywords: extractTerms(snapshot.title, snapshot.tags.join(" "), snapshot.description),
        priceText: snapshot.priceText,
        provider: snapshot.provider,
        reviewCount: snapshot.reviewCount,
        sellerName: snapshot.sellerName,
        tags: snapshot.tags,
        title: snapshot.title,
        url: snapshot.url,
      });
      rawTargetData = snapshot;
    }

    const searchQuery = buildSearchQuery({
      keyword: input.keyword,
      targetListing,
    });

    if (!searchQuery) {
      throw new Error("Unable to derive a competitor search query");
    }

    await WorkflowService.markProcessing(input.workflowId, 45);

    const searchResults = await searchMarketplaceListings("etsy", searchQuery, {
      limit: input.maxCompetitors + (targetListing ? 1 : 0),
    });

    const normalizedTargetUrl = targetListing ? normalizeUrl(targetListing.url) : null;
    const withoutTarget = normalizedTargetUrl
      ? searchResults.filter((listing) => normalizeUrl(listing.url) !== normalizedTargetUrl)
      : searchResults;
    const matchedTarget = normalizedTargetUrl
      ? searchResults.find((listing) => normalizeUrl(listing.url) === normalizedTargetUrl)
      : null;

    if (targetListing) {
      targetListing = {
        ...targetListing,
        estimatedRank: matchedTarget?.estimatedRank ?? input.maxCompetitors + 1,
      };
    }

    const comparisonSet = buildComparisonSet({
      keyword: searchQuery,
      maxCompetitors: input.maxCompetitors,
      results: withoutTarget,
      targetListing,
    });

    if (!comparisonSet.length) {
      throw new Error("No marketplace competitors were found for this analysis");
    }

    const pricingContext = buildPricingContext(targetListing, comparisonSet);
    const reviewContext = buildReviewContext(targetListing, comparisonSet);
    const rankingContext = buildRankingContext(targetListing);
    const analysisKey = buildAnalysisKey(input);
    const analysisVersion = await getNextAnalysisVersion(input.userId, analysisKey);
    const inputLabel = input.productName?.trim()
      || targetListing?.title
      || input.keyword?.trim()
      || searchQuery;

    await WorkflowService.markProcessing(input.workflowId, 70);

    const { data: aiResult } = await StructuredAiClient.generateWithCache({
      cache: {
        key: AiCacheService.buildKey("competitor-analysis:v1", {
          comparisonSet,
          pricingContext,
          rankingContext,
          reviewContext,
          searchQuery,
          sourceType,
          targetListing,
        }),
        ttlSeconds: env.aiWorkflowCacheTtlSeconds,
      },
      maxCompletionTokens: 1_400,
      schema: CompetitorAnalysisAiSchema,
      system: "You are Orvex, a senior Etsy competitor strategist. Use the provided marketplace data to produce grounded competitor insight. Return structured JSON only. Do not invent extra fields.",
      tracking: {
        feature: "competitor_analysis",
        metadata: {
          analysisKey,
          searchQuery,
          sourceType,
        },
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `
Analyze this Etsy competitor landscape for a digital product seller.

Input label: ${inputLabel}
Source type: ${sourceType}
Search query: ${searchQuery}

Target listing:
${JSON.stringify(targetListing, null, 2)}

Marketplace comparison set:
${JSON.stringify(comparisonSet, null, 2)}

Derived pricing context:
${JSON.stringify(pricingContext, null, 2)}

Derived review context:
${JSON.stringify(reviewContext, null, 2)}

Derived ranking context:
${JSON.stringify(rankingContext, null, 2)}

Return:
- a concise summary
- pricing guidance with pricePositioning, pricePressureScore, and recommendation
- review guidance with trustSignalScore and recommendation
- ranking guidance with visibilityScore, rankingMomentumScore, and recommendation
- keyword metrics grounded in the market set
- strengths, weaknesses, keyword opportunities, and a concrete differentiation strategy
      `.trim(),
    });

    const result = CompetitorAnalysisSchema.parse({
      ...aiResult,
      analysisKey,
      analysisVersion,
      comparisonSet,
      inputLabel,
      pricing: {
        ...pricingContext,
        ...aiResult.pricing,
      },
      ranking: {
        ...rankingContext,
        ...aiResult.ranking,
      },
      reviews: {
        ...reviewContext,
        ...aiResult.reviews,
      },
      sourceType,
      targetListing,
    });

    await db.insert(competitorAnalyses).values({
      analysisKey,
      analysisVersion,
      comparisonSet,
      differentiationStrategy: result.differentiationStrategy,
      inputLabel,
      keywords: result.keywords,
      listingDescription: targetListing?.description ?? "",
      listingTags: targetListing?.tags ?? extractTerms(searchQuery),
      listingTitle: targetListing?.title ?? inputLabel,
      pricing: result.pricing,
      provider: targetListing?.provider ?? "etsy",
      ranking: result.ranking,
      rawListingData: {
        comparisonSet,
        rawTargetData,
        searchQuery,
        sourceType,
      },
      reviews: result.reviews,
      sourceType,
      sourceUrl: targetListing?.url ?? input.url ?? null,
      strengths: result.strengths,
      summary: result.summary,
      targetListing,
      updatedAt: new Date(),
      userId: input.userId,
      weaknesses: result.weaknesses,
      workflowId: input.workflowId,
      keywordOpportunities: result.keywordOpportunities,
    }).onConflictDoUpdate({
      target: competitorAnalyses.workflowId,
      set: {
        analysisKey,
        analysisVersion,
        comparisonSet,
        differentiationStrategy: result.differentiationStrategy,
        inputLabel,
        keywords: result.keywords,
        listingDescription: targetListing?.description ?? "",
        listingTags: targetListing?.tags ?? extractTerms(searchQuery),
        listingTitle: targetListing?.title ?? inputLabel,
        pricing: result.pricing,
        provider: targetListing?.provider ?? "etsy",
        ranking: result.ranking,
        rawListingData: {
          comparisonSet,
          rawTargetData,
          searchQuery,
          sourceType,
        },
        reviews: result.reviews,
        sourceType,
        sourceUrl: targetListing?.url ?? input.url ?? null,
        strengths: result.strengths,
        summary: result.summary,
        targetListing,
        updatedAt: new Date(),
        userId: input.userId,
        weaknesses: result.weaknesses,
        keywordOpportunities: result.keywordOpportunities,
      },
    });

    await WorkflowService.markProcessing(input.workflowId, 90);
    return result;
  }

  static async listForUser(userId: string, options?: {
    analysisKey?: string;
    limit?: number;
  }) {
    return db.query.competitorAnalyses.findMany({
      where: options?.analysisKey
        ? and(eq(competitorAnalyses.userId, userId), eq(competitorAnalyses.analysisKey, options.analysisKey))
        : eq(competitorAnalyses.userId, userId),
      orderBy: [desc(competitorAnalyses.createdAt)],
      limit: options?.limit ?? 12,
    });
  }
}
