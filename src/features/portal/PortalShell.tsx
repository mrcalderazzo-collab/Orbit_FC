// PortalShell — the external-persona chrome (board / resident / vendor). One
// shell, persona-tinted, with a scoped tab bar, theme switcher, and an account
// menu to jump back to the Orbit team (operator) or sign out. Deliberately
// distinct from the operator Sidebar: external users never see internal nav.
import { useState, type ReactNode } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { PERSONA_META, USERS, userPerson } from "@/data/identity";
import { Avatar, Icon } from "@/components/ui";
import { OrbitWordmark } from "@/components/shell/Wordmark";
import { ThemeSwitcher } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export interface PortalTab {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export function PortalShell({
  accent, tabs, active, onSelect, children,
}: {
  accent: string;
  tabs: PortalTab[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  const { currentUser } = useOrbit();
  if (!currentUser) return null;
  const p = userPerson(currentUser);
  const meta = PERSONA_META[currentUser.persona];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", minHeight: 0 }}>
      {/* top bar */}
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 24px", borderBottom: "1px solid var(--hair-2)", flexShrink: 0, background: "var(--sidebar-bg)", backdropFilter: "blur(25px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <OrbitWordmark />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 99, background: accent + "1a", border: "1px solid " + accent + "44" }}>
            <Icon name={meta.icon} size={12} color={accent} />
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent }}>{meta.label} portal</span>
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <ThemeSwitcher />
          <AccountMenu accent={accent} />
        </div>
      </header>

      {/* tab bar */}
      <nav style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 18px", borderBottom: "1px solid var(--hair-2)", flexShrink: 0, overflowX: "auto" }} className="no-scrollbar">
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button key={t.id} onClick={() => onSelect(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: on ? accent + "1a" : "transparent", color: on ? "var(--ink)" : "var(--ink-3)", transition: "all .15s" }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--fill-2)"; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
              <Icon name={t.icon} size={16} color={on ? accent : "var(--ink-4)"} />
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: on ? 600 : 400 }}>{t.label}</span>
              {t.badge ? (
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: on ? accent : "var(--ink-3)", background: on ? accent + "22" : "var(--hair)", borderRadius: 99, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>{t.badge}</span>
              ) : null}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, paddingRight: 4 }}>
          <Avatar person={p!} size={24} />
          <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.role}</span>
        </span>
      </nav>

      {/* content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "26px 24px 60px", minHeight: "100%", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function AccountMenu({ accent }: { accent: string }) {
  const { currentUser, login, logout } = useOrbit();
  const [open, setOpen] = useState(false);
  if (!currentUser) return null;
  const p = userPerson(currentUser);
  const operators = USERS.filter((u) => u.persona === "operator");

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px 6px 7px", borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-3)", cursor: "pointer" }}>
        <Avatar person={p!} size={28} ring />
        <div style={{ textAlign: "left", maxWidth: 150 }}>
          <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.06em", color: accent, textTransform: "uppercase" }}>{currentUser.scope.split("·")[0].trim()}</div>
        </div>
        <Icon name="chevrons-up-down" size={13} color="var(--ink-4)" />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, minWidth: 250, background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", borderRadius: 14, padding: 6, boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "8px 9px", display: "flex", alignItems: "center", gap: 9 }}>
              <Avatar person={p!} size={32} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{p?.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{currentUser.scope}</div>
              </div>
            </div>
            <div style={{ height: 1, background: "var(--hair-2)", margin: "5px 4px" }} />
            <div style={{ padding: "6px 9px 4px", fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: "var(--ink-4)" }}>RETURN TO ORBIT TEAM</div>
            {operators.map((u) => {
              const up = userPerson(u);
              return (
                <button key={u.id} onClick={() => { login(u.id); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <Avatar person={up!} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{up!.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{u.title}</div>
                  </div>
                  <Icon name="corner-up-left" size={13} color="var(--ink-4)" />
                </button>
              );
            })}
            <div style={{ height: 1, background: "var(--hair-2)", margin: "5px 4px" }} />
            <button onClick={() => { logout(); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", textAlign: "left", color: "#ef4444" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-3)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Icon name="log-out" size={15} color="#ef4444" />
              <span style={{ fontFamily: SANS, fontSize: 12.5 }}>Sign out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
