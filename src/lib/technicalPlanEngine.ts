// ============================================================================
// MOTEUR DES PLANS TECHNIQUES — PLOMBERIE & ÉLECTRICITÉ
// ----------------------------------------------------------------------------
// Les plans techniques sont DÉRIVÉS du plan architectural réel du projet
// (`FloorPlan` : pièces, murs, portes, fenêtres, dimensions, niveaux). Aucune
// géométrie générique n'est créée : chaque appareil, chaque prise et chaque
// conduite est positionné dans une pièce existante, aux dimensions réelles.
//
// · Déterministe (aucun hasard) → un même plan + mêmes modifications donnent
//   exactement le même réseau et les mêmes quantités.
// · Les colonnes (plomberie) et le tableau / les montées électriques partagent
//   la même position absolue sur tous les niveaux (cohérence verticale).
// · Les calibres et sections ne sont renseignés QUE s'ils sont calculés à
//   partir de la charge, de la longueur et de la chute de tension admissible.
// · Aucun prix n'est inventé : le moteur ne produit que des QUANTITÉS, la
//   valorisation est faite à partir des prix déjà configurés du projet.
// ============================================================================

import type { FloorPlan, PlanRoom, RoomKind, WallSide } from "./floorPlanEngine";

export type TechnicalPlanKind = "plomberie" | "electricite";

export interface Pt {
  x: number;
  y: number;
}

// ── Quantitatif ─────────────────────────────────────────────────────────────

export type QuantityUnit = "ml" | "unité" | "points" | "lot";

export interface QuantityLine {
  /** Clé stable (regroupement des niveaux). */
  id: string;
  kind: TechnicalPlanKind;
  /** Famille d'affichage (Alimentation, Évacuation, Câblage, …) */
  group: string;
  label: string;
  unit: QuantityUnit;
  quantity: number;
}

export function mergeQuantityLines(lines: QuantityLine[]): QuantityLine[] {
  const map = new Map<string, QuantityLine>();
  for (const line of lines) {
    const key = `${line.kind}|${line.group}|${line.label}|${line.unit}`;
    const current = map.get(key);
    if (current) {
      current.quantity = round2(current.quantity + line.quantity);
    } else {
      map.set(key, { ...line });
    }
  }
  return [...map.values()]
    .filter((line) => line.quantity > 0)
    .sort(
      (a, b) => a.group.localeCompare(b.group, "fr") || a.label.localeCompare(b.label, "fr"),
    );
}

// ── Options déclaratives (jamais devinées) ──────────────────────────────────

export interface TechnicalPlanContext {
  /** Description du projet : sert UNIQUEMENT à détecter buanderie / lave-vaisselle. */
  description?: string;
  /** Équipements explicitement demandés par l'utilisateur dans l'interface. */
  laundry?: boolean;
  dishwasher?: boolean;
  waterHeater?: boolean;
  airConditioning?: boolean;
  /** Nombre de SDB / cuisines / WC déclarés dans le projet (contrôle de cohérence). */
  bathrooms?: number;
  kitchens?: number;
  wcs?: number;
}

export interface TechnicalPlanInput {
  level: number;
  floor: FloorPlan;
  /** Tous les niveaux : la colonne montante est calculée sur l'ensemble. */
  floors: FloorPlan[];
  context?: TechnicalPlanContext;
  /** Positions modifiées manuellement (id du point → coordonnées en mètres). */
  overrides?: Record<string, Pt>;
}

// ── Plomberie : types ───────────────────────────────────────────────────────

export type PlumbingFixtureKind =
  | "wc"
  | "lavabo"
  | "douche"
  | "baignoire"
  | "evier"
  | "lave_vaisselle"
  | "lave_linge"
  | "chauffe_eau";

export interface PlumbingFixture {
  id: string;
  kind: PlumbingFixtureKind;
  label: string;
  roomId: string;
  roomLabel: string;
  x: number;
  y: number;
  wall: WallSide;
  cold: boolean;
  hot: boolean;
  drainDn: number;
}

export type PipeNetwork = "eau_froide" | "eau_chaude" | "evacuation" | "ventilation";

export interface PipeRun {
  id: string;
  network: PipeNetwork;
  points: Pt[];
  dn: number;
  lengthM: number;
  slopePct?: number;
  /** Conduite de distribution (épaisse) ou branchement appareil. */
  trunk: boolean;
}

export type PlumbingAccessoryKind =
  | "collecteur"
  | "vanne"
  | "regard"
  | "chute"
  | "clapet";

export interface PlumbingAccessory {
  id: string;
  kind: PlumbingAccessoryKind;
  label: string;
  x: number;
  y: number;
}

export interface PlumbingPlan {
  kind: "plomberie";
  level: number;
  floorLabel: string;
  length: number;
  width: number;
  area: number;
  riser: Pt;
  fixtures: PlumbingFixture[];
  pipes: PipeRun[];
  accessories: PlumbingAccessory[];
  warnings: string[];
  quantities: QuantityLine[];
}

// ── Électricité : types ─────────────────────────────────────────────────────

export type ElectricalPointKind =
  | "luminaire"
  | "luminaire_ext"
  | "interrupteur"
  | "prise"
  | "prise_specialisee"
  | "climatiseur"
  | "chauffe_eau"
  | "tableau"
  | "terre";

export type ElectricalCircuitRole =
  | "eclairage"
  | "exterieur"
  | "prises"
  | "specialise"
  | "climatisation";

export interface ElectricalPoint {
  id: string;
  kind: ElectricalPointKind;
  label: string;
  roomId: string | null;
  roomLabel: string | null;
  x: number;
  y: number;
  circuitId: string | null;
  /** Point de raccordement prévisionnel (climatisation, équipements). */
  provisional?: boolean;
}

export interface ElectricalCircuit {
  id: string;
  label: string;
  role: ElectricalCircuitRole;
  pointIds: string[];
  loadVA: number;
  lengthM: number;
  breakerA: number | null;
  sectionMm2: number | null;
  ddr: boolean;
  /** `true` uniquement si calibre + section ont été calculés. */
  computed: boolean;
  basis: string;
}

export interface CableRun {
  id: string;
  circuitId: string;
  points: Pt[];
  lengthM: number;
}

export interface ElectricalPlan {
  kind: "electricite";
  level: number;
  floorLabel: string;
  length: number;
  width: number;
  area: number;
  panel: Pt;
  /** Gaine technique verticale commune à tous les niveaux. */
  riser: Pt;
  points: ElectricalPoint[];
  circuits: ElectricalCircuit[];
  cables: CableRun[];
  installedVA: number;
  diversifiedVA: number;
  mainBreakerA: number | null;
  warnings: string[];
  quantities: QuantityLine[];
}

export type TechnicalPlan = PlumbingPlan | ElectricalPlan;

// ── Légendes (partagées écran / PDF) ────────────────────────────────────────

export interface LegendEntry {
  id: string;
  label: string;
  color: string;
  dash?: boolean;
  symbol?: "line" | "dot" | "square";
}

