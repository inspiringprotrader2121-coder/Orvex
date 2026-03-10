import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { getErrorMessage } from "@/lib/errors";
import { WorkflowSubmissionService } from "@server/services/workflow-submission-service";
import { WorkflowAbuseService } from "@server/services/workflow-abuse-service";
import { FeatureAccessService, FeatureDisabledError } from "@server/services/feature-access-service";
import { WorkflowSubmissionSchema } from "@server/schemas/workflow";
import { getWorkflowFeatureKey } from "@server/workflows/workflow-registry";
import {
  InsufficientCreditsError,
  RateLimitExceededError,
  UnsupportedProviderError,
} from "@server/utils/errors";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";

function toErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: "Invalid workflow payload",
      issues: error.issues,
    }, { status: 400 });
  }

  if (error instanceof InsufficientCreditsError) {
    return NextResponse.json({ error: error.message }, { status: 402 });
  }

  if (error instanceof RateLimitExceededError) {
    return NextResponse.json({ error: error.message }, { status: 429 });
  }

  if (error instanceof UnsupportedProviderError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof FeatureDisabledError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  console.error("Workflow submission failed:", getErrorMessage(error, "Unknown workflow error"));
  return NextResponse.json({ error: "Unable to start workflow" }, { status: 500 });
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
    const submission = WorkflowSubmissionSchema.parse(await request.json());
    await FeatureAccessService.assertEnabled(getWorkflowFeatureKey(submission.type), {
      subscriptionTier: session.user.subscriptionTier,
      userId,
    });
    const result = await WorkflowSubmissionService.start(userId, submission);

    return NextResponse.json({
      creditsCost: result.creditsCost,
      success: true,
      type: result.type,
      workflowId: result.workflowId,
    });
  } catch (error) {
    console.error("Workflow Submission Error:", error);
    if (error instanceof RateLimitExceededError) {
      const rateLimitHeaders = error.retryAfterSeconds
        ? { "Retry-After": `${error.retryAfterSeconds}` }
        : undefined;

      return NextResponse.json({ error: error.message }, {
        status: 429,
        headers: rateLimitHeaders,
      });
    }

    return toErrorResponse(error);
  }
}
