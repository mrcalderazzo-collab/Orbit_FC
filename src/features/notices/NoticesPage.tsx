// NoticesPage — building-wide broadcasts. Compose a notice (water shutoff,
// assessment, inspection access…), target a building + audience, pick channels,
// send now or schedule, and track delivery status & reach.
import { useState } from "react";
import type { Notice } from "@/data/notices";
import { useOrbit } from "@/store/OrbitProvider";
import { NOTICE_AUDIENCES, NOTICE_CHANNELS, NOTICE_TEMPLATES } from "@/data/notices";
import { BUILDINGS, buildingById, portfolioTotals } from "@/data/seed";
import { Btn, Empty, Glass, Icon, Modal, Select, TextInput, Field, inputStyle, SectionLabel } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const CHAN_ICON: Record<string, string> = { Email: "mail", SMS: "message-square", Push: "bell", "In-app": "smartphone" };
const STATUS_C: Record<string, string> = { Sent: "#22c55e", Scheduled: "#3b82f6", Draft: "var(--ink-4)" };

export function NoticesPage() {
  const { notices } = useOrbit();
  const [composing, setComposing] = useState(false);
  const counts = { sent: notices.filter((n) => n.status === "Sent").length, sched: notices.filter((n) => n.status === "Scheduled").length, draft: notices.filter((n) => n.status === "Draft").length };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Notices" sub={counts.sent + " sent · " + counts.sched + " scheduled · " + counts.draft + " draft"}
        right={<Btn primary icon="megaphone" onClick={() => setComposing(true)}>New Notice</Btn>} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
          {notices.map((n) => <NoticeCard key={n.id} n={n} />)}
          {!notices.length && <Empty label="No notices yet" icon="megaphone" />}
        </div>
      </div>
      {composing && <ComposeNotice onClose={() => setComposing(false)} />}
    </div>
  );
}

