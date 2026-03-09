import { db } from "@/lib/db";
import { users, creditTransactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Orvex Credit Engine
 * Handles transactions with ACID compliance and immutable audit logs.
 */
export class CreditService {
    /**
     * Verified user balance.
     */
    static async getBalance(userId: string): Promise<number> {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { credits: true }
        });
        return user?.credits ?? 0;
    }

    /**
     * Atomic credit deduction with ledger entry.
     * Returns true if successful, false if insufficient credits.
     */
    static async deductCredits(
        userId: string,
        amount: number,
        reason: string
    ): Promise<boolean> {
        try {
            return await db.transaction(async (tx) => {
                // 1. Check current balance within transaction (SELECT FOR UPDATE)
                const [user] = await tx
                    .select({ credits: users.credits })
                    .from(users)
                    .where(eq(users.id, userId))
                    .for('update'); // Lock row to prevent race conditions

                if (!user || user.credits < amount) {
                    console.warn(`[Credits] Failed deduction: User ${userId} has ${user?.credits} (needs ${amount})`);
                    tx.rollback();
                    return false;
                }

                // 2. Perform deduction
                await tx.update(users)
                    .set({
                        credits: sql`${users.credits} - ${amount}`,
                        updatedAt: new Date()
                    })
                    .where(eq(users.id, userId));

                // 3. Create audit log (ledger entry)
                await tx.insert(creditTransactions).values({
                    userId,
                    amount: -amount, // Negative for tracking outflow
                    reason,
                    createdAt: new Date()
                });

                console.log(`[Credits] Success: Deducted ${amount} from ${userId} (${reason})`);
                return true;
            });
        } catch (error) {
            if (error instanceof Error && error.message.includes('rollback')) return false;
            console.error("[Credits] Transaction Error:", error);
            return false;
        }
    }

    /**
     * Add credits (e.g. from Stripe payment)
     */
    static async addCredits(
        userId: string,
        amount: number,
        reason: string
    ): Promise<void> {
        await db.transaction(async (tx) => {
            await tx.update(users)
                .set({
                    credits: sql`${users.credits} + ${amount}`,
                    updatedAt: new Date()
                })
                .where(eq(users.id, userId));

            await tx.insert(creditTransactions).values({
                userId,
                amount, // Positive for tracking inflow
                reason,
                createdAt: new Date()
            });
        });
        console.log(`[Credits] Success: Added ${amount} to ${userId} (${reason})`);
    }
}
