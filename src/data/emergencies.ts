// emergencies.ts — seed incidents for the Emergency Desk. These run on the
// shared EMERGENCY_WORKFLOW contract (operatingSpine.ts): every incident sits at
// one of confirm → stabilize → communicate → recover, with an SLA per step.
import type { Emergency } from "@/lib/types";
import { EMERGENCY_WORKFLOW } from "@/lib/operatingSpine";

/** ordered workflow step ids, derived from the single source of truth */
export const EMERGENCY_STEPS = EMERGENCY_WORKFLOW.steps;
export const EMERGENCY_STEP_IDS = EMERGENCY_STEPS.map((s) => s.id);

export function stepIndex(id: string): number {
  const i = EMERGENCY_STEP_IDS.indexOf(id);
  return i < 0 ? 0 : i;
}
export function nextStepId(id: string): string | null {
  const i = stepIndex(id);
  return i >= EMERGENCY_STEP_IDS.length - 1 ? null : EMERGENCY_STEP_IDS[i + 1];
}
export function stepLabel(id: string): string {
  return EMERGENCY_STEPS.find((s) => s.id === id)?.label || id;
}

const SEV_META: Record<Emergency["sev"], { label: string; color: string }> = {
  critical: { label: "Critical", color: "#ef4444" },
  high: { label: "High", color: "#f97316" },
  watch: { label: "Watch", color: "#f59e0b" },
};
export function sevMeta(sev: Emergency["sev"]) { return SEV_META[sev]; }

const STATUS_META: Record<Emergency["status"], { label: string; color: string; icon: string }> = {
  active: { label: "Active", color: "#ef4444", icon: "siren" },
  potential: { label: "Potential", color: "#f59e0b", icon: "alert-triangle" },
  resolved: { label: "Resolved", color: "#22c55e", icon: "shield-check" },
};
export function statusMeta(status: Emergency["status"]) { return STATUS_META[status]; }

// a slim ISO helper for seed timestamps (kept relative-ish to today's seed date)
const T = (h: number, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };

export const SEED_EMERGENCIES: Emergency[] = [
  {
    id: "EM-204", title: "Elevator entrapment — Car B, two riders", building: "b2", type: "Elevator entrapment",
    sev: "critical", status: "active", onBehalf: "Resident · Unit 11F", channel: "Phone — front desk",
    step: "communicate", nextStep: "Keep stakeholders updated", nextDue: T(new Date().getHours() + 1), overdue: false,
    created: T(new Date().getHours() - 1, 12), linkedTicket: "T-4801",
    log: [
      [T(new Date().getHours() - 1, 12), "Reported via front desk — two riders stuck between 7 and 8", "Dispatch"],
      [T(new Date().getHours() - 1, 18), "Severity confirmed CRITICAL · Diego Ramos assigned as responsible operator", "Dispatch"],
      [T(new Date().getHours() - 1, 35), "Otis dispatched · ETA 25 min · riders in contact via intercom", "Diego Ramos"],
      [T(new Date().getHours(), 2), "Building notice drafted for residents — next update in 30 min", "Priya Anand"],
    ],
  },
  {
    id: "EM-203", title: "Water intrusion — cellar near boiler room", building: "b3", type: "Active water damage",
    sev: "high", status: "active", onBehalf: "Super · Tony Calabrese", channel: "Super app",
    step: "stabilize", nextStep: "Stabilize and dispatch", nextDue: T(new Date().getHours() - 1), overdue: true,
    created: T(new Date().getHours() - 2, 40), linkedTicket: "T-4779",
    log: [
      [T(new Date().getHours() - 2, 40), "Super reported standing water spreading toward electrical panel", "Tony Calabrese"],
      [T(new Date().getHours() - 2, 50), "Severity confirmed HIGH · water shutoff located · Metro Flow called", "Dispatch"],
    ],
  },
  {
    id: "EM-201", title: "Gas odor reported — 4th floor hallway", building: "b1", type: "Fire / gas / security incident",
    sev: "critical", status: "resolved", onBehalf: "Resident · Unit 4C", channel: "Phone — 24/7 line",
    step: "recover", nextStep: "Closed", nextDue: null, overdue: false,
    created: T(8, 5), linkedTicket: null,
    log: [
      [T(8, 5), "Resident reported gas odor · 911 and Con Ed notified immediately", "Dispatch"],
      [T(8, 12), "Floor evacuated · Con Ed en route · severity CRITICAL", "Dispatch"],
      [T(9, 20), "Con Ed cleared — trace from stove pilot, no leak in risers", "Marcus Webb"],
      [T(9, 45), "Residents cleared to return · incident report filed · hazard resolved", "Marcus Webb"],
    ],
  },
];
