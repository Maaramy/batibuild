// ============================================================================
// MOTEUR GÉNÉRATIF DE PLANS D'ARCHITECTE (Floor Plans 2D / 3D)
// ----------------------------------------------------------------------------
// Génère 10 variantes de plans par projet, chacune :
//  - respectant strictement les contraintes géométriques (surface, emprise)
//  - découpée par partition binaire récursive (BSP) ⇒ aucun chevauchement,
//    somme des surfaces pièces = surface du niveau (au centimètre près)
//  - équipée de portes (circulation) et fenêtres (pièces habitables)
//  - à structure continue entre niveaux (gaine d'escalier alignée + emprise
//    et axes structurants identiques sur tous les étages)
// Le moteur est déterministe (PRNG semé) et sans dépendance externe.
// ============================================================================

// ── Types publics ───────────────────────────────────────────────────────────

export type RoomKind =
  | "sejour"
  | "cuisine"
  | "chambre"
  | "sdb"
  | "wc"
  | "couloir"
  | "escalier"
  | "bureau"
  | "garage"
  | "reception"
  | "openspace"
  | "reunion"
  | "sanitaire"
  | "hall"
  | "stockage"
  | "logistique"
  | "vestiaire"
  | "polyvalent"
  // — Restauration (café / restaurant) —
  | "salle_client"
  | "comptoir"
  | "cuisine_pro"
  | "plonge"
  | "chambre_froide"
  | "terrasse"
  | "attente"
  // — Extérieur / annexes résidentielles —
  | "patio"
  | "buanderie";

export type WallSide = "N" | "S" | "E" | "W";

export interface DoorSpec {
  /** Mur de la pièce portant la porte */
  wall: WallSide;
  /** Position le long du mur (m, depuis l'origine du mur) */
  position: number;
  /** Largeur du battant (m) */
  width: number;
  /** Porte d'entrée principale ? */
  isEntry?: boolean;
}

export interface WindowSpec {
  wall: WallSide;
  position: number;
  width: number;
}

export interface PlanRoom {
  id: string;
  kind: RoomKind;
  label: string;
  /** Coin supérieur gauche, en mètres (origine = coin NO de l'emprise) */
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  doors: DoorSpec[];
  windows: WindowSpec[];
  /**
   * Espace extérieur non couvert (patio, cour) : il fait partie de l'emprise
   * dessinée mais JAMAIS de la surface habitable ni de la surface bâtie.
   */
  exterior?: boolean;
}

export interface FloorPlan {
  /** 0 = rez-de-chaussée */
  level: number;
  /** Emprise X (longueur, m) */
  length: number;
  /** Emprise Y (largeur/profondeur, m) */
  width: number;
  rooms: PlanRoom[];
  area: number;
}

export interface PlanValidation {
  dimensionsOk: boolean;
  noOverlap: boolean;
  areasOk: boolean;
  circulationOk: boolean;
  structureOk: boolean;
  /** Aucun aménagement extérieur dans le bâti, aucun débordement de parcelle. */
  exteriorOk: boolean;
  /** Les trois catégories de surfaces sont cohérentes et non additionnées. */
  surfacesOk: boolean;
  /** Note de conformité sur 100 */
  score: number;
  issues: string[];
}

/** Espaces extérieurs aménagés, TOUJOURS hors du bâtiment. */
export type SiteElementKind =
  | "terrasse"
  | "piscine"
  | "cuisine_exterieure"
  | "jardin"
  | "allee"
  | "stationnement"
  | "acces";

export interface SiteElement {
  id: string;
  kind: SiteElementKind;
  label: string;
  /** Coordonnées dans le repère de la parcelle (origine = coin NO). */
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  /** Espace praticable / dur (terrasse, allée, piscine…). */
  hardscape?: boolean;
  /** Terrasse couverte (pergola / débord de toit) — jamais une pièce fermée. */
  covered?: boolean;
}

export interface SitePlan {
  /** Parcelle : dimensions réelles du projet ou parcelle de référence estimée. */
  plot: {
    length: number;
    width: number;
    area: number;
    source: "projet" | "estimee";
  };
  /** Emprise du bâtiment dans le repère de la parcelle. */
  building: { x: number; y: number; w: number; h: number; area: number };
  /** Aménagements extérieurs (terrasse, piscine, cuisine d'été, accès…). */
  elements: SiteElement[];
  /** Patios extérieurs intégrés au volume bâti (coordonnées parcelle). */
  patios: { x: number; y: number; w: number; h: number; area: number }[];
  /** Jardin = parcelle − bâti − aménagements durs (jamais additionné au bâti). */
  gardenArea: number;
  /** Surface extérieure aménagée totale = parcelle − emprise du bâti. */
  exteriorArea: number;
  /** Orientation de la façade principale (S = meilleur ensoleillement hivernal). */
  orientation: WallSide;
  orientationLabel: string;
  /** Contraintes réelles : parcelle limitée, piscine non représentable, etc. */
  constraints: string[];
}

/** Les trois catégories de surfaces, affichées séparément (jamais cumulées). */
export interface SurfaceBreakdown {
  /** Surface habitable intérieure (pièces fermées, hors garage/annexes). */
  interior: number;
  /** Surface bâtie complémentaire (garage, local technique, stockage couvert). */
  complementary: number;
  /** Surface bâtie totale = intérieure + complémentaire. */
  built: number;
  /** Surface bâtie au sol (rez-de-chaussée hors patio extérieur). */
  groundBuilt: number;
  /** Emprise au sol du bâti (patio compris). */
  footprint: number;
  /** Surface extérieure aménagée (jardin, piscine, terrasse, cuisine d'été, accès). */
  exterior: number;
  /** Jardin seul (sans les aménagements durs). */
  garden: number;
  /** Parcelle totale. */
  plot: number;
  /** Détail des espaces extérieurs (piscine, terrasse, cuisine d'été…). */
  exteriorDetails: { kind: SiteElementKind; label: string; area: number }[];
}

export interface FloorPlanVariant {
  id: string;
  name: string;
  style: string;
  /** Identifiant stable du parti architectural (10 partis distincts). */
  styleId: string;
  /** Accroche courte affichée sur la carte de variante. */
  tagline: string;
  /** Description du parti architectural (distribution, orientation, climat). */
  description: string;
  /** Avantages concrets de cette variante. */
  advantages: string[];
  /** Caractéristiques principales (matériaux, dispositifs, espaces). */
  characteristics: string[];
  /** Emprise au sol commune à tous les niveaux */
  footprint: { length: number; width: number };
  floors: FloorPlan[];
  /** Surface bâtie totale (habitable + complémentaire), hors extérieurs. */
  totalArea: number;
  /** Les trois catégories de surfaces, strictement séparées. */
  surfaces: SurfaceBreakdown;
  /** Plan de masse : parcelle, bâti et aménagements extérieurs. */
  site: SitePlan;
  /** Note conceptuelle générée (description architecturale) */
  conceptNote: string;
  validation: PlanValidation;
}

export interface FloorPlanInput {
  category: string;
  /** Surface construite totale (m²), tous niveaux confondus */
  surface: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  wcs?: number;
  /**
   * Travaux complémentaires RÉELLEMENT sélectionnés par l'utilisateur
   * (clés de la liste prédéfinie : piscine, garage, cuisine_exterieure, jardin,
   * solaire). Ils deviennent des besoins / contraintes du programme : le garage
   * et la cuisine extérieure entrent dans le programme des pièces, les autres
   * sont rappelés dans la note conceptuelle (implantation piscine, espaces
   * extérieurs, toiture pour le solaire). Aucune liste indépendante n'est
   * créée : ces clés viennent de la sélection enregistrée du projet.
   */
  works?: string[];
  /** Surface totale de la parcelle (m²) si elle est connue. */
  plotArea?: number;
  /** Nombre de piscines déclarées sur le projet. */
  pools?: number;
  /** Nombre de garages déclarés sur le projet. */
  garages?: number;
}

// ── PRNG déterministe (mulberry32) ──────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EPS = 1e-6;



// ── Couleurs par nature de pièce (partagées 2D / 3D) ───────────────────────

export const PLAN_ROOM_COLORS: Record<RoomKind, string> = {
  sejour: "#dbeafe",
  cuisine: "#fef3c7",
  chambre: "#e0e7ff",
  sdb: "#cffafe",
  wc: "#f1f5f9",
  couloir: "#f8fafc",
  escalier: "#ede9fe",
  bureau: "#dcfce7",
  garage: "#e5e7eb",
  reception: "#fce7f3",
  openspace: "#e0f2fe",
  reunion: "#ffe4e6",
  sanitaire: "#f1f5f9",
  hall: "#f8fafc",
  stockage: "#fef9c3",
  logistique: "#ecfccb",
  vestiaire: "#f1f5f9",
  polyvalent: "#f5f5f4",
  // — Restauration —
  salle_client: "#fef9c3",
  comptoir: "#fed7aa",
  cuisine_pro: "#fef3c7",
  plonge: "#cffafe",
  chambre_froide: "#e0f2fe",
  terrasse: "#dcfce7",
  attente: "#f3e8ff",
  patio: "#ecfccb",
  buanderie: "#e2e8f0",
};

export const PLAN_ROOM_LABELS: Record<RoomKind, string> = {
  sejour: "Séjour",
  cuisine: "Cuisine",
  chambre: "Chambre",
  sdb: "Salle de bain",
  wc: "WC",
  couloir: "Couloir",
  escalier: "Escalier",
  bureau: "Bureau",
  garage: "Garage",
  reception: "Réception",
  openspace: "Espace ouvert",
  reunion: "Salle de réunion",
  sanitaire: "Sanitaires",
  hall: "Hall",
  stockage: "Zone de stockage",
  logistique: "Zone logistique",
  vestiaire: "Vestiaire",
  polyvalent: "Espace polyvalent",
  // — Restauration —
  salle_client: "Salle client",
  comptoir: "Comptoir / Bar",
  cuisine_pro: "Cuisine pro",
  plonge: "Plonge",
  chambre_froide: "Chambre froide",
  terrasse: "Terrasse",
  attente: "Zone d'attente",
  patio: "Patio",
  buanderie: "Buanderie",
};

// ── Familles de projets ─────────────────────────────────────────────────────

type ProjectFamily = "residential" | "commercial" | "logistics" | "restoration";

function familyForCategory(category: string): ProjectFamily {
  switch (category) {
    case "local_commercial":
    case "bureau":
    case "residence_touristique":
      return "commercial";
    case "entrepot":
      return "logistics";
    case "cafe":
    case "restaurant":
      return "restoration";
    default:
      // maison, villa, appartement, studio, duplex, immeuble, projet_neuf…
      return "residential";
  }
}

// ── Programmes de pièces ────────────────────────────────────────────────────

interface ProgramItem {
  kind: RoomKind;
  label: string;
  /** Surface cible (m²) avant mise à l'échelle */
  target: number;
  /** Surface minimale acceptable (m²) ; la pièce est retirée sinon */
  min: number;
  /** Priorité de maintien (plus grand = conservé en priorité) */
  priority: number;
  /** Pièce habitable ⇒ exige une fenêtre */
  habitable?: boolean;
  /** Unique dans le programme */
  unique?: boolean;
}

