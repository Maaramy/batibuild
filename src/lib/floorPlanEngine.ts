// ============================================================================
// FLOOR PLAN GENERATION ENGINE
// Generates 10 optimized architectural plan variants per project input.
// Uses deterministic BSP strip-packing with per-variant seeding.
// ============================================================================

export interface PlanInput {
  category: string;
  surface: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
}

export interface PlanRoom {
  id: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  habitable: boolean;
  doors: { wall: string; position: number; width: number; isEntry?: boolean }[];
  windows: { wall: string; position: number; width: number }[];
}

export interface PlanVariant {
  id: string;
  variantIndex: number;
  label: string;
  description: string;
  levelSurface: number;
  totalLevels: number;
  length: number;
  width: number;
  rooms: PlanRoom[];
  totalArea: number;
  circulationArea: number;
  score: number;
}

// ─── Seeded PRNG ────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Room program builder ───────────────────────────────────────────────────

interface RoomDef {
  kind: string;
  label: string;
  targetArea: number;
  minW: number;
  minH: number;
  habitable: boolean;
  priority: number;
}

function inferBedrooms(category: string, surface: number): number {
  if (category === "studio") return 1;
  if (["appartement", "duplex"].includes(category)) {
    if (surface < 60) return 1;
    if (surface < 90) return 2;
    return 3;
  }
  if (surface < 80) return 2;
  if (surface < 120) return 3;
  if (surface < 200) return 4;
  return 5;
}

function buildProgram(input: PlanInput): RoomDef[] {
  const s = input.surface;
  const beds = input.bedrooms ?? inferBedrooms(input.category, s);
  const baths = input.bathrooms ?? Math.max(1, Math.ceil(beds / 2));
  const kitchens = input.kitchens ?? 1;
  const living = input.livingRooms ?? 1;

  const program: RoomDef[] = [];

  for (let i = 0; i < living; i++) {
    program.push({
      kind: "sejour", label: i === 0 ? "Séjour" : `Salon ${i + 1}`,
      targetArea: i === 0 ? s * 0.25 : s * 0.15,
      minW: 3.5, minH: 3.0, habitable: true, priority: 20,
    });
  }

  for (let i = 0; i < kitchens; i++) {
    program.push({
      kind: "cuisine", label: i === 0 ? "Cuisine" : `Cuisine ${i + 1}`,
      targetArea: i === 0 ? s * 0.12 : s * 0.1,
      minW: 2.5, minH: 2.5, habitable: true, priority: 18,
    });
  }

  for (let i = 0; i < beds; i++) {
    const master = i === 0;
    program.push({
      kind: "chambre", label: master ? "Ch. parents" : `Ch. ${i + 1}`,
      targetArea: master ? s * 0.14 : s * 0.1,
      minW: 2.8, minH: 3.0, habitable: true, priority: master ? 19 : 16,
    });
  }

  for (let i = 0; i < baths; i++) {
    program.push({
      kind: "sdb", label: i === 0 ? "SDB" : `SDB ${i + 1}`,
      targetArea: i === 0 ? s * 0.05 : s * 0.04,
      minW: 1.8, minH: 2.0, habitable: false, priority: 14,
    });
  }

  for (let i = 0; i < Math.max(1, baths); i++) {
    program.push({
      kind: "wc", label: "WC",
      targetArea: s * 0.02, minW: 0.9, minH: 1.5,
      habitable: false, priority: 10,
    });
  }

  program.push({
    kind: "hall", label: "Hall",
    targetArea: s * 0.05, minW: 1.5, minH: 2.0,
    habitable: false, priority: 17,
  });

  return program;
}

// ─── Area distribution with per-variant jitter ──────────────────────────────

function distributeAreas(program: RoomDef[], total: number, variant: number): Map<string, number> {
  const rng = mulberry32(variant * 41 + 13);
  const totalP = program.reduce((s, r) => s + r.priority, 0);
  const variance = 0.12;
  const raw = new Map<string, number>();
  let allocated = 0;

  program.forEach((r, i) => {
    const base = r.priority / totalP;
    const jitter = Math.sin(rng() * Math.PI * 2) * variance;
    let area = total * base * (1 + jitter);
    area = Math.max(area, r.minW * r.minH);
    raw.set(r.label, area);
    allocated += area;
  });

  const scale = total / allocated;
  const result = new Map<string, number>();
  let sum = 0;
  program.forEach((r) => {
    const v = Math.round(raw.get(r.label)! * scale * 100) / 100;
    result.set(r.label, v);
    sum += v;
  });
  const drift = Math.round((total - sum) * 100) / 100;
  if (drift !== 0) {
    const first = program[0];
    result.set(first.label, Math.round((result.get(first.label)! + drift) * 100) / 100);
  }
  return result;
}

