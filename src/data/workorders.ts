// workorders.ts — Work Orders as first-class objects. A work order ties a ticket
// to a vendor, a building, and the money (PO / invoice / payment). It carries
// the vendor-coordination STAGE (so anyone who logs in sees exactly where it is)
// and a handoff LOG (so the next person can pick it up mid-task).
//
// Numbering: each building has a base number; work orders are <base>-<seq>
// (e.g. 11377-1, 11377-2). The vendor's own ID (V-004) and PO/invoice refs ride
// alongside, so invoices coming in connect straight back to the ticket.
import type { Ticket, TicketFlow } from "@/lib/types";
import { addDaysISO } from "@/lib/focus";
import { BUILDINGS, PEOPLE } from "./seed";
import { vendorByName } from "./vendors";

export type WoStageKey = "awarded" | "dispatched" | "scheduled" | "onsite" | "completed" | "invoiced" | "paid" | "closed";

export const WO_STAGES: { key: WoStageKey; label: string; icon: string }[] = [
  { key: "awarded", label: "Awarded", icon: "award" },
  { key: "dispatched", label: "Dispatched", icon: "send" },
  { key: "scheduled", label: "Scheduled", icon: "calendar-check" },
  { key: "onsite", label: "On site", icon: "hard-hat" },
  { key: "completed", label: "Completed", icon: "clipboard-check" },
  { key: "invoiced", label: "Invoiced", icon: "receipt" },
  { key: "paid", label: "Paid", icon: "badge-dollar-sign" },
  { key: "closed", label: "Closed", icon: "circle-check-big" },
];
export const WO_STAGE_INDEX = Object.fromEntries(WO_STAGES.map((s, i) => [s.key, i])) as Record<WoStageKey, number>;

export type InvoiceStatus = "received" | "approved" | "paid";
export interface Invoice {
  number: string;
  amount: number;
  receivedAt: string;
  dueDate: string;
  status: InvoiceStatus;
}
export interface WorkOrder {
  id: string; // "11377-3"
  ticketId: string;
  buildingId: string;
  vendorCode: string;
  vendorName: string;
  vendorGrade: number;
  amount: number;
  scope: string;
  po: string; // PO ref
  window?: string;
  stage: WoStageKey;
  invoice?: Invoice;
  log: [at: string, actor: string, text: string][];
}

// per-building work-order base numbers (5-digit, stable & distinct)
export const WO_BASE: Record<string, number> = {
  b1: 10180, b2: 10412, b3: 10590, b4: 10773, b5: 10961, b6: 11377, b7: 11588, b8: 11744,
};

function woStageFromFlow(f: TicketFlow): WoStageKey {
  switch (f.stage) {
    case "closed": return "closed";
    case "review": return "completed";
    case "inprogress": return "onsite";
    case "scheduled": return "scheduled";
    default: return "awarded";
  }
}

function stamp(d: number, h: number): string {
  return addDaysISO(-d) + " " + String(8 + h).padStart(2, "0") + ":" + String((h * 7) % 6 * 10).padStart(2, "0");
}

/** build a deterministic work order from an awarded ticket. */
export function deriveWorkOrder(t: Ticket, f: TicketFlow, seq: number): WorkOrder {
  const base = WO_BASE[t.building] ?? 10000;
  const id = `${base}-${seq}`;
  const vendorName = f.awarded?.vendor || t.vendor || "Unassigned";
  const vendor = vendorByName(vendorName);
  const amount = f.awarded?.amount ?? f.estimate;
  const stage = woStageFromFlow(f);
  const owner = t.assignee || "luke";
  const si = WO_STAGE_INDEX[stage];

  const log: WorkOrder["log"][number][] = [
    [stamp(5, 1), owner, `Awarded to ${vendorName} (${vendor?.code ?? "—"}) · ${"$" + amount.toLocaleString()}`],
    [stamp(5, 1), owner, `Work order ${id} issued · PO ${"PO-" + id}`],
  ];
  if (si >= WO_STAGE_INDEX.dispatched) log.push([stamp(4, 2), owner, `Dispatched to ${vendorName} — sent scope, access notes & window`]);
  if (si >= WO_STAGE_INDEX.scheduled) log.push([stamp(3, 3), vendorName, `Vendor confirmed visit window`]);
  if (si >= WO_STAGE_INDEX.onsite) log.push([stamp(1, 1), vendorName, `Crew on site — work underway`]);
  if (si >= WO_STAGE_INDEX.completed) log.push([stamp(1, 4), owner, `Work verified complete on walkthrough`]);

  let invoice: Invoice | undefined;
  if (si >= WO_STAGE_INDEX.completed) {
    const istatus: InvoiceStatus = si >= WO_STAGE_INDEX.paid ? "paid" : si >= WO_STAGE_INDEX.invoiced ? "approved" : "received";
    invoice = { number: "INV-" + id, amount, receivedAt: addDaysISO(-1), dueDate: addDaysISO(28), status: istatus };
    log.push([stamp(0, 1), owner, `Invoice ${invoice.number} received · ${"$" + amount.toLocaleString()}`]);
    if (si >= WO_STAGE_INDEX.paid) log.push([stamp(0, 4), owner, `Payment released · ${invoice.number} marked paid`]);
  }

  return {
    id, ticketId: t.id, buildingId: t.building,
    vendorCode: vendor?.code ?? "—", vendorName, vendorGrade: vendor?.grade ?? f.awarded?.grade ?? 0,
    amount, scope: f.awarded?.scope || "Per ticket scope", po: "PO-" + id, window: f.vendor?.window,
    stage, invoice, log,
  };
}

/** pre-seed work orders for every already-awarded ticket, with stable per-
 *  building sequence numbers (sorted by ticket id so they're deterministic). */
export function seedWorkOrders(tickets: Ticket[], flowOf: (t: Ticket) => TicketFlow): Record<string, WorkOrder> {
  const map: Record<string, WorkOrder> = {};
  const seqByB: Record<string, number> = {};
  const ordered = [...tickets].sort((a, b) => a.id.localeCompare(b.id));
  for (const t of ordered) {
    const f = flowOf(t);
    if (!f.awarded) continue;
    seqByB[t.building] = (seqByB[t.building] || 0) + 1;
    map[t.id] = deriveWorkOrder(t, f, seqByB[t.building]);
  }
  return map;
}

export const buildingName = (id: string) => BUILDINGS.find((b) => b.id === id)?.name ?? id;
export const actorName = (id: string) => PEOPLE[id]?.name ?? id;
