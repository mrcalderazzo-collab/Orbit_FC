// ReportsPage — the operator's reporting desk. Pick a report (vendor performance
// & pricing, CSAT/TSAT, SLA, preventative maintenance, ticket bottlenecks, staff
// performance, building health); each renders KPIs + a chart + a table, and
// exports to CSV. Derivations live in data/reports.ts.
import { useMemo, useState, type ReactNode } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { fmtMoney } from "@/lib/format";
import { vendorPerformance, vendorPricing, satisfaction, slaReport, preventative, bottlenecks, staffPerformance, buildingHealth, ticketFlowAnalytics, type ReportTable } from "@/data/reports";
import { Btn, Glass, Icon, SectionLabel } from "@/components/ui";
import { HBars, LineArea, BarPairs } from "@/components/ui/Charts";
import { TopBar } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const REPORTS: { id: string; label: string; icon: string; desc: string }[] = [
  { id: "ticketflow", label: "Ticket flow & volume", icon: "trending-up", desc: "Weekly inflow, monthly volume & team comparison" },
  { id: "vendors", label: "Vendor performance", icon: "star", desc: "Grade, rating, response & on-time by vendor" },
  { id: "pricing", label: "Vendor pricing", icon: "tags", desc: "Average ticket & variance vs market rate" },
  { id: "satisfaction", label: "CSAT / TSAT", icon: "smile", desc: "Resident & team satisfaction" },
  { id: "sla", label: "SLA performance", icon: "timer", desc: "Within-SLA %, breaches by priority & building" },
  { id: "preventative", label: "Preventative maintenance", icon: "shield-check", desc: "Systems health, upcoming service, preventive ratio" },
  { id: "bottlenecks", label: "Ticket bottlenecks", icon: "git-branch", desc: "Where work piles up & the oldest open items" },
  { id: "staff", label: "Staff performance", icon: "users", desc: "Load, throughput, response, rates & utilization" },
  { id: "health", label: "Building health", icon: "building-2", desc: "Composite score across the portfolio" },
];

interface Built { kpis: { label: string; value: string; color?: string }[]; viz: ReactNode; table: ReportTable }

