// LinkMergeModal — relate two tickets (Link) or fold a duplicate into a
// canonical one (Merge). Merge closes the source and points it at the target;
// the queue then hides the duplicate.
import { useMemo, useState } from "react";
import type { Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS } from "@/data/seed";
import { Btn, Icon, inputStyle, Modal, PrioDot, StatusTag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function LinkMergeModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const { tickets, linkTickets, mergeTickets } = useOrbit();
  const [mode, setMode] = useState<"link" | "merge">("link");
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string | null>(null);

  const candidates = useMemo(
    () => tickets.filter((t) => t.id !== ticket.id && !t.mergedInto && t.id !== ticket.parentId),
    [tickets, ticket],
  );
  const list = candidates
    .filter((t) => !q || (t.title + t.id).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.building === ticket.building) - Number(a.building === ticket.building))
    .slice(0, 8);

  const apply = () => {
    if (!pick) return;
    if (mode === "link") linkTickets(ticket.id, pick);
    else mergeTickets(ticket.id, pick); // THIS ticket is the duplicate folded into the target
    onClose();
  };

  return (
    <Modal open onClose={onClose} width={580} title="Link or merge ticket" sub={ticket.id + " · " + ticket.title}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><Btn primary danger={mode === "merge"} icon={mode === "merge" ? "git-merge" : "link"} disabled={!pick} onClick={apply}>{mode === "merge" ? "Merge as duplicate" : "Link tickets"}</Btn></>}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([["link", "link", "Link", "Relate them — both stay open"], ["merge", "git-merge", "Merge duplicate", "Fold THIS into the one you pick"]] as const).map(([k, ic, label, sub]) => {
          const on = mode === k;
          return (
            <button key={k} onClick={() => setMode(k)} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "11px 13px", borderRadius: 12, cursor: "pointer", textAlign: "left", background: on ? (k === "merge" ? "rgba(239,68,68,0.08)" : "rgba(var(--acc-rgb),0.1)") : "var(--fill-1)", border: "1px solid " + (on ? (k === "merge" ? "rgba(239,68,68,0.4)" : "rgba(var(--acc-rgb),0.45)") : "var(--hair-2)") }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Icon name={ic} size={15} color={on ? (k === "merge" ? "#ef4444" : "var(--acc-text)") : "var(--ink-3)"} /><span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: on ? "var(--ink)" : "var(--ink-2)" }}>{label}</span></span>
              <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{sub}</span>
            </button>
          );
        })}
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Icon name="search" size={15} color="var(--ink-4)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === "merge" ? "Find the canonical ticket to merge into…" : "Find a ticket to link…"} style={{ ...inputStyle, paddingLeft: 36 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
        {list.map((t) => {
          const b = BUILDINGS.find((x) => x.id === t.building)!;
          const on = pick === t.id;
          return (
            <button key={t.id} onClick={() => setPick(t.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 11, cursor: "pointer", textAlign: "left", background: on ? "rgba(var(--acc-rgb),0.08)" : "var(--fill-1)", border: "1px solid " + (on ? "rgba(var(--acc-rgb),0.45)" : "var(--hair-2)") }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--ink-3)", width: 50, flexShrink: 0 }}>{t.id}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: b.mono }}>{b.name}</div>
              </div>
              <PrioDot prio={t.prio} />
              <StatusTag status={t.status} />
              {on && <Icon name="check" size={16} color="var(--acc-text)" />}
            </button>
          );
        })}
        {!list.length && <div style={{ padding: "24px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)", letterSpacing: "0.08em" }}>NO MATCHES</div>}
      </div>
    </Modal>
  );
}
