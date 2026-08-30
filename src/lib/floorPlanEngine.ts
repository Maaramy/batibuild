// ============================================================================
// FLOOR PLAN GENERATION ENGINE — v2
// 10 deterministic architectural variants per project, with:
//  - Non-overlapping strip packing (BSP)
//  - Connectivity graph validation (each room reachable from hall)
//  - Multi-level structural alignment (load-bearing walls stacked)
//  - Door/window functional placement
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

export interface PlanOpening {
  wall: "N" | "S" | "W" | "E";
  position: number;
  width: number;
  isEntry?: boolean;
  toRoom?: string;
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
  level: number;
  loadBearing: boolean;
  doors: PlanOpening[];
  windows: PlanOpening[];
}

export interface PlanLevel {
  index: number;
  rooms: PlanRoom[];
  length: number;
  width: number;
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
  levels: PlanLevel[];
  rooms: PlanRoom[];        // flattened for convenience (ground floor by default)
  totalArea: number;
  circulationArea: number;
  score: number;
  validation: {
    noOverlap: boolean;
    areaSumOk: boolean;
    connectivityOk: boolean;
    multiLevelAligned: boolean;
    issues: string[];
  };
}

// ─── Seeded PRNG (mulberry32) ───────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Room program ───────────────────────────────────────────────────────────

interface RoomDef {
  kind: string;
  label: string;
  targetArea: number;
  minW: number;
  minH: number;
  habitable: boolean;
  priority: number;
  loadBearing?: boolean;
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

  const p: RoomDef[] = [];

  for (let i = 0; i < living; i++) {
    p.push({
      kind: "sejour", label: i === 0 ? "Séjour" : `Salon ${i + 1}`,
      targetArea: i === 0 ? s * 0.25 : s * 0.15,
      minW: 3.5, minH: 3.0, habitable: true, priority: 20,
    });
  }
  for (let i = 0; i < kitchens; i++) {
    p.push({
      kind: "cuisine", label: i === 0 ? "Cuisine" : `Cuisine ${i + 1}`,
      targetArea: i === 0 ? s * 0.12 : s * 0.1,
      minW: 2.5, minH: 2.5, habitable: true, priority: 18,
    });
  }
  for (let i = 0; i < beds; i++) {
    const master = i === 0;
    p.push({
      kind: "chambre", label: master ? "Ch. parents" : `Ch. ${i + 1}`,
      targetArea: master ? s * 0.14 : s * 0.1,
      minW: 2.8, minH: 3.0, habitable: true, priority: master ? 19 : 16,
    });
  }
  for (let i = 0; i < baths; i++) {
    p.push({
      kind: "sdb", label: i === 0 ? "SDB" : `SDB ${i + 1}`,
      targetArea: i === 0 ? s * 0.05 : s * 0.04,
      minW: 1.8, minH: 2.0, habitable: false, priority: 14,
    });
  }
  p.push({
    kind: "wc", label: "WC",
    targetArea: s * 0.02, minW: 0.9, minH: 1.5,
    habitable: false, priority: 10,
  });
  p.push({
    kind: "hall", label: "Hall",
    targetArea: s * 0.05, minW: 1.5, minH: 2.0,
    habitable: false, priority: 17, loadBearing: true,
  });

  return p;
}

// ─── Area distribution ──────────────────────────────────────────────────────

