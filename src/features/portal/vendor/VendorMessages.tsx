// Vendor Messages — one thread to Orbit dispatch for everything: windows,
// access, COIs, invoices. Reuses ChatThread with the vendor as "me" and Orbit's
// field desk as the counterparty, seeded with a dispatch opener.
import type { Channel, ChatMessage, Participant } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { PEOPLE } from "@/data/seed";
import { dateShift } from "@/lib/format";
import { ChatThread } from "@/features/comms/ChatThread";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function VendorMessages() {
  const { currentUser } = useOrbit();
  const desk = PEOPLE.luke; // Field Intelligence — the vendor-facing Orbit desk
  const contact: Participant = {
    id: desk.id, name: desk.name, initials: desk.initials,
    color: typeof desk.color === "string" && desk.color.startsWith("#") ? desk.color : "#3b82f6",
    role: "Orbit dispatch", kind: "operator",
  };
  const channel: Channel = {
    id: "ch_vendor_desk_" + (currentUser?.id ?? "v"),
    kind: "vendor",
    buildingId: "all",
    title: "Orbit dispatch",
    subtitle: desk.name + " · Field desk",
    participants: [contact],
    defaultVia: "SMS",
    vias: ["SMS", "Email"],
  };
  const seed: ChatMessage[] = [
    { id: channel.id + "_hello", channelId: channel.id, senderId: desk.id, via: "SMS", text: "Hi — this is Orbit dispatch. Use this thread for any job: windows, building access, COIs, or invoices. We'll get right back to you.", at: dateShift(-1) + " 08:40" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Messages</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          Direct line to the Orbit field desk
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 420, borderRadius: 18, overflow: "hidden", border: "1px solid var(--hair-3)", background: "var(--panel)" }}>
        <ChatThread channel={channel} seed={seed} />
      </div>
    </div>
  );
}