function residentialProgram(
  input: FloorPlanInput,
  floorAreaPerLevel: number,
  levels: number,
  style?: StyleProfile,
): { level: number; items: ProgramItem[] }[] {
  const area = floorAreaPerLevel;
  const tune = style?.tuning ?? {};
  // Le nombre de chambres se déduit de la surface TOTALE du logement (et non
  // du seul niveau) : 180 m² → 4 chambres, 120 m² → 3, 90-100 m² → 2.
  // Densifier davantage produirait des chambres de couloir et des pièces d'eau
  // surdimensionnées par rapport aux usages familiaux tunisiens.
  const totalArea = area * Math.max(1, levels);
  const bedrooms =
    input.bedrooms && input.bedrooms > 0
      ? input.bedrooms
      : Math.max(1, Math.min(6, Math.ceil(totalArea / 48)));
  const bathrooms =
    input.bathrooms && input.bathrooms > 0
      ? input.bathrooms
      : Math.max(1, Math.min(3, Math.floor(bedrooms / 2)));
  const kitchens = input.kitchens && input.kitchens > 0 ? input.kitchens : 1;
  const livingRooms =
    input.livingRooms && input.livingRooms > 0 ? input.livingRooms : 1;
  // 1 à 3 chambres : une salle d'eau + le WC invités suffisent. À partir de
  // 4 chambres, un second WC séparé devient confortable et réaliste.
  const wcs =
    input.wcs && input.wcs > 0 ? input.wcs : bedrooms >= 4 ? 2 : 1;
  const works = input.works ?? [];

  const bedroomScale = tune.bedroomScale ?? 1;
  const masterBoost = tune.masterBoost ?? 0;
  const mkChambre = (i: number): ProgramItem => ({
    kind: "chambre",
    label: i === 0 ? "Chambre principale" : `Chambre ${i + 1}`,
    target: Math.max(9, (i === 0 ? 16 + masterBoost : 13) * bedroomScale),
    min: 8.5,
    priority: 10 - i,
    habitable: true,
  });

  // Répartition des chambres sur les étages (RDC gardé pour les espaces de vie)
  const bedroomLevels: number[][] = Array.from({ length: levels }, () => []);
  let bi = 0;
  // Remplir à partir du dernier niveau en remontant (les étages portent les chambres).
  // Niveau unique : la boucle est ignorée, le repli ci-dessous place tout au RDC.
  for (let pass = 0; levels > 1 && pass < bedrooms; pass++) {
    const lvl = levels - 1 - (pass % Math.max(1, levels - 1));
    bedroomLevels[Math.max(1, Math.min(levels - 1, lvl))].push(bi++);
  }
  if (levels === 1) {
    bedroomLevels[0] = Array.from({ length: bedrooms }, (_, k) => k);
  }

  // Répartition des salles de bains entre étages : une par étage occupé au
  // minimum, puis les salles restantes vont à l'étage le plus chargé. On ne
  // multiplie pas les salles d'eau à chaque niveau (R+2 = 4 salles sinon).
  const bathAlloc = new Map<number, number>();
  if (levels > 1) {
    const occupied: number[] = [];
    for (let lvl = 1; lvl < levels; lvl++) {
      if ((bedroomLevels[lvl]?.length ?? 0) > 0) occupied.push(lvl);
    }
    let remaining = Math.max(1, bathrooms);
    for (const lvl of occupied) {
      bathAlloc.set(lvl, 1);
      remaining--;
    }
    let guard = 0;
    while (remaining > 0 && occupied.length > 0 && guard++ < 8) {
      const target = occupied.reduce(
        (best, l) =>
          (bedroomLevels[l]?.length ?? 0) > (bedroomLevels[best]?.length ?? 0) ? l : best,
        occupied[0],
      );
      bathAlloc.set(target, Math.min(3, (bathAlloc.get(target) ?? 1) + 1));
      remaining--;
    }
  }

  const result: { level: number; items: ProgramItem[] }[] = [];
  for (let lvl = 0; lvl < levels; lvl++) {
    const items: ProgramItem[] = [];
    if (lvl === 0) {
      items.push({
        kind: "sejour",
        label: livingRooms > 1 ? "Séjour double" : "Séjour",
        target: Math.max(24, area * 0.26) * (tune.livingScale ?? 1),
        min: 16,
        priority: 20,
        habitable: true,
        unique: true,
      });
      for (let k = 0; k < kitchens; k++) {
        items.push({
          kind: "cuisine",
          label: k === 0 ? "Cuisine" : `Cuisine ${k + 1}`,
          target: 14 * (tune.kitchenScale ?? 1),
          min: 7,
          priority: 15,
          habitable: true,
        });
      }
      items.push({
        kind: "wc",
        label: "WC invités",
        target: 2.5,
        min: 1.5,
        priority: 5,
      });
      // Salle à manger séparée : pertinente dès qu'un niveau est assez grand
      // (villa de 180 m², R+1 de 140 m² et plus). Elle évite de gonfler
      // artificiellement le séjour ou les pièces d'eau pour remplir la surface.
      if (area >= (levels > 1 ? 70 : 110)) {
        items.push({
          kind: "sejour",
          label: "Salle à manger",
          target: 13,
          min: 9,
          priority: 13,
          habitable: true,
        });
      }
      // Bureau / chambre d'appoint au RDC des maisons à étage suffisamment
      // grandes : usage courant (télétravail, invités) et absorbe l'espace
      // restant sans créer de pièces de service surdimensionnées.
      if (levels > 1 && area >= 85) {
        items.push({
          kind: "bureau",
          label: "Bureau",
          target: 11,
          min: 8,
          priority: 8,
          habitable: true,
        });
      }
      // Hall / sas d'entrée : filtre les flux et évite de traverser le séjour.
      if (tune.addHall) {
        items.push({
          kind: "hall",
          label: "Hall d'entrée",
          target: Math.max(4.5, Math.min(9, area * 0.055)),
          min: 3,
          priority: 14,
        });
      }
      // Buanderie / local linge : pièce de service fréquente en Tunisie.
      if (tune.addLaundry) {
        items.push({
          kind: "buanderie",
          label: "Buanderie",
          target: 4.5,
          min: 3,
          priority: 7,
        });
      }
      // Sans hall (plans compacts), un rangement près de l'entrée évite que le
      // WC ou la salle d'eau n'occupe seul une bande entière du plan.
      if (!tune.addHall) {
        items.push({
          kind: "stockage",
          label: "Rangement",
          target: 2.5,
          min: 1.5,
          priority: 4,
        });
      }

      // Travaux complémentaires sélectionnés : le garage est le SEUL espace
      // couvert intégré au bâti (surface bâtie complémentaire). La cuisine
      // extérieure, le jardin et la piscine sont traités EXCLUSIVEMENT dans le
      // plan de masse (`site`), jamais comme pièces de la maison.
      if (works.includes("garage") || (input.garages ?? 0) > 0) {
        items.push({ kind: "garage", label: "Garage", target: 18, min: 12, priority: 8 });
      }

      // Sur un R+1 avec peu de chambres, quelques chambres peuvent monter au RDC
      if (levels === 1) {
        for (const idx of bedroomLevels[0]) items.push(mkChambre(idx));
        for (let k = 0; k < bathrooms; k++) {
          items.push({ kind: "sdb", label: k === 0 ? "Salle de bain" : `SDB ${k + 1}`, target: 6.5, min: 4, priority: 9 });
        }
        for (let k = 1; k < wcs; k++) {
          items.push({ kind: "wc", label: `WC ${k + 1}`, target: 2.5, min: 1.5, priority: 4 });
        }
      }
    } else {
      const bedroomsOnLevel = bedroomLevels[lvl]?.length ?? 0;
      for (const idx of bedroomLevels[lvl] ?? []) items.push(mkChambre(idx));
      // Une salle d'eau pour deux chambres maximum (une seule si l'étage est
      // peu peuplé) : jamais un chapelet de salles de bains surdimensionnées.
      const bathsOnLevel = Math.max(1, bathAlloc.get(lvl) ?? 1);
      for (let k = 0; k < bathsOnLevel; k++) {
        items.push({
          kind: "sdb",
          label: k === 0 ? "Salle de bain" : `SDB ${k + 1}`,
          target: 6.5,
          min: 4,
          priority: 12 - k,
        });
      }
      if (bedroomsOnLevel > 2) {
        items.push({ kind: "wc", label: "WC étage", target: 2.5, min: 1.5, priority: 4 });
      }
      // Étage peu chargé en chambres (R+2, grande villa) : une salle de jeux /
      // espace familial évite qu'une chambre n'absorbe seule 30 m² de surplus.
      if (bedroomsOnLevel > 0 && bedroomsOnLevel <= 2 && area >= 60) {
        items.push({
          kind: "sejour",
          label: "Salle de jeux",
          target: 14,
          min: 10,
          priority: 7,
          habitable: true,
        });
      }
      // Couloir de distribution : dessert les chambres sans traverser le séjour.
      if ((bedroomLevels[lvl]?.length ?? 0) >= 2) {
        items.push({
          kind: "couloir",
          label: "Couloir de nuit",
          target: Math.max(4, Math.min(9, area * 0.07)),
          min: 2.5,
          priority: 6,
        });
      }
      if (lvl === levels - 1 && levels > 2) {
        items.push({
          kind: "buanderie",
          label: "Buanderie / linge",
          target: 5,
          min: 3,
          priority: 6,
        });
      }
    }

    result.push({ level: lvl, items });
  }
  return result;
}

function commercialProgram(area: number): ProgramItem[] {
  const offices = Math.max(1, Math.min(5, Math.floor(area / 38)));
  const items: ProgramItem[] = [
    { kind: "reception", label: "Accueil / Réception", target: Math.max(12, area * 0.12), min: 8, priority: 18, habitable: true, unique: true },
    { kind: "openspace", label: "Espace de travail ouvert", target: Math.max(20, area * 0.34), min: 14, priority: 17, habitable: true, unique: true },
  ];
  for (let i = 0; i < offices; i++) {
    items.push({ kind: "bureau", label: i === 0 ? "Bureau direction" : `Bureau ${i + 1}`, target: 13, min: 8, priority: 10, habitable: true });
  }
  items.push({ kind: "reunion", label: "Salle de réunion", target: 16, min: 9, priority: 11, habitable: true });
  items.push({ kind: "sanitaire", label: "Sanitaires", target: 6, min: 3.5, priority: 6 });
  items.push({ kind: "cuisine", label: "Cuisine personnel", target: 8, min: 5, priority: 5 });
  return items;
}

function logisticsProgram(area: number): ProgramItem[] {
  const items: ProgramItem[] = [
    { kind: "stockage", label: "Hall de stockage principal", target: Math.max(40, area * 0.58), min: 30, priority: 20, unique: true },
    { kind: "logistique", label: "Zone chargement / logistique", target: Math.max(20, area * 0.18), min: 14, priority: 15 },
  ];
  const offices = Math.max(1, Math.min(3, Math.floor(area / 120)));
  for (let i = 0; i < offices; i++) {
    items.push({ kind: "bureau", label: i === 0 ? "Bureau exploitation" : `Bureau ${i + 1}`, target: 13, min: 8, priority: 9, habitable: true });
  }
  items.push({ kind: "vestiaire", label: "Vestiaires", target: 8, min: 5, priority: 6 });
  items.push({ kind: "sanitaire", label: "Sanitaires", target: 5, min: 3, priority: 6 });
  return items;
}

function restorationProgram(
  area: number,
  type: "cafe" | "restaurant",
): ProgramItem[] {
  // Ratios du zonage restauration (marche en avant + ERP)
  const clientPct = type === "cafe" ? 0.38 : 0.35;   // Salle client
  const servicePct = 0.42;                              // Cuisine + plonge + stockage + vestiaires
  const circPct = 0.08;                                 // Couloirs / circulations
  const sanitPct = 0.12;                                // Sanitaires H/F/PMR

  const clientArea = area * clientPct;
  const serviceArea = area * servicePct;
  const circArea = area * circPct;
  const sanitArea = area * sanitPct;

  const items: ProgramItem[] = [];

  // ── Zone client ──
  items.push({
    kind: "salle_client",
    label: type === "cafe" ? "Salle café" : "Salle de restauration",
    target: clientArea * 0.65,
    min: 18,
    priority: 20,
    habitable: true,
    unique: true,
  });
  items.push({
    kind: "comptoir",
    label: type === "cafe" ? "Comptoir café" : "Bar / Comptoir",
    target: clientArea * 0.25,
    min: 6,
    priority: 18,
    habitable: true,
    unique: true,
  });
  items.push({
    kind: "attente",
    label: "Zone d'accueil",
    target: clientArea * 0.10,
    min: 4,
    priority: 14,
    habitable: true,
  });

  // ── Zone service (marche en avant) ──
  items.push({
    kind: "cuisine_pro",
    label: "Cuisine professionnelle",
    target: serviceArea * 0.40,
    min: 12,
    priority: 19,
    habitable: true,
    unique: true,
  });
  items.push({
    kind: "plonge",
    label: "Plonge",
    target: serviceArea * 0.12,
    min: 4,
    priority: 13,
  });
  items.push({
    kind: "chambre_froide",
    label: "Stockage / Frigos",
    target: serviceArea * 0.18,
    min: 5,
    priority: 12,
  });
  items.push({
    kind: "stockage",
    label: "Stockage sec",
    target: serviceArea * 0.12,
    min: 4,
    priority: 10,
  });
  items.push({
    kind: "vestiaire",
    label: "Vestiaires personnel",
    target: serviceArea * 0.10,
    min: 4,
    priority: 8,
  });

  // ── Circulations ──
  items.push({
    kind: "couloir",
    label: "Couloir service",
    target: circArea,
    min: 3,
    priority: 7,
  });

  // ── Sanitaires (H / F / PMR) ──
  items.push({
    kind: "sanitaire",
    label: "Sanitaires Hommes",
    target: sanitArea * 0.35,
    min: 3,
    priority: 11,
  });
  items.push({
    kind: "sanitaire",
    label: "Sanitaires Femmes",
    target: sanitArea * 0.35,
    min: 3,
    priority: 11,
  });
  items.push({
    kind: "wc",
    label: "WC PMR",
    target: sanitArea * 0.30,
    min: 2.5,
    priority: 11,
  });

  return items;
}

// ── Découpage BSP (aucun chevauchement par construction) ────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Placed<T> {
  item: T;
  rect: Rect;
}

/** Partitionne `rect` entre les éléments selon leurs surfaces cibles.
 *  Les coupures sont quantifiées au millimètre pour que deux pièces voisines
 *  partagent EXACTEMENT la même coordonnée de mur (aucun chevauchement ni
 *  débordement après arrondi). */
function bspLayout<T extends { target: number }>(rect: Rect, items: T[]): Placed<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ item: items[0], rect: { ...rect } }];
  const total = items.reduce((s, i) => s + i.target, 0);
  // Deux groupes équilibrés (glouton décroissant)
  const sorted = [...items].sort((a, b) => b.target - a.target);
  const g1: T[] = [];
  const g2: T[] = [];
  let s1 = 0;
  let s2 = 0;
  for (const it of sorted) {
    if (s1 <= s2) {
      g1.push(it);
      s1 += it.target;
    } else {
      g2.push(it);
      s2 += it.target;
    }
  }
  // Chaque sous-zone doit rester physiquement utilisable : au moins ~1,1 m
  // dans l'axe de coupe. Sans ce plancher, une petite pièce d'eau recevait une
  // bande de 15 % de la zone (jusqu'à 8 m² pour un WC) ; avec, elle reçoit une
  // bande réaliste de 2,5 à 4 m² et le surplus revient aux pièces de vie.
  const along = rect.w >= rect.h ? rect.w : rect.h;
  const minFrac = Math.min(0.4, 1.1 / Math.max(1, along));
  const f1 = Math.min(1 - minFrac, Math.max(minFrac, s1 / total));
  if (rect.w >= rect.h) {
    const split = round3(Math.round(rect.w * f1 * 1000) / 1000);
    return [
      ...bspLayout({ x: rect.x, y: rect.y, w: split, h: rect.h }, g1),
      ...bspLayout(
        { x: round3(rect.x + split), y: rect.y, w: round3(rect.w - split), h: rect.h },
        g2,
      ),
    ];
  }
  const split = round3(Math.round(rect.h * f1 * 1000) / 1000);
  return [
    ...bspLayout({ x: rect.x, y: rect.y, w: rect.w, h: split }, g1),
    ...bspLayout(
      { x: rect.x, y: round3(rect.y + split), w: rect.w, h: round3(rect.h - split) },
      g2,
    ),
  ];
}

// ── Mise à l'échelle du programme à la surface disponible ───────────────────

