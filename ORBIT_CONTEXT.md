# ORBIT FC — Project Context & Handoff

**Read this first in any new conversation.** It is the single source of truth for
what Orbit FC is, what's built, how it's organized, the decisions made, and what's
next. Point a new Claude/Codex session at this file (or paste it) to rehydrate context.

---

## 1. What this is
Orbit FC is an **all-in-one property-operations platform** ("Facilities Command OS")
for a property-management company running 8 NYC buildings. It is the production
rebuild of a high-fidelity design prototype.

**Product vision (north star):** an *organizational attention system*, not a database.
> Anyone can open Orbit, understand what changed, see what matters, and confidently
> take the next action — and any work is fully resumable by the next person.

**AI principle (non-negotiable):** AI **recommends**, the operator **decides**.
Nothing in triage / vendor / vote / closure is ever auto-actioned.

---

## 2. Where the code lives
- **GitHub repo:** `github.com/mrcalderazzo-collab/Orbit_FC`
- **Active branch:** `claude/affectionate-tesla-4jxrcd`  ← ALL work is here (default branch is empty)
- **Live preview:** `https://orbit-fc.vercel.app/` (auto-redeploys from the branch)
- Local sandbox path (ephemeral, not durable): `/home/user/Orbit_FC`

**Run locally:**
```bash
git clone -b claude/affectionate-tesla-4jxrcd https://github.com/mrcalderazzo-collab/Orbit_FC.git
cd Orbit_FC && npm install && npm run dev   # http://localhost:5173
npm run typecheck && npm run build          # both must stay green
```
Sign in as **Marcus Webb** for the full operator view.

---

## 3. Stack
- React 18 + TypeScript + Vite + TailwindCSS (theme tokens) + Lucide icons.
- **Real-time notifications:** `OrbitProvider.notifications` + `pushNotification` (wired into
  create/status/vote/calendar/invoice actions); shared `NotificationBell` (unread badge +
  dropdown) lives in the operator TopBar and the PortalShell. Operator clicks navigate.
- **Portals** support a **tile/list view toggle** (PortalShell) — a launcher grid of all the
  persona's sections. Super **Calendar** has **Day / Week / Month** views; "who's coming"
  items and calendar entries open a **visit detail** (vendor + COI + scope + linked ticket).
- Leaflet (real map view; theme-aware Carto basemap tiles, no API key) — used by the
  Buildings Map view. Building geo + photos live in `data/buildings.ts`.
- State: a typed React context, `src/store/OrbitProvider.tsx`. **Its action surface is
  the seam the real backend will implement** — UI never touches data sources directly.
- AI layer: `server/aiService.ts` + `api/ai/*` (Vercel functions / Vite dev middleware).
  Uses `@anthropic-ai/sdk`, model `claude-opus-4-8` (env `ORBIT_AI_MODEL` →
  `claude-sonnet-4-6` for cheaper triage). **Falls back to a deterministic heuristic
  when `ANTHROPIC_API_KEY` is unset** — UI badges every result CLAUDE vs HEURISTIC.
- Three themes (Dark default / Light / Clear) via CSS variables on `<html data-theme>`.
- **No database yet** — all state is in-memory deterministic seed data.

---

## 4. Architecture map
```
src/
  lib/        types.ts · attention.ts (attention model) · ticket.ts (SLA, derivations)
              focus.ts (do-date/buckets) · format.ts (money, seeded RNG)
  data/       seed.ts (people/buildings/tickets) · flow.ts (ticket lifecycle generator)
              taxonomy.ts (15 intake categories) · playbooks.ts · vendors.ts (+COI)
              workorders.ts (WO numbering/stages/invoice) · comms.ts (chat channels/teams)
              notices.ts · buildings.ts (systems/visits/files/tour) · supers.ts (per-building super)
              identity.ts (personas/perms/scoped selectors)
  store/      OrbitProvider.tsx  ← global state + the backend ACTION SEAM
  components/ ui/ (Glass, Btn, Tag, Modal, AttentionChip, Icon…) · shell/ (Sidebar, TopBar)
  services/   ai.ts (client wrappers → /api/ai/*)
  features/   dashboard/ (Command Deck) · tickets/ (queue + command/ workspace + tabs)
              comms/ · ai/ · intake/ · vendors/ · notices/ · finance/ · buildings/ · search/
              portal/ (external personas) — shell + shared/ (PublicTrackerCard, NoticesPanel,
                DirectLinePanel) + board/ + resident/ + vendor/ + super/
server/       aiService.ts (Claude + heuristic) · apiPlugin.ts (Vite middleware)
api/ai/       triage.ts · patterns.ts · vendor.ts · intake.ts (Vercel serverless)
```

