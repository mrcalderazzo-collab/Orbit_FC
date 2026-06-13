// playbooks.ts — category playbooks. Every recurring kind of work has a known
// sequence of steps; a playbook pre-loads that checklist (and a default vendor /
// tags) the moment a matching ticket exists, so nothing is improvised or
// forgotten and the work starts moving immediately.
import type { Ticket } from "@/lib/types";

export interface Playbook {
  key: string;
  label: string;
  categoryKey: string; // taxonomy category this belongs to
  match?: string[]; // keywords (title / subcategory / desc) that pick it within a category
  steps: string[]; // the subtask checklist
  defaultVendor?: string;
  tags?: string[];
}

export const PLAYBOOKS: Playbook[] = [
  {
    key: "leak", label: "Water leak response", categoryKey: "maintenance", match: ["leak", "water", "drip", "flood", "intrusion"],
    steps: ["Confirm source & shut off water", "Photograph damage + affected area", "Check units below for intrusion", "Source plumber (2–3 bids if non-urgent)", "Schedule repair + resident access", "Dry-out / remediation if needed", "Verify repair & sign off"],
    defaultVendor: "MetroFlow Plumbing", tags: ["Urgent"],
  },
  {
    key: "boiler", label: "Boiler / no-heat", categoryKey: "systems", match: ["boiler", "no heat", "heating", "hot water"],
    steps: ["Confirm scope (single line vs building)", "Check fuel level & reset controls", "Dispatch heating vendor", "Notify affected residents", "Restore heat & monitor", "Schedule follow-up service"],
    defaultVendor: "Cambridge & Leach", tags: ["After-hours"],
  },
  {
    key: "elevator", label: "Elevator fault", categoryKey: "systems", match: ["elevator", "entrapment", "lift"],
    steps: ["Confirm no entrapment (911 if occupied)", "Take car out of service + post signage", "Dispatch elevator vendor", "Diagnose fault code", "Repair & test all stops", "Return to service & log"],
    defaultVendor: "Otis Elevator", tags: ["Vendor required"],
  },
  {
    key: "electrical", label: "Electrical / power", categoryKey: "maintenance", match: ["electrical", "power", "outlet", "breaker", "wiring", "outage"],
    steps: ["Confirm safety (no exposed wiring)", "Check panel / breakers", "Dispatch licensed electrician", "Repair & test load", "Verify & close"],
    defaultVendor: "Empire Power",
  },
  {
    key: "facade", label: "Facade / FISP (LL11)", categoryKey: "compliance", match: ["facade", "fisp", "ll11", "pointing", "sidewalk shed"],
    steps: ["Engage QEWI engineer", "File inspection report (FISP)", "Address unsafe / SWARMP conditions", "Permit + sidewalk shed if required", "Complete repairs", "Re-file & close cycle"],
    defaultVendor: "Skyline Restoration", tags: ["Board attention"],
  },
  {
    key: "violation", label: "Violation remediation", categoryKey: "compliance", match: ["violation", "hpd", "dob", "fdny", "dep"],
    steps: ["Log violation # + issuing agency", "Pull cure deadline + penalty", "Assign remediation owner", "Schedule corrective work", "File certification of correction", "Confirm dismissal"],
    tags: ["Board attention"],
  },
  {
    key: "anomaly", label: "Finance anomaly review", categoryKey: "finance", match: ["anomaly", "duplicate", "invoice", "overcharge"],
    steps: ["Pull source invoices / statements", "Reconcile against ledger", "Confirm duplicate / overcharge", "Hold payment + notify vendor", "Adjust & document", "Close with audit note"],
  },
  {
    key: "pest", label: "Pest / extermination", categoryKey: "sanitation", match: ["pest", "rodent", "roach", "bedbug", "exterminat"],
    steps: ["Confirm scope + adjacent units", "Schedule licensed exterminator", "Treat + post notice", "File DOH report if required", "Follow-up treatment", "Verify clear"],
    defaultVendor: "Sani Environmental",
  },
];

const CATEGORY_DEFAULT: Record<string, Playbook> = {
  facility: { key: "facility", label: "Common-area work", categoryKey: "facility", steps: ["Inspect & scope the area", "Source vendor / assign crew", "Schedule work + notice residents", "Complete work", "Walkthrough & sign off"] },
  resident: { key: "resident", label: "Resident request", categoryKey: "resident", steps: ["Acknowledge resident", "Confirm details / access", "Resolve or route", "Update resident", "Close with confirmation"] },
  documents: { key: "documents", label: "Document / records", categoryKey: "documents", steps: ["Identify document + deadline", "Gather inputs", "Draft / collect", "Review & sign", "File & distribute"] },
};

export function playbookFor(t: Ticket): Playbook | undefined {
  const hay = (t.title + " " + (t.intake?.subcategory || "") + " " + (t.desc || "")).toLowerCase();
  const kw = PLAYBOOKS.find((pb) => pb.match && pb.match.some((k) => hay.includes(k)) && (!t.category || pb.categoryKey === t.category));
  if (kw) return kw;
  if (t.category) {
    return PLAYBOOKS.find((pb) => pb.categoryKey === t.category && !pb.match) || CATEGORY_DEFAULT[t.category];
  }
  return undefined;
}
