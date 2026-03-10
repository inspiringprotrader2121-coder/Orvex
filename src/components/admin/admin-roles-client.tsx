"use client";

import { useState, useTransition } from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusPill } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";
import { getErrorMessage } from "@/lib/errors";

type AdminRole = {
  createdAt: string;
  description: string | null;
  id: string;
  isSystem: boolean;
  key: string;
  name: string;
  permissions: string[];
  updatedAt: string;
};

type RolesPayload = { roles: AdminRole[] };

async function postJson(url: string, options: { body?: Record<string, unknown>; method: "DELETE" | "POST" }) {
  const response = await fetch(url, {
    method: options.method,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error((await response.json().catch(() => ({ error: "Request failed" }))).error ?? "Request failed");
  }

  return response.json().catch(() => null);
}

function formatPermissionPreview(permissions: string[]) {
  if (permissions.includes("*")) {
    return "Full access";
  }

  return permissions.slice(0, 4).join(", ");
}

export function AdminRolesClient({
  canManage,
  initialRoles,
}: {
  canManage: boolean;
  initialRoles: RolesPayload;
}) {
  const rolesResource = useAdminResource(initialRoles, {
    endpoint: "/api/admin/roles",
    eventNames: ["admin.data.changed"],
    pollMs: 60_000,
  });
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleUpsertRole = (role?: AdminRole) => {
    if (!canManage) {
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          const key = window.prompt("Role key (lowercase, use underscores)", role?.key ?? "custom_role");
          if (!key) {
            return;
          }

          const name = window.prompt("Role name", role?.name ?? "Custom Role");
          if (!name) {
            return;
          }

          const description = window.prompt("Role description", role?.description ?? "Custom admin role");
          const permissionsText = window.prompt(
            "Permissions (comma separated, use * for full access)",
            role?.permissions?.join(", ") ?? "admin.access",
          );
          if (!permissionsText) {
            return;
          }

          const permissions = permissionsText.split(",").map((value) => value.trim()).filter(Boolean);

          await postJson("/api/admin/roles", {
            body: {
              id: role?.id ?? null,
              key,
              name,
              description,
              permissions,
            },
            method: "POST",
          });

          await rolesResource.refresh();
        } catch (error) {
          setActionError(getErrorMessage(error, "Role update failed"));
        }
      })();
    });
  };

  const handleDeleteRole = (role: AdminRole) => {
    if (!canManage || role.isSystem) {
      return;
    }

    const confirmed = window.confirm(`Delete role "${role.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          await postJson(`/api/admin/roles/${role.id}`, {
            method: "DELETE",
          });
          await rolesResource.refresh();
        } catch (error) {
          setActionError(getErrorMessage(error, "Role deletion failed"));
        }
      })();
    });
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Roles and Permissions"
        subtitle="Define permission policies for Orvex administrators and keep RBAC aligned with the platform."
        title="Roles"
      />

      {actionError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{actionError}</div>
      ) : null}

      <AdminSection
        title="Role Matrix"
        action={canManage ? (
          <button
            type="button"
            onClick={() => handleUpsertRole()}
            className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300"
          >
            Add Role
          </button>
        ) : null}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Permissions</th>
                <th className="px-3 py-3">Updated</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {rolesResource.data.roles.map((role) => (
                <tr key={role.id}>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-white">{role.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{role.key}</p>
                    {role.description ? <p className="mt-2 text-xs text-slate-400">{role.description}</p> : null}
                  </td>
                  <td className="px-3 py-4">
                    <div className="space-y-2">
                      <StatusPill tone={role.isSystem ? "info" : "neutral"}>
                        {role.isSystem ? "System role" : "Custom role"}
                      </StatusPill>
                      <div className="text-xs text-slate-400">
                        {formatPermissionPreview(role.permissions)}
                        {role.permissions.length > 4 ? ` +${role.permissions.length - 4} more` : ""}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-300">
                    {new Date(role.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpsertRole(role)}
                        disabled={!canManage}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        disabled={!canManage || role.isSystem}
                        className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rolesResource.data.roles.length === 0 ? (
            <div className="pt-6">
              <AdminEmptyState text="No roles have been configured yet." />
            </div>
          ) : null}
        </div>
      </AdminSection>

      {isPending ? <div className="text-sm text-slate-400">Applying role changes...</div> : null}
    </div>
  );
}
