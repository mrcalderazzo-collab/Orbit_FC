// TicketCommand — full-screen operator workspace (not a modal). Header with
// status mover + SLA, the Uber-style stage tracker (conditional Board Vote),
// then six tabs. Mirrors TicketFlow.jsx.
import { useEffect, useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { moneyFull } from "@/lib/format";
import { slaState } from "@/lib/ticket";
import { ticketFlow, STAGE_INDEX } from "@/data/flow";
import { BUILDINGS } from "@/data/seed";
import { Icon, PrioDot, Tag } from "@/components/ui";
import { CommsDock } from "@/features/comms/CommsDock";
import { CloseOutModal } from "./CloseOutModal";
import { DoDateMenu } from "../DoDateMenu";
import { SlaChip, StageTracker, StageSummary, TicketStatusMenu } from "./workspaceParts";
import { categoryByKey } from "@/data/taxonomy";
import { Overview } from "./tabs/Overview";
import { Intake } from "./tabs/Intake";
import { BidsVote } from "./tabs/BidsVote";
import { VendorSchedule } from "./tabs/VendorSchedule";
import { Communications } from "./tabs/Communications";
import { Activity } from "./tabs/Activity";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const TABS: [string, string, string][] = [
  ["overview", "Overview", "layout-dashboard"],
  ["intake", "Intake", "inbox"],
  ["sourcing", "Bids & Vote", "vote"],
  ["vendor", "Vendor & Work Order", "clipboard-list"],
  ["comms", "Communications", "messages-square"],
  ["activity", "Activity", "history"],
];

export function TicketCommand({ id, onClose }: { id: string; onClose: () => void }) {
  const { tickets, ticketComments, ticketMessages, openCommand, escalateTicket } = useOrbit();
  const t = tickets.find((x) => x.id === id);
  const [tab, setTab] = useState("overview");
  const [dock, setDock] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const f = useMemo(() => (t ? ticketFlow(t) : null), [t?.id, t?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!t || !f) return null;
  const b = BUILDINGS.find((x) => x.id === t.building)!;
  const cat = t.category ? categoryByKey(t.category) : undefined;
  const loc = t.intake?.location?.label;
  const commCount = (ticketComments[t.id] || []).length + (ticketMessages[t.id] || []).length;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--scrim)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", flexDirection: "column", padding: "28px 32px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 22, overflow: "hidden", background: "var(--panel-solid)", border: "1px solid var(--hair-3)", boxShadow: "0 40px 120px rgba(0,0,0,0.5)" }}>
        {/* header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--hair-2)", display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7, flexWrap: "wrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--acc-text)", letterSpacing: "0.06em" }}>{t.id}</span>
              <PrioDot prio={t.prio} />
              <Tag>{t.type}</Tag>
              {f.requiresVote && <Tag color="#a855f7" bg="rgba(168,85,247,0.12)">BOARD VOTE</Tag>}
              {t.parentId && (
                <button onClick={() => openCommand(t.parentId!)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  <Tag color="var(--acc-text)" bg="rgba(var(--acc-rgb),0.1)">↳ SUBTASK OF {t.parentId}</Tag>
                </button>
              )}
              {t.mergedInto && (
                <button onClick={() => openCommand(t.mergedInto!)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  <Tag color="#ef4444" bg="rgba(239,68,68,0.12)">MERGED → {t.mergedInto}</Tag>
                </button>
              )}
              {t.verified && <Tag color="#22c55e" bg="rgba(34,197,94,0.12)">⛓ CHAIN-VERIFIED</Tag>}
            </div>
            <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, color: "var(--ink)", lineHeight: 1.2 }}>{t.title}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: b.mono }} />
              <span style={{ fontFamily: MONO, fontSize: 11, color: b.mono }}>{b.name}</span>
              {cat && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: cat.color, background: `color-mix(in srgb, ${cat.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${cat.color} 30%, transparent)`, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase" }}><Icon name={cat.icon} size={11} color={cat.color} />{cat.label}</span>}
              {loc && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 11, color: "var(--ink-3)" }}><Icon name="map-pin" size={11} color="var(--ink-4)" />{loc}</span>}
              <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--ink-4)" }}>· est. {moneyFull(f.estimate)} · requested by {t.requester}</span>
            </div>
          </div>
          <TicketStatusMenu t={t} />
          <div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", marginBottom: 5 }}>NEXT TOUCH</div><DoDateMenu id={t.id} date={t.workDate} compact /></div>
          <SlaChip f={f} />
          {slaState(f).level !== "ok" && t.prio !== "Critical" && (
            <button onClick={() => escalateTicket(t.id)} title="Escalate — SLA at risk" style={{ display: "flex", alignItems: "center", gap: 6, height: 34, marginTop: 13, padding: "0 13px", borderRadius: 99, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", flexShrink: 0, fontFamily: "Outfit, sans-serif", fontSize: 12, fontWeight: 600 }}>
              <Icon name="trending-up" size={15} color="#ef4444" />Escalate
            </button>
          )}
          {t.status !== "Closed" && f.stageIndex >= STAGE_INDEX.review && (
            <button onClick={() => setClosing(true)} title="Close out — checklist" style={{ display: "flex", alignItems: "center", gap: 6, height: 34, marginTop: 13, padding: "0 13px", borderRadius: 99, border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.1)", color: "#22c55e", cursor: "pointer", flexShrink: 0, fontFamily: "Outfit, sans-serif", fontSize: 12, fontWeight: 600 }}>
              <Icon name="shield-check" size={15} color="#22c55e" />Close out
            </button>
          )}
          <button onClick={() => setDock((d) => !d)} title="Open communications" style={{ display: "flex", alignItems: "center", gap: 7, height: 34, padding: "0 13px", marginTop: 13, borderRadius: 99, border: "1px solid " + (dock ? "rgba(var(--acc-rgb),0.45)" : "var(--hair-3)"), background: dock ? "rgba(var(--acc-rgb),0.12)" : "var(--fill-2)", cursor: "pointer", flexShrink: 0 }}>
            <Icon name="messages-square" size={16} color={dock ? "var(--acc-text)" : "var(--ink-2)"} />
            <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: dock ? "var(--ink)" : "var(--ink-2)" }}>Message</span>
          </button>
          <button onClick={onClose} style={{ width: 34, height: 34, marginTop: 13, borderRadius: 9, border: "1px solid var(--hair-3)", background: "var(--fill-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="x" size={17} color="var(--ink-2)" />
          </button>
        </div>

        {/* stage tracker + plain-english summary */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--hair-2)", background: "var(--fill-1)" }}>
          <StageTracker f={f} />
          <StageSummary f={f} onTab={setTab} />
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 2, padding: "0 18px", borderBottom: "1px solid var(--hair-2)", flexShrink: 0, overflowX: "auto" }} className="no-scrollbar">
          {TABS.map(([k, lbl, ic]) => {
            const on = tab === k;
            const badge = k === "sourcing" && f.bids.length ? f.bids.length : k === "comms" && commCount ? commCount : null;
            return (
              <button key={k} onClick={() => setTab(k)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "13px 14px", background: "none", border: "none", borderBottom: "2px solid " + (on ? "var(--acc)" : "transparent"), cursor: "pointer", color: on ? "var(--ink)" : "var(--ink-3)", fontFamily: SANS, fontSize: 13, fontWeight: on ? 600 : 400, whiteSpace: "nowrap" }}>
                <Icon name={ic} size={15} color={on ? "var(--acc)" : "var(--ink-3)"} />{lbl}
                {badge && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: on ? "var(--acc-text)" : "var(--ink-3)", background: "var(--fill-3)", borderRadius: 99, padding: "1px 6px" }}>{badge}</span>}
              </button>
            );
          })}
        </div>

        {/* body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "22px 24px" }}>
          {tab === "overview" && <Overview t={t} b={b} f={f} onTab={setTab} />}
          {tab === "intake" && <Intake t={t} f={f} />}
          {tab === "sourcing" && <BidsVote t={t} f={f} />}
          {tab === "vendor" && <VendorSchedule t={t} f={f} />}
          {tab === "comms" && <Communications t={t} b={b} f={f} />}
          {tab === "activity" && <Activity t={t} />}
        </div>

        <CommsDock t={t} f={f} open={dock} onClose={() => setDock(false)} />
      </div>
      {closing && <CloseOutModal t={t} f={f} onClose={() => setClosing(false)} />}
    </div>
  );
}
