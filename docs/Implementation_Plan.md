# TransitOps — Implementation Plan (Step-by-Step, Feature-Wise)

Companion to Technical Requirements and Process Flow — read both first. Assumes **local-only deployment**. Scope confirmed: core spec + Maps + Socket.io + Anomaly flags + Predictive maintenance + Email reminders + PDF export + Named Routes.

This plan is organized by dependency order, not a clock — build each step only once the steps it depends on are merged. Within a phase, steps with no dependency on each other can be built in parallel by however many people are available; steps that depend on one another can't.

## 1. Git Workflow

- One repo, `main` branch is always demo-able after each merge — never leave it broken between features.
- Branch per feature: `feat/<feature-slug>`, e.g. `feat/trip-dispatch`.
- Commit at the vertical-slice level (schema + API + UI for that feature = one feature = one squash-merge), not per-file. Commit message format: `feat: <what it does>` — matches the commit shown for each step below.
- Merge to `main` the moment a feature's happy path works and its business rules are covered — don't gold-plate before merging, gold-plate in the polish pass (§5) if time allows.
- Tag `v1-core-complete` at the checkpoint in §3, tag `v2-demo-ready` at the end.

## 2. Phase 0 — Setup

- Repo scaffold: npm workspaces (`/client`, `/server`, `/prisma`), shared `tsconfig.json` base.
- Prisma schema: all 8 entities from Technical Requirements §4 (including Route), `prisma migrate dev` against local Postgres.
- Shared Zod schema package (`/shared`) importable by both client and server — write it once here so every feature branch after this reuses it instead of redefining validation twice.
- Seed script skeleton (`prisma/seed.ts`) — filled in incrementally as each feature lands its entity.
- `.env.example` committed (DB URL, JWT secret, Ethereal creds placeholder) — never commit real secrets.
- Socket.io server instance + client hook (`useSocketSync()`) scaffolded empty — every feature step after Trip Dispatch (Step 4) adds its event to this one file instead of creating parallel socket logic.

## 3. Core Feature Steps (dependency-ordered)

Build these first, in this order (or in parallel where "Depends on" allows). Once all of them are merged and the checkpoint below is demo-able, everything after is scope-add.

**Step 1 — Auth + RBAC**
Register/login, JWT middleware, role-guard decorator, client route guards.
Depends on: Phase 0
Commit: `feat: auth + RBAC`

**Step 2 — Vehicle Registry**
CRUD API + table UI + form (RHF+Zod), unique-registration 409 handling.
Depends on: Phase 0
Commit: `feat: vehicle registry CRUD`

**Step 3 — Driver Management**
CRUD API + table UI + form, computed license-expired flag.
Depends on: Phase 0
Commit: `feat: driver management CRUD`

**Step 4 — Trip Management + full lifecycle**
Dispatch/complete/cancel/halt/resume chain (Process Flow §4.1–4.3, §4.7), tracking number + LR number + parcel count fields, transactional, emits `trip:*` socket events. Halt/resume and the three added fields are folded in here, not treated as optional — cheap on top of a chain you're already building (two more status values, two small transactions, no new entities).
Depends on: 1, 2, 3
Commit: `feat: trip lifecycle + business rules + realtime`

**Step 5 — Maintenance workflow**
Open/close, vehicle status side-effects, dispatch-pool exclusion, emits `maintenance:*` events.
Depends on: 2
Commit: `feat: maintenance workflow + realtime`

**Step 6 — Fuel & Expense logging**
Cost rollup query, emits `cost:logged`.
Depends on: 2
Commit: `feat: fuel + expense tracking + realtime`

**Step 7 — Dashboard**
KPI aggregation queries + filters + `useSocketSync()` wiring for live updates.
Depends on: 2, 3, 4
Commit: `feat: dashboard + KPIs + realtime sync`

**Step 8 — Reports & Analytics**
Fuel efficiency, utilization, operational cost, ROI (incl. `revenue` field on Trip) + CSV export.
Depends on: 4, 6
Commit: `feat: reports + CSV export`

**Checkpoint — tag `v1-core-complete`**
Full mandatory workflow demo-able end to end, statuses updating live (register vehicle → register driver → create/dispatch/complete trip → maintenance record → check reports). Don't move on to scope-add steps until this checkpoint genuinely holds up — a fully correct core workflow beats a flashy but broken demo every time a judge starts clicking around.

