import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminDashboardService } from "@server/services/admin/admin-dashboard-service";

export async function GET() {
  try {
    await requireAdminApiSession("admin.finance.read");
    const data = await AdminDashboardService.getFinanceSnapshot();
    return NextResponse.json(data);
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
