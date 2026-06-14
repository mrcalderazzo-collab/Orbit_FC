import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Btn, Field, Glass, Icon, Modal, SectionLabel, Select, TextInput } from "@/components/ui";
import { useOrbit } from "@/store/OrbitProvider";
import type { CrmStage } from "@/lib/types";
import { addDaysISO, todayISO } from "@/lib/focus";
import { fmtMoney } from "@/lib/format";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const STAGES: CrmStage[] = ["Lead", "Qualified", "Discovery", "Proposal", "Negotiation", "Won"];
const TABS = ["Revenue desk", "Pipeline", "Campaigns", "AI growth", "Integrations"] as const;
const STAGE_COLOR: Record<CrmStage, string> = { Lead: "#94a3b8", Qualified: "#38bdf8", Discovery: "#818cf8", Proposal: "#a855f7", Negotiation: "#f59e0b", Won: "#22c55e", Lost: "#ef4444" };

export function SalesMarketingPage() {
  const { opportunities } = useOrbit();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Revenue desk");
  const [newLead, setNewLead] = useState(false);
  const open = opportunities.filter((o) => !["Won", "Lost"].includes(o.stage));
  const pipeline = open.reduce((n, o) => n + o.value, 0);
  const weighted = open.reduce((n, o) => n + o.value * o.probability / 100, 0);
  const due = open.filter((o) => o.nextAt <= todayISO()).length;
  return <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
    <TopBar title="Sales & Marketing" sub="Growth command · CRM, campaigns, relationships and next actions"
      right={<Btn onClick={() => setNewLead(true)}><Icon name="plus" size={14} /> New opportunity</Btn>} />
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi icon="circle-dollar-sign" label="Open pipeline" value={fmtMoney(pipeline)} sub={open.length + " active opportunities"} color="#5eead4" />
        <Kpi icon="chart-no-axes-combined" label="Weighted forecast" value={fmtMoney(weighted)} sub="probability adjusted" color="#818cf8" />
        <Kpi icon="calendar-clock" label="Actions due" value={String(due)} sub={due ? "needs attention now" : "all caught up"} color={due ? "#f59e0b" : "#22c55e"} />
        <Kpi icon="trophy" label="Won this cycle" value={fmtMoney(opportunities.filter((o) => o.stage === "Won").reduce((n, o) => n + o.value, 0))} sub="handoff to onboarding" color="#22c55e" />
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 16, padding: 4, width: "fit-content", borderRadius: 12, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
        {TABS.map((item) => <button key={item} onClick={() => setTab(item)} style={tabButton(tab === item)}>{item}</button>)}
      </div>
      {tab === "Revenue desk" && <RevenueDesk />}
      {tab === "Pipeline" && <Pipeline />}
      {tab === "Campaigns" && <Campaigns />}
      {tab === "AI growth" && <AiGrowth />}
      {tab === "Integrations" && <Integrations />}
    </div>
    <NewOpportunity open={newLead} onClose={() => setNewLead(false)} />
  </div>;
}

