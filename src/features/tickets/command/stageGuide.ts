// stageGuide — the single source of plain-English truth for "what does this
// stage mean" and "what's the one next step". Shared by the header stage summary
// and the Overview Next-action card so they never disagree.
import type { StageKey, TicketFlow } from "@/lib/types";
import { FLOW_STAGES, STAGE_INDEX } from "@/data/flow";

export interface StageStep { label: string; desc: string; icon: string; tab: string }

// what's happening right now, in one plain sentence, per stage
export const STAGE_BLURB: Record<StageKey, string> = {
  intake: "Just arrived — being reviewed and classified.",
  triage: "Routed to the right team; the work is being scoped.",
  sourcing: "Collecting competitive bids from qualified vendors.",
  vote: "Bids are with the board for a decision.",
  scheduled: "Vendor confirmed — the visit is booked.",
  inprogress: "Crew is on site doing the work.",
  review: "Work is done — verifying before close-out.",
  closed: "Resolved and verified.",
};

const NEXT: Record<StageKey, StageStep> = {
  intake: { label: "Triage & route", desc: "Confirm scope and assign an owner.", icon: "git-branch", tab: "intake" },
  triage: { label: "Source vendors", desc: "Request competitive bids.", icon: "search-check", tab: "sourcing" },
  sourcing: { label: "Award the bid", desc: "Pick a vendor and award.", icon: "award", tab: "sourcing" },
  vote: { label: "Awaiting the board", desc: "Voting in progress — monitor results.", icon: "vote", tab: "sourcing" },
  scheduled: { label: "Confirm the visit", desc: "Lock in resident + vendor access.", icon: "calendar-check", tab: "vendor" },
  inprogress: { label: "Track the work", desc: "Post updates as the crew works.", icon: "wrench", tab: "comms" },
  review: { label: "Verify & close", desc: "Final walkthrough and sign-off.", icon: "clipboard-check", tab: "activity" },
  closed: { label: "Resolved", desc: "Chain-verified and closed.", icon: "circle-check-big", tab: "activity" },
};

/** the single recommended next step for a ticket's current stage. */
export function nextStepFor(f: TicketFlow): StageStep {
  if (f.stage === "sourcing" && f.requiresVote) {
    return { label: "Open board vote", desc: "Send the bids to the board.", icon: "vote", tab: "sourcing" };
  }
  return NEXT[f.stage] ?? NEXT.intake;
}

/** current position in the (vote-aware) visible pipeline: "step X of Y". */
export function visibleStep(f: TicketFlow): { step: number; total: number } {
  const visible = FLOW_STAGES.filter((s) => !(s.key === "vote" && !f.requiresVote));
  const step = visible.filter((s) => STAGE_INDEX[s.key] <= f.stageIndex).length;
  return { step: Math.max(1, step), total: visible.length };
}

/** the next stage forward (skipping Board Vote when no vote is required), or
 *  null if already closed. Drives the "advance the ticket" action. */
export function nextStageKey(f: TicketFlow): StageKey | null {
  const visible = FLOW_STAGES.filter((s) => !(s.key === "vote" && !f.requiresVote));
  const i = visible.findIndex((s) => s.key === f.stage);
  if (i === -1) return visible.find((s) => STAGE_INDEX[s.key] > f.stageIndex)?.key ?? null;
  return visible[i + 1]?.key ?? null;
}
