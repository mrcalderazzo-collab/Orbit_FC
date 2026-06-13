// Direct Line — the board's private line to their Orbit account manager. Reuses
// the same ChatThread surface the operator uses, with the board member as "me"
// and the assigned AM as the counterparty (building.am). No ticket internals;
// just the relationship.
import type { Channel, Participant } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { buildingTeam } from "@/data/comms";
import { ChatThread } from "@/features/comms/ChatThread";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function DirectLine() {
  const { currentUser } = useOrbit();
  const buildingId = currentUser?.building;
  const b = buildingId ? buildingById(buildingId) : undefined;
  if (!buildingId || !b) return null;

  const am = buildingTeam(buildingId).find((t) => t.key === "am")!.person;
  const amParticipant: Participant = {
    id: am.id, name: am.name, initials: am.initials, color: typeof am.color === "string" ? am.color : "#3b82f6", role: am.role + " · Orbit", kind: "operator",
  };
  const channel: Channel = {
    id: "ch_portal_am_" + buildingId,
    kind: "boardDirect",
    buildingId,
    title: am.name,
    subtitle: "Your Orbit account manager",
    participants: [amParticipant],
    defaultVia: "In-app",
    vias: ["In-app", "Email", "SMS"],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Direct line</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          Private line to {am.name}, your account manager
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 420, borderRadius: 18, overflow: "hidden", border: "1px solid var(--hair-3)", background: "var(--panel)" }}>
        <ChatThread channel={channel} />
      </div>
    </div>
  );
}
