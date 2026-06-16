// operatingSpine.ts — the production contract for turning Orbit from a great
// prototype into a durable property-management operating system.
//
// This file is intentionally backend-agnostic. These shapes can be implemented
// by Drizzle/tRPC today, exposed to agents tomorrow, and still map cleanly to
// events, permissions, reports, search, and audit.

export type OrgScale = "agency" | "portfolio" | "region" | "building" | "unit";

export type OperatingEntity =
  | "organization"
  | "portfolio"
  | "region"
  | "building"
  | "unit"
  | "person"
  | "role"
  | "ticket"
  | "workOrder"
  | "invoice"
  | "payment"
  | "vendor"
  | "document"
  | "message"
  | "notice"
  | "siteVisit"
  | "buildingSystem"
  | "decision"
  | "auditEvent";

export type OperatingAction =
  | "read"
  | "create"
  | "update"
  | "assign"
  | "approve"
  | "dispatch"
  | "message"
  | "upload"
  | "pay"
  | "close"
  | "admin";

export type OperatingAgent =
  | "intake"
  | "triage"
  | "dispatch"
  | "compliance"
  | "finance"
  | "vendorMatch"
  | "handoff"
  | "buildingMemory"
  | "sales";

export interface OperatingScope {
  organizationId: string;
  portfolioId?: string;
  regionId?: string;
  buildingId?: string;
  unitId?: string;
}

export interface PermissionRule {
  id: string;
  role: string;
  entity: OperatingEntity;
  actions: OperatingAction[];
  scope: OrgScale;
  condition?: string;
  reason: string;
}

export interface WorkEvent {
  id: string;
  at: string;
  actorId: string;
  actorType: "human" | "agent" | "system" | "integration";
  entity: OperatingEntity;
  entityId: string;
  action: OperatingAction;
  scope: OperatingScope;
  summary: string;
  diff?: Record<string, { before: unknown; after: unknown }>;
  source?: { system: string; externalId?: string };
  requiresAttention?: boolean;
}

export interface WorkflowStep {
  id: string;
  label: string;
  ownerRole: string;
  requiredEvidence?: string[];
  automations?: OperatingAgent[];
  exitCriteria: string[];
  slaHours?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  appliesTo: string;
  trigger: string;
  steps: WorkflowStep[];
  closeout: string[];
}

export interface OperatingModule {
  id: string;
  label: string;
  purpose: string;
  entities: OperatingEntity[];
  mustHave: string[];
  scaleNote: string;
}

export const PRODUCTION_MODULES: OperatingModule[] = [
  {
    id: "identity-access",
    label: "Identity, Roles & Access",
    purpose: "Owner-controlled permissions across staff, board, residents, vendors and supers.",
    entities: ["organization", "person", "role", "building", "unit", "auditEvent"],
    mustHave: ["SSO/session auth", "role templates", "building/unit scoping", "impersonation audit", "permission simulator"],
    scaleNote: "At 4000 buildings, permissions must be evaluated by scope, not by hand-maintained page lists.",
  },
  {
    id: "event-spine",
    label: "Event & Audit Spine",
    purpose: "Every important action becomes a durable event that powers history, notifications, reports and agents.",
    entities: ["auditEvent", "ticket", "message", "invoice", "workOrder", "siteVisit", "decision"],
    mustHave: ["append-only events", "field diffs", "actor/source", "idempotency keys", "retention policy"],
    scaleNote: "The event stream becomes the answer to: what changed since I last looked?",
  },
  {
    id: "workflow-engine",
    label: "Workflow & Playbook Engine",
    purpose: "Configurable workflows replace hardcoded ticket paths.",
    entities: ["ticket", "workOrder", "siteVisit", "notice", "document", "decision"],
    mustHave: ["workflow templates", "required evidence", "SLA policies", "approval gates", "closeout rules"],
    scaleNote: "The same leak workflow should run consistently across 50 or 4000 buildings.",
  },
  {
    id: "communications",
    label: "Communications Ledger",
    purpose: "Email, SMS, portal and internal notes become one permission-safe timeline.",
    entities: ["message", "ticket", "building", "person", "notice"],
    mustHave: ["Twilio/email sync", "delivery state", "read receipts", "internal/public separation", "templates"],
    scaleNote: "At scale, communications are the operating record, not a side channel.",
  },
  {
    id: "building-memory",
    label: "Building Memory",
    purpose: "Permanent operational record of systems, files, visits, shutoffs, vendors, issues and walkthroughs.",
    entities: ["building", "unit", "buildingSystem", "document", "siteVisit", "vendor", "ticket"],
    mustHave: ["equipment registry", "document storage", "photo/video upload", "site visit scheduling", "map/geospatial"],
    scaleNote: "This is what lets any employee pick up a building cold and still act intelligently.",
  },
  {
    id: "finance-controls",
    label: "Finance & Controls",
    purpose: "Tie work orders, invoices, approvals, payments, budgets and reports into one chain.",
    entities: ["invoice", "payment", "workOrder", "vendor", "building", "auditEvent"],
    mustHave: ["accounting sync", "approval matrix", "duplicate invoice detection", "budget variance", "AP aging"],
    scaleNote: "The system must catch money risk before it becomes an owner problem.",
  },
  {
    id: "agent-layer",
    label: "Human-Approved Agent Layer",
    purpose: "Agents recommend, draft, compare, summarize and detect patterns while humans decide.",
    entities: ["ticket", "message", "vendor", "document", "buildingSystem", "invoice"],
    mustHave: ["source citations", "confidence", "human approval", "agent audit", "no private-data training by default"],
    scaleNote: "Agents should reduce attention load, never create invisible automation risk.",
  },
];