export const PLUMBING_LEGEND: LegendEntry[] = [
  { id: "eau_froide", label: "Eau froide (EF)", color: "#0284c7" },
  { id: "eau_chaude", label: "Eau chaude (EC)", color: "#dc2626" },
  { id: "evacuation", label: "Évacuation des eaux usées (EV)", color: "#44403c" },
  { id: "ventilation", label: "Ventilation primaire (VP)", color: "#a16207", dash: true },
  { id: "appareils", label: "Appareils sanitaires", color: "#0f766e", symbol: "square" },
  { id: "accessoires", label: "Vannes, collecteurs, regards", color: "#7c3aed", symbol: "dot" },
];

export const ELECTRICAL_LEGEND: LegendEntry[] = [
  { id: "eclairage", label: "Éclairage / interrupteurs", color: "#ca8a04" },
  { id: "prises", label: "Prises 2P+T", color: "#2563eb" },
  { id: "specialises", label: "Prises spécialisées et équipements", color: "#dc2626" },
  { id: "climatisation", label: "Climatisation (prévisionnel)", color: "#0d9488" },
  { id: "cheminements", label: "Cheminements de câbles", color: "#7c3aed", dash: true },
  { id: "tableau", label: "Tableau et protections", color: "#111827", symbol: "square" },
];

export const PLUMBING_FIXTURE_LABELS: Record<PlumbingFixtureKind, string> = {
  wc: "WC",
  lavabo: "Lavabo",
  douche: "Douche",
  baignoire: "Baignoire",
  evier: "Évier",
  lave_vaisselle: "Lave-vaisselle",
  lave_linge: "Lave-linge",
  chauffe_eau: "Chauffe-eau",
};

const PLUMBING_FIXTURE_ORDER: PlumbingFixtureKind[] = [
  "wc",
  "lavabo",
  "douche",
  "baignoire",
  "evier",
  "lave_vaisselle",
  "lave_linge",
  "chauffe_eau",
];

// ── Utilitaires géométriques ────────────────────────────────────────────────

const EPS = 1e-6;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function samePoint(a: Pt, b: Pt): boolean {
  return Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
}

/** Longueur d'une polyligne en mètres. */
export function polylineLength(points: Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return round2(total);
}

/** Nombre de changements de direction (coudes) d'une polyligne. */
export function polylineTurns(points: Pt[]): number {
  let turns = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    const horizontalIn = Math.abs(a.y - b.y) < EPS;
    const horizontalOut = Math.abs(b.y - c.y) < EPS;
    if (horizontalIn !== horizontalOut) turns += 1;
  }
  return turns;
}

/** Supprime les points intermédiaires alignés (traits continus). */
function simplify(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    if (out.length && samePoint(out[out.length - 1], p)) continue;
    out.push(p);
  }
  for (let i = out.length - 2; i >= 1; i--) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    const collinear =
      (Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS) ||
      (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - c.y) < EPS);
    if (collinear) out.splice(i, 1);
  }
  return out;
}

function wallPoint(room: PlanRoom, wall: WallSide, along: number, depth: number): Pt {
  const x = room.x + clamp(along, 0.15, Math.max(0.15, room.w - 0.15));
  const y = room.y + clamp(along, 0.15, Math.max(0.15, room.h - 0.15));
  const d = Math.max(0.12, Math.min(depth, Math.min(room.w, room.h) / 2.4));
  switch (wall) {
    case "N":
      return { x, y: room.y + d };
    case "S":
      return { x, y: room.y + room.h - d };
    case "W":
      return { x: room.x + d, y };
    default:
      return { x: room.x + room.w - d, y };
  }
}

function wallLength(room: PlanRoom, wall: WallSide): number {
  return wall === "N" || wall === "S" ? room.w : room.h;
}

const WALLS: WallSide[] = ["N", "E", "S", "W"];

function wallOrder(room: PlanRoom): WallSide[] {
  const withDoor = new Set(room.doors.map((d) => d.wall));
  return [...WALLS].sort((a, b) => Number(withDoor.has(a)) - Number(withDoor.has(b)));
}

/** Positionne un point à distance minimale des points déjà placés. */
function freeSpot(
  room: PlanRoom,
  already: Pt[],
  kind?: PlumbingFixtureKind,
): { x: number; y: number; wall: WallSide } {
  const order = wallOrder(room);
  const depth = kind === "baignoire" ? 0.42 : kind === "evier" ? 0.36 : 0.30;
  const minGap = kind === "baignoire" ? 1.3 : 0.72;
  for (const wall of order) {
    const len = wallLength(room, wall);
    const candidates = [0.55, len - 0.55, len / 2, Math.min(1.3, len - 0.45), Math.max(0.45, len - 1.3)];
    for (const along of candidates) {
      if (along < 0.35 || along > len - 0.35) continue;
      const p = wallPoint(room, wall, along, depth);
      if (already.every((q) => dist(p, q) > minGap)) {
        return { ...p, wall };
      }
    }
  }
  return {
    x: room.x + room.w / 2,
    y: room.y + room.h / 2,
    wall: order[0] ?? "N",
  };
}

function applyOverride<T extends { id: string; x: number; y: number }>(
  item: T,
  overrides: Record<string, Pt> | undefined,
  length: number,
  width: number,
): T {
  const o = overrides?.[item.id];
  if (!o) return item;
  return {
    ...item,
    x: clamp(o.x, 0.15, Math.max(0.15, length - 0.15)),
    y: clamp(o.y, 0.15, Math.max(0.15, width - 0.15)),
  };
}

function floorLabelOf(level: number): string {
  return level === 0 ? "Rez-de-chaussée" : `Niveau ${level}`;
}

// ── Colonne technique commune à tous les niveaux ────────────────────────────

function wetRooms(floor: FloorPlan): PlanRoom[] {
  return floor.rooms.filter((r) =>
    ["sdb", "wc", "cuisine", "cuisine_pro", "plonge", "sanitaire"].includes(r.kind),
  );
}

/**
 * Position absolue de la gaine technique. Elle est calculée sur le niveau qui
 * contient le plus de pièces humides, puis RÉUTILISÉE telle quelle sur tous les
 * niveaux : les colonnes de chute et les montées électriques restent alignées
 * verticalement (même emprise).
 */
export function technicalShaft(footprint: { length: number; width: number }, floors: FloorPlan[]): Pt {
  const source =
    [...floors].sort((a, b) => wetRooms(b).length - wetRooms(a).length)[0] ?? floors[0];
  const rooms = source ? wetRooms(source) : [];
  const room =
    rooms.find((r) => r.kind === "sdb") ??
    rooms.find((r) => r.kind === "sanitaire") ??
    rooms.find((r) => r.kind === "wc") ??
    rooms[0];
  if (!room) {
    return { x: round2(footprint.length / 2), y: round2(footprint.width / 2) };
  }
  // Coin de la pièce humide, à 0,30 m des murs : hors des appareils et des
  // ouvertures, et compatible avec une colonne traversant tous les niveaux.
  const x = clamp(room.x + 0.30, 0.30, Math.max(0.30, footprint.length - 0.30));
  const y = clamp(room.y + 0.30, 0.30, Math.max(0.30, footprint.width - 0.30));
  return { x: round2(x), y: round2(y) };
}

