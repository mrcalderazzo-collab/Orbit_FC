// Super Today — the superintendent's home base: who they are on this building,
// what needs hands today, and who's coming on site. Read-only summary; actions
// live in the Work tab. Scoped to their building.
import { useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { superTickets } from "@/data/identity";
import { buildingById, PEOPLE } from "@/data/seed";
import { superByBuilding } from "@/data/supers";
import { BUILDING_SYSTEMS, SITE_VISITS } from "@/data/buildings";
import { Btn, Glass, Icon, PrioDot, SectionLabel, Tag } from "@/components/ui";
import { SuperVisitDetail, type VisitInfo } from "./SuperVisitDetail";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const TEAL = "#14b8a6";
const fmtDateTime = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function SuperToday({ buildingId, go, onCreate, onOpenTask }: { buildingId: string; go: (id: string) => void; onCreate: () => void; onOpenTask: (id: string) => void }) {
  const { currentUser, tickets } = useOrbit();
  const [visit, setVisit] = useState<VisitInfo | null>(null);
  const b = buildingById(buildingId);
  const sup = superByBuilding(buildingId);
  const work = useMemo(() => superTickets(buildingId, tickets), [buildingId, tickets]);
  const active = work.filter((t) => t.status !== "Closed");
  const urgent = active.filter((t) => t.prio === "Critical" || t.prio === "High");
  const systems = BUILDING_SYSTEMS.filter((s) => s.buildingId === buildingId);
  const riskSystems = systems.filter((s) => s.state === "risk" || s.state === "offline");
  const visits = SITE_VISITS.filter((v) => v.buildingId === buildingId && v.status !== "Completed");
  const first = (currentUser?.person?.name || sup?.name || "there").split(" ")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* greeting */}
      <Glass style={{ padding: 20, borderLeft: "3px solid " + TEAL }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon name="hammer" size={16} color={TEAL} />
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: TEAL, textTransform: "uppercase" }}>{b?.name}</span>
        </div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 23, letterSpacing: "-0.4px", color: "var(--ink)" }}>Welcome back, {first}</h2>
        {sup && <p style={{ margin: "6px 0 0", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>{sup.shift}</p>}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginTop: 16, flexWrap: "wrap" }}>
          <Quick value={active.length} label="Open jobs" color={active.length ? "var(--ink)" : "#22c55e"} />
          <Quick value={urgent.length} label="Urgent" color={urgent.length ? "#ef4444" : "#22c55e"} />
          <Quick value={riskSystems.length} label="Systems at risk" color={riskSystems.length ? "#ef4444" : "#22c55e"} />
          <Quick value={visits.length} label="Visits ahead" color="var(--ink)" />
          <Btn primary icon="plus" onClick={onCreate} style={{ marginLeft: "auto" }}>Log a ticket</Btn>
        </div>
      </Glass>

      {/* needs hands today */}
      <Glass style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <SectionLabel>Needs hands</SectionLabel>
          <Btn small ghost icon="arrow-right" onClick={() => go("work")} style={{ marginLeft: "auto" }}>All work</Btn>
        </div>
        {urgent.length === 0 ? (
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>Nothing urgent right now. Check the Work tab for the full list.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {urgent.map((t, i) => (
              <button key={t.id} onClick={() => go("work")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", border: "none", borderBottom: i < urgent.length - 1 ? "1px solid var(--hair)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: t.prio === "Critical" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)" }}>
                  <Icon name={t.type === "Maintenance" ? "wrench" : "building-2"} size={16} color={t.prio === "Critical" ? "#ef4444" : "#f59e0b"} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: SANS, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginTop: 2 }}>{t.id} · {t.status}{t.vendor ? " · " + t.vendor : ""}</span>
                </span>
                <PrioDot prio={t.prio} />
              </button>
            ))}
          </div>
        )}
      </Glass>

      {/* who's coming */}
      <Glass style={{ padding: 18 }}>
        <SectionLabel style={{ marginBottom: 12 }}>Who's coming on site</SectionLabel>
        {visits.length === 0 ? (
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>No scheduled visits.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visits.map((v) => {
              const c = v.status === "Scheduled" ? "#3b82f6" : "#f59e0b";
              const info: VisitInfo = { title: v.title, kind: v.purpose, when: v.startsAt, lead: PEOPLE[v.lead]?.name, areas: v.areas, agenda: v.agenda, attendees: v.attendees, note: v.notes, ticketId: v.relatedTicketId };
              return (
                <button key={v.id} onClick={() => setVisit(info)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 12, background: "var(--fill-1)", border: "1px solid var(--hair-2)", cursor: "pointer", textAlign: "left", width: "100%" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: c + "1a" }}>
                    <Icon name={v.purpose === "Vendor walk" ? "hard-hat" : v.purpose === "Inspection" ? "clipboard-check" : "footprints"} size={16} color={c} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{v.title}</span>
                      <Tag color={c}>{v.purpose}</Tag>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 3 }}>{fmtDateTime(v.startsAt)}</div>
                    {v.areas.length > 0 && <div style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>Areas: {v.areas.join(" · ")}</div>}
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--ink-4)" />
                </button>
              );
            })}
          </div>
        )}
      </Glass>

      {/* my role on this building */}
      {sup && (
        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 12 }}>My role here</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {sup.responsibilities.map((r) => (
              <span key={r} style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", background: "var(--fill-2)", border: "1px solid var(--hair-2)", padding: "5px 11px", borderRadius: 99 }}>{r}</span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, paddingTop: 14, borderTop: "1px solid var(--hair-2)" }}>
            <Info label="On site since" value={String(sup.since)} />
            <Info label="Lives on site" value={sup.livesOnSite ? "Yes" + (sup.unit ? " · Unit " + sup.unit : "") : "No"} />
            <Info label="Languages" value={sup.languages.join(", ")} />
            <Info label="Emergency" value={sup.emergencyPhone} />
          </div>
          {sup.certifications.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase", marginBottom: 8 }}>Certifications</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sup.certifications.map((cert) => <Tag key={cert} color={TEAL} bg="rgba(20,184,166,0.12)">{cert}</Tag>)}
              </div>
            </div>
          )}
        </Glass>
      )}

      {visit && <SuperVisitDetail info={visit} onClose={() => setVisit(null)} onOpenTask={onOpenTask} />}
    </div>
  );
}

function Quick({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600, lineHeight: 1, color }}>{value}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{value}</span>
    </div>
  );
}
