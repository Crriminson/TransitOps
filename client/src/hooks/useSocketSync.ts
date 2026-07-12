import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

/**
 * useSocketSync — connects to the /ops namespace using the JWT held in the
 * Zustand auth store. Reconnects whenever the token changes (login/logout)
 * and skips connecting entirely while logged out, since the server now
 * verifies the handshake token (Step 1).
 *
 * Event listeners are added here in subsequent steps (all in this one
 * file per Process Flow §5 — keeps socket wiring in one place):
 *
 *   Step 4: trip:dispatched, trip:completed, trip:cancelled,
 *           trip:halted, trip:resumed  → setQueryData / invalidateQueries
 *   Step 5: maintenance:opened, maintenance:closed
 *   Step 6: cost:logged
 */
export function useSocketSync(): void {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) {
      return;
    }

    // Dev: explicit server URL; prod: same origin (Vite proxy handles /socket.io)
    const SOCKET_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

    const socket = io(`${SOCKET_URL}/ops`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1_000,
    });

    socket.on("connect", () => {
      console.log("[useSocketSync] connected to /ops ✓", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[useSocketSync] disconnected from /ops:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[useSocketSync] /ops connection error:", err.message);
    });

    // TODO (Step 4): socket.on("trip:dispatched", (payload) => { ... })
    // TODO (Step 4): socket.on("trip:completed",  (payload) => { ... })
    // TODO (Step 4): socket.on("trip:cancelled",  (payload) => { ... })
    // TODO (Step 4): socket.on("trip:halted",     (payload) => { ... })
    // TODO (Step 4): socket.on("trip:resumed",    (payload) => { ... })
    // TODO (Step 5): socket.on("maintenance:opened", (payload) => { ... })
    // TODO (Step 5): socket.on("maintenance:closed", (payload) => { ... })
    // TODO (Step 6): socket.on("cost:logged",        (payload) => { ... })

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);
}