export const CORE_PERMISSION_RULES: PermissionRule[] = [
  { id: "owner-all", role: "Owner", entity: "organization", actions: ["admin"], scope: "agency", reason: "Owner controls people, buildings, roles and system settings." },
  { id: "pm-building-work", role: "Property Manager", entity: "ticket", actions: ["read", "create", "update", "assign", "message", "close"], scope: "building", reason: "PMs run building work but only within assigned portfolio scope." },
  { id: "finance-money", role: "Finance", entity: "invoice", actions: ["read", "approve", "pay"], scope: "portfolio", condition: "approval_limit >= invoice.amount", reason: "Payment authority must follow a limit and audit trail." },
  { id: "board-public", role: "Board", entity: "ticket", actions: ["read", "approve", "message"], scope: "building", condition: "public_visibility = true", reason: "Board sees governance and public work, never internal notes." },
  { id: "resident-unit", role: "Resident", entity: "ticket", actions: ["read", "create", "message"], scope: "unit", condition: "ticket.unit_id = user.unit_id", reason: "Residents see their own requests and building notices only." },
  { id: "vendor-dispatch", role: "Vendor", entity: "workOrder", actions: ["read", "update", "upload", "message"], scope: "building", condition: "work_order.vendor_id = user.vendor_id", reason: "Vendors see only awarded/assigned work." },
  { id: "super-field", role: "Superintendent", entity: "ticket", actions: ["read", "create", "update", "upload"], scope: "building", condition: "ticket.requires_field_work = true", reason: "Supers handle physical building work, photos and field closeout." },
];

export const EMERGENCY_WORKFLOW: WorkflowDefinition = {
  id: "emergency-response",
  name: "Emergency Response",
  appliesTo: "Life safety, active water damage, elevator entrapment, no heat/hot water, fire/gas/security incident",
  trigger: "Critical intake or operator escalation",
  steps: [
    {
      id: "confirm",
      label: "Confirm severity and location",
      ownerRole: "Dispatcher",
      requiredEvidence: ["plain-language incident description", "building", "unit/common area", "contact"],
      automations: ["intake", "triage"],
      exitCriteria: ["severity confirmed", "responsible operator assigned"],
      slaHours: 0.25,
    },
    {
      id: "stabilize",
      label: "Stabilize and dispatch",
      ownerRole: "Field Lead",
      requiredEvidence: ["vendor/super contacted", "arrival ETA", "access path"],
      automations: ["dispatch", "buildingMemory"],
      exitCriteria: ["field responder en route", "board/resident communication drafted or sent"],
      slaHours: 1,
    },
    {
      id: "communicate",
      label: "Keep stakeholders updated",
      ownerRole: "Property Manager",
      requiredEvidence: ["public update", "internal timeline", "next ETA"],
      automations: ["handoff"],
      exitCriteria: ["affected parties notified", "next update time set"],
      slaHours: 2,
    },
    {
      id: "recover",
      label: "Recover, document and close",
      ownerRole: "Property Manager",
      requiredEvidence: ["photos", "vendor report", "invoice status", "resident/board confirmation"],
      automations: ["finance", "compliance"],
      exitCriteria: ["hazard resolved", "evidence filed", "closeout checklist complete"],
    },
  ],
  closeout: ["No active hazard", "Evidence attached", "Requester notified", "Invoice path known", "Audit timeline complete"],
};

export const PRODUCTION_SPINE_CODE = `// 1. Write every mutation as an event
await eventStore.append({
  actorId: session.user.id,
  actorType: "human",
  entity: "ticket",
  entityId: ticket.id,
  action: "assign",
  scope: { organizationId, portfolioId, buildingId },
  summary: "Assigned elevator outage to field lead",
  diff: { assigneeId: { before: null, after: "u_diego" } },
});

// 2. Derive attention from state + events, not from a dashboard widget
const attention = await attentionEngine.compute({ buildingId, ticketId });

// 3. Let agents recommend; require human approval for external action
const draft = await agents.dispatch.recommendVendor(ticket);
await approvals.requireHuman({ draft, action: "dispatch", entityId: ticket.id });`;