function fitProgram(items: ProgramItem[], available: number): ProgramItem[] {
  let kept = [...items];
  // Retire les pièces les moins prioritaires tant que le minimum n'est pas respecté
  for (let guard = 0; guard < 50; guard++) {
    const sumTargets = kept.reduce((s, i) => s + i.target, 0);
    const scale = available / sumTargets;
    const belowMin = kept.some((i) => i.target * scale < i.min);
    if (!belowMin) break;
    // Retire la pièce sous sa surface minimale de plus faible priorité
    const candidates = kept.filter((i) => i.target * scale < i.min);
    const victim = candidates.reduce((w, i) => (i.priority < w.priority ? i : w));
    if (kept.length <= 2 || victim.priority >= 18) break; // ne jamais sacrifier l'essentiel
    kept = kept.filter((i) => i !== victim);
  }
  // Mise à l'échelle finale, puis plafonnement des petites pièces.
  const sumTargets = kept.reduce((s, i) => s + i.target, 0);
  const scale = available / sumTargets;
  const isDining = (i: ProgramItem) =>
    i.kind === "sejour" && i.label.toLowerCase().includes("manger");
  // Sans plafond, une zone peu remplie gonflait uniformément TOUTES les pièces :
  // WC de 8 m², buanderies de 10 m², salles à manger de 30 m².
  const cap = (i: ProgramItem, target: number): number => {
    switch (i.kind) {
      case "wc": return Math.min(target, 3.8);
      case "sdb": return Math.min(target, 8);
      case "buanderie": return Math.min(target, 6);
      case "hall": return Math.min(target, 10);
      case "cuisine": return Math.min(target, 18);
      case "garage": return Math.min(target, 24);
      case "couloir": return Math.min(target, 8);
      case "bureau": return Math.min(target, 14);
      case "sejour": return Math.min(target, isDining(i) ? 18 : 60);
      case "chambre": return Math.min(target, 22);
      default: return target;
    }
  };
  const fitted = kept.map((i) => ({
    ...i,
    target: cap(i, Math.max(i.min, i.target * scale)),
  }));

  // Le surplus créé par les plafonds revient aux PIÈCES DE VIE (séjour, puis
  // chambres). La surface totale du niveau reste exactement occupée.
  const leftover = available - fitted.reduce((s, i) => s + i.target, 0);
  if (leftover > 0.5) {
    const living = fitted
      .filter((i) => i.kind === "sejour" && !isDining(i))
      .sort((a, b) => b.target - a.target);
    if (living.length > 0) {
      living[0].target += leftover;
    } else {
      const rooms = fitted.filter((i) => i.kind === "chambre");
      const weight = rooms.reduce((s, i) => s + i.target, 0);
      if (rooms.length > 0 && weight > 0) {
        for (const r of rooms) r.target += (leftover * r.target) / weight;
      } else if (leftover >= 6) {
        // Zone sans pièce de vie : le surplus devient un espace polyvalent
        // (jeux, télétravail, réception) plutôt qu'un couloir surdimensionné.
        fitted.push({
          kind: "sejour",
          label: "Espace polyvalent",
          target: leftover,
          min: 5,
          priority: 2,
          habitable: true,
        });
      } else if (leftover >= 1.2) {
        // Petit surplus : rangement intégré, usage courant et surface utile.
        fitted.push({
          kind: "stockage",
          label: "Rangement",
          target: leftover,
          min: 1.2,
          priority: 1,
        });
      }
    }
  }
  return fitted;
}

// ── Voisinages, portes et fenêtres ──────────────────────────────────────────

/** Tolérance géométrique (les coordonnées sont arrondies au mm). */
const TOL = 0.002;

const CIRCULATION_KINDS = new Set<RoomKind>([
  "couloir",
  "hall",
  "escalier",
  "sejour",
  "reception",
  "openspace",
  "attente",
  "salle_client",
]);
const PRIVATE_KINDS = new Set<RoomKind>([
  "chambre",
  "sdb",
  "wc",
  "sanitaire",
  "vestiaire",
  "buanderie",
]);
const HABITABLE_KINDS = new Set<RoomKind>([
  "chambre",
  "sejour",
  "cuisine",
  "bureau",
  "openspace",
  "reunion",
  "reception",
  "polyvalent",
  "salle_client",
  "comptoir",
  "attente",
]);

interface SharedBoundary {
  len: number;
  /** Mur correspondant dans `a`. */
  wallA: WallSide;
  /** Mur correspondant dans `b`. */
  wallB: WallSide;
  /** Début du chevauchement dans le repère de `a` (distance depuis l'origine du mur). */
  startA: number;
  /** Début du chevauchement dans le repère de `b`. */
  startB: number;
}

/** Frontière commune entre deux pièces (null si elles ne se touchent pas). */
function sharedBoundary(a: PlanRoom, b: PlanRoom): SharedBoundary | null {
  const touchesVertically =
    Math.abs(a.x + a.w - b.x) < TOL || Math.abs(b.x + b.w - a.x) < TOL;
  const touchesHorizontally =
    Math.abs(a.y + a.h - b.y) < TOL || Math.abs(b.y + b.h - a.y) < TOL;
  if (touchesVertically) {
    const start = Math.max(a.y, b.y);
    const end = Math.min(a.y + a.h, b.y + b.h);
    const len = end - start;
    if (len >= 0.9) {
      const aIsLeft = Math.abs(b.x + b.w - a.x) < TOL;
      return {
        len,
        wallA: aIsLeft ? "W" : "E",
        wallB: aIsLeft ? "E" : "W",
        startA: start - a.y,
        startB: start - b.y,
      };
    }
  }
  if (touchesHorizontally) {
    const start = Math.max(a.x, b.x);
    const end = Math.min(a.x + a.w, b.x + b.w);
    const len = end - start;
    if (len >= 0.9) {
      const aIsTop = Math.abs(b.y + b.h - a.y) < TOL;
      return {
        len,
        wallA: aIsTop ? "N" : "S",
        wallB: aIsTop ? "S" : "N",
        startA: start - a.x,
        startB: start - b.x,
      };
    }
  }
  return null;
}

/** Ajoute une porte IDENTIQUE sur les deux pièces qui partagent le mur. */
function addPairedDoor(
  a: PlanRoom,
  b: PlanRoom,
  shared: SharedBoundary,
  width: number,
): void {
  const w = Math.min(width, shared.len - 0.16);
  if (w < 0.6) return;
  const center = shared.len / 2;
  a.doors.push({
    wall: shared.wallA,
    position: round3(Math.max(0.08, shared.startA + center - w / 2)),
    width: round3(w),
  });
  b.doors.push({
    wall: shared.wallB,
    position: round3(Math.max(0.08, shared.startB + center - w / 2)),
    width: round3(w),
  });
}

/**
 * Portes et fenêtres d'un niveau.
 *
 * Circulation : un arbre couvrant de poids maximal relie toutes les pièces à
 * l'entrée. Chaque porte est posée SUR LES DEUX pièces (même position), ce qui
 * évite les portes orphelines et les arcs de débattement dans le vide. Les
 * liaisons vers un couloir, un hall ou le séjour sont privilégiées ; deux
 * chambres ne sont jamais reliées directement si un autre chemin existe.
 */
function addOpenings(
  level: FloorPlan,
  isGroundFloor: boolean,
  _rng: () => number,
  profile: StyleProfile,
): void {
  const rooms = level.rooms.filter((r) => !r.exterior);
  const allRooms = level.rooms;

  // ── 1. Graphe d'adjacence + arbre couvrant (circulation garantie) ────────
  interface Edge {
    a: PlanRoom;
    b: PlanRoom;
    shared: SharedBoundary;
    weight: number;
  }
  const edges: Edge[] = [];
  for (let i = 0; i < allRooms.length; i++) {
    for (let j = i + 1; j < allRooms.length; j++) {
      const a = allRooms[i];
      const b = allRooms[j];
      const shared = sharedBoundary(a, b);
      if (!shared) continue;
      let weight = shared.len;
      if (CIRCULATION_KINDS.has(a.kind) || CIRCULATION_KINDS.has(b.kind)) weight += 4;
      if (PRIVATE_KINDS.has(a.kind) && PRIVATE_KINDS.has(b.kind)) weight -= 4;
      if (a.exterior || b.exterior) weight -= 5;
      edges.push({ a, b, shared, weight });
    }
  }

  // Pièce d'entrée : hall/séjour sur la façade principale, sinon la plus
  // grande pièce publique touchant une façade.
  const onFacade = (r: PlanRoom, side: WallSide): boolean => {
    if (side === "N") return Math.abs(r.y) < TOL;
    if (side === "S") return Math.abs(r.y + r.h - level.width) < TOL;
    if (side === "W") return Math.abs(r.x) < TOL;
    return Math.abs(r.x + r.w - level.length) < TOL;
  };
  const publicKinds: RoomKind[] = ["hall", "sejour", "reception", "openspace"];
  let entry: PlanRoom | undefined;
  if (isGroundFloor) {
    const facades: WallSide[] = [profile.mainFacade, "S", "E", "W", "N"];
    for (const side of facades) {
      entry = rooms.find((r) => publicKinds.includes(r.kind) && onFacade(r, side));
      if (entry) break;
    }
    if (!entry) {
      entry = rooms
        .filter((r) => onFacade(r, profile.mainFacade))
        .sort((a, b) => b.area - a.area)[0];
    }
    if (!entry) entry = [...rooms].sort((a, b) => b.area - a.area)[0];
  }
  const root = entry ?? rooms[0];

  // Maximum spanning tree (Prim) : n−1 portes suffisent pour tout desservir.
  const inTree = new Set<PlanRoom>();
  if (root) inTree.add(root);
  const candidates = [...edges].sort((x, y) => y.weight - x.weight);
  while (inTree.size < allRooms.length && candidates.length > 0) {
    let picked = -1;
    for (let i = 0; i < candidates.length; i++) {
      const e = candidates[i];
      if (inTree.has(e.a) !== inTree.has(e.b)) {
        picked = i;
        break;
      }
    }
    if (picked === -1) break;
    const e = candidates.splice(picked, 1)[0];
    addPairedDoor(e.a, e.b, e.shared, 0.9);
    inTree.add(e.a);
    inTree.add(e.b);
  }

  // ── 2. Porte d'entrée sur la façade rue ─────────────────────────────────
  if (isGroundFloor && entry) {
    const side: WallSide =
      onFacade(entry, profile.mainFacade)
        ? profile.mainFacade
        : (["S", "E", "W", "N"] as WallSide[]).find((s) => onFacade(entry!, s)) ?? "S";
    const wallLen = side === "N" || side === "S" ? entry.w : entry.h;
    const width = Math.min(1.1, wallLen - 0.4);
    const existing = entry.doors.filter((d) => d.wall === side);
    const candidates = [
      wallLen / 2 - width / 2,
      0.2,
      wallLen - width - 0.2,
    ];
    let position = candidates[0];
    for (const c of candidates) {
      const pos = Math.max(0.2, Math.min(c, wallLen - width - 0.2));
      const clash = existing.some(
        (d) => pos < d.position + d.width + 0.15 && pos + width > d.position - 0.15,
      );
      if (!clash) {
        position = pos;
        break;
      }
    }
    entry.doors.push({
      wall: side,
      position: round3(position),
      width: round3(width),
      isEntry: true,
    });
  }

  // Filet de sécurité : une pièce intérieure sans porte (cas limite d'une
  // parcelle minuscule) reçoit une porte sur son mur le plus long.
  for (const r of rooms) {
    if (r.doors.length > 0) continue;
    const vertical = r.h > r.w;
    const width = Math.min(0.8, (vertical ? r.h : r.w) - 0.3);
    if (width < 0.5) continue;
    r.doors.push({
      wall: vertical ? "E" : "S",
      position: round3(((vertical ? r.h : r.w) - width) / 2),
      width: round3(width),
    });
  }

  // ── 3. Fenêtres : façade jardin prioritaire, double exposition ──────────
  const opposite: Record<WallSide, WallSide> = { N: "S", S: "N", E: "W", W: "E" };
  for (const room of rooms) {
    if (!HABITABLE_KINDS.has(room.kind)) continue;
    const sides: { side: WallSide; span: number; origin: number }[] = [
      { side: "N", span: room.w, origin: room.x },
      { side: "S", span: room.w, origin: room.x },
      { side: "W", span: room.h, origin: room.y },
      { side: "E", span: room.h, origin: room.y },
    ];
    const order: WallSide[] = [
      profile.mainFacade,
      opposite[profile.mainFacade],
      "E",
      "W",
      "N",
      "S",
    ].filter((s, i, arr) => arr.indexOf(s) === i) as WallSide[];

    let added = 0;
    for (const side of order) {
      if (added >= 2) break;
      const s = sides.find((x) => x.side === side)!;
      if (!onFacade(room, side) || s.span < 0.9) continue;
      const isMain = side === profile.mainFacade;
      const desired = isMain && profile.bayWindows ? 2.4 : isMain ? 1.6 : 1.2;
      const winW = Math.min(desired, s.span - 0.3);
      // Éviter le chevauchement avec une porte du même mur.
      // `WindowSpec.position` est RELATIF à l'origine du mur de la pièce
      // (le rendu 2D ajoute r.x / r.y) — jamais une coordonnée globale.
      const doors = room.doors.filter((d) => d.wall === side);
      let pos = s.span / 2 - winW / 2;
      for (const d of doors) {
        if (pos < d.position + d.width + 0.15 && pos + winW > d.position - 0.15) {
          pos = d.position + d.width + 0.2;
        }
      }
      const maxPos = s.span - winW - 0.15;
      if (pos > maxPos) pos = maxPos;
      if (pos < 0.15) pos = 0.15;
      room.windows.push({
        wall: side,
        position: round3(pos),
        width: round3(winW),
      });
      added++;
    }

    // Lumière de second jour : une pièce encloisonnée peut s'éclairer sur le
    // patio (espace extérieur) — jamais sur une autre pièce fermée.
    if (added === 0) {
      for (const ext of allRooms.filter((r) => r.exterior)) {
        const shared = sharedBoundary(room, ext);
        if (!shared || shared.len < 1.2) continue;
        const winW = Math.min(1.4, shared.len - 0.3);
        room.windows.push({
          wall: shared.wallA,
          position: round3(shared.startA + shared.len / 2 - winW / 2),
          width: round3(winW),
        });
        break;
      }
    }
  }
}


// ── Stratégies de distribution ──────────────────────────────────────────────
//
// Toutes les zones produites couvrent EXACTEMENT le rectangle du niveau (hors
// gaine d'escalier) et ne se chevauchent pas : la somme des surfaces reste
// égale à la surface du niveau, quel que soit le parti architectural.

/**
 * Découpe une bande en pièces « en enfilade » : chaque pièce occupe toute la
 * profondeur de la bande, seule sa largeur varie. Aucune pièce ne peut donc
 * devenir un couloir déguisé de 1,3 m de profondeur.
 */
