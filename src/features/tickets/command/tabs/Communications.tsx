// Communications — the unified surface. One clear stream that interleaves
// internal team comments (not visible to residents), outbound resident/board
// messages (SMS · Email · Both), and inbound replies. A mode-switching composer
// keeps "talk to the team" and "talk to the resident/board" one click apart,
// and the public tracker shows exactly what the requester sees.
//
// ⚑ DESIGN-REVIEW SURFACE — this is the layout proposed for sign-off.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Building, CommAudience, CommChannel, Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { ROSTER, PEOPLE } from "@/data/seed";
import { FLOW_STAGES } from "@/data/flow";
import { Avatar, Btn, Glass, Icon, SectionLabel, inputStyle } from "@/components/ui";
import { seedCommentList, seedMessageList } from "../commsSeed";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const CHANNEL_ICON: Record<CommChannel, string> = { SMS: "message-square", Email: "mail" };
const AUDIENCE_COLOR: Record<CommAudience, string> = { Resident: "#3b82f6", Board: "#a855f7", Both: "var(--acc-text)" };
const TEMPLATES: [string, string][] = [
  ["On the way", "Heads up — our crew is on the way and should arrive within the scheduled window."],
  ["Scheduled", "You're scheduled. The vendor is confirmed and we'll send a reminder the day before."],
  ["Delayed", "Quick update — we hit a short delay sourcing a part. New ETA to follow shortly."],
  ["Completed", "Work is complete. Please let us know if anything still needs attention. Thanks for your patience."],
];

type FilterKey = "all" | "team" | "resident" | "board";
type StreamItem =
  | { kind: "comment"; id: string; at: string; by: string; text: string; mentions: string[] }
  | { kind: "out"; id: string; at: string; by?: string; audience: CommAudience; channels: CommChannel[]; text: string; auto?: boolean }
  | { kind: "in"; id: string; at: string; from: string; channels: CommChannel[]; text: string };

const ts = (s: string) => new Date(s.replace(" ", "T")).getTime() || 0;

function renderMentions(text: string): ReactNode {
  return text.split(/(@\w+)/g).map((p, i) =>
    p[0] === "@" ? <span key={i} style={{ color: "var(--acc-text)", fontWeight: 600 }}>{p}</span> : <span key={i}>{p}</span>,
  );
}