---

## 5. What's BUILT (feature inventory)
Operator app, fully working on seed data:
- **Role dashboards** (`features/dashboard/RoleDashboard.tsx` + `widgets.tsx`): the
  `dashboard` route is now **role-tailored**. Operator `OrbitUser.role` (principal · director ·
  am · field · manager · sales · marketing) selects a curated widget layout; each widget is a
  self-contained, **clickable tile** that drills into the underlying page/ticket (nav /
  openCommand). AM dashboards scope to the buildings they manage (`building.am`). Widget
  registry (`WIDGETS`) makes adding a position = add a layout entry. New demo accounts per
  position; new synth `data/leasing.ts` (occupancy/applications/waitlist/leasing+marketing
  funnel) powers the Sales/Marketing/Occupancy widgets. (Legacy `CommandDeck.tsx` retained,
  no longer routed.)
- **Command Deck** (legacy attention queue, now superseded by Role dashboards): pulse strip +
  grouped cards (Critical / At-risk / Awaiting reply / Unowned / Approvals / AI recs /
  Recent changes), each row stating ONE action (Take / Reply / Approve / Escalate / Open).
- **Attention model** (`lib/attention.ts`): every ticket has an attention state
  (At-risk / Escalated / Blocked / Needs action / Waiting externally / On track / Resolved)
  separate from lifecycle status.
- **Work Tickets**: search + filters, **saved views** (My buildings / Unowned / SLA risk /
  Awaiting reply), 6 views — **Front Desk** (default), **Focus** (do-date board: Today /
  Response required / New incoming / Scheduled / To organize), Queue, List, Cards, Kanban.
- **Front Desk · central intake routing** (`features/tickets/FrontDesk.tsx`, rules in
  `data/routing.ts`): every new ticket is **auto-routed on arrival** (`autoRoute` rules:
  finance→Finance, compliance/docs→Compliance, board→Legal, moves→Leasing, routine field→
  **Super first**, urgent field→central **Facilities PM**, unclassifiable→Front Desk). The
  desk is an **exceptions/confirm queue**, not a chokepoint — lanes: Needs routing (accept
  the suggestion / reroute to any team / send to super / **hold for info**), Super-first
  ready-to-escalate (aged super tickets → escalate to Facilities PM), On hold (SLA paused).
  `Ticket.team` + `Ticket.held`; actions `routeTicket` / `holdForInfo` / `releaseHold` on
  OrbitProvider. Team chips now show on Queue rows so routing is visible across the flow.
  TEAMS: Front Desk · Facilities PM · Building Super · Compliance · Finance · Legal/Board ·
  Leasing (each with a lead). Design intent: traditional building ownership (super first
  line) + new-school centralized dispatch + AI auto-routing at 100-building scale.
- **Operating model & language:** the Front Desk is staffed by a **Dispatcher role**
  (`role: "dispatch"`, demo: Owen Frey) but is a **pooled queue anyone can Claim from**.
  **Role-based landing** in Work Tickets: dispatch/principal/director/manager (and `all`
  perm) default to **Front Desk**; everyone else lands on **My Queue** (`myqueue` view =
  tickets I own / a team I lead / my buildings). **Our pipeline vocabulary** (display layer
  via `STATUS_LABEL` in `lib/ticket.ts`, internal status values unchanged): Open→**Front
  Desk**, Assigned→**Dispatched**, In progress→**In Progress**, Awaiting review→**Final
  Check**, Closed→**Closed**; queue groups: Front Desk · In Flight · Final Check · Closed.
  Applied in StatusTag, the status mover, Kanban headers, and queue groups.
- **Holding is a first-class lane:** held tickets get their own group in the Queue and their
  own Kanban column (pulled out of their status lane), so the pipeline reads Front Desk →
  In Flight → Holding → Final Check → Closed. **Auto-escalation timers:** routing a routine
  field ticket to the super sets `Ticket.escalateAt` (now + 24h, `ESCALATE_HOURS`); an
  OrbitProvider interval sweep auto-escalates past-deadline super tickets to the central
  Facilities PM (with a notification) — no button needed. The Front Desk escalate lane shows
  a live countdown ("auto in 6h" / "auto-escalating"). do-date is now labelled **"Next
  Touch"** throughout; Work Tickets view toggle shows Front Desk / My Queue count badges.
