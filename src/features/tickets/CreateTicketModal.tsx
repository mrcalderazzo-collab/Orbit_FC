import { useState } from "react";
import type { Priority, TicketType } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS, PEOPLE, TICKET_PRIOS, TICKET_TYPES } from "@/data/seed";
import { inputStyle, Btn, Field, Modal, Select, TextInput } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const ASSIGNEES = ["luke", "cait", "maura", "gidi"];

export function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const { createTicket } = useOrbit();
  const [f, setF] = useState({
    title: "",
    building: BUILDINGS[0].id,
    type: "Maintenance" as TicketType,
    prio: "Normal" as Priority,
    assignee: "",
    requester: "Field · NYC Ops",
    desc: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const submit = () => {
    if (!f.title.trim()) return;
    createTicket({
      title: f.title,
      building: f.building,
      type: f.type,
      prio: f.prio,
      requester: f.requester,
      desc: f.desc,
      status: f.assignee ? "Assigned" : "Open",
      assignee: f.assignee || null,
    });
    onClose();
  };
  return (
    <Modal open onClose={onClose} width={600} title="New Work Ticket" sub="Dispatch to the field"
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><Btn primary icon="send" onClick={submit} disabled={!f.title.trim()}>Create &amp; Dispatch</Btn></>}>
      <Field label="Title"><TextInput value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. HVAC unit failure — roof, west bank" autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Building"><Select options={BUILDINGS.map((b) => ({ value: b.id, label: b.name }))} value={f.building} onChange={(v) => set("building", v)} /></Field>
        <Field label="Type"><Select options={TICKET_TYPES} value={f.type} onChange={(v) => set("type", v as TicketType)} /></Field>
        <Field label="Priority"><Select options={TICKET_PRIOS} value={f.prio} onChange={(v) => set("prio", v as Priority)} /></Field>
        <Field label="Assign to"><Select options={[{ value: "", label: "Unassigned" }, ...ASSIGNEES.map((p) => ({ value: p, label: PEOPLE[p].name }))]} value={f.assignee} onChange={(v) => set("assignee", v)} /></Field>
      </div>
      <Field label="Description">
        <textarea value={f.desc} onChange={(e) => set("desc", e.target.value)} rows={3} placeholder="What needs to happen…" style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }} />
      </Field>
    </Modal>
  );
}
