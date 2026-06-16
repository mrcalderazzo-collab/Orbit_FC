// VendorScorecard — rate, track and compare vendor performance. Six dimensions
// roll up to a composite 0–10 and a letter grade; Leaderboard ranks the network,
// Deep Dive shows a vendor's breakdown + rating history. Ratings live in the
// OrbitProvider (rateVendor). Ported from the Daisy "Vendor Scorecard".
import { useMemo, useState } from "react";
import type { VendorRating } from "@/store/OrbitProvider";
import { useOrbit } from "@/store/OrbitProvider";
import { VENDORS } from "@/data/vendors";
import { BUILDINGS, buildingById } from "@/data/seed";
import { Btn, Glass, Icon, SectionLabel, Select } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export const DIMS: { key: string; label: string }[] = [
  { key: "quality", label: "Quality of Work" },
  { key: "communication", label: "Communication" },
  { key: "response", label: "Response Time" },
  { key: "pricing", label: "Pricing / Value" },
  { key: "reliability", label: "Reliability" },
  { key: "professionalism", label: "Professionalism" },
];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function compositeOf(ratings: VendorRating[], fallbackGrade: number): number {
  if (!ratings.length) return Math.round((fallbackGrade / 10) * 10) / 10;
  return +avg(DIMS.map((d) => avg(ratings.map((r) => r.dims[d.key] ?? 0)))).toFixed(1);
}
export function letterGrade(s: number): { letter: string; color: string } {
  const color = s >= 8 ? "#22c55e" : s >= 6.5 ? "#b6ff00" : s >= 5 ? "#f59e0b" : "#ef4444";
  const letter = s >= 9.3 ? "A+" : s >= 8.7 ? "A" : s >= 8 ? "A-" : s >= 7.3 ? "B+" : s >= 6.7 ? "B" : s >= 6 ? "B-" : s >= 5.3 ? "C+" : s >= 4.7 ? "C" : s >= 4 ? "C-" : s >= 3.3 ? "D+" : s >= 2.7 ? "D" : "F";
  return { letter, color };
}

type Tab = "rate" | "leaderboard" | "deep";

