// notices.ts — building-wide announcements (water shutoff, assessment, inspection
// access, etc.). A notice targets a building + audience, goes out over chosen
// channels, and tracks delivery status & reach.
export type NoticeStatus = "Sent" | "Scheduled" | "Draft";
export interface Notice {
  id: string;
  title: string;
  body: string;
  building: string; // building id or "all"
  audience: string;
  channels: string[]; // Email · SMS · Push · In-app
  status: NoticeStatus;
  urgent: boolean;
  reach: number;
  at: string; // sent/scheduled time
}

export const NOTICE_CHANNELS = ["Email", "SMS", "Push", "In-app"];
export const NOTICE_AUDIENCES = ["All residents", "All units + board", "Board only", "Specific lines/floors", "Owners only", "Commercial tenants"];

// quick-start templates for the most common broadcasts
export const NOTICE_TEMPLATES: { key: string; label: string; icon: string; urgent: boolean; title: string; body: string; audience: string; channels: string[] }[] = [
  { key: "water", label: "Water shutdown", icon: "droplet", urgent: true, title: "Scheduled water shutdown — {date}", audience: "Specific lines/floors", channels: ["Email", "SMS", "Push"],
    body: "Please be advised that water service will be temporarily shut off for scheduled maintenance on {date} from {start}–{end}. Affected lines: {lines}. Please store water in advance. We apologize for the inconvenience." },
  { key: "assessment", label: "Assessment / increase", icon: "circle-dollar-sign", urgent: false, title: "Notice of special assessment", audience: "Owners only", channels: ["Email", "In-app"],
    body: "The Board has approved a special assessment to fund {project}. The assessment of {amount} will be billed beginning {date}. A detailed breakdown and payment options are attached. Questions: contact your account manager." },
  { key: "inspection", label: "Inspection access", icon: "clipboard-check", urgent: false, title: "Access required — {inspection} inspection", audience: "All units + board", channels: ["Email", "SMS"],
    body: "An inspection of {inspection} is scheduled for {date}. Access to all units is required between {start}–{end}. If you cannot be present, please leave keys with the front desk or arrange access with the super." },
  { key: "elevator", label: "Elevator service", icon: "arrow-up-down", urgent: true, title: "Elevator out of service — {date}", audience: "All residents", channels: ["Email", "Push", "In-app"],
    body: "{car} will be out of service for repairs on {date}. Please use the remaining elevator(s) or stairs. We expect service to be restored by {end}. Thank you for your patience." },
  { key: "amenity", label: "Amenity / closure", icon: "megaphone", urgent: false, title: "{amenity} closure", audience: "All residents", channels: ["Email", "In-app"],
    body: "The {amenity} will be closed on {date} for {reason}. It will reopen {reopen}. Thank you." },
  { key: "general", label: "General notice", icon: "info", urgent: false, title: "", audience: "All residents", channels: ["Email", "In-app"], body: "" },
];

export const SEED_NOTICES: Notice[] = [
  { id: "n1", title: "Elevator #2 service — Car B out 06/07–06/09", body: "Car B will be out of service for sensor-board repair. Please use Car A or the stairs. Expected back in service by EOD 06/09.", building: "b2", channels: ["Email", "SMS", "Push"], audience: "All residents", status: "Sent", urgent: true, at: "2026-06-07 09:40", reach: 112 },
  { id: "n2", title: "Cold water shutdown — risers 3–6, Tue 8–11AM", body: "Water service to lines C–F will be shut off for booster-pump maintenance. Please store water in advance.", building: "b1", channels: ["Email", "Push"], audience: "Specific lines/floors", status: "Scheduled", urgent: false, at: "2026-06-10 07:00", reach: 18 },
  { id: "n3", title: "Annual fire inspection — access required", body: "FDNY annual inspection requires access to all units. Please leave keys with the front desk if you cannot be present.", building: "b7", channels: ["Email", "SMS"], audience: "All units + board", status: "Draft", urgent: false, at: "—", reach: 210 },
];
