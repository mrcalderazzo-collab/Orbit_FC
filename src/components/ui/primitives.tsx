// Shared Orbit primitives — glass panels, buttons, tags, avatars, stats.
// High-fidelity port of the prototype's ui.jsx, typed and themeable.
import { useState, type CSSProperties, type ReactNode } from "react";
import type { Person, Priority, TicketStatus } from "@/lib/types";
import { tint } from "@/lib/format";
import { PRIO_COLOR, STATUS_COLOR, statusLabel } from "@/lib/ticket";
import { PEOPLE } from "@/data/seed";
import { Icon } from "./Icon";

const MONO = "'JetBrains Mono', monospace";
const SANS = "Outfit, system-ui, sans-serif";

export function Glass({
  children, style, hover, accent = "var(--acc)", onClick, className = "",
}: { children: ReactNode; style?: CSSProperties; hover?: boolean; accent?: string; onClick?: () => void; className?: string }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className={"glass " + className}
      style={{
        background: "var(--panel)",
        backdropFilter: "blur(25px)",
        WebkitBackdropFilter: "blur(25px)",
        border: "1px solid var(--hair)",
        borderRadius: 20,
        borderLeft: hover ? "2px solid " + (h ? accent : "transparent") : "1px solid var(--hair)",
        transition: "border-color .2s, transform .15s, box-shadow .2s",
        cursor: onClick ? "pointer" : "default",
        boxShadow: h && onClick ? "0 0 24px rgba(0,0,0,0.4)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, color = "var(--ink-5)", style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return <p style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", color, margin: 0, fontFamily: MONO, ...style }}>{children}</p>;
}

export function Tag({ children, color = "var(--ink-2)", bg, style }: { children: ReactNode; color?: string; bg?: string; style?: CSSProperties }) {
  return <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color, background: bg || "var(--fill-3)", border: "1px solid " + (bg ? "transparent" : "var(--hair-3)"), padding: "3px 7px", borderRadius: 6, whiteSpace: "nowrap", ...style }}>{children}</span>;
}

export function StatusTag({ status }: { status: TicketStatus }) {
  const c = STATUS_COLOR[status] || "var(--ink-4)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: c, background: tint(c, 12), border: "1px solid " + tint(c, 28), padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: status === "In progress" ? "0 0 8px " + c : "none" }} />
      {statusLabel(status)}
    </span>
  );
}

export function PrioDot({ prio }: { prio: Priority }) {
  const c = PRIO_COLOR[prio];
  return (
    <span title={prio} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: c, boxShadow: prio === "Critical" ? "0 0 8px " + c : "none" }} />
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: c, textTransform: "uppercase" }}>{prio}</span>
    </span>
  );
}

export function Avatar({ person, size = 26, ring }: { person: string | Pick<Person, "name" | "initials" | "color">; size?: number; ring?: boolean }) {
  const p = typeof person === "string" ? PEOPLE[person] : person;
  if (!p) return null;
  return (
    <span title={p.name} style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: tint(p.color, 14), border: "1px solid " + (ring ? p.color : tint(p.color, 40)), color: p.color, fontFamily: MONO, fontWeight: 700, fontSize: size * 0.36, letterSpacing: "0.02em" }}>{p.initials}</span>
  );
}

export function Btn({
  children, onClick, primary, danger, ghost, small, disabled, icon, style,
}: { children: ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean; ghost?: boolean; small?: boolean; disabled?: boolean; icon?: string; style?: CSSProperties }) {
  const [h, setH] = useState(false);
  let bg = "var(--fill-3)", col = "var(--ink)", bd = "1px solid var(--hair-strong)", glow = "none";
  if (primary) { bg = "var(--acc)"; col = "var(--on-accent)"; bd = "1px solid var(--acc)"; glow = h ? "0 0 24px rgba(var(--acc-rgb),0.4)" : "0 0 12px rgba(var(--acc-rgb),0.2)"; }
  if (danger) { bg = h ? "#ef4444" : "rgba(239,68,68,0.12)"; col = h ? "#ffffff" : "#ef4444"; bd = "1px solid #ef444455"; }
  if (ghost) { bg = "transparent"; bd = "1px solid transparent"; col = "var(--ink-2)"; }
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: SANS, fontWeight: 900, fontSize: small ? 11 : 13, textTransform: "uppercase", letterSpacing: "-0.2px", padding: small ? "6px 12px" : "9px 18px", borderRadius: 99, background: bg, color: col, border: bd, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, boxShadow: glow, transform: h && !disabled ? "scale(1.04)" : "scale(1)", transition: "all .15s", whiteSpace: "nowrap", ...style }}
    >
      {icon && <Icon name={icon} size={small ? 13 : 15} color={col} />}
      {children}
    </button>
  );
}

export function Stat({ label, value, sub, color = "var(--ink)", accent }: { label: string; value: ReactNode; sub?: ReactNode; color?: string; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)" }}>{label}</span>
      <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color, lineHeight: 1, letterSpacing: "-0.5px" }}>{value}</span>
      {sub && <span style={{ fontFamily: MONO, fontSize: 9, color: accent || "var(--ink-4)", letterSpacing: "0.05em" }}>{sub}</span>}
    </div>
  );
}

export function Empty({ label, icon = "inbox" }: { label: string; icon?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 0", color: "var(--ink-5)" }}>
      <Icon name={icon} size={34} color="var(--ink-5)" />
      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</span>
      <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", textAlign: "right" }}>{v}</span>
    </div>
  );
}

export { MONO, SANS };
