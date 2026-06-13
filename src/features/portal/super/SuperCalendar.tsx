// Super Calendar — the super plans their building. Events they add land on the
// shared building calendar tagged "super added" (so the office sees what the
// super has lined up), and can optionally spawn a work ticket. Agenda view,
// scoped to the active building.
import { useMemo, useState } from "react";
import type { TicketType } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { todayISO } from "@/lib/focus";
import { Btn, Field, Glass, Icon, SectionLabel, Select, Tag, TextInput, inputStyle } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const TEAL = "#14b8a6";

const KINDS = ["Reminder", "Maintenance", "Vendor visit", "Inspection", "Move-in", "Move-out", "Meeting"];
const KIND_ICON: Record<string, string> = { Reminder: "bell", Maintenance: "wrench", "Vendor visit": "hard-hat", Inspection: "clipboard-check", "Move-in": "truck", "Move-out": "truck", Meeting: "users" };
const dayLabel = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const timeLabel = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };

export function SuperCalendar({ buildingId }: { buildingId: string }) {
  const { calendar, addCalendarEvent, createTicket, currentUser } = useOrbit();
  const b = buildingById(buildingId);
  const me = currentUser?.person?.name || "Super";

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("Reminder");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [alsoTicket, setAlsoTicket] = useState(false);

  const events = useMemo(() => calendar.filter((e) => e.buildingId === buildingId).sort((a, c) => a.at.localeCompare(c.at)), [calendar, buildingId]);
  const byDay = useMemo(() => {
    const m: Record<string, typeof events> = {};
    events.forEach((e) => { const d = e.at.slice(0, 10); (m[d] ||= []).push(e); });
    return Object.entries(m);
  }, [events]);

  const save = () => {
    if (!title.trim()) return;
    const at = date + "T" + time;
    let ticketId: string | undefined;
    if (alsoTicket) {
      const type: TicketType = kind === "Maintenance" ? "Maintenance" : "Facility";
      ticketId = createTicket({ title: title.trim(), building: buildingId, type, prio: "Normal", requester: "Super · " + me, desc: note.trim(), status: "Open", category: kind === "Maintenance" ? "maintenance" : "facility" });
    }
    addCalendarEvent({ buildingId, title: title.trim(), kind, at, note: note.trim() || undefined, ticketId });
    setTitle(""); setNote(""); setAlsoTicket(false); setOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Building calendar</h2>
          <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b?.name} · plan ahead, the office sees it too</p>
        </div>
        <Btn primary icon={open ? "x" : "calendar-plus"} onClick={() => setOpen((o) => !o)}>{open ? "Cancel" : "Add event"}</Btn>
      </div>

      {open && (
        <Glass style={{ padding: 18 }}>
          <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reserve service elevator for move-out" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Type"><Select value={kind} onChange={setKind} options={KINDS} /></Field>
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, fontFamily: SANS }} /></Field>
            <Field label="Time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, fontFamily: SANS }} /></Field>
          </div>
          <Field label="Note (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Access, vendor, units affected…" /></Field>
          <button onClick={() => setAlsoTicket((p) => !p)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10, cursor: "pointer", width: "100%", textAlign: "left", marginBottom: 14, background: alsoTicket ? "rgba(20,184,166,0.08)" : "var(--fill-1)", border: "1px solid " + (alsoTicket ? "rgba(20,184,166,0.3)" : "var(--hair-2)") }}>
            <Icon name={alsoTicket ? "check-square" : "square"} size={16} color={alsoTicket ? TEAL : "var(--ink-4)"} />
            <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-2)" }}>Also create a work ticket for this</span>
          </button>
          <Btn primary icon="check" disabled={!title.trim()} onClick={save} style={{ width: "100%", justifyContent: "center" }}>Add to calendar</Btn>
        </Glass>
      )}

      {byDay.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>Nothing on the calendar yet. Add your first event.</Glass>
      ) : (
        byDay.map(([day, evs]) => (
          <div key={day}>
            <SectionLabel style={{ marginBottom: 10 }}>{dayLabel(day)}</SectionLabel>
            <Glass style={{ padding: 6 }}>
              {evs.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderBottom: i < evs.length - 1 ? "1px solid var(--hair)" : "none" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fill-2)", border: "1px solid var(--hair-3)" }}>
                    <Icon name={KIND_ICON[e.kind] || "calendar"} size={16} color={e.source === "super" ? TEAL : "var(--acc-text)"} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{e.title}</span>
                      <Tag>{e.kind}</Tag>
                      {e.source === "super" && <Tag color={TEAL} bg="rgba(20,184,166,0.12)">Super added</Tag>}
                      {e.ticketId && <Tag color="var(--acc-text)" bg="rgba(var(--acc-rgb),0.1)">{e.ticketId}</Tag>}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 3 }}>{timeLabel(e.at)} · {e.by}{e.note ? " · " + e.note : ""}</div>
                  </div>
                </div>
              ))}
            </Glass>
          </div>
        ))
      )}
    </div>
  );
}
