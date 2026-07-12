# TransitOps — Technical Requirements

Assumption carried through this doc and the other two: **local-only deployment** (runs on a laptop for judges — no cloud hosting), scope confirmed as core spec + Maps + Socket.io realtime + Anomaly flags + Predictive maintenance nudge + Email reminders + PDF export + Named Routes.

Two gaps in the source spec are filled in below with explicit assumptions (§3.8, §4) — flagging them here so they don't get missed: **Vehicle ROI needs a Revenue figure that isn't defined as an entity anywhere in the spec**, and **dashboard filtering by "region" needs a region field that isn't listed under Vehicle Registry**. Both are resolved below; change them if you disagree.

## 1. Purpose & Scope

Build a centralized web platform for transport operations: vehicle/driver lifecycle, trip dispatch with business-rule enforcement, maintenance workflow, fuel/expense tracking, and analytics — for four role-based personas. In scope: everything in the mandatory deliverables list, plus Maps visualization, Socket.io realtime updates, Anomaly flags, Predictive maintenance nudges, Email reminders, PDF export, and Named Routes. Out of scope: see §8.

## 2. Actors & Permission Matrix

| Capability | Fleet Manager | Driver (dispatcher role per spec) | Safety Officer | Financial Analyst |
|---|---|---|---|---|
| Vehicle CRUD | Full | Read | Read | Read |
| Driver CRUD | Full | Read | Full (compliance fields) | Read |
| Route CRUD | Full | Read | — | Read |
| Create/Dispatch/Complete/Cancel Trip | Full | Full | Read | Read |
| Maintenance Log CRUD | Full | — | Read | Read (cost only) |
| Fuel/Expense Log CRUD | Full | Log fuel on trip completion | — | Read |
| Dashboard | Full | Full (operational KPIs) | Compliance-focused view | Cost-focused view |
| Reports & CSV/PDF export | Full | — | License/safety reports only | Full |
| Email reminder trigger | Full | — | Full | — |

Note: the spec describes "Driver" as a role that *creates trips and assigns vehicles/drivers* — i.e. it's a dispatcher persona, not the literal person driving the truck. RBAC is implemented server-side via middleware on every route, and mirrored client-side for UI hiding — server-side is the actual enforcement boundary, client-side is UX only.

## 3. Functional Requirements

