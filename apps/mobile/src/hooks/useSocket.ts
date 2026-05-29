import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const SOCKET_URL = "http://localhost:5000";

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      query: { userId: user.id },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const sendDM = useCallback((to: string, content: string, mediaUrl?: string) => {
    socketRef.current?.emit("dm:send", { to, content, mediaUrl });
  }, []);

  const sendTyping = useCallback((to: string) => {
    socketRef.current?.emit("dm:typing", { to });
  }, []);

  const onDM = useCallback((handler: (msg: any) => void) => {
    socketRef.current?.on("dm:receive", handler);
    return () => { socketRef.current?.off("dm:receive", handler); };
  }, []);

  const onTyping = useCallback((handler: (data: any) => void) => {
    socketRef.current?.on("dm:typing", handler);
    return () => { socketRef.current?.off("dm:typing", handler); };
  }, []);

  const onPresence = useCallback((handler: (data: any) => void) => {
    socketRef.current?.on("presence:update", handler);
    return () => { socketRef.current?.off("presence:update", handler); };
  }, []);

  return { socket: socketRef.current, sendDM, sendTyping, onDM, onTyping, onPresence };
}
