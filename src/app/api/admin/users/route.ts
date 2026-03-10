import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminUsersService } from "@server/services/admin/admin-users-service";

export async function GET(request: Request) {
  try {
    await requireAdminApiSession("admin.users.read");
    const { searchParams } = new URL(request.url);
    const data = await AdminUsersService.listUsers({
      limit: Number(searchParams.get("limit") ?? 50),
      query: searchParams.get("query"),
      role: searchParams.get("role"),
      sort: (searchParams.get("sort") as
        | "created_at"
        | "credits"
        | "credits_available"
        | "credits_used"
        | "email"
        | "last_login_at"
        | "role"
        | "status"
        | "subscription_status"
        | "subscription_tier"
        | null) ?? undefined,
      status: searchParams.get("status"),
      subscriptionStatus: searchParams.get("subscriptionStatus"),
      subscriptionTier: searchParams.get("subscriptionTier"),
    });
    return NextResponse.json({ users: data });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
