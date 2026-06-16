import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Btn, Field, Glass, Icon, Modal, SectionLabel, Select, TextInput } from "@/components/ui";
import { useOrbit } from "@/store/OrbitProvider";
import { ACCESS_AREAS } from "@/data/organization";
import { CORE_PERMISSION_RULES, EMERGENCY_WORKFLOW, PRODUCTION_MODULES, PRODUCTION_SPINE_CODE } from "@/lib/operatingSpine";
import type { Building, OrgMember, UiDirection } from "@/lib/types";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const TABS = ["People & access", "Departments", "Buildings", "Audit log", "Design lab", "Operating spine"] as const;

export function OwnerConsole() {
  const orbit = useOrbit();
  const [tab, setTab] = useState<(typeof TABS)[number]>("People & access");
  const [addPerson, setAddPerson] = useState(false);
  const [addBuilding, setAddBuilding] = useState(false);
  const active = orbit.orgMembers.filter((m) => m.status === "Active").length;
  const restricted = orbit.orgMembers.filter((m) => !m.access.includes("all")).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Owner Console" sub="Organization control center · access, structure and system design"
        right={<span style={pill("#f4c95d")}><Icon name="crown" size={13} color="#f4c95d" />OWNER CONTROL</span>} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
          <Metric icon="users" label="Team members" value={String(orbit.orgMembers.length)} sub={active + " active"} color="#5eead4" />
          <Metric icon="shield-check" label="Scoped access" value={String(restricted)} sub="least-privilege roles" color="#a855f7" />
          <Metric icon="building-2" label="Managed buildings" value={String(orbit.orgBuildings.length)} sub={orbit.orgBuildings.reduce((n, b) => n + b.units, 0) + " units"} color="#3b82f6" />
          <Metric icon="history" label="Audit events" value={String(orbit.orgAudit.length)} sub="tamper-evident log" color="#f4c95d" />
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 16, padding: 4, width: "fit-content", borderRadius: 12, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
          {TABS.map((item) => <button key={item} onClick={() => setTab(item)} style={tabButton(tab === item)}>{item}</button>)}
        </div>

        {tab === "People & access" && <PeopleAccess onAdd={() => setAddPerson(true)} />}
        {tab === "Departments" && <Departments />}
        {tab === "Buildings" && <Buildings onAdd={() => setAddBuilding(true)} />}
        {tab === "Audit log" && <Audit />}
        {tab === "Design lab" && <DesignLab />}
        {tab === "Operating spine" && <OperatingSpine />}
      </div>
      <AddPersonModal open={addPerson} onClose={() => setAddPerson(false)} />
      <AddBuildingModal open={addBuilding} onClose={() => setAddBuilding(false)} />
    </div>
  );
}

