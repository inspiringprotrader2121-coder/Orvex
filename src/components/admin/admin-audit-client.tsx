"use client";

import { useMemo, useState } from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";

type AuditPayload = {
  logs: Array<{
    action: string;
    actorUserId: string | null;
    createdAt: string;
    entityId: string | null;
    entityType: string;
    id: string;
    result: string;
  }>;
};

export function AdminAuditClient({
  initialData,
}: {
  initialData: AuditPayload;
}) {
  const { data, error } = useAdminResource(initialData, {
    endpoint: "/api/admin/audit",
    eventNames: ["admin.data.changed", "admin.user.updated", "admin.integration.updated", "admin.worker.updated"],
    pollMs: 60_000,
  });
  const [query, setQuery] = useState("");

  const filteredLogs = useMemo(() => {
    if (!query.trim()) {
      return data.logs;
    }

    const search = query.trim().toLowerCase();
    return data.logs.filter((log) =>
      log.action.toLowerCase().includes(search) ||
      log.entityType.toLowerCase().includes(search) ||
      (log.entityId ?? "").toLowerCase().includes(search),
    );
  }, [data.logs, query]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Audit and Reporting"
        subtitle="Trace admin actions, user-impacting changes, and operational interventions with export-ready audit records."
        title="Audit Logs"
      />

      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div> : null}

      <AdminSection
        action={(
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/export?dataset=audit&format=csv" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">CSV</a>
            <a href="/api/admin/export?dataset=audit&format=json" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">JSON</a>
            <a href="/api/admin/export?dataset=audit&format=pdf" className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">PDF</a>
          </div>
        )}
        title="Event Stream"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search action, entity type, or id"
          className="mb-5 w-full rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />
        <div className="space-y-3">
          {filteredLogs.length > 0 ? filteredLogs.map((log) => (
            <div key={log.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{log.action}</p>
                  <p className="mt-1 text-sm text-slate-400">{log.entityType} • {log.entityId ?? "n/a"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-cyan-300">{log.result}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">Actor {log.actorUserId ?? "system"}</p>
            </div>
          )) : <AdminEmptyState text="No audit records matched the current search." />}
        </div>
      </AdminSection>
    </div>
  );
}
