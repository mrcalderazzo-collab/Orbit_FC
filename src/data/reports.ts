// reports.ts — analytics derivations for the operator Reports center. Pure
// functions over live tickets + seed data; satisfaction / pricing / labor rates
// are seeded synth (deterministic) standing in for real survey/AP/HR feeds.
import type { Ticket } from "@/lib/types";
import { rng, seed } from "@/lib/format";
import { BUILDINGS, PEOPLE, buildingById } from "./seed";
import { ticketFlow } from "./flow";
import { VENDORS, coiStatus } from "./vendors";
import { BUILDING_SYSTEMS } from "./buildings";

const NOW = Date.now();
const ageDays = (iso: string) => Math.max(0, Math.round((NOW - new Date(iso).getTime()) / 864e5));
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export interface ReportColumn { key: string; label: string; align?: "right" }
export interface ReportTable { columns: ReportColumn[]; rows: Record<string, string | number>[] }

// ── vendor performance ───────────────────────────────────────────────────
export function vendorPerformance() {
  const rows = VENDORS.map((v) => {
    const coi = coiStatus(v);
    const onTime = Math.min(99, Math.round(v.grade * 0.9 + (v.rating - 4) * 8));
    return { vendor: v.name, grade: v.grade, rating: v.rating, jobs: v.jobs, responseHrs: v.responseHrs, onTimePct: onTime, coi: coi.status };
  }).sort((a, b) => b.grade - a.grade);
  return rows;
}

// ── vendor pricing (vs market) ─────────────────────────────────────────────
export function vendorPricing() {
  return VENDORS.map((v) => {
    const r = rng(seed(v.id + "price"));
    const vsMarket = Math.round((r() * 28 - 12)); // -12%..+16%
    const avgTicket = Math.round((2000 + r() * 40000) / 100) * 100;
    return { vendor: v.name, trades: v.trades[0], avgTicket, vsMarketPct: vsMarket, jobs: v.jobs };
  }).sort((a, b) => a.vsMarketPct - b.vsMarketPct);
}

// ── satisfaction (CSAT residents / TSAT team) ──────────────────────────────
export function satisfaction(tickets: Ticket[]) {
  const byBuilding = BUILDINGS.map((b) => {
    const r = rng(seed(b.id + "csat"));
    const open = tickets.filter((t) => t.building === b.id && t.status !== "Closed").length;
    const csat = Math.max(62, Math.min(98, Math.round(90 - open * 1.2 + (r() * 10 - 5))));
    return { building: b.name, csat, responses: 20 + Math.floor(r() * 80) };
  });
  const csat = Math.round(byBuilding.reduce((a, x) => a + x.csat, 0) / byBuilding.length);
  const team = ["nick", "luke", "cait", "gidi", "maura"].map((id) => {
    const r = rng(seed(id + "tsat"));
    return { member: PEOPLE[id].name, tsat: 78 + Math.floor(r() * 20) };
  });
  const tsat = Math.round(team.reduce((a, x) => a + x.tsat, 0) / team.length);
  return { csat, tsat, byBuilding, team };
}

// ── SLA ────────────────────────────────────────────────────────────────────
export function slaReport(tickets: Ticket[]) {
  const active = tickets.filter((t) => t.status !== "Closed" && !t.mergedInto);
  let breached = 0, within = 0;
  const prio: Record<string, { w: number; t: number }> = {};
  active.forEach((t) => {
    const f = ticketFlow(t);
    (prio[t.prio] ||= { w: 0, t: 0 }).t++;
    if (f.sla.breached) breached++; else { within++; prio[t.prio].w++; }
  });
  const byPriority = Object.entries(prio).map(([p, v]) => ({ priority: p, withinPct: pct(v.w, v.t), count: v.t }));
  const byBuilding = BUILDINGS.map((b) => {
    const ts = active.filter((t) => t.building === b.id);
    const w = ts.filter((t) => !ticketFlow(t).sla.breached).length;
    return { building: b.name, withinPct: pct(w, ts.length), open: ts.length };
  }).filter((x) => x.open > 0);
  return { total: active.length, breached, withinPct: pct(within, active.length), byPriority, byBuilding };
}

// ── preventative vs reactive ───────────────────────────────────────────────
export function preventative() {
  const sys = BUILDING_SYSTEMS;
  const healthy = sys.filter((s) => s.state === "healthy").length;
  const dueSoon = sys.filter((s) => { const d = Math.round((new Date(s.nextService).getTime() - NOW) / 864e5); return d <= 21; }).length;
  const byKind: Record<string, { n: number; h: number }> = {};
  sys.forEach((s) => { (byKind[s.kind] ||= { n: 0, h: 0 }); byKind[s.kind].n++; byKind[s.kind].h += s.health; });
  const kinds = Object.entries(byKind).map(([kind, v]) => ({ kind, avgHealth: Math.round(v.h / v.n), count: v.n })).sort((a, b) => a.avgHealth - b.avgHealth);
  const r = rng(seed("preventive"));
  const preventiveRatio = 58 + Math.floor(r() * 18);
  return { healthyPct: pct(healthy, sys.length), dueSoon, preventiveRatio, kinds, total: sys.length };
}

