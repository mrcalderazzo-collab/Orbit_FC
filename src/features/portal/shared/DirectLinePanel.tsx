// DirectLinePanel — an external persona's private line to their Orbit account
// manager (building.am). Reuses the operator's ChatThread surface with the
// portal user as "me" and the AM as the counterparty, seeded with a persona-
// appropriate opener from the manager. Shared by the board and resident portals.
import type { Channel, ChatMessage, Participant } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { buildingTeam } from "@/data/comms";
import { dateShift } from "@/lib/format";
import { ChatThread } from "@/features/comms/ChatThread";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function DirectLinePanel({ heading, opener }: { heading: string; opener: string }) {
  const { currentUser } = useOrbit();
  const buildingId = currentUser?.building;
  const b = buildingId ? buildingById(buildingId) : undefined;
  if (!buildingId || !b) return null;

  const am = buildingTeam(buildingId).find((t) => t.key === "am")!.person;
  const amParticipant: Participant = {
    id: am.id, name: am.name, initials: am.initials,
    color: typeof am.color === "string" && am.color.startsWith("#") ? am.color : "#3b82f6",
    role: am.role + " · Orbit", kind: "operator",
  };
  const channel: Channel = {
    id: "ch_portal_am_" + (currentUser?.id ?? "x") + "_" + buildingId,
    kind: "boardDirect",
    buildingId,
    title: am.name,
    subtitle: "Your Orbit account manager",
    participants: [amParticipant],
    defaultVia: "In-app",
    vias: ["In-app", "Email", "SMS"],
  };
  const seed: ChatMessage[] = [
    { id: channel.id + "_hello", channelId: channel.id, senderId: am.id, via: "In-app", text: opener, at: dateShift(-1) + " 09:10" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>{heading}</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          {am.name} · your account manager
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 420, borderRadius: 18, overflow: "hidden", border: "1px solid var(--hair-3)", background: "var(--panel)" }}>
        <ChatThread channel={channel} seed={seed} />
      </div>
    </div>
  );
}
