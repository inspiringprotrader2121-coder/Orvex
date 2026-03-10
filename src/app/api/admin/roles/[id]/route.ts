import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminRolesService } from "@server/services/admin/admin-roles-service";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAdminApiSession("admin.roles.write", request);
    const { id } = await params;

    await AdminRolesService.deleteRole({
      actorUserId: session.user.id,
      id,
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
