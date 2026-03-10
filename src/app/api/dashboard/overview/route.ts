import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DashboardFilterSchema } from "@server/schemas/dashboard";
import { DashboardAnalyticsService } from "@server/services/dashboard-analytics-service";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = DashboardFilterSchema.parse({
    channel: url.searchParams.get("channel") ?? undefined,
    dateRange: url.searchParams.get("dateRange") ?? undefined,
    product: url.searchParams.get("product") ?? undefined,
    store: url.searchParams.get("store") ?? undefined,
  });

  const data = await DashboardAnalyticsService.getOverview(userId, filters);
  return NextResponse.json(data);
}
