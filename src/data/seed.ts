// seed.ts — Orbit FC mock data layer. Mirrors the prototype's data.jsx value
// ranges. In production this is replaced by the tRPC/Drizzle data source; the
// UI only depends on the exported shapes, never on how they're produced.
import type {
  AiRec,
  Building,
  Person,
  Priority,
  Ticket,
  TicketStatus,
  TicketType,
} from "@/lib/types";

export const PEOPLE: Record<string, Person> = {
  nick: { id: "nick", name: "Marcus Webb", role: "Principal Operator", initials: "MW", color: "var(--acc)", email: "m.webb@orbit.ops", phone: "+1 (212) 555-0142" },
  luke: { id: "luke", name: "Diego Ramos", role: "Field Intelligence", initials: "DR", color: "#3b82f6", email: "d.ramos@orbit.ops", phone: "+1 (917) 555-0188" },
  cait: { id: "cait", name: "Priya Anand", role: "Admin & Compliance", initials: "PA", color: "#a855f7", email: "p.anand@orbit.ops", phone: "+1 (212) 555-0167" },
  gidi: { id: "gidi", name: "Sara Klein", role: "Asset Manager", initials: "SK", color: "#3b82f6", email: "s.klein@orbit.ops", phone: "+1 (646) 555-0119" },
  maura: { id: "maura", name: "Tom Becker", role: "Asset Manager", initials: "TB", color: "#22c55e", email: "t.becker@orbit.ops", phone: "+1 (646) 555-0204" },
  jess: { id: "jess", name: "Nina Costa", role: "Asset Manager", initials: "NC", color: "#f59e0b", email: "n.costa@orbit.ops", phone: "+1 (718) 555-0173" },
  caro: { id: "caro", name: "Grace Lin", role: "Asset Manager", initials: "GL", color: "#ec4899", email: "g.lin@orbit.ops", phone: "+1 (347) 555-0151" },
  coord: { id: "coord", name: "Owen Frey", role: "Account Coordinator", initials: "OF", color: "#14b8a6", email: "o.frey@orbit.ops", phone: "+1 (212) 555-0190" },
};

export const BUILDINGS: Building[] = [
  { id: "b1", code: "ORB-001N", name: "The Hawthorne", address: "245 W 19th St, New York, NY 10011", type: "Condo", plan: "Pro", status: "Active", units: 48, am: "gidi", mono: "#5eead4", reserve: 1820000, operating: 412000, delinquency: 0.031, openTickets: 7, docs: 142, compliance: "ok", monthlyIncome: 286000, monthlyExpense: 241000 },
  { id: "b2", code: "ORB-002N", name: "Vesper House", address: "88 Greenwich St, New York, NY 10006", type: "Condo", plan: "Pro", status: "Active", units: 112, am: "gidi", mono: "#3b82f6", reserve: 3140000, operating: 688000, delinquency: 0.052, openTickets: 14, docs: 261, compliance: "review", monthlyIncome: 512000, monthlyExpense: 447000 },
  { id: "b3", code: "ORB-003N", name: "The Calloway", address: "312 E 53rd St, New York, NY 10022", type: "Condo", plan: "Pro", status: "Active", units: 86, am: "gidi", mono: "#a855f7", reserve: 2010000, operating: 503000, delinquency: 0.018, openTickets: 4, docs: 198, compliance: "ok", monthlyIncome: 398000, monthlyExpense: 352000 },
  { id: "b4", code: "ORB-004P", name: "Marlowe Court", address: "540 Amsterdam Ave, New York, NY 10024", type: "Co-op", plan: "Pro", status: "Active", units: 64, am: "gidi", mono: "#22c55e", reserve: 1440000, operating: 298000, delinquency: 0.074, openTickets: 11, docs: 176, compliance: "alert", monthlyIncome: 241000, monthlyExpense: 263000 },
  { id: "b5", code: "ORB-005N", name: "Sutton Reach", address: "410 E 61st St, New York, NY 10065", type: "Condo", plan: "Lite", status: "Active", units: 22, am: "maura", mono: "#f59e0b", reserve: 612000, operating: 141000, delinquency: 0.009, openTickets: 2, docs: 88, compliance: "ok", monthlyIncome: 132000, monthlyExpense: 118000 },
  { id: "b6", code: "ORB-006N", name: "The Ardsley", address: "77 Clinton St, Brooklyn, NY 11201", type: "Condo", plan: "Pro", status: "Active", units: 54, am: "jess", mono: "#ec4899", reserve: 1690000, operating: 377000, delinquency: 0.041, openTickets: 6, docs: 154, compliance: "review", monthlyIncome: 301000, monthlyExpense: 268000 },
  { id: "b7", code: "ORB-007H", name: "Linden Park HOA", address: "Linden Park Homeowners Assoc., Queens, NY", type: "HOA", plan: "Pro", status: "Active", units: 210, am: "maura", mono: "#22c55e", reserve: 4820000, operating: 902000, delinquency: 0.063, openTickets: 18, docs: 312, compliance: "review", monthlyIncome: 744000, monthlyExpense: 681000 },
  { id: "b8", code: "ORB-008B", name: "The Beacon", address: "175 Kent Ave, Brooklyn, NY 11249", type: "Condo", plan: "Pro", status: "Active", units: 38, am: "caro", mono: "#38bdf8", reserve: 980000, operating: 214000, delinquency: 0.027, openTickets: 5, docs: 121, compliance: "ok", monthlyIncome: 198000, monthlyExpense: 173000 },
];

