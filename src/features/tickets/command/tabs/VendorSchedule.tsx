// Vendor & Work Order — the operational heart of vendor coordination. A work
// order ties the ticket to a vendor (by ID), a building (numbered <base>-<seq>),
// and the money (PO → invoice → payment). The stage tracker + handoff log mean
// anyone who logs in sees exactly where it stands and can pick it up; the vendor
// conversation lives right alongside.
import { useEffect, useState } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { moneyFull } from "@/lib/format";
import { addDaysISO } from "@/lib/focus";
import { coiStatus, vendorByName } from "@/data/vendors";
import { channelsForTicket } from "@/data/comms";
import { PEOPLE } from "@/data/seed";
import { WO_STAGES, WO_STAGE_INDEX } from "@/data/workorders";
import { Btn, Glass, Icon, KV, SectionLabel } from "@/components/ui";
import { ChatThread } from "@/features/comms/ChatThread";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function VendorSchedule({ t, f }: { t: Ticket; f: TicketFlow }) {
  const { workOrders, ensureWorkOrder, setWoStage, recordInvoice, setInvoiceStatus, notify, sendChat } = useOrbit();
  useEffect(() => { ensureWorkOrder(t); }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const wo = workOrders[t.id];

  if (!f.vendor || !wo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "60px 0" }}>
        <Icon name="clipboard-list" size={34} color="var(--ink-5)" />
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)" }}>No work order yet</span>
        <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)" }}>Award a bid in <b style={{ color: "var(--ink-2)" }}>Bids &amp; Vote</b> to open a work order.</span>
      </div>
    );
  }

  const vendorRec = vendorByName(wo.vendorName);
  const coi = vendorRec ? coiStatus(vendorRec) : null;
  const si = WO_STAGE_INDEX[wo.stage];
  const vendorChannel = channelsForTicket(t, f).find((c) => c.kind === "vendor");

  const dispatch = () => {
    if (coi?.status === "expired") { notify("Blocked · " + wo.vendorName + " COI expired", "err"); return; }
    if (vendorChannel) sendChat(vendorChannel, { via: "SMS", text: `Work order ${wo.id} — ${t.title}. Window: ${wo.window || "TBD"}. Access: ${f.intake.access}. Scope: ${wo.scope}. Please confirm ETA.` });
    setWoStage(t.id, "dispatched", "Dispatched to " + wo.vendorName + " — order sent with scope, access & window");
    notify("Work order " + wo.id + " dispatched");
  };
  const advance = () => {
    const next = WO_STAGES[Math.min(WO_STAGES.length - 1, si + 1)];
    if (next.key === wo.stage) return;
    setWoStage(t.id, next.key);
  };
  const nextLabel = si < WO_STAGES.length - 1 ? WO_STAGES[si + 1].label : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* work order header */}
      <Glass style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="hard-hat" size={22} color="#3b82f6" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "var(--acc-text)", letterSpacing: "0.04em" }}>WO {wo.id}</span>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{wo.vendorName}</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "var(--ink-3)", background: "var(--fill-3)", border: "1px solid var(--hair-3)", padding: "2px 7px", borderRadius: 6 }}>{wo.vendorCode}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: wo.vendorGrade >= 90 ? "#22c55e" : "#f59e0b" }}><Icon name="star" size={11} color={wo.vendorGrade >= 90 ? "#22c55e" : "#f59e0b"} />{wo.vendorGrade}</span>
              {coi && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: coi.color }}><Icon name={coi.status === "expired" ? "shield-x" : coi.status === "expiring" ? "shield-alert" : "shield-check"} size={11} color={coi.color} />{coi.label.toUpperCase()}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 7, flexWrap: "wrap", fontFamily: MONO, fontSize: 10, color: "var(--ink-4)" }}>
              <span>{wo.po}</span>
              <span style={{ color: "var(--ink-2)", fontWeight: 700 }}>{moneyFull(wo.amount)}</span>
              {wo.invoice && <span>{wo.invoice.number}</span>}
            </div>
          </div>
          {wo.stage === "awarded" ? (
            coi?.status === "expired"
              ? <Btn small danger icon="shield-x" onClick={() => notify("COI expired — request updated certificate")}>COI expired</Btn>
              : <Btn small primary icon="send" onClick={dispatch}>Dispatch work order</Btn>
          ) : nextLabel ? (
            <Btn small icon="arrow-right" onClick={advance}>Mark {nextLabel}</Btn>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#22c55e" }}><Icon name="circle-check-big" size={14} color="#22c55e" />CLOSED</span>
          )}
        </div>
      </Glass>

      {/* stage tracker */}
      <Glass style={{ padding: "16px 18px" }}>
        <SectionLabel style={{ marginBottom: 14 }}>Vendor coordination · where this stands</SectionLabel>
        <WoStageTracker stage={wo.stage} />
      </Glass>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 16, alignItems: "start" }}>
        {/* left: invoice/payment + schedule + handoff log */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <InvoicePanel t={t} wo={wo} onRecord={recordInvoice} onStatus={setInvoiceStatus} onClose={() => setWoStage(t.id, "closed", "Work order closed out & verified")} />
          <Glass style={{ padding: 16 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Schedule & access</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <KV k="Window" v={wo.window || "Awaiting confirmation"} />
              <KV k="Access" v={f.intake.keyOnFile ? "Key on file" : "Resident present"} />
              <KV k="Scope" v={wo.scope} />
            </div>
          </Glass>
          <HandoffLog log={wo.log} />
        </div>

        {/* right: vendor communication */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <SectionLabel>Vendor communication</SectionLabel>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>· logged to the work order</span>
          </div>
          <div style={{ height: 460, borderRadius: 18, overflow: "hidden", border: "1px solid var(--hair-3)", background: "var(--fill-1)" }}>
            {vendorChannel ? <ChatThread key={vendorChannel.id} channel={vendorChannel} /> : <div style={{ padding: 24, fontFamily: MONO, fontSize: 10, color: "var(--ink-5)" }}>No vendor channel</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function WoStageTracker({ stage }: { stage: string }) {
  const cur = WO_STAGE_INDEX[stage as keyof typeof WO_STAGE_INDEX];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto" }} className="no-scrollbar">
      {WO_STAGES.map((s, i) => {
        const done = i < cur;
        const on = i === cur;
        const c = on ? "var(--acc)" : done ? "#22c55e" : "var(--ink-5)";
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "flex-start", flex: i < WO_STAGES.length - 1 ? 1 : "0 0 auto", minWidth: 76 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0, width: 76 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: on ? "rgba(var(--acc-rgb),0.14)" : done ? "rgba(34,197,94,0.12)" : "var(--fill-2)", border: "1.5px solid " + (on ? "var(--acc)" : done ? "#22c55e" : "var(--hair-3)"), boxShadow: on ? "0 0 14px rgba(var(--acc-rgb),0.3)" : "none" }}>
                <Icon name={done ? "check" : s.icon} size={14} color={c} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.04em", color: on ? "var(--ink)" : done ? "var(--ink-2)" : "var(--ink-4)", textTransform: "uppercase", textAlign: "center" }}>{s.label}</div>
            </div>
            {i < WO_STAGES.length - 1 && <div style={{ flex: 1, height: 2, marginTop: 15, minWidth: 10, borderRadius: 2, background: done ? "#22c55e" : "var(--hair-3)" }} />}
          </div>
        );
      })}
    </div>
  );
}

function InvoicePanel({ t, wo, onRecord, onStatus, onClose }: {
  t: Ticket; wo: { stage: string; amount: number; invoice?: { number: string; amount: number; receivedAt: string; dueDate: string; status: string } };
  onRecord: (ticketId: string, inv: { number: string; amount: number; dueDate: string }) => void;
  onStatus: (ticketId: string, status: "received" | "approved" | "paid") => void;
  onClose: () => void;
}) {
  const inv = wo.invoice;
  const [adding, setAdding] = useState(false);
  const [num, setNum] = useState("INV-" + wo.amount);
  const [amt, setAmt] = useState(String(wo.amount));
  const [due, setDue] = useState(addDaysISO(28));

  const statusColor = inv?.status === "paid" ? "#22c55e" : inv?.status === "approved" ? "var(--acc-text)" : "#f59e0b";

  return (
    <Glass style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <SectionLabel>Invoice &amp; payment</SectionLabel>
        {inv && <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>{inv.status}</span>}
      </div>

      {!inv ? (
        adding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <Row label="Invoice #"><input value={num} onChange={(e) => setNum(e.target.value)} style={inp} /></Row>
            <Row label="Amount $"><input value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} style={inp} /></Row>
            <Row label="Due"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inp} /></Row>
            <Btn small primary icon="receipt" onClick={() => { onRecord(t.id, { number: num, amount: Number(amt) || wo.amount, dueDate: due }); setAdding(false); }} style={{ marginTop: 4 }}>Log invoice</Btn>
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 12px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>When the vendor's invoice arrives, log it here — it links to this work order &amp; ticket for payment.</p>
            <Btn small icon="plus" onClick={() => setAdding(true)}>Record invoice</Btn>
          </div>
        )
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: "var(--ink)" }}>{moneyFull(inv.amount)}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-4)" }}>{inv.number}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 13 }}>
            <KV k="Received" v={inv.receivedAt} />
            <KV k="Due" v={inv.dueDate} />
            <KV k="Payment ref" v={inv.number} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {inv.status === "received" && <Btn small icon="check" onClick={() => onStatus(t.id, "approved")}>Approve</Btn>}
            {inv.status !== "paid" && <Btn small primary icon="badge-dollar-sign" onClick={() => onStatus(t.id, "paid")}>Mark paid</Btn>}
            {inv.status === "paid" && wo.stage !== "closed" && <Btn small icon="circle-check-big" onClick={onClose}>Close work order</Btn>}
            {wo.stage === "closed" && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "#22c55e" }}><Icon name="circle-check-big" size={13} color="#22c55e" />PAID &amp; CLOSED</span>}
          </div>
        </div>
      )}
    </Glass>
  );
}

function HandoffLog({ log }: { log: [string, string, string][] }) {
  return (
    <Glass style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <SectionLabel>Handoff log</SectionLabel>
        <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>· anyone can pick this up</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {log.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 11, paddingBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: i === log.length - 1 ? "var(--acc)" : "#22c55e", flexShrink: 0, marginTop: 4 }} />
              {i < log.length - 1 && <span style={{ width: 1, flex: 1, background: "var(--hair-3)" }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.45 }}>{l[2]}</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginTop: 2 }}>{PEOPLE[l[1]]?.name || l[1]} · {l[0]}</div>
            </div>
          </div>
        ))}
      </div>
    </Glass>
  );
}

const inp: React.CSSProperties = { fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", background: "var(--fill-2)", border: "1px solid var(--hair-strong)", borderRadius: 8, padding: "7px 10px", outline: "none", width: 150 };
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </div>
  );
}