function RevenueDesk() {
  const { opportunities, crmActivities, updateOpportunity } = useOrbit();
  const due = opportunities.filter((o) => !["Won", "Lost"].includes(o.stage)).sort((a, b) => a.nextAt.localeCompare(b.nextAt)).slice(0, 5);
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(520px, 1.25fr) minmax(320px, .75fr)", gap: 16 }}>
    <Glass style={{ overflow: "hidden" }}>
      <div style={{ padding: 16, borderBottom: "1px solid var(--hair-2)" }}><SectionLabel>Next best actions</SectionLabel><div style={muted}>Every opportunity has an owner, date and explicit next move</div></div>
      {due.map((o) => {
        const overdue = o.nextAt <= todayISO();
        const next = STAGES[Math.min(STAGES.length - 1, STAGES.indexOf(o.stage) + 1)];
        return <div key={o.id} style={{ display: "grid", gridTemplateColumns: "8px minmax(200px, 1fr) 130px 120px", gap: 12, padding: "13px 16px", alignItems: "center", borderBottom: "1px solid var(--fill-3)" }}>
          <span style={{ width: 7, height: 38, borderRadius: 9, background: overdue ? "#f59e0b" : STAGE_COLOR[o.stage] }} />
          <div><div style={titleText}>{o.nextAction}</div><div style={muted}>{o.account} · {o.contact}</div></div>
          <div><span style={badge(STAGE_COLOR[o.stage])}>{o.stage}</span><div style={{ ...muted, marginTop: 5, color: overdue ? "#f59e0b" : "var(--ink-4)" }}>{overdue ? "DUE NOW" : o.nextAt}</div></div>
          <button onClick={() => updateOpportunity(o.id, { stage: next, nextAction: next === "Won" ? "Handoff to onboarding" : "Prepare " + next.toLowerCase() + " step", nextAt: addDaysISO(2) })} style={actionButton}>Advance stage</button>
        </div>;
      })}
    </Glass>
    <Glass style={{ padding: 17 }}>
      <SectionLabel style={{ marginBottom: 12 }}>Live relationship signal</SectionLabel>
      {crmActivities.map((a) => {
        const opp = opportunities.find((o) => o.id === a.opportunityId);
        return <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--hair-2)" }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--fill-2)", flexShrink: 0 }}><Icon name={a.type === "Meeting" ? "users" : a.type === "Call" ? "phone" : a.type === "Email" ? "mail" : "sticky-note"} size={13} color="var(--acc-text)" /></span>
          <div><div style={{ ...titleText, fontSize: 12 }}>{opp?.account}</div><p style={{ ...muted, fontFamily: SANS, fontSize: 11, lineHeight: 1.45, margin: "3px 0" }}>{a.text}</p><span style={muted}>{a.at} · {a.by}</span></div>
        </div>;
      })}
    </Glass>
  </div>;
}

function Pipeline() {
  const { opportunities, updateOpportunity } = useOrbit();
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(190px, 1fr))", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
    {STAGES.map((stage) => {
      const list = opportunities.filter((o) => o.stage === stage);
      return <div key={stage} style={{ minWidth: 190 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 3px 9px" }}><span style={{ width: 7, height: 7, borderRadius: 9, background: STAGE_COLOR[stage] }} /><span style={sectionText}>{stage}</span><span style={{ ...muted, marginLeft: "auto" }}>{list.length} · {fmtMoney(list.reduce((n, o) => n + o.value, 0))}</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {list.map((o) => <Glass key={o.id} style={{ padding: 12, borderTop: "2px solid " + STAGE_COLOR[stage] }}>
            <div style={{ ...titleText, marginBottom: 3 }}>{o.account}</div><div style={muted}>{o.contact}</div>
            <div style={{ display: "flex", alignItems: "baseline", margin: "13px 0 9px" }}><span style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, color: "var(--ink)" }}>{fmtMoney(o.value)}</span><span style={{ ...muted, marginLeft: "auto" }}>{o.probability}%</span></div>
            <div style={{ ...muted, fontFamily: SANS, fontSize: 10.5, lineHeight: 1.4, minHeight: 30 }}>{o.nextAction}</div>
            {stage !== "Won" && <button onClick={() => updateOpportunity(o.id, { stage: STAGES[Math.min(STAGES.length - 1, STAGES.indexOf(stage) + 1)] })} style={{ ...actionButton, width: "100%", marginTop: 10 }}>Move forward</button>}
          </Glass>)}
        </div>
      </div>;
    })}
  </div>;
}

