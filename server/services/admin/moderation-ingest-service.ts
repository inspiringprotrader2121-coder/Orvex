import { db } from "@/lib/db";
import { contentModerationItems } from "@/lib/db/schema";

type IngestModerationItemInput = {
  payload: Record<string, unknown>;
  summary: string;
  title: string;
  type: "ai_template" | "community_template" | "listing_export";
  userId: string;
  workflowId?: string;
};

export class ModerationIngestService {
  static async upsert(input: IngestModerationItemInput) {
    if (!input.workflowId) {
      return;
    }

    await db.insert(contentModerationItems).values({
      payload: input.payload,
      summary: input.summary,
      title: input.title,
      type: input.type,
      updatedAt: new Date(),
      userId: input.userId,
      workflowId: input.workflowId,
    }).onConflictDoUpdate({
      target: contentModerationItems.workflowId,
      set: {
        payload: input.payload,
        status: "pending",
        summary: input.summary,
        title: input.title,
        type: input.type,
        updatedAt: new Date(),
        userId: input.userId,
      },
    });
  }
}
