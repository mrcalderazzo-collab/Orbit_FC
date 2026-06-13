// flow.ts — ticket lifecycle model: stages + a deterministic generator that
// augments any ticket with a deep workflow record (intake, bids, vote, vendor,
// requester updates). Seeded RNG keyed on the ticket id → stable across renders.
import type { Bid, IntakeRecord, StageKey, Ticket, TicketFlow, TicketIntakeDetail, Vote } from "@/lib/types";
import { dateShift, rng, seed } from "@/lib/format";
import { ROSTER, buildingById } from "./seed";

// Captured intake (from the New Intake flow) overrides the generated record so
// the Intake tab shows exactly what the operator entered.
function mergeCapturedIntake(gen: IntakeRecord, cap: TicketIntakeDetail, created?: string): IntakeRecord {
  const s = cap.submitter;
  const accessBits: string[] = [];
  if (cap.access?.permissionToEnter) accessBits.push("Permission to enter granted");
  if (cap.access?.occupantPresent) accessBits.push("occupant must be present");
  if (cap.access?.window) accessBits.push("preferred window: " + cap.access.window);
  if (cap.location?.detail) accessBits.push(cap.location.detail);
  return {
    submitter: s?.role || gen.submitter,
    submitterName: s?.name || gen.submitterName,
    channel: s?.channel || gen.channel,
    unit: cap.location?.unit || s?.unit || gen.unit,
    contact: { phone: s?.phone || gen.contact.phone, email: s?.email || gen.contact.email },
    access: accessBits.length ? accessBits.join(" · ") : gen.access,
    keyOnFile: cap.access?.keyOnFile ?? gen.keyOnFile,
    petOnSite: cap.access?.petOnSite ?? gen.petOnSite,
    media: cap.attachments?.length ? cap.attachments.map((a) => [a.kind === "doc" ? "pdf" : a.kind, a.caption || a.name] as [("photo" | "video" | "pdf"), string]) : gen.media,
    reportedAt: cap.reportedAt || created || gen.reportedAt,
  };
}

export const FLOW_STAGES: { key: StageKey; label: string; icon: string }[] = [
  { key: "intake", label: "Intake", icon: "inbox" },
  { key: "triage", label: "Triage", icon: "git-branch" },
  { key: "sourcing", label: "Sourcing", icon: "search-check" },
  { key: "vote", label: "Board Vote", icon: "vote" },
  { key: "scheduled", label: "Scheduled", icon: "calendar-check" },
  { key: "inprogress", label: "In Progress", icon: "wrench" },
  { key: "review", label: "Review", icon: "clipboard-check" },
  { key: "closed", label: "Closed", icon: "check-circle-2" },
];
export const STAGE_INDEX: Record<StageKey, number> = Object.fromEntries(
  FLOW_STAGES.map((s, i) => [s.key, i]),
) as Record<StageKey, number>;

const FLOW_CHANNELS = ["Resident portal", "Mobile app", "Phone", "Email", "Super walk-in", "AI engine"];
const ACCESS_NOTES = [
  "Resident works from home — flexible all day.",
  "Key on file with front desk · doorman building.",
  "Access via super; 24h notice required by board.",
  "Tenant requests after 5pm only · cat on site.",
  "Vacant unit — lockbox code 4417, supe escorts.",
  "Commercial space — coordinate with store manager.",
];
const MEDIA_SETS: Record<string, [("photo" | "video" | "pdf"), string][]> = {
  Maintenance: [["photo", "Damage — wide"], ["photo", "Damage — detail"], ["video", "Walkthrough · 0:42"]],
  Facility: [["photo", "Affected area"], ["photo", "Equipment tag"]],
  Finance: [["pdf", "Invoice backup"], ["pdf", "Bank statement"]],
  Documents: [["pdf", "Current binder"], ["pdf", "Renewal quote"]],
  "Board request": [["pdf", "Board memo"]],
};

const BID_POOL: Record<string, string[]> = {
  Maintenance: ["Northeast Mechanical", "Cambridge & Leach", "Empire Power", "Otis Elevator", "MetroFlow Plumbing"],
  Facility: ["Skyline Restoration", "Apex Facade", "GreenLeaf Grounds", "Verde Interiors", "BuildRight GC"],
  Finance: ["Marks Paneth CPA", "Czarnowski Audit", "Wagner Advisory"],
  Documents: ["Hartmann Title", "Mercer Insurance", "BlumbergExcelsior"],
  "Board request": ["Cohen & Associates Law", "Belkin Burden", "Smith Buss & Jacobs"],
};
const VENDOR_GRADE: Record<string, number> = { "Northeast Mechanical": 94, "Cambridge & Leach": 88, "Empire Power": 91, "Otis Elevator": 96, "MetroFlow Plumbing": 79, "Skyline Restoration": 92, "Apex Facade": 85, "GreenLeaf Grounds": 81, "Verde Interiors": 87, "BuildRight GC": 90, "Marks Paneth CPA": 93, "Czarnowski Audit": 86, "Wagner Advisory": 82, "Hartmann Title": 84, "Mercer Insurance": 89, "BlumbergExcelsior": 80, "Cohen & Associates Law": 95, "Belkin Burden": 91, "Smith Buss & Jacobs": 88 };

