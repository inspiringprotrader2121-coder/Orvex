"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/socket-provider";
import { getErrorMessage } from "@/lib/errors";
import type { DashboardOverviewData } from "@/lib/dashboard";
import { DashboardCommunityPanel } from "./dashboard-community-panel";
import { DashboardFilterBar } from "./dashboard-filter-bar";
import { DashboardJobTable } from "./dashboard-job-table";
import { DashboardMarketplaceTrends } from "./dashboard-marketplace-trends";
import { DashboardMetricGrid } from "./dashboard-metric-grid";
import { DashboardOptimizationPanel } from "./dashboard-optimization-panel";
import { DashboardProductHistory } from "./dashboard-product-history";
import { ScoreTrendChart, WorkflowTrendChart } from "./dashboard-trend-charts";

function buildQuery(filters: DashboardOverviewData["filters"]) {
  const query = new URLSearchParams();

  if (filters.product) {
    query.set("product", filters.product);
  }

  query.set("channel", filters.channel);
  query.set("dateRange", filters.dateRange);
  query.set("store", filters.store);

  return query.toString();
}

async function requestOverview(filters: DashboardOverviewData["filters"]) {
  const query = buildQuery(filters);
  const response = await fetch(`/api/dashboard/overview?${query}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to refresh dashboard");
  }

  return {
    payload: await response.json() as DashboardOverviewData,
    query,
  };
}

export function DashboardOverviewClient({
  initialData,
  userName,
}: {
  initialData: DashboardOverviewData;
  userName: string;
}) {
  const router = useRouter();
  const { socket } = useSocket();
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState(initialData.filters);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rollbackPendingId, setRollbackPendingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        const { payload, query } = await requestOverview(filters);
        if (cancelled) {
          return;
        }

        setData(payload);
        setError("");
        router.replace(`/dashboard?${query}`, { scroll: false });
      } catch (refreshError) {
        if (!cancelled) {
          setError(getErrorMessage(refreshError, "Unable to refresh dashboard"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, router]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleWorkflowUpdated = () => {
      void (async () => {
        try {
          const { payload } = await requestOverview(filters);
          setData(payload);
          setError("");
        } catch (refreshError) {
          setError(getErrorMessage(refreshError, "Unable to refresh dashboard"));
        }
      })();
    };

    socket.on("workflow.updated", handleWorkflowUpdated);
    return () => {
      socket.off("workflow.updated", handleWorkflowUpdated);
    };
  }, [filters, socket]);

  async function handleRollback(workflowId: string) {
    try {
      setRollbackPendingId(workflowId);
      setStatus("");

      const response = await fetch("/api/dashboard/rollback", {
        body: JSON.stringify({ workflowId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const rollbackResponse = await response.json() as { error?: string; restoredWorkflowId?: string };

      if (!response.ok || !rollbackResponse.restoredWorkflowId) {
        throw new Error(rollbackResponse.error || "Unable to restore workflow");
      }

      setStatus("Previous AI output restored as a fresh snapshot.");
      const { payload: refreshedData } = await requestOverview(filters);
      setData(refreshedData);
      router.push(`/dashboard/workflows/${rollbackResponse.restoredWorkflowId}`);
    } catch (rollbackError) {
      setError(getErrorMessage(rollbackError, "Unable to restore workflow"));
    } finally {
      setRollbackPendingId(null);
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-indigo-300">Orvex Dashboard</p>
          <h1 className="text-4xl font-black tracking-tight text-white">Growth OS analytics for {userName}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
            Track worker throughput, audit optimization performance, review product output history, and restore previous AI snapshots without leaving the dashboard.
          </p>
        </div>
        {loading ? <p className="text-sm text-cyan-300">Refreshing dashboard...</p> : null}
        {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </header>

      <DashboardFilterBar filters={filters} onChange={setFilters} options={data.filterOptions} />

      <DashboardMetricGrid
        metrics={[
          { accent: "text-amber-300", label: "Pending Jobs", note: "Queued and processing workflows", value: data.jobs.pending },
          { accent: "text-emerald-300", label: "Completed Jobs", note: "Successful AI outputs in scope", value: data.jobs.completed },
          { accent: "text-indigo-300", label: "Avg Optimization", note: "Average listing score", value: data.optimization.averageListingScore },
          { accent: "text-cyan-300", label: "Community Templates", note: "Templates contributed in range", value: data.community.totalTemplates },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkflowTrendChart items={data.trends.workflows} />
        <ScoreTrendChart accentClass="text-cyan-300" eyebrow="Scores" items={data.trends.optimization} title="Optimization trend" />
      </div>

      <DashboardMarketplaceTrends data={data.marketplaceTrends} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardJobTable items={data.jobs.recentActive} />
        <DashboardCommunityPanel data={data.community} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardProductHistory
          items={data.productHistory}
          onRollback={handleRollback}
          rollbackPendingId={rollbackPendingId}
        />
        <div className="space-y-6">
          <DashboardOptimizationPanel data={data.optimization} />
          <ScoreTrendChart accentClass="text-amber-300" eyebrow="Community" items={data.trends.templates} title="Template popularity trend" />
        </div>
      </div>
    </div>
  );
}