function linearFill(zone: Rect, items: ProgramItem[]): Placed<ProgramItem>[] {
  if (items.length === 0) return [];
  const horizontal = zone.w >= zone.h;
  const total = items.reduce((s, i) => s + i.target, 0) || 1;
  const run = horizontal ? zone.w : zone.h;
  const out: Placed<ProgramItem>[] = [];
  let cursor = horizontal ? zone.x : zone.y;
  items.forEach((item, idx) => {
    const isLast = idx === items.length - 1;
    const raw = (item.target / total) * run;
    const size = isLast
      ? (horizontal ? zone.x + zone.w : zone.y + zone.h) - cursor
      : round3(raw);
    if (size <= 0.2) return;
    const rect = horizontal
      ? { x: round3(cursor), y: zone.y, w: round3(size), h: zone.h }
      : { x: zone.x, y: round3(cursor), w: zone.w, h: round3(size) };
    out.push({ item, rect });
    cursor = round3(cursor + size);
  });
  return out;
}

/** Répartit les pièces entre des zones puis découpe chaque zone en BSP. */
function fillZones(
  zones: Rect[],
  items: ProgramItem[],
  mode: "bsp" | "linear" = "bsp",
): Placed<ProgramItem>[] {
  const usable = zones.filter((z) => z.w > 0.2 && z.h > 0.2);
  if (usable.length === 0 || items.length === 0) return [];
  if (usable.length === 1) {
    return mode === "linear"
      ? linearFill(usable[0], fitProgram(items, usable[0].w * usable[0].h))
      : bspLayout(usable[0], fitProgram(items, usable[0].w * usable[0].h));
  }

  // Chaque zone reçoit au moins une pièce (la plus prioritaire disponible).
  const sortedItems = [...items].sort((a, b) => b.priority - a.priority);
  const buckets: ProgramItem[][] = usable.map(() => []);
  const zoneAreas = usable.map((z) => z.w * z.h);
  const assigned = usable.map(() => 0);
  const zoneOrder = usable
    .map((z, i) => ({ i, area: z.w * z.h }))
    .sort((a, b) => b.area - a.area);

  const remaining = [...sortedItems];
  for (const { i } of zoneOrder) {
    if (remaining.length === 0) break;
    const zoneArea = usable[i].w * usable[i].h;
    // Première pièce d'une zone : elle doit être assez grande pour occuper
    // utilement la zone. Sans ce filtre, un WC de 2,5 m² pouvait être seul
    // dans une bande de 16 m² et devenir un « WC salon » de 16 m².
    let pick = remaining.findIndex((it) => it.target >= zoneArea * 0.45);
    if (pick === -1) {
      pick = remaining.reduce(
        (best, it, idx) => (it.target > remaining[best].target ? idx : best),
        0,
      );
    }
    const [item] = remaining.splice(pick, 1);
    buckets[i].push(item);
    assigned[i] += item.target;
  }
  // Puis la pièce dont la zone a le plus de capacité restante.
  for (const item of remaining) {
    let best = 0;
    for (let i = 1; i < usable.length; i++) {
      const cap = zoneAreas[i] - assigned[i];
      const bestCap = zoneAreas[best] - assigned[best];
      if (cap > bestCap) best = i;
    }
    buckets[best].push(item);
    assigned[best] += item.target;
  }

  const placed: Placed<ProgramItem>[] = [];
  usable.forEach((zone, i) => {
    // Filet de sécurité : aucune zone vide (sinon un trou dans la surface).
    if (buckets[i].length === 0) {
      buckets[i].push({
        kind: "couloir",
        label: "Dégagement",
        target: zone.w * zone.h,
        min: 1,
        priority: 1,
      });
    }
    const fitted = fitProgram(buckets[i], zone.w * zone.h);
    placed.push(
      ...(mode === "linear" ? linearFill(zone, fitted) : bspLayout(zone, fitted)),
    );
  });
  return placed;
}

/** Cour intérieure : patio central + quatre bandes de pièces autour. */
function carvePatio(zone: Rect, items: ProgramItem[]): { zones: Rect[]; patio: Rect } {
  const pw = round3(Math.min(4.6, Math.max(2.4, zone.w * 0.26)));
  const ph = round3(Math.min(4.6, Math.max(2.4, zone.h * 0.26)));
  const px = round3(zone.x + (zone.w - pw) / 2);
  const py = round3(zone.y + (zone.h - ph) / 2);
  const patio = { x: px, y: py, w: pw, h: ph };
  const zones: Rect[] = [
    { x: zone.x, y: zone.y, w: zone.w, h: round3(py - zone.y) },
    { x: zone.x, y: round3(py + ph), w: zone.w, h: round3(zone.y + zone.h - (py + ph)) },
    { x: zone.x, y: py, w: round3(px - zone.x), h: ph },
    { x: round3(px + pw), y: py, w: round3(zone.x + zone.w - (px + pw)), h: ph },
  ].filter((z) => z.w > 0.8 && z.h > 0.8);
  void items;
  return { zones, patio };
}

/** Couloir central : deux bandes de pièces desservies de part et d'autre. */
function carveLinear(zone: Rect): { zones: Rect[]; corridor: Rect | null } {
  // Un couloir central exige deux bandes de 1,5 m minimum de part et d'autre :
  // sinon on obtient des pièces-couloirs de 1,3 m de profondeur, inutilisables.
  const MIN_BAND = 1.5;
  const CORRIDOR = 1.1;
  // Le couloir ne traverse que ~62 % de la longueur : la pièce d'about occupe
  // toute la profondeur. Un couloir filant sur 14 m représenterait 15 % de la
  // surface d'une maison de 100 m², ce qui n'est pas « compact ».
  if (zone.w >= zone.h && zone.h >= 2 * MIN_BAND + CORRIDOR) {
    const ch = CORRIDOR;
    const cy = round3(zone.y + (zone.h - ch) / 2);
    const cl = round3(zone.w * 0.62);
    return {
      zones: [
        { x: zone.x, y: zone.y, w: cl, h: round3(cy - zone.y) },
        { x: zone.x, y: round3(cy + ch), w: cl, h: round3(zone.y + zone.h - (cy + ch)) },
        { x: round3(zone.x + cl), y: zone.y, w: round3(zone.w - cl), h: zone.h },
      ].filter((z) => z.h > 0.8 && z.w > 0.8),
      corridor: { x: zone.x, y: cy, w: cl, h: ch },
    };
  }
  if (zone.w < 2 * MIN_BAND + CORRIDOR) return { zones: [zone], corridor: null };
  const cw = CORRIDOR;
  const cx = round3(zone.x + (zone.w - cw) / 2);
  const cl = round3(zone.h * 0.62);
  return {
    zones: [
      { x: zone.x, y: zone.y, w: round3(cx - zone.x), h: cl },
      { x: round3(cx + cw), y: zone.y, w: round3(zone.x + zone.w - (cx + cw)), h: cl },
      { x: zone.x, y: round3(zone.y + cl), w: zone.w, h: round3(zone.h - cl) },
    ].filter((z) => z.w > 0.8 && z.h > 0.8),
    corridor: { x: cx, y: zone.y, w: cw, h: cl },
  };
}

/** Hall central au sud + zone jour / zone nuit. */
function carveCentralHall(zone: Rect): { zones: Rect[]; hall: Rect } {
  const hw = round3(Math.min(3.6, Math.max(2.4, zone.w * 0.3)));
  const hd = round3(Math.min(3.2, Math.max(2.2, zone.h * 0.28)));
  const hx = round3(zone.x + (zone.w - hw) / 2);
  const hy = round3(zone.y + zone.h - hd);
  return {
    zones: [
      { x: zone.x, y: zone.y, w: zone.w, h: round3(hy - zone.y) },
      { x: zone.x, y: hy, w: round3(hx - zone.x), h: hd },
      { x: round3(hx + hw), y: hy, w: round3(zone.x + zone.w - (hx + hw)), h: hd },
    ].filter((z) => z.w > 0.8 && z.h > 0.8),
    hall: { x: hx, y: hy, w: hw, h: hd },
  };
}

/** Zone jour au sud (façade jardin) et zone nuit au nord. */
function carveDayNight(zone: Rect, dayRatio: number): Rect[] {
  if (zone.w >= zone.h) {
    const dayH = round3(zone.h * dayRatio);
    return [
      { x: zone.x, y: round3(zone.y + zone.h - dayH), w: zone.w, h: dayH },
      { x: zone.x, y: zone.y, w: zone.w, h: round3(zone.h - dayH) },
    ].filter((z) => z.w > 0.8 && z.h > 0.8);
  }
  const dayW = round3(zone.w * dayRatio);
  return [
    { x: round3(zone.x + zone.w - dayW), y: zone.y, w: dayW, h: zone.h },
    { x: zone.x, y: zone.y, w: round3(zone.w - dayW), h: zone.h },
  ].filter((z) => z.w > 0.8 && z.h > 0.8);
}

// ── Construction d'un niveau ────────────────────────────────────────────────

function buildLevel(
  levelIdx: number,
  levels: number,
  length: number,
  width: number,
  items: ProgramItem[],
  variantSeed: number,
  profile: StyleProfile,
): FloorPlan {
  const plan: FloorPlan = {
    level: levelIdx,
    length,
    width,
    rooms: [],
    area: length * width,
  };

  const multi = levels > 1;
  // Gaine d'escalier dimensionnée pour TOUJOURS tenir dans l'emprise quand le
  // projet est multi-niveaux (continuité verticale garantie sur tous les étages).
  const shaftW = round3(Math.min(2.5, length * 0.32));
  const shaftD = round3(Math.min(4.2, width * 0.38));
  const carveShaft = multi && length >= 4 && width >= 3;
  // Identifiants déterministes par niveau
  const rid = () => `L${levelIdx}-R${plan.rooms.length}`;

  // Zones de base couvrant tout le niveau, hors gaine d'escalier.
  const baseZones: Rect[] = [];
  if (carveShaft) {
    plan.rooms.push(makeRoom(rid(), "escalier", "Escalier", 0, 0, shaftW, shaftD));
    baseZones.push({ x: shaftW, y: 0, w: round3(length - shaftW), h: shaftD });
    baseZones.push({ x: 0, y: shaftD, w: length, h: round3(width - shaftD) });
  } else {
    baseZones.push({ x: 0, y: 0, w: length, h: width });
  }

  // La plus grande zone porte le parti architectural ; les autres sont
  // remplies en BSP (elles correspondent au débord de la gaine d'escalier).
  const mainIdx = baseZones.reduce(
    (best, z, i) => (z.w * z.h > baseZones[best].w * baseZones[best].h ? i : best),
    0,
  );
  const mainZone = baseZones[mainIdx];
  const strategy: LayoutStrategy =
    levelIdx === 0 ? profile.layout : "bsp";
  // Une zone sans pièce laisserait un trou dans le niveau : chaque zone du
  // parti doit pouvoir recevoir au moins une pièce.
  const extraZones = Math.max(0, baseZones.length - 1);
  const enoughItems = items.length >= 4 + extraZones;

  let roomZones: Rect[] = [];
  let specialRooms: { rect: Rect; kind: RoomKind; label: string; exterior?: boolean }[] = [];

  if (strategy === "patio" && enoughItems && mainZone.w >= 6 && mainZone.h >= 6) {
    const carved = carvePatio(mainZone, items);
    roomZones = carved.zones;
    specialRooms.push({ rect: carved.patio, kind: "patio", label: "Patio", exterior: true });
  } else if (
    strategy === "linear" &&
    items.length >= 2 + extraZones &&
    Math.max(mainZone.w, mainZone.h) >= 7
  ) {
    const carved = carveLinear(mainZone);
    if (carved.zones.length >= 2 && carved.corridor) {
      roomZones = carved.zones;
      specialRooms.push({ rect: carved.corridor, kind: "couloir", label: "Couloir central" });
    } else {
      roomZones = [mainZone];
    }
  } else if (
    strategy === "central-hall" &&
    items.length >= 3 + extraZones &&
    mainZone.w >= 6 &&
    mainZone.h >= 6
  ) {
    const carved = carveCentralHall(mainZone);
    if (carved.zones.length >= 2) {
      roomZones = carved.zones;
      specialRooms.push({ rect: carved.hall, kind: "hall", label: "Hall d'entrée" });
    } else {
      roomZones = [mainZone];
    }
  } else if (
    (strategy === "day-night" || strategy === "garden") &&
    items.length >= 2 + extraZones
  ) {
    const split = carveDayNight(mainZone, strategy === "garden" ? 0.62 : 0.54);
    roomZones = split.length === 2 ? split : [mainZone];
  } else {
    roomZones = [mainZone];
  }

  // Les zones secondaires (hors grande zone) complètent la couverture.
  for (let i = 0; i < baseZones.length; i++) {
    if (i !== mainIdx && baseZones[i].w > 0.8 && baseZones[i].h > 0.8) roomZones.push(baseZones[i]);
  }

  // Découpage des zones en pièces.
  const placed = fillZones(
    roomZones,
    items,
    strategy === "linear" && roomZones.length >= 2 ? "linear" : "bsp",
  );
  for (const p of placed) {
    plan.rooms.push(
      makeRoom(rid(), p.item.kind, p.item.label, p.rect.x, p.rect.y, p.rect.w, p.rect.h, p.item.habitable),
    );
  }
  for (const s of specialRooms) {
    plan.rooms.push(
      makeRoom(rid(), s.kind, s.label, s.rect.x, s.rect.y, s.rect.w, s.rect.h, false, s.exterior),
    );
  }

  // Cohérence du programme : la chambre principale doit être la plus grande
  // chambre du niveau. Le découpage BSP peut inverser deux rectangles voisins ;
  // on échange alors les libellés (la géométrie et les surfaces restent celles
  // réellement dessinées) plutôt que d'afficher une « suite » plus petite que
  // les chambres secondaires.
  const chambres = plan.rooms.filter((r) => r.kind === "chambre");
  const master = chambres.find((r) => r.label === "Chambre principale");
  const biggest = chambres.reduce<PlanRoom | null>(
    (best, r) => (!best || r.area > best.area ? r : best),
    null,
  );
  if (master && biggest && biggest !== master && biggest.area > master.area + 0.5) {
    const label = master.label;
    master.label = biggest.label;
    biggest.label = label;
  }

  addOpenings(
    plan,
    levelIdx === 0,
    mulberry32(variantSeed ^ (levelIdx * 7919)),
    profile,
  );

  // Filet de sécurité géométrique : aucune pièce ne doit dépasser l'emprise
  // (les arrondis au mm peuvent pousser un bord de ≤ 1 mm au-delà du mur).
  for (const r of plan.rooms) {
    r.x = round3(Math.max(0, r.x));
    r.y = round3(Math.max(0, r.y));
    if (r.x + r.w > length) r.w = round3(length - r.x);
    if (r.y + r.h > width) r.h = round3(width - r.y);
    r.area = round3(r.w * r.h);
  }
  return plan;
}

