# TransitOps — Smart Transport Operations Platform

A centralized web platform for transport operations: vehicle/driver lifecycle, trip dispatch with business-rule enforcement, maintenance workflow, fuel/expense tracking, and analytics — for four role-based personas.

## Prerequisites

- Node.js ≥ 20
- PostgreSQL (local install or Docker)

## Setup

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local Postgres connection string

# 2. Install all workspace dependencies
npm install

# 3. Run Prisma migration (creates all 8 tables)
npm run migrate --workspace=prisma

# 4. (Optional) Run seed
npm run seed --workspace=prisma
```

## Development

```bash
# Start both client and server concurrently
npm run dev

# Or individually:
npm run dev --workspace=client   # http://localhost:5173
npm run dev --workspace=server   # http://localhost:4000
```

## Health Check

```bash
curl http://localhost:4000/health
# → {"status":"ok"}
```

## Type Check

```bash
npm run typecheck --workspace=client
npm run typecheck --workspace=server
npm run typecheck --workspace=shared
```

## Architecture

- **`/client`** — Vite 7 + React 19.2 + TypeScript + Tailwind v4 + shadcn/ui (new-york)
- **`/server`** — Node.js + Express 5 + TypeScript + Socket.io
- **`/prisma`** — Prisma 6 schema + migrations + seed script
- **`/shared`** — Shared Zod validation schemas (enums + per-entity mutations)

See `docs/` for:
- `Technical_Requirements.md` — entities, API surface, non-functional requirements
- `Process_Flow.md` — state machines, business rule sequences, Socket.io event catalog
- `Implementation_Plan.md` — step-by-step build order with dependencies

## Demo Users (after Step 1 — Auth)

| Role | Email | Password |
|---|---|---|
| Fleet Manager | `manager@transitops.local` | `demo1234` |
| Driver (Dispatcher) | `driver@transitops.local` | `demo1234` |
| Safety Officer | `safety@transitops.local` | `demo1234` |
| Financial Analyst | `analyst@transitops.local` | `demo1234` |

## Phase Progress

- [x] Phase 0 — Infrastructure setup
- [x] Step 1 — Auth + RBAC
- [x] Step 2 — Vehicle Registry
- [x] Step 3 — Driver Management
- [x] Step 4 — Trip Management + lifecycle
- [x] Step 5 — Maintenance workflow
- [x] Step 6 — Fuel & Expense logging
- [ ] Step 7 — Dashboard
- [ ] Step 8 — Reports & Analytics
- [ ] Step 9 — Maps (Leaflet)
- [ ] Step 10 — Anomaly flags
- [ ] Step 11 — Predictive maintenance nudge
- [ ] Step 12 — Email reminders (Ethereal)
- [ ] Step 13 — PDF export
- [ ] Step 14 — Charts polish
- [ ] Step 15 — Named Routes
