// BuildingActions — the operational command cluster that turns a Building from a
// read-only record into a place you can *act*. Every action routes through the
// OrbitProvider seam (createTicket / addCalendarEvent / sendNotice / logEvent),
// so each one lands in the building's activity spine automatically. No new
// backend surface — these are the same actions the future API will implement.
import { useState } from "react";
import type { Building, TicketType, Priority, BuildingSystem } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { Btn, Icon, Tag } from "@/components/ui";
import { Modal, Field, TextInput, Select, inputStyle } from "@/components/ui/form";
import { NOTICE_AUDIENCES, NOTICE_CHANNELS } from "@/data/notices";
import { VENDORS, vendorByName, coiStatus, fmtCoiDate } from "@/data/vendors";
import { lastVendorFromTickets, ticketsForSystem } from "@/lib/systemMatch";
import { genesisLedger, verifyLedger, type LedgerEntry } from "@/lib/ledger";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const TICKET_TYPES: TicketType[] = ["Maintenance", "Facility", "Finance", "Documents", "Board request"];
const PRIOS: Priority[] = ["Low", "Normal", "High", "Critical"];
const VISIT_KINDS = ["Building walkthrough", "Vendor visit", "Inspection", "Move-in", "Move-out", "Maintenance", "Super meeting"];
const FILE_KINDS = ["Floor plan", "Photo set", "Video", "Report", "Manual", "Access", "COI / Insurance", "Contract"];

type ActionKey = "ticket" | "visit" | "notice" | "file";

/** The action bar that sits in the building header. Optionally pre-targets a
 *  building system (used by the "Create ticket" buttons on the Systems tab). */
export function BuildingActionBar({ building, onMessage, compact }: { building: Building; onMessage?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState<ActionKey | null>(null);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Btn small primary icon="plus" onClick={() => setOpen("ticket")}>New ticket</Btn>
        <Btn small icon="calendar-plus" onClick={() => setOpen("visit")}>Schedule</Btn>
        <Btn small icon="megaphone" onClick={() => setOpen("notice")}>Send notice</Btn>
        {!compact && <Btn small icon="file-up" onClick={() => setOpen("file")}>Log file</Btn>}
        {onMessage && <Btn small icon="messages-square" onClick={onMessage}>Message</Btn>}
      </div>
      <BuildingActionModals building={building} open={open} onClose={() => setOpen(null)} />
    </>
  );
}

export function BuildingActionModals({
  building, open, onClose, system,
}: { building: Building; open: ActionKey | null; onClose: () => void; system?: BuildingSystem }) {
  return (
    <>
      <NewTicketModal building={building} open={open === "ticket"} onClose={onClose} system={system} />
      <ScheduleVisitModal building={building} open={open === "visit"} onClose={onClose} />
      <SendNoticeModal building={building} open={open === "notice"} onClose={onClose} />
      <LogFileModal building={building} open={open === "file"} onClose={onClose} />
    </>
  );
}

const labelStyle: React.CSSProperties = { fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-3)" };

