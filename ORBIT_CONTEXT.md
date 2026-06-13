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
              notices.ts · buildings.ts (systems/visits/files/tour) · identity.ts (personas/perms)
  store/      OrbitProvider.tsx  ← global state + the backend ACTION SEAM
  components/ ui/ (Glass, Btn, Tag, Modal, AttentionChip, Icon…) · shell/ (Sidebar, TopBar)
  services/   ai.ts (client wrappers → /api/ai/*)
  features/   dashboard/ (Command Deck) · tickets/ (queue + command/ workspace + tabs)
              comms/ · ai/ · intake/ · vendors/ · notices/ · finance/ · buildings/ · search/
server/       aiService.ts (Claude + heuristic) · apiPlugin.ts (Vite middleware)
api/ai/       triage.ts · patterns.ts · vendor.ts · intake.ts (Vercel serverless)
```

---

## 5. What's BUILT (feature inventory)
Operator app, fully working on seed data:
- **Command Deck** (sign-in landing): personalized *attention queue* — pulse strip +
  grouped cards (Critical / At-risk / Awaiting reply / Unowned / Approvals / AI recs /
  Recent changes), each row stating ONE action (Take / Reply / Approve / Escalate / Open).
- **Attention model** (`lib/attention.ts`): every ticket has an attention state
  (At-risk / Escalated / Blocked / Needs action / Waiting externally / On track / Resolved)
  separate from lifecycle status.
- **Work Tickets**: search + filters, **saved views** (My buildings / Unowned / SLA risk /
  Awaiting reply), 5 views — **Focus** (do-date work board: Today / Response required /
  New incoming / Scheduled / To organize, ClickUp-style do-dates), Queue, List, Cards, Kanban.
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
- **Finance**: AP from work-order invoices, KPIs, spend-by-building, portfolio financials.
- **Buildings** (added by Codex): directory + 7-tab detail (Overview, Site visits,
  **3D walkthrough** w/ hotspots, Systems w/ health, People, Tickets, Files & changes).
- **Closure checklist**: status alone can't close — requires evidence + comms + settled
  invoice + resident confirmation.
- **Global search** (⌘K) across tickets/buildings/vendors/people.
- **Personas/impersonation**: operator/board/resident/vendor; "View as" in account widget;
  external personas currently land on a placeholder portal.

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

## 7. Backend plan (not built yet)
Replace seed data behind the existing `OrbitProvider` action surface with:
tRPC + Drizzle ORM (Postgres) + real auth (Argon2 + session/JWT), real file upload,
and the live Claude AI layer (already structured; just set `ANTHROPIC_API_KEY`).
`src/data/*` doubles as dev-database seed values.

---

## 8. What's NEXT (priority order)
1. **External portals** (the next milestone): board / super / resident interfaces.
   - Reuse, don't rebuild: public Uber-style tracker, ChatThread (direct-line AM),
     Bids/Vote cards + **shared ballot store** (board votes already appear live in operator
     Ticket Command), building snapshot (`buildings.ts`), Notices, AI-first intake.
   - One portal shell, 3 personas, accent per spec (board purple / resident blue / vendor
     amber). Drive off persona routing + `canSee`/scoped selectors in `identity.ts`.
   - **Board:** Vote Center · building finances/compliance · their building activity (public
     stage only) · direct line to AM · notices/minutes.
   - **Super:** their building's open work · site visits + 3D walkthrough/access map · update
     status / add photos from the field · vendor access.
   - **Resident:** submit request (AI-first) · track my requests (public tracker) · notices ·
     amenities · chat with my AM · statements.
   - **Scoping is non-negotiable:** each persona sees only their building/unit; never leak
     internal cost/vendor/notes (the public tracker already enforces this).
2. **Make Buildings operational:** wire actions — log/schedule a site visit, "create work
   ticket" from a failing system, upload a file/photo, schedule service (currently read-only).
3. **Emergency Desk** (spec): pulse tiles, response-log timeline, 3-step intake wizard that
   can auto-spawn a linked work ticket.
4. Decide & settle the **inline-vs-CSS-class** convention; add lint.
5. Optimize the Lucide bundle (currently imports the full set, ~225KB gzip).

---

## 9. How to use this file across conversations
- In a new Claude/Codex session: connect the repo, set branch
  `claude/affectionate-tesla-4jxrcd`, and tell it to **read `ORBIT_CONTEXT.md` first**.
- Keep this file updated as the project evolves (it's the handoff contract).
- Always work on the active branch (or branch off it) so Vercel auto-deploys and nothing
  collides between agents.
