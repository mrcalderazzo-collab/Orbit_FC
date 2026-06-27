// VendorsPage — vendor directory with grade, rating, response time, job count
// and live COI (insurance) status. Filter by trade; expired-COI vendors are
// flagged so they're not dispatched.
import { useMemo, useState } from "react";
import { VENDORS, coiStatus, fmtCoiDate, vendorById, type Vendor } from "@/data/vendors";
import { Glass, Icon, Select, Btn, Tag } from "@/components/ui";
import { Modal, inputStyle } from "@/components/ui/form";
import { TopBar } from "@/components/shell/TopBar";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS } from "@/data/seed";
import { BUILDING_SYSTEMS } from "@/data/buildings";
import { VendorScorecard } from "./VendorScorecard";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function VendorsPage() {
  const { route, nav, systemVendors } = useOrbit();
  const [mode, setMode] = useState<"directory" | "scorecard">("directory");
  const [trade, setTrade] = useState("All");
  const focusVendor = route.page === "vendors" ? vendorById(route.id) : undefined;
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
              <Glass key={v.id} hover style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer" }} onClick={() => nav("vendors", v.id)}>
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
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
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
      {focusVendor && <VendorDetailModal vendor={focusVendor} systemVendors={systemVendors} onClose={() => nav("vendors")} onBuilding={(id) => nav("buildings", id)} />}
    </div>
  );
}

const VENDOR_DOC_KINDS = ["Contract", "COI / Insurance", "W-9", "Service agreement", "Warranty", "Other"];

function VendorDetailModal({ vendor, systemVendors, onClose, onBuilding }: { vendor: Vendor; systemVendors: Record<string, string>; onClose: () => void; onBuilding: (id: string) => void }) {
  const { vendorDocs, addVendorDoc, removeVendorDoc } = useOrbit();
  const [docName, setDocName] = useState("");
  const [docKind, setDocKind] = useState(VENDOR_DOC_KINDS[0]);
  const docs = vendorDocs[vendor.id] || [];
  const addDoc = () => { if (!docName.trim()) return; addVendorDoc(vendor.id, { name: docName.trim(), kind: docKind }); setDocName(""); };
  const coi = coiStatus(vendor);
  // systems this vendor currently services across the portfolio (respecting reassignments)
  const served = BUILDING_SYSTEMS
    .filter((s) => (systemVendors[s.id] ?? s.vendor) === vendor.name)
    .map((s) => ({ s, building: BUILDINGS.find((b) => b.id === s.buildingId) }));
  const byBuilding = served.reduce<Record<string, { name: string; systems: string[] }>>((acc, { s, building }) => {
    const key = building?.id ?? s.buildingId;
    (acc[key] ||= { name: building?.name ?? s.buildingId, systems: [] }).systems.push(s.name);
    return acc;
  }, {});
  const buildingsServed = Object.entries(byBuilding);

  return (
    <Modal open onClose={onClose} title={vendor.name} sub={vendor.code + " · " + vendor.trades.join(" · ")} width={620}
      footer={<>
        <Btn small ghost onClick={onClose}>Close</Btn>
        <a href={`tel:${vendor.phone}`} style={{ textDecoration: "none" }}><Btn small icon="phone">Call</Btn></a>
        <a href={`mailto:${vendor.email}`} style={{ textDecoration: "none" }}><Btn small primary icon="mail">Email</Btn></a>
      </>}>
      {/* COI banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", marginBottom: 16, borderRadius: 12, background: `color-mix(in srgb, ${coi.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${coi.color} 28%, transparent)` }}>
        <Icon name={coi.status === "expired" ? "shield-x" : coi.status === "expiring" ? "shield-alert" : "shield-check"} size={17} color={coi.color} />
        <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: coi.color }}>{coi.label}</span>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: "var(--ink-3)" }}>{coi.status === "expired" ? "expired " + Math.abs(coi.days) + "d ago" : "valid until " + fmtCoiDate(vendor.coiExpiry)}</span>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        <DetailStat label="Grade" v={String(vendor.grade)} color={vendor.grade >= 90 ? "#22c55e" : "#f59e0b"} />
        <DetailStat label="Rating" v={vendor.rating.toFixed(1)} />
        <DetailStat label="Response" v={"~" + vendor.responseHrs + "h"} />
        <DetailStat label="Jobs" v={String(vendor.jobs)} />
      </div>

      {/* contact */}
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-3)" }}>Contact</span>
      <div style={{ display: "flex", gap: 16, margin: "7px 0 18px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}><Icon name="phone" size={13} color="var(--ink-4)" />{vendor.phone}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}><Icon name="mail" size={13} color="var(--ink-4)" />{vendor.email}</span>
      </div>

      {/* systems served */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <Icon name="activity" size={13} color="var(--acc-text)" />
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-3)" }}>Systems serviced · {served.length} across {buildingsServed.length} buildings</span>
      </div>
      {buildingsServed.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {buildingsServed.map(([id, b]) => (
            <button key={id} onClick={() => { onClose(); onBuilding(id); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 11, background: "var(--fill-2)", border: "1px solid var(--hair-2)", cursor: "pointer" }}>
              <Icon name="building-2" size={15} color="var(--ink-3)" />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{b.name}</span>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{b.systems.join(" · ")}</span>
              </span>
              <Icon name="arrow-up-right" size={14} color="var(--ink-4)" />
            </button>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-4)" }}>Not currently the vendor of record on any building system.</p>
      )}

      {/* documents — contract, COI, W-9, agreements */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "20px 0 9px" }}>
        <Icon name="folder-kanban" size={13} color="var(--acc-text)" />
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-3)" }}>Documents · contracts · COI · {docs.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {docs.length ? docs.map((d) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 10, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
            <Icon name="file-text" size={15} color="var(--acc-text)" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              <span style={{ display: "block", fontFamily: MONO, fontSize: 8, color: "var(--ink-4)" }}>{d.kind} · {d.by} · {d.at}</span>
            </span>
            <Tag color="var(--acc-text)">{d.kind.split(" ")[0]}</Tag>
            <button onClick={() => removeVendorDoc(vendor.id, d.id)} title="Remove" style={{ width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center", background: "var(--fill-3)", border: "1px solid var(--hair-3)", cursor: "pointer" }}><Icon name="trash-2" size={13} color="var(--ink-4)" /></button>
          </div>
        )) : <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-4)" }}>No documents on file. Add the service contract, COI, or W-9 below.</p>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={docName} onChange={(e) => setDocName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDoc()} placeholder="e.g. 2026 service contract.pdf" style={{ ...inputStyle, flex: 1 }} />
        <select value={docKind} onChange={(e) => setDocKind(e.target.value)} style={{ ...inputStyle, width: 160, appearance: "none", cursor: "pointer" }}>
          {VENDOR_DOC_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <Btn small primary icon="file-up" onClick={addDoc}>File</Btn>
      </div>
    </Modal>
  );
}

function DetailStat({ label, v, color = "var(--ink)" }: { label: string; v: string; color?: string }) {
  return (
    <div style={{ padding: "11px 12px", borderRadius: 11, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
      <div style={{ fontFamily: SANS, fontSize: 21, fontWeight: 600, lineHeight: 1, color }}>{v}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "var(--ink-4)", textTransform: "uppercase", marginTop: 6 }}>{label}</div>
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
