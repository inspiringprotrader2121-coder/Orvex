import { z } from "zod";

export const LaunchPackInputSchema = z.object({
  audience: z.string().min(2).max(120).optional(),
  category: z.string().min(2).max(120).optional(),
  description: z.string().min(10).max(4000),
  keyword: z.string().min(2).max(120).optional(),
  opportunityId: z.string().uuid().optional(),
  productName: z.string().min(3).max(160),
  projectId: z.string().uuid().optional(),
});

export const LaunchPackSchema = z.object({
  seoTitles: z.array(z.string()).min(5).max(10),
  keywordTags: z.array(z.string()).min(10).max(20),
  optimizedDescription: z.string().min(80),
  faq: z.array(z.object({
    q: z.string(),
    a: z.string(),
  })).min(4).max(8),
  tikTokHooks: z.array(z.string()).min(20).max(20),
  pinterestCaptions: z.array(z.string()).min(5).max(5),
  emailLaunchSequence: z.array(z.object({
    subject: z.string(),
    body: z.string(),
  })).min(3).max(5),
  launchCalendar: z.array(z.object({
    day: z.number().int().min(1).max(14),
    objective: z.string(),
    task: z.string(),
  })).min(14).max(14),
});

export type LaunchPackInput = z.infer<typeof LaunchPackInputSchema>;
export type LaunchPack = z.infer<typeof LaunchPackSchema>;
