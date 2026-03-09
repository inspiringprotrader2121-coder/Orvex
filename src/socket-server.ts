import 'dotenv/config';
import { Server } from "socket.io";
import http from "http";
import { verifySocketToken, type SocketTokenPayload } from "./lib/auth";
import type { WorkflowUpdatedEvent } from "./lib/workflows";

const PORT = process.env.SOCKET_PORT || 3001;
const httpServer = http.createServer();

/**
 * Orvex Real-time Bridge
 * Lightweight Socket.io server to push job status from Workers to Dashboard.
 */
const io = new Server(httpServer, {
    cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

io.use((socket, next) => {
    const token = typeof socket.handshake.auth.token === "string"
        ? socket.handshake.auth.token
        : null;

    if (!token) {
        next(new Error("Authentication required"));
        return;
    }

    const payload = verifySocketToken(token);
    if (!payload) {
        next(new Error("Invalid socket token"));
        return;
    }

    socket.data.auth = payload;
    next();
});

io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    const auth = socket.data.auth as SocketTokenPayload;

    if (auth.role === "user") {
        socket.join(`user:${auth.sub}`);
    }

    socket.on("job.update", (data: WorkflowUpdatedEvent) => {
        if (auth.role !== "internal") {
            socket.emit("error", "Forbidden");
            return;
        }

        if (!data?.userId || !data.workflowId || !data.status) {
            socket.emit("error", "Invalid payload");
            return;
        }

        console.log(`[Socket] Job Update: ${data.workflowId} -> ${data.status}`);
        io.to(`user:${data.userId}`).emit("workflow.updated", data);
    });

    socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected`);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Orvex Real-time Bridge listening on port ${PORT}`);
});
