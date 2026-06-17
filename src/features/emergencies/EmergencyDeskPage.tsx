// EmergencyDeskPage — the live incident command surface. It runs on the shared
// EMERGENCY_WORKFLOW contract (operatingSpine.ts): every incident advances
// confirm → stabilize → communicate → recover, each step owned, evidenced, and
// SLA-timed. All mutations route through the OrbitProvider seam and land on the
// event spine, so a building's Activity tab shows its incident history too.
import { useMemo, useState } from "react";
import type { Emergency } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { EMERGENCY_WORKFLOW } from "@/lib/operatingSpine";
import { EMERGENCY_STEPS, stepIndex, sevMeta, statusMeta } from "@/data/emergencies";
import { Btn, Glass, Icon, Tag } from "@/components/ui";
import { ThemeSwitcher } from "@/components/shell/TopBar";
import { Modal, Field, TextInput, Select, inputStyle } from "@/components/ui/form";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const EMERGENCY_TYPES = [
  "Life safety", "Active water damage", "Elevator entrapment", "No heat / hot water",
  "Fire / gas / security incident", "Structural / flood", "Power outage", "Other",
];

export function EmergencyDeskPage() {
  const { emergencies } = useOrbit();
  const [declare, setDeclare] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const active = emergencies.filter((e) => e.status === "active");
  const potential = emergencies.filter((e) => e.status === "potential");
  const resolved = emergencies.filter((e) => e.status === "resolved");
  const overdue = emergencies.filter((e) => e.status !== "resolved" && e.overdue);
  // active + potential, most severe first; resolved trail behind
  const ordered = useMemo(() => {
    const rank = (e: Emergency) => (e.status === "resolved" ? 9 : 0) + ({ critical: 0, high: 1, watch: 2 }[e.sev]);
    return [...emergencies].sort((a, b) => rank(a) - rank(b));
  }, [emergencies]);

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <header className="orbit-page-header">
        <div>
          <h1 style={pageTitle}>Emergency Desk</h1>
          <p style={pageSub}>Life-safety & critical incident command · {EMERGENCY_WORKFLOW.name} workflow</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn primary danger icon="siren" onClick={() => setDeclare(true)}>Declare emergency</Btn>
          <ThemeSwitcher />
        </div>
      </header>

      <div className="building-detail-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* pulse tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <PulseTile label="Active now" value={active.length} color="#ef4444" icon="siren" pulse={active.length > 0} />
          <PulseTile label="Potential / watch" value={potential.length} color="#f59e0b" icon="alert-triangle" />
          <PulseTile label="Overdue step" value={overdue.length} color="#f97316" icon="timer-off" pulse={overdue.length > 0} />
          <PulseTile label="Resolved" value={resolved.length} color="#22c55e" icon="shield-check" />
        </div>

        {/* workflow rail */}
        <Glass style={{ padding: "14px 17px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <Icon name="route" size={15} color="var(--acc-text)" />
            <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Response workflow</span>
            <span style={{ ...micro, marginLeft: "auto" }}>{EMERGENCY_WORKFLOW.appliesTo}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${EMERGENCY_STEPS.length}, 1fr)`, gap: 10 }}>
            {EMERGENCY_STEPS.map((step, i) => (
              <div key={step.id} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)" }}>{i + 1}</span>
                  <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{step.label}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {step.ownerRole}{step.slaHours != null ? ` · SLA ${step.slaHours < 1 ? step.slaHours * 60 + "m" : step.slaHours + "h"}` : ""}
                </div>
              </div>
            ))}
          </div>
        </Glass>

        {/* incidents */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ordered.map((em) => (
            <IncidentCard key={em.id} em={em} expanded={expanded === em.id} onToggle={() => setExpanded(expanded === em.id ? null : em.id)} />
          ))}
          {!emergencies.length && (
            <Glass style={{ padding: 30, textAlign: "center" }}>
              <Icon name="shield-check" size={28} color="#22c55e" />
              <p style={{ margin: "10px 0 0", fontFamily: SANS, fontSize: 14, color: "var(--ink-2)" }}>No active incidents. The desk is clear.</p>
            </Glass>
          )}
        </div>
      </div>

      <DeclareModal open={declare} onClose={() => setDeclare(false)} />
    </div>
  );
}

function PulseTile({ label, value, color, icon, pulse }: { label: string; value: number; color: string; icon: string; pulse?: boolean }) {
  return (
    <Glass style={{ padding: 16 }} accent={color}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${color} 12%, transparent)`, animation: pulse ? "orbit-pulse 1.6s ease-in-out infinite" : undefined }}>
          <Icon name={icon} size={16} color={color} />
        </span>
        <span style={micro}>{label}</span>
      </div>
      <strong style={{ fontFamily: SANS, fontSize: 30, lineHeight: 1, color: value ? color : "var(--ink)" }}>{value}</strong>
    </Glass>
  );
}

