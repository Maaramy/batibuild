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
  | "piscine"
  | "jardin"
  | "garage"
  | "cloture"
  | "terrasse"
  | "toiture"
  | "parking"
  | "aire_jeux"
  | "chateau_eau"
  | "irrigation"
  | "voirie"
  | "solaire"
  | "chantier"
  | "reseau"
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
  { id: "piscine", label: "Piscine" },
  { id: "jardin", label: "Jardin / Espace paysager" },
  { id: "garage", label: "Garage / Abri" },
  { id: "cloture", label: "Clôture / Mur de séparation" },
  { id: "terrasse", label: "Terrasse / Pergola" },
  { id: "toiture", label: "Toiture / Dalle" },
  { id: "parking", label: "Parking / Stationnement" },
  { id: "aire_jeux", label: "Aire de jeux" },
  { id: "chateau_eau", label: "Château d'eau" },
  { id: "irrigation", label: "Système d'irrigation" },
  { id: "voirie", label: "Route / Trottoir" },
  { id: "solaire", label: "Installation solaire" },
  { id: "chantier", label: "Chantier / Rénovation" },
  { id: "reseau", label: "Réseaux techniques" },
  { id: "generique", label: "Bâtiment générique" },
];

export const isHousingType = (t: PlanTypeId) =>
  t === "maison" || t === "villa" || t === "appartement" || t === "immeuble";

/**
 * Détection automatique du type de bien à partir de la surface au sol (m²).
 * Heuristique calibrée pour le marché tunisien : petit logement → maison,
 * moyen → villa, grand → immeuble, très grand → entrepôt, immense → générique.
 * (La catégorie explicite du projet, si elle existe, reste prioritaire.)
 */
export function detectPlanTypeFromSurface(surface: number): PlanTypeId {
  const s = Math.max(0, surface || 0);
  if (s < 90) return "maison";
  if (s < 170) return "villa";
  if (s < 380) return "immeuble";
  if (s < 950) return "entrepot";
  return "generique";
}

export type RoomKind =
  | "room"
  | "corridor"
  | "terrace"
  | "balcon"
  | "shopfloor"
  | "quai"
  | "wet"
  | "priere"
  | "stairs"
  | "pool"
  | "green"
  | "car"
  | "play"
  | "roof"
  | "solar"
  | "water"
  | "road"
  | "pipe"
  | "cloture";

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
  piscine: 2.1,
  jardin: 1.7,
  garage: 1.9,
  cloture: 1.6,
  terrasse: 1.8,
  toiture: 1.5,
  parking: 2.2,
  aire_jeux: 1.8,
  chateau_eau: 1.0,
  irrigation: 1.9,
  voirie: 3.4,
  solaire: 2.0,
  chantier: 1.5,
  reseau: 1.9,
  generique: 1.5,
};

// ─── Template : logement (maison / villa / appartement / immeuble) ───────────

