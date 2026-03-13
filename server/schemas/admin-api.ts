import { z } from "zod";

const userIdSchema = z.string().uuid();
const optionalNotesSchema = z.string().trim().max(1_000).optional().nullable();
const queueNamesSchema = z.array(z.string().trim().min(1).max(40)).max(10).optional();
const permissionsSchema = z.array(z.string().trim().min(1).max(120)).max(300).optional();

export const AdminAlertPatchBodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("status"),
    alertId: z.string().uuid(),
    status: z.enum(["acknowledged", "resolved"]),
  }),
  z.object({
    mode: z.literal("thresholds"),
    backlogThreshold: z.coerce.number().int().min(1).max(10_000).optional(),
    failedJobsThreshold: z.coerce.number().int().min(1).max(10_000).optional(),
    paymentFailureThreshold: z.coerce.number().int().min(1).max(10_000).optional(),
    staleWorkerMinutes: z.coerce.number().int().min(1).max(1_440).optional(),
  }),
]);

export const AdminAutoscalePostBodySchema = z.object({
  action: z.enum(["scale_up", "scale_down"]),
});

export const AdminCreditsPostBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("adjust"),
    amount: z.coerce.number().int().min(-100_000).max(100_000).refine((value) => value !== 0, "Adjustment amount cannot be zero"),
    notes: optionalNotesSchema,
    userId: userIdSchema,
  }),
  z.object({
    action: z.literal("refund"),
    amountCents: z.coerce.number().int().min(1).max(5_000_000),
    creditsAmount: z.coerce.number().int().min(1).max(100_000),
    notes: optionalNotesSchema,
    userId: userIdSchema,
  }),
]);

export const AdminFeatureToggleBodySchema = z.object({
  description: z.string().trim().max(500).optional().nullable(),
  key: z.string().trim().min(2).max(120),
  scope: z.enum(["global", "tier", "user"]),
  state: z.enum(["enabled", "disabled", "beta"]),
  subscriptionTier: z.enum(["free", "starter", "pro", "growth", "enterprise"]).optional().nullable(),
  userId: userIdSchema.optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.scope === "user" && !value.userId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "userId is required for user scoped feature toggles",
      path: ["userId"],
    });
  }

  if (value.scope === "tier" && !value.subscriptionTier) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "subscriptionTier is required for tier scoped feature toggles",
      path: ["subscriptionTier"],
    });
  }
});

export const AdminModerationPatchBodySchema = z.discriminatedUnion("mode", [
  z.object({
    itemId: z.string().uuid(),
    mode: z.literal("item"),
    notes: optionalNotesSchema,
    status: z.enum(["approved", "flagged", "rejected"]),
  }),
  z.object({
    mode: z.literal("template"),
    status: z.enum(["approved", "flagged", "rejected"]),
    templateId: z.string().uuid(),
  }),
]);

export const AdminQueueActionBodySchema = z.object({
  action: z.enum(["cancel", "retry"]),
  jobId: z.string().trim().min(1).max(120),
  queueName: z.enum(["mockups", "workflows"]),
});

export const AdminRoleUpsertBodySchema = z.object({
  description: z.string().trim().max(500).optional().nullable(),
  id: z.string().uuid().optional().nullable(),
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_]+$/, "Role key must be lowercase alphanumeric with underscores"),
  name: z.string().trim().min(2).max(120),
  permissions: permissionsSchema,
});

export const AdminStoreConnectionPatchBodySchema = z.object({
  action: z.enum(["disconnect", "refresh"]),
  connectionId: z.string().uuid(),
});

export const AdminUserPatchBodySchema = z.object({
  action: z.enum(["adjust_credits", "delete", "set_role", "suspend", "upgrade"]),
  notes: optionalNotesSchema,
  value: z.union([z.string().trim().max(120), z.coerce.number(), z.null()]).optional(),
});

export const AdminWorkerActionBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    nodeId: z.string().uuid(),
    queueNames: queueNamesSchema,
  }),
  z.object({
    action: z.literal("restart"),
    nodeId: z.string().uuid(),
    queueNames: queueNamesSchema.optional(),
  }),
]);

