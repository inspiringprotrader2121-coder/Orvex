"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusPill } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";
import { getErrorMessage } from "@/lib/errors";

type AdminUser = {
  createdAt: string;
  credits: number;
  creditsAvailable: number;
  creditsUsed: number;
  email: string;
  id: string;
  lastLoginAt: string | null;
  role: string;
  status: string;
  storeCount: number;
  subscriptionStatus: string;
  subscriptionTier: string;
  workflowCount: number;
};

type StoreConnection = {
  apiStatus: string;
  id: string;
  lastSyncAt: string | null;
  platform: string;
  productsCount: number;
  status: string;
  storeName: string;
  userEmail: string | null;
  userId: string;
};

type FeatureToggle = {
  description: string | null;
  id: string;
  key: string;
  scope: string;
  state: string;
  subscriptionTier: string | null;
  updatedAt: string;
  userId: string | null;
};

type UsersPayload = { users: AdminUser[] };
type ConnectionsPayload = { connections: StoreConnection[] };
type TogglesPayload = { toggles: FeatureToggle[] };

async function postJson(url: string, options: { body?: Record<string, unknown>; method: "PATCH" | "POST" }) {
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

export function AdminUsersClient({
  currentUserId,
  initialConnections,
  initialToggles,
  initialUsers,
}: {
  currentUserId: string;
  initialConnections: ConnectionsPayload;
  initialToggles: TogglesPayload;
  initialUsers: UsersPayload;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subscriptionTierFilter, setSubscriptionTierFilter] = useState("all");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    | "created_at"
    | "last_login_at"
    | "email"
    | "subscription_tier"
    | "subscription_status"
    | "credits_available"
    | "credits_used"
    | "role"
    | "status"
  >("created_at");
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toggleKey, setToggleKey] = useState("");
  const [toggleScope, setToggleScope] = useState<"global" | "tier" | "user">("tier");
  const [toggleState, setToggleState] = useState<"enabled" | "disabled" | "beta">("beta");
  const [toggleTier, setToggleTier] = useState("growth");
  const [toggleUserId, setToggleUserId] = useState("");

  const usersQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    if (deferredQuery.trim()) {
      params.set("query", deferredQuery.trim());
    }
    if (roleFilter !== "all") {
      params.set("role", roleFilter);
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (subscriptionTierFilter !== "all") {
      params.set("subscriptionTier", subscriptionTierFilter);
    }
    if (subscriptionStatusFilter !== "all") {
      params.set("subscriptionStatus", subscriptionStatusFilter);
    }
    params.set("sort", sortBy);
    return params.toString();
  }, [deferredQuery, roleFilter, sortBy, statusFilter, subscriptionTierFilter, subscriptionStatusFilter]);

  const usersResource = useAdminResource(initialUsers, {
    buildEndpoint: () => `/api/admin/users?${usersQuery}`,
    dependencies: [usersQuery],
    eventNames: ["admin.user.updated", "admin.data.changed"],
    pollMs: 45_000,
  });
  const connectionsResource = useAdminResource(initialConnections, {
    endpoint: "/api/admin/store-connections",
    eventNames: ["admin.integration.updated", "admin.data.changed"],
    pollMs: 60_000,
  });
  const togglesResource = useAdminResource(initialToggles, {
    endpoint: "/api/admin/feature-toggles",
    eventNames: ["admin.data.changed"],
    pollMs: 60_000,
  });

  const filteredUsers = usersResource.data.users;

  const handleUserAction = (userId: string, action: "adjust_credits" | "delete" | "set_role" | "suspend" | "upgrade") => {
    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          if (action === "delete" && userId === currentUserId) {
            throw new Error("You cannot delete your own account.");
          }

          if (action === "delete") {
            const confirmed = window.confirm("Delete this user? This cannot be undone.");
            if (!confirmed) {
              return;
            }
          }
          const payload: Record<string, unknown> = { action };

          if (action === "upgrade") {
            payload.value = window.prompt("Enter subscription tier: free, starter, pro, growth, enterprise", "growth") ?? "growth";
          }

          if (action === "set_role") {
            payload.value = window.prompt("Enter role: super_admin, admin, moderator, user", "admin") ?? "admin";
          }

          if (action === "adjust_credits") {
            payload.value = Number(window.prompt("Credit adjustment amount. Use negative numbers to deduct.", "25") ?? "0");
            payload.notes = "Admin dashboard adjustment";
          }

          await postJson(`/api/admin/users/${userId}`, {
            body: payload,
            method: "PATCH",
          });
          await usersResource.refresh();
        } catch (error) {
          setActionError(getErrorMessage(error, "User action failed"));
        }
      })();
    });
  };

  const handleConnectionAction = (connectionId: string, action: "disconnect" | "refresh") => {
    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          await postJson("/api/admin/store-connections", {
            body: { action, connectionId },
            method: "PATCH",
          });
          await connectionsResource.refresh();
        } catch (error) {
          setActionError(getErrorMessage(error, "Store connection update failed"));
        }
      })();
    });
  };

  const handleCreateToggle = () => {
    startTransition(() => {
      void (async () => {
        try {
          const trimmedKey = toggleKey.trim();
          if (!trimmedKey) {
            throw new Error("Feature key is required");
          }

          await postJson("/api/admin/feature-toggles", {
            body: {
              description: "Managed from Orvex super admin",
              key: trimmedKey,
              scope: toggleScope,
              state: toggleState,
              subscriptionTier: toggleScope === "tier" ? toggleTier : null,
              userId: toggleScope === "user" ? toggleUserId.trim() : null,
            },
            method: "POST",
          });
          await togglesResource.refresh();
          setToggleKey("");
          setToggleUserId("");
        } catch (error) {
          setActionError(getErrorMessage(error, "Feature toggle update failed"));
        }
      })();
    });
  };

  const handleToggleState = (toggle: FeatureToggle, nextState: "enabled" | "disabled" | "beta") => {
    startTransition(() => {
      void (async () => {
        try {
          setActionError("");
          await postJson("/api/admin/feature-toggles", {
            body: {
              description: toggle.description ?? "Managed from Orvex super admin",
              key: toggle.key,
              scope: toggle.scope,
              state: nextState,
              subscriptionTier: toggle.subscriptionTier,
              userId: toggle.userId,
            },
            method: "POST",
          });
          await togglesResource.refresh();
        } catch (error) {
          setActionError(getErrorMessage(error, "Feature toggle update failed"));
        }
      })();
    });
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Users and Access"
        subtitle="Manage account roles, credits, subscriptions, store connections, and feature access from a single operational view."
        title="Users"
      />

      {actionError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{actionError}</div>
      ) : null}

      <AdminSection title="User Controls">
        <div className="mb-5 grid gap-3 md:grid-cols-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email, role, status, tier"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white">
            <option value="all">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
          <select value={subscriptionTierFilter} onChange={(event) => setSubscriptionTierFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white">
            <option value="all">All tiers</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select value={subscriptionStatusFilter} onChange={(event) => setSubscriptionStatusFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white">
            <option value="all">All subscription states</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white">
            <option value="created_at">Newest first</option>
            <option value="last_login_at">Last login</option>
            <option value="email">Email</option>
            <option value="subscription_tier">Tier</option>
            <option value="subscription_status">Subscription status</option>
            <option value="credits_available">Credits available</option>
            <option value="credits_used">Credits used</option>
            <option value="role">Role</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3">Credits</th>
                <th className="px-3 py-3">Last Login</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-white">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-500">{user.workflowCount} workflows • {user.storeCount} stores</p>
                  </td>
                  <td className="px-3 py-4">
                    <div className="space-y-2">
                      <StatusPill tone={user.subscriptionTier === "free" ? "neutral" : "success"}>{user.subscriptionTier}</StatusPill>
                      <div className="text-xs text-slate-500">{user.subscriptionStatus}</div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-white">{user.creditsAvailable}</p>
                    <p className="mt-1 text-xs text-slate-500">Used {user.creditsUsed}</p>
                  </td>
                  <td className="px-3 py-4 text-slate-300">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-3 py-4">
                    <div className="space-y-2">
                      <StatusPill tone={user.status === "active" ? "success" : user.status === "suspended" ? "warning" : "critical"}>{user.status}</StatusPill>
                      <div className="text-xs text-slate-500">{user.role}</div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleUserAction(user.id, "suspend")} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        {user.status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                      <button type="button" onClick={() => handleUserAction(user.id, "upgrade")} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                        Upgrade
                      </button>
                      <button type="button" onClick={() => handleUserAction(user.id, "set_role")} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Role
                      </button>
                      <button type="button" onClick={() => handleUserAction(user.id, "adjust_credits")} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                        Credits
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUserAction(user.id, "delete")}
                        disabled={user.id === currentUserId}
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
          {filteredUsers.length === 0 ? <div className="pt-6"><AdminEmptyState text="No users matched the current filters." /></div> : null}
        </div>
      </AdminSection>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminSection title="Store Integration Monitoring">
          <div className="space-y-3">
            {connectionsResource.data.connections.length > 0 ? connectionsResource.data.connections.map((connection) => (
              <div key={connection.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{connection.storeName}</p>
                    <p className="mt-1 text-sm text-slate-400">{connection.platform} • {connection.productsCount} products</p>
                    {connection.userEmail ? (
                      <p className="mt-1 text-xs text-slate-500">User: {connection.userEmail}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={connection.status === "connected" ? "success" : connection.status === "error" ? "critical" : "warning"}>
                      {connection.status}
                    </StatusPill>
                    <button type="button" onClick={() => handleConnectionAction(connection.id, "refresh")} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                      Refresh
                    </button>
                    <button type="button" onClick={() => handleConnectionAction(connection.id, "disconnect")} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Disconnect
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  API {connection.apiStatus} • Last sync {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : "never"}
                </p>
              </div>
            )) : <AdminEmptyState text="No store connections have been recorded yet." />}
          </div>
        </AdminSection>

        <AdminSection
          action={(
            <button type="button" onClick={handleCreateToggle} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Save Toggle
            </button>
          )}
          title="Feature Toggles and Beta Access"
        >
          <div className="mb-6 grid gap-3 md:grid-cols-6">
            <input
              value={toggleKey}
              onChange={(event) => setToggleKey(event.target.value)}
              placeholder="Feature key"
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 md:col-span-2"
            />
            <select
              value={toggleScope}
              onChange={(event) => setToggleScope(event.target.value as "global" | "tier" | "user")}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white"
            >
              <option value="global">Global</option>
              <option value="tier">Tier</option>
              <option value="user">User</option>
            </select>
            <select
              value={toggleState}
              onChange={(event) => setToggleState(event.target.value as "enabled" | "disabled" | "beta")}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white"
            >
              <option value="enabled">Enabled</option>
              <option value="beta">Beta</option>
              <option value="disabled">Disabled</option>
            </select>
            <select
              value={toggleTier}
              onChange={(event) => setToggleTier(event.target.value)}
              disabled={toggleScope !== "tier"}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white disabled:opacity-50"
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <input
              value={toggleUserId}
              onChange={(event) => setToggleUserId(event.target.value)}
              placeholder="Target user ID"
              disabled={toggleScope !== "user"}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-3">
            {togglesResource.data.toggles.length > 0 ? togglesResource.data.toggles.map((toggle) => (
              <div key={toggle.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{toggle.key}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {toggle.scope}
                      {toggle.subscriptionTier ? ` • ${toggle.subscriptionTier}` : ""}
                      {toggle.userId ? ` • user ${toggle.userId}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleState(toggle, toggle.state === "disabled" ? "enabled" : "disabled")}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                        toggle.state === "disabled"
                          ? "border-white/10 bg-white/5"
                          : "border-emerald-400/30 bg-emerald-500/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          toggle.state === "disabled" ? "translate-x-1" : "translate-x-6"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleState(toggle, "beta")}
                      className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300"
                    >
                      Beta
                    </button>
                    <StatusPill tone={toggle.state === "enabled" ? "success" : toggle.state === "beta" ? "info" : "warning"}>{toggle.state}</StatusPill>
                  </div>
                </div>
                {toggle.description ? <p className="mt-3 text-sm text-slate-400">{toggle.description}</p> : null}
              </div>
            )) : <AdminEmptyState text="No feature toggles configured yet." />}
          </div>
        </AdminSection>
      </div>

      {isPending ? <div className="text-sm text-slate-400">Applying admin action…</div> : null}
    </div>
  );
}
