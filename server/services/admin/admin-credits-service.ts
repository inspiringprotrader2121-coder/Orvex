import { db, pool } from "@/lib/db";
import { billingRecords } from "@/lib/db/schema";
import { notifyAdminEvent } from "@/lib/socket-internal";
import { createAdminRealtimeEvent } from "@/lib/admin/events";
import { CreditAccountService } from "@server/services/credit-service";
import { AdminAuditService } from "./admin-audit-service";

type CreditBalancesOptions = {
  limit?: number;
  query?: string | null;
};

type LedgerOptions = {
  limit?: number;
  type?: "adjustment" | "credits" | "refund" | "subscription";
  userId?: string | null;
};

type CreditAdjustmentInput = {
  actorUserId: string;
  amount: number;
  ipAddress?: string | null;
  notes?: string | null;
  userId: string;
};

type CreditRefundInput = {
  actorUserId: string;
  amountCents: number;
  creditsAmount: number;
  ipAddress?: string | null;
  notes?: string | null;
  userId: string;
};

export class AdminCreditsService {
  static async listCreditBalances(options: CreditBalancesOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
    const params: Array<string | number> = [];
    const where: string[] = [];

    if (options.query) {
      const query = options.query.trim();
      params.push(`%${query}%`);
      where.push(`(u.email ilike $${params.length} or u.id::text ilike $${params.length})`);
    }

    params.push(limit);

    const query = `
      select
        u.id,
        u.email,
        u.subscription_tier as "subscriptionTier",
        u.subscription_status as "subscriptionStatus",
        u.last_login_at as "lastLoginAt",
        coalesce(c.credits_available, 0)::int as "creditsAvailable",
        coalesce(c.credits_used, 0)::int as "creditsUsed"
      from users u
      left join credits c on c.user_id = u.id
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by coalesce(c.credits_available, 0) desc, u.created_at desc
      limit $${params.length}
    `;

    const { rows } = await pool.query(query, params);
    return rows.map((row) => ({
      creditsAvailable: Number(row.creditsAvailable ?? 0),
      creditsUsed: Number(row.creditsUsed ?? 0),
      email: String(row.email),
      id: String(row.id),
      lastLoginAt: row.lastLoginAt ? String(row.lastLoginAt) : null,
      subscriptionStatus: String(row.subscriptionStatus),
      subscriptionTier: String(row.subscriptionTier),
    }));
  }

  static async listBillingRecords(options: LedgerOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 120, 1), 300);
    const params: Array<string | number> = [];
    const where: string[] = [];

    if (options.userId) {
      params.push(options.userId);
      where.push(`br.user_id = $${params.length}`);
    }

    if (options.type) {
      params.push(options.type);
      where.push(`br.type = $${params.length}`);
    }

    params.push(limit);

    const query = `
      select
        br.id,
        br.user_id as "userId",
        u.email,
        br.type,
        br.status,
        br.amount_cents as "amountCents",
        br.credits_amount as "creditsAmount",
        br.currency,
        br.provider,
        br.description,
        br.reference,
        br.created_at as "createdAt"
      from billing_records br
      left join users u on u.id = br.user_id
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by br.created_at desc
      limit $${params.length}
    `;

    const { rows } = await pool.query(query, params);
    return rows.map((row) => ({
      amountCents: Number(row.amountCents ?? 0),
      createdAt: String(row.createdAt),
      creditsAmount: Number(row.creditsAmount ?? 0),
      currency: String(row.currency ?? "usd"),
      description: row.description ? String(row.description) : null,
      email: row.email ? String(row.email) : null,
      id: String(row.id),
      provider: row.provider ? String(row.provider) : null,
      reference: row.reference ? String(row.reference) : null,
      status: String(row.status),
      type: String(row.type),
      userId: String(row.userId),
    }));
  }

  static async adjustCredits(input: CreditAdjustmentInput) {
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      throw new Error("Invalid credit adjustment");
    }

    if (input.amount > 0) {
      await CreditAccountService.addCredits({
        amount: input.amount,
        metadata: { source: "admin_adjustment" },
        reason: input.notes || "Admin credit adjustment",
        userId: input.userId,
      });
    } else {
      await CreditAccountService.deductCredits({
        amount: Math.abs(input.amount),
        metadata: { source: "admin_adjustment" },
        reason: input.notes || "Admin credit adjustment",
        userId: input.userId,
      });
    }

    await db.insert(billingRecords).values({
      amountCents: 0,
      creditsAmount: input.amount,
      currency: "usd",
      description: input.notes ?? "Admin credit adjustment",
      provider: "manual",
      status: "active",
      type: "adjustment",
      userId: input.userId,
    });

    await AdminAuditService.log({
      action: "credits.adjusted",
      actorUserId: input.actorUserId,
      entityId: input.userId,
      entityType: "credits",
      ipAddress: input.ipAddress,
      metadata: {
        amount: input.amount,
        notes: input.notes ?? null,
      },
      targetUserId: input.userId,
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: "adjusted",
      entity: "credits",
      entityId: input.userId,
      payload: { amount: input.amount },
      type: "admin.user.updated",
      userId: input.userId,
    }));
  }

  static async refundCredits(input: CreditRefundInput) {
    if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
      throw new Error("Invalid refund amount");
    }

    if (!Number.isFinite(input.creditsAmount) || input.creditsAmount <= 0) {
      throw new Error("Invalid credit refund amount");
    }

    await CreditAccountService.deductCredits({
      amount: input.creditsAmount,
      metadata: { source: "admin_refund" },
      reason: input.notes || "Admin refund",
      userId: input.userId,
    });

    await db.insert(billingRecords).values({
      amountCents: -Math.abs(input.amountCents),
      creditsAmount: -Math.abs(input.creditsAmount),
      currency: "usd",
      description: input.notes ?? "Admin refund",
      provider: "manual",
      status: "active",
      type: "refund",
      userId: input.userId,
    });

    await AdminAuditService.log({
      action: "credits.refunded",
      actorUserId: input.actorUserId,
      entityId: input.userId,
      entityType: "credits",
      ipAddress: input.ipAddress,
      metadata: {
        amountCents: input.amountCents,
        creditsAmount: input.creditsAmount,
        notes: input.notes ?? null,
      },
      targetUserId: input.userId,
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: "refunded",
      entity: "credits",
      entityId: input.userId,
      payload: { amountCents: input.amountCents, creditsAmount: input.creditsAmount },
      type: "admin.user.updated",
      userId: input.userId,
    }));
  }
}
