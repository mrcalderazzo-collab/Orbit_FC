// Client wrappers for Orbit's AI layer. These POST to the server-side handlers
// (src is browser code; the Anthropic key lives only on the server). Each result
// carries `source` ("claude" | "heuristic") so the UI shows whether it came from
// the live model or the deterministic fallback.
//
// IMPORTANT: these never reject. If the API is unavailable (no key on the deploy,
// a 500, or running the static build with no /api), we fall back to a local
// keyword heuristic tagged source:"heuristic" — the feature always returns
// something usable instead of surfacing a raw error.
import type { Bid, Priority, Ticket, TicketType } from "@/lib/types";
import { CATEGORIES } from "@/data/taxonomy";

export interface TriageResult {
  source: "claude" | "heuristic";
  model?: string;
  type: TicketType;
  priority: Priority;
  summary: string;
  suggestedOwnerId: string;
  draftResponse: string;
  confidence: number;
  rationale: string;
}

export interface PatternResult {
  source: "claude" | "heuristic";
  model?: string;
  patterns: { title: string; finding: string; recommendation: string; confidence: number; ticketIds: string[] }[];
}

export interface VendorResult {
  source: "claude" | "heuristic";
  model?: string;
  recommendation: string;
  rationale: string;
  confidence: number;
}

export interface IntakeClassifyResult {
  source: "claude" | "heuristic";
  model?: string;
  category: string;
  subcategory: string;
  priority: Priority;
  title: string;
  summary: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("AI request failed (" + res.status + ")");
  return (await res.json()) as T;
}

// ── keyword heuristics (the deterministic fallback) ────────────────────────
const CRITICAL_KW = ["flood", "flooding", "gas leak", "gas smell", "fire", "smoke", "no heat", "sparks", "shock", "sewage", "burst", "carbon monoxide", "trapped", "stuck in elevator", "overflow", "overflowing", "no water"];
const HIGH_KW = ["leak", "leaking", "outage", "no hot water", "elevator down", "elevator out", "not working", "broken", "down", "mold", "infestation", "pest", "won't", "wont", "dripping"];

function inferPriority(text: string, fallback: Priority): Priority {
  const s = text.toLowerCase();
  if (CRITICAL_KW.some((k) => s.includes(k))) return "Critical";
  if (HIGH_KW.some((k) => s.includes(k))) return "High";
  return fallback;
}

const CAT_KW: [string, string[]][] = [
  ["emergency", ["fire", "gas leak", "gas smell", "flood", "smoke", "trapped", "carbon monoxide", "burst"]],
  ["systems", ["elevator", "intercom", "buzzer", "generator", "pump", "fire alarm", "sprinkler", "boiler", "hvac", "heat", "no heat"]],
  ["maintenance", ["leak", "plumb", "hot water", "radiator", "faucet", "toilet", "sink", "drain", "clog", "pipe", "water", "electric", "power", "outlet", "light"]],
  ["security", ["lock", "key", "fob", "camera", "cctv", "access", "break-in", "break in", "security", "door won't"]],
  ["sanitation", ["garbage", "trash", "compactor", "clean", "pest", "rodent", "roach", "mice", "bug", "odor", "smell", "mold"]],
  ["grounds", ["landscap", "lawn", "garden", "snow", "tree", "sidewalk", "gutter"]],
  ["finance", ["invoice", "payment", "bill", "arrears", "assessment", "budget", "fee", "charge"]],
  ["compliance", ["inspection", "violation", "permit", "coi", "insurance", "fdny", "dob", "filing", "certificate"]],
  ["legal", ["board", "bylaw", "governance", "legal", "attorney", "lawsuit", "vote"]],
  ["documents", ["document", "form", "statement", "report", "lease", "closing"]],
  ["moves", ["move-in", "move-out", "move in", "move out", "moving", "coi for move"]],
  ["facility", ["door", "lobby", "hallway", "window", "paint", "floor", "roof", "amenity", "laundry"]],
  ["resident", ["complaint", "noise", "neighbor", "request", "question"]],
];

