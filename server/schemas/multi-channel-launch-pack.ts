import { z } from "zod";

export const MultiChannelLaunchPackInputSchema = z.object({
  productName: z.string().trim().min(2).max(160),
  productType: z.string().trim().min(2).max(120),
  projectId: z.string().uuid().optional(),
  targetAudience: z.string().trim().min(2).max(160),
});

export const ChannelContentSchema = z.object({
  caption: z.string().trim().min(40).max(400),
  description: z.string().trim().min(80).max(1_500),
  hashtags: z.array(z.string().trim().min(2).max(50)).min(3).max(12),
  title: z.string().trim().min(10).max(180),
});

export const MultiChannelLaunchPackChannelsSchema = z.object({
  amazon: ChannelContentSchema,
  etsy: ChannelContentSchema,
  instagram: ChannelContentSchema,
  pinterest: ChannelContentSchema,
  shopify: ChannelContentSchema,
  tiktok: ChannelContentSchema,
});

export const MultiChannelLaunchPackSchema = z.object({
  channels: MultiChannelLaunchPackChannelsSchema,
  summary: z.string().trim().min(40).max(500),
});

export type MultiChannelLaunchPackInput = z.infer<typeof MultiChannelLaunchPackInputSchema>;
export type MultiChannelLaunchPackChannels = z.infer<typeof MultiChannelLaunchPackChannelsSchema>;
export type MultiChannelLaunchPack = z.infer<typeof MultiChannelLaunchPackSchema>;
