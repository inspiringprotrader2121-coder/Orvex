import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminQueueActionBodySchema } from "@server/schemas/admin-api";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.operations.write", request);
    const body = AdminQueueActionBodySchema.parse(await request.json());

    await AdminOperationsService.handleQueueAction({
      action: body.action,
      actorUserId: session.user.id,
      ipAddress: getRequestIp(request),
      jobId: body.jobId,
      queueName: body.queueName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid queue action payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
