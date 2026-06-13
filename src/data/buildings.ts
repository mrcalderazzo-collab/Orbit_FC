import type { BuildingChange, BuildingFile, BuildingRecord, BuildingSystem, BuildingTourArea, SiteVisit } from "@/lib/types";
import { addDaysISO } from "@/lib/focus";

const systems = (
  buildingId: string,
  rows: Array<Omit<BuildingSystem, "id" | "buildingId">>,
): BuildingSystem[] => rows.map((row, index) => ({
  ...row,
  id: `${buildingId}-sys-${index + 1}`,
  buildingId,
}));

const standardSystems = (buildingId: string): BuildingSystem[] => systems(buildingId, [
  { name: "Domestic water", kind: "Plumbing", location: "Cellar pump room", vendor: "Aqua Systems NY", state: "healthy", health: 92, lastService: addDaysISO(-42), nextService: addDaysISO(48), signal: "Pressure and runtime are within baseline." },
  { name: "Fire alarm", kind: "Life safety", location: "Command panel", vendor: "SecureLife Fire", state: "healthy", health: 96, lastService: addDaysISO(-31), nextService: addDaysISO(59), signal: "Panel clear. No supervisory events." },
  { name: "Roof and drains", kind: "Envelope", location: "Roof", vendor: "Skyline Restoration", state: "watch", health: 78, lastService: addDaysISO(-75), nextService: addDaysISO(14), signal: "Seasonal inspection due within two weeks." },
  { name: "Heating plant", kind: "HVAC", location: "Mechanical room", vendor: "Northeast Mechanical", state: "healthy", health: 89, lastService: addDaysISO(-26), nextService: addDaysISO(64), signal: "No active faults. Efficiency stable." },
]);

export const BUILDING_SYSTEMS: BuildingSystem[] = [
  ...standardSystems("b1"),
  ...systems("b2", [
    { name: "Elevator bank", kind: "Vertical transport", location: "Cars A and B", vendor: "Otis Elevator", state: "risk", health: 42, lastService: addDaysISO(-1), nextService: addDaysISO(0), openTicketId: "T-4801", signal: "Car B fault recurrence exceeds baseline by 4.2x." },
    { name: "Domestic water", kind: "Plumbing", location: "Cellar pump room", vendor: "Aqua Systems NY", state: "healthy", health: 91, lastService: addDaysISO(-38), nextService: addDaysISO(52), signal: "Pressure and runtime are within baseline." },
    { name: "Fire alarm", kind: "Life safety", location: "Command panel", vendor: "SecureLife Fire", state: "healthy", health: 97, lastService: addDaysISO(-19), nextService: addDaysISO(71), signal: "Panel clear. No supervisory events." },
    { name: "Cooling towers", kind: "HVAC", location: "Roof", vendor: "Northeast Mechanical", state: "watch", health: 74, lastService: addDaysISO(-52), nextService: addDaysISO(9), signal: "Approaching seasonal service window." },
  ]),
  ...standardSystems("b3"),
  ...systems("b4", [
    { name: "Heating plant", kind: "HVAC", location: "Boiler room", vendor: "Cambridge & Leach", state: "watch", health: 68, lastService: addDaysISO(-64), nextService: addDaysISO(7), signal: "Runtime is 11% above the seasonal peer baseline." },
    { name: "Domestic water", kind: "Plumbing", location: "Cellar pump room", vendor: "Aqua Systems NY", state: "healthy", health: 88, lastService: addDaysISO(-30), nextService: addDaysISO(60), signal: "Pressure and runtime are within baseline." },
    { name: "Fire alarm", kind: "Life safety", location: "Command panel", vendor: "SecureLife Fire", state: "healthy", health: 95, lastService: addDaysISO(-22), nextService: addDaysISO(68), signal: "Panel clear. No supervisory events." },
    { name: "Roof and drains", kind: "Envelope", location: "Roof", vendor: "Skyline Restoration", state: "healthy", health: 86, lastService: addDaysISO(-44), nextService: addDaysISO(46), signal: "No active moisture or drainage alerts." },
  ]),
  ...standardSystems("b5"),
  ...standardSystems("b6"),
  ...standardSystems("b7"),
  ...standardSystems("b8"),
];