function housing(
  w: number,
  h: number,
  beds: number,
  villa: boolean,
  apartment: boolean,
  floors: number,
  rnd: () => number,
): Room[] {
  const rooms: Room[] = [];
  const jit = (lo: number, hi: number) => lo + rnd() * (hi - lo);
  const corridorW = clamp(w * 0.13 * jit(0.92, 1.08), 1.1, 1.9);
  const entH = 1.4; // bande d'entrée (pleine largeur, façade)
  const wetColW = clamp(w * 0.18 * jit(0.9, 1.1), 2.8, 3.6);
  const wetX = w - wetColW;
  const areaX = corridorW;
  const areaW = w - corridorW - wetColW;
  const areaY = entH;
  const areaH = h - entH;
  // Terrasse en façade (villa) ou balcon à l'arrière (appartement)
  const stripH = villa ? jit(1.6, 2.3) : apartment ? jit(1.3, 1.9) : 0;
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
  // Escalier (logements à étages) en bas du couloir
  if (floors > 1) {
    rooms.push({
      id: "escalier",
      name: "Escalier",
      x: 0,
      y: areaY + areaH - 2.4,
      w: corridorW,
      h: 2.4,
      kind: "stairs",
    });
  }

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
  const salW = areaW * jit(0.5, 0.62);
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

function commerce(w: number, h: number, restaurant: boolean, rnd: () => number): Room[] {
  const rooms: Room[] = [];
  // Bande avant (cuisine / réserve / sanitaires / bureaux) : hauteur variable
  const frontH = h * (0.26 + rnd() * 0.12);
  const mainW = w * (0.34 + rnd() * 0.18);
  const sanW = w * (0.18 + rnd() * 0.08);
  if (restaurant) {
    rooms.push({
      id: "salle",
      name: "Salle de restaurant",
      x: 0,
      y: frontH,
      w,
      h: h - frontH,
      kind: "shopfloor",
      glassEdge: ["bottom"],
    });
    rooms.push({ id: "cuisine", name: "Cuisine", x: 0, y: 0, w: mainW, h: frontH, kind: "wet" });
    rooms.push({ id: "sanitaire", name: "Sanitaires", x: mainW, y: 0, w: sanW, h: frontH, kind: "wet" });
    rooms.push({ id: "bureau", name: "Bureau / Caisse", x: mainW + sanW, y: 0, w: w - mainW - sanW, h: frontH });
  } else {
    rooms.push({
      id: "salle",
      name: "Espace de vente",
      x: 0,
      y: frontH,
      w,
      h: h - frontH,
      kind: "shopfloor",
      glassEdge: ["bottom"],
    });
    rooms.push({ id: "reserve", name: "Réserve", x: 0, y: 0, w: mainW, h: frontH });
    rooms.push({ id: "sanitaire", name: "Sanitaires", x: mainW, y: 0, w: sanW, h: frontH, kind: "wet" });
    rooms.push({ id: "bureau", name: "Bureau / Comptoir", x: mainW + sanW, y: 0, w: w - mainW - sanW, h: frontH });
  }
  return rooms;
}

// ─── Template : bureau ───────────────────────────────────────────────────────

function bureau(w: number, h: number, rnd: () => number): Room[] {
  const bandH = h * (0.26 + rnd() * 0.08);
  const accueilH = h * (0.14 + rnd() * 0.06);
  const meetW = w * (0.32 + rnd() * 0.16);
  const sanW = w * (0.14 + rnd() * 0.08);
  const restW = w - meetW - sanW;
  return [
    { id: "reunion", name: "Salle de réunion", x: 0, y: 0, w: meetW, h: bandH },
    { id: "sanitaires", name: "Sanitaires", x: meetW, y: 0, w: sanW, h: bandH, kind: "wet" },
    { id: "bureau1", name: "Bureau", x: meetW + sanW, y: 0, w: restW / 2, h: bandH },
    { id: "bureau2", name: "Bureau", x: meetW + sanW + restW / 2, y: 0, w: restW / 2, h: bandH },
    { id: "openspace", name: "Open space", x: 0, y: bandH, w, h: h - bandH - accueilH },
    { id: "accueil", name: "Accueil", x: 0, y: h - accueilH, w, h: accueilH },
  ];
}

// ─── Template : entrepôt / atelier / usine ───────────────────────────────────

function entrepot(w: number, h: number, rnd: () => number): Room[] {
  const bandH = h * (0.22 + rnd() * 0.08);
  const officeW = w * (0.28 + rnd() * 0.12);
  const sanW = w * (0.12 + rnd() * 0.06);
  const vestW = w * (0.16 + rnd() * 0.08);
  const quaiH = h * (0.08 + rnd() * 0.06);
  return [
    { id: "bureaux", name: "Bureaux", x: 0, y: 0, w: officeW, h: bandH },
    { id: "sanitaires", name: "Sanitaires", x: officeW, y: 0, w: sanW, h: bandH, kind: "wet" },
    { id: "vestiaires", name: "Vestiaires", x: officeW + sanW, y: 0, w: vestW, h: bandH },
    { id: "stockage", name: "Stockage / Atelier", x: officeW + sanW + vestW, y: 0, w: w - officeW - sanW - vestW, h: bandH },
    { id: "hall", name: "Hall principal", x: 0, y: bandH, w, h: h - bandH - quaiH },
    { id: "quai", name: "Quai de chargement", x: 0, y: h - quaiH, w, h: quaiH, kind: "quai" },
  ];
}

// ─── Template : ferme agricole ───────────────────────────────────────────────

function ferme(w: number, h: number, rnd: () => number): Room[] {
  const bandH = h * (0.26 + rnd() * 0.08);
  const officeW = w * (0.28 + rnd() * 0.1);
  const sanW = w * (0.12 + rnd() * 0.06);
  const vestW = w * (0.16 + rnd() * 0.08);
  const hangarW = w * (0.56 + rnd() * 0.14);
  return [
    { id: "bureaux", name: "Bureaux", x: 0, y: 0, w: officeW, h: bandH },
    { id: "sanitaires", name: "Sanitaires", x: officeW, y: 0, w: sanW, h: bandH, kind: "wet" },
    { id: "vestiaire", name: "Vestiaire", x: officeW + sanW, y: 0, w: vestW, h: bandH },
    { id: "rangement", name: "Rangement", x: officeW + sanW + vestW, y: 0, w: w - officeW - sanW - vestW, h: bandH },
    { id: "hangar", name: "Hangar / Étable", x: 0, y: bandH, w: hangarW, h: h - bandH },
    { id: "stockage", name: "Stockage / Grange", x: hangarW, y: bandH, w: w - hangarW, h: h - bandH },
  ];
}

// ─── Template : école ────────────────────────────────────────────────────────

function ecole(w: number, h: number, rnd: () => number): Room[] {
  const topH = h * (0.38 + rnd() * 0.08);
  const corridorH = h * (0.13 + rnd() * 0.06);
  const c1 = w * (0.3 + rnd() * 0.08);
  const c2 = w * (0.3 + rnd() * 0.08);
  const bottomY = topH + corridorH;
  const bottomH = h - bottomY;
  const b1 = w * (0.22 + rnd() * 0.06);
  const b2 = w * (0.16 + rnd() * 0.06);
  const b3 = w * (0.14 + rnd() * 0.06);
  const b4 = w * (0.14 + rnd() * 0.06);
  return [
    { id: "classe1", name: "Salle de classe", x: 0, y: 0, w: c1, h: topH },
    { id: "classe2", name: "Salle de classe", x: c1, y: 0, w: c2, h: topH },
    { id: "classe3", name: "Salle de classe", x: c1 + c2, y: 0, w: w - c1 - c2, h: topH },
    { id: "couloir", name: "Couloir", x: 0, y: topH, w, h: corridorH, kind: "corridor" },
    { id: "biblio", name: "Bibliothèque", x: 0, y: bottomY, w: b1, h: bottomH },
    { id: "bureau", name: "Bureau directeur", x: b1, y: bottomY, w: b2, h: bottomH },
    { id: "sanitaires", name: "Sanitaires", x: b1 + b2, y: bottomY, w: b3, h: bottomH, kind: "wet" },
    { id: "accueil", name: "Accueil", x: b1 + b2 + b3, y: bottomY, w: b4, h: bottomH },
    { id: "cantine", name: "Cantine", x: b1 + b2 + b3 + b4, y: bottomY, w: w - b1 - b2 - b3 - b4, h: bottomH },
  ];
}

// ─── Template : mosquée ──────────────────────────────────────────────────────

function mosquee(w: number, h: number, rnd: () => number): Room[] {
  const sideW = w * (0.13 + rnd() * 0.05);
  const entH = h * (0.14 + rnd() * 0.08);
  return [
    { id: "vestiaire", name: "Vestiaire", x: 0, y: 0, w: sideW, h: h * 0.45 },
    { id: "ablutions", name: "Ablutions", x: 0, y: h * 0.45, w: sideW, h: h * 0.55, kind: "wet" },
    { id: "entree", name: "Entrée", x: sideW, y: 0, w: w - 2 * sideW, h: entH },
    { id: "biblio", name: "Bibliothèque", x: w - sideW, y: 0, w: sideW, h: h * 0.45 },
    { id: "sanitaires", name: "Sanitaires", x: w - sideW, y: h * 0.45, w: sideW, h: h * 0.55, kind: "wet" },
    { id: "priere", name: "Salle de prière", x: sideW, y: entH, w: w - 2 * sideW, h: h - entH, kind: "priere" },
  ];
}

// ─── Template : piscine ─────────────────────────────────────────────────────

function piscine(w: number, h: number, rnd: () => number): Room[] {
  const deckH = clamp(h * (0.13 + rnd() * 0.03), 1.6, 3.0);
  const techH = clamp(h * (0.11 + rnd() * 0.03), 1.2, 2.2);
  const bassinH = h - deckH - techH;
  const techW = w * (0.45 + rnd() * 0.1);
  return [
    { id: "plage", name: "Plage / Détente", x: 0, y: 0, w, h: deckH, kind: "terrace" },
    { id: "bassin", name: "Bassin", x: 0, y: deckH, w, h: bassinH, kind: "pool" },
    { id: "technique", name: "Local technique", x: 0, y: deckH + bassinH, w: techW, h: techH, kind: "wet" },
    { id: "douches", name: "Douches", x: techW, y: deckH + bassinH, w: w - techW, h: techH, kind: "wet" },
  ];
}

// ─── Template : jardin / aménagement paysager ───────────────────────────────

function jardin(w: number, h: number, rnd: () => number): Room[] {
  const alleeH = clamp(h * (0.13 + rnd() * 0.03), 1.2, 2.0);
  const sideW = w * (0.2 + rnd() * 0.05);
  const deckW = w * 0.2;
  const bodyH = h - alleeH;
  const deckH = bodyH * 0.55;
  return [
    { id: "allee", name: "Allée principale", x: 0, y: 0, w, h: alleeH, kind: "corridor" },
    { id: "massif", name: "Massif fleuri", x: 0, y: alleeH, w: sideW, h: bodyH, kind: "green" },
    { id: "pelouse", name: "Pelouse", x: sideW, y: alleeH, w: w - sideW - deckW, h: bodyH, kind: "green" },
    { id: "terrasse", name: "Terrasse détente", x: w - deckW, y: alleeH, w: deckW, h: deckH, kind: "terrace" },
    { id: "point_eau", name: "Point d'eau", x: w - deckW, y: alleeH + deckH, w: deckW, h: bodyH - deckH, kind: "pool" },
  ];
}

// ─── Template : garage / abri ───────────────────────────────────────────────

function garage(w: number, h: number, rnd: () => number): Room[] {
  const rampeH = clamp(h * (0.14 + rnd() * 0.04), 1.4, 2.4);
  const localW = w * (0.3 + rnd() * 0.1);
  return [
    { id: "stationnement", name: "Aire de stationnement", x: 0, y: 0, w, h: h - rampeH, kind: "car" },
    { id: "rampe", name: "Rampe d'accès", x: 0, y: h - rampeH, w: w - localW, h: rampeH, kind: "corridor" },
    { id: "local", name: "Local technique", x: w - localW, y: h - rampeH, w: localW, h: rampeH, kind: "wet" },
  ];
}

// ─── Template : clôture / mur de séparation ─────────────────────────────────

function cloture(w: number, h: number, rnd: () => number): Room[] {
  const t = 0.3 + rnd() * 0.2; // épaisseur du mur périphérique (0,3 – 0,5 m)
  return [
    { id: "mur_haut", name: "Mur périphérique", x: 0, y: 0, w, h: t, kind: "cloture" },
    { id: "mur_bas", name: "Mur périphérique", x: 0, y: h - t, w, h: t, kind: "cloture" },
    { id: "mur_gauche", name: "Mur périphérique", x: 0, y: t, w: t, h: h - 2 * t, kind: "cloture" },
    { id: "mur_droit", name: "Mur périphérique", x: w - t, y: t, w: t, h: h - 2 * t, kind: "cloture" },
    { id: "cour", name: "Cour intérieure", x: t, y: t, w: w - 2 * t, h: h - 2 * t, kind: "green" },
  ];
}

// ─── Template : terrasse / pergola / cuisine extérieure ─────────────────────

function terrasse(w: number, h: number, rnd: () => number): Room[] {
  const pergolaH = clamp(h * (0.14 + rnd() * 0.04), 1.2, 2.2);
  const repasH = clamp(h * (0.16 + rnd() * 0.04), 1.3, 2.4);
  const cuisineW = w * (0.32 + rnd() * 0.08);
  const bodyH = h - pergolaH - repasH;
  return [
    { id: "pergola", name: "Pergola / Ombrière", x: 0, y: 0, w, h: pergolaH, kind: "terrace" },
    { id: "terrasse", name: "Terrasse principale", x: 0, y: pergolaH, w: w - cuisineW, h: bodyH, kind: "terrace" },
    { id: "cuisine_ext", name: "Cuisine extérieure", x: w - cuisineW, y: pergolaH, w: cuisineW, h: bodyH, kind: "wet" },
    { id: "repas", name: "Coin repas", x: 0, y: pergolaH + bodyH, w, h: repasH, kind: "terrace" },
  ];
}

// ─── Template : toiture / dalle ─────────────────────────────────────────────

function toiture(w: number, h: number, rnd: () => number): Room[] {
  const t = 0.4;
  const cageW = clamp(w * (0.2 + rnd() * 0.05), 2.2, 3.6);
  const cageH = clamp(h * (0.28 + rnd() * 0.06), 2.4, 3.6);
  const techH = clamp(h * (0.2 + rnd() * 0.05), 1.8, 2.8);
  const x0 = t;
  const y0 = t;
  const iw = w - 2 * t;
  const ih = h - 2 * t;
  return [
    { id: "acro_haut", name: "Acrotère", x: 0, y: 0, w, h: t, kind: "cloture" },
    { id: "acro_bas", name: "Acrotère", x: 0, y: h - t, w, h: t, kind: "cloture" },
    { id: "acro_gauche", name: "Acrotère", x: 0, y: t, w: t, h: ih, kind: "cloture" },
    { id: "acro_droit", name: "Acrotère", x: w - t, y: t, w: t, h: ih, kind: "cloture" },
    { id: "dalle", name: "Dalle de toiture", x: x0, y: y0, w: iw, h: ih, kind: "roof" },
    { id: "escalier", name: "Cage d'escalier", x: x0, y: y0, w: cageW, h: cageH, kind: "stairs" },
    { id: "local_tech", name: "Local technique", x: x0 + cageW, y: y0, w: iw - cageW, h: techH, kind: "wet" },
    { id: "evacuation", name: "Évacuation eaux pluviales", x: x0 + cageW, y: y0 + techH, w: iw - cageW, h: ih - techH, kind: "pool" },
  ];
}

// ─── Template : parking extérieur ───────────────────────────────────────────

function parking(w: number, h: number, rnd: () => number): Room[] {
  const accesW = w * (0.2 + rnd() * 0.05);
  const voieH = clamp(h * (0.18 + rnd() * 0.05), 1.6, 3.2);
  const rowH = h - voieH;
  return [
    { id: "places", name: "Aire de stationnement", x: 0, y: 0, w: w - accesW, h: rowH, kind: "car" },
    { id: "acces", name: "Accès véhicules", x: w - accesW, y: 0, w: accesW, h: rowH, kind: "corridor" },
    { id: "voie", name: "Voie de circulation", x: 0, y: rowH, w, h: voieH, kind: "road" },
  ];
}

// ─── Template : aire de jeux ────────────────────────────────────────────────

function aireJeux(w: number, h: number, rnd: () => number): Room[] {
  const parentsH = clamp(h * (0.12 + rnd() * 0.04), 1.3, 2.2);
  const sableW = w * (0.36 + rnd() * 0.08);
  const bodyH = h - parentsH;
  return [
    { id: "parents", name: "Espace parents / Bancs", x: 0, y: 0, w, h: parentsH, kind: "play" },
    { id: "terrain", name: "Terrain de jeux", x: 0, y: parentsH, w: w - sableW, h: bodyH, kind: "green" },
    { id: "sable", name: "Aire de sable", x: w - sableW, y: parentsH, w: sableW, h: bodyH, kind: "play" },
  ];
}

// ─── Template : château d'eau ───────────────────────────────────────────────

function chateauEau(w: number, h: number, rnd: () => number): Room[] {
  const couronneH = clamp(h * (0.08 + rnd() * 0.03), 0.9, 1.6);
  const piedH = clamp(h * (0.16 + rnd() * 0.04), 1.6, 2.6);
  const techW = w * (0.42 + rnd() * 0.1);
  return [
    { id: "couronne", name: "Garde-corps", x: 0, y: 0, w, h: couronneH, kind: "cloture" },
    { id: "reservoir", name: "Réservoir", x: 0, y: couronneH, w, h: h - couronneH - piedH, kind: "water" },
    { id: "technique", name: "Local technique", x: 0, y: h - piedH, w: techW, h: piedH, kind: "wet" },
    { id: "acces", name: "Accès", x: techW, y: h - piedH, w: w - techW, h: piedH, kind: "corridor" },
  ];
}

// ─── Template : système d'irrigation ────────────────────────────────────────

function irrigation(w: number, h: number, rnd: () => number): Room[] {
  const bassinW = w * (0.34 + rnd() * 0.1);
  const pompeW = w * 0.2;
  const collecteurH = clamp(h * (0.1 + rnd() * 0.04), 1.0, 1.8);
  return [
    { id: "bassin", name: "Bassin de stockage", x: 0, y: 0, w: bassinW, h: h - collecteurH, kind: "pool" },
    { id: "pompe", name: "Pompe / Local", x: bassinW, y: 0, w: pompeW, h: h - collecteurH, kind: "wet" },
    { id: "compteur", name: "Compteur / Vannes", x: bassinW + pompeW, y: 0, w: w - bassinW - pompeW, h: h - collecteurH, kind: "pipe" },
    { id: "collecteur", name: "Collecteur", x: 0, y: h - collecteurH, w, h: collecteurH, kind: "pipe" },
  ];
}

// ─── Template : voirie (route / trottoir) ───────────────────────────────────

function voirie(w: number, h: number, rnd: () => number): Room[] {
  const trottoirH = clamp(h * (0.13 + rnd() * 0.03), 1.2, 2.0);
  const stationW = w * (0.12 + rnd() * 0.04);
  const vertW = w * (0.1 + rnd() * 0.04);
  const bodyH = h - 2 * trottoirH;
  return [
    { id: "trottoir_haut", name: "Trottoir", x: 0, y: 0, w, h: trottoirH, kind: "corridor" },
    { id: "trottoir_bas", name: "Trottoir", x: 0, y: h - trottoirH, w, h: trottoirH, kind: "corridor" },
    { id: "stationnement", name: "Stationnement", x: 0, y: trottoirH, w: stationW, h: bodyH, kind: "car" },
    { id: "chaussee", name: "Chaussée", x: stationW, y: trottoirH, w: w - stationW - vertW, h: bodyH, kind: "road" },
    { id: "vegetale", name: "Bande végétale", x: w - vertW, y: trottoirH, w: vertW, h: bodyH, kind: "green" },
  ];
}

// ─── Template : installation solaire ────────────────────────────────────────

function solaire(w: number, h: number, rnd: () => number): Room[] {
  const bandH = clamp(h * (0.14 + rnd() * 0.1), 1.4, 2.4);
  const onduleurW = w * (0.22 + rnd() * 0.05);
  const localW = w * 0.3;
  return [
    { id: "local", name: "Local technique", x: 0, y: 0, w: localW, h: bandH, kind: "wet" },
    { id: "onduleurs", name: "Onduleurs", x: localW, y: 0, w: onduleurW, h: bandH, kind: "pipe" },
    { id: "acces", name: "Accès maintenance", x: localW + onduleurW, y: 0, w: w - localW - onduleurW, h: bandH, kind: "corridor" },
    { id: "champ", name: "Champ photovoltaïque", x: 0, y: bandH, w, h: h - bandH, kind: "solar" },
  ];
}

// ─── Template : chantier (rénovation / démolition) ──────────────────────────

function chantier(w: number, h: number, rnd: () => number): Room[] {
  const stockW = w * (0.2 + rnd() * 0.06);
  const benneH = clamp(h * (0.12 + rnd() * 0.04), 1.2, 2.0);
  const accesH = clamp(h * (0.09 + rnd() * 0.03), 1.0, 1.6);
  const bodyH = h - benneH - accesH;
  return [
    { id: "intervention", name: "Zone d'intervention", x: 0, y: 0, w: w - stockW, h: bodyH, kind: "shopfloor" },
    { id: "stockage", name: "Zone de stockage", x: w - stockW, y: 0, w: stockW, h: bodyH, kind: "quai" },
    { id: "benne", name: "Benne / Évacuation", x: 0, y: bodyH, w, h: benneH, kind: "quai" },
    { id: "acces", name: "Accès chantier", x: 0, y: bodyH + benneH, w, h: accesH, kind: "corridor" },
  ];
}

// ─── Template : réseaux techniques (sanitaires / électricité) ───────────────

function reseau(w: number, h: number, rnd: () => number): Room[] {
  const primW = w * 0.24;
  const secW = w * 0.18;
  const tabW = w * (0.2 + rnd() * 0.06);
  const gridW = w - primW - secW;
  return [
    { id: "primaire", name: "Réseau principal", x: 0, y: 0, w: primW, h, kind: "pipe" },
    { id: "secondaire", name: "Réseau secondaire", x: primW, y: 0, w: secW, h, kind: "pipe" },
    { id: "tableau", name: "Tableau / Compteurs", x: primW + secW, y: 0, w: tabW, h: h * 0.4, kind: "wet" },
    { id: "p1", name: "Point d'usage 1", x: primW + secW + tabW, y: 0, w: gridW - tabW, h: h * 0.4 },
    { id: "p2", name: "Point d'usage 2", x: primW + secW, y: h * 0.4, w: gridW, h: h * 0.3 },
    { id: "p3", name: "Point d'usage 3", x: primW + secW, y: h * 0.7, w: gridW, h: h * 0.3 },
  ];
}

// ─── Template : générique ────────────────────────────────────────────────────

function generique(w: number, h: number, rnd: () => number): Room[] {
  const rooms: Room[] = [];
  const side = rnd() < 0.5 ? "left" : "right";
  const corridorW = w * (0.12 + rnd() * 0.05);
  const entH = 1.5;
  const cols = rnd() < 0.5 ? 2 : 3;
  const rows = rnd() < 0.5 ? 3 : 2;
  const cx = side === "left" ? 0 : w - corridorW;
  const gw = w - corridorW;
  rooms.push({ id: "entree", name: "Entrée", x: cx, y: 0, w: corridorW, h: entH });
  rooms.push({ id: "corridor", name: "Couloir", x: cx, y: entH, w: corridorW, h: h - entH, kind: "corridor" });
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rooms.push({
        id: `espace${n}`,
        name: `Espace ${String(n).padStart(2, "0")}`,
        x: cx + (c * gw) / cols,
        y: (r * h) / rows,
        w: gw / cols,
        h: h / rows,
      });
      n++;
    }
  }
  return rooms;
}

