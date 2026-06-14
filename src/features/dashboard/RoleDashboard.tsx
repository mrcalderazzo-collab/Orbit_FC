// RoleDashboard — the role-tailored landing. Each operator position lands on a
// dashboard built for them: a curated set of widgets (from widgets.tsx), scoped
// to the buildings they own, every tile drilling into the underlying detail.
// Adding a new position = add a layout entry; reuse or add widgets.
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS } from "@/data/seed";
import { TopBar } from "@/components/shell/TopBar";
import { WIDGETS } from "./widgets";

const MONO = "'JetBrains Mono', monospace";

const ROLE_META: Record<string, { label: string; sub: string }> = {
  principal: { label: "Command", sub: "Everything, everywhere — full portfolio" },
  director: { label: "Agency overview", sub: "The whole organization at a glance" },
  am: { label: "My portfolio", sub: "The buildings you manage" },
  field: { label: "Field operations", sub: "What needs hands on site" },
  manager: { label: "Operations", sub: "Queue, SLA, team & vendors" },
  sales: { label: "Leasing & sales", sub: "Occupancy & pipeline" },
  marketing: { label: "Marketing", sub: "Funnel & sources" },
};

const LAYOUTS: Record<string, string[]> = {
  principal: ["attention", "tickets", "sla", "finance", "compliance", "health", "vendors", "recs", "occupancy", "staff"],
  director: ["finance", "tickets", "compliance", "occupancy", "health", "applications", "spend", "staff", "vendors", "sla"],
  am: ["myBuildings", "attention", "tickets", "comms", "finance", "compliance", "occupancy", "turnaround"],
  field: ["attention", "tickets", "emergencies", "vendors", "health", "turnaround", "bottlenecks"],
  manager: ["tickets", "sla", "bottlenecks", "staff", "comms", "vendors", "health"],
  sales: ["occupancy", "leasing", "applications", "turnaround", "comms"],
  marketing: ["marketing", "applications", "occupancy", "leasing"],
};

export function RoleDashboard() {
  const { currentUser } = useOrbit();
  const role = currentUser?.role || "principal";
  const meta = ROLE_META[role] || ROLE_META.principal;
  const layout = LAYOUTS[role] || LAYOUTS.principal;

  // scope: AMs see only the buildings they manage; everyone else, the portfolio
  const buildings = role === "am" && currentUser?.who
    ? BUILDINGS.filter((b) => b.am === currentUser.who)
    : BUILDINGS;
  const scoped = buildings.length ? buildings : BUILDINGS;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title={meta.label} sub={(currentUser?.title ? currentUser.title + " · " : "") + meta.sub} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, alignItems: "start" }}>
          {layout.map((id) => {
            const def = WIDGETS[id];
            if (!def) return null;
            return (
              <div key={id} style={{ gridColumn: def.w === 2 ? "span 2" : undefined, minWidth: 0 }}>
                {def.render({ buildings: scoped })}
              </div>
            );
          })}
        </div>
        <p style={{ margin: "20px 0 0", fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-5)", textTransform: "uppercase" }}>
          Tailored to {currentUser?.title || "your role"} · every tile opens the detail behind it
        </p>
      </div>
    </div>
  );
}
