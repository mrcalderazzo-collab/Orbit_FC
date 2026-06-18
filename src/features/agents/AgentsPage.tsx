// AgentsPage — the human-approved agent layer. The specialized agents from the
// operating spine (intake, triage, dispatch, compliance, finance, vendor-match,
// handoff, building-memory) each WATCH live portfolio data and surface a signal
// with a recommended next move. They never act on their own — every card routes a
// human to the decision. The structure is real today; swapping the heuristic for
// live Claude calls is a credential change, not an architecture change.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS } from "@/data/seed";
import { BUILDING_RECORDS, BUILDING_SYSTEMS } from "@/data/buildings";
import { VENDORS, coiStatus } from "@/data/vendors";
import { atFrontDesk } from "@/data/routing";
import { ticketFlow } from "@/data/flow";
import { TopBar } from "@/components/shell/TopBar";
import { Glass, Icon, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const DAY = 864e5;

export function AgentsPage() {
  const { tickets, emergencies, nav } = useOrbit();

  const agents = useMemo(() => {
    const open = tickets.filter((t) => t.status !== "Closed" && !t.mergedInto);
    const now = Date.now();
    const unrouted = open.filter(atFrontDesk).length;
    const unassignedUrgent = open.filter((t) => ["Critical", "High"].includes(t.prio) && !t.assignee).length;
    const fieldOpen = open.filter((t) => t.type === "Maintenance" || t.type === "Facility").length;
    const coiRisk = VENDORS.filter((v) => coiStatus(v).status !== "valid").length;
    const recordsDue = BUILDING_RECORDS.filter((r) => r.status !== "Current" || (new Date(r.due + "T12:00:00").getTime() - now) / DAY <= 30).length;
    const financeOpen = open.filter((t) => t.type === "Finance").length;
    const needVendor = open.filter((t) => { const f = ticketFlow(t); return f.stage === "sourcing" && !t.vendor; }).length;
    const held = open.filter((t) => t.held).length;
    const lowHealth = BUILDINGS.filter((b) => { const sys = BUILDING_SYSTEMS.filter((s) => s.buildingId === b.id); const h = sys.length ? sys.reduce((a, s) => a + s.health, 0) / sys.length : 100; return h < 72; }).length;
    const activeEm = emergencies.filter((e) => e.status !== "resolved").length;

    return [
      { id: "intake", name: "Intake agent", icon: "inbox", color: "#3b82f6", watches: "New requests at the Front Desk", signal: unrouted, unit: "to classify", rec: "Auto-suggest a route for each; confirm and send.", page: "tickets" },
      { id: "triage", name: "Triage agent", icon: "git-branch", color: "#f59e0b", watches: "Urgent work without an owner", signal: unassignedUrgent + activeEm, unit: "need an owner", rec: "Assign / escalate high & critical before SLA bites.", page: activeEm ? "emergencies" : "tickets" },
      { id: "dispatch", name: "Dispatch agent", icon: "route", color: "#22c55e", watches: "Field jobs that can share a truck-roll", signal: fieldOpen, unit: "field jobs", rec: "Batch nearby jobs to one crew (see Dispatch).", page: "dashboard" },
      { id: "compliance", name: "Compliance agent", icon: "shield-alert", color: "#a855f7", watches: "COIs & records nearing deadline", signal: coiRisk + recordsDue, unit: "on the clock", rec: "Request renewals; schedule inspections.", page: "compliance" },
      { id: "finance", name: "Finance agent", icon: "circle-dollar-sign", color: "#22c55e", watches: "Invoices & money anomalies", signal: financeOpen, unit: "to review", rec: "Flag duplicates; check approvals before pay.", page: "finance" },
      { id: "vendorMatch", name: "Vendor-match agent", icon: "hard-hat", color: "#f97316", watches: "Tickets sourcing a vendor", signal: needVendor, unit: "need a vendor", rec: "Recommend best-value vendor from the scorecard.", page: "vendors" },
      { id: "handoff", name: "Handoff agent", icon: "pause-circle", color: "#eab308", watches: "Work parked on Needs-info hold", signal: held, unit: "on hold", rec: "Chase the missing info so the clock can resume.", page: "tickets" },
      { id: "buildingMemory", name: "Building-memory agent", icon: "brain-circuit", color: "#14b8a6", watches: "Buildings drifting on systems health", signal: lowHealth, unit: "buildings at risk", rec: "Schedule preventative service before failure.", page: "buildings" },
    ];
  }, [tickets, emergencies]);

  const watching = agents.reduce((a, x) => a + x.signal, 0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Agent layer" sub={`${agents.length} specialized agents · ${watching} signals across the portfolio`} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>
        <Glass style={{ padding: "12px 15px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }} accent="#a855f7">
          <Icon name="shield-check" size={15} color="#a855f7" />
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
            Agents <strong>recommend</strong>; people <strong>decide</strong>. Each watches a slice of the portfolio and routes you to the call — nothing external happens without a human. (Heuristic today; same surface drives live Claude reasoning once enabled.)
          </span>
        </Glass>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 12 }}>
          {agents.map((a) => (
            <Glass key={a.id} style={{ padding: 16 }} accent={a.signal ? a.color : undefined}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: a.color + "1a", flexShrink: 0 }}><Icon name={a.icon} size={19} color={a.color} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{a.name}</span>
                    <Tag color={a.signal ? a.color : "#22c55e"}>{a.signal ? "Watching" : "Clear"}</Tag>
                  </div>
                  <span style={{ display: "block", marginTop: 3, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{a.watches}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, margin: "13px 0 9px" }}>
                <strong style={{ fontFamily: SANS, fontSize: 30, lineHeight: 1, color: a.signal ? a.color : "var(--ink-3)" }}>{a.signal}</strong>
                <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-4)" }}>{a.unit}</span>
              </div>
              <p style={{ margin: "0 0 13px", fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, minHeight: 34 }}>{a.rec}</p>
              <button onClick={() => nav(a.page)} disabled={!a.signal} style={{ width: "100%", padding: "9px 0", borderRadius: 9, cursor: a.signal ? "pointer" : "default", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, border: "1px solid " + (a.signal ? a.color : "var(--hair-strong)"), background: a.signal ? a.color + "1a" : "var(--fill-2)", color: a.signal ? a.color : "var(--ink-4)" }}>
                {a.signal ? "Review & decide" : "Nothing to do"}
              </button>
            </Glass>
          ))}
        </div>
      </div>
    </div>
  );
}
