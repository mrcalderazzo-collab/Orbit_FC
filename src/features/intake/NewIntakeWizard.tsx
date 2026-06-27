// NewIntakeWizard — a descriptive, multi-step intake capture for the ops desk.
// Captures WHAT (category → subcategory, title, description, severity), WHERE
// (building → unit / common area / system / exterior), WHO (submitter role,
// contact, channel, on-behalf-of), and the DETAILS (access & entry, photos /
// video / documents, operational tags, billing routing). Everything flows into
// the ticket's structured `intake` and surfaces in the Intake tab.
import { useMemo, useState, type ReactNode } from "react";
import type { Priority, Ticket, TicketAttachment, TicketIntakeDetail } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { tint } from "@/lib/format";
import { autoRoute, teamByKey } from "@/data/routing";
import { BUILDINGS, PEOPLE, TICKET_PRIOS } from "@/data/seed";
import {
  ATTACH_KINDS, CATEGORIES, COMMON_AREAS, CONTACT_PREFS, INTAKE_CHANNELS,
  LOCATION_KINDS, SUBMITTER_ROLES, SUGGESTED_TAGS, SYSTEM_OPTIONS, UNIT_LINES, categoryByKey,
} from "@/data/taxonomy";
import { aiClassifyIntake } from "@/services/ai";
import { AISourceBadge } from "@/features/ai/TicketTriagePanel";
import { Avatar, Btn, Field, Icon, Modal, Select, TextInput, inputStyle } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const OWNERS = ["luke", "cait", "maura", "gidi"];
const STEPS = [
  { key: "what", label: "What & where", icon: "clipboard-list", hint: "Classify the issue" },
  { key: "who", label: "Submitter", icon: "user", hint: "Who's reporting it" },
  { key: "details", label: "Access & media", icon: "paperclip", hint: "Entry, files, tags" },
  { key: "review", label: "Review", icon: "check-check", hint: "Confirm & create" },
];

interface Form {
  category: string; subcategory: string; title: string; desc: string; prio: Priority; emergency: boolean;
  building: string; locKind: string; unit: string; floor: string; line: string; area: string; systemKey: string; locDetail: string;
  role: string; name: string; phone: string; email: string; channel: string; preferredContact: string; onBehalfOf: string;
  keyOnFile: boolean; permissionToEnter: boolean; petOnSite: boolean; occupantPresent: boolean; window: string;
  attachments: TicketAttachment[]; tags: string[]; billableTo: string; estimate: string; warranty: boolean; assignee: string;
}

const initial: Form = {
  category: "", subcategory: "", title: "", desc: "", prio: "Normal", emergency: false,
  building: BUILDINGS[0].id, locKind: "unit", unit: "", floor: "", line: "", area: COMMON_AREAS[0], systemKey: SYSTEM_OPTIONS[0], locDetail: "",
  role: "Resident", name: "", phone: "", email: "", channel: "Resident portal", preferredContact: "SMS", onBehalfOf: "",
  keyOnFile: false, permissionToEnter: true, petOnSite: false, occupantPresent: false, window: "",
  attachments: [], tags: [], billableTo: "Building — operating", estimate: "", warranty: false, assignee: "",
};

// SLA budget by priority (hours) — mirrors the real clock in data/flow.ts
const SLA_HRS: Record<Priority, number> = { Critical: 4, High: 24, Normal: 72, Low: 120 };
const slaLabel = (p: Priority) => { const h = SLA_HRS[p]; return h >= 24 ? `${h / 24}d` : `${h}h`; };

// default owner key by category type — same rule create() uses, so the preview
// matches what actually happens
const defaultOwnerKey = (type?: string) =>
  type === "Finance" || type === "Documents" ? "cait" : type === "Board request" ? "maura" : "luke";

