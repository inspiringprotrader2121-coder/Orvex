import { z } from "zod";

export const BulkLaunchRowSchema = z.object({
  audience: z.string().optional(),
  category: z.string().optional(),
  description: z.string().min(10),
  keyword: z.string().optional(),
  productName: z.string().min(3),
});

export const BulkGenerationInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  rows: z.array(BulkLaunchRowSchema).min(1).max(50),
});

export type BulkLaunchRow = z.infer<typeof BulkLaunchRowSchema>;
export type BulkGenerationInput = z.infer<typeof BulkGenerationInputSchema>;
