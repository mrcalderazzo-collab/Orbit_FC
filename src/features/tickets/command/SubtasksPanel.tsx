// SubtasksPanel — the parent ticket's task tree. Subtasks carry a status
// (todo/doing/done) and an owner, and any of them can be promoted into a real
// linked child ticket with its own lifecycle. Roll-up progress counts subtasks
// plus the stage of promoted children. Keeps the "post a progress update"
// (optionally texting the resident) action from the original progress panel.
import { useEffect, useState } from "react";
import type { ChecklistItem, SubStatus, Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { STAGE_INDEX } from "@/data/flow";
import { PEOPLE } from "@/data/seed";
import { playbookFor } from "@/data/playbooks";
import { Avatar, Btn, Glass, Icon, inputStyle, SectionLabel } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const OWNERS = ["luke", "cait", "maura", "gidi"];
const STATUS_META: Record<SubStatus, { c: string; label: string; icon: string }> = {
  todo: { c: "var(--ink-4)", label: "To do", icon: "circle" },
  doing: { c: "var(--acc)", label: "Doing", icon: "loader" },
  done: { c: "#22c55e", label: "Done", icon: "check" },
};

function defaultSubtasks(t: Ticket, f: TicketFlow): ChecklistItem[] {
  const pb = playbookFor(t);
  if (pb) {
    // playbook drives the checklist; mark early steps done if we're past triage
    return pb.steps.map((label, i) => {
      const done = f.stageIndex >= STAGE_INDEX.review ? true : f.stageIndex >= STAGE_INDEX.triage && i === 0;
      return { id: "pb" + i, label, done, status: done ? "done" : "todo", assignee: null, linkedTicketId: null };
    });
  }
  const si = f.stageIndex;
  const mk = (id: string, label: string, done: boolean): ChecklistItem => ({ id, label, done, status: done ? "done" : "todo", assignee: null, linkedTicketId: null });
  return [
    mk("k1", "Triaged & routed to an owner", si >= STAGE_INDEX.triage),
    mk("k2", "Competitive bids sourced", si >= STAGE_INDEX.sourcing),
    mk("k3", f.requiresVote ? "Board approval secured" : "Vendor selected & awarded", !!f.awardedBidId),
    mk("k4", "Scheduled with resident & vendor", si >= STAGE_INDEX.scheduled),
    mk("k5", "Work underway on site", si >= STAGE_INDEX.inprogress),
    mk("k6", "Verified, signed off & closed", si >= STAGE_INDEX.closed),
  ];
}
const nextStatus = (s: SubStatus): SubStatus => (s === "todo" ? "doing" : s === "doing" ? "done" : "todo");

export function SubtasksPanel({ t, f }: { t: Ticket; f: TicketFlow }) {
  const { ticketProgress, seedProgress, setProgressItems, postProgress, sendTicketMessage, spawnChildTicket, openCommand, tickets } = useOrbit();
  useEffect(() => { seedProgress(t.id, { items: defaultSubtasks(t, f) }); }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = ticketProgress[t.id]?.items || defaultSubtasks(t, f);
  const children = tickets.filter((x) => x.parentId === t.id);
  const pb = playbookFor(t);

  const update = (id: string, patch: Partial<ChecklistItem>) =>
    setProgressItems(t.id, items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const statusOf = (i: ChecklistItem): SubStatus => i.status || (i.done ? "done" : "todo");

  // roll-up: subtasks + promoted children (a promoted item counts via its child)
  const totalUnits = items.length;
  const doneUnits = items.reduce((a, i) => {
    if (i.linkedTicketId) { const c = tickets.find((x) => x.id === i.linkedTicketId); return a + (c && c.status === "Closed" ? 1 : 0); }
    return a + (statusOf(i) === "done" ? 1 : 0);
  }, 0);
  const pct = totalUnits ? Math.round((doneUnits / totalUnits) * 100) : 0;
  const c = pct === 100 ? "#22c55e" : "var(--acc)";

  const [adding, setAdding] = useState("");
  const [note, setNote] = useState("");
  const [alsoText, setAlsoText] = useState(true);
  const [menu, setMenu] = useState<string | null>(null);

  const add = () => { if (!adding.trim()) return; setProgressItems(t.id, [...items, { id: "k" + Date.now(), label: adding.trim(), done: false, status: "todo", assignee: null, linkedTicketId: null }]); setAdding(""); };
  const promote = (i: ChecklistItem) => { const id = spawnChildTicket(t.id, { title: i.label, type: t.type }); update(i.id, { linkedTicketId: id, status: "doing", done: false }); };
  const post = () => {
    if (!note.trim()) return;
    postProgress(t.id, note.trim(), pct);
    if (alsoText) sendTicketMessage(t.id, { audience: "Resident", channels: ["SMS"], text: note.trim() });
    setNote("");
  };

  return (
    <Glass style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <SectionLabel>Subtasks</SectionLabel>
        {pb && (
          <span title="Loaded from a category playbook" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em", color: "var(--acc-text)", background: "rgba(var(--acc-rgb),0.1)", border: "1px solid rgba(var(--acc-rgb),0.28)", padding: "2px 8px", borderRadius: 99 }}>
            <Icon name="book-open-check" size={11} color="var(--acc-text)" />PLAYBOOK · {pb.label.toUpperCase()}
          </span>
        )}
        <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{doneUnits}/{totalUnits} done{children.length ? " · " + children.length + " child" : ""}</span>
        <span style={{ marginLeft: "auto", fontFamily: SANS, fontWeight: 600, fontSize: 22, color: c, letterSpacing: "-0.5px" }}>{pct}<span style={{ fontSize: 13, color: "var(--ink-4)" }}>%</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ width: pct + "%", height: "100%", borderRadius: 99, background: c, boxShadow: "0 0 10px " + (pct === 100 ? "rgba(34,197,94,0.4)" : "rgba(var(--acc-rgb),0.4)"), transition: "width .35s ease" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
        {items.map((i) => {
          const st = statusOf(i);
          const sm = STATUS_META[st];
          const child = i.linkedTicketId ? tickets.find((x) => x.id === i.linkedTicketId) : null;
          return (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 7px", borderRadius: 9, position: "relative" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <button onClick={() => update(i.id, { status: nextStatus(st), done: nextStatus(st) === "done" })} title={sm.label}
                style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: st === "done" ? "#22c55e" : st === "doing" ? "rgba(var(--acc-rgb),0.14)" : "transparent", border: "1.5px solid " + (st === "done" ? "#22c55e" : st === "doing" ? "var(--acc)" : "var(--hair-strong)") }}>
                {st === "done" ? <Icon name="check" size={12} color="#0a0a0a" /> : st === "doing" ? <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--acc)" }} /> : null}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: SANS, fontSize: 12.5, color: st === "done" ? "var(--ink-4)" : "var(--ink-2)", textDecoration: st === "done" ? "line-through" : "none" }}>{i.label}</span>
                {child && (
                  <button onClick={() => openCommand(child.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8, padding: "1px 7px", borderRadius: 6, cursor: "pointer", background: "rgba(var(--acc-rgb),0.1)", border: "1px solid rgba(var(--acc-rgb),0.25)", fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "var(--acc-text)" }}>
                    <Icon name="git-branch" size={9} color="var(--acc-text)" />{child.id} · {child.status}
                  </button>
                )}
              </div>
              {/* owner */}
              <button onClick={() => setMenu(menu === i.id ? null : i.id)} style={{ display: "flex", alignItems: "center", padding: 2, borderRadius: 99, border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 }}>
                {i.assignee ? <Avatar person={i.assignee} size={20} /> : <span style={{ width: 20, height: 20, borderRadius: "50%", border: "1px dashed var(--hair-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="user-plus" size={11} color="var(--ink-4)" /></span>}
              </button>
              {!child && (
                <button onClick={() => promote(i)} title="Promote to a child ticket" style={{ display: "flex", padding: 4, borderRadius: 7, cursor: "pointer", background: "transparent", border: "1px solid transparent", flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-3)"; e.currentTarget.style.borderColor = "var(--hair-3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                  <Icon name="git-branch-plus" size={14} color="var(--ink-3)" />
                </button>
              )}
              <button onClick={() => setProgressItems(t.id, items.filter((x) => x.id !== i.id))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}><Icon name="x" size={12} color="var(--ink-5)" /></button>

              {menu === i.id && (
                <div style={{ position: "absolute", top: "calc(100% - 4px)", right: 30, zIndex: 30, padding: 5, borderRadius: 11, background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
                  <button onClick={() => { update(i.id, { assignee: null }); setMenu(null); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)" }}>Unassigned</button>
                  {OWNERS.map((p) => (
                    <button key={p} onClick={() => { update(i.id, { assignee: p }); setMenu(null); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <Avatar person={p} size={18} /><span style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-2)" }}>{PEOPLE[p].name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
        <input value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a subtask…  (e.g. open the wall · investigate riser)" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "8px 11px" }} />
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