export const TICKET_TYPES: TicketType[] = ["Maintenance", "Facility", "Finance", "Documents", "Board request"];
export const TICKET_PRIOS: Priority[] = ["Critical", "High", "Normal", "Low"];
export const TICKET_STATUS: TicketStatus[] = ["Open", "Assigned", "In progress", "Awaiting review", "Closed"];

export const TICKETS: Ticket[] = [
  { id: "T-4801", title: "Elevator #2 intermittent fault — car B", building: "b2", type: "Maintenance", prio: "Critical", status: "In progress", assignee: "luke", requester: "Board · Vesper House", created: "2026-06-07T09:12:00", desc: "Car B stalls between floors 7–9. Otis dispatched. Sensor board suspected.", vendor: "Otis Elevator", verified: true, log: [["2026-06-07T09:12", "nick", "Ticket created from emergency intake"], ["2026-06-07T09:31", "nick", "Assigned to Diego Ramos"], ["2026-06-07T11:04", "luke", "Otis on-site, isolating sensor board"]] },
  { id: "T-4799", title: "Q2 financial anomaly — operating draw 14% over", building: "b4", type: "Finance", prio: "High", status: "Awaiting review", assignee: "cait", requester: "AI · Anomaly Engine", created: "2026-06-06T16:40:00", desc: "Operating account drawdown exceeds 12-mo trailing mean by 14%. Two vendor invoices flagged for duplicate line items.", verified: true, log: [["2026-06-06T16:40", "cait", "AI-flagged, routed to compliance"], ["2026-06-07T08:15", "cait", "Pulling invoice backups from QuickBooks"]] },
  { id: "T-4795", title: "Lobby intercom replacement — Sutton Reach", building: "b5", type: "Facility", prio: "Normal", status: "Assigned", assignee: "maura", requester: "Tenant · Unit 3R", created: "2026-06-05T13:22:00", desc: "Front-door intercom unresponsive. Replacement panel ordered.", vendor: "Aiphone NY", verified: false, log: [["2026-06-05T13:22", "maura", "Created from tenant request"], ["2026-06-06T10:00", "maura", "Panel ordered, ETA 3 days"]] },
  { id: "T-4797", title: "Cooling tower seasonal service — Vesper House", building: "b2", type: "Maintenance", prio: "Normal", status: "In progress", assignee: "luke", requester: "Field · NYC Ops", created: "2026-06-05T10:00:00", desc: "Annual cooling-tower service and water treatment ahead of the summer peak.", vendor: "Northeast Mechanical", verified: false, log: [["2026-06-05T10:00", "luke", "Seasonal service scheduled with Northeast Mechanical"]] },
  { id: "T-4796", title: "Boiler annual service & combustion test", building: "b1", type: "Maintenance", prio: "Normal", status: "Closed", assignee: "luke", requester: "Field · NYC Ops", created: "2026-05-22T09:00:00", desc: "Annual heating-plant service, combustion efficiency test, and safety check.", vendor: "Northeast Mechanical", verified: true, log: [["2026-05-22T09:00", "luke", "Northeast Mechanical dispatched"], ["2026-05-23T15:20", "luke", "Service complete, report uploaded"], ["2026-05-23T15:22", "nick", "Verified & closed"]] },
  { id: "T-4790", title: "Renew master insurance — binder expires 06/30", building: "b1", type: "Documents", prio: "High", status: "Open", assignee: null, requester: "AI · Lease Engine", created: "2026-06-05T08:00:00", desc: "Master property policy lapses June 30. AURA RPG quote attached for board review.", verified: true, log: [["2026-06-05T08:00", "nick", "AI surfaced renewal window"]] },
  { id: "T-4788", title: "Trash chute cleaning reschedule", building: "b7", type: "Maintenance", prio: "Normal", status: "Awaiting review", assignee: "luke", requester: "Vendor · Sani Environmental", created: "2026-06-04T15:10:00", desc: "Vendor requests reschedule to prevent pest issues; new window proposed.", vendor: "Sani Environmental", verified: false, log: [["2026-06-04T15:10", "luke", "Vendor reschedule request logged"]] },
  { id: "T-4782", title: "Bylaw amendment packet — co-purchasing", building: "b6", type: "Board request", prio: "Normal", status: "Open", assignee: null, requester: "Board · The Ardsley", created: "2026-06-03T11:45:00", desc: "Board requests clarification on co-purchasing and pied-à-terre policy. Counsel review needed.", verified: false, log: [["2026-06-03T11:45", "nick", "Board request intake"]] },
  { id: "T-4779", title: "Roof drain clearing before storm window", building: "b3", type: "Facility", prio: "High", status: "Assigned", assignee: "luke", requester: "Field · NYC Ops", created: "2026-06-02T07:30:00", desc: "Pre-storm preventive clearing on north and east drains.", vendor: "Aggressive Pest", verified: false, log: [["2026-06-02T07:30", "luke", "Scheduled ahead of forecast"]] },
  { id: "T-4771", title: "Unit 6 May statement dispute", building: "b1", type: "Finance", prio: "Low", status: "Closed", assignee: "cait", requester: "Tenant · Unit 6", created: "2026-05-29T14:00:00", desc: "Resident disputed a late fee; waived after ledger review.", verified: true, log: [["2026-05-29T14:00", "cait", "Dispute opened"], ["2026-05-31T09:20", "cait", "Late fee reversed, statement reissued"], ["2026-05-31T09:22", "cait", "Closed — resolved"]] },
  { id: "T-4765", title: "Window cleaning + lobby maintenance complete", building: "b8", type: "Facility", prio: "Low", status: "Closed", assignee: "luke", requester: "Field · NYC Ops", created: "2026-05-27T10:00:00", desc: "Quarterly facade window cleaning and lobby touch-up completed and verified.", verified: true, log: [["2026-05-27T10:00", "luke", "Crew dispatched"], ["2026-05-28T16:30", "luke", "Completed, photos uploaded"], ["2026-05-28T16:31", "nick", "Verified & closed"]] },
];

