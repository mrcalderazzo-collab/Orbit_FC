// CommsPage — portfolio-wide Communications inbox. Messenger layout: a searchable
// conversation list (every resident + board channel across buildings) on the
// left, the live ChatThread on the right. The "Chat with your AM" surface.
import { useMemo, useState } from "react";
import type { Channel } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { ticketFlow } from "@/data/flow";
import { portfolioChannels, seedChatFor } from "@/data/comms";
import { BUILDINGS } from "@/data/seed";
import { Icon, inputStyle, Select, Empty } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";
import { ChatThread } from "./ChatThread";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function CommsPage() {
  const { tickets, chat } = useOrbit();
  const channels = useMemo(() => portfolioChannels(tickets, ticketFlow), [tickets]);
  const [q, setQ] = useState("");
  const [fb, setFb] = useState("All");
  const [sel, setSel] = useState<string | null>(channels[0]?.id ?? null);

  const preview = (c: Channel) => {
    const msgs = chat[c.id] || seedChatFor(c);
    const last = msgs[msgs.length - 1];
    return { text: last?.text ?? "", at: last?.at ?? "", mine: last?.senderId === "me" };
  };

  const list = channels.filter((c) => {
    if (fb !== "All" && c.buildingId !== fb) return false;
    if (q && !(c.title + c.subtitle).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const active = channels.find((c) => c.id === sel) || null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Communications" sub={channels.length + " conversations · residents + boards"} />
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* conversation list */}
        <div style={{ width: 340, flexShrink: 0, borderRight: "1px solid var(--hair-2)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "14px 16px", display: "flex", gap: 8, borderBottom: "1px solid var(--hair-2)" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}><Icon name="search" size={14} color="var(--ink-4)" /></span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" style={{ ...inputStyle, paddingLeft: 34, fontSize: 12 }} />
            </div>
            <Select options={[{ value: "All", label: "All" }, ...BUILDINGS.map((b) => ({ value: b.id, label: b.name }))]} value={fb} onChange={setFb} style={{ width: 96, fontSize: 12 }} />
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
            {list.map((c) => {
              const p = preview(c);
              const on = sel === c.id;
              const lead = c.participants[0];
              return (
                <button key={c.id} onClick={() => setSel(c.id)} style={{ width: "100%", display: "flex", gap: 11, padding: "12px 16px", border: "none", borderBottom: "1px solid var(--hair)", borderLeft: "2px solid " + (on ? "var(--acc)" : "transparent"), cursor: "pointer", textAlign: "left", background: on ? "rgba(var(--acc-rgb),0.06)" : "transparent" }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--fill-1)"; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: (lead?.color ?? "#3b82f6") + "22", border: "1px solid " + (lead?.color ?? "#3b82f6") + "55", color: lead?.color ?? "#3b82f6", fontFamily: MONO, fontSize: 12, fontWeight: 700, position: "relative" }}>
                    {c.kind === "board" ? <Icon name="users" size={16} color={lead?.color ?? "#a855f7"} /> : lead?.initials}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                      <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-5)" }}>{p.at.slice(5, 10)}</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)", marginBottom: 3 }}>{c.subtitle}</div>
                    <div style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.mine ? "You: " : ""}{p.text}</div>
                  </div>
                </button>
              );
            })}
            {!list.length && <Empty label="No conversations" icon="message-square" />}
          </div>
        </div>
        {/* active thread */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {active ? <ChatThread key={active.id} channel={active} /> : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Empty label="Select a conversation" icon="messages-square" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
