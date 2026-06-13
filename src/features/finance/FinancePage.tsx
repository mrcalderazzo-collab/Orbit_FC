// FinancePage — the money trail. Accounts Payable comes straight from work-order
// invoices (so every payment links back to a ticket, vendor and building), plus
// spend-by-building and a clean portfolio financial snapshot.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { fmtMoney, moneyFull } from "@/lib/format";
import { BUILDINGS, buildingById, portfolioTotals } from "@/data/seed";
import { Glass, Icon, SectionLabel, Stat } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const INV_C: Record<string, string> = { received: "#f59e0b", approved: "var(--acc-text)", paid: "#22c55e" };

export function FinancePage() {
  const { workOrders, openCommand } = useOrbit();
  const wos = useMemo(() => Object.values(workOrders), [workOrders]);
  const t = portfolioTotals();

  const committed = wos.reduce((a, w) => a + w.amount, 0);
  const invoiced = wos.reduce((a, w) => a + (w.invoice?.amount ?? 0), 0);
  const paid = wos.reduce((a, w) => a + (w.invoice && w.invoice.status === "paid" ? w.invoice.amount : 0), 0);
  const outstanding = invoiced - paid;

  const ap = wos.filter((w) => w.invoice).sort((a, b) => (a.invoice!.status === "paid" ? 1 : 0) - (b.invoice!.status === "paid" ? 1 : 0));
  const spendByBuilding = BUILDINGS.map((b) => ({ b, spend: wos.filter((w) => w.buildingId === b.id).reduce((a, w) => a + w.amount, 0) })).filter((x) => x.spend > 0).sort((a, b) => b.spend - a.spend);
  const maxSpend = Math.max(1, ...spendByBuilding.map((x) => x.spend));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Finance" sub={ap.length + " open invoices · " + moneyFull(outstanding) + " outstanding"} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0 }}>
        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <Kpi icon="file-text" label="Committed (POs)" value={fmtMoney(committed)} sub={wos.length + " work orders"} c="#3b82f6" />
          <Kpi icon="receipt" label="Invoiced" value={fmtMoney(invoiced)} sub={ap.length + " invoices"} c="var(--acc)" />
          <Kpi icon="badge-dollar-sign" label="Paid" value={fmtMoney(paid)} sub={ap.filter((w) => w.invoice!.status === "paid").length + " settled"} c="#22c55e" />
          <Kpi icon="alarm-clock" label="Outstanding" value={fmtMoney(outstanding)} sub={ap.filter((w) => w.invoice!.status !== "paid").length + " to pay"} c="#f59e0b" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
          {/* Accounts payable */}
          <Glass style={{ padding: 16 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Accounts payable · vendor invoices</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "84px minmax(0,1fr) 96px 96px 78px", gap: 10, padding: "0 8px 8px", borderBottom: "1px solid var(--hair-2)" }}>
              {["WO #", "Vendor · ticket", "Invoice", "Amount", "Status"].map((h) => <span key={h} style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{h}</span>)}
            </div>
            {ap.map((w) => {
              const b = buildingById(w.buildingId);
              const c = INV_C[w.invoice!.status];
              return (
                <div key={w.id} onClick={() => openCommand(w.ticketId)} style={{ display: "grid", gridTemplateColumns: "84px minmax(0,1fr) 96px 96px 78px", gap: 10, padding: "11px 8px", alignItems: "center", cursor: "pointer", borderBottom: "1px solid var(--fill-3)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-1)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--acc-text)" }}>{w.id}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.vendorName} <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{w.vendorCode}</span></div>
                    <div style={{ fontFamily: MONO, fontSize: 8.5, color: b?.mono }}>{b?.name} · {w.ticketId}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)" }}>{w.invoice!.number}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{moneyFull(w.invoice!.amount)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: "0.05em" }}>{w.invoice!.status}</span>
                </div>
              );
            })}
            {!ap.length && <div style={{ padding: "24px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)" }}>NO INVOICES YET</div>}
          </Glass>

          {/* spend by building */}
          <Glass style={{ padding: 16 }}>
            <SectionLabel style={{ marginBottom: 14 }}>Spend by building</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {spendByBuilding.map(({ b, spend }) => (
                <div key={b.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: b.mono }} />
                    <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--ink-2)" }}>{fmtMoney(spend)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}>
                    <div style={{ width: (spend / maxSpend) * 100 + "%", height: "100%", borderRadius: 99, background: b.mono, opacity: 0.7 }} />
                  </div>
                </div>
              ))}
              {!spendByBuilding.length && <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-5)" }}>No spend recorded</span>}
            </div>
          </Glass>
        </div>

        {/* portfolio financials */}
        <SectionLabel style={{ margin: "22px 0 12px" }}>Portfolio financials</SectionLabel>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", padding: "14px 18px", borderRadius: 16, border: "1px solid var(--hair-2)", background: "var(--fill-1)", marginBottom: 14 }}>
          <Stat label="Reserve funds" value={fmtMoney(t.reserve)} />
          <Stat label="Monthly income" value={fmtMoney(t.income)} />
          <Stat label="Monthly expense" value={fmtMoney(t.expense)} />
          <Stat label="Net operating" value={fmtMoney(t.noi)} accent="#22c55e" sub="per month" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {BUILDINGS.map((b) => (
            <Glass key={b.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: b.mono }} />
                <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{b.name}</span>
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{b.units} units</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <Mini label="Reserve" v={fmtMoney(b.reserve)} />
                <Mini label="NOI / mo" v={fmtMoney(b.monthlyIncome - b.monthlyExpense)} c="#22c55e" />
                <Mini label="Delinquency" v={(b.delinquency * 100).toFixed(1) + "%"} c={b.delinquency > 0.05 ? "#f59e0b" : "var(--ink-2)"} />
              </div>
            </Glass>
          ))}
        </div>
      </div>
    </div>
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
