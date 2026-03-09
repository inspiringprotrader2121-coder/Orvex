import { z } from "zod";

export const ProviderSchema = z.enum(["etsy", "shopify", "amazon", "gumroad", "internal"]);

export const WorkflowTypeSchema = z.enum([
  "listing_intelligence",
  "competitor_analysis",
  "opportunity_analysis",
  "listing_forge",
  "launch_pack_generation",
  "bulk_launch_generation",
  "etsy_listing_launch_pack",
]);

export const WorkflowStatusSchema = z.enum([
  "pending",
  "queued",
  "processing",
  "completed",
  "failed",
]);

export function boundedScore(fieldName: string) {
  return z.coerce.number().int().min(0).max(100).describe(fieldName);
}
