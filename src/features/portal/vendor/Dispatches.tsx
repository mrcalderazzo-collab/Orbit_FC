// Dispatches — the vendor's job board. Shows only work dispatched to this
// vendor (vendorTickets), with the site, the scheduled window, and the field
// actions a vendor needs: confirm the window, mark work complete (hands it back
// to Orbit for verification), and "upload" completion proof / invoice. All
// mutations go through the OrbitProvider seam. The vendor never sees competing
// bids, other vendors' pricing, or internal notes.
import { useMemo } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { ticketFlow } from "@/data/flow";
import { vendorTickets } from "@/data/identity";
import { buildingById } from "@/data/seed";
import { Btn, Glass, Icon, SectionLabel, StatusTag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const AMBER = "#f59e0b";

export function Dispatches() {
  const { currentUser, tickets } = useOrbit();
  const items = useMemo(
    () => (currentUser ? vendorTickets(currentUser, tickets, ticketFlow) : []),
    [currentUser, tickets],
  );
  const active = items.filter((t) => t.status !== "Closed");
  const done = items.filter((t) => t.status === "Closed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Dispatches</h2>
          <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
            {currentUser?.company ?? "Vendor"} · work assigned to you
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <Icon name="hard-hat" size={16} color={AMBER} />
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{active.length}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>active</span>
        </div>
      </div>

      {items.length === 0 && (
        <Glass style={{ padding: 40, textAlign: "center", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>No dispatches assigned to you right now.</Glass>
      )}
      {active.map((t) => <DispatchCard key={t.id} t={t} f={ticketFlow(t)} />)}

      {done.length > 0 && (
        <>
          <SectionLabel style={{ marginTop: 6 }}>Completed</SectionLabel>
          {done.map((t) => <DispatchCard key={t.id} t={t} f={ticketFlow(t)} />)}
        </>
      )}
    </div>
  );
}

function DispatchCard({ t, f }: { t: Ticket; f: TicketFlow }) {
  const { addTicketNote, setTicketStatus, notify } = useOrbit();
  const b = buildingById(t.building);
  const closed = t.status === "Closed";
  const window = f.vendor?.window && f.vendor.window !== "Awaiting confirmation" ? f.vendor.window : null;

  const confirm = () => { addTicketNote(t.id, "Vendor confirmed the scheduled window."); notify("Window confirmed · Orbit notified"); };
  const complete = () => { setTicketStatus(t.id, "Awaiting review"); addTicketNote(t.id, "Vendor marked work complete — ready for Orbit verification."); notify("Marked complete · sent for verification"); };
  const upload = (what: string) => { addTicketNote(t.id, "Vendor uploaded " + what + "."); notify(what + " uploaded"); };

  return (
    <Glass style={{ padding: 0, overflow: "hidden", borderLeft: closed ? "1px solid var(--hair)" : "3px solid " + AMBER }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em" }}>{t.id}</span>
          <StatusTag status={t.status} />
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{t.type}</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{t.title}</div>
        {t.desc && <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>{t.desc}</p>}

        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          <Meta icon="building-2" label="Site" value={b?.name ?? "—"} />
          <Meta icon="map-pin" label="Address" value={b?.address?.split(",")[0] ?? "—"} />
          {window && <Meta icon="calendar-check" label="Window" value={window} accent={AMBER} />}
        </div>

        {!closed && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {window && <Btn small icon="check" onClick={confirm}>Confirm window</Btn>}
            <Btn small ghost icon="camera" onClick={() => upload("completion photos")}>Add photos</Btn>
            <Btn small ghost icon="file-text" onClick={() => upload("the invoice")}>Upload invoice</Btn>
            <Btn small primary icon="flag" onClick={complete} style={{ marginLeft: "auto" }}>Mark complete</Btn>
          </div>
        )}
        {closed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontFamily: MONO, fontSize: 9.5, color: "#22c55e", letterSpacing: "0.05em" }}>
            <Icon name="circle-check-big" size={14} color="#22c55e" />COMPLETED &amp; VERIFIED
          </div>
        )}
      </div>
    </Glass>
  );
}

function Meta({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 13, fontWeight: 600, color: accent || "var(--ink)" }}>
        <Icon name={icon} size={13} color={accent || "var(--ink-4)"} />{value}
      </span>
    </div>
  );
}
