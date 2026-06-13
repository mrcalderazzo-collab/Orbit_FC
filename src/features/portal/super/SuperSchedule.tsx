// Super Schedule — everything coming to the building that the super has to let
// in or stand by for: vendor visits & inspections, vendor COI status (so an
// uninsured crew never gets escorted up), and move-ins / move-outs. Reads site
// visits + vendor COIs + the building calendar; scoped to the active building.
import { useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById, PEOPLE } from "@/data/seed";
import { SITE_VISITS, BUILDING_SYSTEMS } from "@/data/buildings";
import { coiStatus, fmtCoiDate, vendorByName } from "@/data/vendors";
import { Glass, Icon, SectionLabel, Tag } from "@/components/ui";
import { SuperVisitDetail, type VisitInfo } from "./SuperVisitDetail";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const fmtDT = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function SuperSchedule({ buildingId, go, onOpenTask }: { buildingId: string; go: (id: string) => void; onOpenTask: (id: string) => void }) {
  const { calendar } = useOrbit();
  const [visit, setVisit] = useState<VisitInfo | null>(null);
  const b = buildingById(buildingId);
  const visits = SITE_VISITS.filter((v) => v.buildingId === buildingId && v.status !== "Completed");
  const moves = calendar.filter((e) => e.buildingId === buildingId && /move/i.test(e.kind)).sort((a, c) => a.at.localeCompare(c.at));

  // COIs for the vendors that actually service this building's systems
  const cois = useMemo(() => {
    const names = new Set(BUILDING_SYSTEMS.filter((s) => s.buildingId === buildingId).map((s) => s.vendor));
    return [...names]
      .map((n) => vendorByName(n))
      .filter((v): v is NonNullable<typeof v> => !!v)
      .map((v) => ({ v, coi: coiStatus(v) }))
      .sort((a, c) => a.coi.days - c.coi.days);
  }, [buildingId]);
  const expiringCount = cois.filter((c) => c.coi.status !== "valid").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Schedule &amp; access</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b?.name} · visits, COIs &amp; moves</p>
      </div>

      {/* visits */}
      <Glass style={{ padding: 18 }}>
        <SectionLabel style={{ marginBottom: 12 }}>Vendor visits &amp; inspections</SectionLabel>
        {visits.length === 0 ? (
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>Nothing scheduled.</p>
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
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 3 }}>{fmtDT(v.startsAt)} · lead {PEOPLE[v.lead]?.name || v.lead}</div>
                    {v.areas.length > 0 && <div style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>Areas: {v.areas.join(" · ")}</div>}
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--ink-4)" />
                </button>
              );
            })}
          </div>
        )}
      </Glass>

      {/* COI */}
      <Glass style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <SectionLabel>Vendor insurance (COI)</SectionLabel>
          {expiringCount > 0 && <Tag color="#f59e0b" bg="rgba(245,158,11,0.12)" style={{ marginLeft: "auto" }}>{expiringCount} need attention</Tag>}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {cois.map(({ v, coi }, i) => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < cois.length - 1 ? "1px solid var(--hair)" : "none" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: coi.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{v.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{v.trades.slice(0, 2).join(" · ")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: coi.color, textTransform: "uppercase" }}>{coi.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{coi.days < 0 ? "expired " + fmtCoiDate(v.coiExpiry) : "valid to " + fmtCoiDate(v.coiExpiry)}</div>
              </div>
            </div>
          ))}
          {cois.length === 0 && <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>No vendor COIs on file for this building's systems.</p>}
        </div>
        <p style={{ margin: "12px 0 0", fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
          <Icon name="shield-alert" size={12} color="#f59e0b" /> Don't escort a crew with an expired COI — flag the office to renew first.
        </p>
      </Glass>

      {/* moves */}
      <Glass style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <SectionLabel>Move-ins &amp; move-outs</SectionLabel>
          <button onClick={() => go("calendar")} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "transparent", cursor: "pointer", fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "var(--acc-text)", textTransform: "uppercase" }}>
            <Icon name="calendar-plus" size={12} color="var(--acc-text)" />Schedule one
          </button>
        </div>
        {moves.length === 0 ? (
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>No moves scheduled. Add one from the Calendar to reserve the service elevator.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {moves.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(168,85,247,0.12)" }}>
                  <Icon name="truck" size={15} color="#a855f7" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{m.title}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{fmtDT(m.at)}{m.note ? " · " + m.note : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Glass>

      {visit && <SuperVisitDetail info={visit} onClose={() => setVisit(null)} onOpenTask={onOpenTask} />}
    </div>
  );
}