function downloadCSV(name: string, table: ReportTable) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = table.columns.map((c) => esc(c.label)).join(",");
  const body = table.rows.map((r) => table.columns.map((c) => esc(r[c.key] ?? "")).join(",")).join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { tickets, notify } = useOrbit();
  const [sel, setSel] = useState("ticketflow");
  const meta = REPORTS.find((r) => r.id === sel)!;
  const built = useMemo<Built>(() => build(sel, tickets), [sel, tickets]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Reports" sub="Pull performance, SLA, satisfaction, pricing & health" />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "230px 1fr", minHeight: 0 }}>
        {/* report list */}
        <div style={{ borderRight: "1px solid var(--hair-2)", overflowY: "auto", padding: "14px 12px" }} className="no-scrollbar">
          <SectionLabel style={{ padding: "0 8px", marginBottom: 10 }}>Reports</SectionLabel>
          {REPORTS.map((r) => {
            const on = sel === r.id;
            return (
              <button key={r.id} onClick={() => setSel(r.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: on ? "rgba(var(--acc-rgb),0.1)" : "transparent", borderLeft: on ? "2px solid var(--acc)" : "2px solid transparent", marginBottom: 2 }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--fill-2)"; }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                <Icon name={r.icon} size={16} color={on ? "var(--acc)" : "var(--ink-3)"} />
                <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: on ? 600 : 400, color: on ? "var(--ink)" : "var(--ink-2)" }}>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* report body */}
        <div style={{ overflowY: "auto", padding: "18px 24px 28px", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>{meta.label}</h2>
              <p style={{ margin: "5px 0 0", fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.06em", color: "var(--ink-4)", textTransform: "uppercase" }}>{meta.desc}</p>
            </div>
            <Btn icon="download" onClick={() => { downloadCSV(meta.label, built.table); notify("Report exported · CSV"); }}>Export CSV</Btn>
          </div>

          {built.kpis.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, built.kpis.length)}, 1fr)`, gap: 12, marginBottom: 16 }}>
              {built.kpis.map((k) => (
                <Glass key={k.label} style={{ padding: 15 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{k.label}</div>
                  <div style={{ fontFamily: SANS, fontSize: 25, fontWeight: 600, color: k.color || "var(--ink)", marginTop: 6, letterSpacing: "-0.5px" }}>{k.value}</div>
                </Glass>
              ))}
            </div>
          )}

          {built.viz && <Glass style={{ padding: 18, marginBottom: 16 }}>{built.viz}</Glass>}

          <Glass style={{ padding: 16 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Detail</SectionLabel>
            <Table table={built.table} />
          </Glass>
        </div>
      </div>
    </div>
  );
}

function Table({ table }: { table: ReportTable }) {
  const cols = table.columns;
  return (
    <div style={{ overflowX: "auto" }} className="no-scrollbar">
      <div style={{ minWidth: 480 }}>
        <div style={{ display: "grid", gridTemplateColumns: `minmax(140px,1.6fr) repeat(${cols.length - 1}, 1fr)`, gap: 10, padding: "0 8px 8px", borderBottom: "1px solid var(--hair-2)" }}>
          {cols.map((c) => <span key={c.key} style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase", textAlign: c.align || "left" }}>{c.label}</span>)}
        </div>
        {table.rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `minmax(140px,1.6fr) repeat(${cols.length - 1}, 1fr)`, gap: 10, padding: "10px 8px", borderBottom: "1px solid var(--fill-3)" }}>
            {cols.map((c, j) => (
              <span key={c.key} style={{ fontFamily: j === 0 ? SANS : MONO, fontSize: j === 0 ? 12.5 : 11, color: j === 0 ? "var(--ink)" : "var(--ink-2)", textAlign: c.align || "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[c.key]}</span>
            ))}
          </div>
        ))}
        {!table.rows.length && <div style={{ padding: "22px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)" }}>NO DATA</div>}
      </div>
    </div>
  );
}

// ── builders ─────────────────────────────────────────────────────────────────
function build(id: string, tickets: Parameters<typeof slaReport>[0]): Built {
  if (id === "ticketflow") {
    const a = ticketFlowAnalytics(tickets);
    return {
      kpis: [
        { label: "Total tickets", value: String(a.total) },
        { label: "Active", value: String(a.active), color: "#3b82f6" },
        { label: "New this week", value: String(a.weekly[a.weekly.length - 1].value) },
        { label: "New this month", value: String(a.monthly[a.monthly.length - 1].value) },
      ],
      viz: <>
        <SectionLabel style={{ marginBottom: 12 }}>Weekly inflow — new tickets</SectionLabel>
        <LineArea points={a.weekly.map((w) => w.value)} labels={a.weekly.map((w) => w.label)} color="var(--acc)" />
        <SectionLabel style={{ margin: "20px 0 12px" }}>Monthly volume</SectionLabel>
        <BarPairs data={a.monthly.map((m) => ({ label: m.label, a: m.value, b: 0 }))} aColor="#3b82f6" bColor="transparent" />
      </>,
      table: { columns: [{ key: "member", label: "Member" }, { key: "open", label: "Open", align: "right" }, { key: "overdue", label: "Overdue", align: "right" }, { key: "avgAgeDays", label: "Avg age (d)", align: "right" }], rows: a.team },
    };
  }
  if (id === "vendors") {
    const rows = vendorPerformance();
    return {
      kpis: [
        { label: "Vendors", value: String(rows.length) },
        { label: "Avg grade", value: String(Math.round(rows.reduce((a, r) => a + r.grade, 0) / rows.length)) },
        { label: "Expired COIs", value: String(rows.filter((r) => r.coi === "expired").length), color: "#ef4444" },
        { label: "Avg on-time", value: Math.round(rows.reduce((a, r) => a + r.onTimePct, 0) / rows.length) + "%", color: "#22c55e" },
      ],
      viz: <><SectionLabel style={{ marginBottom: 12 }}>Grade ranking</SectionLabel><HBars rows={rows.slice(0, 8).map((r) => ({ label: r.vendor, value: r.grade, color: r.grade >= 90 ? "#22c55e" : r.grade >= 80 ? "#f59e0b" : "#ef4444" }))} /></>,
      table: { columns: [{ key: "vendor", label: "Vendor" }, { key: "grade", label: "Grade", align: "right" }, { key: "rating", label: "Rating", align: "right" }, { key: "jobs", label: "Jobs", align: "right" }, { key: "responseHrs", label: "Resp (h)", align: "right" }, { key: "onTimePct", label: "On-time %", align: "right" }, { key: "coi", label: "COI", align: "right" }], rows },
    };
  }
  if (id === "pricing") {
    const rows = vendorPricing();
    return {
      kpis: [
        { label: "Under market", value: String(rows.filter((r) => r.vsMarketPct < 0).length), color: "#22c55e" },
        { label: "Over market", value: String(rows.filter((r) => r.vsMarketPct > 5).length), color: "#f59e0b" },
        { label: "Avg variance", value: (rows.reduce((a, r) => a + r.vsMarketPct, 0) / rows.length).toFixed(1) + "%" },
      ],
      viz: <><SectionLabel style={{ marginBottom: 12 }}>Variance vs market (lower is better)</SectionLabel><HBars rows={rows.map((r) => ({ label: r.vendor, value: Math.abs(r.vsMarketPct), color: r.vsMarketPct <= 0 ? "#22c55e" : "#f59e0b", sub: <span style={{ fontFamily: MONO, fontSize: 9, color: r.vsMarketPct <= 0 ? "#22c55e" : "#f59e0b" }}>{r.vsMarketPct > 0 ? "+" : ""}{r.vsMarketPct}%</span> }))} fmt={() => ""} /></>,
      table: { columns: [{ key: "vendor", label: "Vendor" }, { key: "trades", label: "Trade" }, { key: "avgTicket", label: "Avg ticket", align: "right" }, { key: "vsMarketPct", label: "vs market %", align: "right" }, { key: "jobs", label: "Jobs", align: "right" }], rows: rows.map((r) => ({ ...r, avgTicket: fmtMoney(r.avgTicket) })) },
    };
  }
  if (id === "satisfaction") {
    const s = satisfaction(tickets);
    return {
      kpis: [
        { label: "Resident CSAT", value: s.csat + "%", color: s.csat >= 85 ? "#22c55e" : "#f59e0b" },
        { label: "Team TSAT", value: s.tsat + "%", color: s.tsat >= 85 ? "#22c55e" : "#f59e0b" },
        { label: "Buildings", value: String(s.byBuilding.length) },
      ],
      viz: <><SectionLabel style={{ marginBottom: 12 }}>CSAT by building</SectionLabel><HBars rows={s.byBuilding.map((x) => ({ label: x.building, value: x.csat, color: x.csat >= 85 ? "#22c55e" : x.csat >= 75 ? "#f59e0b" : "#ef4444" }))} fmt={(n) => n + "%"} /></>,
      table: { columns: [{ key: "building", label: "Building" }, { key: "csat", label: "CSAT %", align: "right" }, { key: "responses", label: "Responses", align: "right" }], rows: s.byBuilding },
    };
  }
  if (id === "sla") {
    const s = slaReport(tickets);
    return {
      kpis: [
        { label: "Within SLA", value: s.withinPct + "%", color: s.withinPct >= 80 ? "#22c55e" : "#f59e0b" },
        { label: "Breached", value: String(s.breached), color: s.breached ? "#ef4444" : "#22c55e" },
        { label: "Open tickets", value: String(s.total) },
      ],
      viz: <><SectionLabel style={{ marginBottom: 12 }}>Within-SLA by priority</SectionLabel><HBars rows={s.byPriority.map((p) => ({ label: p.priority + " (" + p.count + ")", value: p.withinPct, color: p.withinPct >= 80 ? "#22c55e" : p.withinPct >= 50 ? "#f59e0b" : "#ef4444" }))} fmt={(n) => n + "%"} /></>,
      table: { columns: [{ key: "building", label: "Building" }, { key: "withinPct", label: "Within SLA %", align: "right" }, { key: "open", label: "Open", align: "right" }], rows: s.byBuilding },
    };
  }
  if (id === "preventative") {
    const p = preventative();
    return {
      kpis: [
        { label: "Systems healthy", value: p.healthyPct + "%", color: p.healthyPct >= 80 ? "#22c55e" : "#f59e0b" },
        { label: "Service due ≤21d", value: String(p.dueSoon), color: p.dueSoon ? "#f59e0b" : "#22c55e" },
        { label: "Preventive ratio", value: p.preventiveRatio + "%" },
        { label: "Systems tracked", value: String(p.total) },
      ],
      viz: <><SectionLabel style={{ marginBottom: 12 }}>Avg health by system type</SectionLabel><HBars rows={p.kinds.map((k) => ({ label: k.kind + " (" + k.count + ")", value: k.avgHealth, color: k.avgHealth >= 85 ? "#22c55e" : k.avgHealth >= 70 ? "#f59e0b" : "#ef4444" }))} fmt={(n) => n + "%"} /></>,
      table: { columns: [{ key: "kind", label: "System type" }, { key: "avgHealth", label: "Avg health %", align: "right" }, { key: "count", label: "Units", align: "right" }], rows: p.kinds },
    };
  }
  if (id === "bottlenecks") {
    const b = bottlenecks(tickets);
    return {
      kpis: [
        { label: "Open tickets", value: String(b.total) },
        { label: "Unowned", value: String(b.unowned), color: b.unowned ? "#ef4444" : "#22c55e" },
        { label: "Stages", value: String(b.stages.length) },
      ],
      viz: <><SectionLabel style={{ marginBottom: 12 }}>Avg age by stage (days)</SectionLabel><HBars rows={b.stages.map((s) => ({ label: s.status + " (" + s.count + ")", value: s.avgAgeDays, color: s.avgAgeDays > 7 ? "#ef4444" : s.avgAgeDays > 3 ? "#f59e0b" : "#22c55e" }))} fmt={(n) => n + "d"} /></>,
      table: { columns: [{ key: "id", label: "Oldest open" }, { key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "owner", label: "Owner" }, { key: "ageDays", label: "Age (d)", align: "right" }], rows: b.oldest },
    };
  }
  if (id === "staff") {
    const rows = staffPerformance(tickets);
    return {
      kpis: [
        { label: "Team", value: String(rows.length) },
        { label: "Open load", value: String(rows.reduce((a, r) => a + r.open, 0)) },
        { label: "Closed (90d)", value: String(rows.reduce((a, r) => a + r.closed, 0)), color: "#22c55e" },
        { label: "Avg utilization", value: Math.round(rows.reduce((a, r) => a + r.utilizationPct, 0) / rows.length) + "%" },
      ],
      viz: <><SectionLabel style={{ marginBottom: 12 }}>Utilization</SectionLabel><HBars rows={rows.map((r) => ({ label: r.member, value: r.utilizationPct, color: r.utilizationPct > 90 ? "#ef4444" : r.utilizationPct > 70 ? "#22c55e" : "#f59e0b" }))} fmt={(n) => n + "%"} /></>,
      table: { columns: [{ key: "member", label: "Member" }, { key: "open", label: "Open", align: "right" }, { key: "closed", label: "Closed", align: "right" }, { key: "avgRespHrs", label: "Resp (h)", align: "right" }, { key: "rate", label: "Rate $/h", align: "right" }, { key: "utilizationPct", label: "Util %", align: "right" }], rows },
    };
  }
  // health
  const rows = buildingHealth(tickets);
  return {
    kpis: [
      { label: "Avg score", value: String(Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length)) },
      { label: "Top building", value: rows[0]?.building ?? "—", color: "#22c55e" },
      { label: "Needs focus", value: rows[rows.length - 1]?.building ?? "—", color: "#f59e0b" },
    ],
    viz: <><SectionLabel style={{ marginBottom: 12 }}>Composite health score</SectionLabel><HBars rows={rows.map((r) => ({ label: r.building, value: r.score, color: r.score >= 85 ? "#22c55e" : r.score >= 70 ? "#f59e0b" : "#ef4444" }))} /></>,
    table: { columns: [{ key: "building", label: "Building" }, { key: "score", label: "Score", align: "right" }, { key: "health", label: "Systems %", align: "right" }, { key: "openTickets", label: "Open", align: "right" }, { key: "compliance", label: "Compliance" }, { key: "delinquencyPct", label: "Delinq %", align: "right" }], rows },
  };
}
