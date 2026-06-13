// GlobalSearch — ⌘K command palette across tickets, buildings, vendors & people.
// Type, hit Enter to jump to the first result, Esc to close.
import { useEffect, useMemo, useRef, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS, PEOPLE } from "@/data/seed";
import { VENDORS } from "@/data/vendors";
import { Avatar, Icon } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

type Hit = { kind: "ticket" | "building" | "vendor" | "person"; id: string; title: string; sub: string; color?: string; icon: string; go: () => void };

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tickets, openCommand, nav } = useOrbit();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const out: Hit[] = [];
    tickets.filter((t) => !t.mergedInto && (t.title + " " + t.id).toLowerCase().includes(s)).slice(0, 6).forEach((t) => {
      const b = BUILDINGS.find((x) => x.id === t.building);
      out.push({ kind: "ticket", id: t.id, title: t.title, sub: t.id + " · " + (b?.name ?? ""), color: b?.mono, icon: "ticket", go: () => { onClose(); openCommand(t.id); } });
    });
    BUILDINGS.filter((b) => (b.name + " " + b.code).toLowerCase().includes(s)).slice(0, 4).forEach((b) => {
      out.push({ kind: "building", id: b.id, title: b.name, sub: b.code + " · " + b.units + " units", color: b.mono, icon: "building-2", go: () => { onClose(); nav("buildings", b.id); } });
    });
    VENDORS.filter((v) => (v.name + " " + v.code + " " + v.trades.join(" ")).toLowerCase().includes(s)).slice(0, 4).forEach((v) => {
      out.push({ kind: "vendor", id: v.id, title: v.name, sub: v.code + " · " + v.trades.slice(0, 2).join(", "), icon: "hard-hat", go: () => { onClose(); nav("vendors"); } });
    });
    Object.values(PEOPLE).filter((p) => p.name.toLowerCase().includes(s)).slice(0, 4).forEach((p) => {
      out.push({ kind: "person", id: p.id, title: p.name, sub: p.role, color: p.color, icon: "user", go: () => { onClose(); nav("comms"); } });
    });
    return out;
  }, [q, tickets, openCommand, nav, onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && hits[0]) hits[0].go();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, hits, onClose]);

  if (!open) return null;
  const GROUPS: [Hit["kind"], string][] = [["ticket", "Tickets"], ["building", "Buildings"], ["vendor", "Vendors"], ["person", "People"]];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "var(--scrim)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh", animation: "orbit-fade .15s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 620, maxWidth: "92vw", maxHeight: "70vh", display: "flex", flexDirection: "column", background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", borderRadius: 18, boxShadow: "0 30px 80px rgba(0,0,0,0.6)", overflow: "hidden", animation: "orbit-pop .2s cubic-bezier(.2,.8,.3,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 18px", borderBottom: "1px solid var(--hair-2)" }}>
          <Icon name="search" size={18} color="var(--ink-3)" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets, buildings, vendors, people…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: SANS, fontSize: 16, color: "var(--ink)" }} />
          <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "var(--ink-4)", border: "1px solid var(--hair-3)", borderRadius: 5, padding: "2px 6px" }}>ESC</span>
        </div>
        <div style={{ overflowY: "auto", padding: 8 }}>
          {!q.trim() && <div style={{ padding: "24px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)", letterSpacing: "0.06em" }}>TYPE TO SEARCH ACROSS THE PORTFOLIO</div>}
          {q.trim() && !hits.length && <div style={{ padding: "24px 0", textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--ink-5)" }}>NO MATCHES</div>}
          {GROUPS.map(([kind, label]) => {
            const items = hits.filter((h) => h.kind === kind);
            if (!items.length) return null;
            return (
              <div key={kind} style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", padding: "8px 10px 5px", textTransform: "uppercase" }}>{label}</div>
                {items.map((h) => (
                  <button key={h.id} onClick={h.go} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    {h.kind === "person" ? <Avatar person={h.id} size={26} /> : <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: (h.color || "var(--ink-4)") + "1f", border: "1px solid " + (h.color || "var(--hair-3)") + "55" }}><Icon name={h.icon} size={14} color={h.color || "var(--ink-3)"} /></span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{h.sub}</div>
                    </div>
                    <Icon name="corner-down-left" size={13} color="var(--ink-5)" />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