export function Communications({ t, b, f }: { t: Ticket; b: Building; f: TicketFlow }) {
  const { ticketComments, seedComments, addComment, ticketMessages, seedMessages, sendTicketMessage, notify } = useOrbit();
  useEffect(() => { seedComments(t.id, seedCommentList(t, f)); seedMessages(t.id, seedMessageList(t, f)); }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const comments = ticketComments[t.id] || [];
  const messages = ticketMessages[t.id] || [];
  const [filter, setFilter] = useState<FilterKey>("all");
  const [mode, setMode] = useState<"internal" | "message">("internal");

  const stream = useMemo<StreamItem[]>(() => {
    const items: StreamItem[] = [
      ...comments.map((c) => ({ kind: "comment" as const, id: c.id, at: c.at, by: c.by, text: c.text, mentions: c.mentions })),
      ...messages.map((m) =>
        m.dir === "out"
          ? { kind: "out" as const, id: m.id, at: m.at, by: m.by, audience: m.audience || "Resident", channels: m.channels || ["SMS"], text: m.text, auto: m.auto }
          : { kind: "in" as const, id: m.id, at: m.at, from: m.from || "Resident", channels: m.channels || ["SMS"], text: m.text },
      ),
    ];
    return items.sort((a, c) => ts(a.at) - ts(c.at));
  }, [comments, messages]);

  const filtered = stream.filter((it) => {
    if (filter === "all") return true;
    if (filter === "team") return it.kind === "comment";
    if (filter === "resident") return (it.kind === "out" && it.audience !== "Board") || it.kind === "in";
    if (filter === "board") return it.kind === "out" && (it.audience === "Board" || it.audience === "Both");
    return true;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.85fr", gap: 22, alignItems: "start" }}>
      {/* ── unified conversation ─────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <SectionLabel>Conversation</SectionLabel>
          <Legend color="var(--acc-text)" label="Internal" />
          <Legend color="#3b82f6" label="Resident" />
          <Legend color="#a855f7" label="Board" />
          <div style={{ marginLeft: "auto", display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
            {(["all", "team", "resident", "board"] as FilterKey[]).map((k) => (
              <button key={k} onClick={() => setFilter(k)} style={{ padding: "4px 12px", borderRadius: 99, border: "none", cursor: "pointer", background: filter === k ? "rgba(var(--acc-rgb),0.12)" : "transparent", color: filter === k ? "var(--ink)" : "var(--ink-3)", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 18 }}>
          {filtered.map((it) => <StreamRow key={it.id} it={it} />)}
          {!filtered.length && (
            <div style={{ padding: "32px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)", letterSpacing: "0.08em" }}>NOTHING IN THIS VIEW YET</div>
          )}
        </div>

        <Composer t={t} b={b} f={f} mode={mode} setMode={setMode} onComment={(text) => addComment(t.id, text)} onSend={(p) => sendTicketMessage(t.id, p)} />
      </div>

      {/* ── what the requester sees (public tracker) ─────────────────── */}
      <PublicTracker t={t} b={b} f={f} onCopy={() => notify("Tracking link copied")} />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />{label}
    </span>
  );
}

function StreamRow({ it }: { it: StreamItem }) {
  if (it.kind === "comment") {
    const p = PEOPLE[it.by] || { name: it.by, role: "", color: "var(--ink-3)" };
    return (
      <div style={{ display: "flex", gap: 12 }}>
        <Avatar person={it.by} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{p.role}</span>
            <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.1)", border: "1px solid rgba(var(--acc-rgb),0.25)", padding: "1px 6px", borderRadius: 5 }}>INTERNAL</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-5)" }}>{it.at}</span>
          </div>
          <div style={{ padding: "11px 13px", borderRadius: "3px 13px 13px 13px", background: "var(--fill-1)", border: "1px solid var(--hair-2)", borderLeft: "2px solid rgba(var(--acc-rgb),0.45)", fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{renderMentions(it.text)}</div>
        </div>
      </div>
    );
  }
  const out = it.kind === "out";
  const audColor = out ? AUDIENCE_COLOR[it.audience] : "#3b82f6";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: out ? "flex-end" : "flex-start", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 4px" }}>
        {out ? (
          <>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: audColor }}>→ {it.audience.toUpperCase()}</span>
            {it.channels.map((c) => <Icon key={c} name={CHANNEL_ICON[c]} size={11} color="var(--ink-4)" />)}
            {it.auto && <span style={{ fontFamily: MONO, fontSize: 7.5, color: "var(--ink-5)", letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 5, background: "var(--fill-2)" }}>AUTO</span>}
          </>
        ) : (
          <>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-3)" }}>{it.from.toUpperCase()}</span>
            {it.channels.map((c) => <Icon key={c} name={CHANNEL_ICON[c]} size={11} color="var(--ink-4)" />)}
          </>
        )}
      </div>
      <div style={{ maxWidth: "82%", padding: "10px 13px", borderRadius: out ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: out ? "rgba(var(--acc-rgb),0.1)" : "var(--fill-2)", border: "1px solid " + (out ? "rgba(var(--acc-rgb),0.22)" : "var(--hair-2)"), fontFamily: SANS, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{it.text}</div>
      <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-5)", padding: "0 4px" }}>
        {it.at}{out && it.by ? " · " + (PEOPLE[it.by]?.name.split(" ")[0] || it.by) : ""}
      </span>
    </div>
  );
}

