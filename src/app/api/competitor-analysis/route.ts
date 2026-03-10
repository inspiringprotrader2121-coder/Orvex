import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { FeatureAccessService, FeatureDisabledError } from "@server/services/feature-access-service";
import { WorkflowAbuseService } from "@server/services/workflow-abuse-service";
import { WorkflowSubmissionService } from "@server/services/workflow-submission-service";
import { CompetitorAnalysisService } from "@server/services/competitor-analysis-service";
import { CompetitorAnalyzerInputSchema } from "@server/schemas/competitor-analysis";
import { InsufficientCreditsError, RateLimitExceededError } from "@server/utils/errors";

function toErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: "Invalid competitor analysis payload",
      issues: error.issues,
    }, { status: 400 });
  }

  if (error instanceof InsufficientCreditsError) {
    return NextResponse.json({ error: error.message }, { status: 402 });
  }

  if (error instanceof RateLimitExceededError) {
    const headers = error.retryAfterSeconds ? { "Retry-After": `${error.retryAfterSeconds}` } : undefined;
    return NextResponse.json({ error: error.message }, {
      status: 429,
      headers,
    });
  }

  if (error instanceof FeatureDisabledError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  console.error("Competitor analysis route failed:", error);
  return NextResponse.json({ error: "Unable to process competitor analysis" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const analysisKey = url.searchParams.get("analysisKey") || undefined;
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
    const analyses = await CompetitorAnalysisService.listForUser(userId, {
      analysisKey,
      limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 24)) : 12,
    });

    return NextResponse.json({ analyses });
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Origin validation failed:", error);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await WorkflowAbuseService.assertWorkflowSubmission(request, userId);
    await FeatureAccessService.assertEnabled("competitor_analysis", {
      subscriptionTier: session.user.subscriptionTier,
      userId,
    });
    const payload = CompetitorAnalyzerInputSchema.parse(await request.json());
    const result = await WorkflowSubmissionService.startCompetitorAnalysis(userId, payload);

    return NextResponse.json({
      creditsCost: result.creditsCost,
      success: true,
      workflowId: result.workflowId,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
