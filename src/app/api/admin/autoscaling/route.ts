import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminAutoscalePostBodySchema } from "@server/schemas/admin-api";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.operations.write", request);
    const body = AdminAutoscalePostBodySchema.parse(await request.json());

    const result = await AdminOperationsService.handleAutoscaleAction({
      action: body.action,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid autoscale payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
