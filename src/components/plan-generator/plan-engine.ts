// ============================================================================
// Moteur de génération de plans architecturaux 2D (BudgetBati — IA)
// ----------------------------------------------------------------------------
// Génère un plan d'étage (floor plan) vectoriel à partir des caractéristiques
// du projet : type de bien, surface, nombre d'étages, nombre de chambres et
// une graine aléatoire (seed) qui permet de produire plusieurs variantes.
// 100 % déterministe et sans dépendance externe : testable unitairement.
// ============================================================================

export type PlanTypeId =
  | "maison"
  | "villa"
  | "appartement"
  | "immeuble"
  | "commerce"
  | "restaurant"
  | "bureau"
  | "entrepot"
  | "atelier"
  | "ferme"
  | "ecole"
  | "mosquee"
  | "generique";

export const PLAN_TYPES: { id: PlanTypeId; label: string }[] = [
  { id: "maison", label: "Maison individuelle" },
  { id: "villa", label: "Villa" },
  { id: "appartement", label: "Appartement" },
  { id: "immeuble", label: "Immeuble — étage type" },
  { id: "commerce", label: "Local commercial" },
  { id: "restaurant", label: "Restaurant / Café" },
  { id: "bureau", label: "Bureau / Espace professionnel" },
  { id: "entrepot", label: "Entrepôt / Dépôt" },
  { id: "atelier", label: "Atelier / Usine" },
  { id: "ferme", label: "Ferme agricole" },
  { id: "ecole", label: "École" },
  { id: "mosquee", label: "Mosquée" },
  { id: "generique", label: "Bâtiment générique" },
];

export const isHousingType = (t: PlanTypeId) =>
  t === "maison" || t === "villa" || t === "appartement" || t === "immeuble";

export type RoomKind =
  | "room"
  | "corridor"
  | "terrace"
  | "balcon"
  | "shopfloor"
  | "quai"
  | "wet"
  | "priere";

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: RoomKind;
  /** Edges rendered as full glass (storefront). */
  glassEdge?: ("top" | "bottom" | "left" | "right")[];
}

export interface DoorSpec {
  axis: "h" | "v";
  at: number; // y for h / x for v (wall line)
  from: number;
  to: number;
  len: number; // door width in meters
  swing: 1 | -1; // side the door opens into
  big?: boolean; // large rolling door (quai / grange)
}

export interface WinSpec {
  axis: "h" | "v";
  at: number;
  from: number;
  to: number;
  len: number;
}

export interface PlanParams {
  type: PlanTypeId;
  /** Total built surface in m² (all floors). */
  surface: number;
  floors: number;
  bedrooms: number;
  seed: number;
  projectName: string;
  region?: string;
}

