// Portal — external-persona entry point. Picks the persona's accent + scoped
// tab set and renders the active page inside PortalShell. Board, resident, and
// vendor are all wired; each persona only ever sees its own building/unit/jobs.
import { useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { PERSONA_META, boardVoteTickets, residentTickets, vendorTickets, superTickets } from "@/data/identity";
import { ticketFlow } from "@/data/flow";
import { Glass, Icon, SectionLabel } from "@/components/ui";
import { PortalShell, type PortalTab } from "./PortalShell";
import { NoticesPanel } from "./shared/NoticesPanel";
import { DirectLinePanel } from "./shared/DirectLinePanel";
import { VoteCenter } from "./board/VoteCenter";
import { BoardActivity } from "./board/BoardActivity";
import { BoardFinances } from "./board/BoardFinances";
import { MyRequests } from "./resident/MyRequests";
import { SubmitRequest } from "./resident/SubmitRequest";
import { Statements } from "./resident/Statements";
import { Dispatches } from "./vendor/Dispatches";
import { VendorMessages } from "./vendor/VendorMessages";
import { SuperToday } from "./super/SuperToday";
import { SuperWork } from "./super/SuperWork";
import { SuperWalkthrough } from "./super/SuperWalkthrough";
import { SuperSystems } from "./super/SuperSystems";

const SANS = "Outfit, sans-serif";

export function Portal() {
  const { currentUser, tickets } = useOrbit();
  const persona = currentUser?.persona ?? "resident";
  const accent = PERSONA_META[persona].tint.startsWith("#") ? PERSONA_META[persona].tint : "#3b82f6";

  const voteCount = useMemo(
    () => (currentUser && persona === "board" ? boardVoteTickets(currentUser, tickets, ticketFlow).length : 0),
    [currentUser, persona, tickets],
  );
  const requestCount = useMemo(
    () => (currentUser && persona === "resident" ? residentTickets(currentUser, tickets).filter((t) => t.status !== "Closed").length : 0),
    [currentUser, persona, tickets],
  );
  const dispatchCount = useMemo(
    () => (currentUser && persona === "vendor" ? vendorTickets(currentUser, tickets, ticketFlow).filter((t) => t.status !== "Closed").length : 0),
    [currentUser, persona, tickets],
  );
  const superWorkCount = useMemo(
    () => (currentUser && persona === "super" ? superTickets(currentUser, tickets).filter((t) => t.status !== "Closed").length : 0),
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
    : persona === "resident"
      ? [
          { id: "requests", label: "My Requests", icon: "clipboard-list", badge: requestCount },
          { id: "submit", label: "Submit", icon: "plus-circle" },
          { id: "notices", label: "Notices", icon: "megaphone" },
          { id: "manager", label: "My Manager", icon: "messages-square" },
          { id: "statements", label: "Statements", icon: "receipt" },
        ]
      : persona === "vendor"
        ? [
            { id: "dispatches", label: "Dispatches", icon: "hard-hat", badge: dispatchCount },
            { id: "messages", label: "Messages", icon: "messages-square" },
          ]
        : persona === "super"
          ? [
              { id: "today", label: "Today", icon: "sun" },
              { id: "work", label: "Work", icon: "hammer", badge: superWorkCount },
              { id: "walkthrough", label: "Walkthrough", icon: "scan" },
              { id: "systems", label: "Systems", icon: "activity" },
              { id: "directline", label: "Direct Line", icon: "messages-square" },
            ]
          : [{ id: "overview", label: "Overview", icon: "panels-top-left" }];

  const [active, setActive] = useState(tabs[0].id);

  return (
    <PortalShell accent={accent} tabs={tabs} active={active} onSelect={setActive}>
      {persona === "board" && <BoardPage tab={active} />}
      {persona === "resident" && <ResidentPage tab={active} go={setActive} />}
      {persona === "vendor" && <VendorPage tab={active} />}
      {persona === "super" && <SuperPage tab={active} go={setActive} />}
      {persona !== "board" && persona !== "resident" && persona !== "vendor" && persona !== "super" && <ComingOnline persona={persona} accent={accent} />}
    </PortalShell>
  );
}

function BoardPage({ tab }: { tab: string }) {
  switch (tab) {
    case "vote": return <VoteCenter />;
    case "activity": return <BoardActivity />;
    case "finances": return <BoardFinances />;
    case "directline": return <DirectLinePanel heading="Direct line" opener="Hi — it's your account manager at Orbit. I'll keep the board posted on votes, finances, and building matters. Reach me here anytime." />;
    case "notices": return <NoticesPanel />;
    default: return <VoteCenter />;
  }
}

function ResidentPage({ tab, go }: { tab: string; go: (id: string) => void }) {
  switch (tab) {
    case "requests": return <MyRequests onNew={() => go("submit")} />;
    case "submit": return <SubmitRequest onSubmitted={() => go("requests")} />;
    case "notices": return <NoticesPanel />;
    case "manager": return <DirectLinePanel heading="My manager" opener="Hi! I'm your account manager at Orbit. Message me anytime about your unit, a request, or anything in the building — I'm happy to help." />;
    case "statements": return <Statements />;
    default: return <MyRequests onNew={() => go("submit")} />;
  }
}

function VendorPage({ tab }: { tab: string }) {
  switch (tab) {
    case "dispatches": return <Dispatches />;
    case "messages": return <VendorMessages />;
    default: return <Dispatches />;
  }
}

function SuperPage({ tab, go }: { tab: string; go: (id: string) => void }) {
  switch (tab) {
    case "today": return <SuperToday go={go} />;
    case "work": return <SuperWork />;
    case "walkthrough": return <SuperWalkthrough go={go} />;
    case "systems": return <SuperSystems />;
    case "directline": return <DirectLinePanel heading="Direct line" opener="Hi — it's your account manager at Orbit. Loop me in on anything from the field: vendors, access, parts, or building issues. I'm here." />;
    default: return <SuperToday go={go} />;
  }
}

function ComingOnline({ persona, accent }: { persona: string; accent: string }) {
  const meta = PERSONA_META[persona as keyof typeof PERSONA_META];
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Glass style={{ padding: 40, maxWidth: 480, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 18px", background: accent + "14", border: "1px solid " + accent + "3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={meta.icon} size={28} color={accent} />
        </div>
        <SectionLabel style={{ marginBottom: 12, textAlign: "center" }}>Portal coming online</SectionLabel>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>This persona's portal is on the way.</p>
      </Glass>
    </div>
  );
}