function PeopleAccess({ onAdd }: { onAdd: () => void }) {
  const { orgMembers, departments, updateOrgMember, removeOrgMember } = useOrbit();
  const [selected, setSelected] = useState(orgMembers[0]?.id || "");
  const member = orgMembers.find((m) => m.id === selected) || orgMembers[0];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(520px, 1.35fr) minmax(320px, .65fr)", gap: 16, alignItems: "start" }}>
      <Glass style={{ overflow: "hidden" }}>
        <div style={{ padding: 16, display: "flex", alignItems: "center", borderBottom: "1px solid var(--hair-2)" }}>
          <div><SectionLabel>Organization directory</SectionLabel><small style={muted}>{orgMembers.length} identities under owner control</small></div>
          <Btn onClick={onAdd} style={{ marginLeft: "auto" }}><Icon name="user-plus" size={14} /> Add person</Btn>
        </div>
        {orgMembers.map((m) => {
          const dept = departments.find((d) => d.id === m.departmentId);
          return <button key={m.id} onClick={() => setSelected(m.id)} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(180px,1fr) 150px 110px 92px", gap: 12, alignItems: "center", padding: "12px 16px", border: "none", borderBottom: "1px solid var(--fill-3)", background: selected === m.id ? "rgba(var(--acc-rgb),.07)" : "transparent", cursor: "pointer", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: m.color + "18", border: "1px solid " + m.color + "44", color: m.color, fontFamily: MONO, fontSize: 10, fontWeight: 800 }}>{m.initials}</span>
              <div style={{ minWidth: 0 }}><div style={titleText}>{m.name}</div><div style={muted}>{m.title}</div></div>
            </div>
            <span style={{ ...muted, color: dept?.color }}>{dept?.name}</span>
            <span style={status(m.status === "Active" ? "#22c55e" : m.status === "Invited" ? "#f59e0b" : "#ef4444")}>{m.status}</span>
            <span style={{ ...muted, textAlign: "right" }}>{m.lastActive}</span>
          </button>;
        })}
      </Glass>
      {member && <Glass style={{ padding: 18 }}>
        <SectionLabel style={{ marginBottom: 5 }}>Access inspector</SectionLabel>
        <h3 style={{ margin: "0 0 3px", fontFamily: SANS, color: "var(--ink)", fontSize: 18 }}>{member.name}</h3>
        <div style={{ ...muted, marginBottom: 16 }}>{member.email}</div>
        <Field label="Department">
          <Select options={departments.map((d) => ({ value: d.id, label: d.name }))} value={member.departmentId} onChange={(departmentId) => updateOrgMember(member.id, { departmentId })} />
        </Field>
        <Field label="Account status">
          <Select options={["Active", "Invited", "Suspended"]} value={member.status} onChange={(value) => updateOrgMember(member.id, { status: value as OrgMember["status"] })} />
        </Field>
        <SectionLabel style={{ margin: "18px 0 8px" }}>Permission areas</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {ACCESS_AREAS.map((area) => {
            const all = member.access.includes("all");
            const checked = all || member.access.includes(area);
            return <label key={area} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", borderRadius: 9, border: "1px solid " + (checked ? "rgba(var(--acc-rgb),.24)" : "var(--hair-2)"), background: checked ? "rgba(var(--acc-rgb),.06)" : "transparent", fontFamily: SANS, fontSize: 12, color: checked ? "var(--ink)" : "var(--ink-3)", cursor: all ? "not-allowed" : "pointer", textTransform: "capitalize" }}>
              <input type="checkbox" checked={checked} disabled={all} onChange={() => updateOrgMember(member.id, { access: checked ? member.access.filter((p) => p !== area) : [...member.access, area] })} />
              {area}
            </label>;
          })}
        </div>
        {!member.access.includes("all") && <button onClick={() => removeOrgMember(member.id)} style={{ width: "100%", marginTop: 18, padding: 10, borderRadius: 10, border: "1px solid #ef444455", background: "#ef44440b", color: "#ef4444", fontFamily: MONO, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>REMOVE FROM ORGANIZATION</button>}
      </Glass>}
    </div>
  );
}

function Departments() {
  const { departments, orgMembers } = useOrbit();
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
    {departments.map((d) => {
      const members = orgMembers.filter((m) => m.departmentId === d.id);
      return <Glass key={d.id} style={{ padding: 17, borderTop: "2px solid " + d.color }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="network" size={18} color={d.color} /><h3 style={{ ...titleText, fontSize: 15, flex: 1 }}>{d.name}</h3><span style={status(d.color)}>{members.length} people</span></div>
        <p style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.55, color: "var(--ink-3)", minHeight: 38 }}>{d.mandate}</p>
        <div style={{ borderTop: "1px solid var(--hair-2)", paddingTop: 11 }}><SectionLabel>Department lead</SectionLabel><div style={{ ...titleText, marginTop: 5 }}>{d.lead}</div></div>
      </Glass>;
    })}
  </div>;
}

