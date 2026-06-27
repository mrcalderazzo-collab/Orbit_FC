// OrbitProvider — global app state via React context. Mirrors the prototype's
// store.jsx: auth/session, tickets, AI recs, per-ticket comments/messages/
// progress, the shared ballot store (board votes appear live in operator
// Ticket Command), theme, and toasts. The action surface is the seam the
// future tRPC client will implement.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AiRec,
  Building,
  BuildingSystem,
  Channel,
  ChatMessage,
  ChecklistItem,
  CommAudience,
  CommChannel,
  CommVia,
  CrmActivity,
  CrmOpportunity,
  Department,
  Emergency,
  MarketingCampaign,
  OrgAuditEvent,
  OrgMember,
  OrbitUser,
  Ticket,
  TicketComment,
  TicketMessage,
  UiDirection,
} from "@/lib/types";
import { stamp } from "@/lib/format";
import { addDaysISO, todayISO } from "@/lib/focus";
import { AI_RECS, BUILDINGS, PEOPLE, TICKETS, buildingById } from "@/data/seed";
import { CRM_ACTIVITIES, CRM_OPPORTUNITIES, MARKETING_CAMPAIGNS } from "@/data/crm";
import { DEPARTMENTS, ORG_AUDIT, ORG_MEMBERS } from "@/data/organization";
import { ticketFlow } from "@/data/flow";
import { deriveWorkOrder, seedWorkOrders, type Invoice, type WorkOrder, type WoStageKey } from "@/data/workorders";
import { WO_STAGES } from "@/data/workorders";
import { SEED_NOTICES, type Notice } from "@/data/notices";
import { userById, userName, appUserToOrbit } from "@/data/identity";
import { autoRoute, teamByKey, escalateDeadline } from "@/data/routing";
import { isSupabaseConfigured } from "@/lib/supabase";
import { currentAppUser, onAuthChange, signIn as sbSignIn, signUp as sbSignUp, signOut as sbSignOut } from "@/lib/auth";
import { SEED_EMERGENCIES, nextStepId, stepLabel } from "@/data/emergencies";
import { appendLedger, genesisLedger, type LedgerEntry, type LedgerAction } from "@/lib/ledger";

// a few do-dates so the Focus board has content on first load
const SEED_WORK_DATES: Record<string, string> = {
  "T-4801": todayISO(), "T-4795": todayISO(), "T-4779": addDaysISO(1), "T-4790": addDaysISO(2),
};

// a few building-calendar entries so the super's calendar isn't empty
const SEED_CALENDAR: BuildingEvent[] = [
  { id: "cal1", buildingId: "b2", title: "Boiler vendor — annual PM", kind: "Vendor visit", at: addDaysISO(1) + "T09:00", by: "Joel Petrov", source: "super", note: "Northeast Mechanical, cellar — escort required." },
  { id: "cal2", buildingId: "b2", title: "Move-out — Unit 14C", kind: "Move-out", at: addDaysISO(2) + "T12:00", by: "Joel Petrov", source: "super", note: "Reserve service elevator 12–4." },
  { id: "cal3", buildingId: "b2", title: "FDNY sprinkler inspection", kind: "Inspection", at: addDaysISO(5) + "T10:00", by: "Priya Anand", source: "office" },
  { id: "cal4", buildingId: "b3", title: "Roof drain clearing before storm", kind: "Maintenance", at: addDaysISO(1) + "T08:00", by: "Tony Calabrese", source: "super", ticketId: "T-4779" },
];

// a few systems start with real vendor history so the hash-chained ledger shows
// a multi-block timeline out of the box (who served, when they left, who replaced
// them). Keyed by system id ("{buildingId}-sys-{n}"); the last block's vendor
// matches each system's current vendor of record so "current" lines up.
const ledgerISO = (days: number) => new Date(addDaysISO(days) + "T09:00:00").toISOString();
const chainOf = (steps: Array<{ vendor: string; action: LedgerAction; at: string; by: string; reason?: string }>): LedgerEntry[] =>
  steps.reduce<LedgerEntry[]>((chain, s) => appendLedger(chain, s), []);

const SEED_VENDOR_LEDGERS: Record<string, LedgerEntry[]> = {
  // b2 · Elevator bank → Otis (current)
  "b2-sys-1": chainOf([
    { vendor: "Apex Vertical Transport", action: "assigned", at: ledgerISO(-760), by: "System of record", reason: "Vendor of record at building onboarding" },
    { vendor: "Otis Elevator", action: "replaced", at: ledgerISO(-242), by: "Dana Whitfield", reason: "Apex COI lapsed; board approved switch to Otis after repeat Car B faults" },
  ]),
  // b4 · Heating plant → Cambridge & Leach (current), via Northeast Mechanical
  "b4-sys-1": chainOf([
    { vendor: "Boiler Pros NYC", action: "assigned", at: ledgerISO(-1010), by: "System of record", reason: "Vendor of record at building onboarding" },
    { vendor: "Northeast Mechanical", action: "replaced", at: ledgerISO(-430), by: "Marcus Reyes", reason: "Consolidated all HVAC under one contract" },
    { vendor: "Cambridge & Leach", action: "replaced", at: ledgerISO(-150), by: "Sarah Chen", reason: "Moved cast-iron heating plant to a boiler specialist" },
  ]),
  // b2 · Cooling towers → Northeast Mechanical (current)
  "b2-sys-4": chainOf([
    { vendor: "ChillTech Cooling", action: "assigned", at: ledgerISO(-690), by: "System of record", reason: "Vendor of record at building onboarding" },
    { vendor: "Northeast Mechanical", action: "replaced", at: ledgerISO(-300), by: "Marcus Reyes", reason: "Bundled cooling towers into the Northeast Mechanical service contract" },
  ]),
};

// a few vendor documents on record so the contract/COI shelf isn't empty
const SEED_VENDOR_DOCS: Record<string, VendorDoc[]> = {
  v_otis: [
    { id: "vd_otis_1", vendorId: "v_otis", name: "Otis master service agreement 2026.pdf", kind: "Contract", by: "Dana Whitfield", at: "Mar 3, 2026" },
    { id: "vd_otis_2", vendorId: "v_otis", name: "Otis certificate of insurance.pdf", kind: "COI / Insurance", by: "System of record", at: "Jan 12, 2026" },
    { id: "vd_otis_3", vendorId: "v_otis", name: "Otis W-9.pdf", kind: "W-9", by: "Accounts payable", at: "Jan 12, 2026" },
  ],
  v_nemech: [
    { id: "vd_ne_1", vendorId: "v_nemech", name: "Northeast Mechanical HVAC service contract.pdf", kind: "Contract", by: "Marcus Reyes", at: "Feb 1, 2026" },
    { id: "vd_ne_2", vendorId: "v_nemech", name: "Northeast Mechanical COI.pdf", kind: "COI / Insurance", by: "System of record", at: "Feb 1, 2026" },
  ],
};

// a couple of seeded vendor ratings so the scorecard leaderboard isn't empty
const SEED_RATINGS: Record<string, VendorRating[]> = {
  v_otis: [{ id: "vr_s1", vendorId: "v_otis", by: "Marcus Webb", at: "Jun 10", dims: { quality: 9, communication: 8, response: 9, pricing: 7, reliability: 9, professionalism: 9 }, note: "Fast on the elevator fault, clear comms.", building: "b2" }],
  v_nemech: [{ id: "vr_s2", vendorId: "v_nemech", by: "Diego Ramos", at: "Jun 8", dims: { quality: 8, communication: 9, response: 8, pricing: 8, reliability: 8, professionalism: 9 }, building: "b2" }],
  v_metroflow: [{ id: "vr_s3", vendorId: "v_metroflow", by: "Priya Anand", at: "Jun 5", dims: { quality: 6, communication: 5, response: 7, pricing: 8, reliability: 5, professionalism: 6 }, note: "Cheap but slow to follow up." }],
};

