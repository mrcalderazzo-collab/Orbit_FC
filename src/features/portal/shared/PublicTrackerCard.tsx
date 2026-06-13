// PublicTrackerCard — an expandable card that shows a ticket the way the
// requester sees it: status + the public stage timeline (f.updates), never the
// internal log, cost, or vendor coordination. Shared by the board Activity tab
// and the resident My Requests tab so external personas get one consistent,
// safe view of progress.
import { useState } from "react";
import type { Ticket, TicketFlow } from "@/lib/types";
import { ticketFlow, FLOW_STAGES } from "@/data/flow";
import { Glass, Icon, SectionLabel, StatusTag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function PublicTrackerCard({ t, defaultOpen = false }: { t: Ticket; defaultOpen?: boolean }) {
  const f = ticketFlow(t);
  const [open, setOpen] = useState(defaultOpen);
  const cur = f.updates[f.updates.length - 1];
  return (
    <Glass style={{ padding: 0, overflow: "hidden" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em" }}>{t.id}</span>
            <StatusTag status={t.status} />
          </div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{t.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Icon name="clock" size={13} color="var(--acc-text)" />
            <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>{cur.text}</span>
          </div>
        </div>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color="var(--ink-4)" />
      </button>
      {open && <Timeline f={f} />}
    </Glass>
  );
}

function Timeline({ f }: { f: TicketFlow }) {
  return (
    <div style={{ padding: "4px 18px 16px", borderTop: "1px solid var(--hair-2)" }}>
      <SectionLabel style={{ margin: "14px 0 12px" }}>Progress</SectionLabel>
      {f.updates.map((u, i) => {
        const st = FLOW_STAGES.find((s) => s.key === u.stage) || { label: u.stage, icon: "circle" };
        const last = i === f.updates.length - 1;
        return (
          <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: last ? "rgba(var(--acc-rgb),0.15)" : "rgba(34,197,94,0.12)", border: "1px solid " + (last ? "rgba(var(--acc-rgb),0.5)" : "rgba(34,197,94,0.3)") }}>
                <Icon name={last ? st.icon : "check"} size={13} color={last ? "var(--acc)" : "#22c55e"} />
              </div>
              {i < f.updates.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: "rgba(34,197,94,0.3)" }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 2 }}>
              <div style={{ fontFamily: SANS, fontSize: 13, color: last ? "var(--ink)" : "var(--ink-2)", fontWeight: last ? 600 : 400 }}>{st.label}</div>
              <div style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.45, marginTop: 2 }}>{u.text}</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginTop: 4 }}>{u.ts.replace("T", " · ")}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
