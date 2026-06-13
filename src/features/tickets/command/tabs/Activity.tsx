// Activity tab — chain-verified audit trail with per-entry hashes.
import { useState } from "react";
import type { Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { seed } from "@/lib/format";
import { PEOPLE } from "@/data/seed";
import { Btn, inputStyle, SectionLabel } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function Activity({ t }: { t: Ticket }) {
  const { addTicketNote } = useOrbit();
  const [note, setNote] = useState("");
  const submit = () => { if (note.trim()) { addTicketNote(t.id, note.trim()); setNote(""); } };
  return (
    <div style={{ maxWidth: 720 }}>
      <SectionLabel style={{ marginBottom: 14 }}>Activity · chain-verified audit trail</SectionLabel>
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
                <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{PEOPLE[l[1]]?.name || l[1]} · {l[0].replace("T", " ")}</span>
                <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-5)", padding: "1px 6px", borderRadius: 5, background: "var(--fill-2)" }}>#{(seed(t.id + i) % 0xffff).toString(16).padStart(4, "0")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Add to the chain…" style={{ ...inputStyle, flex: 1 }} />
        <Btn small onClick={submit}>Log</Btn>
      </div>
    </div>
  );
}
