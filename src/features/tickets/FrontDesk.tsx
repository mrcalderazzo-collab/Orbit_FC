// FrontDesk — the central intake desk. Everything new lands here already auto-
// routed by the rules; the desk's job is to confirm, reroute, send to the super,
// or park for more info — fast. It is an exceptions/confirm queue, not a manual
// chokepoint, so it scales to a 100-building, 1,000-ticket-a-day operation.
import { useMemo, useState } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { autoRoute, teamByKey, ROUTABLE, atFrontDesk, escalationDue, escalationCountdown } from "@/data/routing";
import { buildingById } from "@/data/seed";
import { superByBuilding } from "@/data/supers";
import { Btn, Glass, Icon, PrioDot, Tag, inputStyle } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const NOW = new Date("2026-06-13T12:00:00").getTime();
const ageDays = (iso: string) => Math.max(0, Math.round((NOW - new Date(iso).getTime()) / 864e5));

interface Props { tickets: Ticket[]; flowMap: Record<string, TicketFlow>; onOpen: (id: string) => void }

export function FrontDesk({ tickets, onOpen }: Props) {
  const needsRouting = useMemo(() => tickets.filter(atFrontDesk), [tickets]);
  const onHold = useMemo(() => tickets.filter((t) => t.held && !t.mergedInto), [tickets]);
  const escalate = useMemo(() => tickets.filter((t) => escalationDue(t, ageDays(t.created)) || (t.team === "super" && !!t.escalateAt && t.status !== "Closed" && new Date(t.escalateAt).getTime() < Date.now())), [tickets]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* desk explainer */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: "rgba(var(--acc-rgb),0.05)", border: "1px solid var(--hair-2)" }}>
        <Icon name="concierge-bell" size={20} color="var(--acc-text)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Front Desk · central intake</div>
          <div style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-3)" }}>Everything new arrives auto-routed. Confirm it, reroute it, send it to the super, or hold it for more info.</div>
        </div>
        <Stat n={needsRouting.length} label="to route" c="var(--acc-text)" />
        <Stat n={onHold.length} label="on hold" c="#f59e0b" />
        <Stat n={escalate.length} label="escalate" c="#ef4444" />
      </div>

      <Lane title="Needs routing" sub="Just arrived · confirm the route or send it on" icon="inbox" count={needsRouting.length}>
        {needsRouting.length === 0 ? <Empty label="Inbox zero — nothing waiting to route" /> : needsRouting.map((t) => <RouteRow key={t.id} t={t} onOpen={onOpen} />)}
      </Lane>

      {escalate.length > 0 && (
        <Lane title="Super-first · ready to escalate" sub="Routine field work the super hasn't cleared in time" icon="trending-up" count={escalate.length} accent="#ef4444">
          {escalate.map((t) => <EscalateRow key={t.id} t={t} onOpen={onOpen} />)}
        </Lane>
      )}

      <Lane title="On hold · awaiting info" sub="Parked pending photos, access or scope — SLA paused" icon="pause" count={onHold.length} accent="#f59e0b">
        {onHold.length === 0 ? <Empty label="Nothing parked" /> : onHold.map((t) => <HoldRow key={t.id} t={t} onOpen={onOpen} />)}
      </Lane>
    </div>
  );
}

function Stat({ n, label, c }: { n: number; label: string; c: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 600, color: n ? c : "var(--ink-3)", lineHeight: 1 }}>{n}</div>
      <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function Lane({ title, sub, icon, count, accent = "var(--acc)", children }: { title: string; sub: string; icon: string; count: number; accent?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <Icon name={icon} size={15} color={accent} />
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: accent, background: "color-mix(in srgb," + accent + " 14%, transparent)", padding: "2px 7px", borderRadius: 99 }}>{count}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.04em" }}>· {sub}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function RowShell({ t, onOpen, children }: { t: Ticket; onOpen: (id: string) => void; children: React.ReactNode }) {
  const b = buildingById(t.building);
  return (
    <Glass style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "13px 15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <button onClick={() => onOpen(t.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, fontFamily: MONO, fontSize: 9, color: "var(--acc-text)" }}>{t.id}</button>
          <PrioDot prio={t.prio} />
          <Tag>{t.type}</Tag>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: b?.mono }}>{b?.name}</span>
        </div>
        <button onClick={() => onOpen(t.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left", display: "block", width: "100%" }}>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{t.title}</span>
        </button>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 4 }}>from {t.requester} · {ageDays(t.created)}d ago</div>
        {children}
      </div>
    </Glass>
  );
}

