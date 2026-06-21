import { useMemo, useState } from "react";
import type { Building, BuildingFile, BuildingRecord, BuildingSystem, BuildingTourArea, SiteVisit, Ticket, TourHotspot } from "@/lib/types";
import { attentionOf } from "@/lib/attention";
import { fmtMoney, fmtPct } from "@/lib/format";
import { ticketFlow } from "@/data/flow";
import { BUILDINGS, PEOPLE, ROSTER } from "@/data/seed";
import { BUILDING_CHANGES, BUILDING_FILES, BUILDING_RECORDS, BUILDING_SYSTEMS, BUILDING_TOUR_AREAS, SITE_VISITS } from "@/data/buildings";
import { useOrbit, type OrbitEvent } from "@/store/OrbitProvider";
import { AttentionChip, Avatar, Btn, Glass, Icon, PrioDot, SectionLabel, StatusTag, Tag } from "@/components/ui";
import { ThemeSwitcher } from "@/components/shell/TopBar";
import { BuildingMap } from "./BuildingMap";
import { BuildingActionBar, BuildingActionModals, SystemDetailModal, VendorPeek } from "./BuildingActions";
import { buildingImage } from "@/data/buildings";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

type DetailTab = "overview" | "visits" | "walkthrough" | "systems" | "people" | "tickets" | "activity" | "files";

const SYSTEM_META: Record<BuildingSystem["state"], { label: string; color: string; icon: string }> = {
  healthy: { label: "Healthy", color: "#22c55e", icon: "circle-check" },
  watch: { label: "Watch", color: "#f59e0b", icon: "eye" },
  risk: { label: "At risk", color: "#ef4444", icon: "triangle-alert" },
  offline: { label: "Offline", color: "#ef4444", icon: "power-off" },
};

const RECORD_META: Record<BuildingRecord["status"], string> = {
  Current: "#22c55e",
  "Due soon": "#f59e0b",
  "Needs review": "#ef4444",
};

export function BuildingsPage({ buildingId }: { buildingId: string | null }) {
  const { nav } = useOrbit();
  const building = BUILDINGS.find((item) => item.id === buildingId);
  if (building) return <BuildingDetail building={building} onBack={() => nav("buildings")} />;
  return <BuildingDirectory onOpen={(id) => nav("buildings", id)} />;
}

export type DirRow = { building: Building; activeTickets: Ticket[]; urgent: number; riskSystems: number; avgHealth: number };
type DirView = "grid" | "list" | "map";

const VIEWS: { key: DirView; label: string; icon: string }[] = [
  { key: "grid", label: "Grid", icon: "layout-grid" },
  { key: "list", label: "List", icon: "list" },
  { key: "map", label: "Map", icon: "map" },
];

export function rowAttention(row: DirRow): { color: string; label: string } {
  if (row.urgent > 0 || row.riskSystems > 0 || row.building.compliance === "alert") return { color: "#ef4444", label: "Needs attention" };
  if (row.building.compliance === "review") return { color: "#f59e0b", label: "Review due" };
  return { color: "#22c55e", label: "Healthy" };
}

function BuildingDirectory({ onOpen }: { onOpen: (id: string) => void }) {
  const { tickets, nav } = useOrbit();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attention" | "healthy">("all");
  const [view, setView] = useState<DirView>("grid");

  const rows = useMemo(() => BUILDINGS.map((building) => {
    const systems = BUILDING_SYSTEMS.filter((system) => system.buildingId === building.id);
    const activeTickets = tickets.filter((ticket) => ticket.building === building.id && ticket.status !== "Closed");
    const urgent = activeTickets.filter((ticket) => ["Critical", "High"].includes(ticket.prio)).length;
    const riskSystems = systems.filter((system) => system.state === "risk" || system.state === "offline").length;
    const avgHealth = Math.round(systems.reduce((sum, system) => sum + system.health, 0) / systems.length);
    return { building, activeTickets, urgent, riskSystems, avgHealth };
  }).filter((row) => {
    const matches = (row.building.name + " " + row.building.address + " " + row.building.code).toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (filter === "attention") return row.urgent > 0 || row.riskSystems > 0 || row.building.compliance !== "ok";
    if (filter === "healthy") return row.urgent === 0 && row.riskSystems === 0 && row.building.compliance === "ok";
    return true;
  }), [filter, query, tickets]);

  const attentionCount = BUILDINGS.filter((building) => {
    const hasUrgent = tickets.some((ticket) => ticket.building === building.id && ticket.status !== "Closed" && ["Critical", "High"].includes(ticket.prio));
    const hasRisk = BUILDING_SYSTEMS.some((system) => system.buildingId === building.id && ["risk", "offline"].includes(system.state));
    return hasUrgent || hasRisk || building.compliance !== "ok";
  }).length;

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <header className="orbit-page-header">
        <div>
          <h1 style={pageTitle}>Buildings</h1>
          <p style={pageSub}>{BUILDINGS.length} buildings · {attentionCount} need attention · one operational record per property</p>
        </div>
        <ThemeSwitcher />
      </header>

      <div className="building-toolbar">
        <label className="building-search">
          <Icon name="search" size={16} color="var(--ink-4)" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buildings, codes, addresses..." />
        </label>
        <div className="building-filter-row">
          {([
            ["all", "All"],
            ["attention", "Needs attention"],
            ["healthy", "Healthy"],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={filter === key ? "building-filter active" : "building-filter"}>{label}</button>
          ))}
        </div>
        <div className="building-view-toggle">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)} className={view === v.key ? "building-view-btn active" : "building-view-btn"} title={v.label + " view"}>
              <Icon name={v.icon} size={14} color={view === v.key ? "var(--acc)" : "var(--ink-4)"} />{v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "grid" && (
        <div className="building-directory-grid">
          {rows.map((row) => <BuildingGridCard key={row.building.id} row={row} onOpen={onOpen} />)}
        </div>
      )}
      {view === "list" && (
        <div className="building-view-body">
          <BuildingList rows={rows} onOpen={onOpen} />
        </div>
      )}
      {view === "map" && (
        <div className="building-view-body">
          <BuildingMap rows={rows} onOpen={onOpen} onVendor={(id) => nav("vendors", id)} />
        </div>
      )}
    </div>
  );
}

