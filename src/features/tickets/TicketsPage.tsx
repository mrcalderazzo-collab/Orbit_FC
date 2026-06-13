// TicketsPage — search + filters (status/type/building/vendor/approval), four
// views, New Ticket modal, and the full-screen Ticket Command workspace.
import { useMemo, useState } from "react";
import type { TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { ticketApproval, ticketVendorName, type ApprovalState } from "@/lib/ticket";
import { ticketFlow } from "@/data/flow";
import { BUILDINGS, TICKET_STATUS, TICKET_TYPES } from "@/data/seed";
import { Btn, Icon, inputStyle, Select } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";
import { TicketBoard, TicketCards, TicketList, TicketQueue } from "./views";
import { FocusBoard } from "./FocusBoard";
import { NewIntakeWizard } from "@/features/intake/NewIntakeWizard";

const MONO = "'JetBrains Mono', monospace";

const APPROVAL_OPTS = [
  { value: "All", label: "All approvals" },
  { value: "awaiting", label: "Awaiting votes" },
  { value: "approved", label: "Vote approved" },
  { value: "review", label: "Awaiting review" },
  { value: "pm", label: "PM authority" },
];
const VIEWS: [string, string][] = [["focus", "target"], ["queue", "list-tree"], ["list", "list"], ["cards", "layout-grid"], ["board", "columns-3"]];

export function TicketsPage() {
  const { tickets, openCommand } = useOrbit();
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("All");
  const [fType, setFType] = useState("All");
  const [fBuilding, setFBuilding] = useState("All");
  const [fVendor, setFVendor] = useState("All");
  const [fApproval, setFApproval] = useState("All");
  const [view, setView] = useState("queue");
  const [creating, setCreating] = useState(false);

  const flowMap = useMemo(() => {
    const m: Record<string, TicketFlow> = {};
    tickets.forEach((t) => { m[t.id] = ticketFlow(t); });
    return m;
  }, [tickets]);

  const vendorOptions = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => { const v = ticketVendorName(t, flowMap[t.id]); if (v) set.add(v); });
    return [...set].sort();
  }, [tickets, flowMap]);

  const filtered = tickets.filter((t) => {
    const f = flowMap[t.id];
    if (t.mergedInto) return false; // duplicates folded into their canonical ticket
    if (fStatus !== "All" && t.status !== fStatus) return false;
    if (fType !== "All" && t.type !== fType) return false;
    if (fBuilding !== "All" && t.building !== fBuilding) return false;
    if (fVendor !== "All" && ticketVendorName(t, f) !== fVendor) return false;
    if (fApproval !== "All" && ticketApproval(t, f) !== (fApproval as ApprovalState)) return false;
    if (q && !(t.title + t.id).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const active = tickets.filter((t) => t.status !== "Closed").length;
  const critical = tickets.filter((t) => t.prio === "Critical" && t.status !== "Closed").length;
  const anyFilter = fStatus !== "All" || fType !== "All" || fBuilding !== "All" || fVendor !== "All" || fApproval !== "All" || q;
  const clearAll = () => { setQ(""); setFStatus("All"); setFType("All"); setFBuilding("All"); setFVendor("All"); setFApproval("All"); };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Work Tickets" sub={active + " active · " + critical + " critical"}
        right={<Btn primary icon="plus" onClick={() => setCreating(true)}>New Intake</Btn>} />

      <div style={{ padding: "16px 28px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid var(--hair-2)" }}>
        <div style={{ position: "relative", flex: "0 0 220px" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Icon name="search" size={15} color="var(--ink-4)" /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets…" style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <Select options={["All", ...TICKET_STATUS]} value={fStatus} onChange={setFStatus} style={{ width: 138 }} />
        <Select options={["All", ...TICKET_TYPES]} value={fType} onChange={setFType} style={{ width: 138 }} />
        <Select options={[{ value: "All", label: "All buildings" }, ...BUILDINGS.map((b) => ({ value: b.id, label: b.name }))]} value={fBuilding} onChange={setFBuilding} style={{ width: 158 }} />
        <Select options={[{ value: "All", label: "All vendors" }, ...vendorOptions.map((v) => ({ value: v, label: v }))]} value={fVendor} onChange={setFVendor} style={{ width: 160 }} />
        <Select options={APPROVAL_OPTS} value={fApproval} onChange={setFApproval} style={{ width: 150 }} />
        {anyFilter && (
          <button onClick={clearAll} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 11px", borderRadius: 9, cursor: "pointer", background: "transparent", border: "1px solid var(--hair-3)", color: "var(--ink-3)", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em" }}>
            <Icon name="x" size={12} color="var(--ink-3)" />CLEAR
          </button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
          {VIEWS.map(([v, ic]) => (
            <button key={v} onClick={() => setView(v)} style={{ display: "flex", padding: "6px 9px", borderRadius: 7, border: "none", cursor: "pointer", background: view === v ? "rgba(var(--acc-rgb),0.12)" : "transparent" }}>
              <Icon name={ic} size={15} color={view === v ? "var(--acc)" : "var(--ink-3)"} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px 28px", minHeight: 0 }}>
        {view === "focus" && <FocusBoard tickets={filtered} flowMap={flowMap} onOpen={openCommand} />}
        {view === "queue" && <TicketQueue tickets={filtered} onOpen={openCommand} flowMap={flowMap} />}
        {view === "list" && <TicketList tickets={filtered} onOpen={openCommand} flowMap={flowMap} />}
        {view === "cards" && <TicketCards tickets={filtered} onOpen={openCommand} />}
        {view === "board" && <TicketBoard tickets={filtered} onOpen={openCommand} />}
      </div>

      {creating && <NewIntakeWizard onClose={() => setCreating(false)} />}
    </div>
  );
}
