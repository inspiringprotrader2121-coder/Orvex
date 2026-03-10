import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminOperationsService } from "@server/services/admin/admin-operations-service";

export async function GET() {
  try {
    await requireAdminApiSession("admin.operations.read");
    const data = await AdminOperationsService.getOperationsSnapshot();
    return NextResponse.json(data);
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
