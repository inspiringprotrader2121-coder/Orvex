export type AdminEventName =
  | "admin.data.changed"
  | "admin.user.updated"
  | "admin.queue.updated"
  | "admin.integration.updated"
  | "admin.alert.created"
  | "admin.worker.updated"
  | "admin.autoscale.updated";

export type AdminRealtimeEvent = {
  action: string;
  entity: string;
  entityId?: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
  type: AdminEventName;
  userId?: string;
};

export function createAdminRealtimeEvent(input: Omit<AdminRealtimeEvent, "occurredAt">): AdminRealtimeEvent {
  return {
    ...input,
    occurredAt: new Date().toISOString(),
  };
}
