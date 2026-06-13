// SuperCreateModal — the superintendent logs a ticket into the system from the
// field. Manual category/priority with an optional AI suggestion, scoped to the
// active building, routed through createTicket (the backend seam) and tagged as
// super-submitted. Can be opened blank or pre-filled (e.g. from a system card).
import { useEffect, useState } from "react";
import type { Priority, TicketIntakeDetail } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { CATEGORIES, categoryByKey } from "@/data/taxonomy";
import { buildingById } from "@/data/seed";
import { aiClassifyIntake } from "@/services/ai";
import { AISourceBadge } from "@/features/ai/TicketTriagePanel";
import { Btn, Field, Icon, Modal, Select, TextInput, inputStyle } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const TEAL = "#14b8a6";
const PRIOS: Priority[] = ["Low", "Normal", "High", "Critical"];

export interface CreatePrefill { title?: string; category?: string; locationLabel?: string }

export function SuperCreateModal({ open, buildingId, prefill, onClose }: { open: boolean; buildingId: string; prefill?: CreatePrefill | null; onClose: () => void }) {
  const { currentUser, createTicket, addTicketPhoto, notify } = useOrbit();
  const b = buildingById(buildingId);
  const me = currentUser?.person?.name || "Super";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("maintenance");
  const [prio, setPrio] = useState<Priority>("Normal");
  const [loc, setLoc] = useState("");
  const [desc, setDesc] = useState("");
  const [withPhoto, setWithPhoto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<"claude" | "heuristic" | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(prefill?.title ?? "");
    setCategory(prefill?.category && categoryByKey(prefill.category) ? prefill.category : "maintenance");
    setPrio("Normal"); setLoc(prefill?.locationLabel ?? ""); setDesc(""); setWithPhoto(true); setSource(null);
  }, [open, prefill]);

  if (!open) return null;
  const cat = categoryByKey(category);

  const suggest = async () => {
    if (!desc.trim()) return;
    setBusy(true);
    try {
      const r = await aiClassifyIntake(desc.trim(), b?.name);
      if (categoryByKey(r.category)) setCategory(r.category);
      setPrio(r.priority);
      if (!title.trim()) setTitle(r.title);
      setSource(r.source);
    } catch { setSource(null); } finally { setBusy(false); }
  };

  const submit = () => {
    if (!cat || !title.trim()) return;
    const intake: TicketIntakeDetail = {
      category,
      location: { kind: "building", label: (b?.name ?? "") + (loc ? " · " + loc : ""), detail: loc || undefined },
      submitter: { role: "Super / resident manager", name: me, channel: "Super / staff", email: currentUser?.email },
      reportedAt: new Date().toISOString(),
    };
    const id = createTicket({
      title: title.trim(), building: buildingId, type: cat.type, prio,
      requester: "Super · " + me, desc: desc.trim(), status: "Open", category, intake,
    });
    if (withPhoto) addTicketPhoto(id, "Field photo from intake");
    notify(id + " logged"); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log a ticket" sub={(b?.name ?? "") + " · superintendent intake"}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><Btn primary icon="send" disabled={!title.trim()} onClick={submit}>Submit ticket</Btn></>}>
      <Field label="What's the issue?" hint="A line or two — add a photo and we'll route it.">
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="e.g. Slow drain in the 3rd-floor trash room, water pooling under the compactor." style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }} />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Btn small ghost icon="sparkles" disabled={!desc.trim() || busy} onClick={suggest}>{busy ? "Reading…" : "AI suggest"}</Btn>
        {source && <AISourceBadge source={source} />}
      </div>
      <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Category"><Select value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))} /></Field>
        <Field label="Priority"><Select value={prio} onChange={(v) => setPrio(v as Priority)} options={PRIOS} /></Field>
      </div>
      <Field label="Location in building" hint="Floor, line, room, or system."><TextInput value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Cellar · boiler room" /></Field>
      <button onClick={() => setWithPhoto((p) => !p)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10, cursor: "pointer", width: "100%", textAlign: "left", background: withPhoto ? "rgba(20,184,166,0.08)" : "var(--fill-1)", border: "1px solid " + (withPhoto ? "rgba(20,184,166,0.3)" : "var(--hair-2)") }}>
        <Icon name={withPhoto ? "check-square" : "square"} size={16} color={withPhoto ? TEAL : "var(--ink-4)"} />
        <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-2)" }}>Attach a field photo</span>
      </button>
    </Modal>
  );
}
