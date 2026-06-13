// SuperTaskDetail — the super opens a job, reads it in full (description, where,
// who reported it, the activity trail), adds field notes and photos, and runs a
// guided close-out: a short checklist that, when done, hands the job back to the
// office for verification (Awaiting review). Everything goes through the
// OrbitProvider seam so the office sees it on the same ticket.
import { useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { Btn, Icon, Modal, PrioDot, SectionLabel, StatusTag, inputStyle } from "@/components/ui";

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
  const { tickets, ticketPhotos, addTicketPhoto, addTicketNote, setTicketStatus, notify } = useOrbit();
  const t = tickets.find((x) => x.id === id);
  const [note, setNote] = useState("");
  const [caption, setCaption] = useState("");
  const [closeOut, setCloseOut] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  if (!t) return null;

  const b = buildingById(t.building);
  const photos = ticketPhotos[id] || [];
  const closed = t.status === "Closed";
  const inReview = t.status === "Awaiting review";

  const toggle = (k: string) => setChecked((c) => ({ ...c, [k]: !c[k] }));
  const addNote = () => { if (!note.trim()) return; addTicketNote(id, "Field note: " + note.trim()); setNote(""); notify("Note added"); };
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

          {/* field note */}
          {!closed && (
            <>
              <SectionLabel style={{ marginBottom: 8 }}>Add a field note</SectionLabel>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="What did you find / do?" style={{ ...inputStyle, fontFamily: SANS }} />
                <Btn small primary icon="send" disabled={!note.trim()} onClick={addNote}>Send</Btn>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}><Icon name={icon} size={13} color="var(--ink-4)" />{value}</span>
    </div>
  );
}