// ── System detail — current vendor (editable), ticket-derived service history,
//    a tamper-evident vendor ledger, COI/contract docs, images, create-ticket ──
export function SystemDetailModal({
  building, system, open, onClose, onCreateTicket,
}: { building: Building; system: BuildingSystem | null; open: boolean; onClose: () => void; onCreateTicket: (s: BuildingSystem) => void }) {
  const { buildingDocs, addBuildingDoc, notify, tickets, systemVendors, vendorLedgers, reassignSystemVendor, openCommand, nav } = useOrbit();
  const [docName, setDocName] = useState("");
  const [docKind, setDocKind] = useState("COI / Insurance");
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState("");
  const [reason, setReason] = useState("");
  if (!system) return null;

  const currentVendorName = systemVendors[system.id] ?? system.vendor;
  const vendor = vendorByName(currentVendorName);
  const coi = vendor ? coiStatus(vendor) : null;
  const docs = (buildingDocs[building.id] || []).filter((d) => d.system === system.name || d.vendor === currentVendorName);
  const images = [
    { url: `https://picsum.photos/seed/${building.id}-${system.id}-a/360/240`, cap: "Equipment" },
    { url: `https://picsum.photos/seed/${building.id}-${system.id}-b/360/240`, cap: "Nameplate / serial" },
  ];

  // AI ticket→system match: tickets that concern this system + the last vendor
  // who actually worked one of them.
  const matches = ticketsForSystem(system, tickets).slice(0, 4);
  const lastFromTickets = lastVendorFromTickets(system, tickets);

  // vendor history: stored chain, or a derived genesis so it's never empty.
  const ledger: LedgerEntry[] = vendorLedgers[system.id]?.length
    ? vendorLedgers[system.id]
    : genesisLedger(currentVendorName, new Date(system.lastService + "T09:00:00").toISOString());
  const ledgerOk = verifyLedger(ledger);

  const addDoc = () => {
    if (!docName.trim()) { notify("Name the document", "err"); return; }
    addBuildingDoc(building.id, { name: docName.trim(), kind: docKind, system: system.name, vendor: currentVendorName });
    setDocName("");
  };
  const applyReassign = () => {
    if (!pick) { notify("Pick a vendor first", "err"); return; }
    reassignSystemVendor(system, pick, reason);
    setEditing(false); setPick(""); setReason("");
  };
  const goVendor = () => { if (vendor) { onClose(); nav("vendors", vendor.id); } };

  return (
    <Modal open={open} onClose={onClose} title={system.name} sub={building.name + " · " + system.kind + " · " + system.location} width={680}
      footer={<>
        <Btn small ghost onClick={onClose}>Close</Btn>
        <Btn small primary icon="plus" onClick={() => onCreateTicket(system)}>Create ticket from this system</Btn>
      </>}>
      {/* health + state */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, color: "var(--ink)" }}>{system.health}<span style={{ fontSize: 14, color: "var(--ink-4)" }}>/100</span></span>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, borderRadius: 99, background: "var(--hair-2)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${system.health}%`, background: system.health >= 80 ? "#22c55e" : system.health >= 60 ? "#f59e0b" : "#ef4444" }} /></div>
          <p style={{ margin: "6px 0 0", fontFamily: SANS, fontSize: 12, color: "var(--ink-2)" }}>{system.signal}</p>
        </div>
      </div>

      {/* vendor card */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <span style={labelStyle}>Service vendor of record</span>
        <button onClick={() => setEditing((v) => !v)} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: editing ? "var(--ink-3)" : "var(--acc-text)" }}>
          <Icon name={editing ? "x" : "pencil"} size={12} color={editing ? "var(--ink-3)" : "var(--acc-text)"} />{editing ? "Cancel" : "Reassign"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 13px", marginBottom: editing ? 10 : 16, borderRadius: 12, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
        <span style={{ width: 38, height: 38, borderRadius: 9, display: "grid", placeItems: "center", background: "rgba(var(--acc-rgb),0.1)" }}><Icon name="hard-hat" size={18} color="var(--acc-text)" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontFamily: SANS, fontSize: 14, color: "var(--ink)" }}>{currentVendorName}</strong>
            {coi && <Tag color={coi.color}>{coi.label}{coi.days >= 0 ? ` · ${coi.days}d` : ""}</Tag>}
            {vendor && <Tag>Grade {vendor.grade}</Tag>}
          </div>
          <span style={{ display: "block", marginTop: 3, fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{vendor ? vendor.trades.join(" · ") : "Vendor record not linked"}</span>
        </div>
        {vendor && (
          <div style={{ display: "flex", gap: 7 }}>
            <a href={`tel:${vendor.phone}`} style={contactBtn} title={vendor.phone}><Icon name="phone" size={14} color="var(--ink-2)" /></a>
            <a href={`mailto:${vendor.email}`} style={contactBtn} title={vendor.email}><Icon name="mail" size={14} color="var(--ink-2)" /></a>
            <button onClick={goVendor} style={contactBtn} title="Open vendor record"><Icon name="arrow-up-right" size={14} color="var(--ink-2)" /></button>
          </div>
        )}
      </div>
      {editing && (
        <div style={{ padding: "12px 13px", marginBottom: 16, borderRadius: 12, background: "rgba(var(--acc-rgb),0.05)", border: "1px solid var(--hair-2)" }}>
          <span style={labelStyle}>Assign a new vendor — recorded to the history ledger</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, margin: "9px 0" }}>
            <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
              <option value="">Choose vendor…</option>
              {VENDORS.filter((v) => v.name !== currentVendorName).map((v) => <option key={v.id} value={v.name}>{v.name} · grade {v.grade}</option>)}
            </select>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. contract change)" style={inputStyle} />
          </div>
          <Btn small primary icon="check" onClick={applyReassign}>Confirm reassignment</Btn>
        </div>
      )}

      {/* AI ticket→system match */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Icon name="sparkles" size={13} color="var(--acc-text)" />
        <span style={labelStyle}>Service history from tickets · AI match</span>
      </div>
      <div style={{ padding: "11px 13px", marginBottom: 16, borderRadius: 12, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
        {lastFromTickets ? (
          <p style={{ margin: "0 0 9px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
            Last worked by <strong style={{ color: "var(--ink)" }}>{lastFromTickets.vendor}</strong> on <button onClick={() => { onClose(); openCommand(lastFromTickets.ticket.id); }} style={linkBtn}>{lastFromTickets.ticket.id}</button> — {lastFromTickets.ticket.title}.
          </p>
        ) : (
          <p style={{ margin: "0 0 9px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-4)", lineHeight: 1.5 }}>No tickets matched to this system yet. Matched work will appear here automatically.</p>
        )}
        {matches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {matches.map((m) => (
              <button key={m.ticket.id} onClick={() => { onClose(); openCommand(m.ticket.id); }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: "7px 9px", borderRadius: 9, background: "var(--fill-1)", border: "1px solid var(--hair-2)", cursor: "pointer" }}>
                <Icon name="ticket" size={13} color="var(--acc-text)" />
                <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.ticket.title}{m.ticket.vendor ? <span style={{ color: "var(--ink-4)" }}> · {m.ticket.vendor}</span> : null}</span>
                <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{m.ticket.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* vendor history ledger (hash-chained) */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <Icon name="link" size={13} color="var(--acc-text)" />
        <span style={labelStyle}>Vendor history · verified chain</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: ledgerOk ? "#22c55e" : "#ef4444" }}>
          <Icon name={ledgerOk ? "shield-check" : "shield-x"} size={12} color={ledgerOk ? "#22c55e" : "#ef4444"} />{ledgerOk ? "Intact" : "Tampered"}
        </span>
      </div>
      <div style={{ marginBottom: 16 }}>
        {[...ledger].reverse().map((e, i, arr) => (
          <LedgerBlock key={e.seq} entry={e} current={i === 0} last={i === arr.length - 1} />
        ))}
      </div>

      {/* service dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div><span style={labelStyle}>Last service</span><p style={{ margin: "5px 0 0", fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{fmtDate(system.lastService)}</p></div>
        <div><span style={labelStyle}>Next service</span><p style={{ margin: "5px 0 0", fontFamily: SANS, fontSize: 13, color: system.state === "risk" ? "#ef4444" : "var(--ink)" }}>{fmtDate(system.nextService)}</p></div>
      </div>

      {/* images */}
      <span style={labelStyle}>Photos</span>
      <div style={{ display: "flex", gap: 8, margin: "7px 0 16px" }}>
        {images.map((im) => (
          <div key={im.cap} style={{ flex: 1 }}>
            <div style={{ height: 92, borderRadius: 10, backgroundImage: `url(${im.url})`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--hair-2)" }} />
            <span style={{ display: "block", marginTop: 4, fontFamily: MONO, fontSize: 8, color: "var(--ink-4)", textTransform: "uppercase" }}>{im.cap}</span>
          </div>
        ))}
      </div>

      {/* documents */}
      <span style={labelStyle}>Documents · COI · contracts</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "7px 0 10px" }}>
        {docs.length ? docs.map((d) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 10, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
            <Icon name="file-text" size={15} color="var(--acc-text)" />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{d.name}</span><span style={{ display: "block", fontFamily: MONO, fontSize: 8, color: "var(--ink-4)" }}>{d.kind} · {d.by} · {d.at}</span></span>
          </div>
        )) : <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-4)" }}>No documents filed for this system yet.</p>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={docName} onChange={(e) => setDocName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDoc()} placeholder="e.g. Otis service contract 2026.pdf" style={{ ...inputStyle, flex: 1 }} />
        <select value={docKind} onChange={(e) => setDocKind(e.target.value)} style={{ ...inputStyle, width: 150, appearance: "none", cursor: "pointer" }}>
          {["COI / Insurance", "Contract", "Manual", "Report", "Warranty", "Inspection"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <Btn small icon="file-up" onClick={addDoc}>File</Btn>
      </div>
    </Modal>
  );
}

const contactBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--fill-3)", border: "1px solid var(--hair-3)", cursor: "pointer", textDecoration: "none" };
const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: MONO, fontSize: 11, color: "var(--acc-text)", fontWeight: 700 };
const fmtDate = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
const fmtStamp = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

// One block in the hash-chained vendor history. The mono hash + "prev" pointer
// make the chain legible as a private ledger; the connector line ties blocks.
function LedgerBlock({ entry, current, last }: { entry: LedgerEntry; current: boolean; last: boolean }) {
  const color = entry.action === "assigned" ? "#22c55e" : entry.action === "replaced" ? "#3b82f6" : "#ef4444";
  return (
    <div style={{ display: "flex", gap: 11 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
        <span style={{ width: 11, height: 11, borderRadius: 3, background: color, boxShadow: current ? `0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)` : "none" }} />
        {!last && <span style={{ flex: 1, width: 2, background: "var(--hair-2)", marginTop: 2 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{entry.vendor}</strong>
          <Tag color={color}>{entry.action}</Tag>
          {current && <Tag color="var(--acc-text)">current</Tag>}
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{fmtStamp(entry.at)}</span>
        </div>
        {entry.reason && <p style={{ margin: "4px 0 0", fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.45 }}>{entry.reason} · {entry.by}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, fontFamily: MONO, fontSize: 8, color: "var(--ink-5)" }}>
          <span title="block hash">#{entry.seq} · {entry.hash}</span>
          <span style={{ color: "var(--ink-5)" }}>← prev {entry.prevHash}</span>
        </div>
      </div>
    </div>
  );
}

// VendorPeek — quick-glance vendor card on a building system, without opening the
// full detail modal. Click to expand COI / grade / contact inline; "Open vendor"
// jumps to the full vendor record.
export function VendorPeek({ vendorName, label = "Service vendor" }: { vendorName: string; label?: string }) {
  const { nav } = useOrbit();
  const [open, setOpen] = useState(false);
  const vendor = vendorByName(vendorName);
  const coi = vendor ? coiStatus(vendor) : null;
  return (
    <span style={{ position: "relative", display: "block" }} onClick={(e) => e.stopPropagation()}>
      <span style={{ display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      <button onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, padding: 0, background: "none", border: "none", cursor: "pointer", maxWidth: "100%" }}>
        <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vendorName}</span>
        {coi && <span style={{ width: 7, height: 7, borderRadius: "50%", background: coi.color, flexShrink: 0 }} title={coi.label} />}
        <Icon name={open ? "chevron-up" : "chevron-down"} size={13} color="var(--ink-4)" />
      </button>
      {open && (
        <>
          <span onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 41, width: 250, padding: 13, borderRadius: 12, background: "var(--panel)", border: "1px solid var(--hair-3)", boxShadow: "0 14px 40px rgba(0,0,0,0.3)" }}>
            {vendor ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(var(--acc-rgb),0.1)" }}><Icon name="hard-hat" size={15} color="var(--acc-text)" /></span>
                  <strong style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)" }}>{vendor.name}</strong>
                </div>
                {coi && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", marginBottom: 9, borderRadius: 9, background: `color-mix(in srgb, ${coi.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${coi.color} 28%, transparent)` }}>
                    <Icon name={coi.status === "expired" ? "shield-x" : coi.status === "expiring" ? "shield-alert" : "shield-check"} size={13} color={coi.color} />
                    <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: coi.color }}>{coi.label}</span>
                    <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 8, color: "var(--ink-4)" }}>{coi.status === "expired" ? Math.abs(coi.days) + "d ago" : fmtCoiDate(vendor.coiExpiry)}</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <PeekMeta label="grade" v={String(vendor.grade)} />
                  <PeekMeta label="rating" v={vendor.rating.toFixed(1)} />
                  <PeekMeta label="response" v={"~" + vendor.responseHrs + "h"} />
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <a href={`tel:${vendor.phone}`} style={{ ...peekBtn, textDecoration: "none" }}><Icon name="phone" size={13} color="var(--ink-2)" />Call</a>
                  <a href={`mailto:${vendor.email}`} style={{ ...peekBtn, textDecoration: "none" }}><Icon name="mail" size={13} color="var(--ink-2)" />Email</a>
                  <button onClick={() => { setOpen(false); nav("vendors", vendor.id); }} style={{ ...peekBtn, background: "rgba(var(--acc-rgb),0.12)", color: "var(--acc-text)" }}><Icon name="arrow-up-right" size={13} color="var(--acc-text)" />Open</button>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-3)" }}>No linked vendor record for "{vendorName}".</p>
            )}
          </div>
        </>
      )}
    </span>
  );
}

