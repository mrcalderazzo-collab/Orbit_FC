// Super Calendar — plan the building in Day, Week, or Month view. Events the
// super adds land on the shared building calendar (tagged "super added"; the
// office sees them) and can spawn a ticket. Clicking any entry opens its detail
// (vendor, scope, COI, linked ticket). Scoped to the active building.
import { useMemo, useState } from "react";
import type { TicketType } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import type { BuildingEvent } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { todayISO } from "@/lib/focus";
import { Btn, Field, Glass, Icon, Select, Tag, TextInput, inputStyle } from "@/components/ui";
import { SuperVisitDetail, type VisitInfo } from "./SuperVisitDetail";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const TEAL = "#14b8a6";

const KINDS = ["Reminder", "Maintenance", "Vendor visit", "Inspection", "Move-in", "Move-out", "Meeting"];
const KIND_ICON: Record<string, string> = { Reminder: "bell", Maintenance: "wrench", "Vendor visit": "hard-hat", Inspection: "clipboard-check", "Move-in": "truck", "Move-out": "truck", Meeting: "users" };
const KIND_COLOR: Record<string, string> = { Reminder: "#64748b", Maintenance: "#b6ff00", "Vendor visit": "#f59e0b", Inspection: "#3b82f6", "Move-in": "#a855f7", "Move-out": "#a855f7", Meeting: "#14b8a6" };
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => new Date(s + "T12:00:00");
const timeLabel = (at: string) => { const d = new Date(at); return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };
const toInfo = (e: BuildingEvent): VisitInfo => ({ title: e.title, kind: e.kind, when: e.at, note: e.note, ticketId: e.ticketId });

type View = "month" | "week" | "day";

