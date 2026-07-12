import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { queryClient } from "../lib/queryClient";
import type { Vehicle } from "../types/vehicle";
import type { Driver } from "../types/driver";

/**
 * useSocketSync — connects to the /ops namespace using the JWT held in the
 * Zustand auth store. Reconnects whenever the token changes (login/logout)
 * and skips connecting entirely while logged out, since the server now
 * verifies the handshake token (Step 1).
 *
 * Event listeners are added here (all in this one file per Process Flow
 * §5 — keeps socket wiring in one place). Where the event payload carries
 * the affected vehicleId/driverId (trip:dispatched), the cache is patched
 * directly via setQueryData. Where it doesn't (trip:completed changes the
 * vehicle's odometer too; trip:cancelled/halted/resumed payloads only
 * carry the tripId), a targeted invalidateQueries is used instead — patching
 * fields we don't have would mean guessing at derived data.
 *
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

    // ["vehicles"]/["drivers"]/["dashboard"] are prefix keys — invalidating
    // them refreshes every filtered variant too (the Dashboard queries
    // ["vehicles", filters] and ["dashboard", filters]). The optimistic
    // setQueryData patch on trip:dispatched gives the plain vehicle/driver
    // lists an instant update; the invalidate then reconciles everything.
    socket.on(
      "trip:dispatched",
      (payload: { tripId: string; vehicleId: string; driverId: string }) => {
        queryClient.setQueryData<Vehicle[]>(["vehicles"], (old) =>
          old?.map((v) => (v.id === payload.vehicleId ? { ...v, status: "ON_TRIP" } : v))
        );
        queryClient.setQueryData<Driver[]>(["drivers"], (old) =>
          old?.map((d) => (d.id === payload.driverId ? { ...d, status: "ON_TRIP" } : d))
        );
        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        queryClient.invalidateQueries({ queryKey: ["drivers"] });
        queryClient.invalidateQueries({ queryKey: ["trips"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    );

    socket.on("trip:completed", () => {
      // Vehicle odometer + both statuses changed; payload doesn't carry
      // the new odometer, so refetch rather than guess. Completion also
      // adds distance/revenue/fuel, so the reports re-derive too.
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    });

    socket.on("trip:cancelled", (payload: { tripId: string; wasDispatched: boolean }) => {
      if (payload.wasDispatched) {
        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        queryClient.invalidateQueries({ queryKey: ["drivers"] });
      }
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    socket.on("trip:halted", () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    socket.on("trip:resumed", () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    // Opening/closing a record flips the vehicle's status (AVAILABLE ⇄
    // IN_SHOP), so the maintenance list, any vehicle query, the KPI counts,
    // and the reports' operational-cost/ROI columns all re-derive.
    socket.on("maintenance:opened", () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    });

    socket.on("maintenance:closed", () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    });

    // Fuel/expense creation doesn't change any cached status — it changes
    // derived cost totals. The event says "re-derive" (Process Flow §4.6),
    // so invalidate the log lists plus the report/anomaly queries that
    // aggregate them (those land in Steps 8/10; invalidating a key with no
    // observer yet is a harmless no-op).
    socket.on("cost:logged", () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-logs"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);
}
