import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  competitorAnalyses,
  launchPacks,
  listingAnalyses,
  opportunities,
  workflows,
} from "@/lib/db/schema";

export class WorkflowReadService {
  static async getWorkflowForUser(userId: string, workflowId: string) {
    const workflow = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, workflowId), eq(workflows.userId, userId)),
    });

    if (!workflow) {
      return null;
    }

    switch (workflow.type) {
      case "listing_intelligence": {
        const artifact = await db.query.listingAnalyses.findFirst({
          where: eq(listingAnalyses.workflowId, workflow.id),
        });
        return { artifact, workflow };
      }
      case "competitor_analysis": {
        const artifact = await db.query.competitorAnalyses.findFirst({
          where: eq(competitorAnalyses.workflowId, workflow.id),
        });
        return { artifact, workflow };
      }
      case "opportunity_analysis": {
        const artifact = await db.query.opportunities.findFirst({
          where: eq(opportunities.workflowId, workflow.id),
        });
        return { artifact, workflow };
      }
      case "launch_pack_generation":
      case "etsy_listing_launch_pack": {
        const artifact = await db.query.launchPacks.findFirst({
          where: eq(launchPacks.workflowId, workflow.id),
        });
        return { artifact, workflow };
      }
      default:
        return { artifact: null, workflow };
    }
  }
}
