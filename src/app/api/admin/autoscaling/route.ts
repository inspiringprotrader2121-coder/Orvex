import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.operations.write", request);
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action !== "scale_up" && action !== "scale_down") {
      throw new Error("Invalid autoscale action");
    }

    const result = await AdminOperationsService.handleAutoscaleAction({
      action,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
