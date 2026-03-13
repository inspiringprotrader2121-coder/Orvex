import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminWorkerActionBodySchema } from "@server/schemas/admin-api";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.operations.write", request);
    const body = AdminWorkerActionBodySchema.parse(await request.json());

    const result = await AdminOperationsService.handleWorkerAction({
      action: body.action,
      actorUserId: session.user.id,
      ipAddress: getRequestIp(request),
      nodeId: body.nodeId,
      queueNames: body.queueNames,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid worker action payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
