// PlannerPage — the operator's personal daily command surface. Pulls the work
// that's actually on you (assigned + your buildings), ranks the Top 10 by what
// matters most (emergency > overdue > due today > age), and frames the day with
// a week strip, today's schedule, quick stats, and a notes pad. Ported from the
// Daisy "Planner" concept; built on live tickets + Next Touch.
import { useMemo, useState } from "react";
import type { Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { ticketFlow } from "@/data/flow";
import { todayISO, addDaysISO } from "@/lib/focus";
import { BUILDINGS, buildingById, PEOPLE } from "@/data/seed";
import { SITE_VISITS } from "@/data/buildings";
import { PRIO_COLOR } from "@/lib/ticket";
import { Glass, Icon, SectionLabel, StatusTag, Tag, inputStyle } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const isOverdue = (t: Ticket) => ticketFlow(t).sla.breached || (!!t.workDate && t.workDate < todayISO());
const scoreOf = (t: Ticket): number => {
  let s = 0;
  if (t.prio === "Critical") s += 1000;
  if (t.prio === "High") s += 400;
  if (isOverdue(t)) s += 600;
  if (t.workDate === todayISO()) s += 300;
  if (!t.assignee) s += 80;
  s += ticketFlow(t).sla.pct; // older / closer to breach floats up
  return s;
};

export function PlannerPage() {
  const { tickets, currentUser, openCommand } = useOrbit();
  const myWho = currentUser?.persona === "operator" ? currentUser.who : undefined;
  const [notes, setNotes] = useState("");
  const [selectedDay, setSelectedDay] = useState(todayISO());

  const today = todayISO();
  const mine = useMemo(() => tickets.filter((t) => {
    if (t.mergedInto) return false;
    if (!myWho) return t.status !== "Closed";
    return t.assignee === myWho || BUILDINGS.find((b) => b.id === t.building)?.am === myWho;
  }), [tickets, myWho]);

  const open = mine.filter((t) => t.status !== "Closed");
  const dueToday = open.filter((t) => t.workDate === today);
  const overdue = open.filter(isOverdue);
  const completed = mine.filter((t) => t.status === "Closed");
  const ranked = useMemo(() => [...open].sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 10), [open]);

  const visitsToday = SITE_VISITS.filter((v) => v.startsAt.slice(0, 10) === today);
  const meetingsToday = visitsToday.length;

  const weekCounts = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysISO(i);
    return { iso: d, n: open.filter((t) => t.workDate === d).length, m: SITE_VISITS.filter((v) => v.startsAt.slice(0, 10) === d).length };
  });

  // selected-day detail — meetings, tickets, availability for the clicked box
  const dayVisits = SITE_VISITS.filter((v) => v.startsAt.slice(0, 10) === selectedDay).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const dayTickets = open.filter((t) => t.workDate === selectedDay);
  const dayFree = Math.max(0, 9 - dayVisits.length);
  const dayLabel = new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const dayRel = selectedDay === today ? "Today" : selectedDay === addDaysISO(1) ? "Tomorrow" : DOW[new Date(selectedDay + "T12:00:00").getDay()];
  const dueThisWeek = open.filter((t) => t.workDate && t.workDate >= today && t.workDate <= addDaysISO(6)).length;
  const dueNextWeek = open.filter((t) => t.workDate && t.workDate > addDaysISO(6) && t.workDate <= addDaysISO(13)).length;
  const buildingsTouched = new Set(open.map((t) => t.building)).size;
  const me = currentUser?.persona === "operator" && myWho ? PEOPLE[myWho]?.name : "there";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Planner" sub={new Date(today + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 18, alignItems: "start" }}>
        {/* main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            <Kpi value={open.length} label="My Tasks" />
            <Kpi value={dueToday.length} label="Due Today" color="#3b82f6" />
            <Kpi value={overdue.length} label="Overdue" color={overdue.length ? "#ef4444" : "var(--ink)"} />
            <Kpi value={completed.length} label="Completed" color="#22c55e" />
            <Kpi value={meetingsToday} label="Meetings Today" color="#a855f7" />
            <Kpi value={Math.max(0, 9 - meetingsToday)} label="Free Hours" suffix="h" />
          </div>

          {/* week strip — click a day to see what's on it */}
          <Glass style={{ padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
              {weekCounts.map((w, i) => {
                const d = new Date(w.iso + "T12:00:00");
                const isToday = w.iso === today;
                const isSel = w.iso === selectedDay;
                return (
                  <button key={w.iso} onClick={() => setSelectedDay(w.iso)} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, cursor: "pointer", background: isSel ? "rgba(var(--acc-rgb),0.16)" : isToday ? "rgba(var(--acc-rgb),0.07)" : "var(--fill-1)", border: "1px solid " + (isSel ? "var(--acc)" : isToday ? "rgba(var(--acc-rgb),0.35)" : "var(--hair-2)") }}>
                    <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>{i === 0 ? "Today" : DOW[d.getDay()]}</div>
                    <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, color: isSel || isToday ? "var(--acc-text)" : "var(--ink)", marginTop: 3 }}>{d.getDate()}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 4, minHeight: 8 }}>
                      {w.n > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: MONO, fontSize: 8, color: "var(--ink-4)" }}><span style={{ width: 5, height: 5, borderRadius: 2, background: "var(--acc)" }} />{w.n}</span>}
                      {w.m > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: MONO, fontSize: 8, color: "var(--ink-4)" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a855f7" }} />{w.m}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Glass>

          {/* selected-day detail */}
          <Glass style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid var(--hair-2)" }}>
              <Icon name="calendar-days" size={15} color="var(--acc-text)" />
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{dayLabel}</span>
              <Tag color="var(--acc-text)">{dayRel}</Tag>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9, color: dayFree > 2 ? "#22c55e" : "#f59e0b" }}>
                <Icon name="clock" size={13} color={dayFree > 2 ? "#22c55e" : "#f59e0b"} />{dayFree}h free · {dayVisits.length} mtg · {dayTickets.length} task{dayTickets.length === 1 ? "" : "s"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {/* meetings */}
              <div style={{ padding: "13px 16px", borderRight: "1px solid var(--hair-2)" }}>
                <SectionLabel style={{ marginBottom: 10 }}>Meetings & visits</SectionLabel>
                {dayVisits.length === 0 ? (
                  <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-4)" }}>Nothing scheduled — {dayFree}h open.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {dayVisits.map((v) => (
                      <div key={v.id} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: "#a855f7", paddingTop: 1, width: 52, flexShrink: 0 }}>{new Date(v.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{v.title}</span>
                          <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{buildingById(v.buildingId)?.name}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* tickets due */}
              <div style={{ padding: "13px 16px" }}>
                <SectionLabel style={{ marginBottom: 10 }}>Tickets due</SectionLabel>
                {dayTickets.length === 0 ? (
                  <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-4)" }}>No tickets scheduled for this day.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dayTickets.map((t) => {
                      const b = buildingById(t.building);
                      return (
                        <button key={t.id} onClick={() => openCommand(t.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: 0, background: "none", border: "none", cursor: "pointer" }}>
                          <span style={{ width: 7, height: 7, borderRadius: 2, background: PRIO_COLOR[t.prio], flexShrink: 0 }} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                            <span style={{ display: "block", fontFamily: MONO, fontSize: 8, color: b?.mono }}>{b?.name} · {t.id}</span>
                          </span>
                          <StatusTag status={t.status} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Glass>

          {/* priority ranking */}
          <Glass style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 16px", borderBottom: "1px solid var(--hair-2)" }}>
              <Icon name="list-ordered" size={15} color="var(--acc-text)" />
              <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Priority ranking · Top 10</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>emergency · overdue · due · age</span>
            </div>
            <div>
              {ranked.map((t, i) => {
                const b = buildingById(t.building);
                const od = isOverdue(t);
                return (
                  <button key={t.id} onClick={() => openCommand(t.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", border: "none", borderBottom: i < ranked.length - 1 ? "1px solid var(--hair)" : "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-1)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: i < 3 ? "var(--acc-text)" : "var(--ink-4)", width: 24 }}>#{i + 1}</span>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: PRIO_COLOR[t.prio], flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontFamily: SANS, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                      <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: b?.mono }}>{b?.name} · {t.id}</span>
                    </span>
                    {od && <Tag color="#ef4444" bg="rgba(239,68,68,0.12)">Overdue</Tag>}
                    {t.workDate === today && <Tag color="#3b82f6" bg="rgba(59,130,246,0.12)">Today</Tag>}
                    <StatusTag status={t.status} />
                  </button>
                );
              })}
              {!ranked.length && <div style={{ padding: "28px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)" }}>NOTHING ON YOUR PLATE — NICE</div>}
            </div>
          </Glass>
        </div>

        {/* side rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Glass style={{ padding: 16 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Today's schedule</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon name="clock" size={14} color="#22c55e" />
              <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>9:00 AM – 6:00 PM · {Math.max(0, 9 - meetingsToday)}h free</span>
            </div>
            {visitsToday.length === 0 ? (
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-3)" }}>No meetings scheduled.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {visitsToday.map((v) => (
                  <div key={v.id} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <Icon name="calendar-check" size={13} color="var(--acc-text)" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink)" }}>{v.title}</div>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{new Date(v.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {buildingById(v.buildingId)?.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Glass>

          <Glass style={{ padding: 16 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Quick stats</SectionLabel>
            <Stat k="Open tickets" v={open.length} />
            <Stat k="Due this week" v={dueThisWeek} />
            <Stat k="Overdue" v={overdue.length} c={overdue.length ? "#ef4444" : undefined} />
            <Stat k="Next week" v={dueNextWeek} />
            <Stat k="Buildings" v={buildingsTouched} last />
          </Glass>

          <Glass style={{ padding: 16 }}>
            <SectionLabel style={{ marginBottom: 10 }}>Notes</SectionLabel>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder={"Quick notes for the day, " + (me?.split(" ")[0] || "") + "…"} style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }} />
          </Glass>
        </div>
      </div>
    </div>
  );
}

function Kpi({ value, label, color = "var(--ink)", suffix }: { value: number; label: string; color?: string; suffix?: string }) {
  return (
    <Glass style={{ padding: "14px 12px" }}>
      <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600, lineHeight: 1, color, letterSpacing: "-0.5px" }}>{value}{suffix}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "var(--ink-4)", textTransform: "uppercase", marginTop: 7 }}>{label}</div>
    </Glass>
  );
}

function Stat({ k, v, c, last }: { k: string; v: number; c?: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: last ? "none" : "1px solid var(--hair)" }}>
      <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>{k}</span>
      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: c || "var(--ink)" }}>{v}</span>
    </div>
  );
}
