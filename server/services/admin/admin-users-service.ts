import { db, pool } from "@/lib/db";
import {
  featureToggles,
  storeConnections,
  users,
} from "@/lib/db/schema";
import { createAdminRealtimeEvent } from "@/lib/admin/events";
import { notifyAdminEvent } from "@/lib/socket-internal";
import { desc, eq } from "drizzle-orm";
import { CreditAccountService } from "@server/services/credit-service";
import { AdminAuditService } from "./admin-audit-service";

type ListAdminUsersOptions = {
  limit?: number;
  query?: string | null;
  role?: string | null;
  sort?: "created_at" | "credits" | "credits_available" | "credits_used" | "email" | "last_login_at" | "role" | "status" | "subscription_status" | "subscription_tier";
  status?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
};

type UpdateUserInput = {
  action: "adjust_credits" | "delete" | "set_role" | "suspend" | "upgrade";
  actorUserId: string;
  ipAddress?: string | null;
  notes?: string | null;
  targetUserId: string;
  value?: number | string | null;
};

type UpdateStoreConnectionInput = {
  action: "disconnect" | "refresh";
  actorUserId: string;
  connectionId: string;
  ipAddress?: string | null;
};

type FeatureToggleInput = {
  actorUserId: string;
  description?: string | null;
  key: string;
  scope: "global" | "tier" | "user";
  state: "beta" | "disabled" | "enabled";
  subscriptionTier?: "enterprise" | "free" | "growth" | "pro" | "starter" | null;
  userId?: string | null;
};

type SubscriptionTier = "enterprise" | "free" | "growth" | "pro" | "starter";
type UserRole = "super_admin" | "admin" | "moderator" | "user";

function toSortColumn(sort?: ListAdminUsersOptions["sort"]) {
  switch (sort) {
    case "credits":
    case "credits_available":
      return `"creditsAvailable" desc nulls last, u.created_at desc`;
    case "credits_used":
      return `"creditsUsed" desc nulls last, u.created_at desc`;
    case "email":
      return `u.email asc`;
    case "last_login_at":
      return `u.last_login_at desc nulls last, u.created_at desc`;
    case "role":
      return `u.role asc, u.created_at desc`;
    case "status":
      return `u.status asc, u.created_at desc`;
    case "subscription_status":
      return `u.subscription_status asc, u.created_at desc`;
    case "subscription_tier":
      return `u.subscription_tier asc, u.created_at desc`;
    default:
      return `u.created_at desc`;
  }
}

export class AdminUsersService {
  static async listUsers(options: ListAdminUsersOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const params: Array<string | number> = [];
    const where: string[] = [];

    if (options.query) {
      const query = options.query.trim();
      params.push(`%${query}%`);
      where.push(`(
        u.email ilike $${params.length}
        or u.role::text ilike $${params.length}
        or u.status::text ilike $${params.length}
        or u.subscription_tier::text ilike $${params.length}
        or u.subscription_status::text ilike $${params.length}
        or u.id::text ilike $${params.length}
        or coalesce(c.credits_available, 0)::text ilike $${params.length}
        or coalesce(c.credits_used, 0)::text ilike $${params.length}
      )`);
    }

    if (options.role) {
      params.push(options.role);
      where.push(`u.role = $${params.length}`);
    }

    if (options.status) {
      params.push(options.status);
      where.push(`u.status = $${params.length}`);
    }

    if (options.subscriptionTier) {
      params.push(options.subscriptionTier);
      where.push(`u.subscription_tier = $${params.length}`);
    }

    if (options.subscriptionStatus) {
      params.push(options.subscriptionStatus);
      where.push(`u.subscription_status = $${params.length}`);
    }

    params.push(limit);

    const query = `
      select
        u.id,
        u.email,
        u.role,
        u.status,
        u.subscription_tier as "subscriptionTier",
        u.subscription_status as "subscriptionStatus",
        u.credits,
        u.last_login_at as "lastLoginAt",
        u.created_at as "createdAt",
        coalesce(c.credits_available, 0)::int as "creditsAvailable",
        coalesce(c.credits_used, 0)::int as "creditsUsed",
        count(distinct w.id)::int as "workflowCount"
      from users u
      left join credits c on c.user_id = u.id
      left join workflows w on w.user_id = u.id
      where ${where.join(" and ")}
      group by u.id, c.id
      order by ${toSortColumn(options.sort)}
      limit $${params.length}
    `;

    const [{ rows }, storeSummary] = await Promise.all([
      pool.query(query, params),
      pool.query(`
        select
          user_id as "userId",
          count(*)::int as "storeCount",
          count(*) filter (where status = 'connected')::int as "connectedStoreCount"
        from store_connections
        group by user_id
      `),
    ]);

    const storeSummaryMap = new Map(storeSummary.rows.map((row) => [String(row.userId), row]));

    return rows.map((row) => {
      const storeRow = storeSummaryMap.get(String(row.id)) as Record<string, unknown> | undefined;
      return {
        createdAt: String(row.createdAt),
        credits: Number(row.credits ?? 0),
        creditsAvailable: Number(row.creditsAvailable ?? 0),
        creditsUsed: Number(row.creditsUsed ?? 0),
        email: String(row.email),
        id: String(row.id),
        lastLoginAt: row.lastLoginAt ? String(row.lastLoginAt) : null,
        role: String(row.role),
        status: String(row.status),
        storeCount: Number(storeRow?.storeCount ?? 0),
        subscriptionStatus: String(row.subscriptionStatus),
        subscriptionTier: String(row.subscriptionTier),
        workflowCount: Number(row.workflowCount ?? 0),
      };
    });
  }

