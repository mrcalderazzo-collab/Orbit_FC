// BoardFinancials — the board's money view: reserve trajectory, 12-month income
// vs expense, key ratios, budget vs actual, and the compliance/assessment items
// that carry a dollar impact. Charts are inline SVG (no deps). Scoped to the
// board member's building; their own building's books are theirs to see in full.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { financialTrend, capitalProjects } from "@/data/governance";
import { fmtMoney, fmtPct } from "@/lib/format";
import { Glass, SectionLabel, Stat, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const PURPLE = "#a855f7";

export function BoardFinancials() {
  const { currentUser } = useOrbit();
  const bId = currentUser?.building ?? "";
  const b = buildingById(bId);
  const trend = useMemo(() => financialTrend(bId), [bId]);
  const projects = useMemo(() => capitalProjects(bId), [bId]);
  if (!b) return null;

  const noi = b.monthlyIncome - b.monthlyExpense;
  const ttmIncome = trend.reduce((a, p) => a + p.income, 0);
  const ttmExpense = trend.reduce((a, p) => a + p.expense, 0);
  const reserveMonths = Math.round(b.reserve / b.monthlyExpense);
  const committed = projects.filter((p) => p.status !== "Complete").reduce((a, p) => a + (p.budget - p.spent), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Financials</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b.name} · trailing 12 months</p>
      </div>

      <Glass style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 20 }}>
          <Stat label="Reserve fund" value={fmtMoney(b.reserve)} sub={reserveMonths + " mo of expenses"} accent={reserveMonths >= 6 ? "#22c55e" : "#f59e0b"} />
          <Stat label="Operating" value={fmtMoney(b.operating)} />
          <Stat label="Monthly NOI" value={fmtMoney(noi)} color={noi >= 0 ? "#22c55e" : "#ef4444"} sub={noi >= 0 ? "surplus" : "deficit"} accent={noi >= 0 ? "#22c55e" : "#ef4444"} />
          <Stat label="Delinquency" value={fmtPct(b.delinquency)} color={b.delinquency > 0.06 ? "#f59e0b" : "var(--ink)"} />
        </div>
      </Glass>

      {/* reserve trajectory */}
      <Glass style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <SectionLabel>Reserve trajectory</SectionLabel>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>now {fmtMoney(trend[trend.length - 1].reserve)}</span>
        </div>
        <LineChart points={trend.map((p) => p.reserve)} labels={trend.map((p) => p.month)} color={PURPLE} />
      </Glass>

      {/* income vs expense */}
      <Glass style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <SectionLabel>Income vs expense</SectionLabel>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 14 }}>
            <Legend color="#22c55e" label={"Income " + fmtMoney(ttmIncome)} />
            <Legend color="#f59e0b" label={"Expense " + fmtMoney(ttmExpense)} />
          </span>
        </div>
        <BarPairs data={trend} />
      </Glass>

      {/* budget vs actual + commitments */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Budget vs actual (monthly)</SectionLabel>
          <BvA label="Income" budget={b.monthlyIncome} actual={trend[trend.length - 1].income} good="high" />
          <BvA label="Expense" budget={b.monthlyExpense} actual={trend[trend.length - 1].expense} good="low" />
        </Glass>
        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Capital commitments</SectionLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600, color: "var(--ink)" }}>{fmtMoney(committed)}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>remaining on open projects</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
            {projects.filter((p) => p.status !== "Complete").map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <Tag>{p.status}</Tag>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)" }}>{fmtMoney(p.budget - p.spent)}</span>
              </div>
            ))}
            {projects.filter((p) => p.status !== "Complete").length === 0 && <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>No open capital commitments.</p>}
          </div>
        </Glass>
      </div>
    </div>
  );
}

function LineChart({ points, labels, color }: { points: number[]; labels: string[]; color: string }) {
  const W = 640, H = 150, pad = 8;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (points.length - 1);
  const y = (v: number) => pad + (H - pad * 2) * (1 - (v - min) / span);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="resgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#resgrad)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r={i === points.length - 1 ? 4 : 2.5} fill={color} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {labels.map((l, i) => <span key={i} style={{ fontFamily: MONO, fontSize: 7.5, color: "var(--ink-5)" }}>{l}</span>)}
      </div>
    </div>
  );
}

function BarPairs({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense])) || 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130 }}>
      {data.map((d) => (
        <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110, width: "100%", justifyContent: "center" }}>
            <span title={"Income " + d.income} style={{ width: "42%", height: `${(d.income / max) * 100}%`, background: "#22c55e", borderRadius: "3px 3px 0 0", minHeight: 2 }} />
            <span title={"Expense " + d.expense} style={{ width: "42%", height: `${(d.expense / max) * 100}%`, background: "#f59e0b", borderRadius: "3px 3px 0 0", minHeight: 2 }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 7.5, color: "var(--ink-5)" }}>{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function BvA({ label, budget, actual, good }: { label: string; budget: number; actual: number; good: "high" | "low" }) {
  const pct = Math.round((actual / budget) * 100);
  const favorable = good === "high" ? actual >= budget : actual <= budget;
  const c = favorable ? "#22c55e" : "#f59e0b";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", flex: 1 }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)" }}>{fmtMoney(actual)} / {fmtMoney(budget)}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: c }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden", position: "relative" }}>
        <div style={{ width: Math.min(100, pct) + "%", height: "100%", background: c }} />
        <div style={{ position: "absolute", left: "100%", top: -2, width: 2, height: 12, background: "var(--ink-3)", transform: "translateX(-100%)" }} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9, color: "var(--ink-3)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />{label}</span>;
}
