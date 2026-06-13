// Portal — external-persona entry point. Picks the persona's accent + scoped
// tab set and renders the active page inside PortalShell. Board, resident,
// vendor and super are all wired; each persona only ever sees its own
// building(s)/unit/jobs. Supers can cover several buildings (a switcher in the
// shell toolbar) and have a payroll check-in/out clock.
import { useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { PERSONA_META, assignedBuildings, boardVoteTickets, residentTickets, vendorTickets, superTickets } from "@/data/identity";
import { ticketFlow } from "@/data/flow";
import { buildingById } from "@/data/seed";
import { Glass, Icon, SectionLabel } from "@/components/ui";
import { PortalShell, type PortalTab } from "./PortalShell";
import { NoticesPanel } from "./shared/NoticesPanel";
import { DirectLinePanel } from "./shared/DirectLinePanel";
import { VoteCenter } from "./board/VoteCenter";
import { BoardDashboard } from "./board/BoardDashboard";
import { BoardFinancials } from "./board/BoardFinancials";
import { BoardCompliance } from "./board/BoardCompliance";
import { BoardProjects } from "./board/BoardProjects";
import { BoardDocs } from "./board/BoardDocs";
import { MyRequests } from "./resident/MyRequests";
import { SubmitRequest } from "./resident/SubmitRequest";
import { Statements } from "./resident/Statements";
import { Dispatches } from "./vendor/Dispatches";
import { VendorMessages } from "./vendor/VendorMessages";
import { SuperToday } from "./super/SuperToday";
import { SuperWork } from "./super/SuperWork";
import { SuperWalkthrough } from "./super/SuperWalkthrough";
import { SuperSystems } from "./super/SuperSystems";
import { SuperSchedule } from "./super/SuperSchedule";
import { SuperCalendar } from "./super/SuperCalendar";
import { SuperCreateModal, type CreatePrefill } from "./super/SuperCreateModal";
import { SuperTaskDetail } from "./super/SuperTaskDetail";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function Portal() {
  const { currentUser, tickets } = useOrbit();
  const persona = currentUser?.persona ?? "resident";
  const accent = PERSONA_META[persona].tint.startsWith("#") ? PERSONA_META[persona].tint : "#3b82f6";

  // super: multi-building + create/task modals
  const assigned = useMemo(() => assignedBuildings(currentUser), [currentUser]);
  const [activeBldg, setActiveBldg] = useState(assigned[0] ?? "");
  const bldg = persona === "super" ? (assigned.includes(activeBldg) ? activeBldg : assigned[0] ?? "") : "";
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<CreatePrefill | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const openCreate = (p?: CreatePrefill) => { setCreatePrefill(p ?? null); setCreateOpen(true); };

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
    () => (persona === "super" && bldg ? superTickets(bldg, tickets).filter((t) => t.status !== "Closed").length : 0),
    [persona, bldg, tickets],
  );

  const tabs: PortalTab[] = persona === "board"
    ? [
        { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
        { id: "vote", label: "Vote Center", icon: "vote", badge: voteCount },
        { id: "financials", label: "Financials", icon: "circle-dollar-sign" },
        { id: "compliance", label: "Compliance", icon: "clipboard-check" },
        { id: "projects", label: "Projects", icon: "hard-hat" },
        { id: "docs", label: "Documents", icon: "folder" },
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
              { id: "schedule", label: "Schedule", icon: "calendar-clock" },
              { id: "calendar", label: "Calendar", icon: "calendar" },
              { id: "walkthrough", label: "Walkthrough", icon: "scan" },
              { id: "systems", label: "Systems", icon: "activity" },
              { id: "directline", label: "Direct Line", icon: "messages-square" },
            ]
          : [{ id: "overview", label: "Overview", icon: "panels-top-left" }];

  const [active, setActive] = useState(tabs[0].id);

  return (
    <PortalShell accent={accent} tabs={tabs} active={active} onSelect={setActive}
      toolbar={persona === "super" ? <SuperToolbar assigned={assigned} active={bldg} onPick={setActiveBldg} /> : undefined}>
      {persona === "board" && <BoardPage tab={active} go={setActive} />}
      {persona === "resident" && <ResidentPage tab={active} go={setActive} />}
      {persona === "vendor" && <VendorPage tab={active} />}
      {persona === "super" && bldg && <SuperPage tab={active} buildingId={bldg} go={setActive} onCreate={openCreate} onOpenTask={setTaskId} />}
      {persona !== "board" && persona !== "resident" && persona !== "vendor" && persona !== "super" && <ComingOnline persona={persona} accent={accent} />}

      {persona === "super" && bldg && <SuperCreateModal open={createOpen} buildingId={bldg} prefill={createPrefill} onClose={() => setCreateOpen(false)} />}
      {persona === "super" && taskId && <SuperTaskDetail id={taskId} onClose={() => setTaskId(null)} />}
    </PortalShell>
  );
}

// ── super shell toolbar: building switcher + payroll check-in/out ──────────
function SuperToolbar({ assigned, active, onPick }: { assigned: string[]; active: string; onPick: (id: string) => void }) {
  const { currentUser, activeShift, punchIn, punchOut } = useOrbit();
  const [open, setOpen] = useState(false);
  const shift = currentUser ? activeShift(currentUser.id) : null;
  const here = buildingById(active);
  const since = shift ? new Date(shift.in).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      {/* building switcher */}
      <div style={{ position: "relative" }}>
        <button onClick={() => assigned.length > 1 && setOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-3)", cursor: assigned.length > 1 ? "pointer" : "default" }}>
          <Icon name="building-2" size={13} color="#14b8a6" />
          <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "var(--ink)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{here?.name ?? "Building"}</span>
          {assigned.length > 1 && <Icon name="chevrons-up-down" size={13} color="var(--ink-4)" />}
        </button>
        {open && assigned.length > 1 && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, minWidth: 220, padding: 6, borderRadius: 12, background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "6px 8px", fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)" }}>MY BUILDINGS</div>
              {assigned.map((id) => {
                const b = buildingById(id);
                const on = id === active;
                return (
                  <button key={id} onClick={() => { onPick(id); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", cursor: "pointer", background: on ? "rgba(20,184,166,0.1)" : "transparent", textAlign: "left" }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--fill-2)"; }}
                    onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                    <Icon name="building-2" size={15} color={on ? "#14b8a6" : "var(--ink-3)"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{b?.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{b?.code}</div>
                    </div>
                    {on && <Icon name="check" size={13} color="#14b8a6" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* payroll clock */}
      {shift ? (
        <button onClick={punchOut} title={"Checked in since " + since} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 99, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", cursor: "pointer" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 7px #22c55e" }} />
          <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "#22c55e", letterSpacing: "0.04em" }}>ON · {since}</span>
          <span style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-2)" }}>Check out</span>
        </button>
      ) : (
        <button onClick={() => punchIn(active)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-3)", cursor: "pointer" }}>
          <Icon name="clock" size={13} color="var(--ink-3)" />
          <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)" }}>Check in</span>
        </button>
      )}
    </span>
  );
}