function Campaigns() {
  const { campaigns } = useOrbit();
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
    {campaigns.map((c) => {
      const conversion = c.leads ? Math.round(c.meetings / c.leads * 100) : 0;
      return <Glass key={c.id} style={{ padding: 17 }}>
        <div style={{ display: "flex", alignItems: "center" }}><span style={badge(c.status === "Live" ? "#22c55e" : c.status === "Draft" ? "#f59e0b" : "#94a3b8")}>{c.status}</span><span style={{ ...muted, marginLeft: "auto" }}>{c.channel}</span></div>
        <h3 style={{ ...titleText, fontSize: 16, margin: "13px 0 4px" }}>{c.name}</h3><p style={{ ...muted, fontFamily: SANS, fontSize: 11.5 }}>Audience {c.audience.toLocaleString()} · Spend ${c.spend.toLocaleString()}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}><Mini label="Leads" value={String(c.leads)} /><Mini label="Meetings" value={String(c.meetings)} /><Mini label="Conversion" value={conversion + "%"} /></div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--hair-2)", display: "flex", justifyContent: "space-between" }}><SectionLabel>Influenced pipeline</SectionLabel><strong style={{ fontFamily: MONO, fontSize: 12, color: "var(--acc-text)" }}>{fmtMoney(c.pipeline)}</strong></div>
      </Glass>;
    })}
  </div>;
}

function AiGrowth() {
  const signals = [
    ["Prioritize Riverside Portfolio", "Commercial terms are approved. A tailored 30-day transition plan is the shortest path to close.", "94%", "#22c55e"],
    ["Re-engage West 14th Owners", "The board president has not replied in three days and the management assessment is due today.", "88%", "#f59e0b"],
    ["Expand the Local Law webinar", "This campaign has the strongest meeting-to-pipeline ratio and a repeatable compliance hook.", "91%", "#818cf8"],
    ["Build a Brookline integration map", "Their six-property stack is the main sales risk. Lead with migration sequencing and data ownership.", "84%", "#38bdf8"],
  ];
  return <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
    <Glass style={{ padding: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 15 }}><Icon name="sparkles" size={17} color="var(--acc-text)" /><div><SectionLabel>Growth copilot</SectionLabel><div style={muted}>Evidence-backed recommendations, always human approved</div></div></div>
      {signals.map(([title, body, confidence, color]) => <div key={title} style={{ padding: 13, borderRadius: 12, border: "1px solid var(--hair-2)", background: "var(--fill-1)", marginBottom: 9 }}>
        <div style={{ display: "flex", alignItems: "center" }}><span style={titleText}>{title}</span><span style={{ ...badge(color), marginLeft: "auto" }}>{confidence} confidence</span></div><p style={{ ...muted, fontFamily: SANS, fontSize: 11.5, lineHeight: 1.55, margin: "8px 0 0" }}>{body}</p>
      </div>)}
    </Glass>
    <Glass style={{ padding: 18 }}><SectionLabel>AI operating rules</SectionLabel>
      {["Never send external communication without approval", "Show source evidence behind lead scoring", "Separate observed facts from model inference", "Log every generated draft and human edit", "Do not train on private customer data by default"].map((rule, i) => <div key={rule} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--hair-2)" }}><span style={{ ...badge("#5eead4"), flexShrink: 0 }}>0{i + 1}</span><span style={{ ...titleText, fontWeight: 400 }}>{rule}</span></div>)}
    </Glass>
  </div>;
}

function Integrations() {
  const tools = [
    ["Google Workspace / Microsoft 365", "Email, calendar, contacts and meeting history", "Connect first", "mail", "#5eead4"],
    ["Twilio", "SMS, tracked calls and resident-safe outreach numbers", "Ready", "message-square", "#ef4444"],
    ["DocuSign", "Proposal, agreement and management contract signatures", "Ready", "pen-tool", "#f4c95d"],
    ["HubSpot", "Import or bi-directional migration for existing CRM history", "Optional", "database", "#f97316"],
    ["Google Ads + Meta", "Campaign attribution, audiences and conversion signals", "Phase 2", "megaphone", "#818cf8"],
    ["Zoom / Microsoft Teams", "Meeting capture, notes and follow-up tasks", "Ready", "video", "#38bdf8"],
  ];
  return <div>
    <Glass style={{ padding: 16, marginBottom: 14, borderLeft: "3px solid var(--acc)" }}><div style={titleText}>Recommended connection order</div><p style={{ ...muted, fontFamily: SANS, fontSize: 11.5, lineHeight: 1.55, margin: "6px 0 0" }}>Start with email/calendar, calling and e-signature. Those create the clean activity history and closed-loop workflow the CRM needs. Paid media and migration connectors come after the operating model is stable.</p></Glass>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 12 }}>
      {tools.map(([name, desc, state, icon, color]) => <Glass key={name} style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 11 }}><span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: color + "12", border: "1px solid " + color + "35" }}><Icon name={icon} size={17} color={color} /></span><div style={{ flex: 1 }}><div style={titleText}>{name}</div><p style={{ ...muted, fontFamily: SANS, fontSize: 11, lineHeight: 1.45 }}>{desc}</p></div><span style={badge(color)}>{state}</span></div>
        <button style={{ ...actionButton, width: "100%", marginTop: 10 }}>Configure connection</button>
      </Glass>)}
    </div>
  </div>;
}

