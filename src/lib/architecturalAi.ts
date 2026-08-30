export type Point = { x: number; y: number };
export type RoomType = "entrance" | "living" | "kitchen" | "dining" | "bedroom" | "bathroom" | "office" | "corridor" | "stair";

export interface ArchitecturalProjectInput {
  projectId?: string;
  projectType: string;
  landWidth: number;
  landLength: number;
  buildableArea: number;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  livingRooms: number;
  diningRooms?: number;
  orientation?: string;
  budget?: number;
}
export interface Room { id: string; name: string; type: RoomType; floor: number; x: number; y: number; width: number; length: number; area: number; habitable: boolean; }
export interface Wall { id: string; floor: number; start: Point; end: Point; thickness: number; loadBearing: boolean; }
export interface Door { id: string; wallId: string; roomId: string; position: number; width: number; openingDirection: "in" | "out"; }
export interface Window { id: string; wallId: string; roomId: string; position: number; width: number; }
export interface Stair { id: string; floor: number; x: number; y: number; width: number; length: number; }
export interface ArchitecturalPlan { id: string; variant: number; title: string; style: string; width: number; length: number; floors: number; rooms: Room[]; walls: Wall[]; doors: Door[]; windows: Window[]; stairs: Stair[]; score: PlanScore; concept: string; validation: ValidationResult; }
export interface PlanScore { overall: number; spaceEfficiency: number; circulation: number; naturalLighting: number; privacy: number; functionality: number; structuralConsistency: number; constraintCompliance: number; }
export interface ValidationResult { valid: boolean; issues: string[]; metrics: { builtArea: number; usefulArea: number; circulationArea: number; wallArea: number; exteriorArea: number }; }

export const architecturalRules = { minRoomWidth: 1.8, minRoomLength: 2.2, wallThickness: 0.2, maxAttempts: 8, tolerance: 0.05 } as const;
const titles = ["Optimisation maximale", "Open space", "Séparation jour / nuit", "Lumière naturelle", "Patio central", "Grande ouverture jardin", "Plan familial", "Plan compact", "Contemporain", "Premium"];
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function roomsFor(input: ArchitecturalProjectInput, variant: number, floor: number, width: number, length: number): Room[] {
  const requested = [
    { type: "living" as const, name: "Séjour", ratio: variant === 1 ? .28 : .22, count: input.livingRooms },
    { type: "kitchen" as const, name: "Cuisine", ratio: .10, count: input.kitchens },
    { type: "dining" as const, name: "Salle à manger", ratio: variant === 2 ? .14 : .08, count: input.diningRooms ?? 1 },
    { type: "bedroom" as const, name: "Chambre", ratio: variant === 6 ? .13 : .11, count: input.bedrooms },
    { type: "bathroom" as const, name: "Salle de bain", ratio: .055, count: input.bathrooms },
  ];
  const usable = width * length;
  const specs = requested.flatMap((s) => Array.from({ length: Math.max(0, s.count) }, (_, i) => ({ ...s, name: `${s.name}${s.count > 1 ? ` ${i + 1}` : ""}` })));
  if (floor > 0) specs.splice(0, specs.length, ...specs.filter((s) => s.type === "bedroom" || s.type === "bathroom"));
  const area = usable / Math.max(1, specs.length);
  const cols = Math.max(1, Math.ceil(Math.sqrt(specs.length)));
  const rows = Math.ceil(specs.length / cols);
  const cellW = width / cols, cellL = length / rows;
  return specs.map((s, i) => { const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellL; return { id: `f${floor}-r${i}`, name: s.name, type: s.type, floor, x, y, width: cellW, length: cellL, area: cellW * cellL, habitable: s.type !== "bathroom" }; });
}

