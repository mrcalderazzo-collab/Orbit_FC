// Intake tab — reported issue, attached media, requester contact, access notes.
import type { Ticket, TicketFlow } from "@/lib/types";
import { tint } from "@/lib/format";
import { buildingById } from "@/data/seed";
import { Glass, Icon, KV, PrioDot, SectionLabel, Tag } from "@/components/ui";
import { TicketTriagePanel } from "@/features/ai/TicketTriagePanel";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const MEDIA_ICON: Record<string, string> = { photo: "image", video: "video", pdf: "file-text" };

export function Intake({ t, f }: { t: Ticket; f: TicketFlow }) {
  const k = f.intake;
  const b = buildingById(t.building)!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <TicketTriagePanel t={t} b={b} />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Reported issue</SectionLabel>
          <p style={{ margin: "0 0 14px", fontFamily: SANS, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{t.desc || "Reported via " + k.channel + ". " + k.access}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Tag>{k.channel}</Tag><Tag>{t.type}</Tag><PrioDot prio={t.prio} />
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
      </div>
      </div>
    </div>
  );
}

function ContactRow({ icon, label }: { icon: string; label: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: MONO, fontSize: 11, color: "var(--ink-2)" }}><Icon name={icon} size={13} color="var(--ink-4)" />{label}</div>;
}
function FlagPill({ on, icon, label, warn }: { on: boolean; icon: string; label: string; warn?: boolean }) {
  const c = warn ? "#f59e0b" : on ? "#22c55e" : "var(--ink-4)";
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, background: tint(c, 10), border: "1px solid " + tint(c, 26), fontFamily: SANS, fontSize: 11, color: c }}><Icon name={icon} size={12} color={c} />{label}</span>;
}
