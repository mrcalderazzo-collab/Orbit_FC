// taxonomy.ts — the property-management intake taxonomy. This is the domain
// vocabulary a best-in-class ops desk needs: top-level categories (the "tag"
// — Maintenance / Compliance / Finance / …), their subcategories, where a
// problem can live (unit / common area / building system / exterior), who can
// submit it, how it arrived, and the operational tags / billing routing.
//
// Each category maps to one of the five lifecycle `type`s so the existing
// bid/vote/SLA engine keeps working, while the richer category+subcategory
// drives intake, filtering, and routing.
import type { TicketType } from "@/lib/types";

export interface Category {
  key: string;
  label: string;
  icon: string;
  color: string;
  type: TicketType; // lifecycle type this category maps to
  blurb: string;
  subs: string[];
}

export const CATEGORIES: Category[] = [
  {
    key: "maintenance", label: "Maintenance", icon: "wrench", color: "#b6ff00", type: "Maintenance",
    blurb: "Repairs inside units & equipment",
    subs: ["Plumbing — Leak", "Plumbing — Clog / backup", "Plumbing — No hot water", "Plumbing — Low pressure", "Plumbing — Fixture / faucet", "Plumbing — Sewage / drain", "Electrical — Outlet / switch", "Electrical — Lighting", "Electrical — Panel / breaker", "Electrical — Power loss", "HVAC — No heat", "HVAC — No cooling", "HVAC — Thermostat", "HVAC — Radiator / steam", "HVAC — Ventilation", "Appliance — Refrigerator", "Appliance — Stove / oven", "Appliance — Dishwasher", "Appliance — Washer / dryer", "Carpentry — Door / lock", "Carpentry — Cabinet / millwork", "Flooring", "Window", "Drywall / paint", "Pest — In unit", "General repair"],
  },
  {
    key: "facility", label: "Facilities", icon: "building-2", color: "#5eead4", type: "Facility",
    blurb: "Common areas & shared spaces",
    subs: ["Lobby", "Hallway / corridor", "Stairwell", "Elevator cab", "Laundry room", "Gym / fitness", "Roof deck", "Garage / parking", "Bike room", "Package / mail room", "Courtyard / garden", "Pool", "Resident lounge", "Trash / compactor room", "Mechanical room", "Exterior / facade", "Sidewalk / curb", "Signage"],
  },
  {
    key: "systems", label: "Building Systems", icon: "settings-2", color: "#3b82f6", type: "Maintenance",
    blurb: "Plant & life-safety equipment",
    subs: ["Boiler / heating plant", "Elevator bank", "Fire alarm panel", "Sprinkler / standpipe", "Standby generator", "Switchgear / electrical", "Booster / water pump", "Sump pump", "Cooling tower", "Gas service", "Intercom / access control", "Security cameras (CCTV)", "Roof & envelope", "Backflow preventer", "Hot water heater"],
  },
  {
    key: "compliance", label: "Compliance", icon: "clipboard-check", color: "#f59e0b", type: "Documents",
    blurb: "Violations, inspections & local law",
    subs: ["Violation — HPD", "Violation — DOB", "Violation — FDNY", "Violation — DEP", "Violation — DOHMH", "Inspection — Elevator (CAT1 / CAT5)", "Inspection — Boiler", "Inspection — Facade (FISP / LL11)", "Inspection — Sprinkler", "Inspection — Fire alarm", "Inspection — Backflow", "Inspection — Gas (LL152)", "Local Law — LL11 Facade", "Local Law — LL97 Emissions", "Local Law — LL152 Gas", "Local Law — LL55 / 31 Lead", "Local Law — LL84 Benchmarking", "Filing / certification", "Permit — DOB", "Permit — After-hours / sidewalk shed", "Lead / asbestos", "Mold assessment", "Bedbug filing"],
  },
  {
    key: "finance", label: "Finance", icon: "circle-dollar-sign", color: "#22c55e", type: "Finance",
    blurb: "Billing, invoices & budget",
    subs: ["Billing dispute", "Late fee waiver", "Common charge / maintenance", "Special assessment", "Vendor invoice", "Invoice anomaly", "Budget variance", "Reserve fund", "Refund / credit", "Collections / arrears", "Payment plan", "Bank reconciliation", "Tax abatement (J-51 / 421a)", "Insurance claim payout"],
  },
  {
    key: "legal", label: "Legal / Governance", icon: "scale", color: "#a855f7", type: "Board request",
    blurb: "Board, bylaws & approvals",
    subs: ["Board request", "Bylaw / rule amendment", "House rules", "Alteration agreement", "Sublet / lease approval", "Purchase application", "Right of first refusal", "Litigation / claim", "Contract review", "Counsel referral", "Meeting / minutes", "Election / voting"],
  },
  {
    key: "documents", label: "Documents", icon: "folder", color: "#38bdf8", type: "Documents",
    blurb: "Insurance, leases & records",
    subs: ["Insurance — Master policy", "Insurance — COI request", "Insurance — Renewal", "Insurance — Claim docs", "Proprietary lease", "Deed / title", "Board resolution", "Certificate", "Vendor contract", "Warranty", "Floor plans", "Closing documents"],
  },
  {
    key: "resident", label: "Resident Services", icon: "concierge-bell", color: "#ec4899", type: "Facility",
    blurb: "Concierge & resident requests",
    subs: ["Package / delivery", "Amenity booking", "Noise complaint", "Neighbor dispute", "Pet issue", "Smoking complaint", "Alteration request", "Key / fob request", "Storage / bike assignment", "Guest / visitor", "General question"],
  },
  {
    key: "security", label: "Security & Access", icon: "shield", color: "#64748b", type: "Facility",
    blurb: "Cameras, access & incidents",
    subs: ["Camera / CCTV", "Intercom / buzzer", "Key / fob / access control", "Door / gate", "Suspicious activity", "Break-in / theft", "Vandalism", "Alarm", "Lost & found"],
  },
  {
    key: "emergency", label: "Emergency", icon: "siren", color: "#ef4444", type: "Maintenance",
    blurb: "Life-safety & active damage",
    subs: ["Fire / smoke", "Flood / water intrusion", "Gas leak / odor", "Elevator entrapment", "Power outage", "No heat (winter)", "No hot water", "Structural", "Carbon monoxide", "Sewage backup", "Storm / weather"],
  },
  {
    key: "sanitation", label: "Cleaning & Sanitation", icon: "trash-2", color: "#14b8a6", type: "Facility",
    blurb: "Trash, pest & janitorial",
    subs: ["Trash / recycling", "Compactor / chute", "Common-area cleaning", "Spill / biohazard", "Graffiti", "Snow / ice removal", "Pest / extermination", "Power washing"],
  },
  {
    key: "grounds", label: "Grounds", icon: "trees", color: "#84cc16", type: "Facility",
    blurb: "Landscaping & exterior",
    subs: ["Lawn / garden", "Trees / pruning", "Irrigation", "Planters", "Hardscape", "Seasonal / holiday", "Pest (grounds)"],
  },
  {
    key: "capital", label: "Capital Projects", icon: "hard-hat", color: "#fb923c", type: "Facility",
    blurb: "Renovations & big-ticket work",
    subs: ["Roof replacement", "Facade / pointing", "Lobby renovation", "Elevator modernization", "Boiler replacement", "Window replacement", "Common-area upgrade", "Energy retrofit (LL97)", "Waterproofing"],
  },
  {
    key: "procurement", label: "Procurement / Vendor", icon: "handshake", color: "#eab308", type: "Facility",
    blurb: "Sourcing & vendor management",
    subs: ["New vendor onboarding", "COI collection", "Bid / RFP", "Contract renewal", "Service scheduling", "Vendor issue / dispute", "Rate review"],
  },
  {
    key: "moves", label: "Move-in / Move-out", icon: "truck", color: "#a78bfa", type: "Facility",
    blurb: "Moves & elevator reservations",
    subs: ["Move-in scheduling", "Move-out scheduling", "Elevator reservation", "Security deposit", "Walkthrough / inspection", "Mover COI"],
  },
];

