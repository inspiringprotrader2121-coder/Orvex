import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listings, seoKeywordSuggestions } from "@/lib/db/schema";
import { StructuredAiClient } from "@server/ai/client";
import { SeoKeywordAiSchema, SeoKeywordAiResult, SeoKeywordResult } from "@server/schemas/seo-keywords";
import { WorkflowService } from "./workflow-service";
import { env } from "@server/utils/env";

type ProcessInput = {
  inputText: string;
  source: "niche" | "listing";
  userId: string;
  workflowId: string;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildCacheKey(input: ProcessInput) {
  const normalized = `${input.source}:${normalizeText(input.inputText)}`;
  return createHash("sha256").update(`seo-keyword:${normalized}`).digest("hex");
}

async function persistSuggestion(input: {
  autoApplied?: boolean;
  cacheHit: boolean;
  cacheKey: string;
  keywords: SeoKeywordAiResult["keywords"];
  optimizedDescription: string;
  optimizedMetaDescription: string;
  optimizedTitle: string;
  tags: string[];
  userId: string;
  workflowId: string;
  inputText: string;
  source: "niche" | "listing";
}) {
  const [record] = await db.insert(seoKeywordSuggestions).values({
    autoApplyNotes: null,
    autoApplied: input.autoApplied ?? false,
    cacheHit: input.cacheHit,
    cacheKey: input.cacheKey,
    inputText: input.inputText,
    keywords: input.keywords,
    optimizedDescription: input.optimizedDescription,
    optimizedMetaDescription: input.optimizedMetaDescription,
    optimizedTitle: input.optimizedTitle,
    source: input.source,
    tags: input.tags,
    updatedAt: new Date(),
    userId: input.userId,
    workflowId: input.workflowId,
  })
  .onConflictDoUpdate({
    target: seoKeywordSuggestions.workflowId,
    set: {
      autoApplied: input.autoApplied ?? false,
      autoApplyNotes: null,
      cacheHit: input.cacheHit,
      cacheKey: input.cacheKey,
      inputText: input.inputText,
      keywords: input.keywords,
      optimizedDescription: input.optimizedDescription,
      optimizedMetaDescription: input.optimizedMetaDescription,
      optimizedTitle: input.optimizedTitle,
      source: input.source,
      tags: input.tags,
      updatedAt: new Date(),
      userId: input.userId,
    },
  })
  .returning({ id: seoKeywordSuggestions.id });

  return record?.id;
}

function buildResult(payload: SeoKeywordAiResult & { cacheKey: string; cacheHit: boolean }, suggestionId?: string): SeoKeywordResult {
  return {
    ...payload,
    cacheHit: payload.cacheHit,
    cacheKey: payload.cacheKey,
    suggestionId,
  };
}

export class SeoKeywordService {
  static async process(input: ProcessInput): Promise<SeoKeywordResult> {
    await WorkflowService.markProcessing(input.workflowId, 30);
    const cacheKey = buildCacheKey(input);
    const { cacheHit, data: generated } = await StructuredAiClient.generateWithCache({
      cache: {
        key: cacheKey,
        ttlSeconds: env.seoKeywordCacheTtlSeconds,
      },
      maxCompletionTokens: 1_200,
      schema: SeoKeywordAiSchema,
      system: "You are a senior SEO growth strategist focusing on Etsy, Shopify, Amazon, and creator digital products. Generate keyword suggestions, tags, and meta descriptions with structured JSON only.",
      tracking: {
        feature: "seo_keyword_analysis",
        metadata: { cacheKey },
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `
Product description:
${input.inputText}

Return trending keywords with trend and competition scores, 8-12 SEO tags, optimized title, optimized description, and meta description.
      `.trim(),
    });

    const suggestionId = await persistSuggestion({
      ...input,
      cacheHit,
      cacheKey,
      keywords: generated.keywords,
      optimizedDescription: generated.optimizedDescription,
      optimizedMetaDescription: generated.optimizedMetaDescription,
      optimizedTitle: generated.optimizedTitle,
      tags: generated.tags,
    });

    const resultWithId = buildResult({
      ...generated,
      cacheHit,
      cacheKey,
    }, suggestionId);
    await WorkflowService.markProcessing(input.workflowId, cacheHit ? 65 : 85);
    return resultWithId;
  }

  static async listForUser(userId: string, limit = 10) {
    return db.query.seoKeywordSuggestions.findMany({
      where: eq(seoKeywordSuggestions.userId, userId),
      orderBy: [desc(seoKeywordSuggestions.createdAt)],
      limit,
    });
  }

  static async applyToListing(input: {
    suggestionId: string;
    listingId: string;
    notes?: string | null;
    userId: string;
  }) {
    const suggestion = await db.query.seoKeywordSuggestions.findFirst({
      where: eq(seoKeywordSuggestions.id, input.suggestionId),
    });

    if (!suggestion || suggestion.userId !== input.userId) {
      throw new Error("Suggestion not found");
    }

    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, input.listingId),
    });

    if (!listing || listing.userId !== input.userId) {
      throw new Error("Listing not found");
    }

    await db.update(listings).set({
      description: suggestion.optimizedDescription,
      tags: suggestion.tags,
      title: suggestion.optimizedTitle,
      updatedAt: new Date(),
    }).where(eq(listings.id, listing.id));

    await db.update(seoKeywordSuggestions).set({
      appliedListingId: listing.id,
      autoApplied: true,
      autoApplyNotes: input.notes ?? null,
      updatedAt: new Date(),
    }).where(eq(seoKeywordSuggestions.id, suggestion.id));
  }
}