## 4. Scope-Add Feature Steps (post-checkpoint, dependency-ordered)

Built in this order because it roughly matches value delivered per step — Maps first (strongest visual differentiator), Named Routes last (real feature, but the most disposable if you run short — see §7 Cut Order for the reasoning behind this ordering).

**Step 9 — Maps**
Leaflet setup, vehicle markers by status/region, trip route line, geocoding cache, socket-driven marker color updates.
Depends on: 4, 7
Commit: `feat: fleet map visualization`

**Step 10 — Anomaly flags**
Cost/km threshold query + badge in Reports + map popup.
Depends on: 8
Commit: `feat: anomaly flags`

**Step 11 — Predictive maintenance nudge**
Odometer threshold query + dashboard badge + "Due for service" filter.
Depends on: 5, 8
Commit: `feat: predictive maintenance nudge`

**Step 12 — Email reminders**
Nodemailer + Ethereal wiring, "Check compliance" button, preview-URL surfacing in UI.
Depends on: 3
Commit: `feat: email reminders (Ethereal)`

**Step 13 — PDF export**
`pdfkit` fleet summary report + trip manifest/delivery-slip report.
Depends on: 8
Commit: `feat: pdf export (fleet summary + trip manifest)`

**Step 14 — Charts polish**
Recharts on Reports (cost trend, utilization over time).
Depends on: 8
Commit: `feat: analytics charts`

**Step 15 — Named Routes**
Route CRUD (list/form, Fleet Manager write) + master-data screen; Trip creation form gets an optional Route picker that pre-fills source/destination/planned distance (Process Flow §4.8); route-profitability report (Process Flow §7.7). Genuinely new: a new entity, a new screen, and a change to an existing form — build it last among the scope-adds so it's the first thing that simply doesn't happen if time runs out, rather than something half-wired into Trip creation.
Depends on: 4, 8
Commit: `feat: named routes + route profitability`

## 5. Final Bug Bash & Demo Prep

- Bug bash against the example workflow in the spec (register vehicle → register driver → create/dispatch/complete trip → maintenance record → check reports).
- Reseed clean, realistic demo data (multiple vehicles/drivers across all statuses and regions, plus a handful of Routes with trips against them, so filters, the map, and route profitability all have something to show).
- Rehearse the demo script (§6) at least once, full run-through.
- Fix whatever the rehearsal actually breaks — don't add new features here.
- Tag `v2-demo-ready`.

## 6. Demo Script (for rehearsal)

1. Login as Fleet Manager → show Dashboard KPIs + Map with mixed vehicle statuses.
2. Login as Driver (dispatcher) → create a trip, picking a saved Route to pre-fill source/destination/distance → dispatch it → **switch back to Fleet Manager's open dashboard tab and show the KPI/map updating live** (this is your realtime feature's entire value — don't skip demonstrating it live).
3. Halt the same trip (simulate a breakdown, enter a reason) → show the halted flag appear live on the dashboard and map → resume it. This is the detail most fleet-management demos skip — worth narrating explicitly to judges.
4. Complete the trip → show operational cost and fuel efficiency update in Reports, and pull up its trip manifest PDF.
5. Open a maintenance record → show vehicle disappear from the dispatch pool and its map marker flip color.
6. Login as Safety Officer → run "Check compliance" → open an Ethereal preview link live.
7. Login as Financial Analyst → show Reports with an anomaly-flagged vehicle, ROI numbers, and the Route Profitability table → export CSV and the fleet summary PDF.

## 7. Cut Order (if running short on time)

If you have to drop scope-add steps, cut in this order — protects spec compliance first, then your best differentiators:

1. Named Routes (15) — cut first; it's the newest addition, isn't in the original spec at all (borrowed from the Odoo module review), and nothing else depends on it.
2. PDF export (13)
3. Charts polish (14)
4. Email reminders (12)
5. Predictive maintenance nudge (11)
6. Anomaly flags (10)
7. Maps (9) — cut last; it's the strongest visual differentiator and you've already scaffolded the socket events it needs

If core features (Steps 1–8) are running behind, stop adding scope entirely and get those solid before touching anything in §4 — a fully correct core workflow beats a flashy but broken demo every time a judge starts clicking around.