export const categoryByKey = (key: string): Category | undefined => CATEGORIES.find((c) => c.key === key);

// ── where the problem lives ─────────────────────────────────────────────
export const LOCATION_KINDS: { key: string; label: string; icon: string }[] = [
  { key: "unit", label: "Inside a unit", icon: "door-closed" },
  { key: "common", label: "Common area", icon: "building" },
  { key: "system", label: "Building system", icon: "settings-2" },
  { key: "exterior", label: "Exterior / grounds", icon: "trees" },
  { key: "building", label: "Building-wide", icon: "building-2" },
];

export const COMMON_AREAS = [
  "Lobby", "Hallway / corridor", "Stairwell A", "Stairwell B", "Elevator 1", "Elevator 2",
  "Laundry room", "Gym / fitness", "Roof deck", "Garage / parking", "Bike room",
  "Package / mail room", "Courtyard / garden", "Pool", "Resident lounge",
  "Trash / compactor room", "Mechanical / boiler room", "Basement / cellar",
  "Exterior / facade", "Sidewalk", "Rooftop",
];

export const SYSTEM_OPTIONS = [
  "Boiler / heating plant", "Elevator bank", "Fire alarm panel", "Sprinkler / standpipe",
  "Standby generator", "Switchgear", "Booster pump", "Sump pump", "Cooling tower",
  "Gas service", "Intercom / access", "CCTV", "Roof & envelope", "Backflow preventer",
];

export const UNIT_LINES = ["A", "B", "C", "D", "E", "F", "G", "H", "R", "PH"];

// ── who & how ───────────────────────────────────────────────────────────
export const SUBMITTER_ROLES = [
  "Resident", "Board member", "Super / resident manager", "Building staff",
  "Property manager", "Vendor", "Field ops", "Guest", "Anonymous",
];
export const INTAKE_CHANNELS = [
  "Resident portal", "Mobile app", "Phone", "Email", "SMS", "Walk-in", "Super / staff", "Field ops", "AI engine",
];
export const CONTACT_PREFS = ["SMS", "Email", "Phone", "In-app"];

// ── operational tags & billing ──────────────────────────────────────────
export const SUGGESTED_TAGS = [
  "Recurring", "Warranty", "After-hours", "Billable", "Insurance claim", "Urgent",
  "Follow-up", "Vendor required", "Board attention", "Resident-facing", "Preventive", "Seasonal",
];
export const BILLABLE_TO = [
  "Building — operating", "Building — reserve", "Resident / unit", "Board", "Vendor (warranty)", "Insurance", "Sponsor",
];

// ── attachments ─────────────────────────────────────────────────────────
export const ATTACH_KINDS: { key: "photo" | "video" | "doc"; label: string; icon: string }[] = [
  { key: "photo", label: "Photo", icon: "image" },
  { key: "video", label: "Video", icon: "video" },
  { key: "doc", label: "Document", icon: "file-text" },
];
