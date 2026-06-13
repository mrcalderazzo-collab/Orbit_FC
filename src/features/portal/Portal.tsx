// Portal — external-persona entry point. Picks the persona's accent + scoped
// tab set and renders the active page inside PortalShell. Board is fully wired
// (Vote Center, Activity, Finances, Direct Line, Notices); resident & vendor
// land on a tasteful "coming online" surface until their slices ship.
import { useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { PERSONA_META, boardVoteTickets } from "@/data/identity";
import { ticketFlow } from "@/data/flow";
import { Glass, Icon, SectionLabel } from "@/components/ui";
import { PortalShell, type PortalTab } from "./PortalShell";
import { VoteCenter } from "./board/VoteCenter";
import { BoardActivity } from "./board/BoardActivity";
import { BoardFinances } from "./board/BoardFinances";
import { DirectLine } from "./board/DirectLine";
import { BoardNotices } from "./board/BoardNotices";

const SANS = "Outfit, sans-serif";

export function Portal() {
  const { currentUser, tickets } = useOrbit();
  const persona = currentUser?.persona ?? "resident";
  const accent = typeof PERSONA_META[persona].tint === "string" && PERSONA_META[persona].tint.startsWith("#")
    ? PERSONA_META[persona].tint
    : "#3b82f6";

  const voteCount = useMemo(
    () => (currentUser && persona === "board" ? boardVoteTickets(currentUser, tickets, ticketFlow).length : 0),
    [currentUser, persona, tickets],
  );

  const tabs: PortalTab[] = persona === "board"
    ? [
        { id: "vote", label: "Vote Center", icon: "vote", badge: voteCount },
        { id: "activity", label: "Activity", icon: "activity" },
        { id: "finances", label: "Finances", icon: "circle-dollar-sign" },
        { id: "directline", label: "Direct Line", icon: "messages-square" },
        { id: "notices", label: "Notices", icon: "megaphone" },
      ]
    : [{ id: "overview", label: "Overview", icon: "panels-top-left" }];

  const [active, setActive] = useState(tabs[0].id);

  return (
    <PortalShell accent={accent} tabs={tabs} active={active} onSelect={setActive}>
      {persona === "board" ? <BoardPage tab={active} /> : <ComingOnline persona={persona} accent={accent} />}
    </PortalShell>
  );
}

function BoardPage({ tab }: { tab: string }) {
  switch (tab) {
    case "vote": return <VoteCenter />;
    case "activity": return <BoardActivity />;
    case "finances": return <BoardFinances />;
    case "directline": return <DirectLine />;
    case "notices": return <BoardNotices />;
    default: return <VoteCenter />;
  }
}

function ComingOnline({ persona, accent }: { persona: string; accent: string }) {
  const meta = PERSONA_META[persona as keyof typeof PERSONA_META];
  const blurb = persona === "resident"
    ? "Submit a request, track its progress on a live status link, read building notices, message your account manager, and view your statements — all coming to your resident portal."
    : "Accept dispatches, confirm windows, upload completion photos and invoices, and message the Orbit team — all coming to your vendor portal.";
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Glass style={{ padding: 40, maxWidth: 480, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 18px", background: accent + "14", border: "1px solid " + accent + "3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={meta.icon} size={28} color={accent} />
        </div>
        <SectionLabel style={{ marginBottom: 12, textAlign: "center" }}>Portal coming online</SectionLabel>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>{blurb}</p>
        <p style={{ margin: "16px 0 0", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-4)", lineHeight: 1.6 }}>
          The board portal is live now — switch to a board account to see the Vote Center, finances, activity, and direct line.
        </p>
      </Glass>
    </div>
  );
}
