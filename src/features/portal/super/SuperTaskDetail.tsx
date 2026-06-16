// SuperTaskDetail — the super opens a job, reads it in full (description, where,
// who reported it, the activity trail), adds field notes and photos, and runs a
// guided close-out: a short checklist that, when done, hands the job back to the
// office for verification (Awaiting review). Everything goes through the
// OrbitProvider seam so the office sees it on the same ticket.
import { useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { vendorByName } from "@/data/vendors";
import { Btn, Icon, Modal, PrioDot, SectionLabel, StatusTag, inputStyle } from "@/components/ui";

type Audience = "office" | "resident" | "vendor";
const AUD: Record<Audience, { label: string; icon: string; color: string; who: string }> = {
  office: { label: "Office", icon: "users", color: "var(--acc-text)", who: "Your Orbit office team sees this on the ticket." },
  resident: { label: "Resident", icon: "home", color: "#3b82f6", who: "Texted to the resident — their reply comes back to the office." },
  vendor: { label: "Vendor", icon: "hard-hat", color: "#f59e0b", who: "Logged on the ticket — use the contact below to reach them." },
};

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const TEAL = "#14b8a6";

const CHECKS: { key: string; label: string }[] = [
  { key: "work", label: "Work completed on site" },
  { key: "photos", label: "Photos / proof attached" },
  { key: "clean", label: "Area cleaned & left safe" },
  { key: "notified", label: "Office / resident notified" },
];

export function SuperTaskDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { tickets, ticketPhotos, addTicketPhoto, addTicketNote, addComment, sendTicketMessage, setTicketStatus, notify } = useOrbit();
  const t = tickets.find((x) => x.id === id);
  const [note, setNote] = useState("");
  const [aud, setAud] = useState<Audience>("office");
  const [caption, setCaption] = useState("");
  const [closeOut, setCloseOut] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  if (!t) return null;

  const b = buildingById(t.building);
  const photos = ticketPhotos[id] || [];
  const closed = t.status === "Closed";
  const inReview = t.status === "Awaiting review";
  const vendor = vendorByName(t.vendor);

  const toggle = (k: string) => setChecked((c) => ({ ...c, [k]: !c[k] }));
  const send = () => {
    if (!note.trim()) return;
    const text = note.trim();
    if (aud === "resident") sendTicketMessage(id, { audience: "Resident", channels: ["SMS"], text });
    else if (aud === "vendor") { addTicketNote(id, "To vendor (" + (t.vendor || "—") + "): " + text); notify("Logged · reach the vendor below"); }
    else { addComment(id, text); notify("Sent to the office"); }
    setNote("");
  };
  const addPhoto = () => { addTicketPhoto(id, caption.trim() || ""); setCaption(""); };
  const submit = () => {
    const done = CHECKS.filter((c) => checked[c.key]).map((c) => c.label);
    addTicketNote(id, "Close-out submitted by super — " + (done.length ? done.join("; ") : "work complete"));
    setTicketStatus(id, "Awaiting review");
    notify("Submitted for office verification");
    onClose();
  };

  return (
    <Modal open onClose={onClose} width={640}
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{t.title}</span>}
      sub={`${t.id} · ${b?.name ?? ""}`}
      footer={
        closed ? <Btn ghost onClick={onClose}>Close</Btn>
        : closeOut ? <><Btn ghost onClick={() => setCloseOut(false)}>Back</Btn><Btn primary icon="flag" disabled={!checked.work} onClick={submit}>Submit for verification</Btn></>
        : <><Btn ghost onClick={onClose}>Close</Btn>{!inReview && <Btn primary icon="clipboard-check" onClick={() => setCloseOut(true)}>Close out…</Btn>}</>
      }>
      {/* status row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <StatusTag status={t.status} />
        <PrioDot prio={t.prio} />
        <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{t.type}{t.vendor ? " · " + t.vendor : ""}</span>
      </div>

      {closeOut ? (
        <div>
          <SectionLabel style={{ marginBottom: 12 }}>Close-out checklist</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CHECKS.map((c) => {
              const on = !!checked[c.key];
              return (
                <button key={c.key} onClick={() => toggle(c.key)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 11, cursor: "pointer", textAlign: "left", width: "100%", background: on ? "rgba(20,184,166,0.08)" : "var(--fill-1)", border: "1px solid " + (on ? "rgba(20,184,166,0.35)" : "var(--hair-2)") }}>
                  <Icon name={on ? "check-square" : "square"} size={18} color={on ? TEAL : "var(--ink-4)"} />
                  <span style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)" }}>{c.label}</span>
                </button>
              );
            })}
          </div>
          <p style={{ margin: "14px 0 0", fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Submitting hands the job to the office for final verification — they confirm evidence and close it out. The work item stays open until then.
          </p>
        </div>
      ) : (
        <>
          {t.desc && <p style={{ margin: "0 0 16px", fontFamily: SANS, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{t.desc}</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <Detail icon="map-pin" label="Where" value={t.intake?.location?.label || b?.name || "—"} />
            <Detail icon="user" label="Reported by" value={t.requester} />
          </div>

          {/* photos */}
          <SectionLabel style={{ marginBottom: 10 }}>Photos · {photos.length}</SectionLabel>
          {photos.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {photos.map((p) => (
                <div key={p.id} style={{ width: 96, borderRadius: 10, overflow: "hidden", border: "1px solid var(--hair-2)" }}>
                  <div style={{ height: 64, backgroundImage: `url(${p.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                  <div style={{ padding: "4px 6px", fontFamily: MONO, fontSize: 7.5, color: "var(--ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.caption}</div>
                </div>
              ))}
            </div>
          )}
          {!closed && (
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" style={{ ...inputStyle, fontFamily: SANS }} />
              <Btn small icon="camera" onClick={addPhoto}>Add photo</Btn>
            </div>
          )}

          {/* activity */}
          <SectionLabel style={{ marginBottom: 10 }}>Activity</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
            {[...t.log].reverse().slice(0, 8).map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-4)", marginTop: 6, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>{l[2]}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{l[0]}</div>
                </div>
              </div>
            ))}
          </div>

          {/* send an update — to the office, the resident, or the vendor */}
          {!closed && (
            <>
              <SectionLabel style={{ marginBottom: 8 }}>Send an update</SectionLabel>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {(["office", "resident", "vendor"] as Audience[]).map((a) => {
                  if (a === "vendor" && !t.vendor) return null;
                  const m = AUD[a]; const on = aud === a;
                  return (
                    <button key={a} onClick={() => setAud(a)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, cursor: "pointer", background: on ? m.color + "1a" : "var(--fill-2)", border: "1px solid " + (on ? m.color : "var(--hair-3)"), color: on ? "var(--ink)" : "var(--ink-3)", fontFamily: SANS, fontSize: 12, fontWeight: on ? 600 : 500 }}>
                      <Icon name={m.icon} size={13} color={on ? m.color : "var(--ink-4)"} />{m.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={aud === "resident" ? "Plain-language update for the resident…" : aud === "vendor" ? "Message about the vendor's work…" : "Note for the office…"} style={{ ...inputStyle, fontFamily: SANS }} />
                <Btn small primary icon="send" disabled={!note.trim()} onClick={send}>Send</Btn>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginTop: 7 }}>
                <Icon name="info" size={11} color="var(--ink-4)" />{AUD[aud].who}
              </div>

              {vendor && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <Icon name="hard-hat" size={15} color="#f59e0b" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{vendor.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{vendor.phone} · awarded vendor</div>
                  </div>
                  <a href={"tel:" + vendor.phone.replace(/[^0-9+]/g, "")} title={"Call " + vendor.phone} style={contactBtn}><Icon name="phone" size={14} color="#22c55e" /></a>
                  <a href={"sms:" + vendor.phone.replace(/[^0-9+]/g, "")} title="Text" style={contactBtn}><Icon name="message-square" size={14} color="#3b82f6" /></a>
                  <a href={"mailto:" + vendor.email} title={vendor.email} style={contactBtn}><Icon name="mail" size={14} color="var(--ink-3)" /></a>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}

const contactBtn = { width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fill-2)", border: "1px solid var(--hair-3)", textDecoration: "none", flexShrink: 0 } as const;

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}><Icon name={icon} size={13} color="var(--ink-4)" />{value}</span>
    </div>
  );
}
