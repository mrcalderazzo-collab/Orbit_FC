// BoardCompliance — the local-law calendar the board is ultimately responsible
// for: LL11/FISP, LL97, LL152, benchmarking, elevator, boiler, sprinkler, fire
// alarm. Status-coded with due dates and what to do. Scoped to the building.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { complianceItems, type ComplianceStatus } from "@/data/governance";
import { Glass, Icon, SectionLabel, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const META: Record<ComplianceStatus, { color: string; icon: string }> = {
  Overdue: { color: "#ef4444", icon: "alert-triangle" },
  "Action needed": { color: "#f59e0b", icon: "clock" },
  Upcoming: { color: "#3b82f6", icon: "calendar" },
  Compliant: { color: "#22c55e", icon: "check-circle-2" },
};
const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function BoardCompliance() {
  const { currentUser } = useOrbit();
  const bId = currentUser?.building ?? "";
  const b = buildingById(bId);
  const items = useMemo(() => complianceItems(bId), [bId]);
  const counts = items.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Compliance &amp; local law</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b?.name} · filings &amp; inspections</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {(["Overdue", "Action needed", "Upcoming", "Compliant"] as ComplianceStatus[]).map((s) => (
          <Glass key={s} style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name={META[s].icon} size={14} color={META[s].color} />
              <span style={{ fontFamily: SANS, fontSize: 22, fontWeight: 600, color: META[s].color }}>{counts[s] || 0}</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase", marginTop: 6 }}>{s}</div>
          </Glass>
        ))}
      </div>

      <Glass style={{ padding: 18 }}>
        <SectionLabel style={{ marginBottom: 12 }}>Filing calendar</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((c, i) => {
            const m = META[c.status];
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 0", borderBottom: i < items.length - 1 ? "1px solid var(--hair)" : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.color + "1a" }}>
                  <Icon name={m.icon} size={16} color={m.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.law}</span>
                    <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>{c.title}</span>
                    <Tag color={m.color} bg={m.color + "1f"} style={{ marginLeft: "auto" }}>{c.status}</Tag>
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", marginTop: 5, lineHeight: 1.5 }}>{c.note}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 5 }}>{c.agency} · due {fmtDate(c.due)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Glass>
    </div>
  );
}
