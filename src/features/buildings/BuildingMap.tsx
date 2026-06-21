// BuildingMap — the portfolio on a real map. Renders Carto basemap tiles
// (theme-aware, no API key) via Leaflet, drops a pin per building colored by
// attention and badged with its open field-work count, and computes "dispatch
// efficiency" clusters: the same open issue type appearing in nearby buildings,
// so the operator can batch one crew/visit instead of separate trips.
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Ticket } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { BUILDINGS } from "@/data/seed";
import { BUILDING_GEO, buildingImage } from "@/data/buildings";
import { categoryByKey } from "@/data/taxonomy";
import { vendorByName, recommendedVendorForIssue, coiStatus } from "@/data/vendors";
import { Btn, Glass, Icon, SectionLabel, StatusTag, Tag } from "@/components/ui";
import type { DirRow } from "./BuildingsPage";
import { rowAttention } from "./BuildingsPage";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const isField = (t: Ticket) => t.type === "Maintenance" || t.type === "Facility";
const issueLabel = (t: Ticket) => (t.category ? categoryByKey(t.category)?.label ?? t.category : t.type);

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

interface Cluster { label: string; buildingIds: string[]; vendors: string[]; spreadKm: number; count: number; recVendorId?: string; recVendorName?: string }

export function BuildingMap({ rows, onOpen, onVendor }: { rows: DirRow[]; onOpen: (id: string) => void; onVendor?: (vendorId: string) => void }) {
  const { theme } = useOrbit();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const rowById = useMemo(() => Object.fromEntries(rows.map((r) => [r.building.id, r])), [rows]);

  // dispatch clusters: same issue type across 2+ buildings
  const clusters = useMemo<Cluster[]>(() => {
    const byLabel: Record<string, { ids: Set<string>; vendors: Set<string>; count: number }> = {};
    rows.forEach((row) => {
      row.activeTickets.filter(isField).forEach((t) => {
        const key = issueLabel(t);
        const g = (byLabel[key] ||= { ids: new Set(), vendors: new Set(), count: 0 });
        g.ids.add(row.building.id);
        g.count += 1;
        if (t.vendor) g.vendors.add(t.vendor);
      });
    });
    return Object.entries(byLabel)
      .filter(([, g]) => g.ids.size >= 2)
      .map(([label, g]) => {
        const ids = [...g.ids];
        let spread = 0;
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
          const a = BUILDING_GEO[ids[i]], b = BUILDING_GEO[ids[j]];
          if (a && b) spread = Math.max(spread, haversineKm(a, b));
        }
        const rec = recommendedVendorForIssue(label);
        return { label, buildingIds: ids, vendors: [...g.vendors], spreadKm: spread, count: g.count, recVendorId: rec?.id, recVendorName: rec?.name };
      })
      .sort((a, b) => b.buildingIds.length - a.buildingIds.length || a.spreadKm - b.spreadKm);
  }, [rows]);

  // init map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([40.728, -73.95], 11);
    mapRef.current = map;
    groupRef.current = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; tileRef.current = null; groupRef.current = null; };
  }, []);

  // theme-aware tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    const variant = theme === "light" ? "light_all" : "dark_all";
    tileRef.current = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`, {
      subdomains: "abcd", maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
  }, [theme]);

  // (re)draw markers when rows / selection change
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    rows.forEach((row) => {
      const geo = BUILDING_GEO[row.building.id];
      if (!geo) return;
      const attn = rowAttention(row);
      const field = row.activeTickets.filter(isField).length;
      const sel = selected === row.building.id;
      const icon = L.divIcon({
        className: "",
        html: `<span class="bmap-pin${sel ? " sel" : ""}" style="--c:${attn.color}">${field ? `<i class="bmap-badge">${field}</i>` : ""}</span>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      });
      L.marker([geo.lat, geo.lng], { icon, title: row.building.name }).addTo(group).on("click", () => setSelected(row.building.id));
    });
  }, [rows, selected]);

  // fit to the visible set when the filtered rows change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts = rows
      .map((r) => BUILDING_GEO[r.building.id])
      .filter((g): g is { lat: number; lng: number } => !!g)
      .map((g) => [g.lat, g.lng] as [number, number]);
    if (pts.length === 1) map.setView(pts[0], 14);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.25));
  }, [rows]);

  const sel = selected ? rowById[selected] : null;

  return (
    <div className="bmap-layout">
      <div className="bmap-main">
        <div ref={elRef} className="bmap" />
        <div className="building-map-legend" style={{ marginTop: 12 }}>
          <Lg color="#22c55e" label="Healthy" />
          <Lg color="#f59e0b" label="Review due" />
          <Lg color="#ef4444" label="Needs attention" />
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{rows.length} of {BUILDINGS.length} shown · badge = open field jobs</span>
        </div>
      </div>

      <aside className="bmap-side">
        {sel ? <SelectedCard row={sel} onOpen={onOpen} onClose={() => setSelected(null)} /> : <SelectHint />}
        <Glass style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="route" size={15} color="var(--acc-text)" />
            <SectionLabel>Dispatch efficiency</SectionLabel>
          </div>
          {clusters.length === 0 ? (
            <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>No shared open issue types across buildings right now. When the same problem appears in two or more, you'll see batching options here.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {clusters.map((c) => <ClusterRow key={c.label} c={c} onPick={setSelected} onVendor={onVendor} />)}
            </div>
          )}
        </Glass>
      </aside>
    </div>
  );
}