function BuildingGridCard({ row, onOpen }: { row: DirRow; onOpen: (id: string) => void }) {
  const { building, activeTickets, urgent, riskSystems, avgHealth } = row;
  const manager = PEOPLE[building.am];
  const healthColor = avgHealth >= 85 ? "#22c55e" : avgHealth >= 70 ? "#f59e0b" : "#ef4444";
  const photo = buildingImage(building.id);
  return (
    <button onClick={() => onOpen(building.id)} className="building-card-button" aria-label={`Open ${building.name}`}>
      <Glass hover accent={building.mono} className="building-card">
        <div className="building-card-photo" style={{ backgroundImage: photo ? `url(${photo})` : undefined, backgroundColor: `color-mix(in srgb, ${building.mono} 18%, var(--fill-2))` }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="building-mark" style={{ color: building.mono, background: `color-mix(in srgb, ${building.mono} 12%, transparent)`, borderColor: `color-mix(in srgb, ${building.mono} 35%, transparent)` }}>
            <Icon name="building-2" size={21} color={building.mono} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontFamily: SANS, fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>{building.name}</h2>
              <Tag>{building.type}</Tag>
            </div>
            <p style={{ margin: "4px 0 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{building.code} · {building.address}</p>
          </div>
          <Icon name="arrow-up-right" size={17} color="var(--ink-4)" />
        </div>

        <div className="building-card-metrics">
          <MiniMetric label="Systems health" value={`${avgHealth}%`} color={healthColor} />
          <MiniMetric label="Active work" value={String(activeTickets.length)} color={urgent ? "#ef4444" : "var(--ink)"} />
          <MiniMetric label="Risk systems" value={String(riskSystems)} color={riskSystems ? "#ef4444" : "#22c55e"} />
          <MiniMetric label="Units" value={String(building.units)} />
        </div>

        <div className="building-card-footer">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar person={manager} size={25} />
            <span>
              <span style={{ display: "block", fontFamily: SANS, fontSize: 11.5, color: "var(--ink-2)" }}>{manager.name}</span>
              <span style={micro}>ACCOUNT MANAGER</span>
            </span>
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: building.compliance === "ok" ? "#22c55e" : building.compliance === "review" ? "#f59e0b" : "#ef4444", textTransform: "uppercase" }}>
            {building.compliance === "ok" ? "Compliance clear" : building.compliance === "review" ? "Review due" : "Compliance alert"}
          </span>
        </div>
      </Glass>
    </button>
  );
}

function BuildingList({ rows, onOpen }: { rows: DirRow[]; onOpen: (id: string) => void }) {
  return (
    <div className="building-list">
      <div className="building-list-head">
        <span>Building</span>
        <span className="bl-col">Type</span>
        <span className="bl-col">Units</span>
        <span className="bl-col bl-health">Systems health</span>
        <span className="bl-col">Active</span>
        <span className="bl-col bl-status">Status</span>
        <span className="bl-am">Account manager</span>
      </div>
      {rows.map((row) => {
        const { building, activeTickets, urgent, avgHealth } = row;
        const manager = PEOPLE[building.am];
        const healthColor = avgHealth >= 85 ? "#22c55e" : avgHealth >= 70 ? "#f59e0b" : "#ef4444";
        const attn = rowAttention(row);
        const photo = buildingImage(building.id);
        return (
          <button key={building.id} onClick={() => onOpen(building.id)} className="building-list-row" aria-label={`Open ${building.name}`}>
            <span className="bl-name">
              <span className="bl-thumb" style={{ backgroundImage: photo ? `url(${photo})` : undefined, backgroundColor: `color-mix(in srgb, ${building.mono} 18%, var(--fill-2))` }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{building.name}</span>
                <span style={micro}>{building.code}</span>
              </span>
            </span>
            <span className="bl-col"><Tag>{building.type}</Tag></span>
            <span className="bl-col" style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink-2)" }}>{building.units}</span>
            <span className="bl-col bl-health">
              <span className="building-list-health"><span style={{ width: `${avgHealth}%`, background: healthColor }} /></span>
              <strong style={{ fontFamily: MONO, fontSize: 11, color: healthColor }}>{avgHealth}%</strong>
            </span>
            <span className="bl-col" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: urgent ? "#ef4444" : "var(--ink-2)" }}>{activeTickets.length}{urgent ? ` · ${urgent}!` : ""}</span>
            <span className="bl-col bl-status">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: attn.color, textTransform: "uppercase" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: attn.color }} />{attn.label}
              </span>
            </span>
            <span className="bl-am">
              <Avatar person={manager} size={24} />
              <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{manager.name}</span>
            </span>
            <Icon name="chevron-right" size={16} color="var(--ink-4)" />
          </button>
        );
      })}
    </div>
  );
}