// ── Génération : plomberie ──────────────────────────────────────────────────

function plumbingFixturesForRoom(
  room: PlanRoom,
  options: { dishwasher: boolean; laundry: boolean },
): PlumbingFixture[] {
  const list: PlumbingFixture[] = [];
  const placed: Pt[] = [];

  const add = (
    kind: PlumbingFixtureKind,
    overrides?: Partial<Pick<PlumbingFixture, "cold" | "hot" | "drainDn">>,
  ) => {
    const spot = freeSpot(room, placed, kind);
    placed.push({ x: spot.x, y: spot.y });
    const hot = ["lavabo", "douche", "baignoire", "evier", "lave_linge", "lave_vaisselle", "chauffe_eau"].includes(kind);
    const drainDn =
      overrides?.drainDn ?? (kind === "wc" ? 100 : kind === "evier" || kind === "lave_vaisselle" ? 50 : 40);
    list.push({
      id: `pf-${room.id}-${kind}-${list.length}`,
      kind,
      label: PLUMBING_FIXTURE_LABELS[kind],
      roomId: room.id,
      roomLabel: room.label,
      x: round2(spot.x),
      y: round2(spot.y),
      wall: spot.wall,
      cold: overrides?.cold ?? true,
      hot: overrides?.hot ?? hot,
      drainDn,
    });
  };

  switch (room.kind) {
    case "sdb":
    case "sanitaire": {
      add("lavabo");
      if (room.area >= 8) {
        add("baignoire");
        add("douche");
      } else {
        add("douche");
      }
      if (options.laundry && room.area >= 4.5) add("lave_linge");
      break;
    }
    case "wc": {
      add("wc", { hot: false, drainDn: 100 });
      break;
    }
    case "cuisine":
    case "cuisine_pro": {
      add("evier");
      if (options.dishwasher && room.area >= 5) add("lave_vaisselle");
      break;
    }
    case "plonge": {
      add("evier");
      break;
    }
    default:
      break;
  }
  return list;
}

function pushPipe(
  pipes: PipeRun[],
  network: PipeNetwork,
  rawPoints: Pt[],
  dn: number,
  trunk: boolean,
  slopePct?: number,
) {
  const points = simplify(rawPoints);
  if (points.length < 2) return;
  const lengthM = polylineLength(points);
  if (lengthM < 0.05) return;
  pipes.push({
    id: `pp-${network}-${dn}-${trunk ? "t" : "b"}-${pipes.length}`,
    network,
    points,
    dn,
    lengthM,
    trunk,
    slopePct,
  });
}