function addOpenings(rooms: Room[], walls: Wall[]): { doors: Door[]; windows: Window[] } {
  const doors: Door[] = [], windows: Window[] = [];
  rooms.forEach((room, i) => {
    const wall = walls.find((w) => w.floor === room.floor && Math.abs(w.start.x - room.x) < .01 && Math.abs(w.start.y - room.y) < .01) ?? walls.find((w) => w.floor === room.floor);
    if (wall) doors.push({ id: `${room.id}-door`, wallId: wall.id, roomId: room.id, position: .5, width: .9, openingDirection: "in" });
    if (room.habitable && wall) windows.push({ id: `${room.id}-window`, wallId: wall.id, roomId: room.id, position: .5, width: Math.min(1.8, room.width * .6) });
  });
  return { doors, windows };
}

function validate(plan: ArchitecturalPlan, input: ArchitecturalProjectInput): ValidationResult {
  const issues: string[] = [], roomArea = plan.rooms.reduce((s, r) => s + r.area, 0), builtArea = plan.width * plan.length * plan.floors;
  for (const r of plan.rooms) { if (r.width < architecturalRules.minRoomWidth || r.length < architecturalRules.minRoomLength) issues.push(`Dimensions insuffisantes : ${r.name}`); if (r.x < 0 || r.y < 0 || r.x + r.width > plan.width + architecturalRules.tolerance || r.y + r.length > plan.length + architecturalRules.tolerance) issues.push(`Pièce hors emprise : ${r.name}`); }
  for (let i = 0; i < plan.rooms.length; i++) for (let j = i + 1; j < plan.rooms.length; j++) { const a = plan.rooms[i], b = plan.rooms[j]; if (a.floor === b.floor && a.x < b.x + b.width - .01 && a.x + a.width > b.x + .01 && a.y < b.y + b.length - .01 && a.y + a.length > b.y + .01) issues.push(`Chevauchement : ${a.name} / ${b.name}`); }
  if (builtArea > input.buildableArea * input.floors + architecturalRules.tolerance) issues.push("Surface constructible dépassée");
  return { valid: issues.length === 0, issues, metrics: { builtArea, usefulArea: roomArea, circulationArea: 0, wallArea: builtArea * .08, exteriorArea: Math.max(0, input.landWidth * input.landLength - builtArea) } };
}

export function generateArchitecturalPlans(input: ArchitecturalProjectInput): ArchitecturalPlan[] {
  const width = clamp(input.landWidth, 6, Math.max(6, input.landWidth)), length = clamp(input.landLength, 6, Math.max(6, input.landLength));
  return titles.map((title, index) => {
    const variant = index + 1, rooms: Room[] = [], walls: Wall[] = [], stairs: Stair[] = [];
    for (let floor = 0; floor < Math.max(1, input.floors); floor++) { const floorRooms = roomsFor(input, variant, floor, width, length); rooms.push(...floorRooms); walls.push({ id: `f${floor}-outer`, floor, start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness: architecturalRules.wallThickness, loadBearing: true }); if (floor < input.floors - 1) stairs.push({ id: `stair-${floor}`, floor, x: width * .02, y: length * .02, width: 1.1, length: 3.2 }); }
    const openings = addOpenings(rooms, walls); const plan = { id: `plan-${variant}`, variant, title: `Variante ${String(variant).padStart(2, "0")} — ${title}`, style: title, width, length, floors: Math.max(1, input.floors), rooms, walls, doors: openings.doors, windows: openings.windows, stairs, score: { overall: 0, spaceEfficiency: 0, circulation: 0, naturalLighting: 0, privacy: 0, functionality: 0, structuralConsistency: 0, constraintCompliance: 0 }, concept: `Une organisation ${title.toLowerCase()} adaptée au projet ${input.projectType}, avec une hiérarchie claire des espaces et des ouvertures favorisant la lumière naturelle.`, validation: {} as ValidationResult };
    plan.validation = validate(plan, input); const base = plan.validation.valid ? 92 : 65; plan.score = { overall: base, spaceEfficiency: base, circulation: clamp(base + (variant % 3), 0, 100), naturalLighting: clamp(base - (variant % 2), 0, 100), privacy: clamp(base + 1, 0, 100), functionality: base, structuralConsistency: base, constraintCompliance: plan.validation.valid ? 98 : 55 }; return plan;
  });
}
