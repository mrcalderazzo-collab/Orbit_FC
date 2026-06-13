// NotificationBell — a live activity feed. Reads the OrbitProvider notifications
// stream (pushed in real time as tickets move, votes land, invoices post, etc.),
// shows an unread count, and opens a dropdown. Used in the operator TopBar and
// the external PortalShell. Operator passes onNavigate to jump to the source.
import { useEffect, useRef, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import type { NotifKind, OrbitNotification } from "@/store/OrbitProvider";
import { Icon } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const META: Record<NotifKind, { icon: string; color: string }> = {
  ticket: { icon: "ticket", color: "var(--acc-text)" },
  vote: { icon: "vote", color: "#a855f7" },
  message: { icon: "message-square", color: "#3b82f6" },
  finance: { icon: "circle-dollar-sign", color: "#22c55e" },
  calendar: { icon: "calendar", color: "#14b8a6" },
  system: { icon: "bell", color: "var(--ink-3)" },
};

export function NotificationBell({ onNavigate }: { onNavigate?: (n: OrbitNotification) => void }) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useOrbit();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const click = (n: OrbitNotification) => {
    markNotificationRead(n.id);
    if (n.ref && onNavigate) { onNavigate(n); setOpen(false); }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} title="Notifications" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 30, borderRadius: 99, cursor: "pointer", background: open ? "rgba(var(--acc-rgb),0.12)" : "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
        <Icon name="bell" size={15} color={unread ? "var(--ink)" : "var(--ink-4)"} />
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 99, background: "#ef4444", color: "#fff", fontFamily: MONO, fontSize: 8.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--panel-solid)" }}>{unread}</span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60, width: 340, maxHeight: 460, overflowY: "auto", background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,0.55)" }} className="no-scrollbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--hair-2)", position: "sticky", top: 0, background: "var(--panel-solid)" }}>
            <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Notifications</span>
            {unread > 0 && <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "#ef4444" }}>{unread} NEW</span>}
            <button onClick={markAllNotificationsRead} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Mark all read</button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)", letterSpacing: "0.08em" }}>NOTHING YET</div>
          ) : (
            notifications.map((n) => {
              const m = META[n.kind];
              return (
                <button key={n.id} onClick={() => click(n)} style={{ width: "100%", display: "flex", gap: 11, padding: "11px 14px", border: "none", borderBottom: "1px solid var(--hair)", cursor: n.ref && onNavigate ? "pointer" : "default", textAlign: "left", background: n.read ? "transparent" : "rgba(var(--acc-rgb),0.04)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? "transparent" : "rgba(var(--acc-rgb),0.04)")}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.color + "1a" }}>
                    <Icon name={m.icon} size={15} color={m.color} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ flex: 1, fontFamily: SANS, fontSize: 12.5, fontWeight: n.read ? 400 : 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                      {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--acc)", flexShrink: 0 }} />}
                    </span>
                    {n.detail && <span style={{ display: "block", fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.4, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.detail}</span>}
                    <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-5)", marginTop: 3 }}>{n.at}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