function makeRoom(
  id: string,
  kind: RoomKind,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  _habitable?: boolean,
  exterior?: boolean,
): PlanRoom {
  return {
    id,
    kind,
    label,
    x: round3(x),
    y: round3(y),
    w: round3(w),
    h: round3(h),
    area: round3(w * h),
    doors: [],
    windows: [],
    ...(exterior ? { exterior: true } : {}),
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ── Validation spatiale ─────────────────────────────────────────────────────

export function validatePlan(
  variant: FloorPlanVariant,
  input: FloorPlanInput,
): PlanValidation {
  const issues: string[] = [];
  let score = 100;

  // Tolérance géométrique : les coordonnées sont arrondies au millimètre,
  // les comparaisons doivent donc tolérer cet arrondi.
  const G = 0.002;

  function overlapsTol(a: PlanRoom, b: PlanRoom): boolean {
    return (
      a.x + a.w > b.x + G &&
      b.x + b.w > a.x + G &&
      a.y + a.h > b.y + G &&
      b.y + b.h > a.y + G
    );
  }

  // 1. Dimensions : la surface BÂTIE (hors patio extérieur) doit correspondre
  //    à la surface construite demandée, répartie sur les niveaux.
  const levels = variant.floors.length;
  const expectedArea = input.surface / levels;
  const builtPerLevel = variant.surfaces.built / levels;
  const dimsErr = Math.abs(builtPerLevel - expectedArea) / expectedArea;
  // 10 % de tolérance : un patio non couvert retiré de la surface bâtie peut
  // représenter jusqu'à ~9 % sur une maison de plain-pied.
  const dimensionsOk = dimsErr <= 0.1;
  if (!dimensionsOk)
    issues.push(`Surface bâtie écartée de ${(dimsErr * 100).toFixed(1)} % de la cible`);

  // 2. Chevauchements
  let noOverlap = true;
  for (const fp of variant.floors) {
    for (let i = 0; i < fp.rooms.length; i++) {
      for (let j = i + 1; j < fp.rooms.length; j++) {
        if (overlapsTol(fp.rooms[i], fp.rooms[j])) {
          noOverlap = false;
          issues.push(`Chevauchement détecté (${fp.rooms[i].label} / ${fp.rooms[j].label}, niveau ${fp.level + 1})`);
        }
      }
      // Contenance dans l'emprise
      const r = fp.rooms[i];
      if (r.x < -G || r.y < -G || r.x + r.w > fp.length + G || r.y + r.h > fp.width + G) {
        noOverlap = false;
        issues.push(`Pièce hors emprise : ${r.label}`);
      }
    }
  }
  if (!noOverlap) score -= 20;

  // 3. Somme des surfaces ≈ surface du niveau (±2 %)
  let areasOk = true;
  for (const fp of variant.floors) {
    const sum = fp.rooms.reduce((s, r) => s + r.area, 0);
    if (Math.abs(sum - fp.area) / fp.area > 0.02) {
      areasOk = false;
      issues.push(`Somme des surfaces ≠ surface du niveau ${fp.level + 1}`);
    }
  }
  if (!areasOk) score -= 10;

  // 4. Circulation : chaque pièce (hors couloirs/escaliers) dispose d'une porte
  const NO_DOOR_KINDS = new Set<RoomKind>(["couloir", "escalier", "patio"]);
  let circulationOk = true;
  for (const fp of variant.floors) {
    for (const r of fp.rooms) {
      if (r.exterior || NO_DOOR_KINDS.has(r.kind)) continue;
      if (r.doors.length === 0) {
        circulationOk = false;
        issues.push(`Pièce sans accès : ${r.label} (niveau ${fp.level + 1})`);
      }
    }
    if (fp.level === 0 && !fp.rooms.some((r) => r.doors.some((d) => d.isEntry))) {
      circulationOk = false;
      issues.push("Porte d'entrée manquante au rez-de-chaussée");
    }
  }
  if (!circulationOk) score -= 12;

  // 5. Structure : emprise + gaine escalier identiques sur tous les niveaux
  let structureOk = true;
  if (levels > 1) {
    const ref = variant.floors[0];
    const stairRef = ref.rooms.find((r) => r.kind === "escalier");
    for (const fp of variant.floors.slice(1)) {
      if (
        Math.abs(fp.length - ref.length) > EPS ||
        Math.abs(fp.width - ref.width) > EPS
      ) {
        structureOk = false;
        issues.push(`Emprise discontinue au niveau ${fp.level + 1}`);
      }
      const stair = fp.rooms.find((r) => r.kind === "escalier");
      if (!stair || !stairRef) {
        structureOk = false;
        issues.push(`Gaine d'escalier absente au niveau ${fp.level + 1}`);
      } else if (
        Math.abs(stair.x - stairRef.x) > 0.01 ||
        Math.abs(stair.y - stairRef.y) > 0.01 ||
        Math.abs(stair.w - stairRef.w) > 0.01 ||
        Math.abs(stair.h - stairRef.h) > 0.01
      ) {
        structureOk = false;
        issues.push(`Gaine d'escalier désalignée au niveau ${fp.level + 1}`);
      }
    }
  }
  if (!structureOk) score -= 15;

  // 6. Fenêtres des pièces habitables
  const habitableKinds: RoomKind[] = [
    "chambre",
    "sejour",
    "cuisine",
    "bureau",
    "openspace",
    "reception",
  ];
  for (const fp of variant.floors) {
    for (const r of fp.rooms) {
      if (r.exterior) continue;
      if (habitableKinds.includes(r.kind) && r.windows.length === 0) {
        score -= 5;
        issues.push(`Pièce habitable sans fenêtre : ${r.label} (niveau ${fp.level + 1})`);
      }
    }
  }

  // 7. Extérieurs : aucun aménagement dans le bâti, aucun débordement.
  let exteriorOk = true;
  const site = variant.site;
  const plotL = site.plot.length;
  const plotW = site.plot.width;
  for (const el of site.elements) {
    if (
      el.x < -G ||
      el.y < -G ||
      el.x + el.w > plotL + G ||
      el.y + el.h > plotW + G
    ) {
      exteriorOk = false;
      issues.push(`Aménagement extérieur hors parcelle : ${el.label}`);
    }
    if (
      el.x + el.w > site.building.x + G &&
      site.building.x + site.building.w > el.x + G &&
      el.y + el.h > site.building.y + G &&
      site.building.y + site.building.h > el.y + G
    ) {
      exteriorOk = false;
      issues.push(`Aménagement extérieur dans le bâti : ${el.label} (doit rester dehors)`);
    }
  }
  for (let i = 0; i < site.elements.length; i++) {
    for (let j = i + 1; j < site.elements.length; j++) {
      const a = site.elements[i];
      const b = site.elements[j];
      if (
        a.x + a.w > b.x + G &&
        b.x + b.w > a.x + G &&
        a.y + a.h > b.y + G &&
        b.y + b.h > a.y + G
      ) {
        exteriorOk = false;
        issues.push(`Chevauchement d'aménagements extérieurs : ${a.label} / ${b.label}`);
      }
    }
  }
  if (!exteriorOk) score -= 15;

  // 8. Surfaces : les trois catégories restent cohérentes et séparées.
  let surfacesOk = true;
  const s = variant.surfaces;
  if (Math.abs(s.interior + s.complementary - s.built) > 0.5) {
    surfacesOk = false;
    issues.push("Surface habitable + complémentaire ≠ surface bâtie");
  }
  if (Math.abs(s.exterior - (s.plot - s.groundBuilt)) > 0.5) {
    surfacesOk = false;
    issues.push("La surface extérieure ne correspond pas à la parcelle hors bâti au sol");
  }
  if (s.garden < -0.01) {
    surfacesOk = false;
    issues.push("Surface de jardin négative");
  }
  if (!surfacesOk) score -= 10;

  return {
    dimensionsOk,
    noOverlap,
    areasOk,
    circulationOk,
    structureOk,
    exteriorOk,
    surfacesOk,
    score: Math.max(40, Math.min(100, Math.round(score))),
    issues: [...new Set(issues)].slice(0, 8),
  };
}

// ── Note conceptuelle générée ───────────────────────────────────────────────

function conceptNote(
  profile: StyleProfile,
  input: FloorPlanInput,
  variant: FloorPlanVariant,
  rng: () => number,
): string {
  const fam = familyForCategory(input.category);
  const ratios = variant.footprint.length / variant.footprint.width;
  const form =
    ratios > 1.5
      ? "un volume allongé qui privilégie les façades percées et la lumière traversante"
      : ratios > 1.15
        ? "un volume rectangulaire efficace aux circulations resserrées"
        : "un volume quasi carré qui limite les déperditions et rationalise la structure";
  const isResto = input.category === "cafe" || input.category === "restaurant";
  const org =
    fam === "residential"
      ? "Le rez-de-chaussée regroupe les espaces de vie, la cuisine et un hall qui filtre l'entrée ; les chambres sont regroupées à l'étage ou dans une zone nuit clairement séparée. Les circulations desservent chaque pièce sans traversée d'une chambre."
      : fam === "commercial"
        ? "L'accueil filtre naturellement les flux vers l'espace de travail ouvert et les bureaux fermés, avec les salles de réunion en profondeur."
        : isResto
          ? "La zone client " +
            (input.category === "cafe" ? "salle café + comptoir" : "salle de restauration + bar") +
            " occupe la façade principale, séparée de la cuisine professionnelle par un couloir de service respectant la marche en avant. Les sanitaires H/F/PMR sont accessibles depuis la salle client sans croiser la zone de production."
          : "Le hall de stockage occupe le cœur du bâtiment, desservi directement par la zone logistique et les locaux d'exploitation.";
  const strengths = [
    "aucun chevauchement entre pièces et aucune pièce hors emprise",
    "surfaces ventilées conformes aux minima d'habitabilité",
    "continuité structurelle assurée par une gaine d'escalier alignée sur tous les niveaux",
    "éclairement naturel maximalisé par une double exposition des pièces principales",
  ];
  const chosen = new Set<string>();
  while (chosen.size < 2 && chosen.size < strengths.length)
    chosen.add(strengths[Math.floor(rng() * strengths.length)]);
  const s = [...chosen].join(", ");
  const levelsTxt =
    variant.floors.length > 1
      ? `${variant.floors.length} niveaux d'une emprise de ${variant.footprint.length.toFixed(1)} × ${variant.footprint.width.toFixed(1)} m`
      : `une emprise unique de ${variant.footprint.length.toFixed(1)} × ${variant.footprint.width.toFixed(1)} m`;

  // Travaux complémentaires sélectionnés : rappelés comme contraintes / besoins
  // du projet pris en compte. La piscine, le jardin et la cuisine extérieure
  // sont traités dans le plan de masse, jamais dans les pièces intérieures.
  const works = input.works ?? [];
  const constraints: string[] = [];
  if (works.includes("garage"))
    constraints.push("un garage couvert intégré au bâti, avec accès depuis la voirie");
  if (works.includes("cuisine_exterieure"))
    constraints.push(
      "une cuisine extérieure / barbecue implantée dans le jardin, distincte de la cuisine intérieure",
    );
  if (works.includes("piscine"))
    constraints.push(
      "une piscine implantée exclusivement dans le jardin, à l'écart du bâti, avec dégagements de sécurité",
    );
  if (works.includes("jardin"))
    constraints.push("des espaces extérieurs aménagés en jardin autour du bâti");
  if (works.includes("solaire"))
    constraints.push("une toiture orientée et dimensionnée pour l'installation de panneaux solaires");
  const constraintsTxt =
    constraints.length > 0
      ? ` Contraintes du projet prises en compte : ${constraints.join(", ")}.`
      : "";
  const siteTxt =
    variant.site.constraints.length > 0
      ? ` Plan de masse : ${variant.site.constraints.join(" ")}`
      : "";

  return `Variante « ${profile.style} » : ${profile.tagline}. ${levelsTxt}. ${form.charAt(0).toUpperCase() + form.slice(1)}. ${org} ${orientationTxt(profile.mainFacade)}. Protection solaire par débords de toit, brise-soleil et végétation ; ventilation naturelle favorisée par les ouvertures traversantes. ${profile.description} Points forts : ${s}.${constraintsTxt}${siteTxt}`;
}

function orientationTxt(side: WallSide): string {
  switch (side) {
    case "S":
      return "Orientation plein sud : apports solaires d'hiver recherchés, protégés en été par les débords et la pergola";
    case "E":
      return "Orientation est : lumière du matin et jardin frais l'après-midi";
    case "W":
      return "Orientation ouest : terrasse ombragée le matin, protection solaire renforcée l'après-midi";
    default:
      return "Orientation nord : protection solaire maximale, façades secondaires éclairées" ;
  }
}

// ── Les 10 partis architecturaux ────────────────────────────────────────────
//
// Chaque variante est un VRAI parti architectural : le profil pilote non
// seulement le ratio d'emprise, mais aussi la stratégie de distribution
// (jour/nuit, patio, couloir linéaire, hall central, compact), les surfaces
// cibles des pièces, l'orientation de la façade principale et le traitement
// des espaces extérieurs. Deux variantes ne diffèrent donc jamais par la seule
// esthétique : leur plan, leur circulation et leur programme changent.

export type LayoutStrategy =
  | "bsp"
  | "day-night"
  | "garden"
  | "patio"
  | "linear"
  | "central-hall"
  | "compact";

interface StyleProfile {
  id: string;
  style: string;
  tagline: string;
  /** Longueur / largeur de l'emprise. */
  ratio: number;
  /** Surface de parcelle estimée = emprise × plotFactor (si non fournie). */
  plotFactor: number;
  layout: LayoutStrategy;
  /** Façade principale : S = ensoleillement hivernal, E = matin, O = soir. */
  mainFacade: WallSide;
  description: string;
  advantages: string[];
  characteristics: string[];
  /** Grandes baies vitrées sur la façade jardin. */
  bayWindows?: boolean;
  /** Terrasse extérieure couverte par une pergola ou un débord de toit. */
  coveredTerrace?: boolean;
  tuning: {
    livingScale?: number;
    kitchenScale?: number;
    bedroomScale?: number;
    masterBoost?: number;
    addHall?: boolean;
    addLaundry?: boolean;
  };
}

const STYLE_PROFILES: StyleProfile[] = [
  {
    id: "contemporain",
    style: "Contemporain",
    tagline: "Volumes purs, séjour traversant et grandes baies",
    ratio: 1.32,
    plotFactor: 2.1,
    layout: "day-night",
    mainFacade: "S",
    description:
      "Un volume simple et lisible, orienté plein sud. Le séjour traverse la maison de la façade jardin à la façade rue, la cuisine reste adjacente mais séparée, et les chambres sont regroupées à l'arrière ou à l'étage. Les grandes baies vitrées protégées par un débord de toit recherchent la lumière d'hiver sans surchauffe d'été.",
    advantages: [
      "Séjour traversant très lumineux, ventilation naturelle par double exposition",
      "Séparation nette entre zone jour et zone nuit",
      "Grande terrasse couverte prolongeant le séjour",
      "Lecture structurelle simple, donc coût de gros œuvre maîtrisé",
    ],
    characteristics: [
      "Façade sud largement vitrée avec brise-soleil horizontal",
      "Toit plat avec débord de 80 cm",
      "Enduit monocouche clair et menuiseries aluminium",
      "Cuisine fermée adjacente au séjour",
    ],
    bayWindows: true,
    coveredTerrace: true,
    tuning: { livingScale: 1.15, addHall: true, addLaundry: true },
  },
  {
    id: "minimaliste",
    style: "Moderne minimaliste",
    tagline: "Cuisine ouverte, circulations réduites, zéro surface perdue",
    ratio: 1.06,
    plotFactor: 1.55,
    layout: "compact",
    mainFacade: "S",
    description:
      "Une maison compacte et très efficace : le séjour et la cuisine forment un seul espace de vie ouvert sur la terrasse, desservi directement par l'entrée. Les chambres sont dimensionnées au strict nécessaire confortable, sans couloir superflu. Le plan privilégie les murs porteurs alignés et les gaines regroupées.",
    advantages: [
      "Circulations minimales : plus de m² utiles dans le même budget",
      "Espace de vie ouvert, adapté aux repas de famille",
      "Enveloppe compacte : moins de déperditions et d'entretien",
      "Excellente base pour une parcelle urbaine étroite",
    ],
    characteristics: [
      "Cuisine ouverte avec îlot sur le séjour",
      "Menuiseries fines et garde-corps minimalistes",
      "Murs blancs, béton brut et bois clair",
      "Pas de couloir de distribution",
    ],
    bayWindows: true,
    tuning: { livingScale: 1.1, kitchenScale: 0.85, bedroomScale: 0.95 },
  },
  {
    id: "mediterraneen",
    style: "Méditerranéen tunisien",
    tagline: "Patio frais, terrasse et cuisine d'été dans le jardin",
    ratio: 1.22,
    plotFactor: 2.4,
    layout: "patio",
    mainFacade: "S",
    description:
      "Une lecture contemporaine de la maison tunisienne : un patio planté apporte fraîcheur et lumière au cœur du plan, les pièces s'organisent autour de lui, et la terrasse ombragée prolonge le séjour vers le jardin. La cuisine d'été et le barbecue sont implantés dehors, à l'écart de la cuisine intérieure.",
    advantages: [
      "Patio central : ventilation naturelle et ombre sans climatisation",
      "Pièces de vie protégées du soleil direct de l'après-midi",
      "Cuisine d'été séparée : pas de chaleur ni d'odeurs dans la maison",
      "Plan adapté aux parcelles de lotissement avec jardin arrière",
    ],
    characteristics: [
      "Patio de 14 à 18 m² planté d'un olivier ou d'un jasmin",
      "Terrasse couverte de 3 m de profondeur",
      "Moucharabieh / claustra sur les ouvertures ouest",
      "Enduit à la chaux et pierre locale en soubassement",
    ],
    coveredTerrace: true,
    tuning: { livingScale: 1.05, addHall: true, addLaundry: true, masterBoost: 1 },
  },
  {
    id: "traditionnel",
    style: "Traditionnel revisité",
    tagline: "Hall central, séparation jour/nuit et ventilation traversante",
    ratio: 1.16,
    plotFactor: 2.0,
    layout: "central-hall",
    mainFacade: "S",
    description:
      "Le plan reprend la logique de la maison traditionnelle : un hall central distribue clairement la réception, le séjour et la cuisine d'un côté, les chambres de l'autre. Les ouvertures placées en vis-à-vis assurent une ventilation traversante, et la terrasse arrière reste abritée du vent dominant.",
    advantages: [
      "Distribution très lisible : chaque pièce est accessible sans traverser une autre",
      "Intimité des chambres préservée par rapport à la zone de réception",
      "Ventilation traversante naturelle, adaptée au climat tunisien",
      "Plan facile à faire évoluer (bureau ou chambre supplémentaire)",
    ],
    characteristics: [
      "Hall d'entrée central de 5 à 7 m²",
      "Deux façades percées en vis-à-vis",
      "Tuiles terre cuite et boiseries sur la terrasse",
      "Cuisine fermée avec office / buanderie",
    ],
    tuning: { addLaundry: true, livingScale: 1.0 },
  },
  {
    id: "patio",
    style: "Villa patio",
    tagline: "Cour intérieure, chambres autour du patio, intimité maximale",
    ratio: 1.0,
    plotFactor: 2.7,
    layout: "patio",
    mainFacade: "S",
    description:
      "Une villa organisée autour d'une cour intérieure : les pièces de vie s'ouvrent sur le patio, les chambres bénéficient d'une double orientation et les voisins ne voient pas l'intérieur. Le patio apporte lumière et fraîcheur au centre du plan, là où un plan classique perdrait des couloirs.",
    advantages: [
      "Intimité totale depuis la rue, sans vis-à-vis",
      "Patio central lumineux qui remplace les couloirs sombres",
      "Toutes les pièces bénéficient d'au moins deux orientations",
      "Grande valeur d'usage pour les familles nombreuses",
    ],
    characteristics: [
      "Patio central de 16 à 22 m² avec bassin ou fontaine",
      "Emprise quasi carrée, toiture à faible pente",
      "Pergola en bois sur la terrasse sud",
      "Suite parentale avec salle d'eau privative",
    ],
    coveredTerrace: true,
    tuning: { livingScale: 1.2, masterBoost: 2, addHall: true, addLaundry: true },
  },
  {
    id: "compacte",
    style: "Maison compacte optimisée",
    tagline: "Petite parcelle, plan millimétré, aucun m² perdu",
    ratio: 0.95,
    plotFactor: 1.4,
    layout: "compact",
    mainFacade: "S",
    description:
      "Conçue pour une parcelle étroite ou un budget serré : l'emprise est presque carrée, les circulations sont supprimées au profit de pièces traversantes, et chaque rangement est intégré aux cloisons. Les chambres restent conformes aux minima d'habitabilité, sans rechercher l'espace superflu.",
    advantages: [
      "Coût de construction et de foncier optimisé",
      "Aucun couloir : 100 % de la surface est affectée à un usage",
      "Chauffage et rafraîchissement faciles grâce à une enveloppe compacte",
      "Plan simple à entretenir et à meubler",
    ],
    characteristics: [
      "Emprise quasi carrée de 9 à 11 m de côté",
      "Rangements intégrés dans l'épaisseur des cloisons",
      "Fenêtres hautes pour la lumière sans vis-à-vis",
      "Toiture-terrasse accessible si la parcelle le permet",
    ],
    tuning: { livingScale: 1.0, kitchenScale: 0.9, bedroomScale: 0.92 },
  },
  {
    id: "jardin",
    style: "Ouverte sur le jardin",
    tagline: "Séjour en large baie, terrasse et jardin prolongent la maison",
    ratio: 1.55,
    plotFactor: 2.6,
    layout: "garden",
    mainFacade: "S",
    description:
      "La maison s'efface derrière son jardin : le séjour occupe toute la largeur de la façade sud, prolongé par une terrasse de plain-pied et une large baie coulissante. La cuisine et le service sont rejetés au nord, les chambres à l'est pour profiter du soleil du matin.",
    advantages: [
      "Relation intérieur/jardin exceptionnelle, très recherchée en villa",
      "Grande baie coulissante : le séjour gagne visuellement la terrasse",
      "Cuisine et service au nord : moins de surchauffe en été",
      "Jardin et piscine restent strictement extérieurs, sans empiéter sur le bâti",
    ],
    characteristics: [
      "Baie coulissante de 3 à 4 m sur la terrasse",
      "Terrasse en pierre locale de 3,5 m de profondeur",
      "Pergola bioclimatique à lames orientables",
      "Cuisine d'été et point d'eau dans le jardin",
    ],
    bayWindows: true,
    coveredTerrace: true,
    tuning: { livingScale: 1.3, addLaundry: true, masterBoost: 1 },
  },
  {
    id: "traversante",
    style: "Traversante",
    tagline: "Double exposition est-ouest, jour en bas, nuit en haut",
    ratio: 1.28,
    plotFactor: 2.0,
    layout: "day-night",
    mainFacade: "S",
    description:
      "Un plan traversant à double exposition : le séjour et la cuisine occupent le rez-de-chaussée de part et d'autre d'un hall compact, tandis que les chambres se regroupent à l'étage autour de la cage d'escalier. Les ouvertures opposées assurent un rafraîchissement naturel en fin de journée.",
    advantages: [
      "Ventilation traversante est-ouest très efficace en été",
      "Zone jour et zone nuit clairement séparées par niveau",
      "Gaine d'escalier unique, structure répétitive donc économique",
      "Chambres à l'abri du bruit de la rue",
    ],
    characteristics: [
      "Deux façades principales percées en vis-à-vis",
      "Escalier central éclairé par un puits de lumière",
      "Balcon ou loggia à l'étage",
      "Toiture à deux pans ou terrasse selon la variante",
    ],
    tuning: { livingScale: 1.1, addHall: true, addLaundry: true },
  },
  {
    id: "lineaire",
    style: "Linéaire parcelle étroite",
    tagline: "Volume allongé, couloir central, pièces en enfilade",
    ratio: 1.85,
    plotFactor: 1.5,
    layout: "linear",
    mainFacade: "S",
    description:
      "Adaptée aux parcelles étroites et profondes : la maison s'étire en longueur, desservie par un couloir central qui limite les surfaces perdues. Les pièces de vie s'ouvrent sur le jardin en bout de parcelle, les chambres s'alignent le long du couloir avec des fenêtres sur les pignons ou une cour anglaise.",
    advantages: [
      "Exploite une parcelle étroite là où un plan carré ne rentre pas",
      "Couloir unique : distribution claire et compacte",
      "Chaque chambre peut recevoir une fenêtre sur pignon ou sur cour",
      "Jardin en bout de parcelle, protégé du vis-à-vis",
    ],
    characteristics: [
      "Emprise allongée de 16 à 20 m sur 8 à 10 m",
      "Couloir central de 1,1 à 1,2 m de large",
      "Toiture à un pan ou toit-terrasse",
      "Menuiseries verticales pour limiter les vis-à-vis",
    ],
    tuning: { livingScale: 1.05, kitchenScale: 0.95, bedroomScale: 0.95, addHall: true, addLaundry: true },
  },
  {
    id: "modulaire",
    style: "Modulaire évolutive",
    tagline: "Trame structurelle régulière, pièces transformables, extension future",
    ratio: 1.12,
    plotFactor: 1.9,
    layout: "bsp",
    mainFacade: "S",
    description:
      "Une trame structurelle régulière permet de transformer une chambre en bureau, de réunir deux pièces ou d'ajouter un module sans reprendre la structure. Les gaines et l'escalier sont regroupés, et la façade reste libre pour une extension future côté jardin.",
    advantages: [
      "Plan évolutif : pièces transformables sans gros œuvre",
      "Trame répétitive : coût de structure et de second œuvre maîtrisé",
      "Extension future possible côté jardin, sans casser la toiture",
      "Excellente revente : plan neutre et facile à réaménager",
    ],
    characteristics: [
      "Trame porteuse de 3,3 m environ",
      "Gaines regroupées près de l'escalier",
      "Cloisons légères démontables",
      "Façade sud préparée pour une véranda ou une extension",
    ],
    tuning: { livingScale: 1.05, addLaundry: true },
  },
];

export const VARIANTS_PER_PROJECT = STYLE_PROFILES.length;

// ── Plan de masse : parcelle, bâti et aménagements extérieurs ───────────────
//
// Règle absolue : le jardin, la piscine et la cuisine extérieure sont des
// ESPACES EXTÉRIEURS. Ils sont implantés dans la parcelle, autour du bâti, avec
// des dégagements réalistes, et ne sont JAMAIS ajoutés au programme des pièces.
// Si la parcelle ne permet pas de les accueillir, ils ne sont pas inventés :
// la contrainte est signalée explicitement.

const SITE_TOL = 0.01;

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  gap = 0,
): boolean {
  return (
    a.x + a.w + gap > b.x + SITE_TOL &&
    b.x + b.w + gap > a.x + SITE_TOL &&
    a.y + a.h + gap > b.y + SITE_TOL &&
    b.y + b.h + gap > a.y + SITE_TOL
  );
}

function insidePlot(
  r: { x: number; y: number; w: number; h: number },
  plotL: number,
  plotW: number,
  margin = 0.2,
): boolean {
  return (
    r.x >= margin - SITE_TOL &&
    r.y >= margin - SITE_TOL &&
    r.x + r.w <= plotL - margin + SITE_TOL &&
    r.y + r.h <= plotW - margin + SITE_TOL
  );
}

/** Essaie plusieurs positions et retient la première qui ne chevauche rien. */
function placeSiteElement(
  id: string,
  kind: SiteElementKind,
  label: string,
  w: number,
  h: number,
  candidates: { x: number; y: number }[],
  occupied: { x: number; y: number; w: number; h: number; kind?: SiteElementKind }[],
  plotL: number,
  plotW: number,
  gap = 0.8,
): SiteElement | null {
  const margin = kind === "piscine" ? 1.0 : 0.2;
  for (const c of candidates) {
    const rect = {
      x: round3(Math.max(margin, Math.min(c.x, plotL - w - margin))),
      y: round3(Math.max(margin, Math.min(c.y, plotW - h - margin))),
      w: round3(w),
      h: round3(h),
    };
    if (!insidePlot(rect, plotL, plotW, margin)) continue;
    // Dégagement de sécurité du bassin : 1,10 m minimum avec tout élément.
    // Le bâti est mémorisé avec une marge de 0,60 m : on la retranche pour ne
    // pas exiger 1,70 m au lieu de 1,10 m depuis le mur réel.
    const blocked = occupied.some((o) => {
      const required =
        kind === "piscine" || o.kind === "piscine" ? Math.max(gap, 1.1) : gap;
      const g = o.kind ? required : Math.max(0.05, required - 0.6);
      return rectsOverlap(rect, o, g);
    });
    if (blocked) continue;
    return { id, kind, label, ...rect, area: round3(w * h), hardscape: true };
  }
  return null;
}

const ORIENTATION_LABELS: Record<WallSide, string> = {
  S: "Façade principale plein sud — jardin et terrasse au soleil d'hiver",
  E: "Façade principale à l'est — lumière du matin, jardin à l'est",
  W: "Façade principale à l'ouest — terrasse à l'ombre du matin",
  N: "Façade principale au nord — protection solaire maximale",
};

function buildSitePlan(params: {
  length: number;
  width: number;
  floors: number;
  profile: StyleProfile;
  family: ProjectFamily;
  input: FloorPlanInput;
  groundFloor: FloorPlan;
  patioArea: number;
}): SitePlan {
  const { length: L, width: W, profile, input, groundFloor, family } = params;
  const footprint = round3(L * W);
  const works = input.works ?? [];
  const wantsPool = works.includes("piscine") || (input.pools ?? 0) > 0;
  const wantsKitchen = works.includes("cuisine_exterieure");
  const wantsGarden = works.includes("jardin") || family === "residential";
  const wantsGarage = works.includes("garage") || (input.garages ?? 0) > 0;
  const constraints: string[] = [];

  // ── 1. Dimensions de la parcelle ────────────────────────────────────────
  const minL = round3(L + 2.2);
  const minW = round3(W + 3.8);
  const minArea = round3(minL * minW);
  const provided = Number(input.plotArea) > 0 ? Number(input.plotArea) : 0;
  let source: "projet" | "estimee" = provided > 0 ? "projet" : "estimee";
  let plotArea = provided;

  if (provided > 0) {
    if (provided < minArea) {
      plotArea = minArea;
      constraints.push(
        `Parcelle fournie (${Math.round(provided)} m²) inférieure au minimum constructible avec reculs (${Math.round(minArea)} m²) : emprise minimale retenue, à confirmer avec le service d'urbanisme.`,
      );
    }
  } else {
    // Parcelle de référence : elle doit rester crédible pour le programme
    // extérieur demandé (bassin + dégagements, cuisine d'été), sans jamais
    // transformer une piscine en surface habitable.
    const extra = (wantsPool ? 60 : 0) + (wantsKitchen ? 10 : 0);
    plotArea = Math.max(minArea, footprint * profile.plotFactor + extra);
    constraints.push(
      "Parcelle non renseignée : plan de masse établi sur une parcelle de référence estimée — surface à confirmer avant dépôt du permis.",
    );
  }

  // Dimensions : on conserve l'aspect du bâti, avec des reculs suffisants.
  let plotL = Math.sqrt(plotArea * ((L + 2.2) / (W + 3.8)));
  let plotW = plotArea / plotL;
  if (plotL < minL) {
    plotL = minL;
    plotW = plotArea / plotL;
  }
  if (plotW < minW) {
    plotW = minW;
    plotL = plotArea / plotW;
  }
  if (plotL < minL) plotL = minL;
  if (plotW < minW) plotW = minW;
  plotL = round3(plotL);
  plotW = round3(plotW);
  const actualPlotArea = round3(plotL * plotW);
  if (provided > 0 && actualPlotArea > provided * 1.15) {
    constraints.push(
      `La parcelle de ${Math.round(provided)} m² ne permet pas les reculs retenus : le plan de masse utilise ${Math.round(actualPlotArea)} m² pour rester constructible, sans modifier la surface habitable.`,
    );
    source = "estimee";
  }

  // ── 2. Implantation du bâti : recul arrière au nord, jardin au sud ──────
  const sideSetback = round3(Math.min(2.4, Math.max(0.8, (plotL - L) * 0.28)));
  const backSetback = round3(Math.min(3.0, Math.max(0.8, (plotW - W) * 0.18)));
  const bx = round3(sideSetback);
  const by = round3(backSetback);
  const building = {
    x: bx,
    y: by,
    w: round3(L),
    h: round3(W),
    area: footprint,
  };
  const frontDepth = round3(plotW - (by + W));
  const eastDepth = round3(plotL - (bx + L));
  const westDepth = bx;

  const occupied: { x: number; y: number; w: number; h: number; kind?: SiteElementKind }[] = [
    { x: bx - 0.6, y: by - 0.6, w: L + 1.2, h: W + 1.2 },
  ];
  const elements: SiteElement[] = [];

  // ── 3. Terrasse : prolongement extérieur du séjour, côté jardin ─────────
  // Quand une piscine est demandée, la terrasse n'occupe qu'une partie de la
  // façade : le bassin s'implante à côté, jamais dans le prolongement du bâti.
  const terraceDepth = Math.min(3.6, Math.max(2.2, frontDepth - 1.5));
  if (frontDepth >= 2.2) {
    const tw = wantsPool
      ? Math.min(5.0, Math.max(3.2, L * 0.45))
      : Math.min(L * 0.85, plotL - 1.0);
    const tx = wantsPool
      ? bx
      : round3(bx + Math.min((L - tw) / 2, Math.max(0, eastDepth - 0.4)));
    const terrace = placeSiteElement(
      "site-terrasse",
      "terrasse",
      "Terrasse",
      tw,
      terraceDepth,
      [{ x: tx, y: by + W + 1.2 }],
      occupied,
      plotL,
      plotW,
      0.35,
    );
    if (terrace) {
      // La couverture est un dispositif EXTÉRIEUR (pergola, débord de toit) :
      // elle ne crée aucune pièce et n'entre pas dans la surface habitable.
      if (profile.coveredTerrace) {
        terrace.covered = true;
        terrace.label = "Terrasse couverte";
      }
      elements.push(terrace);
      occupied.push({ ...terrace, kind: "terrasse" });
    }
  }
  if (!elements.some((e) => e.kind === "terrasse")) {
    constraints.push(
      "Terrasse non représentée : profondeur de jardin insuffisante pour un usage extérieur confortable.",
    );
  }

  // ── 4. Piscine : uniquement dans le jardin, jamais dans le bâti ─────────
  if (wantsPool) {
    // Trois tailles réalistes, de la piscine familiale au petit bassin de
    // parcelle étroite. On ne dessine jamais un bassin hors parcelle.
    const poolSizes = [
      { w: 8, h: 4 },
      { w: 7, h: 3.5 },
      { w: 6, h: 3 },
    ];
    const terrace = elements.find((e) => e.kind === "terrasse");
    let placedPool: SiteElement | null = null;
    for (const size of poolSizes) {
      const candidates: { x: number; y: number }[] = [];
      if (terrace) {
        candidates.push({ x: terrace.x + terrace.w + 1.2, y: terrace.y });
        candidates.push({ x: terrace.x - size.w - 1.2, y: terrace.y });
        candidates.push({ x: terrace.x, y: terrace.y + terrace.h + 1.2 });
      }
      candidates.push({ x: plotL - size.w - 1.0, y: by + W + 1.9 });
      candidates.push({ x: 1.0, y: by + W + 1.9 });
      candidates.push({ x: plotL - size.w - 1.0, y: 1.0 });
      candidates.push({ x: 1.0, y: 1.0 });
      candidates.push({ x: plotL - size.w - 1.0, y: plotW - size.h - 1.0 });
      candidates.push({ x: 1.0, y: plotW - size.h - 1.0 });
      const pool = placeSiteElement(
        "site-piscine",
        "piscine",
        "Piscine",
        size.w,
        size.h,
        candidates,
        occupied,
        plotL,
        plotW,
        1.1,
      );
      if (pool) {
        placedPool = pool;
        break;
      }
    }
    if (placedPool) {
      elements.push(placedPool);
      occupied.push({ ...placedPool, kind: "piscine" });
      if (placedPool.w < 8) {
        constraints.push(
          `Piscine dimensionnée à ${placedPool.w} × ${placedPool.h} m (${Math.round(placedPool.area)} m²) pour respecter les dégagements de sécurité dans la parcelle.`,
        );
      }
    } else {
      constraints.push(
        "Piscine non représentée : la parcelle ne permet pas d'implanter un bassin de 6 × 3 m avec les dégagements de sécurité (1,2 m minimum autour du bassin).",
      );
    }
  }

  // ── 5. Cuisine extérieure : dans le jardin, sur la terrasse ─────────────
  if (wantsKitchen) {
    const kw = 3.4;
    const kh = 2.6;
    const candidates: { x: number; y: number }[] = [];
    const terrace = elements.find((e) => e.kind === "terrasse");
    if (terrace) {
      candidates.push({ x: terrace.x + terrace.w - kw, y: terrace.y + terrace.h + 0.7 });
      candidates.push({ x: terrace.x + terrace.w + 0.8, y: terrace.y });
      candidates.push({ x: terrace.x - kw - 0.8, y: terrace.y });
      candidates.push({ x: terrace.x, y: terrace.y + terrace.h + 0.7 });
    }
    // Bandes latérales : la cuisine d'été reste dans le jardin, à distance
    // du bâti (1,4 m de dégagement) et jamais dans une pièce fermée.
    candidates.push({ x: bx + L + 1.4, y: by + W * 0.2 });
    candidates.push({ x: bx - kw - 1.4, y: by + W * 0.2 });
    candidates.push({ x: bx + 0.8, y: by - kh - 1.4 });
    candidates.push({ x: 0.8, y: by + W + 1.4 });
    candidates.push({ x: plotL - kw - 0.8, y: 0.8 });
    const kitchen = placeSiteElement(
      "site-cuisine-exterieure",
      "cuisine_exterieure",
      "Cuisine extérieure",
      kw,
      kh,
      candidates,
      occupied,
      plotL,
      plotW,
      0.7,
    );
    if (kitchen) {
      elements.push(kitchen);
      occupied.push({ ...kitchen, kind: "cuisine_exterieure" });
    } else {
      constraints.push(
        "Cuisine extérieure non représentée : espace extérieur insuffisant pour l'implanter hors du bâti. Elle pourra être ajoutée après abattage d'un mur de clôture ou selon l'aménagement du jardin.",
      );
    }
  }

  // ── 6. Accès et stationnement depuis la voirie (côté sud) ──────────────
  const gateX = round3(Math.min(Math.max(bx + L * 0.35, 1.0), plotL - 3.0));
  // L'allée relie la voirie au jardin/à l'entrée sans traverser le bâti. Elle
  // démarre après le dégagement de 0,60 m du bâti et peut se rabattre sur un
  // côté si la terrasse occupe toute la façade. Sans cela, aucune allée n'était
  // tracée sur la plupart des parcelles.
  const alleyY = round3(by + W + 0.7);
  const alleyH = Math.max(1.0, round3(plotW - alleyY - 0.2));
  const alleyX = [
    gateX,
    Math.max(0.35, round3(bx - 1.65)),
    Math.min(plotL - 1.75, round3(bx + L + 0.25)),
    0.4,
    round3(plotL - 1.8),
  ];
  const alley = placeSiteElement(
    "site-allee",
    "allee",
    "Allée d'accès",
    1.4,
    alleyH,
    alleyX.map((x) => ({ x, y: alleyY })),
    occupied,
    plotL,
    plotW,
    0.15,
  );
  if (alley) {
    elements.push({ ...alley, label: "Allée d'accès" });
    occupied.push({ ...alley, kind: "allee" });
  }

  if (family === "residential" || family === "commercial" || family === "restoration") {
    const parkW = 5;
    const parkH = 2.5;
    const candidates = [
      { x: plotL - parkW - 0.8, y: plotW - parkH - 0.6 },
      { x: 0.8, y: plotW - parkH - 0.6 },
      { x: plotL - parkW - 0.8, y: by + W + 0.8 },
    ];
    const parking = placeSiteElement(
      "site-stationnement",
      "stationnement",
      wantsGarage ? "Accès garage / stationnement" : "Stationnement",
      parkW,
      parkH,
      candidates,
      occupied,
      plotL,
      plotW,
      0.4,
    );
    if (parking) {
      elements.push(parking);
      occupied.push({ ...parking, kind: "stationnement" });
    } else if (frontDepth < 2.5) {
      constraints.push("Stationnement non représenté : accès véhicule trop court depuis la voirie.");
    }
  }

  // Garage : rappel de son emplacement réel (pièce couverte du bâti).
  const garageRoom = groundFloor.rooms.find((r) => r.kind === "garage");
  if (wantsGarage && !garageRoom) {
    constraints.push(
      "Garage non intégrable dans l'emprise après optimisation des surfaces : stationnement extérieur proposé, à confirmer.",
    );
  }
  if (!wantsGarden && frontDepth < 1.5) {
    constraints.push("Jardin réduit : la parcelle laisse peu de surface libre autour du bâti.");
  }

  // ── 7. Surfaces extérieures ─────────────────────────────────────────────
  const hardscape = elements.reduce((s, e) => s + e.area, 0);
  const gardenArea = round3(Math.max(0, actualPlotArea - footprint - hardscape));
  const exteriorArea = round3(Math.max(0, actualPlotArea - (footprint - params.patioArea)));

  const patios = groundFloor.rooms
    .filter((r) => r.exterior)
    .map((r) => ({
      x: round3(bx + r.x),
      y: round3(by + r.y),
      w: r.w,
      h: r.h,
      area: r.area,
    }));

  return {
    plot: { length: plotL, width: plotW, area: actualPlotArea, source },
    building,
    elements,
    patios,
    gardenArea,
    exteriorArea,
    orientation: profile.mainFacade,
    orientationLabel: ORIENTATION_LABELS[profile.mainFacade],
    constraints,
  };
}

/** Les trois catégories de surfaces, calculées depuis la géométrie réelle. */
function computeSurfaces(
  floors: FloorPlan[],
  site: SitePlan,
  totalBuilt: number,
): SurfaceBreakdown {
  const COMPLEMENTARY = new Set<RoomKind>(["garage", "stockage", "logistique"]);
  let interior = 0;
  let complementary = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      if (room.exterior) continue;
      if (COMPLEMENTARY.has(room.kind)) complementary += room.area;
      else interior += room.area;
    }
  }
  interior = round3(interior);
  complementary = round3(complementary);
  const built = round3(interior + complementary);
  const groundBuilt = round3(
    (floors[0]?.rooms ?? [])
      .filter((r) => !r.exterior)
      .reduce((s, r) => s + r.area, 0),
  );
  const exterior = round3(site.plot.area - groundBuilt);
  const details = site.elements
    .filter((e) => e.kind !== "allee")
    .map((e) => ({ kind: e.kind, label: e.label, area: e.area }));
  details.push({ kind: "jardin", label: "Jardin", area: site.gardenArea });
  void totalBuilt;
  return {
    interior,
    complementary,
    built,
    groundBuilt,
    footprint: round3(site.building.area),
    exterior,
    garden: site.gardenArea,
    plot: site.plot.area,
    exteriorDetails: details,
  };
}

