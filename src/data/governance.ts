// governance.ts — board-grade data: local-law compliance calendar, capital
// projects pipeline, recent board decisions, meeting minutes, and a 12-month
// financial trend. All deterministic (seeded on the building id) so the board
// portal is rich and stable. In production these are real ledger / compliance
// records behind the same provider seam.
import { rng, seed } from "@/lib/format";
import { addDaysISO } from "@/lib/focus";
import { buildingById } from "./seed";

export type ComplianceStatus = "Compliant" | "Upcoming" | "Action needed" | "Overdue";
export interface ComplianceItem { id: string; buildingId: string; law: string; title: string; agency: string; due: string; status: ComplianceStatus; note: string }

export type ProjectStatus = "Planning" | "Bidding" | "Board approval" | "In progress" | "Complete";
export interface CapitalProject { id: string; buildingId: string; name: string; category: string; status: ProjectStatus; budget: number; spent: number; vendor: string; start: string; end: string; pct: number }

export interface BoardDecision { id: string; buildingId: string; date: string; title: string; outcome: string; vote: string }
export interface BoardMinutes { id: string; buildingId: string; date: string; title: string; summary: string }
export interface FinPoint { month: string; income: number; expense: number; reserve: number }

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const LAWS: { law: string; title: string; agency: string }[] = [
  { law: "LL11 / FISP", title: "Facade inspection & filing", agency: "DOB" },
  { law: "LL97", title: "Carbon emissions limit", agency: "DOB / Sustainability" },
  { law: "LL152", title: "Gas piping inspection", agency: "DOB" },
  { law: "LL84", title: "Energy benchmarking", agency: "DOB" },
  { law: "Elevator CAT1", title: "Annual elevator test & filing", agency: "DOB" },
  { law: "Boiler", title: "Annual boiler inspection", agency: "DOB" },
  { law: "Sprinkler / Standpipe", title: "5-year hydrostatic test", agency: "FDNY" },
  { law: "Fire alarm", title: "Annual FDNY inspection", agency: "FDNY" },
];

export function complianceItems(buildingId: string): ComplianceItem[] {
  const r = rng(seed(buildingId + "compliance"));
  return LAWS.map((l, i) => {
    const roll = r();
    const days = Math.round((roll - 0.25) * 320); // -80..+240
    const status: ComplianceStatus = days < 0 ? "Overdue" : days < 45 ? "Action needed" : days < 120 ? "Upcoming" : "Compliant";
    const notes: Record<ComplianceStatus, string> = {
      Overdue: "Past due — file or schedule immediately to avoid penalties.",
      "Action needed": "Window is open; schedule the vendor and filing now.",
      Upcoming: "On the calendar; no action required yet.",
      Compliant: "Filed and current for this cycle.",
    };
    return { id: `${buildingId}-cmp-${i}`, buildingId, law: l.law, title: l.title, agency: l.agency, due: addDaysISO(days), status, note: notes[status] };
  }).sort((a, b) => a.due.localeCompare(b.due));
}

const PROJECT_POOL: { name: string; category: string; vendor: string }[] = [
  { name: "Facade repair & LL11 filing", category: "Envelope", vendor: "Skyline Restoration" },
  { name: "Elevator modernization", category: "Vertical transport", vendor: "Otis Elevator" },
  { name: "Boiler plant replacement", category: "HVAC", vendor: "Cambridge & Leach" },
  { name: "Roof replacement & waterproofing", category: "Envelope", vendor: "Skyline Restoration" },
  { name: "Lobby renovation", category: "Common area", vendor: "BuildRight GC" },
  { name: "LL97 energy retrofit", category: "Sustainability", vendor: "Empire Power" },
  { name: "Intercom & access control upgrade", category: "Security", vendor: "Aiphone NY" },
];
const PROJECT_STATUS: ProjectStatus[] = ["Planning", "Bidding", "Board approval", "In progress", "Complete"];

export function capitalProjects(buildingId: string): CapitalProject[] {
  const r = rng(seed(buildingId + "projects"));
  const n = 3 + Math.floor(r() * 2);
  const picks = [...PROJECT_POOL].sort(() => r() - 0.5).slice(0, n);
  return picks.map((p, i) => {
    const status = PROJECT_STATUS[Math.floor(r() * PROJECT_STATUS.length)];
    const budget = Math.round((40000 + r() * 900000) / 1000) * 1000;
    const pct = status === "Complete" ? 100 : status === "In progress" ? 25 + Math.floor(r() * 60) : status === "Board approval" ? 0 : status === "Bidding" ? 0 : 0;
    const spent = Math.round((budget * pct) / 100 / 1000) * 1000;
    const startDays = -Math.floor(r() * 120);
    return { id: `${buildingId}-prj-${i}`, buildingId, name: p.name, category: p.category, status, budget, spent, vendor: p.vendor, start: addDaysISO(startDays), end: addDaysISO(startDays + 90 + Math.floor(r() * 200)), pct };
  });
}

export function boardDecisions(buildingId: string): BoardDecision[] {
  const r = rng(seed(buildingId + "decisions"));
  const pool: [string, string][] = [
    ["Awarded elevator modernization contract", "5–0"],
    ["Approved FY budget & reserve contribution", "4–1"],
    ["Adopted updated alteration agreement", "5–0"],
    ["Approved facade repair special assessment", "4–1"],
    ["Renewed master insurance policy", "5–0"],
    ["Approved new package-room rules", "3–2"],
    ["Authorized reserve study engagement", "5–0"],
  ];
  const picks = [...pool].sort(() => r() - 0.5).slice(0, 4);
  return picks.map((p, i) => ({ id: `${buildingId}-dec-${i}`, buildingId, date: addDaysISO(-(10 + i * 26 + Math.floor(r() * 12))), title: p[0], outcome: "Approved", vote: p[1] }));
}

export function boardMinutes(buildingId: string): BoardMinutes[] {
  const topics = [
    "Reviewed Q financials and delinquency report; treasurer to follow up on two unit arrears.",
    "Discussed facade (LL11) timeline and vendor bids; management to circulate comparison.",
    "Approved holiday staff bonuses and reviewed the preventive-maintenance calendar.",
    "Reviewed reserve study findings and a proposed multi-year capital plan.",
  ];
  return [0, 1, 2].map((i) => ({ id: `${buildingId}-min-${i}`, buildingId, date: addDaysISO(-(14 + i * 30)), title: "Board meeting minutes", summary: topics[(Math.abs(seed(buildingId)) + i) % topics.length] }));
}

export function financialTrend(buildingId: string): FinPoint[] {
  const b = buildingById(buildingId);
  const base = b?.monthlyIncome ?? 300000;
  const exp = b?.monthlyExpense ?? 260000;
  const r = rng(seed(buildingId + "fintrend"));
  let reserve = (b?.reserve ?? 1500000) - 11 * ((base - exp) * 0.6);
  return MONTHS.map((m) => {
    const income = Math.round((base * (0.92 + r() * 0.16)) / 1000) * 1000;
    const expense = Math.round((exp * (0.9 + r() * 0.2)) / 1000) * 1000;
    reserve += (income - expense) * 0.6;
    return { month: m, income, expense, reserve: Math.round(reserve) };
  });
}
