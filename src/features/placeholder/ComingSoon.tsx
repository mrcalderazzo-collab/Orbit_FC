// Placeholder for operator surfaces on the roadmap but outside this first slice
// (Command Deck, Emergency Desk, Buildings, Systems, Notices, Integrations,
// Vendors). Keeps nav honest while the Ticket Command + Communications slice
// is the focus.
import { Glass, Icon, SectionLabel } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function ComingSoon({ title, icon, note }: { title: string; icon: string; note: string }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title={title} sub="Designed · next in the build order" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <Glass style={{ padding: 36, maxWidth: 460, textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 18px", background: "rgba(var(--acc-rgb),0.08)", border: "1px solid rgba(var(--acc-rgb),0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={28} color="var(--acc-text)" />
          </div>
          <SectionLabel style={{ marginBottom: 12, textAlign: "center" }}>On the roadmap</SectionLabel>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>{note}</p>
          <p style={{ margin: "16px 0 0", fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>
            First slice: Ticket Command + Communications
          </p>
        </Glass>
      </div>
    </div>
  );
}

export function ExternalPortal() {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <Glass style={{ padding: 36, maxWidth: 480, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 18px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="panels-top-left" size={28} color="#3b82f6" />
        </div>
        <SectionLabel style={{ marginBottom: 12, textAlign: "center" }}>External portal</SectionLabel>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
          Board / Resident / Vendor portals come after the operator slice. Board votes will
          flow through the shared ballot store and appear live in the operator's Ticket Command.
          Use the account menu's <b style={{ color: "var(--ink)" }}>Orbit team</b> accounts to return to the command app.
        </p>
      </Glass>
    </div>
  );
}
