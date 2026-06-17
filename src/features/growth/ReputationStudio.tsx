// ReputationStudio — the marketing/growth cockpit. In property management,
// marketing's raw material IS operational excellence: this turns real ticket
// outcomes into a satisfaction + reputation surface (promoters to amplify,
// detractors to rescue) and a live "proof pack" of operating stats that drops
// straight into a sales proposal. Derivation-only over live data.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS } from "@/data/seed";
import { satisfaction, slaReport } from "@/data/reports";
import { TopBar } from "@/components/shell/TopBar";
import { Glass, Icon, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function ReputationStudio() {
  const { tickets, campaigns, nav } = useOrbit();
  const sat = useMemo(() => satisfaction(tickets), [tickets]);
  const sla = useMemo(() => slaReport(tickets), [tickets]);

  const ranked = [...sat.byBuilding].sort((a, b) => b.csat - a.csat);
  const promoters = ranked.filter((b) => b.csat >= 88);
  const detractors = ranked.filter((b) => b.csat < 75);
  const closed = tickets.filter((t) => t.status === "Closed").length;

  const funnel = campaigns.reduce((a, c) => ({ leads: a.leads + c.leads, meetings: a.meetings + c.meetings, pipeline: a.pipeline + c.pipeline }), { leads: 0, meetings: 0, pipeline: 0 });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Marketing & reputation" sub={`CSAT ${sat.csat} · ${promoters.length} promoter buildings · ${detractors.length} to rescue`} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
          <Kpi label="Resident CSAT" value={`${sat.csat}`} suffix="/100" color={sat.csat >= 85 ? "#22c55e" : sat.csat >= 75 ? "#f59e0b" : "#ef4444"} icon="smile" />
          <Kpi label="Team TSAT" value={`${sat.tsat}`} suffix="/100" color="#3b82f6" icon="users" />
          <Kpi label="SLA attainment" value={`${sla.withinPct}%`} color={sla.withinPct >= 85 ? "#22c55e" : "#f59e0b"} icon="gauge" />
          <Kpi label="Pipeline leads" value={String(funnel.leads)} color="#a855f7" icon="filter" />
          <Kpi label="Meetings booked" value={String(funnel.meetings)} color="#a855f7" icon="calendar-check" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
          {/* sentiment by building */}
          <Glass style={{ padding: 17 }}>
            <Header title="Resident sentiment by building" icon="message-square-heart" count={ranked.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ranked.map((b) => {
                const color = b.csat >= 88 ? "#22c55e" : b.csat >= 75 ? "#f59e0b" : "#ef4444";
                const bid = BUILDINGS.find((x) => x.name === b.building)?.id;
                return (
                  <button key={b.building} onClick={() => bid && nav("buildings", bid)} className="attention-row" style={{ cursor: bid ? "pointer" : "default" }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{b.building}</span>
                      <span style={{ display: "block", marginTop: 4, height: 5, borderRadius: 99, background: "var(--hair-2)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${b.csat}%`, background: color }} /></span>
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", width: 70, textAlign: "right" }}>{b.responses} responses</span>
                    <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color, width: 34, textAlign: "right" }}>{b.csat}</span>
                  </button>
                );
              })}
            </div>
          </Glass>

          {/* action lists + proof pack */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Glass style={{ padding: 17 }}>
              <Header title="Rescue first — detractor risk" icon="alert-triangle" count={detractors.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {detractors.length ? detractors.map((b) => (
                  <div key={b.building} className="attention-row" style={{ cursor: "default" }}>
                    <Icon name="trending-down" size={15} color="#ef4444" />
                    <span style={{ flex: 1, fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{b.building}</span>
                    <Tag color="#ef4444">CSAT {b.csat}</Tag>
                  </div>
                )) : <Empty text="No detractor buildings — sentiment is healthy." />}
              </div>
            </Glass>

            <Glass style={{ padding: 17 }}>
              <Header title="Amplify — testimonial-worthy" icon="sparkles" count={promoters.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {promoters.length ? promoters.map((b) => (
                  <div key={b.building} className="attention-row" style={{ cursor: "default" }}>
                    <Icon name="star" size={15} color="#22c55e" />
                    <span style={{ flex: 1, fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{b.building}</span>
                    <Tag color="#22c55e">CSAT {b.csat}</Tag>
                  </div>
                )) : <Empty text="Lift CSAT above 88 to surface testimonial candidates." />}
              </div>
            </Glass>
          </div>
        </div>

        {/* sales proof pack */}
        <Glass style={{ padding: 18, marginTop: 14 }} accent="#a855f7">
          <Header title="Sales proof pack — live operating stats" icon="badge-check" count={0} />
          <p style={{ margin: "0 0 14px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Real numbers from the live portfolio — the close-the-next-40 pitch. Drop straight into a proposal.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            <ProofStat value={`${sla.withinPct}%`} label="On-time SLA attainment" />
            <ProofStat value={`${sat.csat}/100`} label="Resident satisfaction" />
            <ProofStat value={String(BUILDINGS.length)} label="Buildings under management" />
            <ProofStat value={String(BUILDINGS.reduce((a, b) => a + b.units, 0))} label="Units served" />
            <ProofStat value={String(closed)} label="Requests resolved" />
            <ProofStat value={`${sat.tsat}/100`} label="Team satisfaction" />
          </div>
        </Glass>

        <p style={{ margin: "18px 0 0", fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-5)", textTransform: "uppercase" }}>
          Reputation is downstream of operations · every number here is live
        </p>
      </div>
    </div>
  );
}

function ProofStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 12, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
      <strong style={{ display: "block", fontFamily: SANS, fontSize: 24, fontWeight: 600, color: "var(--ink)" }}>{value}</strong>
      <span style={{ display: "block", marginTop: 4, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)" }}>{label}</span>
    </div>
  );
}

function Kpi({ label, value, suffix, color, icon }: { label: string; value: string; suffix?: string; color: string; icon: string }) {
  return (
    <Glass style={{ padding: 14 }} accent={color}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Icon name={icon} size={14} color={color} /><span style={micro}>{label}</span>
      </div>
      <strong style={{ fontFamily: SANS, fontSize: 24, lineHeight: 1, color }}>{value}<span style={{ fontSize: 12, color: "var(--ink-4)" }}>{suffix}</span></strong>
    </Glass>
  );
}

function Header({ title, icon, count }: { title: string; icon: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
      <Icon name={icon} size={16} color="var(--acc-text)" />
      <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
      {count > 0 && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.1)", padding: "2px 7px", borderRadius: 99 }}>{count}</span>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ margin: 0, padding: "10px 2px", fontFamily: SANS, fontSize: 12, color: "var(--ink-4)" }}>{text}</p>;
}

const micro: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" };
