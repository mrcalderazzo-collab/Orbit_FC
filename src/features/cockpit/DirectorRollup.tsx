// DirectorRollup — the altitude view. A director/principal manages the managers
// and the outliers, not individual tickets: portfolio health, money at risk, SLA
// attainment, and per-AM workload across the whole organization, every figure
// drilling into the detail behind it. Org-wide scope (sees all buildings).
import { useMemo } from "react";
import type { Building } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS, PEOPLE } from "@/data/seed";
import { BUILDING_SYSTEMS } from "@/data/buildings";
import { ticketFlow } from "@/data/flow";
import { fmtMoney } from "@/lib/format";
import { buildingImage } from "@/data/buildings";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Glass, Icon, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

interface BRow { b: Building; health: number; open: number; urgent: number; breaching: number; margin: number; score: number }
interface AmRow { id: string; name: string; role: string; color: string; initials: string; buildings: number; open: number; urgent: number; breaching: number; avgHealth: number }

export function DirectorRollup() {
  const { currentUser, tickets, emergencies } = useOrbit();
  const active = useMemo(() => tickets.filter((t) => t.status !== "Closed" && !t.mergedInto), [tickets]);

  const rows = useMemo<BRow[]>(() => BUILDINGS.map((b) => {
    const sys = BUILDING_SYSTEMS.filter((s) => s.buildingId === b.id);
    const health = sys.length ? Math.round(sys.reduce((a, s) => a + s.health, 0) / sys.length) : 0;
    const open = active.filter((t) => t.building === b.id);
    const urgent = open.filter((t) => ["Critical", "High"].includes(t.prio)).length;
    const breaching = open.filter((t) => ticketFlow(t).sla.breached).length;
    const margin = b.monthlyIncome - b.monthlyExpense;
    const compliance = b.compliance === "ok" ? 100 : b.compliance === "review" ? 75 : 50;
    const score = Math.round(health * 0.45 + compliance * 0.3 + Math.max(0, 100 - open.length * 4) * 0.15 + Math.max(0, 100 - b.delinquency * 600) * 0.1);
    return { b, health, open: open.length, urgent, breaching, margin, score };
  }), [active]);

  const amRows = useMemo<AmRow[]>(() => {
    const byAm = new Map<string, BRow[]>();
    rows.forEach((r) => { const k = r.b.am; if (!byAm.has(k)) byAm.set(k, []); byAm.get(k)!.push(r); });
    return [...byAm.entries()].map(([id, brs]) => {
      const p = PEOPLE[id];
      return {
        id, name: p?.name || id, role: p?.role || "Manager", color: p?.color || "#3b82f6", initials: p?.initials || "—",
        buildings: brs.length,
        open: brs.reduce((a, r) => a + r.open, 0),
        urgent: brs.reduce((a, r) => a + r.urgent, 0),
        breaching: brs.reduce((a, r) => a + r.breaching, 0),
        avgHealth: Math.round(brs.reduce((a, r) => a + r.health, 0) / brs.length),
      };
    }).sort((a, b) => b.open - a.open);
  }, [rows]);

  // portfolio aggregates
  const avgScore = Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length);
  const breaching = rows.reduce((a, r) => a + r.breaching, 0);
  const atRisk = rows.filter((r) => r.margin < 0).reduce((a, r) => a - r.margin, 0); // monthly $ bleeding
  const complianceAlerts = rows.filter((r) => r.b.compliance !== "ok").length;
  const activeEm = emergencies.filter((e) => e.status !== "resolved").length;
  const worst = [...rows].sort((a, b) => a.score - b.score).slice(0, 3);
  // an AM is "overloaded" if carrying clearly more open work than the team average
  const avgOpenPerAm = amRows.length ? amRows.reduce((a, r) => a + r.open, 0) / amRows.length : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Agency overview" sub={`${BUILDINGS.length} buildings · portfolio health ${avgScore} · ${breaching} breaching SLA`} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>

        {/* portfolio KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 16 }}>
          <Kpi label="Portfolio health" value={`${avgScore}`} color={avgScore >= 85 ? "#22c55e" : avgScore >= 70 ? "#f59e0b" : "#ef4444"} icon="activity" />
          <Kpi label="Buildings" value={String(BUILDINGS.length)} color="var(--ink)" icon="building-2" />
          <Kpi label="Open work" value={String(active.length)} color="#3b82f6" icon="ticket" />
          <Kpi label="Breaching SLA" value={String(breaching)} color={breaching ? "#ef4444" : "#22c55e"} icon="alarm-clock-off" />
          <Kpi label="$ / mo at risk" value={fmtMoney(atRisk)} color={atRisk ? "#ef4444" : "#22c55e"} icon="trending-down" />
          <Kpi label="Compliance alerts" value={String(complianceAlerts)} color={complianceAlerts ? "#f59e0b" : "#22c55e"} icon="shield-alert" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
          {/* outliers — manage by exception */}
          <Glass style={{ padding: 17 }}>
            <Header title="Outliers — manage by exception" icon="target" count={worst.length + (activeEm ? 1 : 0)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeEm > 0 && <ExceptionRow icon="siren" color="#ef4444" title={`${activeEm} active emergency${activeEm > 1 ? "ies" : ""}`} sub="Life-safety / critical incidents open across the portfolio" page="emergencies" />}
              {worst.map((r) => (
                <BuildingExceptionRow key={r.b.id} row={r} />
              ))}
            </div>
          </Glass>

          {/* per-AM workload */}
          <Glass style={{ padding: 17 }}>
            <Header title="Manager workload" icon="users" count={amRows.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {amRows.map((r) => <AmWorkloadRow key={r.id} row={r} overloaded={r.open > avgOpenPerAm * 1.4} />)}
            </div>
            <p style={{ margin: "12px 0 0", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rebalancing portfolios is the lever — an overloaded AM is a building at risk.</p>
          </Glass>
        </div>

        {/* building health leaderboard */}
        <Glass style={{ padding: 17, marginTop: 14 }}>
          <Header title="Building health" icon="bar-chart-3" count={rows.length} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {[...rows].sort((a, b) => b.score - a.score).map((r) => <HealthCard key={r.b.id} row={r} />)}
          </div>
        </Glass>

        <p style={{ margin: "18px 0 0", fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-5)", textTransform: "uppercase" }}>
          {currentUser?.title || "Director"} · the whole organization at a glance · every figure drills into the detail
        </p>
      </div>
    </div>
  );
}

function BuildingExceptionRow({ row }: { row: BRow }) {
  const { nav } = useOrbit();
  const color = row.score >= 85 ? "#22c55e" : row.score >= 70 ? "#f59e0b" : "#ef4444";
  const photo = buildingImage(row.b.id);
  return (
    <button onClick={() => nav("buildings", row.b.id)} className="attention-row" style={{ cursor: "pointer" }}>
      <span className="bl-thumb" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, backgroundImage: photo ? `url(${photo})` : undefined, backgroundColor: `color-mix(in srgb, ${row.b.mono} 18%, var(--fill-2))`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.b.name}</span>
        <span style={{ display: "block", marginTop: 2, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{row.open} open{row.urgent ? ` · ${row.urgent} urgent` : ""}{row.breaching ? ` · ${row.breaching} breaching` : ""}{row.margin < 0 ? ` · ${fmtMoney(-row.margin)}/mo loss` : ""}</span>
      </span>
      <span style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, color }}>{row.score}</span>
    </button>
  );
}

function AmWorkloadRow({ row, overloaded }: { row: AmRow; overloaded: boolean }) {
  return (
    <div className="attention-row" style={{ cursor: "default", borderColor: overloaded ? "color-mix(in srgb, #f59e0b 40%, transparent)" : undefined }}>
      <Avatar person={{ name: row.name, initials: row.initials, color: row.color }} size={32} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{row.name}</span>
          {overloaded && <Tag color="#f59e0b" bg="rgba(245,158,11,0.12)">Overloaded</Tag>}
        </span>
        <span style={{ display: "block", marginTop: 2, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{row.buildings} buildings · {row.open} open · health {row.avgHealth}</span>
      </span>
      <span style={{ textAlign: "right" }}>
        {row.breaching > 0 && <span style={{ display: "block", fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "#ef4444" }}>{row.breaching} breaching</span>}
        {row.urgent > 0 && <span style={{ display: "block", fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "#f59e0b" }}>{row.urgent} urgent</span>}
      </span>
    </div>
  );
}

function HealthCard({ row }: { row: BRow }) {
  const { nav } = useOrbit();
  const color = row.score >= 85 ? "#22c55e" : row.score >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <button onClick={() => nav("buildings", row.b.id)} style={{ textAlign: "left", cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-2)", borderRadius: 12, padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.b.name}</span>
        <span style={{ fontFamily: SANS, fontSize: 20, fontWeight: 600, color }}>{row.score}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "var(--hair-2)", margin: "8px 0", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${row.score}%`, background: color }} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>
        <span>Health {row.health}</span><span>{row.open} open</span><span style={{ color: row.b.compliance === "ok" ? "#22c55e" : row.b.compliance === "review" ? "#f59e0b" : "#ef4444" }}>{row.b.compliance.toUpperCase()}</span>
      </div>
    </button>
  );
}

function ExceptionRow({ icon, color, title, sub, page }: { icon: string; color: string; title: string; sub: string; page: string }) {
  const { nav } = useOrbit();
  return (
    <button onClick={() => nav(page)} className="attention-row" style={{ cursor: "pointer" }}>
      <span className="attention-row-icon" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, animation: "orbit-pulse 1.6s ease-in-out infinite" }}><Icon name={icon} size={15} color={color} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{title}</span>
        <span style={{ display: "block", marginTop: 2, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{sub}</span>
      </span>
      <Icon name="arrow-up-right" size={15} color="var(--ink-4)" />
    </button>
  );
}

function Kpi({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <Glass style={{ padding: 14 }} accent={color}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Icon name={icon} size={14} color={color} /><span style={micro}>{label}</span>
      </div>
      <strong style={{ fontFamily: SANS, fontSize: 22, lineHeight: 1, color }}>{value}</strong>
    </Glass>
  );
}

function Header({ title, icon, count }: { title: string; icon: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
      <Icon name={icon} size={16} color="var(--acc-text)" />
      <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.1)", padding: "2px 7px", borderRadius: 99 }}>{count}</span>
    </div>
  );
}

const micro: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" };