function PeekMeta({ label, v }: { label: string; v: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>{v}</span>
      <span style={{ fontFamily: MONO, fontSize: 7.5, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

const peekBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flex: 1, padding: "7px 0", borderRadius: 8, background: "var(--fill-2)", border: "1px solid var(--hair-3)", fontFamily: "Outfit, sans-serif", fontSize: 11, color: "var(--ink-2)", cursor: "pointer" };

function ChipRow({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)} style={{
            fontFamily: SANS, fontSize: 12, padding: "6px 11px", borderRadius: 99, cursor: "pointer",
            border: "1px solid " + (on ? "var(--acc)" : "var(--hair-strong)"),
            background: on ? "rgba(var(--acc-rgb),0.12)" : "var(--fill-2)",
            color: on ? "var(--acc-text)" : "var(--ink-2)", fontWeight: on ? 600 : 400,
          }}>{opt}</button>
        );
      })}
    </div>
  );
}

// ── New ticket ────────────────────────────────────────────────────────────
function NewTicketModal({ building, open, onClose, system }: { building: Building; open: boolean; onClose: () => void; system?: BuildingSystem }) {
  const { createTicket, openCommand, notify } = useOrbit();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("Maintenance");
  const [prio, setPrio] = useState<Priority>("Normal");
  const [desc, setDesc] = useState("");

  // when a system is the source, pre-fill so the operator just confirms
  const seededTitle = system ? `${system.name} — ${system.signal}` : title;
  const submit = (alsoOpen: boolean) => {
    const finalTitle = (title || seededTitle).trim();
    if (!finalTitle) { notify("Add a title first", "err"); return; }
    const id = createTicket({
      title: finalTitle,
      building: building.id,
      type: system ? "Facility" : type,
      prio,
      requester: "Building · " + building.name,
      desc: desc || (system ? `Raised from the ${system.name} system (${system.kind}, ${system.location}). Current signal: ${system.signal}` : ""),
      category: system ? system.kind : undefined,
    });
    onClose(); reset();
    if (alsoOpen) openCommand(id);
  };
  const reset = () => { setTitle(""); setType("Maintenance"); setPrio("Normal"); setDesc(""); };

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="New ticket" sub={building.name + " · " + building.code}
      footer={<>
        <Btn small ghost onClick={() => { onClose(); reset(); }}>Cancel</Btn>
        <Btn small onClick={() => submit(false)}>Create</Btn>
        <Btn small primary icon="arrow-up-right" onClick={() => submit(true)}>Create & open</Btn>
      </>}>
      {system && (
        <div style={{ display: "flex", gap: 9, alignItems: "center", padding: "10px 12px", marginBottom: 16, borderRadius: 12, background: "rgba(var(--acc-rgb),0.06)", border: "1px solid var(--hair-2)" }}>
          <Icon name="activity" size={15} color="var(--acc-text)" />
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>Raising from <strong style={{ color: "var(--ink)" }}>{system.name}</strong> — the system and its signal are attached.</span>
        </div>
      )}
      <Field label="What needs doing">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={system ? seededTitle : "e.g. Boiler losing pressure overnight"} autoFocus />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {!system && <Field label="Type"><Select options={TICKET_TYPES} value={type} onChange={(v) => setType(v as TicketType)} /></Field>}
        <Field label="Priority"><Select options={PRIOS} value={prio} onChange={(v) => setPrio(v as Priority)} /></Field>
      </div>
      <Field label="Detail" hint="Routes automatically via Front Desk rules. Urgent work goes straight to the central Facilities desk.">
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Context, access, what's been tried…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </Field>
    </Modal>
  );
}

