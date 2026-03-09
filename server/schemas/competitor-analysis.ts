import { z } from "zod";

export const CompetitorAnalyzerInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  url: z.string().url(),
});

export const CompetitorAnalysisSchema = z.object({
  strengths: z.array(z.string()).min(2).max(8),
  weaknesses: z.array(z.string()).min(2).max(8),
  keywordOpportunities: z.array(z.string()).min(2).max(12),
  differentiationStrategy: z.string().min(50),
});

export type CompetitorAnalyzerInput = z.infer<typeof CompetitorAnalyzerInputSchema>;
export type CompetitorAnalysisResult = z.infer<typeof CompetitorAnalysisSchema>;
