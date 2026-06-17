// ComplianceCommand — the compliance-leader cockpit. Compliance lives inside each
// building today; at 40 buildings the risk has to be seen portfolio-wide, sorted
// by deadline. This rolls every building's records + every vendor's COI into one
// urgency-ranked board, so nothing lapses unseen. Org-wide scope.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS, PEOPLE, buildingById } from "@/data/seed";
import { BUILDING_RECORDS } from "@/data/buildings";
import { VENDORS, coiStatus } from "@/data/vendors";
import { TopBar } from "@/components/shell/TopBar";
import { Glass, Icon, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const DAY = 864e5;

type Severity = "overdue" | "urgent" | "soon" | "ok";
interface DeadlineItem {
  id: string; group: "COI" | "Insurance" | "Inspection" | "Contract" | "Financial" | "Governance";
  title: string; sub: string; due: string; days: number; severity: Severity;
  building?: string; owner?: string; vendorId?: string; phone?: string; email?: string;
}

const sevColor = (s: Severity) => s === "overdue" ? "#ef4444" : s === "urgent" ? "#f97316" : s === "soon" ? "#f59e0b" : "#22c55e";
const severityOf = (days: number): Severity => days < 0 ? "overdue" : days <= 14 ? "urgent" : days <= 30 ? "soon" : "ok";
const GROUP_ICON: Record<DeadlineItem["group"], string> = { COI: "shield-check", Insurance: "umbrella", Inspection: "clipboard-check", Contract: "file-signature", Financial: "circle-dollar-sign", Governance: "landmark" };

export function ComplianceCommand() {
  const { nav } = useOrbit();

  const items = useMemo<DeadlineItem[]>(() => {
    const now = Date.now();
    const out: DeadlineItem[] = [];
    // building records: anything not Current, or due within 60 days
    BUILDING_RECORDS.forEach((r) => {
      const days = Math.round((new Date(r.due + "T12:00:00").getTime() - now) / DAY);
      if (r.status === "Current" && days > 60) return;
      out.push({
        id: r.id, group: r.kind, title: r.title, sub: (buildingById(r.buildingId)?.name ?? r.buildingId) + " · " + r.status,
        due: r.due, days, severity: r.status === "Needs review" ? "urgent" : severityOf(days),
        building: r.buildingId, owner: PEOPLE[r.owner]?.name ?? r.owner,
      });
    });
    // vendor COIs: expiring or expired
    VENDORS.forEach((v) => {
      const coi = coiStatus(v);
      if (coi.status === "valid") return;
      out.push({
        id: "coi_" + v.id, group: "COI", title: v.name + " — certificate of insurance", sub: v.trades.join(" · ") + " · " + coi.label,
        due: v.coiExpiry, days: coi.days, severity: severityOf(coi.days),
        vendorId: v.id, phone: v.phone, email: v.email,
      });
    });
    return out.sort((a, b) => a.days - b.days);
  }, []);

  const expired = items.filter((i) => i.severity === "overdue");
  const cois = items.filter((i) => i.group === "COI");
  const inspections = items.filter((i) => i.group === "Inspection");
  const review = items.filter((i) => i.sub.includes("Needs review"));
  const alertBuildings = BUILDINGS.filter((b) => b.compliance !== "ok");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Compliance Command" sub={`${BUILDINGS.length} buildings · ${items.length} items on the clock · ${expired.length} overdue`} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <Kpi label="Overdue" value={expired.length} color={expired.length ? "#ef4444" : "#22c55e"} icon="alarm-clock-off" />
          <Kpi label="COIs expiring/expired" value={cois.length} color={cois.length ? "#f59e0b" : "#22c55e"} icon="shield-alert" />
          <Kpi label="Inspections due" value={inspections.length} color={inspections.length ? "#f59e0b" : "#22c55e"} icon="clipboard-check" />
          <Kpi label="Buildings flagged" value={alertBuildings.length} color={alertBuildings.length ? "#f59e0b" : "#22c55e"} icon="building-2" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
          {/* deadline board */}
          <Glass style={{ padding: 17 }}>
            <Header title="Deadline board — soonest first" icon="calendar-clock" count={items.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {items.length ? items.map((i) => <DeadlineRow key={i.id} item={i} onOpen={() => i.building && nav("buildings", i.building)} />)
                : <Empty icon="shield-check" text="Everything is current across the portfolio." />}
            </div>
          </Glass>

          {/* building rollup + review queue */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Glass style={{ padding: 17 }}>
              <Header title="Buildings flagged" icon="building-2" count={alertBuildings.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alertBuildings.length ? alertBuildings.map((b) => {
                  const c = b.compliance === "alert" ? "#ef4444" : "#f59e0b";
                  const open = items.filter((i) => i.building === b.id).length;
                  return (
                    <button key={b.id} onClick={() => nav("buildings", b.id)} className="attention-row" style={{ cursor: "pointer" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: c, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{b.name}</span>
                        <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{b.compliance === "alert" ? "Compliance alert" : "Review due"} · {open} open item{open !== 1 ? "s" : ""}</span>
                      </span>
                      <Icon name="chevron-right" size={15} color="var(--ink-4)" />
                    </button>
                  );
                }) : <Empty icon="check-circle" text="No buildings flagged." />}
              </div>
            </Glass>
            <Glass style={{ padding: 17 }}>
              <Header title="Needs review" icon="file-warning" count={review.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {review.length ? review.map((i) => (
                  <button key={i.id} onClick={() => i.building && nav("buildings", i.building)} className="attention-row" style={{ cursor: "pointer" }}>
                    <Icon name={GROUP_ICON[i.group]} size={15} color="#f97316" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontFamily: SANS, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</span>
                      <span style={{ display: "block", fontFamily: MONO, fontSize: 8, color: "var(--ink-4)" }}>{i.sub}</span>
                    </span>
                  </button>
                )) : <Empty icon="check-circle" text="Nothing awaiting review." />}
              </div>
            </Glass>
          </div>
        </div>

        <p style={{ margin: "18px 0 0", fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-5)", textTransform: "uppercase" }}>
          Every COI and record across the portfolio, ranked by deadline · nothing lapses unseen
        </p>
      </div>
    </div>
  );
}

function DeadlineRow({ item, onOpen }: { item: DeadlineItem; onOpen: () => void }) {
  const color = sevColor(item.severity);
  const dueLabel = item.days < 0 ? `${Math.abs(item.days)}d overdue` : item.days === 0 ? "due today" : `${item.days}d`;
  return (
    <div className="attention-row" style={{ cursor: "default", borderColor: item.severity === "overdue" ? "color-mix(in srgb, #ef4444 35%, transparent)" : undefined }}>
      <span className="attention-row-icon" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}><Icon name={GROUP_ICON[item.group]} size={15} color={color} /></span>
      <button onClick={onOpen} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: 0, cursor: item.building ? "pointer" : "default", padding: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Tag color={color}>{item.group}</Tag>
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
        </span>
        <span style={{ display: "block", marginTop: 3, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{item.sub}{item.owner ? " · " + item.owner : ""}</span>
      </button>
      {item.vendorId && item.phone && (
        <div style={{ display: "flex", gap: 6 }}>
          <a href={`tel:${item.phone}`} style={contactBtn} title="Call vendor"><Icon name="phone" size={13} color="var(--ink-2)" /></a>
          <a href={`mailto:${item.email}?subject=COI%20renewal%20request`} style={contactBtn} title="Request renewal"><Icon name="mail" size={13} color="var(--ink-2)" /></a>
        </div>
      )}
      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color, minWidth: 64, textAlign: "right" }}>{dueLabel}</span>
    </div>
  );
}

function Kpi({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <Glass style={{ padding: 14 }} accent={color}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Icon name={icon} size={14} color={color} /><span style={micro}>{label}</span>
      </div>
      <strong style={{ fontFamily: SANS, fontSize: 26, lineHeight: 1, color: value ? color : "var(--ink)" }}>{value}</strong>
    </Glass>
  );
}

function Header({ title, icon, count }: { title: string; icon: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
      <Icon name={icon} size={16} color="var(--acc-text)" />
      <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.1)", padding: "2px 7px", borderRadius: 99 }}>{count}</span>
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: 22, textAlign: "center" }}>
      <Icon name={icon} size={22} color="#22c55e" />
      <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>{text}</p>
    </div>
  );
}

const contactBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--fill-3)", border: "1px solid var(--hair-3)", cursor: "pointer", textDecoration: "none" };
const micro: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" };
