import { OrbitProvider, useOrbit } from "@/store/OrbitProvider";
import { Login } from "@/features/auth/Login";
import { Sidebar } from "@/components/shell/Sidebar";
import { Toast } from "@/components/shell/TopBar";
import { TicketsPage } from "@/features/tickets/TicketsPage";
import { TicketCommand } from "@/features/tickets/command/TicketCommand";
import { CommsPage } from "@/features/comms/CommsPage";
import { VendorsPage } from "@/features/vendors/VendorsPage";
import { NoticesPage } from "@/features/notices/NoticesPage";
import { FinancePage } from "@/features/finance/FinancePage";
import { AIReviewPage } from "@/features/ai/AIReviewPage";
import { CommandDeck } from "@/features/dashboard/CommandDeck";
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
      return <CommandDeck />;
    case "emergencies":
      return <ComingSoon title="Emergency Desk" icon="siren" note="Pulse tiles (Potential / Active / Resolved), severity-striped rows, response-log timeline, and a 3-step Create Intake wizard with an optional auto-spawned linked work ticket." />;
    case "buildings":
      return <ComingSoon title="Buildings" icon="building-2" note="Directory → building detail: Overview, Building Systems with AI health prediction, Documents, Leases, People, Tickets, Audit Chain." />;
    case "notices":
      return <NoticesPage />;
    case "finance":
      return <FinancePage />;
    case "integrations":
      return <ComingSoon title="Integrations" icon="blocks" note="Connect Gmail, Slack, QuickBooks, DocuSign, Stripe and more — intake routing, ledger sync, e-signing." />;
    case "vendors":
      return <VendorsPage />;
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
