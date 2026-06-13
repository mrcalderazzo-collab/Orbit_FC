// ticket.ts — shared ticket presentation constants + derived state helpers.
import type { Priority, Ticket, TicketFlow, TicketStatus } from "./types";
import { STAGE_INDEX } from "@/data/flow";

export const STATUS_COLOR: Record<TicketStatus, string> = {
  Open: "var(--ink-4)",
  Assigned: "#3b82f6",
  "In progress": "var(--acc-text)",
  "Awaiting review": "#f59e0b",
  Closed: "#22c55e",
};

export const PRIO_COLOR: Record<Priority, string> = {
  Critical: "#ef4444",
  High: "#f59e0b",
  Normal: "#3b82f6",
  Low: "var(--ink-4)",
};

export const COMPLIANCE: Record<string, [string, string]> = {
  ok: ["#22c55e", "COMPLIANT"],
  review: ["#f59e0b", "IN REVIEW"],
  alert: ["#ef4444", "ACTION REQ"],
};

export type ApprovalState = "awaiting" | "approved" | "review" | "pm" | "closed";

export const APPROVAL_META: Record<ApprovalState, { label: string; short: string; c: string; icon: string }> = {
  awaiting: { label: "Awaiting votes", short: "AWAITING VOTES", c: "#a855f7", icon: "vote" },
  approved: { label: "Vote approved", short: "VOTE APPROVED", c: "#22c55e", icon: "circle-check-big" },
  review: { label: "Awaiting review", short: "AWAITING REVIEW", c: "#f59e0b", icon: "clipboard-check" },
  pm: { label: "PM authority", short: "PM AUTHORITY", c: "#3b82f6", icon: "shield-check" },
  closed: { label: "Resolved", short: "RESOLVED", c: "#22c55e", icon: "check" },
};

export function ticketApproval(t: Ticket, f: TicketFlow): ApprovalState {
  if (t.status === "Awaiting review") return "review";
  if (f.requiresVote) return f.awardedBidId ? "approved" : "awaiting";
  if (t.status === "Closed") return "closed";
  return "pm";
}

export function ticketVendorName(t: Ticket, f: TicketFlow): string | null {
  return t.vendor || (f.awarded && f.awarded.vendor) || (f.vendor && f.vendor.name) || null;
}

// queue grouping (operational buckets)
export const TICKET_GROUPS: {
  key: string;
  label: string;
  desc: string;
  c: string;
  match: (t: Ticket) => boolean;
}[] = [
  { key: "inbound", label: "Inbound", desc: "New · needs triage", c: "var(--ink-4)", match: (t) => t.status === "Open" },
  { key: "inflight", label: "In Flight", desc: "Assigned · in progress", c: "var(--acc)", match: (t) => t.status === "Assigned" || t.status === "In progress" },
  { key: "review", label: "Awaiting Review", desc: "Verify & close", c: "#f59e0b", match: (t) => t.status === "Awaiting review" },
  { key: "resolved", label: "Resolved", desc: "Closed · chain-verified", c: "#22c55e", match: (t) => t.status === "Closed" },
];

export const stageReached = (f: TicketFlow, key: keyof typeof STAGE_INDEX): boolean =>
  f.stageIndex >= STAGE_INDEX[key];

// ── SLA risk ────────────────────────────────────────────────────────────
export type SlaLevel = "ok" | "warn" | "breach";
export function slaState(f: TicketFlow): { level: SlaLevel; remaining: number; label: string; color: string } {
  const remaining = f.sla.hrs - f.sla.elapsed;
  if (f.sla.breached) return { level: "breach", remaining, label: "BREACHED", color: "#ef4444" };
  if (f.sla.pct > 70) return { level: "warn", remaining, label: remaining + "h left", color: "#f59e0b" };
  return { level: "ok", remaining, label: remaining + "h left", color: "#22c55e" };
}
