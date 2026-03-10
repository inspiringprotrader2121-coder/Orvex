import { db } from "@/lib/db";
import { listingAnalyses } from "@/lib/db/schema";
import { StructuredAiClient } from "@server/ai/client";
import {
  ListingIntelligenceAiSchema,
  ListingIntelligenceReportSchema,
  type ListingIntelligenceReport,
} from "@server/schemas/listing-intelligence";
import { scrapeListingByUrl } from "@server/scrapers";
import { calculateListingScore } from "@server/utils/scoring";
import { env } from "@server/utils/env";
import { AiCacheService } from "./ai-cache-service";
import { ModerationIngestService } from "./admin/moderation-ingest-service";

export class ListingIntelligenceService {
  static async process(input: {
    url: string;
    userId: string;
    workflowId: string;
  }): Promise<ListingIntelligenceReport> {
    const snapshot = await scrapeListingByUrl(input.url);

    const { data: aiResult } = await StructuredAiClient.generateWithCache({
      cache: {
        key: AiCacheService.buildKey("listing-intelligence:v1", {
          description: snapshot.description,
          priceText: snapshot.priceText ?? null,
          provider: snapshot.provider,
          sellerName: snapshot.sellerName ?? null,
          tags: snapshot.tags,
          title: snapshot.title,
        }),
        ttlSeconds: env.aiWorkflowCacheTtlSeconds,
      },
      maxCompletionTokens: 1_200,
      schema: ListingIntelligenceAiSchema,
      system: "You are Orvex, a senior ecommerce growth strategist. Review marketplace listings like a top-tier conversion and SEO consultant. Return structured JSON only.",
      tracking: {
        feature: "listing_intelligence",
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `
Analyze the following Etsy listing.

Title:
${snapshot.title}

Description:
${snapshot.description}

Tags:
${snapshot.tags.join(", ") || "No tags found"}

Seller:
${snapshot.sellerName || "Unknown"}

Price:
${snapshot.priceText || "Unknown"}

Return:
- SEO Score
- Conversion Score
- Keyword Coverage
- Emotional Hook Score
- CTA Strength
- Strengths
- Weaknesses
- Keyword Gaps
- Optimized title
- Optimized description
- Suggested tags
      `.trim(),
    });

    const report = ListingIntelligenceReportSchema.parse({
      ...aiResult,
      listingScore: calculateListingScore(aiResult),
    });

    await db.insert(listingAnalyses).values({
      conversionScore: report.conversionScore,
      ctaStrength: report.ctaStrength,
      emotionalHookScore: report.emotionalHookScore,
      keywordCoverage: report.keywordCoverage,
      keywordGaps: report.keywordGaps,
      listingDescription: snapshot.description,
      listingScore: report.listingScore,
      listingTags: snapshot.tags,
      listingTitle: snapshot.title,
      optimizedDescription: report.optimizedDescription,
      optimizedTitle: report.optimizedTitle,
      provider: snapshot.provider,
      rawListingData: snapshot,
      seoScore: report.seoScore,
      sourceUrl: snapshot.url,
      strengths: report.strengths,
      suggestedTags: report.suggestedTags,
      updatedAt: new Date(),
      userId: input.userId,
      weaknesses: report.weaknesses,
      workflowId: input.workflowId,
    }).onConflictDoUpdate({
      target: listingAnalyses.workflowId,
      set: {
        conversionScore: report.conversionScore,
        ctaStrength: report.ctaStrength,
        emotionalHookScore: report.emotionalHookScore,
        keywordCoverage: report.keywordCoverage,
        keywordGaps: report.keywordGaps,
        listingDescription: snapshot.description,
        listingScore: report.listingScore,
        listingTags: snapshot.tags,
        listingTitle: snapshot.title,
        optimizedDescription: report.optimizedDescription,
        optimizedTitle: report.optimizedTitle,
        provider: snapshot.provider,
        rawListingData: snapshot,
        seoScore: report.seoScore,
        sourceUrl: snapshot.url,
        strengths: report.strengths,
        suggestedTags: report.suggestedTags,
        updatedAt: new Date(),
        userId: input.userId,
        weaknesses: report.weaknesses,
      },
    });

    await ModerationIngestService.upsert({
      payload: report as Record<string, unknown>,
      summary: `Generated optimization scorecard for ${snapshot.title}.`,
      title: snapshot.title,
      type: "listing_export",
      userId: input.userId,
      workflowId: input.workflowId,
    });

    return report;
  }
}
