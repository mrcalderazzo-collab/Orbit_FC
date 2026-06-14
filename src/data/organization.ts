import type { Department, OrgAuditEvent, OrgMember } from "@/lib/types";

export const ACCESS_AREAS = [
  "dashboard", "tickets", "comms", "buildings", "notices", "finance",
  "vendors", "ai", "emergencies", "sales", "integrations", "owner",
];

export const DEPARTMENTS: Department[] = [
  { id: "leadership", name: "Leadership", lead: "Adrian Cole", color: "#f4c95d", mandate: "Strategy, controls and organizational accountability" },
  { id: "operations", name: "Property Operations", lead: "Marcus Webb", color: "#5eead4", mandate: "Building execution, service delivery and escalation" },
  { id: "compliance", name: "Compliance & Finance", lead: "Priya Anand", color: "#a855f7", mandate: "Controls, finance, records and regulatory readiness" },
  { id: "field", name: "Field Intelligence", lead: "Diego Ramos", color: "#3b82f6", mandate: "Site presence, vendor verification and field evidence" },
  { id: "growth", name: "Sales & Marketing", lead: "Maya Chen", color: "#fb7185", mandate: "Pipeline, relationships, campaigns and portfolio growth" },
];

export const ORG_MEMBERS: OrgMember[] = [
  { id: "m_owner", name: "Adrian Cole", initials: "AC", email: "a.cole@orbit.ops", title: "Owner & System Administrator", departmentId: "leadership", status: "Active", access: ["all"], buildingIds: ["all"], lastActive: "Now", color: "#f4c95d" },
  { id: "m_marcus", name: "Marcus Webb", initials: "MW", email: "m.webb@orbit.ops", title: "Principal Operator", departmentId: "operations", status: "Active", access: ["all"], buildingIds: ["all"], lastActive: "4 min ago", color: "#5eead4" },
  { id: "m_priya", name: "Priya Anand", initials: "PA", email: "p.anand@orbit.ops", title: "Compliance & Admin", departmentId: "compliance", status: "Active", access: ["dashboard", "tickets", "comms", "buildings", "notices", "finance", "ai"], buildingIds: ["all"], lastActive: "18 min ago", color: "#a855f7" },
  { id: "m_diego", name: "Diego Ramos", initials: "DR", email: "d.ramos@orbit.ops", title: "Field Intelligence", departmentId: "field", status: "Active", access: ["tickets", "comms", "buildings", "emergencies", "vendors"], buildingIds: ["b1", "b2", "b3", "b4"], lastActive: "32 min ago", color: "#3b82f6" },
  { id: "m_maya", name: "Maya Chen", initials: "MC", email: "m.chen@orbit.ops", title: "Director of Growth", departmentId: "growth", status: "Active", access: ["dashboard", "sales", "comms", "buildings", "notices", "integrations"], buildingIds: ["all"], lastActive: "7 min ago", color: "#fb7185" },
];

export const ORG_AUDIT: OrgAuditEvent[] = [
  { id: "oa1", at: "Today, 9:42 AM", actor: "Adrian Cole", action: "Updated access policy", target: "Sales & Marketing" },
  { id: "oa2", at: "Today, 8:18 AM", actor: "Adrian Cole", action: "Added organization member", target: "Maya Chen" },
  { id: "oa3", at: "Yesterday, 4:51 PM", actor: "Marcus Webb", action: "Changed building assignment", target: "Diego Ramos" },
  { id: "oa4", at: "Yesterday, 2:07 PM", actor: "Priya Anand", action: "Exported permission report", target: "Organization" },
];
