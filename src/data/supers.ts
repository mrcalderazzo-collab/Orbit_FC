// supers.ts — the resident superintendent for each building. The super is the
// on-site operator: keys, access, the boiler room, vendor escorts, trash, snow.
// Names + staff come from ROSTER; the rest (shift, certs, responsibilities,
// access notes) is deterministic mock data keyed on the building id so the demo
// is stable. In production this is the building-staff directory behind the same
// provider seam.
import { seed, rng } from "@/lib/format";
import { BUILDINGS, ROSTER, buildingById } from "./seed";

export interface BuildingSuper {
  id: string;
  buildingId: string;
  name: string;
  initials: string;
  color: string;
  phone: string;
  email: string;
  livesOnSite: boolean;
  unit?: string;
  shift: string;          // on-site hours
  since: number;          // year started
  certifications: string[];
  languages: string[];
  responsibilities: string[];
  access: string[];       // where keys / entry procedures live
  staff: { name: string; role: string; initials: string }[];
  emergencyPhone: string;
}

const CERTS = ["FDNY Q-01 Sprinkler", "FDNY S-12/S-13 Standpipe", "FDNY P-99 Fuel Oil", "Boiler Operator", "HVAC EPA 608", "OSHA 30", "Backflow Tester", "Refrigeration Operating Engineer"];
const LANGS = ["English", "Spanish", "Polish", "Russian", "Mandarin", "Albanian", "Portuguese"];
const SHIFTS = ["Mon–Fri 7:00a–4:00p · on-call 24/7", "Mon–Sat 6:30a–3:30p · on-call nights", "Daily 7:00a–5:00p · weekend porter cover", "Mon–Fri 8:00a–5:00p · on-call weekends"];
const RESP_POOL = [
  "Boiler & heating plant", "Domestic & booster water", "Trash, recycling & compactor", "Common-area cleaning",
  "Vendor escort & building access", "Snow & ice removal", "Minor plumbing & electrical", "Move-in / move-out coordination",
  "Roof & drain checks", "Light-bulb & fixture upkeep", "Package & delivery handling", "Fire-safety logs & FDNY inspections",
];
const ACCESS_POOL = [
  "Master keys in the lobby lockbox (front desk has the code)",
  "Boiler & mechanical rooms — super escorts, 24h notice for vendors",
  "Roof access via stair B; door is alarmed after 8pm",
  "Service entrance on the side street for deliveries & moves",
  "Resident keys on file at the front desk for permitted entry",
  "Garage gate fob at the super's office",
];

const initialsOf = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "");
const pick = <T,>(arr: T[], r: () => number, n: number): T[] => [...arr].sort(() => r() - 0.5).slice(0, n);

function buildSuper(buildingId: string): BuildingSuper {
  const roster = ROSTER[buildingId];
  const b = buildingById(buildingId)!;
  const name = roster?.super || "Resident super";
  const r = rng(seed(buildingId + "super"));
  const big = b.units > 80;
  return {
    id: "sup_" + buildingId,
    buildingId,
    name,
    initials: initialsOf(name),
    color: "#14b8a6",
    phone: "+1 (212) 555-0" + (200 + Math.floor(r() * 700)),
    email: slug(name) + "@" + slug(b.name).replace(/\./g, "") + ".super",
    livesOnSite: r() > 0.35,
    unit: r() > 0.35 ? "1" + ["A", "B", "C", "D"][Math.floor(r() * 4)] : undefined,
    shift: SHIFTS[Math.floor(r() * SHIFTS.length)],
    since: 2008 + Math.floor(r() * 15),
    certifications: pick(CERTS, r, big ? 4 : 2),
    languages: ["English", ...pick(LANGS.slice(1), r, 1)],
    responsibilities: pick(RESP_POOL, r, big ? 7 : 5),
    access: pick(ACCESS_POOL, r, 3),
    staff: (roster?.staff || []).map(([sname, role]) => ({ name: sname, role, initials: initialsOf(sname) })),
    emergencyPhone: "+1 (917) 555-0" + (100 + Math.floor(r() * 800)),
  };
}

export const BUILDING_SUPERS: Record<string, BuildingSuper> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, buildSuper(b.id)]),
);

export const superByBuilding = (buildingId: string | undefined | null): BuildingSuper | null =>
  (buildingId && BUILDING_SUPERS[buildingId]) || null;
