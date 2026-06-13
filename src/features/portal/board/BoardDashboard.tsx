// BoardDashboard — the board's home base: building health at a glance, the money
// that matters, what needs the board's hand (votes, compliance actions, projects
// awaiting approval), and recent governance. Read-only summary that routes into
// the deeper tabs. Scoped to the board member's building.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { boardVoteTickets } from "@/data/identity";
import { ticketFlow } from "@/data/flow";
import { buildingById } from "@/data/seed";
import { BUILDING_SYSTEMS } from "@/data/buildings";
import { complianceItems, capitalProjects, boardDecisions } from "@/data/governance";
import { fmtMoney, fmtPct } from "@/lib/format";
import { Btn, Glass, Icon, SectionLabel, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const PURPLE = "#a855f7";
const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function BoardDashboard({ go }: { go: (id: string) => void }) {
  const { currentUser, tickets } = useOrbit();
  const bId = currentUser?.building ?? "";
  const b = buildingById(bId);
  const me = currentUser?.person?.name?.split(" ")[0] ?? "there";

  const votes = useMemo(() => (currentUser ? boardVoteTickets(currentUser, tickets, ticketFlow) : []), [currentUser, tickets]);
  const compliance = useMemo(() => complianceItems(bId), [bId]);
  const projects = useMemo(() => capitalProjects(bId), [bId]);
  const decisions = useMemo(() => boardDecisions(bId), [bId]);
  const systems = BUILDING_SYSTEMS.filter((s) => s.buildingId === bId);
  const avgHealth = systems.length ? Math.round(systems.reduce((a, s) => a + s.health, 0) / systems.length) : 0;

  if (!b) return null;
  const noi = b.monthlyIncome - b.monthlyExpense;
  const actions = compliance.filter((c) => c.status === "Overdue" || c.status === "Action needed");
  const approvals = projects.filter((p) => p.status === "Board approval" || p.status === "Bidding");
  const activeProjects = projects.filter((p) => p.status === "In progress");
  const healthColor = avgHealth >= 85 ? "#22c55e" : avgHealth >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* hero */}
      <Glass style={{ padding: 22, borderLeft: "3px solid " + PURPLE }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon name="users" size={15} color={PURPLE} />
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: PURPLE, textTransform: "uppercase" }}>{b.name} · Board</span>
        </div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: "-0.4px", color: "var(--ink)" }}>Good to see you, {me}</h2>
        <p style={{ margin: "6px 0 0", fontFamily: SANS, fontSize: 13.5, color: "var(--ink-3)" }}>
          {votes.length ? <b style={{ color: PURPLE }}>{votes.length} vote{votes.length > 1 ? "s" : ""} awaiting the board</b> : "No votes pending"} · {actions.length} compliance item{actions.length === 1 ? "" : "s"} need attention · {activeProjects.length} project{activeProjects.length === 1 ? "" : "s"} in progress.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 18, marginTop: 18 }}>
          <Kpi label="Reserve fund" value={fmtMoney(b.reserve)} />
          <Kpi label="Monthly NOI" value={fmtMoney(noi)} color={noi >= 0 ? "#22c55e" : "#ef4444"} />
          <Kpi label="Delinquency" value={fmtPct(b.delinquency)} color={b.delinquency > 0.06 ? "#f59e0b" : "var(--ink)"} />
          <Kpi label="Systems health" value={avgHealth + "%"} color={healthColor} />
        </div>
      </Glass>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, alignItems: "start" }}>
        {/* needs the board */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Glass style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon name="gavel" size={15} color={PURPLE} />
              <SectionLabel>Needs the board</SectionLabel>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {votes.map((t) => (
                <Row key={t.id} icon="vote" color={PURPLE} title={t.title} sub={"Bid decision · " + t.id} cta="Vote" onClick={() => go("vote")} />
              ))}
              {approvals.map((p) => (
                <Row key={p.id} icon="hard-hat" color="#f59e0b" title={p.name} sub={p.status + " · " + fmtMoney(p.budget)} cta="Review" onClick={() => go("projects")} />
              ))}
              {actions.slice(0, 3).map((c) => (
                <Row key={c.id} icon="clipboard-check" color={c.status === "Overdue" ? "#ef4444" : "#f59e0b"} title={c.law + " · " + c.title} sub={c.status + " · due " + fmtDate(c.due)} cta="Open" onClick={() => go("compliance")} />
              ))}
              {!votes.length && !approvals.length && !actions.length && (
                <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>Nothing needs the board right now — you're in good shape.</p>
              )}
            </div>
          </Glass>

          {/* active projects */}
          <Glass style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <SectionLabel>Capital projects</SectionLabel>
              <Btn small ghost icon="arrow-right" onClick={() => go("projects")} style={{ marginLeft: "auto" }}>All</Btn>
            </div>
            {projects.slice(0, 3).map((p) => (
              <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--hair)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)", flex: 1 }}>{p.name}</span>
                  <Tag color={statusColor(p.status)}>{p.status}</Tag>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}>
                    <div style={{ width: p.pct + "%", height: "100%", background: PURPLE }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{fmtMoney(p.spent)}/{fmtMoney(p.budget)}</span>
                </div>
              </div>
            ))}
          </Glass>
        </div>

        {/* recent governance */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Glass style={{ padding: 18 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Recent decisions</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {decisions.map((d) => (
                <div key={d.id} style={{ display: "flex", gap: 10 }}>
                  <Icon name="check-circle-2" size={15} color="#22c55e" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.35 }}>{d.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginTop: 2 }}>{fmtDate(d.date)} · {d.outcome} {d.vote}</div>
                  </div>
                </div>
              ))}
            </div>
            <Btn small ghost icon="arrow-right" onClick={() => go("docs")} style={{ marginTop: 12 }}>Minutes &amp; documents</Btn>
          </Glass>
          <Glass style={{ padding: 18, textAlign: "center" }}>
            <Icon name="message-square" size={18} color={PURPLE} />
            <p style={{ margin: "10px 0 12px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>Questions for management? Your account manager is one tap away.</p>
            <Btn small primary icon="messages-square" onClick={() => go("directline")} style={{ margin: "0 auto" }}>Open direct line</Btn>
          </Glass>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, color = "var(--ink)" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: 24, fontWeight: 600, lineHeight: 1, color }}>{value}</span>
    </div>
  );
}

function Row({ icon, color, title, sub, cta, onClick }: { icon: string; color: string; title: string; sub: string; cta: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 11, border: "1px solid var(--hair-2)", background: "var(--fill-1)", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: color + "1a" }}>
        <Icon name={icon} size={15} color={color} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: SANS, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginTop: 2 }}>{sub}</span>
      </span>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color, letterSpacing: "0.05em", textTransform: "uppercase" }}>{cta} →</span>
    </button>
  );
}

export function statusColor(s: string): string {
  return s === "Complete" ? "#22c55e" : s === "In progress" ? "#3b82f6" : s === "Board approval" ? "#a855f7" : s === "Bidding" ? "#f59e0b" : "var(--ink-4)";
}
