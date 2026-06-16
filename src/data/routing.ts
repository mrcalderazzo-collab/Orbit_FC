// routing.ts — the Front Desk routing model. Every incoming ticket is auto-
// routed to a team the moment it arrives; the Front Desk is a fast exceptions /
// confirm desk, not a manual chokepoint. Routine field work tries the building
// super first (on a clock); urgent field work skips straight to the central
// Facilities PM (super still notified).
import type { Ticket } from "@/lib/types";

export interface TeamDef { key: string; label: string; icon: string; color: string; lead: string | null }

export const TEAMS: TeamDef[] = [
  { key: "frontdesk", label: "Front Desk", icon: "concierge-bell", color: "var(--ink-3)", lead: null },
  { key: "facilities", label: "Facilities PM", icon: "wrench", color: "#b6ff00", lead: "luke" },
  { key: "super", label: "Building Super", icon: "hammer", color: "#14b8a6", lead: null },
  { key: "compliance", label: "Compliance", icon: "clipboard-check", color: "#f59e0b", lead: "cait" },
  { key: "finance", label: "Finance", icon: "circle-dollar-sign", color: "#22c55e", lead: "cait" },
  { key: "legal", label: "Legal / Board", icon: "scale", color: "#a855f7", lead: "nick" },
  { key: "leasing", label: "Leasing", icon: "key-round", color: "#06b6d4", lead: "rita" },
];

export const teamByKey = (key: string | null | undefined): TeamDef | undefined => TEAMS.find((t) => t.key === key);
// teams an operator can route TO from the Front Desk (super-first handled separately)
export const ROUTABLE = TEAMS.filter((t) => t.key !== "frontdesk" && t.key !== "super");

const FIELD_TYPES = ["Maintenance", "Facility"];
const isUrgent = (t: Ticket) => t.prio === "Critical" || t.prio === "High";

export interface RouteSuggestion { team: string; viaSuper: boolean; reason: string }

/** the rule/AI suggestion for where a ticket should go. */
export function autoRoute(t: Ticket): RouteSuggestion {
  const cat = t.category;
  if (t.type === "Finance" || cat === "finance") return { team: "finance", viaSuper: false, reason: "Financial — routed to Finance" };
  if (t.type === "Documents" || cat === "compliance" || cat === "documents") return { team: "compliance", viaSuper: false, reason: "Compliance / records — routed to Compliance" };
  if (t.type === "Board request" || cat === "legal") return { team: "legal", viaSuper: false, reason: "Governance — routed to Legal / Board" };
  if (cat === "moves") return { team: "leasing", viaSuper: false, reason: "Move-in/out — routed to Leasing" };
  if (cat === "resident") return { team: "frontdesk", viaSuper: false, reason: "Resident services — desk decision" };
  if (FIELD_TYPES.includes(t.type) || cat) {
    if (isUrgent(t)) return { team: "facilities", viaSuper: false, reason: "Urgent field work — central Facilities PM (super notified)" };
    return { team: "super", viaSuper: true, reason: "Routine field work — super first, escalates if not handled" };
  }
  return { team: "frontdesk", viaSuper: false, reason: "Needs a human to classify" };
}

/** the team a ticket is currently in (explicit route, else the suggestion). */
export const effectiveTeam = (t: Ticket): string => t.team ?? autoRoute(t).team;

/** a ticket still sitting at the Front Desk: just arrived (Open), not yet routed
 *  by a human, and not parked for info. */
export function atFrontDesk(t: Ticket): boolean {
  return t.status === "Open" && !t.held && !t.mergedInto;
}

/** super-first tickets that have aged past their window and should escalate. */
export function escalationDue(t: Ticket, ageDays: number): boolean {
  return effectiveTeam(t) === "super" && t.status !== "Closed" && !t.held && ageDays >= 2;
}

// how long the super has before a routine field ticket auto-escalates to the
// central Facilities PM.
export const ESCALATE_HOURS = 24;
export const escalateDeadline = (fromMs: number): string => new Date(fromMs + ESCALATE_HOURS * 3600_000).toISOString();

/** countdown to auto-escalation for a super-routed ticket (null if none set). */
export function escalationCountdown(escalateAt?: string | null, nowMs: number = Date.now()): { label: string; overdue: boolean } | null {
  if (!escalateAt) return null;
  const ms = new Date(escalateAt).getTime() - nowMs;
  if (ms <= 0) return { label: "overdue", overdue: true };
  const h = Math.round(ms / 3600_000);
  return { label: h >= 24 ? Math.round(h / 24) + "d" : h + "h", overdue: false };
}