function RouteRow({ t, onOpen }: { t: Ticket; onOpen: (id: string) => void }) {
  const { routeTicket, holdForInfo, assignTicket, currentUser } = useOrbit();
  const myWho = currentUser?.persona === "operator" ? currentUser.who : undefined;
  const [reroute, setReroute] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [reason, setReason] = useState("");
  const sug = autoRoute(t);
  const sugTeam = teamByKey(sug.team);
  const sup = superByBuilding(t.building);

  const accept = () => {
    if (sug.team === "frontdesk") { setReroute(true); return; }
    routeTicket(t.id, sug.team, "auto-route accepted");
  };

  return (
    <RowShell t={t} onOpen={onOpen}>
      {/* suggestion banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 10, background: "rgba(var(--acc-rgb),0.05)", border: "1px solid var(--hair-2)", marginTop: 10 }}>
        <Icon name="sparkles" size={14} color="var(--acc-text)" />
        <span style={{ flex: 1, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)" }}>{sug.reason}</span>
        {sugTeam && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: sugTeam.color === "var(--ink-3)" ? "var(--ink-2)" : sugTeam.color, textTransform: "uppercase" }}><Icon name={sugTeam.icon} size={12} color={sugTeam.color} />{sugTeam.label}</span>}
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap", alignItems: "center" }}>
        {sug.team !== "frontdesk" && (
          <Btn small primary icon={sug.viaSuper ? "hammer" : "check"} onClick={accept}>
            {sug.viaSuper ? "Send to super" : "Route → " + sugTeam?.label}
          </Btn>
        )}
        <Btn small ghost icon="git-fork" onClick={() => setReroute((r) => !r)}>Reroute</Btn>
        <Btn small ghost icon="circle-pause" onClick={() => setHoldOpen((h) => !h)}>Hold for info</Btn>
        {myWho && <Btn small ghost icon="hand" onClick={() => assignTicket(t.id, myWho)} style={{ marginLeft: "auto" }}>Claim it</Btn>}
      </div>

      {reroute && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hair-2)" }}>
          {sup && <Chip icon="hammer" color="#14b8a6" label={"Super (" + sup.name.split(" ")[0] + ")"} onClick={() => { routeTicket(t.id, "super"); setReroute(false); }} />}
          {ROUTABLE.map((tm) => <Chip key={tm.key} icon={tm.icon} color={tm.color} label={tm.label} onClick={() => { routeTicket(t.id, tm.key); setReroute(false); }} />)}
        </div>
      )}

      {holdOpen && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hair-2)" }}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && reason.trim()) { holdForInfo(t.id, reason.trim()); setHoldOpen(false); setReason(""); } }} placeholder="What's missing? (photos, access, scope…)" style={{ ...inputStyle, fontFamily: SANS }} />
          <Btn small icon="circle-pause" disabled={!reason.trim()} onClick={() => { holdForInfo(t.id, reason.trim()); setHoldOpen(false); setReason(""); }}>Park</Btn>
        </div>
      )}
    </RowShell>
  );
}

function EscalateRow({ t, onOpen }: { t: Ticket; onOpen: (id: string) => void }) {
  const { routeTicket } = useOrbit();
  const sup = superByBuilding(t.building);
  const cd = escalationCountdown(t.escalateAt);
  return (
    <RowShell t={t} onOpen={onOpen}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", flex: 1 }}>
          With {sup ? sup.name.split(" ")[0] : "the super"} for {ageDays(t.created)} days and not cleared — escalate to the central Facilities PM.
        </span>
        {cd && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: cd.overdue ? "#ef4444" : "#f59e0b", background: (cd.overdue ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)"), border: "1px solid " + (cd.overdue ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.28)"), padding: "2px 7px", borderRadius: 6 }}>
            <Icon name="timer" size={10} color={cd.overdue ? "#ef4444" : "#f59e0b"} />{cd.overdue ? "auto-escalating" : "auto in " + cd.label}
          </span>
        )}
        <Btn small primary icon="trending-up" onClick={() => routeTicket(t.id, "facilities", "escalated from super")}>Escalate → Facilities PM</Btn>
      </div>
    </RowShell>
  );
}

function HoldRow({ t, onOpen }: { t: Ticket; onOpen: (id: string) => void }) {
  const { releaseHold, routeTicket } = useOrbit();
  const sug = autoRoute(t);
  return (
    <RowShell t={t} onOpen={onOpen}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 10, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", marginTop: 10 }}>
        <Icon name="pause" size={13} color="#f59e0b" />
        <span style={{ flex: 1, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)" }}>Waiting on: {t.held?.reason}</span>
        <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>since {t.held?.at}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
        <Btn small primary icon="play" onClick={() => { releaseHold(t.id); routeTicket(t.id, sug.team, "info received"); }}>Info in · route on</Btn>
        <Btn small ghost icon="rotate-ccw" onClick={() => releaseHold(t.id)}>Release hold</Btn>
      </div>
    </RowShell>
  );
}

function Chip({ icon, color, label, onClick }: { icon: string; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 99, cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-3)", fontFamily: SANS, fontSize: 12, color: "var(--ink-2)" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--hair-3)")}>
      <Icon name={icon} size={13} color={color} />{label}
    </button>
  );
}

function Empty({ label }: { label: string }) {
  return <Glass style={{ padding: 22, textAlign: "center", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</Glass>;
}
