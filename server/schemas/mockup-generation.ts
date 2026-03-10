import { z } from "zod";

export const MockupGenerationInputSchema = z.object({
  color: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(1_500),
  productName: z.string().trim().min(2).max(140),
  projectId: z.string().uuid().optional(),
  style: z.string().trim().min(2).max(120),
});

export const MockupChannelSchema = z.enum(["etsy", "shopify", "instagram"]);
export const MockupImageSizeSchema = z.enum(["1024x1024", "1536x1024", "1024x1536"]);

export const MockupImageSchema = z.object({
  channel: MockupChannelSchema,
  fileName: z.string().min(1),
  prompt: z.string().min(20),
  ratioLabel: z.string().min(2),
  size: MockupImageSizeSchema,
  url: z.string().min(1),
});

export const MockupGenerationResultSchema = z.object({
  heroPrompt: z.string().min(20),
  images: z.array(MockupImageSchema).length(3),
  summary: z.string().min(20),
});

export const MockupGenerationWorkflowResultSchema = MockupGenerationResultSchema.extend({
  color: z.string().min(2),
  description: z.string().min(20),
  productName: z.string().min(2),
  style: z.string().min(2),
});

export type MockupGenerationInput = z.infer<typeof MockupGenerationInputSchema>;
export type MockupChannel = z.infer<typeof MockupChannelSchema>;
export type MockupImage = z.infer<typeof MockupImageSchema>;
export type MockupGenerationResult = z.infer<typeof MockupGenerationResultSchema>;
export type MockupGenerationWorkflowResult = z.infer<typeof MockupGenerationWorkflowResultSchema>;
