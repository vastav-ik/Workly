import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server;

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>();

/**
 * Initialise Socket.io server with optional Redis adapter.
 * Falls back to in-memory adapter when REDIS_URL is not set.
 */
export async function initSocket(httpServer: HttpServer): Promise<Server> {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60_000,
  });

  // Optionally attach Redis adapter for horizontal scaling
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const { createClient } = await import("redis");
      const { createAdapter } = await import("@socket.io/redis-adapter");

      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);

      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.io Redis adapter connected");
    } catch (err) {
      console.warn("⚠️  Redis adapter failed, falling back to in-memory:", (err as Error).message);
    }
  } else {
    console.log("ℹ️  No REDIS_URL set – using in-memory Socket.io adapter");
  }

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.query.userId as string | undefined;

    if (userId) {
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId)!.add(socket.id);
      io.emit("presence:update", { userId, online: true });
    }

    // Direct message relay
    socket.on("dm:send", (payload: { to: string; content: string; mediaUrl?: string }) => {
      const targetSockets = onlineUsers.get(payload.to);
      if (targetSockets) {
        targetSockets.forEach((sid) => {
          io.to(sid).emit("dm:receive", {
            from: userId,
            content: payload.content,
            mediaUrl: payload.mediaUrl,
            timestamp: new Date().toISOString(),
          });
        });
      }
    });

    // Typing indicators
    socket.on("dm:typing", (payload: { to: string }) => {
      const targetSockets = onlineUsers.get(payload.to);
      if (targetSockets) {
        targetSockets.forEach((sid) => {
          io.to(sid).emit("dm:typing", { from: userId });
        });
      }
    });

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.get(userId)?.delete(socket.id);
        if (onlineUsers.get(userId)?.size === 0) {
          onlineUsers.delete(userId);
          io.emit("presence:update", { userId, online: false });
        }
      }
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialised – call initSocket first");
  return io;
}

export function getOnlineUsers(): Map<string, Set<string>> {
  return onlineUsers;
}