// ── Schedule visit / calendar event ─────────────────────────────────────────
function ScheduleVisitModal({ building, open, onClose }: { building: Building; open: boolean; onClose: () => void }) {
  const { addCalendarEvent, notify } = useOrbit();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState(VISIT_KINDS[0]);
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");
  const reset = () => { setTitle(""); setKind(VISIT_KINDS[0]); setAt(""); setNote(""); };
  const submit = () => {
    if (!title.trim()) { notify("Add a title first", "err"); return; }
    if (!at) { notify("Pick a date & time", "err"); return; }
    addCalendarEvent({ buildingId: building.id, title: title.trim(), kind, at, note: note || undefined, source: "office" });
    onClose(); reset();
  };
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Schedule a visit" sub={building.name}
      footer={<>
        <Btn small ghost onClick={() => { onClose(); reset(); }}>Cancel</Btn>
        <Btn small primary icon="calendar-plus" onClick={submit}>Add to calendar</Btn>
      </>}>
      <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Roof walkthrough with Apex" autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Kind"><Select options={VISIT_KINDS} value={kind} onChange={setKind} /></Field>
        <Field label="When"><input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} style={inputStyle} /></Field>
      </div>
      <Field label="Note" hint="Visible on the building calendar and the super's schedule.">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Access path, escort, elevator reservation…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </Field>
    </Modal>
  );
}

