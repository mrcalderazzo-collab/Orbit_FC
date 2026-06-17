// PortfolioCockpit — the property/account manager's daily command surface,
// scoped to *their* buildings (building.am === them). At 40+ buildings the PM
// must never face the whole firehose: this answers "what needs ME, right now"
// in one prioritized stream, each row carrying its single next action with a
// one-tap commit. Everything routes through the OrbitProvider seam + event spine.
import { useMemo } from "react";
import type { Building, Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { ticketFlow } from "@/data/flow";
import { buildingById } from "@/data/seed";
import { operatorBuildings, userName } from "@/data/identity";
import { attentionOf, nextAction, ATTENTION_META, type Attention } from "@/lib/attention";
import { statusLabel } from "@/lib/ticket";
import { buildingImage } from "@/data/buildings";
import { TopBar } from "@/components/shell/TopBar";
import { Btn, Glass, Icon, PrioDot, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

// priority order for the action stream — most urgent attention first
const ATTN_RANK: Record<Attention, number> = { atRisk: 0, escalated: 1, blocked: 2, needsAction: 3, waitingExternal: 4, watching: 5, healthy: 6 };

export function PortfolioCockpit() {
  const { currentUser, tickets, emergencies, notices } = useOrbit();
  const myBuildings = useMemo(() => operatorBuildings(currentUser), [currentUser]);
  const myIds = useMemo(() => new Set(myBuildings.map((b) => b.id)), [myBuildings]);
  const firstName = (userName(currentUser).split(" ")[0]) || "there";

  const myTickets = useMemo(() => tickets.filter((t) => myIds.has(t.building) && !t.mergedInto), [tickets, myIds]);
  const active = myTickets.filter((t) => t.status !== "Closed");

  // the prioritized "needs you" stream
  const queue = useMemo(() => {
    return active
      .map((t) => { const f = ticketFlow(t); const attn = attentionOf(t, f); return { t, f, attn, act: nextAction(t, attn) }; })
      .filter((r) => r.attn !== "watching" && r.attn !== "healthy")
      .sort((a, b) => (ATTN_RANK[a.attn] - ATTN_RANK[b.attn]) || (a.f.sla.pct < b.f.sla.pct ? 1 : -1));
  }, [active]);

  const myEmergencies = emergencies.filter((e) => myIds.has(e.building) && e.status !== "resolved");
  const breaching = queue.filter((r) => r.attn === "atRisk").length;
  const decisions = queue.filter((r) => r.attn === "needsAction" || r.attn === "waitingExternal").length;
  const complianceDue = myBuildings.filter((b) => b.compliance !== "ok").length;
  const myNotices = notices.filter((n) => myIds.has(n.building) && n.status === "Scheduled").length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title={`Good day, ${firstName}`} sub={`${myBuildings.length} buildings · ${active.length} active · ${queue.length} need you`} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>

        {myEmergencies.length > 0 && (
          <Glass style={{ padding: 14, marginBottom: 14, borderLeft: "3px solid #ef4444" }} accent="#ef4444">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: "rgba(239,68,68,0.12)", animation: "orbit-pulse 1.6s ease-in-out infinite" }}><Icon name="siren" size={16} color="#ef4444" /></span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontFamily: SANS, fontSize: 14, color: "var(--ink)" }}>{myEmergencies.length} active emergency{myEmergencies.length > 1 ? "ies" : ""} in your portfolio</strong>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{myEmergencies.map((e) => e.title).join(" · ")}</span>
              </div>
              <EmergencyJump />
            </div>
          </Glass>
        )}

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
          <Kpi label="Need you now" value={queue.length} color={queue.length ? "#3b82f6" : "#22c55e"} icon="inbox" />
          <Kpi label="Breaching SLA" value={breaching} color={breaching ? "#ef4444" : "#22c55e"} icon="alarm-clock-off" />
          <Kpi label="Awaiting decision" value={decisions} color={decisions ? "#a855f7" : "var(--ink)"} icon="git-pull-request-draft" />
          <Kpi label="Compliance due" value={complianceDue} color={complianceDue ? "#f59e0b" : "#22c55e"} icon="shield-alert" />
          <Kpi label="Scheduled notices" value={myNotices} color="var(--ink)" icon="megaphone" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
          {/* the action stream */}
          <Glass style={{ padding: 17 }}>
            <Header title="Needs you now" icon="zap" count={queue.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {queue.length ? queue.map((r) => <QueueRow key={r.t.id} t={r.t} attn={r.attn} act={r.act} slaPct={r.f.sla.pct} />)
                : <Empty icon="check-circle" text="Your portfolio is clear. Nothing needs a decision right now." />}
            </div>
          </Glass>

          {/* per-building rollup */}
          <Glass style={{ padding: 17, position: "sticky", top: 0 }}>
            <Header title="My buildings" icon="building-2" count={myBuildings.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {myBuildings.map((b) => <BuildingRow key={b.id} building={b} tickets={active.filter((t) => t.building === b.id)} />)}
            </div>
          </Glass>
        </div>

        <p style={{ margin: "18px 0 0", fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-5)", textTransform: "uppercase" }}>
          Scoped to {currentUser?.title || "your portfolio"} · only your buildings, only what's next
        </p>
      </div>
    </div>
  );
}

function EmergencyJump() {
  const { nav } = useOrbit();
  return <Btn small danger icon="arrow-up-right" onClick={() => nav("emergencies")}>Emergency Desk</Btn>;
}

function QueueRow({ t, attn, act, slaPct }: { t: Ticket; attn: Attention; act: { kind: string; label: string }; slaPct: number }) {
  const { openCommand, assignTicket, escalateTicket, currentUser } = useOrbit();
  const meta = ATTENTION_META[attn];
  const building = t.building;

  const commit = () => {
    if (act.kind === "assign" && currentUser?.who) assignTicket(t.id, currentUser.who);
    else if (act.kind === "escalate") escalateTicket(t.id);
    else openCommand(t.id);
  };

  return (
    <div className="attention-row" style={{ cursor: "default" }}>
      <span className="attention-row-icon" style={{ background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}><Icon name={meta.icon} size={15} color={meta.color} /></span>
      <button onClick={() => openCommand(t.id)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: 0, cursor: "pointer", padding: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <PrioDot prio={t.prio} />
          <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
        </span>
        <span style={{ display: "block", marginTop: 3, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{t.id} · {buildingShort(building)} · {statusLabel(t.status)} · SLA {Math.round(slaPct)}%</span>
      </button>
      <Tag color={meta.color}>{meta.short}</Tag>
      <Btn small primary onClick={commit}>{act.label}</Btn>
    </div>
  );
}

function BuildingRow({ building, tickets }: { building: Building; tickets: Ticket[] }) {
  const { nav } = useOrbit();
  const urgent = tickets.filter((t) => ["Critical", "High"].includes(t.prio)).length;
  const cColor = building.compliance === "ok" ? "#22c55e" : building.compliance === "review" ? "#f59e0b" : "#ef4444";
  const photo = buildingImage(building.id);
  return (
    <button onClick={() => nav("buildings", building.id)} className="attention-row" style={{ cursor: "pointer" }}>
      <span className="bl-thumb" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, backgroundImage: photo ? `url(${photo})` : undefined, backgroundColor: `color-mix(in srgb, ${building.mono} 18%, var(--fill-2))`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{building.name}</span>
        <span style={{ display: "block", marginTop: 2, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{tickets.length} active{urgent ? ` · ${urgent} urgent` : ""}</span>
      </span>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cColor }} title={building.compliance} />
    </button>
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

const buildingShort = (id: string) => buildingById(id)?.code || id;
const micro: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" };