function Composer({
  t, b, f, mode, setMode, onComment, onSend,
}: {
  t: Ticket; b: Building; f: TicketFlow; mode: "internal" | "message"; setMode: (m: "internal" | "message") => void;
  onComment: (text: string) => void;
  onSend: (p: { audience: CommAudience; channels: CommChannel[]; text: string }) => void;
}) {
  const [text, setText] = useState("");
  const [audience, setAudience] = useState<CommAudience>("Resident");
  const [channels, setChannels] = useState<CommChannel[]>(["SMS"]);
  const team: [string, string][] = [["luke", "Diego"], ["cait", "Priya"], ["maura", "Tom"], ["gidi", "Sara"]];
  const roster = ROSTER[t.building] || { board: [] };

  const toggleChan = (c: CommChannel) =>
    setChannels((cs) => (cs.includes(c) ? (cs.length > 1 ? cs.filter((x) => x !== c) : cs) : [...cs, c]));
  const mention = (first: string) => setText((s) => (s ? s.replace(/\s*$/, " ") : "") + "@" + first + " ");

  const submit = () => {
    if (!text.trim()) return;
    if (mode === "internal") onComment(text.trim());
    else onSend({ audience, channels: [...channels], text: text.trim() });
    setText("");
  };

  const internal = mode === "internal";
  return (
    <Glass style={{ padding: 16, borderTop: internal ? "2px solid rgba(var(--acc-rgb),0.4)" : "2px solid " + AUDIENCE_COLOR[audience] }}>
      {/* mode switch */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {([["internal", "users", "Internal note"], ["message", "send", "Message resident / board"]] as const).map(([k, ic, label]) => {
          const on = mode === k;
          return (
            <button key={k} onClick={() => setMode(k)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 12px", borderRadius: 12, cursor: "pointer", background: on ? "rgba(var(--acc-rgb),0.1)" : "var(--fill-1)", border: "1px solid " + (on ? "rgba(var(--acc-rgb),0.45)" : "var(--hair-2)") }}>
              <Icon name={ic} size={14} color={on ? "var(--acc-text)" : "var(--ink-3)"} />
              <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: on ? "var(--ink)" : "var(--ink-3)" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {internal ? (
        <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="lock" size={11} color="var(--ink-4)" /> NOT VISIBLE TO RESIDENTS · @MENTION TO NOTIFY
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 7, marginBottom: 11 }}>
            {([["Resident", "home", f.intake.submitterName], ["Board", "users", b.name + " board · " + roster.board.length], ["Both", "users-round", "Resident + board"]] as const).map(([k, ic, sub]) => {
              const on = audience === k;
              return (
                <button key={k} onClick={() => setAudience(k)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "9px 11px", borderRadius: 12, cursor: "pointer", textAlign: "left", background: on ? "rgba(var(--acc-rgb),0.1)" : "var(--fill-1)", border: "1px solid " + (on ? "rgba(var(--acc-rgb),0.45)" : "var(--hair-2)") }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name={ic} size={14} color={on ? AUDIENCE_COLOR[k] : "var(--ink-3)"} />
                    <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: on ? "var(--ink)" : "var(--ink-2)" }}>{k}</span>
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{sub}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)" }}>VIA</span>
            {(["SMS", "Email"] as CommChannel[]).map((c) => {
              const on = channels.includes(c);
              return (
                <button key={c} onClick={() => toggleChan(c)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, cursor: "pointer", background: on ? "rgba(var(--acc-rgb),0.1)" : "var(--fill-1)", border: "1px solid " + (on ? "rgba(var(--acc-rgb),0.45)" : "var(--hair-3)") }}>
                  <Icon name={CHANNEL_ICON[c]} size={13} color={on ? "var(--acc-text)" : "var(--ink-3)"} />
                  <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: on ? "var(--ink)" : "var(--ink-3)" }}>{c}</span>
                  {on && <Icon name="check" size={12} color="var(--acc-text)" />}
                </button>
              );
            })}
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{channels.length === 2 ? "DUAL-SEND" : channels[0].toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 11 }}>
            {TEMPLATES.map(([label, body]) => (
              <button key={label} onClick={() => setText(body)} style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-2)", padding: "5px 10px", borderRadius: 99, cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>{label}</button>
            ))}
          </div>
        </>
      )}

      <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }} rows={internal ? 2 : 3} placeholder={internal ? "Write a note for the team…  ⌘↵ to send" : "Write a plain-language update for the " + audience.toLowerCase() + "…"} style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
        {internal ? (
          <>
            <Icon name="at-sign" size={13} color="var(--ink-4)" />
            {team.map(([id, first]) => (
              <button key={id} onClick={() => mention(first)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px 3px 4px", borderRadius: 99, cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
                <Avatar person={id} size={16} /><span style={{ fontFamily: SANS, fontSize: 10.5, color: "var(--ink-2)" }}>{first}</span>
              </button>
            ))}
          </>
        ) : (
          <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{text.length} chars{channels.includes("SMS") ? " · " + Math.max(1, Math.ceil(text.length / 160)) + " SMS" : ""}</span>
        )}
        <Btn small primary icon={internal ? "message-square" : "send"} disabled={!text.trim()} onClick={submit} style={{ marginLeft: "auto" }}>
          {internal ? "Comment" : "Send " + channels.join(" + ")}
        </Btn>
      </div>
    </Glass>
  );
}

