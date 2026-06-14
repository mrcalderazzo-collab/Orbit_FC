import type { CrmActivity, CrmOpportunity, MarketingCampaign } from "@/lib/types";
import { addDaysISO, todayISO } from "@/lib/focus";

export const CRM_OPPORTUNITIES: CrmOpportunity[] = [
  { id: "opp-101", account: "Riverside Portfolio", contact: "Elena Vasquez", email: "elena@riversideboard.com", stage: "Negotiation", value: 248000, probability: 75, source: "Board referral", owner: "maya", nextAction: "Send final transition plan", nextAt: addDaysISO(1), lastTouch: "Today, 10:20 AM", properties: 4, units: 286, tags: ["High intent", "Multi-property"] },
  { id: "opp-102", account: "Park & 82nd Condominium", contact: "William Cho", email: "william@park82.org", stage: "Proposal", value: 84000, probability: 60, source: "Website", owner: "maya", nextAction: "Review pricing with treasurer", nextAt: addDaysISO(2), lastTouch: "Yesterday", properties: 1, units: 96, tags: ["Board change"] },
  { id: "opp-103", account: "Brookline Residential Group", contact: "Amara Singh", email: "asingh@brooklinegroup.com", stage: "Discovery", value: 312000, probability: 40, source: "Industry event", owner: "maya", nextAction: "Map current operating stack", nextAt: addDaysISO(3), lastTouch: "2 days ago", properties: 6, units: 422, tags: ["Portfolio", "Integration-heavy"] },
  { id: "opp-104", account: "West 14th Owners", contact: "Daniel Russo", email: "drusso@w14owners.org", stage: "Qualified", value: 72000, probability: 30, source: "Outbound", owner: "maya", nextAction: "Book management assessment", nextAt: todayISO(), lastTouch: "3 days ago", properties: 1, units: 58, tags: ["Due today"] },
  { id: "opp-105", account: "Juniper Court HOA", contact: "Mei Foster", email: "mei@junipercourt.org", stage: "Lead", value: 96000, probability: 15, source: "Resident referral", owner: "maya", nextAction: "Research board priorities", nextAt: addDaysISO(4), lastTouch: "New", properties: 1, units: 144, tags: ["Inbound"] },
  { id: "opp-106", account: "The Whitman", contact: "Noah Bennett", email: "nbennett@whitman.nyc", stage: "Won", value: 126000, probability: 100, source: "Partner", owner: "maya", nextAction: "Handoff to onboarding", nextAt: addDaysISO(1), lastTouch: "Today, 8:05 AM", properties: 1, units: 118, tags: ["Won", "Onboarding"] },
];

export const CRM_ACTIVITIES: CrmActivity[] = [
  { id: "ca1", opportunityId: "opp-101", type: "Meeting", text: "Board approved commercial terms; requested a 30-day transition plan.", at: "Today, 10:20 AM", by: "Maya Chen" },
  { id: "ca2", opportunityId: "opp-104", type: "Call", text: "Voicemail left for board president. Follow-up is due today.", at: "Yesterday, 3:48 PM", by: "Maya Chen" },
  { id: "ca3", opportunityId: "opp-102", type: "Email", text: "Proposal opened twice by the treasurer and one board member.", at: "Yesterday, 11:12 AM", by: "Orbit Signal" },
  { id: "ca4", opportunityId: "opp-103", type: "Note", text: "Current stack includes AppFolio, Gmail and an external maintenance line.", at: "2 days ago", by: "Maya Chen" },
];

export const MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  { id: "mc1", name: "Board Transition Readiness", channel: "Email + LinkedIn", status: "Live", audience: 640, spend: 1850, leads: 38, meetings: 9, pipeline: 396000 },
  { id: "mc2", name: "NYC Local Law Intelligence", channel: "Webinar", status: "Live", audience: 212, spend: 3200, leads: 54, meetings: 14, pipeline: 528000 },
  { id: "mc3", name: "Resident Experience Benchmark", channel: "Content", status: "Draft", audience: 0, spend: 600, leads: 0, meetings: 0, pipeline: 0 },
];