export function SuperCalendar({ buildingId }: { buildingId: string }) {
  const { calendar, addCalendarEvent, createTicket, currentUser } = useOrbit();
  const b = buildingById(buildingId);
  const me = currentUser?.person?.name || "Super";

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(todayISO());
  const [openForm, setOpenForm] = useState(false);
  const [selected, setSelected] = useState<VisitInfo | null>(null);

  // add-event form state
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("Reminder");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [alsoTicket, setAlsoTicket] = useState(false);

  const events = useMemo(() => calendar.filter((e) => e.buildingId === buildingId), [calendar, buildingId]);
  const eventsOn = (day: string) => events.filter((e) => e.at.slice(0, 10) === day).sort((a, c) => a.at.localeCompare(c.at));

  const save = () => {
    if (!title.trim()) return;
    const at = date + "T" + time;
    let ticketId: string | undefined;
    if (alsoTicket) {
      const type: TicketType = kind === "Maintenance" ? "Maintenance" : "Facility";
      ticketId = createTicket({ title: title.trim(), building: buildingId, type, prio: "Normal", requester: "Super · " + me, desc: note.trim(), status: "Open", category: kind === "Maintenance" ? "maintenance" : "facility" });
    }
    addCalendarEvent({ buildingId, title: title.trim(), kind, at, note: note.trim() || undefined, ticketId });
    setTitle(""); setNote(""); setAlsoTicket(false); setOpenForm(false); setCursor(date); setView("day");
  };

  const shift = (dir: number) => {
    const d = parse(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * (view === "week" ? 7 : 1));
    setCursor(iso(d));
  };

  const c = parse(cursor);
  const heading = view === "month"
    ? c.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : view === "day"
      ? c.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : (() => { const s = new Date(c); s.setDate(c.getDate() - c.getDay()); const e = new Date(s); e.setDate(s.getDate() + 6); return s.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " + e.toLocaleDateString("en-US", { month: "short", day: "numeric" }); })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Building calendar</h2>
          <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b?.name} · the office sees what you plan</p>
        </div>
        <Btn primary icon={openForm ? "x" : "calendar-plus"} onClick={() => setOpenForm((o) => !o)}>{openForm ? "Cancel" : "Add event"}</Btn>
      </div>

      {openForm && (
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

      {/* controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 2 }}>
          <NavBtn icon="chevron-left" onClick={() => shift(-1)} />
          <button onClick={() => setCursor(todayISO())} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--hair-3)", background: "var(--fill-2)", cursor: "pointer", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", color: "var(--ink-2)", textTransform: "uppercase" }}>Today</button>
          <NavBtn icon="chevron-right" onClick={() => shift(1)} />
        </div>
        <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{heading}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
          {(["day", "week", "month"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "5px 12px", borderRadius: 99, border: "none", cursor: "pointer", background: view === v ? "rgba(20,184,166,0.16)" : "transparent", color: view === v ? "var(--ink)" : "var(--ink-3)", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{v}</button>
          ))}
        </div>
      </div>

      {view === "month" && <MonthView cursor={cursor} eventsOn={eventsOn} onPick={(e) => setSelected(toInfo(e))} onDay={(d) => { setCursor(d); setView("day"); }} />}
      {view === "week" && <WeekView cursor={cursor} eventsOn={eventsOn} onPick={(e) => setSelected(toInfo(e))} />}
      {view === "day" && <DayView events={eventsOn(cursor)} onPick={(e) => setSelected(toInfo(e))} />}

      {selected && <SuperVisitDetail info={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function NavBtn({ icon, onClick }: { icon: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--hair-3)", background: "var(--fill-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={15} color="var(--ink-3)" /></button>;
}

function Dot({ kind }: { kind: string }) {
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: KIND_COLOR[kind] || "var(--ink-4)", flexShrink: 0 }} />;
}

function MonthView({ cursor, eventsOn, onPick, onDay }: { cursor: string; eventsOn: (d: string) => BuildingEvent[]; onPick: (e: BuildingEvent) => void; onDay: (d: string) => void }) {
  const c = parse(cursor);
  const y = c.getFullYear(), m = c.getMonth();
  const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const today = todayISO();
  return (
    <Glass style={{ padding: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {DOW.map((d) => <div key={d} style={{ textAlign: "center", fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", padding: "4px 0" }}>{d}</div>)}
        {cells.map((d, i) => {
          const day = iso(d);
          const evs = eventsOn(day);
          const inMonth = d.getMonth() === m;
          const isToday = day === today;
          return (
            <button key={i} onClick={() => onDay(day)} style={{ minHeight: 78, padding: 5, borderRadius: 9, border: "1px solid " + (isToday ? "rgba(20,184,166,0.5)" : "var(--hair-2)"), background: isToday ? "rgba(20,184,166,0.06)" : inMonth ? "var(--fill-1)" : "transparent", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 3, opacity: inMonth ? 1 : 0.4 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: isToday ? 700 : 400, color: isToday ? TEAL : "var(--ink-3)" }}>{d.getDate()}</span>
              {evs.slice(0, 3).map((e) => (
                <span key={e.id} onClick={(ev) => { ev.stopPropagation(); onPick(e); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "1px 4px", borderRadius: 5, background: (KIND_COLOR[e.kind] || "#64748b") + "1f" }}>
                  <Dot kind={e.kind} />
                  <span style={{ fontFamily: SANS, fontSize: 9, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                </span>
              ))}
              {evs.length > 3 && <span style={{ fontFamily: MONO, fontSize: 7.5, color: "var(--ink-4)" }}>+{evs.length - 3} more</span>}
            </button>
          );
        })}
      </div>
    </Glass>
  );
}

function WeekView({ cursor, eventsOn, onPick }: { cursor: string; eventsOn: (d: string) => BuildingEvent[]; onPick: (e: BuildingEvent) => void }) {
  const c = parse(cursor);
  const start = new Date(c); start.setDate(c.getDate() - c.getDay());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const today = todayISO();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
      {days.map((d, i) => {
        const day = iso(d);
        const evs = eventsOn(day);
        const isToday = day === today;
        return (
          <Glass key={i} style={{ padding: 10, minHeight: 200 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase" }}>{DOW[i]}</span>
              <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: isToday ? TEAL : "var(--ink)" }}>{d.getDate()}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {evs.map((e) => <EventChip key={e.id} e={e} onClick={() => onPick(e)} />)}
              {evs.length === 0 && <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-5)" }}>—</span>}
            </div>
          </Glass>
        );
      })}
    </div>
  );
}

function DayView({ events, onPick }: { events: BuildingEvent[]; onPick: (e: BuildingEvent) => void }) {
  return (
    <Glass style={{ padding: 16 }}>
      {events.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>Nothing scheduled. Add an event to plan this day.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {events.map((e, i) => (
            <button key={e.id} onClick={() => onPick(e)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 8px", border: "none", borderBottom: i < events.length - 1 ? "1px solid var(--hair)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }}>
              <span style={{ width: 64, fontFamily: MONO, fontSize: 10, color: "var(--ink-3)", flexShrink: 0 }}>{timeLabel(e.at) || "—"}</span>
              <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: (KIND_COLOR[e.kind] || "#64748b") + "1f" }}>
                <Icon name={KIND_ICON[e.kind] || "calendar"} size={16} color={KIND_COLOR[e.kind] || "var(--ink-3)"} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{e.title}</span>
                  <Tag>{e.kind}</Tag>
                  {e.source === "super" && <Tag color={TEAL} bg="rgba(20,184,166,0.12)">Super added</Tag>}
                  {e.ticketId && <Tag color="var(--acc-text)" bg="rgba(var(--acc-rgb),0.1)">{e.ticketId}</Tag>}
                </span>
                {e.note && <span style={{ display: "block", fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{e.note}</span>}
              </span>
              <Icon name="chevron-right" size={16} color="var(--ink-4)" />
            </button>
          ))}
        </div>
      )}
    </Glass>
  );
}

function EventChip({ e, onClick }: { e: BuildingEvent; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 7px", borderRadius: 7, border: "1px solid var(--hair-2)", background: (KIND_COLOR[e.kind] || "#64748b") + "12", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <Dot kind={e.kind} />
      <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 10.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
    </button>
  );
}
