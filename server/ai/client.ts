import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ZodTypeAny } from "zod";
import { env } from "@server/utils/env";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class StructuredAiClient {
  static async generate<TSchema extends ZodTypeAny>(options: {
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

    return parsed;
  }
}
