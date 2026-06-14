// FinancePage — the money trail. Portfolio overview (AP from work-order invoices,
// spend-by-building, KPIs) plus a per-building drill-down with that building's own
// reserve trajectory, income/expense trend, AP, and capital commitments. Pick a
// building to see books unique to it.
import { useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { fmtMoney, fmtPct, moneyFull } from "@/lib/format";
import { BUILDINGS, buildingById, portfolioTotals } from "@/data/seed";
import { financialTrend, capitalProjects } from "@/data/governance";
import { Glass, Icon, SectionLabel, Stat, Tag } from "@/components/ui";
import { LineArea, BarPairs } from "@/components/ui/Charts";
import { TopBar } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const INV_C: Record<string, string> = { received: "#f59e0b", approved: "var(--acc-text)", paid: "#22c55e" };

export function FinancePage() {
  const { workOrders, openCommand } = useOrbit();
  const wos = useMemo(() => Object.values(workOrders), [workOrders]);
  const [sel, setSel] = useState<string | null>(null);
  const t = portfolioTotals();

  const invoiced = wos.reduce((a, w) => a + (w.invoice?.amount ?? 0), 0);
  const paid = wos.reduce((a, w) => a + (w.invoice && w.invoice.status === "paid" ? w.invoice.amount : 0), 0);
  const outstanding = invoiced - paid;
  const ap = wos.filter((w) => w.invoice).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Finance" sub={ap + " open invoices · " + moneyFull(outstanding) + " outstanding"} />
      {/* building selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderBottom: "1px solid var(--hair-2)", overflowX: "auto" }} className="no-scrollbar">
        <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase", flexShrink: 0 }}>View</span>
        <Chip label="All buildings" active={!sel} onClick={() => setSel(null)} />
        {BUILDINGS.map((b) => <Chip key={b.id} label={b.name} color={b.mono} active={sel === b.id} onClick={() => setSel(b.id)} />)}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0 }}>
        {sel ? <BuildingFinance buildingId={sel} wos={wos} onTicket={openCommand} onBack={() => setSel(null)} /> : <Portfolio wos={wos} t={t} onTicket={openCommand} onPick={setSel} />}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, flexShrink: 0, cursor: "pointer", background: active ? "rgba(var(--acc-rgb),0.12)" : "var(--fill-2)", border: "1px solid " + (active ? "rgba(var(--acc-rgb),0.3)" : "var(--hair-3)"), fontFamily: SANS, fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "var(--ink)" : "var(--ink-3)", whiteSpace: "nowrap" }}>
      {color && <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />}{label}
    </button>
  );
}

// ── portfolio ──────────────────────────────────────────────────────────────
function Portfolio({ wos, t, onTicket, onPick }: { wos: ReturnType<typeof Object.values>; t: ReturnType<typeof portfolioTotals>; onTicket: (id: string) => void; onPick: (id: string) => void }) {
  const committed = wos.reduce((a: number, w: any) => a + w.amount, 0);
  const invoiced = wos.reduce((a: number, w: any) => a + (w.invoice?.amount ?? 0), 0);
  const paid = wos.reduce((a: number, w: any) => a + (w.invoice && w.invoice.status === "paid" ? w.invoice.amount : 0), 0);
  const outstanding = invoiced - paid;
  const ap = wos.filter((w: any) => w.invoice).sort((a: any, b: any) => (a.invoice.status === "paid" ? 1 : 0) - (b.invoice.status === "paid" ? 1 : 0));
  const spendByBuilding = BUILDINGS.map((b) => ({ b, spend: wos.filter((w: any) => w.buildingId === b.id).reduce((a: number, w: any) => a + w.amount, 0) })).filter((x) => x.spend > 0).sort((a, b) => b.spend - a.spend);
  const maxSpend = Math.max(1, ...spendByBuilding.map((x) => x.spend));

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        <Kpi icon="file-text" label="Committed (POs)" value={fmtMoney(committed)} sub={wos.length + " work orders"} c="#3b82f6" />
        <Kpi icon="receipt" label="Invoiced" value={fmtMoney(invoiced)} sub={ap.length + " invoices"} c="var(--acc)" />
        <Kpi icon="badge-dollar-sign" label="Paid" value={fmtMoney(paid)} sub={ap.filter((w: any) => w.invoice.status === "paid").length + " settled"} c="#22c55e" />
        <Kpi icon="alarm-clock" label="Outstanding" value={fmtMoney(outstanding)} sub={ap.filter((w: any) => w.invoice.status !== "paid").length + " to pay"} c="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
        <Glass style={{ padding: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Accounts payable · vendor invoices</SectionLabel>
          <ApTable rows={ap} onTicket={onTicket} />
        </Glass>
        <Glass style={{ padding: 16 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Spend by building</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {spendByBuilding.map(({ b, spend }) => (
              <button key={b.id} onClick={() => onPick(b.id)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: b.mono }} />
                  <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--ink-2)" }}>{fmtMoney(spend)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}>
                  <div style={{ width: (spend / maxSpend) * 100 + "%", height: "100%", borderRadius: 99, background: b.mono, opacity: 0.7 }} />
                </div>
              </button>
            ))}
            {!spendByBuilding.length && <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-5)" }}>No spend recorded</span>}
          </div>
        </Glass>
      </div>

      <SectionLabel style={{ margin: "22px 0 12px" }}>Portfolio financials · click a building to drill in</SectionLabel>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", padding: "14px 18px", borderRadius: 16, border: "1px solid var(--hair-2)", background: "var(--fill-1)", marginBottom: 14 }}>
        <Stat label="Reserve funds" value={fmtMoney(t.reserve)} />
        <Stat label="Monthly income" value={fmtMoney(t.income)} />
        <Stat label="Monthly expense" value={fmtMoney(t.expense)} />
        <Stat label="Net operating" value={fmtMoney(t.noi)} accent="#22c55e" sub="per month" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {BUILDINGS.map((b) => (
          <Glass key={b.id} hover accent={b.mono} style={{ padding: 14, cursor: "pointer" }} onClick={() => onPick(b.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: b.mono }} />
              <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{b.name}</span>
              <Icon name="arrow-up-right" size={14} color="var(--ink-4)" />
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{b.units} units</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <Mini label="Reserve" v={fmtMoney(b.reserve)} />
              <Mini label="NOI / mo" v={fmtMoney(b.monthlyIncome - b.monthlyExpense)} c="#22c55e" />
              <Mini label="Delinquency" v={fmtPct(b.delinquency)} c={b.delinquency > 0.05 ? "#f59e0b" : "var(--ink-2)"} />
            </div>
          </Glass>
        ))}
      </div>
    </>
  );
}

// ── per building ─────────────────────────────────────────────────────────────
function BuildingFinance({ buildingId, wos, onTicket, onBack }: { buildingId: string; wos: ReturnType<typeof Object.values>; onTicket: (id: string) => void; onBack: () => void }) {
  const b = buildingById(buildingId)!;
  const trend = useMemo(() => financialTrend(buildingId), [buildingId]);
  const projects = useMemo(() => capitalProjects(buildingId), [buildingId]);
  const bWos = wos.filter((w: any) => w.buildingId === buildingId);
  const ap = bWos.filter((w: any) => w.invoice);
  const spend = bWos.reduce((a: number, w: any) => a + w.amount, 0);
  const noi = b.monthlyIncome - b.monthlyExpense;
  const reserveMonths = Math.round(b.reserve / b.monthlyExpense);
  const committed = projects.filter((p) => p.status !== "Complete").reduce((a, p) => a + (p.budget - p.spent), 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--hair-3)", background: "var(--fill-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="arrow-left" size={16} color="var(--ink-2)" /></button>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: b.mono }} />
        <div>
          <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 20, color: "var(--ink)" }}>{b.name}</h2>
          <p style={{ margin: "3px 0 0", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{b.type} · {b.units} units · {b.code}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 16 }}>
        <Glass style={{ padding: 16 }}><Stat label="Reserve fund" value={fmtMoney(b.reserve)} sub={reserveMonths + " mo of expenses"} accent={reserveMonths >= 6 ? "#22c55e" : "#f59e0b"} /></Glass>
        <Glass style={{ padding: 16 }}><Stat label="Operating" value={fmtMoney(b.operating)} /></Glass>
        <Glass style={{ padding: 16 }}><Stat label="Monthly NOI" value={fmtMoney(noi)} color={noi >= 0 ? "#22c55e" : "#ef4444"} sub={noi >= 0 ? "surplus" : "deficit"} accent={noi >= 0 ? "#22c55e" : "#ef4444"} /></Glass>
        <Glass style={{ padding: 16 }}><Stat label="Delinquency" value={fmtPct(b.delinquency)} color={b.delinquency > 0.06 ? "#f59e0b" : "var(--ink)"} /></Glass>
        <Glass style={{ padding: 16 }}><Stat label="Vendor spend" value={fmtMoney(spend)} sub={bWos.length + " work orders"} /></Glass>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Glass style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <SectionLabel>Reserve trajectory</SectionLabel>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>now {fmtMoney(trend[trend.length - 1].reserve)}</span>
          </div>
          <LineArea points={trend.map((p) => p.reserve)} labels={trend.map((p) => p.month)} color={b.mono} />
        </Glass>
        <Glass style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <SectionLabel>Income vs expense</SectionLabel>
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 12 }}>
              <Lg color="#22c55e" label="Income" /><Lg color="#f59e0b" label="Expense" />
            </span>
          </div>
          <BarPairs data={trend.map((p) => ({ label: p.month, a: p.income, b: p.expense }))} />
        </Glass>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        <Glass style={{ padding: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Accounts payable</SectionLabel>
          <ApTable rows={ap} onTicket={onTicket} />
        </Glass>
        <Glass style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <SectionLabel>Capital commitments</SectionLabel>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "var(--ink-2)" }}>{fmtMoney(committed)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {projects.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <Tag>{p.status}</Tag>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)" }}>{fmtMoney(p.budget)}</span>
              </div>
            ))}
          </div>
        </Glass>
      </div>
    </>
  );
}

function ApTable({ rows, onTicket }: { rows: any[]; onTicket: (id: string) => void }) {
  if (!rows.length) return <div style={{ padding: "24px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)" }}>NO INVOICES</div>;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "84px minmax(0,1fr) 90px 78px", gap: 10, padding: "0 8px 8px", borderBottom: "1px solid var(--hair-2)" }}>
        {["WO #", "Vendor · ticket", "Amount", "Status"].map((h) => <span key={h} style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{h}</span>)}
      </div>
      {rows.map((w) => {
        const b = buildingById(w.buildingId);
        const c = INV_C[w.invoice.status];
        return (
          <div key={w.id} onClick={() => onTicket(w.ticketId)} style={{ display: "grid", gridTemplateColumns: "84px minmax(0,1fr) 90px 78px", gap: 10, padding: "11px 8px", alignItems: "center", cursor: "pointer", borderBottom: "1px solid var(--fill-3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-1)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--acc-text)" }}>{w.id}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.vendorName}</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, color: b?.mono }}>{b?.name} · {w.ticketId}</div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{moneyFull(w.invoice.amount)}</span>
            <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: "0.05em" }}>{w.invoice.status}</span>
          </div>
        );
      })}
    </>
  );
}

function Kpi({ icon, label, value, sub, c }: { icon: string; label: string; value: string; sub: string; c: string }) {
  return (
    <Glass style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 30%, transparent)` }}><Icon name={icon} size={14} color={c} /></div>
        <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: "var(--ink)", letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 4 }}>{sub}</div>
    </Glass>
  );
}
function Mini({ label, v, c }: { label: string; v: string; c?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: c || "var(--ink)" }}>{v}</span>
    </div>
  );
}
function Lg({ color, label }: { color: string; label: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9, color: "var(--ink-3)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />{label}</span>;
}