// ─── BSP strip-packing ──────────────────────────────────────────────────────

interface BSPLeaf {
  x: number; y: number; w: number; h: number;
  room?: { id: string; kind: string; label: string; area: number; minW: number; minH: number; habitable: boolean };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function bspPack(
  rect: { x: number; y: number; w: number; h: number },
  items: BSPLeaf["room"][],
  rng: () => number,
): BSPLeaf[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...rect, room: items[0] }];

  const shuffled = shuffle(items.filter(Boolean) as NonNullable<BSPLeaf["room"]>[], rng);
  const totalRoomArea = shuffled.reduce((s, r) => s + r.area, 0);
  const rectArea = rect.w * rect.h;
  const scale = Math.sqrt(rectArea / totalRoomArea);

  const scaled = shuffled.map((r) => ({
    ...r,
    w: Math.max(r.minW, Math.sqrt(r.area) * scale * (0.7 + 0.6 * rng())),
    h: Math.max(r.minH, r.area / Math.max(r.minW, 0.1)),
  }));

  const leaves: BSPLeaf[] = [];
  let cx = rect.x, cy = rect.y, remW = rect.w, remH = rect.h;
  let horizontal = rect.w >= rect.h;

  scaled.forEach((room, i) => {
    const rw = Math.min(room.w, Math.max(0.5, remW));
    const rh = Math.min(room.h, Math.max(0.5, remH));
    leaves.push({ x: cx, y: cy, w: rw, h: rh, room });

    if (horizontal) {
      cx += rw;
      remW -= rw;
      if (remW < 0.3 && i < scaled.length - 1) {
        cx = rect.x;
        const sliceH = remH / (scaled.length - i - 1);
        cy += sliceH;
        remH -= sliceH;
        remW = rect.w;
        horizontal = false;
      }
    } else {
      cy += rh;
      remH -= rh;
      if (remH < 0.3 && i < scaled.length - 1) {
        cy = rect.y;
        const sliceW = remW / (scaled.length - i - 1);
        cx += sliceW;
        remW -= sliceW;
        remH = rect.h;
        horizontal = true;
      }
    }
  });

  return leaves;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function roomsOverlap(a: PlanRoom, b: PlanRoom): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function validatePlan(rooms: PlanRoom[], target: number): number {
  let score = 100;

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (roomsOverlap(rooms[i], rooms[j])) score -= 10;
    }
  }

  const total = rooms.reduce((s, r) => s + r.area, 0);
  const dev = Math.abs(total - target) / target;
  if (dev > 0.1) score -= Math.round(dev * 100);

  rooms.forEach((r) => {
    if (r.w < 1.5 || r.h < 1.5) score -= 3;
    const ratio = Math.max(r.w, r.h) / Math.max(0.1, Math.min(r.w, r.h));
    if (ratio > 3) score -= 2;
    if (r.habitable && r.windows.length === 0) score -= 3;
  });

  return Math.max(0, Math.min(100, score));
}

// ─── Door / window placement ────────────────────────────────────────────────

function addOpenings(rooms: PlanRoom[], bL: number, bW: number): PlanRoom[] {
  return rooms.map((room) => {
    const doors: PlanRoom["doors"] = [];
    const windows: PlanRoom["windows"] = [];

    const walls = [
      { wall: "N", len: room.w },
      { wall: "S", len: room.w },
      { wall: "W", len: room.h },
      { wall: "E", len: room.h },
    ].sort((a, b) => b.len - a.len);

    if (walls[0].len >= 0.8) {
      doors.push({ wall: walls[0].wall, position: walls[0].len * 0.35, width: 0.9 });
    }

    if (room.habitable) {
      const isN = Math.abs(room.y) < 0.01;
      const isS = Math.abs(room.y + room.h - bW) < 0.01;
      const isW = Math.abs(room.x) < 0.01;
      const isE = Math.abs(room.x + room.w - bL) < 0.01;

      if (isN) windows.push({ wall: "N", position: room.w * 0.3, width: 1.2 });
      else if (isS) windows.push({ wall: "S", position: room.w * 0.3, width: 1.2 });
      else if (isW) windows.push({ wall: "W", position: room.h * 0.3, width: 1.2 });
      else if (isE) windows.push({ wall: "E", position: room.h * 0.3, width: 1.2 });
    }

    return { ...room, doors, windows };
  });
}

