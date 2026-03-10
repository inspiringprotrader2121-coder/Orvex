import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.operations.write", request);
    const body = await request.json() as {
      action: "assign" | "restart";
      nodeId: string;
      queueNames?: string[];
    };

    const result = await AdminOperationsService.handleWorkerAction({
      action: body.action,
      actorUserId: session.user.id,
      ipAddress: getRequestIp(request),
      nodeId: body.nodeId,
      queueNames: body.queueNames,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
