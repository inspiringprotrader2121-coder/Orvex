import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creditTransactions, credits, users } from "@/lib/db/schema";
import { InsufficientCreditsError } from "@server/utils/errors";

type CreditMutationInput = {
  amount: number;
  metadata?: Record<string, unknown>;
  reason: string;
  revertUsage?: boolean;
  userId: string;
  workflowId?: string;
};

export class CreditAccountService {
  static async ensureAccount(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { credits: true },
    });

    await db.insert(credits)
      .values({
        creditsAvailable: user?.credits ?? 0,
        creditsUsed: 0,
        updatedAt: new Date(),
        userId,
      })
      .onConflictDoNothing({ target: credits.userId });
  }

  static async getBalance(userId: string) {
    await this.ensureAccount(userId);

    const account = await db.query.credits.findFirst({
      where: eq(credits.userId, userId),
      columns: { creditsAvailable: true },
    });

    return account?.creditsAvailable ?? 0;
  }

  static async deductCredits(input: CreditMutationInput) {
    await this.ensureAccount(input.userId);

    return db.transaction(async (tx) => {
      const [account] = await tx
        .select({
          creditsAvailable: credits.creditsAvailable,
        })
        .from(credits)
        .where(eq(credits.userId, input.userId))
        .for("update");

      if (!account || account.creditsAvailable < input.amount) {
        throw new InsufficientCreditsError();
      }

      await tx.update(credits)
        .set({
          creditsAvailable: sql`${credits.creditsAvailable} - ${input.amount}`,
          creditsUsed: sql`${credits.creditsUsed} + ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(credits.userId, input.userId));

      await tx.update(users)
        .set({
          credits: sql`${users.credits} - ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      await tx.insert(creditTransactions).values({
        amount: -Math.abs(input.amount),
        metadata: input.metadata ?? {},
        reason: input.reason,
        userId: input.userId,
        workflowId: input.workflowId ?? null,
      });
    });
  }

  static async addCredits(input: CreditMutationInput) {
    await this.ensureAccount(input.userId);

    return db.transaction(async (tx) => {
      await tx.update(credits)
        .set({
          creditsAvailable: sql`${credits.creditsAvailable} + ${input.amount}`,
          ...(input.revertUsage
            ? { creditsUsed: sql`GREATEST(${credits.creditsUsed} - ${Math.abs(input.amount)}, 0)` }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(credits.userId, input.userId));

      await tx.update(users)
        .set({
          credits: sql`${users.credits} + ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      await tx.insert(creditTransactions).values({
        amount: Math.abs(input.amount),
        metadata: input.metadata ?? {},
        reason: input.reason,
        userId: input.userId,
        workflowId: input.workflowId ?? null,
      });
    });
  }

  static async syncMirrorFromUsers() {
    await db.execute(sql`
      insert into credits (user_id, credits_available, credits_used, updated_at)
      select id, credits, 0, now()
      from users
      on conflict (user_id) do nothing
    `);
  }
}
