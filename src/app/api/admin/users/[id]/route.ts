import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminUserPatchBodySchema } from "@server/schemas/admin-api";
import { AdminUsersService } from "@server/services/admin/admin-users-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAdminApiSession("admin.users.write", request);
    const { id } = await params;
    const body = AdminUserPatchBodySchema.parse(await request.json());

    await AdminUsersService.updateUser({
      action: body.action,
      actorUserId: session.user.id,
      ipAddress: getRequestIp(request),
      notes: body.notes,
      targetUserId: id,
      value: body.value,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid user update payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
