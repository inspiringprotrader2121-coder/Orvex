import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { WorkflowSubmissionService } from "@server/services/workflow-submission-service";
import { WorkflowAbuseService } from "@server/services/workflow-abuse-service";
import { InsufficientCreditsError, RateLimitExceededError } from "@server/utils/errors";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";

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
    const result = await WorkflowSubmissionService.startLaunchPack(userId, payload);

    return NextResponse.json({
      message: "Launch pack generation queued",
      success: true,
      workflowId: result.workflowId,
    });
  } catch (error) {
    console.error("Legacy Etsy Workflow Error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid workflow payload", issues: error.issues }, { status: 400 });
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

    return NextResponse.json({ error: "Unable to queue launch pack" }, { status: 500 });
  }
}
