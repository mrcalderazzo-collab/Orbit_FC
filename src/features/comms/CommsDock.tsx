// CommsDock — a slide-out chat drawer docked to the right of the Ticket Command
// workspace. Available on every tab/stage so the operator can keep working the
// ticket while messaging the resident, the board (group), a specific director,
// or the awarded vendor. No scrim — the ticket stays interactive behind it.
import { useMemo, useState } from "react";
import type { Channel, Ticket, TicketFlow } from "@/lib/types";
import { advisoryChannel, boardDirectChannel, boardParticipants, channelsForTicket } from "@/data/comms";
import { Icon } from "@/components/ui";
import { ChatThread } from "./ChatThread";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const KIND_ICON: Record<string, string> = { resident: "home", board: "users", vendor: "hard-hat", boardDirect: "user", advisory: "git-fork" };

export function CommsDock({ t, f, open, onClose }: { t: Ticket; f: TicketFlow; open: boolean; onClose: () => void }) {
  const channels = useMemo(() => [...channelsForTicket(t, f), advisoryChannel(t.building, "am")], [t.id, f.stage]); // eslint-disable-line react-hooks/exhaustive-deps
  const directors = useMemo(() => boardParticipants(t.building), [t.building]);
  const [extra, setExtra] = useState<Channel[]>([]);
  const all = [...channels, ...extra.filter((e) => !channels.some((c) => c.id === e.id))];
  const [sel, setSel] = useState(channels[0]?.id);
  const [pickDir, setPickDir] = useState(false);
  const active = all.find((c) => c.id === sel) || all[0];

  const startDM = (memberName: string) => {
    const m = directors.find((d) => d.name === memberName)!;
    const c = boardDirectChannel(t.building, m);
    setExtra((e) => (e.some((x) => x.id === c.id) ? e : [...e, c]));
    setSel(c.id);
    setPickDir(false);
  };
  const reroute = (pos: string) => {
    const c = advisoryChannel(t.building, pos);
    setExtra((e) => (e.some((x) => x.id === c.id) ? e : [...e, c]));
    setSel(c.id);
  };

  return (
    <div
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 460, maxWidth: "92%", zIndex: 30,
        display: "flex", flexDirection: "column", background: "var(--panel-solid)", borderLeft: "1px solid var(--hair-strong)",
        boxShadow: "-30px 0 80px rgba(0,0,0,0.45)", transform: open ? "translateX(0)" : "translateX(102%)",
        transition: "transform .28s cubic-bezier(.2,.8,.3,1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--hair-2)" }}>
        <Icon name="messages-square" size={17} color="var(--acc-text)" />
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--ink)", textTransform: "uppercase" }}>Communications</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>· {t.id}</span>
        <button onClick={onClose} style={{ marginLeft: "auto", width: 30, height: 30, borderRadius: 9, border: "1px solid var(--hair-3)", background: "var(--fill-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="panel-right-close" size={16} color="var(--ink-2)" />
        </button>
      </div>

      {/* channel switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid var(--hair-2)", flexWrap: "wrap", position: "relative" }}>
        {all.map((c) => {
          const on = active?.id === c.id;
          return (
            <button key={c.id} onClick={() => setSel(c.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 99, cursor: "pointer", background: on ? "rgba(var(--acc-rgb),0.12)" : "var(--fill-2)", border: "1px solid " + (on ? "rgba(var(--acc-rgb),0.4)" : "var(--hair-3)") }}>
              <Icon name={KIND_ICON[c.kind] || "message-square"} size={13} color={on ? "var(--acc-text)" : "var(--ink-3)"} />
              <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: on ? "var(--ink)" : "var(--ink-2)" }}>{c.kind === "resident" ? "Resident" : c.kind === "board" ? "Board" : c.kind === "vendor" ? "Vendor" : c.kind === "advisory" ? "Direct line" : c.title.split(" ")[0]}</span>
            </button>
          );
        })}
        {directors.length > 0 && (
          <button onClick={() => setPickDir((p) => !p)} title="Message a specific director" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 99, cursor: "pointer", background: "var(--fill-2)", border: "1px dashed var(--hair-strong)", color: "var(--ink-3)" }}>
            <Icon name="plus" size={13} color="var(--ink-3)" />
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>DIRECTOR</span>
          </button>
        )}
        {pickDir && (
          <div style={{ position: "absolute", top: "calc(100% - 2px)", right: 14, zIndex: 40, minWidth: 200, padding: 6, borderRadius: 12, background: "var(--panel-solid)", border: "1px solid var(--hair-strong)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-4)", padding: "6px 8px" }}>DIRECT MESSAGE</div>
            {directors.map((d) => (
              <button key={d.id} onClick={() => startDM(d.name)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: d.color + "22", color: d.color, fontFamily: MONO, fontSize: 9, fontWeight: 700 }}>{d.initials}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink)" }}>{d.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{d.role.split("·")[0].trim()}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>{active && <ChatThread key={active.id} channel={active} onRoute={active.routedTo ? reroute : undefined} />}</div>
    </div>
  );
}
