import { OrbitProvider, useOrbit } from "@/store/OrbitProvider";
import { Login } from "@/features/auth/Login";
import { Sidebar } from "@/components/shell/Sidebar";
import { Toast } from "@/components/shell/TopBar";
import { TicketsPage } from "@/features/tickets/TicketsPage";
import { TicketCommand } from "@/features/tickets/command/TicketCommand";
import { CommsPage } from "@/features/comms/CommsPage";
import { AIReviewPage } from "@/features/ai/AIReviewPage";
import { ComingSoon, ExternalPortal } from "@/features/placeholder/ComingSoon";

function CurrentPage() {
  const { route, currentUser } = useOrbit();
  if (currentUser && currentUser.persona !== "operator") return <ExternalPortal />;
  switch (route.page) {
    case "tickets":
      return <TicketsPage />;
    case "comms":
      return <CommsPage />;
    case "ai":
      return <AIReviewPage />;
    case "dashboard":
      return <ComingSoon title="Command Deck" icon="layout-dashboard" note="Portfolio dashboard — income trend, open work, AI queue, docked board chat. Three layout variants (command / briefing / bento)." />;
    case "emergencies":
      return <ComingSoon title="Emergency Desk" icon="siren" note="Pulse tiles (Potential / Active / Resolved), severity-striped rows, response-log timeline, and a 3-step Create Intake wizard with an optional auto-spawned linked work ticket." />;
    case "buildings":
      return <ComingSoon title="Buildings" icon="building-2" note="Directory → building detail: Overview, Building Systems with AI health prediction, Documents, Leases, People, Tickets, Audit Chain." />;
    case "notices":
      return <ComingSoon title="Notices" icon="megaphone" note="Broadcast notices across Email · SMS · Push · In-app, with audience targeting and delivery status." />;
    case "integrations":
      return <ComingSoon title="Integrations" icon="blocks" note="Connect Gmail, Slack, QuickBooks, DocuSign, Stripe and more — intake routing, ledger sync, e-signing." />;
    case "vendors":
      return <ComingSoon title="Vendors" icon="wrench" note="Vendor directory today; the Vendor Command Center (COIs, rate cards, tri-source grade, job history) is on the roadmap." />;
    default:
      return <TicketsPage />;
  }
}

function Shell() {
  const { currentUser, commandId, closeCommand } = useOrbit();
  if (!currentUser) return <Login />;
  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <CurrentPage />
      </main>
      {commandId && <TicketCommand id={commandId} onClose={closeCommand} />}
    </div>
  );
}

export default function App() {
  return (
    <OrbitProvider>
      <Shell />
      <Toast />
    </OrbitProvider>
  );
}
