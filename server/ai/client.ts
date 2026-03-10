import OpenAI from "openai";
import type { ImagesResponse } from "openai/resources/images";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ZodTypeAny } from "zod";
import { env } from "@server/utils/env";
import { AiUsageService } from "@server/services/ai-usage-service";
import { AiCacheService } from "@server/services/ai-cache-service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class StructuredAiClient {
  private static async requestStructured<TSchema extends ZodTypeAny>(options: {
    maxCompletionTokens?: number;
    schema: TSchema;
    system: string;
    user: string;
  }) {
    const completion = await openai.chat.completions.parse({
      model: env.aiModel,
      max_completion_tokens: options.maxCompletionTokens,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      response_format: zodResponseFormat(options.schema, "orvex_response"),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) {
      throw new Error("OpenAI returned an empty structured response");
    }

    return {
      parsed,
      usage: completion.usage,
    };
  }

  private static async recordUsage(options: {
    cacheHit: boolean;
    completionTokens?: number;
    feature: string;
    metadata?: Record<string, unknown>;
    model: string;
    promptTokens?: number;
    totalTokens?: number;
    userId: string;
    workflowId?: string;
  }) {
    await AiUsageService.recordUsage({
      cacheHit: options.cacheHit,
      completionTokens: options.completionTokens ?? 0,
      feature: options.feature,
      metadata: options.metadata,
      model: options.model,
      promptTokens: options.promptTokens ?? 0,
      totalTokens: options.totalTokens ?? 0,
      userId: options.userId,
      workflowId: options.workflowId,
    });
  }

  static async generate<TSchema extends ZodTypeAny>(options: {
    maxCompletionTokens?: number;
    schema: TSchema;
    system: string;
    tracking?: {
      feature: string;
      metadata?: Record<string, unknown>;
      userId: string;
      workflowId?: string;
    };
    user: string;
  }) {
    const completion = await this.requestStructured(options);

    if (options.tracking) {
      await this.recordUsage({
        cacheHit: false,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        feature: options.tracking.feature,
        metadata: options.tracking.metadata,
        model: env.aiModel,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
        userId: options.tracking.userId,
        workflowId: options.tracking.workflowId,
      });
    }

    return completion.parsed;
  }

  static async generateWithCache<TSchema extends ZodTypeAny>(options: {
    cache: {
      key: string;
      ttlSeconds: number;
    };
    maxCompletionTokens?: number;
    schema: TSchema;
    system: string;
    tracking?: {
      feature: string;
      metadata?: Record<string, unknown>;
      userId: string;
      workflowId?: string;
    };
    user: string;
  }): Promise<{
    cacheHit: boolean;
    cacheKey: string;
    data: TSchema["_output"];
  }> {
    const cached = await AiCacheService.getParsed(options.cache.key, options.schema);
    if (cached) {
      if (options.tracking) {
        await this.recordUsage({
          cacheHit: true,
          feature: options.tracking.feature,
          metadata: {
            ...options.tracking.metadata,
            cacheKey: options.cache.key,
          },
          model: env.aiModel,
          userId: options.tracking.userId,
          workflowId: options.tracking.workflowId,
        });
      }

      return {
        cacheHit: true,
        cacheKey: options.cache.key,
        data: cached,
      };
    }

    const completion = await this.requestStructured(options);
    await AiCacheService.setJson(options.cache.key, completion.parsed, options.cache.ttlSeconds);

    if (options.tracking) {
      await this.recordUsage({
        cacheHit: false,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        feature: options.tracking.feature,
        metadata: {
          ...options.tracking.metadata,
          cacheKey: options.cache.key,
        },
        model: env.aiModel,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
        userId: options.tracking.userId,
        workflowId: options.tracking.workflowId,
      });
    }

    return {
      cacheHit: false,
      cacheKey: options.cache.key,
      data: completion.parsed,
    };
  }
}

export class ImageAiClient {
  static async generate(options: {
    background?: "auto" | "opaque" | "transparent";
    model?: string;
    outputFormat?: "jpeg" | "png" | "webp";
    prompt: string;
    quality?: "auto" | "high" | "low" | "medium";
    size: "1024x1024" | "1024x1536" | "1536x1024";
    tracking: {
      feature: string;
      metadata?: Record<string, unknown>;
      userId: string;
      workflowId?: string;
    };
  }) {
    const response = await openai.images.generate({
      background: options.background ?? "opaque",
      model: options.model ?? env.mockupImageModel,
      output_format: options.outputFormat ?? "png",
      prompt: options.prompt,
      quality: options.quality ?? (env.mockupImageQuality as "auto" | "high" | "low" | "medium"),
      size: options.size,
      user: options.tracking.userId,
    }) as ImagesResponse;

    const image = response.data?.[0];
    if (!image?.b64_json) {
      throw new Error("OpenAI image generation returned no image payload");
    }

    if (response.usage) {
      await AiUsageService.recordUsage({
        cacheHit: false,
        completionTokens: response.usage.output_tokens ?? 0,
        feature: options.tracking.feature,
        metadata: {
          ...options.tracking.metadata,
          kind: "image_generation",
          size: options.size,
        },
        model: options.model ?? env.mockupImageModel,
        promptTokens: response.usage.input_tokens ?? 0,
        totalTokens: response.usage.total_tokens ?? 0,
        userId: options.tracking.userId,
        workflowId: options.tracking.workflowId,
      });
    }

    return {
      b64Json: image.b64_json,
      revisedPrompt: image.revised_prompt ?? options.prompt,
    };
  }
}
