// aiService.ts — Orbit's AI layer (server-side; the API key never reaches the
// browser). Defaults to Anthropic Claude (claude-opus-4-8; set ORBIT_AI_MODEL
// to claude-sonnet-4-6 for cheaper/faster triage). Every engine here only ever
// RECOMMENDS — the operator decides. If no ANTHROPIC_API_KEY is configured (or
// a call fails), we fall back to a deterministic heuristic so the product is
// always usable; the response's `source` field says which path produced it.

const MODEL = process.env.ORBIT_AI_MODEL || "claude-opus-4-8";
const OWNERS = [
  { id: "luke", name: "Diego Ramos", role: "Field Intelligence" },
  { id: "cait", name: "Priya Anand", role: "Admin & Compliance" },
  { id: "maura", name: "Tom Becker", role: "Asset Manager" },
  { id: "gidi", name: "Sara Klein", role: "Asset Manager" },
];
const TYPES = ["Maintenance", "Facility", "Finance", "Documents", "Board request"];
const PRIOS = ["Critical", "High", "Normal", "Low"];

export interface TriageInput {
  id: string; title: string; desc?: string; type?: string; prio?: string; buildingName?: string; requester?: string;
}
export interface TriageResult {
  source: "claude" | "heuristic"; model?: string;
  type: string; priority: string; summary: string;
  suggestedOwnerId: string; draftResponse: string; confidence: number; rationale: string;
}
export interface PatternInput { buildingName?: string; tickets: { id: string; title: string; type: string; prio: string; created?: string }[]; }
export interface PatternResult {
  source: "claude" | "heuristic"; model?: string;
  patterns: { title: string; finding: string; recommendation: string; confidence: number; ticketIds: string[] }[];
}
export interface VendorInput { title: string; type?: string; bids: { vendor: string; amount: number; leadTimeDays: number; warrantyMo: number; grade: number }[]; }
export interface VendorResult { source: "claude" | "heuristic"; model?: string; recommendation: string; rationale: string; confidence: number; }

// ── Anthropic client (lazy; absent key → heuristic) ─────────────────────
async function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const mod = await import("@anthropic-ai/sdk");
    const Anthropic = mod.default;
    return new Anthropic();
  } catch {
    return null;
  }
}

async function claudeJSON<T>(system: string, user: string, schema: object): Promise<{ data: T; model: string } | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content: user }],
    } as never);
    if ((res as { stop_reason?: string }).stop_reason === "refusal") return null;
    const block = (res as { content: { type: string; text?: string }[] }).content.find((b) => b.type === "text");
    if (!block?.text) return null;
    return { data: JSON.parse(block.text) as T, model: (res as { model: string }).model };
  } catch (err) {
    console.warn("[orbit-ai] Claude call failed, using heuristic:", (err as Error).message);
    return null;
  }
}

// ── Triage ──────────────────────────────────────────────────────────────
const TRIAGE_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    type: { type: "string", enum: TYPES },
    priority: { type: "string", enum: PRIOS },
    summary: { type: "string" },
    suggestedOwnerId: { type: "string", enum: OWNERS.map((o) => o.id) },
    draftResponse: { type: "string" },
    confidence: { type: "number" },
    rationale: { type: "string" },
  },
  required: ["type", "priority", "summary", "suggestedOwnerId", "draftResponse", "confidence", "rationale"],
};

export async function triage(t: TriageInput): Promise<TriageResult> {
  const system =
    "You are Orbit FC's intake triage engine for a property-operations platform. " +
    "You RECOMMEND only — a human operator reviews and decides. For the work ticket given, " +
    "classify its type and priority, summarize 'the ask' in one clear sentence, suggest the best owner, " +
    "and draft a short, warm, plain-language first response to the requester (no pricing or vendor specifics). " +
    "Priority guide: Critical = life-safety/active damage (4h SLA); High = 24h; Normal = 72h; Low = 120h. " +
    "Owners: luke=Field Intelligence (maintenance/facility/emergencies), cait=Admin & Compliance (finance/documents), " +
    "maura & gidi=Asset Managers (board requests, building ops). Never invent facts not present in the ticket.";
  const user = JSON.stringify({ title: t.title, description: t.desc, building: t.buildingName, requester: t.requester, currentType: t.type, currentPriority: t.prio });
  const out = await claudeJSON<Omit<TriageResult, "source" | "model">>(system, user, TRIAGE_SCHEMA);
  if (out) return { source: "claude", model: out.model, ...out.data };
  return { source: "heuristic", ...heuristicTriage(t) };
}

