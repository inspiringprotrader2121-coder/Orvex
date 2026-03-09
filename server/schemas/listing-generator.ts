import { z } from "zod";

export const ListingGeneratorInputSchema = z.object({
  productName: z.string().trim().min(2),
  targetAudience: z.string().trim().min(2),
  productType: z.string().trim().min(2),
  tone: z.string().trim().min(2),
  projectId: z.string().uuid().optional(),
});

export const ListingGeneratorResultSchema = z.object({
  title: z.string().trim().min(10).max(140),
  description: z.string().trim().min(120),
  tags: z.array(z.string().trim().min(2).max(20)).min(5).max(13),
  faq: z.array(z.string().trim().min(5).max(200)).min(3).max(10),
});

export type ListingGeneratorResult = z.infer<typeof ListingGeneratorResultSchema>;