function BuildingDetail({ building, onBack }: { building: Building; onBack: () => void }) {
  const { tickets, notices, workOrders, events, openCommand, nav } = useOrbit();
  const [tab, setTab] = useState<DetailTab>("overview");
  const systems = BUILDING_SYSTEMS.filter((system) => system.buildingId === building.id);
  const records = BUILDING_RECORDS.filter((record) => record.buildingId === building.id);
  const visits = SITE_VISITS.filter((visit) => visit.buildingId === building.id);
  const files = BUILDING_FILES.filter((file) => file.buildingId === building.id);
  const changes = BUILDING_CHANGES.filter((change) => change.buildingId === building.id);
  const tourAreas = BUILDING_TOUR_AREAS.filter((area) => area.buildingId === building.id);
  const buildingTickets = tickets.filter((ticket) => ticket.building === building.id && !ticket.mergedInto);
  const buildingTicketIds = new Set(buildingTickets.map((ticket) => ticket.id));
  const buildingEvents = events.filter((event) =>
    event.building === building.id ||
    (event.entityType === "building" && event.entityId === building.id) ||
    (event.entityType === "ticket" && buildingTicketIds.has(event.entityId))
  );
  const activeTickets = buildingTickets.filter((ticket) => ticket.status !== "Closed");
  const manager = PEOPLE[building.am];
  const roster = ROSTER[building.id];
  const riskSystems = systems.filter((system) => system.state === "risk" || system.state === "offline");
  const dueRecords = records.filter((record) => record.status !== "Current");
  const buildingNotices = notices.filter((notice) => notice.building === building.id);
  const buildingWos = Object.values(workOrders).filter((workOrder) => workOrder.buildingId === building.id);
  const avgHealth = Math.round(systems.reduce((sum, system) => sum + system.health, 0) / systems.length);

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <header className="building-detail-header">
        <button onClick={onBack} className="building-back" aria-label="Back to buildings"><Icon name="arrow-left" size={17} color="var(--ink-2)" /></button>
        {buildingImage(building.id)
          ? <span className="building-hero" style={{ backgroundImage: `url(${buildingImage(building.id)})`, borderColor: `color-mix(in srgb, ${building.mono} 35%, transparent)` }} />
          : (
            <span className="building-mark" style={{ color: building.mono, background: `color-mix(in srgb, ${building.mono} 12%, transparent)`, borderColor: `color-mix(in srgb, ${building.mono} 35%, transparent)` }}>
              <Icon name="building-2" size={21} color={building.mono} />
            </span>
          )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ ...pageTitle, fontSize: 24 }}>{building.name}</h1>
            <Tag color={building.mono}>{building.code}</Tag>
            <Tag>{building.type} · {building.plan}</Tag>
          </div>
          <p style={{ ...pageSub, marginTop: 5 }}>{building.address} · {building.units} units · managed by {manager.name}</p>
        </div>
        <BuildingActionBar building={building} onMessage={() => nav("comms")} />
        <ThemeSwitcher />
      </header>

      <div className="building-detail-tabs">
        {([
          ["overview", "Overview", "layout-dashboard", riskSystems.length + dueRecords.length],
          ["visits", "Site visits", "calendar-range", visits.filter((visit) => visit.status !== "Completed").length],
          ["walkthrough", "3D walkthrough", "scan", tourAreas.length],
          ["systems", "Systems", "activity", riskSystems.length],
          ["people", "People", "users", 1 + roster.staff.length + roster.board.length],
          ["tickets", "Tickets", "ticket", activeTickets.length],
          ["activity", "Activity", "history", buildingEvents.length],
          ["files", "Documents", "folder-kanban", dueRecords.length],
        ] as const).map(([key, label, icon, badge]) => (
          <button key={key} onClick={() => setTab(key)} className={tab === key ? "building-tab active" : "building-tab"}>
            <Icon name={icon} size={15} color={tab === key ? "var(--acc)" : "var(--ink-4)"} />{label}
            {badge > 0 && <span>{badge}</span>}
          </button>
        ))}
      </div>

      <div className="building-detail-body">
        {tab === "overview" && (
          <OverviewTab
            building={building}
            systems={systems}
            records={records}
            tickets={activeTickets}
            notices={buildingNotices.length}
            workOrders={buildingWos.length}
            avgHealth={avgHealth}
            onTicket={openCommand}
            onTab={setTab}
          />
        )}
        {tab === "visits" && <SiteVisitsTab building={building} visits={visits} files={files} onTicket={openCommand} />}
        {tab === "walkthrough" && <VirtualWalkthrough areas={tourAreas} files={files} onTicket={openCommand} />}
        {tab === "systems" && <SystemsTab building={building} systems={systems} onTicket={openCommand} />}
        {tab === "people" && <PeopleTab building={building} />}
        {tab === "tickets" && <TicketsTab tickets={buildingTickets} onTicket={openCommand} />}
        {tab === "activity" && <BuildingActivityTab events={buildingEvents} onTicket={openCommand} />}
        {tab === "files" && <FilesChangesTab building={building} files={files} records={records} changes={changes} onTicket={openCommand} />}
      </div>
    </div>
  );
}