// derive a usable title from the free-text description when none was typed
const deriveTitle = (s: string): string => {
  const clean = s.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const firstSentence = clean.split(/[.!?\n]/)[0];
  const words = firstSentence.split(" ").slice(0, 8).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export function NewIntakeWizard({ onClose }: { onClose: () => void }) {
  const { createTicket, openCommand, notify } = useOrbit();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(initial);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const cat = categoryByKey(f.category);
  // a category plus *something* to title it from (typed title or description)
  const canCreate = !!f.category && (!!f.title.trim() || !!f.desc.trim());

  const locationLabel = useMemo(() => {
    if (f.locKind === "unit") return "Unit " + (f.unit || "—") + (f.line ? f.line : "") + (f.floor ? " · Fl " + f.floor : "");
    if (f.locKind === "common") return f.area;
    if (f.locKind === "system") return f.systemKey;
    if (f.locKind === "exterior") return "Exterior / grounds";
    return "Building-wide";
  }, [f.locKind, f.unit, f.line, f.floor, f.area, f.systemKey]);

  const create = () => {
    // never fail silently — point the user at what's missing
    if (!f.category || !cat) { setStep(0); notify("Pick a category to create the intake", "err"); return; }
    const title = f.title.trim() || deriveTitle(f.desc) || cat.label;
    if (!title) { setStep(0); notify("Add a title or a short description", "err"); return; }
    const owner = f.assignee || defaultOwnerKey(cat.type);
    const submitterName = f.name.trim() || (f.role === "Anonymous" ? "Anonymous" : f.role);
    const requester = `${f.role}${f.unit ? " · Unit " + f.unit : ""}`;
    const intake: TicketIntakeDetail = {
      category: f.category, subcategory: f.subcategory || undefined,
      location: {
        kind: f.locKind as "unit" | "common" | "system" | "exterior" | "building",
        label: locationLabel,
        unit: f.locKind === "unit" ? f.unit || undefined : undefined,
        floor: f.floor || undefined, line: f.line || undefined,
        area: f.locKind === "common" ? f.area : undefined,
        systemKey: f.locKind === "system" ? f.systemKey : undefined,
        detail: f.locDetail || undefined,
      },
      submitter: { role: f.role, name: submitterName, unit: f.unit || undefined, phone: f.phone || undefined, email: f.email || undefined, channel: f.channel, preferredContact: f.preferredContact, onBehalfOf: f.onBehalfOf || undefined },
      access: { keyOnFile: f.keyOnFile, permissionToEnter: f.permissionToEnter, petOnSite: f.petOnSite, occupantPresent: f.occupantPresent, window: f.window || undefined },
      attachments: f.attachments,
      tags: f.tags,
      // billing is NOT a requester decision — left unset here and set later by
      // whoever works the ticket (Ticket Command → Intake → Billing & cost).
      billing: { warranty: false },
      reportedAt: new Date().toISOString(),
    };
    const id = createTicket({
      title, building: f.building, type: cat.type, prio: f.prio, requester,
      desc: f.desc.trim(), status: f.assignee ? "Assigned" : "Open", assignee: f.assignee || owner,
      category: f.category, tags: f.tags, intake,
    });
    onClose();
    openCommand(id);
  };

  return (
    <Modal open onClose={onClose} width={940} title="New Intake" sub="Capture the request in full"
      footer={
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.06em" }}>STEP {step + 1} / {STEPS.length}</span>
          <div style={{ flex: 1 }} />
          {step > 0 && <Btn ghost icon="arrow-left" onClick={() => setStep((s) => s - 1)}>Back</Btn>}
          {step < STEPS.length - 1
            ? <Btn primary icon="arrow-right" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !canCreate}>Continue</Btn>
            : <Btn primary icon="send" onClick={create}>Create intake</Btn>}
        </div>
      }>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 22, minHeight: 420 }}>
        {/* step rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {STEPS.map((s, i) => {
            const on = i === step; const done = i < step;
            return (
              <button key={s.key} onClick={() => setStep(i)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", background: on ? "rgba(var(--acc-rgb),0.1)" : "transparent" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: on ? "var(--acc)" : done ? "rgba(34,197,94,0.14)" : "var(--fill-3)", border: "1px solid " + (on ? "var(--acc)" : done ? "#22c55e" : "var(--hair-3)") }}>
                  <Icon name={done ? "check" : s.icon} size={14} color={on ? "var(--on-accent)" : done ? "#22c55e" : "var(--ink-3)"} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: on ? 600 : 500, color: on ? "var(--ink)" : "var(--ink-2)" }}>{s.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{s.hint}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* step content */}
        <div style={{ minWidth: 0 }}>
          {step === 0 && <StepWhat f={f} set={set} cat={cat} locationLabel={locationLabel} />}
          {step === 1 && <StepWho f={f} set={set} />}
          {step === 2 && <StepDetails f={f} set={set} />}
          {step === 3 && <StepReview f={f} cat={cat} locationLabel={locationLabel} />}
        </div>
      </div>
    </Modal>
  );
}

