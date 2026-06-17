// DispatchBoard — the field/dispatch efficiency surface. At 40 buildings the win
// is routing one vendor to several nearby jobs instead of one truck-roll each.
// This clusters open field work geographically (haversine over BUILDING_GEO) and
// surfaces unrouted intake + live emergencies. All actions route through the seam.
import { useMemo } from "react";
import type { Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { BUILDING_GEO } from "@/data/buildings";
import { atFrontDesk } from "@/data/routing";
import { TopBar } from "@/components/shell/TopBar";
import { Btn, Glass, Icon, PrioDot, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const CLUSTER_KM = 3.5; // jobs within this radius can share a truck-roll

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const isField = (t: Ticket) => (t.type === "Maintenance" || t.type === "Facility" || !!t.vendor);

export function DispatchBoard() {
  const { tickets, emergencies, nav } = useOrbit();

  const fieldOpen = useMemo(() => tickets.filter((t) => t.status !== "Closed" && !t.mergedInto && isField(t)), [tickets]);
  const unrouted = useMemo(() => tickets.filter((t) => t.status !== "Closed" && !t.mergedInto && atFrontDesk(t)), [tickets]);

  // geo-cluster open field work by building proximity
  const clusters = useMemo(() => buildClusters(fieldOpen), [fieldOpen]);
  const activeEm = emergencies.filter((e) => e.status !== "resolved");

  const batchable = clusters.filter((c) => c.buildingIds.length > 1);
  const truckRolls = clusters.length;
  const savedRolls = fieldOpen.length - truckRolls; // jobs minus needed visits

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Dispatch" sub={`${fieldOpen.length} field jobs · ${batchable.length} batchable clusters · ${unrouted.length} unrouted`} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>

        {activeEm.length > 0 && (
          <Glass style={{ padding: 14, marginBottom: 14, borderLeft: "3px solid #ef4444" }} accent="#ef4444">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: "rgba(239,68,68,0.12)", animation: "orbit-pulse 1.6s ease-in-out infinite" }}><Icon name="siren" size={16} color="#ef4444" /></span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontFamily: SANS, fontSize: 14, color: "var(--ink)" }}>{activeEm.length} active emergency{activeEm.length > 1 ? "ies" : ""} — dispatch first</strong>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{activeEm.map((e) => `${buildingById(e.building)?.code || e.building} · ${e.title}`).join(" · ")}</span>
              </div>
              <Btn small danger icon="arrow-up-right" onClick={() => nav("emergencies")}>Emergency Desk</Btn>
            </div>
          </Glass>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <Kpi label="Open field jobs" value={fieldOpen.length} color="#3b82f6" icon="wrench" />
          <Kpi label="Unrouted intake" value={unrouted.length} color={unrouted.length ? "#f59e0b" : "#22c55e"} icon="inbox" />
          <Kpi label="Batchable clusters" value={batchable.length} color={batchable.length ? "#22c55e" : "var(--ink)"} icon="route" />
          <Kpi label="Truck-rolls saved" value={Math.max(0, savedRolls)} color="#22c55e" icon="truck" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
          {/* geo clusters */}
          <Glass style={{ padding: 17 }}>
            <Header title="Dispatch clusters — batch one vendor, many jobs" icon="map-pin" count={clusters.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {clusters.length ? clusters.map((c, i) => <ClusterCard key={i} cluster={c} />)
                : <Empty icon="check-circle" text="No open field work to dispatch." />}
            </div>
          </Glass>

          {/* unrouted intake */}
          <Glass style={{ padding: 17, position: "sticky", top: 0 }}>
            <Header title="Front Desk — route or clear" icon="inbox" count={unrouted.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unrouted.length ? unrouted.map((t) => <UnroutedRow key={t.id} t={t} />)
                : <Empty icon="check-circle" text="Front Desk is clear — nothing waiting to route." />}
            </div>
          </Glass>
        </div>

        <p style={{ margin: "18px 0 0", fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-5)", textTransform: "uppercase" }}>
          Clusters group open field jobs within {CLUSTER_KM}km · send one crew, clear several buildings
        </p>
      </div>
    </div>
  );
}

interface Cluster { buildingIds: string[]; tickets: Ticket[]; spreadKm: number; area: string }

// greedy proximity clustering over the buildings that have open field work
function buildClusters(jobs: Ticket[]): Cluster[] {
  const byBuilding = new Map<string, Ticket[]>();
  jobs.forEach((t) => { if (!byBuilding.has(t.building)) byBuilding.set(t.building, []); byBuilding.get(t.building)!.push(t); });
  const ids = [...byBuilding.keys()].filter((id) => BUILDING_GEO[id]);
  const used = new Set<string>();
  const clusters: Cluster[] = [];
  for (const id of ids) {
    if (used.has(id)) continue;
    const group = [id]; used.add(id);
    for (const other of ids) {
      if (used.has(other)) continue;
      if (haversineKm(BUILDING_GEO[id], BUILDING_GEO[other]) <= CLUSTER_KM) { group.push(other); used.add(other); }
    }
    let spread = 0;
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) spread = Math.max(spread, haversineKm(BUILDING_GEO[group[i]], BUILDING_GEO[group[j]]));
    const ts = group.flatMap((g) => byBuilding.get(g)!);
    clusters.push({ buildingIds: group, tickets: ts, spreadKm: Math.round(spread * 10) / 10, area: areaLabel(group) });
  }
  // also fold in jobs whose building lacks geo (rare) into a single "unmapped" cluster
  const noGeo = [...byBuilding.keys()].filter((id) => !BUILDING_GEO[id]);
  if (noGeo.length) clusters.push({ buildingIds: noGeo, tickets: noGeo.flatMap((g) => byBuilding.get(g)!), spreadKm: 0, area: "Unmapped" });
  return clusters.sort((a, b) => b.tickets.length - a.tickets.length);
}