function OverviewTab({
  building, systems, records, tickets, notices, workOrders, avgHealth, onTicket, onTab,
}: {
  building: Building;
  systems: BuildingSystem[];
  records: BuildingRecord[];
  tickets: Ticket[];
  notices: number;
  workOrders: number;
  avgHealth: number;
  onTicket: (id: string) => void;
  onTab: (tab: DetailTab) => void;
}) {
  const systemAlerts = systems.filter((system) => system.state !== "healthy");
  const recordAlerts = records.filter((record) => record.status !== "Current");
  const margin = building.monthlyIncome - building.monthlyExpense;

  return (
    <div className="building-overview-grid">
      <section className="building-overview-main">
        <div className="building-kpi-grid">
          <Kpi icon="activity" label="Systems health" value={`${avgHealth}%`} sub={`${systemAlerts.length} need attention`} color={avgHealth >= 85 ? "#22c55e" : "#f59e0b"} onClick={() => onTab("systems")} />
          <Kpi icon="ticket" label="Active work" value={String(tickets.length)} sub={`${tickets.filter((ticket) => ["Critical", "High"].includes(ticket.prio)).length} high priority`} color={tickets.some((ticket) => ticket.prio === "Critical") ? "#ef4444" : "var(--ink)"} onClick={() => onTab("tickets")} />
          <Kpi icon="calendar-range" label="Site visits" value={String(SITE_VISITS.filter((visit) => visit.buildingId === building.id && visit.status !== "Completed").length)} sub="walks, vendors, inspections" color="var(--acc-text)" onClick={() => onTab("visits")} />
          <Kpi icon="circle-dollar-sign" label="Monthly margin" value={fmtMoney(margin)} sub={`${fmtPct(building.delinquency)} delinquency`} color={margin >= 0 ? "#22c55e" : "#ef4444"} />
        </div>

        <Glass style={{ padding: 17 }}>
          <HeaderLine title="Attention now" icon="radar" count={systemAlerts.length + recordAlerts.length + tickets.filter((ticket) => ["Critical", "High"].includes(ticket.prio)).length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tickets.filter((ticket) => ["Critical", "High"].includes(ticket.prio)).map((ticket) => (
              <button key={ticket.id} onClick={() => onTicket(ticket.id)} className="attention-row">
                <span className="attention-row-icon" style={{ background: "rgba(239,68,68,0.1)" }}><Icon name="ticket" size={15} color="#ef4444" /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={rowTitle}>{ticket.title}</span>
                  <span style={rowSub}>{ticket.id} · {ticket.status} · {ticket.assignee ? PEOPLE[ticket.assignee]?.name : "Unowned"}</span>
                </span>
                <PrioDot prio={ticket.prio} />
              </button>
            ))}
            {systemAlerts.map((system) => {
              const meta = SYSTEM_META[system.state];
              return (
                <button key={system.id} onClick={() => system.openTicketId ? onTicket(system.openTicketId) : onTab("systems")} className="attention-row">
                  <span className="attention-row-icon" style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}><Icon name={meta.icon} size={15} color={meta.color} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={rowTitle}>{system.name}</span>
                    <span style={rowSub}>{system.signal}</span>
                  </span>
                  <Tag color={meta.color}>{meta.label}</Tag>
                </button>
              );
            })}
            {recordAlerts.map((record) => (
              <button key={record.id} onClick={() => onTab("files")} className="attention-row">
                <span className="attention-row-icon" style={{ background: `color-mix(in srgb, ${RECORD_META[record.status]} 10%, transparent)` }}><Icon name="file-warning" size={15} color={RECORD_META[record.status]} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={rowTitle}>{record.title}</span>
                  <span style={rowSub}>{record.kind} · due {formatDate(record.due)}</span>
                </span>
                <Tag color={RECORD_META[record.status]}>{record.status}</Tag>
              </button>
            ))}
            {!systemAlerts.length && !recordAlerts.length && !tickets.length && <p style={{ margin: 0, color: "var(--ink-3)", fontFamily: SANS }}>Nothing needs attention.</p>}
          </div>
        </Glass>

        <Glass style={{ padding: 17 }}>
          <HeaderLine title="Systems snapshot" icon="activity" count={systems.length} action="View systems" onAction={() => onTab("systems")} />
          <div className="systems-snapshot">
            {systems.map((system) => <SystemCompact key={system.id} system={system} />)}
          </div>
        </Glass>
      </section>

      <aside className="building-overview-side">
        <Glass style={{ padding: 17 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Financial posture</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <MoneyRow label="Reserve" value={fmtMoney(building.reserve)} />
            <MoneyRow label="Operating" value={fmtMoney(building.operating)} />
            <MoneyRow label="Monthly income" value={fmtMoney(building.monthlyIncome)} />
            <MoneyRow label="Monthly expense" value={fmtMoney(building.monthlyExpense)} />
          </div>
        </Glass>
        <Glass style={{ padding: 17 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Operations footprint</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <InfoRow icon="users" label="Units" value={String(building.units)} />
            <InfoRow icon="clipboard-list" label="Work orders" value={String(workOrders)} />
            <InfoRow icon="megaphone" label="Notices" value={String(notices)} />
            <InfoRow icon="files" label="Documents" value={String(building.docs)} />
          </div>
        </Glass>
      </aside>
    </div>
  );
}

function SystemsTab({ building, systems, onTicket }: { building: Building; systems: BuildingSystem[]; onTicket: (id: string) => void }) {
  const { systemVendors } = useOrbit();
  const [detailSys, setDetailSys] = useState<BuildingSystem | null>(null);
  const [ticketSys, setTicketSys] = useState<BuildingSystem | null>(null);
  return (
    <div className="building-list-grid">
      {systems.map((system) => {
        const meta = SYSTEM_META[system.state];
        return (
          <Glass key={system.id} style={{ padding: 17, cursor: "pointer" }} hover accent={meta.color} onClick={() => setDetailSys(system)}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span className="attention-row-icon" style={{ width: 38, height: 38, background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}><Icon name={meta.icon} size={18} color={meta.color} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontFamily: SANS, fontSize: 15, color: "var(--ink)", fontWeight: 600 }}>{system.name}</h3>
                  <Tag color={meta.color}>{meta.label}</Tag>
                </div>
                <p style={{ margin: "4px 0 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{system.kind} · {system.location}</p>
              </div>
              <strong style={{ fontFamily: SANS, fontSize: 25, color: meta.color }}>{system.health}</strong>
            </div>
            <div className="system-health-track"><span style={{ width: `${system.health}%`, background: meta.color }} /></div>
            <p style={{ margin: "12px 0", minHeight: 38, fontFamily: SANS, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-2)" }}>{system.signal}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 11, borderTop: "1px solid var(--hair-2)" }}>
              <VendorPeek vendorName={systemVendors[system.id] ?? system.vendor} />
              <MiniMetric label="Next service" value={formatDate(system.nextService)} color={system.state === "risk" ? "#ef4444" : "var(--ink)"} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
              <Btn small icon="maximize-2" onClick={() => setDetailSys(system)}>Details</Btn>
              {system.openTicketId
                ? <Btn small primary icon="ticket" onClick={() => onTicket(system.openTicketId!)}>Open {system.openTicketId}</Btn>
                : <Btn small icon="plus" onClick={() => setTicketSys(system)}>Create ticket</Btn>}
            </div>
          </Glass>
        );
      })}
      <SystemDetailModal building={building} system={detailSys} open={!!detailSys} onClose={() => setDetailSys(null)} onCreateTicket={(s) => { setDetailSys(null); setTicketSys(s); }} />
      <BuildingActionModals building={building} open={ticketSys ? "ticket" : null} onClose={() => setTicketSys(null)} system={ticketSys ?? undefined} />
    </div>
  );
}

interface PersonCard { name: string; role: string; initials: string; color: string; email: string; phone: string; unit?: string; group: "internal" | "super" | "staff" | "board" }

function PeopleTab({ building }: { building: Building }) {
  const roster = ROSTER[building.id];
  const manager = PEOPLE[building.am];
  // board members are residents — give them a deterministic unit so the card is complete
  const boardUnit = (name: string) => `${1 + (hashName(name) % Math.max(1, building.units))}${["A", "B", "C", "D", "F"][hashName(name) % 5]}`;
  const people: PersonCard[] = [
    { name: manager.name, role: "Account manager", initials: manager.initials, color: manager.color, email: manager.email, phone: manager.phone, group: "internal" },
    { name: roster.super, role: "Resident superintendent", initials: initials(roster.super), color: building.mono, email: synthEmail(roster.super, "orbit.super"), phone: synthPhone(roster.super), unit: "Super's unit", group: "super" },
    ...roster.staff.map(([name, role]): PersonCard => ({ name, role, initials: initials(name), color: "#3b82f6", email: synthEmail(name, "orbit.ops"), phone: synthPhone(name), group: "staff" })),
    ...roster.board.map(([name, role]): PersonCard => ({ name, role: `Board ${role}`, initials: initials(name), color: "#a855f7", email: synthEmail(name, building.name.toLowerCase().replace(/[^a-z]/g, "") + "board.org"), phone: synthPhone(name), unit: boardUnit(name), group: "board" })),
  ];
  const GROUP_LABEL: Record<PersonCard["group"], string> = { internal: "Orbit team", super: "On-site", staff: "Building staff", board: "Board" };
  return (
    <div className="building-list-grid">
      {people.map((person) => (
        <Glass key={`${person.name}-${person.role}`} style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar person={{ name: person.name, initials: person.initials, color: person.color }} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{person.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 3, textTransform: "uppercase" }}>{person.role}</div>
            </div>
            <Tag color={person.group === "internal" ? "var(--acc-text)" : person.group === "board" ? "#a855f7" : "var(--ink-3)"}>{GROUP_LABEL[person.group]}</Tag>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--hair-2)" }}>
            {person.unit && <PersonLine icon="map-pin" text={person.unit} />}
            <PersonLine icon="mail" text={person.email} />
            <PersonLine icon="phone" text={person.phone} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <a href={`tel:${person.phone}`} style={peopleContactBtn}><Icon name="phone" size={13} color="var(--ink-2)" />Call</a>
            <a href={`mailto:${person.email}`} style={peopleContactBtn}><Icon name="mail" size={13} color="var(--ink-2)" />Email</a>
          </div>
        </Glass>
      ))}
    </div>
  );
}

function PersonLine({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <Icon name={icon} size={13} color="var(--ink-4)" />
      <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
}

function TicketsTab({ tickets, onTicket }: { tickets: Ticket[]; onTicket: (id: string) => void }) {
  return (
    <Glass style={{ overflow: "hidden" }}>
      {tickets.map((ticket) => {
        const flow = ticketFlow(ticket);
        const attention = attentionOf(ticket, flow);
        return (
          <button key={ticket.id} onClick={() => onTicket(ticket.id)} className="building-ticket-row">
            <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--acc-text)" }}>{ticket.id}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={rowTitle}>{ticket.title}</span>
              <span style={rowSub}>{ticket.assignee ? PEOPLE[ticket.assignee]?.name : "Unowned"} · {ticket.vendor || "No vendor"}</span>
            </span>
            <AttentionChip attn={attention} small />
            <StatusTag status={ticket.status} />
          </button>
        );
      })}
    </Glass>
  );
}

function BuildingActivityTab({ events, onTicket }: { events: OrbitEvent[]; onTicket: (id: string) => void }) {
  const ticketEvents = events.filter((event) => event.entityType === "ticket").length;
  const invoiceEvents = events.filter((event) => event.kind.startsWith("invoice")).length;
  const communicationEvents = events.filter((event) => event.kind.includes("message") || event.kind.includes("comment") || event.kind.startsWith("notice")).length;

  return (
    <div className="building-overview-grid">
      <section>
        <Glass style={{ padding: 17, overflow: "hidden" }}>
          <HeaderLine title="Building activity spine" icon="history" count={events.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.length ? events.map((event) => {
              const meta = buildingEventMeta(event.kind);
              const canOpenTicket = event.entityType === "ticket";
              return (
                <button
                  key={event.id}
                  onClick={() => canOpenTicket && onTicket(event.entityId)}
                  className="attention-row"
                  style={{ cursor: canOpenTicket ? "pointer" : "default" }}
                >
                  <span className="attention-row-icon" style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}>
                    <Icon name={meta.icon} size={15} color={meta.color} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={rowTitle}>{event.summary}</span>
                    <span style={rowSub}>{event.actor} - {formatDateTime(event.at)} - {event.entityType} {event.entityId}</span>
                  </span>
                  <Tag color={meta.color}>{event.kind.replaceAll(".", " ")}</Tag>
                </button>
              );
            }) : (
              <div style={{ padding: 18, border: "1px dashed var(--hair)", borderRadius: 16, fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>
                No audit events are attached to this building yet. Ticket moves, vendor work, invoices, board votes, messages, and field evidence will collect here.
              </div>
            )}
          </div>
        </Glass>
      </section>
      <aside>
        <Glass style={{ padding: 17, position: "sticky", top: 0 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Resume briefing</SectionLabel>
          <p style={{ margin: "0 0 14px", fontFamily: SANS, fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
            The <strong>automatic</strong> event stream — every ticket move, message, invoice, vote, and document, recorded as it happens. (For human-logged physical changes, see Documents → Changes.) Any PM or backup operator can see what changed without opening every ticket.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <MiniMetric label="Ticket events" value={String(ticketEvents)} color={ticketEvents ? "var(--acc-text)" : "var(--ink)"} />
            <MiniMetric label="Comms / notes" value={String(communicationEvents)} color={communicationEvents ? "#3b82f6" : "var(--ink)"} />
            <MiniMetric label="Invoices" value={String(invoiceEvents)} color={invoiceEvents ? "#22c55e" : "var(--ink)"} />
          </div>
        </Glass>
      </aside>
    </div>
  );
}

function SiteVisitsTab({ building, visits, files, onTicket }: { building: Building; visits: SiteVisit[]; files: BuildingFile[]; onTicket: (id: string) => void }) {
  const [schedule, setSchedule] = useState(false);
  return (
    <div className="site-visit-layout">
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visits.map((visit) => {
          const color = visit.status === "Scheduled" ? "#3b82f6" : visit.status === "Needs follow-up" ? "#f59e0b" : "#22c55e";
          const lead = PEOPLE[visit.lead];
          return (
            <Glass key={visit.id} style={{ padding: 17 }} hover accent={color}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span className="attention-row-icon" style={{ width: 40, height: 40, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
                  <Icon name={visit.purpose === "Vendor walk" ? "hard-hat" : visit.purpose === "Super meeting" ? "users" : "footprints"} size={19} color={color} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontFamily: SANS, fontSize: 16, color: "var(--ink)", fontWeight: 600 }}>{visit.title}</h3>
                    <Tag color={color}>{visit.status}</Tag>
                    <Tag>{visit.purpose}</Tag>
                  </div>
                  <p style={{ margin: "5px 0 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{formatDateTime(visit.startsAt)} · lead {lead?.name || visit.lead}</p>
                </div>
                {visit.relatedTicketId && <Btn small onClick={() => onTicket(visit.relatedTicketId!)}>{visit.relatedTicketId}</Btn>}
              </div>
              <div className="visit-detail-grid">
                <VisitBlock label="Meet with" values={visit.attendees} />
                <VisitBlock label="Walk areas" values={visit.areas} />
                <VisitBlock label="Agenda" values={visit.agenda} />
              </div>
              {visit.notes && <p className="visit-note"><Icon name="notebook-pen" size={14} color="var(--ink-3)" />{visit.notes}</p>}
              <div className="visit-file-strip">
                {visit.fileIds.map((id) => {
                  const file = files.find((item) => item.id === id);
                  return file ? <span key={id}><Icon name={fileIcon(file.kind)} size={13} color="var(--ink-3)" />{file.name}</span> : null;
                })}
              </div>
            </Glass>
          );
        })}
      </section>
      <aside>
        <Glass style={{ padding: 17, position: "sticky", top: 0 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Visit-ready package</SectionLabel>
          <p style={{ margin: "0 0 14px", fontFamily: SANS, fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)" }}>Everything the PM needs to walk in prepared and let the next person resume afterward.</p>
          {["Floor plans and access map", "Open-ticket briefings", "Vendor contact and scope", "Photo checklist by area", "Voice notes and field report", "Follow-up owners and deadlines"].map((item) => (
            <div key={item} className="visit-ready-item"><Icon name="check" size={13} color="var(--acc-text)" />{item}</div>
          ))}
          <Btn primary small icon="calendar-plus" style={{ marginTop: 16, width: "100%" }} onClick={() => setSchedule(true)}>Schedule site visit</Btn>
        </Glass>
      </aside>
      <BuildingActionModals building={building} open={schedule ? "visit" : null} onClose={() => setSchedule(false)} />
    </div>
  );
}

export function VirtualWalkthrough({ areas, files, onTicket }: { areas: BuildingTourArea[]; files: BuildingFile[]; onTicket: (id: string) => void }) {
  const [areaId, setAreaId] = useState(areas[0]?.id || "");
  const [hotspotId, setHotspotId] = useState<string | null>(areas[0]?.hotspots[0]?.id || null);
  const area = areas.find((item) => item.id === areaId) || areas[0];
  const hotspot = area?.hotspots.find((item) => item.id === hotspotId) || null;
  if (!area) return null;

  const selectArea = (id: string) => {
    const next = areas.find((item) => item.id === id);
    setAreaId(id);
    setHotspotId(next?.hotspots[0]?.id || null);
  };

  return (
    <div className="virtual-tour-layout">
      <aside className="tour-area-rail">
        <SectionLabel style={{ marginBottom: 12 }}>Walk the building</SectionLabel>
        {areas.map((item) => (
          <button key={item.id} onClick={() => selectArea(item.id)} className={item.id === area.id ? "tour-area active" : "tour-area"}>
            <span>{item.floor}</span>
            <span><strong>{item.name}</strong><small>{item.hotspots.length} mapped points</small></span>
          </button>
        ))}
        <div className="tour-help"><Icon name="mouse-pointer-2" size={14} color="var(--acc-text)" />Choose a floor, then select a marker to understand the equipment, issue, access route, or file.</div>
      </aside>

      <section className="tour-stage-wrap">
        <div className="tour-stage" style={{ "--tour-accent": area.accent } as React.CSSProperties}>
          <div className="tour-ceiling" />
          <div className="tour-wall tour-wall-left" />
          <div className="tour-wall tour-wall-right" />
          <div className="tour-floor-grid" />
          <div className="tour-back-wall">
            <Icon name="building-2" size={38} color={area.accent} />
            <strong>{area.name}</strong>
            <span>{area.viewpoint}</span>
          </div>
          {area.image && <div className="tour-photo" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,8,12,0.28), rgba(8,8,12,0.62)), url(${area.image})` }} />}
          {area.hotspots.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setHotspotId(item.id)}
              className={item.id === hotspot?.id ? `tour-hotspot active ${item.kind}` : `tour-hotspot ${item.kind}`}
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              aria-label={item.label}
            >
              <span>{index + 1}</span>
            </button>
          ))}
          <div className="tour-stage-label"><span>FLOOR {area.floor}</span><strong>{area.name}</strong><small>{area.description}</small></div>
          <div className="tour-controls"><button aria-label="Look left"><Icon name="rotate-ccw" size={15} color="var(--ink-2)" /></button><button aria-label="Move forward"><Icon name="move-up" size={15} color="var(--ink-2)" /></button><button aria-label="Look right"><Icon name="rotate-cw" size={15} color="var(--ink-2)" /></button></div>
        </div>
        <div className="tour-legend">
          <Legend color="#22c55e" label="Equipment" /><Legend color="#ef4444" label="Active issue" /><Legend color="#3b82f6" label="Access" /><Legend color="#a855f7" label="Document" />
        </div>
      </section>

      <aside>
        <Glass style={{ padding: 17 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Selected point</SectionLabel>
          {hotspot ? <HotspotDetail hotspot={hotspot} files={files} onTicket={onTicket} /> : <p style={{ color: "var(--ink-3)" }}>Select a marker.</p>}
        </Glass>
      </aside>
    </div>
  );
}

function HotspotDetail({ hotspot, files, onTicket }: { hotspot: TourHotspot; files: BuildingFile[]; onTicket: (id: string) => void }) {
  const colors: Record<TourHotspot["kind"], string> = { equipment: "#22c55e", issue: "#ef4444", access: "#3b82f6", document: "#a855f7" };
  const file = hotspot.fileId ? files.find((item) => item.id === hotspot.fileId) : null;
  return (
    <div>
      <Tag color={colors[hotspot.kind]}>{hotspot.kind}</Tag>
      <h3 style={{ margin: "12px 0 7px", fontFamily: SANS, fontSize: 18, color: "var(--ink)" }}>{hotspot.label}</h3>
      <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)" }}>{hotspot.detail}</p>
      {file && <div className="hotspot-file"><Icon name={fileIcon(file.kind)} size={16} color="#a855f7" /><span><strong>{file.name}</strong><small>{file.kind} · {file.size}</small></span></div>}
      {hotspot.relatedTicketId && <Btn primary small icon="ticket" style={{ marginTop: 14 }} onClick={() => onTicket(hotspot.relatedTicketId!)}>Open {hotspot.relatedTicketId}</Btn>}
    </div>
  );
}

function FilesChangesTab({ building, files, records, changes, onTicket }: { building: Building; files: BuildingFile[]; records: BuildingRecord[]; changes: typeof BUILDING_CHANGES; onTicket: (id: string) => void }) {
  const { buildingDocs } = useOrbit();
  const [section, setSection] = useState<"files" | "changes" | "records">("files");
  const docs = buildingDocs[building.id] || [];
  return (
    <div>
      <div className="building-subtabs">
        <button onClick={() => setSection("files")} className={section === "files" ? "active" : ""}>Documents <span>{files.length + docs.length}</span></button>
        <button onClick={() => setSection("changes")} className={section === "changes" ? "active" : ""}>Changes <span>{changes.length}</span></button>
        <button onClick={() => setSection("records")} className={section === "records" ? "active" : ""}>Compliance <span>{records.length}</span></button>
      </div>
      <p style={{ margin: "0 0 14px", fontFamily: SANS, fontSize: 12, color: "var(--ink-4)", lineHeight: 1.5 }}>
        {section === "files" && "Stored documents — plans, COIs, contracts, manuals, photo sets. Filed from here, the Log-file action, or a system's detail."}
        {section === "changes" && "A human-logged history of physical/operational changes to the building (“replaced lobby intercom”). For the automatic system event stream, see the Activity tab."}
        {section === "records" && "Compliance posture — insurance, inspections, contracts, governance — with status and due dates. The portfolio-wide view lives in Compliance Command."}
      </p>
      {section === "files" && (
        <div className="building-list-grid">
          {docs.map((d) => (
            <Glass key={d.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                <span className="attention-row-icon" style={{ width: 38, height: 38 }}><Icon name="file-text" size={18} color="var(--acc-text)" /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...rowTitle, fontSize: 13.5 }}>{d.name}</span>
                  <span style={rowSub}>{d.kind}{d.system ? " · " + d.system : ""}{d.vendor ? " · " + d.vendor : ""}</span>
                </span>
                <Tag color="var(--acc-text)">Filed</Tag>
              </div>
              <div className="file-meta-row"><span>{d.at}</span><span>{d.by}</span></div>
            </Glass>
          ))}
          {files.map((file) => <FileCard key={file.id} file={file} onTicket={onTicket} />)}
        </div>
      )}
      {section === "changes" && (
        <Glass style={{ overflow: "hidden" }}>
          {changes.map((change) => (
            <div key={change.id} className="building-change-row">
              <span className="attention-row-icon"><Icon name="git-commit-horizontal" size={16} color="var(--acc-text)" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={rowTitle}>{change.title}</span>
                <span style={rowSub}>{change.area} · {formatDate(change.changedAt)} · {PEOPLE[change.changedBy]?.name}</span>
                <span style={{ display: "block", marginTop: 7, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)" }}>{change.detail}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <Tag>{change.fileIds.length} files</Tag>
                {change.relatedTicketId && <Btn small onClick={() => onTicket(change.relatedTicketId!)}>{change.relatedTicketId}</Btn>}
              </span>
            </div>
          ))}
        </Glass>
      )}
      {section === "records" && (
        <Glass style={{ overflow: "hidden" }}>
          {records.map((record) => (
            <div key={record.id} className="building-record-row">
              <span className="attention-row-icon"><Icon name={recordIcon(record.kind)} size={16} color="var(--ink-3)" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={rowTitle}>{record.title}</span>
                <span style={rowSub}>{record.kind} · owner {PEOPLE[record.owner]?.name || record.owner}</span>
              </span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-3)" }}>DUE {formatDate(record.due).toUpperCase()}</span>
              <Tag color={RECORD_META[record.status]}>{record.status}</Tag>
            </div>
          ))}
        </Glass>
      )}
    </div>
  );
}

function FileCard({ file, onTicket }: { file: BuildingFile; onTicket: (id: string) => void }) {
  return (
    <Glass style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <span className="attention-row-icon" style={{ width: 38, height: 38 }}><Icon name={fileIcon(file.kind)} size={18} color="var(--acc-text)" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...rowTitle, fontSize: 13.5 }}>{file.name}</span>
          <span style={rowSub}>{file.kind} · {file.area}</span>
        </span>
        <button className="file-open-button" aria-label={`Open ${file.name}`}><Icon name="arrow-up-right" size={15} color="var(--ink-3)" /></button>
      </div>
      <div className="file-meta-row"><span>{file.size}</span><span>Updated {formatDate(file.updatedAt)}</span><span>{PEOPLE[file.updatedBy]?.name}</span></div>
      {file.relatedTicketId && <Btn small style={{ marginTop: 12 }} onClick={() => onTicket(file.relatedTicketId!)}>Linked {file.relatedTicketId}</Btn>}
    </Glass>
  );
}

function Kpi({ icon, label, value, sub, color, onClick }: { icon: string; label: string; value: string; sub: string; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="building-kpi">
      <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Icon name={icon} size={14} color={color} /><span style={micro}>{label}</span></span>
      <strong style={{ fontFamily: SANS, fontSize: 27, lineHeight: 1, color }}>{value}</strong>
      <span style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)" }}>{sub}</span>
    </button>
  );
}

function HeaderLine({ title, icon, count, action, onAction }: { title: string; icon: string; count: number; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
      <Icon name={icon} size={16} color="var(--acc-text)" />
      <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.1)", padding: "2px 7px", borderRadius: 99 }}>{count}</span>
      {action && <button onClick={onAction} style={{ marginLeft: "auto", border: 0, background: "none", color: "var(--ink-3)", fontFamily: MONO, fontSize: 9, cursor: "pointer", textTransform: "uppercase" }}>{action} →</button>}
    </div>
  );
}

function SystemCompact({ system }: { system: BuildingSystem }) {
  const meta = SYSTEM_META[system.state];
  return (
    <div className="system-compact">
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Icon name={meta.icon} size={14} color={meta.color} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{system.name}</span>
          <span style={micro}>{system.kind}</span>
        </span>
      </span>
      <strong style={{ fontFamily: MONO, fontSize: 11, color: meta.color }}>{system.health}%</strong>
    </div>
  );
}

function MiniMetric({ label, value, color = "var(--ink)" }: { label: string; value: string; color?: string }) {
  return <span><span style={micro}>{label}</span><strong style={{ display: "block", marginTop: 3, fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</strong></span>;
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>{label}</span><strong style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink)" }}>{value}</strong></div>;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon name={icon} size={14} color="var(--ink-4)" /><span style={{ flex: 1, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>{label}</span><strong style={{ fontFamily: MONO, fontSize: 11, color: "var(--ink)" }}>{value}</strong></div>;
}

function VisitBlock({ label, values }: { label: string; values: string[] }) {
  return <div><span style={micro}>{label}</span><div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 7 }}>{values.map((value) => <span key={value} style={{ display: "flex", gap: 6, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-2)" }}><Icon name="chevron-right" size={12} color="var(--ink-4)" />{value}</span>)}</div></div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span><i style={{ background: color }} />{label}</span>;
}

// keyed by the full dotted kind first, then by family prefix (the store emits
// dotted kinds like "ticket.created" / "calendar.add"), so both resolve cleanly.
const BUILDING_EVENT_META: Record<string, { icon: string; color: string }> = {
  "ticket.created": { icon: "sparkles", color: "#3b82f6" },
  "ticket.routed": { icon: "route", color: "#a855f7" },
  "ticket.status": { icon: "git-commit-horizontal", color: "#22c55e" },
  "ticket.comment": { icon: "message-square", color: "#3b82f6" },
  "ticket.message": { icon: "send", color: "#14b8a6" },
  "ticket.photo": { icon: "image", color: "#a855f7" },
  "invoice.recorded": { icon: "receipt", color: "#22c55e" },
  "vote.cast": { icon: "landmark", color: "#f59e0b" },
  "calendar.add": { icon: "calendar-plus", color: "#3b82f6" },
  "vendor.rated": { icon: "star", color: "#f59e0b" },
  "notice.sent": { icon: "megaphone", color: "#f59e0b" },
  "file.added": { icon: "file-up", color: "#a855f7" },
  "emergency.opened": { icon: "siren", color: "#ef4444" },
  "emergency.step": { icon: "git-commit-horizontal", color: "#ef4444" },
  "emergency.resolved": { icon: "shield-check", color: "#22c55e" },
};
const EVENT_FAMILY_META: Record<string, { icon: string; color: string }> = {
  ticket: { icon: "ticket", color: "var(--acc-text)" },
  invoice: { icon: "receipt", color: "#22c55e" },
  vote: { icon: "landmark", color: "#f59e0b" },
  calendar: { icon: "calendar-plus", color: "#3b82f6" },
  vendor: { icon: "star", color: "#f59e0b" },
  notice: { icon: "megaphone", color: "#f59e0b" },
  file: { icon: "file-up", color: "#a855f7" },
  emergency: { icon: "siren", color: "#ef4444" },
};

function buildingEventMeta(kind: string) {
  return BUILDING_EVENT_META[kind] || EVENT_FAMILY_META[kind.split(".")[0]] || { icon: "activity", color: "var(--acc-text)" };
}

const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
const hashName = (name: string) => name.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const synthEmail = (name: string, domain: string) => name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") + "@" + domain;
const synthPhone = (name: string) => "+1 (212) 555-0" + String(100 + (hashName(name) % 800));
const peopleContactBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center", padding: "7px 0", borderRadius: 9, background: "var(--fill-2)", border: "1px solid var(--hair-3)", fontFamily: "Outfit, sans-serif", fontSize: 11.5, color: "var(--ink-2)", textDecoration: "none", cursor: "pointer" };
const formatDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDateTime = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const recordIcon = (kind: BuildingRecord["kind"]) => ({ Insurance: "shield-check", Inspection: "clipboard-check", Contract: "file-signature", Financial: "circle-dollar-sign", Governance: "landmark" }[kind]);
const fileIcon = (kind: BuildingFile["kind"]) => ({ "Floor plan": "map", "Photo set": "images", Video: "video", Report: "file-text", Manual: "book-open", Access: "key-round" }[kind]);

const pageTitle: React.CSSProperties = { margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 27, color: "var(--ink)", letterSpacing: "-0.5px" };
const pageSub: React.CSSProperties = { margin: "6px 0 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" };
const micro: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" };
const rowTitle: React.CSSProperties = { display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const rowSub: React.CSSProperties = { display: "block", marginTop: 3, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