type SetFn = <K extends keyof Form>(k: K, v: Form[K]) => void;

function StepWhat({ f, set, cat, locationLabel }: { f: Form; set: SetFn; cat: ReturnType<typeof categoryByKey>; locationLabel: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [applied, setApplied] = useState(false);
  const [src, setSrc] = useState<"claude" | "heuristic" | null>(null);
  const analyze = async () => {
    if (!f.desc.trim()) return;
    setAnalyzing(true);
    try {
      const r = await aiClassifyIntake(f.desc, BUILDINGS.find((b) => b.id === f.building)?.name);
      set("category", r.category);
      const c2 = categoryByKey(r.category);
      if (r.subcategory && c2) { const m = c2.subs.find((s) => s.toLowerCase().includes(r.subcategory.toLowerCase())); if (m) set("subcategory", m); }
      set("prio", r.priority);
      if (!f.title.trim()) set("title", r.title);
      if (r.category === "emergency") set("emergency", true);
      setApplied(true); setSrc(r.source);
    } catch { /* leave manual */ } finally { setAnalyzing(false); }
  };
  return (
    <div>
      <Label>Describe the issue — AI suggests the rest</Label>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
        <textarea value={f.desc} onChange={(e) => set("desc", e.target.value)} rows={3} placeholder="Type what's going on in plain language — e.g. 'water pouring into the cellar from the north wall, getting worse'. AI picks the category, priority & a title; correct anything." style={{ ...inputStyle, resize: "vertical", fontFamily: SANS, flex: 1 }} autoFocus />
        <Btn small primary icon={analyzing ? "loader" : "sparkles"} disabled={analyzing || !f.desc.trim()} onClick={analyze} style={{ flexShrink: 0 }}>{analyzing ? "Analyzing…" : "Analyze"}</Btn>
      </div>
      {applied && src && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontFamily: MONO, fontSize: 9.5, color: "var(--ink-3)" }}>
          <AISourceBadge source={src} /><span>suggested below — review &amp; correct anything.</span>
        </div>
      )}
      <Label>{applied ? "Category · AI suggested — correct if needed" : "Category · the tag"}</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {CATEGORIES.map((c) => {
          const on = f.category === c.key;
          return (
            <button key={c.key} onClick={() => { set("category", c.key); set("subcategory", ""); if (c.key === "emergency") set("prio", "Critical"); }}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 11, cursor: "pointer", textAlign: "left", background: on ? tint(c.color, 12) : "var(--fill-1)", border: "1px solid " + (on ? c.color : "var(--hair-2)") }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: tint(c.color, 16), border: "1px solid " + tint(c.color, 36) }}>
                <Icon name={c.icon} size={15} color={c.color} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>

      {f.category === "emergency" && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 13px", marginBottom: 14, borderRadius: 11, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)" }}>
          <Icon name="siren" size={17} color="#ef4444" />
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
            <strong style={{ color: "#ef4444" }}>Life-safety emergency.</strong> Priority is set to Critical and this routes to the central Facilities desk immediately on create. <strong style={{ color: "var(--ink)" }}>If anyone is in danger, call 911 first.</strong>
          </span>
        </div>
      )}

      {cat && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Subcategory"><Select options={[{ value: "", label: "— select —" }, ...cat.subs.map((s) => ({ value: s, label: s }))]} value={f.subcategory} onChange={(v) => set("subcategory", v)} /></Field>
          <Field label="Priority"><Select options={TICKET_PRIOS} value={f.prio} onChange={(v) => set("prio", v as Priority)} /></Field>
        </div>
      )}

      <Field label="Title"><TextInput value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Water leak under kitchen sink — Unit 4C" /></Field>

      {/* location */}
      <Label>Where</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Building"><Select options={BUILDINGS.map((b) => ({ value: b.id, label: b.name }))} value={f.building} onChange={(v) => set("building", v)} /></Field>
        <Field label="Location type"><Select options={LOCATION_KINDS.map((l) => ({ value: l.key, label: l.label }))} value={f.locKind} onChange={(v) => set("locKind", v)} /></Field>
      </div>
      {f.locKind === "unit" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Unit"><TextInput value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="4C" /></Field>
          <Field label="Floor"><TextInput value={f.floor} onChange={(e) => set("floor", e.target.value)} placeholder="4" /></Field>
          <Field label="Line"><Select options={["", ...UNIT_LINES]} value={f.line} onChange={(v) => set("line", v)} /></Field>
        </div>
      )}
      {f.locKind === "common" && <Field label="Common area"><Select options={COMMON_AREAS} value={f.area} onChange={(v) => set("area", v)} /></Field>}
      {f.locKind === "system" && <Field label="Building system"><Select options={SYSTEM_OPTIONS} value={f.systemKey} onChange={(v) => set("systemKey", v)} /></Field>}
      <Field label="Location detail (optional)"><TextInput value={f.locDetail} onChange={(e) => set("locDetail", e.target.value)} placeholder="e.g. north wall, behind riser; west bank, car B" /></Field>
      <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.04em" }}>PINNED LOCATION · {locationLabel}</div>
    </div>
  );
}