const areaLabel = (ids: string[]) => {
  const names = ids.map((id) => buildingById(id)?.code || id);
  return ids.length > 1 ? `${ids.length} buildings` : names[0];
};

function ClusterCard({ cluster }: { cluster: Cluster }) {
  const { openCommand } = useOrbit();
  const multi = cluster.buildingIds.length > 1;
  const urgent = cluster.tickets.filter((t) => ["Critical", "High"].includes(t.prio)).length;
  return (
    <div style={{ border: "1px solid var(--hair-2)", borderRadius: 14, overflow: "hidden", background: "var(--fill-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderBottom: "1px solid var(--hair-2)" }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: multi ? "rgba(34,197,94,0.12)" : "var(--fill-3)" }}>
          <Icon name={multi ? "route" : "map-pin"} size={15} color={multi ? "#22c55e" : "var(--ink-3)"} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <strong style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)" }}>{cluster.buildingIds.map((id) => buildingById(id)?.name || id).join(" + ")}</strong>
            {multi && <Tag color="#22c55e" bg="rgba(34,197,94,0.12)">Batch · save {cluster.tickets.length - 1} rolls</Tag>}
          </span>
          <span style={{ display: "block", marginTop: 2, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{cluster.tickets.length} jobs{urgent ? ` · ${urgent} urgent` : ""}{multi ? ` · ${cluster.spreadKm}km spread` : ""}</span>
        </div>
        {multi && <Btn small icon="truck">Dispatch crew</Btn>}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {cluster.tickets.map((t) => (
          <button key={t.id} onClick={() => openCommand(t.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", border: 0, borderTop: "1px solid var(--hair)", background: "none", cursor: "pointer", textAlign: "left" }}>
            <PrioDot prio={t.prio} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
            <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{buildingById(t.building)?.code} · {t.vendor || "no vendor"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UnroutedRow({ t }: { t: Ticket }) {
  const { openCommand, routeTicket } = useOrbit();
  return (
    <div className="attention-row" style={{ cursor: "default" }}>
      <span className="attention-row-icon" style={{ background: "rgba(245,158,11,0.12)" }}><Icon name="inbox" size={15} color="#f59e0b" /></span>
      <button onClick={() => openCommand(t.id)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: 0, cursor: "pointer", padding: 0 }}>
        <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
        <span style={{ display: "block", marginTop: 2, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{t.id} · {buildingById(t.building)?.code} · {t.prio}</span>
      </button>
      <Btn small primary icon="route" onClick={() => routeTicket(t.id, isField(t) ? "super" : "facilities")}>Route</Btn>
    </div>
  );
}

function Kpi({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <Glass style={{ padding: 14 }} accent={color}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Icon name={icon} size={14} color={color} /><span style={micro}>{label}</span>
      </div>
      <strong style={{ fontFamily: SANS, fontSize: 26, lineHeight: 1, color: value ? color : "var(--ink)" }}>{value}</strong>
    </Glass>
  );
}

function Header({ title, icon, count }: { title: string; icon: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
      <Icon name={icon} size={16} color="var(--acc-text)" />
      <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.1)", padding: "2px 7px", borderRadius: 99 }}>{count}</span>
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: 26, textAlign: "center" }}>
      <Icon name={icon} size={24} color="#22c55e" />
      <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>{text}</p>
    </div>
  );
}

const micro: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" };