- **Ticket Command workspace** (full-screen): header (status mover, **do-date**, SLA,
  **Escalate**, **Close out**, **Message** dock), Uber-style stage tracker w/ conditional
  Board Vote, tabs: **Overview** (Resume·handoff briefing, AI triage panel, subtasks w/
  playbooks, cost, bids, relationships/link-merge), Intake (AI-first), Bids & Vote (live
  tally), **Vendor & Work Order** (numbering, stages, invoice→payment, handoff log, COI,
  in-line vendor chat), Communications (unified stream + public tracker), Activity (audit).
- **Resume · handoff briefing**: what happened / done / changed / who's waiting / owner+
  backup / recommended next + Take ownership / Continue work.
- **Communications**: per-ticket unified stream + **slide-out chat dock** (iMessage-style
  phone for SMS, group messenger for board, email thread), **global inbox**, **direct
  lines** (board ↔ assigned AM/position, with REROUTE + "covering" identity clarity).
- **AI layer**: triage (Intake panel + AI Review engine), pattern detection, vendor match,
  **AI-first intake** (describe naturally → suggested category/priority/title). Recs open
  into the affected case.
- **AI Review Center**: run engines, approve/reject (operator-in-the-loop), source badges.
- **New Intake wizard**: AI-first describe → 15-category taxonomy, structured location,
  submitter, access, attachments, tags, billing.
- **Vendors**: directory w/ grade/rating/response/jobs + live **COI** status; COI-guarded
  dispatch. **Work Orders**: `<building#>-<seq>` (e.g. 11588-1) + vendor IDs (V-003) +
  PO/invoice; 8-stage tracker; invoice→approve→pay→close; handoff log.
- **Notices**: compose building broadcasts (templates, audience, channels, urgent,
  schedule) + delivery list.
- **Finance**: portfolio overview (AP from work-order invoices, KPIs, spend-by-building) +
  **per-building drill-down** (pick a building → its own reserve trajectory, income/expense
  charts, NOI/delinquency, AP, capital commitments). Charts via shared `components/ui/Charts`.
- **Planner** (`features/planner/`): personal daily command — KPI strip, 7-day strip by
  Next Touch, Priority Ranking Top 10 (emergency>overdue>due>age), Today's Schedule, Quick
  Stats, Notes. **Live Ops** (`features/live/`): single dense board — LIVE day counter, pulse
  KPIs, Operations Health Index, upcoming local-law deadlines, recent tickets, team workload,
  by-type. **Data Center** (`features/datacenter/`, `data/datacenter.ts`): AI ops actions —
  Offload Plan, Quick Wins, Stale Audit, Capacity Planner, Pattern Detection, Cost
  Intelligence, Building Personalities — each generates a summary + table + CSV; link cards to
  Front Desk / Scorecard / Reports. **Vendor Scorecard** (Vendors page Directory|Scorecard
  toggle): rate on 6 dims → composite + letter grade, Leaderboard, Deep Dive; `vendorRatings`
  store. (All ported from the Daisy/Orion build.)
- **Reports center** (`features/reports/`, derivations in `data/reports.ts`): **Ticket flow &
  volume** (weekly inflow + monthly volume + team comparison) plus vendor
  performance & pricing, CSAT/TSAT, SLA, preventative maintenance, ticket bottlenecks, staff
  performance/rates/utilization, building-health composite — each with KPIs + chart + table
  and **CSV export**. Operator nav under Finance & Network (perm `reports`).
- **Buildings** (added by Codex): directory + 7-tab detail (Overview, Site visits,
  **3D walkthrough** w/ hotspots, Systems w/ health, People, Tickets, Files & changes).
  Directory now has **3 view modes** — Grid (cards), List (dense table), and **Map**
  (real **Leaflet** map on Carto tiles with real per-building lat/lng; pins colored by
  attention + badged with open field-work count; click a pin → side panel with the
  building photo + open field tickets + "Open building"). The Map also computes a
  **Dispatch efficiency** panel: the same open issue type across 2+ buildings, with the
  km spread (haversine) flagged **Batchable** when within ~4 km — the "send one crew /
  similar vendor in the area" idea. Every building has **photos** (`BUILDING_IMAGES`,
  shown on grid cards, list thumbs, detail hero, map panel) and a resident
  **superintendent** record (`supers.ts`: contact, shift, certs, responsibilities,
  access, on-site staff).
- **Closure checklist**: status alone can't close — requires evidence + comms + settled
  invoice + resident confirmation.
