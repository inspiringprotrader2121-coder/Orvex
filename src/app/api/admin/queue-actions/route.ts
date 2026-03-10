import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.operations.write", request);
    const body = await request.json() as {
      action: "cancel" | "retry";
      jobId: string;
    };

    await AdminOperationsService.handleQueueAction({
      action: body.action,
      actorUserId: session.user.id,
      ipAddress: getRequestIp(request),
      jobId: body.jobId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
