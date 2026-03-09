import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { getErrorMessage } from "@/lib/errors";
import { WorkflowSubmissionService } from "@server/services/workflow-submission-service";
import {
  InsufficientCreditsError,
  RateLimitExceededError,
  UnsupportedProviderError,
} from "@server/utils/errors";

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

  console.error("Workflow submission failed:", getErrorMessage(error, "Unknown workflow error"));
  return NextResponse.json({ error: "Unable to start workflow" }, { status: 500 });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const submission = await request.json();
    const result = await WorkflowSubmissionService.start(userId, submission);

    return NextResponse.json({
      creditsCost: result.creditsCost,
      success: true,
      type: result.type,
      workflowId: result.workflowId,
    });
  } catch (error) {
    console.error("Workflow Submission Error:", error);
    return toErrorResponse(error);
  }
}