export function generatePlumbingPlan(input: TechnicalPlanInput): PlumbingPlan {
  const { floor, floors, level } = input;
  const context = input.context ?? {};
  const warnings: string[] = [];
  const overrides = input.overrides;
  const plan = floor;
  const floorsSafe = floors.length ? floors : [floor];
  const riser = technicalShaft({ length: plan.length, width: plan.width }, floorsSafe);

  const laundry =
    context.laundry ??
    /buanderie|laundry|salle de linge|lave-linge/i.test(context.description ?? "");
  const dishwasher =
    context.dishwasher ??
    /lave-vaisselle|dishwasher/i.test(context.description ?? "");
  const waterHeater = context.waterHeater ?? true;

  const fixtures: PlumbingFixture[] = [];
  for (const room of plan.rooms) {
    for (const fixture of plumbingFixturesForRoom(room, { dishwasher, laundry })) {
      fixtures.push(applyOverride(fixture, overrides, plan.length, plan.width));
    }
  }

  // Chauffe-eau : un par niveau, dans la plus grande pièce humide, uniquement
  // si elle existe réellement (jamais ajouté dans une pièce inventée).
  if (waterHeater) {
    const wet = plan.rooms
      .filter((r) => ["sdb", "sanitaire", "cuisine", "cuisine_pro", "plonge"].includes(r.kind))
      .sort((a, b) => b.area - a.area);
    const host = wet[0];
    if (host) {
      const already = fixtures.filter((f) => f.roomId === host.id).map((f) => ({ x: f.x, y: f.y }));
      const spot = freeSpot(host, already, "chauffe_eau");
      fixtures.push(
        applyOverride(
          {
            id: `pf-${host.id}-chauffe_eau`,
            kind: "chauffe_eau" as const,
            label: PLUMBING_FIXTURE_LABELS.chauffe_eau,
            roomId: host.id,
            roomLabel: host.label,
            x: round2(spot.x),
            y: round2(spot.y),
            wall: spot.wall,
            cold: true,
            hot: true,
            drainDn: 40,
          },
          overrides,
          plan.length,
          plan.width,
        ),
      );
    } else {
      warnings.push(
        "Aucune pièce humide (SDB, cuisine, WC) n'est localisée : le chauffe-eau et les réseaux ne peuvent pas être placés.",
      );
    }
  }

  if (fixtures.length === 0) {
    warnings.push(
      "Aucun appareil sanitaire localisé dans le plan : complétez les pièces (SDB, WC, cuisine) pour générer la plomberie.",
    );
  }

  // Contrôle de cohérence avec le programme déclaré du projet : on signale un
  // manque, on n'invente pas de pièce.
  const declaredBathrooms = context.bathrooms ?? 0;
  const declaredWcs = context.wcs ?? 0;
  const declaredKitchens = context.kitchens ?? 0;
  if (laundry && !plan.rooms.some((r) => /buanderie|linge/i.test(r.label))) {
    warnings.push(
      "Buanderie non localisée dans le plan : l'équipement de lavage est placé dans une pièce humide existante — précisez la buanderie si elle est prévue.",
    );
  }
  if (dishwasher && !plan.rooms.some((r) => r.kind === "cuisine" || r.kind === "cuisine_pro")) {
    warnings.push("Lave-vaisselle demandé, mais aucune cuisine n'est localisée dans ce niveau.");
  }
  if (declaredBathrooms > 0 && !plan.rooms.some((r) => r.kind === "sdb" || r.kind === "sanitaire"))
    warnings.push("Le projet déclare une salle de bains, mais aucune SDB n'est localisée dans ce niveau.");
  if (declaredWcs > 0 && !plan.rooms.some((r) => r.kind === "wc"))
    warnings.push("Le projet déclare des WC, mais aucun WC n'est localisé dans ce niveau.");
  if (declaredKitchens > 0 && !plan.rooms.some((r) => r.kind === "cuisine" || r.kind === "cuisine_pro"))
    warnings.push("Le projet déclare une cuisine, mais aucune cuisine n'est localisée dans ce niveau.");

  // ── Tracés ────────────────────────────────────────────────────────────────
  const inPlan = (p: Pt, margin = 0.18): Pt => ({
    x: round2(clamp(p.x, margin, Math.max(margin, plan.length - margin))),
    y: round2(clamp(p.y, margin, Math.max(margin, plan.width - margin))),
  });

  const coldLane = clamp(riser.y - 0.55, 0.30, Math.max(0.30, plan.width - 0.95));
  const hotLane = clamp(coldLane + 0.16, 0.30, Math.max(0.30, plan.width - 0.35));
  const drainLane = clamp(Math.max(riser.y + 0.45, hotLane + 0.28), 0.35, Math.max(0.35, plan.width - 0.25));

  const pipes: PipeRun[] = [];
  const xs = fixtures.map((f) => f.x);
  const minX = xs.length ? Math.min(...xs) : riser.x;
  const maxX = xs.length ? Math.max(...xs) : riser.x;

  // Colonne montante (visible en plan par la gaine, longueur verticale comptée
  // à part dans le quantitatif).
  pushPipe(
    pipes,
    "eau_froide",
    [riser, inPlan({ x: riser.x, y: coldLane })],
    25,
    true,
  );
  pushPipe(
    pipes,
    "eau_chaude",
    [riser, inPlan({ x: riser.x, y: hotLane })],
    25,
    true,
  );

  if (maxX - minX > 0.15) {
    pushPipe(
      pipes,
      "eau_froide",
      [inPlan({ x: minX, y: coldLane }), inPlan({ x: maxX, y: coldLane })],
      20,
      true,
    );
    pushPipe(
      pipes,
      "eau_chaude",
      [inPlan({ x: minX, y: hotLane }), inPlan({ x: maxX, y: hotLane })],
      20,
      true,
    );
    pushPipe(
      pipes,
      "evacuation",
      [inPlan({ x: minX, y: drainLane }), inPlan({ x: maxX, y: drainLane })],
      100,
      true,
      2,
    );
    pushPipe(
      pipes,
      "evacuation",
      [inPlan({ x: riser.x, y: drainLane }), riser],
      100,
      true,
      2,
    );
  }

  for (const f of fixtures) {
    const target: Pt = { x: f.x, y: f.y };
    if (f.cold) {
      pushPipe(
        pipes,
        "eau_froide",
        [inPlan({ x: f.x, y: coldLane }), target],
        16,
        false,
      );
    }
    if (f.hot) {
      pushPipe(
        pipes,
        "eau_chaude",
        [inPlan({ x: f.x, y: hotLane }), target],
        16,
        false,
      );
    }
    pushPipe(
      pipes,
      "evacuation",
      [target, inPlan({ x: f.x, y: drainLane })],
      f.drainDn,
      false,
      f.drainDn <= 50 ? 2 : 1,
    );
  }

  // Ventilation primaire : évent de la colonne, représenté au droit de la gaine.
  // La gaine peut se trouver contre la façade nord : on oriente alors l'évent
  // vers l'intérieur, sinon le tracé serait de longueur nulle.
  const ventY =
    riser.y - 1.2 >= 0.3
      ? riser.y - 1.2
      : Math.min(Math.max(0.3, plan.width - 0.3), riser.y + 1.2);
  pushPipe(
    pipes,
    "ventilation",
    [riser, inPlan({ x: riser.x, y: ventY })],
    100,
    true,
  );

  // ── Accessoires ──────────────────────────────────────────────────────────
  const accessories: PlumbingAccessory[] = [
    {
      id: "acc-collecteur",
      kind: "collecteur",
      label: "Collecteur EF/EC",
      x: round2(clamp(riser.x + 0.22, 0.2, plan.length - 0.2)),
      y: riser.y,
    },
    {
      id: "acc-regard",
      kind: "regard",
      label: "Regard de visite",
      x: riser.x,
      y: riser.y,
    },
    {
      id: "acc-chute",
      kind: "chute",
      label: "Colonne de chute Ø100",
      x: round2(clamp(riser.x + 0.12, 0.2, plan.length - 0.2)),
      y: round2(clamp(riser.y + 0.12, 0.2, plan.width - 0.2)),
    },
    {
      id: "acc-clapet",
      kind: "clapet",
      label: "Clapet anti-retour",
      x: round2(clamp(riser.x + 0.34, 0.2, plan.length - 0.2)),
      y: round2(clamp(riser.y - 0.14, 0.2, plan.width - 0.2)),
    },
    {
      id: "acc-vanne-generale",
      kind: "vanne",
      label: "Vanne d'arrêt générale",
      x: round2(clamp(riser.x - 0.22, 0.2, plan.length - 0.2)),
      y: riser.y,
    },
  ];
  const wetRoomIds = [...new Set(fixtures.map((f) => f.roomId))];
  for (const roomId of wetRoomIds) {
    const f = fixtures.find((x) => x.roomId === roomId);
    const room = plan.rooms.find((r) => r.id === roomId);
    if (!f || !room) continue;
    accessories.push({
      id: `acc-vanne-${roomId}`,
      kind: "vanne",
      label: `Vanne d'arrêt — ${room.label}`,
      x: round2(clamp(f.x + 0.18, 0.2, plan.length - 0.2)),
      y: round2(clamp(f.y - 0.18, 0.2, plan.width - 0.2)),
    });
  }

  // ── Quantitatif ──────────────────────────────────────────────────────────
  const quantities = plumbingQuantities({
    pipes,
    fixtures,
    accessories,
    level,
  });

  return {
    kind: "plomberie",
    level,
    floorLabel: floorLabelOf(level),
    length: plan.length,
    width: plan.width,
    area: plan.area,
    riser,
    fixtures,
    pipes,
    accessories,
    warnings,
    quantities,
  };
}

