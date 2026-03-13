import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminRoleUpsertBodySchema } from "@server/schemas/admin-api";
import { AdminRolesService } from "@server/services/admin/admin-roles-service";

export async function GET() {
  try {
    await requireAdminApiSession("admin.roles.read");
    const roles = await AdminRolesService.listRoles();
    return NextResponse.json({
      roles: roles.map((role) => ({
        createdAt: role.createdAt.toISOString(),
        description: role.description ?? null,
        id: role.id,
        isSystem: role.isSystem,
        key: role.key,
        name: role.name,
        permissions: role.permissions ?? [],
        updatedAt: role.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.roles.write", request);
    const body = AdminRoleUpsertBodySchema.parse(await request.json());

    await AdminRolesService.upsertRole({
      actorUserId: session.user.id,
      description: body.description ?? null,
      id: body.id ?? null,
      ipAddress: getRequestIp(request),
      key: body.key,
      name: body.name,
      permissions: body.permissions ?? [],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid role payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
