// Statements — the resident's unit ledger. Deterministic mock derived from the
// building's economics (seeded RNG keyed on the unit) so the demo is stable.
// In production this is the resident's real AR ledger behind the same provider
// seam. Scoped to the signed-in unit only.
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { dateShift, moneyFull, rng, seed } from "@/lib/format";
import { Glass, Icon, SectionLabel, Stat, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

interface Line { date: string; desc: string; amount: number; kind: "charge" | "payment" | "credit" }

export function Statements() {
  const { currentUser } = useOrbit();
  const b = currentUser?.building ? buildingById(currentUser.building) : undefined;
  const unit = currentUser?.unit || "—";
  if (!b) return null;

  const monthly = Math.round(b.monthlyIncome / b.units / 25) * 25;
  const r = rng(seed(b.id + unit + "ledger"));
  const autopay = r() > 0.35;

  // Build six months of history, newest first, with a running balance.
  const lines: Line[] = [];
  for (let m = 5; m >= 0; m--) {
    lines.push({ date: dateShift(-(m * 30 + 28)), desc: "Common charges — " + monthLabel(m), amount: monthly, kind: "charge" });
    if (m === 2) lines.push({ date: dateShift(-(m * 30 + 20)), desc: "Special assessment — facade reserve", amount: Math.round((monthly * 0.4) / 25) * 25, kind: "charge" });
    // payment posts a few days after the charge, except possibly the latest month
    if (!(m === 0 && !autopay)) lines.push({ date: dateShift(-(m * 30 + 24)), desc: autopay ? "Autopay — bank ACH" : "Payment — online", amount: -monthly, kind: "payment" });
  }
  const balance = lines.reduce((a, l) => a + l.amount, 0);
  const ordered = [...lines].reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Statements</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b.name} · Unit {unit}</p>
      </div>

      <Glass style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Stat label="Current balance" value={moneyFull(Math.max(0, balance))} color={balance > 0 ? "#f59e0b" : "#22c55e"} sub={balance > 0 ? "due " + dateShift(5) : "paid in full"} accent={balance > 0 ? "#f59e0b" : "#22c55e"} />
          <Stat label="Monthly charge" value={moneyFull(monthly)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>Autopay</span>
            <span style={{ marginTop: 2 }}>{autopay ? <Tag color="#22c55e" bg="rgba(34,197,94,0.12)">Enrolled</Tag> : <Tag color="#f59e0b" bg="rgba(245,158,11,0.12)">Not enrolled</Tag>}</span>
          </div>
        </div>
      </Glass>

      <Glass style={{ padding: 20 }}>
        <SectionLabel style={{ marginBottom: 12 }}>Recent activity</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ordered.map((l, i) => {
            const credit = l.amount < 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < ordered.length - 1 ? "1px solid var(--hair)" : "none" }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: credit ? "rgba(34,197,94,0.1)" : "var(--fill-2)", border: "1px solid " + (credit ? "rgba(34,197,94,0.25)" : "var(--hair-3)") }}>
                  <Icon name={credit ? "arrow-down-left" : "arrow-up-right"} size={14} color={credit ? "#22c55e" : "var(--ink-4)"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{l.desc}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{l.date}</div>
                </div>
                <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: credit ? "#22c55e" : "var(--ink)" }}>{credit ? "−" : "+"}{moneyFull(Math.abs(l.amount))}</span>
              </div>
            );
          })}
        </div>
      </Glass>
    </div>
  );
}

function monthLabel(monthsAgo: number): string {
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // anchored to the demo "now" (2026-06-09) to stay deterministic
  const idx = (5 - monthsAgo + 12) % 12; // Jan..Jun spread
  return names[idx];
}
