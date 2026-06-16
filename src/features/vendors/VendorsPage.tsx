// VendorsPage — vendor directory with grade, rating, response time, job count
// and live COI (insurance) status. Filter by trade; expired-COI vendors are
// flagged so they're not dispatched.
import { useMemo, useState } from "react";
import { VENDORS, coiStatus, fmtCoiDate } from "@/data/vendors";
import { Glass, Icon, Select } from "@/components/ui";
import { TopBar } from "@/components/shell/TopBar";
import { VendorScorecard } from "./VendorScorecard";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function VendorsPage() {
  const [mode, setMode] = useState<"directory" | "scorecard">("directory");
  const [trade, setTrade] = useState("All");
  const trades = useMemo(() => ["All", ...[...new Set(VENDORS.flatMap((v) => v.trades))].sort()], []);
  const list = VENDORS.filter((v) => trade === "All" || v.trades.includes(trade)).sort((a, b) => b.grade - a.grade);
  const expired = VENDORS.filter((v) => coiStatus(v).status === "expired").length;
  const expiring = VENDORS.filter((v) => coiStatus(v).status === "expiring").length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Vendors" sub={VENDORS.length + " vendors · " + expired + " COI expired · " + expiring + " expiring"} />
      <div style={{ padding: "16px 28px", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid var(--hair-2)" }}>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
          {([["directory", "Directory"], ["scorecard", "Scorecard"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", background: mode === k ? "rgba(var(--acc-rgb),0.14)" : "transparent", color: mode === k ? "var(--ink)" : "var(--ink-3)", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</button>
          ))}
        </div>
        {mode === "directory" && <Select options={trades} value={trade} onChange={setTrade} style={{ width: 200 }} />}
        {mode === "directory" && (expired > 0 || expiring > 0) && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, marginLeft: "auto", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", color: "#f59e0b" }}>
            <Icon name="shield-alert" size={14} color="#f59e0b" />{expired} EXPIRED · {expiring} EXPIRING — REQUEST UPDATED COI
          </span>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 28px", minHeight: 0 }}>
        {mode === "scorecard" ? <VendorScorecard /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
          {list.map((v) => {
            const coi = coiStatus(v);
            return (
              <Glass key={v.id} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: "var(--fill-3)", border: "1px solid var(--hair-3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 14, color: "var(--ink-2)" }}>{v.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{v.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                      {v.trades.slice(0, 3).map((tr) => <span key={tr} style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.04em", color: "var(--ink-3)", background: "var(--fill-3)", border: "1px solid var(--hair-3)", padding: "2px 6px", borderRadius: 5, textTransform: "uppercase" }}>{tr}</span>)}
                    </div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 11, fontWeight: 700, color: v.grade >= 90 ? "#22c55e" : "#f59e0b" }}><Icon name="star" size={12} color={v.grade >= 90 ? "#22c55e" : "#f59e0b"} />{v.grade}</span>
                </div>

                {/* COI status */}
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 10, background: `color-mix(in srgb, ${coi.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${coi.color} 28%, transparent)` }}>
                  <Icon name={coi.status === "expired" ? "shield-x" : coi.status === "expiring" ? "shield-alert" : "shield-check"} size={15} color={coi.color} />
                  <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: coi.color }}>{coi.label}</span>
                  <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{coi.status === "expired" ? "expired " + Math.abs(coi.days) + "d ago" : "exp " + fmtCoiDate(v.coiExpiry)}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 10, borderTop: "1px solid var(--hair)" }}>
                  <Meta icon="star" label="rating" v={v.rating.toFixed(1)} />
                  <Meta icon="timer" label="response" v={"~" + v.responseHrs + "h"} />
                  <Meta icon="briefcase" label="jobs" v={"" + v.jobs} />
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <a href={"tel:" + v.phone.replace(/[^0-9+]/g, "")} title={v.phone} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fill-2)", border: "1px solid var(--hair-3)" }}><Icon name="phone" size={14} color="var(--ink-3)" /></a>
                    <a href={"mailto:" + v.email} title={v.email} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fill-2)", border: "1px solid var(--hair-3)" }}><Icon name="mail" size={14} color="var(--ink-3)" /></a>
                  </div>
                </div>
              </Glass>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

function Meta({ icon, label, v }: { icon: string; label: string; v: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}><Icon name={icon} size={12} color="var(--ink-4)" />{v}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}
