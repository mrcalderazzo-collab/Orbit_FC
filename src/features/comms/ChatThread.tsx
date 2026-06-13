// ChatThread — the reusable live-chat surface. Resident/vendor SMS renders in
// an iMessage-style phone; board chats render as a modern group messenger;
// Email renders as a threaded email view. Names + avatars on both sides; "me"
// is the acting operator. Used by the in-ticket dock and the global inbox.
import { useEffect, useRef, useState } from "react";
import type { Channel, CommVia, Participant } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { userPerson } from "@/data/identity";
import { buildingTeam, seedChatFor } from "@/data/comms";
import { PEOPLE } from "@/data/seed";
import { Avatar, Icon } from "@/components/ui";
import { PhoneBubble, PhoneFrame } from "./PhoneFrame";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const VIA_ICON: Record<CommVia, string> = { SMS: "message-square", Email: "mail", "In-app": "messages-square" };

export function ChatThread({ channel, onRoute }: { channel: Channel; onRoute?: (positionKey: string) => void }) {
  const { chat, seedChat, sendChat, currentUser } = useOrbit();
  useEffect(() => { seedChat(channel.id, seedChatFor(channel)); }, [channel.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const msgs = chat[channel.id] || [];

  const op = userPerson(currentUser);
  const meId = currentUser?.persona === "operator" ? currentUser.who : undefined;
  const me: Participant = { id: "me", name: op?.name ?? "You", initials: op?.initials ?? "ME", color: "var(--acc)", role: "Orbit · You", kind: "operator" };
  const covering = !!channel.routedTo && !!meId && meId !== channel.routedTo.personId;

  const [via, setVia] = useState<CommVia>(channel.defaultVia);
  const [phone, setPhone] = useState(channel.defaultVia === "SMS");
  const [text, setText] = useState("");
  const [toAll, setToAll] = useState(channel.kind === "board");
  const [routeOpen, setRouteOpen] = useState(false);
  useEffect(() => { setVia(channel.defaultVia); setPhone(channel.defaultVia === "SMS"); setToAll(channel.kind === "board"); }, [channel.id, channel.defaultVia, channel.kind]);

  const resolve = (id: string): Participant => (id === "me" ? me : channel.participants.find((p) => p.id === id) || { id, name: id, initials: id.slice(0, 2).toUpperCase(), color: "var(--ink-3)", role: "", kind: "resident" });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs.length]);

  const send = () => {
    if (!text.trim()) return;
    sendChat(channel, { via, text: text.trim(), toAll: channel.kind === "board" ? toAll : undefined });
    setText("");
  };

  const composer = (
    <Composer
      channel={channel} via={via} text={text} setText={setText} toAll={toAll} setToAll={setToAll}
      onSend={send} phone={phone}
    />
  );

  const isPhone = via === "SMS" && phone;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* channel header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", borderBottom: "1px solid var(--hair-2)", flexShrink: 0 }}>
        <AvatarStack participants={channel.participants} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{channel.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.04em" }}>{channel.subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
          {channel.vias.map((v) => {
            const on = via === v;
            return (
              <button key={v} title={v} onClick={() => { setVia(v); if (v === "SMS") setPhone(true); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 99, border: "none", cursor: "pointer", background: on ? "rgba(var(--acc-rgb),0.14)" : "transparent" }}>
                <Icon name={VIA_ICON[v]} size={13} color={on ? "var(--acc-text)" : "var(--ink-4)"} />
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: on ? "var(--ink)" : "var(--ink-4)" }}>{v.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        {via === "SMS" && (
          <button title="Toggle phone view" onClick={() => setPhone((p) => !p)} style={{ display: "flex", padding: 7, borderRadius: 9, cursor: "pointer", background: phone ? "rgba(var(--acc-rgb),0.12)" : "var(--fill-2)", border: "1px solid var(--hair-3)" }}>
            <Icon name="smartphone" size={15} color={phone ? "var(--acc-text)" : "var(--ink-4)"} />
          </button>
        )}
      </div>

      {/* direct-line routing bar (advisory channels) */}
      {channel.routedTo && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--hair-2)", background: "rgba(var(--acc-rgb),0.04)", flexShrink: 0, position: "relative" }}>
          <Icon name="git-fork" size={13} color="var(--acc-text)" />
          <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>Direct line to</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Avatar person={PEOPLE[channel.routedTo.personId]} size={20} />
            <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{channel.routedTo.personName}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--acc-text)" }}>· {channel.routedTo.position}</span>
          </span>
          {covering && (
            <span title="You are not the line owner — your replies are clearly attributed to you" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", padding: "2px 7px", borderRadius: 6 }}>
              <Icon name="user-cog" size={10} color="#f59e0b" />COVERING · YOU ARE {(op?.name || "").toUpperCase()}
            </span>
          )}
          {onRoute && (
            <button onClick={() => setRouteOpen((o) => !o)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 99, cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-3)", color: "var(--ink-2)", fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>
              <Icon name="repeat" size={11} color="var(--ink-3)" />REROUTE
            </button>
          )}
          {routeOpen && onRoute && (
            <div style={{ position: "absolute", top: "calc(100% - 2px)", right: 16, zIndex: 40, minWidth: 220, padding: 6, borderRadius: 12, background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
              <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", padding: "6px 8px" }}>ROUTE TO POSITION</div>
              {buildingTeam(channel.buildingId).map((t) => {
                const on = t.key === channel.routedTo!.positionKey;
                return (
                  <button key={t.key} onClick={() => { onRoute(t.key); setRouteOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", cursor: "pointer", background: on ? "rgba(var(--acc-rgb),0.08)" : "transparent", textAlign: "left" }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--fill-2)"; }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                    <Avatar person={t.person} size={22} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink)" }}>{t.person.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{t.label}</div>
                    </div>
                    {on && <Icon name="check" size={13} color="var(--acc-text)" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* participants bar for groups */}
      {channel.participants.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderBottom: "1px solid var(--hair-2)", flexWrap: "wrap", flexShrink: 0 }}>
          <Icon name="users" size={12} color="var(--ink-4)" />
          {channel.participants.map((p) => (
            <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px 2px 3px", borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: p.color + "22", color: p.color, fontFamily: MONO, fontSize: 7.5, fontWeight: 700 }}>{p.initials}</span>
              <span style={{ fontFamily: SANS, fontSize: 10.5, color: "var(--ink-2)" }}>{p.name.split(" ")[0]}</span>
            </span>
          ))}
        </div>
      )}

      {/* body */}
      {isPhone ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 8px", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <PhoneFrame contact={channel.title} initials={channel.participants[0]?.initials ?? "OR"} color={channel.participants[0]?.color ?? "#3b82f6"} via="SMS" footer={composer}>
            {msgs.map((m) => {
              const s = resolve(m.senderId);
              return <PhoneBubble key={m.id} mine={m.senderId === "me"} text={m.text} time={m.at.slice(11)} sender={channel.participants.length > 1 ? s.name.split(" ")[0] : undefined} />;
            })}
          </PhoneFrame>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {via === "Email"
              ? msgs.map((m) => <EmailCard key={m.id} sender={resolve(m.senderId)} me={m.senderId === "me"} text={m.text} at={m.at} subject={channel.title} />)
              : msgs.map((m) => <Bubble key={m.id} sender={resolve(m.senderId)} mine={m.senderId === "me"} text={m.text} at={m.at} toAll={m.toAll} />)}
            {!msgs.length && <div style={{ padding: "32px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)", letterSpacing: "0.08em" }}>NO MESSAGES YET</div>}
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--hair-2)", flexShrink: 0 }}>{composer}</div>
        </>
      )}
    </div>
  );
}

function AvatarStack({ participants }: { participants: Participant[] }) {
  const shown = participants.slice(0, 3);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((p, i) => (
        <span key={p.id} style={{ width: 30, height: 30, borderRadius: "50%", marginLeft: i ? -10 : 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: p.color + "22", border: "2px solid var(--panel-solid)", color: p.color, fontFamily: MONO, fontSize: 10, fontWeight: 700, zIndex: shown.length - i }}>{p.initials}</span>
      ))}
      {participants.length > 3 && <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginLeft: 4 }}>+{participants.length - 3}</span>}
    </div>
  );
}

function Bubble({ sender, mine, text, at, toAll }: { sender: Participant; mine: boolean; text: string; at: string; toAll?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", gap: 9, alignItems: "flex-end" }}>
      <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: sender.color + "22", color: sender.color, fontFamily: MONO, fontSize: 9, fontWeight: 700 }}>{sender.initials}</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", maxWidth: "76%", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 2px" }}>
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: mine ? "var(--acc-text)" : sender.color }}>{mine ? "You · " + sender.name.split(" ")[0] : sender.name}</span>
          {toAll && <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, color: "#a855f7", background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", padding: "0 5px", borderRadius: 5 }}>@BOARD</span>}
          <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-5)" }}>{at.slice(5)}</span>
        </div>
        <div style={{ padding: "9px 13px", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: mine ? "rgba(var(--acc-rgb),0.1)" : "var(--fill-2)", border: "1px solid " + (mine ? "rgba(var(--acc-rgb),0.22)" : "var(--hair-2)"), fontFamily: SANS, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}

function EmailCard({ sender, me, text, at, subject }: { sender: Participant; me: boolean; text: string; at: string; subject: string }) {
  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--hair-2)", background: "var(--fill-1)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", borderBottom: "1px solid var(--hair-2)", background: me ? "rgba(var(--acc-rgb),0.05)" : "transparent" }}>
        <span style={{ width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: (me ? "var(--acc)" : sender.color) + "22", color: me ? "var(--acc-text)" : sender.color, fontFamily: MONO, fontSize: 9, fontWeight: 700 }}>{me ? "ME" : sender.initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{me ? "You" : sender.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>Re: {subject}</div>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-5)" }}>{at}</span>
      </div>
      <p style={{ margin: 0, padding: "12px 13px", fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{text}</p>
    </div>
  );
}

function Composer({
  channel, via, text, setText, toAll, setToAll, onSend, phone,
}: {
  channel: Channel; via: CommVia; text: string; setText: (s: string) => void; toAll: boolean; setToAll: (b: boolean) => void; onSend: () => void; phone: boolean;
}) {
  const board = channel.kind === "board";
  if (phone) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSend()} placeholder="Text message" style={{ flex: 1, fontFamily: SANS, fontSize: 13, color: "#0a0a0c", background: "#fff", border: "1px solid #d0d0d5", borderRadius: 99, padding: "8px 14px", outline: "none" }} />
        <button onClick={onSend} disabled={!text.trim()} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", cursor: text.trim() ? "pointer" : "default", background: text.trim() ? "linear-gradient(180deg,#2f95ff,#0a7cff)" : "#c7c7cc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="arrow-up" size={16} color="#fff" />
        </button>
      </div>
    );
  }
  return (
    <div>
      {board && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <button onClick={() => setToAll(!toAll)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, cursor: "pointer", background: toAll ? "rgba(168,85,247,0.12)" : "var(--fill-2)", border: "1px solid " + (toAll ? "rgba(168,85,247,0.4)" : "var(--hair-3)") }}>
            <Icon name="at-sign" size={12} color={toAll ? "#a855f7" : "var(--ink-4)"} />
            <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: toAll ? "#a855f7" : "var(--ink-3)" }}>BOARD · {channel.participants.length}</span>
            {toAll && <Icon name="check" size={11} color="#a855f7" />}
          </button>
          <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{toAll ? "tags every director" : "tap to broadcast to all"}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} rows={1} placeholder={`Message ${channel.title} · ${via}…`} style={{ flex: 1, resize: "none", fontFamily: SANS, fontSize: 13, color: "var(--ink)", background: "var(--fill-2)", border: "1px solid var(--hair-strong)", borderRadius: 14, padding: "10px 13px", outline: "none", minHeight: 40, maxHeight: 120 }} />
        <button onClick={onSend} disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: text.trim() ? "pointer" : "default", background: text.trim() ? "var(--acc)" : "var(--fill-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: text.trim() ? "0 0 16px rgba(var(--acc-rgb),0.3)" : "none" }}>
          <Icon name="send" size={16} color={text.trim() ? "var(--on-accent)" : "var(--ink-4)"} />
        </button>
      </div>
    </div>
  );
}
