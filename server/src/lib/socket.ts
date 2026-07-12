/**
 * Socket.io /ops namespace — extracted from index.ts so route handlers
 * (trips, maintenance, fuel/expense in later steps) can import
 * `emitOpsEvent` without a circular dependency on the entry point.
 */
import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { UserRole } from "@transitops/shared";
import { verifyAuthToken } from "./jwt";

export interface OpsSocketData {
  user: { id: string; role: UserRole };
}

// Event names/payloads are dynamic (emitOpsEvent takes any string + shape,
// per event), so the three event-map generics are left loose — only
// SocketData (the decoded JWT user) is strongly typed, since that's what
// route handlers and the handshake middleware actually rely on.
type OpsServer = SocketIOServer<any, any, any, OpsSocketData>;

let io: OpsServer | undefined;

export function createSocketServer(httpServer: HttpServer, allowedOrigins: string[]): OpsServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  const opsNs = io.of("/ops");

  // Handshake middleware verifies the JWT passed in the connection's auth
  // payload (same access token as REST calls) and attaches the decoded
  // user to the socket. Missing/invalid tokens reject the connection.
  opsNs.use((socket, next) => {
    const token: unknown = socket.handshake.auth?.token;

    if (!token || typeof token !== "string" || token.trim() === "") {
      return next(new Error("Authentication error: token missing"));
    }

    try {
      const payload = verifyAuthToken(token);
      socket.data.user = { id: payload.userId, role: payload.role };
      next();
    } catch {
      next(new Error("Authentication error: invalid or expired token"));
    }
  });

  opsNs.on("connection", (socket) => {
    console.log(
      `[Socket.io /ops] client connected  : ${socket.id} (user ${socket.data.user.id}, role ${socket.data.user.role})`
    );

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io /ops] client disconnected: ${socket.id} — ${reason}`);
    });
  });

  return io;
}

// Business events emitted from route handlers — Step 4: trip:dispatched,
// trip:completed, trip:cancelled, trip:halted, trip:resumed. Step 5:
// maintenance:opened, maintenance:closed. Step 6: cost:logged. All from
// this one namespace so useSocketSync() on the client wires them in one
// place (Process Flow §5).
export function emitOpsEvent(event: string, payload: unknown): void {
  if (!io) return;
  io.of("/ops").emit(event, payload);
}
