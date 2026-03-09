import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Flagship Workflow Schema: Listing Launch Pack
 * Designed for Etsy, Ecommerce, & POD.
 */
export const LaunchPackSchema = z.object({
    seoTitles: z.array(z.string()).describe("3 SEO-optimized product titles under 140 chars each"),
    keywordTags: z.array(z.string()).describe("13 high-intent keyword tags for Etsy/Google"),
    description: z.string().describe("Compelling, SEO-rich product description with feature bullet points"),
    faqs: z.array(z.object({
        q: z.string(),
        a: z.string()
    })).describe("Common customer FAQs and their optimized answers"),
    marketingHooks: z.array(z.string()).describe("Hook-y lines for Tiktok/Instagram/Pinterest captions"),
    emailSequence: z.array(z.object({
        subject: z.string(),
        body: z.string()
    })).describe("A 3-part email launch sequence (Announcement, FOMO, Last Call)")
});

export type LaunchPack = z.infer<typeof LaunchPackSchema>;

/**
 * AI Service for Generating Orchestrated Structured Growth Content
 */
export class AIService {
    static async generateLaunchPack(productInfo: {
        name: string,
        baseDescription: string,
        targetAudience: string,
        category: string
    }): Promise<LaunchPack> {
        const prompt = `
            You are the core engine of Orvex, a Growth Operating System for eCommerce.
            Your task is to generate a comprehensive "Listing Launch Pack" for a new product.
            
            PRODUCT DETAILS:
            Name: ${productInfo.name}
            Category: ${productInfo.category}
            Target Audience: ${productInfo.targetAudience}
            Base Description: ${productInfo.baseDescription}
            
            The output must be strictly valid JSON and follow the requested schema exactly.
            Ensure SEO optimization for Etsy, Amazon, and Google specifically.
        `;

        // Using Beta Structured Outputs
        const completion = await (openai.beta as any).chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: "You generate professional eCommerce growth and SEO content in structured JSON formats." },
                { role: "user", content: prompt }
            ],
            response_format: zodResponseFormat(LaunchPackSchema, "launch_pack"),
        });

        // Cast to 'any' to resolve 'Beta' type clashing with compiler
        const result = (completion.choices[0].message as any).parsed as LaunchPack;

        if (!result) throw new Error("AI failed to return valid structured output.");
        return result;
    }
}
