import { db } from "@/lib/db";
import { stripeWebhookEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CreditAccountService } from "@server/services/credit-service";

export class CreditService {
  static async getBalance(userId: string) {
    return CreditAccountService.getBalance(userId);
  }

  static async deductCredits(userId: string, amount: number, reason: string, workflowId?: string) {
    try {
      await CreditAccountService.deductCredits({
        amount,
        reason,
        userId,
        workflowId,
      });
      return true;
    } catch {
      return false;
    }
  }

  static async addCredits(
    userId: string,
    amount: number,
    reason: string,
    workflowId?: string,
    options?: { revertUsage?: boolean },
  ) {
    return CreditAccountService.addCredits({
      amount,
      reason,
      revertUsage: options?.revertUsage,
      userId,
      workflowId,
    });
  }

  static async addCreditsForStripeEvent(
    userId: string,
    amount: number,
    reason: string,
    stripeEventId: string,
    eventType: string,
  ) {
    const [existing] = await db
      .insert(stripeWebhookEvents)
      .values({
        eventType,
        stripeEventId,
      })
      .onConflictDoNothing({ target: stripeWebhookEvents.stripeEventId })
      .returning({ id: stripeWebhookEvents.id });

    if (!existing) {
      return "duplicate" as const;
    }

    await CreditAccountService.addCredits({
      amount,
      metadata: { stripeEventId },
      reason,
      userId,
    });

    return "applied" as const;
  }

  static async hasProcessedStripeEvent(stripeEventId: string) {
    const event = await db.query.stripeWebhookEvents.findFirst({
      where: eq(stripeWebhookEvents.stripeEventId, stripeEventId),
      columns: { id: true },
    });

    return Boolean(event);
  }
}
