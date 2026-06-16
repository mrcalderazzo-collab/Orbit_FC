// DataCenterPage — operational AI "actions": generate an offload plan, find quick
// wins, audit stale tickets, plan capacity, detect patterns, read cost & building
// personalities — each expands to a summary + table you can export. Derivations
// in data/datacenter.ts. Ported from the Daisy "Data Center".
import { useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import type { ReportTable } from "@/data/reports";
import { quickWins, staleAudit, offloadPlan, patternDetection, capacityPlan, costIntelligence, buildingPersonalities, type DCResult } from "@/data/datacenter";
import { Btn, Glass, Icon, SectionLabel } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

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

interface Action { key: string; label: string; blurb: string; icon: string; color: string }
const ACTIONS: Action[] = [
  { key: "offload", label: "Ticket Offload Plan", blurb: "Route work off your plate to the right teammate by trade & capacity", icon: "git-fork", color: "#3b82f6" },
  { key: "quickwins", label: "Quick Wins Finder", blurb: "Tickets you can close TODAY — low priority, simple, no vote", icon: "zap", color: "#b6ff00" },
  { key: "stale", label: "Stale Ticket Audit", blurb: "Open 10+ days — nudge, escalate, or close", icon: "history", color: "#f59e0b" },
  { key: "capacity", label: "Team Capacity Planner", blurb: "Who has room and who's maxed — assign new work right", icon: "users", color: "#a855f7" },
  { key: "patterns", label: "Pattern Detection", blurb: "Recurring building+issue clusters — catch systemic problems", icon: "radar", color: "#ef4444" },
  { key: "cost", label: "Cost Intelligence", blurb: "Spend by building, money pits, board-ready summary", icon: "circle-dollar-sign", color: "#22c55e" },
  { key: "personalities", label: "Building Personalities", blurb: "An ops profile for every building — load, lean, health", icon: "building-2", color: "#14b8a6" },
];

export function DataCenterPage() {
  const { tickets, workOrders, nav, notify } = useOrbit();
  const [results, setResults] = useState<Record<string, DCResult>>({});

  const run = (key: string) => {
    let r: DCResult;
    if (key === "offload") r = offloadPlan(tickets);
    else if (key === "quickwins") r = quickWins(tickets);
    else if (key === "stale") r = staleAudit(tickets);
    else if (key === "capacity") r = capacityPlan(tickets);
    else if (key === "patterns") r = patternDetection(tickets);
    else if (key === "cost") r = costIntelligence(Object.values(workOrders));
    else r = buildingPersonalities(tickets);
    setResults((s) => ({ ...s, [key]: r }));
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Data Center" sub="Operational actions — offload, find quick wins, audit, detect patterns" />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {ACTIONS.map((a) => (
            <ActionCard key={a.key} a={a} result={results[a.key]} onRun={() => run(a.key)} onExport={() => { if (results[a.key]) { downloadCSV(a.label, results[a.key].table); notify("Exported · CSV"); } }} />
          ))}
        </div>

        {/* link-out actions */}
        <SectionLabel style={{ margin: "8px 0 12px" }}>Live surfaces</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 10 }}>
          <LinkCard icon="concierge-bell" color="var(--acc-text)" label="Smart Delegation" blurb="Route new tickets live at the Front Desk" onClick={() => nav("tickets")} />
          <LinkCard icon="star" color="#f59e0b" label="Vendor / Trade Scorecard" blurb="Rate & rank vendors across your network" onClick={() => nav("vendors")} />
          <LinkCard icon="bar-chart-3" color="#3b82f6" label="Full Reports" blurb="SLA, CSAT, staff, building health & more" onClick={() => nav("reports")} />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ a, result, onRun, onExport }: { a: Action; result?: DCResult; onRun: () => void; onExport: () => void }) {
  return (
    <Glass style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${a.color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${a.color} 30%, transparent)` }}>
          <Icon name={a.icon} size={17} color={a.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{a.label}</div>
          <div style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-3)" }}>{a.blurb}</div>
        </div>
        {result
          ? <Btn small ghost icon="download" onClick={onExport}>Export</Btn>
          : null}
        <Btn small primary icon={result ? "refresh-cw" : "sparkles"} onClick={onRun}>{result ? "Regenerate" : "Generate"}</Btn>
      </div>
      {result && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--hair-2)" }}>
          <p style={{ margin: "12px 0 12px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}><Icon name="sparkles" size={13} color={a.color} /> {result.summary}</p>
          <MiniTable table={result.table} />
        </div>
      )}
    </Glass>
  );
}

function MiniTable({ table }: { table: ReportTable }) {
  const cols = table.columns;
  const rows = table.rows.slice(0, 8);
  if (!rows.length) return <div style={{ padding: "10px 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-5)" }}>NOTHING TO REPORT — ALL CLEAR</div>;
  return (
    <div style={{ border: "1px solid var(--hair-2)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: `minmax(120px,1.4fr) repeat(${cols.length - 1}, 1fr)`, gap: 8, padding: "7px 11px", background: "var(--fill-1)", borderBottom: "1px solid var(--hair-2)" }}>
        {cols.map((c) => <span key={c.key} style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase", textAlign: c.align || "left" }}>{c.label}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: `minmax(120px,1.4fr) repeat(${cols.length - 1}, 1fr)`, gap: 8, padding: "8px 11px", borderBottom: i < rows.length - 1 ? "1px solid var(--fill-3)" : "none" }}>
          {cols.map((c, j) => <span key={c.key} style={{ fontFamily: j === 0 ? SANS : MONO, fontSize: j === 0 ? 12 : 10.5, color: j === 0 ? "var(--ink)" : "var(--ink-2)", textAlign: c.align || "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[c.key]}</span>)}
        </div>
      ))}
      {table.rows.length > 8 && <div style={{ padding: "7px 11px", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-5)" }}>+{table.rows.length - 8} more · export for the full list</div>}
    </div>
  );
}

function LinkCard({ icon, color, label, blurb, onClick }: { icon: string; color: string; label: string; blurb: string; onClick: () => void }) {
  return (
    <Glass hover accent={color} style={{ padding: 14, cursor: "pointer" }} onClick={onClick}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name={icon} size={16} color={color} />
        <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{label}</span>
        <Icon name="arrow-up-right" size={15} color="var(--ink-4)" />
      </div>
      <div style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", marginTop: 6 }}>{blurb}</div>
    </Glass>
  );
}
