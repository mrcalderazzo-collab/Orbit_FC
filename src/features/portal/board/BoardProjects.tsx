// BoardProjects — the capital pipeline the board governs: scope, budget vs spent,
// awarded vendor, timeline, and stage. Scoped to the building.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { capitalProjects } from "@/data/governance";
import { fmtMoney } from "@/lib/format";
import { Glass, Icon, Tag } from "@/components/ui";
import { statusColor } from "./BoardDashboard";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });

export function BoardProjects() {
  const { currentUser } = useOrbit();
  const bId = currentUser?.building ?? "";
  const b = buildingById(bId);
  const projects = useMemo(() => capitalProjects(bId), [bId]);
  const totalBudget = projects.reduce((a, p) => a + p.budget, 0);
  const totalSpent = projects.reduce((a, p) => a + p.spent, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Capital projects</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          {b?.name} · {projects.length} projects · {fmtMoney(totalSpent)} of {fmtMoney(totalBudget)} spent
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        {projects.map((p) => {
          const c = statusColor(p.status);
          return (
            <Glass key={p.id} style={{ padding: 18, borderLeft: "3px solid " + c }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 15.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 3 }}>{p.category}</div>
                </div>
                <Tag color={c} bg={c + "1f"}>{p.status}</Tag>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{p.pct}% complete</span>
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: "var(--ink-3)" }}>{fmtMoney(p.spent)} / {fmtMoney(p.budget)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}>
                <div style={{ width: p.pct + "%", height: "100%", background: c }} />
              </div>

              <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--hair-2)" }}>
                <Meta icon="hard-hat" label="Vendor" value={p.vendor} />
                <Meta icon="calendar" label="Timeline" value={fmtDate(p.start) + " – " + fmtDate(p.end)} />
              </div>
            </Glass>
          );
        })}
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Icon name={icon} size={12} color="var(--ink-4)" />{value}</span>
    </div>
  );
}
