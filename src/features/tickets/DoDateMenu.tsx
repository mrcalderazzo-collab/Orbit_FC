// DoDateMenu — set the operator's personal "do date" (when they plan to work a
// ticket). ClickUp-style and deliberately distinct from the SLA / predicted
// completion. Shows the current do-date as a chip; the menu offers quick picks.
import { useEffect, useRef, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { addDaysISO, doDateLabel, todayISO } from "@/lib/focus";
import { Icon } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function DoDateMenu({ id, date, compact }: { id: string; date?: string | null; compact?: boolean }) {
  const { setWorkDate } = useOrbit();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const label = doDateLabel(date);
  const today = todayISO();
  const overdue = !!date && date < today;
  const isToday = date === today;
  const c = overdue ? "#ef4444" : isToday ? "var(--acc-text)" : date ? "#a855f7" : "var(--ink-4)";

  const opts: [string, string | null][] = [
    ["Today", today],
    ["Tomorrow", addDaysISO(1)],
    ["In 3 days", addDaysISO(3)],
    ["Next week", addDaysISO(7)],
    ["Clear do-date", null],
  ];

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {!compact && <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", marginBottom: 5 }}>DO DATE</div>}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        title="Set your do-date (when you plan to work this)"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: compact ? "4px 9px" : "6px 11px", borderRadius: 99, cursor: "pointer", background: date ? `color-mix(in srgb, ${c} 12%, transparent)` : "var(--fill-2)", border: "1px solid " + (date ? `color-mix(in srgb, ${c} 32%, transparent)` : "var(--hair-3)"), color: date ? c : "var(--ink-3)", fontFamily: MONO, fontSize: compact ? 9 : 10, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}
      >
        <Icon name="calendar-clock" size={compact ? 11 : 13} color={date ? c : "var(--ink-4)"} />
        {label || "SET DO-DATE"}
        <Icon name="chevron-down" size={compact ? 10 : 12} color={date ? c : "var(--ink-4)"} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60, minWidth: 170, padding: 6, borderRadius: 12, background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", padding: "6px 8px" }}>WORK ON…</div>
          {opts.map(([lbl, val]) => {
            const on = (val ?? null) === (date ?? null);
            const clear = val === null;
            return (
              <button key={lbl} onClick={(e) => { e.stopPropagation(); setWorkDate(id, val); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 9, border: "none", cursor: "pointer", background: on ? "rgba(var(--acc-rgb),0.08)" : "transparent", textAlign: "left" }}
                onMouseEnter={(ev) => { if (!on) ev.currentTarget.style.background = "var(--fill-2)"; }}
                onMouseLeave={(ev) => { if (!on) ev.currentTarget.style.background = "transparent"; }}>
                <Icon name={clear ? "x" : "calendar"} size={13} color={clear ? "var(--ink-4)" : "var(--acc-text)"} />
                <span style={{ flex: 1, fontFamily: SANS, fontSize: 12.5, color: clear ? "var(--ink-3)" : "var(--ink-2)" }}>{lbl}</span>
                {on && <Icon name="check" size={13} color="var(--acc-text)" />}
              </button>
            );
          })}
          <div style={{ borderTop: "1px solid var(--hair-2)", margin: "5px 4px 2px", padding: "6px 6px 2px", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="info" size={11} color="var(--ink-5)" />
            <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-5)", lineHeight: 1.4 }}>WHEN YOU'LL WORK IT — NOT THE SLA / ETA</span>
          </div>
        </div>
      )}
    </div>
  );
}
