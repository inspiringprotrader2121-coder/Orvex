import { z } from "zod";

const relativePathSchema = z
  .string()
  .trim()
  .regex(/^\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/, "Redirect paths must be relative URLs");

export const CreditPackIdSchema = z.enum([
  "credits_50",
  "credits_120",
]);

export const SubscriptionPlanIdSchema = z.enum([
  "starter_monthly",
  "pro_monthly",
  "growth_monthly",
]);

export const StripeCheckoutRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    cancelPath: relativePathSchema.optional(),
    mode: z.literal("credits"),
    planId: CreditPackIdSchema,
    successPath: relativePathSchema.optional(),
  }),
  z.object({
    cancelPath: relativePathSchema.optional(),
    mode: z.literal("subscription"),
    planId: SubscriptionPlanIdSchema,
    successPath: relativePathSchema.optional(),
  }),
]);

export type CreditPackId = z.infer<typeof CreditPackIdSchema>;
export type SubscriptionPlanId = z.infer<typeof SubscriptionPlanIdSchema>;
export type StripeCheckoutRequest = z.infer<typeof StripeCheckoutRequestSchema>;