function BoardPage({ tab, go }: { tab: string; go: (id: string) => void }) {
  switch (tab) {
    case "dashboard": return <BoardDashboard go={go} />;
    case "vote": return <VoteCenter />;
    case "financials": return <BoardFinancials />;
    case "compliance": return <BoardCompliance />;
    case "projects": return <BoardProjects />;
    case "docs": return <BoardDocs />;
    case "directline": return <DirectLinePanel heading="Direct line" opener="Hi — it's your account manager at Orbit. I'll keep the board posted on votes, finances, and building matters. Reach me here anytime." />;
    case "notices": return <NoticesPanel />;
    default: return <BoardDashboard go={go} />;
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

function SuperPage({ tab, buildingId, go, onCreate, onOpenTask }: { tab: string; buildingId: string; go: (id: string) => void; onCreate: (p?: CreatePrefill) => void; onOpenTask: (id: string) => void }) {
  switch (tab) {
    case "today": return <SuperToday buildingId={buildingId} go={go} onCreate={() => onCreate()} onOpenTask={onOpenTask} />;
    case "work": return <SuperWork buildingId={buildingId} onCreate={() => onCreate()} onOpenTask={onOpenTask} />;
    case "schedule": return <SuperSchedule buildingId={buildingId} go={go} onOpenTask={onOpenTask} />;
    case "calendar": return <SuperCalendar buildingId={buildingId} />;
    case "walkthrough": return <SuperWalkthrough buildingId={buildingId} go={go} />;
    case "systems": return <SuperSystems buildingId={buildingId} onCreate={onCreate} />;
    case "directline": return <DirectLinePanel heading="Direct line" opener="Hi — it's your account manager at Orbit. Loop me in on anything from the field: vendors, access, parts, or building issues. I'm here." />;
    default: return <SuperToday buildingId={buildingId} go={go} onCreate={() => onCreate()} onOpenTask={onOpenTask} />;
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
