/**
 * TransitOps — Server Entry Point
 *
 * Stack: Node.js + Express 5 + TypeScript
 * Prisma: nested at server/prisma/schema.prisma
 *        client: @prisma/client from server/node_modules
 *
 * Dotenv loads repo-root .env (one directory up from /server).
 * DATABASE_URL read here → available to Prisma client at runtime.
 * For `prisma migrate dev`, set DATABASE_URL in your shell or run:
 *   set DATABASE_URL=... && npx prisma migrate dev --schema=prisma/schema.prisma
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load repo-root .env before anything else
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { UserRole } from "@transitops/shared";
import authRouter from "./routes/auth";
import vehiclesRouter from "./routes/vehicles";
import driversRouter from "./routes/drivers";
import { errorHandler } from "./middleware/errorHandler";
import { verifyAuthToken } from "./lib/jwt";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

// Allowed CORS origins — localhost only per Technical Requirements §6
const ALLOWED_ORIGINS: string[] = [
  CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:4000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4000",
];

// ---------------------------------------------------------------------------
// Express
// ---------------------------------------------------------------------------
const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, same-origin fetch)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes — Phase 0: health only
// Feature routes (vehicles, drivers, trips, etc.) land in Steps 2–8.
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  // Verification step 6: curl http://localhost:<PORT>/health
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/drivers", driversRouter);

// Centralized error middleware — must be registered last, after every route.
app.use(errorHandler);

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const httpServer = createServer(app);

// ---------------------------------------------------------------------------
// Socket.io — namespace /ops
// Per Technical Requirements §3.10 and Process Flow §5.
//
// Handshake middleware verifies the JWT passed in the connection's auth
// payload (same access token as REST calls) and attaches the decoded user
// to the socket. Missing/invalid tokens reject the connection.
// ---------------------------------------------------------------------------
interface OpsSocketData {
  user: { id: string; role: UserRole };
}

const io = new SocketIOServer<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  OpsSocketData
>(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

const opsNs = io.of("/ops");

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

  // Business events are added here in subsequent steps:
  //   Step 4: emit trip:dispatched, trip:completed, trip:cancelled, trip:halted, trip:resumed
  //   Step 5: emit maintenance:opened, maintenance:closed
  //   Step 6: emit cost:logged
  // All from the same namespace so useSocketSync() on the client wires them
  // in one place (Process Flow §5).
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`✅ TransitOps server  : http://localhost:${PORT}`);
  console.log(`   Health check       : http://localhost:${PORT}/health`);
  console.log(`   Socket.io /ops     : ready`);
});

export { app, httpServer, io };
