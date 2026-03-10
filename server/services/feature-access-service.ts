import { db } from "@/lib/db";
import { featureToggles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class FeatureDisabledError extends Error {
  constructor(featureKey: string) {
    super(`${featureKey} is not enabled for this account`);
    this.name = "FeatureDisabledError";
  }
}

export class FeatureAccessService {
  static async isEnabled(featureKey: string, options: {
    subscriptionTier?: "enterprise" | "free" | "growth" | "pro" | "starter" | null;
    subscriptionStatus?: "active" | "canceled" | "inactive" | "past_due" | "trialing" | null;
    userId: string;
  }) {
    let subscriptionTier = options.subscriptionTier ?? null;
    let subscriptionStatus = options.subscriptionStatus ?? null;

    if (!subscriptionTier || !subscriptionStatus) {
      const user = await db.query.users.findFirst({
        columns: {
          subscriptionStatus: true,
          subscriptionTier: true,
        },
        where: eq(users.id, options.userId),
      });

      subscriptionTier = user?.subscriptionTier ?? "free";
      subscriptionStatus = user?.subscriptionStatus ?? "inactive";
    }

    const effectiveTier =
      subscriptionStatus === "active" || subscriptionStatus === "trialing"
        ? (subscriptionTier ?? "free")
        : "free";

    const toggles = await db.query.featureToggles.findMany({
      where: eq(featureToggles.key, featureKey),
    });

    const userToggle = toggles.find((toggle) => toggle.scope === "user" && toggle.userId === options.userId);
    if (userToggle) {
      return userToggle.state !== "disabled";
    }

    const tierToggle = toggles.find((toggle) => toggle.scope === "tier" && toggle.subscriptionTier === effectiveTier);
    if (tierToggle) {
      return tierToggle.state !== "disabled";
    }

    const globalToggle = toggles.find((toggle) => toggle.scope === "global");
    if (globalToggle) {
      return globalToggle.state !== "disabled";
    }

    return true;
  }

  static async assertEnabled(featureKey: string, options: {
    subscriptionTier?: "enterprise" | "free" | "growth" | "pro" | "starter" | null;
    subscriptionStatus?: "active" | "canceled" | "inactive" | "past_due" | "trialing" | null;
    userId: string;
  }) {
    const enabled = await this.isEnabled(featureKey, options);
    if (!enabled) {
      throw new FeatureDisabledError(featureKey);
    }
  }
}