function StepWho({ f, set }: { f: Form; set: SetFn }) {
  return (
    <div>
      <Label>Who's submitting</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Submitter role"><Select options={SUBMITTER_ROLES} value={f.role} onChange={(v) => set("role", v)} /></Field>
        <Field label="Intake channel"><Select options={INTAKE_CHANNELS} value={f.channel} onChange={(v) => set("channel", v)} /></Field>
        <Field label="Name"><TextInput value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Jordan Avery" /></Field>
        <Field label="Unit (if resident)"><TextInput value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="3R" /></Field>
        <Field label="Phone"><TextInput value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (212) 555-0142" /></Field>
        <Field label="Email"><TextInput value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="jordan@email.com" /></Field>
        <Field label="Preferred contact"><Select options={CONTACT_PREFS} value={f.preferredContact} onChange={(v) => set("preferredContact", v)} /></Field>
        <Field label="On behalf of (optional)"><TextInput value={f.onBehalfOf} onChange={(e) => set("onBehalfOf", e.target.value)} placeholder="Super reporting for Unit 3R" /></Field>
      </div>
      {f.role !== "Anonymous" && !f.phone.trim() && !f.email.trim() && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14, padding: "9px 12px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <Icon name="info" size={14} color="#f59e0b" />
          <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>No phone or email — we won't be able to send status updates back to the submitter. Add one if you have it.</span>
        </div>
      )}
    </div>
  );
}

