import { db } from "@/lib/db";
import { opportunities } from "@/lib/db/schema";
import { StructuredAiClient } from "@server/ai/client";
import { OpportunityAnalysisAiSchema, type OpportunityAnalysisAiOutput, type ProductIdea } from "@server/schemas/opportunity";
import { calculateOpportunityScore, clampScore } from "@server/utils/scoring";
import { env } from "@server/utils/env";
import { AiCacheService } from "./ai-cache-service";

type OpportunityResult = OpportunityAnalysisAiOutput & {
  opportunityScore: number;
  productIdeas: ProductIdea[];
};

export class OpportunityService {
  static async process(input: {
    keyword: string;
    userId: string;
    workflowId: string;
  }): Promise<OpportunityResult> {
    const keyword = input.keyword.trim();
    const { data: result } = await StructuredAiClient.generateWithCache({
      cache: {
        key: AiCacheService.buildKey("opportunity-analysis:v1", { keyword }),
        ttlSeconds: env.aiWorkflowCacheTtlSeconds,
      },
      maxCompletionTokens: 1_000,
      schema: OpportunityAnalysisAiSchema,
      system: "You are Orvex, an ecommerce product opportunity strategist. Evaluate demand, competition, and trend strength for keyword niches and propose product ideas. Return structured JSON only.",
      tracking: {
        feature: "opportunity_analysis",
        userId: input.userId,
        workflowId: input.workflowId,
      },
      user: `
Analyze the niche keyword "${keyword}" for digital sellers.

Return:
- demandScore from 0-100
- competitionScore from 0-100
- trendScore from 0-100
- 3 to 8 product ideas with name, demandScore, competitionScore, opportunityScore, and short description

Important:
- High competition should reduce overall opportunity
- Ideas should be relevant to Etsy, print-on-demand, or digital product creators
      `.trim(),
    });

    const opportunityScore = calculateOpportunityScore({
      competition: result.competitionScore,
      demand: result.demandScore,
      trend: result.trendScore,
    });

    const productIdeas = result.productIdeas.map((idea) => ({
      ...idea,
      opportunityScore: clampScore(
        idea.opportunityScore || calculateOpportunityScore({
          competition: idea.competitionScore,
          demand: idea.demandScore,
          trend: result.trendScore,
        }),
      ),
    }));

    await db.insert(opportunities).values({
      competitionScore: result.competitionScore,
      demandScore: result.demandScore,
      keyword,
      opportunityScore,
      productIdeas,
      trendScore: result.trendScore,
      updatedAt: new Date(),
      userId: input.userId,
      workflowId: input.workflowId,
    }).onConflictDoUpdate({
      target: opportunities.workflowId,
      set: {
        competitionScore: result.competitionScore,
        demandScore: result.demandScore,
        keyword,
        opportunityScore,
        productIdeas,
        trendScore: result.trendScore,
        updatedAt: new Date(),
        userId: input.userId,
      },
    });

    return {
      ...result,
      opportunityScore,
      productIdeas,
    };
  }
}
