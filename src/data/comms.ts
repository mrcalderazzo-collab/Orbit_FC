// comms.ts — live-chat model. Builds conversation Channels (resident DMs, board
// group chats, board-member DMs, vendor threads) and seeds believable history.
// "me" (the acting operator) is resolved at render from the session; channels
// here describe the counterparties.
import type { Channel, ChatMessage, CommVia, Participant, Ticket, TicketFlow } from "@/lib/types";
import { dateShift, rng, seed } from "@/lib/format";
import { BUILDINGS, PEOPLE, ROSTER, buildingById } from "./seed";

// ── Orbit account team / contactable positions ──────────────────────────
// A building's residents & board can reach any of these positions directly
// ("Chat with my property manager"). The Account Manager is per-building
// (building.am); the rest are fixed roles. New positions can be added here.
export const ACCOUNT_POSITIONS: { key: string; label: string; personId: string | null }[] = [
  { key: "pm", label: "Property Manager", personId: "nick" },
  { key: "am", label: "Account Manager", personId: null }, // resolved from building.am
  { key: "coord", label: "Account Coordinator", personId: "coord" },
  { key: "compliance", label: "Compliance & Admin", personId: "cait" },
  { key: "field", label: "Field Intelligence", personId: "luke" },
];

export function buildingTeam(buildingId: string) {
  const b = buildingById(buildingId);
  return ACCOUNT_POSITIONS.map((p) => {
    const pid = p.key === "am" ? b?.am || "gidi" : p.personId!;
    return { key: p.key, label: p.label, person: PEOPLE[pid] };
  });
}

const BOARD_PALETTE = ["#a855f7", "#8b5cf6", "#c084fc", "#a78bfa", "#d8b4fe"];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function boardParticipants(buildingId: string): Participant[] {
  const roster = ROSTER[buildingId];
  if (!roster) return [];
  return roster.board.map((b, i) => ({
    id: "bd_" + buildingId + "_" + slug(b[0]),
    name: b[0],
    initials: initials(b[0]),
    color: BOARD_PALETTE[i % BOARD_PALETTE.length],
    role: b[1] + " · " + (buildingById(buildingId)?.name ?? ""),
    kind: "board" as const,
  }));
}

export function residentParticipant(t: Ticket, f: TicketFlow): Participant {
  const unit = f.intake.unit || (t.requester.match(/Unit\s*([\w-]+)/i)?.[1] ?? null);
  const name = f.intake.submitter === "Resident" ? f.intake.submitterName : (t.requester.includes("Unit") ? "Resident" : f.intake.submitterName);
  const display = unit && !/unit/i.test(name) ? name + " · " + unit : name;
  return {
    id: "res_" + t.id,
    name: display,
    initials: initials(name === "Resident" || /unit/i.test(name) ? (buildingById(t.building)?.name ?? "RS") : name),
    color: "#3b82f6",
    role: (buildingById(t.building)?.name ?? "") + (unit ? " · Unit " + unit : ""),
    kind: "resident",
  };
}

export function vendorParticipant(t: Ticket, f: TicketFlow): Participant | null {
  const v = f.awarded?.vendor || t.vendor;
  if (!v) return null;
  return { id: "ven_" + t.id, name: v, initials: initials(v), color: "#f59e0b", role: "Awarded vendor", kind: "vendor" };
}

function ch(partial: Omit<Channel, "vias">, vias: CommVia[]): Channel {
  return { ...partial, vias, defaultVia: partial.defaultVia };
}

/** the channels available from within a given ticket */
export function channelsForTicket(t: Ticket, f: TicketFlow): Channel[] {
  const b = buildingById(t.building)!;
  const res = residentParticipant(t, f);
  const board = boardParticipants(t.building);
  const out: Channel[] = [
    ch({ id: "ch_res_" + t.id, kind: "resident", buildingId: t.building, ticketId: t.id, title: res.name, subtitle: res.role, participants: [res], defaultVia: "SMS" }, ["SMS", "Email"]),
    ch({ id: "ch_board_" + t.building, kind: "board", buildingId: t.building, ticketId: t.id, title: b.name + " Board", subtitle: board.length + " directors", participants: board, defaultVia: "In-app" }, ["In-app", "Email"]),
  ];
  const ven = vendorParticipant(t, f);
  if (ven) out.push(ch({ id: "ch_ven_" + t.id, kind: "vendor", buildingId: t.building, ticketId: t.id, title: ven.name, subtitle: "Awarded vendor", participants: [ven], defaultVia: "SMS" }, ["SMS", "Email"]));
  return out;
}

/** a "direct line" channel: the building's board reaching a specific Orbit
 *  position (Property Manager / Account Manager / …). Deterministic id per
 *  building + position so the position switcher can swap cleanly. */
export function advisoryChannel(buildingId: string, positionKey: string): Channel {
  const b = buildingById(buildingId)!;
  const team = buildingTeam(buildingId);
  const pos = team.find((t) => t.key === positionKey) || team[1];
  const board = boardParticipants(buildingId);
  const contact: Participant = board[0] || { id: "board_" + buildingId, name: b.name + " Board", initials: "BD", color: "#a855f7", role: "Board", kind: "board" };
  return ch(
    {
      id: "ch_adv_" + buildingId + "_" + pos.key,
      kind: "advisory", buildingId,
      title: contact.name,
      subtitle: "Direct line · " + pos.label,
      participants: [contact],
      defaultVia: "In-app",
      routedTo: { position: pos.label, positionKey: pos.key, personId: pos.person.id, personName: pos.person.name },
    },
    ["In-app", "Email", "SMS"],
  );
}

