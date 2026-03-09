import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { StructuredAiClient } from "@server/ai/client";
import { ListingGeneratorResultSchema, type ListingGeneratorResult } from "@server/schemas/listing-generator";

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
    const result = await StructuredAiClient.generate({
      maxCompletionTokens: 1_600,
      schema: ListingGeneratorResultSchema,
      system: "You are Orvex, an expert Etsy SEO copywriter. Produce conversion-focused listings for digital products. Return structured JSON only.",
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

    return result;
  }
}
