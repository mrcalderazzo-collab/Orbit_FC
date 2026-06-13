// Form primitives — Modal, Field, TextInput, Select, Textarea. Ported from ui.jsx.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./Icon";
import { MONO, SANS } from "./primitives";

export const inputStyle: CSSProperties = {
  fontFamily: SANS,
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--fill-2)",
  border: "1px solid var(--hair-strong)",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
  width: "100%",
};

export function Modal({
  open, onClose, title, sub, children, width = 560, footer,
}: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--scrim)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "7vh", animation: "orbit-fade .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width, maxWidth: "92vw", maxHeight: "84vh", display: "flex", flexDirection: "column", background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", borderRadius: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.6)", animation: "orbit-pop .22s cubic-bezier(.2,.8,.3,1)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 22px 14px", borderBottom: "1px solid var(--hair-2)" }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 18, color: "var(--ink)" }}>{title}</h3>
            {sub && <p style={{ margin: "5px 0 0", fontFamily: MONO, fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{sub}</p>}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--ink-4)", cursor: "pointer", padding: 4, display: "flex" }}>
            <Icon name="x" size={20} color="var(--ink-4)" />
          </button>
        </div>
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "14px 22px", borderTop: "1px solid var(--hair-2)", display: "flex", justifyContent: "flex-end", gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-3)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink-4)" }}>{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [f, setF] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setF(true); props.onFocus?.(e); }}
      onBlur={(e) => { setF(false); props.onBlur?.(e); }}
      style={{ ...inputStyle, borderColor: f ? "var(--acc)" : "var(--hair-strong)", boxShadow: f ? "0 0 0 3px rgba(var(--acc-rgb),0.08)" : "none", ...props.style }}
    />
  );
}

type Opt = string | { value: string; label: string };

export function Select({ options, value, onChange, style }: { options: Opt[]; value: string; onChange: (v: string) => void; style?: CSSProperties }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, appearance: "none", cursor: "pointer", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2371717a' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", ...style }}
    >
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return <option key={val} value={val} style={{ background: "var(--panel-solid)", color: "var(--ink)" }}>{label}</option>;
      })}
    </select>
  );
}