// a few notifications so the bell has live-looking history on first load
const SEED_NOTIFS: OrbitNotification[] = [
  { id: "nts1", at: "09:42", kind: "ticket", title: "Otis on-site at Vesper House", detail: "Diego logged progress on T-4801 — isolating the sensor board.", building: "b2", ref: { page: "tickets", id: "T-4801" }, read: false },
  { id: "nts2", at: "08:55", kind: "vote", title: "Board vote nearing quorum", detail: "The Ardsley · bylaw counsel item is one vote from quorum.", building: "b6", ref: { page: "tickets", id: "T-4782" }, read: false },
  { id: "nts3", at: "08:30", kind: "finance", title: "Invoice approved for payment", detail: "Northeast Mechanical · cooling-tower service.", building: "b2", read: true },
  { id: "nts4", at: "Yesterday", kind: "message", title: "New resident reply", detail: "Sutton Reach 3R replied on the intercom request.", building: "b5", ref: { page: "comms" }, read: true },
];

export type ThemeName = "dark" | "light" | "clear";
export type Route = { page: string; id: string | null };
export type Toast = { msg: string; kind: "ok" | "err"; t: number } | null;

/** payroll time-clock punch (super check-in / check-out) */
export interface Shift { id: string; userId: string; building: string; in: string; out: string | null }
/** a building calendar entry — super- or office-added; may link a ticket */
export interface BuildingEvent { id: string; buildingId: string; title: string; kind: string; at: string; by: string; source: "super" | "office"; note?: string; ticketId?: string }
/** a photo attached to a ticket from the field */
export interface TicketPhoto { id: string; url: string; caption: string; by: string; at: string }
/** a document filed against a building (and optionally a specific system/vendor):
 *  COIs, contracts, manuals, reports. The real document home until object storage
 *  lands behind the same action. */
export interface BuildingDoc { id: string; buildingId: string; name: string; kind: string; system?: string; vendor?: string; by: string; at: string; url?: string }
/** a document filed against a vendor itself — contract, COI, W-9, agreement.
 *  Lives at the vendor (not a building) so it follows the relationship. */
export interface VendorDoc { id: string; vendorId: string; name: string; kind: string; by: string; at: string; url?: string }
/** an append-only audit event. Every meaningful mutation emits one — the
 *  backend-ready spine for history, "what changed", and reporting. entityType +
 *  entityId tie it to a node in the portfolio graph (ticket / building / vendor…). */
export interface OrbitEvent { id: string; at: string; actor: string; kind: string; entityType: string; entityId: string; summary: string; building?: string }
/** a vendor performance rating across six dimensions (0–10 each) */
export interface VendorRating { id: string; vendorId: string; by: string; at: string; dims: Record<string, number>; note?: string; building?: string }
/** a real-time activity notification */
export type NotifKind = "ticket" | "vote" | "message" | "finance" | "calendar" | "system";
export interface OrbitNotification { id: string; at: string; kind: NotifKind; title: string; detail?: string; building?: string; ref?: { page?: string; id?: string }; read: boolean }

let _tid = 4802;
const nextTicketId = () => "T-" + _tid++;
let _eid = 205;
const nextEmergencyId = () => "EM-" + _eid++;

interface OrbitState {
  // routing + auth
  route: Route;
  nav: (page: string, id?: string | null) => void;
  currentUser: OrbitUser | null;
  role: string;
  login: (id: string) => void;
  /** real sign-in / sign-up via Supabase Auth (active when configured) */
  loginEmail: (email: string, password: string, mode: "signin" | "signup") => Promise<void>;
  /** true when a Supabase project is wired (env present) — drives the real login UI */
  backendLive: boolean;
  logout: () => void;
  // theme
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  // tickets
  tickets: Ticket[];
  createTicket: (data: Partial<Ticket> & Pick<Ticket, "title" | "building" | "type" | "prio" | "requester">) => string;
  assignTicket: (id: string, who: string) => void;
  setTicketStatus: (id: string, status: Ticket["status"]) => void;
  addTicketNote: (id: string, text: string) => void;
  updateTicket: (id: string, patch: Partial<Ticket>, note?: string) => void;
  /** set the operator's personal "do date" (ClickUp-style), or null to clear */
  setWorkDate: (id: string, date: string | null) => void;
  /** bump priority one level (SLA escalation) */
  escalateTicket: (id: string) => void;
  // ticket relationships
  spawnChildTicket: (parentId: string, data: { title: string; type?: Ticket["type"]; prio?: Ticket["prio"] }) => string;
  linkTickets: (aId: string, bId: string) => void;
  mergeTickets: (sourceId: string, targetId: string) => void;
  // front desk routing
  routeTicket: (id: string, team: string, note?: string) => void;
  holdForInfo: (id: string, reason: string) => void;
  releaseHold: (id: string) => void;
  // the open full-screen Ticket Command workspace (so any view can open one)
  commandId: string | null;
  openCommand: (id: string) => void;
  closeCommand: () => void;
  // communications
  ticketComments: Record<string, TicketComment[]>;
  seedComments: (tid: string, list: TicketComment[]) => void;
  addComment: (tid: string, text: string, mentions?: string[]) => void;
  ticketMessages: Record<string, TicketMessage[]>;
  seedMessages: (tid: string, list: TicketMessage[]) => void;
  sendTicketMessage: (tid: string, payload: { audience: CommAudience; channels: CommChannel[]; text: string }) => void;
  // progress
  ticketProgress: Record<string, { items: ChecklistItem[] }>;
  seedProgress: (tid: string, p: { items: ChecklistItem[] }) => void;
  setProgressItems: (tid: string, items: ChecklistItem[]) => void;
  postProgress: (tid: string, text: string, pct: number) => void;
  // ai
  recs: AiRec[];
  decideRec: (id: string, decision: "approved" | "rejected") => void;
  addRecs: (recs: AiRec[]) => void;
  // notices (building broadcasts)
  notices: Notice[];
  sendNotice: (n: Omit<Notice, "id" | "at"> & { at?: string }) => void;
  // owner console
  orgMembers: OrgMember[];
  departments: Department[];
  orgBuildings: Building[];
  orgAudit: OrgAuditEvent[];
  uiDirection: UiDirection;
  setUiDirection: (direction: UiDirection) => void;
  addOrgMember: (member: Omit<OrgMember, "id" | "lastActive">) => void;
  updateOrgMember: (id: string, patch: Partial<OrgMember>) => void;
  removeOrgMember: (id: string) => void;
  addOrgBuilding: (building: Building) => void;
  removeOrgBuilding: (id: string) => void;
  // sales and marketing
  opportunities: CrmOpportunity[];
  crmActivities: CrmActivity[];
  campaigns: MarketingCampaign[];
  addOpportunity: (opportunity: Omit<CrmOpportunity, "id" | "lastTouch">) => void;
  updateOpportunity: (id: string, patch: Partial<CrmOpportunity>) => void;
  addCrmActivity: (activity: Omit<CrmActivity, "id">) => void;
  // shared ballots
  ballots: Record<string, Record<string, string>>;
  castBallot: (ticketId: string, memberName: string, bidId: string) => void;
  // payroll time-clock (super check-in / check-out)
  shifts: Shift[];
  activeShift: (userId: string) => Shift | null;
  punchIn: (building: string) => void;
  punchOut: () => void;
  // building calendar (super- / office-added events)
  calendar: BuildingEvent[];
  addCalendarEvent: (e: Omit<BuildingEvent, "id" | "by" | "source"> & { by?: string; source?: BuildingEvent["source"] }) => void;
  // field photos on a ticket
  ticketPhotos: Record<string, TicketPhoto[]>;
  addTicketPhoto: (ticketId: string, caption: string) => void;
  // building documents (COIs, contracts, manuals…) keyed by building id
  buildingDocs: Record<string, BuildingDoc[]>;
  addBuildingDoc: (buildingId: string, doc: { name: string; kind: string; system?: string; vendor?: string }) => void;
  // vendor scorecard ratings
  vendorRatings: Record<string, VendorRating[]>;
  rateVendor: (vendorId: string, dims: Record<string, number>, note?: string, building?: string) => void;

