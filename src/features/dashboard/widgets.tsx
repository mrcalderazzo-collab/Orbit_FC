// widgets.tsx — the role-dashboard widget library. Each widget is self-contained
// (reads live state via useOrbit), scoped to the buildings passed in, and drills
// in on click — straight to the tickets, finance, vendors, reports, etc. that the
// number represents. RoleDashboard composes these per position.
import type { ReactNode } from "react";
import type { Building, Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { attentionOf, ATTENTION_META } from "@/lib/attention";
import { ticketFlow } from "@/data/flow";
import { VENDORS, coiStatus } from "@/data/vendors";
import { BUILDING_SYSTEMS } from "@/data/buildings";
import { complianceItems } from "@/data/governance";
import { occupancyOf, leasingFunnel, applicationsTrend, marketingSources, waitlist } from "@/data/leasing";
import { slaReport, staffPerformance, bottlenecks } from "@/data/reports";
import { fmtMoney } from "@/lib/format";
import { Glass, Icon } from "@/components/ui";
import { LineArea, HBars } from "@/components/ui/Charts";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export interface WProps { buildings: Building[] }
type WidgetDef = { id: string; w?: 1 | 2; render: (p: WProps) => ReactNode };

// ── card shell ─────────────────────────────────────────────────────────────
function Card({ title, icon, accent = "var(--acc)", onOpen, children }: { title: string; icon: string; accent?: string; onOpen?: () => void; children: ReactNode }) {
  return (
    <Glass style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <button onClick={onOpen} disabled={!onOpen} style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 15px", border: "none", borderBottom: "1px solid var(--hair-2)", background: "transparent", cursor: onOpen ? "pointer" : "default", textAlign: "left", width: "100%" }}>
        <Icon name={icon} size={15} color={accent} />
        <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{title}</span>
        {onOpen && <Icon name="arrow-up-right" size={15} color="var(--ink-4)" />}
      </button>
      <div style={{ padding: 15, flex: 1 }}>{children}</div>
    </Glass>
  );
}

function Big({ value, label, color = "var(--ink)" }: { value: ReactNode; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, lineHeight: 1, color, letterSpacing: "-0.6px" }}>{value}</span>
      <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function Trio({ items }: { items: { value: ReactNode; label: string; color?: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontFamily: SANS, fontSize: 21, fontWeight: 600, lineHeight: 1, color: it.color || "var(--ink)" }}>{it.value}</span>
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "var(--ink-4)", textTransform: "uppercase" }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

const scopedTickets = (tickets: Ticket[], buildings: Building[]) => {
  const ids = new Set(buildings.map((b) => b.id));
  return tickets.filter((t) => ids.has(t.building) && !t.mergedInto);
};

// ── widgets ──────────────────────────────────────────────────────────────────
function Attention({ buildings }: WProps) {
  const { tickets, nav, openCommand } = useOrbit();
  const items = scopedTickets(tickets, buildings)
    .filter((t) => t.status !== "Closed")
    .map((t) => ({ t, a: attentionOf(t, ticketFlow(t)) }))
    .filter((x) => ["atRisk", "escalated", "blocked", "needsAction"].includes(x.a))
    .slice(0, 5);
  return (
    <Card title="Needs attention" icon="radar" accent="#ef4444" onOpen={() => nav("tickets")}>
      {items.length === 0 ? <Empty label="All clear" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map(({ t, a }) => {
            const m = ATTENTION_META[a];
            return (
              <button key={t.id} onClick={() => openCommand(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", border: "none", borderBottom: "1px solid var(--hair)", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 8, color: "var(--ink-4)" }}>{t.id} · {m.short}</span>
                </span>
                <Icon name="chevron-right" size={15} color="var(--ink-4)" />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Tickets({ buildings }: WProps) {
  const { tickets, nav } = useOrbit();
  const ts = scopedTickets(tickets, buildings);
  const open = ts.filter((t) => t.status !== "Closed");
  const late = open.filter((t) => ticketFlow(t).sla.breached).length;
  const emerg = open.filter((t) => t.prio === "Critical").length;
  return (
    <Card title="Service requests" icon="ticket" onOpen={() => nav("tickets")}>
      <Trio items={[
        { value: open.length, label: "Open" },
        { value: late, label: "Late / SLA", color: late ? "#f59e0b" : "var(--ink)" },
        { value: emerg, label: "Emergency", color: emerg ? "#ef4444" : "var(--ink)" },
      ]} />
    </Card>
  );
}

function Sla({ buildings }: WProps) {
  const { tickets, nav } = useOrbit();
  const ids = new Set(buildings.map((b) => b.id));
  const s = slaReport(tickets.filter((t) => ids.has(t.building)));
  return (
    <Card title="SLA performance" icon="timer" accent="#22c55e" onOpen={() => nav("reports")}>
      <Big value={s.withinPct + "%"} label="within SLA" color={s.withinPct >= 80 ? "#22c55e" : "#f59e0b"} />
      <div style={{ marginTop: 12 }}>
        <HBars rows={s.byPriority.map((p) => ({ label: p.priority, value: p.withinPct, color: p.withinPct >= 80 ? "#22c55e" : p.withinPct >= 50 ? "#f59e0b" : "#ef4444" }))} fmt={(n) => n + "%"} />
      </div>
    </Card>
  );
}

function Finance({ buildings }: WProps) {
  const { workOrders, nav } = useOrbit();
  const ids = new Set(buildings.map((b) => b.id));
  const wos = Object.values(workOrders).filter((w) => ids.has(w.buildingId));
  const invoiced = wos.reduce((a, w) => a + (w.invoice?.amount ?? 0), 0);
  const paid = wos.reduce((a, w) => a + (w.invoice && w.invoice.status === "paid" ? w.invoice.amount : 0), 0);
  const noi = buildings.reduce((a, b) => a + (b.monthlyIncome - b.monthlyExpense), 0);
  return (
    <Card title="Finance" icon="circle-dollar-sign" accent="#22c55e" onOpen={() => nav("finance")}>
      <Trio items={[
        { value: fmtMoney(invoiced - paid), label: "Outstanding AP", color: "#f59e0b" },
        { value: fmtMoney(noi), label: "Monthly NOI", color: "#22c55e" },
        { value: fmtMoney(buildings.reduce((a, b) => a + b.reserve, 0)), label: "Reserves" },
      ]} />
    </Card>
  );
}

function Health({ buildings }: WProps) {
  const { nav } = useOrbit();
  const rows = buildings.map((b) => {
    const sys = BUILDING_SYSTEMS.filter((s) => s.buildingId === b.id);
    const health = sys.length ? Math.round(sys.reduce((a, s) => a + s.health, 0) / sys.length) : 0;
    return { label: b.name, value: health, color: health >= 85 ? "#22c55e" : health >= 70 ? "#f59e0b" : "#ef4444" };
  }).sort((a, b) => a.value - b.value).slice(0, 6);
  return (
    <Card title="Building health" icon="activity" onOpen={() => nav("buildings")}>
      <HBars rows={rows} fmt={(n) => n + "%"} />
    </Card>
  );
}

function Compliance({ buildings }: WProps) {
  const { nav } = useOrbit();
  const all = buildings.flatMap((b) => complianceItems(b.id));
  const overdue = all.filter((c) => c.status === "Overdue").length;
  const action = all.filter((c) => c.status === "Action needed").length;
  const upcoming = all.filter((c) => c.status === "Upcoming").length;
  return (
    <Card title="Compliance · local law" icon="clipboard-check" accent="#f59e0b" onOpen={() => nav("buildings")}>
      <Trio items={[
        { value: overdue, label: "Overdue", color: overdue ? "#ef4444" : "#22c55e" },
        { value: action, label: "Action needed", color: action ? "#f59e0b" : "var(--ink)" },
        { value: upcoming, label: "Upcoming", color: "#3b82f6" },
      ]} />
    </Card>
  );
}

function Vendors() {
  const { nav } = useOrbit();
  const expiring = VENDORS.filter((v) => coiStatus(v).status !== "valid");
  const top = [...VENDORS].sort((a, b) => b.grade - a.grade)[0];
  return (
    <Card title="Vendors · COI" icon="wrench" accent="#f59e0b" onOpen={() => nav("vendors")}>
      <Trio items={[
        { value: expiring.length, label: "COI expiring/expired", color: expiring.length ? "#f59e0b" : "#22c55e" },
        { value: VENDORS.length, label: "Active vendors" },
      ]} />
      <div style={{ marginTop: 12, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)" }}>Top grade · <b style={{ color: "var(--ink)" }}>{top.name}</b> ({top.grade})</div>
    </Card>
  );
}

function Occupancy({ buildings }: WProps) {
  const { nav } = useOrbit();
  const all = buildings.map((b) => occupancyOf(b.id));
  const units = all.reduce((a, o) => a + o.units, 0);
  const leased = all.reduce((a, o) => a + o.leased, 0);
  const vacant = all.reduce((a, o) => a + o.vacant, 0);
  const avail = all.reduce((a, o) => a + o.available, 0);
  const intent = all.reduce((a, o) => a + o.intentToVacate, 0);
  const leasedPct = units ? ((leased / units) * 100).toFixed(1) : "0";
  return (
    <Card title={"Occupancy · " + units + " units"} icon="home" accent="#3b82f6" onOpen={() => nav("buildings")}>
      <Big value={leasedPct + "%"} label="leased" color="#22c55e" />
      <div style={{ marginTop: 12 }}>
        <Trio items={[
          { value: avail, label: "Available", color: "#3b82f6" },
          { value: vacant, label: "Vacant", color: "#f59e0b" },
          { value: intent, label: "Intent to vacate", color: "#a855f7" },
        ]} />
      </div>
    </Card>
  );
}

function Turnaround({ buildings }: WProps) {
  const { nav } = useOrbit();
  const all = buildings.map((b) => occupancyOf(b.id));
  const avg = all.length ? Math.round(all.reduce((a, o) => a + o.turnaroundDays, 0) / all.length) : 0;
  return (
    <Card title="Unit turnaround" icon="refresh-cw" accent="#3b82f6" onOpen={() => nav("buildings")}>
      <Big value={avg + "d"} label="avg days to turn" color={avg <= 5 ? "#22c55e" : "#f59e0b"} />
    </Card>
  );
}

function Leasing() {
  const { nav } = useOrbit();
  const f = leasingFunnel();
  const stages: { label: string; value: number }[] = [
    { label: "Leads", value: f.leads }, { label: "Tours", value: f.tours }, { label: "Applications", value: f.applications }, { label: "Approved", value: f.approved }, { label: "Leased", value: f.leased },
  ];
  return (
    <Card title="Leasing pipeline" icon="trending-up" accent="#06b6d4" onOpen={() => nav("buildings")}>
      <HBars rows={stages.map((s) => ({ label: s.label, value: s.value, color: "#06b6d4" }))} />
      <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)" }}>Lead → lease conversion <b style={{ color: "var(--ink)" }}>{Math.round((f.leased / f.leads) * 100)}%</b></div>
    </Card>
  );
}

function Marketing() {
  const { nav } = useOrbit();
  const sources = marketingSources();
  return (
    <Card title="Marketing sources" icon="megaphone" accent="#f472b6" onOpen={() => nav("buildings")}>
      <HBars rows={sources.map((s) => ({ label: s.source, value: s.leads, color: "#f472b6" }))} />
    </Card>
  );
}

function Applications() {
  const { nav } = useOrbit();
  const trend = applicationsTrend();
  const wl = waitlist();
  const totalWl = wl.reduce((a, w) => a + w.active + w.inProcess + w.prequalified, 0);
  return (
    <Card title="Applications & waitlist" icon="user-plus" accent="#06b6d4" onOpen={() => nav("buildings")}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
        <Big value={trend.reduce((a, t) => a + t.value, 0)} label="apps · trailing yr" />
        <Big value={totalWl} label="on waitlist" color="#06b6d4" />
      </div>
      <LineArea points={trend.map((t) => t.value)} labels={trend.map((t) => t.month)} color="#06b6d4" height={110} />
    </Card>
  );
}

function Spend({ buildings }: WProps) {
  const { workOrders, nav } = useOrbit();
  const rows = buildings.map((b) => ({ label: b.name, value: Object.values(workOrders).filter((w) => w.buildingId === b.id).reduce((a, w) => a + w.amount, 0), color: b.mono }))
    .filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  return (
    <Card title="Spend by building" icon="receipt" accent="#22c55e" onOpen={() => nav("finance")}>
      {rows.length ? <HBars rows={rows} fmt={fmtMoney} /> : <Empty label="No spend recorded" />}
    </Card>
  );
}

function Staff() {
  const { tickets, nav } = useOrbit();
  const rows = staffPerformance(tickets);
  return (
    <Card title="Team load & utilization" icon="users" onOpen={() => nav("reports")}>
      <HBars rows={rows.map((r) => ({ label: r.member, value: r.utilizationPct, color: r.utilizationPct > 90 ? "#ef4444" : r.utilizationPct > 70 ? "#22c55e" : "#f59e0b" }))} fmt={(n) => n + "%"} />
    </Card>
  );
}

function Recs() {
  const { recs, nav } = useOrbit();
  const pending = recs.filter((r) => r.status === "pending");
  return (
    <Card title="AI recommendations" icon="brain-circuit" accent="#a855f7" onOpen={() => nav("ai")}>
      <Big value={pending.length} label="awaiting your decision" color="#a855f7" />
      {pending[0] && <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{pending[0].rec}</div>}
    </Card>
  );
}

function Bottlenecks() {
  const { tickets, nav } = useOrbit();
  const b = bottlenecks(tickets);
  return (
    <Card title="Where work piles up" icon="git-branch" accent="#f59e0b" onOpen={() => nav("reports")}>
      <HBars rows={b.stages.map((s) => ({ label: s.status, value: s.avgAgeDays, color: s.avgAgeDays > 7 ? "#ef4444" : s.avgAgeDays > 3 ? "#f59e0b" : "#22c55e" }))} fmt={(n) => n + "d"} />
      {b.unowned > 0 && <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 11.5, color: "#ef4444" }}>{b.unowned} unowned ticket{b.unowned > 1 ? "s" : ""} need an owner.</div>}
    </Card>
  );
}

function Emergencies() {
  const { tickets, nav } = useOrbit();
  const crit = tickets.filter((t) => t.prio === "Critical" && t.status !== "Closed").length;
  return (
    <Card title="Emergency desk" icon="siren" accent="#ef4444" onOpen={() => nav("emergencies")}>
      <Trio items={[{ value: crit, label: "Active critical", color: crit ? "#ef4444" : "#22c55e" }, { value: 2, label: "Potential", color: "#f59e0b" }]} />
    </Card>
  );
}

function Comms({ buildings }: WProps) {
  const { tickets, nav } = useOrbit();
  const awaiting = scopedTickets(tickets, buildings).filter((t) => attentionOf(t, ticketFlow(t)) === "waitingExternal").length;
  return (
    <Card title="Communications" icon="messages-square" accent="#3b82f6" onOpen={() => nav("comms")}>
      <Big value={awaiting} label="awaiting reply" color={awaiting ? "#f59e0b" : "var(--ink)"} />
    </Card>
  );
}

function MyBuildings({ buildings }: WProps) {
  const { tickets, nav } = useOrbit();
  return (
    <Card title="My buildings" icon="building-2" onOpen={() => nav("buildings")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {buildings.map((b) => {
          const open = tickets.filter((t) => t.building === b.id && t.status !== "Closed" && !t.mergedInto).length;
          return (
            <button key={b.id} onClick={() => nav("buildings", b.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", border: "none", borderBottom: "1px solid var(--hair)", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: b.mono, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: open ? "#f59e0b" : "var(--ink-4)" }}>{open} open</span>
              <Icon name="chevron-right" size={14} color="var(--ink-4)" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return <div style={{ padding: "14px 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>;
}

// ── registry ─────────────────────────────────────────────────────────────────
export const WIDGETS: Record<string, WidgetDef> = {
  attention: { id: "attention", w: 2, render: (p) => <Attention {...p} /> },
  tickets: { id: "tickets", render: (p) => <Tickets {...p} /> },
  sla: { id: "sla", render: (p) => <Sla {...p} /> },
  finance: { id: "finance", w: 2, render: (p) => <Finance {...p} /> },
  health: { id: "health", render: (p) => <Health {...p} /> },
  compliance: { id: "compliance", render: (p) => <Compliance {...p} /> },
  vendors: { id: "vendors", render: () => <Vendors /> },
  occupancy: { id: "occupancy", render: (p) => <Occupancy {...p} /> },
  turnaround: { id: "turnaround", render: (p) => <Turnaround {...p} /> },
  leasing: { id: "leasing", render: () => <Leasing /> },
  marketing: { id: "marketing", render: () => <Marketing /> },
  applications: { id: "applications", w: 2, render: () => <Applications /> },
  spend: { id: "spend", render: (p) => <Spend {...p} /> },
  staff: { id: "staff", render: () => <Staff /> },
  recs: { id: "recs", render: () => <Recs /> },
  bottlenecks: { id: "bottlenecks", render: () => <Bottlenecks /> },
  emergencies: { id: "emergencies", render: () => <Emergencies /> },
  comms: { id: "comms", render: (p) => <Comms {...p} /> },
  myBuildings: { id: "myBuildings", render: (p) => <MyBuildings {...p} /> },
};

export type { WidgetDef };
