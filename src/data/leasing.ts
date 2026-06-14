// leasing.ts — occupancy, leasing pipeline, applications, waitlist & marketing
// funnel. Deterministic synth (seeded on building id) standing in for a real
// leasing/CRM feed, so the Sales/Marketing/AM dashboards have live-looking data.
import { rng, seed } from "@/lib/format";
import { BUILDINGS } from "./seed";

export interface Occupancy { buildingId: string; units: number; leased: number; available: number; vacant: number; intentToVacate: number; turnaroundDays: number }

export function occupancyOf(buildingId: string): Occupancy {
  const b = BUILDINGS.find((x) => x.id === buildingId)!;
  const r = rng(seed(buildingId + "occ"));
  const units = b.units;
  const vacant = Math.round(units * (0.005 + r() * 0.03));
  const available = Math.round(units * (0.02 + r() * 0.06));
  const intentToVacate = Math.round(units * (0.005 + r() * 0.02));
  const leased = units - vacant - available;
  return { buildingId, units, leased, available, vacant, intentToVacate, turnaroundDays: 2 + Math.floor(r() * 12) };
}

export function portfolioOccupancy() {
  const all = BUILDINGS.map((b) => occupancyOf(b.id));
  const units = all.reduce((a, o) => a + o.units, 0);
  const leased = all.reduce((a, o) => a + o.leased, 0);
  const available = all.reduce((a, o) => a + o.available, 0);
  const vacant = all.reduce((a, o) => a + o.vacant, 0);
  const intentToVacate = all.reduce((a, o) => a + o.intentToVacate, 0);
  const turnaroundDays = Math.round(all.reduce((a, o) => a + o.turnaroundDays, 0) / all.length);
  return { units, leased, available, vacant, intentToVacate, turnaroundDays, leasedPct: +((leased / units) * 100).toFixed(1), vacantPct: +((vacant / units) * 100).toFixed(1) };
}

export interface Funnel { leads: number; tours: number; applications: number; approved: number; leased: number }
export function leasingFunnel(): Funnel {
  const r = rng(seed("funnel"));
  const leads = 180 + Math.floor(r() * 90);
  const tours = Math.round(leads * (0.4 + r() * 0.15));
  const applications = Math.round(tours * (0.45 + r() * 0.15));
  const approved = Math.round(applications * (0.6 + r() * 0.15));
  const leased = Math.round(approved * (0.7 + r() * 0.15));
  return { leads, tours, applications, approved, leased };
}

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
export function applicationsTrend(): { month: string; value: number }[] {
  const r = rng(seed("apps"));
  return MONTHS.map((month) => ({ month, value: 8 + Math.floor(r() * 22) }));
}

export function waitlist() {
  return BUILDINGS.map((b) => {
    const r = rng(seed(b.id + "wl"));
    return { building: b.name, active: Math.floor(r() * 6), inProcess: Math.floor(r() * 4), prequalified: Math.floor(r() * 5) };
  });
}

export function marketingSources() {
  const r = rng(seed("mktg"));
  const raw = [
    { source: "StreetEasy", w: 3 + r() },
    { source: "Referral", w: 2 + r() },
    { source: "Website", w: 2 + r() },
    { source: "Zillow", w: 1.5 + r() },
    { source: "Walk-in", w: 1 + r() },
    { source: "Broker", w: 1 + r() },
  ];
  const total = raw.reduce((a, x) => a + x.w, 0);
  const leads = leasingFunnel().leads;
  return raw.map((x) => ({ source: x.source, leads: Math.round((x.w / total) * leads), pct: Math.round((x.w / total) * 100) })).sort((a, b) => b.leads - a.leads);
}