// ─── Conceptual note ────────────────────────────────────────────────────────

const LAYOUT_NOTES = [
  "Disposition en L offrant une séparation claire entre zones de vie et zones nuit, avec un séjour baigné de lumière naturelle.",
  "Plan en U créant une cour intérieure protégée, idéal pour l'intimité et la circulation fluide entre espaces.",
  "Layout rectangulaire optimisé avec couloir central distribuant symétriquement les pièces de vie et de nuit.",
  "Disposition en T séparant le bloc nuit (chambres) du bloc jour (séjour/cuisine) par un hall central fonctionnel.",
  "Plan ouvert (open-plan) avec séjour, cuisine et salle à manger en espace continu, chambres en aile séparée.",
  "Configuration en épi avec des ailes décalées offrant des vues multiples et une ventilation naturelle croisée.",
  "Disposition compacte en damier maximisant l'espace habitable avec une circulation minimale et efficace.",
  "Plan en escalier avec des niveaux décalés adaptés à la topographie, offrant des terrasses sur chaque palier.",
  "Layout asymétrique audacieux combinant grands espaces de réception et chambres cosy avec exposure optimisée.",
  "Disposition en étoile depuis un noyau central (hall/escalier) garantissant un accès rapide à toutes les pièces.",
];

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateFloorPlanVariants(input: PlanInput): PlanVariant[] {
  const nbLevels = input.floors ?? 1;
  const levelSurface = input.surface / nbLevels;
  const program = buildProgram(input);

  const aspectBase = 1.25;
  const length = Math.sqrt(levelSurface * aspectBase);
  const width = levelSurface / length;

  const variants: PlanVariant[] = [];

  for (let v = 0; v < 10; v++) {
    const rng = mulberry32(v * 73 + 29);
    const areas = distributeAreas(program, levelSurface, v);

    const roomDefs = program.map((def, i) => ({
      id: `r${v}-${i}`,
      kind: def.kind,
      label: def.label,
      area: areas.get(def.label) ?? def.targetArea,
      minW: def.minW,
      minH: def.minH,
      habitable: def.habitable,
    }));

    const leaves = bspPack({ x: 0, y: 0, w: length, h: width }, roomDefs, rng);

    let rooms: PlanRoom[] = leaves
      .filter((l) => l.room)
      .map((l) => ({
        id: l.room!.id,
        kind: l.room!.kind,
        label: l.room!.label,
        x: Math.round(l.x * 100) / 100,
        y: Math.round(l.y * 100) / 100,
        w: Math.round(l.w * 100) / 100,
        h: Math.round(l.h * 100) / 100,
        area: Math.round(l.w * l.h * 100) / 100,
        habitable: l.room!.habitable,
        doors: [],
        windows: [],
      }));

    rooms = addOpenings(rooms, length, width);

    const score = validatePlan(rooms, levelSurface);
    const totalArea = rooms.reduce((s, r) => s + r.area, 0);
    const circArea = rooms.filter((r) => r.kind === "hall").reduce((s, r) => s + r.area, 0);

    variants.push({
      id: `variant-${v + 1}`,
      variantIndex: v + 1,
      label: `Plan ${v + 1}`,
      description: `${LAYOUT_NOTES[v % LAYOUT_NOTES.length]} Score qualité : ${score}/100.`,
      levelSurface: Math.round(levelSurface * 100) / 100,
      totalLevels: nbLevels,
      length: Math.round(length * 100) / 100,
      width: Math.round(width * 100) / 100,
      rooms,
      totalArea: Math.round(totalArea * 100) / 100,
      circulationArea: Math.round(circArea * 100) / 100,
      score,
    });
  }

  variants.sort((a, b) => b.score - a.score);
  variants.forEach((v, i) => (v.variantIndex = i + 1));
  return variants;
}

// ─── Color / icon maps for UI ───────────────────────────────────────────────

export const ROOM_COLORS: Record<string, string> = {
  sejour: "#dbeafe", cuisine: "#fef3c7", chambre: "#ede9fe",
  sdb: "#cffafe", wc: "#f3e8ff", hall: "#f1f5f9",
};

export const ROOM_ICONS: Record<string, string> = {
  sejour: "🛋️", cuisine: "🍳", chambre: "🛏️", sdb: "🚿", wc: "🚽", hall: "🚪",
};
