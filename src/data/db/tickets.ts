// db/tickets.ts — REFERENCE data-access module: the template for swapping a store
// action from in-memory to Supabase. Every mutation also appends to ticket_events
// (the audit spine). All calls are gated by isSupabaseConfigured; the OrbitProvider
// action keeps its in-memory path until we flip each one to call these.
//
// Migration pattern, per action:
//   const createTicket = async (data) =>
//     isSupabaseConfigured ? db.createTicket(data) : <existing in-memory logic>;
import { requireSupabase } from "@/lib/supabase";

export interface TicketRow {
  id: string;
  org_id: string;
  building_id: string;
  unit_id: string | null;
  ref: string | null;
  title: string;
  description: string | null;
  type: string | null;
  category: string | null;
  prio: "Critical" | "High" | "Normal" | "Low";
  status: "Open" | "Assigned" | "In progress" | "Awaiting review" | "Closed";
  assignee_user_id: string | null;
  requester: string | null;
  vendor_id: string | null;
  team: string | null;
  held: { reason: string; at: string } | null;
  held_ms: number;
  escalate_at: string | null;
  work_date: string | null;
  created_at: string;
}

/** all tickets the signed-in user may see (RLS filters to their portfolio). */
export async function listTickets(): Promise<TicketRow[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("tickets").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TicketRow[];
}

export async function createTicket(input: {
  org_id: string; building_id: string; title: string; type?: string; category?: string;
  prio?: TicketRow["prio"]; requester?: string; description?: string; team?: string;
}): Promise<TicketRow> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("tickets").insert({ ...input, status: "Open" }).select().single();
  if (error) throw error;
  const row = data as TicketRow;
  await logEvent({ org_id: row.org_id, building_id: row.building_id, entity_type: "ticket", entity_id: row.id, kind: "ticket.created", summary: "Created · " + row.title });
  return row;
}

export async function setStatus(id: string, status: TicketRow["status"]): Promise<void> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("tickets").update({ status, verified: status === "Closed" }).eq("id", id).select("org_id,building_id,title").single();
  if (error) throw error;
  await logEvent({ org_id: data.org_id, building_id: data.building_id, entity_type: "ticket", entity_id: id, kind: "ticket.status", summary: "Status → " + status });
}

export async function assign(id: string, assignee_user_id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("tickets").update({ assignee_user_id, status: "Assigned" }).eq("id", id);
  if (error) throw error;
}

export async function route(id: string, team: string): Promise<void> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("tickets").update({ team }).eq("id", id).select("org_id,building_id").single();
  if (error) throw error;
  await logEvent({ org_id: data.org_id, building_id: data.building_id, entity_type: "ticket", entity_id: id, kind: "ticket.routed", summary: "Routed → " + team });
}

/** subscribe to live ticket changes (Supabase Realtime) — powers the live board. */
export function subscribeTickets(onChange: () => void): () => void {
  const sb = requireSupabase();
  const ch = sb.channel("tickets-stream")
    .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, onChange)
    .subscribe();
  return () => { sb.removeChannel(ch); };
}

/** append-only audit event — every meaningful mutation writes one. */
export async function logEvent(e: { org_id: string; building_id: string | null; entity_type: string; entity_id: string; kind: string; summary: string }): Promise<void> {
  const sb = requireSupabase();
  await sb.from("ticket_events").insert(e);
}
