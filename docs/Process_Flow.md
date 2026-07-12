# TransitOps — Process Flow

Companion to Technical Requirements — read that first for entity fields and the tech stack. This doc covers system architecture, state machines, the exact business-rule sequences, the Socket.io event catalog, per-role workflows, and the flow for each scope-add feature.

## 1. System Architecture

```
┌─────────────┐        HTTPS (REST)        ┌──────────────┐        ┌────────────┐
│  React SPA   │ ─────────────────────────▶ │  Express API  │ ─────▶ │ PostgreSQL │
│ (Vite, TS)   │ ◀───────────────────────── │ (TS, Prisma)  │ ◀───── │  (local)   │
└─────┬────────┘                            └──────┬───────┘        └────────────┘
      │            WebSocket (Socket.io, JWT-auth'd, namespace /ops)  │
      └────────────────────────────────────────────┘◀─────────────────┘
                                                     server emits on every
                                                     state-changing mutation
```

- Client holds JWT in memory (Zustand auth store), attaches it to both REST calls (Authorization header) and the Socket.io handshake.
- TanStack Query owns all server-state caching; Socket.io events patch that cache directly rather than triggering blind refetches.
- Prisma is the only thing that talks to Postgres — no raw SQL except via Prisma's typed raw-query escape hatch if something genuinely needs it (unlikely for this scope).

## 2. Entity Relationship Overview

```
User (role) ──────────────────────────────── (auth only, not FK'd into ops entities)

Vehicle (1) ──< Trip (N)          Vehicle (1) ──< MaintenanceLog (N)
Driver  (1) ──< Trip (N)          Vehicle (1) ──< FuelLog (N)
Trip    (1) ──< FuelLog (0..1)    Vehicle (1) ──< Expense (N)
Route   (1) ──< Trip (N)          (optional FK — Trip.routeId is nullable)
```

Every operational entity (Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense) hangs off Vehicle and/or Driver. Trip is the join point where the business rules live. Route is master data one level upstream of Trip — it informs Trip creation but carries no business-rule enforcement of its own (see §4.8).

## 3. State Machines

### Vehicle

```
        create trip w/ dispatch            complete/cancel trip
AVAILABLE ───────────────────▶ ON_TRIP ───────────────────────▶ AVAILABLE
    │  ▲                                                            │  ▲
    │  │ close maintenance                                          │  │
    ▼  │ (unless RETIRED)                                           ▼  │
  IN_SHOP ◀──────────────── open maintenance ─────────────────────────┘
    │
    │ manual, terminal
    ▼
 RETIRED
```

| From | Event | To | Guard |
|---|---|---|---|
| AVAILABLE | dispatch trip | ON_TRIP | vehicle available, cargo ≤ capacity |
| ON_TRIP | complete/cancel trip | AVAILABLE | — |
| AVAILABLE | open maintenance | IN_SHOP | — |
| IN_SHOP | close maintenance | AVAILABLE | vehicle not RETIRED |
| any (manual) | retire | RETIRED | terminal, no guard beyond manual action |

### Driver

```
AVAILABLE ──dispatch──▶ ON_TRIP ──complete/cancel──▶ AVAILABLE
    │
    ├── manual ──▶ OFF_DUTY ──manual──▶ AVAILABLE
    └── license expired / manual ──▶ SUSPENDED (blocks assignment until cleared)
```

### Trip

```
DRAFT ──dispatch (validation chain)──▶ DISPATCHED ──complete──▶ COMPLETED
  │                                      │   ▲
  │                                 halt │   │ resume
  │                                      ▼   │
  │                                   HALTED
  │                                      │
  └──────────────────── cancel ──────────┴──▶ CANCELLED
```

