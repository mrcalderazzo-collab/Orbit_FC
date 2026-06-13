// Super Walkthrough — the same 3D walkthrough / access map the operator uses,
// scoped to the super's building. Reuses VirtualWalkthrough; ticket markers send
// the super to their Work tab (they don't have the operator command console).
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { BUILDING_FILES, BUILDING_TOUR_AREAS } from "@/data/buildings";
import { VirtualWalkthrough } from "@/features/buildings/BuildingsPage";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function SuperWalkthrough({ go }: { go: (id: string) => void }) {
  const { currentUser } = useOrbit();
  const b = currentUser?.building ? buildingById(currentUser.building) : undefined;
  const areas = BUILDING_TOUR_AREAS.filter((a) => a.buildingId === currentUser?.building);
  const files = BUILDING_FILES.filter((f) => f.buildingId === currentUser?.building);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Walkthrough &amp; access map</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          {b?.name} · equipment, access routes &amp; mapped issues
        </p>
      </div>
      <VirtualWalkthrough areas={areas} files={files} onTicket={() => go("work")} />
    </div>
  );
}
