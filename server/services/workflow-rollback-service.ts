import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  competitorAnalyses,
  launchPacks,
  listings,
  listingAnalyses,
  mockupGenerations,
  multiChannelLaunchPacks,
  opportunities,
  seoKeywordSuggestions,
  workflows,
} from "@/lib/db/schema";
import { notifyJobUpdate } from "@/lib/socket-internal";
import { WorkflowReadService } from "./workflow-read-service";

export class WorkflowRollbackService {
  static async restoreWorkflow(userId: string, workflowId: string) {
    const entry = await WorkflowReadService.getWorkflowForUser(userId, workflowId);
    if (!entry) {
      throw new Error("Workflow not found");
    }

    const { artifact, workflow } = entry;

    if (workflow.status !== "completed") {
      throw new Error("Only completed workflows can be restored");
    }

    const [restoredWorkflow] = await db.insert(workflows).values({
      batchId: null,
      creditsSpent: 0,
      errorMessage: null,
      inputData: {
        ...(workflow.inputData as Record<string, unknown>),
        rollback: {
          fromWorkflowId: workflow.id,
          restoredAt: new Date().toISOString(),
        },
      },
      progress: 100,
      projectId: workflow.projectId,
      resultData: (artifact ?? workflow.resultData) as Record<string, unknown> | null,
      sourceProvider: workflow.sourceProvider,
      sourceUrl: workflow.sourceUrl,
      status: "completed",
      type: workflow.type,
      updatedAt: new Date(),
      userId,
    }).returning({ id: workflows.id });

    if (!restoredWorkflow) {
      throw new Error("Unable to create restored workflow snapshot");
    }

    switch (workflow.type) {
      case "listing_forge": {
        if (!artifact) {
          break;
        }

        const listing = artifact as typeof listings.$inferSelect;
        await db.insert(listings).values({
          description: listing.description,
          faq: listing.faq,
          productName: listing.productName,
          productType: listing.productType,
          projectId: listing.projectId,
          tags: listing.tags,
          targetAudience: listing.targetAudience,
          title: listing.title,
          tone: listing.tone,
          updatedAt: new Date(),
          userId,
          workflowId: restoredWorkflow.id,
        });
        break;
      }
      case "listing_intelligence": {
        if (!artifact) {
          break;
        }

        const analysis = artifact as typeof listingAnalyses.$inferSelect;
        await db.insert(listingAnalyses).values({
          conversionScore: analysis.conversionScore,
          ctaStrength: analysis.ctaStrength,
          emotionalHookScore: analysis.emotionalHookScore,
          keywordCoverage: analysis.keywordCoverage,
          keywordGaps: analysis.keywordGaps,
          listingDescription: analysis.listingDescription,
          listingScore: analysis.listingScore,
          listingTags: analysis.listingTags,
          listingTitle: analysis.listingTitle,
          optimizedDescription: analysis.optimizedDescription,
          optimizedTitle: analysis.optimizedTitle,
          provider: analysis.provider,
          rawListingData: analysis.rawListingData,
          seoScore: analysis.seoScore,
          sourceUrl: analysis.sourceUrl,
          strengths: analysis.strengths,
          suggestedTags: analysis.suggestedTags,
          updatedAt: new Date(),
          userId,
          weaknesses: analysis.weaknesses,
          workflowId: restoredWorkflow.id,
        });
        break;
      }
      case "competitor_analysis": {
        if (!artifact) {
          break;
        }

        const analysis = artifact as typeof competitorAnalyses.$inferSelect;
        const [latestVersion] = await db.select({ analysisVersion: competitorAnalyses.analysisVersion })
          .from(competitorAnalyses)
          .where(and(
            eq(competitorAnalyses.userId, userId),
            eq(competitorAnalyses.analysisKey, analysis.analysisKey),
          ))
          .orderBy(desc(competitorAnalyses.analysisVersion))
          .limit(1);

        await db.insert(competitorAnalyses).values({
          analysisKey: analysis.analysisKey,
          analysisVersion: (latestVersion?.analysisVersion ?? 0) + 1,
          comparisonSet: analysis.comparisonSet,
          differentiationStrategy: analysis.differentiationStrategy,
          inputLabel: analysis.inputLabel,
          keywordOpportunities: analysis.keywordOpportunities,
          keywords: analysis.keywords,
          listingDescription: analysis.listingDescription,
          listingTags: analysis.listingTags,
          listingTitle: analysis.listingTitle,
          pricing: analysis.pricing,
          provider: analysis.provider,
          ranking: analysis.ranking,
          rawListingData: analysis.rawListingData,
          reviews: analysis.reviews,
          sourceType: analysis.sourceType,
          sourceUrl: analysis.sourceUrl,
          strengths: analysis.strengths,
          summary: analysis.summary,
          targetListing: analysis.targetListing,
          updatedAt: new Date(),
          userId,
          weaknesses: analysis.weaknesses,
          workflowId: restoredWorkflow.id,
        });
        break;
      }
      case "opportunity_analysis": {
        if (!artifact) {
          break;
        }

        const opportunity = artifact as typeof opportunities.$inferSelect;
        await db.insert(opportunities).values({
          competitionScore: opportunity.competitionScore,
          demandScore: opportunity.demandScore,
          keyword: opportunity.keyword,
          opportunityScore: opportunity.opportunityScore,
          productIdeas: opportunity.productIdeas,
          trendScore: opportunity.trendScore,
          updatedAt: new Date(),
          userId,
          workflowId: restoredWorkflow.id,
        });
        break;
      }
      case "launch_pack_generation":
      case "etsy_listing_launch_pack": {
        if (!artifact) {
          break;
        }

        const pack = artifact as typeof launchPacks.$inferSelect;
        await db.insert(launchPacks).values({
          emailLaunchSequence: pack.emailLaunchSequence,
          faq: pack.faq,
          ideaName: pack.ideaName,
          keywordTags: pack.keywordTags,
          launchCalendar: pack.launchCalendar,
          nicheKeyword: pack.nicheKeyword,
          optimizedDescription: pack.optimizedDescription,
          pinterestCaptions: pack.pinterestCaptions,
          seoTitles: pack.seoTitles,
          tikTokHooks: pack.tikTokHooks,
          updatedAt: new Date(),
          userId,
          workflowId: restoredWorkflow.id,
        });
        break;
      }
      case "multi_channel_launch_pack": {
        if (!artifact) {
          break;
        }

        const pack = artifact as typeof multiChannelLaunchPacks.$inferSelect;
        await db.insert(multiChannelLaunchPacks).values({
          cacheHit: true,
          cacheKey: pack.cacheKey,
          channels: pack.channels,
          productName: pack.productName,
          productType: pack.productType,
          summary: pack.summary,
          targetAudience: pack.targetAudience,
          updatedAt: new Date(),
          userId,
          workflowId: restoredWorkflow.id,
        });
        break;
      }
      case "mockup_generation": {
        if (!artifact) {
          break;
        }

        const mockups = artifact as typeof mockupGenerations.$inferSelect;
        await db.insert(mockupGenerations).values({
          color: mockups.color,
          description: mockups.description,
          heroPrompt: mockups.heroPrompt,
          images: mockups.images,
          productName: mockups.productName,
          style: mockups.style,
          summary: mockups.summary,
          updatedAt: new Date(),
          userId,
          workflowId: restoredWorkflow.id,
        });
        break;
      }
      case "seo_keyword_analysis": {
        if (!artifact) {
          break;
        }

        const suggestion = artifact as typeof seoKeywordSuggestions.$inferSelect;
        await db.insert(seoKeywordSuggestions).values({
          appliedListingId: suggestion.appliedListingId,
          autoApplied: suggestion.autoApplied,
          autoApplyNotes: suggestion.autoApplyNotes,
          cacheHit: true,
          cacheKey: suggestion.cacheKey,
          inputText: suggestion.inputText,
          keywords: suggestion.keywords,
          optimizedDescription: suggestion.optimizedDescription,
          optimizedMetaDescription: suggestion.optimizedMetaDescription,
          optimizedTitle: suggestion.optimizedTitle,
          source: suggestion.source,
          tags: suggestion.tags,
          updatedAt: new Date(),
          userId,
          workflowId: restoredWorkflow.id,
        });
        break;
      }
      default:
        break;
    }

    notifyJobUpdate(userId, restoredWorkflow.id, "completed");
    return restoredWorkflow.id;
  }
}
