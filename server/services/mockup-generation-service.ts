import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mockupGenerations } from "@/lib/db/schema";
import { ImageAiClient } from "@server/ai/client";
import {
  MockupGenerationWorkflowResultSchema,
  type MockupChannel,
  type MockupGenerationWorkflowResult,
  type MockupImage,
} from "@server/schemas/mockup-generation";
import { env } from "@server/utils/env";
import { AssetStorageService } from "./asset-storage-service";
import { WorkflowService } from "./workflow-service";

const MOCKUP_VARIANTS: Array<{
  channel: MockupChannel;
  ratioLabel: string;
  size: "1024x1024" | "1024x1536" | "1536x1024";
}> = [
  { channel: "etsy", ratioLabel: "1:1 listing", size: "1024x1024" },
  { channel: "shopify", ratioLabel: "3:2 storefront", size: "1536x1024" },
  { channel: "instagram", ratioLabel: "4:5 social", size: "1024x1536" },
];

function buildHeroPrompt(input: {
  color: string;
  description: string;
  productName: string;
  style: string;
}) {
  return [
    `Create a polished ecommerce mockup for "${input.productName}".`,
    `Product description: ${input.description}`,
    `Primary color palette: ${input.color}.`,
    `Visual style: ${input.style}.`,
    "The product should feel premium, commercially realistic, and ready for digital seller storefronts.",
    "Use tasteful props, clean composition, soft studio lighting, and keep any text minimal and legible.",
  ].join(" ");
}

function buildVariantPrompt(heroPrompt: string, variant: {
  channel: MockupChannel;
  ratioLabel: string;
  size: "1024x1024" | "1024x1536" | "1536x1024";
}) {
  return [
    heroPrompt,
    `Output target: ${variant.channel}.`,
    `Aspect goal: ${variant.ratioLabel}.`,
    `Canvas size: ${variant.size}.`,
    variant.channel === "etsy"
      ? "Frame the product clearly against an Etsy-friendly lifestyle backdrop with space for thumbnail cropping."
      : variant.channel === "shopify"
        ? "Use a wider storefront composition with stronger hero-product emphasis and room for homepage overlays."
        : "Make the composition more social-first and visually punchy while keeping the product front and center.",
  ].join(" ");
}

async function persistArtifact(input: {
  color: string;
  description: string;
  heroPrompt: string;
  images: MockupImage[];
  productName: string;
  style: string;
  summary: string;
  userId: string;
  workflowId: string;
}) {
  await db.insert(mockupGenerations).values({
    color: input.color,
    description: input.description,
    heroPrompt: input.heroPrompt,
    images: input.images,
    productName: input.productName,
    style: input.style,
    summary: input.summary,
    updatedAt: new Date(),
    userId: input.userId,
    workflowId: input.workflowId,
  }).onConflictDoUpdate({
    target: mockupGenerations.workflowId,
    set: {
      color: input.color,
      description: input.description,
      heroPrompt: input.heroPrompt,
      images: input.images,
      productName: input.productName,
      style: input.style,
      summary: input.summary,
      updatedAt: new Date(),
      userId: input.userId,
    },
  });
}

export class MockupGenerationService {
  static getCreditCost() {
    return env.mockupCreditCostPerImage * MOCKUP_VARIANTS.length;
  }

  static async process(input: {
    color: string;
    description: string;
    productName: string;
    style: string;
    userId: string;
    workflowId: string;
  }): Promise<MockupGenerationWorkflowResult> {
    const heroPrompt = buildHeroPrompt(input);
    const images: MockupImage[] = [];

    await WorkflowService.markProcessing(input.workflowId, 10);

    for (const [index, variant] of MOCKUP_VARIANTS.entries()) {
      const prompt = buildVariantPrompt(heroPrompt, variant);
      const generated = await ImageAiClient.generate({
        background: "opaque",
        outputFormat: env.mockupImageOutputFormat as "jpeg" | "png" | "webp",
        prompt,
        quality: env.mockupImageQuality as "auto" | "high" | "low" | "medium",
        size: variant.size,
        tracking: {
          feature: "mockup_generation",
          metadata: {
            channel: variant.channel,
            ratioLabel: variant.ratioLabel,
          },
          userId: input.userId,
          workflowId: input.workflowId,
        },
      });

      const stored = await AssetStorageService.saveBase64Image({
        base64Data: generated.b64Json,
        extension: env.mockupImageOutputFormat as "jpeg" | "png" | "webp",
        fileName: `${variant.channel}-${variant.size}`,
        folderSegments: ["mockups", input.userId, input.workflowId],
      });

      images.push({
        channel: variant.channel,
        fileName: `${variant.channel}-${variant.size}.${env.mockupImageOutputFormat}`,
        prompt: generated.revisedPrompt,
        ratioLabel: variant.ratioLabel,
        size: variant.size,
        url: stored.url,
      });

      const progress = 25 + Math.round(((index + 1) / MOCKUP_VARIANTS.length) * 60);
      await WorkflowService.markProcessing(input.workflowId, progress);
    }

    const summary = `Generated ${images.length} mockups for ${input.productName} across Etsy, Shopify, and Instagram.`;
    const result = MockupGenerationWorkflowResultSchema.parse({
      color: input.color,
      description: input.description,
      heroPrompt,
      images,
      productName: input.productName,
      style: input.style,
      summary,
    });

    await persistArtifact({
      color: input.color,
      description: input.description,
      heroPrompt,
      images,
      productName: input.productName,
      style: input.style,
      summary,
      userId: input.userId,
      workflowId: input.workflowId,
    });

    return result;
  }

  static async listForUser(userId: string, limit = 12) {
    return db.query.mockupGenerations.findMany({
      where: eq(mockupGenerations.userId, userId),
      orderBy: [desc(mockupGenerations.createdAt)],
      limit,
    });
  }
}