const FLOW_OVERRIDES: Record<string, { stage?: StageKey; estimate?: number }> = {
  "T-4801": { stage: "inprogress" },
  "T-4799": { stage: "review" },
  "T-4795": { stage: "sourcing", estimate: 14200 },
  "T-4790": { stage: "triage" },
  "T-4788": { stage: "review" },
  "T-4782": { stage: "vote", estimate: 62000 },
  "T-4779": { stage: "scheduled" },
  "T-4771": { stage: "closed" },
  "T-4765": { stage: "closed" },
};

const STATUS_STAGE: Record<string, StageKey> = {
  Open: "intake",
  Assigned: "triage",
  "In progress": "inprogress",
  "Awaiting review": "review",
  Closed: "closed",
};

function bidScope(type: string): string {
  return (
    {
      Maintenance: "Parts, labor & disposal · 1yr workmanship",
      Facility: "Full scope incl. prep, materials & cleanup",
      Finance: "Forensic review + restated statements",
      Documents: "Filing, riders & board certification",
      "Board request": "Drafting, review & filing",
    } as Record<string, string>
  )[type] || "Standard scope";
}
function bidNote(v: string, type: string): string {
  const opts = ["Available immediately, crew on standby.", "Premium materials, longer warranty.", "Lowest bid — references checked.", "Existing COI on file, pre-cleared.", "Has serviced this building before.", "Includes after-hours premium."];
  return opts[Math.abs(seed(v + type)) % opts.length];
}
function voteRationale(r: () => number): string | null {
  const opts = ["Best value — strong references.", "Worked with them before, reliable.", "Fastest turnaround for our timeline.", "Lowest cost, scope is adequate.", "Longest warranty, worth the premium.", "Pre-cleared COI, no onboarding delay.", null, null];
  return opts[Math.floor(r() * opts.length)];
}

function buildUpdates(stage: StageKey, requiresVote: boolean, awarded: Bid | null, vendor: TicketFlow["vendor"]) {
  const order: StageKey[] = ["intake", "triage", "sourcing", "vote", "scheduled", "inprogress", "review", "closed"];
  const si = order.indexOf(stage);
  const lib: Record<StageKey, { text: string; eta: string }> = {
    intake: { text: "Request received and logged. An account manager is reviewing.", eta: "Review within SLA window" },
    triage: { text: "Reviewed and routed to the right team. Scoping the work now.", eta: "Sourcing vendors shortly" },
    sourcing: { text: "Gathering competitive bids from qualified vendors.", eta: "Bids in 1–2 business days" },
    vote: { text: "Bids submitted to the board for a vote.", eta: "Board decision pending" },
    scheduled: { text: vendor && awarded ? awarded.vendor + " is confirmed. Visit scheduled." : "Vendor confirmed and scheduled.", eta: vendor ? vendor.window : "Scheduled" },
    inprogress: { text: (awarded ? awarded.vendor : "The crew") + " is on site and working.", eta: "Completion expected today" },
    review: { text: "Work complete. Final walkthrough and verification underway.", eta: "Closing out shortly" },
    closed: { text: "Resolved and verified. Thanks for your patience.", eta: "Complete" },
  };
  const slice = order.slice(0, si + 1).filter((k) => k !== "vote" || requiresVote);
  return slice.map((k, i, arr) => ({
    stage: k,
    current: i === arr.length - 1,
    ...lib[k],
    ts: dateShift(-(arr.length - 1 - i)) + "T" + String(9 + i).padStart(2, "0") + ":00",
  }));
}