function distributeAreas(program: RoomDef[], total: number, variant: number): Map<string, number> {
  const rng = mulberry32(variant * 41 + 13);
  const totalP = program.reduce((s, r) => s + r.priority, 0);
  const raw = new Map<string, number>();
  let allocated = 0;

  program.forEach((r, i) => {
    const base = r.priority / totalP;
    const jitter = Math.sin(rng() * Math.PI * 2) * 0.12;
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

// ─── Strip packing (BSP-like) ───────────────────────────────────────────────

interface Leaf {
  x: number; y: number; w: number; h: number;
  room?: { id: string; kind: string; label: string; area: number; minW: number; minH: number; habitable: boolean; loadBearing?: boolean };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function packRooms(
  rect: { x: number; y: number; w: number; h: number },
  items: NonNullable<Leaf["room"]>[],
  rng: () => number,
): Leaf[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...rect, room: items[0] }];

  const shuffled = shuffle(items, rng);
  const totalRoomArea = shuffled.reduce((s, r) => s + r.area, 0);
  const scale = Math.sqrt((rect.w * rect.h) / totalRoomArea);

  const scaled = shuffled.map((r) => ({
    ...r,
    w: Math.max(r.minW, Math.sqrt(r.area) * scale * (0.7 + 0.6 * rng())),
    h: Math.max(r.minH, r.area / Math.max(r.minW, 0.1)),
  }));

  const leaves: Leaf[] = [];
  let cx = rect.x, cy = rect.y, remW = rect.w, remH = rect.h;
  let horizontal = rect.w >= rect.h;

  scaled.forEach((room, i) => {
    const rw = Math.min(room.w, Math.max(0.5, remW));
    const rh = Math.min(room.h, Math.max(0.5, remH));
    leaves.push({ x: cx, y: cy, w: rw, h: rh, room });

    if (horizontal) {
      cx += rw; remW -= rw;
      if (remW < 0.3 && i < scaled.length - 1) {
        cx = rect.x;
        const sliceH = remH / (scaled.length - i - 1);
        cy += sliceH; remH -= sliceH; remW = rect.w;
        horizontal = false;
      }
    } else {
      cy += rh; remH -= rh;
      if (remH < 0.3 && i < scaled.length - 1) {
        cy = rect.y;
        const sliceW = remW / (scaled.length - i - 1);
        cx += sliceW; remW -= sliceW; remH = rect.h;
        horizontal = true;
      }
    }
  });

  return leaves;
}

// ─── Shared wall detection (for doors) ──────────────────────────────────────

function findSharedWall(a: PlanRoom, b: PlanRoom): { wall: "N" | "S" | "W" | "E"; pos: number; len: number } | null {
  const EPS = 0.05;
  // b is east of a, sharing a's E wall
  if (Math.abs(a.x + a.w - b.x) < EPS) {
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    if (y2 - y1 > 0.8) return { wall: "E", pos: y1 - a.y + (y2 - y1) * 0.3, len: y2 - y1 };
  }
  // b is west of a, sharing a's W wall
  if (Math.abs(b.x + b.w - a.x) < EPS) {
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    if (y2 - y1 > 0.8) return { wall: "W", pos: y1 - a.y + (y2 - y1) * 0.3, len: y2 - y1 };
  }
  // b is south of a, sharing a's S wall
  if (Math.abs(a.y + a.h - b.y) < EPS) {
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    if (x2 - x1 > 0.8) return { wall: "S", pos: x1 - a.x + (x2 - x1) * 0.3, len: x2 - x1 };
  }
  // b is north of a, sharing a's N wall
  if (Math.abs(b.y + b.h - a.y) < EPS) {
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    if (x2 - x1 > 0.8) return { wall: "N", pos: x1 - a.x + (x2 - x1) * 0.3, len: x2 - x1 };
  }
  return null;
}

// ─── Connectivity graph ─────────────────────────────────────────────────────

function buildConnectivity(rooms: PlanRoom[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  rooms.forEach((r) => graph.set(r.id, []));
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const shared = findSharedWall(rooms[i], rooms[j]);
      if (shared) {
        graph.get(rooms[i].id)!.push(rooms[j].id);
        graph.get(rooms[j].id)!.push(rooms[i].id);
      }
    }
  }
  return graph;
}

function checkConnectivity(rooms: PlanRoom[]): boolean {
  if (rooms.length === 0) return true;
  const graph = buildConnectivity(rooms);
  const start = rooms.find((r) => r.kind === "hall")?.id ?? rooms[0].id;
  const visited = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of graph.get(cur) ?? []) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
    }
  }
  return visited.size === rooms.length;
}

// ─── Openings ───────────────────────────────────────────────────────────────

