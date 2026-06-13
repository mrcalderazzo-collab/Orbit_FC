// Board Finances & Compliance — the board's view of their building's books and
// record-keeping. These figures (reserve, operating, NOI, delinquency) and the
// compliance register are the board's own building data, so they're shown in
// full. Other buildings and internal operator workings never appear.
import type { BuildingRecord } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { BUILDING_RECORDS } from "@/data/buildings";
import { fmtMoney, fmtPct } from "@/lib/format";
import { Glass, Icon, SectionLabel, Stat } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const REC_STATUS: Record<BuildingRecord["status"], { color: string; icon: string }> = {
  Current: { color: "#22c55e", icon: "check-circle-2" },
  "Due soon": { color: "#f59e0b", icon: "clock" },
  "Needs review": { color: "#ef4444", icon: "alert-triangle" },
};

export function BoardFinances() {
  const { currentUser } = useOrbit();
  const b = currentUser?.building ? buildingById(currentUser.building) : undefined;
  if (!b) return null;
  const noi = b.monthlyIncome - b.monthlyExpense;
  const records = BUILDING_RECORDS.filter((r) => r.buildingId === b.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Finances &amp; compliance</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b.name} · {b.type} · {b.units} units</p>
      </div>

      <Glass style={{ padding: 20 }}>
        <SectionLabel style={{ marginBottom: 16 }}>Financial position</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 20 }}>
          <Stat label="Reserve fund" value={fmtMoney(b.reserve)} />
          <Stat label="Operating" value={fmtMoney(b.operating)} />
          <Stat label="Monthly NOI" value={fmtMoney(noi)} color={noi >= 0 ? "#22c55e" : "#ef4444"} sub={(noi >= 0 ? "surplus" : "deficit")} accent={noi >= 0 ? "#22c55e" : "#ef4444"} />
          <Stat label="Delinquency" value={fmtPct(b.delinquency)} color={b.delinquency > 0.06 ? "#f59e0b" : "var(--ink)"} />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--hair-2)", flexWrap: "wrap" }}>
          <Flow label="Monthly income" value={fmtMoney(b.monthlyIncome)} color="#22c55e" icon="trending-up" />
          <Flow label="Monthly expense" value={fmtMoney(b.monthlyExpense)} color="#f59e0b" icon="trending-down" />
        </div>
      </Glass>

      <Glass style={{ padding: 20 }}>
        <SectionLabel style={{ marginBottom: 14 }}>Compliance register</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {records.map((r, i) => {
            const s = REC_STATUS[r.status];
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < records.length - 1 ? "1px solid var(--hair)" : "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fill-2)", border: "1px solid var(--hair-3)" }}>
                  <Icon name={s.icon} size={16} color={s.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{r.title}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>{r.kind} · due {r.due}</div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: s.color, background: s.color + "1f", border: "1px solid " + s.color + "44", padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap" }}>{r.status}</span>
              </div>
            );
          })}
        </div>
      </Glass>
    </div>
  );
}

function Flow({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: color + "1a", border: "1px solid " + color + "33" }}>
        <Icon name={icon} size={15} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{value}</div>
      </div>
    </div>
  );
}
