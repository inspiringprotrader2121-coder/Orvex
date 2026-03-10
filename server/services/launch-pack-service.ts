import { db } from "@/lib/db";
import { launchPacks } from "@/lib/db/schema";
import { StructuredAiClient } from "@server/ai/client";
import { LaunchPackSchema, type LaunchPack } from "@server/schemas/launch-pack";
import { env } from "@server/utils/env";
import { AiCacheService } from "./ai-cache-service";
import { ModerationIngestService } from "./admin/moderation-ingest-service";

export class LaunchPackService {
  static async process(input: {
    audience?: string;
    category?: string;
    description: string;
    keyword?: string;
    productName: string;
    userId: string;
    workflowId: string;
  }): Promise<LaunchPack> {
    const { data: result } = await StructuredAiClient.generateWithCache({
      cache: {
        key: AiCacheService.buildKey("launch-pack:v1", {
          audience: input.audience ?? null,
          category: input.category ?? null,
          description: input.description,
          keyword: input.keyword ?? null,
          productName: input.productName,
        }),
        ttlSeconds: env.aiWorkflowCacheTtlSeconds,
      },
      maxCompletionTokens: 2_000,
      schema: LaunchPackSchema,
      system: "You are Orvex, an AI growth operating system for digital product sellers. Create launch assets that are commercially sharp, channel-specific, and ready to publish. Return structured JSON only.",
      tracking: {
        feature: "launch_pack_generation",
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `
Create a full one-click launch pack for this product.

Product name: ${input.productName}
Category: ${input.category || "Unknown"}
Audience: ${input.audience || "Unknown"}
Niche keyword: ${input.keyword || "Unknown"}
Description: ${input.description}

Return:
- SEO titles
- keyword tags
- optimized description
- FAQ
- exactly 20 TikTok hooks
- exactly 5 Pinterest captions
- email launch sequence
- 14 day launch calendar
      `.trim(),
    });

    await db.insert(launchPacks).values({
      emailLaunchSequence: result.emailLaunchSequence,
      faq: result.faq,
      ideaName: input.productName,
      keywordTags: result.keywordTags,
      launchCalendar: result.launchCalendar,
      nicheKeyword: input.keyword ?? null,
      optimizedDescription: result.optimizedDescription,
      pinterestCaptions: result.pinterestCaptions,
      seoTitles: result.seoTitles,
      tikTokHooks: result.tikTokHooks,
      updatedAt: new Date(),
      userId: input.userId,
      workflowId: input.workflowId,
    }).onConflictDoUpdate({
      target: launchPacks.workflowId,
      set: {
        emailLaunchSequence: result.emailLaunchSequence,
        faq: result.faq,
        ideaName: input.productName,
        keywordTags: result.keywordTags,
        launchCalendar: result.launchCalendar,
        nicheKeyword: input.keyword ?? null,
        optimizedDescription: result.optimizedDescription,
        pinterestCaptions: result.pinterestCaptions,
        seoTitles: result.seoTitles,
        tikTokHooks: result.tikTokHooks,
        updatedAt: new Date(),
        userId: input.userId,
      },
    });

    await ModerationIngestService.upsert({
      payload: result as Record<string, unknown>,
      summary: `Generated launch pack for ${input.productName}.`,
      title: input.productName,
      type: "ai_template",
      userId: input.userId,
      workflowId: input.workflowId,
    });

    return result;
  }
}
