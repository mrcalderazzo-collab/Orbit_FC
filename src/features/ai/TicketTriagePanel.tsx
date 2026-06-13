// TicketTriagePanel — Claude-backed intake triage, operator-in-the-loop. The
// engine classifies type/priority, summarizes the ask, suggests an owner, and
// drafts a first response. Nothing is applied until the operator commits; every
// commit writes to the audit trail. A source badge shows whether the result is
// live Claude or the deterministic fallback.
import { useState } from "react";
import type { Building, Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { PRIO_COLOR } from "@/lib/ticket";
import { tint } from "@/lib/format";
import { PEOPLE } from "@/data/seed";
import { aiTriage, type TriageResult } from "@/services/ai";
import { Avatar, Btn, Glass, Icon, SectionLabel, Tag, inputStyle } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function AISourceBadge({ source, model, confidence }: { source: "claude" | "heuristic"; model?: string; confidence?: number }) {
  const live = source === "claude";
  const c = live ? "var(--acc-text)" : "#f59e0b";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: c, background: tint(c, 12), border: "1px solid " + tint(c, 30), padding: "2px 7px", borderRadius: 6 }}>
      <Icon name={live ? "sparkles" : "cpu"} size={10} color={c} />
      {live ? (model || "CLAUDE") : "HEURISTIC"}
      {typeof confidence === "number" && <span style={{ color: "var(--ink-4)" }}>· {Math.round(confidence * 100)}%</span>}
    </span>
  );
}

export function TicketTriagePanel({ t, b }: { t: Ticket; b: Building }) {
  const { updateTicket, sendTicketMessage, addComment, notify } = useOrbit();
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<TriageResult | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await aiTriage(t, b.name);
      setR(res); setDraft(res.draftResponse);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const owner = r ? PEOPLE[r.suggestedOwnerId] : null;
  const typeChanged = r && r.type !== t.type;
  const prioChanged = r && r.priority !== t.prio;

  const applyClassification = () => {
    if (!r) return;
    updateTicket(t.id, {
      type: r.type as Ticket["type"], prio: r.priority as Ticket["prio"],
      assignee: r.suggestedOwnerId, status: t.status === "Open" ? "Assigned" : t.status,
    }, `AI triage applied · ${r.type} · ${r.priority} → ${owner?.name ?? r.suggestedOwnerId} (operator-approved, ${r.source})`);
    notify("Triage applied · " + r.type + " · " + r.priority);
  };
  const sendDraft = () => { if (draft.trim()) sendTicketMessage(t.id, { audience: "Resident", channels: ["SMS", "Email"], text: draft.trim() }); };
  const saveDraft = () => { if (draft.trim()) { addComment(t.id, "AI-assisted draft reply, saved for review: “" + draft.trim() + "”"); notify("Draft saved to team comments"); } };

  return (
    <Glass accent="var(--acc)" style={{ padding: 18, borderLeft: "2px solid rgba(var(--acc-rgb),0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: r ? 16 : 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(var(--acc-rgb),0.1)", border: "1px solid rgba(var(--acc-rgb),0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="brain-circuit" size={17} color="var(--acc-text)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>AI triage</div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.04em" }}>AI recommends · you decide</div>
        </div>
        {r && <AISourceBadge source={r.source} model={r.model} confidence={r.confidence} />}
        <Btn small primary={!r} icon={loading ? "loader" : "sparkles"} disabled={loading} onClick={run}>{loading ? "Analyzing…" : r ? "Re-run" : "Run AI triage"}</Btn>
      </div>

      {err && <div style={{ fontFamily: MONO, fontSize: 10, color: "#ef4444", marginTop: 10 }}>Triage failed: {err}</div>}

      {r && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* classification */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Field label="Type"><div style={{ display: "flex", alignItems: "center", gap: 6 }}><Tag color="var(--ink)" bg="var(--fill-3)">{r.type}</Tag>{typeChanged && <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--acc-text)" }}>was {t.type}</span>}</div></Field>
            <Field label="Priority"><div style={{ display: "flex", alignItems: "center", gap: 6 }}><Tag color={PRIO_COLOR[r.priority as Ticket["prio"]]} bg={tint(PRIO_COLOR[r.priority as Ticket["prio"]], 14)}>{r.priority}</Tag>{prioChanged && <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--acc-text)" }}>was {t.prio}</span>}</div></Field>
            <Field label="Suggested owner">
              {owner ? <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Avatar person={owner} size={20} /><span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{owner.name}</span></div> : <span style={{ fontFamily: SANS, fontSize: 12 }}>{r.suggestedOwnerId}</span>}
            </Field>
          </div>

          {/* the ask */}
          <div>
            <SectionLabel style={{ marginBottom: 6 }}>The ask</SectionLabel>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{r.summary}</p>
          </div>

          {/* rationale */}
          <div style={{ display: "flex", gap: 8 }}>
            <Icon name="git-branch" size={13} color="var(--ink-4)" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ margin: 0, fontFamily: SANS, fontWeight: 300, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{r.rationale}</p>
          </div>

          {/* draft response (editable) */}
          <div>
            <SectionLabel style={{ marginBottom: 8 }}>Draft first response · edit before sending</SectionLabel>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }} />
          </div>

          {/* operator actions */}
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--hair-2)" }}>
            <Btn small primary icon="check" onClick={applyClassification}>Apply classification &amp; route</Btn>
            <Btn small icon="send" onClick={sendDraft} disabled={!draft.trim()}>Send draft to resident</Btn>
            <Btn small ghost icon="message-square" onClick={saveDraft} disabled={!draft.trim()}>Save as comment</Btn>
          </div>
        </div>
      )}
    </Glass>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)" }}>{label}</span>
      {children}
    </div>
  );
}
