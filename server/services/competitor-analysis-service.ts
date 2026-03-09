import { db } from "@/lib/db";
import { competitorAnalyses } from "@/lib/db/schema";
import { StructuredAiClient } from "@server/ai/client";
import { CompetitorAnalysisSchema, type CompetitorAnalysisResult } from "@server/schemas/competitor-analysis";
import { scrapeListingByUrl } from "@server/scrapers";

export class CompetitorAnalysisService {
  static async process(input: {
    url: string;
    userId: string;
    workflowId: string;
  }): Promise<CompetitorAnalysisResult> {
    const snapshot = await scrapeListingByUrl(input.url);

    const result = await StructuredAiClient.generate({
      maxCompletionTokens: 900,
      schema: CompetitorAnalysisSchema,
      system: "You are Orvex, an expert marketplace competitor analyst. Break down a listing as a strategic competitor would. Return structured JSON only.",
      user: `
Evaluate this competitor listing and identify where the user can outperform it.

Title:
${snapshot.title}

Description:
${snapshot.description}

Tags:
${snapshot.tags.join(", ") || "No tags found"}

Seller:
${snapshot.sellerName || "Unknown"}

Return strengths, weaknesses, keyword opportunities, and a concrete differentiation strategy.
      `.trim(),
    });

    await db.insert(competitorAnalyses).values({
      differentiationStrategy: result.differentiationStrategy,
      keywordOpportunities: result.keywordOpportunities,
      listingDescription: snapshot.description,
      listingTags: snapshot.tags,
      listingTitle: snapshot.title,
      provider: snapshot.provider,
      rawListingData: snapshot,
      sourceUrl: snapshot.url,
      strengths: result.strengths,
      updatedAt: new Date(),
      userId: input.userId,
      weaknesses: result.weaknesses,
      workflowId: input.workflowId,
    }).onConflictDoUpdate({
      target: competitorAnalyses.workflowId,
      set: {
        differentiationStrategy: result.differentiationStrategy,
        keywordOpportunities: result.keywordOpportunities,
        listingDescription: snapshot.description,
        listingTags: snapshot.tags,
        listingTitle: snapshot.title,
        provider: snapshot.provider,
        rawListingData: snapshot,
        sourceUrl: snapshot.url,
        strengths: result.strengths,
        updatedAt: new Date(),
        userId: input.userId,
        weaknesses: result.weaknesses,
      },
    });

    return result;
  }
}
