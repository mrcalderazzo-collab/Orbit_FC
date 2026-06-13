// Vendor & Schedule tab — awarded vendor, access/availability confirmations,
// locked visit window, reminders. Mirrors TicketFlowTabs2.jsx FlowVendor.
import { useState } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { moneyFull } from "@/lib/format";
import { coiStatus, fmtCoiDate, vendorByName } from "@/data/vendors";
import { channelsForTicket } from "@/data/comms";
import { Btn, Glass, Icon, KV, SectionLabel } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function VendorSchedule({ t, f }: { t: Ticket; f: TicketFlow }) {
  const { notify, addTicketNote, sendChat } = useOrbit();
  const v = f.vendor;
  const [resOk, setResOk] = useState(v?.residentOk ?? false);
  const [venOk, setVenOk] = useState(v?.vendorOk ?? false);
  const [dispatched, setDispatched] = useState(false);
  const vendorRec = vendorByName(v?.name);
  const coi = vendorRec ? coiStatus(vendorRec) : null;

  const dispatch = () => {
    if (!v) return;
    if (coi?.status === "expired") { notify("Blocked · " + v.name + " COI expired", "err"); return; }
    const vc = channelsForTicket(t, f).find((c) => c.kind === "vendor");
    if (vc) sendChat(vc, { via: "SMS", text: `Work order ${t.id} — ${t.title}. Window: ${v.window}. Access: ${f.intake.access}. Scope: ${f.awarded?.scope || "per ticket"}. Please confirm ETA.` });
    addTicketNote(t.id, `Work order dispatched to ${v.name} · PO issued${coi ? " · COI " + coi.status : ""}`);
    setDispatched(true);
    notify("Work order dispatched to " + v.name);
  };

  if (!v) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "60px 0" }}>
        <Icon name="search-check" size={34} color="var(--ink-5)" />
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)" }}>No vendor awarded yet</span>
        <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>Award a bid in <b style={{ color: "var(--ink-2)" }}>Bids &amp; Vote</b> to unlock scheduling.</span>
      </div>
    );
  }
  const both = resOk && venOk;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Awarded vendor</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="hard-hat" size={22} color="#3b82f6" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{v.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{f.awarded ? moneyFull(f.awarded.amount) + " · " + f.awarded.warrantyMo + "mo warranty" : ""} · COI on file</div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#22c55e" }}><Icon name="star" size={11} color="#22c55e" />{f.awarded ? f.awarded.grade : "—"}</span>
          </div>
        </Glass>

        <Glass style={{ padding: 18, borderLeft: coi?.status === "expired" ? "2px solid #ef4444" : "1px solid var(--hair)" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <SectionLabel>Dispatch work order</SectionLabel>
            {coi && (
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: coi.color }}>
                <Icon name={coi.status === "expired" ? "shield-x" : coi.status === "expiring" ? "shield-alert" : "shield-check"} size={12} color={coi.color} />
                {coi.label.toUpperCase()}{coi.status !== "expired" ? " · " + fmtCoiDate(vendorRec!.coiExpiry) : ""}
              </span>
            )}
          </div>
          {coi?.status === "expired" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 12, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.3)", marginBottom: 12 }}>
              <Icon name="shield-x" size={17} color="#ef4444" />
              <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}><b style={{ color: "#ef4444" }}>{v.name}'s COI expired {Math.abs(coi.days)}d ago.</b> Request an updated certificate before dispatching.</span>
            </div>
          ) : (
            <p style={{ margin: "0 0 12px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>Send the job to {v.name} with scope, access notes and the visit window. Logged to the ticket; vendor confirms ETA.</p>
          )}
          {dispatched ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 10, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontFamily: MONO, fontSize: 10, fontWeight: 700 }}>
              <Icon name="circle-check-big" size={14} color="#22c55e" />WORK ORDER DISPATCHED · PO ISSUED
            </div>
          ) : coi?.status === "expired" ? (
            <Btn small icon="mail" onClick={() => { addTicketNote(t.id, "Requested updated COI from " + v.name); notify("COI request sent to " + v.name); }} style={{ width: "100%", justifyContent: "center" }}>Request updated COI</Btn>
          ) : (
            <Btn small primary icon="send" onClick={dispatch} style={{ width: "100%", justifyContent: "center" }}>Dispatch work order</Btn>
          )}
        </Glass>

        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 14 }}>Confirm access & availability</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ConfirmRow on={resOk} onClick={() => { setResOk(true); notify("Resident access confirmed"); }} icon="home" title="Resident access" sub={f.intake.access} party="Resident" />
            <ConfirmRow on={venOk} onClick={() => { setVenOk(true); notify(v.name + " availability confirmed"); }} icon="hard-hat" title="Vendor availability" sub="Crew assigned · awaiting confirmation" party="Vendor" />
          </div>
        </Glass>
      </div>

      <Glass style={{ padding: 18 }}>
        <SectionLabel style={{ marginBottom: 14 }}>Scheduled window</SectionLabel>
        <div style={{ borderRadius: 14, padding: 16, background: both ? "rgba(34,197,94,0.06)" : "var(--fill-2)", border: "1px solid " + (both ? "rgba(34,197,94,0.25)" : "var(--hair-2)"), textAlign: "center" }}>
          <Icon name="calendar-check" size={26} color={both ? "#22c55e" : "var(--ink-4)"} />
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 17, color: "var(--ink)", marginTop: 10 }}>{both ? v.window : "Pending confirmations"}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: both ? "#22c55e" : "var(--ink-4)", marginTop: 6, letterSpacing: "0.06em" }}>{both ? "BOTH PARTIES CONFIRMED" : (resOk ? "" : "RESIDENT ") + (!resOk && !venOk ? "+ " : "") + (venOk ? "" : "VENDOR ") + "PENDING"}</div>
        </div>
        <Btn small primary icon="bell" disabled={!both} onClick={() => notify("Visit reminders sent to resident + vendor")} style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>Send reminders</Btn>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
          <KV k="Follow-up" v="Day-of, 1h before" />
          <KV k="Re-entry" v={f.intake.keyOnFile ? "Key on file" : "Resident present"} />
        </div>
      </Glass>
    </div>
  );
}

function ConfirmRow({ on, onClick, icon, title, sub, party }: { on: boolean; onClick: () => void; icon: string; title: string; sub: string; party: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 13px", borderRadius: 12, background: on ? "rgba(34,197,94,0.06)" : "var(--fill-1)", border: "1px solid " + (on ? "rgba(34,197,94,0.25)" : "var(--hair-2)") }}>
      <Icon name={icon} size={17} color={on ? "#22c55e" : "var(--ink-3)"} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{title}</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
      </div>
      {on ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "#22c55e" }}><Icon name="circle-check-big" size={13} color="#22c55e" />CONFIRMED</span>
      ) : (
        <button onClick={onClick} style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink)", padding: "6px 12px", borderRadius: 8, cursor: "pointer", background: "var(--fill-3)", border: "1px solid var(--hair-3)" }}>Confirm {party}</button>
      )}
    </div>
  );
}
