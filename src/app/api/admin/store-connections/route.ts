import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminUsersService } from "@server/services/admin/admin-users-service";

export async function GET() {
  try {
    await requireAdminApiSession("admin.integrations.read");
    const data = await AdminUsersService.listStoreConnections();
    return NextResponse.json({ connections: data });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.integrations.write", request);
    const body = await request.json() as {
      action: "disconnect" | "refresh";
      connectionId: string;
    };

    await AdminUsersService.updateStoreConnection({
      action: body.action,
      actorUserId: session.user.id,
      connectionId: body.connectionId,
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
