// My Requests — the resident's own tickets, each shown via the shared public
// tracker (status + stage timeline only). Scoped by residentTickets to their
// unit; the resident never sees other units' requests or any internal detail.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { residentTickets } from "@/data/identity";
import { Btn, Glass, Icon } from "@/components/ui";
import { PublicTrackerCard } from "../shared/PublicTrackerCard";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const BLUE = "#3b82f6";

export function MyRequests({ onNew }: { onNew: () => void }) {
  const { currentUser, tickets } = useOrbit();
  const items = useMemo(
    () => (currentUser ? residentTickets(currentUser, tickets) : []),
    [currentUser, tickets],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>My requests</h2>
          <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
            Track everything you've reported
          </p>
        </div>
        <Btn primary icon="plus" onClick={onNew}>New request</Btn>
      </div>

      {items.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="clipboard-list" size={26} color={BLUE} />
          </div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>No open requests</div>
          <p style={{ margin: "0 0 16px", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55 }}>
            Something need attention in your unit or the building? Submit a request and follow it here in real time.
          </p>
          <Btn primary icon="plus" onClick={onNew} style={{ margin: "0 auto" }}>Submit a request</Btn>
        </Glass>
      ) : (
        items.map((t, i) => <PublicTrackerCard key={t.id} t={t} defaultOpen={i === 0} />)
      )}
    </div>
  );
}
