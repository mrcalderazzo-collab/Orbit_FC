// Super Work — the on-site work board for one building. Summary cards open into
// the full task detail (read everything, add notes/photos, run close-out). Quick
// "Start" flips a job to In progress; "Log a ticket" creates new work. Scoped by
// the active building; all mutations flow through the OrbitProvider seam.
import { useMemo } from "react";
import type { Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { superTickets } from "@/data/identity";
import { buildingById } from "@/data/seed";
import { Btn, Glass, Icon, PrioDot, StatusTag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const TEAL = "#14b8a6";

export function SuperWork({ buildingId, onCreate, onOpenTask }: { buildingId: string; onCreate: () => void; onOpenTask: (id: string) => void }) {
  const { tickets } = useOrbit();
  const b = buildingById(buildingId);
  const items = useMemo(() => superTickets(buildingId, tickets), [buildingId, tickets]);
  const active = items.filter((t) => t.status !== "Closed");
  const done = items.filter((t) => t.status === "Closed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>On-site work</h2>
          <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
            {active.length} open at {b?.name ?? "your building"}
          </p>
        </div>
        <Btn primary icon="plus" onClick={onCreate}>Log a ticket</Btn>
      </div>

      {active.length === 0 && (
        <Glass style={{ padding: 40, textAlign: "center", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>No open field work right now — nicely done.</Glass>
      )}
      {active.map((t) => <WorkCard key={t.id} t={t} onOpen={() => onOpenTask(t.id)} />)}

      {done.length > 0 && (
        <>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "var(--ink-4)", textTransform: "uppercase", marginTop: 6 }}>Recently closed</div>
          {done.slice(0, 4).map((t) => <WorkCard key={t.id} t={t} onOpen={() => onOpenTask(t.id)} />)}
        </>
      )}
    </div>
  );
}

function WorkCard({ t, onOpen }: { t: Ticket; onOpen: () => void }) {
  const { setTicketStatus, ticketPhotos, notify } = useOrbit();
  const closed = t.status === "Closed";
  const notStarted = t.status === "Open" || t.status === "Assigned";
  const photos = ticketPhotos[t.id]?.length || 0;
  const start = () => { setTicketStatus(t.id, "In progress"); notify("Marked in progress"); };

  return (
    <Glass style={{ padding: 0, overflow: "hidden", borderLeft: closed ? "1px solid var(--hair)" : "3px solid " + (t.prio === "Critical" ? "#ef4444" : TEAL) }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em" }}>{t.id}</span>
          <StatusTag status={t.status} />
          <span style={{ marginLeft: "auto" }}><PrioDot prio={t.prio} /></span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{t.title}</div>
        {t.desc && <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.desc}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
          <Meta icon="tag" value={t.type} />
          {t.vendor && <Meta icon="hard-hat" value={t.vendor} />}
          {photos > 0 && <Meta icon="image" value={photos + " photo" + (photos > 1 ? "s" : "")} />}
        </div>
        {!closed && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {notStarted && <Btn small icon="play" onClick={start}>Start</Btn>}
            <Btn small primary icon="square-arrow-out-up-right" onClick={onOpen} style={{ marginLeft: "auto" }}>Open</Btn>
          </div>
        )}
        {closed && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 9.5, color: "#22c55e", letterSpacing: "0.05em" }}><Icon name="circle-check-big" size={14} color="#22c55e" />COMPLETED &amp; VERIFIED</span>
            <Btn small ghost icon="square-arrow-out-up-right" onClick={onOpen}>Open</Btn>
          </div>
        )}
      </div>
    </Glass>
  );
}

function Meta({ icon, value }: { icon: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 12, color: "var(--ink-3)" }}>
      <Icon name={icon} size={13} color="var(--ink-4)" />{value}
    </span>
  );
}
