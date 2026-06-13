// SuperVisitDetail — opens a "who's coming" item so it's crystal clear who is on
// site and exactly what they're doing: vendor (with live COI status), scope/
// agenda, areas, who's leading, and the linked work ticket (openable). Fed by
// site visits and calendar events alike via a normalized shape.
import { useOrbit } from "@/store/OrbitProvider";
import { vendorByName, coiStatus, fmtCoiDate } from "@/data/vendors";
import { Btn, Icon, Modal, SectionLabel, StatusTag, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export interface VisitInfo {
  title: string;
  kind: string;
  when?: string;
  lead?: string;
  vendor?: string;
  areas?: string[];
  agenda?: string[];
  attendees?: string[];
  note?: string;
  ticketId?: string;
}

const fmtWhen = (iso?: string) => {
  if (!iso) return "Time TBD";
  const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export function SuperVisitDetail({ info, onClose, onOpenTask }: { info: VisitInfo; onClose: () => void; onOpenTask?: (id: string) => void }) {
  const { tickets } = useOrbit();
  const linked = info.ticketId ? tickets.find((t) => t.id === info.ticketId) : undefined;
  const vendorName = info.vendor || linked?.vendor;
  const vendor = vendorByName(vendorName);
  const coi = vendor ? coiStatus(vendor) : null;

  return (
    <Modal open onClose={onClose} width={560} title={info.title} sub={info.kind + " · " + fmtWhen(info.when)}
      footer={<>{linked && onOpenTask ? <Btn primary icon="square-arrow-out-up-right" onClick={() => { onOpenTask(linked.id); onClose(); }}>Open ticket {linked.id}</Btn> : <span />}<Btn ghost onClick={onClose}>Close</Btn></>}>
      {/* vendor */}
      {vendorName ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 12, background: "var(--fill-1)", border: "1px solid var(--hair-2)", marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,158,11,0.12)" }}>
            <Icon name="hard-hat" size={19} color="#f59e0b" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{vendorName}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{vendor ? vendor.trades.slice(0, 3).join(" · ") : "Vendor on site"}</div>
          </div>
          {coi && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: coi.color, textTransform: "uppercase" }}>{coi.label}</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{vendor && fmtCoiDate(vendor.coiExpiry)}</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 12, background: "var(--fill-1)", border: "1px solid var(--hair-2)", marginBottom: 16 }}>
          <Icon name="info" size={15} color="var(--ink-4)" />
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>No vendor assigned{info.lead ? " · led by " + info.lead : ""}.</span>
        </div>
      )}

      {/* what they're doing */}
      {linked && (
        <div style={{ marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 8 }}>Scope of work</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{linked.title}</span>
            <StatusTag status={linked.status} />
          </div>
          {linked.desc && <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>{linked.desc}</p>}
        </div>
      )}

      {info.note && (
        <div style={{ marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 6 }}>Notes</SectionLabel>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{info.note}</p>
        </div>
      )}

      {info.agenda && info.agenda.length > 0 && <Block label="Agenda" items={info.agenda} icon="list-checks" />}
      {info.areas && info.areas.length > 0 && <Block label="Areas / access" items={info.areas} icon="map-pin" />}
      {info.attendees && info.attendees.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <SectionLabel style={{ marginBottom: 8 }}>On site</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {info.lead && <Tag color="#14b8a6" bg="rgba(20,184,166,0.12)">{info.lead} · lead</Tag>}
            {info.attendees.map((a) => <Tag key={a}>{a}</Tag>)}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Block({ label, items, icon }: { label: string; items: string[]; icon: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel style={{ marginBottom: 8 }}>{label}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon name={icon} size={13} color="var(--ink-4)" />
            <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.45 }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
