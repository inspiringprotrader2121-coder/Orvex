import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
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
    const body = await request.json() as {
      description?: string | null;
      key: string;
      scope: "global" | "tier" | "user";
      state: "beta" | "disabled" | "enabled";
      subscriptionTier?: "enterprise" | "free" | "growth" | "pro" | "starter" | null;
      userId?: string | null;
    };

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
    return createAdminErrorResponse(error);
  }
}
