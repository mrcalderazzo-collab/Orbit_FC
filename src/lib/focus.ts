// focus.ts — the operator's personal work organization. Buckets are about what
// YOU need to action next, independent of the ticket's lifecycle status:
//   • New incoming   — just arrived, needs triage
//   • Response required — a resident/board message is waiting on a reply
//   • Today          — you set a "do date" of today (ClickUp-style; this is a
//                      plan you choose, NOT the predicted completion / SLA)
//   • Scheduled      — do date set for a later day
//   • To organize    — active & yours, no do date yet
import type { Ticket } from "./types";

export const todayISO = (): string => new Date().toISOString().slice(0, 10);
export const addDaysISO = (n: number): string => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export function doDateLabel(date?: string | null): string | null {
  if (!date) return null;
  const today = todayISO();
  if (date === today) return "Today";
  if (date === addDaysISO(1)) return "Tomorrow";
  if (date === addDaysISO(-1)) return "Yesterday";
  const d = new Date(date + "T00:00:00");
  const overdue = date < today;
  return (overdue ? "Overdue · " : "") + d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type FocusBucket = "today" | "reply" | "inbound" | "scheduled" | "backlog";

export const FOCUS_BUCKETS: { key: FocusBucket; label: string; desc: string; c: string; icon: string }[] = [
  { key: "today", label: "Today", desc: "Your do-date is today — work these now", c: "var(--acc)", icon: "target" },
  { key: "reply", label: "Response required", desc: "A resident or board message is waiting on you", c: "#3b82f6", icon: "reply" },
  { key: "inbound", label: "New incoming", desc: "Just arrived · needs triage", c: "var(--ink-4)", icon: "inbox" },
  { key: "scheduled", label: "Scheduled", desc: "Do-date set for a later day", c: "#a855f7", icon: "calendar-clock" },
  { key: "backlog", label: "To organize", desc: "Active & yours · no do-date yet", c: "var(--ink-3)", icon: "layers" },
];

/** assign a ticket to exactly one bucket (priority order). Returns null for
 *  closed/merged tickets. `today` and `needsReply` are passed in by the view. */
export function classifyFocus(t: Ticket, today: string, needsReply: boolean): FocusBucket | null {
  if (t.status === "Closed" || t.mergedInto) return null;
  if (t.workDate === today) return "today";
  if (t.status === "Open") return "inbound";
  if (needsReply) return "reply";
  if (t.workDate && t.workDate > today) return "scheduled";
  return "backlog";
}
