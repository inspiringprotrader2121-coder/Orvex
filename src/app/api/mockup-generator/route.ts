import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { FeatureAccessService, FeatureDisabledError } from "@server/services/feature-access-service";
import { MockupGenerationService } from "@server/services/mockup-generation-service";
import { WorkflowAbuseService } from "@server/services/workflow-abuse-service";
import { WorkflowSubmissionService } from "@server/services/workflow-submission-service";
import { MockupGenerationInputSchema } from "@server/schemas/mockup-generation";
import { InsufficientCreditsError, RateLimitExceededError } from "@server/utils/errors";

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: "Invalid mockup generation payload",
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

  console.error("Mockup generator route failed:", error);
  return NextResponse.json({ error: "Unable to process mockup generation" }, { status: 500 });
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
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
    const artifacts = await MockupGenerationService.listForUser(
      userId,
      Number.isFinite(limit) ? Math.max(1, Math.min(limit, 18)) : 12,
    );

    return NextResponse.json({ artifacts });
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return errorResponse(error);
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
    await FeatureAccessService.assertEnabled("mockup_generation", {
      subscriptionTier: session.user.subscriptionTier,
      userId,
    });
    const payload = MockupGenerationInputSchema.parse(await request.json());
    const result = await WorkflowSubmissionService.startMockupGeneration(userId, payload);

    return NextResponse.json({
      creditsCost: result.creditsCost,
      success: true,
      workflowId: result.workflowId,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