function NoticeCard({ n }: { n: Notice }) {
  const b = n.building === "all" ? null : buildingById(n.building);
  const c = STATUS_C[n.status];
  return (
    <Glass style={{ padding: 16, borderLeft: n.urgent ? "2px solid #ef4444" : "1px solid var(--hair)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: n.urgent ? "rgba(239,68,68,0.1)" : "var(--fill-3)", border: "1px solid " + (n.urgent ? "rgba(239,68,68,0.3)" : "var(--hair-3)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={n.urgent ? "siren" : "megaphone"} size={17} color={n.urgent ? "#ef4444" : "var(--ink-3)"} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{n.title}</span>
            {n.urgent && <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", padding: "1px 6px", borderRadius: 5 }}>URGENT</span>}
          </div>
          <p style={{ margin: "0 0 9px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{n.body}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>
            <span style={{ color: b?.mono || "var(--ink-3)" }}>{b ? b.name : "All buildings"}</span>
            <span>· {n.audience}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{n.channels.map((ch) => <Icon key={ch} name={CHAN_ICON[ch] || "send"} size={11} color="var(--ink-4)" />)}</span>
            <span>· {n.reach} reach</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 28%, transparent)`, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>
            {n.status === "Sent" && <Icon name="check" size={10} color={c} />}{n.status}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-5)" }}>{n.at}</span>
        </div>
      </div>
    </Glass>
  );
}

function ComposeNotice({ onClose }: { onClose: () => void }) {
  const { sendNotice } = useOrbit();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [building, setBuilding] = useState(BUILDINGS[0].id);
  const [audience, setAudience] = useState(NOTICE_AUDIENCES[0]);
  const [channels, setChannels] = useState<string[]>(["Email", "In-app"]);
  const [urgent, setUrgent] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState("");

  const reach = building === "all" ? portfolioTotals().units : buildingById(building)?.units ?? 0;
  const toggleChan = (c: string) => setChannels((cs) => (cs.includes(c) ? (cs.length > 1 ? cs.filter((x) => x !== c) : cs) : [...cs, c]));
  const applyTemplate = (key: string) => {
    const tpl = NOTICE_TEMPLATES.find((t) => t.key === key)!;
    setTitle(tpl.title); setBody(tpl.body); setAudience(tpl.audience); setChannels(tpl.channels); setUrgent(tpl.urgent);
  };
  const submit = (status: Notice["status"]) => {
    if (!title.trim()) return;
    sendNotice({ title: title.trim(), body: body.trim(), building, audience, channels: [...channels], status, urgent, reach: status === "Draft" ? 0 : reach, at: status === "Scheduled" ? (when || "Scheduled") : undefined });
    onClose();
  };

  return (
    <Modal open onClose={onClose} width={680} title="New Notice" sub="Broadcast to a building"
      footer={<>
        <Btn ghost onClick={() => submit("Draft")}>Save draft</Btn>
        {schedule ? <Btn primary icon="calendar-clock" onClick={() => submit("Scheduled")} disabled={!title.trim()}>Schedule</Btn>
          : <Btn primary icon="send" onClick={() => submit("Sent")} disabled={!title.trim()}>Send now · {reach}</Btn>}
      </>}>
      {/* templates */}
      <SectionLabel style={{ marginBottom: 10 }}>Start from a template</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
        {NOTICE_TEMPLATES.map((tpl) => (
          <button key={tpl.key} onClick={() => applyTemplate(tpl.key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10, cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-3)", color: "var(--ink-2)", fontFamily: SANS, fontSize: 12, fontWeight: 500 }}>
            <Icon name={tpl.icon} size={13} color={tpl.urgent ? "#ef4444" : "var(--ink-3)"} />{tpl.label}
          </button>
        ))}
      </div>

      <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheduled water shutdown — Tue 8–11AM" autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Building"><Select options={[{ value: "all", label: "All buildings" }, ...BUILDINGS.map((b) => ({ value: b.id, label: b.name }))]} value={building} onChange={setBuilding} /></Field>
        <Field label="Audience"><Select options={NOTICE_AUDIENCES} value={audience} onChange={setAudience} /></Field>
      </div>
      <Field label="Message"><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write the announcement… use {date}, {lines}, {amount} as placeholders." style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }} /></Field>

      <SectionLabel style={{ margin: "6px 0 10px" }}>Channels</SectionLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {NOTICE_CHANNELS.map((c) => {
          const on = channels.includes(c);
          return (
            <button key={c} onClick={() => toggleChan(c)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 99, cursor: "pointer", background: on ? "rgba(var(--acc-rgb),0.1)" : "var(--fill-1)", border: "1px solid " + (on ? "rgba(var(--acc-rgb),0.45)" : "var(--hair-3)") }}>
              <Icon name={CHAN_ICON[c]} size={14} color={on ? "var(--acc-text)" : "var(--ink-3)"} />
              <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: on ? "var(--ink)" : "var(--ink-3)" }}>{c}</span>
              {on && <Icon name="check" size={12} color="var(--acc-text)" />}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Toggle on={urgent} label="Mark urgent" icon="siren" onClick={() => setUrgent((v) => !v)} danger />
        <Toggle on={schedule} label="Schedule for later" icon="calendar-clock" onClick={() => setSchedule((v) => !v)} />
        {schedule && <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ ...inputStyle, width: 220 }} />}
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>EST. REACH · {reach} residents</span>
      </div>
    </Modal>
  );
}

function Toggle({ on, label, icon, onClick, danger }: { on: boolean; label: string; icon: string; onClick: () => void; danger?: boolean }) {
  const c = danger && on ? "#ef4444" : on ? "var(--acc-text)" : "var(--ink-4)";
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      <span style={{ width: 30, height: 17, borderRadius: 99, background: on ? (danger ? "#ef4444" : "var(--acc)") : "var(--fill-3)", position: "relative", flexShrink: 0, border: "1px solid " + (on ? (danger ? "#ef4444" : "var(--acc)") : "var(--hair-3)") }}>
        <span style={{ width: 13, height: 13, borderRadius: "50%", background: on ? "#fff" : "var(--ink-4)", position: "absolute", top: 1, left: on ? 14 : 1, transition: "left .18s" }} />
      </span>
      <Icon name={icon} size={13} color={c} />
      <span style={{ fontFamily: SANS, fontSize: 12, color: on ? "var(--ink)" : "var(--ink-3)" }}>{label}</span>
    </button>
  );
}