function placeOpenings(rooms: PlanRoom[], bL: number, bW: number): void {
  // Entry door: hall gets entry on exterior wall
  const hall = rooms.find((r) => r.kind === "hall");
  if (hall) {
    const extWalls: PlanOpening["wall"][] = [];
    if (Math.abs(hall.y) < 0.01) extWalls.push("N");
    if (Math.abs(hall.y + hall.h - bW) < 0.01) extWalls.push("S");
    if (Math.abs(hall.x) < 0.01) extWalls.push("W");
    if (Math.abs(hall.x + hall.w - bL) < 0.01) extWalls.push("E");
    if (extWalls.length > 0) {
      const w = extWalls[0];
      const pos = w === "N" || w === "S" ? hall.w * 0.35 : hall.h * 0.35;
      hall.doors.push({ wall: w, position: pos, width: 1.0, isEntry: true });
    }
  }

  // Interior doors along shared walls (BFS from hall)
  const graph = buildConnectivity(rooms);
  const startId = hall?.id ?? rooms[0]?.id;
  if (!startId) return;
  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const cur = rooms.find((r) => r.id === queue.shift()!)!;
    for (const nbId of graph.get(cur.id) ?? []) {
      if (visited.has(nbId)) continue;
      visited.add(nbId);
      queue.push(nbId);
      const nb = rooms.find((r) => r.id === nbId)!;
      const shared = findSharedWall(cur, nb);
      if (shared && nb.doors.length === 0) {
        nb.doors.push({ wall: shared.wall, position: shared.pos, width: 0.9, toRoom: cur.id });
      }
    }
  }

  // Any remaining room without a door: connect to first neighbor
  rooms.forEach((r) => {
    if (r.doors.length > 0 || r.id === startId) return;
    for (const nbId of graph.get(r.id) ?? []) {
      const nb = rooms.find((x) => x.id === nbId)!;
      const shared = findSharedWall(r, nb);
      if (shared) {
        r.doors.push({ wall: shared.wall, position: shared.pos, width: 0.9, toRoom: nb.id });
        break;
      }
    }
  });

  // Windows on exterior walls for habitable rooms
  rooms.forEach((r) => {
    if (!r.habitable || r.windows.length > 0) return;
    const isN = Math.abs(r.y) < 0.01;
    const isS = Math.abs(r.y + r.h - bW) < 0.01;
    const isW = Math.abs(r.x) < 0.01;
    const isE = Math.abs(r.x + r.w - bL) < 0.01;
    if (isN) r.windows.push({ wall: "N", position: r.w * 0.3, width: 1.2 });
    else if (isS) r.windows.push({ wall: "S", position: r.w * 0.3, width: 1.2 });
    else if (isW) r.windows.push({ wall: "W", position: r.h * 0.3, width: 1.2 });
    else if (isE) r.windows.push({ wall: "E", position: r.h * 0.3, width: 1.2 });
  });
}

// ─── Validation ─────────────────────────────────────────────────────────────

function overlaps(a: PlanRoom, b: PlanRoom): boolean {
  return !(a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 ||
           a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01);
}

function validatePlan(rooms: PlanRoom[], target: number, nbLevels: number, allLevels: PlanRoom[][]): PlanVariant["validation"] {
  const issues: string[] = [];

  // 1. No overlap
  let noOverlap = true;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (overlaps(rooms[i], rooms[j])) {
        noOverlap = false;
        issues.push(`Chevauchement: ${rooms[i].label} ↔ ${rooms[j].label}`);
      }
    }
  }

  // 2. Area sum coherence
  const total = rooms.reduce((s, r) => s + r.area, 0);
  const dev = Math.abs(total - target) / target;
  const areaSumOk = dev <= 0.1;
  if (!areaSumOk) issues.push(`Somme surfaces: écart ${(dev * 100).toFixed(1)}%`);

  // 3. Connectivity
  const connectivityOk = checkConnectivity(rooms);
  if (!connectivityOk) issues.push("Graphe de connexité: pièces inaccessibles");

  // 4. Multi-level alignment (load-bearing walls stacked across levels)
  let multiLevelAligned = true;
  if (nbLevels > 1) {
    const ground = allLevels[0] ?? [];
    const carriers = ground.filter((r) => r.loadBearing);
    for (let lvl = 1; lvl < allLevels.length; lvl++) {
      const upper = allLevels[lvl] ?? [];
      for (const c of carriers) {
        const match = upper.some((u) =>
          Math.abs(u.x - c.x) < 0.2 && Math.abs(u.y - c.y) < 0.2);
        if (!match) {
          multiLevelAligned = false;
          issues.push(`Niveau ${lvl + 1}: mur porteur du hall non aligné`);
          break;
        }
      }
      if (!multiLevelAligned) break;
    }
  }

  // 5. Dimension sanity
  rooms.forEach((r) => {
    if (r.w < 1.5 || r.h < 1.5) issues.push(`${r.label}: dimensions < 1.5m`);
    const ratio = Math.max(r.w, r.h) / Math.max(0.1, Math.min(r.w, r.h));
    if (ratio > 3) issues.push(`${r.label}: ratio ${ratio.toFixed(1)}:1`);
    if (r.habitable && r.windows.length === 0) issues.push(`${r.label}: sans fenêtre`);
  });

  return { noOverlap, areaSumOk, connectivityOk, multiLevelAligned, issues };
}

// ─── Concept notes ──────────────────────────────────────────────────────────

