// CloseOutModal — closing a ticket requires evidence, not just a status change.
// The checklist verifies the work is actually done & documented before close:
// media on file, the requester was notified, the vendor invoice is settled, and
// the operator confirms the resident says it's resolved.
import { useState } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { Btn, Icon, Modal } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function CloseOutModal({ t, f, onClose }: { t: Ticket; f: TicketFlow; onClose: () => void }) {
  const { ticketMessages, workOrders, setTicketStatus, addTicketNote, notify } = useOrbit();
  const [confirmed, setConfirmed] = useState(false);

  const hasEvidence = f.intake.media.length > 0;
  const notified = (ticketMessages[t.id] || []).some((m) => m.dir === "out") || f.updates.length > 1;
  const wo = workOrders[t.id];
  const invoiceNA = !f.vendor;
  const invoiceSettled = invoiceNA || (!!wo && (wo.invoice?.status === "paid" || wo.stage === "closed"));

  const reqs = [
    { ok: hasEvidence, label: "Evidence on file", detail: hasEvidence ? f.intake.media.length + " photo/doc on the ticket" : "No photos or documents attached" },
    { ok: notified, label: "Requester notified", detail: notified ? "Updates sent to the requester" : "No outbound message has been sent" },
    { ok: invoiceSettled, label: "Vendor invoice settled", detail: invoiceNA ? "No vendor on this ticket — N/A" : invoiceSettled ? "Invoice paid / work order closed" : "Invoice not yet paid (see Vendor & Work Order)" },
  ];
  const reqMet = reqs.every((r) => r.ok) && confirmed;

  const closeOut = () => {
    setTicketStatus(t.id, "Closed");
    addTicketNote(t.id, "Closed — close-out checklist verified (evidence, comms, invoice, resident confirmation)");
    notify(t.id + " closed & verified");
    onClose();
  };

  return (
    <Modal open onClose={onClose} width={560} title="Close out ticket" sub={t.id + " · verify before closing"}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><Btn primary icon="shield-check" disabled={!reqMet} onClick={closeOut}>Verify &amp; close</Btn></>}>
      <p style={{ margin: "0 0 16px", fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>A ticket can't be closed on status alone — confirm the work is done and documented.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {reqs.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 13px", borderRadius: 12, background: r.ok ? "rgba(34,197,94,0.06)" : "var(--fill-1)", border: "1px solid " + (r.ok ? "rgba(34,197,94,0.28)" : "var(--hair-2)") }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: r.ok ? "#22c55e" : "transparent", border: "1.5px solid " + (r.ok ? "#22c55e" : "var(--hair-strong)") }}>{r.ok && <Icon name="check" size={13} color="#0a0a0a" />}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{r.label}</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{r.detail}</div>
            </div>
            {!r.ok && <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.06em" }}>MISSING</span>}
          </div>
        ))}

        {/* manual resident confirmation */}
        <button onClick={() => setConfirmed((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 13px", borderRadius: 12, cursor: "pointer", textAlign: "left", background: confirmed ? "rgba(34,197,94,0.06)" : "var(--fill-1)", border: "1px solid " + (confirmed ? "rgba(34,197,94,0.28)" : "var(--hair-2)") }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: confirmed ? "#22c55e" : "transparent", border: "1.5px solid " + (confirmed ? "#22c55e" : "var(--hair-strong)") }}>{confirmed && <Icon name="check" size={13} color="#0a0a0a" />}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Resident confirmed resolved</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{confirmed ? "Confirmed by operator" : "Tap to confirm the resident says it's fixed"}</div>
          </div>
          {!confirmed && <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.06em" }}>REQUIRED</span>}
        </button>
      </div>
      {!reqMet && <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.04em" }}>RESOLVE THE ITEMS ABOVE TO ENABLE CLOSE.</div>}
    </Modal>
  );
}