function buildRooms(type: PlanTypeId, w: number, h: number, beds: number, seed: number, floors: number): Room[] {
  const rnd = mulberry32(seed);
  let rooms: Room[];
  switch (type) {
    case "maison":
      rooms = housing(w, h, beds, false, false, floors, rnd);
      break;
    case "villa":
      rooms = housing(w, h, beds, true, false, floors, rnd);
      break;
    case "appartement":
    case "immeuble":
      rooms = housing(w, h, beds, false, true, floors, rnd);
      break;
    case "commerce":
      rooms = commerce(w, h, false, rnd);
      break;
    case "restaurant":
      rooms = commerce(w, h, true, rnd);
      break;
    case "bureau":
      rooms = bureau(w, h, rnd);
      break;
    case "entrepot":
    case "atelier":
      rooms = entrepot(w, h, rnd);
      break;
    case "ferme":
      rooms = ferme(w, h, rnd);
      break;
    case "ecole":
      rooms = ecole(w, h, rnd);
      break;
    case "mosquee":
      rooms = mosquee(w, h, rnd);
      break;
    case "piscine":
      rooms = piscine(w, h, rnd);
      break;
    case "jardin":
      rooms = jardin(w, h, rnd);
      break;
    case "garage":
      rooms = garage(w, h, rnd);
      break;
    case "cloture":
      rooms = cloture(w, h, rnd);
      break;
    case "terrasse":
      rooms = terrasse(w, h, rnd);
      break;
    case "toiture":
      rooms = toiture(w, h, rnd);
      break;
    case "parking":
      rooms = parking(w, h, rnd);
      break;
    case "aire_jeux":
      rooms = aireJeux(w, h, rnd);
      break;
    case "chateau_eau":
      rooms = chateauEau(w, h, rnd);
      break;
    case "irrigation":
      rooms = irrigation(w, h, rnd);
      break;
    case "voirie":
      rooms = voirie(w, h, rnd);
      break;
    case "solaire":
      rooms = solaire(w, h, rnd);
      break;
    case "chantier":
      rooms = chantier(w, h, rnd);
      break;
    case "reseau":
      rooms = reseau(w, h, rnd);
      break;
    default:
      rooms = generique(w, h, rnd);
  }
  // Variante : miroir horizontal (disposition inversée) selon la graine
  if (rnd() < 0.5) {
    for (const r of rooms) {
      r.x = w - r.x - r.w;
      r.glassEdge = r.glassEdge?.map((e) =>
        e === "left" ? "right" : e === "right" ? "left" : e,
      );
    }
  }
  return rooms;
}

