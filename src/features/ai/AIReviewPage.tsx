// AI Review Center — queue of AI recommendations; operator approves/rejects.
// AI recommends, the operator decides (platform-wide principle). The engines
// here are seeded; the production service is an LLM layer (Claude) that writes
// the same { rec, reason, confidence, input } shape — see src/services/ai.
import { useState } from "react";
import type { AiRec } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS, buildingById } from "@/data/seed";
import { aiPatterns, aiTriage } from "@/services/ai";
import { Btn, Empty, Glass, Icon, Modal, SectionLabel, Tag } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";
import { AISourceBadge } from "./TicketTriagePanel";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const KIND_ICON: Record<string, string> = { "Maintenance triage": "wrench", "Intake triage": "git-branch", "Pattern / predictive": "radar", "Vendor recommendation": "handshake", "Financial anomaly": "trending-up", "Lease renewal": "scroll-text", "Document review": "file-search" };

export function AIReviewPage() {
  const { recs, decideRec, addRecs, tickets, notify } = useOrbit();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState<"triage" | "patterns" | null>(null);
  const list = recs.filter((r) => (filter === "all" ? true : r.status === filter));
  const pending = recs.filter((r) => r.status === "pending").length;

  const runTriage = async () => {
    setBusy("triage");
    try {
      const inbound = tickets.filter((t) => t.status === "Open" && !t.mergedInto).slice(0, 6);
      const results = await Promise.all(inbound.map(async (t) => {
        const b = buildingById(t.building)!;
        const r = await aiTriage(t, b.name);
        const rec: AiRec = {
          id: "ait_" + t.id, kind: "Intake triage", building: t.building, confidence: r.confidence,
          status: "pending", agent: "TRIAGE_ENGINE", ticketId: t.id, source: r.source, model: r.model,
          rec: `Route ${t.id} as ${r.priority} ${r.type}` + (r.suggestedOwnerId ? " → " + r.suggestedOwnerId : ""),
          reason: r.summary, input: r.rationale,
        };
        return rec;
      }));
      addRecs(results);
      notify(results.length ? results.length + " triage recommendations queued" : "No inbound tickets to triage");
    } catch (e) { notify("Triage failed: " + (e as Error).message, "err"); }
    finally { setBusy(null); }
  };

  const runPatterns = async () => {
    setBusy("patterns");
    try {
      const active = tickets.filter((t) => t.status !== "Closed" && !t.mergedInto);
      const r = await aiPatterns("Portfolio", active);
      const recsOut: AiRec[] = r.patterns.map((p, i) => ({
        id: "aip_" + i + "_" + p.ticketIds.join("-").slice(0, 12), kind: "Pattern / predictive",
        building: tickets.find((t) => t.id === p.ticketIds[0])?.building || BUILDINGS[0].id,
        confidence: p.confidence, status: "pending", agent: "ANOMALY_ENGINE", source: r.source, model: r.model,
        rec: p.title, reason: p.finding + " " + p.recommendation, input: "Tickets: " + p.ticketIds.join(", "),
      }));
      addRecs(recsOut);
      notify(recsOut.length ? recsOut.length + " patterns surfaced" : "No cross-ticket patterns found");
    } catch (e) { notify("Pattern scan failed: " + (e as Error).message, "err"); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="AI Review Center" sub={pending + " recommendations awaiting human review"}
        right={<div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Btn small icon={busy === "triage" ? "loader" : "git-branch"} disabled={!!busy} onClick={runTriage}>Triage inbound</Btn>
          <Btn small icon={busy === "patterns" ? "loader" : "radar"} disabled={!!busy} onClick={runPatterns}>Scan patterns</Btn>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 13px", borderRadius: 99, background: "rgba(var(--acc-rgb),0.05)", border: "1px solid rgba(var(--acc-rgb),0.2)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--acc)", boxShadow: "0 0 8px var(--acc)" }} />
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--acc-text)", textTransform: "uppercase" }}>5 agents online</span>
          </div>
        </div>} />

      <div style={{ padding: "16px 28px 0", display: "flex", gap: 4, borderBottom: "1px solid var(--hair-2)" }}>
        {[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "9px 16px", border: "none", background: "none", cursor: "pointer", borderBottom: "2px solid " + (filter === k ? "var(--acc)" : "transparent"), color: filter === k ? "var(--ink)" : "var(--ink-3)", fontFamily: SANS, fontSize: 13, fontWeight: filter === k ? 600 : 400 }}>
            {l}{k === "pending" && pending ? <span style={{ marginLeft: 7, fontFamily: MONO, fontSize: 9, color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.12)", borderRadius: 99, padding: "1px 6px" }}>{pending}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 940 }}>
          {list.map((r) => <RecCard key={r.id} r={r} onOpen={() => setOpen(r.id)} onDecide={decideRec} />)}
          {!list.length && <Empty label="Nothing here" icon="brain-circuit" />}
        </div>
      </div>
      {open && <RecDetail id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RecCard({ r, onOpen, onDecide }: { r: AiRec; onOpen: () => void; onDecide: (id: string, d: "approved" | "rejected") => void }) {
  const { openCommand } = useOrbit();
  const b = BUILDINGS.find((x) => x.id === r.building)!;
  const c = r.confidence > 0.9 ? "#22c55e" : r.confidence > 0.8 ? "var(--acc)" : "#f59e0b";
  const decided = r.status !== "pending";
  return (
    <Glass hover accent="var(--acc)" style={{ padding: 18, opacity: decided ? 0.62 : 1 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: "rgba(var(--acc-rgb),0.08)", border: "1px solid rgba(var(--acc-rgb),0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={KIND_ICON[r.kind] || "sparkles"} size={18} color="var(--acc-text)" /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7, flexWrap: "wrap" }}>
            <Tag color="var(--acc-text)" bg="rgba(var(--acc-rgb),0.1)">{r.agent}</Tag>
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{r.kind}</span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: b.mono }}>· {b.name}</span>
            {r.source && <AISourceBadge source={r.source} model={r.model} />}
            {r.status === "approved" && <Tag color="#22c55e" bg="rgba(34,197,94,0.12)">✓ APPROVED</Tag>}
            {r.status === "rejected" && <Tag color="#ef4444" bg="rgba(239,68,68,0.12)">✕ REJECTED</Tag>}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4, marginBottom: 8 }}>{r.rec}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <Icon name="git-branch" size={13} color="var(--ink-4)" style={{ marginTop: 2 }} />
            <p style={{ margin: 0, fontFamily: SANS, fontWeight: 300, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{r.reason}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0, width: 120 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: 4 }}>CONFIDENCE</div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: c, lineHeight: 1 }}>{Math.round(r.confidence * 100)}%</div>
            <div style={{ width: 110, height: 4, borderRadius: 2, background: "var(--hair-3)", marginTop: 6, overflow: "hidden" }}><div style={{ width: r.confidence * 100 + "%", height: "100%", background: c }} /></div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 9, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--hair)" }}>
        <Btn small ghost icon="eye" onClick={onOpen}>Inspect input</Btn>
        {r.ticketId && <Btn small ghost icon="arrow-up-right" onClick={() => openCommand(r.ticketId!)}>Open {r.ticketId}</Btn>}
        <div style={{ flex: 1 }} />
        {!decided ? (
          <>
            <Btn small danger icon="x" onClick={() => onDecide(r.id, "rejected")}>Reject</Btn>
            <Btn small primary icon="check" onClick={() => onDecide(r.id, "approved")}>Approve</Btn>
          </>
        ) : (
          <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", alignSelf: "center" }}>DECISION WRITTEN TO CHAIN</span>
        )}
      </div>
    </Glass>
  );
}

function RecDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { recs, decideRec, openCommand } = useOrbit();
  const r = recs.find((x) => x.id === id);
  if (!r) return null;
  const b = BUILDINGS.find((x) => x.id === r.building)!;
  const decided = r.status !== "pending";
  return (
    <Modal open onClose={onClose} width={580} title={r.rec} sub={r.agent + " · " + r.kind + " · " + b.name}
      footer={<>
        {r.ticketId && <Btn ghost icon="arrow-up-right" onClick={() => { openCommand(r.ticketId!); onClose(); }}>Open {r.ticketId}</Btn>}
        <div style={{ flex: 1 }} />
        {!decided ? <><Btn danger icon="x" onClick={() => { decideRec(r.id, "rejected"); onClose(); }}>Reject</Btn><Btn primary icon="check" onClick={() => { decideRec(r.id, "approved"); onClose(); }}>Approve &amp; sign</Btn></> : <Btn ghost onClick={onClose}>Close</Btn>}
      </>}>
      <SectionLabel style={{ marginBottom: 8 }}>Reasoning</SectionLabel>
      <p style={{ fontFamily: SANS, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 18px" }}>{r.reason}</p>
      <SectionLabel style={{ marginBottom: 8 }}>Source input</SectionLabel>
      <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, background: "var(--code-bg)", border: "1px solid var(--hair-2)", borderRadius: 12, padding: 14, marginBottom: 18 }}>{r.input}</div>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ flex: 1 }}><SectionLabel style={{ marginBottom: 6 }}>Confidence</SectionLabel><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, color: r.confidence > 0.9 ? "#22c55e" : "var(--acc)" }}>{Math.round(r.confidence * 100)}%</span></div>
        <div style={{ flex: 2 }}><SectionLabel style={{ marginBottom: 6 }}>Human review required</SectionLabel><p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>AI recommends — it never executes consequential actions without operator approval.</p></div>
      </div>
    </Modal>
  );
}
