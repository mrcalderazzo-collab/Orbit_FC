// BuildingActions — the operational command cluster that turns a Building from a
// read-only record into a place you can *act*. Every action routes through the
// OrbitProvider seam (createTicket / addCalendarEvent / sendNotice / logEvent),
// so each one lands in the building's activity spine automatically. No new
// backend surface — these are the same actions the future API will implement.
import { useState } from "react";
import type { Building, TicketType, Priority, BuildingSystem } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { Btn, Icon } from "@/components/ui";
import { Modal, Field, TextInput, Select, inputStyle } from "@/components/ui/form";
import { NOTICE_AUDIENCES, NOTICE_CHANNELS } from "@/data/notices";

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
  const { logEvent, notify } = useOrbit();
  const [name, setName] = useState("");
  const [kind, setKind] = useState(FILE_KINDS[0]);
  const [area, setArea] = useState("");
  const reset = () => { setName(""); setKind(FILE_KINDS[0]); setArea(""); };
  const submit = () => {
    if (!name.trim()) { notify("Name the file first", "err"); return; }
    logEvent({ kind: "file.added", entityType: "building", entityId: building.id, summary: `File logged · ${name.trim()} (${kind})${area ? " · " + area : ""}`, building: building.id });
    notify("File logged to building record");
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
