import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function PATCH(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.operations.write", request);
    const body = await request.json() as {
      alertId?: string;
      backlogThreshold?: number;
      failedJobsThreshold?: number;
      mode: "status" | "thresholds";
      paymentFailureThreshold?: number;
      staleWorkerMinutes?: number;
      status?: "acknowledged" | "resolved";
    };

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
    return createAdminErrorResponse(error);
  }
}
