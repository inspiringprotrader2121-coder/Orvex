import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { WorkflowAbuseService } from "@server/services/workflow-abuse-service";
import { WorkflowSubmissionService } from "@server/services/workflow-submission-service";
import { FeatureAccessService, FeatureDisabledError } from "@server/services/feature-access-service";
import { InsufficientCreditsError, RateLimitExceededError } from "@server/utils/errors";

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
    const payload = await request.json();
    await FeatureAccessService.assertEnabled("multi_channel_launch_pack", {
      subscriptionTier: session.user.subscriptionTier,
      userId,
    });
    const result = await WorkflowSubmissionService.startMultiChannelLaunchPack(userId, payload);

    return NextResponse.json({
      creditsCost: result.creditsCost,
      success: true,
      workflowId: result.workflowId,
    });
  } catch (error) {
    console.error("Multi-channel launch pack submission failed:", error);

    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid multi-channel launch pack payload",
        issues: error.issues,
      }, { status: 400 });
    }

    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }

    if (error instanceof RateLimitExceededError) {
      const rateLimitHeaders = error.retryAfterSeconds
        ? { "Retry-After": `${error.retryAfterSeconds}` }
        : undefined;

      return NextResponse.json({ error: error.message }, {
        status: 429,
        headers: rateLimitHeaders,
      });
    }

    if (error instanceof FeatureDisabledError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Unable to queue multi-channel launch pack" }, { status: 500 });
  }
}
