// Sidebar — permission-filtered nav, account widget with View-as (impersonate),
// and the audit-chain strip. Mirrors Shell.jsx.
import { useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { canSee, PERSONA_META, USERS, userPerson } from "@/data/identity";
import { Avatar, Icon, SectionLabel } from "@/components/ui";
import { OrbitWordmark } from "./Wordmark";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const NAV: { sec: string; items: { id: string; label: string; icon: string; badge?: "open" | "recs" | "emg" }[] }[] = [
  { sec: "Command", items: [
    { id: "dashboard", label: "Command Deck", icon: "layout-dashboard" },
    { id: "emergencies", label: "Emergency Desk", icon: "siren", badge: "emg" },
    { id: "ai", label: "AI Review", icon: "brain-circuit", badge: "recs" },
  ] },
  { sec: "Operations", items: [
    { id: "tickets", label: "Work Tickets", icon: "ticket", badge: "open" },
    { id: "comms", label: "Comms", icon: "messages-square" },
    { id: "notices", label: "Notices", icon: "megaphone" },
    { id: "buildings", label: "Buildings", icon: "building-2" },
  ] },
  { sec: "Finance & Network", items: [
    { id: "finance", label: "Finance", icon: "circle-dollar-sign" },
    { id: "vendors", label: "Vendors", icon: "wrench" },
    { id: "integrations", label: "Integrations", icon: "blocks" },
  ] },
];

export function Sidebar() {
  const { route, nav, currentUser, tickets, recs } = useOrbit();
  const counts: Record<string, number> = {
    open: tickets.filter((t) => t.status !== "Closed").length,
    recs: recs.filter((r) => r.status === "pending").length,
    emg: 2,
  };
  return (
    <aside style={{ width: 224, flexShrink: 0, display: "flex", flexDirection: "column", padding: "18px 14px", borderRight: "1px solid var(--hair-2)", background: "var(--sidebar-bg)", backdropFilter: "blur(25px)" }}>
      <div style={{ padding: "0 6px 18px" }}><OrbitWordmark /></div>
      <AccountWidget />
      <nav style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 20, flex: 1, overflowY: "auto" }} className="no-scrollbar">
        {NAV.map((group) => {
          const items = group.items.filter((it) => canSee(currentUser, it.id));
          if (!items.length) return null;
          return (
            <div key={group.sec}>
              <SectionLabel style={{ padding: "0 8px", marginBottom: 9 }}>{group.sec}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map((it) => {
                  const active = route.page === it.id || (it.id === "buildings" && route.page === "building");
                  const badge = it.badge ? counts[it.badge] : 0;
                  return (
                    <button
                      key={it.id}
                      onClick={() => nav(it.id)}
                      style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: active ? "rgba(var(--acc-rgb),0.08)" : "transparent", borderLeft: active ? "2px solid var(--acc)" : "2px solid transparent", color: active ? "var(--ink)" : "var(--ink-2)", transition: "all .15s", fontFamily: SANS }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--fill-2)"; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      <Icon name={it.icon} size={17} color={active ? "var(--acc)" : "var(--ink-3)"} />
                      <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, flex: 1 }}>{it.label}</span>
                      {badge ? (
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: it.badge === "emg" ? "var(--ink)" : active ? "var(--acc)" : "var(--ink-3)", background: it.badge === "emg" ? "#ef4444" : active ? "rgba(var(--acc-rgb),0.12)" : "var(--hair)", borderRadius: 99, padding: "1px 7px", minWidth: 18, textAlign: "center", boxShadow: it.badge === "emg" ? "0 0 10px rgba(239,68,68,0.5)" : "none" }}>{badge}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <LedgerStrip />
    </aside>
  );
}

function AccountWidget() {
  const { currentUser, login, logout } = useOrbit();
  const [open, setOpen] = useState(false);
  if (!currentUser) return null;
  const p = userPerson(currentUser);
  if (!p) return null;
  const operators = USERS.filter((u) => u.persona === "operator");
  const externals = USERS.filter((u) => u.persona !== "operator");
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12, background: "var(--fill-2)", border: "1px solid var(--hair-3)", cursor: "pointer", textAlign: "left" }}>
        <Avatar person={p} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.08em", color: "var(--acc-text)", textTransform: "uppercase" }}>{currentUser.title || PERSONA_META[currentUser.persona].label}</div>
        </div>
        <Icon name="chevrons-up-down" size={14} color="var(--ink-4)" />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", borderRadius: 14, padding: 6, boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "6px 8px 8px" }}><SectionLabel>Orbit team</SectionLabel></div>
            {operators.map((u) => {
              const up = userPerson(u);
              return (
                <button key={u.id} onClick={() => { login(u.id); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", cursor: "pointer", background: u.id === currentUser.id ? "rgba(var(--acc-rgb),0.08)" : "transparent", textAlign: "left" }}
                  onMouseEnter={(e) => { if (u.id !== currentUser.id) e.currentTarget.style.background = "var(--fill-3)"; }}
                  onMouseLeave={(e) => { if (u.id !== currentUser.id) e.currentTarget.style.background = "transparent"; }}>
                  <Avatar person={up!} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{up!.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{u.title}</div>
                  </div>
                  {u.id === currentUser.id && <Icon name="check" size={14} color="var(--acc-text)" />}
                </button>
              );
            })}
            <div style={{ padding: "8px 8px 6px" }}><SectionLabel>View as (impersonate)</SectionLabel></div>
            {externals.map((u) => {
              const up = userPerson(u);
              const meta = PERSONA_META[u.persona];
              return (
                <button key={u.id} onClick={() => { login(u.id); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <Avatar person={up!} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{up!.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{meta.label} · {u.scope.split("·")[0].trim()}</div>
                  </div>
                  <Icon name={meta.icon} size={13} color={meta.tint} />
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

function LedgerStrip() {
  return (
    <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "rgba(var(--acc-rgb),0.03)", border: "1px solid rgba(var(--acc-rgb),0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Icon name="link-2" size={12} color="var(--acc-text)" />
        <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.15em", color: "var(--acc-text)", textTransform: "uppercase" }}>Audit Chain</span>
        <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-3)", lineHeight: 1.6 }}>
        <span style={{ color: "var(--acc-text)" }}>#9f3a</span> · verified
        <br />
        <span style={{ color: "var(--ink-4)" }}>6420 blocks · tamper-evident</span>
      </div>
    </div>
  );
}
