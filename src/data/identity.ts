// identity.ts — accounts, personas & permissions. Four persona classes:
// operator (internal Orbit staff), board, resident, vendor. In production the
// demo accounts are replaced by real auth (Argon2 + session/JWT); the persona
// + permission model carries over unchanged.
import type { Notice } from "@/data/notices";
import type { OrbitUser, Persona, Ticket, TicketFlow } from "@/lib/types";
import { PEOPLE } from "./seed";
import { STAGE_INDEX } from "./flow";

export const PERSONA_META: Record<Persona, { label: string; icon: string; tint: string }> = {
  operator: { label: "Orbit Team", icon: "command", tint: "var(--acc)" },
  board: { label: "Board", icon: "users", tint: "#a855f7" },
  resident: { label: "Resident", icon: "home", tint: "#3b82f6" },
  vendor: { label: "Vendor", icon: "hard-hat", tint: "#f59e0b" },
  super: { label: "Superintendent", icon: "hammer", tint: "#14b8a6" },
};

export const USERS: OrbitUser[] = [
  { id: "u_marcus", persona: "operator", who: "nick", title: "Principal Operator", email: "m.webb@orbit.ops", scope: "All 8 buildings · full command", home: "dashboard", perms: ["all"] },
  { id: "u_priya", persona: "operator", who: "cait", title: "Compliance & Admin", email: "p.anand@orbit.ops", scope: "Portfolio · compliance & finance", home: "tickets", perms: ["dashboard", "tickets", "comms", "buildings", "notices", "finance", "ai"] },
  { id: "u_diego", persona: "operator", who: "luke", title: "Field Intelligence", email: "d.ramos@orbit.ops", scope: "Field queue · NYC Ops", home: "tickets", perms: ["tickets", "comms", "buildings", "emergencies", "vendors"] },
  { id: "u_board", persona: "board", title: "Board President", building: "b6", email: "m.lieb@ardsleyboard.org", scope: "The Ardsley · approvals & finance", person: { name: "Mara Lieb", initials: "ML", color: "#a855f7", role: "Board President · The Ardsley" } },
  { id: "u_resident", persona: "resident", building: "b5", unit: "3R", email: "jordan.avery@email.com", scope: "Sutton Reach · Unit 3R", person: { name: "Jordan Avery", initials: "JA", color: "#3b82f6", role: "Resident · Sutton Reach 3R" } },
  { id: "u_vendor", persona: "vendor", company: "Northeast Mechanical", email: "dispatch@nemech.com", scope: "Northeast Mechanical · dispatch", person: { name: "Rosa Méndez", initials: "RM", color: "#f59e0b", role: "Dispatcher · Northeast Mechanical" } },
  { id: "u_super", persona: "super", building: "b2", email: "j.petrov@vesperhouse.super", scope: "Vesper House · resident superintendent", person: { name: "Joel Petrov", initials: "JP", color: "#14b8a6", role: "Superintendent · Vesper House" } },
  { id: "u_super2", persona: "super", building: "b7", email: "w.friedman@lindenpark.super", scope: "Linden Park HOA · superintendent", person: { name: "Walt Friedman", initials: "WF", color: "#14b8a6", role: "Superintendent · Linden Park HOA" } },
];

export const userById = (id: string | null): OrbitUser | null =>
  USERS.find((u) => u.id === id) || null;

export function userPerson(u: OrbitUser | null) {
  if (!u) return null;
  return u.persona === "operator" ? PEOPLE[u.who!] : u.person ?? null;
}

export const userName = (u: OrbitUser | null): string => userPerson(u)?.name ?? "—";

export function canSee(u: OrbitUser | null, page: string): boolean {
  return !!u && u.persona === "operator" && !!u.perms && (u.perms.includes("all") || u.perms.includes(page));
}

