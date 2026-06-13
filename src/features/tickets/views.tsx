// Ticket queue views: grouped Queue, List, Cards, Kanban Board. Mirrors Tickets.jsx.
import { useState } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { PRIO_COLOR, STATUS_COLOR, TICKET_GROUPS, ticketApproval, ticketVendorName } from "@/lib/ticket";
import { BUILDINGS, PEOPLE, TICKET_STATUS } from "@/data/seed";
import { Avatar, Empty, Glass, Icon, PrioDot, StatusTag, Tag } from "@/components/ui";
import { ApprovalChip } from "./ApprovalChip";

const MONO = "'JetBrains Mono', monospace";
const SANS = "Outfit, sans-serif";

type ViewProps = { tickets: Ticket[]; onOpen: (id: string) => void; flowMap?: Record<string, TicketFlow> };
const bldg = (id: string) => BUILDINGS.find((b) => b.id === id)!;

export function TicketQueue({ tickets, onOpen, flowMap = {} }: ViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ resolved: true });
  if (!tickets.length) return <Empty label="No tickets match these filters" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {TICKET_GROUPS.map((g) => {
        const items = tickets.filter(g.match);
        const crit = items.filter((t) => t.prio === "Critical").length;
        const open = !collapsed[g.key];
        return (
          <div key={g.key}>
            <button onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 4px", background: "none", border: "none", borderBottom: "1px solid var(--hair-2)", cursor: "pointer", textAlign: "left" }}>
              <Icon name={open ? "chevron-down" : "chevron-right"} size={15} color="var(--ink-4)" />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.c, boxShadow: g.key === "inflight" ? "0 0 7px " + g.c : "none", flexShrink: 0 }} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{g.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: g.c, background: "var(--fill-3)", borderRadius: 99, padding: "1px 9px" }}>{items.length}</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.05em" }}>{g.desc}</span>
              {crit > 0 && <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "#ef4444", letterSpacing: "0.05em" }}>▲ {crit} CRITICAL</span>}
            </button>
            {open && (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
                {items.map((t) => {
                  const b = bldg(t.building);
                  const f = flowMap[t.id];
                  const appr = f ? ticketApproval(t, f) : null;
                  const ven = f ? ticketVendorName(t, f) : null;
                  return (
                    <div key={t.id} onClick={() => onOpen(t.id)} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 12px", cursor: "pointer", borderRadius: 10, borderLeft: "2px solid transparent" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-1)"; e.currentTarget.style.borderLeftColor = PRIO_COLOR[t.prio]; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: PRIO_COLOR[t.prio], flexShrink: 0, boxShadow: t.prio === "Critical" ? "0 0 7px " + PRIO_COLOR[t.prio] : "none" }} />
                      <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--ink-3)", width: 52, flexShrink: 0 }}>{t.id}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                          {t.verified && <Icon name="shield-check" size={12} color="#22c55e" />}
                        </div>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9, color: b.mono }}>{b.name}{ven && <span style={{ color: "var(--ink-4)" }}>· {ven}</span>}</span>
                      </div>
                      {(appr === "awaiting" || appr === "approved") && <span style={{ flexShrink: 0 }}><ApprovalChip state={appr} small /></span>}
                      <Tag>{t.type}</Tag>
                      <span style={{ width: 110, flexShrink: 0 }}><StatusTag status={t.status} /></span>
                      <span style={{ width: 28, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>{t.assignee ? <Avatar person={t.assignee} size={22} /> : <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink-5)" }} />}</span>
                    </div>
                  );
                })}
                {!items.length && <div style={{ padding: "12px 14px", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)", letterSpacing: "0.08em" }}>— EMPTY —</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TicketList({ tickets, onOpen }: ViewProps) {
  if (!tickets.length) return <Empty label="No tickets match these filters" />;
  const cols = "56px minmax(0,1fr) 104px 96px 122px 104px";
  return (
    <div style={{ border: "1px solid var(--hair-2)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "10px 16px", background: "var(--fill-1)", borderBottom: "1px solid var(--hair-2)" }}>
        {["ID", "Ticket", "Type", "Priority", "Status", "Assignee"].map((h) => (
          <span key={h} style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", textTransform: "uppercase" }}>{h}</span>
        ))}
      </div>
      {tickets.map((t, i) => {
        const b = bldg(t.building);
        return (
          <div key={t.id} onClick={() => onOpen(t.id)} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "13px 16px", alignItems: "center", cursor: "pointer", borderBottom: i < tickets.length - 1 ? "1px solid var(--fill-3)" : "none", borderLeft: "2px solid transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-1)"; e.currentTarget.style.borderLeftColor = PRIO_COLOR[t.prio]; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--ink-3)" }}>{t.id}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                {t.verified && <Icon name="shield-check" size={13} color="#22c55e" />}
              </div>
              <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: b.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name} · {t.requester}</span>
            </div>
            <Tag>{t.type}</Tag>
            <PrioDot prio={t.prio} />
            <StatusTag status={t.status} />
            {t.assignee ? (
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <Avatar person={t.assignee} size={22} />
                <span style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{PEOPLE[t.assignee]?.name.split(" ")[0]}</span>
              </div>
            ) : (
              <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-4)" }}>UNASSIGNED</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TicketCards({ tickets, onOpen }: ViewProps) {
  if (!tickets.length) return <Empty label="No tickets match these filters" />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
      {tickets.map((t) => {
        const b = bldg(t.building);
        return (
          <Glass key={t.id} hover accent={PRIO_COLOR[t.prio]} onClick={() => onOpen(t.id)} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)" }}>{t.id}</span>
              {t.verified && <Icon name="shield-check" size={13} color="#22c55e" />}
              <span style={{ marginLeft: "auto" }}><PrioDot prio={t.prio} /></span>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 14.5, color: "var(--ink)", lineHeight: 1.35, minHeight: 40 }}>{t.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: 3, background: b.mono, flexShrink: 0 }} />
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: b.mono, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
              <Tag>{t.type}</Tag>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 12, borderTop: "1px solid var(--hair)" }}>
              <StatusTag status={t.status} />
              <div style={{ marginLeft: "auto" }}>{t.assignee ? <Avatar person={t.assignee} size={22} /> : <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>UNASSIGNED</span>}</div>
            </div>
          </Glass>
        );
      })}
    </div>
  );
}

export function TicketBoard({ tickets, onOpen }: ViewProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, alignItems: "start" }}>
      {TICKET_STATUS.map((col) => {
        const items = tickets.filter((t) => t.status === col);
        const c = STATUS_COLOR[col];
        return (
          <div key={col} style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 4px 10px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
              <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-2)", textTransform: "uppercase" }}>{col}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginLeft: "auto" }}>{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((t) => {
                const b = bldg(t.building);
                return (
                  <Glass key={t.id} hover accent={PRIO_COLOR[t.prio]} onClick={() => onOpen(t.id)} style={{ padding: 12, borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-3)" }}>{t.id}</span>
                      <PrioDot prio={t.prio} />
                    </div>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.35, marginBottom: 9 }}>{t.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: b.mono, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                      {t.assignee && <Avatar person={t.assignee} size={20} />}
                    </div>
                  </Glass>
                );
              })}
              {!items.length && <div style={{ padding: "16px 0", textAlign: "center", fontFamily: MONO, fontSize: 9, color: "var(--ink-5)" }}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
