import { useEffect, useState } from "react";
import { OrbitProvider, useOrbit } from "@/store/OrbitProvider";
import { Login } from "@/features/auth/Login";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import { Sidebar } from "@/components/shell/Sidebar";
import { Toast } from "@/components/shell/TopBar";
import { TicketsPage } from "@/features/tickets/TicketsPage";
import { TicketCommand } from "@/features/tickets/command/TicketCommand";
import { CommsPage } from "@/features/comms/CommsPage";
import { VendorsPage } from "@/features/vendors/VendorsPage";
import { NoticesPage } from "@/features/notices/NoticesPage";
import { FinancePage } from "@/features/finance/FinancePage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { AIReviewPage } from "@/features/ai/AIReviewPage";
import { RoleDashboard } from "@/features/dashboard/RoleDashboard";
import { PlannerPage } from "@/features/planner/PlannerPage";
import { DataCenterPage } from "@/features/datacenter/DataCenterPage";
import { LiveOpsPage } from "@/features/live/LiveOpsPage";
import { BuildingsPage } from "@/features/buildings/BuildingsPage";
import { EmergencyDeskPage } from "@/features/emergencies/EmergencyDeskPage";
import { ComingSoon } from "@/features/placeholder/ComingSoon";
import { Portal } from "@/features/portal/Portal";
import { OwnerConsole } from "@/features/owner/OwnerConsole";
import { SalesMarketingPage } from "@/features/sales/SalesMarketingPage";

function CurrentPage() {
  const { route } = useOrbit();
  switch (route.page) {
    case "tickets":
      return <TicketsPage />;
    case "comms":
      return <CommsPage />;
    case "ai":
      return <AIReviewPage />;
    case "dashboard":
      return <RoleDashboard />;
    case "planner":
      return <PlannerPage />;
    case "live":
      return <LiveOpsPage />;
    case "emergencies":
      return <EmergencyDeskPage />;
    case "buildings":
      return <BuildingsPage buildingId={route.id} />;
    case "owner":
      return <OwnerConsole />;
    case "sales":
      return <SalesMarketingPage />;
    case "notices":
      return <NoticesPage />;
    case "finance":
      return <FinancePage />;
    case "reports":
      return <ReportsPage />;
    case "datacenter":
      return <DataCenterPage />;
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
  const [search, setSearch] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch((s) => !s); } };
    const open = () => setSearch(true);
    window.addEventListener("keydown", h);
    window.addEventListener("orbit-open-search", open);
    return () => { window.removeEventListener("keydown", h); window.removeEventListener("orbit-open-search", open); };
  }, []);
  if (!currentUser) return <Login />;
  if (currentUser.persona !== "operator") return <Portal />;
  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <CurrentPage />
      </main>
      {commandId && <TicketCommand id={commandId} onClose={closeCommand} />}
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
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
