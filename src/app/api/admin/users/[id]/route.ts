import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminUsersService } from "@server/services/admin/admin-users-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAdminApiSession("admin.users.write", request);
    const { id } = await params;
    const body = await request.json() as {
      action: "adjust_credits" | "delete" | "set_role" | "suspend" | "upgrade";
      notes?: string | null;
      value?: number | string | null;
    };

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
    return createAdminErrorResponse(error);
  }
}