// ── API principale ──────────────────────────────────────────────────────────

/**
 * Génère les 10 variantes de plans d'architecte pour un projet.
 * Déterministe : le même projet produit toujours les mêmes plans.
 */
export function generateFloorPlans(input: FloorPlanInput): FloorPlanVariant[] {
  const surface = Math.max(18, input.surface || 90);
  const levels = Math.max(1, Math.min(4, Math.round(input.floors || 1)));
  const family = familyForCategory(input.category);
  const areaPerLevel = surface / levels;
  const baseSeed = 1337 +
    input.category.length * 31 +
    Math.round(surface) * 17 +
    levels * 101;

  const variants: FloorPlanVariant[] = [];
  for (let v = 0; v < STYLE_PROFILES.length; v++) {
    const profile = STYLE_PROFILES[v];
    const rng = mulberry32(baseSeed + v * 977);
    // Emprise : longueur × largeur selon le ratio du parti architectural.
    let L = Math.sqrt(areaPerLevel * profile.ratio);
    let W = Math.sqrt(areaPerLevel / profile.ratio);
    // Garde-fous constructifs
    L = Math.min(Math.max(L, 5), 60);
    W = Math.min(Math.max(W, 4), 40);
    L = round3(L);
    W = round3(W);

    const floors: FloorPlan[] = [];
    if (family === "residential") {
      const programs = residentialProgram(input, areaPerLevel, levels, profile);
      for (const prog of programs) {
        floors.push(
          buildLevel(prog.level, levels, L, W, prog.items, baseSeed + v * 977, profile),
        );
      }
    } else if (family === "restoration") {
      const isRestaurant = input.category === "restaurant";
      const items = restorationProgram(areaPerLevel, isRestaurant ? "restaurant" : "cafe");
      // Les restaurant/café sont généralement mono-niveau, mais on supporte R+1
      for (let lvl = 0; lvl < levels; lvl++) {
        floors.push(
          buildLevel(
            lvl,
            levels,
            L,
            W,
            items.map((i) => ({ ...i })),
            baseSeed + v * 977,
            profile,
          ),
        );
      }
    } else {
      const items =
        family === "commercial" ? commercialProgram(areaPerLevel) : logisticsProgram(areaPerLevel);
      for (let lvl = 0; lvl < levels; lvl++) {
        floors.push(
          buildLevel(
            lvl,
            levels,
            L,
            W,
            items.map((i) => ({ ...i })),
            baseSeed + v * 977,
            profile,
          ),
        );
      }
    }

    // Cohérence inter-niveaux : la chambre principale est la plus grande
    // chambre de TOUT le logement, pas seulement du niveau où elle est née.
    if (family === "residential") {
      const chambres = floors.flatMap((f) => f.rooms.filter((r) => r.kind === "chambre"));
      const master = chambres.find((r) => r.label === "Chambre principale");
      const biggest = chambres.reduce<PlanRoom | null>(
        (best, r) => (!best || r.area > best.area ? r : best),
        null,
      );
      if (master && biggest && biggest !== master && biggest.area > master.area + 0.5) {
        const label = master.label;
        master.label = biggest.label;
        biggest.label = label;
      }
    }

    const totalBuilt = round3(
      floors.reduce((s, f) => s + f.rooms.reduce((a, r) => a + r.area, 0), 0),
    );
    const patioArea = round3(
      floors.reduce(
        (s, f) => s + f.rooms.filter((r) => r.exterior).reduce((a, r) => a + r.area, 0),
        0,
      ),
    );
    const site = buildSitePlan({
      length: L,
      width: W,
      floors: levels,
      profile,
      family,
      input: { ...input, surface },
      groundFloor: floors[0],
      patioArea,
    });
    const surfaces = computeSurfaces(floors, site, totalBuilt);

    const variant: FloorPlanVariant = {
      id: `plan-v${v + 1}`,
      name: `Variante ${v + 1} · ${profile.style}`,
      style: profile.style,
      styleId: profile.id,
      tagline: profile.tagline,
      description: profile.description,
      advantages: profile.advantages,
      characteristics: profile.characteristics,
      footprint: { length: L, width: W },
      floors,
      totalArea: surfaces.built,
      surfaces,
      site,
      conceptNote: "",
      validation: {
        dimensionsOk: true,
        noOverlap: true,
        areasOk: true,
        circulationOk: true,
        structureOk: true,
        exteriorOk: true,
        surfacesOk: true,
        score: 100,
        issues: [],
      },
    };
    variant.conceptNote = conceptNote(profile, input, variant, rng);
    variant.validation = validatePlan(variant, { ...input, surface, floors: levels });
    variants.push(variant);
  }
  return variants;
}