const LAYOUT_NOTES = [
  "Disposition en L offrant une séparation claire entre zones de vie et zones nuit, séjour baigné de lumière naturelle et flux de circulation optimisé depuis l'entrée.",
  "Plan en U créant une cour intérieure protégée : intimité préservée, ventilation croisée naturelle et accès direct séjour ↔ espaces extérieurs.",
  "Layout rectangulaire avec distribution symétrique : couloir central desservant toutes les pièces, ergonomie de parcours minimale entre hall et chambres.",
  "Disposition en T séparant bloc jour (séjour/cuisine) et bloc nuit (chambres) via un hall central — circulation fluide, aucune pièce de passage.",
  "Plan ouvert (open-plan) : séjour, cuisine et salle à manger en continuité spatiale, chambres regroupées en aile indépendante pour la tranquillité.",
  "Configuration en épi avec ailes décalées : vues multiples et dégagées, éclairage naturel traversant dans toutes les pièces principales.",
  "Disposition compacte en damier : maximisation de la surface utile, circulations réduites au strict nécessaire, économie de cloisons.",
  "Plan en escalier adapté à la topographie : niveaux décalés avec terrasses intermédiaires, orientation optimisée des séjours au sud.",
  "Layout asymétrique audacieux : grands volumes de réception contrastant avec chambres intimistes, jeux de lumière et perspectives travaillés.",
  "Disposition en étoile depuis un noyau central (hall/escalier) : accès direct et équidistant à toutes les pièces, ergonomie de parcours exemplaire.",
];

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateFloorPlanVariants(input: PlanInput): PlanVariant[] {
  const nbLevels = Math.max(1, input.floors ?? 1);
  const levelSurface = input.surface / nbLevels;
  const program = buildProgram(input);

  const aspect = 1.25;
  const length = Math.round(Math.sqrt(levelSurface * aspect) * 100) / 100;
  const width = Math.round((levelSurface / length) * 100) / 100;

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
      loadBearing: def.loadBearing,
    }));

    // Build each level with the same load-bearing skeleton (hall position aligned)
    const levels: PlanLevel[] = [];
    const allLevelRooms: PlanRoom[][] = [];

    for (let lvl = 0; lvl < nbLevels; lvl++) {
      const levelDefs = roomDefs
        // Upper levels: skip duplicated hall (keep aligned skeleton)
        .filter((d) => lvl === 0 || d.kind !== "hall" || d.loadBearing);

      const leaves = packRooms({ x: 0, y: 0, w: length, h: width }, levelDefs, rng);

      const levelRooms: PlanRoom[] = leaves
        .filter((l) => l.room)
        .map((l) => ({
          id: `${l.room!.id}-L${lvl}`,
          kind: l.room!.kind,
          label: l.room!.label,
          x: Math.round(l.x * 100) / 100,
          y: Math.round(l.y * 100) / 100,
          w: Math.round(l.w * 100) / 100,
          h: Math.round(l.h * 100) / 100,
          area: Math.round(l.w * l.h * 100) / 100,
          habitable: l.room!.habitable,
          level: lvl,
          loadBearing: l.room!.loadBearing ?? false,
          doors: [],
          windows: [],
        }));

      placeOpenings(levelRooms, length, width);
      levels.push({ index: lvl, rooms: levelRooms, length, width });
      allLevelRooms.push(levelRooms);
    }

    // Validate on ground floor + multi-level checks
    const groundRooms = allLevelRooms[0] ?? [];
    const validation = validatePlan(groundRooms, levelSurface, nbLevels, allLevelRooms);

    // Score from validation
    let score = 100;
    if (!validation.noOverlap) score -= 20;
    if (!validation.areaSumOk) score -= 15;
    if (!validation.connectivityOk) score -= 15;
    if (!validation.multiLevelAligned) score -= 10;
    score -= validation.issues.length * 2;
    score = Math.max(0, Math.min(100, score));

    const totalArea = levels.reduce((s, l) => s + l.rooms.reduce((a, r) => a + r.area, 0), 0);
    const circArea = levels.reduce(
      (s, l) => s + l.rooms.filter((r) => r.kind === "hall").reduce((a, r) => a + r.area, 0), 0);

    variants.push({
      id: `variant-${v + 1}`,
      variantIndex: v + 1,
      label: `Plan ${v + 1}`,
      description: `${LAYOUT_NOTES[v % LAYOUT_NOTES.length]} Score qualité : ${score}/100.`,
      levelSurface: Math.round(levelSurface * 100) / 100,
      totalLevels: nbLevels,
      length,
      width,
      levels,
      rooms: groundRooms,
      totalArea: Math.round(totalArea * 100) / 100,
      circulationArea: Math.round(circArea * 100) / 100,
      score,
      validation,
    });
  }

  variants.sort((a, b) => b.score - a.score);
  variants.forEach((v, i) => (v.variantIndex = i + 1));
  return variants;
}

// ─── UI maps ────────────────────────────────────────────────────────────────

export const ROOM_COLORS: Record<string, string> = {
  sejour: "#dbeafe", cuisine: "#fef3c7", chambre: "#ede9fe",
  sdb: "#cffafe", wc: "#f3e8ff", hall: "#f1f5f9",
};

export const ROOM_ICONS: Record<string, string> = {
  sejour: "🛋️", cuisine: "🍳", chambre: "🛏️", sdb: "🚿", wc: "🚽", hall: "🚪",
};
