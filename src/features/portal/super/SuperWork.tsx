// Super Work — the on-site work board. The superintendent sees the physical
// work in their building and acts on it from the field: start work, add a note
// or photo, and mark complete (which hands it back to the office for
// verification). Every action flows through the OrbitProvider seam, so the
// office sees the super's updates live on the ticket.
import { useMemo, useState } from "react";
import type { Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { superTickets } from "@/data/identity";
import { buildingById } from "@/data/seed";
import { Btn, Glass, Icon, PrioDot, StatusTag, inputStyle } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const TEAL = "#14b8a6";

export function SuperWork() {
  const { currentUser, tickets } = useOrbit();
  const b = currentUser?.building ? buildingById(currentUser.building) : undefined;
  const items = useMemo(() => (currentUser ? superTickets(currentUser, tickets) : []), [currentUser, tickets]);
  const active = items.filter((t) => t.status !== "Closed");
  const done = items.filter((t) => t.status === "Closed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>On-site work</h2>
          <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
            Field work at {b?.name ?? "your building"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.25)" }}>
          <Icon name="hammer" size={16} color={TEAL} />
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{active.length}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>active</span>
        </div>
      </div>

      {active.length === 0 && (
        <Glass style={{ padding: 40, textAlign: "center", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>No open field work right now — nicely done.</Glass>
      )}
      {active.map((t) => <WorkCard key={t.id} t={t} />)}

      {done.length > 0 && (
        <>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "var(--ink-4)", textTransform: "uppercase", marginTop: 6 }}>Recently closed</div>
          {done.slice(0, 4).map((t) => <WorkCard key={t.id} t={t} />)}
        </>
      )}
    </div>
  );
}

function WorkCard({ t }: { t: Ticket }) {
  const { setTicketStatus, addTicketNote, notify } = useOrbit();
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const closed = t.status === "Closed";
  const inProgress = t.status === "In progress";

  const start = () => { setTicketStatus(t.id, "In progress"); notify("Marked in progress · office notified"); };
  const complete = () => { addTicketNote(t.id, "Super marked work complete on site — ready for verification."); setTicketStatus(t.id, "Awaiting review"); notify("Sent for verification"); };
  const photo = () => { addTicketNote(t.id, "Super added a field photo."); notify("Photo added to the ticket"); };
  const saveNote = () => { if (!note.trim()) return; addTicketNote(t.id, "Field note: " + note.trim()); setNote(""); setNoteOpen(false); notify("Note added to the ticket"); };

  return (
    <Glass style={{ padding: 0, overflow: "hidden", borderLeft: closed ? "1px solid var(--hair)" : "3px solid " + (t.prio === "Critical" ? "#ef4444" : TEAL) }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em" }}>{t.id}</span>
          <StatusTag status={t.status} />
          <span style={{ marginLeft: "auto" }}><PrioDot prio={t.prio} /></span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{t.title}</div>
        {t.desc && <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>{t.desc}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
          <Meta icon="tag" label="Type" value={t.type} />
          {t.vendor && <Meta icon="hard-hat" label="Vendor" value={t.vendor} />}
          <Meta icon="user" label="From" value={t.requester} />
        </div>

        {!closed && (
          <>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {!inProgress && t.status !== "Awaiting review" && <Btn small icon="play" onClick={start}>Start work</Btn>}
              <Btn small ghost icon="message-square-plus" onClick={() => setNoteOpen((o) => !o)}>Add note</Btn>
              <Btn small ghost icon="camera" onClick={photo}>Add photo</Btn>
              {t.status !== "Awaiting review" && <Btn small primary icon="flag" onClick={complete} style={{ marginLeft: "auto" }}>Mark complete</Btn>}
              {t.status === "Awaiting review" && <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9.5, color: "#f59e0b" }}><Icon name="clock" size={13} color="#f59e0b" />AWAITING OFFICE VERIFY</span>}
            </div>
            {noteOpen && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveNote()} placeholder="Quick field note for the office…" style={{ ...inputStyle, fontFamily: SANS }} />
                <Btn small primary icon="send" disabled={!note.trim()} onClick={saveNote}>Send</Btn>
              </div>
            )}
          </>
        )}
        {closed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontFamily: MONO, fontSize: 9.5, color: "#22c55e", letterSpacing: "0.05em" }}>
            <Icon name="circle-check-big" size={14} color="#22c55e" />COMPLETED &amp; VERIFIED
          </div>
        )}
      </div>
    </Glass>
  );
}

function Meta({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <Icon name={icon} size={12} color="var(--ink-4)" />{value}
      </span>
    </div>
  );
}