export function plumbingQuantities(input: {
  pipes: PipeRun[];
  fixtures: PlumbingFixture[];
  accessories: PlumbingAccessory[];
  level: number;
}): QuantityLine[] {
  const { pipes, fixtures, accessories, level } = input;
  const lines: QuantityLine[] = [];
  const groups = new Map<string, { network: PipeNetwork; dn: number; length: number }>();
  for (const pipe of pipes) {
    if (pipe.network === "ventilation") continue;
    const key = `${pipe.network}|${pipe.dn}`;
    const g = groups.get(key);
    if (g) g.length += pipe.lengthM;
    else groups.set(key, { network: pipe.network, dn: pipe.dn, length: pipe.lengthM });
  }
  for (const g of groups.values()) {
    const isDrain = g.network === "evacuation";
    const networkLabel =
      g.network === "eau_froide" ? "Eau froide" : g.network === "eau_chaude" ? "Eau chaude" : "Évacuation";
    lines.push({
      id: `pipe-${g.network}-${g.dn}`,
      kind: "plomberie",
      group: isDrain ? "Évacuation" : "Alimentation",
      label: `${isDrain ? "Tube PVC" : "Tube PER"} Ø${g.dn} — ${networkLabel}`,
      unit: "ml",
      quantity: round2(g.length),
    });
  }

  // Raccords calculés à partir des tracés (coudes, tés, manchons, colliers).
  const coudes = pipes.reduce((n, p) => n + polylineTurns(p.points), 0);
  const tes = pipes.filter((p) => !p.trunk && p.network !== "ventilation").length;
  const totalLength = pipes
    .filter((p) => p.network !== "ventilation")
    .reduce((n, p) => n + p.lengthM, 0);
  lines.push(
    {
      id: "fit-coudes",
      kind: "plomberie",
      group: "Raccords et accessoires",
      label: "Coudes 90° (calculés sur tracés)",
      unit: "unité",
      quantity: coudes,
    },
    {
      id: "fit-tes",
      kind: "plomberie",
      group: "Raccords et accessoires",
      label: "Tés de raccordement",
      unit: "unité",
      quantity: tes,
    },
    {
      id: "fit-manchons",
      kind: "plomberie",
      group: "Raccords et accessoires",
      label: "Manchons / raccords (1 par 4 m)",
      unit: "unité",
      quantity: Math.max(1, Math.ceil(totalLength / 4)),
    },
    {
      id: "fit-colliers",
      kind: "plomberie",
      group: "Raccords et accessoires",
      label: "Colliers de fixation (1 par 1,5 m)",
      unit: "unité",
      quantity: Math.max(1, Math.ceil(totalLength / 1.5)),
    },
    {
      id: "riser-column",
      kind: "plomberie",
      group: "Alimentation",
      label: "Colonne montante cuivre Ø25 (part verticale)",
      unit: "ml",
      quantity: level === 0 ? 1.5 : 3,
    },
    {
      id: "vent-primary",
      kind: "plomberie",
      group: "Évacuation",
      label: "Ventilation primaire de chute (évent)",
      unit: "lot",
      quantity: 1,
    },
  );

  for (const kind of PLUMBING_FIXTURE_ORDER) {
    const count = fixtures.filter((f) => f.kind === kind).length;
    if (!count) continue;
    lines.push({
      id: `fix-${kind}`,
      kind: "plomberie",
      group: "Appareils sanitaires",
      label: PLUMBING_FIXTURE_LABELS[kind],
      unit: "unité",
      quantity: count,
    });
  }

  const vannes = accessories.filter((a) => a.kind === "vanne").length;
  const collecteurs = accessories.filter((a) => a.kind === "collecteur").length;
  const regards = accessories.filter((a) => a.kind === "regard").length;
  const clapets = accessories.filter((a) => a.kind === "clapet").length;
  if (vannes)
    lines.push({
      id: "acc-vannes",
      kind: "plomberie",
      group: "Raccords et accessoires",
      label: "Vannes d'arrêt",
      unit: "unité",
      quantity: vannes,
    });
  if (collecteurs)
    lines.push({
      id: "acc-collecteurs",
      kind: "plomberie",
      group: "Raccords et accessoires",
      label: "Collecteur d'alimentation",
      unit: "unité",
      quantity: collecteurs,
    });
  if (regards)
    lines.push({
      id: "acc-regards",
      kind: "plomberie",
      group: "Raccords et accessoires",
      label: "Regards de visite",
      unit: "unité",
      quantity: regards,
    });
  if (clapets)
    lines.push({
      id: "acc-clapets",
      kind: "plomberie",
      group: "Raccords et accessoires",
      label: "Clapets anti-retour",
      unit: "unité",
      quantity: clapets,
    });

  return lines.filter((line) => line.quantity > 0);
}

// ── Génération : électricité ────────────────────────────────────────────────

const SOCKET_COUNTS: Record<RoomKind, number> = {
  sejour: 6,
  cuisine: 6,
  chambre: 3,
  sdb: 2,
  wc: 1,
  couloir: 1,
  escalier: 0,
  bureau: 4,
  garage: 2,
  reception: 4,
  openspace: 6,
  reunion: 4,
  sanitaire: 2,
  hall: 2,
  stockage: 1,
  logistique: 3,
  vestiaire: 1,
  polyvalent: 4,
  salle_client: 6,
  salle_cafe: 8,
  comptoir: 4,
  cuisine_pro: 8,
  plonge: 2,
  chambre_froide: 1,
  terrasse: 1,
  attente: 2,
  patio: 1,
  buanderie: 2,
  vente: 6,
  bassin: 0,
  local_technique: 1,
};

const POINT_LOAD_VA: Record<ElectricalPointKind, number> = {
  luminaire: 100,
  luminaire_ext: 150,
  interrupteur: 0,
  prise: 300,
  prise_specialisee: 2000,
  climatiseur: 2500,
  chauffe_eau: 2000,
  tableau: 0,
  terre: 0,
};

const CIRCUIT_COLORS = ["#ca8a04", "#2563eb", "#dc2626", "#0d9488", "#7c3aed", "#ea580c", "#0891b2"];

export function electricalCircuitColor(index: number): string {
  return CIRCUIT_COLORS[index % CIRCUIT_COLORS.length];
}

const BASE_R2 = 0.01724; // Ω·mm²/m (cuivre, 20 °C)
const STANDARD_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63];
const SECTIONS: { mm2: number; ampacity: number }[] = [
  { mm2: 1.5, ampacity: 16 },
  { mm2: 2.5, ampacity: 20 },
  { mm2: 4, ampacity: 25 },
  { mm2: 6, ampacity: 32 },
  { mm2: 10, ampacity: 40 },
  { mm2: 16, ampacity: 63 },
];

interface SizedCircuit {
  breakerA: number | null;
  sectionMm2: number | null;
  computed: boolean;
  basis: string;
}

/**
 * Calibre et section calculés à partir de la charge, de la longueur du circuit
 * et de la chute de tension admissible (3 % éclairage, 5 % autres circuits).
 * Renvoie `computed: false` si aucun section normalisée ne convient : aucune
 * valeur n'est alors affichée comme si elle avait été calculée.
 */
export function sizeCircuit(
  role: ElectricalCircuitRole,
  loadVA: number,
  maxRunM: number,
): SizedCircuit {
  const minBreaker = role === "eclairage" || role === "exterieur" ? 10 : role === "prises" ? 16 : 20;
  // Section minimale imposée par la nature du circuit : 1,5 mm² pour
  // l'éclairage, 2,5 mm² pour les prises et les circuits spécialisés.
  const minSection = role === "eclairage" || role === "exterieur" ? 1.5 : 2.5;
  if (!(loadVA > 0) || !(maxRunM > 0)) {
    return { breakerA: null, sectionMm2: null, computed: false, basis: "Charge ou longueur non déterminée" };
  }
  const current = loadVA / 230;
  const breaker = STANDARD_BREAKERS.find((b) => b >= Math.max(minBreaker, current * 1.1));
  if (!breaker) {
    return {
      breakerA: null,
      sectionMm2: null,
      computed: false,
      basis: "Charge supérieure aux calibres normalisés (63 A)",
    };
  }
  const maxDropPct = role === "eclairage" || role === "exterieur" ? 0.03 : 0.05;
  const designCurrent = Math.max(current, breaker * 0.6);
  for (const section of SECTIONS) {
    if (section.mm2 < minSection) continue;
    if (section.ampacity < breaker) continue;
    const drop = (2 * BASE_R2 * maxRunM * designCurrent) / section.mm2;
    const dropPct = drop / 230;
    if (dropPct <= maxDropPct) {
      return {
        breakerA: breaker,
        sectionMm2: section.mm2,
        computed: true,
        basis: `Charge ${loadVA.toFixed(0)} VA · ${maxRunM.toFixed(1)} m · chute ${(dropPct * 100).toFixed(1)} %`,
      };
    }
  }
  return {
    breakerA: breaker,
    sectionMm2: null,
    computed: false,
    basis: `Section non calculable : chute de tension > ${(maxDropPct * 100).toFixed(0)} % sur ${maxRunM.toFixed(1)} m`,
  };
}

