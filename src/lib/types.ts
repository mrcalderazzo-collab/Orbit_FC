// Orbit FC — domain model (spec §07). These types are the contract between
// the seed/mock data layer and the UI, and the shape the future tRPC/Drizzle
// backend will return. Keep them backend-agnostic.

export type Persona = "operator" | "board" | "resident" | "vendor" | "super";

export type TicketType =
  | "Maintenance"
  | "Facility"
  | "Finance"
  | "Documents"
  | "Board request";

export type Priority = "Critical" | "High" | "Normal" | "Low";

export type TicketStatus =
  | "Open"
  | "Assigned"
  | "In progress"
  | "Awaiting review"
  | "Closed";

export type StageKey =
  | "intake"
  | "triage"
  | "sourcing"
  | "vote"
  | "scheduled"
  | "inprogress"
  | "review"
  | "closed";

export type ComplianceState = "ok" | "review" | "alert";

export interface Person {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  email: string;
  phone: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  address: string;
  type: "Condo" | "Co-op" | "HOA";
  plan: "Pro" | "Lite";
  status: string;
  units: number;
  am: string; // person id of assigned account manager
  mono: string; // per-building accent
  reserve: number;
  operating: number;
  delinquency: number;
  openTickets: number;
  docs: number;
  compliance: ComplianceState;
  monthlyIncome: number;
  monthlyExpense: number;
}

export type BuildingSystemState = "healthy" | "watch" | "risk" | "offline";

export interface BuildingSystem {
  id: string;
  buildingId: string;
  name: string;
  kind: string;
  location: string;
  vendor: string;
  state: BuildingSystemState;
  health: number;
  lastService: string;
  nextService: string;
  openTicketId?: string;
  signal: string;
}

export interface BuildingRecord {
  id: string;
  buildingId: string;
  kind: "Insurance" | "Inspection" | "Contract" | "Financial" | "Governance";
  title: string;
  status: "Current" | "Due soon" | "Needs review";
  due: string;
  owner: string;
}

export type SiteVisitPurpose = "Vendor walk" | "Super meeting" | "Building walkthrough" | "Inspection" | "Emergency follow-up";

export interface BuildingFile {
  id: string;
  buildingId: string;
  name: string;
  kind: "Floor plan" | "Photo set" | "Video" | "Report" | "Manual" | "Access";
  area: string;
  updatedAt: string;
  updatedBy: string;
  size: string;
  relatedTicketId?: string;
}

export interface SiteVisit {
  id: string;
  buildingId: string;
  purpose: SiteVisitPurpose;
  title: string;
  status: "Scheduled" | "Completed" | "Needs follow-up";
  startsAt: string;
  lead: string;
  attendees: string[];
  areas: string[];
  agenda: string[];
  notes?: string;
  fileIds: string[];
  relatedTicketId?: string;
}

export interface BuildingChange {
  id: string;
  buildingId: string;
  title: string;
  area: string;
  changedAt: string;
  changedBy: string;
  detail: string;
  fileIds: string[];
  relatedTicketId?: string;
}

export interface TourHotspot {
  id: string;
  label: string;
  kind: "equipment" | "issue" | "access" | "document";
  x: number;
  y: number;
  detail: string;
  relatedTicketId?: string;
  fileId?: string;
}

export interface BuildingTourArea {
  id: string;
  buildingId: string;
  floor: string;
  name: string;
  description: string;
  viewpoint: string;
  accent: string;
  image?: string;
  hotspots: TourHotspot[];
}

export type LogEntry = [at: string, actor: string, text: string];

// ── rich intake capture (from the New Intake flow) ──────────────────────
export interface TicketAttachment {
  id: string;
  kind: "photo" | "video" | "doc";
  name: string;
  size?: string;
  caption?: string;
}
export interface TicketLocation {
  kind: "unit" | "common" | "system" | "exterior" | "building";
  label: string;
  unit?: string;
  floor?: string;
  line?: string;
  area?: string;
  systemKey?: string;
  detail?: string;
}
export interface TicketSubmitter {
  role: string;
  name: string;
  unit?: string;
  phone?: string;
  email?: string;
  channel: string;
  preferredContact?: string;
  onBehalfOf?: string;
}
export interface TicketAccess {
  keyOnFile: boolean;
  permissionToEnter: boolean;
  petOnSite: boolean;
  occupantPresent: boolean;
  window?: string;
}
export interface TicketBilling {
  billableTo?: string;
  budgetLine?: string;
  estimate?: number;
  warranty?: boolean;
}
export interface TicketIntakeDetail {
  category: string; // taxonomy category key
  subcategory?: string;
  location?: TicketLocation;
  submitter?: TicketSubmitter;
  access?: TicketAccess;
  attachments?: TicketAttachment[];
  tags?: string[];
  billing?: TicketBilling;
  reportedAt?: string;
}

export interface Ticket {
  id: string;
  title: string;
  building: string;
  type: TicketType;
  prio: Priority;
  status: TicketStatus;
  assignee: string | null;
  requester: string;
  created: string;
  desc: string;
  vendor?: string;
  verified: boolean;
  log: LogEntry[];
  /** internal marker linking a ticket to a resident user (impersonation scope) */
  _residentOwner?: string;
  /** parent ticket id when this was spawned as a subtask/child */
  parentId?: string | null;
  /** related (non-hierarchical) ticket ids */
  linkedIds?: string[];
  /** when merged as a duplicate, the canonical ticket id this folded into */
  mergedInto?: string | null;
  /** taxonomy category key (richer than `type`); top-level for quick filter */
  category?: string;
  /** operational tags (Recurring, Warranty, After-hours, …) */
  tags?: string[];
  /** full captured intake from the New Intake flow */
  intake?: TicketIntakeDetail;
  /** operator's personal "do date" (when they plan to work it) — ClickUp-style,
   *  distinct from the SLA / predicted-completion. ISO date or null. */
  workDate?: string | null;
}