  static async updateUser(input: UpdateUserInput) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, input.targetUserId),
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    switch (input.action) {
      case "suspend": {
        const suspended = targetUser.status !== "suspended";
        await db.update(users).set({
          status: suspended ? "suspended" : "active",
          suspendedAt: suspended ? new Date() : null,
          updatedAt: new Date(),
        }).where(eq(users.id, targetUser.id));

        await AdminAuditService.log({
          action: suspended ? "user.suspended" : "user.reactivated",
          actorUserId: input.actorUserId,
          entityId: targetUser.id,
          entityType: "user",
          ipAddress: input.ipAddress,
          metadata: { email: targetUser.email, notes: input.notes ?? null },
          targetUserId: targetUser.id,
        });
        break;
      }

      case "delete": {
        await db.update(users).set({
          deletedAt: new Date(),
          status: "deleted",
          updatedAt: new Date(),
        }).where(eq(users.id, targetUser.id));

        await AdminAuditService.log({
          action: "user.deleted",
          actorUserId: input.actorUserId,
          entityId: targetUser.id,
          entityType: "user",
          ipAddress: input.ipAddress,
          metadata: { email: targetUser.email, notes: input.notes ?? null },
          targetUserId: targetUser.id,
        });
        break;
      }

      case "upgrade": {
        const tier = typeof input.value === "string" ? input.value : "pro";
        await db.update(users).set({
          subscriptionStatus: "active",
          subscriptionTier: tier as SubscriptionTier,
          updatedAt: new Date(),
        }).where(eq(users.id, targetUser.id));

        await AdminAuditService.log({
          action: "user.upgraded",
          actorUserId: input.actorUserId,
          entityId: targetUser.id,
          entityType: "user",
          ipAddress: input.ipAddress,
          metadata: { email: targetUser.email, tier },
          targetUserId: targetUser.id,
        });
        break;
      }

      case "set_role": {
        const role = typeof input.value === "string" ? input.value : "user";
        await db.update(users).set({
          role: role as UserRole,
          updatedAt: new Date(),
        }).where(eq(users.id, targetUser.id));

        await AdminAuditService.log({
          action: "user.role_updated",
          actorUserId: input.actorUserId,
          entityId: targetUser.id,
          entityType: "user",
          ipAddress: input.ipAddress,
          metadata: { email: targetUser.email, role },
          targetUserId: targetUser.id,
        });
        break;
      }

      case "adjust_credits": {
        const amount = Number(input.value ?? 0);
        if (!Number.isFinite(amount) || amount === 0) {
          throw new Error("Invalid credit adjustment");
        }

        if (amount > 0) {
          await CreditAccountService.addCredits({
            amount,
            metadata: { source: "admin_adjustment" },
            reason: input.notes || "Admin credit adjustment",
            userId: targetUser.id,
          });
        } else {
          await CreditAccountService.deductCredits({
            amount: Math.abs(amount),
            metadata: { source: "admin_adjustment" },
            reason: input.notes || "Admin credit adjustment",
            userId: targetUser.id,
          });
        }

        await AdminAuditService.log({
          action: "user.credits_adjusted",
          actorUserId: input.actorUserId,
          entityId: targetUser.id,
          entityType: "user",
          ipAddress: input.ipAddress,
          metadata: { amount, email: targetUser.email, notes: input.notes ?? null },
          targetUserId: targetUser.id,
        });
        break;
      }
    }

    notifyAdminEvent(createAdminRealtimeEvent({
      action: input.action,
      entity: "user",
      entityId: targetUser.id,
      payload: {
        email: targetUser.email,
        targetUserId: targetUser.id,
      },
      type: "admin.user.updated",
      userId: targetUser.id,
    }));
  }

  static async listStoreConnections() {
    return db.query.storeConnections.findMany({
      orderBy: [desc(storeConnections.updatedAt)],
      with: {
        user: {
          columns: { email: true },
        },
      },
    });
  }

  static async updateStoreConnection(input: UpdateStoreConnectionInput) {
    const connection = await db.query.storeConnections.findFirst({
      where: eq(storeConnections.id, input.connectionId),
    });

    if (!connection) {
      throw new Error("Store connection not found");
    }

    if (input.action === "disconnect") {
      await db.update(storeConnections).set({
        apiStatus: "disconnected",
        errorMessage: null,
        status: "disconnected",
        updatedAt: new Date(),
      }).where(eq(storeConnections.id, input.connectionId));
    } else {
      await db.update(storeConnections).set({
        apiStatus: "healthy",
        errorMessage: null,
        lastSyncAt: new Date(),
        metadata: {
          ...(connection.metadata as Record<string, unknown>),
          refreshedAt: new Date().toISOString(),
        },
        productsCount: connection.productsCount,
        status: "connected",
        updatedAt: new Date(),
      }).where(eq(storeConnections.id, input.connectionId));
    }

    await AdminAuditService.log({
      action: `store.${input.action}`,
      actorUserId: input.actorUserId,
      entityId: input.connectionId,
      entityType: "store_connection",
      ipAddress: input.ipAddress,
      metadata: {
        platform: connection.platform,
        storeName: connection.storeName,
      },
      targetUserId: connection.userId,
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: input.action,
      entity: "store_connection",
      entityId: connection.id,
      payload: {
        platform: connection.platform,
        storeName: connection.storeName,
      },
      type: "admin.integration.updated",
      userId: connection.userId,
    }));
  }

  static async listFeatureToggles() {
    return db.query.featureToggles.findMany({
      orderBy: [desc(featureToggles.updatedAt)],
    });
  }

  static async upsertFeatureToggle(input: FeatureToggleInput) {
    const existing = await db.query.featureToggles.findMany({
      where: eq(featureToggles.key, input.key),
    });
    const matchingToggle = existing.find((toggle) =>
      toggle.scope === input.scope &&
      toggle.userId === (input.userId ?? null) &&
      toggle.subscriptionTier === (input.subscriptionTier ?? null),
    );

    if (matchingToggle) {
      await db.update(featureToggles).set({
        description: input.description ?? null,
        state: input.state,
        subscriptionTier: input.subscriptionTier ?? null,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
        userId: input.userId ?? null,
      }).where(eq(featureToggles.id, matchingToggle.id));
    } else {
      await db.insert(featureToggles).values({
        createdByUserId: input.actorUserId,
        description: input.description ?? null,
        key: input.key,
        scope: input.scope,
        state: input.state,
        subscriptionTier: input.subscriptionTier ?? null,
        updatedByUserId: input.actorUserId,
        userId: input.userId ?? null,
      });
    }

    await AdminAuditService.log({
      action: "feature_toggle.updated",
      actorUserId: input.actorUserId,
      entityId: input.key,
      entityType: "feature_toggle",
      metadata: {
        scope: input.scope,
        state: input.state,
        subscriptionTier: input.subscriptionTier ?? null,
        userId: input.userId ?? null,
      },
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: "updated",
      entity: "feature_toggle",
      entityId: input.key,
      payload: {
        key: input.key,
        scope: input.scope,
        state: input.state,
      },
      type: "admin.data.changed",
      userId: input.userId ?? undefined,
    }));
  }
}
