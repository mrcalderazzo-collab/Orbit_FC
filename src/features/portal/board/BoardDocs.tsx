// BoardDocs — governance record: meeting minutes, recent decisions/resolutions,
// and the document library (financial packages, insurance, contracts, records).
// Read-only, scoped to the building.
import { useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { buildingById } from "@/data/seed";
import { BUILDING_FILES, BUILDING_RECORDS } from "@/data/buildings";
import { boardMinutes, boardDecisions } from "@/data/governance";
import { Glass, Icon, SectionLabel, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fileIcon = (k: string) => ({ "Floor plan": "map", "Photo set": "images", Video: "video", Report: "file-text", Manual: "book-open", Access: "key-round" }[k] || "file");

export function BoardDocs() {
  const { currentUser } = useOrbit();
  const bId = currentUser?.building ?? "";
  const b = buildingById(bId);
  const [tab, setTab] = useState<"minutes" | "library">("minutes");
  const minutes = useMemo(() => boardMinutes(bId), [bId]);
  const decisions = useMemo(() => boardDecisions(bId), [bId]);
  const files = BUILDING_FILES.filter((f) => f.buildingId === bId);
  const records = BUILDING_RECORDS.filter((r) => r.buildingId === bId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Minutes &amp; documents</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>{b?.name} · board record</p>
      </div>

      <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)", alignSelf: "flex-start" }}>
        {([["minutes", "Minutes & decisions"], ["library", "Document library"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", background: tab === k ? "rgba(168,85,247,0.16)" : "transparent", color: tab === k ? "var(--ink)" : "var(--ink-3)", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</button>
        ))}
      </div>

      {tab === "minutes" ? (
        <>
          <Glass style={{ padding: 18 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Recent decisions</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {decisions.map((d, i) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < decisions.length - 1 ? "1px solid var(--hair)" : "none" }}>
                  <Icon name="gavel" size={15} color="#a855f7" />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{d.title}</span>
                  <Tag color="#22c55e" bg="rgba(34,197,94,0.12)">{d.outcome} {d.vote}</Tag>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{fmtDate(d.date)}</span>
                </div>
              ))}
            </div>
          </Glass>
          {minutes.map((m) => (
            <Glass key={m.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Icon name="file-text" size={15} color="var(--acc-text)" />
                <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{m.title}</span>
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{fmtDate(m.date)}</span>
              </div>
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{m.summary}</p>
              <button style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", fontFamily: MONO, fontSize: 9, fontWeight: 700, color: "var(--acc-text)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <Icon name="download" size={12} color="var(--acc-text)" />Download PDF
              </button>
            </Glass>
          ))}
        </>
      ) : (
        <>
          <Glass style={{ padding: 18 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Key records</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {records.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < records.length - 1 ? "1px solid var(--hair)" : "none" }}>
                  <Icon name="folder" size={15} color="var(--ink-3)" />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{r.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{r.kind}</span>
                  <Tag color={r.status === "Current" ? "#22c55e" : r.status === "Due soon" ? "#f59e0b" : "#ef4444"}>{r.status}</Tag>
                </div>
              ))}
            </div>
          </Glass>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {files.map((f) => (
              <Glass key={f.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fill-2)", border: "1px solid var(--hair-3)" }}>
                  <Icon name={fileIcon(f.kind)} size={16} color="var(--acc-text)" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{f.kind} · {f.size}</div>
                </div>
              </Glass>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
