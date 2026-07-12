import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

/**
 * useSocketSync — Phase 0 scaffold.
 *
 * Opens a Socket.io connection to the /ops namespace.
 * Currently exposes nothing — no event listeners yet.
 *
 * Event listeners are added here in subsequent steps (all in this one
 * file per Process Flow §5 — keeps socket wiring in one place):
 *
 *   Step 4: trip:dispatched, trip:completed, trip:cancelled,
 *           trip:halted, trip:resumed  → setQueryData / invalidateQueries
 *   Step 5: maintenance:opened, maintenance:closed
 *   Step 6: cost:logged
 *
 * The token in handshake auth is a placeholder ("phase0-dev") until
 * Step 1 (Auth + RBAC) wires the real JWT from the Zustand auth store.
 */
export function useSocketSync(): void {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Dev: explicit server URL; prod: same origin (Vite proxy handles /socket.io)
    const SOCKET_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

    const socket = io(`${SOCKET_URL}/ops`, {
      auth: {
        // Placeholder token — Step 1 replaces this with the JWT from the
        // Zustand auth store (process.env check is server-side; this is
        // client-side auth payload sent on WS handshake).
        token: "phase0-dev",
      },
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
  }, []);
}
