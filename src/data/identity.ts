// identity.ts — accounts, personas & permissions. Four persona classes:
// operator (internal Orbit staff), board, resident, vendor. In production the
// demo accounts are replaced by real auth (Argon2 + session/JWT); the persona
// + permission model carries over unchanged.
import type { OrbitUser, Persona, Ticket, TicketFlow } from "@/lib/types";
import { PEOPLE } from "./seed";
import { STAGE_INDEX } from "./flow";

export const PERSONA_META: Record<Persona, { label: string; icon: string; tint: string }> = {
  operator: { label: "Orbit Team", icon: "command", tint: "var(--acc)" },
  board: { label: "Board", icon: "users", tint: "#a855f7" },
  resident: { label: "Resident", icon: "home", tint: "#3b82f6" },
  vendor: { label: "Vendor", icon: "hard-hat", tint: "#f59e0b" },
};

export const USERS: OrbitUser[] = [
  { id: "u_marcus", persona: "operator", who: "nick", title: "Principal Operator", email: "m.webb@orbit.ops", scope: "All 8 buildings · full command", home: "dashboard", perms: ["all"] },
  { id: "u_priya", persona: "operator", who: "cait", title: "Compliance & Admin", email: "p.anand@orbit.ops", scope: "Portfolio · compliance & finance", home: "tickets", perms: ["dashboard", "tickets", "comms", "buildings", "notices", "ai"] },
  { id: "u_diego", persona: "operator", who: "luke", title: "Field Intelligence", email: "d.ramos@orbit.ops", scope: "Field queue · NYC Ops", home: "tickets", perms: ["tickets", "comms", "buildings", "emergencies"] },
  { id: "u_board", persona: "board", title: "Board President", building: "b6", email: "m.lieb@ardsleyboard.org", scope: "The Ardsley · approvals & finance", person: { name: "Mara Lieb", initials: "ML", color: "#a855f7", role: "Board President · The Ardsley" } },
  { id: "u_resident", persona: "resident", building: "b5", unit: "3R", email: "jordan.avery@email.com", scope: "Sutton Reach · Unit 3R", person: { name: "Jordan Avery", initials: "JA", color: "#3b82f6", role: "Resident · Sutton Reach 3R" } },
  { id: "u_vendor", persona: "vendor", company: "Northeast Mechanical", email: "dispatch@nemech.com", scope: "Northeast Mechanical · dispatch", person: { name: "Rosa Méndez", initials: "RM", color: "#f59e0b", role: "Dispatcher · Northeast Mechanical" } },
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
