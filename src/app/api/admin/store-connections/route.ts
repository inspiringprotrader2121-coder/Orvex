import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminStoreConnectionPatchBodySchema } from "@server/schemas/admin-api";
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
    const body = AdminStoreConnectionPatchBodySchema.parse(await request.json());

    await AdminUsersService.updateStoreConnection({
      action: body.action,
      actorUserId: session.user.id,
      connectionId: body.connectionId,
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid store connection payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
