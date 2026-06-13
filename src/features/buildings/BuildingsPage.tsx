import { useMemo, useState } from "react";
import type { Building, BuildingRecord, BuildingSystem, Ticket } from "@/lib/types";
import { attentionOf } from "@/lib/attention";
import { fmtMoney, fmtPct } from "@/lib/format";
import { ticketFlow } from "@/data/flow";
import { BUILDINGS, PEOPLE, ROSTER } from "@/data/seed";
import { BUILDING_RECORDS, BUILDING_SYSTEMS } from "@/data/buildings";
import { useOrbit } from "@/store/OrbitProvider";
import { AttentionChip, Avatar, Btn, Glass, Icon, PrioDot, SectionLabel, StatusTag, Tag } from "@/components/ui";
import { ThemeSwitcher } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

type DetailTab = "overview" | "systems" | "people" | "tickets" | "records";

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

function BuildingDirectory({ onOpen }: { onOpen: (id: string) => void }) {
  const { tickets } = useOrbit();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attention" | "healthy">("all");

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
      </div>

      <div className="building-directory-grid">
        {rows.map(({ building, activeTickets, urgent, riskSystems, avgHealth }) => {
          const manager = PEOPLE[building.am];
          const healthColor = avgHealth >= 85 ? "#22c55e" : avgHealth >= 70 ? "#f59e0b" : "#ef4444";
          return (
            <button key={building.id} onClick={() => onOpen(building.id)} className="building-card-button" aria-label={`Open ${building.name}`}>
            <Glass hover accent={building.mono} className="building-card">
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
        })}
      </div>
    </div>
  );
}

function BuildingDetail({ building, onBack }: { building: Building; onBack: () => void }) {
  const { tickets, notices, workOrders, openCommand, nav } = useOrbit();
  const [tab, setTab] = useState<DetailTab>("overview");
  const systems = BUILDING_SYSTEMS.filter((system) => system.buildingId === building.id);
  const records = BUILDING_RECORDS.filter((record) => record.buildingId === building.id);
  const buildingTickets = tickets.filter((ticket) => ticket.building === building.id && !ticket.mergedInto);
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
        <span className="building-mark" style={{ color: building.mono, background: `color-mix(in srgb, ${building.mono} 12%, transparent)`, borderColor: `color-mix(in srgb, ${building.mono} 35%, transparent)` }}>
          <Icon name="building-2" size={21} color={building.mono} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ ...pageTitle, fontSize: 24 }}>{building.name}</h1>
            <Tag color={building.mono}>{building.code}</Tag>
            <Tag>{building.type} · {building.plan}</Tag>
          </div>
          <p style={{ ...pageSub, marginTop: 5 }}>{building.address} · {building.units} units · managed by {manager.name}</p>
        </div>
        <Btn small icon="messages-square" onClick={() => nav("comms")}>Message</Btn>
        <ThemeSwitcher />
      </header>

      <div className="building-detail-tabs">
        {([
          ["overview", "Overview", "layout-dashboard", riskSystems.length + dueRecords.length],
          ["systems", "Systems", "activity", riskSystems.length],
          ["people", "People", "users", 1 + roster.staff.length + roster.board.length],
          ["tickets", "Tickets", "ticket", activeTickets.length],
          ["records", "Records", "folder-kanban", dueRecords.length],
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
        {tab === "systems" && <SystemsTab systems={systems} onTicket={openCommand} />}
        {tab === "people" && <PeopleTab building={building} />}
        {tab === "tickets" && <TicketsTab tickets={buildingTickets} onTicket={openCommand} />}
        {tab === "records" && <RecordsTab records={records} />}
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
          <Kpi icon="folder-check" label="Records" value={String(building.docs)} sub={`${recordAlerts.length} due or in review`} color={recordAlerts.length ? "#f59e0b" : "#22c55e"} onClick={() => onTab("records")} />
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
              <button key={record.id} onClick={() => onTab("records")} className="attention-row">
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

function SystemsTab({ systems, onTicket }: { systems: BuildingSystem[]; onTicket: (id: string) => void }) {
  return (
    <div className="building-list-grid">
      {systems.map((system) => {
        const meta = SYSTEM_META[system.state];
        return (
          <Glass key={system.id} style={{ padding: 17 }} hover accent={meta.color}>
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
              <MiniMetric label="Service vendor" value={system.vendor} />
              <MiniMetric label="Next service" value={formatDate(system.nextService)} color={system.state === "risk" ? "#ef4444" : "var(--ink)"} />
            </div>
            {system.openTicketId && <Btn small primary icon="ticket" style={{ marginTop: 14 }} onClick={() => onTicket(system.openTicketId!)}>Open {system.openTicketId}</Btn>}
          </Glass>
        );
      })}
    </div>
  );
}

function PeopleTab({ building }: { building: Building }) {
  const roster = ROSTER[building.id];
  const manager = PEOPLE[building.am];
  const people = [
    { name: manager.name, role: "Account manager", initials: manager.initials, color: manager.color, internal: true },
    { name: roster.super, role: "Resident superintendent", initials: initials(roster.super), color: building.mono },
    ...roster.staff.map(([name, role]) => ({ name, role, initials: initials(name), color: "#3b82f6" })),
    ...roster.board.map(([name, role]) => ({ name, role: `Board ${role}`, initials: initials(name), color: "#a855f7" })),
  ];
  return (
    <div className="building-list-grid">
      {people.map((person) => (
        <Glass key={`${person.name}-${person.role}`} style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar person={{ name: person.name, initials: person.initials, color: person.color }} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{person.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 3, textTransform: "uppercase" }}>{person.role}</div>
          </div>
          {person.internal && <Tag color="var(--acc-text)">Orbit team</Tag>}
        </Glass>
      ))}
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

function RecordsTab({ records }: { records: BuildingRecord[] }) {
  return (
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

const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("");
const formatDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const recordIcon = (kind: BuildingRecord["kind"]) => ({ Insurance: "shield-check", Inspection: "clipboard-check", Contract: "file-signature", Financial: "circle-dollar-sign", Governance: "landmark" }[kind]);

const pageTitle: React.CSSProperties = { margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 27, color: "var(--ink)", letterSpacing: "-0.5px" };
const pageSub: React.CSSProperties = { margin: "6px 0 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" };
const micro: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" };
const rowTitle: React.CSSProperties = { display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const rowSub: React.CSSProperties = { display: "block", marginTop: 3, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