// ── Send notice ─────────────────────────────────────────────────────────────
function SendNoticeModal({ building, open, onClose }: { building: Building; open: boolean; onClose: () => void }) {
  const { sendNotice, notify } = useOrbit();
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState(NOTICE_AUDIENCES[0]);
  const [channels, setChannels] = useState<string[]>(["Email", "Push"]);
  const [urgent, setUrgent] = useState(false);
  const [body, setBody] = useState("");
  const reset = () => { setTitle(""); setAudience(NOTICE_AUDIENCES[0]); setChannels(["Email", "Push"]); setUrgent(false); setBody(""); };
  const toggle = (c: string) => setChannels((cs) => cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]);
  const reach = audience.includes("Board") && !audience.includes("units") ? 9 : audience.includes("Owners") ? Math.round(building.units * 0.6) : building.units;
  const submit = (status: "Sent" | "Draft") => {
    if (!title.trim()) { notify("Add a title first", "err"); return; }
    if (status === "Sent" && !channels.length) { notify("Pick at least one channel", "err"); return; }
    sendNotice({ title: title.trim(), body, building: building.id, audience, channels, status, urgent, reach });
    onClose(); reset();
  };
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Send a building notice" sub={building.name}
      footer={<>
        <Btn small ghost onClick={() => { onClose(); reset(); }}>Cancel</Btn>
        <Btn small onClick={() => submit("Draft")}>Save draft</Btn>
        <Btn small primary icon="send" onClick={() => submit("Sent")}>Send · {reach}</Btn>
      </>}>
      <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cold water shutdown — Tue 8–11AM" autoFocus /></Field>
      <Field label="Audience"><Select options={NOTICE_AUDIENCES} value={audience} onChange={setAudience} /></Field>
      <Field label="Channels"><ChipRow options={NOTICE_CHANNELS} selected={channels} onToggle={toggle} /></Field>
      <Field label="Body">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What residents need to know…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#ef4444" }} />
        <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-2)" }}>Mark urgent</span>
        <span style={{ ...labelStyle, marginLeft: "auto" }}>Reaches ~{reach} recipients</span>
      </label>
    </Modal>
  );
}

