import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { StructuredAiClient } from "@server/ai/client";
import { ListingGeneratorResultSchema, type ListingGeneratorResult } from "@server/schemas/listing-generator";
import { env } from "@server/utils/env";
import { AiCacheService } from "./ai-cache-service";
import { ModerationIngestService } from "./admin/moderation-ingest-service";

export class ListingGeneratorService {
  static async process(input: {
    productName: string;
    targetAudience: string;
    productType: string;
    tone: string;
    projectId?: string;
    userId: string;
    workflowId: string;
  }): Promise<ListingGeneratorResult> {
    const { data: result } = await StructuredAiClient.generateWithCache({
      cache: {
        key: AiCacheService.buildKey("listing-generator:v1", {
          productName: input.productName,
          productType: input.productType,
          targetAudience: input.targetAudience,
          tone: input.tone,
        }),
        ttlSeconds: env.aiWorkflowCacheTtlSeconds,
      },
      maxCompletionTokens: 1_600,
      schema: ListingGeneratorResultSchema,
      system: "You are Orvex, an expert Etsy SEO copywriter. Produce conversion-focused listings for digital products. Return structured JSON only.",
      tracking: {
        feature: "listing_generator",
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `
Generate a high-converting Etsy listing for a DIGITAL PRODUCT.

Product name: ${input.productName}
Target audience: ${input.targetAudience}
Product type: ${input.productType}
Tone: ${input.tone}

Rules:
- Title must be SEO optimized and under 140 characters.
- Description must start with a strong hook, clearly explain benefits, include bullet points, and end with a call to action.
- Tags must be high-intent Etsy search phrases (max 20 characters each, 5 to 13 tags).
- FAQ should be an array of concise Q/A strings (example: "Q: ... A: ...").
      `.trim(),
    });

    await db.insert(listings).values({
      description: result.description,
      faq: result.faq,
      productName: input.productName,
      productType: input.productType,
      projectId: input.projectId ?? null,
      tags: result.tags,
      targetAudience: input.targetAudience,
      title: result.title,
      tone: input.tone,
      updatedAt: new Date(),
      userId: input.userId,
      workflowId: input.workflowId,
    }).onConflictDoUpdate({
      target: listings.workflowId,
      set: {
        description: result.description,
        faq: result.faq,
        productName: input.productName,
        productType: input.productType,
        projectId: input.projectId ?? null,
        tags: result.tags,
        targetAudience: input.targetAudience,
        title: result.title,
        tone: input.tone,
        updatedAt: new Date(),
        userId: input.userId,
      },
    });

    await ModerationIngestService.upsert({
      payload: result as Record<string, unknown>,
      summary: `Generated Etsy listing copy for ${input.productName}.`,
      title: input.productName,
      type: "ai_template",
      userId: input.userId,
      workflowId: input.workflowId,
    });

    return result;
  }
}
