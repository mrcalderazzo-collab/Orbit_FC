import type { BuildingRecord, BuildingSystem } from "@/lib/types";
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