const recordSet = (buildingId: string, owner: string): BuildingRecord[] => [
  { id: `${buildingId}-rec-1`, buildingId, kind: "Insurance", title: "Master property policy", status: buildingId === "b1" ? "Due soon" : "Current", due: buildingId === "b1" ? "2026-06-30" : addDaysISO(180), owner },
  { id: `${buildingId}-rec-2`, buildingId, kind: "Inspection", title: "Annual fire inspection", status: buildingId === "b7" ? "Needs review" : "Current", due: addDaysISO(buildingId === "b7" ? 12 : 95), owner: "cait" },
  { id: `${buildingId}-rec-3`, buildingId, kind: "Contract", title: "Building systems service agreements", status: "Current", due: addDaysISO(220), owner },
  { id: `${buildingId}-rec-4`, buildingId, kind: "Financial", title: "Monthly operating package", status: buildingId === "b4" ? "Needs review" : "Current", due: addDaysISO(8), owner: "cait" },
  { id: `${buildingId}-rec-5`, buildingId, kind: "Governance", title: "Board minutes and resolutions", status: buildingId === "b6" ? "Due soon" : "Current", due: addDaysISO(buildingId === "b6" ? 5 : 35), owner },
];

export const BUILDING_RECORDS: BuildingRecord[] = [
  ...recordSet("b1", "gidi"),
  ...recordSet("b2", "gidi"),
  ...recordSet("b3", "gidi"),
  ...recordSet("b4", "gidi"),
  ...recordSet("b5", "maura"),
  ...recordSet("b6", "jess"),
  ...recordSet("b7", "maura"),
  ...recordSet("b8", "caro"),
];

const filesFor = (buildingId: string, ticketId?: string): BuildingFile[] => [
  { id: `${buildingId}-file-plan`, buildingId, name: "Master floor plans.pdf", kind: "Floor plan", area: "All floors", updatedAt: addDaysISO(-64), updatedBy: "cait", size: "18.4 MB" },
  { id: `${buildingId}-file-mech`, buildingId, name: "Mechanical rooms photo set", kind: "Photo set", area: "Cellar and roof", updatedAt: addDaysISO(-12), updatedBy: "luke", size: "42 photos" },
  { id: `${buildingId}-file-access`, buildingId, name: "Access and key map.pdf", kind: "Access", area: "Service entrances", updatedAt: addDaysISO(-21), updatedBy: "gidi", size: "2.1 MB" },
  { id: `${buildingId}-file-tour`, buildingId, name: "Full building walkthrough.mp4", kind: "Video", area: "Lobby to roof", updatedAt: addDaysISO(-9), updatedBy: "luke", size: "18:42" },
  { id: `${buildingId}-file-manual`, buildingId, name: "Critical equipment manuals.zip", kind: "Manual", area: "Building systems", updatedAt: addDaysISO(-102), updatedBy: "cait", size: "76.8 MB" },
  { id: `${buildingId}-file-report`, buildingId, name: ticketId ? `${ticketId} field report.pdf` : "Quarterly building condition report.pdf", kind: "Report", area: ticketId ? "Active issue area" : "Building-wide", updatedAt: addDaysISO(-2), updatedBy: "luke", size: "4.7 MB", relatedTicketId: ticketId },
];

export const BUILDING_FILES: BuildingFile[] = [
  ...filesFor("b1", "T-4790"),
  ...filesFor("b2", "T-4801"),
  ...filesFor("b3", "T-4779"),
  ...filesFor("b4", "T-4799"),
  ...filesFor("b5", "T-4795"),
  ...filesFor("b6", "T-4782"),
  ...filesFor("b7", "T-4788"),
  ...filesFor("b8"),
];