function PublicTracker({ t, b, f, onCopy }: { t: Ticket; b: Building; f: TicketFlow; onCopy: () => void }) {
  const cur = f.updates[f.updates.length - 1];
  return (
    <div style={{ position: "sticky", top: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <SectionLabel>What the requester sees</SectionLabel>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9, color: "#22c55e" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />LIVE LINK
        </span>
      </div>
      <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid var(--hair-3)", background: "var(--fill-1)" }}>
        <div style={{ padding: "20px 18px", background: "rgba(var(--acc-rgb),0.05)", borderBottom: "1px solid var(--hair-2)" }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.1em", marginBottom: 8 }}>{t.id} · {b.name}</div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 17, color: "var(--ink)", lineHeight: 1.3 }}>{cur.text}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <Icon name="clock" size={14} color="var(--acc-text)" />
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--acc-text)", fontWeight: 700 }}>{cur.eta}</span>
          </div>
        </div>
        <div style={{ padding: "18px 18px 8px" }}>
          {f.updates.map((u, i) => {
            const st = FLOW_STAGES.find((s) => s.key === u.stage) || { label: u.stage, icon: "circle" };
            const last = i === f.updates.length - 1;
            return (
              <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: last ? "rgba(var(--acc-rgb),0.15)" : "rgba(34,197,94,0.12)", border: "1px solid " + (last ? "rgba(var(--acc-rgb),0.5)" : "rgba(34,197,94,0.3)") }}>
                    <Icon name={last ? st.icon : "check"} size={13} color={last ? "var(--acc)" : "#22c55e"} />
                  </div>
                  {i < f.updates.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: "rgba(34,197,94,0.3)" }} />}
                </div>
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div style={{ fontFamily: SANS, fontSize: 13, color: last ? "var(--ink)" : "var(--ink-2)", fontWeight: last ? 600 : 400 }}>{st.label}</div>
                  <div style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.45, marginTop: 2 }}>{u.text}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginTop: 4 }}>{u.ts.replace("T", " · ")}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Glass style={{ padding: 14, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="link" size={15} color="var(--ink-3)" />
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--ink-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>orbit.ops/track/{t.id.toLowerCase()}</span>
          <button onClick={onCopy} style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink)", padding: "5px 11px", borderRadius: 8, cursor: "pointer", background: "var(--fill-3)", border: "1px solid var(--hair-3)" }}>Copy</button>
        </div>
      </Glass>
    </div>
  );
}