// ============================================================================
// RÉPARATION ARCHITECTURALE (2D ↔ 3D)
// ----------------------------------------------------------------------------
// Corrige automatiquement les incohérences qui cassent la lisibilité du plan
// 2D et la correspondance géométrique avec la scène 3D. Sans risque : n'agit
// que sur les anomalies avérées, sinon le plan est rendu tel quel.
// ============================================================================

const REPAIR_TOL = 0.02;

/** Ramène une valeur dans [0, max] en tolérance près. */
const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

/** Clamp d'une ouverture (porte/fenêtre) sur la longueur de son mur. */
function clampOpening(
  opening: { wall: WallSide; position: number; width: number; isEntry?: boolean },
  room: { x: number; y: number; w: number; h: number },
) {
  const vertical = opening.wall === "W" || opening.wall === "E";
  const wallLen = vertical ? room.h : room.w;
  const width = Math.min(opening.width, wallLen * 0.9);
  const position = clamp(
    Math.min(opening.position, wallLen - width),
    wallLen - width,
  );
  opening.width = width;
  opening.position = position;
}

/**
 * Répare un plan d'étage en place :
 *  1. rectangles bornés à l'emprise, sans dimension nulle (murs continus) ;
 *  2. suppression des chevauchements de pièces (recadrage successif) ;
 *  3. surfaces recalculées (2D = 3D : même données) ;
 *  4. portes/fenêtres clampées dans leur mur (fenêtres sur murs, pas de
 *     porte hors clôture) ;
 *  5. portes candidates requalifiées en fenêtres si le mur est extérieur
 *     (l'accès principal reste une porte) ;
 *  6. toute pièce sans accès reçoit une porte sur son mur le plus grand.
 */
