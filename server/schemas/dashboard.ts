import { z } from "zod";

export const DashboardFilterSchema = z.object({
  channel: z.enum(["all", "discover", "forge", "optimize", "launch"]).default("all"),
  dateRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
  product: z.string().trim().max(120).default(""),
  store: z.enum(["all", "amazon", "etsy", "gumroad", "internal", "shopify"]).default("all"),
});

export const DashboardRollbackSchema = z.object({
  workflowId: z.string().uuid(),
});

export type DashboardFilterInput = z.infer<typeof DashboardFilterSchema>;
export type DashboardRollbackInput = z.infer<typeof DashboardRollbackSchema>;
