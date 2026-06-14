// FocusBoard — "My work" view. Buckets the operator's active tickets by what
// needs action next (Today / Response required / New incoming / Scheduled / To
// organize), with a per-row do-date control to move work between buckets.
import { useState } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { PRIO_COLOR, slaState } from "@/lib/ticket";
import { FOCUS_BUCKETS, classifyFocus, todayISO, type FocusBucket } from "@/lib/focus";
import { BUILDINGS } from "@/data/seed";
import { seedMessageList } from "./command/commsSeed";
import { Avatar, Empty, Icon, StatusTag } from "@/components/ui";
import { DoDateMenu } from "./DoDateMenu";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const bldg = (id: string) => BUILDINGS.find((b) => b.id === id)!;

function SlaChipMini({ f }: { f: TicketFlow }) {
  const s = slaState(f);
  if (s.level === "ok") return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.05em", color: s.color, background: `color-mix(in srgb, ${s.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${s.color} 30%, transparent)`, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>
      <Icon name={s.level === "breach" ? "alarm-clock-off" : "alarm-clock"} size={9} color={s.color} />SLA {s.label}
    </span>
  );
}

export function FocusBoard({ tickets, flowMap, onOpen }: { tickets: Ticket[]; flowMap: Record<string, TicketFlow>; onOpen: (id: string) => void }) {
  const { ticketMessages, escalateTicket } = useOrbit();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const today = todayISO();

  const needsReply = (t: Ticket): boolean => {
    const msgs = ticketMessages[t.id] || (flowMap[t.id] ? seedMessageList(t, flowMap[t.id]) : []);
    const last = msgs[msgs.length - 1];
    return !!last && last.dir === "in";
  };

  const breaching: Ticket[] = [];
  const byBucket: Record<FocusBucket, Ticket[]> = { today: [], reply: [], inbound: [], scheduled: [], backlog: [] };
  tickets.forEach((t) => {
    const f = flowMap[t.id];
    if (f && f.sla.breached && t.status !== "Closed" && !t.mergedInto) { breaching.push(t); return; }
    const b = classifyFocus(t, today, needsReply(t));
    if (b) byBucket[b].push(t);
  });

  const active = breaching.length + Object.values(byBucket).reduce((a, l) => a + l.length, 0);
  if (!active) return <Empty label="Nothing in your work board" icon="coffee" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px 8px", flexWrap: "wrap" }}>
        <Icon name="target" size={15} color="var(--acc-text)" />
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Your work board</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.05em" }}>· buckets by what needs you next · set a next touch to plan your day</span>
      </div>
      {breaching.length > 0 && (
        <div>
          <button onClick={() => setCollapsed((c) => ({ ...c, sla: !c.sla }))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 4px", background: "none", border: "none", borderBottom: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", textAlign: "left" }}>
            <Icon name={collapsed.sla ? "chevron-right" : "chevron-down"} size={15} color="#ef4444" />
            <span style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.32)" }}>
              <Icon name="siren" size={13} color="#ef4444" />
            </span>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Needs attention — SLA breached</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.12)", borderRadius: 99, padding: "1px 9px" }}>{breaching.length}</span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.04em" }}>past SLA · escalate or act now</span>
          </button>
          {!collapsed.sla && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
              {breaching.map((t) => {
                const b = bldg(t.building);
                return (
                  <div key={t.id} onClick={() => onOpen(t.id)} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 12px", cursor: "pointer", borderRadius: 10, borderLeft: "2px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.04)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: PRIO_COLOR[t.prio], flexShrink: 0 }} />
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--ink-3)", width: 52, flexShrink: 0 }}>{t.id}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{t.title}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: b.mono }}>{b.name} · {t.requester}</span>
                    </div>
                    <SlaChipMini f={flowMap[t.id]} />
                    <span style={{ width: 100, flexShrink: 0 }}><StatusTag status={t.status} /></span>
                    {t.prio !== "Critical" && (
                      <button onClick={(e) => { e.stopPropagation(); escalateTicket(t.id); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 99, cursor: "pointer", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>
                        <Icon name="trending-up" size={11} color="#ef4444" />ESCALATE
                      </button>
                    )}
                    <span style={{ width: 26, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>{t.assignee ? <Avatar person={t.assignee} size={22} /> : <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink-5)" }} />}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {FOCUS_BUCKETS.map((g) => {
        const items = byBucket[g.key];
        const open = !collapsed[g.key];
        return (
          <div key={g.key}>
            <button onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 4px", background: "none", border: "none", borderBottom: "1px solid var(--hair-2)", cursor: "pointer", textAlign: "left" }}>
              <Icon name={open ? "chevron-down" : "chevron-right"} size={15} color="var(--ink-4)" />
              <span style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${g.c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${g.c} 32%, transparent)` }}>
                <Icon name={g.icon} size={13} color={g.c} />
              </span>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{g.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: g.c, background: "var(--fill-3)", borderRadius: 99, padding: "1px 9px" }}>{items.length}</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.04em" }}>{g.desc}</span>
            </button>
            {open && (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
                {items.map((t) => {
                  const b = bldg(t.building);
                  return (
                    <div key={t.id} onClick={() => onOpen(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", borderRadius: 10, borderLeft: "2px solid transparent" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-1)"; e.currentTarget.style.borderLeftColor = PRIO_COLOR[t.prio]; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; }}>
                      <span title={t.prio} style={{ width: 7, height: 7, borderRadius: 2, background: PRIO_COLOR[t.prio], flexShrink: 0, boxShadow: t.prio === "Critical" ? "0 0 7px " + PRIO_COLOR[t.prio] : "none" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{t.title}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}><span style={{ color: b.mono }}>{b.name}</span> · {t.id}</span>
                      </div>
                      {g.key === "reply" && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", color: "#3b82f6", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", padding: "2px 7px", borderRadius: 6 }}><Icon name="reply" size={9} color="#3b82f6" />REPLY</span>}
                      <span onClick={(e) => e.stopPropagation()}><DoDateMenu id={t.id} date={t.workDate} compact /></span>
                      <span style={{ width: 24, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>{t.assignee ? <Avatar person={t.assignee} size={22} /> : <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink-5)" }} />}</span>
                    </div>
                  );
                })}
                {!items.length && <div style={{ padding: "9px 14px", fontFamily: MONO, fontSize: 9, color: "var(--ink-5)", letterSpacing: "0.06em" }}>— CLEAR —</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
