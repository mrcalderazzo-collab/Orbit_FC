// LiveOpsPage — the single dense "live operations" board: a day counter, the
// pulse KPIs, an Operations Health Index, upcoming local-law deadlines, team
// workload and a by-type breakdown. One screen the whole agency can stand around.
// Ported from the Daisy "LIVE" board; built on live tickets + governance + reports.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { ticketFlow } from "@/data/flow";
import { BUILDINGS, buildingById } from "@/data/seed";
import { complianceItems } from "@/data/governance";
import { buildingHealth, slaReport, staffPerformance } from "@/data/reports";
import { VENDORS, coiStatus } from "@/data/vendors";
import { Glass, SectionLabel, StatusTag, Tag } from "@/components/ui";
import { HBars } from "@/components/ui/Charts";
import { TopBar } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const START = new Date("2026-04-01T00:00:00").getTime();
const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function LiveOpsPage() {
  const { tickets } = useOrbit();
  const dayN = Math.max(1, Math.floor((Date.now() - START) / 864e5));

  const live = tickets.filter((t) => !t.mergedInto);
  const open = live.filter((t) => t.status !== "Closed");
  const overdue = open.filter((t) => ticketFlow(t).sla.breached).length;
  const emergencies = open.filter((t) => t.prio === "Critical").length;
  const sla = useMemo(() => slaReport(tickets), [tickets]);
  const health = useMemo(() => buildingHealth(tickets), [tickets]);
  const staff = useMemo(() => staffPerformance(tickets), [tickets]);

  const avgHealth = Math.round(health.reduce((a, b) => a + b.score, 0) / health.length);
  const coiValid = Math.round((VENDORS.filter((v) => coiStatus(v).status === "valid").length / VENDORS.length) * 100);
  const compliance = BUILDINGS.flatMap((b) => complianceItems(b.id));
  const compliancePct = Math.round((compliance.filter((c) => c.status === "Compliant").length / compliance.length) * 100);
  const utilization = Math.round(staff.reduce((a, s) => a + s.utilizationPct, 0) / staff.length);
  const opsHealth = Math.round((avgHealth + sla.withinPct + coiValid + compliancePct + utilization) / 5);

  const deadlines = compliance.filter((c) => c.status !== "Compliant").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 8);
  const recent = [...live].sort((a, b) => (b.created || "").localeCompare(a.created || "")).slice(0, 8);
  const byType = ["Maintenance", "Facility", "Finance", "Documents", "Board request"].map((ty) => ({ label: ty, value: open.filter((t) => t.type === ty).length, color: "#3b82f6" }));
  const workload = staff.map((s) => ({ label: s.member, value: s.open, color: s.open > 8 ? "#ef4444" : "#22c55e" })).sort((a, b) => b.value - a.value);

  const healthColor = opsHealth >= 85 ? "#22c55e" : opsHealth >= 70 ? "#b6ff00" : "#f59e0b";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Live Operations" sub="The whole agency on one board" />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0 }}>
        {/* LIVE banner */}
        <div style={{ borderRadius: 18, padding: "20px 24px", marginBottom: 18, background: "linear-gradient(120deg, #0f5132, #157347)", color: "#fff", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", boxShadow: "0 0 10px #fff" }} />
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em" }}>LIVE · DAY {dayN}</span>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 4 }}>{opsHealth}% Ops Health</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 26, flexWrap: "wrap" }}>
            <LiveStat n={open.length} label="Active" />
            <LiveStat n={overdue} label="Overdue" warn={overdue > 0} />
            <LiveStat n={emergencies} label="Emergency" warn={emergencies > 0} />
            <LiveStat n={sla.withinPct + "%"} label="On-time" />
            <LiveStat n={BUILDINGS.length} label="Buildings" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          {/* ops health index */}
          <Glass style={{ padding: 18 }}>
            <SectionLabel style={{ marginBottom: 14 }}>Operations Health Index</SectionLabel>
            <HBars fmt={(n) => n + "%"} rows={[
              { label: "Building systems", value: avgHealth, color: barC(avgHealth) },
              { label: "SLA on-time", value: sla.withinPct, color: barC(sla.withinPct) },
              { label: "Vendor COI valid", value: coiValid, color: barC(coiValid) },
              { label: "Compliance current", value: compliancePct, color: barC(compliancePct) },
              { label: "Team utilization", value: utilization, color: utilization > 90 ? "#ef4444" : barC(utilization) },
            ]} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--hair-2)" }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-3)", flex: 1 }}>Composite ops health</span>
              <span style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, color: healthColor }}>{opsHealth}%</span>
            </div>
          </Glass>

          {/* upcoming deadlines */}
          <Glass style={{ padding: 18 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Upcoming deadlines</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {deadlines.map((c, i) => {
                const col = c.status === "Overdue" ? "#ef4444" : c.status === "Action needed" ? "#f59e0b" : "#3b82f6";
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < deadlines.length - 1 ? "1px solid var(--hair)" : "none" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.law} · {bn(c.buildingId)}</div>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{c.title} · due {fmtDate(c.due)}</div>
                    </div>
                    <Tag color={col} bg={col + "1f"}>{c.status}</Tag>
                  </div>
                );
              })}
            </div>
          </Glass>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.85fr 0.85fr", gap: 16, marginTop: 16, alignItems: "start" }}>
          <Glass style={{ padding: 18 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Recent tickets</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recent.map((t, i) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < recent.length - 1 ? "1px solid var(--hair)" : "none" }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", width: 46, flexShrink: 0 }}>{t.id}</span>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                  <StatusTag status={t.status} />
                </div>
              ))}
            </div>
          </Glass>
          <Glass style={{ padding: 18 }}>
            <SectionLabel style={{ marginBottom: 14 }}>Team workload</SectionLabel>
            <HBars rows={workload} />
          </Glass>
          <Glass style={{ padding: 18 }}>
            <SectionLabel style={{ marginBottom: 14 }}>Open by type</SectionLabel>
            <HBars rows={byType} />
          </Glass>
        </div>
      </div>
    </div>
  );
}

const bn = (id: string) => buildingById(id)?.name ?? id;
const barC = (n: number) => (n >= 85 ? "#22c55e" : n >= 70 ? "#b6ff00" : n >= 50 ? "#f59e0b" : "#ef4444");

function LiveStat({ n, label, warn }: { n: number | string; label: string; warn?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 700, lineHeight: 1, color: warn ? "#fca5a5" : "#fff" }}>{n}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}
