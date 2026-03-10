import { db } from "@/lib/db";
import { aiUsageEvents } from "@/lib/db/schema";

type UsagePricing = {
  completionMicrosPerToken: number;
  promptMicrosPerToken: number;
};

type RecordAiUsageInput = {
  cacheHit?: boolean;
  completionTokens: number;
  feature: string;
  metadata?: Record<string, unknown>;
  model: string;
  promptTokens: number;
  totalTokens: number;
  userId: string;
  workflowId?: string;
};

const DEFAULT_PRICING: Record<string, UsagePricing> = {
  "gpt-4o": {
    completionMicrosPerToken: 10,
    promptMicrosPerToken: 2.5,
  },
  "gpt-4o-2024-08-06": {
    completionMicrosPerToken: 10,
    promptMicrosPerToken: 2.5,
  },
};

function getPricing(model: string): UsagePricing {
  return DEFAULT_PRICING[model] ?? DEFAULT_PRICING["gpt-4o"];
}

export class AiUsageService {
  static async recordUsage(input: RecordAiUsageInput) {
    const pricing = getPricing(input.model);
    const costUsdMicros = Math.round(
      input.promptTokens * pricing.promptMicrosPerToken +
      input.completionTokens * pricing.completionMicrosPerToken,
    );

    await db.insert(aiUsageEvents).values({
      cacheHit: input.cacheHit ?? false,
      completionTokens: input.completionTokens,
      costUsdMicros,
      feature: input.feature,
      metadata: input.metadata ?? {},
      model: input.model,
      promptTokens: input.promptTokens,
      totalTokens: input.totalTokens,
      userId: input.userId,
      workflowId: input.workflowId ?? null,
    });
  }
}