// On-site / building rosters (board directors drive the vote roster)
export const ROSTER: Record<string, { super: string; staff: [string, string][]; board: [string, string][] }> = {
  b1: { super: "Frank Mercer", staff: [["Yuki Tanaka", "Porter"], ["Errol Davies", "Doorman"]], board: [["Robert Vance", "President"], ["Helen Cho", "Treasurer"], ["Omar Haddad", "Secretary"]] },
  b2: { super: "Joel Petrov", staff: [["Sam Quinn", "Resident Mgr"], ["Aleks Nowak", "Doorman"], ["Carl Reyes", "Porter"]], board: [["Diane Wu", "President"], ["Marcus Hale", "Treasurer"], ["Lena Roth", "Secretary"]] },
  b3: { super: "Tony Calabrese", staff: [["Rosa Pena", "Concierge"], ["Bill Hart", "Porter"]], board: [["Gail Stern", "President"], ["Ed Park", "Treasurer"]] },
  b4: { super: "Mike O'Shea", staff: [["Dawn Fields", "Porter"]], board: [["Susan Day", "President"], ["Paul Greco", "Treasurer"], ["Iris Lamb", "Secretary"]] },
  b5: { super: "Hector Cruz", staff: [["Nadia Khan", "Concierge"]], board: [["Tom Reilly", "President"]] },
  b6: { super: "Vince Marino", staff: [["Kira Sato", "Doorman"], ["Leon Bishop", "Porter"]], board: [["Mara Lieb", "President"], ["Drew Cole", "Treasurer"]] },
  b7: { super: "Walt Friedman", staff: [["Gabe Ortiz", "Asst. Super"], ["Pam Nolan", "Office Mgr"], ["Ray Dunn", "Groundskeeper"]], board: [["Carol Amador", "President"], ["Jim Frost", "Treasurer"], ["Beth Vo", "Secretary"]] },
  b8: { super: "Sergio Bianchi", staff: [["Mona Patel", "Concierge"], ["Kyle Webb", "Porter"]], board: [["Nora Quinn", "President"], ["Sven Aas", "Treasurer"]] },
};

