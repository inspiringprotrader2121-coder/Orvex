import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { DashboardRollbackSchema } from "@server/schemas/dashboard";
import { WorkflowRollbackService } from "@server/services/workflow-rollback-service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = DashboardRollbackSchema.parse(await request.json());
    const restoredWorkflowId = await WorkflowRollbackService.restoreWorkflow(userId, body.workflowId);

    return NextResponse.json({
      restoredWorkflowId,
      success: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid rollback payload",
        issues: error.issues,
      }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unable to restore workflow output";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