// ── ticket bottlenecks ─────────────────────────────────────────────────────
export function bottlenecks(tickets: Ticket[]) {
  const active = tickets.filter((t) => t.status !== "Closed" && !t.mergedInto);
  const byStatus: Record<string, { count: number; age: number }> = {};
  active.forEach((t) => { (byStatus[t.status] ||= { count: 0, age: 0 }); byStatus[t.status].count++; byStatus[t.status].age += ageDays(t.created); });
  const stages = Object.entries(byStatus).map(([status, v]) => ({ status, count: v.count, avgAgeDays: Math.round(v.age / v.count) }));
  const oldest = [...active].map((t) => ({ id: t.id, title: t.title, status: t.status, ageDays: ageDays(t.created), owner: t.assignee ? PEOPLE[t.assignee]?.name ?? t.assignee : "Unowned" })).sort((a, b) => b.ageDays - a.ageDays).slice(0, 6);
  const unowned = active.filter((t) => !t.assignee).length;
  return { stages, oldest, unowned, total: active.length };
}

// ── staff performance ──────────────────────────────────────────────────────
export function staffPerformance(tickets: Ticket[]) {
  const team = ["nick", "luke", "cait", "gidi", "maura"];
  return team.map((id) => {
    const r = rng(seed(id + "perf"));
    const assigned = tickets.filter((t) => t.assignee === id);
    const open = assigned.filter((t) => t.status !== "Closed").length;
    const closed = assigned.filter((t) => t.status === "Closed").length + Math.floor(r() * 30 + 8);
    const avgRespHrs = +(1 + r() * 6).toFixed(1);
    const rate = [165, 95, 120, 110, 110][team.indexOf(id)] ?? 100;
    const utilization = 62 + Math.floor(r() * 32);
    return { member: PEOPLE[id].name, role: PEOPLE[id].role, open, closed, avgRespHrs, rate, utilizationPct: utilization };
  });
}

// ── building health ────────────────────────────────────────────────────────
export function buildingHealth(tickets: Ticket[]) {
  return BUILDINGS.map((b) => {
    const sys = BUILDING_SYSTEMS.filter((s) => s.buildingId === b.id);
    const health = sys.length ? Math.round(sys.reduce((a, s) => a + s.health, 0) / sys.length) : 0;
    const open = tickets.filter((t) => t.building === b.id && t.status !== "Closed").length;
    const compliance = b.compliance === "ok" ? 100 : b.compliance === "review" ? 75 : 50;
    const score = Math.round(health * 0.45 + compliance * 0.3 + Math.max(0, 100 - open * 4) * 0.15 + Math.max(0, 100 - b.delinquency * 600) * 0.1);
    return { building: b.name, score, health, openTickets: open, compliance: b.compliance, delinquencyPct: +(b.delinquency * 100).toFixed(1) };
  }).sort((a, b) => b.score - a.score);
}

export const buildingName = (id: string) => buildingById(id)?.name ?? id;

// ── ticket flow & volume (Analytics) ───────────────────────────────────────
const MON_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function ticketFlowAnalytics(tickets: Ticket[]) {
  const live = tickets.filter((t) => !t.mergedInto);
  const created = live.map((t) => new Date(t.created).getTime());
  // weekly inflow — last 8 weeks
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const w = 7 - i;
    const end = NOW - w * 7 * 864e5;
    const start = end - 7 * 864e5;
    return { label: i === 7 ? "This wk" : "W-" + w, value: created.filter((c) => c > start && c <= end).length };
  });
  // monthly volume — last 6 months
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(NOW);
    d.setMonth(d.getMonth() - (5 - i));
    const y = d.getFullYear(), m = d.getMonth();
    return { label: MON_NAMES[m], value: created.filter((c) => { const cd = new Date(c); return cd.getFullYear() === y && cd.getMonth() === m; }).length };
  });
  // team comparison
  const team = ["nick", "luke", "cait", "gidi", "maura"].map((id) => {
    const mine = live.filter((t) => t.assignee === id && t.status !== "Closed");
    return { member: PEOPLE[id].name, open: mine.length, overdue: mine.filter((t) => ticketFlow(t).sla.breached).length, avgAgeDays: mine.length ? Math.round(mine.reduce((a, t) => a + Math.max(0, (NOW - new Date(t.created).getTime()) / 864e5), 0) / mine.length) : 0 };
  });
  return { weekly, monthly, team, total: live.length, active: live.filter((t) => t.status !== "Closed").length };
}
