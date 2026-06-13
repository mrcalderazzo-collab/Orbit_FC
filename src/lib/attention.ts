// attention.ts — separates ATTENTION (does this need me?) from STATUS (where is
// it in the lifecycle). "In progress" doesn't tell you whether to intervene;
// attention does. This is the signal the Command Deck and case briefings key on.
import type { Ticket, TicketFlow } from "./types";

export type Attention = "atRisk" | "escalated" | "blocked" | "needsAction" | "waitingExternal" | "watching" | "healthy";

export const ATTENTION_META: Record<Attention, { label: string; short: string; color: string; icon: string }> = {
  atRisk: { label: "At risk of SLA breach", short: "AT-RISK", color: "#ef4444", icon: "alarm-clock-off" },
  escalated: { label: "Escalated", short: "ESCALATED", color: "#ef4444", icon: "trending-up" },
  blocked: { label: "Blocked", short: "BLOCKED", color: "#f59e0b", icon: "octagon-alert" },
  needsAction: { label: "Needs action", short: "NEEDS ACTION", color: "#3b82f6", icon: "circle-dot" },
  waitingExternal: { label: "Waiting externally", short: "WAITING", color: "#a855f7", icon: "hourglass" },
  watching: { label: "On track", short: "ON TRACK", color: "#22c55e", icon: "eye" },
  healthy: { label: "Resolved", short: "RESOLVED", color: "var(--ink-4)", icon: "check" },
};

export function attentionOf(t: Ticket, f: TicketFlow, opts: { needsReply?: boolean } = {}): Attention {
  if (t.status === "Closed" || t.mergedInto) return "healthy";
  if (f.sla.breached) return "atRisk";
  if ((t.tags || []).includes("Blocked")) return "blocked";
  if (t.status === "Open") return "needsAction"; // new / unowned, needs triage
  if (opts.needsReply) return "needsAction"; // a message is waiting on a reply
  if (f.requiresVote && !f.awardedBidId) return "waitingExternal"; // board vote pending
  if (t.prio === "Critical") return "escalated";
  return "watching";
}

export type ActionKind = "assign" | "reply" | "approve" | "escalate" | "schedule" | "close" | "open";

/** the single, clear next action for a ticket given its attention. */
export function nextAction(t: Ticket, attn: Attention): { kind: ActionKind; label: string } {
  if (attn === "needsAction" && t.status === "Open" && !t.assignee) return { kind: "assign", label: "Take" };
  if (attn === "needsAction" && t.status === "Open") return { kind: "open", label: "Triage" };
  if (attn === "needsAction") return { kind: "reply", label: "Reply" };
  if (attn === "waitingExternal") return { kind: "approve", label: "Open vote" };
  if (attn === "atRisk") return t.prio === "Critical" ? { kind: "open", label: "Act now" } : { kind: "escalate", label: "Escalate" };
  if (attn === "escalated") return { kind: "open", label: "Review" };
  if (attn === "blocked") return { kind: "open", label: "Unblock" };
  if (attn === "watching") return { kind: "open", label: "Continue" };
  return { kind: "open", label: "Open" };
}
