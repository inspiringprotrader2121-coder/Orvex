import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardOverviewClient } from "@/components/dashboard/dashboard-overview-client";
import { DashboardFilterSchema } from "@server/schemas/dashboard";
import { DashboardAnalyticsService } from "@server/services/dashboard-analytics-service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = DashboardFilterSchema.parse({
    channel: typeof resolvedSearchParams.channel === "string" ? resolvedSearchParams.channel : undefined,
    dateRange: typeof resolvedSearchParams.dateRange === "string" ? resolvedSearchParams.dateRange : undefined,
    product: typeof resolvedSearchParams.product === "string" ? resolvedSearchParams.product : undefined,
    store: typeof resolvedSearchParams.store === "string" ? resolvedSearchParams.store : undefined,
  });

  const initialData = await DashboardAnalyticsService.getOverview(userId, filters);
  const userName = session.user.email?.split("@")[0] ?? "your workspace";

  return <DashboardOverviewClient initialData={initialData} userName={userName} />;
}