const visitsFor = (buildingId: string, lead: string, superName: string, ticketId?: string): SiteVisit[] => [
  {
    id: `${buildingId}-visit-1`, buildingId, purpose: ticketId ? "Vendor walk" : "Building walkthrough",
    title: ticketId ? "Meet vendor and walk active issue" : "Quarterly whole-building walkthrough",
    status: "Scheduled", startsAt: `${addDaysISO(2)}T10:00`, lead,
    attendees: [superName, ticketId ? "Service vendor" : "Board representative"],
    areas: ticketId ? ["Issue location", "Mechanical room", "Service access"] : ["Lobby", "Common floors", "Cellar", "Roof"],
    agenda: ["Confirm access route", "Photograph current condition", "Mark equipment and shutoffs", "Agree next actions onsite"],
    fileIds: [`${buildingId}-file-plan`, `${buildingId}-file-access`], relatedTicketId: ticketId,
  },
  {
    id: `${buildingId}-visit-2`, buildingId, purpose: "Super meeting",
    title: "Monthly PM and superintendent building review",
    status: "Completed", startsAt: `${addDaysISO(-8)}T09:30`, lead,
    attendees: [superName], areas: ["Front desk", "Package area", "Cellar", "Roof"],
    agenda: ["Review recurring resident issues", "Walk open maintenance items", "Confirm upcoming vendor access"],
    notes: "Walk completed. Access map and mechanical-room photos refreshed.",
    fileIds: [`${buildingId}-file-mech`, `${buildingId}-file-access`],
  },
  {
    id: `${buildingId}-visit-3`, buildingId, purpose: "Inspection",
    title: "Life-safety and building condition walkthrough",
    status: buildingId === "b7" ? "Needs follow-up" : "Completed", startsAt: `${addDaysISO(-27)}T13:00`, lead: "cait",
    attendees: [superName, "SecureLife Fire"], areas: ["Fire command panel", "Stairs", "Roof", "Cellar"],
    agenda: ["Verify inspection readiness", "Photograph deficiencies", "Confirm filing responsibility"],
    notes: buildingId === "b7" ? "Follow-up required for two corridor devices." : "No material deficiencies noted.",
    fileIds: [`${buildingId}-file-report`, `${buildingId}-file-mech`],
  },
];

export const SITE_VISITS: SiteVisit[] = [
  ...visitsFor("b1", "gidi", "Frank Mercer", "T-4790"),
  ...visitsFor("b2", "gidi", "Joel Petrov", "T-4801"),
  ...visitsFor("b3", "gidi", "Tony Calabrese", "T-4779"),
  ...visitsFor("b4", "gidi", "Mike O'Shea", "T-4799"),
  ...visitsFor("b5", "maura", "Hector Cruz", "T-4795"),
  ...visitsFor("b6", "jess", "Vince Marino", "T-4782"),
  ...visitsFor("b7", "maura", "Walt Friedman", "T-4788"),
  ...visitsFor("b8", "caro", "Sergio Bianchi"),
];

const changesFor = (buildingId: string, ticketId?: string): BuildingChange[] => [
  { id: `${buildingId}-chg-1`, buildingId, title: "Service access and key map updated", area: "Cellar and roof access", changedAt: addDaysISO(-8), changedBy: "luke", detail: "Verified key tags, lockbox location, and vendor entry route with the superintendent.", fileIds: [`${buildingId}-file-access`] },
  { id: `${buildingId}-chg-2`, buildingId, title: ticketId ? "Active issue location documented" : "Mechanical room labels refreshed", area: ticketId ? "Issue area" : "Mechanical rooms", changedAt: addDaysISO(-2), changedBy: "luke", detail: ticketId ? "Added current condition photos, equipment label, and approach path for the active ticket." : "Replaced faded equipment labels and updated the photo index.", fileIds: [`${buildingId}-file-report`, `${buildingId}-file-mech`], relatedTicketId: ticketId },
  { id: `${buildingId}-chg-3`, buildingId, title: "Virtual walkthrough refreshed", area: "Lobby through roof", changedAt: addDaysISO(-9), changedBy: "gidi", detail: "Updated the building tour after the quarterly PM walkthrough.", fileIds: [`${buildingId}-file-tour`] },
];