- **Global search** (⌘K) across tickets/buildings/vendors/people.
- **Personas/impersonation**: operator/board/resident/vendor; "View as" in account widget.
- **External portal** (`features/portal/`): one persona-tinted shell (board purple /
  resident blue / vendor amber) with a scoped tab bar + account menu (return to Orbit
  team / sign out), rendered full-screen for any non-operator (see `App.tsx`). **All three
  portals are live:**
  - **Board (purple) — full governance suite** (`data/governance.ts` holds deterministic
    compliance/projects/decisions/minutes/financial-trend data): **Dashboard** (building
    health, money KPIs, "needs the board" = votes + compliance actions + approvals, capital
    projects, recent decisions), **Vote Center** (shared ballot store → live in operator
    Bids & Vote), **Financials** (reserve trajectory + income/expense charts via inline SVG,
    ratios, budget vs actual, capital commitments), **Compliance** (LL11/LL97/LL152/LL84 +
    elevator/boiler/sprinkler/fire-alarm filing calendar, status-coded), **Projects** (capital
    pipeline w/ budget vs spent), **Documents** (minutes, decisions, record/document library),
    **Direct Line**, **Notices**.
  - **Resident:** My Requests (public tracker, scoped to their unit), Submit Request
    (AI-first via `aiClassifyIntake` → `createTicket` seam, tagged `_residentOwner`),
    Notices, My Manager (Direct Line to AM), Statements (deterministic unit ledger).
  - **Vendor:** Dispatches (work awarded to them; confirm window / add photos / upload
    invoice / mark complete — all through OrbitProvider actions), Messages (line to Orbit
    field desk).
  - **Super (teal):** a real field tool. **Multi-building** (OrbitUser.buildings[]) with a
    building switcher + **payroll check-in/out clock** in the shell toolbar (timeclock in
    OrbitProvider `shifts`/`punchIn`/`punchOut`). Tabs: **Today** (role/certs from `supers.ts`,
    urgent work, who's coming), **Work** (cards open the full **task detail**: read desc/
    intake/activity, add field notes + **photos** (`ticketPhotos`/`addTicketPhoto`), guided
    **close-out checklist** → Awaiting review), **Schedule** (vendor visits + **vendor COI**
    status + move-ins/outs), **Calendar** (super adds events to the shared **building
    calendar** `calendar`/`addCalendarEvent`, source "super", optionally spawns a ticket),
    **Walkthrough** (now **image-backed** tour areas), **Systems** (each card "Report an
    issue" → prefilled create-ticket), **Direct Line**. Supers **create tickets** via
    `SuperCreateModal` (manual + optional AI). Demo: Joel Petrov covers b2/b3/b5; Walt
    Friedman b7. Walkthrough images also show in the operator Buildings 3D tab.
  - **Shared, reused across personas:** `shared/PublicTrackerCard`, `shared/NoticesPanel`,
    `shared/DirectLinePanel` (ChatThread now takes an optional `seed`). Scoping helpers in
    `identity.ts` (`boardVoteTickets`, `boardActivityTickets`, `residentTickets`,
    `vendorTickets`, `scopedNotices`). Seed adds two Northeast Mechanical dispatches
    (T-4796 closed / T-4797 active) so the vendor portal has live work. No persona ever
    sees internal cost/vendor/notes for work that isn't theirs.

---

## 6. Conventions
- **Styling:** the original app uses **inline `style={{}}` objects** with CSS-variable
  tokens (`var(--ink)`, `var(--acc)`, etc.). The Buildings module (Codex) introduced
  **CSS classes** in `index.css` (`building-*`). ⚠️ OPEN DECISION: pick one going forward
  for consistency. (Default recommendation: stay inline, or formally adopt classes.)
- Theme tokens only — never hardcode chrome colors; semantic status colors (#22c55e ok,
  #f59e0b warn, #ef4444 bad, #3b82f6 info, #a855f7 governance, lime #b6ff00 accent) are ok.
- Fonts: Outfit (sans) + JetBrains Mono (uppercase tracked labels). Lucide icons, no emoji.
- Seed data is **deterministic** (seeded RNG keyed on ids) so the demo is stable.
- Keep `npm run typecheck` + `npm run build` green before pushing.
- New mutations go through `OrbitProvider` actions (the backend seam) — not ad-hoc state.

---

## 6b. Production spine (in progress)
- **Persistence:** `OrbitProvider` hydrates from `localStorage` (`orbit_state_v1`) on mount
  and saves on change — state survives refresh. This is the local stand-in for the DB;
  the action surface is unchanged, so the real backend swaps in behind it.
- **Event/audit log:** every meaningful mutation calls `logEvent({ kind, entityType,
  entityId, summary, building })` → an append-only `events` log (persisted). `eventsFor
  (entityType, id)` queries an entity's history; the **Live Ops "Live activity"** feed renders
  it. This is the backend-ready audit/history/"what-changed" foundation (Codex's #1).
  Surfaced in **Ticket Command → Activity** and **Building detail → Activity** (Codex).
  Next: emit events from the remaining mutations; then RBAC at the data layer and the real DB.
- **Building operational actions (✅ shipped):** `src/features/buildings/BuildingActions.tsx`
  — header command bar (New ticket · Schedule · Send notice · Log file · Message) plus the
  Systems-tab "Create ticket from this system" and the Site-visits "Schedule site visit"
  button. All route through the seam (`createTicket` / `addCalendarEvent` / `sendNotice` /
  `logEvent`) and land on the event spine, so a building's Activity tab shows its own history.
  `sendNotice` now emits a `notice.sent` event + notification. Building event-meta is keyed by
  dotted prefix (repaired a latent underscore/dotted mismatch).
- **Portfolio scoping / RBAC spine (✅ shipped):** `src/data/identity.ts` —
  `isOrgWide(u)`, `operatorBuildings(u)`, `operatorBuildingIds(u)`, `scopeToPortfolio(u, rows)`,
  and `can(u, action, entity)` (derived from `CORE_PERMISSION_RULES`). An AM's portfolio =
  buildings where `building.am === u.who`; org-wide roles (owner/principal/director/manager/
  dispatch/sales/marketing) see everything. This is the layer every role cockpit/dashboard/
  notification should filter by — the seam the real RBAC backend implements.
- **PM cockpit (✅ shipped):** `src/features/cockpit/PortfolioCockpit.tsx` — the account/
  property manager now lands here (RoleDashboard short-circuits `role === "am"`) instead of the
  generic widget grid. Scoped to their buildings: a prioritized "Needs you now" stream (built
  from `attentionOf` + `nextAction`, sorted by attention then SLA) with one-tap commit (Take /
  Escalate / open Command), a KPI strip, a portfolio emergency banner, and a per-building rollup.
- **Compliance Command (✅ shipped):** `src/features/compliance/ComplianceCommand.tsx`, route
  `compliance` + Portfolio nav item (org-wide roles via `canSee`; manager perm added). Rolls
  every building record (`BUILDING_RECORDS`) + every vendor COI (`coiStatus`) into one
  deadline-ranked board (soonest first, overdue→urgent→soon→ok), with KPIs (overdue / COIs /
  inspections / flagged buildings), a flagged-buildings rollup, a Needs-review queue, and
  inline call/email-renewal on COI rows. Derivation-only; relative `due` dates work with the
  real clock.
- **Communications composer (✅ shipped):** `src/features/comms/NewConversation.tsx` — a
  "New conversation" button in CommsPage opens a recipient picker over a full **contact
  directory** (`contactDirectory()` in comms.ts: internal team, on-site supers, vendors, board
  members, building-wide resident audiences), multi-select across categories, channel
  (In-app/SMS/Email), subject + message → creates a Channel via the new store
  `customChannels` + `createChannel` (persisted; emits `comm.thread`). New threads appear at the
  top of the inbox and use the existing ChatThread (send + simulated reply work). This is the
  "start a new thread / reach multiple vendors/residents/board/internal" primitive.
- **Ownership model — visibility vs ownership (✅ shipped, in progress):** the PM cockpit now
  splits its stream into **"Owned by you"** (`assignee === user.who`) and **"In your buildings"**
  (watching — owned by someone else or unowned, with a one-tap **Take** that assigns to me).
  Owner shown on watch rows. Resolves the "Marcus *and* Sarah both see the same task" confusion:
  a principal is org-wide (sees all), a PM's queue is theirs. Still TODO under #42: a Front-Desk
  "assign to the building's AM" routing control and applying the owned/watch split to TicketsPage.
- **Real SLA clock (✅ shipped):** SLA budget is by priority (Crit 4h / High 24h / Normal 72h
  / Low 120h) and `elapsed` is now **real wall-clock** since `created`, minus time on
  Needs-info hold. `Ticket.heldMs` banks released-hold time; `held.at` is now ISO and the live
  hold subtracts too. `breached = !closed && !held && elapsed > budget`; closed → 100%/clock
  stops. `holdForInfo`/`releaseHold` pause & resume the clock and emit `ticket.hold` events.
  Seed `created` dates rebased to **relative** (`hAgo()` in seed.ts) for a believable spread
  (≈3 breaches of 8 active). Fixed-date `NOW` anchors in reports/frontdesk/datacenter switched
  to `Date.now()`. **Persistence key bumped `orbit_state_v1`→`v2`** to drop stale snapshots.
- **Building record deepening (✅ shipped):** Systems-tab cards are clickable → a
  **System detail popup** (`SystemDetailModal` in `BuildingActions.tsx`): resolves the vendor
  via `vendorByName` (contact tel/mailto + COI status via `coiStatus` + grade), service dates,
  equipment photos, and a **documents list** (COI/contracts) with an inline file action. New
  store collection `buildingDocs` + `addBuildingDoc` (persisted; emits `file.added`); the
  building **Files** tab surfaces filed docs; the header "Log file" action writes here too.
  **People tab** enriched: email, unit, phone, group tag, and Call/Email contact buttons
  (staff/super/board contacts synthesized deterministically where not in PEOPLE).
- **Emergency Desk (✅ shipped):** `src/features/emergencies/EmergencyDeskPage.tsx`, route
  `emergencies` (was ComingSoon). Runs on `EMERGENCY_WORKFLOW` (operatingSpine.ts): pulse
  tiles (Active/Potential/Overdue/Resolved), a workflow rail, severity-striped incident cards
  with a confirm→stabilize→communicate→recover stepper, per-step exit criteria, a response-log
  timeline, inline update logging, and a "Declare emergency" modal that can auto-spawn a linked
  Critical work ticket. Store: `emergencies` + `declareEmergency` / `advanceEmergency` /
  `logEmergency` / `resolveEmergency` (persisted; emit `emergency.*` events). Seed in
  `src/data/emergencies.ts`. Sidebar `emg` badge now reflects live active incidents.

## 7. Backend plan (not built yet)
Replace seed data behind the existing `OrbitProvider` action surface with:
tRPC + Drizzle ORM (Postgres) + real auth (Argon2 + session/JWT), real file upload,
and the live Claude AI layer (already structured; just set `ANTHROPIC_API_KEY`).
`src/data/*` doubles as dev-database seed values.

---

## 8. What's NEXT (priority order)
1. **External portals** — ✅ **shipped** (board, resident, vendor, **super**). Shell +
   persona routing in `App.tsx`, scoped selectors in `identity.ts`. Remaining polish:
   - **Resident extras:** amenity booking, attachments on Submit Request, statement PDF/pay.
   - **Vendor extras:** real file upload (photos/invoice currently log a note), COI status.
   - **Super extras:** field actions are real but "add photo" logs a note (no real upload);
     site visits are read-only (no "request a visit" yet).
   - **Scoping is non-negotiable:** each persona sees only their building/unit/jobs; never
     leak internal cost/vendor/notes (public tracker + scoped selectors enforce this).
2. **Make Buildings operational:** ✅ **shipped** — header command bar + Systems→ticket +
   Schedule-visit, all through the seam & event spine (see §6b). Remaining: real binary file
   upload (Log file currently records to the activity spine, no storage yet).
3. **Emergency Desk:** ✅ **shipped** on `EMERGENCY_WORKFLOW` (see §6b). Remaining: per-step
   SLA countdown timers + auto-overdue sweep (today `overdue` is a static flag on seed data).
4. **RBAC enforcement:** scoping spine + `can()` now exist (§6b). Remaining: apply
   `scopeToPortfolio` across the operator surfaces that still scan all buildings (TicketsPage,
   Front Desk queues, notifications, Finance) and gate write-actions through `can()`.
   Next role cockpits on the spine: **Compliance Command** (portfolio deadline board) and the
   **Director rollup** (manage-by-exception + per-AM workload). Then **Field/Dispatch geo-batch**.
5. **Real comms / file storage / real backend** — need infra decisions (Postgres/auth/S3).
6. Decide & settle the **inline-vs-CSS-class** convention; add lint.
7. Optimize the Lucide bundle (currently imports the full set, ~225KB gzip).

---

## 9. How to use this file across conversations
- In a new Claude/Codex session: connect the repo, set branch
  `claude/affectionate-tesla-4jxrcd`, and tell it to **read `ORBIT_CONTEXT.md` first**.
- Keep this file updated as the project evolves (it's the handoff contract).
- Always work on the active branch (or branch off it) so Vercel auto-deploys and nothing
  collides between agents.
