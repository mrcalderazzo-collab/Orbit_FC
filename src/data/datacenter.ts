// datacenter.ts — operational "actions" the Data Center generates: offload plans,
// quick wins, stale audits, capacity, pattern detection, cost intelligence and
// building personalities. Pure functions over live tickets + work orders; each
// returns a short summary + a table (reused for display and CSV export).
import type { Ticket } from "@/lib/types";
import type { WorkOrder } from "@/data/workorders";
import type { ReportTable } from "@/data/reports";
import { ticketFlow } from "./flow";
import { BUILDINGS, PEOPLE, buildingById } from "./seed";
import { BUILDING_SYSTEMS } from "./buildings";

const NOW = new Date("2026-06-15T12:00:00").getTime();
const ageDays = (iso: string) => Math.max(0, Math.round((NOW - new Date(iso).getTime()) / 864e5));
const bn = (id: string) => buildingById(id)?.name ?? id;
const open = (tickets: Ticket[]) => tickets.filter((t) => t.status !== "Closed" && !t.mergedInto);

export interface DCResult { summary: string; table: ReportTable }

export function quickWins(tickets: Ticket[]): DCResult {
  const rows = open(tickets)
    .filter((t) => (t.prio === "Low" || t.prio === "Normal") && !ticketFlow(t).requiresVote && t.status !== "Awaiting review")
    .sort((a, b) => ageDays(b.created) - ageDays(a.created))
    .slice(0, 12)
    .map((t) => ({ id: t.id, title: t.title, building: bn(t.building), type: t.type, age: ageDays(t.created) + "d" }));
  return { summary: rows.length + " tickets look closeable today — low priority, no board vote, not already in review.", table: { columns: [{ key: "id", label: "Ticket" }, { key: "title", label: "Title" }, { key: "building", label: "Building" }, { key: "type", label: "Type" }, { key: "age", label: "Age", align: "right" }], rows } };
}

export function staleAudit(tickets: Ticket[]): DCResult {
  const rows = open(tickets)
    .filter((t) => ageDays(t.created) >= 10)
    .sort((a, b) => ageDays(b.created) - ageDays(a.created))
    .map((t) => ({ id: t.id, title: t.title, building: bn(t.building), owner: t.assignee ? PEOPLE[t.assignee]?.name ?? t.assignee : "Unowned", age: ageDays(t.created) + "d" }));
  return { summary: rows.length + " open tickets have gone 10+ days — review, nudge, or close.", table: { columns: [{ key: "id", label: "Ticket" }, { key: "title", label: "Title" }, { key: "building", label: "Building" }, { key: "owner", label: "Owner" }, { key: "age", label: "Age", align: "right" }], rows } };
}

export function offloadPlan(tickets: Ticket[]): DCResult {
  const rows = open(tickets)
    .filter((t) => !t.assignee || t.assignee === "nick")
    .map((t) => {
      const field = t.type === "Maintenance" || t.type === "Facility";
      const to = field ? "Diego Ramos (Field)" : t.type === "Finance" || t.type === "Documents" ? "Priya Anand (Compliance)" : "Owen Frey (Coordinator)";
      return { id: t.id, title: t.title, building: bn(t.building), suggested: to };
    })
    .slice(0, 14);
  return { summary: rows.length + " tickets can come off your plate — routed by trade to the right teammate.", table: { columns: [{ key: "id", label: "Ticket" }, { key: "title", label: "Title" }, { key: "building", label: "Building" }, { key: "suggested", label: "Offload to" }], rows } };
}