export const BUILDING_CHANGES: BuildingChange[] = [
  ...changesFor("b1", "T-4790"), ...changesFor("b2", "T-4801"),
  ...changesFor("b3", "T-4779"), ...changesFor("b4", "T-4799"),
  ...changesFor("b5", "T-4795"), ...changesFor("b6", "T-4782"),
  ...changesFor("b7", "T-4788"), ...changesFor("b8"),
];

const tourFor = (buildingId: string, ticketId?: string): BuildingTourArea[] => [
  { id: `${buildingId}-tour-lobby`, buildingId, floor: "1", name: "Lobby and front desk", description: "Primary resident entry, front desk, package area, and main elevator bank.", viewpoint: "Standing inside the main entrance facing the elevator lobby.", accent: "#38bdf8", hotspots: [
    { id: "front-desk", label: "Front desk", kind: "access", x: 22, y: 58, detail: "Building keys, visitor controls, and vendor sign-in." },
    { id: "elevator-bank", label: "Elevator bank", kind: ticketId === "T-4801" ? "issue" : "equipment", x: 72, y: 43, detail: ticketId === "T-4801" ? "Car B is linked to active ticket T-4801." : "Main passenger elevator bank.", relatedTicketId: ticketId === "T-4801" ? ticketId : undefined },
  ] },
  { id: `${buildingId}-tour-cellar`, buildingId, floor: "B1", name: "Cellar and mechanical rooms", description: "Boiler, domestic water, electrical, gas, and service access.", viewpoint: "At the cellar corridor junction with all mechanical rooms visible.", accent: "#f59e0b", hotspots: [
    { id: "water-main", label: "Water main shutoff", kind: "equipment", x: 28, y: 48, detail: "Primary domestic-water isolation point." },
    { id: "boiler-room", label: "Boiler room", kind: "equipment", x: 68, y: 36, detail: "Heating plant, controls, and service clearances." },
    { id: "access-file", label: "Access map", kind: "document", x: 52, y: 74, detail: "Open the current service-entry and key map.", fileId: `${buildingId}-file-access` },
  ] },
  { id: `${buildingId}-tour-typical`, buildingId, floor: "8", name: "Typical residential floor", description: "Apartment lines, elevator landing, stairs, risers, and utility closets.", viewpoint: "At the elevator landing looking toward the north stair.", accent: "#a855f7", hotspots: [
    { id: "riser", label: "Plumbing riser", kind: "equipment", x: 74, y: 48, detail: "Wet-wall riser serving the C and D lines." },
    { id: "stair", label: "North stair", kind: "access", x: 24, y: 38, detail: "Primary service route when the elevator is unavailable." },
  ] },
  { id: `${buildingId}-tour-roof`, buildingId, floor: "R", name: "Roof and bulkhead", description: "Roof drains, cooling equipment, elevator bulkhead, and facade access.", viewpoint: "At the roof entrance facing north toward the equipment field.", accent: "#22c55e", hotspots: [
    { id: "roof-drains", label: "Primary roof drains", kind: ticketId === "T-4779" ? "issue" : "equipment", x: 26, y: 66, detail: ticketId === "T-4779" ? "Drain-clearing scope linked to T-4779." : "Main north and east drainage points.", relatedTicketId: ticketId === "T-4779" ? ticketId : undefined },
    { id: "bulkhead", label: "Elevator bulkhead", kind: "equipment", x: 70, y: 35, detail: "Controller and overhead machinery access." },
  ] },
];

export const BUILDING_TOUR_AREAS: BuildingTourArea[] = [
  ...tourFor("b1", "T-4790"), ...tourFor("b2", "T-4801"),
  ...tourFor("b3", "T-4779"), ...tourFor("b4", "T-4799"),
  ...tourFor("b5", "T-4795"), ...tourFor("b6", "T-4782"),
  ...tourFor("b7", "T-4788"), ...tourFor("b8"),
];