function luminaireCount(room: PlanRoom): number {
  if (["couloir", "escalier", "wc", "sdb", "sanitaire", "stockage", "garage", "terrasse"].includes(room.kind)) {
    return 1;
  }
  return Math.max(1, Math.min(6, Math.ceil(room.area / 16)));
}

function socketCount(room: PlanRoom): number {
  const base = SOCKET_COUNTS[room.kind] ?? 2;
  // Une petite pièce ne reçoit jamais plus de prises que sa périphérie ne le permet.
  const perimeter = 2 * (room.w + room.h);
  return Math.max(0, Math.min(base, Math.floor(perimeter / 1.2)));
}

function lightGrid(room: PlanRoom, count: number): Pt[] {
  if (count <= 1) {
    return [{ x: room.x + room.w / 2, y: room.y + room.h / 2 }];
  }
  const margin = 0.85;
  const w = Math.max(0.5, room.w - margin * 2);
  const h = Math.max(0.5, room.h - margin * 2);
  const cols = Math.max(1, Math.min(count, Math.ceil(Math.sqrt((count * w) / h))));
  const rows = Math.max(1, Math.ceil(count / cols));
  const points: Pt[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (points.length >= count) break;
      points.push({
        x: room.x + margin + (cols === 1 ? w / 2 : (w * c) / (cols - 1)),
        y: room.y + margin + (rows === 1 ? h / 2 : (h * r) / (rows - 1)),
      });
    }
  }
  return points;
}

/** Points de prise répartis sur les murs, hors emprise des portes. */
function wallSockets(room: PlanRoom, count: number, reserved: Pt[]): Pt[] {
  if (count <= 0) return [];
  const order = wallOrder(room);
  const out: Pt[] = [];
  const perWall = Math.max(1, Math.ceil(count / 4));
  for (const wall of order) {
    const len = wallLength(room, wall);
    if (len < 0.9) continue;
    const doors = room.doors.filter((d) => d.wall === wall);
    const usable: number[] = [];
    const n = Math.min(perWall, Math.max(1, Math.floor(len / 1.4)));
    for (let i = 0; i < n; i++) {
      const base = ((i + 1) / (n + 1)) * len;
      let along = base;
      for (let attempt = 0; attempt < 4; attempt++) {
        const conflict = doors.some((d) => along > d.position - 0.35 && along < d.position + d.width + 0.35);
        if (!conflict) break;
        along = clamp(along + 0.55, 0.4, len - 0.4);
      }
      usable.push(along);
    }
    for (const along of usable) {
      if (out.length >= count) break;
      const p = wallPoint(room, wall, along, 0.22);
      if (reserved.every((q) => dist(p, q) > 0.5)) out.push(p);
    }
    if (out.length >= count) break;
  }
  return out.slice(0, count);
}

function switchPoint(room: PlanRoom): Pt {
  const door = room.doors.find((d) => !d.isEntry) ?? room.doors[0];
  if (door) {
    const len = wallLength(room, door.wall);
    const along = clamp(door.position + door.width + 0.15, 0.35, len - 0.35);
    return wallPoint(room, door.wall, along, 0.22);
  }
  return wallPoint(room, wallOrder(room)[0] ?? "N", 0.45, 0.22);
}

