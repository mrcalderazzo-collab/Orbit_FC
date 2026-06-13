// Super Systems & Access — the building's plant at a glance plus the access
// playbook the super owns (keys, entry, vendor escort). Read-only health from
// BUILDING_SYSTEMS; access notes from the super's record.
import { useOrbit } from "@/store/OrbitProvider";
import type { BuildingSystem } from "@/lib/types";
import { buildingById } from "@/data/seed";
import { superByBuilding } from "@/data/supers";
import { BUILDING_SYSTEMS } from "@/data/buildings";
import { Glass, Icon, SectionLabel, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const STATE: Record<BuildingSystem["state"], { label: string; color: string; icon: string }> = {
  healthy: { label: "Healthy", color: "#22c55e", icon: "circle-check" },
  watch: { label: "Watch", color: "#f59e0b", icon: "eye" },
  risk: { label: "At risk", color: "#ef4444", icon: "triangle-alert" },
  offline: { label: "Offline", color: "#ef4444", icon: "power-off" },
};
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function SuperSystems() {
  const { currentUser } = useOrbit();
  const b = currentUser?.building ? buildingById(currentUser.building) : undefined;
  const sup = superByBuilding(currentUser?.building);
  const systems = BUILDING_SYSTEMS.filter((s) => s.buildingId === currentUser?.building);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Systems &amp; access</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b?.name} · plant &amp; entry</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {systems.map((s) => {
          const m = STATE[s.state];
          return (
            <Glass key={s.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.color + "1a" }}>
                  <Icon name={m.icon} size={17} color={m.color} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.name}</span>
                    <Tag color={m.color}>{m.label}</Tag>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 3 }}>{s.kind} · {s.location}</div>
                </div>
                <strong style={{ fontFamily: SANS, fontSize: 22, color: m.color }}>{s.health}</strong>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden", margin: "12px 0" }}>
                <div style={{ width: s.health + "%", height: "100%", background: m.color }} />
              </div>
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.signal}</p>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12, paddingTop: 11, borderTop: "1px solid var(--hair-2)" }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>Vendor · {s.vendor}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: s.state === "risk" ? "#ef4444" : "var(--ink-3)" }}>Next · {fmtDate(s.nextService)}</span>
              </div>
            </Glass>
          );
        })}
      </div>

      {sup && (
        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Access playbook</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sup.access.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Icon name="key-round" size={15} color="#14b8a6" />
                <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{a}</span>
              </div>
            ))}
          </div>
          {sup.staff.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--hair-2)" }}>
              <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase", marginBottom: 10 }}>My on-site staff</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sup.staff.map((st) => (
                  <span key={st.name} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px 5px 5px", borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(20,184,166,0.14)", color: "#14b8a6", fontFamily: MONO, fontSize: 8.5, fontWeight: 700 }}>{st.initials}</span>
                    <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-2)" }}>{st.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{st.role}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Glass>
      )}
    </div>
  );
}