// ── Log file (records to the activity spine; real storage arrives with the backend) ──
function LogFileModal({ building, open, onClose }: { building: Building; open: boolean; onClose: () => void }) {
  const { addBuildingDoc, notify } = useOrbit();
  const [name, setName] = useState("");
  const [kind, setKind] = useState(FILE_KINDS[0]);
  const [area, setArea] = useState("");
  const reset = () => { setName(""); setKind(FILE_KINDS[0]); setArea(""); };
  const submit = () => {
    if (!name.trim()) { notify("Name the file first", "err"); return; }
    addBuildingDoc(building.id, { name: name.trim(), kind, system: area || undefined });
    onClose(); reset();
  };
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Log a file" sub={building.name} width={460}
      footer={<>
        <Btn small ghost onClick={() => { onClose(); reset(); }}>Cancel</Btn>
        <Btn small primary icon="file-up" onClick={submit}>Log to record</Btn>
      </>}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 12px", marginBottom: 16, borderRadius: 12, background: "var(--fill-2)", border: "1px dashed var(--hair-strong)" }}>
        <Icon name="info" size={15} color="var(--ink-4)" />
        <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>Records the document to the building's activity spine. Binary upload & versioning arrive with the storage backend.</span>
      </div>
      <Field label="File name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Roof COI 2026.pdf" autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Kind"><Select options={FILE_KINDS} value={kind} onChange={setKind} /></Field>
        <Field label="Area / system"><TextInput value={area} onChange={(e) => setArea(e.target.value)} placeholder="Roof, Boiler…" /></Field>
      </div>
    </Modal>
  );
}