function StepDetails({ f, set }: { f: Form; set: SetFn }) {
  const toggleTag = (t: string) => set("tags", f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t]);
  const addAttach = (kind: TicketAttachment["kind"]) => {
    const n = f.attachments.filter((a) => a.kind === kind).length + 1;
    set("attachments", [...f.attachments, { id: "a" + Date.now(), kind, name: `${kind}-${n}.${kind === "photo" ? "jpg" : kind === "video" ? "mp4" : "pdf"}`, caption: "" }]);
  };
  const setCaption = (id: string, caption: string) => set("attachments", f.attachments.map((a) => (a.id === id ? { ...a, caption } : a)));
  const removeAttach = (id: string) => set("attachments", f.attachments.filter((a) => a.id !== id));

  return (
    <div>
      <Label>Access & entry</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <Check on={f.permissionToEnter} icon="key-round" label="Permission to enter" onClick={() => set("permissionToEnter", !f.permissionToEnter)} />
        <Check on={f.keyOnFile} icon="key" label="Key on file" onClick={() => set("keyOnFile", !f.keyOnFile)} />
        <Check on={f.occupantPresent} icon="user-check" label="Occupant must be present" onClick={() => set("occupantPresent", !f.occupantPresent)} />
        <Check on={f.petOnSite} icon="paw-print" label="Pet on site" warn onClick={() => set("petOnSite", !f.petOnSite)} />
      </div>
      <Field label="Preferred access window (optional)"><TextInput value={f.window} onChange={(e) => set("window", e.target.value)} placeholder="Weekdays after 4pm, or anytime" /></Field>

      <Label>Attach photos, video & documents</Label>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {ATTACH_KINDS.map((a) => (
          <button key={a.key} onClick={() => addAttach(a.key)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 10, cursor: "pointer", background: "var(--fill-2)", border: "1px dashed var(--hair-strong)", color: "var(--ink-2)", fontFamily: SANS, fontSize: 12, fontWeight: 600 }}>
            <Icon name={a.icon} size={14} color="var(--ink-3)" />Add {a.label}
          </button>
        ))}
        <span style={{ alignSelf: "center", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-5)", letterSpacing: "0.04em" }}>DRAG & DROP IN PRODUCTION</span>
      </div>
      {f.attachments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
          {f.attachments.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 10, background: "var(--fill-1)", border: "1px solid var(--hair-2)" }}>
              <Icon name={a.kind === "photo" ? "image" : a.kind === "video" ? "video" : "file-text"} size={15} color="var(--ink-3)" />
              <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)", width: 92, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
              <input value={a.caption} onChange={(e) => setCaption(a.id, e.target.value)} placeholder="Add a caption…" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "6px 10px" }} />
              <button onClick={() => removeAttach(a.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, display: "flex" }}><Icon name="x" size={14} color="var(--ink-4)" /></button>
            </div>
          ))}
        </div>
      )}

      <Label>Tags</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
        {SUGGESTED_TAGS.map((t) => {
          const on = f.tags.includes(t);
          return (
            <button key={t} onClick={() => toggleTag(t)} style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", padding: "5px 11px", borderRadius: 99, cursor: "pointer", textTransform: "uppercase", color: on ? "var(--on-accent)" : "var(--ink-3)", background: on ? "var(--acc)" : "var(--fill-2)", border: "1px solid " + (on ? "var(--acc)" : "var(--hair-3)") }}>{t}</button>
          );
        })}
      </div>

      <Label>Office routing (optional)</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, maxWidth: 360 }}>
        <Field label="Assign to"><Select options={[{ value: "", label: "Auto (by category)" }, ...OWNERS.map((p) => ({ value: p, label: PEOPLE[p].name }))]} value={f.assignee} onChange={(v) => set("assignee", v)} /></Field>
      </div>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "var(--fill-1)", border: "1px dashed var(--hair-strong)" }}>
        <Icon name="info" size={15} color="var(--ink-4)" />
        <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>Billing — who pays (building, reserve, resident, insurance, warranty) and the cost — is decided by whoever works the ticket, in <strong style={{ color: "var(--ink-2)" }}>Ticket Command → Intake → Billing &amp; cost</strong>. The requester never sets it.</span>
      </div>
    </div>
  );
}

