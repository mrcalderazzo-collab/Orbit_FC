// Board Activity — the board's building, the way residents see it. Each card
// renders only the *public* tracker (shared PublicTrackerCard), never the
// internal log, cost, or vendor coordination. Scoping is enforced by
// boardActivityTickets.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { boardActivityTickets } from "@/data/identity";
import { buildingById } from "@/data/seed";
import { Glass } from "@/components/ui";
import { PublicTrackerCard } from "../shared/PublicTrackerCard";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function BoardActivity() {
  const { currentUser, tickets } = useOrbit();
  const building = currentUser?.building ? buildingById(currentUser.building) : undefined;
  const items = useMemo(
    () => (currentUser ? boardActivityTickets(currentUser, tickets) : []),
    [currentUser, tickets],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Building activity</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          What's happening across {building?.name ?? "your building"} · public status
        </p>
      </div>
      {items.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>No active work in your building right now.</Glass>
      ) : (
        items.map((t) => <PublicTrackerCard key={t.id} t={t} />)
      )}
    </div>
  );
}