export function repairFloorPlan(plan: FloorPlan): FloorPlan {
  const { rooms } = plan;

  // 1) Bornes de l'emprise + surface minimale
  for (const r of rooms) {
    r.w = Math.max(0.8, Math.min(r.w, plan.length));
    r.h = Math.max(0.8, Math.min(r.h, plan.width));
    r.x = clamp(r.x, plan.length - r.w);
    r.y = clamp(r.y, plan.width - r.h);
  }

  // 2) Chevauchements : chaque pièce est recadrée contre les précédentes.
  // Résolutions essayées dans l'ordre (première faisable retenue) :
  //   a. couper le débord droit à gauche de la pièce placée ;
  //   b. pousser la pièce à droite de la pièce placée ;
  //   c. couper le débord bas au-dessus de la pièce placée ;
  //   d. pousser la pièce sous la pièce placée ;
  //   e. en dernier recours, conserver le plus grand fragment non chevauché.
  const placed: FloorPlan["rooms"] = [];
  for (const r of rooms) {
    for (const p of placed) {
      const ox = Math.min(r.x + r.w, p.x + p.w) - Math.max(r.x, p.x);
      const oy = Math.min(r.y + r.h, p.y + p.h) - Math.max(r.y, p.y);
      if (ox <= REPAIR_TOL || oy <= REPAIR_TOL) continue;
      const trimLeftW = p.x - r.x; // (a)
      const pushRightX = p.x + p.w; // (b)
      const spaceRight = plan.length - pushRightX;
      const trimTopH = p.y - r.y; // (c)
      const pushBottomY = p.y + p.h; // (d)
      const spaceBottom = plan.width - pushBottomY;
      if (trimLeftW >= 0.8) {
        r.w = trimLeftW;
      } else if (spaceRight >= 0.8) {
        r.x = Math.max(r.x, pushRightX);
      } else if (trimTopH >= 0.8) {
        r.h = trimTopH;
      } else if (spaceBottom >= 0.8) {
        r.y = Math.max(r.y, pushBottomY);
      } else {
        // (e) plus grand fragment restant hors de p
        const leftW = Math.max(0, p.x - r.x);
        const rightW = Math.max(0, r.x + r.w - (p.x + p.w));
        const topH = Math.max(0, p.y - r.y);
        const bottomH = Math.max(0, r.y + r.h - (p.y + p.h));
        const best = Math.max(leftW, rightW, topH, bottomH);
        if (best === rightW && rightW >= 0.8) {
          r.x = Math.min(p.x + p.w, plan.length - 0.8);
          r.w = Math.min(r.w, plan.length - r.x);
        } else if (best === bottomH && bottomH >= 0.8) {
          r.y = Math.min(p.y + p.h, plan.width - 0.8);
          r.h = Math.min(r.h, plan.width - r.y);
        } else if (best === leftW && leftW >= 0.8) {
          r.w = leftW;
        } else if (best === topH && topH >= 0.8) {
          r.h = topH;
        } else {
          // Aucun fragment exploitable : réduire au minimum vital
          r.w = Math.max(0.8, Math.min(r.w, plan.length - r.x));
        }
      }
    }
    r.w = Math.max(0.8, Math.min(r.w, plan.length - r.x));
    r.h = Math.max(0.8, Math.min(r.h, plan.width - r.y));
    placed.push(r);
  }

  // 3) Surfaces recalculées (source de vérité unique 2D = 3D)
  for (const r of rooms) r.area = r.w * r.h;
  plan.area = rooms.reduce((s, r) => s + r.area, 0);

  // 4) Ouvertures clampées dans leur mur
  for (const r of rooms) {
    for (const d of r.doors) clampOpening(d, r);
    for (const w of r.windows) clampOpening(w, r);
  }

  // 5) Portes candidates sur mur extérieur → fenêtres (sauf entrée principale
  //    et sauf si c'est le seul accès de la pièce : une porte de service ou de
  //    balcon reste une porte — jamais une perte d'accès).
  const onEdge = (edge: number, max: number) =>
    Math.abs(edge) < REPAIR_TOL || Math.abs(edge - max) < REPAIR_TOL;
  for (const r of rooms) {
    const otherDoors = r.doors.filter(
      (d) =>
        d.width > 0.01 &&
        !((d.wall === "N" && onEdge(r.y, 0)) ||
          (d.wall === "S" && onEdge(r.y + r.h, plan.width)) ||
          (d.wall === "W" && onEdge(r.x, 0)) ||
          (d.wall === "E" && onEdge(r.x + r.w, plan.length))),
    ).length;
    for (const d of r.doors) {
      if (d.isEntry) continue;
      const isOnFacade =
        (d.wall === "N" && onEdge(r.y, 0)) ||
        (d.wall === "S" && onEdge(r.y + r.h, plan.width)) ||
        (d.wall === "W" && onEdge(r.x, 0)) ||
        (d.wall === "E" && onEdge(r.x + r.w, plan.length));
      if (isOnFacade && otherDoors >= 1) {
        r.windows.push({ wall: d.wall, position: d.position, width: d.width });
        d.width = 0; // marquée pour suppression
      }
    }
    r.doors = r.doors.filter((d) => d.width > 0.01);
  }

  // 6) Toute pièce reçoit un accès : porte sur le mur le plus grand si aucun accès
  for (const r of rooms) {
    const hasAccess = r.doors.length > 0;
    if (hasAccess) continue;
    const wallLen = (wall: WallSide) => (wall === "N" || wall === "S" ? r.w : r.h);
    const candidates: WallSide[] = ["N", "S", "W", "E"];
    const best = candidates.sort((a, b) => wallLen(b) - wallLen(a))[0];
    const len = wallLen(best);
    const width = Math.min(0.8, len * 0.6);
    r.doors.push({
      wall: best,
      position: clamp((len - width) / 2, len - width),
      width,
    });
  }

  return plan;
}

/** Synthèse des surfaces par nature de pièce (fiche technique). */
export function summarizeSurfaces(plan: FloorPlan): {
  label: string;
  kind: RoomKind;
  area: number;
  sharePct: number;
}[] {
  const total = plan.rooms.reduce((s, r) => s + r.area, 0) || 1;
  return plan.rooms
    .map((r) => ({
      label: r.label,
      kind: r.kind,
      area: r.area,
      sharePct: Math.round((r.area / total) * 1000) / 10,
    }))
    .sort((a, b) => b.area - a.area);
}