// ─── Ouvertures : portes + fenêtres ──────────────────────────────────────────

function buildOpenings(rooms: Room[], W: number, H: number, seed: number): { doors: DoorSpec[]; windows: WinSpec[] } {
  const doors: DoorSpec[] = [];
  const windows: WinSpec[] = [];
  const eps = 0.02;
  // Graine décalée pour que portes / fenêtres varient indépendamment des pièces
  const rnd = mulberry32((seed ^ 0x9e3779b9) >>> 0);

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

  const exteriorDoor = (roomId: string, edge: "top" | "bottom" | "left" | "right", len: number, atOverride?: number) => {
    const r = rooms.find((x) => x.id === roomId);
    if (!r) return;
    const big = len >= 2.4;
    const c = atOverride ?? r.x + r.w / 2;
    const from = c - len / 2;
    const to = c + len / 2;
    if (edge === "bottom") doors.push({ axis: "h", at: r.y + r.h, from, to, len, swing: 1, big });
    else if (edge === "top") doors.push({ axis: "h", at: r.y, from, to, len, swing: -1, big });
    else if (edge === "left") doors.push({ axis: "v", at: r.x, from: r.y, to: r.y + r.h, len, swing: -1, big });
    else doors.push({ axis: "v", at: r.x + r.w, from: r.y, to: r.y + r.h, len, swing: 1, big });
  };

  const has = (id: string) => rooms.some((r) => r.id === id);
  if (has("entree")) {
    const ent = rooms.find((x) => x.id === "entree");
    const c = ent ? ent.x + ent.w * (0.25 + 0.5 * rnd()) : undefined;
    exteriorDoor("entree", "top", 1.0, c);
  }
  const shop = rooms.find((r) => r.kind === "shopfloor");
  if (shop) exteriorDoor(shop.id, "bottom", 1.2);
  if (has("quai")) exteriorDoor("quai", "bottom", 3.5);
  if (has("cour")) exteriorDoor("cour", "bottom", 3.0); // portail de la clôture
  if (has("rampe")) exteriorDoor("rampe", "bottom", 3.2); // porte de garage
  if (has("voie")) exteriorDoor("voie", "bottom", 4.0); // entrée véhicules du parking
  if (has("benne")) exteriorDoor("acces", "bottom", 2.6); // accès chantier
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
    if (
      r.kind === "corridor" ||
      r.kind === "terrace" ||
      r.kind === "balcon" ||
      r.kind === "quai" ||
      r.kind === "pool" ||
      r.kind === "green" ||
      r.kind === "car" ||
      r.kind === "play" ||
      r.kind === "roof" ||
      r.kind === "solar" ||
      r.kind === "water" ||
      r.kind === "road" ||
      r.kind === "pipe" ||
      r.kind === "cloture"
    )
      continue;
    const edges: { edge: "top" | "bottom" | "left" | "right"; axis: "h" | "v"; at: number; from: number; to: number }[] = [];
    if (r.y <= eps) edges.push({ edge: "top", axis: "h", at: r.y, from: r.x, to: r.x + r.w });
    if (r.y + r.h >= H - eps) edges.push({ edge: "bottom", axis: "h", at: r.y + r.h, from: r.x, to: r.x + r.w });
    if (r.x <= eps) edges.push({ edge: "left", axis: "v", at: r.x, from: r.y, to: r.y + r.h });
    if (r.x + r.w >= W - eps) edges.push({ edge: "right", axis: "v", at: r.x + r.w, from: r.y, to: r.y + r.h });

    for (const e of edges) {
      if (r.glassEdge?.includes(e.edge)) continue;
      const L = e.to - e.from;
      if (L < 1.5) continue;
      const count = (L >= 5.5 ? 2 : 1) + (L >= 4.2 && rnd() < 0.45 ? 1 : 0);
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
  const rooms = buildRooms(type, w, h, bedrooms, p.seed, floors);
  const { doors, windows } = buildOpenings(rooms, w, h, p.seed);
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