function inferCategory(text: string): string {
  const s = text.toLowerCase();
  for (const [key, kws] of CAT_KW) if (kws.some((k) => s.includes(k))) return key;
  return "maintenance";
}

const ownerForType = (type: TicketType): string =>
  type === "Finance" || type === "Documents" ? "cait" : type === "Board request" ? "maura" : "luke";

const firstSentence = (s: string) => (s || "").trim().replace(/\s+/g, " ").split(/[.!?\n]/)[0].trim();

function heuristicTriage(t: Ticket): TriageResult {
  const text = `${t.title} ${t.desc || ""}`;
  const priority = inferPriority(text, t.prio);
  const urgent = priority === "Critical" || priority === "High";
  return {
    source: "heuristic",
    type: t.type,
    priority,
    summary: firstSentence(t.desc) || t.title,
    suggestedOwnerId: ownerForType(t.type),
    draftResponse: `Hi — we've received your request about "${t.title}" and it's being handled. ${urgent ? "We're treating this as a priority and someone will be in touch shortly." : "We'll follow up with next steps soon."} Thank you for letting us know.`,
    confidence: 0.55,
    rationale: `Local fallback (AI service unavailable): priority inferred from keywords in the request; routed to the ${t.type} owner. Review before applying.`,
  };
}

function heuristicIntake(text: string): IntakeClassifyResult {
  const category = inferCategory(text);
  const cat = CATEGORIES.find((c) => c.key === category);
  const priority = inferPriority(text, category === "emergency" ? "Critical" : "Normal");
  const first = firstSentence(text);
  const title = first ? first.charAt(0).toUpperCase() + first.slice(1, 72) : (cat?.label ?? "New request");
  return { source: "heuristic", category, subcategory: "", priority, title, summary: first || text.slice(0, 140) };
}

function heuristicVendor(bids: Bid[]): VendorResult {
  if (!bids.length) return { source: "heuristic", recommendation: "No bids to compare yet", rationale: "Add competitive bids first.", confidence: 0.4 };
  const best = [...bids].sort((a, b) => b.grade / (b.amount / 1000) - a.grade / (a.amount / 1000))[0];
  return {
    source: "heuristic",
    recommendation: best.vendor,
    rationale: `Best value by grade-per-dollar: grade ${best.grade} at $${best.amount.toLocaleString()}, ~${best.leadTimeDays}d lead, ${best.warrantyMo}mo warranty.`,
    confidence: 0.5,
  };
}

// ── exported calls: try the live model, fall back to the heuristic ──────────
export async function aiTriage(t: Ticket, buildingName: string): Promise<TriageResult> {
  try {
    return await post<TriageResult>("/api/ai/triage", { id: t.id, title: t.title, desc: t.desc, type: t.type, prio: t.prio, buildingName, requester: t.requester });
  } catch {
    return heuristicTriage(t);
  }
}

export async function aiPatterns(buildingName: string, tickets: Ticket[]): Promise<PatternResult> {
  try {
    return await post<PatternResult>("/api/ai/patterns", {
      buildingName,
      tickets: tickets.map((t) => ({ id: t.id, title: t.title, type: t.type, prio: t.prio, created: t.created })),
    });
  } catch {
    return { source: "heuristic", patterns: [] };
  }
}

export async function aiClassifyIntake(text: string, buildingName?: string): Promise<IntakeClassifyResult> {
  try {
    return await post<IntakeClassifyResult>("/api/ai/intake", { text, buildingName });
  } catch {
    return heuristicIntake(text);
  }
}

export async function aiVendor(t: Ticket, bids: Bid[]): Promise<VendorResult> {
  try {
    return await post<VendorResult>("/api/ai/vendor", { title: t.title, type: t.type, bids: bids.map((b) => ({ vendor: b.vendor, amount: b.amount, leadTimeDays: b.leadTimeDays, warrantyMo: b.warrantyMo, grade: b.grade })) });
  } catch {
    return heuristicVendor(bids);
  }
}
