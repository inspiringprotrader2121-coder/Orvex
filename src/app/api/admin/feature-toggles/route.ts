import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminFeatureToggleBodySchema } from "@server/schemas/admin-api";
import { AdminUsersService } from "@server/services/admin/admin-users-service";

export async function GET() {
  try {
    await requireAdminApiSession("admin.features.manage");
    const toggles = await AdminUsersService.listFeatureToggles();
    return NextResponse.json({ toggles });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.features.manage", request);
    const body = AdminFeatureToggleBodySchema.parse(await request.json());

    await AdminUsersService.upsertFeatureToggle({
      actorUserId: session.user.id,
      description: body.description,
      key: body.key,
      scope: body.scope,
      state: body.state,
      subscriptionTier: body.subscriptionTier,
      userId: body.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid feature toggle payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
