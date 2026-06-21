// vendors.ts — vendor directory with insurance (COI) tracking. The bottleneck
// in maintenance is getting an *insured* vendor on site, so every vendor carries
// a Certificate of Insurance expiry; dispatch is guarded against expired COIs.
import { addDaysISO, todayISO } from "@/lib/focus";

export interface Vendor {
  id: string;
  code: string; // human vendor ID, e.g. V-004
  name: string;
  trades: string[];
  grade: number; // 0–100
  rating: number; // 0–5
  phone: string;
  email: string;
  coiExpiry: string; // ISO date
  responseHrs: number;
  jobs: number; // jobs across portfolio
}

// COI dates are relative to "today" so the demo always shows live expiry states.
const RAW_VENDORS: Omit<Vendor, "code">[] = [
  { id: "v_otis", name: "Otis Elevator", trades: ["Elevator", "Building Systems"], grade: 96, rating: 4.8, phone: "+1 (212) 555-0410", email: "dispatch@otis.example", coiExpiry: addDaysISO(220), responseHrs: 2, jobs: 31 },
  { id: "v_nemech", name: "Northeast Mechanical", trades: ["HVAC", "Cooling", "Maintenance"], grade: 94, rating: 4.7, phone: "+1 (917) 555-0188", email: "ops@nemech.example", coiExpiry: addDaysISO(58), responseHrs: 4, jobs: 47 },
  { id: "v_camleach", name: "Cambridge & Leach", trades: ["Boiler", "Heating", "Hot water"], grade: 88, rating: 4.5, phone: "+1 (646) 555-0119", email: "service@camleach.example", coiExpiry: addDaysISO(12), responseHrs: 4, jobs: 22 },
  { id: "v_empire", name: "Empire Power", trades: ["Electrical", "Generator", "Switchgear"], grade: 91, rating: 4.6, phone: "+1 (212) 555-0204", email: "dispatch@empirepower.example", coiExpiry: addDaysISO(140), responseHrs: 6, jobs: 18 },
  { id: "v_metroflow", name: "MetroFlow Plumbing", trades: ["Plumbing", "Leak", "Sewage"], grade: 79, rating: 4.1, phone: "+1 (718) 555-0173", email: "calls@metroflow.example", coiExpiry: addDaysISO(-8), responseHrs: 3, jobs: 26 },
  { id: "v_skyline", name: "Skyline Restoration", trades: ["Facade", "Roof", "Waterproofing", "LL11"], grade: 92, rating: 4.6, phone: "+1 (347) 555-0151", email: "projects@skyline.example", coiExpiry: addDaysISO(305), responseHrs: 24, jobs: 9 },
  { id: "v_sani", name: "Sani Environmental", trades: ["Sanitation", "Pest", "Compactor"], grade: 84, rating: 4.3, phone: "+1 (212) 555-0190", email: "ops@sanienv.example", coiExpiry: addDaysISO(74), responseHrs: 12, jobs: 15 },
  { id: "v_aiphone", name: "Aiphone NY", trades: ["Intercom", "Access control", "CCTV"], grade: 85, rating: 4.2, phone: "+1 (212) 555-0167", email: "support@aiphoneny.example", coiExpiry: addDaysISO(26), responseHrs: 8, jobs: 11 },
  { id: "v_securelife", name: "SecureLife Fire", trades: ["Fire alarm", "Sprinkler", "Life safety"], grade: 90, rating: 4.5, phone: "+1 (646) 555-0142", email: "service@securelife.example", coiExpiry: addDaysISO(168), responseHrs: 6, jobs: 13 },
  { id: "v_aqua", name: "Aqua Systems NY", trades: ["Pumps", "Backflow", "Plumbing"], grade: 83, rating: 4.0, phone: "+1 (917) 555-0233", email: "dispatch@aquasys.example", coiExpiry: addDaysISO(-31), responseHrs: 5, jobs: 8 },
  { id: "v_marks", name: "Marks Paneth CPA", trades: ["Finance", "Audit", "Forensic"], grade: 93, rating: 4.7, phone: "+1 (212) 555-0301", email: "advisory@markspaneth.example", coiExpiry: addDaysISO(410), responseHrs: 48, jobs: 6 },
  { id: "v_cohen", name: "Cohen & Associates Law", trades: ["Legal", "Governance", "Compliance"], grade: 95, rating: 4.8, phone: "+1 (212) 555-0355", email: "counsel@cohenlaw.example", coiExpiry: addDaysISO(512), responseHrs: 48, jobs: 5 },
];

export const VENDORS: Vendor[] = RAW_VENDORS.map((v, i) => ({ ...v, code: "V-" + String(i + 1).padStart(3, "0") }));

export type CoiStatus = "valid" | "expiring" | "expired";

export function coiStatus(v: Vendor): { status: CoiStatus; label: string; color: string; days: number } {
  const today = todayISO();
  const days = Math.round((new Date(v.coiExpiry).getTime() - new Date(today).getTime()) / 864e5);
  if (days < 0) return { status: "expired", label: "COI expired", color: "#ef4444", days };
  if (days <= 30) return { status: "expiring", label: "COI expiring", color: "#f59e0b", days };
  return { status: "valid", label: "COI valid", color: "#22c55e", days };
}

export const vendorByName = (name?: string | null): Vendor | undefined =>
  name ? VENDORS.find((v) => v.name === name) : undefined;

export const vendorById = (id?: string | null): Vendor | undefined =>
  id ? VENDORS.find((v) => v.id === id) : undefined;

// Rank vendors against a free-text issue / trade ("Boiler", "Elevator stuck",
// "HVAC"): token overlap against name + trades, best-graded first. Used to
// recommend who can cover a batch of similar jobs across buildings.
export function vendorsForIssue(query: string): Vendor[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (!words.length) return [];
  return VENDORS
    .map((v) => {
      const hay = (v.name + " " + v.trades.join(" ")).toLowerCase();
      let score = 0;
      for (const w of words) if (hay.includes(w)) score += 1;
      return { v, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.v.grade - a.v.grade)
    .map((x) => x.v);
}

/** Best vendor for an issue, preferring one whose COI is still valid/expiring. */
export function recommendedVendorForIssue(query: string): Vendor | undefined {
  const ranked = vendorsForIssue(query);
  return ranked.find((v) => coiStatus(v).status !== "expired") ?? ranked[0];
}

export const fmtCoiDate = (iso: string): string =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