// ── scoped ticket selectors (used by portals + impersonation) ───────────
export function boardTickets(u: OrbitUser, tickets: Ticket[]): Ticket[] {
  return tickets.filter((t) => t.building === u.building);
}
export function boardVoteTickets(u: OrbitUser, tickets: Ticket[], flowOf: (t: Ticket) => TicketFlow): Ticket[] {
  return boardTickets(u, tickets).filter((t) => {
    const f = flowOf(t);
    return f.requiresVote && f.bids.length && STAGE_INDEX[f.stage] >= STAGE_INDEX.vote && STAGE_INDEX[f.stage] <= STAGE_INDEX.scheduled;
  });
}

/** Building-scoped activity for the board: their building's live tickets only,
 *  newest first, duplicates folded out. The portal renders the *public* stage of
 *  each (the resident-facing tracker) — never internal cost/vendor/notes. */
export function boardActivityTickets(u: OrbitUser, tickets: Ticket[]): Ticket[] {
  return boardTickets(u, tickets)
    .filter((t) => !t.mergedInto)
    .sort((a, b) => (b.created || "").localeCompare(a.created || ""));
}

/** A resident's own requests: tickets in their building tied to their unit (by
 *  explicit owner marker, captured intake unit, or the requester label), newest
 *  first, duplicates folded out. */
export function residentTickets(u: OrbitUser, tickets: Ticket[]): Ticket[] {
  const unit = (u.unit || "").toLowerCase();
  return tickets
    .filter((t) => {
      if (t.building !== u.building || t.mergedInto) return false;
      if (t._residentOwner === u.id) return true;
      if (!unit) return false;
      if ((t.intake?.location?.unit || "").toLowerCase() === unit) return true;
      return new RegExp("(unit|apt|#)\\s*" + unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(t.requester);
    })
    .sort((a, b) => (b.created || "").localeCompare(a.created || ""));
}

/** A superintendent's on-site work: the physical/field tickets in their building
 *  (maintenance, facilities, or anything with a vendor), open work first, then by
 *  priority. Finance/legal/document tickets stay with the office. */
export function superTickets(u: OrbitUser, tickets: Ticket[]): Ticket[] {
  const prioRank: Record<string, number> = { Critical: 0, High: 1, Normal: 2, Low: 3 };
  return tickets
    .filter((t) => t.building === u.building && !t.mergedInto && (t.type === "Maintenance" || t.type === "Facility" || !!t.vendor))
    .sort((a, b) => {
      const ao = a.status === "Closed" ? 1 : 0;
      const bo = b.status === "Closed" ? 1 : 0;
      if (ao !== bo) return ao - bo;
      if (prioRank[a.prio] !== prioRank[b.prio]) return prioRank[a.prio] - prioRank[b.prio];
      return (b.created || "").localeCompare(a.created || "");
    });
}

/** A vendor's dispatched work: tickets across the portfolio where this vendor is
 *  named on the ticket or won the bid. Matched loosely on company name so the
 *  awarded vendor and the canonical ticket vendor both resolve. */
export function vendorTickets(u: OrbitUser, tickets: Ticket[], flowOf: (t: Ticket) => TicketFlow): Ticket[] {
  const co = (u.company || "").toLowerCase();
  if (!co) return [];
  return tickets
    .filter((t) => {
      if (t.mergedInto) return false;
      if ((t.vendor || "").toLowerCase() === co) return true;
      return (flowOf(t).awarded?.vendor || "").toLowerCase() === co;
    })
    .sort((a, b) => (b.created || "").localeCompare(a.created || ""));
}

/** Notices visible to a board/resident: their building's broadcasts plus any
 *  portfolio-wide ("all") notice, most recent first. Drafts stay internal. */
export function scopedNotices(u: OrbitUser | null, notices: Notice[]): Notice[] {
  if (!u || !u.building) return [];
  return notices
    .filter((n) => n.status !== "Draft" && (n.building === u.building || n.building === "all"))
    .sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}
