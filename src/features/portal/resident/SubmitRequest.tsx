// Submit Request — the resident's AI-first intake. Describe the problem in plain
// language; aiClassifyIntake (Claude, with a deterministic heuristic fallback)
// suggests a category, priority and title, which the resident can adjust before
// submitting. The new ticket flows through the OrbitProvider createTicket seam,
// scoped to the resident's unit and tagged with _residentOwner so it shows up in
// My Requests and on the operator side like any other intake.
import { useState } from "react";
import type { Priority, TicketIntakeDetail } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { CATEGORIES, categoryByKey } from "@/data/taxonomy";
import { buildingById } from "@/data/seed";
import { aiClassifyIntake, type IntakeClassifyResult } from "@/services/ai";
import { AISourceBadge } from "@/features/ai/TicketTriagePanel";
import { Btn, Field, Glass, Icon, Select, TextInput, inputStyle } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const BLUE = "#3b82f6";
const PRIOS: Priority[] = ["Low", "Normal", "High", "Critical"];

export function SubmitRequest({ onSubmitted }: { onSubmitted: () => void }) {
  const { currentUser, createTicket } = useOrbit();
  const b = currentUser?.building ? buildingById(currentUser.building) : undefined;
  const unit = currentUser?.unit || "";
  const me = currentUser?.person?.name || "Resident";

  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [source, setSource] = useState<IntakeClassifyResult["source"] | "offline" | null>(null);
  const [category, setCategory] = useState("maintenance");
  const [prio, setPrio] = useState<Priority>("Normal");
  const [title, setTitle] = useState("");

  const cat = categoryByKey(category);

  const analyze = async () => {
    if (!desc.trim()) return;
    setBusy(true);
    try {
      const r = await aiClassifyIntake(desc.trim(), b?.name);
      setCategory(categoryByKey(r.category) ? r.category : "maintenance");
      setPrio(r.priority);
      setTitle(r.title || desc.trim().slice(0, 60));
      setSource(r.source);
    } catch {
      // server unavailable (e.g. static preview) — fall back to a local guess
      setTitle(desc.trim().slice(0, 60));
      setSource("offline");
    } finally {
      setBusy(false);
      setAnalyzed(true);
    }
  };

  const submit = () => {
    if (!cat || !title.trim() || !currentUser?.building) return;
    const intake: TicketIntakeDetail = {
      category,
      location: { kind: "unit", label: (b?.name ?? "") + (unit ? " · Unit " + unit : ""), unit: unit || undefined },
      submitter: { role: "Resident", name: me, unit: unit || undefined, channel: "Resident portal", email: currentUser.email },
      reportedAt: new Date().toISOString(),
    };
    createTicket({
      title: title.trim(),
      building: currentUser.building,
      type: cat.type,
      prio,
      requester: "Resident · Unit " + (unit || "—"),
      desc: desc.trim(),
      status: "Open",
      category,
      intake,
      _residentOwner: currentUser.id,
    });
    onSubmitted();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Submit a request</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          {b?.name}{unit ? " · Unit " + unit : ""}
        </p>
      </div>

      <Glass style={{ padding: 20 }}>
        <Field label="What's going on?" hint="Describe it like you'd tell a neighbor — we'll sort out the details.">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="e.g. The kitchen sink has been dripping under the cabinet since last night and the floor is getting wet."
            style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }}
          />
        </Field>
        {!analyzed && (
          <Btn primary icon="sparkles" disabled={!desc.trim() || busy} onClick={analyze} style={{ justifyContent: "center" }}>
            {busy ? "Reading your request…" : "Continue"}
          </Btn>
        )}

        {analyzed && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", marginBottom: 16 }}>
              <Icon name="wand-2" size={15} color={BLUE} />
              <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>
                {source === "offline" ? "We've pre-filled the basics — adjust anything below." : "We sorted this for you — adjust anything below."}
              </span>
              {source && source !== "offline" && <AISourceBadge source={source} />}
            </div>

            <Field label="Title">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Category">
                <Select value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))} />
              </Field>
              <Field label="How urgent?">
                <Select value={prio} onChange={(v) => setPrio(v as Priority)} options={PRIOS} />
              </Field>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 10, background: "var(--fill-1)", border: "1px solid var(--hair-2)", marginBottom: 16 }}>
              <Icon name="map-pin" size={15} color="var(--ink-4)" />
              <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>{b?.name}{unit ? " · Unit " + unit : ""}</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>your unit</span>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn ghost onClick={() => { setAnalyzed(false); setSource(null); }}>Back</Btn>
              <Btn primary icon="send" disabled={!title.trim()} onClick={submit}>Submit request</Btn>
            </div>
          </div>
        )}
      </Glass>
    </div>
  );
}