function Buildings({ onAdd }: { onAdd: () => void }) {
  const { orgBuildings, removeOrgBuilding } = useOrbit();
  return <Glass style={{ overflow: "hidden" }}>
    <div style={{ padding: 16, display: "flex", alignItems: "center", borderBottom: "1px solid var(--hair-2)" }}>
      <div><SectionLabel>Building registry</SectionLabel><small style={muted}>Owner-controlled portfolio records</small></div>
      <Btn onClick={onAdd} style={{ marginLeft: "auto" }}><Icon name="building-2" size={14} /> Add building</Btn>
    </div>
    {orgBuildings.map((b) => <div key={b.id} style={{ display: "grid", gridTemplateColumns: "90px minmax(220px,1fr) 110px 100px 100px 90px", gap: 12, padding: "12px 16px", alignItems: "center", borderBottom: "1px solid var(--fill-3)" }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: b.mono }}>{b.code}</span>
      <div><div style={titleText}>{b.name}</div><div style={muted}>{b.address}</div></div>
      <span style={muted}>{b.type}</span><span style={muted}>{b.units} units</span><span style={status("#22c55e")}>{b.status}</span>
      <button onClick={() => removeOrgBuilding(b.id)} style={{ border: "none", background: "transparent", color: "#ef4444", fontFamily: MONO, fontSize: 9, cursor: "pointer" }}>REMOVE</button>
    </div>)}
  </Glass>;
}

function Audit() {
  const { orgAudit } = useOrbit();
  return <Glass style={{ padding: 18 }}>
    <SectionLabel style={{ marginBottom: 12 }}>Organization audit trail</SectionLabel>
    {orgAudit.map((e, i) => <div key={e.id} style={{ display: "grid", gridTemplateColumns: "130px 150px minmax(180px,1fr) 1fr", gap: 14, padding: "12px 4px", borderBottom: i < orgAudit.length - 1 ? "1px solid var(--hair-2)" : "none" }}>
      <span style={muted}>{e.at}</span><span style={titleText}>{e.actor}</span><span style={{ ...titleText, fontWeight: 400 }}>{e.action}</span><span style={{ ...muted, color: "var(--acc-text)" }}>{e.target}</span>
    </div>)}
  </Glass>;
}

function DesignLab() {
  const { uiDirection, setUiDirection } = useOrbit();
  const directions: { name: UiDirection; sub: string; color: string; layout: string[] }[] = [
    { name: "Command", sub: "Dense, immediate, operational. Best for daily control.", color: "#5eead4", layout: ["22%", "46%", "28%"] },
    { name: "Editorial", sub: "Calmer hierarchy, larger type, guided reading flow.", color: "#f4c95d", layout: ["60%", "34%", "44%"] },
    { name: "Spatial", sub: "Building-first canvas with maps, layers and context.", color: "#818cf8", layout: ["38%", "38%", "72%"] },
  ];
  return <div>
    <div style={{ marginBottom: 14 }}><h2 style={{ ...titleText, fontSize: 19, margin: 0 }}>Choose a product direction</h2><p style={{ ...muted, maxWidth: 680 }}>These are controlled UI explorations. Selecting one records the preferred direction without prematurely changing every operational screen.</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {directions.map((d) => {
        const on = uiDirection === d.name;
        return <button key={d.name} onClick={() => setUiDirection(d.name)} style={{ textAlign: "left", padding: 16, borderRadius: 16, border: "1px solid " + (on ? d.color : "var(--hair-2)"), background: on ? d.color + "0d" : "var(--panel)", cursor: "pointer" }}>
          <div style={{ height: 155, borderRadius: 12, padding: 12, background: "#090b10", border: "1px solid " + d.color + "33", marginBottom: 14 }}>
            <div style={{ height: 9, width: "35%", borderRadius: 9, background: d.color, marginBottom: 16 }} />
            {d.layout.map((w, i) => <div key={i} style={{ height: i === 2 ? 48 : 22, width: w, borderRadius: 7, background: i === 2 ? d.color + "18" : "#ffffff10", border: "1px solid " + (i === 2 ? d.color + "35" : "#ffffff0d"), marginBottom: 9 }} />)}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}><h3 style={{ ...titleText, margin: 0, fontSize: 16 }}>{d.name}</h3>{on && <span style={{ ...status(d.color), marginLeft: "auto" }}>Selected</span>}</div>
          <p style={{ ...muted, lineHeight: 1.5 }}>{d.sub}</p>
        </button>;
      })}
    </div>
  </div>;
}

