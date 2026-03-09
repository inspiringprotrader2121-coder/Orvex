import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { getErrorMessage } from "@/lib/errors";
import { WorkflowSubmissionService } from "@server/services/workflow-submission-service";
import { InsufficientCreditsError, RateLimitExceededError } from "@server/utils/errors";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json({ error: getErrorMessage(error, "Unable to queue launch pack") }, { status: 500 });
  }
}
