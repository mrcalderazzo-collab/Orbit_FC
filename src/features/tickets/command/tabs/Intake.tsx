// Intake tab — reported issue, attached media, requester contact, access notes,
// and (for whoever works the ticket) the billing decision — who pays + cost.
import { useState } from "react";
import type { Ticket, TicketFlow, TicketIntakeDetail } from "@/lib/types";
import { tint } from "@/lib/format";
import { buildingById } from "@/data/seed";
import { categoryByKey, BILLABLE_TO } from "@/data/taxonomy";
import { useOrbit } from "@/store/OrbitProvider";
import { Glass, Icon, KV, PrioDot, SectionLabel, Tag, Select, Btn, inputStyle } from "@/components/ui";
import { TicketTriagePanel } from "@/features/ai/TicketTriagePanel";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const MEDIA_ICON: Record<string, string> = { photo: "image", video: "video", pdf: "file-text" };

export function Intake({ t, f }: { t: Ticket; f: TicketFlow }) {
  const k = f.intake;
  const b = buildingById(t.building)!;
  const cat = t.category ? categoryByKey(t.category) : undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <TicketTriagePanel t={t} b={b} />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Reported issue</SectionLabel>
          {cat && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 99, background: tint(cat.color, 14), border: "1px solid " + tint(cat.color, 36), fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: cat.color }}>
                <Icon name={cat.icon} size={12} color={cat.color} />{cat.label.toUpperCase()}
              </span>
              {t.intake?.subcategory && <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)" }}>{t.intake.subcategory}</span>}
              {t.intake?.location?.label && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}><Icon name="map-pin" size={11} color="var(--ink-4)" />{t.intake.location.label}</span>}
            </div>
          )}
          <p style={{ margin: "0 0 14px", fontFamily: SANS, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{t.desc || "Reported via " + k.channel + ". " + k.access}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Tag>{k.channel}</Tag><Tag>{t.type}</Tag><PrioDot prio={t.prio} />
            {(t.tags || []).map((tag) => <Tag key={tag} color="var(--acc-text)" bg="rgba(var(--acc-rgb),0.1)">{tag}</Tag>)}
          </div>
        </Glass>

        <Glass style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <SectionLabel>Attached media</SectionLabel>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{k.media.length} files</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {k.media.map((m, i) => (
              <div key={i} style={{ aspectRatio: "4/3", borderRadius: 12, background: "var(--fill-2)", border: "1px dashed var(--hair-strong)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, position: "relative", overflow: "hidden" }}>
                <Icon name={MEDIA_ICON[m[0]] || "file"} size={22} color="var(--ink-3)" />
                <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", textAlign: "center", padding: "0 6px" }}>{m[1]}</span>
                {m[0] === "video" && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(var(--acc-rgb),0.15)", border: "1px solid rgba(var(--acc-rgb),0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="play" size={13} color="var(--acc)" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button style={{ aspectRatio: "4/3", borderRadius: 12, background: "transparent", border: "1px dashed var(--hair-strong)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", color: "var(--ink-4)" }}>
              <Icon name="upload" size={18} color="var(--ink-4)" /><span style={{ fontFamily: MONO, fontSize: 9 }}>ADD</span>
            </button>
          </div>
        </Glass>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Glass style={{ padding: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Requester</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <KV k="Name / source" v={k.submitterName} />
            <KV k="Role" v={k.submitter} />
            {k.unit && <KV k="Unit" v={k.unit} />}
            <div style={{ height: 1, background: "var(--hair-2)", margin: "2px 0" }} />
            <ContactRow icon="phone" label={k.contact.phone} />
            <ContactRow icon="mail" label={k.contact.email} />
          </div>
        </Glass>

        <Glass style={{ padding: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Access & entry</SectionLabel>
          <p style={{ margin: "0 0 12px", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{k.access}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            <FlagPill on={k.keyOnFile} icon="key" label={k.keyOnFile ? "Key on file" : "No key"} />
            <FlagPill on={!k.petOnSite} icon="paw-print" label={k.petOnSite ? "Pet on site" : "No pets"} warn={k.petOnSite} />
          </div>
        </Glass>

        <BillingCard t={t} />
      </div>
      </div>
    </div>
  );
}

// Billing is an OPS decision, made when the ticket is worked — not at intake by
// the requester. This is its home: who pays, the estimate, warranty.
function BillingCard({ t }: { t: Ticket }) {
  const { updateTicket, notify } = useOrbit();
  const billing = t.intake?.billing;
  const [billableTo, setBillableTo] = useState(billing?.billableTo ?? "");
  const [estimate, setEstimate] = useState(billing?.estimate != null ? String(billing.estimate) : "");
  const [warranty, setWarranty] = useState(!!billing?.warranty);
  const dirty = billableTo !== (billing?.billableTo ?? "") || estimate !== (billing?.estimate != null ? String(billing.estimate) : "") || warranty !== !!billing?.warranty;

  const save = () => {
    if (!billableTo) { notify("Pick who this is billable to", "err"); return; }
    const intake: TicketIntakeDetail = {
      ...(t.intake ?? { category: t.category ?? "" }),
      billing: { ...billing, billableTo, estimate: estimate ? Number(estimate) : undefined, warranty },
    };
    updateTicket(t.id, { intake }, `Billing set · ${billableTo}${estimate ? " · $" + Number(estimate).toLocaleString() : ""}${warranty ? " · warranty" : ""}`);
    notify("Billing updated");
  };

  return (
    <Glass style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <SectionLabel>Billing &amp; cost</SectionLabel>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: billableTo ? "#22c55e" : "#f59e0b" }}>
          <Icon name={billableTo ? "circle-check" : "circle-dashed"} size={11} color={billableTo ? "#22c55e" : "#f59e0b"} />{billableTo ? "Set" : "Not set"}
        </span>
      </div>
      <p style={{ margin: "0 0 12px", fontFamily: SANS, fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.5 }}>Set by whoever works the ticket — not the requester.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <span style={fieldLabel}>Billable to</span>
          <Select options={[{ value: "", label: "— select —" }, ...BILLABLE_TO.map((v) => ({ value: v, label: v }))]} value={billableTo} onChange={setBillableTo} />
        </div>
        <div>
          <span style={fieldLabel}>Estimated cost ($)</span>
          <input value={estimate} onChange={(e) => setEstimate(e.target.value.replace(/[^0-9]/g, ""))} placeholder="2500" style={{ ...inputStyle }} />
        </div>
        <button onClick={() => setWarranty((w) => !w)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", borderRadius: 99, cursor: "pointer", alignSelf: "flex-start", background: warranty ? tint("#22c55e", 12) : "var(--fill-1)", border: "1px solid " + (warranty ? tint("#22c55e", 32) : "var(--hair-2)"), fontFamily: SANS, fontSize: 12, color: warranty ? "var(--ink)" : "var(--ink-3)" }}>
          <span style={{ width: 15, height: 15, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", background: warranty ? "#22c55e" : "transparent", border: "1.5px solid " + (warranty ? "#22c55e" : "var(--hair-strong)") }}>{warranty && <Icon name="check" size={10} color="#0a0a0a" />}</span>
          <Icon name="shield-check" size={13} color={warranty ? "#22c55e" : "var(--ink-4)"} />Warranty coverage
        </button>
        <Btn small primary icon="check" onClick={save} disabled={!dirty} style={{ alignSelf: "flex-start" }}>Save billing</Btn>
      </div>
    </Glass>
  );
}

const fieldLabel: React.CSSProperties = { display: "block", marginBottom: 5, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)" };

function ContactRow({ icon, label }: { icon: string; label: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: MONO, fontSize: 11, color: "var(--ink-2)" }}><Icon name={icon} size={13} color="var(--ink-4)" />{label}</div>;
}
function FlagPill({ on, icon, label, warn }: { on: boolean; icon: string; label: string; warn?: boolean }) {
  const c = warn ? "#f59e0b" : on ? "#22c55e" : "var(--ink-4)";
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, background: tint(c, 10), border: "1px solid " + tint(c, 26), fontFamily: SANS, fontSize: 11, color: c }}><Icon name={icon} size={12} color={c} />{label}</span>;
}