  // per-system vendor of record (overrides the seed once reassigned) + the
  // tamper-evident history chain behind it
  systemVendors: Record<string, string>;
  vendorLedgers: Record<string, LedgerEntry[]>;
  reassignSystemVendor: (system: BuildingSystem, toVendor: string, reason: string) => void;

  // documents filed against a vendor (contract, COI, W-9, agreement)
  vendorDocs: Record<string, VendorDoc[]>;
  addVendorDoc: (vendorId: string, doc: { name: string; kind: string }) => void;
  removeVendorDoc: (vendorId: string, docId: string) => void;
  // emergency desk (runs on EMERGENCY_WORKFLOW)
  emergencies: Emergency[];
  declareEmergency: (data: { title: string; building: string; type: string; sev: Emergency["sev"]; onBehalf: string; channel: string; note?: string; spawnTicket?: boolean }) => string;
  advanceEmergency: (id: string, note?: string) => void;
  logEmergency: (id: string, text: string) => void;
  resolveEmergency: (id: string, note?: string) => void;
  // append-only audit event log (the production spine)
  events: OrbitEvent[];
  logEvent: (e: { kind: string; entityType: string; entityId: string; summary: string; building?: string }) => void;
  eventsFor: (entityType: string, entityId: string) => OrbitEvent[];
  // real-time notifications
  notifications: OrbitNotification[];
  pushNotification: (n: Omit<OrbitNotification, "id" | "at" | "read"> & { at?: string }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  // work orders (vendor ↔ ticket ↔ invoice ↔ payment)
  workOrders: Record<string, WorkOrder>;
  ensureWorkOrder: (t: Ticket) => void;
  setWoStage: (ticketId: string, stage: WoStageKey, note?: string) => void;
  recordInvoice: (ticketId: string, inv: { number: string; amount: number; dueDate: string }) => void;
  setInvoiceStatus: (ticketId: string, status: Invoice["status"]) => void;
  addWoLog: (ticketId: string, text: string) => void;
  // live chat (Communications)
  chat: Record<string, ChatMessage[]>;
  seedChat: (channelId: string, msgs: ChatMessage[]) => void;
  sendChat: (channel: Channel, payload: { via: CommVia; text: string; toAll?: boolean }) => void;
  // user-composed conversations (new threads to any recipients)
  customChannels: Channel[];
  createChannel: (channel: Channel, first?: { via: CommVia; text: string }) => void;
  // integrations hub (connected connector ids)
  integrations: string[];
  toggleIntegration: (id: string, label: string) => void;
  // toast
  toast: Toast;
  notify: (msg: string, kind?: "ok" | "err") => void;
}

const OrbitCtx = createContext<OrbitState | null>(null);

export function useOrbit(): OrbitState {
  const ctx = useContext(OrbitCtx);
  if (!ctx) throw new Error("useOrbit must be used within OrbitProvider");
  return ctx;
}

export function OrbitProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ page: "dashboard", id: null });
  const [userId, setUserId] = useState<string | null>(() => {
    try { return localStorage.getItem("orbit_user"); } catch { return null; }
  });
  const [theme, setThemeState] = useState<ThemeName>(() => {
    try { return (localStorage.getItem("orbit_theme") as ThemeName) || "dark"; } catch { return "dark"; }
  });
  const [tickets, setTickets] = useState<Ticket[]>(() => TICKETS.map((t) => ({ ...t, workDate: SEED_WORK_DATES[t.id] ?? null })));
  const [recs, setRecs] = useState<AiRec[]>(() => AI_RECS.map((r) => ({ ...r })));
  const [notices, setNotices] = useState<Notice[]>(() => SEED_NOTICES.map((n) => ({ ...n })));
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>(() => ORG_MEMBERS.map((m) => ({ ...m, access: [...m.access], buildingIds: [...m.buildingIds] })));
  const [orgBuildings, setOrgBuildings] = useState<Building[]>(() => BUILDINGS.map((b) => ({ ...b })));
  const [orgAudit, setOrgAudit] = useState<OrgAuditEvent[]>(() => ORG_AUDIT.map((e) => ({ ...e })));
  const [uiDirection, setUiDirection] = useState<UiDirection>("Command");
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>(() => CRM_OPPORTUNITIES.map((o) => ({ ...o, tags: [...o.tags] })));
  const [crmActivities, setCrmActivities] = useState<CrmActivity[]>(() => CRM_ACTIVITIES.map((a) => ({ ...a })));
  const [campaigns] = useState<MarketingCampaign[]>(() => MARKETING_CAMPAIGNS.map((c) => ({ ...c })));
  const [ticketComments, setTicketComments] = useState<Record<string, TicketComment[]>>({});
  const [ticketMessages, setTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [ticketProgress, setTicketProgress] = useState<Record<string, { items: ChecklistItem[] }>>({});
  const [ballots, setBallots] = useState<Record<string, Record<string, string>>>({});
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [calendar, setCalendar] = useState<BuildingEvent[]>(() => SEED_CALENDAR.map((e) => ({ ...e })));
  const [ticketPhotos, setTicketPhotos] = useState<Record<string, TicketPhoto[]>>({});
  const [vendorRatings, setVendorRatings] = useState<Record<string, VendorRating[]>>(() => ({ ...SEED_RATINGS }));
  const [buildingDocs, setBuildingDocs] = useState<Record<string, BuildingDoc[]>>({});
  const [systemVendors, setSystemVendors] = useState<Record<string, string>>({});
  const [vendorLedgers, setVendorLedgers] = useState<Record<string, LedgerEntry[]>>(() => ({ ...SEED_VENDOR_LEDGERS }));
  const [vendorDocs, setVendorDocs] = useState<Record<string, VendorDoc[]>>(() => ({ ...SEED_VENDOR_DOCS }));
  const [emergencies, setEmergencies] = useState<Emergency[]>(() => SEED_EMERGENCIES.map((e) => ({ ...e, log: [...e.log] })));
  const [events, setEvents] = useState<OrbitEvent[]>([]);
  const eventsFor = useCallback((entityType: string, entityId: string) => events.filter((e) => e.entityType === entityType && e.entityId === entityId), [events]);
  const [notifications, setNotifications] = useState<OrbitNotification[]>(() => SEED_NOTIFS.map((n) => ({ ...n })));
  let _nid = 0;
  const pushNotification = useCallback<OrbitState["pushNotification"]>((n) => {
    setNotifications((ns) => [{ ...n, id: "nt" + Date.now() + (_nid++), at: n.at || stamp(), read: false }, ...ns].slice(0, 60));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const markNotificationRead = useCallback((id: string) => setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const markAllNotificationsRead = useCallback(() => setNotifications((ns) => ns.map((n) => ({ ...n, read: true }))), []);
  const [workOrders, setWorkOrders] = useState<Record<string, WorkOrder>>(() => seedWorkOrders(TICKETS, ticketFlow));
  const [chat, setChat] = useState<Record<string, ChatMessage[]>>({});
  const [customChannels, setCustomChannels] = useState<Channel[]>([]);
  const [integrations, setIntegrations] = useState<string[]>(() => ["gmail", "quickbooks"]);
  const [commandId, setCommandId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const openCommand = useCallback((id: string) => setCommandId(id), []);
  const closeCommand = useCallback(() => setCommandId(null), []);

  // a real Supabase session (when configured) takes precedence over the demo picker
  const [remoteUser, setRemoteUser] = useState<OrbitUser | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    currentAppUser().then((p) => { if (p) setRemoteUser(appUserToOrbit(p)); });
    return onAuthChange((p) => setRemoteUser(p ? appUserToOrbit(p) : null));
  }, []);

  const currentUser = remoteUser ?? userById(userId);
  const role = currentUser && currentUser.persona === "operator" ? "pm" : currentUser?.persona ?? "pm";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    try { localStorage.setItem("orbit_theme", t); } catch { /* ignore */ }
  }, []);

  const notify = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const t = Date.now();
    setToast({ msg, kind, t });
    setTimeout(() => setToast((cur) => (cur && Date.now() - cur.t >= 2400 ? null : cur)), 2500);
  }, []);

  const nav = useCallback((page: string, id: string | null = null) => setRoute({ page, id }), []);

  const login = useCallback((id: string) => {
    const u = userById(id);
    if (!u) return;
    try { localStorage.setItem("orbit_user", id); } catch { /* ignore */ }
    setUserId(id);
    setRoute({ page: u.persona === "operator" ? u.home || "dashboard" : "portal", id: null });
    notify("Signed in · " + userName(u));
  }, [notify]);

  const loginEmail = useCallback<OrbitState["loginEmail"]>(async (email, password, mode) => {
    const p = mode === "signup" ? await sbSignUp(email, password) : await sbSignIn(email, password);
    const u = appUserToOrbit(p);
    setRemoteUser(u);
    setRoute({ page: u.persona === "operator" ? u.home || "dashboard" : "portal", id: null });
    notify("Signed in · " + (u.person?.name ?? email));
  }, [notify]);

  const logout = useCallback(() => {
    try { localStorage.removeItem("orbit_user"); } catch { /* ignore */ }
    setUserId(null);
    setRemoteUser(null);
    if (isSupabaseConfigured) sbSignOut();
    setRoute({ page: "dashboard", id: null });
  }, []);

  const me = useCallback(() => (currentUser?.persona === "operator" ? currentUser.who! : "nick"), [currentUser]);
  const logLine = (actor: string, text: string): [string, string, string] => [stamp(), actor, text];

  const logEvent = useCallback<OrbitState["logEvent"]>((e) => {
    setEvents((evs) => [{ ...e, id: "ev" + Date.now() + Math.floor(Math.random() * 1000), at: new Date().toISOString(), actor: userName(currentUser) }, ...evs].slice(0, 500));
  }, [currentUser]);

  const createTicket = useCallback<OrbitState["createTicket"]>((data) => {
    const id = nextTicketId();
    const t: Ticket = {
      id,
      assignee: null,
      desc: "",
      status: "Open",
      verified: false,
      created: new Date().toISOString(),
      parentId: null,
      linkedIds: [],
      mergedInto: null,
      log: [logLine(me(), "Ticket created")],
      ...data,
    } as Ticket;
    const team = data.team ?? autoRoute(t).team;
    const routed: Ticket = { ...t, team, escalateAt: team === "super" ? escalateDeadline(Date.now()) : null };
    setTickets((ts) => [routed, ...ts]);
    notify(id + " created");
    pushNotification({ kind: "ticket", title: "New ticket · " + (data.title || id), detail: (buildingById(data.building)?.name ?? data.building) + " · from " + (data.requester || "intake"), building: data.building, ref: { page: "tickets", id } });
    logEvent({ kind: "ticket.created", entityType: "ticket", entityId: id, summary: "Created · " + (data.title || id), building: data.building });
    return id;
  }, [me, notify, pushNotification, logEvent]);

  // ── emergency desk (EMERGENCY_WORKFLOW) ──
  const declareEmergency = useCallback<OrbitState["declareEmergency"]>((data) => {
    const id = nextEmergencyId();
    const actor = userName(currentUser);
    const now = new Date().toISOString();
    let linkedTicket: string | null = null;
    if (data.spawnTicket) {
      linkedTicket = createTicket({ title: "[Emergency] " + data.title, building: data.building, type: "Facility", prio: "Critical", requester: data.onBehalf || "Emergency Desk", desc: data.note || ("Linked work ticket for emergency " + id + " · " + data.type) });
    }
    const em: Emergency = {
      id, title: data.title, building: data.building, type: data.type, sev: data.sev,
      status: "active", onBehalf: data.onBehalf, channel: data.channel,
      step: "confirm", nextStep: stepLabel("confirm"), nextDue: null, overdue: false,
      created: now, linkedTicket,
      log: [[now, "Incident declared · " + data.type + (data.note ? " — " + data.note : ""), actor]],
    };
    setEmergencies((es) => [em, ...es]);
    notify("Emergency declared · " + id, "err");
    pushNotification({ kind: "system", title: "Emergency declared · " + data.title, detail: (buildingById(data.building)?.name ?? data.building) + " · " + data.type, building: data.building, ref: { page: "emergencies" } });
    logEvent({ kind: "emergency.opened", entityType: "emergency", entityId: id, summary: "Declared · " + data.title + " (" + data.type + ")", building: data.building });
    return id;
  }, [currentUser, createTicket, notify, pushNotification, logEvent]);

  const advanceEmergency = useCallback<OrbitState["advanceEmergency"]>((id, note) => {
    const em = emergencies.find((e) => e.id === id);
    if (!em) return;
    const next = nextStepId(em.step);
    const actor = userName(currentUser);
    const now = new Date().toISOString();
    const resolved = !next;
    setEmergencies((es) => es.map((e) => e.id !== id ? e : (
      resolved
        ? { ...e, status: "resolved", nextStep: "Closed", nextDue: null, overdue: false, log: [...e.log, [now, note || "Recovery complete · incident resolved", actor]] }
        : { ...e, step: next!, nextStep: stepLabel(next!), overdue: false, log: [...e.log, [now, note || ("Advanced → " + stepLabel(next!)), actor]] }
    )));
    notify(resolved ? "Incident resolved" : "Advanced → " + stepLabel(next!), resolved ? "ok" : "ok");
    logEvent({ kind: resolved ? "emergency.resolved" : "emergency.step", entityType: "emergency", entityId: id, summary: (resolved ? "Resolved · " : stepLabel(next!) + " · ") + em.title, building: em.building });
    if (resolved) pushNotification({ kind: "system", title: "Emergency resolved · " + em.title, building: em.building, ref: { page: "emergencies" } });
  }, [emergencies, currentUser, notify, logEvent, pushNotification]);

  const resolveEmergency = useCallback<OrbitState["resolveEmergency"]>((id, note) => {
    const em = emergencies.find((e) => e.id === id);
    if (!em) return;
    const actor = userName(currentUser);
    const now = new Date().toISOString();
    setEmergencies((es) => es.map((e) => e.id === id ? { ...e, status: "resolved", step: "recover", nextStep: "Closed", nextDue: null, overdue: false, log: [...e.log, [now, note || "Marked resolved", actor]] } : e));
    notify("Incident resolved");
    logEvent({ kind: "emergency.resolved", entityType: "emergency", entityId: id, summary: "Resolved · " + em.title, building: em.building });
  }, [emergencies, currentUser, notify, logEvent]);

  const logEmergency = useCallback<OrbitState["logEmergency"]>((id, text) => {
    if (!text.trim()) return;
    const actor = userName(currentUser);
    setEmergencies((es) => es.map((e) => e.id === id ? { ...e, log: [...e.log, [new Date().toISOString(), text.trim(), actor]] } : e));
  }, [currentUser]);

  const routeTicket = useCallback<OrbitState["routeTicket"]>((id, team, note) => {
    const def = teamByKey(team);
    setTickets((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      const lead = def?.lead ?? null;
      return { ...t, team, held: null, escalateAt: team === "super" ? escalateDeadline(Date.now()) : null, assignee: lead ?? t.assignee, status: t.status === "Open" ? "Assigned" : t.status, log: [...t.log, logLine(me(), "Routed → " + (def?.label || team) + (note ? " · " + note : ""))] };
    }));
    notify("Routed to " + (def?.label || team));
    const tk = TICKETS.find((x) => x.id === id);
    pushNotification({ kind: "ticket", title: id + " → " + (def?.label || team), detail: tk?.title, building: tk?.building, ref: { page: "tickets", id } });
    logEvent({ kind: "ticket.routed", entityType: "ticket", entityId: id, summary: "Routed → " + (def?.label || team), building: tk?.building });
  }, [me, notify, pushNotification, logEvent]);

  const holdForInfo = useCallback<OrbitState["holdForInfo"]>((id, reason) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, held: { reason, at: new Date().toISOString() }, log: [...t.log, logLine(me(), "On hold for info · " + reason)] } : t));
    notify("Parked · SLA clock paused");
    logEvent({ kind: "ticket.hold", entityType: "ticket", entityId: id, summary: "On hold for info · " + reason });
  }, [me, notify, logEvent]);

  const releaseHold = useCallback<OrbitState["releaseHold"]>((id) => {
    setTickets((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      // bank the time this hold lasted so the SLA clock stays paused for it
      const startedMs = t.held?.at ? new Date(t.held.at).getTime() : NaN;
      const banked = Number.isNaN(startedMs) ? 0 : Math.max(0, Date.now() - startedMs);
      return { ...t, held: null, heldMs: (t.heldMs || 0) + banked, log: [...t.log, logLine(me(), "Info received · SLA clock resumed")] };
    }));
    notify("Hold released · SLA clock resumed");
    logEvent({ kind: "ticket.hold", entityType: "ticket", entityId: id, summary: "Hold released · clock resumed" });
  }, [me, notify, logEvent]);

  const assignTicket = useCallback((id: string, who: string) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, assignee: who, status: t.status === "Open" ? "Assigned" : t.status, log: [...t.log, logLine("nick", "Assigned to " + (PEOPLE[who]?.name || who))] } : t));
  }, []);

  const setTicketStatus = useCallback((id: string, status: Ticket["status"]) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, status, verified: status === "Closed" ? true : t.verified, log: [...t.log, logLine("nick", "Status → " + status)] } : t));
    const t = TICKETS.find((x) => x.id === id);
    pushNotification({ kind: "ticket", title: id + " → " + status, detail: t?.title, building: t?.building, ref: { page: "tickets", id } });
    logEvent({ kind: "ticket.status", entityType: "ticket", entityId: id, summary: "Status → " + status, building: t?.building });
  }, [pushNotification, logEvent]);

  const addTicketNote = useCallback((id: string, text: string) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, log: [...t.log, logLine(me(), text)] } : t));
  }, [me]);

  const updateTicket = useCallback<OrbitState["updateTicket"]>((id, patch, note) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, ...patch, log: note ? [...t.log, logLine(me(), note)] : t.log } : t));
  }, [me]);

  const setWorkDate = useCallback((id: string, date: string | null) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, workDate: date } : t));
  }, []);

  const escalateTicket = useCallback((id: string) => {
    const order: Ticket["prio"][] = ["Low", "Normal", "High", "Critical"];
    let bumped = false;
    setTickets((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      const next = order[Math.min(order.length - 1, order.indexOf(t.prio) + 1)];
      if (next === t.prio) return t;
      bumped = true;
      return { ...t, prio: next, log: [...t.log, logLine(me(), "Escalated · priority → " + next + " (SLA at risk)")] };
    }));
    notify(bumped ? "Escalated · owner notified" : "Already at Critical");
  }, [me, notify]);

  const seedComments = useCallback((tid: string, list: TicketComment[]) => {
    setTicketComments((s) => (s[tid] ? s : { ...s, [tid]: list }));
  }, []);
  const addComment = useCallback((tid: string, text: string, mentions: string[] = []) => {
    setTicketComments((s) => ({ ...s, [tid]: [...(s[tid] || []), { id: "c" + Date.now(), by: me(), text, mentions, at: stamp() }] }));
    logEvent({ kind: "ticket.comment", entityType: "ticket", entityId: tid, summary: "Internal note added" });
  }, [me, logEvent]);

  const seedMessages = useCallback((tid: string, list: TicketMessage[]) => {
    setTicketMessages((s) => (s[tid] ? s : { ...s, [tid]: list }));
  }, []);
  const sendTicketMessage = useCallback<OrbitState["sendTicketMessage"]>((tid, payload) => {
    const msg: TicketMessage = { id: "m" + Date.now(), dir: "out", by: me(), at: stamp(), ...payload };
    setTicketMessages((s) => ({ ...s, [tid]: [...(s[tid] || []), msg] }));
    setTickets((ts) => ts.map((t) => t.id === tid ? { ...t, log: [...t.log, logLine(me(), "Update → " + payload.audience + " · " + payload.channels.join(" + "))] } : t));
    notify("Sent to " + payload.audience + " · " + payload.channels.join(" + "));
    logEvent({ kind: "ticket.message", entityType: "ticket", entityId: tid, summary: "Message → " + payload.audience + " (" + payload.channels.join(" + ") + ")" });
  }, [me, notify, logEvent]);

  const seedProgress = useCallback((tid: string, p: { items: ChecklistItem[] }) => {
    setTicketProgress((s) => (s[tid] ? s : { ...s, [tid]: p }));
  }, []);
  const setProgressItems = useCallback((tid: string, items: ChecklistItem[]) => {
    setTicketProgress((s) => ({ ...s, [tid]: { ...(s[tid] || {}), items } }));
  }, []);
  const postProgress = useCallback((tid: string, text: string, pct: number) => {
    setTickets((ts) => ts.map((t) => t.id === tid ? { ...t, log: [...t.log, logLine(me(), "Progress " + pct + "% — " + text)] } : t));
    notify("Progress logged · " + pct + "%");
  }, [me, notify]);

  const decideRec = useCallback((id: string, decision: "approved" | "rejected") => {
    setRecs((rs) => rs.map((r) => r.id === id ? { ...r, status: decision } : r));
    notify("Recommendation " + decision + " · written to chain");
  }, [notify]);

  const addRecs = useCallback((incoming: AiRec[]) => {
    if (!incoming.length) return;
    setRecs((rs) => {
      const ids = new Set(rs.map((r) => r.id));
      const fresh = incoming.filter((r) => !ids.has(r.id));
      return [...fresh, ...rs];
    });
  }, []);

  const sendNotice = useCallback<OrbitState["sendNotice"]>((n) => {
    const at = n.at || (n.status === "Scheduled" ? "Scheduled" : new Date().toISOString().slice(0, 16).replace("T", " "));
    setNotices((ns) => [{ ...n, id: "n" + Date.now(), at }, ...ns]);
    notify(n.status === "Scheduled" ? "Notice scheduled · " + n.reach + " residents" : n.status === "Draft" ? "Draft saved" : "Notice sent to " + n.reach + " residents");
    if (n.status !== "Draft") {
      pushNotification({ kind: "message", title: (n.status === "Scheduled" ? "Notice scheduled · " : "Notice sent · ") + n.title, detail: n.audience + " · " + (n.channels || []).join(" + ") + " · ~" + n.reach, building: n.building === "all" ? undefined : n.building });
      logEvent({ kind: "notice.sent", entityType: "building", entityId: n.building, summary: (n.status === "Scheduled" ? "Notice scheduled · " : "Notice sent · ") + n.title + " → " + n.audience, building: n.building === "all" ? undefined : n.building });
    }
  }, [notify, pushNotification, logEvent]);

  const appendOrgAudit = useCallback((action: string, target: string) => {
    setOrgAudit((events) => [{
      id: "oa" + Date.now(),
      at: "Just now",
      actor: currentUser ? userName(currentUser) : "System",
      action,
      target,
    }, ...events]);
  }, [currentUser]);

  const addOrgMember = useCallback<OrbitState["addOrgMember"]>((member) => {
    setOrgMembers((members) => [{ ...member, id: "m" + Date.now(), lastActive: "Invitation pending" }, ...members]);
    appendOrgAudit("Invited organization member", member.name);
    notify(member.name + " invited");
  }, [appendOrgAudit, notify]);

  const updateOrgMember = useCallback<OrbitState["updateOrgMember"]>((id, patch) => {
    let target = "Team member";
    setOrgMembers((members) => members.map((member) => {
      if (member.id !== id) return member;
      target = member.name;
      return { ...member, ...patch };
    }));
    appendOrgAudit("Updated member access", target);
    notify("Access updated");
  }, [appendOrgAudit, notify]);

  const removeOrgMember = useCallback((id: string) => {
    let target = "Team member";
    setOrgMembers((members) => members.filter((member) => {
      if (member.id === id) target = member.name;
      return member.id !== id;
    }));
    appendOrgAudit("Removed organization member", target);
    notify(target + " removed");
  }, [appendOrgAudit, notify]);

  const addOrgBuilding = useCallback((building: Building) => {
    setOrgBuildings((buildings) => [building, ...buildings]);
    appendOrgAudit("Added building", building.name);
    notify(building.name + " added");
  }, [appendOrgAudit, notify]);

  const removeOrgBuilding = useCallback((id: string) => {
    let target = "Building";
    setOrgBuildings((buildings) => buildings.filter((building) => {
      if (building.id === id) target = building.name;
      return building.id !== id;
    }));
    appendOrgAudit("Removed building", target);
    notify(target + " removed");
  }, [appendOrgAudit, notify]);

  const addOpportunity = useCallback<OrbitState["addOpportunity"]>((opportunity) => {
    setOpportunities((items) => [{ ...opportunity, id: "opp-" + Date.now(), lastTouch: "New" }, ...items]);
    notify(opportunity.account + " added to pipeline");
  }, [notify]);

  const updateOpportunity = useCallback<OrbitState["updateOpportunity"]>((id, patch) => {
    setOpportunities((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    notify("Opportunity updated");
  }, [notify]);

  const addCrmActivity = useCallback<OrbitState["addCrmActivity"]>((activity) => {
    setCrmActivities((items) => [{ ...activity, id: "ca" + Date.now() }, ...items]);
    setOpportunities((items) => items.map((item) => item.id === activity.opportunityId ? { ...item, lastTouch: activity.at } : item));
    notify(activity.type + " logged");
  }, [notify]);

  const castBallot = useCallback((ticketId: string, memberName: string, bidId: string) => {
    setBallots((b) => ({ ...b, [ticketId]: { ...(b[ticketId] || {}), [memberName]: bidId } }));
    pushNotification({ kind: "vote", title: "Board vote cast", detail: memberName + " voted on " + ticketId, ref: { page: "tickets", id: ticketId } });
    logEvent({ kind: "vote.cast", entityType: "ticket", entityId: ticketId, summary: memberName + " cast a board vote" });
  }, [pushNotification, logEvent]);

  // ── payroll time-clock ──
  const activeShift = useCallback((uid: string) => shifts.find((s) => s.userId === uid && !s.out) || null, [shifts]);
  const punchIn = useCallback((building: string) => {
    const uid = currentUser?.id;
    if (!uid) return;
    setShifts((ss) => (ss.some((s) => s.userId === uid && !s.out) ? ss : [...ss, { id: "sh" + Date.now(), userId: uid, building, in: new Date().toISOString(), out: null }]));
    notify("Checked in · clock running");
  }, [currentUser, notify]);
  const punchOut = useCallback(() => {
    const uid = currentUser?.id;
    if (!uid) return;
    setShifts((ss) => ss.map((s) => (s.userId === uid && !s.out ? { ...s, out: new Date().toISOString() } : s)));
    notify("Checked out · shift logged");
  }, [currentUser, notify]);

  // ── building calendar ──
  const addCalendarEvent = useCallback<OrbitState["addCalendarEvent"]>((e) => {
    setCalendar((cs) => [...cs, { ...e, id: "cal" + Date.now(), by: e.by ?? userName(currentUser), source: e.source ?? "super" }]);
    notify("Added to building calendar");
    pushNotification({ kind: "calendar", title: "Calendar · " + e.title, detail: e.kind + (e.by ? " · " + (e.by ?? userName(currentUser)) : ""), building: e.buildingId });
    logEvent({ kind: "calendar.add", entityType: "building", entityId: e.buildingId, summary: e.kind + " · " + e.title, building: e.buildingId });
  }, [currentUser, notify, pushNotification, logEvent]);

  // ── field photos ──
  const addTicketPhoto = useCallback((ticketId: string, caption: string) => {
    const n = (ticketPhotos[ticketId]?.length || 0) + 1;
    const photo: TicketPhoto = { id: "ph" + Date.now(), url: `https://picsum.photos/seed/${ticketId}-${n}/480/320`, caption: caption || "Field photo " + n, by: userName(currentUser), at: stamp() };
    setTicketPhotos((s) => ({ ...s, [ticketId]: [...(s[ticketId] || []), photo] }));
    setTickets((ts) => ts.map((t) => t.id === ticketId ? { ...t, log: [...t.log, logLine(me(), "Photo added · " + photo.caption)] } : t));
    notify("Photo added to " + ticketId);
    logEvent({ kind: "ticket.photo", entityType: "ticket", entityId: ticketId, summary: "Field photo added" });
  }, [ticketPhotos, currentUser, me, notify, logEvent]);

  const addBuildingDoc = useCallback<OrbitState["addBuildingDoc"]>((buildingId, doc) => {
    const d: BuildingDoc = { id: "doc" + Date.now(), buildingId, name: doc.name, kind: doc.kind, system: doc.system, vendor: doc.vendor, by: userName(currentUser), at: stamp() };
    setBuildingDocs((s) => ({ ...s, [buildingId]: [d, ...(s[buildingId] || [])] }));
    notify("Document filed · " + doc.name);
    logEvent({ kind: "file.added", entityType: "building", entityId: buildingId, summary: "Document filed · " + doc.name + " (" + doc.kind + ")" + (doc.system ? " · " + doc.system : ""), building: buildingId });
  }, [currentUser, notify, logEvent]);

  const rateVendor = useCallback<OrbitState["rateVendor"]>((vendorId, dims, note, building) => {
    const r: VendorRating = { id: "vr" + Date.now(), vendorId, by: userName(currentUser), at: stamp(), dims, note, building };
    setVendorRatings((s) => ({ ...s, [vendorId]: [r, ...(s[vendorId] || [])] }));
    notify("Vendor rated · scorecard updated");
    logEvent({ kind: "vendor.rated", entityType: "vendor", entityId: vendorId, summary: "Vendor rated", building });
  }, [currentUser, notify, logEvent]);

  // Reassign the vendor of record for a system and chain it onto the system's
  // tamper-evident history. If the system has no chain yet, we seed a genesis
  // block from the vendor on record so the timeline is always complete.
  const reassignSystemVendor = useCallback<OrbitState["reassignSystemVendor"]>((system, toVendor, reason) => {
    const who = userName(currentUser);
    setVendorLedgers((prev) => {
      const chain = prev[system.id]?.length
        ? prev[system.id]
        : genesisLedger(systemVendors[system.id] ?? system.vendor, new Date(system.lastService + "T09:00:00").toISOString());
      const from = chain[chain.length - 1].vendor;
      if (from === toVendor) return { ...prev, [system.id]: chain };
      const next = appendLedger(chain, {
        vendor: toVendor, action: "replaced", at: new Date().toISOString(), by: who,
        reason: reason.trim() || `Reassigned from ${from}`,
      });
      return { ...prev, [system.id]: next };
    });
    setSystemVendors((p) => ({ ...p, [system.id]: toVendor }));
    notify(`${system.name} · vendor set to ${toVendor}`);
    logEvent({ kind: "vendor.reassigned", entityType: "building", entityId: system.buildingId, building: system.buildingId, summary: `${system.name}: vendor reassigned to ${toVendor}` });
  }, [currentUser, systemVendors, notify, logEvent]);

  const addVendorDoc = useCallback<OrbitState["addVendorDoc"]>((vendorId, doc) => {
    const d: VendorDoc = { id: "vd" + Date.now(), vendorId, name: doc.name, kind: doc.kind, by: userName(currentUser), at: stamp() };
    setVendorDocs((s) => ({ ...s, [vendorId]: [d, ...(s[vendorId] || [])] }));
    notify("Document filed · " + doc.name);
    logEvent({ kind: "vendor.doc", entityType: "vendor", entityId: vendorId, summary: "Vendor document filed · " + doc.name + " (" + doc.kind + ")" });
  }, [currentUser, notify, logEvent]);

  const removeVendorDoc = useCallback<OrbitState["removeVendorDoc"]>((vendorId, docId) => {
    setVendorDocs((s) => ({ ...s, [vendorId]: (s[vendorId] || []).filter((d) => d.id !== docId) }));
    notify("Document removed");
  }, [notify]);

  // ── work orders ──
  const ensureWorkOrder = useCallback((t: Ticket) => {
    setWorkOrders((wos) => {
      if (wos[t.id]) return wos;
      const f = ticketFlow(t);
      if (!f.awarded) return wos;
      const seq = Object.values(wos).filter((w) => w.buildingId === t.building).length + 1;
      return { ...wos, [t.id]: deriveWorkOrder(t, f, seq) };
    });
  }, []);

  const setWoStage = useCallback((ticketId: string, stage: WoStageKey, note?: string) => {
    const label = WO_STAGES.find((s) => s.key === stage)?.label || stage;
    setWorkOrders((wos) => {
      const w = wos[ticketId];
      if (!w) return wos;
      return { ...wos, [ticketId]: { ...w, stage, log: [...w.log, logLine(me(), note || "Stage → " + label)] } };
    });
    setTickets((ts) => ts.map((t) => t.id === ticketId ? { ...t, log: [...t.log, logLine(me(), "Work order → " + label)] } : t));
  }, [me]);

  const addWoLog = useCallback((ticketId: string, text: string) => {
    setWorkOrders((wos) => { const w = wos[ticketId]; return w ? { ...wos, [ticketId]: { ...w, log: [...w.log, logLine(me(), text)] } } : wos; });
  }, [me]);

  const recordInvoice = useCallback((ticketId: string, inv: { number: string; amount: number; dueDate: string }) => {
    setWorkOrders((wos) => {
      const w = wos[ticketId];
      if (!w) return wos;
      const invoice: Invoice = { number: inv.number, amount: inv.amount, receivedAt: todayISO(), dueDate: inv.dueDate, status: "received" };
      return { ...wos, [ticketId]: { ...w, invoice, stage: "invoiced", log: [...w.log, logLine(me(), "Invoice " + inv.number + " received · $" + inv.amount.toLocaleString())] } };
    });
    notify("Invoice " + inv.number + " logged");
    pushNotification({ kind: "finance", title: "Invoice received · " + inv.number, detail: "$" + inv.amount.toLocaleString(), ref: { page: "finance" } });
    logEvent({ kind: "invoice.recorded", entityType: "ticket", entityId: ticketId, summary: "Invoice " + inv.number + " · $" + inv.amount.toLocaleString() });
  }, [me, notify, pushNotification, logEvent]);

  const setInvoiceStatus = useCallback((ticketId: string, status: Invoice["status"]) => {
    setWorkOrders((wos) => {
      const w = wos[ticketId];
      if (!w || !w.invoice) return wos;
      const stage: WoStageKey = status === "paid" ? "paid" : w.stage;
      const txt = status === "approved" ? "Invoice " + w.invoice.number + " approved for payment" : status === "paid" ? "Payment released · " + w.invoice.number + " marked paid" : "Invoice updated";
      return { ...wos, [ticketId]: { ...w, stage, invoice: { ...w.invoice, status }, log: [...w.log, logLine(me(), txt)] } };
    });
    notify(status === "paid" ? "Marked paid" : status === "approved" ? "Invoice approved" : "Updated");
  }, [me, notify]);

  // ── ticket relationships ──
  const spawnChildTicket = useCallback<OrbitState["spawnChildTicket"]>((parentId, data) => {
    const parent = TICKETS.concat([]).find((x) => x.id === parentId);
    const id = nextTicketId();
    let buildingId = parent?.building;
    setTickets((ts) => {
      const p = ts.find((x) => x.id === parentId);
      buildingId = p?.building || buildingId || "b1";
      const child: Ticket = {
        id, title: data.title, building: buildingId, type: data.type || p?.type || "Maintenance",
        prio: data.prio || p?.prio || "Normal", status: "Open", assignee: null, requester: "Subtask · " + parentId,
        created: new Date().toISOString(), desc: "", verified: false, parentId, linkedIds: [], mergedInto: null,
        log: [logLine(me(), "Spawned from " + parentId)],
      };
      const withParentNote = ts.map((x) => x.id === parentId ? { ...x, log: [...x.log, logLine(me(), "Subtask → " + id + " · " + data.title)] } : x);
      return [child, ...withParentNote];
    });
    notify(id + " created from " + parentId);
    return id;
  }, [me, notify]);

  const linkTickets = useCallback((aId: string, bId: string) => {
    setTickets((ts) => ts.map((t) => {
      if (t.id === aId) return { ...t, linkedIds: [...new Set([...(t.linkedIds || []), bId])], log: [...t.log, logLine(me(), "Linked to " + bId)] };
      if (t.id === bId) return { ...t, linkedIds: [...new Set([...(t.linkedIds || []), aId])] };
      return t;
    }));
    notify(aId + " ⇄ " + bId + " linked");
  }, [me, notify]);

  const mergeTickets = useCallback((sourceId: string, targetId: string) => {
    setTickets((ts) => ts.map((t) => {
      if (t.id === sourceId) return { ...t, mergedInto: targetId, status: "Closed", verified: true, log: [...t.log, logLine(me(), "Merged into " + targetId + " as duplicate")] };
      if (t.id === targetId) return { ...t, linkedIds: [...new Set([...(t.linkedIds || []), sourceId])], log: [...t.log, logLine(me(), "Absorbed duplicate " + sourceId)] };
      return t;
    }));
    notify(sourceId + " merged into " + targetId);
  }, [me, notify]);

  // ── live chat ──
  const seedChat = useCallback((channelId: string, msgs: ChatMessage[]) => {
    setChat((s) => (s[channelId] ? s : { ...s, [channelId]: msgs }));
  }, []);

  const createChannel = useCallback<OrbitState["createChannel"]>((channel, first) => {
    setCustomChannels((cs) => (cs.some((c) => c.id === channel.id) ? cs : [channel, ...cs]));
    if (first && first.text.trim()) {
      const msg: ChatMessage = { id: "m" + Date.now(), channelId: channel.id, senderId: "me", via: first.via, text: first.text.trim(), at: stamp() };
      setChat((s) => ({ ...s, [channel.id]: [msg] }));
    }
    notify("Conversation started · " + channel.participants.length + " recipient" + (channel.participants.length > 1 ? "s" : ""));
    logEvent({ kind: "comm.thread", entityType: "channel", entityId: channel.id, summary: "New conversation · " + channel.title, building: channel.buildingId === "all" ? undefined : channel.buildingId });
  }, [notify, logEvent]);

  const toggleIntegration = useCallback<OrbitState["toggleIntegration"]>((id, label) => {
    setIntegrations((xs) => {
      const on = xs.includes(id);
      notify(on ? label + " disconnected" : label + " connected");
      logEvent({ kind: on ? "integration.disconnected" : "integration.connected", entityType: "integration", entityId: id, summary: (on ? "Disconnected " : "Connected ") + label });
      return on ? xs.filter((x) => x !== id) : [...xs, id];
    });
  }, [notify, logEvent]);

  const sendChat = useCallback<OrbitState["sendChat"]>((channel, payload) => {
    const msg: ChatMessage = { id: "m" + Date.now(), channelId: channel.id, senderId: "me", via: payload.via, text: payload.text, at: stamp(), toAll: payload.toAll };
    setChat((s) => ({ ...s, [channel.id]: [...(s[channel.id] || []), msg] }));
    if (channel.ticketId) {
      setTickets((ts) => ts.map((t) => t.id === channel.ticketId ? { ...t, log: [...t.log, logLine(me(), "Message → " + channel.title + " · " + payload.via)] } : t));
    }
    // light simulated reply so the surface feels alive
    const repliers = channel.participants;
    if (repliers.length) {
      const who = repliers[Math.floor(Math.random() * repliers.length)];
      const acks = channel.kind === "board"
        ? ["Noted, thanks.", "Sounds good.", "Agreed — keep us posted.", "👍 on the award."]
        : channel.kind === "vendor"
          ? ["Copy that.", "On it — will confirm.", "Received, thanks."]
          : ["Thank you!", "Got it, appreciate the update.", "Okay, sounds good.", "Thanks — I'll be around."];
      const ack = acks[Math.floor(Math.random() * acks.length)];
      window.setTimeout(() => {
        setChat((s) => ({ ...s, [channel.id]: [...(s[channel.id] || []), { id: "r" + Date.now(), channelId: channel.id, senderId: who.id, via: payload.via, text: ack, at: stamp() }] }));
      }, 1400);
    }
  }, [me]);

  // ── auto-escalation: super-first tickets that pass their window escalate to
  //    the central Facilities PM on their own (no button required). ──
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;
  useEffect(() => {
    const sweep = () => {
      const now = Date.now();
      const due = ticketsRef.current.filter((t) => t.team === "super" && t.escalateAt && t.status !== "Closed" && t.status !== "In progress" && new Date(t.escalateAt).getTime() < now);
      if (!due.length) return;
      const dueIds = new Set(due.map((d) => d.id));
      setTickets((ts) => ts.map((t) => dueIds.has(t.id)
        ? { ...t, team: "facilities", escalateAt: null, assignee: t.assignee ?? "luke", status: t.status === "Open" ? "Assigned" : t.status, log: [...t.log, [stamp(), "nick", "Auto-escalated → Facilities PM — super window elapsed"] as [string, string, string]] }
        : t));
      due.forEach((d) => pushNotification({ kind: "ticket", title: d.id + " auto-escalated → Facilities PM", detail: d.title + " · super window elapsed", building: d.building, ref: { page: "tickets", id: d.id } }));
    };
    const iv = setInterval(sweep, 60_000);
    return () => clearInterval(iv);
  }, [pushNotification]);

  // ── persistence ── hydrate once on mount, then save on change so a refresh
  // no longer wipes the session. Versioned key + try/catch; the seed remains the
  // default when nothing is saved. (This is the localStorage stand-in for the
  // real backend that will sit behind the same action surface.)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("orbit_state_v2");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.tickets) setTickets(s.tickets);
      if (s.ballots) setBallots(s.ballots);
      if (s.ticketComments) setTicketComments(s.ticketComments);
      if (s.ticketMessages) setTicketMessages(s.ticketMessages);
      if (s.ticketProgress) setTicketProgress(s.ticketProgress);
      if (s.chat) setChat(s.chat);
      if (s.customChannels) setCustomChannels(s.customChannels);
      if (s.integrations) setIntegrations(s.integrations);
      if (s.notices) setNotices(s.notices);
      if (s.recs) setRecs(s.recs);
      if (s.workOrders) setWorkOrders(s.workOrders);
      if (s.shifts) setShifts(s.shifts);
      if (s.calendar) setCalendar(s.calendar);
      if (s.ticketPhotos) setTicketPhotos(s.ticketPhotos);
      if (s.buildingDocs) setBuildingDocs(s.buildingDocs);
      if (s.systemVendors) setSystemVendors(s.systemVendors);
      if (s.vendorLedgers) setVendorLedgers(s.vendorLedgers);
      if (s.vendorDocs) setVendorDocs(s.vendorDocs);
      if (s.vendorRatings) setVendorRatings(s.vendorRatings);
      if (s.emergencies) setEmergencies(s.emergencies);
      if (s.notifications) setNotifications(s.notifications);
      if (s.events) setEvents(s.events);
    } catch { /* ignore corrupt snapshot */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("orbit_state_v2", JSON.stringify({ tickets, ballots, ticketComments, ticketMessages, ticketProgress, chat, customChannels, integrations, notices, recs, workOrders, shifts, calendar, ticketPhotos, buildingDocs, systemVendors, vendorLedgers, vendorDocs, vendorRatings, emergencies, notifications, events }));
    } catch { /* quota / disabled */ }
  }, [tickets, ballots, ticketComments, ticketMessages, ticketProgress, chat, customChannels, integrations, notices, recs, workOrders, shifts, calendar, ticketPhotos, buildingDocs, systemVendors, vendorLedgers, vendorDocs, vendorRatings, emergencies, notifications, events]);

  const value = useMemo<OrbitState>(() => ({
    route, nav, currentUser, role, login, loginEmail, backendLive: isSupabaseConfigured, logout,
    theme, setTheme,
    tickets, createTicket, assignTicket, setTicketStatus, addTicketNote, updateTicket, setWorkDate, escalateTicket,
    spawnChildTicket, linkTickets, mergeTickets,
    routeTicket, holdForInfo, releaseHold,
    commandId, openCommand, closeCommand,
    ticketComments, seedComments, addComment,
    ticketMessages, seedMessages, sendTicketMessage,
    ticketProgress, seedProgress, setProgressItems, postProgress,
    recs, decideRec, addRecs,
    notices, sendNotice,
    orgMembers, departments: DEPARTMENTS, orgBuildings, orgAudit, uiDirection, setUiDirection,
    addOrgMember, updateOrgMember, removeOrgMember, addOrgBuilding, removeOrgBuilding,
    opportunities, crmActivities, campaigns, addOpportunity, updateOpportunity, addCrmActivity,
    ballots, castBallot,
    shifts, activeShift, punchIn, punchOut,
    calendar, addCalendarEvent,
    ticketPhotos, addTicketPhoto,
    buildingDocs, addBuildingDoc,
    vendorRatings, rateVendor,
    systemVendors, vendorLedgers, reassignSystemVendor,
    vendorDocs, addVendorDoc, removeVendorDoc,
    emergencies, declareEmergency, advanceEmergency, logEmergency, resolveEmergency,
    events, logEvent, eventsFor,
    notifications, pushNotification, markNotificationRead, markAllNotificationsRead,
    workOrders, ensureWorkOrder, setWoStage, recordInvoice, setInvoiceStatus, addWoLog,
    chat, seedChat, sendChat,
    customChannels, createChannel,
    integrations, toggleIntegration,
    toast, notify,
  }), [route, nav, currentUser, role, login, loginEmail, logout, theme, setTheme, tickets, createTicket, assignTicket, setTicketStatus, addTicketNote, updateTicket, setWorkDate, escalateTicket, spawnChildTicket, linkTickets, mergeTickets, routeTicket, holdForInfo, releaseHold, ticketComments, seedComments, addComment, ticketMessages, seedMessages, sendTicketMessage, ticketProgress, seedProgress, setProgressItems, postProgress, recs, decideRec, addRecs, notices, sendNotice, orgMembers, orgBuildings, orgAudit, uiDirection, addOrgMember, updateOrgMember, removeOrgMember, addOrgBuilding, removeOrgBuilding, opportunities, crmActivities, campaigns, addOpportunity, updateOpportunity, addCrmActivity, ballots, castBallot, shifts, activeShift, punchIn, punchOut, calendar, addCalendarEvent, ticketPhotos, addTicketPhoto, buildingDocs, addBuildingDoc, vendorRatings, rateVendor, systemVendors, vendorLedgers, reassignSystemVendor, vendorDocs, addVendorDoc, removeVendorDoc, emergencies, declareEmergency, advanceEmergency, logEmergency, resolveEmergency, events, logEvent, eventsFor, notifications, pushNotification, markNotificationRead, markAllNotificationsRead, workOrders, ensureWorkOrder, setWoStage, recordInvoice, setInvoiceStatus, addWoLog, chat, seedChat, sendChat, customChannels, createChannel, integrations, toggleIntegration, commandId, openCommand, closeCommand, toast, notify]);

  return <OrbitCtx.Provider value={value}>{children}</OrbitCtx.Provider>;
}