export const AI_RECS: AiRec[] = [
  { id: "ai1", kind: "Maintenance triage", building: "b2", confidence: 0.94, status: "pending", agent: "TRIAGE_ENGINE", ticketId: "T-4801", rec: "Escalate elevator ticket T-4801 to Critical and notify board.", reason: "3 tenant reports in 6h + Otis fault code 0x4F historically precedes full outage in 71% of cases.", input: "Sensor log: car B, floors 7–9, fault recurrence 11×/24h." },
  { id: "ai2", kind: "Vendor recommendation", building: "b4", confidence: 0.88, status: "pending", agent: "VENDOR_MATCH", rec: "Award boiler service contract to Cambridge & Leach over incumbent.", reason: "Bid 12% under incumbent, 4.8 avg rating across 9 portfolio jobs, SLA 4h vs 8h.", input: "3 bids compared; incumbent last 2 jobs missed SLA." },
  { id: "ai3", kind: "Financial anomaly", building: "b4", confidence: 0.97, status: "pending", agent: "ANOMALY_ENGINE", ticketId: "T-4799", rec: "Hold payment on two Mold Agent Inc invoices pending review.", reason: "Duplicate line items detected across INV-2204 and INV-2211, $3,180 overlap.", input: "OCR diff on PDF invoices; QuickBooks match 0.93." },
  { id: "ai4", kind: "Lease renewal", building: "b1", confidence: 0.82, status: "pending", agent: "LEASE_ENGINE", ticketId: "T-4790", rec: "Begin master insurance renewal — binder expires June 30.", reason: "Policy ORBIT001-MP lapses 06/30. AURA RPG quote 6% under current premium.", input: "Policy registry + AURA quote PDF." },
  { id: "ai5", kind: "Document review", building: "b6", confidence: 0.76, status: "approved", agent: "DOC_ENGINE", ticketId: "T-4782", rec: "Flag bylaw section 4.2 for counsel — conflicts with co-purchasing request.", reason: "Semantic conflict between board request and recorded bylaws v3.", input: "Bylaws v3 §4.2 vs board request T-4782." },
];

export const buildingById = (id: string): Building | undefined =>
  BUILDINGS.find((b) => b.id === id);

export function portfolioTotals() {
  const t = BUILDINGS.reduce(
    (a, b) => {
      a.units += b.units;
      a.reserve += b.reserve;
      a.income += b.monthlyIncome;
      a.expense += b.monthlyExpense;
      a.open += b.openTickets;
      a.docs += b.docs;
      return a;
    },
    { units: 0, reserve: 0, income: 0, expense: 0, open: 0, docs: 0 },
  );
  return { ...t, buildings: BUILDINGS.length, noi: t.income - t.expense };
}