export function VendorScorecard() {
  const { vendorRatings, rateVendor } = useOrbit();
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [deepId, setDeepId] = useState(VENDORS[0]?.id ?? "");

  const board = useMemo(() => VENDORS.map((v) => {
    const ratings = vendorRatings[v.id] || [];
    const score = compositeOf(ratings, v.grade);
    return { v, ratings, score, n: ratings.length, ...letterGrade(score) };
  }).sort((a, b) => b.score - a.score), [vendorRatings]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)", alignSelf: "flex-start" }}>
        {([["leaderboard", "Leaderboard"], ["rate", "Rate vendor"], ["deep", "Deep dive"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", background: tab === k ? "rgba(var(--acc-rgb),0.16)" : "transparent", color: tab === k ? "var(--ink)" : "var(--ink-3)", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {board.map(({ v, score, n, letter, color }, i) => (
            <Glass key={v.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: i < 3 ? "var(--acc-text)" : "var(--ink-4)", width: 22 }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{v.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{v.trades.slice(0, 2).join(" · ")} · {n} rating{n === 1 ? "" : "s"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{letter}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{score.toFixed(1)}/10</div>
                </div>
              </div>
              <button onClick={() => { setDeepId(v.id); setTab("deep"); }} style={{ marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px", borderRadius: 9, border: "1px solid var(--hair-3)", background: "var(--fill-2)", cursor: "pointer", fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: "var(--ink-3)", textTransform: "uppercase" }}>
                <Icon name="search" size={12} color="var(--ink-3)" />Deep dive
              </button>
            </Glass>
          ))}
        </div>
      )}

      {tab === "rate" && <RateForm onRate={rateVendor} />}
      {tab === "deep" && <DeepDive deepId={deepId} setDeepId={setDeepId} />}
    </div>
  );
}

function RateForm({ onRate }: { onRate: (vendorId: string, dims: Record<string, number>, note?: string, building?: string) => void }) {
  const [vendorId, setVendorId] = useState(VENDORS[0]?.id ?? "");
  const [dims, setDims] = useState<Record<string, number>>(() => Object.fromEntries(DIMS.map((d) => [d.key, 5])));
  const [note, setNote] = useState("");
  const [building, setBuilding] = useState("");
  const score = +avg(DIMS.map((d) => dims[d.key])).toFixed(1);
  const g = letterGrade(score);

  const submit = () => { onRate(vendorId, { ...dims }, note.trim() || undefined, building || undefined); setNote(""); setDims(Object.fromEntries(DIMS.map((d) => [d.key, 5]))); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 220px", gap: 16, alignItems: "start" }}>
      <Glass style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: 6 }}>Vendor</div>
            <Select value={vendorId} onChange={setVendorId} options={VENDORS.map((v) => ({ value: v.id, label: v.name }))} />
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: 6 }}>Building (optional)</div>
            <Select value={building} onChange={setBuilding} options={[{ value: "", label: "—" }, ...BUILDINGS.map((b) => ({ value: b.id, label: b.name }))]} />
          </div>
        </div>
        <SectionLabel style={{ marginBottom: 12 }}>Performance ratings</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 22px" }}>
          {DIMS.map((d) => (
            <div key={d.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>{d.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--acc-text)" }}>{dims[d.key]}</span>
              </div>
              <input type="range" min={0} max={10} value={dims[d.key]} onChange={(e) => setDims((s) => ({ ...s, [d.key]: +e.target.value }))} style={{ width: "100%", accentColor: "var(--acc)" }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What did they do well / poorly?" style={{ width: "100%", fontFamily: SANS, fontSize: 13, color: "var(--ink)", background: "var(--fill-2)", border: "1px solid var(--hair-strong)", borderRadius: 10, padding: "10px 12px", outline: "none", resize: "vertical" }} />
        </div>
        <Btn primary icon="star" onClick={submit} style={{ marginTop: 14 }}>Submit rating</Btn>
      </Glass>

      <Glass style={{ padding: 18, textAlign: "center" }}>
        <SectionLabel style={{ marginBottom: 14 }}>Composite</SectionLabel>
        <div style={{ width: 92, height: 92, borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid " + g.color }}>
          <span style={{ fontFamily: SANS, fontSize: 32, fontWeight: 700, color: g.color }}>{g.letter}</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 700, color: "var(--ink)", marginTop: 12 }}>{score.toFixed(1)}</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>out of 10</div>
      </Glass>
    </div>
  );
}

function DeepDive({ deepId, setDeepId }: { deepId: string; setDeepId: (id: string) => void }) {
  const { vendorRatings } = useOrbit();
  const v = VENDORS.find((x) => x.id === deepId) ?? VENDORS[0];
  const ratings = vendorRatings[v.id] || [];
  const score = compositeOf(ratings, v.grade);
  const g = letterGrade(score);
  const dimAvg = (k: string) => (ratings.length ? avg(ratings.map((r) => r.dims[k] ?? 0)) : v.grade / 10);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 220px", gap: 16, alignItems: "start" }}>
      <Glass style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Select value={v.id} onChange={setDeepId} options={VENDORS.map((x) => ({ value: x.id, label: x.name }))} style={{ width: 240 }} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{ratings.length} rating{ratings.length === 1 ? "" : "s"}</span>
        </div>
        <SectionLabel style={{ marginBottom: 12 }}>Dimension breakdown</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {DIMS.map((d) => {
            const val = dimAvg(d.key);
            const c = val >= 8 ? "#22c55e" : val >= 6 ? "#b6ff00" : val >= 5 ? "#f59e0b" : "#ef4444";
            return (
              <div key={d.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>{d.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: c }}>{val.toFixed(1)}</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}><div style={{ width: (val / 10) * 100 + "%", height: "100%", background: c }} /></div>
              </div>
            );
          })}
        </div>
        {ratings.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <SectionLabel style={{ marginBottom: 10 }}>Rating history</SectionLabel>
            {ratings.map((r) => (
              <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--hair)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", flex: 1 }}>{r.by}</span>
                  {r.building && <span style={{ fontFamily: MONO, fontSize: 8.5, color: buildingById(r.building)?.mono }}>{buildingById(r.building)?.name}</span>}
                  <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{r.at}</span>
                </div>
                {r.note && <p style={{ margin: "5px 0 0", fontFamily: SANS, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>"{r.note}"</p>}
              </div>
            ))}
          </div>
        )}
      </Glass>
      <Glass style={{ padding: 18, textAlign: "center" }}>
        <SectionLabel style={{ marginBottom: 14 }}>Composite</SectionLabel>
        <div style={{ width: 92, height: 92, borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid " + g.color }}>
          <span style={{ fontFamily: SANS, fontSize: 32, fontWeight: 700, color: g.color }}>{g.letter}</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 700, color: "var(--ink)", marginTop: 12 }}>{score.toFixed(1)}</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>out of 10</div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--hair-2)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>OPS GRADE</span>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--ink-2)" }}>{v.grade}</span>
        </div>
      </Glass>
    </div>
  );
}
