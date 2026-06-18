// IntegrationsHub — the connector catalog. Connection state is real and persisted
// (toggleIntegration → store), so the UI, routing rules, and audit spine treat a
// connector as on/off today; the actual OAuth handshake + data sync land when the
// backend + credentials exist (each card says what it will sync).
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { TopBar } from "@/components/shell/TopBar";
import { Glass, Icon, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

interface Connector { id: string; name: string; category: string; icon: string; color: string; syncs: string; note: string }
const CONNECTORS: Connector[] = [
  { id: "gmail", name: "Gmail / Google Workspace", category: "Email & messaging", icon: "mail", color: "#ea4335", syncs: "Inbound email → intake routing", note: "Turn resident/vendor emails into routed tickets." },
  { id: "outlook", name: "Outlook / Microsoft 365", category: "Email & messaging", icon: "mail", color: "#0078d4", syncs: "Inbound email → intake routing", note: "Same intake pipeline for Microsoft shops." },
  { id: "twilio", name: "Twilio", category: "Email & messaging", icon: "message-square", color: "#f22f46", syncs: "Two-way SMS on tickets & threads", note: "Real SMS send + delivery state for the comms layer." },
  { id: "slack", name: "Slack", category: "Email & messaging", icon: "hash", color: "#611f69", syncs: "Ops alerts & escalations", note: "Push emergencies and SLA breaches to a channel." },
  { id: "quickbooks", name: "QuickBooks", category: "Finance", icon: "circle-dollar-sign", color: "#2ca01c", syncs: "Invoices, AP, budgets", note: "Two-way sync for the finance controls chain." },
  { id: "stripe", name: "Stripe", category: "Finance", icon: "credit-card", color: "#635bff", syncs: "Resident payments & assessments", note: "Collect dues and special assessments in-portal." },
  { id: "plaid", name: "Plaid", category: "Finance", icon: "landmark", color: "#111", syncs: "Operating & reserve balances", note: "Live bank balances on the building finance posture." },
  { id: "docusign", name: "DocuSign", category: "Documents", icon: "file-signature", color: "#d8482a", syncs: "Contracts, COIs, board resolutions", note: "E-sign vendor contracts and governance docs." },
  { id: "drive", name: "Google Drive", category: "Documents", icon: "folder", color: "#1da462", syncs: "Building document storage", note: "Back the building Documents tab with real files." },
  { id: "butterflymx", name: "ButterflyMX", category: "Building systems", icon: "door-open", color: "#00b3a4", syncs: "Access events & visitor logs", note: "Tie front-door access to the building activity spine." },
  { id: "honeywell", name: "Honeywell / BMS", category: "Building systems", icon: "thermometer", color: "#e1251b", syncs: "HVAC & equipment telemetry", note: "Feed real system health into building health." },
];

export function IntegrationsHub() {
  const { integrations, toggleIntegration } = useOrbit();
  const connected = new Set(integrations);
  const categories = useMemo(() => [...new Set(CONNECTORS.map((c) => c.category))], []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Integrations" sub={`${connected.size} connected · ${CONNECTORS.length} available`} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>
        <Glass style={{ padding: "12px 15px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }} accent="#3b82f6">
          <Icon name="info" size={15} color="#3b82f6" />
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
            Connection state is live and saved. The OAuth handshake and data sync activate once the backend + credentials are configured — each connector lists exactly what it will move.
          </span>
        </Glass>

        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 10 }}>{cat}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {CONNECTORS.filter((c) => c.category === cat).map((c) => {
                const on = connected.has(c.id);
                return (
                  <Glass key={c.id} style={{ padding: 16 }} accent={on ? "#22c55e" : c.color}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: c.color + "1a", flexShrink: 0 }}><Icon name={c.icon} size={19} color={c.color} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.name}</span>
                          {on && <Tag color="#22c55e">Connected</Tag>}
                        </div>
                        <span style={{ display: "block", marginTop: 3, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.syncs}</span>
                      </div>
                    </div>
                    <p style={{ margin: "11px 0 13px", fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, minHeight: 34 }}>{c.note}</p>
                    <button onClick={() => toggleIntegration(c.id, c.name)} style={{ width: "100%", padding: "9px 0", borderRadius: 9, cursor: "pointer", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, border: "1px solid " + (on ? "var(--hair-strong)" : "var(--acc)"), background: on ? "var(--fill-2)" : "rgba(var(--acc-rgb),0.12)", color: on ? "var(--ink-3)" : "var(--acc-text)" }}>
                      {on ? "Disconnect" : "Connect"}
                    </button>
                  </Glass>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
