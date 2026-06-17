// NewConversation — the composer that lets an operator start a brand-new thread
// to any set of recipients: one or many vendors, residents (building-wide),
// board members, or internal team. Builds a Channel + first message through the
// OrbitProvider seam (createChannel) and lands on the event spine.
import { useMemo, useState } from "react";
import type { Channel, CommVia, Participant } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { contactDirectory, type ContactCategory, type DirectoryContact } from "@/data/comms";
import { Btn, Icon } from "@/components/ui";
import { Modal, Field, inputStyle } from "@/components/ui/form";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const CATS: (ContactCategory | "All")[] = ["All", "Team", "Vendors", "Board", "Residents"];
const VIAS: CommVia[] = ["In-app", "SMS", "Email"];
const CAT_ICON: Record<ContactCategory, string> = { Team: "command", Vendors: "hard-hat", Board: "users", Residents: "home" };

export function NewConversation({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (channelId: string) => void }) {
  const { createChannel, notify } = useOrbit();
  const directory = useMemo(() => contactDirectory(), []);
  const [cat, setCat] = useState<ContactCategory | "All">("All");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, DirectoryContact>>({});
  const [via, setVia] = useState<CommVia>("In-app");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const selected = Object.values(picked);
  const reset = () => { setCat("All"); setQ(""); setPicked({}); setVia("In-app"); setSubject(""); setBody(""); };
  const close = () => { onClose(); reset(); };
  const toggle = (c: DirectoryContact) => setPicked((p) => { const n = { ...p }; if (n[c.id]) delete n[c.id]; else n[c.id] = c; return n; });

  const list = directory.filter((c) => {
    if (cat !== "All" && c.category !== cat) return false;
    if (q && !(c.name + " " + c.sub).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const start = () => {
    if (!selected.length) { notify("Pick at least one recipient", "err"); return; }
    if (!body.trim()) { notify("Write a message", "err"); return; }
    const parts: Participant[] = selected.map((c) => ({ id: c.id, name: c.name, initials: c.initials, color: c.color, role: c.role, kind: c.kind }));
    const cats = [...new Set(selected.map((c) => c.category))];
    const kind: Channel["kind"] = cats.length === 1 && cats[0] === "Vendors" ? "vendor"
      : cats.length === 1 && cats[0] === "Board" ? "board"
      : cats.length === 1 && cats[0] === "Residents" ? "resident" : "team";
    const buildings = [...new Set(selected.map((c) => c.building).filter(Boolean))];
    const buildingId = buildings.length === 1 ? buildings[0]! : "all";
    const title = subject.trim() || (parts.length === 1 ? parts[0].name : parts[0].name.split(" ")[0] + " + " + (parts.length - 1) + " more");
    const subtitle = `${parts.length} ${parts.length === 1 ? "recipient" : "recipients"} · ${cats.join(" + ")}`;
    const channel: Channel = { id: "ch_new_" + Date.now(), kind, buildingId, title, subtitle, participants: parts, defaultVia: via, vias: VIAS };
    createChannel(channel, { via, text: body });
    onCreated(channel.id);
    close();
  };

  return (
    <Modal open={open} onClose={close} title="New conversation" sub="Message anyone across the portfolio" width={640}
      footer={<>
        <Btn small ghost onClick={close}>Cancel</Btn>
        <Btn small primary icon="send" onClick={start}>Start conversation{selected.length ? ` · ${selected.length}` : ""}</Btn>
      </>}>
      {/* selected chips */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {selected.map((c) => (
            <button key={c.id} onClick={() => toggle(c)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px 4px 9px", borderRadius: 99, background: "rgba(var(--acc-rgb),0.1)", border: "1px solid var(--acc)", cursor: "pointer" }}>
              <span style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink)" }}>{c.name}</span>
              <Icon name="x" size={12} color="var(--ink-3)" />
            </button>
          ))}
        </div>
      )}

      {/* recipient picker */}
      <Field label="Recipients">
        <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{ fontFamily: SANS, fontSize: 11.5, padding: "5px 10px", borderRadius: 99, cursor: "pointer", border: "1px solid " + (cat === c ? "var(--acc)" : "var(--hair-strong)"), background: cat === c ? "rgba(var(--acc-rgb),0.12)" : "var(--fill-2)", color: cat === c ? "var(--acc-text)" : "var(--ink-2)" }}>{c}</button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, vendors, buildings…" style={{ ...inputStyle, marginBottom: 8 }} />
        <div style={{ maxHeight: 230, overflowY: "auto", border: "1px solid var(--hair-2)", borderRadius: 12 }}>
          {list.map((c) => {
            const on = !!picked[c.id];
            return (
              <button key={c.id} onClick={() => toggle(c)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", border: 0, borderBottom: "1px solid var(--hair)", background: on ? "rgba(var(--acc-rgb),0.06)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: c.color + "22", color: c.color, fontFamily: MONO, fontSize: 10, fontWeight: 700 }}>
                  {c.broadcast ? <Icon name="home" size={14} color={c.color} /> : c.initials}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: SANS, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{c.sub}</span>
                </span>
                <Icon name={c.category === "Residents" ? "home" : CAT_ICON[c.category]} size={12} color="var(--ink-5)" />
                <span style={{ width: 18, height: 18, borderRadius: 5, display: "grid", placeItems: "center", border: "1px solid " + (on ? "var(--acc)" : "var(--hair-strong)"), background: on ? "var(--acc)" : "transparent" }}>
                  {on && <Icon name="check" size={12} color="var(--on-accent)" />}
                </span>
              </button>
            );
          })}
          {!list.length && <div style={{ padding: 18, textAlign: "center", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-4)" }}>No matches.</div>}
        </div>
      </Field>

      {/* channel + message */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Channel">
          <div style={{ display: "flex", gap: 6 }}>
            {VIAS.map((v) => (
              <button key={v} onClick={() => setVia(v)} style={{ flex: 1, fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "8px 0", borderRadius: 9, cursor: "pointer", border: "1px solid " + (via === v ? "var(--acc)" : "var(--hair-strong)"), background: via === v ? "rgba(var(--acc-rgb),0.12)" : "var(--fill-2)", color: via === v ? "var(--ink)" : "var(--ink-4)" }}>{v.toUpperCase()}</button>
            ))}
          </div>
        </Field>
        <Field label="Subject (optional)"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Lobby renovation coordination" style={inputStyle} /></Field>
      </div>
      <Field label="Message">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Write your message…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </Field>
    </Modal>
  );
}