Halt/resume only transitions between `DISPATCHED` and `HALTED` — completion always happens from `DISPATCHED`, so a halted trip must resume before it can complete. Cancel is reachable from `DRAFT` or `DISPATCHED` only (not from `HALTED` — resume first, then cancel if needed, so the vehicle/driver status revert logic doesn't have to special-case a halted trip).

## 4. Business Rule Sequences

These are the sequences that matter most — get these right before touching anything else.

### 4.1 Dispatch (`POST /api/trips/:id/dispatch`)

1. Fetch trip (must be `DRAFT`), vehicle, driver in one query.
2. Validate: `vehicle.status === AVAILABLE` → else 409 "vehicle not available".
3. Validate: `driver.status === AVAILABLE` → else 409 "driver not available".
4. Validate: `driver.licenseExpiryDate >= now()` → else 409 "license expired".
5. Validate: `driver.status !== SUSPENDED` (redundant with #3 but explicit) → else 403.
6. Validate: `trip.cargoWeight <= vehicle.maxLoadCapacity` → else 400.
7. **Begin transaction**: set `vehicle.status = ON_TRIP`, `driver.status = ON_TRIP`, `trip.status = DISPATCHED`, `trip.dispatchedAt = now()`. **Commit.**
8. Emit Socket.io event `trip:dispatched` with `{ tripId, vehicleId, driverId }`.
9. Return updated trip.

If any validation in steps 2–6 fails, the transaction never opens — return the specific error so the frontend can show it inline rather than a generic failure.

### 4.2 Complete (`POST /api/trips/:id/complete`)

1. Fetch trip (must be `DISPATCHED`).
2. Require `finalOdometer`, `fuelConsumed` in body (Zod validation — both required, both positive).
3. **Begin transaction**: `trip.status = COMPLETED`, `trip.completedAt = now()`, `trip.actualDistance = finalOdometer - vehicle.odometer` (captured before the update), `vehicle.odometer = finalOdometer`, `vehicle.status = AVAILABLE`, `driver.status = AVAILABLE`. Create the `FuelLog` row (liters = fuelConsumed, linked to trip + vehicle) in the same transaction. **Commit.**
4. Emit `trip:completed` with `{ tripId, vehicleId, driverId, actualDistance, fuelConsumed }`.

### 4.3 Cancel (`POST /api/trips/:id/cancel`)

1. Fetch trip (must be `DRAFT` or `DISPATCHED`).
2. **Begin transaction**: `trip.status = CANCELLED`. If trip was `DISPATCHED`: also revert `vehicle.status = AVAILABLE`, `driver.status = AVAILABLE`. **Commit.**
3. Emit `trip:cancelled` with `{ tripId, wasDispatched: boolean }`.

### 4.4 Maintenance Open (`POST /api/maintenance`)

1. Validate vehicle isn't already `IN_SHOP` or `RETIRED` (can't open a second concurrent record).
2. **Transaction**: create `MaintenanceLog` (`status = OPEN`), `vehicle.status = IN_SHOP`. **Commit.**
3. Emit `maintenance:opened` with `{ vehicleId, maintenanceLogId }`.
4. Dispatch-eligible vehicle query (used by Trip creation form) filters out `IN_SHOP` at the query level — not a client-side filter, so a stale cache can't let someone dispatch an in-shop vehicle.

### 4.5 Maintenance Close (`POST /api/maintenance/:id/close`)

1. Fetch record (must be `OPEN`), fetch vehicle.
2. **Transaction**: `maintenanceLog.status = CLOSED`, `maintenanceLog.closedAt = now()`. If `vehicle.status !== RETIRED`: `vehicle.status = AVAILABLE`. Always: `vehicle.lastServiceOdometer = vehicle.odometer`. **Commit.**
3. Emit `maintenance:closed` with `{ vehicleId, maintenanceLogId }`.

### 4.6 Fuel/Expense Logging

1. Straightforward create, no state machine involved — but still emits `cost:logged` with `{ vehicleId }` so the dashboard's operational-cost KPI and the map's anomaly badge can react live.
2. Operational cost is never stored — always `SUM(fuel) + SUM(maintenance)` computed at read time, so this event just tells listeners "re-derive," not "here's the new number."

### 4.7 Halt / Resume (`POST /api/trips/:id/halt`, `POST /api/trips/:id/resume`)

**Halt:**
1. Fetch trip (must be `DISPATCHED`).
2. Require `haltReason` in body (Zod validation, required non-empty string).
3. **Transaction**: `trip.status = HALTED`, `trip.haltReason = <reason>`. Vehicle/driver stay `ON_TRIP` — they're still committed to this trip, just not moving. **Commit.**
4. Emit `trip:halted` with `{tripId, haltReason}`.

**Resume:**
1. Fetch trip (must be `HALTED`).
2. **Transaction**: `trip.status = DISPATCHED`, `trip.haltReason = null`. **Commit.**
3. Emit `trip:resumed` with `{tripId}`.

Adapted from a real-world Odoo transport module reviewed for this project, which models exactly this pattern (Start → In-Progress → Halt → Resume → Done). Cheap on top of the existing dispatch/complete/cancel chain — two more status values, two more small transactions, no new entities — and it reads as a deliberate operational detail rather than a toy state machine.

### 4.8 Route-Assisted Trip Creation (`POST /api/trips`, optional `routeId` in body)

1. If `routeId` is present: fetch the Route, verify `isActive === true` (else 400 "route retired"), and use its `source`, `destination`, `standardDistance` as defaults for the corresponding Trip fields — the client pre-fills the form with these; the user can still edit any of them before submit.
2. Regardless of edits, `trip.routeId` is stamped from the selected Route. This is what makes route-level reporting (§7.7) possible even if the user tweaked the distance for that specific run.
3. If `routeId` is absent: create the trip exactly as today (freehand source/destination/plannedDistance, `routeId = null`). No validation chain changes, no new transaction — this is a pure convenience layer in front of the existing `DRAFT`-creation insert, not a new state machine.
4. No socket event — trip creation in `DRAFT` state was never broadcast (only dispatch/complete/cancel/halt/resume are, since those are the transitions other clients need to react to live).

## 5. Socket.io Event Catalog

| Event | Emitted on | Payload | Client reaction |
|---|---|---|---|
| `trip:dispatched` | §4.1 step 8 | `{tripId, vehicleId, driverId}` | patch vehicle/driver status in cache, move marker color on map, decrement "Available Vehicles" KPI |
| `trip:completed` | §4.2 step 4 | `{tripId, vehicleId, driverId, actualDistance, fuelConsumed}` | patch statuses back, invalidate reports queries (cost/efficiency changed) |
| `trip:cancelled` | §4.3 step 3 | `{tripId, wasDispatched}` | patch statuses if applicable |
| `trip:halted` | §4.7 Halt | `{tripId, haltReason}` | vehicle marker → amber-outline pulse on map, dashboard shows halted-trip count |
| `trip:resumed` | §4.7 Resume | `{tripId}` | marker reverts to normal on-trip color |
| `maintenance:opened` | §4.4 step 3 | `{vehicleId, maintenanceLogId}` | vehicle marker → amber, remove from dispatch-pool cache |
| `maintenance:closed` | §4.5 step 3 | `{vehicleId, maintenanceLogId}` | vehicle marker → green, invalidate predictive-maintenance query |
| `cost:logged` | §4.6 | `{vehicleId}` | invalidate reports + anomaly-flag queries for that vehicle |

All listeners live in one `useSocketSync()` hook that wires every event to a `queryClient.setQueryData` or targeted `invalidateQueries` call — keeps the socket wiring in one place instead of scattered across components.

Route CRUD intentionally emits nothing: it's low-frequency master data a Fleet Manager edits occasionally, not a live operational status like Vehicle/Trip/Maintenance, so there's no other client with a reason to react in realtime. The Route picker in the Trip creation form just refetches on open.

## 6. Role-Based Workflows

**Fleet Manager** — logs in → Dashboard (full KPIs) → registers a vehicle → registers a driver → maintains the Named Routes master list → monitors trips/maintenance across the fleet → reviews Reports (cost, ROI, anomalies, route profitability) → exports CSV/PDF for stakeholders.

**Driver (dispatcher)** — logs in → Dashboard (operational view) → creates a trip, optionally picking a saved Route to pre-fill source/destination/distance (or entering them freehand) from available-vehicle/available-driver pools, enters cargo weight + revenue → dispatches it → later, completes it (enters final odometer + fuel) or cancels it.

**Safety Officer** — logs in → Driver Management (compliance view: license expiry, safety score, status) → runs "Check compliance" → reviews who got an Ethereal reminder email → can suspend a driver manually if needed.

**Financial Analyst** — logs in → Reports (read-only) → reviews operational cost, fuel efficiency, ROI, anomaly flags, and route profitability per vehicle/lane → exports CSV/PDF.

## 7. Scope-Add Feature Flows

### 7.1 Anomaly Flags
`GET /api/reports/anomalies` → for each non-retired vehicle: `costPerKm = (SUM(fuel.cost)+SUM(maintenance.cost)) / SUM(trip.actualDistance)`. Compute `fleetAverageCostPerKm` across all vehicles. Flag any vehicle where `costPerKm > 1.5 × fleetAverageCostPerKm`. Returned list feeds a badge in Reports and the map marker popup — no separate storage, recomputed on every call.

### 7.2 Predictive Maintenance Nudge
`GET /api/reports/maintenance-due` → for each `AVAILABLE`/`ON_TRIP` vehicle: flag if `odometer - lastServiceOdometer > 5000`. Feeds a dashboard notification badge and a "Due for service" filter on Vehicle Registry.

### 7.3 Email Reminders
`POST /api/compliance/check-expiring-licenses` → query all drivers where `licenseExpiryDate` is within 30 days → for each, send via Nodemailer/Ethereal → response includes the Ethereal preview URLs so the UI can show "3 reminders sent" with clickable preview links for the demo.

### 7.4 PDF/CSV Export
`GET /api/reports/export.csv|.pdf` → runs the same aggregation queries as the Reports page → CSV: stream rows directly. PDF: `pdfkit` renders a one-page fleet summary (KPI header + per-vehicle cost/efficiency/ROI table) → streamed back as `application/pdf`.

### 7.5 Map Data Flow
On trip creation, source/destination strings are geocoded once (a free geocoder, e.g. Nominatim) and the lat/lng cached on the Trip row — never re-geocoded on subsequent renders. If the trip was created from a saved Route (§7.7), its already-cached `sourceLat/Lng`/`destinationLat/Lng` are copied over instead of hitting the geocoder again. Map component queries `GET /api/vehicles?withLocation=true` (vehicle's "location" for map purposes = its current trip's route, or a static depot point if idle) and subscribes to the same Socket.io events as the dashboard for marker color updates.

### 7.6 Trip Manifest PDF
`GET /api/trips/:id/manifest.pdf` → fetch trip + vehicle + driver → `pdfkit` renders a single-page document: tracking number, LR number (if present), source/destination, vehicle registration, driver name, cargo weight, parcel count, status → streamed back as `application/pdf`. No aggregation query needed, so it's cheap relative to the fleet summary PDF.

### 7.7 Named Routes & Route Profitability
- `GET/POST /api/routes`, `GET/PATCH/DELETE /api/routes/:id` — plain CRUD (see §4.8 for how Trip creation consumes it). Delete is blocked (409) if any Trip references the route; the UI offers "retire" (`isActive = false`) instead, which just removes it from the picker without touching history.
- `GET /api/reports/route-profitability` → for each active Route: `tripsCount = COUNT(trips WHERE routeId = route.id AND status = COMPLETED)`, `totalRevenue = SUM(trip.revenue)`, `totalDistance = SUM(trip.actualDistance)`, `avgRevenuePerKm = totalRevenue / totalDistance` (guard divide-by-zero → null when `tripsCount = 0`), `attributableFuelCost = SUM(fuelLog.cost)` for fuel logs whose `tripId` belongs to a completed trip on that route.
- Deliberately **not** a full ROI clone: maintenance cost is tracked per-vehicle, not per-trip, so it can't be honestly allocated to a single lane — the route metric stays revenue/fuel-based and says so in the UI rather than presenting a number that looks like ROI but isn't. Same honesty rule as the Revenue assumption in Technical Requirements §3.8.
- Feeds a "Route Profitability" table on the Reports page, sorted by `avgRevenuePerKm` descending — "which lane is most profitable" is a straight read of row order, no separate ranking logic needed.