function StepReview({ f, cat, locationLabel }: { f: Form; cat: ReturnType<typeof categoryByKey>; locationLabel: string }) {
  const owner = f.assignee ? PEOPLE[f.assignee] : null;
  const b = BUILDINGS.find((x) => x.id === f.building)!;
  // live routing preview — exactly where this ticket will land on create
  const route = cat ? autoRoute({ type: cat.type, category: f.category, prio: f.prio } as Ticket) : null;
  const team = route ? teamByKey(route.team) : null;
  const routedOwner = PEOPLE[f.assignee || defaultOwnerKey(cat?.type)];
  return (
    <div>
      {!cat && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, padding: "10px 13px", borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)" }}>
          <Icon name="triangle-alert" size={15} color="#f59e0b" />
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>Pick a <strong>category</strong> in step 1 — it's required to create the intake.</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {cat && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: tint(cat.color, 14), border: "1px solid " + tint(cat.color, 36), fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: cat.color }}><Icon name={cat.icon} size={12} color={cat.color} />{cat.label.toUpperCase()}</span>}
        {f.subcategory && <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-3)" }}>{f.subcategory}</span>}
      </div>
      <h3 style={{ margin: "0 0 4px", fontFamily: SANS, fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{f.title || "Untitled intake"}</h3>
      <p style={{ margin: "0 0 16px", fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{f.desc || "No description provided."}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 22px" }}>
        <Row k="Building" v={b.name} />
        <Row k="Location" v={locationLabel} />
        <Row k="Priority" v={f.prio} />
        <Row k="Submitter" v={`${f.name || f.role} (${f.role})`} />
        <Row k="Channel" v={f.channel} />
        <Row k="Contact" v={[f.phone, f.email].filter(Boolean).join(" · ") || "—"} />
        <Row k="Access" v={[f.permissionToEnter && "entry OK", f.keyOnFile && "key on file", f.occupantPresent && "occupant present", f.petOnSite && "pet on site"].filter(Boolean).join(" · ") || "—"} />
        <Row k="Billing" v="Set by ops when working" />
        <Row k="Media" v={f.attachments.length ? f.attachments.length + " file(s)" : "none"} />
        <Row k="Owner" v={owner ? owner.name : "auto-routed"} node={owner ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Avatar person={owner} size={18} />{owner.name}</span> : undefined} />
      </div>

      {/* routing preview — where this lands on create */}
      {route && team && (
        <div style={{ marginTop: 16, padding: "13px 15px", borderRadius: 12, background: "var(--fill-1)", border: "1px solid var(--hair-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
            <Icon name="route" size={14} color="var(--acc-text)" />
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>Where this goes</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 99, background: tint(team.color, 14), border: "1px solid " + tint(team.color, 36), fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
              <Icon name={team.icon} size={13} color={team.color} />{team.label}
            </span>
            <Icon name="arrow-right" size={14} color="var(--ink-4)" />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}><Avatar person={routedOwner} size={18} />{routedOwner.name}</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: f.prio === "Critical" ? "#ef4444" : "var(--ink-3)" }}>
              <Icon name="timer" size={12} color={f.prio === "Critical" ? "#ef4444" : "var(--ink-4)"} />SLA {slaLabel(f.prio)}
            </span>
          </div>
          {route.viaSuper && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#14b8a6" }}>
              <Icon name="hammer" size={11} color="#14b8a6" />Super first · auto-escalates to Facilities in 24h
            </div>
          )}
          <p style={{ margin: "9px 0 0", fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{route.reason}.</p>
        </div>
      )}

      {f.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
          {f.tags.map((t) => <span key={t} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 99, background: "var(--fill-3)", border: "1px solid var(--hair-3)", color: "var(--ink-3)", textTransform: "uppercase" }}>{t}</span>)}
        </div>
      )}
    </div>
  );
}

// ── small bits ──────────────────────────────────────────────────────────
function Label({ children }: { children: ReactNode }) {
  return <p style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-4)", margin: "0 0 10px" }}>{children}</p>;
}
function Check({ on, icon, label, onClick, warn }: { on: boolean; icon: string; label: string; onClick: () => void; warn?: boolean }) {
  const c = warn && on ? "#f59e0b" : on ? "#22c55e" : "var(--ink-4)";
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 99, cursor: "pointer", background: on ? tint(c, 12) : "var(--fill-1)", border: "1px solid " + (on ? tint(c, 32) : "var(--hair-2)"), fontFamily: SANS, fontSize: 12, color: on ? "var(--ink)" : "var(--ink-3)" }}>
      <span style={{ width: 16, height: 16, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", background: on ? c : "transparent", border: "1.5px solid " + (on ? c : "var(--hair-strong)") }}>{on && <Icon name="check" size={11} color="#0a0a0a" />}</span>
      <Icon name={icon} size={13} color={c} />{label}
    </button>
  );
}
function Row({ k, v, node }: { k: string; v: string; node?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)" }}>{k}</span>
      <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>{node || v}</span>
    </div>
  );
}
