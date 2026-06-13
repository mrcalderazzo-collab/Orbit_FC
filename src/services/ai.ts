// Client wrappers for Orbit's AI layer. These POST to the server-side handlers
// (src is browser code; the Anthropic key lives only on the server). Each
// result carries `source` ("claude" | "heuristic") so the UI can show whether a
// recommendation came from the live model or the deterministic fallback.
import type { Bid, Priority, Ticket, TicketType } from "@/lib/types";

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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("AI request failed (" + res.status + ")");
  return (await res.json()) as T;
}

export function aiTriage(t: Ticket, buildingName: string): Promise<TriageResult> {
  return post<TriageResult>("/api/ai/triage", { id: t.id, title: t.title, desc: t.desc, type: t.type, prio: t.prio, buildingName, requester: t.requester });
}

export function aiPatterns(buildingName: string, tickets: Ticket[]): Promise<PatternResult> {
  return post<PatternResult>("/api/ai/patterns", {
    buildingName,
    tickets: tickets.map((t) => ({ id: t.id, title: t.title, type: t.type, prio: t.prio, created: t.created })),
  });
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

export function aiClassifyIntake(text: string, buildingName?: string): Promise<IntakeClassifyResult> {
  return post<IntakeClassifyResult>("/api/ai/intake", { text, buildingName });
}

export function aiVendor(t: Ticket, bids: Bid[]): Promise<VendorResult> {
  return post<VendorResult>("/api/ai/vendor", { title: t.title, type: t.type, bids: bids.map((b) => ({ vendor: b.vendor, amount: b.amount, leadTimeDays: b.leadTimeDays, warrantyMo: b.warrantyMo, grade: b.grade })) });
}
