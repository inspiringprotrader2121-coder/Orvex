import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminAuditLogs } from "@/lib/db/schema";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdminApiSession("admin.audit.read");
    const logs = await db.query.adminAuditLogs.findMany({
      limit: 100,
      orderBy: [desc(adminAuditLogs.createdAt)],
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