export function patternDetection(tickets: Ticket[]): DCResult {
  const map: Record<string, { building: string; type: string; n: number }> = {};
  open(tickets).forEach((t) => {
    const k = t.building + "|" + (t.category || t.type);
    (map[k] ||= { building: bn(t.building), type: t.category || t.type, n: 0 }).n++;
  });
  const rows = Object.values(map).filter((g) => g.n >= 2).sort((a, b) => b.n - a.n)
    .map((g) => ({ building: g.building, issue: g.type, count: g.n, flag: g.n >= 3 ? "Systemic" : "Watch" }));
  return { summary: rows.length + " building+issue clusters are recurring — " + rows.filter((r) => r.flag === "Systemic").length + " look systemic (3+).", table: { columns: [{ key: "building", label: "Building" }, { key: "issue", label: "Issue type" }, { key: "count", label: "Count", align: "right" }, { key: "flag", label: "Flag", align: "right" }], rows } };
}

export function capacityPlan(tickets: Ticket[]): DCResult {
  const team = ["nick", "luke", "cait", "gidi", "maura"];
  const rows = team.map((id) => {
    const load = open(tickets).filter((t) => t.assignee === id).length;
    const cap = Math.max(0, 12 - load);
    return { member: PEOPLE[id].name, role: PEOPLE[id].role, openLoad: load, capacity: cap, status: cap <= 1 ? "At capacity" : cap >= 6 ? "Can take more" : "Steady" };
  }).sort((a, b) => b.capacity - a.capacity);
  return { summary: rows.filter((r) => r.status === "Can take more").map((r) => r.member.split(" ")[0]).join(", ") + " have room; assign new work there first.", table: { columns: [{ key: "member", label: "Member" }, { key: "role", label: "Role" }, { key: "openLoad", label: "Open", align: "right" }, { key: "capacity", label: "Capacity", align: "right" }, { key: "status", label: "Status", align: "right" }], rows } };
}

export function costIntelligence(workOrders: WorkOrder[]): DCResult {
  const byB: Record<string, number> = {};
  workOrders.forEach((w) => { byB[w.buildingId] = (byB[w.buildingId] || 0) + w.amount; });
  const rows = BUILDINGS.map((b) => ({ building: b.name, spend: byB[b.id] || 0 }))
    .filter((r) => r.spend > 0).sort((a, b) => b.spend - a.spend)
    .map((r) => ({ building: r.building, spend: "$" + r.spend.toLocaleString(), flag: r.spend > 60000 ? "Money pit" : "" }));
  const total = Object.values(byB).reduce((a, c) => a + c, 0);
  return { summary: "$" + total.toLocaleString() + " committed across " + rows.length + " buildings. Top spender flagged as a money pit.", table: { columns: [{ key: "building", label: "Building" }, { key: "spend", label: "Committed", align: "right" }, { key: "flag", label: "Flag", align: "right" }], rows } };
}

export function buildingPersonalities(tickets: Ticket[]): DCResult {
  const rows = BUILDINGS.map((b) => {
    const ts = open(tickets).filter((t) => t.building === b.id);
    const types: Record<string, number> = {};
    ts.forEach((t) => { types[t.type] = (types[t.type] || 0) + 1; });
    const top = Object.entries(types).sort((a, c) => c[1] - a[1])[0];
    const sys = BUILDING_SYSTEMS.filter((s) => s.buildingId === b.id);
    const health = sys.length ? Math.round(sys.reduce((a, s) => a + s.health, 0) / sys.length) : 0;
    const persona = health < 70 ? "High-touch" : ts.length === 0 ? "Quiet" : top && top[1] >= 3 ? "Recurring " + top[0].toLowerCase() : "Steady";
    return { building: b.name, openWork: ts.length, leanIssue: top ? top[0] : "—", health: health + "%", personality: persona };
  }).sort((a, b) => b.openWork - a.openWork);
  return { summary: "Per-building profile — open load, the issue type each leans toward, systems health, and a personality read.", table: { columns: [{ key: "building", label: "Building" }, { key: "openWork", label: "Open", align: "right" }, { key: "leanIssue", label: "Leans toward" }, { key: "health", label: "Health", align: "right" }, { key: "personality", label: "Personality", align: "right" }], rows } };
}