export function generateElectricalPlan(input: TechnicalPlanInput): ElectricalPlan {
  const { floor: plan, floors, level } = input;
  const context = input.context ?? {};
  const warnings: string[] = [];
  const overrides = input.overrides;
  const floorsSafe = floors.length ? floors : [plan];
  const shaft = technicalShaft({ length: plan.length, width: plan.width }, floorsSafe);

  const points: ElectricalPoint[] = [];
  const pushPoint = (p: ElectricalPoint) => {
    points.push(applyOverride(p, overrides, plan.length, plan.width));
  };

  // ── Tableau : à l'entrée réelle du niveau (porte isEntry) ou dans le hall. ──
  const entryRoom =
    plan.rooms.find((r) => r.doors.some((d) => d.isEntry)) ??
    plan.rooms.find((r) => ["hall", "couloir", "sejour"].includes(r.kind)) ??
    plan.rooms[0];
  const panelSpot = entryRoom
    ? freeSpot(entryRoom, [], "douche")
    : { x: shaft.x, y: shaft.y, wall: "N" as WallSide };
  const panel: Pt = { x: round2(panelSpot.x), y: round2(panelSpot.y) };
  pushPoint({
    id: "el-tableau",
    kind: "tableau",
    label:
      level === 0
        ? "Tableau général (TGBT)"
        : `Tableau secondaire — ${floorLabelOf(level)}`,
    roomId: entryRoom?.id ?? null,
    roomLabel: entryRoom?.label ?? null,
    x: panel.x,
    y: panel.y,
    circuitId: null,
  });
  pushPoint({
    id: "el-terre",
    kind: "terre",
    label: "Barrette de terre / liaisons équipotentielles",
    roomId: entryRoom?.id ?? null,
    roomLabel: entryRoom?.label ?? null,
    x: round2(clamp(panel.x - 0.35, 0.2, plan.length - 0.2)),
    y: round2(clamp(panel.y + 0.2, 0.2, plan.width - 0.2)),
    circuitId: null,
  });

  // ── Éclairage, interrupteurs, prises, équipements ─────────────────────────
  const acEnabled = context.airConditioning ?? true;
  const waterHeater = context.waterHeater ?? true;
  const dishwasher =
    context.dishwasher ?? /lave-vaisselle|dishwasher/i.test(context.description ?? "");
  const laundry =
    context.laundry ?? /buanderie|laundry|lave-linge|salle de linge/i.test(context.description ?? "");

  for (const room of plan.rooms) {
    const reserved: Pt[] = [];
    const lights = lightGrid(room, luminaireCount(room));
    lights.forEach((p, i) => {
      reserved.push(p);
      pushPoint({
        id: `el-${room.id}-lum-${i}`,
        kind: "luminaire",
        label: `Luminaire — ${room.label}`,
        roomId: room.id,
        roomLabel: room.label,
        x: round2(p.x),
        y: round2(p.y),
        circuitId: null,
      });
    });

    const sw = switchPoint(room);
    reserved.push(sw);
    pushPoint({
      id: `el-${room.id}-int-0`,
      kind: "interrupteur",
      label: `Interrupteur — ${room.label}`,
      roomId: room.id,
      roomLabel: room.label,
      x: round2(sw.x),
      y: round2(sw.y),
      circuitId: null,
    });

    const sockets = wallSockets(room, socketCount(room), reserved);
    sockets.forEach((p, i) => {
      pushPoint({
        id: `el-${room.id}-prise-${i}`,
        kind: "prise",
        label: `Prise 2P+T — ${room.label}`,
        roomId: room.id,
        roomLabel: room.label,
        x: round2(p.x),
        y: round2(p.y),
        circuitId: null,
      });
    });

    // Prises spécialisées : cuisson (32 A), lave-vaisselle, lave-linge,
    // chauffe-eau. Elles ne sont ajoutées que si l'équipement existe.
    if (["cuisine", "cuisine_pro"].includes(room.kind)) {
      const p = freeSpot(room, [...reserved, ...sockets], "evier");
      reserved.push(p);
      pushPoint({
        id: `el-${room.id}-cuisson`,
        kind: "prise_specialisee",
        label: "Prise spécialisée — cuisson / four",
        roomId: room.id,
        roomLabel: room.label,
        x: round2(p.x),
        y: round2(p.y),
        circuitId: null,
      });
      if (dishwasher) {
        pushPoint({
          id: `el-${room.id}-lave-vaisselle`,
          kind: "prise_specialisee",
          label: "Prise dédiée — lave-vaisselle",
          roomId: room.id,
          roomLabel: room.label,
          x: round2(clamp(p.x + 0.6, room.x + 0.3, room.x + room.w - 0.3)),
          y: round2(p.y),
          circuitId: null,
        });
      }
    }
    if (["sdb", "sanitaire"].includes(room.kind)) {
      if (waterHeater) {
        const p = freeSpot(room, [...reserved, ...sockets], "chauffe_eau");
        reserved.push(p);
        pushPoint({
          id: `el-${room.id}-chauffe-eau`,
          kind: "chauffe_eau",
          label: "Raccordement chauffe-eau",
          roomId: room.id,
          roomLabel: room.label,
          x: round2(p.x),
          y: round2(p.y),
          circuitId: null,
        });
      }
      if (laundry) {
        const p = freeSpot(room, [...reserved, ...sockets], "lave_linge");
        pushPoint({
          id: `el-${room.id}-lave-linge`,
          kind: "prise_specialisee",
          label: "Prise dédiée — lave-linge",
          roomId: room.id,
          roomLabel: room.label,
          x: round2(p.x),
          y: round2(p.y),
          circuitId: null,
          provisional: true,
        });
      }
    }
    if (acEnabled && ["sejour", "chambre", "bureau", "reception", "openspace", "reunion", "salle_client"].includes(room.kind)) {
      const p = freeSpot(room, [...reserved, ...sockets], "douche");
      pushPoint({
        id: `el-${room.id}-clim`,
        kind: "climatiseur",
        label: `Climatiseur (prévisionnel) — ${room.label}`,
        roomId: room.id,
        roomLabel: room.label,
        x: round2(p.x),
        y: round2(p.y),
        circuitId: null,
        provisional: true,
      });
    }
  }

  // Éclairage extérieur : façade d'entrée et façade opposée.
  pushPoint({
    id: "el-ext-0",
    kind: "luminaire_ext",
    label: "Éclairage extérieur — entrée",
    roomId: null,
    roomLabel: null,
    x: round2(clamp(plan.length * 0.2, 0.4, plan.length - 0.4)),
    y: round2(-0.55),
    circuitId: null,
  });
  pushPoint({
    id: "el-ext-1",
    kind: "luminaire_ext",
    label: "Éclairage extérieur — arrière",
    roomId: null,
    roomLabel: null,
    x: round2(clamp(plan.length * 0.8, 0.4, plan.length - 0.4)),
    y: round2(plan.width + 0.55),
    circuitId: null,
  });

  if (laundry && !plan.rooms.some((r) => /buanderie|linge/i.test(r.label))) {
    warnings.push(
      "Buanderie non localisée : la prise dédiée du lave-linge est placée dans une pièce humide existante — à confirmer ou à compléter dans le plan.",
    );
  }

  // ── Circuits ──────────────────────────────────────────────────────────────
  const circuits: ElectricalCircuit[] = [];
  const assign = (ids: string[], circuitId: string) => {
    for (const p of points) if (ids.includes(p.id)) p.circuitId = circuitId;
  };
  const addCircuit = (
    role: ElectricalCircuitRole,
    label: string,
    pointIds: string[],
    ddr: boolean,
  ) => {
    const circuit: ElectricalCircuit = {
      id: `c-${level}-${circuits.length + 1}-${role}`,
      label,
      role,
      pointIds,
      loadVA: 0,
      lengthM: 0,
      breakerA: null,
      sectionMm2: null,
      ddr,
      computed: false,
      basis: "",
    };
    circuits.push(circuit);
    assign(pointIds, circuit.id);
    return circuit;
  };

  const byKind = (kind: ElectricalPointKind) => points.filter((p) => p.kind === kind);
  const group = <T,>(items: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
  };

  group(byKind("luminaire"), 8).forEach((grp, i) => {
    addCircuit(
      "eclairage",
      `Éclairage ${floorLabelOf(level)}${i ? ` — circuit ${i + 1}` : ""}`,
      grp.map((p) => p.id),
      true,
    );
  });
  if (byKind("luminaire_ext").length) {
    addCircuit("exterieur", "Éclairage extérieur", byKind("luminaire_ext").map((p) => p.id), true);
  }
  // Les interrupteurs sont rattachés au circuit d'éclairage de leur pièce.
  for (const sw of byKind("interrupteur")) {
    const sameRoom = points.find(
      (p) => p.kind === "luminaire" && p.roomId === sw.roomId && p.circuitId,
    );
    if (sameRoom?.circuitId) {
      sw.circuitId = sameRoom.circuitId;
      const c = circuits.find((x) => x.id === sameRoom.circuitId);
      if (c && !c.pointIds.includes(sw.id)) c.pointIds.push(sw.id);
    }
  }
  group(byKind("prise"), 8).forEach((grp, i) => {
    addCircuit(
      "prises",
      `Prises ${floorLabelOf(level)}${i ? ` — circuit ${i + 1}` : ""}`,
      grp.map((p) => p.id),
      true,
    );
  });
  for (const p of [...byKind("prise_specialisee"), ...byKind("climatiseur"), ...byKind("chauffe_eau")]) {
    addCircuit(
      p.kind === "climatiseur" ? "climatisation" : "specialise",
      p.label.replace("Prise dédiée — ", "").replace("Raccordement ", ""),
      [p.id],
      true,
    );
  }
  // Un circuit sans point (aucun luminaire, aucune prise) n'est pas affiché.
  const activeCircuits = circuits.filter((c) => c.pointIds.length > 0);

  // ── Cheminements et calcul des sections ───────────────────────────────────
  const cables: CableRun[] = [];
  activeCircuits.forEach((circuit, ci) => {
    const laneY = clamp(
      panel.y + 0.32 + (ci % 6) * 0.11,
      0.28,
      Math.max(0.28, plan.width - 0.28),
    );
    const laneX = clamp(
      panel.x + 0.22 + Math.floor(ci / 6) * 0.12,
      0.28,
      Math.max(0.28, plan.length - 0.28),
    );
    for (const id of circuit.pointIds) {
      const point = points.find((p) => p.id === id);
      if (!point) continue;
      const route = simplify([
        panel,
        { x: laneX, y: panel.y },
        { x: laneX, y: laneY },
        { x: point.x, y: laneY },
        { x: point.x, y: point.y },
      ]);
      const lengthM = round2(polylineLength(route) + 1.4);
      cables.push({
        id: `cab-${circuit.id}-${id}`,
        circuitId: circuit.id,
        points: route,
        lengthM,
      });
    }
    const pointLoads = circuit.pointIds
      .map((id) => points.find((p) => p.id === id))
      .filter((p): p is ElectricalPoint => !!p)
      .reduce((n, p) => n + POINT_LOAD_VA[p.kind], 0);
    // Foisonnement des prises : toutes les prises d'un circuit ne sont jamais
    // sollicitées simultanément.
    const loadVA =
      circuit.role === "prises" ? pointLoads * 0.45 : circuit.role === "climatisation" ? pointLoads * 0.8 : pointLoads;
    const runs = cables.filter((c) => c.circuitId === circuit.id);
    const maxRun = runs.length ? Math.max(...runs.map((r) => r.lengthM)) : 0;
    const circuitLength = round2(runs.reduce((n, r) => n + r.lengthM, 0));
    const sized = sizeCircuit(circuit.role, Math.max(loadVA, 1), maxRun);
    Object.assign(circuit, {
      loadVA: Math.round(loadVA),
      lengthM: circuitLength,
      ...sized,
    });
  });

  // ── Tableau principal : puissance installée et foisonnée ──────────────────
  const installedVA = activeCircuits.reduce((n, c) => n + c.loadVA, 0);
  const diversifiedVA = Math.round(
    activeCircuits.reduce((n, c) => {
      const factor =
        c.role === "eclairage" || c.role === "exterieur"
          ? 0.8
          : c.role === "prises"
            ? 0.35
            : c.role === "climatisation"
              ? 0.7
              : 0.8;
      return n + c.loadVA * factor;
    }, 0),
  );
  const mainCurrent = diversifiedVA / 230;
  const mainBreakerA =
    STANDARD_BREAKERS.find((b) => b >= Math.max(10, mainCurrent * 1.1)) ?? null;
  if (!mainBreakerA) {
    warnings.push("Puissance foisonnée supérieure à 63 A : prévoir une alimentation triphasée ou une étude dédiée.");
  }
  if (activeCircuits.some((c) => !c.computed)) {
    warnings.push(
      "Certains calibres / sections n'ont pas pu être calculés : ils ne sont pas affichés comme définitifs.",
    );
  }
  if (!plan.rooms.length) {
    warnings.push("Plan architectural vide : aucun point électrique ne peut être placé.");
  }
  if (
    points.some(
      (p) => p.provisional || p.kind === "prise_specialisee" || p.kind === "chauffe_eau",
    )
  ) {
    warnings.push(
      "Puissances des équipements non renseignées (cuisson, chauffe-eau, climatisation) : calibres calculés sur des puissances typiques, à confirmer avec les fiches techniques avant travaux.",
    );
  }

  const quantities = electricalQuantities({
    points,
    circuits: activeCircuits,
    cables,
    level,
  });

  return {
    kind: "electricite",
    level,
    floorLabel: floorLabelOf(level),
    length: plan.length,
    width: plan.width,
    area: plan.area,
    panel,
    riser: shaft,
    points,
    circuits: activeCircuits,
    cables,
    installedVA,
    diversifiedVA,
    mainBreakerA,
    warnings,
    quantities,
  };
}

