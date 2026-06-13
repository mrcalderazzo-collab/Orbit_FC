// PhoneFrame — an iMessage-style phone shell so the operator sees the SMS
// conversation the way the resident does on their handset.
import type { ReactNode } from "react";
import { Icon } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function PhoneFrame({
  contact, initials, color, via = "SMS", children, footer,
}: { contact: string; initials: string; color: string; via?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div style={{ width: 320, maxWidth: "100%", margin: "0 auto", borderRadius: 44, padding: 11, background: "linear-gradient(160deg,#1c1c1f,#0a0a0c)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 30px 70px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.04)" }}>
      <div style={{ borderRadius: 34, overflow: "hidden", background: "#f2f2f7", display: "flex", flexDirection: "column", height: 560, position: "relative" }}>
        {/* notch */}
        <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 96, height: 22, background: "#0a0a0c", borderRadius: 99, zIndex: 5 }} />
        {/* status bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 22px 4px", fontFamily: SANS, fontSize: 11, fontWeight: 600, color: "#0a0a0c" }}>
          <span>9:41</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="signal" size={12} color="#0a0a0c" />
            <Icon name="wifi" size={12} color="#0a0a0c" />
            <Icon name="battery-full" size={14} color="#0a0a0c" />
          </span>
        </div>
        {/* contact header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(245,245,247,0.85)", backdropFilter: "blur(8px)" }}>
          <span style={{ width: 42, height: 42, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: color + "22", border: "1px solid " + color + "66", color, fontFamily: MONO, fontWeight: 700, fontSize: 14 }}>{initials}</span>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "#0a0a0c" }}>{contact}</span>
          <span style={{ fontFamily: SANS, fontSize: 9.5, color: "#8e8e93" }}>{via === "SMS" ? "Text Message · SMS" : via}</span>
        </div>
        {/* messages */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "14px 12px 6px", display: "flex", flexDirection: "column", gap: 3 }}>{children}</div>
        {/* input */}
        {footer && <div style={{ padding: "8px 10px 12px", borderTop: "1px solid rgba(0,0,0,0.07)", background: "rgba(245,245,247,0.92)" }}>{footer}</div>}
      </div>
    </div>
  );
}

// a single SMS bubble (iMessage look)
export function PhoneBubble({ mine, text, time, sender }: { mine: boolean; text: string; time?: string; sender?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: 4 }}>
      {sender && !mine && <span style={{ fontFamily: SANS, fontSize: 8.5, color: "#8e8e93", padding: "0 12px 2px" }}>{sender}</span>}
      <div style={{ maxWidth: "78%", padding: "8px 13px", borderRadius: 19, fontFamily: SANS, fontSize: 13, lineHeight: 1.4, color: mine ? "#fff" : "#0a0a0c", background: mine ? "linear-gradient(180deg,#2f95ff,#0a7cff)" : "#e9e9eb", borderBottomRightRadius: mine ? 5 : 19, borderBottomLeftRadius: mine ? 19 : 5 }}>{text}</div>
      {time && <span style={{ fontFamily: SANS, fontSize: 8, color: "#b0b0b5", padding: "2px 12px 0" }}>{time}</span>}
    </div>
  );
}