### 3.1 Authentication
- Email + password login, JWT access token (short-lived, e.g. 2hr — no refresh-token flow needed for a demo-length session).
- Passwords hashed with bcrypt (cost factor 10 — fast enough for hackathon dev loop, still safe).
- Every non-auth route protected by JWT middleware; role-gated routes additionally check `req.user.role` against an allowed-roles list per route.
- Seed script creates one demo user per role for the presentation (documented in README, not hardcoded into the running app's data logic).

### 3.2 Dashboard
- KPI cards: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %.
- Fleet Utilization % = `(vehicles with status ON_TRIP) / (total non-retired vehicles) * 100`.
- Filters: vehicle type, status, region — combinable (AND), reflected in the KPI queries and the vehicle/trip tables underneath.
- Live-updates via Socket.io: KPI cards re-fetch/patch on any trip dispatch/complete/cancel, maintenance open/close, or vehicle status change — no manual refresh needed during a demo.

### 3.3 Vehicle Registry
- Fields: Registration Number (unique), Name/Model, Type (enum), Max Load Capacity (kg), Odometer (km), Acquisition Cost, Status (enum), Region (enum — see §4 assumption), Last Service Odometer (for predictive maintenance).
- Status: `AVAILABLE | ON_TRIP | IN_SHOP | RETIRED`.
- Uniqueness on Registration Number enforced at DB level (unique constraint) + friendly 409 error surfaced to the form.

### 3.4 Driver Management
- Fields: Name, License Number (unique), License Category, License Expiry Date, Contact Number, Safety Score (0–100), Status (enum), Region.
- Status: `AVAILABLE | ON_TRIP | OFF_DUTY | SUSPENDED`.
- Computed (not stored) `licenseExpired` flag: `licenseExpiryDate < now()`, evaluated at query time so it's always accurate without a background job.

### 3.5 Trip Management
- Create: source, destination, vehicle (from filtered available pool), driver (from filtered available pool), cargo weight, planned distance, **revenue** (added field — see §4), parcel count (optional), LR number (optional, manual entry — consignment note number if the shipment has one).
- Optionally select a **saved Route** (see §3.15) instead of typing source/destination/planned distance freehand — picking one pre-fills those three fields (still editable afterward) and stamps `trip.routeId`. Freehand entry with no route selected remains fully supported; those trips just won't appear in route-level reporting.
- Server auto-generates a tracking number on creation (e.g. `TO-<short-id>`) — distinct from the manually-entered LR number.
- Lifecycle: `DRAFT → DISPATCHED ⇄ HALTED → COMPLETED` or `DRAFT/DISPATCHED → CANCELLED`. Halt/resume models a truck stopped mid-transit (breakdown, checkpoint delay, driver rest) without losing the trip's dispatched state — adapted from a real-world Odoo transport module reviewed for this project. Halting requires a reason; resuming clears it. See Process Flow §4.7.
- Complete requires: final odometer reading, fuel consumed (liters) — both feed cost/efficiency calculations. Only reachable from `DISPATCHED`, not directly from `HALTED` — must resume first.
- Full validation chain enforced server-side on dispatch (see Process Flow doc for the exact sequence).

### 3.6 Maintenance
- Create maintenance record against a vehicle: type/description, cost, opened date.
- Opening an active record → vehicle status auto-flips to `IN_SHOP`, and the vehicle is excluded from the dispatch-eligible query (filtered at the query level, not just hidden in the UI).
- Closing a record → vehicle status reverts to `AVAILABLE` unless the vehicle is `RETIRED`.
- Closing a record also updates `lastServiceOdometer = vehicle.odometer` (feeds predictive maintenance).

### 3.7 Fuel & Expense Management
- Fuel logs: liters, cost, date, linked vehicle (optionally linked trip).
- Expense logs: type (`TOLL | MAINTENANCE | OTHER`), amount, date, linked vehicle.
- Operational cost per vehicle = `SUM(fuel.cost) + SUM(maintenance.cost)`, computed on read (aggregation query, not a stored/denormalized field, so it never goes stale).

### 3.8 Reports & Analytics
- Fuel Efficiency = `totalDistance / totalFuelConsumed` per vehicle.
- Fleet Utilization = as defined in §3.2.
- Operational Cost = as defined in §3.7.
- **Vehicle ROI** = `(Revenue − (Maintenance + Fuel)) / Acquisition Cost`. **Assumption**: Revenue isn't defined anywhere in the source entity list, so a `revenue` field is added to Trip (freight/fare charged for that trip) and summed per vehicle across completed trips. If your team already has a different idea for where Revenue comes from, this is the field to redirect.
- CSV export on all report tables. PDF export via `pdfkit` (lightweight, pure-JS — avoids a headless-Chromium dependency like Puppeteer, which is a bad idea to install for the first time mid-hackathon).

### 3.9 Maps & Visualization (scope-add)
- Leaflet + OpenStreetMap tile layer, no API key required.
- Vehicle markers colored by status (`AVAILABLE` green / `ON_TRIP` blue / `IN_SHOP` amber / `RETIRED` grey), filterable by the same region/type/status filters as the dashboard.
- Active trips rendered as a line between source and destination (geocoded once at trip creation via a free geocoder, cached — not re-geocoded on every render).
- Marker color updates live via the same Socket.io channel as the dashboard.

### 3.10 Realtime (Socket.io — scope-add)
- One namespace, JWT-authenticated on connection (reuse the same access token).
- Server emits on: trip dispatch/complete/cancel, maintenance open/close, fuel/expense log creation.
- Client listens and patches the TanStack Query cache directly (`setQueryData`) rather than re-fetching — keeps the dashboard and map instantly in sync without a full refetch storm.

### 3.11 Anomaly Flags (scope-add)
- Threshold rule: flag a vehicle if `costPerKm > 1.5 × fleetAverageCostPerKm`, where `costPerKm = operationalCost / totalDistance`.
- Computed on read in the reports query (no background job needed for an 8hr build) and surfaced as a badge on the vehicle's row in Reports and on its marker popup on the Map.

### 3.12 Predictive Maintenance Nudge (scope-add)
- Threshold rule: flag a vehicle if `odometer − lastServiceOdometer > 5000` (km, configurable constant).
- Surfaced as a dashboard notification badge and a filter option ("Due for service") on the Vehicle Registry.

### 3.13 Email Reminders (scope-add)
- Trigger: license expiring within 30 days, checked on-demand (button: "Check compliance") rather than a real cron job — a real scheduler is unnecessary complexity for a same-day demo.
- Sent via Nodemailer against **Ethereal** (a free fake-SMTP test inbox — no real account setup, and it gives you a preview URL you can literally open in front of judges to prove the email fired). Do not wire this to a real SMTP provider for a hackathon demo; Ethereal is the correct tool here, not a corner cut.

### 3.14 PDF Export (scope-add)
- Two report templates, both `pdfkit`-generated:
  1. Fleet summary: KPI header + per-vehicle cost/efficiency/ROI table, triggered from the Reports page.
  2. Trip manifest / delivery slip: single-trip document (tracking number, LR number, source/destination, vehicle, driver, cargo weight, parcel count), triggered from a trip's detail view — the document you'd hand to a driver, borrowed from the "Delivery Report" pattern in the Odoo transport module reviewed for this project.
- If time runs short, cut the fleet summary before the trip manifest — the manifest is cheaper (single-record, no aggregation query) and demos better as a concrete artifact.

### 3.15 Named Routes (scope-add)
- A **Route** is a reusable, named source→destination lane (e.g. "Mumbai – Pune Express") with a standard distance and a reference rate, so recurring lanes don't get re-typed and re-estimated on every trip. Master-data CRUD, same pattern as Vehicle Registry / Driver Management (list + form, Fleet Manager write, everyone else read).
- Fields: name, optional short code (unique), source, destination, standard distance, standard rate (reference only — not enforced against `trip.revenue`), active flag (soft-retire a lane without breaking historical trips that reference it).
- Source/destination are geocoded once on Route creation (same free geocoder as trip geocoding, §3.9) and the lat/lng cached on the Route row. Standard distance is either entered manually or approximated as straight-line distance between the two geocoded points — no turn-by-turn routing API is used, consistent with the "no external routing API" boundary in §8.
- Trip creation can select a Route to pre-fill source/destination/planned distance (§3.5); when it does, the Trip's map line reuses the Route's cached coordinates instead of re-geocoding.
- Adapted from the Odoo transport module's "Transporter Routes" concept — kept as a plain reusable lane, deliberately without that module's per-route third-party rate-card, since TransitOps has no hired-carrier concept (see §8).
- Enables route-level reporting: `GET /api/reports/route-profitability` (see Process Flow §7.7) — "which lane is most profitable" on top of the existing vehicle-level reporting.
- No Socket.io event: Route is low-frequency master data edited occasionally by a Fleet Manager, not a live operational status like Vehicle/Trip/Maintenance, so there's nothing for other clients to react to in realtime.

## 4. Data Model

| Entity | Field | Type | Constraints |
|---|---|---|---|
| **User** | id | uuid | PK |
| | name | string | required |
| | email | string | unique, required |
| | passwordHash | string | required |
| | role | enum | `FLEET_MANAGER, DRIVER, SAFETY_OFFICER, FINANCIAL_ANALYST` |
| **Vehicle** | id | uuid | PK |
| | registrationNumber | string | unique, required |
| | name | string | required |
| | type | enum | `TRUCK, VAN, MINI_TRUCK, TRAILER, BIKE` |
| | maxLoadCapacity | decimal (kg) | required, > 0 |
| | odometer | decimal (km) | required, ≥ 0 |
| | acquisitionCost | decimal | required, > 0 |
| | status | enum | `AVAILABLE, ON_TRIP, IN_SHOP, RETIRED`, default `AVAILABLE` |
| | region | enum | **assumption**: `NORTH, SOUTH, EAST, WEST, CENTRAL` |
| | lastServiceOdometer | decimal (km) | default 0, updated on maintenance close |
| **Driver** | id | uuid | PK |
| | name | string | required |
| | licenseNumber | string | unique, required |
| | licenseCategory | string | required |
| | licenseExpiryDate | date | required |
| | contactNumber | string | required |
| | safetyScore | int | 0–100, default 100 |
| | status | enum | `AVAILABLE, ON_TRIP, OFF_DUTY, SUSPENDED`, default `AVAILABLE` |
| | region | enum | same set as Vehicle.region |
| **Trip** | id | uuid | PK |
| | source | string | required |
| | destination | string | required |
| | vehicleId | uuid | FK → Vehicle, required |
| | driverId | uuid | FK → Driver, required |
| | cargoWeight | decimal (kg) | required, > 0, ≤ vehicle.maxLoadCapacity (app-level check) |
| | plannedDistance | decimal (km) | required, > 0 |
| | actualDistance | decimal (km) | nullable, set on completion |
| | revenue | decimal | **added field** — required at creation |
| | trackingNumber | string | unique, auto-generated on create |
| | lrNumber | string | optional, manual entry |
| | parcelCount | int | optional |
| | routeId | uuid | FK → Route, nullable — set when trip is created from a saved Route |
| | finalOdometer | decimal | nullable, set on completion |
| | fuelConsumed | decimal (liters) | nullable, set on completion |
| | status | enum | `DRAFT, DISPATCHED, HALTED, COMPLETED, CANCELLED`, default `DRAFT` |
| | haltReason | string | nullable, required when status = HALTED |
| | dispatchedAt / completedAt | timestamp | nullable |
| **MaintenanceLog** | id | uuid | PK |
| | vehicleId | uuid | FK → Vehicle, required |
| | description | string | required |
| | cost | decimal | required, ≥ 0 |
| | status | enum | `OPEN, CLOSED`, default `OPEN` |
| | openedAt / closedAt | timestamp | closedAt nullable |
| **FuelLog** | id | uuid | PK |
| | vehicleId | uuid | FK → Vehicle, required |
| | tripId | uuid | FK → Trip, nullable |
| | liters | decimal | required, > 0 |
| | cost | decimal | required, ≥ 0 |
| | date | date | required |
| **Expense** | id | uuid | PK |
| | vehicleId | uuid | FK → Vehicle, required |
| | type | enum | `TOLL, MAINTENANCE, OTHER` |
| | amount | decimal | required, ≥ 0 |
| | date | date | required |
| | description | string | optional |
| **Route** | id | uuid | PK |
| | name | string | required |
| | code | string | unique, optional (short lane code, e.g. `MUM-PUN-01`) |
| | source | string | required |
| | destination | string | required |
| | sourceLat / sourceLng | decimal | nullable until geocoded, cached |
| | destinationLat / destinationLng | decimal | nullable until geocoded, cached |
| | standardDistance | decimal (km) | required, > 0 |
| | standardRate | decimal | optional, reference only |
| | isActive | boolean | default `true` |

Indexes: `Vehicle.status`, `Vehicle.region`, `Driver.status`, `Trip.status`, `Trip.vehicleId`, `Trip.driverId`, `Trip.routeId`, `FuelLog.vehicleId`, `Expense.vehicleId`, `Route.isActive` — all the columns that get filtered/joined on in dashboard and report queries.

## 5. API Surface

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | /api/auth/login | public | issue JWT |
| POST | /api/auth/register | Fleet Manager only (creating other users) | seed/admin user creation |
| GET/POST | /api/vehicles | all read / Fleet Manager write | vehicle CRUD |
| GET/PATCH/DELETE | /api/vehicles/:id | all read / Fleet Manager write | — |
| GET/POST | /api/drivers | all read / Fleet Manager + Safety Officer write | driver CRUD |
| GET/PATCH/DELETE | /api/drivers/:id | — | — |
| GET/POST | /api/trips | Fleet Manager + Driver | create trip (status DRAFT) |
| POST | /api/trips/:id/dispatch | Fleet Manager + Driver | runs validation chain, transactional |
| POST | /api/trips/:id/complete | Fleet Manager + Driver | requires finalOdometer, fuelConsumed |
| POST | /api/trips/:id/cancel | Fleet Manager + Driver | restores statuses if was dispatched |
| GET/POST | /api/maintenance | all read / Fleet Manager write | — |
| POST | /api/maintenance/:id/close | Fleet Manager | reverts vehicle status |
| GET/POST | /api/routes | all read / Fleet Manager write | named-lane master data |
| GET/PATCH/DELETE | /api/routes/:id | all read / Fleet Manager write | delete only if unreferenced, else soft-retire (`isActive = false`) |
| GET/POST | /api/fuel-logs | all read / Fleet Manager write | — |
| GET/POST | /api/expenses | all read / Fleet Manager write | — |
| GET | /api/dashboard/kpis | all (scoped per role) | filtered KPI aggregation |
| GET | /api/reports/fuel-efficiency, /utilization, /operational-cost, /roi | Fleet Manager + Financial Analyst | — |
| GET | /api/reports/export.csv | Fleet Manager + Financial Analyst | — |
| GET | /api/reports/export.pdf | Fleet Manager + Financial Analyst | — |
| GET | /api/reports/anomalies | Fleet Manager + Financial Analyst | cost/km outlier list |
| GET | /api/reports/maintenance-due | Fleet Manager + Safety Officer | predictive nudge list |
| GET | /api/reports/route-profitability | Fleet Manager + Financial Analyst | per-route revenue/distance/fuel-cost rollup |
| POST | /api/compliance/check-expiring-licenses | Fleet Manager + Safety Officer | triggers Ethereal email batch |
| WS | /socket (namespace `/ops`) | authenticated | realtime status push |

Every mutation-bearing endpoint validates its request body against a shared Zod schema (same schema used client-side for the form) before touching the DB.

## 6. Non-Functional Requirements

- **Transactions**: every multi-entity status change (dispatch, complete, cancel, maintenance open/close) wrapped in a single DB transaction — partial failure must not leave a vehicle/driver/trip in an inconsistent status combination.
- **Validation**: Zod schema per mutation endpoint; consistent error shape `{ field, message }[]` so the frontend can render inline errors without string-parsing.
- **Security**: bcrypt password hashing, JWT in an httpOnly-equivalent pattern for the demo (Authorization header is fine given local-only deployment), CORS locked to `localhost` origins, `helmet` middleware for standard headers.
- **Performance**: local Postgres, no horizontal scaling concerns — the only real perf risk is unindexed filter queries on the dashboard, addressed by the index list in §4.
- **Error handling**: centralized Express error middleware, distinguishing 400 (validation), 401/403 (auth/RBAC), 404, 409 (uniqueness conflicts), 500.
- **Browser support**: modern evergreen browsers only (Chrome/Edge/Firefox latest) — no legacy target needed for a judged demo.
- **Seed data**: a seed script writes realistic demo data directly into Postgres via Prisma (not static JSON served at runtime) — satisfies the "no hardcoded data in the final product" rule while still giving you a populated demo.

## 7. Verified Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19.2 + Vite 7 + TypeScript | Pin Vite 7, not the newer Vite 8 (Rolldown-based) — avoid toolchain churn mid-hackathon |
| UI | Tailwind v4 + shadcn/ui (new-york style) | Current default combo for React 19 projects as of 2026 |
| Forms | React Hook Form + Zod resolver | Standard shadcn form integration |
| State | TanStack Query v5 (server state) + Zustand (client state: auth, filters) | Socket.io events call `setQueryData`/`invalidateQueries` directly |
| Charts | Recharts | KPI + report charts |
| Maps | Leaflet + OpenStreetMap tiles | No API key required |
| Backend | Node.js + Express + TypeScript | Self-contained, no BaaS |
| ORM | Prisma 7 (Rust-free client, current GA) | Skip "Prisma Next" — still early access |
| DB | PostgreSQL, local | Native install or Docker |
| Auth | JWT + bcrypt, custom RBAC middleware | No third-party auth provider |
| Realtime | Socket.io | Namespace `/ops`, JWT-authenticated |
| Validation | Zod, shared between client and server | Single source of truth |
| CSV export | Manual stream / `json2csv` | — |
| PDF export | `pdfkit` | Avoids a Puppeteer/Chromium install mid-hackathon |
| Email | Nodemailer + Ethereal test SMTP | No real account setup, gives a preview URL for the demo |
| Repo | Monorepo (`/client`, `/server` — with Prisma nested at `server/prisma`), npm workspaces | Shared TS types between client/server; Prisma isn't a separate workspace since `server` is its only consumer |

## 8. Out of Scope / Non-Goals

- Multi-tenancy / multi-organization support — single org assumed.
- Real GPS live tracking (map shows planned source→destination + status color, not live vehicle position).
- Any external traffic/weather/routing API — avoided per the guideline against unnecessary third-party dependence, and avoided for setup-time reasons. This also bounds Route.standardDistance (§3.15): manual entry or straight-line approximation only, never a routed/turn-by-turn distance.
- Real production email delivery — Ethereal only, by design (§3.13).
- Background job scheduler / cron — all threshold checks (anomaly, predictive maintenance, license expiry) computed on-demand at query/button time.
- Mobile-native app — responsive web only.
- Transporter/carrier as a separate vendor entity — a real-world Odoo transport module reviewed for this project models transport around third-party carriers you hire, each with their own rate card. TransitOps's spec assumes an owned fleet (Fleet Manager manages the company's own vehicles and drivers), so that abstraction doesn't fit — adding it would change the ownership model the whole schema is built around, not extend it.
- Sales Order / Invoicing integration — that same module ties transport to a broader order-to-cash flow (quotation → sales order → delivery → transport). TransitOps has no customer/sales entities in its spec; bolting on invoicing would be a different product, not a scope-add.