export interface Bid {
  id: string;
  vendor: string;
  amount: number;
  leadTimeDays: number;
  warrantyMo: number;
  grade: number;
  scope: string;
  note: string;
  recommended?: boolean;
}

export interface Ballot {
  name: string;
  choice: string | null; // bid id
  rationale: string | null;
  at: string | null;
}

export interface Vote {
  deadline: string;
  quorum: number;
  board: Ballot[];
}

export interface VendorCoordination {
  name: string;
  residentOk: boolean;
  vendorOk: boolean;
  window: string;
}

export interface RequesterUpdate {
  stage: StageKey;
  current: boolean;
  text: string;
  eta: string;
  ts: string;
}

export interface IntakeRecord {
  submitter: string;
  submitterName: string;
  channel: string;
  unit: string | null;
  contact: { phone: string; email: string };
  access: string;
  keyOnFile: boolean;
  petOnSite: boolean;
  media: Array<[kind: "photo" | "video" | "pdf", label: string]>;
  reportedAt: string;
}

export interface SLA {
  hrs: number;
  elapsed: number;
  breached: boolean;
  pct: number;
}

/** The deep, deterministic lifecycle record derived from a Ticket. */
export interface TicketFlow {
  stage: StageKey;
  stageIndex: number;
  estimate: number;
  threshold: number;
  requiresVote: boolean;
  intake: IntakeRecord;
  sla: SLA;
  bids: Bid[];
  awardedBidId: string | null;
  awarded: Bid | null;
  vote: Vote | null;
  vendor: VendorCoordination | null;
  updates: RequesterUpdate[];
}

export interface AiRec {
  id: string;
  kind: string;
  building: string;
  confidence: number;
  status: "pending" | "approved" | "rejected";
  agent: string;
  rec: string;
  reason: string;
  input: string;
  source?: "claude" | "heuristic";
  model?: string;
  ticketId?: string;
}

export interface Emergency {
  id: string;
  title: string;
  building: string;
  type: string;
  sev: "critical" | "high" | "watch";
  status: "potential" | "active" | "resolved";
  onBehalf: string;
  channel: string;
  nextStep: string;
  nextDue: string | null;
  overdue: boolean;
  created: string;
  linkedTicket: string | null;
  log: Array<[at: string, text: string, actor: string]>;
}

// ── Communications (unified surface) ────────────────────────────────────
export type CommChannel = "SMS" | "Email";
export type CommAudience = "Resident" | "Board" | "Both";

export interface TicketComment {
  id: string;
  by: string; // person id
  text: string;
  mentions: string[];
  at: string;
}

export interface TicketMessage {
  id: string;
  dir: "in" | "out";
  audience?: CommAudience;
  channels?: CommChannel[];
  text: string;
  at: string;
  by?: string; // operator person id (outbound)
  from?: string; // sender label (inbound)
  auto?: boolean;
}

export type SubStatus = "todo" | "doing" | "done";
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  status?: SubStatus;
  assignee?: string | null;
  note?: string;
  /** set when the subtask has been promoted into its own child ticket */
  linkedTicketId?: string | null;
}

// ── Live chat (Communications) ──────────────────────────────────────────
export type ChannelKind = "resident" | "board" | "boardDirect" | "team" | "vendor" | "advisory";
export type CommVia = "SMS" | "Email" | "In-app";

export interface Participant {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  kind: "operator" | "resident" | "board" | "vendor" | "ai";
}

export interface Channel {
  id: string;
  kind: ChannelKind;
  buildingId: string;
  ticketId?: string;
  title: string;
  subtitle: string;
  participants: Participant[];
  defaultVia: CommVia;
  vias: CommVia[];
  /** advisory "direct line" channels: which Orbit position the board reached */
  routedTo?: { position: string; positionKey: string; personId: string; personName: string };
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string; // participant id ("me" for the acting operator)
  via: CommVia;
  text: string;
  at: string;
  toAll?: boolean; // @board broadcast
}

// ── Identity ────────────────────────────────────────────────────────────
export interface OrbitUser {
  id: string;
  persona: Persona;
  who?: string; // operator → person id
  title?: string;
  email: string;
  scope: string;
  home?: string;
  perms?: string[];
  building?: string;
  /** for personas assigned to more than one building (e.g. a super covering a
   *  cluster). Defaults to [building] when unset. */
  buildings?: string[];
  unit?: string;
  company?: string;
  person?: Pick<Person, "name" | "initials" | "color" | "role">;
}

// Organization administration
export interface Department {
  id: string;
  name: string;
  lead: string;
  color: string;
  mandate: string;
}

export interface OrgMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  title: string;
  departmentId: string;
  status: "Active" | "Invited" | "Suspended";
  access: string[];
  buildingIds: string[];
  lastActive: string;
  color: string;
}

export interface OrgAuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}

export type UiDirection = "Command" | "Editorial" | "Spatial";

// Sales and marketing
export type CrmStage = "Lead" | "Qualified" | "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost";

export interface CrmOpportunity {
  id: string;
  account: string;
  contact: string;
  email: string;
  stage: CrmStage;
  value: number;
  probability: number;
  source: string;
  owner: string;
  nextAction: string;
  nextAt: string;
  lastTouch: string;
  properties: number;
  units: number;
  tags: string[];
}

export interface CrmActivity {
  id: string;
  opportunityId: string;
  type: "Email" | "Call" | "Meeting" | "Note";
  text: string;
  at: string;
  by: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: string;
  status: "Draft" | "Live" | "Complete";
  audience: number;
  spend: number;
  leads: number;
  meetings: number;
  pipeline: number;
}
