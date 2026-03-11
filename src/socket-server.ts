import "dotenv/config";
import os from "node:os";
import http from "http";
import { Server } from "socket.io";
import { createAdminRealtimeEvent, type AdminRealtimeEvent } from "./lib/admin/events";
import { verifySocketToken, type SocketTokenPayload } from "./lib/auth";
import { isAllowedAppOrigin } from "./lib/origin";
import { WorkerNodeService } from "@server/services/admin/worker-node-service";
import type { WorkflowUpdatedEvent } from "./lib/workflows";

const PORT = process.env.SOCKET_PORT || 3001;
const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    methods: ["GET", "POST"],
    origin(origin, callback) {
      if (!origin || isAllowedAppOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed"));
    },
  },
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

  if (auth.role !== "internal") {
    socket.join(`user:${auth.sub}`);
  }

  if (auth.role === "super_admin") {
    socket.join("admin");
  }

  socket.on("job.update", (data: WorkflowUpdatedEvent) => {
    if (auth.role !== "internal") {
      socket.emit("error", "Forbidden");
      return;
    }

    if (!data?.userId || !data?.workflowId || !data?.status) {
      socket.emit("error", "Invalid payload");
      return;
    }

    io.to(`user:${data.userId}`).emit("workflow.updated", data);
    io.to("admin").emit("admin.queue.updated", createAdminRealtimeEvent({
      action: data.status,
      entity: "workflow",
      entityId: data.workflowId,
      payload: {
        status: data.status,
        userId: data.userId,
        workflowId: data.workflowId,
      },
      type: "admin.queue.updated",
      userId: data.userId,
    }));
  });

  socket.on("admin.event", (data: AdminRealtimeEvent) => {
    if (auth.role !== "internal") {
      socket.emit("error", "Forbidden");
      return;
    }

    if (!data?.type || !data?.entity || !data?.action) {
      socket.emit("error", "Invalid payload");
      return;
    }

    io.to("admin").emit(data.type, data);
  });

  socket.on("credits.update", (data: { creditsAvailable: number; userId: string }) => {
    if (auth.role !== "internal") {
      socket.emit("error", "Forbidden");
      return;
    }

    if (!data?.userId || typeof data.creditsAvailable !== "number") {
      socket.emit("error", "Invalid payload");
      return;
    }

    io.to(`user:${data.userId}`).emit("credits.updated", data);
  });

  socket.on("subscription.update", (data: {
    subscriptionStatus: "inactive" | "trialing" | "active" | "past_due" | "canceled";
    subscriptionTier: "free" | "starter" | "pro" | "growth" | "enterprise";
    userId: string;
  }) => {
    if (auth.role !== "internal") {
      socket.emit("error", "Forbidden");
      return;
    }

    if (!data?.userId || !data.subscriptionStatus || !data.subscriptionTier) {
      socket.emit("error", "Invalid payload");
      return;
    }

    io.to(`user:${data.userId}`).emit("subscription.updated", data);
  });

  socket.on("disconnect", () => {
    console.log("[Socket] Client disconnected");
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Socket] Orvex Real-time Bridge listening on port ${PORT}`);
});

async function reportSocketHeartbeat() {
  await WorkerNodeService.heartbeat({
    cpuPercent: Math.round((os.loadavg()[0] ?? 0) * 100),
    host: os.hostname(),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    nodeName: process.env.SOCKET_NODE_NAME || "orvex-socket",
    pm2ProcessName: "orvex-socket",
    queueNames: ["admin-events", "workflow-updates"],
    role: "socket",
    status: "healthy",
    uptimeSeconds: Math.round(process.uptime()),
  });
}

void reportSocketHeartbeat();
setInterval(() => {
  void reportSocketHeartbeat();
}, 60_000);
