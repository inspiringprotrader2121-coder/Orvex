import { io as Client } from "socket.io-client";

const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:3001";
const socket = Client(SOCKET_URL);

/**
 * Orvex Socket Bridge (Internal Helper)
 * Used by the background workers to signal the Real-time Bridge.
 */
export const notifyJobUpdate = (userId: string, workflowId: string, status: string) => {
    socket.emit("job.update", { userId, workflowId, status });
};
