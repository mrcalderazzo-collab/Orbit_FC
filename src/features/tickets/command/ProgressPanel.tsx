// ProgressPanel — checklist/subtasks with % complete + "Post a progress update"
// that can optionally text the resident. Mirrors TicketDeep.jsx.
import { useEffect, useState } from "react";
import type { ChecklistItem, Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { STAGE_INDEX } from "@/data/flow";
import { Btn, Glass, Icon, inputStyle, SectionLabel } from "@/components/ui";

const SANS = "Outfit, sans-serif";

function defaultChecklist(f: TicketFlow): ChecklistItem[] {
  const si = f.stageIndex;
  return [
    { id: "k1", label: "Triaged & routed to an owner", done: si >= STAGE_INDEX.triage },
    { id: "k2", label: "Competitive bids sourced", done: si >= STAGE_INDEX.sourcing },
    { id: "k3", label: f.requiresVote ? "Board approval secured" : "Vendor selected & awarded", done: !!f.awardedBidId },
    { id: "k4", label: "Scheduled with resident & vendor", done: si >= STAGE_INDEX.scheduled },
    { id: "k5", label: "Work underway on site", done: si >= STAGE_INDEX.inprogress },
    { id: "k6", label: "Verified, signed off & closed", done: si >= STAGE_INDEX.closed },
  ];
}

export function ProgressPanel({ t, f }: { t: Ticket; f: TicketFlow }) {
  const { ticketProgress, seedProgress, setProgressItems, postProgress, sendTicketMessage } = useOrbit();
  useEffect(() => { seedProgress(t.id, { items: defaultChecklist(f) }); }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = ticketProgress[t.id]?.items || defaultChecklist(f);
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const [adding, setAdding] = useState("");
  const [note, setNote] = useState("");
  const [alsoText, setAlsoText] = useState(true);

  const toggle = (id: string) => setProgressItems(t.id, items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => setProgressItems(t.id, items.filter((i) => i.id !== id));
  const add = () => { if (!adding.trim()) return; setProgressItems(t.id, [...items, { id: "k" + Date.now(), label: adding.trim(), done: false }]); setAdding(""); };
  const post = () => {
    if (!note.trim()) return;
    postProgress(t.id, note.trim(), pct);
    if (alsoText) sendTicketMessage(t.id, { audience: "Resident", channels: ["SMS"], text: note.trim() });
    setNote("");
  };
  const c = pct === 100 ? "#22c55e" : "var(--acc)";

  return (
    <Glass style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <SectionLabel>Progress</SectionLabel>
        <span style={{ marginLeft: "auto", fontFamily: SANS, fontWeight: 600, fontSize: 22, color: c, letterSpacing: "-0.5px" }}>{pct}<span style={{ fontSize: 13, color: "var(--ink-4)" }}>%</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ width: pct + "%", height: "100%", borderRadius: 99, background: c, boxShadow: "0 0 10px " + (pct === 100 ? "rgba(34,197,94,0.4)" : "rgba(var(--acc-rgb),0.4)"), transition: "width .35s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
        {items.map((it) => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", borderRadius: 8 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-1)"; const x = e.currentTarget.querySelector<HTMLElement>(".orbit-x"); if (x) x.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; const x = e.currentTarget.querySelector<HTMLElement>(".orbit-x"); if (x) x.style.opacity = "0"; }}>
            <button onClick={() => toggle(it.id)} style={{ width: 19, height: 19, borderRadius: 6, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: it.done ? "#22c55e" : "transparent", border: "1.5px solid " + (it.done ? "#22c55e" : "var(--hair-strong)") }}>
              {it.done && <Icon name="check" size={12} color="#0a0a0a" />}
            </button>
            <span style={{ flex: 1, fontFamily: SANS, fontSize: 12.5, color: it.done ? "var(--ink-4)" : "var(--ink-2)", textDecoration: it.done ? "line-through" : "none" }}>{it.label}</span>
            <button className="orbit-x" onClick={() => remove(it.id)} style={{ opacity: 0, background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", transition: "opacity .15s" }}>
              <Icon name="x" size={13} color="var(--ink-4)" />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
        <input value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a subtask…" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "8px 11px" }} />
        <button onClick={add} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 12px", borderRadius: 9, cursor: "pointer", background: "var(--fill-3)", border: "1px solid var(--hair-strong)", color: "var(--ink-2)", fontFamily: SANS, fontSize: 11, fontWeight: 600 }}>
          <Icon name="plus" size={13} color="var(--ink-2)" />Add
        </button>
      </div>
      <div style={{ paddingTop: 16, borderTop: "1px solid var(--hair-2)" }}>
        <SectionLabel style={{ marginBottom: 10 }}>Post a progress update</SectionLabel>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Parts arrived, crew completes tomorrow AM…" style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}>
          <button onClick={() => setAlsoText((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ width: 30, height: 17, borderRadius: 99, background: alsoText ? "var(--acc)" : "var(--fill-3)", position: "relative", flexShrink: 0, border: "1px solid " + (alsoText ? "var(--acc)" : "var(--hair-3)") }}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", background: alsoText ? "#0a0a0a" : "var(--ink-4)", position: "absolute", top: 1, left: alsoText ? 14 : 1, transition: "left .18s" }} />
            </span>
            <span style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-2)" }}>Text the resident too</span>
          </button>
          <Btn small primary icon="send" disabled={!note.trim()} onClick={post} style={{ marginLeft: "auto" }}>Post update</Btn>
        </div>
      </div>
    </Glass>
  );
}