function IncidentCard({ em, expanded, onToggle }: { em: Emergency; expanded: boolean; onToggle: () => void }) {
  const { advanceEmergency, resolveEmergency, logEmergency, openCommand, nav } = useOrbit();
  const [note, setNote] = useState("");
  const sev = sevMeta(em.sev);
  const status = statusMeta(em.status);
  const building = buildingById(em.building);
  const curIdx = stepIndex(em.step);
  const isResolved = em.status === "resolved";

  const postNote = () => { if (note.trim()) { logEmergency(em.id, note); setNote(""); } };

  return (
    <Glass style={{ padding: 0, overflow: "hidden", borderLeft: `3px solid ${sev.color}` }}>
      <div style={{ padding: 17 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${status.color} 12%, transparent)` }}>
            <Icon name={status.icon} size={19} color={status.color} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-4)" }}>{em.id}</span>
              <h3 style={{ margin: 0, fontFamily: SANS, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{em.title}</h3>
              <Tag color={sev.color}>{sev.label}</Tag>
              <Tag color={status.color}>{status.label}</Tag>
            </div>
            <p style={{ margin: "5px 0 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>
              {building?.name || em.building} · {em.type} · {em.onBehalf} · via {em.channel}
            </p>
          </div>
          {em.linkedTicket && <Btn small icon="ticket" onClick={() => openCommand(em.linkedTicket!)}>{em.linkedTicket}</Btn>}
        </div>

        {/* stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 14 }}>
          {EMERGENCY_STEPS.map((step, i) => {
            const done = isResolved || i < curIdx;
            const current = !isResolved && i === curIdx;
            const c = done ? "#22c55e" : current ? sev.color : "var(--ink-4)";
            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < EMERGENCY_STEPS.length - 1 ? 1 : "0 0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", background: done || current ? `color-mix(in srgb, ${c} 16%, transparent)` : "var(--fill-2)", border: `1.5px solid ${c}` }}>
                    {done ? <Icon name="check" size={11} color={c} /> : <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: c }}>{i + 1}</span>}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: current ? 600 : 400, color: current ? "var(--ink)" : "var(--ink-3)", whiteSpace: "nowrap" }}>{step.label}</span>
                </div>
                {i < EMERGENCY_STEPS.length - 1 && <span style={{ flex: 1, height: 1.5, margin: "0 8px", background: done ? "#22c55e" : "var(--hair-2)" }} />}
              </div>
            );
          })}
        </div>

        {/* next step + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {!isResolved && (
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>
              <Icon name="flag" size={13} color={sev.color} />
              Next: <strong style={{ color: "var(--ink)" }}>{em.nextStep}</strong>
              {em.overdue && <Tag color="#f97316" bg="rgba(249,115,22,0.12)">Overdue</Tag>}
            </span>
          )}
          {isResolved && (
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 12.5, color: "#22c55e" }}>
              <Icon name="shield-check" size={13} color="#22c55e" />Hazard resolved · incident closed
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Btn small ghost icon="history" onClick={onToggle}>{expanded ? "Hide log" : "Response log"} · {em.log.length}</Btn>
            {!isResolved && <Btn small icon="check-circle" onClick={() => resolveEmergency(em.id)}>Resolve</Btn>}
            {!isResolved && <Btn small primary icon="arrow-right" onClick={() => advanceEmergency(em.id)}>{stepIndex(em.step) >= EMERGENCY_STEPS.length - 1 ? "Close out" : "Advance step"}</Btn>}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--hair-2)", padding: 17, background: "var(--fill-2)" }}>
          {/* exit criteria for current step */}
          {!isResolved && EMERGENCY_STEPS[curIdx]?.exitCriteria && (
            <div style={{ marginBottom: 14 }}>
              <span style={micro}>Exit criteria · {EMERGENCY_STEPS[curIdx].label}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>
                {EMERGENCY_STEPS[curIdx].exitCriteria.map((c) => (
                  <span key={c} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-2)", padding: "4px 9px", borderRadius: 99, background: "var(--fill-3)", border: "1px solid var(--hair-2)" }}>
                    <Icon name="circle-dot" size={11} color={sev.color} />{c}
                  </span>
                ))}
              </div>
            </div>
          )}
          <span style={micro}>Response timeline</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 10 }}>
            {[...em.log].reverse().map(([at, text, actor], i) => (
              <div key={i} style={{ display: "flex", gap: 11, paddingBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 && !isResolved ? sev.color : "var(--ink-4)", marginTop: 4 }} />
                  {i < em.log.length - 1 && <span style={{ flex: 1, width: 1.5, background: "var(--hair-2)", marginTop: 3 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
                  <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5 }}>{text}</p>
                  <p style={{ margin: "3px 0 0", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{fmtTime(at)} · {actor}</p>
                </div>
              </div>
            ))}
          </div>
          {!isResolved && (
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && postNote()} placeholder="Log an update to the timeline…" style={{ ...inputStyle, flex: 1 }} />
              <Btn small primary icon="send" onClick={postNote}>Log</Btn>
            </div>
          )}
        </div>
      )}
      {/* hint to view the linked building record */}
      {expanded && building && (
        <div style={{ padding: "0 17px 14px", background: "var(--fill-2)" }}>
          <button onClick={() => nav("buildings", building.id)} style={{ display: "flex", alignItems: "center", gap: 6, border: 0, background: "none", color: "var(--ink-3)", fontFamily: MONO, fontSize: 9, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <Icon name="building-2" size={12} color="var(--ink-3)" />Open {building.name} record →
          </button>
        </div>
      )}
    </Glass>
  );
}

function DeclareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { declareEmergency, orgBuildings, notify } = useOrbit();
  const buildings = orgBuildings.length ? orgBuildings : [];
  const [title, setTitle] = useState("");
  const [building, setBuilding] = useState("");
  const [type, setType] = useState(EMERGENCY_TYPES[0]);
  const [sev, setSev] = useState<Emergency["sev"]>("critical");
  const [channel, setChannel] = useState("Phone — 24/7 line");
  const [onBehalf, setOnBehalf] = useState("");
  const [note, setNote] = useState("");
  const [spawnTicket, setSpawnTicket] = useState(true);

  const reset = () => { setTitle(""); setBuilding(""); setType(EMERGENCY_TYPES[0]); setSev("critical"); setChannel("Phone — 24/7 line"); setOnBehalf(""); setNote(""); setSpawnTicket(true); };
  const close = () => { onClose(); reset(); };

  const submit = () => {
    if (!title.trim()) { notify("Describe the incident first", "err"); return; }
    const bId = building || buildings[0]?.id;
    if (!bId) { notify("Pick a building", "err"); return; }
    declareEmergency({ title: title.trim(), building: bId, type, sev, channel, onBehalf: onBehalf || "Reported to desk", note: note || undefined, spawnTicket });
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Declare an emergency" sub={EMERGENCY_WORKFLOW.name}
      footer={<>
        <Btn small ghost onClick={close}>Cancel</Btn>
        <Btn small primary danger icon="siren" onClick={submit}>Declare & open response</Btn>
      </>}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 12px", marginBottom: 16, borderRadius: 12, background: "rgba(239,68,68,0.07)", border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)" }}>
        <Icon name="alert-triangle" size={15} color="#ef4444" />
        <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>Opens at step 1 (Confirm). For life-safety, ensure 911 / utility is called first — Orbit coordinates the operational response.</span>
      </div>
      <Field label="What is happening"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Elevator entrapment — Car B, two riders" autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Building"><Select options={[{ value: "", label: "Select building…" }, ...buildings.map((b) => ({ value: b.id, label: b.name }))]} value={building} onChange={setBuilding} /></Field>
        <Field label="Type"><Select options={EMERGENCY_TYPES} value={type} onChange={setType} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Severity"><Select options={[{ value: "critical", label: "Critical" }, { value: "high", label: "High" }, { value: "watch", label: "Watch" }]} value={sev} onChange={(v) => setSev(v as Emergency["sev"])} /></Field>
        <Field label="Channel"><TextInput value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Phone, super app, alarm…" /></Field>
      </div>
      <Field label="Reported by / on behalf of"><TextInput value={onBehalf} onChange={(e) => setOnBehalf(e.target.value)} placeholder="e.g. Resident · Unit 11F" /></Field>
      <Field label="First details" hint="Plain-language description — becomes the first line of the response timeline.">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Location, who's affected, immediate risk…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
        <input type="checkbox" checked={spawnTicket} onChange={(e) => setSpawnTicket(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--acc)" }} />
        <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-2)" }}>Spawn a linked <strong style={{ color: "var(--ink)" }}>Critical work ticket</strong> for the field response</span>
      </label>
    </Modal>
  );
}

const fmtTime = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); };
const pageTitle: React.CSSProperties = { margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 27, color: "var(--ink)", letterSpacing: "-0.5px" };
const pageSub: React.CSSProperties = { margin: "6px 0 0", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" };
const micro: React.CSSProperties = { display: "block", fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase" };
