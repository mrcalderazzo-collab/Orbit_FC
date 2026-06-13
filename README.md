# Orbit FC — Facilities Command OS

A multi-role property-operations platform. This repository is the **production
rebuild** of the Orbit FC design prototype, starting with the operator-facing
**Ticket Command + Communications** vertical slice.

> AI principle (non-negotiable): **AI recommends, the operator decides.** Nothing
> in triage, vendor selection, or voting is ever auto-actioned.

## What's in this first slice

A real, end-to-end operator workspace:

- **Three-theme design system** — Dark (default) / Light / Clear, swapped via a
  single `data-theme` attribute on `<html>`. Outfit + JetBrains Mono, lime
  `#b6ff00` accent, glass panels, Lucide stroke icons. (`src/index.css`)
- **App shell** — permission-filtered sidebar nav, account widget with
  **View-as (impersonate)**, theme switcher, telemetry pill, toasts.
- **Ticket queue** — search + filters (status / type / building / vendor /
  approval) and four views: grouped **Queue** (Inbound → In Flight → Awaiting
  Review → Resolved), **List**, **Cards**, **Kanban Board**. New-ticket modal.
- **Ticket Command workspace** (full-screen) — status mover, SLA, Uber-style
  **stage tracker** with the conditional **Board Vote** stage, and six tabs:
  - **Overview** — request, progress checklist (% complete + post-update),
    next-action, cost posture, bids snapshot, owner/submitter context.
  - **Intake** — reported issue, attached media, contact, access & entry flags.
  - **Bids & Vote** — competitive bid cards, AI "best value" pick, **live vote
    tally + quorum**, board roster with in-console voting, award.
  - **Vendor & Schedule** — awarded vendor, access/availability confirmations,
    locked visit window, reminders.
  - **Communications** — the unified surface (see below).
  - **Activity** — chain-verified audit trail with per-entry hashes.
- **AI layer (Claude, operator-in-the-loop)** — a real server-side AI service
  (`server/aiService.ts`, mounted on `/api/ai/*` so the key never reaches the
  browser) with three engines:
  - **Triage** — per-ticket, in the Intake tab: classifies type/priority,
    summarizes the ask, suggests an owner, and drafts a first response. The
    operator edits and commits; nothing is auto-applied, and every commit is
    logged. (`src/features/ai/TicketTriagePanel.tsx`)
  - **Pattern / predictive** — scans tickets for cross-ticket clusters
    (e.g. repeated leaks → likely riser issue → recommend inspection).
  - **Vendor match** — recommends best-value among competitive bids.
  Defaults to `claude-opus-4-8` (`ORBIT_AI_MODEL=claude-sonnet-4-6` for cheaper
  triage), adaptive thinking, structured outputs. With no `ANTHROPIC_API_KEY`
  it falls back to a deterministic heuristic — the UI badges every result
  `CLAUDE` vs `HEURISTIC`. **AI recommends; the operator decides.**
- **AI Review Center** — queue of recommendations (live-generated via "Triage
  inbound" / "Scan patterns", or seeded); operator approves/rejects, every
  decision written to the audit chain.

### Communications (design-review surface)

`src/features/tickets/command/tabs/Communications.tsx` unifies three streams the
prototype kept separate, into **one clear conversation**:

- **Internal team comments** — threaded, `@mentions`, *not visible to residents*
  (lime left-rail + `INTERNAL` marker).
- **Outbound resident/board messaging** — `SMS · Email · Both`, audience
  selectable, message templates; logged to the ticket.
- **Inbound replies** — resident/board messages land in the same stream.

A filter (All / Team / Resident / Board) scopes the stream; a mode-switching
composer keeps "talk to the team" and "talk to the resident/board" one click
apart; and a side **public tracker** shows exactly what the requester sees
(never leaking internal cost/vendor detail). **This is the layout proposed for
sign-off.**

## Stack

React 18 + TypeScript + Vite + TailwindCSS (theme tokens) + Lucide. State is a
typed React context (`src/store/OrbitProvider.tsx`) whose **action surface is the
seam** the production backend implements.

### Planned backend (next)

tRPC + Drizzle ORM (Postgres) + real auth (Argon2 + session/JWT), and an **LLM
layer defaulting to Anthropic Claude** (`claude-opus-4-8`, or `claude-sonnet-4-6`
for cheaper/faster triage) for the AI Review engines — always operator-in-the-loop.
The seed data in `src/data/` mirrors the prototype's deterministic generator and
doubles as dev-database seed values.

## Project layout

```
src/
  lib/        types.ts (domain model) · format.ts · ticket.ts (presentation + derivations)
  data/       seed.ts · flow.ts (lifecycle generator) · identity.ts (personas/permissions)
  store/      OrbitProvider.tsx (global state + action seam)
  components/ ui/ (Glass, Btn, Tag, Modal, …) · shell/ (Sidebar, TopBar, Wordmark)
  features/   auth/ · tickets/ (+ command/ workspace + tabs/) · ai/ · placeholder/
```

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run typecheck
```

Sign in with any demo account (the login screen lists them by persona). Operators
land in the command app; external personas get a portal placeholder. Use the
account menu to switch users or **View as** an external persona.

## Status

First slice (operator Ticket Command + Communications) is built and runnable.
Designed-but-not-yet-built surfaces (Command Deck, Emergency Desk, Buildings &
Systems, Notices, Integrations, Vendors, and the Board/Resident/Vendor portals)
render a roadmap placeholder.
