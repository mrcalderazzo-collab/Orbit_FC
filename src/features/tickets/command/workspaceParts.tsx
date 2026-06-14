// Workspace header parts: status mover menu, SLA chip, Uber-style stage tracker.
import { useEffect, useRef, useState } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { STATUS_COLOR, statusLabel } from "@/lib/ticket";
import { tint } from "@/lib/format";
import { TICKET_STATUS } from "@/data/seed";
import { FLOW_STAGES } from "@/data/flow";
import { Icon } from "@/components/ui";

const MONO = "'JetBrains Mono', monospace";
const SANS = "Outfit, sans-serif";

export function TicketStatusMenu({ t }: { t: Ticket }) {
  const { setTicketStatus } = useOrbit();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const c = STATUS_COLOR[t.status] || "var(--ink-4)";
  const idx = TICKET_STATUS.indexOf(t.status);
  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", marginBottom: 5 }}>STATUS</div>
      <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 11px", borderRadius: 99, cursor: "pointer", background: tint(c, 12), border: "1px solid " + tint(c, 34), fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", color: c, textTransform: "uppercase", whiteSpace: "nowrap" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, boxShadow: t.status === "In progress" ? "0 0 8px " + c : "none" }} />
        {statusLabel(t.status)}
        <Icon name="chevrons-up-down" size={13} color={c} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, minWidth: 210, padding: 6, borderRadius: 14, background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: "var(--ink-4)", padding: "6px 8px 7px" }}>MOVE TICKET TO</div>
          {TICKET_STATUS.map((s, i) => {
            const sc = STATUS_COLOR[s];
            const cur = s === t.status;
            return (
              <button key={s} onClick={() => { setTicketStatus(t.id, s); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 9, border: "none", cursor: "pointer", background: cur ? tint(sc, 10) : "transparent", textAlign: "left" }}
                onMouseEnter={(e) => { if (!cur) e.currentTarget.style.background = "var(--fill-2)"; }}
                onMouseLeave={(e) => { if (!cur) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc, flexShrink: 0 }} />
                <span style={{ fontFamily: SANS, fontSize: 12.5, color: cur ? "var(--ink)" : "var(--ink-2)", fontWeight: cur ? 600 : 400, flex: 1 }}>{statusLabel(s)}</span>
                {i < idx && <Icon name="check" size={12} color="#22c55e" />}
                {cur && <span style={{ fontFamily: MONO, fontSize: 8, color: sc, letterSpacing: "0.1em" }}>● NOW</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SlaChip({ f }: { f: TicketFlow }) {
  const c = f.sla.breached ? "#ef4444" : f.sla.pct > 70 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ flexShrink: 0, textAlign: "right" }}>
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", marginBottom: 5 }}>SLA</div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 64, height: 5, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}>
          <div style={{ width: f.sla.pct + "%", height: "100%", background: c, boxShadow: "0 0 8px " + c + "66" }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: c }}>{f.sla.breached ? "BREACHED" : f.sla.hrs - f.sla.elapsed + "h"}</span>
      </div>
    </div>
  );
}

export function StageTracker({ f }: { f: TicketFlow }) {
  const visible = FLOW_STAGES.filter((s) => !(s.key === "vote" && !f.requiresVote));
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
      {visible.map((s, i) => {
        const realIdx = FLOW_STAGES.findIndex((x) => x.key === s.key);
        const done = realIdx < f.stageIndex;
        const cur = realIdx === f.stageIndex;
        const c = cur ? "var(--acc)" : done ? "#22c55e" : "var(--ink-5)";
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "flex-start", flex: i < visible.length - 1 ? 1 : "0 0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0, width: 88 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: cur ? "rgba(var(--acc-rgb),0.14)" : done ? "rgba(34,197,94,0.12)" : "var(--fill-2)", border: "1.5px solid " + (cur ? "var(--acc)" : done ? "#22c55e" : "var(--hair-3)"), boxShadow: cur ? "0 0 16px rgba(var(--acc-rgb),0.35)" : "none" }}>
                <Icon name={done ? "check" : s.icon} size={17} color={c} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: cur ? "var(--ink)" : done ? "var(--ink-2)" : "var(--ink-4)", textTransform: "uppercase" }}>{s.label}</div>
                {cur && <div style={{ fontFamily: MONO, fontSize: 8, color: "var(--acc-text)", marginTop: 3, letterSpacing: "0.08em" }}>● CURRENT</div>}
              </div>
            </div>
            {i < visible.length - 1 && (
              <div style={{ flex: 1, height: 2, marginTop: 18, minWidth: 14, borderRadius: 2, background: done ? "#22c55e" : "var(--hair-3)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