export function electricalQuantities(input: {
  points: ElectricalPoint[];
  circuits: ElectricalCircuit[];
  cables: CableRun[];
  level: number;
}): QuantityLine[] {
  const { points, circuits, cables, level } = input;
  const lines: QuantityLine[] = [];
  const count = (kind: ElectricalPointKind) => points.filter((p) => p.kind === kind).length;
  const add = (id: string, group: string, label: string, unit: QuantityUnit, quantity: number) => {
    if (quantity > 0) lines.push({ id, kind: "electricite", group, label, unit, quantity });
  };

  add("el-lum", "Appareillage", "Points lumineux intérieurs", "points", count("luminaire"));
  add("el-lum-ext", "Appareillage", "Points lumineux extérieurs", "points", count("luminaire_ext"));
  add("el-int", "Appareillage", "Interrupteurs / commandes", "unité", count("interrupteur"));
  add("el-prises", "Appareillage", "Prises 2P+T", "unité", count("prise"));
  add("el-prises-spec", "Appareillage", "Prises spécialisées", "unité", count("prise_specialisee"));
  add("el-clim", "Équipements", "Points de raccordement climatisation (prévisionnel)", "unité", count("climatiseur"));
  add("el-ce", "Équipements", "Raccordements chauffe-eau", "unité", count("chauffe_eau"));
  if (level === 0) {
    add("el-tableau", "Tableau et protections", "Tableau électrique général", "unité", 1);
  } else {
    add(
      "el-tableau-secondaire",
      "Tableau et protections",
      "Tableau secondaire de niveau",
      "unité",
      1,
    );
  }
  add("el-terre", "Tableau et protections", "Barrette de terre / liaisons équipotentielles", "lot", count("terre"));

  const bySection = new Map<number, number>();
  for (const c of circuits) {
    if (!c.computed || !c.sectionMm2) continue;
    bySection.set(c.sectionMm2, (bySection.get(c.sectionMm2) ?? 0) + c.lengthM);
  }
  for (const [section, length] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
    add(
      `el-cable-${section}`,
      "Câblage et gaines",
      `Câble ${section.toLocaleString("fr-FR")} mm²`,
      "ml",
      round2(length * 1.08),
    );
  }
  const totalCable = [...bySection.values()].reduce((n, v) => n + v, 0);
  add("el-gaine", "Câblage et gaines", "Gaines ICTA / tubes IRL", "ml", round2(totalCable * 1.08));
  add(
    "el-boites",
    "Câblage et gaines",
    "Boîtes de dérivation et d'encastrement",
    "unité",
    points.filter((p) => p.kind !== "terre").length + circuits.length * 2,
  );

  const byBreaker = new Map<number, number>();
  for (const c of circuits) {
    if (!c.breakerA) continue;
    byBreaker.set(c.breakerA, (byBreaker.get(c.breakerA) ?? 0) + 1);
  }
  for (const [breaker, qty] of [...byBreaker.entries()].sort((a, b) => a[0] - b[0])) {
    add(
      `el-disj-${breaker}`,
      "Tableau et protections",
      `Disjoncteurs divisionnaires ${breaker} A`,
      "unité",
      qty,
    );
  }
  const ddrCircuits = circuits.filter((c) => c.ddr).length;
  add(
    "el-ddr",
    "Tableau et protections",
    "Interrupteurs différentiels 30 mA (1 par 8 circuits)",
    "unité",
    Math.max(1, Math.ceil(ddrCircuits / 8)),
  );
  if (level === 0) {
    add("el-parafoudre", "Tableau et protections", "Parafoudre type 2 (tableau principal)", "unité", 1);
  }
  add(
    "el-colonne",
    "Câblage et gaines",
    "Montée électrique verticale (part forfaitaire)",
    "ml",
    level === 0 ? 2 : 3,
  );

  return lines;
}

// ── Agrégation multi-niveaux ────────────────────────────────────────────────

export function aggregateTechnicalQuantities(plans: TechnicalPlan[]): QuantityLine[] {
  return mergeQuantityLines(plans.flatMap((p) => p.quantities));
}