function heuristicTriage(t: TriageInput): Omit<TriageResult, "source" | "model"> {
  const text = (t.title + " " + (t.desc || "")).toLowerCase();
  const has = (...w: string[]) => w.some((x) => text.includes(x));
  let type = t.type && TYPES.includes(t.type) ? t.type : "Maintenance";
  if (has("invoice", "payment", "budget", "anomaly", "ledger", "statement", "fee")) type = "Finance";
  else if (has("insurance", "binder", "policy", "filing", "bylaw", "document", "lease")) type = "Documents";
  else if (has("board", "vote", "director")) type = "Board request";
  else if (has("lobby", "facade", "roof", "window", "intercom", "common")) type = "Facility";
  else if (has("leak", "elevator", "boiler", "hvac", "heat", "water", "pump", "electrical")) type = "Maintenance";

  let priority: string = t.prio && PRIOS.includes(t.prio) ? t.prio : "Normal";
  if (has("gas", "fire", "flood", "entrapment", "no heat", "no hot water", "outage", "emergency", "critical")) priority = "Critical";
  else if (has("leak", "elevator", "lapses", "expires", "overdue", "urgent")) priority = "High";

  const ownerId = type === "Finance" || type === "Documents" ? "cait" : type === "Board request" ? "maura" : "luke";
  const owner = OWNERS.find((o) => o.id === ownerId)!;
  const summary = `${type} request${t.buildingName ? " at " + t.buildingName : ""}: ${t.title.replace(/\s+/g, " ").trim()}.`;
  const draftResponse =
    priority === "Critical"
      ? "Thanks for flagging this — we're treating it as urgent and dispatching now. We'll keep you posted here with each step."
      : "Thanks for the request — we've logged it and assigned an owner. We'll review and update you shortly with next steps.";
  const rationale =
    `Keyword signals point to ${type.toLowerCase()} at ${priority.toLowerCase()} priority; routed to ${owner.name} (${owner.role}). ` +
    "Deterministic fallback — set ANTHROPIC_API_KEY to enable Claude-backed triage.";
  return { type, priority, summary, suggestedOwnerId: ownerId, draftResponse, confidence: 0.62, rationale };
}

// ── Pattern / predictive ────────────────────────────────────────────────
const PATTERN_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    patterns: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          title: { type: "string" },
          finding: { type: "string" },
          recommendation: { type: "string" },
          confidence: { type: "number" },
          ticketIds: { type: "array", items: { type: "string" } },
        },
        required: ["title", "finding", "recommendation", "confidence", "ticketIds"],
      },
    },
  },
  required: ["patterns"],
};

export async function patterns(input: PatternInput): Promise<PatternResult> {
  const system =
    "You are Orbit FC's pattern-detection engine. You RECOMMEND only. Given a set of recent work tickets, " +
    "surface cross-ticket patterns that a human operator should act on — e.g. repeated leaks in one building suggesting a " +
    "riser issue, or clustered failures of one system. For each pattern: a short title, the finding, a concrete recommendation " +
    "(usually an inspection or preventive ticket), a confidence 0–1, and the contributing ticket ids. Only report genuine " +
    "patterns (2+ related tickets). If none, return an empty array.";
  const user = JSON.stringify(input);
  const out = await claudeJSON<{ patterns: PatternResult["patterns"] }>(system, user, PATTERN_SCHEMA);
  if (out) return { source: "claude", model: out.model, patterns: out.data.patterns };
  return { source: "heuristic", patterns: heuristicPatterns(input) };
}

function heuristicPatterns(input: PatternInput): PatternResult["patterns"] {
  const byType: Record<string, typeof input.tickets> = {};
  for (const t of input.tickets) (byType[t.type] ||= []).push(t);
  const out: PatternResult["patterns"] = [];
  for (const [type, list] of Object.entries(byType)) {
    if (list.length < 2) continue;
    out.push({
      title: `${list.length} ${type.toLowerCase()} tickets clustered${input.buildingName ? " · " + input.buildingName : ""}`,
      finding: `${list.length} ${type.toLowerCase()} requests in a short window may share a root cause rather than being independent incidents.`,
      recommendation: `Open a preventive inspection ticket and review the underlying system before more requests arrive.`,
      confidence: Math.min(0.9, 0.55 + list.length * 0.08),
      ticketIds: list.map((t) => t.id),
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}

// ── Vendor match ────────────────────────────────────────────────────────
const VENDOR_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: { recommendation: { type: "string" }, rationale: { type: "string" }, confidence: { type: "number" } },
  required: ["recommendation", "rationale", "confidence"],
};

export async function vendorMatch(input: VendorInput): Promise<VendorResult> {
  const system =
    "You are Orbit FC's vendor-recommendation engine. You RECOMMEND only; the operator awards. " +
    "Given competitive bids, recommend the best-value vendor (grade per dollar, adjusted for lead time and warranty). " +
    "Give a one-line rationale and a confidence 0–1.";
  const user = JSON.stringify(input);
  const out = await claudeJSON<Omit<VendorResult, "source" | "model">>(system, user, VENDOR_SCHEMA);
  if (out) return { source: "claude", model: out.model, ...out.data };
  return { source: "heuristic", ...heuristicVendor(input) };
}

function heuristicVendor(input: VendorInput): Omit<VendorResult, "source" | "model"> {
  let best = input.bids[0];
  let bestScore = -Infinity;
  for (const b of input.bids) {
    const score = b.grade / (b.amount / 1000) - b.leadTimeDays * 0.15 + b.warrantyMo * 0.02;
    if (score > bestScore) { bestScore = score; best = b; }
  }
  return best
    ? { recommendation: best.vendor, rationale: `Best value — grade ${best.grade} at $${best.amount.toLocaleString()}, ${best.leadTimeDays}d lead, ${best.warrantyMo}mo warranty.`, confidence: 0.7 }
    : { recommendation: "—", rationale: "No bids to compare.", confidence: 0 };
}
