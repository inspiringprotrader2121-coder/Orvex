import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { multiChannelLaunchPacks } from "@/lib/db/schema";
import { getCacheRedisClient } from "@/lib/cache";
import { StructuredAiClient } from "@server/ai/client";
import { AiUsageService } from "@server/services/ai-usage-service";
import {
  MultiChannelLaunchPackSchema,
  type MultiChannelLaunchPack,
} from "@server/schemas/multi-channel-launch-pack";
import { env } from "@server/utils/env";
import { ModerationIngestService } from "./admin/moderation-ingest-service";
import { WorkflowService } from "./workflow-service";

type MultiChannelLaunchPackResult = MultiChannelLaunchPack & {
  productName: string;
  productType: string;
  targetAudience: string;
};

function normalizeForCache(input: {
  productName: string;
  productType: string;
  targetAudience: string;
}) {
  return JSON.stringify({
    productName: input.productName.trim().toLowerCase(),
    productType: input.productType.trim().toLowerCase(),
    targetAudience: input.targetAudience.trim().toLowerCase(),
    version: 1,
  });
}

function createCacheKey(input: {
  productName: string;
  productType: string;
  targetAudience: string;
}) {
  return createHash("sha256").update(normalizeForCache(input)).digest("hex");
}

async function persistArtifact(input: {
  cacheHit: boolean;
  channels: MultiChannelLaunchPack["channels"];
  productName: string;
  productType: string;
  summary: string;
  targetAudience: string;
  userId: string;
  workflowId: string;
}) {
  const cacheKey = createCacheKey(input);

  await db.insert(multiChannelLaunchPacks).values({
    cacheHit: input.cacheHit,
    cacheKey,
    channels: input.channels,
    productName: input.productName,
    productType: input.productType,
    summary: input.summary,
    targetAudience: input.targetAudience,
    updatedAt: new Date(),
    userId: input.userId,
    workflowId: input.workflowId,
  }).onConflictDoUpdate({
    target: multiChannelLaunchPacks.workflowId,
    set: {
      cacheHit: input.cacheHit,
      cacheKey,
      channels: input.channels,
      productName: input.productName,
      productType: input.productType,
      summary: input.summary,
      targetAudience: input.targetAudience,
      updatedAt: new Date(),
      userId: input.userId,
    },
  });
}

export class MultiChannelLaunchPackService {
  static async process(input: {
    productName: string;
    productType: string;
    targetAudience: string;
    userId: string;
    workflowId: string;
  }): Promise<MultiChannelLaunchPackResult> {
    const cacheKey = createCacheKey(input);
    const cacheClient = getCacheRedisClient();

    await WorkflowService.markProcessing(input.workflowId, 30);

    const cachedValue = await cacheClient?.get(`multi-launch-pack:${cacheKey}`);
    if (cachedValue) {
      const cachedResult = MultiChannelLaunchPackSchema.parse(JSON.parse(cachedValue));
      const result = {
        ...cachedResult,
        productName: input.productName,
        productType: input.productType,
        targetAudience: input.targetAudience,
      };

      await persistArtifact({
        cacheHit: true,
        channels: cachedResult.channels,
        productName: input.productName,
        productType: input.productType,
        summary: cachedResult.summary,
        targetAudience: input.targetAudience,
        userId: input.userId,
        workflowId: input.workflowId,
      });

      await AiUsageService.recordUsage({
        cacheHit: true,
        completionTokens: 0,
        feature: "multi_channel_launch_pack",
        metadata: { cacheKey },
        model: env.aiModel,
        promptTokens: 0,
        totalTokens: 0,
        userId: input.userId,
        workflowId: input.workflowId,
      });

      return result;
    }

    await WorkflowService.markProcessing(input.workflowId, 65);

    const generated = await StructuredAiClient.generate({
      maxCompletionTokens: 2_600,
      schema: MultiChannelLaunchPackSchema,
      system: "You are Orvex, a senior multi-channel launch strategist for digital product sellers. Produce channel-specific launch copy that is commercially sharp and platform-aware. Return structured JSON only.",
      tracking: {
        feature: "multi_channel_launch_pack",
        metadata: { cacheKey },
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `
Create a multi-channel launch pack for this digital product.

Product name: ${input.productName}
Target audience: ${input.targetAudience}
Product type: ${input.productType}

Return channel-specific launch copy for:
- Etsy
- Shopify
- Amazon
- TikTok
- Pinterest
- Instagram

For every channel return:
- title
- description
- hashtags
- caption

Guidance:
- Etsy should feel keyword-aware and marketplace-ready.
- Shopify should feel like premium storefront copy.
- Amazon should be clear, benefit-led, and catalog-friendly.
- TikTok should be hook-driven and momentum-focused.
- Pinterest should be discovery-friendly and click-oriented.
- Instagram should feel social, polished, and creator-ready.
      `.trim(),
    });

    const result = {
      ...generated,
      productName: input.productName,
      productType: input.productType,
      targetAudience: input.targetAudience,
    };

    await WorkflowService.markProcessing(input.workflowId, 90);

    await persistArtifact({
      cacheHit: false,
      channels: generated.channels,
      productName: input.productName,
      productType: input.productType,
      summary: generated.summary,
      targetAudience: input.targetAudience,
      userId: input.userId,
      workflowId: input.workflowId,
    });

    await ModerationIngestService.upsert({
      payload: result as Record<string, unknown>,
      summary: `Generated multi-channel launch content for ${input.productName}.`,
      title: input.productName,
      type: "ai_template",
      userId: input.userId,
      workflowId: input.workflowId,
    });

    await cacheClient?.set(
      `multi-launch-pack:${cacheKey}`,
      JSON.stringify(generated),
      "EX",
      env.multiChannelLaunchPackCacheTtlSeconds,
    );

    return result;
  }
}