export function ticketFlow(t: Ticket): TicketFlow {
  const r = rng(seed(t.id + "flow"));
  const ov = FLOW_OVERRIDES[t.id] || {};
  const stage: StageKey = ov.stage || STATUS_STAGE[t.status] || "intake";
  const si = STAGE_INDEX[stage];
  const b = buildingById(t.building);

  const estimate = ov.estimate || Math.round((1500 + r() * 78000) / 100) * 100;
  const threshold = b && b.units > 60 ? 25000 : 15000;
  const requiresVote = estimate >= threshold;

  const unit = Math.ceil(r() * (b ? Math.min(b.units, 30) : 12)) + ["A", "B", "C", "D", "F", "G", "R"][Math.floor(r() * 7)];
  const submitterPool: [string, string][] = [
    ["Resident", t.requester.includes("Unit") ? t.requester.replace("Tenant · ", "") : "Unit " + unit],
    ["Board", "Board liaison"],
    ["Super", (ROSTER[t.building] || {}).super || "Resident super"],
    ["Field ops", "Diego Ramos"],
  ];
  const subm = submitterPool[Math.floor(r() * submitterPool.length)];
  const media = MEDIA_SETS[t.type] || MEDIA_SETS.Facility;

  const slaHrs = t.prio === "Critical" ? 4 : t.prio === "High" ? 24 : t.prio === "Normal" ? 72 : 120;
  const elapsed = Math.round(r() * slaHrs * 1.3);
  const breached = stage !== "closed" && elapsed > slaHrs;

  let bids: Bid[] = [];
  let awardedBidId: string | null = null;
  let vote: Vote | null = null;

  if (si >= STAGE_INDEX.sourcing) {
    const pool = BID_POOL[t.type] || BID_POOL.Facility;
    const n = 2 + Math.floor(r() * 2);
    const picks = [...pool].sort(() => r() - 0.5).slice(0, n);
    bids = picks.map((v, i) => {
      const spread = 0.78 + r() * 0.5;
      return {
        id: "bid" + i,
        vendor: v,
        amount: Math.round((estimate * spread) / 100) * 100,
        leadTimeDays: 3 + Math.floor(r() * 21),
        warrantyMo: [6, 12, 12, 24, 36][Math.floor(r() * 5)],
        grade: VENDOR_GRADE[v] || 85,
        scope: bidScope(t.type),
        note: bidNote(v, t.type),
      };
    });
    // AI "best value" = grade per $k minus lead-time penalty
    let best = bids[0];
    let bestScore = -1;
    bids.forEach((x) => {
      const score = x.grade / (x.amount / 1000) - x.leadTimeDays * 0.15;
      if (score > bestScore) { bestScore = score; best = x; }
    });
    best.recommended = true;

    if (requiresVote && si >= STAGE_INDEX.vote) {
      const boardNames = ((ROSTER[t.building] || {}).board || [["A. Director", ""], ["B. Director", ""], ["C. Director", ""]]).map((x) => x[0]);
      const decided = ["scheduled", "inprogress", "review", "closed"].includes(stage);
      vote = {
        deadline: dateShift(decided ? -1 : 2),
        quorum: Math.ceil(boardNames.length / 2),
        board: boardNames.map((nm, i) => {
          const voted = decided ? true : r() > 0.35;
          const choice = voted ? bids[Math.floor(r() * bids.length)].id : null;
          return { name: nm, choice: voted ? (decided && i === 0 ? best.id : choice) : null, rationale: voted ? voteRationale(r) : null, at: voted ? dateShift(-Math.floor(r() * 3)) : null };
        }),
      };
      vote.board.forEach((m) => { if (m.choice && r() > 0.5) m.choice = best.id; });
      if (decided) awardedBidId = best.id;
      else vote.board[0] = { ...vote.board[0], choice: null, rationale: null, at: null };
    }
    if (["scheduled", "inprogress", "review", "closed"].includes(stage) && !awardedBidId) {
      awardedBidId = best.id;
    }
  }

  const awarded = bids.find((x) => x.id === awardedBidId) || null;

  const vendor = awarded
    ? {
        name: awarded.vendor,
        residentOk: si >= STAGE_INDEX.scheduled,
        vendorOk: si >= STAGE_INDEX.scheduled,
        window: si >= STAGE_INDEX.scheduled ? dateShift(stage === "closed" ? -2 : 1) + " · 9:00–12:00" : "Awaiting confirmation",
      }
    : null;

  const updates = buildUpdates(stage, requiresVote, awarded, vendor);

  const genIntake = {
    submitter: subm[0],
    submitterName: subm[1],
    channel: FLOW_CHANNELS[Math.floor(r() * FLOW_CHANNELS.length)],
    unit: subm[0] === "Resident" ? unit : null,
    contact: { phone: "+1 (212) 555-0" + (100 + Math.floor(r() * 800)), email: subm[1].toLowerCase().replace(/[^a-z]/g, ".").slice(0, 10) + "@resident.io" },
    access: ACCESS_NOTES[Math.floor(r() * ACCESS_NOTES.length)],
    keyOnFile: r() > 0.5,
    petOnSite: r() > 0.7,
    media,
    reportedAt: t.created || dateShift(-3) + "T09:00:00",
  };
  const intake = t.intake ? mergeCapturedIntake(genIntake, t.intake, t.created) : genIntake;

  return {
    stage,
    stageIndex: si,
    estimate,
    threshold,
    requiresVote,
    intake,
    sla: { hrs: slaHrs, elapsed, breached, pct: Math.min(100, Math.round((elapsed / slaHrs) * 100)) },
    bids,
    awardedBidId,
    awarded,
    vote,
    vendor,
    updates,
  };
}
