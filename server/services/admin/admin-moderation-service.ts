import { db, pool } from "@/lib/db";
import {
  communityTemplates,
  contentModerationItems,
} from "@/lib/db/schema";
import { createAdminRealtimeEvent } from "@/lib/admin/events";
import { notifyAdminEvent } from "@/lib/socket-internal";
import { desc, eq } from "drizzle-orm";
import { AdminAuditService } from "./admin-audit-service";

type ModerationActionInput = {
  actorUserId: string;
  itemId: string;
  notes?: string | null;
  status: "approved" | "flagged" | "rejected";
};

type TemplateActionInput = {
  actorUserId: string;
  status: "approved" | "flagged" | "rejected";
  templateId: string;
};

export class AdminModerationService {
  static async getModerationSnapshot() {
    const [items, templates, lowListings, topListings] = await Promise.all([
      db.query.contentModerationItems.findMany({
        limit: 20,
        orderBy: [desc(contentModerationItems.createdAt)],
      }),
      db.query.communityTemplates.findMany({
        limit: 20,
        orderBy: [
          desc(communityTemplates.popularityScore),
          desc(communityTemplates.downloadsCount),
          desc(communityTemplates.updatedAt),
        ],
      }),
      pool.query(`
        select
          la.id,
          la.source_url as "sourceUrl",
          la.listing_title as "listingTitle",
          la.listing_score as "listingScore",
          la.seo_score as "seoScore",
          la.conversion_score as "conversionScore",
          la.keyword_coverage as "keywordCoverage",
          u.email
        from listing_analyses la
        inner join users u on u.id = la.user_id
        where la.listing_score <= 60
        order by la.listing_score asc, la.created_at desc
        limit 20
      `),
      pool.query(`
        select
          la.id,
          la.source_url as "sourceUrl",
          la.listing_title as "listingTitle",
          la.listing_score as "listingScore",
          la.seo_score as "seoScore",
          la.conversion_score as "conversionScore",
          la.keyword_coverage as "keywordCoverage",
          la.optimized_title as "optimizedTitle",
          la.optimized_description as "optimizedDescription",
          la.suggested_tags as "suggestedTags",
          u.email
        from listing_analyses la
        inner join users u on u.id = la.user_id
        where la.listing_score >= 85
        order by la.listing_score desc, la.created_at desc
        limit 20
      `),
    ]);

    return {
      items,
      lowListings: lowListings.rows.map((row) => ({
        conversionScore: Number(row.conversionScore ?? 0),
        email: String(row.email),
        id: String(row.id),
        keywordCoverage: Number(row.keywordCoverage ?? 0),
        listingScore: Number(row.listingScore ?? 0),
        listingTitle: String(row.listingTitle),
        seoScore: Number(row.seoScore ?? 0),
        sourceUrl: String(row.sourceUrl),
      })),
      topListings: topListings.rows.map((row) => ({
        conversionScore: Number(row.conversionScore ?? 0),
        email: String(row.email),
        id: String(row.id),
        keywordCoverage: Number(row.keywordCoverage ?? 0),
        listingScore: Number(row.listingScore ?? 0),
        listingTitle: String(row.listingTitle),
        optimizedDescription: String(row.optimizedDescription ?? ""),
        optimizedTitle: String(row.optimizedTitle ?? ""),
        suggestedTags: Array.isArray(row.suggestedTags) ? row.suggestedTags.map((tag: unknown) => String(tag)) : [],
        seoScore: Number(row.seoScore ?? 0),
        sourceUrl: String(row.sourceUrl),
      })),
      templates,
    };
  }

  static async updateModerationItem(input: ModerationActionInput) {
    await db.update(contentModerationItems).set({
      moderatedAt: new Date(),
      moderatedByUserId: input.actorUserId,
      moderationNotes: input.notes ?? null,
      status: input.status,
      updatedAt: new Date(),
    }).where(eq(contentModerationItems.id, input.itemId));

    await AdminAuditService.log({
      action: `moderation.${input.status}`,
      actorUserId: input.actorUserId,
      entityId: input.itemId,
      entityType: "moderation_item",
      metadata: {
        notes: input.notes ?? null,
      },
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: input.status,
      entity: "moderation_item",
      entityId: input.itemId,
      payload: {
        status: input.status,
      },
      type: "admin.data.changed",
    }));
  }

  static async updateTemplate(input: TemplateActionInput) {
    await db.update(communityTemplates).set({
      approvedAt: input.status === "approved" ? new Date() : null,
      approvedByUserId: input.status === "approved" ? input.actorUserId : null,
      status: input.status,
      updatedAt: new Date(),
    }).where(eq(communityTemplates.id, input.templateId));

    await AdminAuditService.log({
      action: `template.${input.status}`,
      actorUserId: input.actorUserId,
      entityId: input.templateId,
      entityType: "community_template",
    });

    notifyAdminEvent(createAdminRealtimeEvent({
      action: input.status,
      entity: "community_template",
      entityId: input.templateId,
      payload: {
        status: input.status,
      },
      type: "admin.data.changed",
    }));
  }
}
