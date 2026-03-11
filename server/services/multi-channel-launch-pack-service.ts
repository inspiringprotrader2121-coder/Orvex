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
  static async processChild(input: {
    channelsToGenerate: string[];
    productName: string;
    productType: string;
    targetAudience: string;
    userId: string;
    workflowId: string;
  }) {
    await WorkflowService.markProcessing(input.workflowId, 30);
    const { z } = require("zod");
    const { ChannelContentSchema } = require("@server/schemas/multi-channel-launch-pack");

    const schemaProps: Record<string, any> = {};
    for (const ch of input.channelsToGenerate) {
      schemaProps[ch] = ChannelContentSchema;
    }
    const dynamicSchema = z.object({
      channels: z.object(schemaProps)
    });

    const generated = await StructuredAiClient.generate({
      maxCompletionTokens: 2_500,
      schema: dynamicSchema,
      system: `You are Orvex, a senior multi-channel launch strategist. Generate commercially sharp, platform-aware launch copy. 
Follow these platform-specific rules:
- Reddit: Focus on "community value" over sales. Use conversational, non-corporate titles. Suggest relevant subreddits in the 'description' field.
- Pinterest: High-intent SEO focus. Titles should be "search-ready". Captions should be descriptive and invite the user to save/pin.
- Instagram: Visual-first tone. Use emojis naturally. Provide 3 tiers of hashtags (Broad, Niche, Brand).
- TikTok: Hook-focused. Captions must be short and include a clear CTA for the link in bio.`,
      tracking: {
        feature: "multi_channel_launch_pack",
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `
Create a specialized multi-channel launch pack for the following product:
Product Name: ${input.productName}
Product Type: ${input.productType}
Target Audience: ${input.targetAudience}

Generate tailored content ONLY for these channels:
${input.channelsToGenerate.map(c => `- ${c}`).join("\n")}

For each channel, provide:
1. title: An engaging, platform-optimized headline.
2. description: The primary body text or post content.
3. hashtags: A string of 5-15 relevant tags.
4. caption: A short, punchy summary for social sharing.
      `.trim(),
    });

    return generated.channels;
  }

  static async processParent(job: any, input: {
    productName: string;
    productType: string;
    targetAudience: string;
    userId: string;
    workflowId: string;
  }): Promise<MultiChannelLaunchPackResult> {
    const cacheKey = createCacheKey(input);
    const cacheClient = getCacheRedisClient();

    await WorkflowService.markProcessing(input.workflowId, 80);

    const childValues = await job.getChildrenValues();
    const mergedChannels: any = {};
    for (const val of Object.values(childValues)) {
       Object.assign(mergedChannels, val);
    }

    const { z } = require("zod");
    const generatedSummary = await StructuredAiClient.generate({
      maxCompletionTokens: 500,
      schema: z.object({ summary: z.string().trim().min(40).max(500) }),
      system: "You are Orvex, a senior multi-channel launch strategist. Return structured JSON only.",
      tracking: {
        feature: "multi_channel_launch_pack",
        metadata: { cacheKey },
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `Write a brief 1-2 paragraph summary for the multi-channel launch strategy of the product: ${input.productName}`
    });

    const result = {
      channels: mergedChannels,
      summary: generatedSummary.summary,
      productName: input.productName,
      productType: input.productType,
      targetAudience: input.targetAudience,
    };

    await WorkflowService.markProcessing(input.workflowId, 90);

    await persistArtifact({
      cacheHit: false,
      channels: result.channels,
      productName: input.productName,
      productType: input.productType,
      summary: result.summary,
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
      JSON.stringify({ channels: result.channels, summary: result.summary }),
      "EX",
      env.multiChannelLaunchPackCacheTtlSeconds,
    );

    return result as MultiChannelLaunchPackResult;
  }
}
