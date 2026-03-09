import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listingAnalyses } from "@/lib/db/schema";

export class ScorecardService {
  static async getListingScorecard(listingAnalysisId: string, userId: string) {
    return db.query.listingAnalyses.findFirst({
      where: and(eq(listingAnalyses.id, listingAnalysisId), eq(listingAnalyses.userId, userId)),
    });
  }
}
