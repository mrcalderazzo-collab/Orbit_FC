// Activity tab - event spine plus chain-verified audit trail.
import { useState } from "react";
import type { Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { seed } from "@/lib/format";
import { PEOPLE } from "@/data/seed";
import { Btn, Icon, inputStyle, SectionLabel } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function Activity({ t }: { t: Ticket }) {
  const { addTicketNote, eventsFor } = useOrbit();
  const [note, setNote] = useState("");
  const events = eventsFor("ticket", t.id);
  const submit = () => { if (note.trim()) { addTicketNote(t.id, note.trim()); setNote(""); } };

  return (
    <div style={{ maxWidth: 720 }}>
      <SectionLabel style={{ marginBottom: 14 }}>Activity - event spine + chain log</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
        {events.length ? events.map((event) => {
          const meta = eventMeta(event.kind);
          return (
            <div key={event.id} style={{ display: "flex", gap: 11, padding: 12, border: "1px solid var(--hair)", borderRadius: 14, background: "var(--fill)" }}>
              <span style={{ width: 32, height: 32, borderRadius: 12, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${meta.color} 12%, transparent)`, flexShrink: 0 }}>
                <Icon name={meta.icon} size={15} color={meta.color} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: SANS, fontSize: 13, color: "var(--ink)", lineHeight: 1.35 }}>{event.summary}</span>
                <span style={{ display: "block", marginTop: 4, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {event.actor} - {formatEventTime(event.at)} - {event.kind}
                </span>
              </span>
            </div>
          );
        }) : (
          <div style={{ padding: 14, border: "1px dashed var(--hair)", borderRadius: 14, color: "var(--ink-3)", fontFamily: SANS, fontSize: 12.5 }}>
            No spine events yet. The next route, status change, message, photo, invoice, or note will appear here.
          </div>
        )}
      </div>

      <SectionLabel style={{ marginBottom: 14 }}>Legacy chain-verified audit trail</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {t.log.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 13, paddingBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: i === t.log.length - 1 ? "var(--acc)" : "#22c55e", flexShrink: 0, marginTop: 4 }} />
              {i < t.log.length - 1 && <span style={{ width: 2, flex: 1, background: "var(--hair-3)" }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{l[2]}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{PEOPLE[l[1]]?.name || l[1]} - {l[0].replace("T", " ")}</span>
                <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-5)", padding: "1px 6px", borderRadius: 5, background: "var(--fill-2)" }}>#{(seed(t.id + i) % 0xffff).toString(16).padStart(4, "0")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Add to the chain..." style={{ ...inputStyle, flex: 1 }} />
        <Btn small onClick={submit}>Log</Btn>
      </div>
    </div>
  );
}

const EVENT_META: Record<string, { icon: string; color: string }> = {
  ticket_created: { icon: "sparkles", color: "#3b82f6" },
  ticket_routed: { icon: "route", color: "#a855f7" },
  ticket_status: { icon: "git-commit-horizontal", color: "#22c55e" },
  ticket_hold: { icon: "pause-circle", color: "#f59e0b" },
  ticket_comment: { icon: "message-square", color: "#3b82f6" },
  ticket_message: { icon: "send", color: "#14b8a6" },
  ticket_photo: { icon: "image", color: "#a855f7" },
  invoice_recorded: { icon: "receipt", color: "#22c55e" },
  board_vote: { icon: "landmark", color: "#f59e0b" },
  vendor_rating: { icon: "star", color: "#f59e0b" },
};

function eventMeta(kind: string) {
  return EVENT_META[kind] || { icon: "activity", color: "var(--acc-text)" };
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