function ClusterRow({ c, onPick, onVendor }: { c: Cluster; onPick: (id: string) => void; onVendor?: (vendorId: string) => void }) {
  const near = c.spreadKm <= 4;
  const names = c.buildingIds.map((id) => BUILDINGS.find((b) => b.id === id)?.name ?? id);
  const recVendor = c.recVendorName ? vendorByName(c.recVendorName) : undefined;
  const recCoi = recVendor ? coiStatus(recVendor) : null;
  // already-assigned vendors on these tickets, resolved to records so we can link
  const assigned = c.vendors.map((n) => vendorByName(n)).filter((v): v is NonNullable<typeof v> => !!v);
  return (
    <div style={{ padding: "11px 13px", borderRadius: 12, background: "var(--fill-1)", border: "1px solid var(--hair-2)", borderLeft: "3px solid " + (near ? "#22c55e" : "#f59e0b") }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.label}</span>
        <Tag color={near ? "#22c55e" : "#f59e0b"} bg={near ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)"} style={{ marginLeft: "auto" }}>
          {near ? "~" + c.spreadKm.toFixed(1) + " km" : "spread out"}
        </Tag>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        {c.buildingIds.map((id, i) => (
          <button key={id} onClick={() => onPick(id)} style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-2)", background: "var(--fill-2)", border: "1px solid var(--hair-2)", borderRadius: 8, padding: "3px 9px", cursor: "pointer" }}>{names[i]}</button>
        ))}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: recVendor || assigned.length ? 9 : 0 }}>
        {near
          ? <><b style={{ color: "#22c55e" }}>Batchable</b> — {c.count} open {c.label.toLowerCase()} jobs in {c.buildingIds.length} buildings within ~{c.spreadKm.toFixed(1)} km. One crew can cover them.</>
          : <>{c.count} open {c.label.toLowerCase()} jobs across {c.buildingIds.length} buildings ({c.spreadKm.toFixed(0)} km apart) — separate trips.</>}
      </div>
      {/* one vendor who can address them all → bring us to the vendor */}
      {recVendor && (
        <button onClick={() => onVendor?.(recVendor.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 9, background: "rgba(var(--acc-rgb),0.07)", border: "1px solid var(--hair-2)", cursor: "pointer" }}>
          <Icon name="hard-hat" size={14} color="var(--acc-text)" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-4)" }}>One vendor covers all</span>
            <span style={{ display: "block", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{recVendor.name}</span>
          </span>
          {recCoi && <span style={{ width: 8, height: 8, borderRadius: "50%", background: recCoi.color }} title={recCoi.label} />}
          <Icon name="arrow-up-right" size={14} color="var(--acc-text)" />
        </button>
      )}
      {assigned.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-5)" }}>Already on these:</span>
          {assigned.map((v) => (
            <button key={v.id} onClick={() => onVendor?.(v.id)} style={{ fontFamily: SANS, fontSize: 11, color: "var(--acc-text)", background: "var(--fill-2)", border: "1px solid var(--hair-2)", borderRadius: 7, padding: "2px 8px", cursor: "pointer" }}>{v.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedCard({ row, onOpen, onClose }: { row: DirRow; onOpen: (id: string) => void; onClose: () => void }) {
  const { building, activeTickets } = row;
  const attn = rowAttention(row);
  const field = activeTickets.filter(isField);
  const photo = buildingImage(building.id);
  return (
    <Glass style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ height: 110, backgroundImage: photo ? `url(${photo})` : undefined, backgroundColor: `color-mix(in srgb, ${building.mono} 20%, var(--fill-2))`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" size={14} color="#fff" />
        </button>
        <span style={{ position: "absolute", left: 12, bottom: 10, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em", color: "#fff", background: "rgba(0,0,0,0.55)", padding: "3px 9px", borderRadius: 99, textTransform: "uppercase" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: attn.color }} />{attn.label}
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{building.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", marginTop: 3 }}>{building.code} · {building.address}</div>
        <div style={{ marginTop: 12 }}>
          <SectionLabel style={{ marginBottom: 9 }}>Open field work · {field.length}</SectionLabel>
          {field.length === 0 ? (
            <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-3)" }}>No open maintenance or facilities work.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {field.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}{t.vendor ? <span style={{ color: "var(--ink-4)" }}> · {t.vendor}</span> : null}</span>
                  <StatusTag status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <Btn small primary icon="arrow-up-right" onClick={() => onOpen(building.id)} style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>Open building</Btn>
      </div>
    </Glass>
  );
}

function SelectHint() {
  return (
    <Glass style={{ padding: 18, textAlign: "center" }}>
      <Icon name="map-pin" size={22} color="var(--ink-5)" />
      <p style={{ margin: "10px 0 0", fontFamily: SANS, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>Select a pin to see the building, its open field work, and where a nearby crew could double up.</p>
    </Glass>
  );
}

function Lg({ color, label }: { color: string; label: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />{label}</span>;
}