function OperatingSpine() {
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(520px, 1.2fr) minmax(360px, .8fr)", gap: 16, alignItems: "start" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Glass style={{ padding: 18, borderLeft: "3px solid var(--acc)" }}>
        <SectionLabel style={{ marginBottom: 10 }}>Production spine</SectionLabel>
        <h2 style={{ margin: 0, fontFamily: SANS, fontSize: 21, color: "var(--ink)" }}>The code contract for a 50-to-4000 building operating system</h2>
        <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
          Every module below should be backed by durable records, permission checks, events, search indexes, notifications and human-approved agents.
        </p>
      </Glass>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {PRODUCTION_MODULES.map((mod) => <Glass key={mod.id} style={{ padding: 15 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--acc)" }} />
            <h3 style={{ ...titleText, margin: 0, fontSize: 14 }}>{mod.label}</h3>
          </div>
          <p style={{ margin: "0 0 10px", fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{mod.purpose}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {mod.entities.slice(0, 5).map((entity) => <span key={entity} style={miniPill("var(--ink-3)")}>{entity}</span>)}
          </div>
          <ul style={{ margin: 0, paddingLeft: 17, color: "var(--ink-3)", fontFamily: SANS, fontSize: 11.5, lineHeight: 1.55 }}>
            {mod.mustHave.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div style={{ ...muted, marginTop: 11, lineHeight: 1.45 }}>{mod.scaleNote}</div>
        </Glass>)}
      </div>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Glass style={{ padding: 16 }}>
        <SectionLabel style={{ marginBottom: 11 }}>Emergency workflow code</SectionLabel>
        <h3 style={{ ...titleText, fontSize: 15, margin: "0 0 4px" }}>{EMERGENCY_WORKFLOW.name}</h3>
        <p style={{ ...muted, fontFamily: SANS, fontSize: 11.5, lineHeight: 1.5 }}>{EMERGENCY_WORKFLOW.appliesTo}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 13 }}>
          {EMERGENCY_WORKFLOW.steps.map((step, index) => <div key={step.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 10, padding: 10, borderRadius: 11, background: "var(--fill-1)", border: "1px solid var(--hair-2)" }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(var(--acc-rgb),.12)", color: "var(--acc-text)", fontFamily: MONO, fontSize: 9, fontWeight: 800 }}>{index + 1}</span>
            <span>
              <span style={{ ...titleText, display: "block" }}>{step.label}</span>
              <span style={{ ...muted, display: "block", marginTop: 3 }}>Owner: {step.ownerRole}{step.slaHours ? " · SLA " + step.slaHours + "h" : ""}</span>
              <span style={{ ...muted, display: "block", marginTop: 5, color: "var(--ink-3)" }}>Exit: {step.exitCriteria.join(" · ")}</span>
            </span>
          </div>)}
        </div>
      </Glass>

      <Glass style={{ padding: 16 }}>
        <SectionLabel style={{ marginBottom: 11 }}>Permission rules</SectionLabel>
        {CORE_PERMISSION_RULES.map((rule) => <div key={rule.id} style={{ padding: "9px 0", borderBottom: "1px solid var(--hair-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={miniPill("#f4c95d")}>{rule.role}</span>
            <span style={miniPill("#38bdf8")}>{rule.entity}</span>
            <span style={{ ...muted, marginLeft: "auto" }}>{rule.scope}</span>
          </div>
          <div style={{ marginTop: 5, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.45 }}>{rule.reason}</div>
        </div>)}
      </Glass>

      <Glass style={{ padding: 16 }}>
        <SectionLabel style={{ marginBottom: 10 }}>Starter code</SectionLabel>
        <pre style={{ margin: 0, padding: 13, borderRadius: 12, background: "#05070b", border: "1px solid var(--hair-2)", color: "var(--ink-2)", fontFamily: MONO, fontSize: 10, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{PRODUCTION_SPINE_CODE}</pre>
      </Glass>
    </div>
  </div>;
}

function AddPersonModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { departments, addOrgMember } = useOrbit();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [title, setTitle] = useState(""); const [departmentId, setDepartment] = useState("operations");
  const submit = () => { if (!name || !email) return; addOrgMember({ name, email, title: title || "Team member", initials: name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(), departmentId, status: "Invited", access: ["dashboard"], buildingIds: [], color: "#38bdf8" }); onClose(); setName(""); setEmail(""); };
  return <Modal open={open} onClose={onClose} title="Add organization member" sub="Invitation and base access" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn onClick={submit}>Send invitation</Btn></>}>
    <Field label="Full name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /></Field>
    <Field label="Email"><TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></Field>
    <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Role or position" /></Field>
    <Field label="Department"><Select options={departments.map((d) => ({ value: d.id, label: d.name }))} value={departmentId} onChange={setDepartment} /></Field>
  </Modal>;
}

function AddBuildingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addOrgBuilding } = useOrbit();
  const [name, setName] = useState(""); const [address, setAddress] = useState(""); const [units, setUnits] = useState("40"); const [type, setType] = useState("Condo");
  const submit = () => {
    if (!name || !address) return;
    const id = "b" + Date.now();
    const building: Building = { id, code: "ORB-" + String(Date.now()).slice(-4), name, address, type: type as Building["type"], plan: "Pro", status: "Active", units: Number(units) || 0, am: "nick", mono: "#38bdf8", reserve: 0, operating: 0, delinquency: 0, openTickets: 0, docs: 0, compliance: "review", monthlyIncome: 0, monthlyExpense: 0 };
    addOrgBuilding(building); onClose(); setName(""); setAddress("");
  };
  return <Modal open={open} onClose={onClose} title="Add building" sub="Create portfolio registry record" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn onClick={submit}>Add building</Btn></>}>
    <Field label="Building name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
    <Field label="Address"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Property type"><Select options={["Condo", "Co-op", "HOA"]} value={type} onChange={setType} /></Field><Field label="Units"><TextInput type="number" value={units} onChange={(e) => setUnits(e.target.value)} /></Field></div>
  </Modal>;
}

function Metric({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return <Glass style={{ padding: 15 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name={icon} size={15} color={color} /><SectionLabel>{label}</SectionLabel></div><div style={{ fontFamily: SANS, fontSize: 27, fontWeight: 650, color: "var(--ink)", margin: "10px 0 2px" }}>{value}</div><div style={muted}>{sub}</div></Glass>;
}

const titleText = { fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)" } as const;
const muted = { fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" } as const;
const pill = (color: string) => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 99, border: "1px solid " + color + "44", background: color + "0c", color, fontFamily: MONO, fontSize: 8.5, fontWeight: 800, letterSpacing: ".08em" } as const);
const miniPill = (color: string) => ({ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 99, border: "1px solid " + color + "44", background: color + "0c", color, fontFamily: MONO, fontSize: 8, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" } as const);
const status = (color: string) => ({ ...pill(color), width: "fit-content", padding: "3px 7px", fontSize: 8 } as const);
const tabButton = (on: boolean) => ({ padding: "8px 12px", border: "none", borderRadius: 9, background: on ? "var(--panel-solid)" : "transparent", color: on ? "var(--ink)" : "var(--ink-3)", fontFamily: SANS, fontSize: 12, fontWeight: on ? 600 : 400, cursor: "pointer", boxShadow: on ? "0 3px 12px rgba(0,0,0,.16)" : "none" } as const);
