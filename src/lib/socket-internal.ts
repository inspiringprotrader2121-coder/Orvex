import { io, type Socket } from "socket.io-client";
import { signSocketToken } from "./auth";
import type { WorkflowUpdatedEvent } from "./workflows";

const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:3001";
let socket: Socket | null = null;

/**
 * Orvex Socket Bridge (Internal Helper)
 * Used by the background workers to signal the Real-time Bridge.
 */
function getInternalSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            auth: {
                token: signSocketToken("worker", "internal", "1h"),
            },
            autoConnect: true,
            reconnectionAttempts: 5,
        });
    }

    return socket;
}

export const notifyJobUpdate = (userId: string, workflowId: string, status: WorkflowUpdatedEvent["status"]) => {
    getInternalSocket().emit("job.update", { userId, workflowId, status });
};
