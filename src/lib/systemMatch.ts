// systemMatch.ts — lightweight "AI" matching of tickets to a building system.
// The honest version of smart search: we score each ticket against a system by
// category equality, keyword overlap (name + kind), and a direct open-ticket
// link, then surface the matches and the most recent vendor who actually worked
// the system. No model call — a transparent, explainable heuristic the operator
// can trust (and the seam a real embedding match would later slot into).
import type { BuildingSystem, Ticket } from "./types";

const tokens = (s: string): string[] =>
  s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

/** 0 = unrelated; higher = stronger match. >=4 is treated as a real hit. */
export function ticketSystemScore(t: Ticket, system: BuildingSystem): number {
  let score = 0;
  if (system.openTicketId && t.id === system.openTicketId) score += 10;
  const cat = (t.category || "").toLowerCase();
  if (cat && (cat === system.kind.toLowerCase() || cat === system.name.toLowerCase())) score += 5;
  const sysTokens = new Set([...tokens(system.name), ...tokens(system.kind)]);
  for (const w of tokens(`${t.title} ${t.desc || ""} ${t.category || ""}`)) {
    if (sysTokens.has(w)) score += 2;
  }
  return score;
}

export interface SystemTicketMatch { ticket: Ticket; score: number }

/** Tickets that plausibly concern this system, best match first, newest first. */
export function ticketsForSystem(system: BuildingSystem, tickets: Ticket[]): SystemTicketMatch[] {
  return tickets
    .filter((t) => t.building === system.buildingId && !t.mergedInto)
    .map((ticket) => ({ ticket, score: ticketSystemScore(ticket, system) }))
    .filter((m) => m.score >= 4)
    .sort((a, b) => b.score - a.score || (b.ticket.created || "").localeCompare(a.ticket.created || ""));
}

/** The vendor from the most recent matching ticket that actually named one. */
export function lastVendorFromTickets(system: BuildingSystem, tickets: Ticket[]): { vendor: string; ticket: Ticket } | null {
  const byRecent = ticketsForSystem(system, tickets)
    .filter((m) => !!m.ticket.vendor)
    .sort((a, b) => (b.ticket.created || "").localeCompare(a.ticket.created || ""));
  const top = byRecent[0];
  return top ? { vendor: top.ticket.vendor as string, ticket: top.ticket } : null;
}