function NewOpportunity({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addOpportunity } = useOrbit();
  const [account, setAccount] = useState(""); const [contact, setContact] = useState(""); const [email, setEmail] = useState(""); const [value, setValue] = useState("75000"); const [stage, setStage] = useState<CrmStage>("Lead");
  const submit = () => { if (!account || !contact) return; addOpportunity({ account, contact, email, stage, value: Number(value) || 0, probability: stage === "Lead" ? 15 : 30, source: "Manual entry", owner: "maya", nextAction: "Complete account research", nextAt: addDaysISO(1), properties: 1, units: 0, tags: ["New"] }); onClose(); setAccount(""); setContact(""); setEmail(""); };
  return <Modal open={open} onClose={onClose} title="New opportunity" sub="Create a clear owner and next action" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn onClick={submit}>Add to pipeline</Btn></>}>
    <Field label="Account / property"><TextInput value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Building, board or portfolio" /></Field>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Primary contact"><TextInput value={contact} onChange={(e) => setContact(e.target.value)} /></Field><Field label="Email"><TextInput value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Estimated annual value"><TextInput type="number" value={value} onChange={(e) => setValue(e.target.value)} /></Field><Field label="Starting stage"><Select options={STAGES.slice(0, 3)} value={stage} onChange={(v) => setStage(v as CrmStage)} /></Field></div>
  </Modal>;
}

function Kpi({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) { return <Glass style={{ padding: 15 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name={icon} size={15} color={color} /><SectionLabel>{label}</SectionLabel></div><div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 650, color: "var(--ink)", margin: "10px 0 2px" }}>{value}</div><div style={muted}>{sub}</div></Glass>; }
function Mini({ label, value }: { label: string; value: string }) { return <div style={{ padding: 9, borderRadius: 9, background: "var(--fill-2)" }}><div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 650, color: "var(--ink)" }}>{value}</div><div style={muted}>{label}</div></div>; }
const titleText = { fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)" } as const;
const sectionText = { fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink-2)", textTransform: "uppercase" } as const;
const muted = { fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" } as const;
const badge = (color: string) => ({ display: "inline-flex", width: "fit-content", alignItems: "center", padding: "3px 7px", borderRadius: 99, color, border: "1px solid " + color + "44", background: color + "0c", fontFamily: MONO, fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" } as const);
const tabButton = (on: boolean) => ({ padding: "8px 12px", border: "none", borderRadius: 9, background: on ? "var(--panel-solid)" : "transparent", color: on ? "var(--ink)" : "var(--ink-3)", fontFamily: SANS, fontSize: 12, fontWeight: on ? 600 : 400, cursor: "pointer", boxShadow: on ? "0 3px 12px rgba(0,0,0,.16)" : "none" } as const);
const actionButton = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--fill-2)", color: "var(--ink-2)", fontFamily: MONO, fontSize: 8.5, fontWeight: 700, cursor: "pointer" } as const;
