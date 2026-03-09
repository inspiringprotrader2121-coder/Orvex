import 'dotenv/config';
import { Server } from "socket.io";
import http from "http";

const PORT = process.env.SOCKET_PORT || 3001;
const httpServer = http.createServer();

/**
 * Orvex Real-time Bridge
 * Lightweight Socket.io server to push job status from Workers to Dashboard.
 */
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production once URL is stable
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a room based on userId for targeted notifications
    socket.on("join", (userId: string) => {
        if (userId) {
            console.log(`[Socket] User ${userId} joined room`);
            socket.join(`user:${userId}`);
        }
    });

    // Relay job updates from worker/api to client
    socket.on("job.update", (data: { userId: string, workflowId: string, status: string }) => {
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
