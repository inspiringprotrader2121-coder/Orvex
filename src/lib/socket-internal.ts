import { io, type Socket } from "socket.io-client";
import { signSocketToken } from "./auth";
import type { WorkflowUpdatedEvent } from "./workflows";
import type { AdminRealtimeEvent } from "./admin/events";

const SOCKET_URL = process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
const BUILD_PHASE = "phase-production-build";
let socket: Socket | null = null;
let lastConnectionError: string | null = null;

function isSocketBridgeDisabled() {
    return process.env.ORVEX_DISABLE_INTERNAL_SOCKET === "true"
        || process.env.NEXT_PHASE === BUILD_PHASE
        || process.env.npm_lifecycle_event === "build";
}

/**
 * Orvex Socket Bridge (Internal Helper)
 * Used by the background workers to signal the Real-time Bridge.
 */
function getInternalSocket(): Socket | null {
    if (isSocketBridgeDisabled()) {
        return null;
    }

    if (!socket) {
        socket = io(SOCKET_URL, {
            auth: {
                token: signSocketToken("worker", "internal", "1h"),
            },
            autoConnect: true,
            reconnectionAttempts: 3,
            timeout: 2_000,
        });

        socket.on("connect_error", (error) => {
            const message = error instanceof Error ? error.message : String(error);
            if (message === lastConnectionError) {
                return;
            }

            lastConnectionError = message;
            console.warn(`[SocketInternal] Unable to reach socket bridge at ${SOCKET_URL}: ${message}`);
        });
    }

    return socket;
}

export const notifyJobUpdate = (userId: string, workflowId: string, status: WorkflowUpdatedEvent["status"]) => {
    getInternalSocket()?.emit("job.update", { userId, workflowId, status });
};

export const notifyCreditsUpdate = (userId: string, creditsAvailable: number) => {
    getInternalSocket()?.emit("credits.update", { creditsAvailable, userId });
};

export const notifySubscriptionUpdate = (
    userId: string,
    subscriptionTier: "free" | "starter" | "pro" | "growth" | "enterprise",
    subscriptionStatus: "inactive" | "trialing" | "active" | "past_due" | "canceled",
) => {
    getInternalSocket()?.emit("subscription.update", { subscriptionStatus, subscriptionTier, userId });
};

export const notifyAdminEvent = (event: AdminRealtimeEvent) => {
    getInternalSocket()?.emit("admin.event", event);
};