/** a single board-member DM channel */
export function boardDirectChannel(buildingId: string, member: Participant): Channel {
  return ch({ id: "ch_bd_" + buildingId + "_" + slug(member.name), kind: "boardDirect", buildingId, title: member.name, subtitle: member.role, participants: [member], defaultVia: "In-app" }, ["In-app", "Email", "SMS"]);
}

/** portfolio-wide inbox: a board group per building + resident threads drawn
 *  from active tickets, newest first. */
export function portfolioChannels(tickets: Ticket[], flowOf: (t: Ticket) => TicketFlow): Channel[] {
  const map = new Map<string, Channel>();
  // direct lines: each building's board → its Account Manager (the headline
  // "chat with your property manager" relationship)
  for (const b of BUILDINGS) {
    const c = advisoryChannel(b.id, "am");
    map.set(c.id, c);
  }
  for (const b of BUILDINGS) {
    const board = boardParticipants(b.id);
    if (board.length) {
      const c = ch({ id: "ch_board_" + b.id, kind: "board", buildingId: b.id, title: b.name + " Board", subtitle: board.length + " directors", participants: board, defaultVia: "In-app" }, ["In-app", "Email"]);
      map.set(c.id, c);
    }
  }
  for (const t of tickets) {
    if (t.status === "Closed" || t.mergedInto) continue;
    const f = flowOf(t);
    const res = residentParticipant(t, f);
    const c = ch({ id: "ch_res_" + t.id, kind: "resident", buildingId: t.building, ticketId: t.id, title: res.name, subtitle: (buildingById(t.building)?.name ?? "") + " · " + t.id, participants: [res], defaultVia: "SMS" }, ["SMS", "Email"]);
    map.set(c.id, c);
  }
  return [...map.values()];
}

// ── seeded histories ────────────────────────────────────────────────────
function mk(channelId: string, senderId: string, via: CommVia, text: string, at: string, toAll?: boolean): ChatMessage {
  return { id: channelId + "_" + Math.abs(seed(channelId + text)).toString(36).slice(0, 6), channelId, senderId, via, text, at, toAll };
}

export function seedChatFor(channel: Channel): ChatMessage[] {
  const r = rng(seed(channel.id + "chat"));
  const d = (n: number, h: number) => dateShift(-n) + " " + String(8 + h).padStart(2, "0") + ":" + String(Math.floor(r() * 6) * 10).padStart(2, "0");

  if (channel.kind === "resident") {
    const res = channel.participants[0];
    return [
      mk(channel.id, "me", "SMS", "Hi — this is your Orbit account team. We've got your request logged and an owner assigned. We'll keep you posted right here.", d(2, 1)),
      mk(channel.id, res.id, "SMS", "Thanks! Appreciate the heads up. I'm usually home after 4.", d(2, 2)),
      mk(channel.id, "me", "SMS", "Perfect. We're lining up a vendor now — I'll text once we have a window.", d(1, 3)),
    ];
  }
  if (channel.kind === "board") {
    const [a, b] = channel.participants;
    const out: ChatMessage[] = [
      mk(channel.id, "me", "In-app", "Morning all — bids are in for the open capital item. Posting the comparison to the Vote Center now.", d(2, 0), true),
    ];
    if (a) out.push(mk(channel.id, a.id, "In-app", "Saw it, thanks. Leaning toward the option with the longer warranty.", d(1, 2)));
    if (b) out.push(mk(channel.id, b.id, "In-app", "Agreed — let's get it on the agenda. Can we award by Friday?", d(1, 3)));
    out.push(mk(channel.id, "me", "In-app", "Yes — quorum's almost there. I'll confirm the award the moment it lands.", d(0, 1), true));
    return out;
  }
  if (channel.kind === "advisory") {
    const contact = channel.participants[0];
    const mgr = (channel.routedTo?.personName || "your manager").split(" ")[0];
    const topics = [
      "the reserve study timeline", "next month's board agenda", "the facade (LL11) filing status",
      "the elevator modernization budget", "our insurance renewal", "the Q2 financials",
    ];
    const topic = topics[Math.abs(seed(channel.id)) % topics.length];
    // lead with the board's inbound message so the thread doesn't put words in
    // the operator's mouth — the line is owned by routedTo, awaiting a reply.
    return [
      mk(channel.id, contact.id, "In-app", `Hi ${mgr} — the board wanted to check in on ${topic}. Could you give us a quick read when you have a moment?`, d(0, 2)),
    ];
  }
  if (channel.kind === "boardDirect") {
    const m = channel.participants[0];
    return [
      mk(channel.id, "me", "In-app", "Hi " + m.name.split(" ")[0] + " — quick one on the reserve question you raised.", d(1, 2)),
      mk(channel.id, m.id, "In-app", "Go ahead.", d(1, 3)),
    ];
  }
  if (channel.kind === "vendor") {
    const v = channel.participants[0];
    return [
      mk(channel.id, "me", "SMS", "Hi " + v.name + " — confirming the visit window for this job. Resident access is set on our end.", d(1, 2)),
      mk(channel.id, v.id, "SMS", "Got it. Crew can be on site in the AM window. Will text on arrival.", d(0, 1)),
    ];
  }
  return [];
}
