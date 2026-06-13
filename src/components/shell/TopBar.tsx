// TopBar — page title + telemetry pill + theme switcher. Mirrors Shell.jsx.
import type { ReactNode } from "react";
import { useOrbit, type ThemeName } from "@/store/OrbitProvider";
import { portfolioTotals } from "@/data/seed";
import { Icon } from "@/components/ui";
import { NotificationBell } from "./NotificationBell";

const MONO = "'JetBrains Mono', monospace";
const SANS = "Outfit, sans-serif";

const THEMES: { key: ThemeName; icon: string; label: string }[] = [
  { key: "dark", icon: "moon", label: "Dark" },
  { key: "light", icon: "sun", label: "Light" },
  { key: "clear", icon: "droplet", label: "Clear" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useOrbit();
  return (
    <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-07, var(--hair-2))" }}>
      {THEMES.map((t) => {
        const on = theme === t.key;
        return (
          <button key={t.key} onClick={() => setTheme(t.key)} title={t.label}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: on ? "rgba(var(--acc-rgb),0.14)" : "transparent" }}>
            <Icon name={t.icon} size={14} color={on ? "var(--acc-text)" : "var(--ink-4)"} />
          </button>
        );
      })}
    </div>
  );
}

export function TopBar({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  const t = portfolioTotals();
  const { nav, openCommand } = useOrbit();
  return (
    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, padding: "22px 28px 18px", borderBottom: "1px solid var(--hair-2)" }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 26, color: "var(--ink)", letterSpacing: "-0.5px" }}>{title}</h1>
        {sub && <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>{sub}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {right}
        <NotificationBell onNavigate={(n) => { if (n.ref?.page === "tickets" && n.ref.id) openCommand(n.ref.id); else if (n.ref?.page) nav(n.ref.page); }} />
        <ThemeSwitcher />
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "8px 16px", borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
          {([["NODES", t.buildings + " BLDG"], ["UNITS", t.units], ["UPLINK", "SECURE"]] as const).map(([l, v], i) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)" }}>{l}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: i === 2 ? "#22c55e" : "var(--ink)", letterSpacing: "0.05em" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function Toast() {
  const { toast } = useOrbit();
  if (!toast) return null;
  const c = toast.kind === "err" ? "#ef4444" : "var(--acc)";
  return (
    <div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 300, display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderRadius: 99, background: "var(--panel-solid)", border: "1px solid " + c + "55", boxShadow: "0 0 30px " + c + "22, 0 12px 30px rgba(0,0,0,0.5)", animation: "orbit-toast .25s cubic-bezier(.2,.8,.3,1)" }}>
      <Icon name="circle-check-big" size={16} color={c} />
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "var(--ink)" }}>{toast.msg}</span>
    </div>
  );
}
