// Seed helpers for the Communications surface: an opening internal comment and
// the outbound/inbound message history derived from the lifecycle updates.
import type { Ticket, TicketComment, TicketFlow, TicketMessage } from "@/lib/types";
import { dateShift, rng, seed } from "@/lib/format";
import { ticketVendorName } from "@/lib/ticket";

function commentSeedText(t: Ticket, f: TicketFlow): string {
  const v = ticketVendorName(t, f);
  if (t.status === "Awaiting review") return "Work looks done from the field photos. Doing the walkthrough before I close this out.";
  if (t.status === "In progress") return (v ? v + " is on site now" : "Crew is on site now") + ". I'll keep the resident posted as it moves.";
  if (t.status === "Closed") return "Closed out — resident confirmed it's resolved. Logging for the audit chain.";
  return "Picked this up. Scoping the work and lining up vendors — will update here as it moves.";
}

export function seedCommentList(t: Ticket, f: TicketFlow): TicketComment[] {
  const owner = t.assignee || "luke";
  const at0 = (t.created || dateShift(-2) + "T09:00:00").slice(0, 16).replace("T", " ");
  const list: TicketComment[] = [{ id: "cs1", by: owner, text: commentSeedText(t, f), mentions: [], at: at0 }];
  const r = rng(seed(t.id + "cmt"));
  if (f.requiresVote) {
    list.push({ id: "cs2", by: "cait", text: "Flagged for the board — this clears the spend cap so we need a vote before awarding. Bids are loaded.", mentions: ["nick"], at: dateShift(-1) + " 14:20" });
  } else if (r() > 0.45) {
    list.push({ id: "cs2", by: "cait", text: "COI is current and they're pre-cleared — no onboarding delay on our end.", mentions: [], at: dateShift(-1) + " 11:05" });
  }
  return list;
}

function residentReplyText(t: Ticket): string {
  const opts = ["Thanks for the quick response — I'll be home after 4pm.", "Appreciate the update. Key is with the front desk if needed.", "Got it, thank you. Please text before the crew arrives.", "Thanks! Any sense of the cost on this?"];
  return opts[Math.abs(seed(t.id + "reply")) % opts.length];
}

export function seedMessageList(t: Ticket, f: TicketFlow): TicketMessage[] {
  const owner = t.assignee || "luke";
  const out: TicketMessage[] = [];
  f.updates.forEach((u, i) => {
    const both = i === 0 || (f.requiresVote && u.stage === "vote");
    out.push({ id: "ms" + i, dir: "out", audience: u.stage === "vote" ? "Board" : "Resident", channels: both ? ["SMS", "Email"] : ["SMS"], text: u.text, by: owner, at: u.ts.replace("T", " "), auto: i < f.updates.length - 1 });
  });
  if (out.length) out.splice(1, 0, { id: "mr", dir: "in", from: f.intake.submitterName, channels: ["SMS"], text: residentReplyText(t), at: out[0].at });
  return out;
}
