import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminUsageService } from "@server/services/admin/admin-usage-service";

export async function GET() {
  try {
    await requireAdminApiSession("admin.usage.read");
    const data = await AdminUsageService.getUsageSnapshot();
    return NextResponse.json(data);
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