export interface PlanLayout {
  width: number;
  height: number;
  rooms: Room[];
  doors: DoorSpec[];
  windows: WinSpec[];
  typeLabel: string;
  projectName: string;
  region?: string;
  surface: number;
  floors: number;
  bedrooms: number;
  perFloor: number;
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ASPECT: Record<PlanTypeId, number> = {
  maison: 1.4,
  villa: 1.5,
  appartement: 1.35,
  immeuble: 1.3,
  commerce: 1.85,
  restaurant: 1.6,
  bureau: 1.5,
  entrepot: 1.9,
  atelier: 1.7,
  ferme: 1.8,
  ecole: 2.0,
  mosquee: 1.35,
  generique: 1.5,
};

// ─── Template : logement (maison / villa / appartement / immeuble) ───────────

function housing(
  w: number,
  h: number,
  beds: number,
  villa: boolean,
  apartment: boolean,
): Room[] {
  const rooms: Room[] = [];
  const corridorW = clamp(w * 0.13, 1.1, 1.9);
  const entH = 1.4; // bande d'entrée (pleine largeur, façade)
  const wetColW = clamp(w * 0.18, 2.8, 3.6);
  const wetX = w - wetColW;
  const areaX = corridorW;
  const areaW = w - corridorW - wetColW;
  const areaY = entH;
  const areaH = h - entH;
  // Terrasse en façade (villa) ou balcon à l'arrière (appartement)
  const stripH = villa ? 2.0 : apartment ? 1.6 : 0;
  const y0 = areaY + (villa ? stripH : 0);
  const usableH = areaH - stripH;
  const B = clamp(Math.round(beds) || 2, 1, 6);

  rooms.push({ id: "entree", name: "Entrée", x: 0, y: 0, w, h: entH });
  rooms.push({
    id: "corridor",
    name: "Couloir",
    x: 0,
    y: entH,
    w: corridorW,
    h: areaH,
    kind: "corridor",
  });

  // Colonne humide (droite) : SDB + WC + buanderie
  const wetTop = y0;
  const sdbH = usableH * 0.55;
  rooms.push({ id: "sdb", name: "Salle de bain", x: wetX, y: wetTop, w: 1.9, h: sdbH, kind: "wet" });
  rooms.push({ id: "wc", name: "WC", x: wetX + 1.9, y: wetTop, w: wetColW - 1.9, h: sdbH, kind: "wet" });
  rooms.push({ id: "buanderie", name: "Buanderie", x: wetX, y: wetTop + sdbH, w: wetColW, h: usableH - sdbH });

  // Chambres + éventuel dressing/bureau en rangées (2 par rangée)
  const chIds = ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6"];
  const rows: { id: string; name: string }[][] = [];
  let idx = 0;
  while (idx < B) {
    const remaining = B - idx;
    const take = Math.min(2, remaining);
    const rowItems: { id: string; name: string }[] = [];
    for (let k = 0; k < take; k++) {
      rowItems.push({ id: chIds[idx + k], name: `Chambre ${idx + k + 1}` });
    }
    if (remaining === 1 && B > 1) {
      rowItems.push({ id: "dressing", name: B >= 5 ? "Bureau" : "Dressing" });
    }
    rows.push(rowItems);
    idx += take;
  }
  const rowsCount = rows.length;
  const salonRowH = usableH * (B <= 2 ? 0.42 : 0.36);
  const chambreRowH = (usableH - salonRowH) / rowsCount;

  rows.forEach((rowItems, row) => {
    const rw = areaW / rowItems.length;
    rowItems.forEach((it, col) => {
      rooms.push({ id: it.id, name: it.name, x: areaX + col * rw, y: y0 + row * chambreRowH, w: rw, h: chambreRowH });
    });
  });

  // Rangée séjour / cuisine
  const salonY = y0 + rowsCount * chambreRowH;
  const salonH = usableH - rowsCount * chambreRowH;
  const salW = areaW * 0.56;
  rooms.push({ id: "salon", name: "Séjour / Salon", x: areaX, y: salonY, w: salW, h: salonH });
  rooms.push({ id: "cuisine", name: "Cuisine", x: areaX + salW, y: salonY, w: areaW - salW, h: salonH, kind: "wet" });

  // Bande terrasse (villa, façade) ou balcon (appartement, arrière)
  if (villa) {
    rooms.push({ id: "terrasse", name: "Terrasse", x: areaX, y: areaY, w: areaW, h: stripH, kind: "terrace" });
  } else if (apartment) {
    rooms.push({ id: "balcon", name: "Balcon", x: areaX, y: areaY + usableH, w: areaW, h: stripH, kind: "balcon" });
  }

  return rooms;
}

// ─── Template : commerce / restaurant / café ────────────────────────────────

function commerce(w: number, h: number, restaurant: boolean): Room[] {
  const rooms: Room[] = [];
  if (restaurant) {
    rooms.push({
      id: "salle",
      name: "Salle de restaurant",
      x: 0,
      y: h * 0.32,
      w,
      h: h * 0.68,
      kind: "shopfloor",
      glassEdge: ["bottom"],
    });
    rooms.push({ id: "cuisine", name: "Cuisine", x: 0, y: 0, w: w * 0.42, h: h * 0.32, kind: "wet" });
    rooms.push({ id: "sanitaire", name: "Sanitaires", x: w * 0.42, y: 0, w: w * 0.2, h: h * 0.32, kind: "wet" });
    rooms.push({ id: "bureau", name: "Bureau / Caisse", x: w * 0.62, y: 0, w: w * 0.38, h: h * 0.32 });
  } else {
    rooms.push({
      id: "salle",
      name: "Espace de vente",
      x: 0,
      y: h * 0.3,
      w,
      h: h * 0.7,
      kind: "shopfloor",
      glassEdge: ["bottom"],
    });
    rooms.push({ id: "reserve", name: "Réserve", x: 0, y: 0, w: w * 0.42, h: h * 0.3 });
    rooms.push({ id: "sanitaire", name: "Sanitaires", x: w * 0.42, y: 0, w: w * 0.22, h: h * 0.3, kind: "wet" });
    rooms.push({ id: "bureau", name: "Bureau / Comptoir", x: w * 0.64, y: 0, w: w * 0.36, h: h * 0.3 });
  }
  return rooms;
}

// ─── Template : bureau ───────────────────────────────────────────────────────

function bureau(w: number, h: number): Room[] {
  return [
    { id: "reunion", name: "Salle de réunion", x: 0, y: 0, w: w * 0.4, h: h * 0.3 },
    { id: "sanitaires", name: "Sanitaires", x: w * 0.4, y: 0, w: w * 0.18, h: h * 0.3, kind: "wet" },
    { id: "bureau1", name: "Bureau", x: w * 0.58, y: 0, w: w * 0.21, h: h * 0.3 },
    { id: "bureau2", name: "Bureau", x: w * 0.79, y: 0, w: w * 0.21, h: h * 0.3 },
    { id: "openspace", name: "Open space", x: 0, y: h * 0.3, w, h: h * 0.54 },
    { id: "accueil", name: "Accueil", x: 0, y: h * 0.84, w, h: h * 0.16 },
  ];
}

// ─── Template : entrepôt / atelier / usine ───────────────────────────────────

function entrepot(w: number, h: number): Room[] {
  return [
    { id: "bureaux", name: "Bureaux", x: 0, y: 0, w: w * 0.34, h: h * 0.24 },
    { id: "sanitaires", name: "Sanitaires", x: w * 0.34, y: 0, w: w * 0.16, h: h * 0.24, kind: "wet" },
    { id: "vestiaires", name: "Vestiaires", x: w * 0.5, y: 0, w: w * 0.2, h: h * 0.24 },
    { id: "stockage", name: "Stockage / Atelier", x: w * 0.7, y: 0, w: w * 0.3, h: h * 0.24 },
    { id: "hall", name: "Hall principal", x: 0, y: h * 0.24, w, h: h * 0.66 },
    { id: "quai", name: "Quai de chargement", x: 0, y: h * 0.9, w, h: h * 0.1, kind: "quai" },
  ];
}

// ─── Template : ferme agricole ───────────────────────────────────────────────

function ferme(w: number, h: number): Room[] {
  return [
    { id: "bureaux", name: "Bureaux", x: 0, y: 0, w: w * 0.34, h: h * 0.28 },
    { id: "sanitaires", name: "Sanitaires", x: w * 0.34, y: 0, w: w * 0.16, h: h * 0.28, kind: "wet" },
    { id: "vestiaire", name: "Vestiaire", x: w * 0.5, y: 0, w: w * 0.2, h: h * 0.28 },
    { id: "rangement", name: "Rangement", x: w * 0.7, y: 0, w: w * 0.3, h: h * 0.28 },
    { id: "hangar", name: "Hangar / Étable", x: 0, y: h * 0.28, w: w * 0.62, h: h * 0.72 },
    { id: "stockage", name: "Stockage / Grange", x: w * 0.62, y: h * 0.28, w: w * 0.38, h: h * 0.72 },
  ];
}

// ─── Template : école ────────────────────────────────────────────────────────

function ecole(w: number, h: number): Room[] {
  return [
    { id: "classe1", name: "Salle de classe", x: 0, y: 0, w: w * 0.34, h: h * 0.42 },
    { id: "classe2", name: "Salle de classe", x: w * 0.34, y: 0, w: w * 0.33, h: h * 0.42 },
    { id: "classe3", name: "Salle de classe", x: w * 0.67, y: 0, w: w * 0.33, h: h * 0.42 },
    { id: "couloir", name: "Couloir", x: 0, y: h * 0.42, w, h: h * 0.16, kind: "corridor" },
    { id: "biblio", name: "Bibliothèque", x: 0, y: h * 0.58, w: w * 0.26, h: h * 0.42 },
    { id: "bureau", name: "Bureau directeur", x: w * 0.26, y: h * 0.58, w: w * 0.2, h: h * 0.42 },
    { id: "sanitaires", name: "Sanitaires", x: w * 0.46, y: h * 0.58, w: w * 0.18, h: h * 0.42, kind: "wet" },
    { id: "accueil", name: "Accueil", x: w * 0.64, y: h * 0.58, w: w * 0.18, h: h * 0.42 },
    { id: "cantine", name: "Cantine", x: w * 0.82, y: h * 0.58, w: w * 0.18, h: h * 0.42 },
  ];
}

// ─── Template : mosquée ──────────────────────────────────────────────────────

function mosquee(w: number, h: number): Room[] {
  return [
    { id: "vestiaire", name: "Vestiaire", x: 0, y: 0, w: w * 0.15, h: h * 0.45 },
    { id: "ablutions", name: "Ablutions", x: 0, y: h * 0.45, w: w * 0.15, h: h * 0.55, kind: "wet" },
    { id: "entree", name: "Entrée", x: w * 0.15, y: 0, w: w * 0.7, h: h * 0.2 },
    { id: "biblio", name: "Bibliothèque", x: w * 0.85, y: 0, w: w * 0.15, h: h * 0.45 },
    { id: "sanitaires", name: "Sanitaires", x: w * 0.85, y: h * 0.45, w: w * 0.15, h: h * 0.55, kind: "wet" },
    { id: "priere", name: "Salle de prière", x: w * 0.15, y: h * 0.2, w: w * 0.7, h: h * 0.8, kind: "priere" },
  ];
}

// ─── Template : générique ────────────────────────────────────────────────────

function generique(w: number, h: number): Room[] {
  const rooms: Room[] = [];
  const corridorW = w * 0.14;
  const entH = 1.5;
  rooms.push({ id: "entree", name: "Entrée", x: 0, y: 0, w: corridorW, h: entH });
  rooms.push({ id: "corridor", name: "Couloir", x: 0, y: entH, w: corridorW, h: h - entH, kind: "corridor" });
  const gw = w - corridorW;
  const gh = h;
  const cols = 3;
  const rows = 2;
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rooms.push({
        id: `espace${n}`,
        name: `Espace ${String(n).padStart(2, "0")}`,
        x: corridorW + (c * gw) / cols,
        y: (r * gh) / rows,
        w: gw / cols,
        h: gh / rows,
      });
      n++;
    }
  }
  return rooms;
}

