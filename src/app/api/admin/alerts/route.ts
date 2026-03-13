import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminAlertPatchBodySchema } from "@server/schemas/admin-api";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function PATCH(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.operations.write", request);
    const body = AdminAlertPatchBodySchema.parse(await request.json());

    if (body.mode === "thresholds") {
      await AdminOperationsService.updateThresholds({
        actorUserId: session.user.id,
        backlogThreshold: Number(body.backlogThreshold ?? 40),
        failedJobsThreshold: Number(body.failedJobsThreshold ?? 5),
        paymentFailureThreshold: Number(body.paymentFailureThreshold ?? 1),
        staleWorkerMinutes: Number(body.staleWorkerMinutes ?? 3),
      });
    } else if (body.alertId && body.status) {
      await AdminOperationsService.updateAlertStatus({
        actorUserId: session.user.id,
        alertId: body.alertId,
        status: body.status,
      });
    } else {
      return NextResponse.json({ error: "Invalid alert payload" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid alert payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
