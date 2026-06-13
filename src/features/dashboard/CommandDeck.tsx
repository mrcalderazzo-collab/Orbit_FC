// CommandDeck — the operator's attention queue. Not a dashboard of vanity
// metrics: a prioritized list of what needs a human, each item stating one clear
// next action (Take · Reply · Approve · Escalate · Open). Replaces the roadmap
// placeholder; this is the first screen anyone sees on sign-in.
import { useMemo } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { type Attention, attentionOf, nextAction, type ActionKind } from "@/lib/attention";
import { ticketFlow } from "@/data/flow";
import { BUILDINGS, PEOPLE } from "@/data/seed";
import { userPerson } from "@/data/identity";
import { seedMessageList } from "@/features/tickets/command/commsSeed";
import { AttentionChip, Avatar, Glass, Icon, SectionLabel } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const bldg = (id: string) => BUILDINGS.find((b) => b.id === id);

interface Item { t: Ticket; f: TicketFlow; attn: Attention; action: { kind: ActionKind; label: string }; needsReply: boolean }

export function CommandDeck() {
  const { tickets, ticketMessages, recs, currentUser, assignTicket, escalateTicket, openCommand, nav, notify } = useOrbit();
  const me = userPerson(currentUser);
  const myWho = currentUser?.persona === "operator" ? currentUser.who : undefined;

  const items: Item[] = useMemo(() => tickets.filter((t) => !t.mergedInto).map((t) => {
    const f = ticketFlow(t);
    const msgs = ticketMessages[t.id] || seedMessageList(t, f);
    const needsReply = msgs[msgs.length - 1]?.dir === "in";
    const attn = attentionOf(t, f, { needsReply });
    return { t, f, attn, action: nextAction(t, attn), needsReply };
  }), [tickets, ticketMessages]);

  const open = items.filter((i) => i.t.status !== "Closed");
  const pendingRecs = recs.filter((r) => r.status === "pending");

  const groups: { key: string; title: string; icon: string; color: string; items: Item[]; viewAll?: () => void }[] = [
    { key: "critical", title: "Critical incidents", icon: "siren", color: "#ef4444", items: open.filter((i) => i.t.prio === "Critical") },
    { key: "atrisk", title: "At risk of SLA breach", icon: "alarm-clock-off", color: "#ef4444", items: open.filter((i) => i.attn === "atRisk") },
    { key: "reply", title: "Communications awaiting reply", icon: "reply", color: "#3b82f6", items: open.filter((i) => i.needsReply) },
    { key: "unowned", title: "Unowned work", icon: "user-plus", color: "#f59e0b", items: open.filter((i) => i.t.status === "Open" && !i.t.assignee) },
    { key: "approvals", title: "Approvals & board votes", icon: "vote", color: "#a855f7", items: open.filter((i) => i.attn === "waitingExternal") },
  ].filter((g) => g.items.length > 0);

  const pulse: [string, number, string][] = [
    ["Critical", open.filter((i) => i.t.prio === "Critical").length, "#ef4444"],
    ["At-risk", open.filter((i) => i.attn === "atRisk").length, "#ef4444"],
    ["Unowned", open.filter((i) => i.t.status === "Open" && !i.t.assignee).length, "#f59e0b"],
    ["Awaiting reply", open.filter((i) => i.needsReply).length, "#3b82f6"],
    ["Approvals", open.filter((i) => i.attn === "waitingExternal").length, "#a855f7"],
    ["AI to review", pendingRecs.length, "var(--acc-text)"],
  ];

  const recent = useMemo(() => tickets.flatMap((t) => t.log.slice(-1).map((l) => ({ t, at: l[0], actor: l[1], text: l[2] }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7), [tickets]);

  const act = (t: Ticket, kind: ActionKind) => {
    if (kind === "assign" && myWho) { assignTicket(t.id, myWho); notify("Assigned to you · " + t.id); }
    else if (kind === "escalate") escalateTicket(t.id);
    else openCommand(t.id);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const totalNeedsMe = open.filter((i) => ["atRisk", "escalated", "needsAction", "blocked"].includes(i.attn)).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* header */}
      <header style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--hair-2)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 28, color: "var(--ink)", letterSpacing: "-0.6px" }}>{greeting}, {me?.name.split(" ")[0] ?? "there"}</h1>
            <p style={{ margin: "6px 0 0", fontFamily: SANS, fontSize: 14, color: "var(--ink-2)" }}>
              {totalNeedsMe > 0 ? <><b style={{ color: "var(--ink)" }}>{totalNeedsMe} item{totalNeedsMe === 1 ? "" : "s"}</b> need you right now across the portfolio.</> : "Nothing urgent — the portfolio is on track."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pulse.map(([label, n, c]) => (
              <button key={label} onClick={() => nav(label === "AI to review" ? "ai" : "tickets")} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, padding: "9px 14px", borderRadius: 12, cursor: "pointer", background: n > 0 ? `color-mix(in srgb, ${c} 8%, transparent)` : "var(--fill-2)", border: "1px solid " + (n > 0 ? `color-mix(in srgb, ${c} 26%, transparent)` : "var(--hair-2)"), minWidth: 76 }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, lineHeight: 1, color: n > 0 ? c : "var(--ink-3)" }}>{n}</span>
                <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* attention queue */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0 }}>
        {groups.length === 0 && pendingRecs.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "70px 0", color: "var(--ink-4)" }}>
            <Icon name="coffee" size={36} color="var(--ink-5)" />
            <span style={{ fontFamily: SANS, fontSize: 15, color: "var(--ink-2)" }}>You're all caught up. Nothing needs your attention.</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14, alignItems: "start" }}>
            {groups.map((g) => (
              <Glass key={g.key} style={{ padding: 16, borderLeft: `2px solid color-mix(in srgb, ${g.color} 55%, transparent)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${g.color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${g.color} 30%, transparent)` }}><Icon name={g.icon} size={15} color={g.color} /></span>
                  <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{g.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: g.color, background: `color-mix(in srgb, ${g.color} 12%, transparent)`, borderRadius: 99, padding: "1px 9px" }}>{g.items.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {g.items.slice(0, 4).map((i) => <DeckRow key={i.t.id} i={i} onOpen={() => openCommand(i.t.id)} onAct={() => act(i.t, i.action.kind)} />)}
                </div>
                {g.items.length > 4 && (
                  <button onClick={() => nav("tickets")} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em" }}>+{g.items.length - 4} MORE · VIEW ALL →</button>
                )}
              </Glass>
            ))}

            {/* AI recommendations */}
            {pendingRecs.length > 0 && (
              <Glass style={{ padding: 16, borderLeft: "2px solid rgba(var(--acc-rgb),0.55)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(var(--acc-rgb),0.12)", border: "1px solid rgba(var(--acc-rgb),0.3)" }}><Icon name="brain-circuit" size={15} color="var(--acc-text)" /></span>
                  <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>AI recommendations to review</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.12)", borderRadius: 99, padding: "1px 9px" }}>{pendingRecs.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pendingRecs.slice(0, 4).map((r) => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: 9 }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-1)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)" }}>{Math.round(r.confidence * 100)}%</span>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.rec}</span>
                      <button onClick={() => nav("ai")} style={deckBtn("var(--acc-text)")}>Review</button>
                    </div>
                  ))}
                </div>
              </Glass>
            )}

            {/* recent changes */}
            <Glass style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fill-3)", border: "1px solid var(--hair-3)" }}><Icon name="history" size={15} color="var(--ink-3)" /></span>
                <SectionLabel>Recent changes</SectionLabel>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recent.map((r, i) => (
                  <button key={i} onClick={() => openCommand(r.t.id)} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    <Avatar person={r.actor} size={22} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginTop: 2 }}>{PEOPLE[r.actor]?.name.split(" ")[0] || r.actor} · {r.t.id} · {r.at}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Glass>
          </div>
        )}
      </div>
    </div>
  );
}

function deckBtn(color: string): React.CSSProperties {
  return { flexShrink: 0, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, padding: "5px 11px", borderRadius: 99, cursor: "pointer", textTransform: "uppercase" };
}

function DeckRow({ i, onOpen, onAct }: { i: Item; onOpen: () => void; onAct: () => void }) {
  const b = bldg(i.t.building);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 9 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-1)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <button onClick={onOpen} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
        <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.t.title}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <AttentionChip attn={i.attn} small />
          <span style={{ fontFamily: MONO, fontSize: 8.5, color: b?.mono }}>{b?.name} · {i.t.id}</span>
        </span>
      </button>
      <button onClick={onAct} style={deckBtn(i.action.kind === "escalate" ? "#ef4444" : i.action.kind === "assign" ? "#f59e0b" : "var(--acc-text)")}>{i.action.label}</button>
    </div>
  );
}