function buildRooms(type: PlanTypeId, w: number, h: number, beds: number, seed: number): Room[] {
  const rnd = mulberry32(seed);
  void rnd; // réservé aux futures variantes paramétriques
  switch (type) {
    case "maison":
      return housing(w, h, beds, false, false);
    case "villa":
      return housing(w, h, beds, true, false);
    case "appartement":
    case "immeuble":
      return housing(w, h, beds, false, true);
    case "commerce":
      return commerce(w, h, false);
    case "restaurant":
      return commerce(w, h, true);
    case "bureau":
      return bureau(w, h);
    case "entrepot":
    case "atelier":
      return entrepot(w, h);
    case "ferme":
      return ferme(w, h);
    case "ecole":
      return ecole(w, h);
    case "mosquee":
      return mosquee(w, h);
    default:
      return generique(w, h);
  }
}

// ─── Ouvertures : portes + fenêtres ──────────────────────────────────────────

function buildOpenings(rooms: Room[], W: number, H: number): { doors: DoorSpec[]; windows: WinSpec[] } {
  const doors: DoorSpec[] = [];
  const windows: WinSpec[] = [];
  const eps = 0.02;

  const addAdjacentDoor = (a: Room, b: Room, axis: "h" | "v", at: number, from: number, to: number) => {
    if (to - from < 1.2) return;
    if (a.kind === "quai" || b.kind === "quai") return;
    // Terrasse / balcon : ne connecter qu'au séjour, à la cuisine ou à l'entrée
    const isDeck = (r: Room) => r.kind === "terrace" || r.kind === "balcon";
    if (isDeck(a) && !isDeck(b) && b.id !== "salon" && b.id !== "cuisine" && b.id !== "entree") return;
    if (isDeck(b) && !isDeck(a) && a.id !== "salon" && a.id !== "cuisine" && a.id !== "entree") return;
    let swing: 1 | -1;
    if (a.kind === "corridor") swing = axis === "h" ? (b.y < at ? -1 : 1) : (b.x < at ? -1 : 1);
    else if (b.kind === "corridor") swing = axis === "h" ? (a.y < at ? -1 : 1) : (a.x < at ? -1 : 1);
    else swing = axis === "h" ? (a.y < at ? 1 : -1) : (a.x < at ? 1 : -1);
    doors.push({ axis, at, from, to, len: 1.0, swing });
  };

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      if (Math.abs(a.y + a.h - b.y) < eps) addAdjacentDoor(a, b, "h", b.y, Math.max(a.x, b.x), Math.min(a.x + a.w, b.x + b.w));
      else if (Math.abs(b.y + b.h - a.y) < eps) addAdjacentDoor(a, b, "h", a.y, Math.max(a.x, b.x), Math.min(a.x + a.w, b.x + b.w));
      if (Math.abs(a.x + a.w - b.x) < eps) addAdjacentDoor(a, b, "v", b.x, Math.max(a.y, b.y), Math.min(a.y + a.h, b.y + b.h));
      else if (Math.abs(b.x + b.w - a.x) < eps) addAdjacentDoor(a, b, "v", a.x, Math.max(a.y, b.y), Math.min(a.y + a.h, b.y + b.h));
    }
  }

  const exteriorDoor = (roomId: string, edge: "top" | "bottom" | "left" | "right", len: number) => {
    const r = rooms.find((x) => x.id === roomId);
    if (!r) return;
    const big = len >= 2.4;
    if (edge === "bottom") doors.push({ axis: "h", at: r.y + r.h, from: r.x, to: r.x + r.w, len, swing: 1, big });
    else if (edge === "top") doors.push({ axis: "h", at: r.y, from: r.x, to: r.x + r.w, len, swing: -1, big });
    else if (edge === "left") doors.push({ axis: "v", at: r.x, from: r.y, to: r.y + r.h, len, swing: -1, big });
    else doors.push({ axis: "v", at: r.x + r.w, from: r.y, to: r.y + r.h, len, swing: 1, big });
  };

  const has = (id: string) => rooms.some((r) => r.id === id);
  if (has("entree")) exteriorDoor("entree", "top", 1.0);
  const shop = rooms.find((r) => r.kind === "shopfloor");
  if (shop) exteriorDoor(shop.id, "bottom", 1.2);
  if (has("quai")) exteriorDoor("quai", "bottom", 3.5);
  if (has("accueil")) exteriorDoor("accueil", "bottom", 1.1);
  if (has("hangar")) exteriorDoor("hangar", "bottom", 3.0);
  if (has("stockage") && has("hangar")) exteriorDoor("stockage", "bottom", 3.0);

  // Fenêtres sur les murs extérieurs
  const doorRects = doors.map((d) => ({
    axis: d.axis,
    at: d.at,
    from: (d.from + d.to) / 2 - d.len / 2 - 0.3,
    to: (d.from + d.to) / 2 + d.len / 2 + 0.3,
  }));

  for (const r of rooms) {
    if (r.kind === "corridor" || r.kind === "terrace" || r.kind === "balcon" || r.kind === "quai") continue;
    const edges: { edge: "top" | "bottom" | "left" | "right"; axis: "h" | "v"; at: number; from: number; to: number }[] = [];
    if (r.y <= eps) edges.push({ edge: "top", axis: "h", at: r.y, from: r.x, to: r.x + r.w });
    if (r.y + r.h >= H - eps) edges.push({ edge: "bottom", axis: "h", at: r.y + r.h, from: r.x, to: r.x + r.w });
    if (r.x <= eps) edges.push({ edge: "left", axis: "v", at: r.x, from: r.y, to: r.y + r.h });
    if (r.x + r.w >= W - eps) edges.push({ edge: "right", axis: "v", at: r.x + r.w, from: r.y, to: r.y + r.h });

    for (const e of edges) {
      if (r.glassEdge?.includes(e.edge)) continue;
      const L = e.to - e.from;
      if (L < 1.5) continue;
      const count = L >= 5.5 ? 2 : 1;
      const slot = L / count;
      for (let k = 0; k < count; k++) {
        const c = e.from + slot * k + slot / 2;
        const len = clamp(slot * 0.55, 1.0, 2.0);
        const clash = doorRects.some(
          (d) => d.axis === e.axis && Math.abs(d.at - e.at) < 0.3 && c + len / 2 > d.from && c - len / 2 < d.to,
        );
        if (clash) continue;
        windows.push({ axis: e.axis, at: e.at, from: c - len / 2, to: c + len / 2, len });
      }
    }
  }

  return { doors, windows };
}

// ─── Point d'entrée public ───────────────────────────────────────────────────

export function generatePlan(p: PlanParams): PlanLayout {
  const floors = Math.max(1, Math.round(p.floors) || 1);
  const surface = Math.max(30, p.surface || 80);
  const perFloor = Math.round(surface / floors);
  const type = p.type;
  const aspect = ASPECT[type] ?? 1.4;
  let w = Math.sqrt(perFloor * aspect);
  let h = w / aspect;
  w = round1(w);
  h = round1(h);
  const bedrooms = clamp(Math.round(p.bedrooms) || 2, 1, 6);
  const rooms = buildRooms(type, w, h, bedrooms, p.seed);
  const { doors, windows } = buildOpenings(rooms, w, h);
  const typeLabel = PLAN_TYPES.find((t) => t.id === type)?.label ?? type;

  return {
    width: w,
    height: h,
    rooms,
    doors,
    windows,
    typeLabel,
    projectName: p.projectName || "Projet sans nom",
    region: p.region,
    surface,
    floors,
    bedrooms,
    perFloor,
    generatedAt: new Date().toLocaleDateString("fr-FR"),
  };
}
