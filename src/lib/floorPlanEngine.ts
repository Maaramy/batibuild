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

import { normalizeLevelSurfaces } from "./buildingLevels";
import {
  CAFE_SALLE_SHARE_MAX,
  CAFE_SALLE_SHARE_MIN,
  cafeCounterPlacement,
  cafeDoorClearances,
  cafeRectsOverlap,
  cafeSalleShare,
  isCafeCategory,
} from "./cafePlan";
import {
  RESTAURANT_SALLE_SHARE,
  RESTAURANT_SALLE_SHARE_MAX,
  RESTAURANT_SALLE_SHARE_MIN,
  RESTAURANT_SERVICE_DOOR_WIDTH,
  SERVICE_FLOW_KINDS,
  isRestaurantCategory,
  restaurantCounterPlacement,
  restaurantCounterToKitchen,
  restaurantDoorClearances,
  restaurantFacadeWall,
  restaurantKitchenNeighbour,
  restaurantRectsOverlap,
  restaurantServiceFlows,
  serviceRoomComponents,
} from "./restaurantPlan";
import {
  EVACUATION_CIRCULATION_KINDS,
  EVACUATION_MIN_CORRIDOR_WIDTH,
  evacuationFacadeWall,
  evacuationLinked,
  foodServiceEvacuation,
  foodServiceHeadcount,
  requiredEgress,
  type FoodServiceEvacuation,
} from "./evacuationPlan";
import {
  SANITARY_DEPTH_MAX,
  SANITARY_DEPTH_MIN,
  SANITARY_DOOR_WIDTH,
  SANITARY_MIN_WIDTH,
  SANITARY_PMR_WIDTH,
  isFoodPrepKind,
  isSalleKind,
  isSanitaryKind,
  sanitaryAccessReport,
} from "./sanitaryPlan";

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
  /** Salle de café : salle unique des clients, comptoir inclus (jamais une pièce séparée). */
  | "salle_cafe"
  | "comptoir"
  | "cuisine_pro"
  | "plonge"
  | "chambre_froide"
  | "terrasse"
  | "attente"
  // — Extérieur / annexes résidentielles —
  | "patio"
  | "buanderie"
  // — Commerce —
  | "vente"
  // — Piscine —
  | "bassin"
  | "local_technique";

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
  /**
   * Porte de sortie de secours ? Deuxième issue sur une façade différente de
   * l'entrée, rendue à l'identique en 2D et en 3D (même donnée).
   */
  isEmergency?: boolean;
  /**
   * Porte de service d'un restaurant (livraison, déchets, personnel) : issue
   * extérieure du bloc production, jamais requalifiée en fenêtre et percée à
   * l'identique en 2D et en 3D.
   */
  isService?: boolean;
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

export interface CafeValidation {
  /** Part de la surface couverte occupée par la salle café (0–1). */
  salleShare: number;
  /** Salle café entre 70 % et 80 % de la surface couverte. */
  salleShareOk: boolean;
  /** Comptoir entièrement situé dans la salle café. */
  counterInsideSalle: boolean;
  /** Comptoir non compté comme pièce (aucune surface ajoutée au total). */
  counterCountedOnce: boolean;
  /** Salle, préparation, réserve et sanitaires accessibles, comptoir hors des portes. */
  accessOk: boolean;
  /** Sanitaires desservis par la salle, sans porte sur la production. */
  sanitaryAccessOk: boolean;
  /** WC accessible PMR (giration 1,50 m) lorsque la surface le permet. */
  pmrOk: boolean;
  /** Sortie de secours, cheminement et dégagements adaptés à l'effectif. */
  evacuation?: FoodServiceEvacuation;
  ok: boolean;
}

export interface RestaurantValidation {
  /** Part de la surface couverte occupée par la salle de restauration (0–1). */
  salleShare: number;
  /** Salle entre 55 % et 65 % de la surface couverte (cible 60 %). */
  salleShareOk: boolean;
  /** Bar entièrement situé dans la salle de restauration. */
  counterInsideSalle: boolean;
  /** Bar non compté comme pièce (aucune surface ajoutée au total). */
  counterCountedOnce: boolean;
  /** Cuisine professionnelle mitoyenne du bar, à moins de 2 m. */
  kitchenNearCounter: boolean;
  /** Porte de service directe salle ↔ cuisine (passe-plat ou porte). */
  serviceLinkOk: boolean;
  /** Passe-plat percé dans le mur de cuisine, au-dessus du bar. */
  passePlatOk: boolean;
  /** Salle, cuisine, plonge, réserve et sanitaires accessibles. */
  accessOk: boolean;
  /** Sanitaires desservis par la salle, sans porte sur la production. */
  sanitaryAccessOk: boolean;
  /** WC accessible PMR (giration 1,50 m) lorsque la surface le permet. */
  pmrOk: boolean;
  /** Entrée de service extérieure : personnel, livraisons et déchets hors salle. */
  serviceAccessOk: boolean;
  /** Livraisons : cuisine et réserve/chambre froide atteintes sans la salle. */
  deliveryOk: boolean;
  /** Déchets : sortie extérieure côté production, sans traverser la salle. */
  wasteOk: boolean;
  /** Personnel : cuisine et vestiaires atteints sans traverser la salle. */
  staffOk: boolean;
  /** Sortie de secours, cheminement et dégagements adaptés à l'effectif. */
  evacuation?: FoodServiceEvacuation;
  ok: boolean;
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
  /** Contrôles propres au type « Café » (absents pour les autres types). */
  cafe?: CafeValidation;
  /** Contrôles propres au type « Restaurant » (absents pour les autres types). */
  restaurant?: RestaurantValidation;
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
  /**
   * Surface couverte du rez-de-chaussée (m²) — et surface de référence des
   * niveaux dont la surface n'est pas fournie. Ce n'est JAMAIS une surface
   * totale à diviser par le nombre de niveaux.
   */
  surface: number;
  floors?: number;
  /**
   * Surfaces couvertes réelles de chaque niveau (RDC en premier), en m².
   * Un niveau non renseigné reprend la surface du RDC : la surface demandée
   * n'est jamais divisée par le nombre de niveaux.
   */
  levelSurfaces?: number[];
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
  salle_cafe: "#fef3c7",
  comptoir: "#fed7aa",
  cuisine_pro: "#fef3c7",
  plonge: "#cffafe",
  chambre_froide: "#e0f2fe",
  terrasse: "#dcfce7",
  attente: "#f3e8ff",
  patio: "#ecfccb",
  buanderie: "#e2e8f0",
  vente: "#fde68a",
  bassin: "#bae6fd",
  local_technique: "#e2e8f0",
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
  salle_client: "Salle de restauration",
  salle_cafe: "Salle café",
  comptoir: "Comptoir / Bar",
  cuisine_pro: "Cuisine pro",
  plonge: "Plonge",
  chambre_froide: "Chambre froide",
  terrasse: "Terrasse",
  attente: "Zone d'attente",
  patio: "Patio",
  buanderie: "Buanderie",
  vente: "Espace de vente",
  bassin: "Bassin",
  local_technique: "Local technique",
};

// ── Typologie architecturale par type de projet ────────────────────────────
//
// Chaque type de projet Batibuild possède SA typologie de plan : ce n'est pas
// une maison générique réutilisée. La typologie détermine le programme des
// pièces, le nombre de niveaux réel, la distribution (unités multiples pour un
// immeuble ou une résidence, espace unique détaillé pour une rénovation, bassin
// + plages pour une piscine) et les éléments extérieurs pertinents. Le rendu 2D
// et 3D consomme ensuite les mêmes données géométriques.

export type PlanKind =
  | "house"
  | "apartment"
  | "studio"
  | "duplex"
  | "building"
  | "hotel"
  | "office"
  | "shop"
  | "warehouse"
  | "restaurant"
  | "kitchen"
  | "bathroom"
  | "pool"
  | "renovation";

type ProjectFamily = "residential" | "commercial" | "logistics" | "restoration";

/** Typologie de plan associée au type de projet sélectionné. */
export function planKindForCategory(category: string): PlanKind {
  switch ((category ?? "").trim().toLowerCase()) {
    case "piscine":
    case "piscine_coque":
      return "pool";
    case "renovation_cuisine":
      return "kitchen";
    case "renovation_salle_de_bain":
      return "bathroom";
    case "studio":
      return "studio";
    case "appartement":
      return "apartment";
    case "duplex":
      return "duplex";
    case "immeuble":
      return "building";
    case "residence_touristique":
      return "hotel";
    case "bureau":
      return "office";
    case "local_commercial":
      return "shop";
    case "entrepot":
      return "warehouse";
    case "restaurant":
    case "cafe":
      return "restaurant";
    case "renovation_complete":
    case "extension_batiment":
    case "peinture_interieure":
    case "electricite_complete":
    case "plomberie_complete":
      return "renovation";
    default:
      // maison, villa, projet_neuf et types inconnus : logement individuel.
      return "house";
  }
}

function familyForCategory(category: string): ProjectFamily {
  switch (planKindForCategory(category)) {
    case "office":
    case "shop":
    case "hotel":
    case "building":
      return "commercial";
    case "warehouse":
    case "pool":
      return "logistics";
    case "restaurant":
      return "restoration";
    default:
      // house, apartment, studio, duplex, rénovations : logement.
      return "residential";
  }
}

/**
 * Nombre de niveaux RÉELLEMENT générés pour un type de projet.
 *  · studio / appartement / rénovations / piscine : un seul niveau ;
 *  · duplex : au moins deux niveaux reliés par l'escalier ;
 *  · maison, villa, immeuble, bureau… : valeur du projet (aucun étage fictif).
 */
export function structuralLevels(kind: PlanKind, requested: number): number {
  const r = Math.max(1, Math.min(6, Math.round(requested || 1)));
  switch (kind) {
    case "pool":
    case "kitchen":
    case "bathroom":
    case "studio":
    case "apartment":
      return 1;
    case "duplex":
      // Un duplex comporte par définition deux niveaux reliés par l'escalier.
      return Math.max(2, Math.min(3, r));
    default:
      // Maison, villa, immeuble, bureau… : le nombre de niveaux saisi pour le
      // projet fait foi (aucun étage fictif, cohérence avec le calcul des coûts).
      return r;
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
  levelAreas: number[],
  levels: number,
  style?: StyleProfile,
): { level: number; items: ProgramItem[] }[] {
  // Surface du rez-de-chaussée : référence du programme de jour. Chaque étage
  // reçoit ensuite SA surface réelle (levelAreas[lvl]) — les niveaux peuvent
  // avoir des superficies différentes.
  const groundArea = levelAreas[0] ?? 0;
  const tune = style?.tuning ?? {};
  // Le nombre de chambres se déduit de la surface TOTALE du logement (et non
  // du seul niveau) : 180 m² → 4 chambres, 120 m² → 3, 90-100 m² → 2.
  // Densifier davantage produirait des chambres de couloir et des pièces d'eau
  // surdimensionnées par rapport aux usages familiaux tunisiens.
  const totalArea =
    levelAreas.slice(0, Math.max(1, levels)).reduce((s, a) => s + a, 0) || groundArea;
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
    // Surface couverte RÉELLE du niveau courant : elle pilote les cibles de
    // surfaces (hall, couloir, séjour…) sans jamais recopier le RDC.
    const area = levelAreas[lvl] ?? groundArea;
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

// ── Programme RESTAURANT (règles propres au type « Restaurant ») ────────────

/**
 * Programme d'un restaurant professionnel.
 *
 * La SALLE DE RESTAURATION (clients, bar inclus) occupe exactement 60 % de la
 * surface couverte. Le solde (40 %) est réparti entre la cuisine professionnelle
 * (près de 16 % du total), la plonge, la chambre froide, la réserve, les
 * vestiaires, les sanitaires H/F/PMR et la circulation de service.
 *
 * Le bar n'est PAS une pièce : il est dessiné dans la salle (voir
 * `restaurantPlan.restaurantCounterPlacement`) et sa surface n'entre jamais
 * dans le total. Les cibles somment exactement à la surface du niveau, donc le
 * découpage BSP restitue la part de salle demandée sans redistribuer de surface.
 */
function restaurantProgram(area: number): ProgramItem[] {
  const salle = area * RESTAURANT_SALLE_SHARE;
  const serviceBudget = area - salle;
  const part = (pct: number) => serviceBudget * pct;

  // Répartition du solde de service (40 %). Les petites pièces sont plafonnées
  // à des surfaces crédibles ; le surplus reste dans la cuisine professionnelle,
  // jamais dans la salle : la part de salle reste strictement à 60 %.
  const plonge = part(0.1);
  const chambreFroide = part(0.09);
  const reserve = part(0.09);
  const vestiaire = part(0.08);
  const sanH = part(0.08);
  const sanF = part(0.08);
  const pmr = Math.min(part(0.06), 3.6);
  const circulation = Math.min(part(0.06), 6);
  const cuisine =
    serviceBudget -
    (plonge + chambreFroide + reserve + vestiaire + sanH + sanF + pmr + circulation);

  return [
    {
      kind: "salle_client",
      label: "Salle de restauration",
      target: salle,
      min: 25,
      priority: 20,
      habitable: true,
      unique: true,
    },
    {
      kind: "cuisine_pro",
      label: "Cuisine professionnelle",
      target: cuisine,
      min: 6,
      priority: 19,
      habitable: true,
      unique: true,
    },
    {
      kind: "plonge",
      label: "Plonge",
      target: plonge,
      min: 1.5,
      priority: 12,
      unique: true,
    },
    {
      kind: "chambre_froide",
      label: "Chambre froide / réserves",
      target: chambreFroide,
      min: 1.5,
      priority: 11,
      unique: true,
    },
    {
      kind: "stockage",
      label: "Réserve sèche",
      target: reserve,
      min: 1.5,
      priority: 10,
      unique: true,
    },
    {
      kind: "vestiaire",
      label: "Vestiaires personnel",
      target: vestiaire,
      min: 1.2,
      priority: 8,
    },
    {
      kind: "sanitaire",
      label: "Sanitaires Femmes",
      target: sanH,
      min: 1.2,
      priority: 9,
    },
    {
      kind: "sanitaire",
      label: "Sanitaires Hommes",
      target: sanF,
      min: 1.2,
      priority: 9,
    },
    {
      kind: "wc",
      label: "WC PMR",
      target: pmr,
      min: 1.1,
      priority: 9,
    },
    {
      kind: "couloir",
      label: "Couloir de service",
      target: circulation,
      min: 1,
      priority: 7,
    },
  ];
}

// ── Programme CAFÉ (règles propres au type « Café ») ─────────────────────────

/**
 * Programme d'une salle de café.
 *
 * La SALLE CAFÉ (clients, comptoir inclus) occupe 70 % à 80 % de la surface
 * couverte — cible 75 %. Le solde (20 à 30 %) est réparti entre l'espace de
 * préparation, la plonge, la réserve, les sanitaires clients, le WC PMR et la
 * circulation technique. Le comptoir n'est PAS une pièce : il est dessiné dans
 * la salle (voir `cafePlan.cafeCounterPlacement`) et sa surface n'entre jamais
 * dans le total.
 *
 * Les cibles sont exprimées dans la surface réelle du niveau : leur somme vaut
 * exactement cette surface, donc le découpage BSP restitue la part de salle
 * demandée sans redistribuer de surface.
 */
function cafeProgram(area: number): ProgramItem[] {
  const salleShare = cafeSalleShare(area);
  const serviceBudget = area * (1 - salleShare);

  // Répartition du solde. Les deux petites pièces sont plafonnées à des
  // surfaces crédibles (un WC PMR n'a pas besoin de 8 m²) : le surplus reste
  // dans l'espace de préparation, jamais dans la salle — la part de salle
  // reste ainsi strictement dans la fourchette 70–80 %.
  const prep = serviceBudget * 0.34;
  const plonge = serviceBudget * 0.09;
  const reserve = serviceBudget * 0.17;
  const sanitaires = serviceBudget * 0.13;
  const pmr = Math.min(serviceBudget * 0.09, 3.8);
  const circulation = Math.min(serviceBudget * 0.18, 8);
  const surplus = serviceBudget * 0.27 - pmr - circulation;

  const preparation = prep + surplus;
  const salle =
    area - (preparation + plonge + reserve + sanitaires + pmr + circulation);

  return [
    {
      kind: "salle_cafe",
      label: "Salle café",
      target: salle,
      min: 20,
      priority: 20,
      habitable: true,
      unique: true,
    },
    {
      kind: "cuisine_pro",
      label: "Espace de préparation",
      target: preparation,
      min: 3.5,
      priority: 18,
      habitable: true,
      unique: true,
    },
    {
      kind: "stockage",
      label: "Réserve",
      target: reserve,
      min: 1.5,
      priority: 12,
      unique: true,
    },
    {
      kind: "sanitaire",
      label: "Sanitaires clients",
      target: sanitaires,
      min: 1.2,
      priority: 12,
    },
    {
      kind: "wc",
      label: "WC PMR",
      target: pmr,
      min: 1.1,
      priority: 11,
    },
    {
      kind: "plonge",
      label: "Plonge",
      target: plonge,
      min: 1,
      priority: 9,
    },
    {
      kind: "couloir",
      label: "Circulation technique",
      target: circulation,
      min: 1,
      priority: 7,
    },
  ];
}

// ── Programmes spécifiques par typologie de projet ──────────────────────────

/** Appartement en collectif : un niveau, entrée, séjour, cuisine, chambres. */
function apartmentProgram(input: FloorPlanInput, area: number): ProgramItem[] {
  const bedrooms = Math.max(
    1,
    Math.min(4, input.bedrooms && input.bedrooms > 0 ? input.bedrooms : Math.round(area / 30)),
  );
  const items: ProgramItem[] = [
    {
      kind: "hall",
      label: "Hall d'entrée",
      target: 4.5,
      min: 2.8,
      priority: 16,
    },
    {
      kind: "sejour",
      label: "Séjour",
      target: Math.max(18, area * 0.3),
      min: 14,
      priority: 20,
      habitable: true,
      unique: true,
    },
    { kind: "cuisine", label: "Cuisine", target: 8.5, min: 5, priority: 15, habitable: true },
  ];
  for (let i = 0; i < bedrooms; i++) {
    items.push({
      kind: "chambre",
      label: i === 0 ? "Chambre principale" : `Chambre ${i + 1}`,
      target: i === 0 ? 14 : 11.5,
      min: i === 0 ? 9 : 8.5,
      priority: 13 - i,
      habitable: true,
    });
  }
  items.push({ kind: "sdb", label: "Salle de bain", target: 5.5, min: 3.5, priority: 10 });
  items.push({ kind: "wc", label: "WC", target: 2.5, min: 1.5, priority: 6 });
  if (area >= 90) {
    items.push({ kind: "buanderie", label: "Buanderie", target: 4.5, min: 3, priority: 4 });
  }
  return items;
}

/** Studio : une pièce de vie dominante, coin nuit, kitchenette, salle d'eau. */
function studioProgram(area: number): ProgramItem[] {
  return [
    {
      kind: "sejour",
      label: "Séjour",
      target: Math.max(9, area * 0.36),
      min: 8,
      priority: 20,
      habitable: true,
      unique: true,
    },
    {
      kind: "chambre",
      label: "Coin nuit",
      target: Math.max(6.5, area * 0.22),
      min: 5.5,
      priority: 15,
      habitable: true,
    },
    {
      kind: "cuisine",
      label: "Kitchenette",
      target: Math.max(3, area * 0.14),
      min: 2.6,
      priority: 12,
      habitable: true,
    },
    {
      kind: "sdb",
      label: "Salle d'eau",
      target: Math.max(3, area * 0.16),
      min: 2.8,
      priority: 11,
    },
    { kind: "hall", label: "Entrée", target: 3, min: 2, priority: 8 },
  ];
}

/** Local commercial : accueil, surface de vente, réserve, sanitaires. */
function shopProgram(area: number): ProgramItem[] {
  return [
    {
      kind: "vente",
      label: "Espace de vente",
      target: Math.max(25, area * 0.55),
      min: 18,
      priority: 20,
      habitable: true,
      unique: true,
    },
    {
      kind: "reception",
      label: "Accueil / Caisse",
      target: Math.max(6, area * 0.08),
      min: 4,
      priority: 16,
      habitable: true,
    },
    {
      kind: "stockage",
      label: "Réserve",
      target: Math.max(8, area * 0.18),
      min: 6,
      priority: 13,
    },
    { kind: "sanitaire", label: "Sanitaires", target: 5, min: 3, priority: 9 },
    {
      kind: "couloir",
      label: "Circulation",
      target: Math.max(3, area * 0.07),
      min: 2.5,
      priority: 7,
    },
  ];
}

/** Une unité de logement (appartement d'immeuble) ou une chambre d'hôtel. */
function dwellingUnitProgram(
  unitArea: number,
  unitLabel: string,
  kind: "apartment" | "hotel",
): ProgramItem[] {
  if (kind === "hotel") {
    return [
      {
        kind: "chambre",
        label: `Chambre ${unitLabel}`,
        target: Math.max(12, unitArea * 0.62),
        min: 9,
        priority: 15,
        habitable: true,
        unique: true,
      },
      {
        kind: "sdb",
        label: `SDB ${unitLabel}`,
        target: Math.max(4, unitArea * 0.24),
        min: 3,
        priority: 11,
      },
      { kind: "hall", label: `Entrée ${unitLabel}`, target: 3, min: 2, priority: 7 },
    ];
  }
  const bedrooms = unitArea >= 62 ? 2 : 1;
  const items: ProgramItem[] = [
    {
      kind: "sejour",
      label: `Séjour ${unitLabel}`,
      target: Math.max(12, unitArea * 0.28),
      min: 10,
      priority: 18,
      habitable: true,
      unique: true,
    },
    {
      kind: "cuisine",
      label: `Cuisine ${unitLabel}`,
      target: 7,
      min: 4.5,
      priority: 14,
      habitable: true,
    },
  ];
  for (let i = 0; i < bedrooms; i++) {
    items.push({
      kind: "chambre",
      label:
        bedrooms === 1
          ? `Chambre ${unitLabel}`
          : i === 0
            ? `Chambre 1 ${unitLabel}`
            : `Chambre 2 ${unitLabel}`,
      target: i === 0 ? 12 : 10,
      min: 7.5,
      priority: 13 - i,
      habitable: true,
    });
  }
  items.push({ kind: "sdb", label: `SDB ${unitLabel}`, target: 4.5, min: 3, priority: 10 });
  items.push({ kind: "wc", label: `WC ${unitLabel}`, target: 2.2, min: 1.5, priority: 5 });
  return items;
}

/** Accueil commun d'un immeuble ou d'une résidence (rez-de-chaussée). */
function commonAreaProgram(kind: "building" | "hotel"): ProgramItem[] {
  if (kind === "hotel") {
    return [
      {
        kind: "reception",
        label: "Réception",
        target: 14,
        min: 9,
        priority: 20,
        habitable: true,
        unique: true,
      },
      {
        kind: "sejour",
        label: "Salon commun",
        target: 16,
        min: 11,
        priority: 15,
        habitable: true,
      },
      { kind: "sanitaire", label: "Sanitaires communs", target: 5, min: 3, priority: 9 },
    ];
  }
  return [      {
        kind: "hall",
        label: "Espace commun",
        target: 12,
        min: 7,
        priority: 18,
        habitable: true,
        unique: true,
      },
    { kind: "sanitaire", label: "Sanitaires communs", target: 4, min: 2.5, priority: 8 },
  ];
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
      } else if (leftover >= 1.2) {
        // Zone sans pièce de vie ni chambre (entrepôt, commerce, restauration) :
        // le surplus revient à la pièce principale du programme, jamais à une
        // pièce d'habitation inventée (un entrepôt n'a pas de séjour).
        const main = [...fitted]
          .filter((i) =>
            ["stockage", "logistique", "vente", "salle_client", "openspace", "reunion"].includes(
              i.kind,
            ),
          )
          .sort((a, b) => b.target - a.target)[0];
        if (main) {
          main.target += leftover;
        } else if (leftover >= 6) {
          fitted.push({
            kind: "polyvalent",
            label: "Espace polyvalent",
            target: leftover,
            min: 5,
            priority: 2,
            habitable: true,
          });
        } else {
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
  "salle_cafe",
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
  "salle_cafe",
  "comptoir",
  "attente",
  "vente",
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
 * Pose une porte dans un mur de façade, centrée sur le mur et décalée si une
 * ouverture existe déjà. Renvoie `false` si aucune place libre n'est trouvée.
 * Utilisée pour l'entrée principale et la sortie de secours : l'ouverture est
 * une vraie donnée du plan (2D = 3D), jamais un élément décoratif.
 */
function addFacadeDoor(
  room: PlanRoom,
  side: WallSide,
  desiredWidth: number,
  flags: { isEntry?: boolean; isEmergency?: boolean; isService?: boolean } = {},
  /** Position à essayer en premier (café / restaurant : entrée à l'écart du service). */
  preferred?: number,
): boolean {
  const span = side === "N" || side === "S" ? room.w : room.h;
  const width = round3(Math.min(desiredWidth, span - 0.4));
  if (width < 0.6) return false;
  const existing = [...room.doors, ...room.windows].filter((o) => o.wall === side);
  const clampPos = (raw: number) => Math.max(0.2, Math.min(raw, span - width - 0.2));
  const free = (raw: number) => {
    const pos = clampPos(raw);
    return existing.every(
      (o) => pos >= o.position + o.width + 0.15 || pos + width <= o.position - 0.15,
    );
  };
  const candidates = [
    ...(preferred != null ? [preferred] : []),
    span / 2 - width / 2,
    0.2,
    span - width - 0.2,
  ];
  const position = candidates.find(free);
  if (position === undefined) return false;
  room.doors.push({
    wall: side,
    position: round3(clampPos(position)),
    width,
    ...flags,
  });
  return true;
}

/**
 * Place une fenêtre dans le plus grand espace LIBRE d'un mur, entre les
 * portes existantes. `from`/`to` limitent la zone autorisée le long du mur
 * (mur de cour partagé) ; la position reste relative à l'origine du mur de la
 * pièce. Renvoie `null` si l'espace libre est trop court : une fenêtre n'est
 * jamais superposée à une porte.
 */
function fitWindowOnWall(
  room: PlanRoom,
  side: WallSide,
  from: number,
  to: number,
  desired: number,
  minWidth: number,
): { position: number; width: number } | null {
  if (to - from < minWidth) return null;
  const obstacles = room.doors
    .filter((d) => d.wall === side)
    .map((d) => ({ a: d.position - 0.15, b: d.position + d.width + 0.15 }))
    .sort((x, y) => x.a - y.a);
  let cursor = from;
  let best = { start: from, len: 0 };
  for (const o of obstacles) {
    const end = Math.min(to, o.a);
    if (end > cursor && end - cursor > best.len) best = { start: cursor, len: end - cursor };
    cursor = Math.max(cursor, Math.min(to, o.b));
    if (cursor >= to) break;
  }
  if (to > cursor && to - cursor > best.len) best = { start: cursor, len: to - cursor };
  const width = Math.min(desired, best.len);
  if (width < minWidth) return null;
  return { position: round3(best.start + (best.len - width) / 2), width: round3(width) };
}

/**
 * Portes et fenêtres d'un niveau.
 *
 * Circulation : un arbre couvrant de poids maximal relie toutes les pièces à
 * l'entrée. Chaque porte est posée SUR LES DEUX pièces (même position), ce qui
 * évite les portes orphelines et les arcs de débattement dans le vide. Les
 * liaisons vers un couloir, un hall ou le séjour sont privilégiées ; deux
 * chambres ne sont jamais reliées directement si un autre chemin existe.
 *
 * Façades : une porte d'entrée principale et une porte de sortie de secours
 * (RDC) sont placées sur deux façades différentes, puis des fenêtres éclairent
 * les pièces habitables (et les pièces d'eau) sur les façades extérieures.
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
  const publicKinds: RoomKind[] = [
    "hall",
    "sejour",
    "reception",
    "openspace",
    "salle_cafe",
    "salle_client",
  ];
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

  const opposite: Record<WallSide, WallSide> = { N: "S", S: "N", E: "W", W: "E" };

  /**
   * Entrée d'un café / restaurant : l'extrémité du mur la plus éloignée de la
   * zone de service (cuisine, plonge, sanitaires). Le débattement de la porte
   * ne coupe ainsi jamais le linéaire du bar, adossé au mur de la cuisine.
   * `undefined` = position libre (centre du mur).
   */
  const foodEntryOffset = (
    salle: PlanRoom,
    side: WallSide,
  ): number | undefined => {
    if (!isSalleKind(salle.kind)) return undefined;
    let serviceWall: WallSide | null = null;
    for (const r of rooms) {
      if (r === salle || r.exterior) continue;
      if (r.kind !== "cuisine_pro" && r.kind !== "plonge" && !isSanitaryKind(r.kind)) continue;
      const shared = sharedBoundary(salle, r);
      if (shared) {
        serviceWall = shared.wallA;
        break;
      }
    }
    if (!serviceWall || serviceWall === side) return undefined;
    const span = side === "N" || side === "S" ? salle.w : salle.h;
    const margin = 0.2;
    const farEnd = Math.max(margin, span - 1.1 - margin);
    if ((serviceWall === "E" || serviceWall === "W") && (side === "N" || side === "S")) {
      return serviceWall === "E" ? margin : farEnd;
    }
    if ((serviceWall === "N" || serviceWall === "S") && (side === "E" || side === "W")) {
      return serviceWall === "N" ? farEnd : margin;
    }
    return undefined;
  };

  // ── 2. Porte d'entrée principale sur la façade rue ───────────────────────
  let entrySide: WallSide | null = null;
  if (isGroundFloor && entry) {
    const side: WallSide =
      onFacade(entry, profile.mainFacade)
        ? profile.mainFacade
        : (["S", "E", "W", "N"] as WallSide[]).find((s) => onFacade(entry!, s)) ?? "S";
    entrySide = side;
    // Café / restaurant : l'entrée est décalée à l'extrémité du mur la plus
    // éloignée de la zone de service (cuisine + sanitaires). Son débattement
    // ne coupe alors jamais le linéaire du bar, adossé au mur de la cuisine.
    addFacadeDoor(entry, side, 1.1, { isEntry: true }, foodEntryOffset(entry, side));
  }

  // ── 3. Porte de sortie de secours (rez-de-chaussée) ─────────────────────
  // Exigence de sécurité : une deuxième issue vers l'extérieur, sur une façade
  // DIFFÉRENTE de l'entrée. Elle privilégie la façade opposée, puis une
  // circulation ou une pièce publique (hall, séjour, couloir, cuisine, garage)
  // avant les pièces privées, et une largeur de mur suffisante pour un battant
  // de 0,90 m. La porte est ajoutée dans le mur réel : elle est donc percée et
  // affichée à l'identique en 2D et en 3D, sans modifier aucune surface.
  if (isGroundFloor && entrySide) {
    const sideOrder: WallSide[] = [
      opposite[entrySide],
      ...(["N", "S", "E", "W"] as WallSide[]).filter(
        (s) => s !== entrySide && s !== opposite[entrySide],
      ),
    ];
    const rankSide = (side: WallSide) => sideOrder.indexOf(side);
    const rankKind = (r: PlanRoom) =>
      CIRCULATION_KINDS.has(r.kind) ? 0 : PRIVATE_KINDS.has(r.kind) ? 2 : 1;
    const candidates: { room: PlanRoom; side: WallSide; span: number }[] = [];
    for (const r of rooms) {
      if (r === entry) continue;
      for (const side of ["N", "S", "E", "W"] as WallSide[]) {
        if (side === entrySide || !onFacade(r, side)) continue;
        const span = side === "N" || side === "S" ? r.w : r.h;
        if (span < 1.4) continue;
        candidates.push({ room: r, side, span });
      }
    }
    candidates.sort(
      (a, b) =>
        rankSide(a.side) - rankSide(b.side) ||
        rankKind(a.room) - rankKind(b.room) ||
        b.span - a.span,
    );
    let emergencyAdded = false;
    for (const c of candidates) {
      if (addFacadeDoor(c.room, c.side, 0.9, { isEmergency: true })) {
        emergencyAdded = true;
        break;
      }
    }
    // Dernier recours (plan très compact) : la pièce d'entrée reçoit sa
    // deuxième issue sur la façade opposée, jamais sur celle de l'entrée.
    if (!emergencyAdded && entry) {
      addFacadeDoor(entry, opposite[entrySide], 0.9, { isEmergency: true });
    }
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

  // ── 4. Fenêtres : façade jardin prioritaire, double exposition ──────────
  // Pièces habitables ET pièces d'eau (ventilation) : chaque ouverture reste
  // dans son mur, sans chevaucher la porte du même mur.
  const WET_ROOMS = new Set<RoomKind>(["sdb", "wc", "sanitaire", "buanderie"]);
  for (const room of rooms) {
    const wet = WET_ROOMS.has(room.kind);
    if (!HABITABLE_KINDS.has(room.kind) && !wet) continue;
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
      if (added >= (wet ? 1 : 2)) break;
      const s = sides.find((x) => x.side === side)!;
      if (!onFacade(room, side) || s.span < (wet ? 0.75 : 0.9)) continue;
      const isMain = side === profile.mainFacade;
      const desired = wet ? 0.6 : isMain && profile.bayWindows ? 2.4 : isMain ? 1.6 : 1.2;
      const winW = Math.min(desired, s.span - 0.3);
      // Éviter le chevauchement avec une porte du même mur : la fenêtre est
      // centrée dans le plus grand segment LIBRE du mur. Si ce segment est
      // trop court, la fenêtre est omise sur ce mur (jamais superposée à une
      // porte, et jamais repoussée dans le mur voisin).
      // `WindowSpec.position` est RELATIF à l'origine du mur de la pièce
      // (le rendu 2D ajoute r.x / r.y) — jamais une coordonnée globale.
      const fitted = fitWindowOnWall(room, side, 0, s.span, winW, wet ? 0.45 : 0.6);
      if (!fitted) continue;
      room.windows.push({ wall: side, ...fitted });
      added++;
    }

    // Lumière de second jour : une pièce encloisonnée peut s'éclairer sur le
    // patio (espace extérieur) — jamais sur une autre pièce fermée.
    if (added === 0) {
      for (const ext of allRooms.filter((r) => r.exterior)) {
        const shared = sharedBoundary(room, ext);
        if (!shared || shared.len < 1.2) continue;
        // La fenêtre ne doit pas non plus recouvrir la porte de secours ou
        // d'entrée posée sur ce mur de cour.
        const fitted = fitWindowOnWall(
          room,
          shared.wallA,
          shared.startA,
          shared.startA + shared.len,
          Math.min(1.4, shared.len - 0.3),
          0.5,
        );
        if (!fitted) continue;
        room.windows.push({ wall: shared.wallA, ...fitted });
        break;
      }
    }
  }
}

/**
 * Sanitaires d'un café / restaurant : accès client depuis la salle.
 *
 *  · une porte sur le mur mitoyen de la salle est garantie (elle est ajoutée
 *    sur les DEUX pièces, donc le plan 2D et le plan 3D partagent la même
 *    ouverture) ;
 *  · toutes les autres portes du sanitaire sont retirées : un WC ne se
 *    traverse pas et n'ouvre ni sur la cuisine, ni sur la plonge, ni sur la
 *    réserve ou la chambre froide (hygiène, marche en avant) ;
 *  · un local ainsi privé de son accès reçoit une autre porte sur son plus
 *    grand mur mitoyen non sanitaire : aucun local n'est jamais encloisonné.
 */
function ensureSanitaryDoors(plan: FloorPlan): void {
  const salle = plan.rooms.find((r) => !r.exterior && isSalleKind(r.kind));
  if (!salle) return;
  const rooms = plan.rooms.filter((r) => !r.exterior);
  const sanitary = rooms.filter((r) => isSanitaryKind(r.kind));
  if (sanitary.length === 0) return;

  const inRange = (
    d: { position: number; width: number },
    from: number,
    to: number,
  ) => d.position < to + 0.05 && d.position + d.width > from - 0.05;
  const hasDoorOn = (
    room: PlanRoom,
    wall: WallSide,
    from: number,
    to: number,
  ) => room.doors.some((d) => d.wall === wall && inRange(d, from, to));

  // Aucun local ne doit rester encloisonné : si la porte retirée était le seul
  // accès d'un local de service, une porte est reposée sur son plus grand mur
  // mitoyen NON sanitaire (jamais à travers un WC).
  const ensureAccess = (room: PlanRoom) => {
    if (room.doors.length > 0) return;
    const neighbours = rooms
      .filter((r) => r !== room && !isSanitaryKind(r.kind))
      .map((r) => ({ room: r, shared: sharedBoundary(room, r) }))
      .filter((x): x is { room: PlanRoom; shared: SharedBoundary } => !!x.shared)
      .sort((a, b) => b.shared.len - a.shared.len);
    if (neighbours.length > 0) {
      addPairedDoor(room, neighbours[0].room, neighbours[0].shared, 0.9);
      return;
    }
    const vertical = room.h > room.w;
    const len = vertical ? room.h : room.w;
    const width = Math.min(0.8, len - 0.3);
    if (width < 0.5) return;
    room.doors.push({
      wall: vertical ? "E" : "S",
      position: round3((len - width) / 2),
      width: round3(width),
    });
  };

  for (const room of sanitary) {
    const toSalle = sharedBoundary(salle, room);
    // 1. Porte client : percée dans le mur de la salle si elle n'y est pas.
    //    `sharedBoundary(salle, room)` donne le mur côté salle (`wallA`) et le
    //    mur correspondant côté sanitaire (`wallB`).
    const clientDoor = (shared: SharedBoundary) =>
      hasDoorOn(room, shared.wallB, shared.startB, shared.startB + shared.len);
    if (toSalle && !clientDoor(toSalle)) {
      addPairedDoor(salle, room, toSalle, SANITARY_DOOR_WIDTH);
    }
    if (!toSalle || !clientDoor(toSalle)) continue;

    // 2. Le sanitaire n'ouvre plus que sur la salle.
    for (const other of rooms) {
      if (other === room || other === salle) continue;
      const shared = sharedBoundary(room, other);
      if (!shared) continue;
      const from = shared.startA;
      const to = shared.startA + shared.len;
      if (!hasDoorOn(room, shared.wallA, from, to)) continue;
      room.doors = room.doors.filter(
        (d) => !(d.wall === shared.wallA && inRange(d, from, to)),
      );
      other.doors = other.doors.filter(
        (d) =>
          !(
            d.wall === shared.wallB &&
            inRange(d, shared.startB, shared.startB + shared.len)
          ),
      );
      ensureAccess(other);
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

// ── Distribution café / restaurant : bloc sanitaire côté salle ───────────────

/**
 * Distribution « restauration » : salle en bande + local de service dont le
 * BLOC SANITAIRE est adossé au mur de la salle.
 *
 * Le local de service (40 % d'un restaurant, 20 à 30 % d'un café) est découpé
 * en repère local — `u` le long du mur mitoyen de la salle, `v` en profondeur :
 *
 *   v=0  ┌──────────── bloc sanitaires ───────────┬──── cuisine ────┐
 *        │ WC / sanitaires (portes sur la salle)  │  (passe-plat)   │
 *        ├────────────────── arrière du bloc ─────┤                 │
 *        │        plonge · réserve · froid         │  arrière cuisine│
 *        └─────────────────────────────────────────┴─────────────────┘
 *
 * Conséquences, sans jamais changer la surface du niveau :
 *   • la salle garde exactement sa part (60 % / 70–75 %) ;
 *   • la cuisine garde sa surface et son mur de service (passe-plat) ;
 *   • chaque sanitaire ouvre sur la salle et sur elle seule, jamais sur la
 *     production ; le bloc reste mitoyen de la cuisine ;
 *   • les locaux de service restent accessibles depuis la cuisine (marche en
 *     avant du personnel), donc la circulation client et la circulation de
 *     service ne se croisent pas.
 */
function foodServiceLayout(zone: Rect, items: ProgramItem[]): Placed<ProgramItem>[] {
  const fitted = fitProgram(items, zone.w * zone.h);
  const fallback = () => bspLayout(zone, fitted);
  const salle = fitted.find((i) => isSalleKind(i.kind));
  const sanitary = fitted.filter((i) => isSanitaryKind(i.kind));
  const kitchen = fitted.find((i) => i.kind === "cuisine_pro");
  if (!salle || !kitchen || sanitary.length === 0) return fallback();

  // 1. Bande de salle : même coupe que le BSP (axe long, part exacte de la
  //    salle dans la surface du niveau) — la part de salle ne bouge pas.
  const alongX = zone.w >= zone.h;
  const along = alongX ? zone.w : zone.h;
  const total = fitted.reduce((s, i) => s + i.target, 0) || zone.w * zone.h;
  const minFrac = Math.min(0.4, 1.1 / Math.max(1, along));
  const frac = Math.min(1 - minFrac, Math.max(minFrac, salle.target / total));
  const cut = round3(along * frac);
  const salleRect: Rect = alongX
    ? { x: zone.x, y: zone.y, w: cut, h: zone.h }
    : { x: zone.x, y: zone.y, w: zone.w, h: cut };
  const service: Rect = alongX
    ? { x: round3(zone.x + cut), y: zone.y, w: round3(zone.w - cut), h: zone.h }
    : { x: zone.x, y: round3(zone.y + cut), w: zone.w, h: round3(zone.h - cut) };

  // 2. Repère local : `u` le long du mur de la salle, `v` en profondeur.
  const H = alongX ? service.h : service.w;
  const W = alongX ? service.w : service.h;
  const at = (u0: number, u1: number, v0: number, v1: number): Rect =>
    alongX
      ? {
          x: round3(service.x + v0),
          y: round3(service.y + u0),
          w: round3(v1 - v0),
          h: round3(u1 - u0),
        }
      : {
          x: round3(service.x + u0),
          y: round3(service.y + v0),
          w: round3(u1 - u0),
          h: round3(v1 - v0),
        };

  const sanitaryArea = sanitary.reduce((s, i) => s + i.target, 0);
  const kitchenArea = kitchen.target;
  // Largeur de mur minimale d'une cabine : en-dessous de 0,90 m, aucune porte
  // ne tient dans le mur partagé avec la salle (mur mitoyen + battant).
  const minRun = sanitary.length * SANITARY_MIN_WIDTH;
  if (sanitaryArea <= 0 || H < 3.2 || W < 1.9) return fallback();

  // 3. Profondeur du bloc : une demi-largeur du local, bornée à une cabine
  //    crédible. Elle s'allonge si le mur est trop court (bloc compact) ou si
  //    la cuisine manquerait de fronture pour le passe-plat.
  let blockDepth = Math.min(SANITARY_DEPTH_MAX, Math.max(SANITARY_DEPTH_MIN, W * 0.5));
  const depthToKeepKitchen = (W * sanitaryArea) / Math.max(0.01, W * H - kitchenArea);
  blockDepth = Math.max(blockDepth, depthToKeepKitchen, sanitaryArea / Math.max(0.5, H - 2.2));
  if (sanitaryArea / blockDepth < minRun) blockDepth = sanitaryArea / minRun;
  // Le WC accessible exige 1,50 m de mur : si le bloc est trop profond pour
  // tenir dans le linéaire disponible, il s'aplatit (jusqu'à la profondeur
  // minimale d'une cabine) plutôt que de sacrifier l'accessibilité PMR.
  const pmrRunNeed =
    SANITARY_PMR_WIDTH + Math.max(0, sanitary.length - 1) * SANITARY_MIN_WIDTH;
  if (
    sanitary.some((i) => i.kind === "wc") &&
    sanitaryArea / blockDepth < pmrRunNeed
  ) {
    const flattened = sanitaryArea / pmrRunNeed;
    if (flattened >= SANITARY_DEPTH_MIN) blockDepth = flattened;
  }
  blockDepth = round3(blockDepth);
  let blockRun = round3(Math.min(H - 1.2, sanitaryArea / blockDepth));
  // Une bande arrière de moins de 0,90 m ne serait pas aménageable : le bloc
  // occupe alors toute la profondeur du local (les cabines s'allongent).
  if (W - blockDepth > 0.02 && W - blockDepth < 0.9) {
    blockDepth = round3(W);
    blockRun = round3(Math.min(H - 1.2, Math.max(minRun, sanitaryArea / blockDepth)));
  }
  if (blockRun < minRun - 0.05 || blockRun > H - 1) return fallback();

  // 4. Cuisine : elle prend le mur de salle restant, sa profondeur découle de
  //    sa surface (elle conserve donc sa proportion). Si la bande arrière
  //    serait inutilisable, la cuisine occupe toute la profondeur et sa
  //    largeur diminue : aucun couloir d'un demi-mètre n'est créé.
  let kitchenRun = round3(H - blockRun);
  let kitchenDepth = kitchenRun > 0.1 ? kitchenArea / kitchenRun : W;
  if (kitchenDepth >= W - 0.9 || kitchenDepth > W) {
    // Aucune bande arrière utilisable derrière la cuisine : elle occupe toute
    // la profondeur et sa largeur diminue pour CONSERVER sa surface ; le solde
    // du mur devient une colonne de service pleine profondeur.
    kitchenDepth = round3(W);
    kitchenRun = round3(
      Math.min(H - blockRun, kitchenArea / Math.max(0.5, kitchenDepth)),
    );
  }
  kitchenDepth = round3(kitchenDepth);
  // Bande latérale résiduelle : si elle est trop étroite, elle revient au bloc
  // sanitaire (qui reste ainsi adossé à la salle terminée par un mur plein).
  const sideRun = round3(H - blockRun - kitchenRun);
  if (sideRun > 0.02 && sideRun < 0.9) blockRun = round3(blockRun + sideRun);

  // 5. Linéaire du bloc réparti entre les sanitaires. Le WC PMR reçoit 1,50 m
  //    de large (giration) dès que le budget de surface le permet.
  const pmr = sanitary.find((i) => i.kind === "wc") ?? null;
  const othersSan = sanitary.filter((i) => i !== pmr);
  const wanted = (i: ProgramItem) => Math.max(i.target / blockDepth, SANITARY_MIN_WIDTH);
  const shareWidths = (wants: number[], run: number): number[] => {
    const fixed: (number | null)[] = wants.map(() => null);
    let free = wants.map((_, i) => i);
    let remaining = run;
    while (free.length > 0) {
      const total = free.reduce((s, i) => s + Math.max(wants[i], 1e-4), 0) || free.length;
      const small = free.filter(
        (i) => (Math.max(wants[i], 1e-4) / total) * remaining < SANITARY_MIN_WIDTH,
      );
      if (small.length === 0) {
        for (const i of free) fixed[i] = (Math.max(wants[i], 1e-4) / total) * remaining;
        break;
      }
      if (remaining - small.length * SANITARY_MIN_WIDTH < (free.length - small.length) * SANITARY_MIN_WIDTH) {
        // Mur trop court pour un plancher de cabine : répartition égale.
        for (const i of free) fixed[i] = remaining / free.length;
        break;
      }
      for (const i of small) {
        fixed[i] = SANITARY_MIN_WIDTH;
        remaining -= SANITARY_MIN_WIDTH;
      }
      free = free.filter((i) => !small.includes(i));
    }
    return fixed.map((v) => v ?? 0);
  };
  // Le WC PMR reçoit 1,50 m de large (giration) si les autres cabines gardent
  // leur largeur minimale : sinon les sanitaires restent proportionnels.
  let widths: number[];
  const restRun = blockRun - SANITARY_PMR_WIDTH;
  // Tolérance de 2 cm : le linéaire est arrondi au millimètre.
  if (pmr && restRun >= othersSan.length * SANITARY_MIN_WIDTH - 0.02) {
    const othersWidths = shareWidths(othersSan.map(wanted), restRun);
    widths = sanitary.map((i) =>
      i === pmr ? SANITARY_PMR_WIDTH : othersWidths[othersSan.indexOf(i)],
    );
  } else {
    widths = shareWidths(sanitary.map(wanted), blockRun);
  }
  const blockRooms: Placed<ProgramItem>[] = [];
  let cursor = 0;
  sanitary.forEach((item, i) => {
    const last = i === sanitary.length - 1;
    const width = last ? round3(blockRun - cursor) : round3(widths[i] ?? 0);
    if (width <= 0.2) return;
    blockRooms.push({ item, rect: at(cursor, cursor + width, 0, blockDepth) });
    cursor = round3(cursor + width);
  });
  if (blockRooms.length === 0) return fallback();

  // 6. Cuisine : rect au contact de la salle, surface conservée.
  const kitchenRect = at(
    blockRun,
    round3(blockRun + kitchenRun),
    0,
    kitchenDepth,
  );

  // 7. Locaux de service : derrière le bloc, derrière la cuisine et dans la
  //    bande latérale éventuelle. Le mur est entièrement couvert.
  const others = fitted.filter((i) => i !== salle && i !== kitchen && !isSanitaryKind(i.kind));
  const otherRects: Rect[] = [];
  if (W - blockDepth > 0.02) otherRects.push(at(0, blockRun, blockDepth, W));
  if (kitchenRun > 0.1 && W - kitchenDepth > 0.02) {
    otherRects.push(at(blockRun, round3(blockRun + kitchenRun), kitchenDepth, W));
  }
  if (H - (blockRun + kitchenRun) > 0.02) {
    otherRects.push(at(round3(blockRun + kitchenRun), H, 0, W));
  }
  // Filet de sécurité : aucune pièce du programme ne doit disparaître faute
  // de place (plan trop contraint) — on revient alors au découpage standard.
  if (others.length > 0 && otherRects.length === 0) return fallback();

  return [
    { item: salle, rect: salleRect },
    ...blockRooms,
    { item: kitchen, rect: kitchenRect },
    ...(others.length > 0 ? fillZones(otherRects, others, "bsp") : []),
  ];
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
  /**
   * Logement traversant : distribution en deux bandes qui conservent chacune
   * une façade. Utilisé pour les studios et appartements, dont chaque pièce
   * habitable doit pouvoir s'éclairer naturellement sans couloir aveugle.
   */
  doubleExposure = false,
  /**
   * Gaine d'escalier commune au bâtiment : identique sur tous les niveaux
   * lorsque les surfaces couvertes diffèrent (étage en gradin), pour que la
   * liaison verticale reste réelle. Absente ⇒ dimensionnée sur le niveau.
   */
  stair?: { w: number; h: number },
  /**
   * Distribution « pleine emprise » (café) : aucun patio, hall ou couloir
   * découpé par le parti architectural. La salle café occupe alors exactement
   * la part calculée du niveau, et le solde est réparti en BSP entre les
   * locaux de service — sans surface perdue ni dédoublement.
   */
  flatLayout = false,
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
  const shaftW = round3(
    stair ? Math.min(stair.w, length * 0.5) : Math.min(2.5, length * 0.32),
  );
  const shaftD = round3(
    stair ? Math.min(stair.h, width * 0.6) : Math.min(4.2, width * 0.38),
  );
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
    flatLayout || levelIdx > 0 ? "bsp" : profile.layout;
  // Une zone sans pièce laisserait un trou dans le niveau : chaque zone du
  // parti doit pouvoir recevoir au moins une pièce.
  const extraZones = Math.max(0, baseZones.length - 1);
  const enoughItems = items.length >= 4 + extraZones;

  let roomZones: Rect[] = [];
  const specialRooms: { rect: Rect; kind: RoomKind; label: string; exterior?: boolean }[] = [];

  if (doubleExposure) {
    // Le parti architectural ne découpe pas le logement : la double exposition
    // prime pour garantir une fenêtre à chaque pièce habitable.
    roomZones = [mainZone];
  } else if (strategy === "patio" && enoughItems && mainZone.w >= 6 && mainZone.h >= 6) {
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
  const placed = doubleExposure
    ? doubleExposureLayout(
        mainZone,
        fitProgram(items, mainZone.w * mainZone.h),
        mainZone.w >= mainZone.h ? "x" : "y",
      )
    : flatLayout && roomZones.length === 1
      ? // Café / restaurant : bloc sanitaire adossé à la salle (une seule
        // géométrie, partagée par le 2D, le 3D et le tableau des surfaces).
        foodServiceLayout(roomZones[0], items)
      : fillZones(
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
  if (master && biggest && biggest !== master && biggest.area > master.area + 0.01) {
    const label = master.label;
    master.label = biggest.label;
    biggest.label = label;
  }

  // Un bureau en cœur d'îlot (aucune façade) n'est pas une pièce habitable
  // viable : sur les grands plateaux, le découpage peut le priver de jour.
  // La géométrie reste inchangée, seule sa nature devient un rangement.
  const onPerimeter = (r: PlanRoom) =>
    Math.abs(r.x) < TOL ||
    Math.abs(r.y) < TOL ||
    Math.abs(r.x + r.w - length) < TOL ||
    Math.abs(r.y + r.h - width) < TOL;
  for (const r of plan.rooms) {
    if (r.exterior || r.kind !== "bureau") continue;
    if (!onPerimeter(r)) {
      r.kind = "stockage";
      r.label = "Rangement";
    }
  }

  addOpenings(
    plan,
    levelIdx === 0,
    mulberry32(variantSeed ^ (levelIdx * 7919)),
    profile,
  );

  // WC et sanitaires d'un café / restaurant : porte client sur la salle,
  // jamais sur la production (aucune autre typologie n'est concernée).
  if (flatLayout) ensureSanitaryDoors(plan);

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

/**
 * Distribution d'une unité en double exposition : une première coupe sépare
 * deux bandes (ou deux colonnes) qui gardent chacune une façade, puis chaque
 * bande est découpée en pièces. Contrairement au BSP libre, aucune pièce
 * habitable ne se retrouve sans fenêtre au cœur du logement.
 */
function doubleExposureLayout<T extends { target: number }>(
  rect: Rect,
  items: T[],
  axis: "x" | "y",
): Placed<T>[] {
  if (items.length <= 2) return bspLayout(rect, items);
  const total = items.reduce((s, i) => s + i.target, 0) || 1;
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
  const frac = Math.min(0.72, Math.max(0.28, s1 / total));
  if (axis === "y") {
    const cut = round3(Math.max(1.2, Math.min(rect.h - 1.2, rect.h * frac)));
    return [
      ...stripLayout({ x: rect.x, y: rect.y, w: rect.w, h: cut }, g1, "x"),
      ...stripLayout(
        { x: rect.x, y: round3(rect.y + cut), w: rect.w, h: round3(rect.h - cut) },
        g2,
        "x",
      ),
    ];
  }
  const cut = round3(Math.max(1.2, Math.min(rect.w - 1.2, rect.w * frac)));
  return [
    ...stripLayout({ x: rect.x, y: rect.y, w: cut, h: rect.h }, g1, "y"),
    ...stripLayout(
      { x: round3(rect.x + cut), y: rect.y, w: round3(rect.w - cut), h: rect.h },
      g2,
      "y",
    ),
  ];
}

/**
 * Découpe une bande (ou une colonne) en pièces juxtaposées : chaque pièce garde
 * toute la hauteur (ou toute la largeur) de la bande, donc la façade de la
 * bande. Aucune pièce intérieure aveugle n'est créée par cette passe.
 */
function stripLayout<T extends { target: number }>(
  rect: Rect,
  items: T[],
  axis: "x" | "y",
): Placed<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ item: items[0], rect: { ...rect } }];
  const span = axis === "x" ? rect.w : rect.h;
  const start = axis === "x" ? rect.x : rect.y;
  const min = Math.min(1.15, span / items.length);
  const total = items.reduce((s, i) => s + i.target, 0) || 1;
  const free = Math.max(0, span - min * items.length);
  const out: Placed<T>[] = [];
  let cursor = start;
  items.forEach((item, i) => {
    const len = i === items.length - 1
      ? round3(start + span - cursor)
      : round3(min + (free * item.target) / total);
    const r: Rect =
      axis === "x"
        ? { x: round3(cursor), y: rect.y, w: len, h: rect.h }
        : { x: rect.x, y: round3(cursor), w: rect.w, h: len };
    if (r.w > 0.2 && r.h > 0.2) out.push({ item, rect: r });
    cursor = round3(cursor + len);
  });
  return out;
}

// ── Niveaux à unités multiples (immeuble, résidence touristique) ────────────
//
// Un immeuble n'est pas une maison agrandie : chaque niveau est un palier
// desservi par la cage d'escalier (même position à tous les étages), et ce
// palier distribue des UNITÉS (appartements ou chambres d'hébergement). Chaque
// unité reçoit son propre programme (séjour, cuisine, chambre(s), SDB, WC) et
// ses portes, dans un rectangle qui lui est propre : les logements ne se
// traversent jamais.
function buildMultiDwellingLevel(params: {
  levelIdx: number;
  length: number;
  width: number;
  units: { label: string; items: ProgramItem[] }[];
  seed: number;
  profile: StyleProfile;
  /** Bâtiment à plusieurs niveaux : cage d'escalier + palier de distribution. */
  withStair?: boolean;
}): FloorPlan {
  const { levelIdx, length, width, units, seed, profile } = params;
  const withStair = params.withStair ?? true;
  const plan: FloorPlan = {
    level: levelIdx,
    length,
    width,
    rooms: [],
    area: length * width,
  };
  const rid = () => `L${levelIdx}-R${plan.rooms.length}`;

  // Bande de circulation à l'est : palier sur toute la profondeur + cage
  // d'escalier au sud. Identique à tous les niveaux (continuité verticale).
  // Les unités sont des colonnes traversantes : chaque pièce conserve une
  // façade nord ou sud, jamais un simple jour sur le palier.
  const corridorW = round3(Math.min(2.2, Math.max(1.7, length * 0.16)));
  const corridorX = round3(length - corridorW);
  const stairH = withStair ? round3(Math.min(3.4, Math.max(2.6, width * 0.36))) : 0;
  if (withStair) {
    plan.rooms.push(
      makeRoom(rid(), "escalier", "Escalier", corridorX, round3(width - stairH), corridorW, stairH),
    );
  }
  const palierH = round3(width - stairH);
  if (palierH > 1.2) {
    plan.rooms.push(
      makeRoom(
        rid(),
        levelIdx === 0 ? "hall" : "couloir",
        levelIdx === 0 ? "Hall d'entrée" : "Palier de distribution",
        corridorX,
        0,
        corridorW,
        palierH,
      ),
    );
  }

  // Unités en colonnes traversantes à l'ouest du palier.
  const zoneW = corridorX;
  const n = Math.max(1, units.length);
  const sliceW = round3(zoneW / n);
  units.forEach((unit, i) => {
    const x = round3(i * sliceW);
    const w = i === n - 1 ? round3(zoneW - x) : sliceW;
    if (w < 0.8 || width < 0.8) return;
    const placed = doubleExposureLayout(
      { x, y: 0, w, h: width },
      fitProgram(unit.items, w * width),
      "y",
    );
    for (const p of placed) {
      plan.rooms.push(
        makeRoom(
          rid(),
          p.item.kind,
          p.item.label,
          p.rect.x,
          p.rect.y,
          p.rect.w,
          p.rect.h,
          p.item.habitable,
        ),
      );
    }
  });

  addOpenings(plan, levelIdx === 0, mulberry32(seed ^ (levelIdx * 7919)), profile);
  clampLevelGeometry(plan);
  return plan;
}

// ── Rénovation cuisine / salle de bain : un espace unique détaillé ────────
//
// Ces projets ne construisent pas une maison : le plan représente l'ESPACE
// RÉNOVÉ, meublé et équipé (plan de travail, évier, appareils / douche, lavabo,
// WC). La porte d'accès est celle de l'existant : elle est dessinée dans le mur
// de desserte, sans créer de fausse entrée de bâtiment.
function buildRenovationSpacePlan(params: {
  levelIdx: number;
  length: number;
  width: number;
  kind: "kitchen" | "bathroom";
  seed: number;
  profile: StyleProfile;
}): FloorPlan {
  const { levelIdx, length: L, width: W, kind, seed, profile } = params;
  const plan: FloorPlan = { level: levelIdx, length: L, width: W, rooms: [], area: L * W };
  let i = 0;
  const rid = () => `L${levelIdx}-R${i++}`;

  if (kind === "kitchen") {
    // Cuisine + cellier en fond de pièce (rangement des denrées).
    const pantryW = round3(Math.min(1.4, Math.max(0.9, L * 0.26)));
    const kitchenW = round3(L - pantryW);
    const kitchen = makeRoom(rid(), "cuisine", "Cuisine", 0, 0, kitchenW, W, true);
    const pantry = makeRoom(rid(), "stockage", "Cellier", kitchenW, 0, pantryW, W);
    plan.rooms.push(kitchen, pantry);
    // Accès depuis le reste du logement : mur sud de la cuisine.
    kitchen.doors.push({
      wall: "S",
      position: round3(Math.min(kitchenW - 1.1, Math.max(0.2, kitchenW * 0.5 - 0.45))),
      width: 0.9,
      // Accès existant conservé : ce n'est pas une fenêtre, la réparation ne le
      // requalifie pas et le plan garde son entrée.
      isEntry: true,
    });
  } else {
    const bath = makeRoom(rid(), "sdb", "Salle de bain", 0, 0, L, W, true);
    plan.rooms.push(bath);
    if (Math.min(L, W) >= 1.9) {
      // Porte sur le mur le plus long, dégagée des appareils sanitaires.
      const wall: WallSide = L >= W ? "S" : "E";
      const span = wall === "S" ? L : W;
      bath.doors.push({
        wall,
        position: round3(Math.min(span - 1.0, Math.max(0.2, span - 1.1))),
        width: 0.85,
        isEntry: true,
      });
    }
  }

  // Fenêtres et aérations : mêmes règles que les autres plans, mais aucune
  // porte d'entrée / de secours inventée sur la façade d'un espace rénové.
  addOpenings(plan, false, mulberry32(seed), profile);
  clampLevelGeometry(plan);
  return plan;
}

// ── Piscine : bassin, plages et local technique ────────────────────────────
//
// Le plan d'une piscine n'est pas un plan de maison : il représente le bassin
// (surface demandée), les plages de circulation autour, les accès et le local
// technique. Aucun mur de bâtiment, aucune pièce habitable.
function buildPoolPlan(params: {
  levelIdx: number;
  basinLength: number;
  basinWidth: number;
  profile: StyleProfile;
}): FloorPlan {
  const { levelIdx, basinLength: BL, basinWidth: BW } = params;
  const deck = 1.5;
  const techW = 2.5;
  // Plage ouest + bassin + bande technique à l'est ; plages nord et sud en
  // profondeur. La somme des pièces couvre exactement l'emprise du plan.
  const L = round3(deck + BL + techW);
  const W = round3(BW + 2 * deck);
  const plan: FloorPlan = { level: levelIdx, length: L, width: W, rooms: [], area: L * W };
  let i = 0;
  const rid = () => `L${levelIdx}-R${i++}`;

  plan.rooms.push(makeRoom(rid(), "bassin", "Bassin", deck, deck, BL, BW));
  // Plages de circulation : espace extérieur praticable, jamais une pièce.
  plan.rooms.push(makeRoom(rid(), "terrasse", "Plage nord", deck, 0, BL, deck, false, true));
  plan.rooms.push(
    makeRoom(rid(), "terrasse", "Plage sud", deck, round3(deck + BW), BL, deck, false, true),
  );
  plan.rooms.push(makeRoom(rid(), "terrasse", "Plage ouest", 0, 0, deck, W, false, true));
  const techH = round3(Math.min(2.4, Math.max(2.0, W * 0.32)));
  const eastX = round3(deck + BL);
  plan.rooms.push(
    makeRoom(rid(), "local_technique", "Local technique", eastX, 0, techW, techH, false, true),
  );
  if (W - techH > 0.8) {
    plan.rooms.push(
      makeRoom(
        rid(),
        "terrasse",
        "Plage est",
        eastX,
        techH,
        techW,
        round3(W - techH),
        false,
        true,
      ),
    );
  }
  return plan;
}

/** Ramène toutes les pièces dans l'emprise et recalcule les surfaces. */
function clampLevelGeometry(plan: FloorPlan): void {
  for (const r of plan.rooms) {
    r.x = round3(Math.max(0, r.x));
    r.y = round3(Math.max(0, r.y));
    if (r.x + r.w > plan.length) r.w = round3(plan.length - r.x);
    if (r.y + r.h > plan.width) r.h = round3(plan.width - r.y);
    r.area = round3(r.w * r.h);
  }
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

  // 1. Dimensions : la surface BÂTIE (hors patio extérieur) de chaque niveau
  //    doit correspondre à SA surface couverte réelle. Aucune moyenne ni
  //    division par le nombre de niveaux : le RDC et les étages peuvent avoir
  //    des superficies différentes.
  const levels = variant.floors.length;
  const levelTargets = normalizeLevelSurfaces(input.surface, levels, input.levelSurfaces);
  let dimensionsOk = true;
  variant.floors.forEach((fp, idx) => {
    const target = levelTargets[idx] ?? levelTargets[0] ?? input.surface;
    const covered = fp.rooms
      .filter((r) => !r.exterior)
      .reduce((s, r) => s + r.area, 0);
    if (target <= 0) return;
    const dimsErr = Math.abs(covered - target) / target;
    // 10 % de tolérance : un patio non couvert retiré de la surface bâtie peut
    // représenter jusqu'à ~9 % sur une maison de plain-pied.
    if (dimsErr > 0.1) {
      dimensionsOk = false;
      issues.push(
        `Surface couverte du niveau ${fp.level + 1} écartée de ${(dimsErr * 100).toFixed(1)} % de sa cible (${target.toFixed(1)} m²)`,
      );
    }
  });

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
  const NO_DOOR_KINDS = new Set<RoomKind>(["couloir", "escalier", "patio", "bassin"]);
  // Une rénovation de cuisine / salle de bain réutilise l'accès existant et une
  // piscine n'a pas de porte d'entrée : l'exigence de porte principale ne
  // s'applique qu'aux bâtiments.
  const planKind = planKindForCategory(input.category);
  const entranceRequired = planKind !== "pool" && planKind !== "kitchen" && planKind !== "bathroom";
  let circulationOk = true;
  for (const fp of variant.floors) {
    for (const r of fp.rooms) {
      if (r.exterior || NO_DOOR_KINDS.has(r.kind)) continue;
      if (r.doors.length === 0) {
        circulationOk = false;
        issues.push(`Pièce sans accès : ${r.label} (niveau ${fp.level + 1})`);
      }
    }
    if (
      entranceRequired &&
      fp.level === 0 &&
      !fp.rooms.some((r) => r.doors.some((d) => d.isEntry))
    ) {
      circulationOk = false;
      issues.push("Porte d'entrée manquante au rez-de-chaussée");
    }
  }
  if (!circulationOk) score -= 12;

  // 5. Structure : chaque niveau porte sa propre emprise (un étage peut être
  //    plus petit que celui du dessous) mais jamais plus grand — aucun
  //    porte-à-faux — et la gaine d'escalier dessert tous les niveaux.
  let structureOk = true;
  if (levels > 1) {
    for (let i = 1; i < variant.floors.length; i++) {
      const fp = variant.floors[i];
      const below = variant.floors[i - 1];
      if (fp.length > below.length + EPS || fp.width > below.width + EPS) {
        structureOk = false;
        issues.push(
          `Emprise du niveau ${fp.level + 1} plus grande que celle du niveau inférieur`,
        );
      }
      if (!fp.rooms.some((r) => r.kind === "escalier")) {
        structureOk = false;
        issues.push(`Gaine d'escalier absente au niveau ${fp.level + 1}`);
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
    "vente",
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

  // 9. RÈGLES PROPRES AU CAFÉ (aucune autre typologie n'est concernée)
  //    · salle café entre 70 % et 80 % de la surface couverte ;
  //    · comptoir entièrement dans la salle, jamais une pièce ;
  //    · comptoir jamais compté deux fois (aucune surface ajoutée au total) ;
  //    · salle, préparation, réserve et sanitaires accessibles, comptoir hors
  //      du débattement des portes.
  let cafe: CafeValidation | undefined;
  if (isCafeCategory(input.category)) {
    const fp = variant.floors[0];
    const rooms = fp.rooms.filter((r) => !r.exterior);
    const covered = rooms.reduce((a, r) => a + r.area, 0);
    const salles = rooms.filter((r) => r.kind === "salle_cafe");
    const salle = salles[0] ?? null;
    const salleShare = salle && covered > 0 ? salle.area / covered : 0;
    const salleShareOk =
      !!salle &&
      salles.length === 1 &&
      salleShare >= CAFE_SALLE_SHARE_MIN - 0.005 &&
      salleShare <= CAFE_SALLE_SHARE_MAX + 0.005;

    const placement = salle ? cafeCounterPlacement(salle, rooms, fp) : null;
    const counterInsideSalle =
      !!salle &&
      !!placement &&
      placement.counter.x >= salle.x - G &&
      placement.counter.y >= salle.y - G &&
      placement.counter.x + placement.counter.w <= salle.x + salle.w + G &&
      placement.counter.y + placement.counter.h <= salle.y + salle.h + G;

    const surfacesExactes =
      fp.area > 0 && Math.abs(covered - fp.area) / fp.area <= 0.02;
    const counterCountedOnce =
      !!salle &&
      !!placement &&
      !rooms.some((r) => r.kind === "comptoir") &&
      placement.counterArea <= salle.area + G &&
      surfacesExactes;

    const accessKinds = new Set<RoomKind>([
      "salle_cafe",
      "cuisine_pro",
      "stockage",
      "sanitaire",
      "wc",
      "plonge",
    ]);
    const accessibleRooms = rooms.filter((r) => accessKinds.has(r.kind));
    const accessOk =
      !!salle &&
      salle.doors.some((d) => d.isEntry) &&
      accessibleRooms.length >= 4 &&
      accessibleRooms.every((r) => r.doors.length > 0) &&
      !!placement &&
      cafeDoorClearances(salle).every(
        (clearance) => !cafeRectsOverlap(clearance, placement.counter),
      );

    if (!salleShareOk) {
      score -= 20;
      issues.push(
        `Salle café : ${Math.round(salleShare * 100)} % de la surface couverte (70–80 % requis)`,
      );
    }
    if (!counterInsideSalle) {
      score -= 15;
      issues.push("Comptoir hors de la salle café");
    }
    if (!counterCountedOnce) {
      score -= 15;
      issues.push("Comptoir compté deux fois ou surface de la salle incohérente");
    }
    if (!accessOk) {
      score -= 10;
      issues.push("Accès insuffisant : salle, préparation, réserve ou sanitaires");
    }

    // WC et sanitaires : accès client depuis la salle café, jamais depuis la
    // préparation ; le WC accessible est signalé lorsqu'il est réalisable.
    const sanitary = sanitaryAccessReport(salle, rooms);
    if (!sanitary.ok) {
      score -= 10;
      issues.push(...sanitary.issues);
    }

    // Sortie de secours : desservie par la circulation technique, hors salle
    // et comptoir, cheminement continu et dégagements adaptés à l'effectif.
    const evacuation = salle ? foodServiceEvacuation(salle, rooms, fp) : null;
    if (evacuation && !evacuation.ok) {
      score -= 15;
      issues.push(...evacuation.issues);
    }

    cafe = {
      salleShare: Math.round(salleShare * 1000) / 1000,
      salleShareOk,
      counterInsideSalle,
      counterCountedOnce,
      accessOk,
      sanitaryAccessOk: sanitary.ok,
      pmrOk: sanitary.pmrOk,
      ...(evacuation ? { evacuation } : {}),
      ok:
        salleShareOk &&
        counterInsideSalle &&
        counterCountedOnce &&
        accessOk &&
        sanitary.ok &&
        !!evacuation?.ok,
    };
  }

  // 10. RÈGLES PROPRES AU RESTAURANT (aucune autre typologie n'est concernée)
  //     · salle de restauration à 60 % de la surface couverte (55–65 admis) ;
  //     · bar entièrement dans la salle, jamais une pièce ni une surface en plus ;
  //     · cuisine professionnelle mitoyenne du bar, à moins de 2 m, avec porte
  //       de service directe et passe-plat ;
  //     · salle, cuisine, plonge, réserve et sanitaires accessibles, bar hors
  //       du débattement des portes.
  let restaurant: RestaurantValidation | undefined;
  if (isRestaurantCategory(input.category)) {
    const fp = variant.floors[0];
    const rooms = fp.rooms.filter((r) => !r.exterior);
    const covered = rooms.reduce((a, r) => a + r.area, 0);
    const salles = rooms.filter((r) => r.kind === "salle_client");
    const salle = salles[0] ?? null;
    const salleShare = salle && covered > 0 ? salle.area / covered : 0;
    const salleShareOk =
      !!salle &&
      salles.length === 1 &&
      salleShare >= RESTAURANT_SALLE_SHARE_MIN - 0.005 &&
      salleShare <= RESTAURANT_SALLE_SHARE_MAX + 0.005;

    const kitchen = salle ? restaurantKitchenNeighbour(salle, rooms) : null;
    const placement = salle ? restaurantCounterPlacement(salle, rooms, fp) : null;
    const counterInsideSalle =
      !!salle &&
      !!placement &&
      placement.counter.x >= salle.x - G &&
      placement.counter.y >= salle.y - G &&
      placement.counter.x + placement.counter.w <= salle.x + salle.w + G &&
      placement.counter.y + placement.counter.h <= salle.y + salle.h + G;

    const surfacesExactes =
      fp.area > 0 && Math.abs(covered - fp.area) / fp.area <= 0.02;
    const counterCountedOnce =
      !!salle &&
      !!placement &&
      !rooms.some((r) => r.kind === "comptoir") &&
      placement.counterArea <= salle.area + G &&
      surfacesExactes;

    const distance = placement ? restaurantCounterToKitchen(placement) : null;
    const kitchenNearCounter =
      !!kitchen &&
      !!placement &&
      placement.kitchen === kitchen &&
      distance !== null &&
      distance <= 2;

    // Porte de service : la salle ET la cuisine partagent une ouverture sur
    // leur mur mitoyen (même position, donnée unique).
    const link = salle && kitchen ? sharedBoundary(salle, kitchen) : null;
    const opensOn = (room: PlanRoom, wall: WallSide, from: number, to: number) =>
      room.doors.some(
        (d) =>
          d.wall === wall &&
          d.position < to + 0.05 &&
          d.position + d.width > from - 0.05,
      );
    const serviceLinkOk =
      !!placement?.passePlat ||
      (!!link &&
        !!salle &&
        !!kitchen &&
        opensOn(salle, link.wallA, link.startA, link.startA + link.len) &&
        opensOn(kitchen, link.wallB, link.startB, link.startB + link.len));

    // Passe-plat : présent, large d'au moins 1 m et entièrement contenu dans
    // le linéaire du bar (le transfert des plats tombe sur le plan de travail).
    let passePlatOk = false;
    if (salle && placement?.passePlat) {
      const horizontal = placement.wall === "N" || placement.wall === "S";
      const runStart = horizontal
        ? placement.counter.x - salle.x
        : placement.counter.y - salle.y;
      const runLen = horizontal ? placement.counter.w : placement.counter.h;
      const p = placement.passePlat;
      passePlatOk =
        !!placement.kitchen &&
        p.width >= 0.9 &&
        p.position >= runStart - G &&
        p.position + p.width <= runStart + runLen + G;
    }

    const accessKinds = new Set<RoomKind>([
      "salle_client",
      "cuisine_pro",
      "plonge",
      "stockage",
      "chambre_froide",
      "sanitaire",
      "wc",
    ]);
    const accessibleRooms = rooms.filter((r) => accessKinds.has(r.kind));
    const accessOk =
      !!salle &&
      salle.doors.some((d) => d.isEntry) &&
      accessibleRooms.length >= 5 &&
      accessibleRooms.every((r) => r.doors.length > 0) &&
      !!placement &&
      restaurantDoorClearances(salle).every(
        (clearance) => !restaurantRectsOverlap(clearance, placement.counter),
      );

    if (!salleShareOk) {
      score -= 20;
      issues.push(
        `Salle de restauration : ${Math.round(salleShare * 100)} % de la surface couverte (60 % requis, 55–65 % admis)`,
      );
    }
    if (!counterInsideSalle) {
      score -= 15;
      issues.push("Bar hors de la salle de restauration");
    }
    if (!counterCountedOnce) {
      score -= 15;
      issues.push("Bar compté deux fois ou surface de la salle incohérente");
    }
    if (!kitchenNearCounter) {
      score -= 10;
      issues.push("Cuisine professionnelle trop éloignée du bar (accès de service)");
    }
    if (!serviceLinkOk) {
      score -= 10;
      issues.push("Aucune liaison de service directe salle ↔ cuisine");
    }
    if (!passePlatOk) {
      score -= 5;
      issues.push("Passe-plat absent du mur de cuisine");
    }
    if (!accessOk) {
      score -= 10;
      issues.push("Accès insuffisant : salle, cuisine, plonge, réserve ou sanitaires");
    }

    // WC et sanitaires : accès client depuis la salle de restauration, jamais
    // par la cuisine professionnelle ; le WC accessible est signalé lorsqu'il
    // est réalisable dans la surface disponible.
    const sanitary = sanitaryAccessReport(salle, rooms);
    if (!sanitary.ok) {
      score -= 10;
      issues.push(...sanitary.issues);
    }

    // Flux de service : le personnel, les livraisons et les déchets ne doivent
    // jamais traverser la salle de restauration. Le parcours est recalculé
    // sans la salle, depuis les portes qui donnent sur l'extérieur.
    const flows = restaurantServiceFlows(salle, rooms, fp);
    if (!flows.ok) {
      score -= 10;
      issues.push(...flows.issues);
    }

    // Sortie de secours : desservie par la circulation technique, hors salle,
    // bar, cuisine et plonge, dimensionnée pour l'effectif.
    const evacuation = salle ? foodServiceEvacuation(salle, rooms, fp) : null;
    if (evacuation && !evacuation.ok) {
      score -= 15;
      issues.push(...evacuation.issues);
    }

    restaurant = {
      salleShare: Math.round(salleShare * 1000) / 1000,
      salleShareOk,
      counterInsideSalle,
      counterCountedOnce,
      kitchenNearCounter,
      serviceLinkOk,
      passePlatOk,
      accessOk,
      sanitaryAccessOk: sanitary.ok,
      pmrOk: sanitary.pmrOk,
      serviceAccessOk: !!flows.serviceEntry,
      deliveryOk: flows.deliveryOk,
      wasteOk: flows.wasteOk,
      staffOk: flows.staffOk,
      ...(evacuation ? { evacuation } : {}),
      ok:
        salleShareOk &&
        counterInsideSalle &&
        counterCountedOnce &&
        kitchenNearCounter &&
        serviceLinkOk &&
        passePlatOk &&
        accessOk &&
        sanitary.ok &&
        flows.ok &&
        !!evacuation?.ok,
    };
  }

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
    ...(cafe ? { cafe } : {}),
    ...(restaurant ? { restaurant } : {}),
  };
}

// ── Note conceptuelle générée ───────────────────────────────────────────────

function conceptNote(
  profile: StyleProfile,
  input: FloorPlanInput,
  variant: FloorPlanVariant,
  rng: () => number,
  kind: PlanKind = planKindForCategory(input.category),
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
    kind === "pool"
      ? "Le bassin occupe le centre de la composition, entouré de plages de circulation continues et d'un local technique regroupant filtration et traitement. Les accès restent dégagés sur tout le pourtour du bassin."
      : kind === "kitchen"
        ? "Le plan représente l'espace rénové à sa surface réelle : plan de travail en L, évier sous la fenêtre, appareils électroménagers alignés et cellier de rangement en fond de pièce. Les portes et fenêtres existantes sont conservées."
        : kind === "bathroom"
          ? "Le plan détaille l'espace sanitaire réel : douche ou baignoire, lavabo et WC positionnés selon les arrivées d'eau, avec des dégagements praticables devant chaque appareil et la porte existante conservée."
          : kind === "studio"
            ? "Un espace compact et fonctionnel : la pièce de vie domine, le coin nuit reste séparé sans cloison lourde, la kitchenette s'aligne sur une paroi et la salle d'eau est regroupée près de l'entrée."
            : kind === "apartment"
              ? "Un logement de collectif distribué depuis un hall d'entrée : séjour et cuisine en façade, chambres en zone nuit, sanitaires regroupés pour limiter les circulations perdues."
              : kind === "building"
                ? "Chaque niveau s'organise autour de la cage d'escalier et d'un palier qui dessert des appartements autonomes, chacun avec son séjour, sa cuisine, ses chambres et ses sanitaires. Aucun logement n'est traversé pour en desservir un autre."
                : kind === "hotel"
                  ? "Le rez-de-chaussée porte la réception et les espaces communs, les niveaux supérieurs accueillent des chambres autonomes avec leur salle d'eau, toutes desservies par le palier de la cage d'escalier."
                  : kind === "shop"
                    ? "L'espace de vente occupe la façade et le cœur du local, l'accueil-caisse filtre l'entrée, la réserve et les sanitaires sont regroupés à l'arrière pour ne pas encombrer la surface commerciale."
                    : kind === "duplex"
                      ? "Le rez-de-chaussée regroupe les espaces de vie, la cuisine et les sanitaires de jour ; l'étage, relié par un escalier à gaine alignée, porte les chambres et leurs salles d'eau. La distribution est strictement jour/nuit."
                      : fam === "residential"
                        ? "Le rez-de-chaussée regroupe les espaces de vie, la cuisine et un hall qui filtre l'entrée ; les chambres sont regroupées à l'étage ou dans une zone nuit clairement séparée. Les circulations desservent chaque pièce sans traversée d'une chambre."
                        : fam === "commercial"
                          ? "L'accueil filtre naturellement les flux vers l'espace de travail ouvert et les bureaux fermés, avec les salles de réunion en profondeur."
                          : isResto
                            ? input.category === "cafe"
                              ? "La zone client salle café + comptoir occupe la façade principale, séparée de l'espace de préparation par un couloir de service respectant la marche en avant. Les sanitaires H/F/PMR sont accessibles depuis la salle sans croiser la zone de production."
                              : "La salle de restauration occupe 60 % de la surface couverte et la façade principale ; le bar, adossé à la cuisine professionnelle, est inclus dans cette surface. Le passe-plat et la porte de service relient directement la production au bar, sans traversée de la salle, et les sanitaires H/F/PMR restent accessibles sans croiser la zone de production."
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
  // Surfaces couvertes réelles par niveau (jamais une moyenne) : elles peuvent
  // différer d'un étage à l'autre (étage en gradin, immeuble).
  const coveredByLevel = variant.floors.map((f) =>
    f.rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0),
  );
  const coveredTxt = coveredByLevel.map((a) => `${a.toFixed(1)} m²`).join(" · ");
  const levelsTxt =
    variant.floors.length > 1
      ? new Set(coveredByLevel.map((a) => a.toFixed(1))).size === 1
        ? `${variant.floors.length} niveaux d'une emprise de ${variant.footprint.length.toFixed(1)} × ${variant.footprint.width.toFixed(1)} m (${coveredTxt} couverts par niveau)`
        : `${variant.floors.length} niveaux aux surfaces couvertes réelles (${coveredTxt})`
      : `une emprise unique de ${variant.footprint.length.toFixed(1)} × ${variant.footprint.width.toFixed(1)} m (${coveredTxt} couverts)`;

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
  const COMPLEMENTARY = new Set<RoomKind>([
    "garage",
    "stockage",
    "logistique",
    "local_technique",
  ]);
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
 * Liaison de service directe salle de restauration ↔ cuisine professionnelle.
 *
 * La marche en avant impose un accès de service court entre la production et
 * la salle. Sur un mur assez long, une porte franchie (0,90 m) est replacée en
 * bout de mur : le bar conserve le linéaire utile, dans l'axe du passe-plat.
 * Sur un mur trop court pour la porte ET le bar, le passe-plat tient lieu
 * d'ouverture de service : la porte de circulation entre les deux pièces est
 * retirée (la cuisine reste desservie par le couloir de service) et le bar
 * occupe tout le mur. Aucune surface n'est modifiée dans les deux cas.
 */
function linkRestaurantService(plan: FloorPlan): void {
  const salle = plan.rooms.find((r) => r.kind === "salle_client");
  const cuisine = plan.rooms.find((r) => r.kind === "cuisine_pro");
  if (!salle || !cuisine) return;
  const shared = sharedBoundary(salle, cuisine);
  if (!shared) return;

  const width = 0.9;
  const start = shared.startA;
  const end = shared.startA + shared.len;
  const endB = shared.startB + shared.len;
  // Le bar doit conserver au moins 2 m de linéaire à côté de la porte.
  const keepsBarRun = shared.len - width - 0.35 >= 2;

  // La porte de circulation posée entre ces deux pièces est replacée en bout
  // de mur mitoyen : au centre, elle coupait le linéaire du bar en deux.
  const clashes = (
    doors: { wall: WallSide; position: number; width: number }[],
    wall: WallSide,
    from: number,
    to: number,
  ) =>
    doors.some(
      (d) =>
        d.wall === wall && d.position < to + 0.05 && d.position + d.width > from - 0.05,
    );
  const inRange = (
    d: { position: number; width: number },
    from: number,
    to: number,
  ) => d.position < to && d.position + d.width > from;
  const otherSalle = salle.doors.filter(
    (d) => !(d.wall === shared.wallA && inRange(d, start, end)),
  );
  const otherCuisine = cuisine.doors.filter(
    (d) => !(d.wall === shared.wallB && inRange(d, shared.startB, endB)),
  );

  if (!keepsBarRun) {
    // Mur court : on libère tout le linéaire pour le bar. Le personnel conserve
    // son accès à la cuisine par une porte de service sur son plus grand mur
    // mitoyen non sanitaire (couloir, plonge, réserve…), percée si nécessaire.
    const outsideLink = () =>
      cuisine.doors.filter(
        (d) => !(d.wall === shared.wallB && inRange(d, shared.startB, endB)),
      );
    if (outsideLink().length === 0) {
      const neighbour = plan.rooms
        .filter(
          (r) =>
            r !== cuisine &&
            r !== salle &&
            !r.exterior &&
            !isSanitaryKind(r.kind) &&
            r.kind !== "comptoir",
        )
        .map((r) => ({ room: r, shared: sharedBoundary(cuisine, r) }))
        .filter((x): x is { room: PlanRoom; shared: SharedBoundary } => !!x.shared)
        .sort((a, b) => b.shared.len - a.shared.len)[0];
      if (neighbour) addPairedDoor(cuisine, neighbour.room, neighbour.shared, 0.9);
    }
    if (outsideLink().length > 0) {
      salle.doors = otherSalle;
      cuisine.doors = outsideLink();
    }
    return;
  }

  for (const offset of [0.25, shared.len - width - 0.25]) {
    if (offset < 0.08) continue;
    const a = start + offset;
    const b = shared.startB + offset;
    if (a + width > end) continue;
    if (b + width > endB) continue;
    if (clashes(otherSalle, shared.wallA, a, a + width)) continue;
    if (clashes(otherCuisine, shared.wallB, b, b + width)) continue;
    salle.doors = [...otherSalle, { wall: shared.wallA, position: round3(a), width }];
    cuisine.doors = [...otherCuisine, { wall: shared.wallB, position: round3(b), width }];
    return;
  }
  // Aucune extrémité libre : la porte existante est conservée telle quelle.
}

/**
 * Porte de service entre deux locaux mitoyens, posée dans un intervalle libre
 * du mur (jamais sur une porte existante). Les deux pièces reçoivent la même
 * ouverture : le 2D et le 3D restent cohérents.
 */
function addPairedServiceDoor(
  a: PlanRoom,
  b: PlanRoom,
  shared: SharedBoundary,
): boolean {
  const width = Math.min(RESTAURANT_SERVICE_DOOR_WIDTH, shared.len - 0.2);
  if (width < 0.7) return false;
  const clashes = (room: PlanRoom, wall: WallSide, start: number) =>
    room.doors.some(
      (d) =>
        d.wall === wall &&
        d.position < start + width + 0.15 &&
        d.position + d.width > start - 0.15,
    );
  const starts = [
    shared.len / 2 - width / 2,
    0.1,
    shared.len - width - 0.1,
    0.1 + width + 0.3,
    shared.len - width - 0.1 - width - 0.3,
  ];
  for (const raw of starts) {
    const start = Math.max(0.1, Math.min(raw, shared.len - width - 0.1));
    if (start < 0.05) continue;
    const pa = shared.startA + start;
    const pb = shared.startB + start;
    if (clashes(a, shared.wallA, pa) || clashes(b, shared.wallB, pb)) continue;
    a.doors.push({ wall: shared.wallA, position: round3(pa), width: round3(width) });
    b.doors.push({ wall: shared.wallB, position: round3(pb), width: round3(width) });
    return true;
  }
  return false;
}

/**
 * Accès de service d'un restaurant : personnel, livraisons et déchets.
 *
 * Vérifie qu'au moins une porte extérieure dessert le bloc production sans
 * traverser la salle, puis la perce si elle manque. La porte est posée sur la
 * façade d'un local de service (cuisine d'abord, puis plonge, couloir,
 * réserve), sur une façade différente de l'entrée client autant que possible,
 * et elle est marquée `isService` : le 2D et le 3D percent la même ouverture et
 * la réparation du plan ne la transforme jamais en fenêtre.
 *
 * Aucune surface n'est modifiée : seule une ouverture est ajoutée au mur.
 */
function ensureRestaurantServiceAccess(plan: FloorPlan): void {
  const salle = plan.rooms.find((r) => !r.exterior && r.kind === "salle_client");
  if (!salle) return;
  const rooms = () => plan.rooms.filter((r) => !r.exterior);
  const kitchen = rooms().find((r) => r.kind === "cuisine_pro");
  if (!kitchen) return;

  // 1. Un seul bloc service : chaque local de service (réserve, froid, plonge,
  //    vestiaires, couloir) rejoint le bloc de la cuisine par une porte de
  //    service, jamais par la salle. Une livraison entre par le service et
  //    atteint la réserve sans traverser la salle de restauration.
  const components = serviceRoomComponents(rooms());
  const main = components.find((c) => c.has(kitchen));
  if (main) {
    const pending = components.filter((c) => c !== main);
    let progress = true;
    while (progress && pending.length > 0) {
      progress = false;
      for (let i = 0; i < pending.length; i++) {
        const comp = pending[i];
        const pairs: { a: PlanRoom; b: PlanRoom; shared: SharedBoundary }[] = [];
        for (const room of comp) {
          for (const target of main) {
            const shared = sharedBoundary(room, target);
            if (shared) pairs.push({ a: room, b: target, shared });
          }
        }
        const linked = pairs
          .sort((x, y) => y.shared.len - x.shared.len)
          .some((pair) => addPairedServiceDoor(pair.a, pair.b, pair.shared));
        if (!linked) continue;
        for (const r of comp) main.add(r);
        pending.splice(i, 1);
        progress = true;
        break;
      }
    }
  }

  // 2. Un local de service n'ouvre plus sur la salle : son accès est côté
  //    service (le client n'a rien à y faire, la cuisine garde sa porte de
  //    liaison et son passe-plat).
  const overlaps = (
    d: { position: number; width: number },
    from: number,
    to: number,
  ) => d.position < to + 0.05 && d.position + d.width > from - 0.05;
  for (const room of rooms()) {
    if (room === salle || room.kind === "cuisine_pro") continue;
    if (!SERVICE_FLOW_KINDS.has(room.kind)) continue;
    const shared = sharedBoundary(room, salle);
    if (!shared) continue;
    const to = shared.startA + shared.len;
    if (!room.doors.some((d) => d.wall === shared.wallA && overlaps(d, shared.startA, to))) {
      continue;
    }
    // Un local doit conserver un accès : sa porte côté salle n'est retirée que
    // s'il est déjà desservi par le bloc service.
    const kept = room.doors.filter(
      (d) => !(d.wall === shared.wallA && overlaps(d, shared.startA, to)),
    );
    if (kept.length === 0) continue;
    room.doors = kept;
    const toB = shared.startB + shared.len;
    salle.doors = salle.doors.filter(
      (d) => !(d.wall === shared.wallB && overlaps(d, shared.startB, toB)),
    );
  }

  if (restaurantServiceFlows(salle, rooms(), plan).ok) return;

  const entrySide = salle.doors.find((d) => d.isEntry)?.wall ?? null;
  const order: RoomKind[] = [
    "cuisine_pro",
    "plonge",
    "couloir",
    "stockage",
    "chambre_froide",
    "vestiaire",
  ];
  const candidates: { room: PlanRoom; wall: WallSide; span: number }[] = [];
  for (const kind of order) {
    for (const room of plan.rooms) {
      if (room.exterior || room.kind !== kind) continue;
      for (const wall of ["N", "S", "E", "W"] as WallSide[]) {
        if (!restaurantFacadeWall(room, wall, plan)) continue;
        const span = wall === "N" || wall === "S" ? room.w : room.h;
        if (span < 1.4) continue;
        candidates.push({ room, wall, span });
      }
    }
  }
  // Façade différente de l'entrée client d'abord, puis le mur le plus large :
  // une livraison ne débouche pas devant la porte des clients si une autre
  // façade est disponible.
  candidates.sort((a, b) => {
    const sameEntrySide = (c: { wall: WallSide }) => (c.wall === entrySide ? 1 : 0);
    return (
      sameEntrySide(a) - sameEntrySide(b) ||
      serviceRoomRank(a.room.kind) - serviceRoomRank(b.room.kind) ||
      b.span - a.span
    );
  });

  for (const c of candidates) {
    const before = c.room.doors.map((d) => ({ ...d }));
    const added = addFacadeDoor(c.room, c.wall, RESTAURANT_SERVICE_DOOR_WIDTH, {
      isService: true,
    });
    if (!added) continue;
    if (restaurantServiceFlows(salle, rooms(), plan).ok) return;
    c.room.doors = before;
  }
}

/** Priorité des locaux pour percer la porte de service (petit = prioritaire). */
function serviceRoomRank(kind: RoomKind): number {
  switch (kind) {
    case "cuisine_pro":
      return 0;
    case "plonge":
      return 1;
    case "couloir":
      return 2;
    case "stockage":
      return 3;
    case "chambre_froide":
      return 4;
    default:
      return 5;
  }
}

// ── Évacuation des cafés / restaurants ──────────────────────────────────────

/** Plus grand intervalle libre d'un mur (portes et fenêtres exclues). */
function wallFreeSpan(room: PlanRoom, wall: WallSide): { start: number; len: number } {
  const span = wall === "N" || wall === "S" ? room.w : room.h;
  const blocked = [...room.doors, ...room.windows]
    .filter((o) => o.wall === wall)
    .map((o) => ({
      a: Math.max(0, o.position - 0.2),
      b: Math.min(span, o.position + o.width + 0.2),
    }))
    .sort((x, y) => x.a - y.a);
  let cursor = 0;
  let best = { start: 0, len: 0 };
  for (const b of blocked) {
    if (b.a - cursor > best.len) best = { start: cursor, len: b.a - cursor };
    cursor = Math.max(cursor, b.b);
  }
  if (span - cursor > best.len) best = { start: cursor, len: span - cursor };
  return best;
}

/** Composante d'un local, parcourue uniquement par des portes réelles. */
function doorComponent(
  start: PlanRoom,
  rooms: readonly PlanRoom[],
  blocked: (room: PlanRoom) => boolean,
): Set<PlanRoom> {
  const seen = new Set<PlanRoom>([start]);
  if (blocked(start)) return seen;
  const queue: PlanRoom[] = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const other of rooms) {
      if (seen.has(other) || other === current || blocked(other)) continue;
      if (!evacuationLinked(current, other)) continue;
      seen.add(other);
      queue.push(other);
    }
  }
  return seen;
}

/**
 * La circulation technique doit être reliée au bloc de production : une sortie
 * de secours dans un couloir isolé n'évacue personne. Une porte de service est
 * percée entre la composante du couloir et celle de la cuisine. On ne passe
 * JAMAIS par la salle : elle reste distincte de la circulation technique et
 * son linéaire de bar n'est pas amputé par une porte d'évacuation.
 */
function connectCirculationToService(plan: FloorPlan, salle: PlanRoom): void {
  const rooms = plan.rooms.filter((r) => !r.exterior);
  // Un WC n'est jamais traversé par un cheminement d'évacuation.
  const noSanitary = (r: PlanRoom) => isSanitaryKind(r.kind);
  const anchor =
    rooms.find((r) => r.kind === "cuisine_pro") ??
    rooms.find((r) => isFoodPrepKind(r.kind) || r.kind === "stockage") ??
    null;
  if (!anchor) return;
  let reached = doorComponent(anchor, rooms, noSanitary);
  const circulation = rooms.filter((r) => EVACUATION_CIRCULATION_KINDS.has(r.kind));

  for (const couloir of circulation) {
    if (reached.has(couloir)) continue;
    const comp = doorComponent(couloir, rooms, noSanitary);
    const pairs: { a: PlanRoom; b: PlanRoom; shared: SharedBoundary }[] = [];
    for (const a of comp) {
      for (const b of reached) {
        if (a === b || b === salle || isSanitaryKind(b.kind)) continue;
        const shared = sharedBoundary(a, b);
        if (shared) pairs.push({ a, b, shared });
      }
    }
    // Un local de stockage / vestiaire avant la cuisine ou la plonge :
    // le cheminement évite au maximum les zones de préparation.
    const priority = (room: PlanRoom) => (isFoodPrepKind(room.kind) ? 1 : 0);
    pairs.sort((x, y) => priority(x.b) - priority(y.b) || y.shared.len - x.shared.len);
    for (const pair of pairs) {
      if (addPairedServiceDoor(pair.a, pair.b, pair.shared)) {
        reached = doorComponent(anchor, rooms, noSanitary);
        break;
      }
    }
  }
}

/** Priorité d'un local pour porter la sortie de secours (petit = prioritaire). */
function exitSupportRank(kind: RoomKind): number {
  switch (kind) {
    case "stockage":
      return 1;
    case "vestiaire":
      return 2;
    case "chambre_froide":
      return 3;
    default:
      return 4;
  }
}

/**
 * Support de la porte de sortie de secours : le couloir de service lui-même
 * lorsqu'il touche une façade, sinon un local de service (réserve, vestiaire,
 * chambre froide) relié au couloir. Jamais la salle, le comptoir, un WC, la
 * cuisine ou la plonge : la sortie reste desservie par la circulation.
 */
function pickExitSupport(
  plan: FloorPlan,
  salle: PlanRoom,
  width: number,
  allowPrep: boolean,
): { room: PlanRoom; wall: WallSide; couloir: PlanRoom } | null {
  const entrySide = salle.doors.find((d) => d.isEntry)?.wall ?? null;
  const forbidden = (kind: RoomKind) =>
    kind === "salle_cafe" ||
    kind === "salle_client" ||
    kind === "comptoir" ||
    isSanitaryKind(kind) ||
    (!allowPrep && isFoodPrepKind(kind));
  const circulation = plan.rooms.filter(
    (r) => !r.exterior && EVACUATION_CIRCULATION_KINDS.has(r.kind),
  );
  const candidates: {
    room: PlanRoom;
    wall: WallSide;
    span: number;
    couloir: PlanRoom;
    rank: number;
  }[] = [];
  for (const couloir of circulation) {
    for (const wall of ["N", "S", "E", "W"] as WallSide[]) {
      if (!evacuationFacadeWall(couloir, wall, plan)) continue;
      const free = wallFreeSpan(couloir, wall);
      if (free.len < width + 0.4) continue;
      candidates.push({ room: couloir, wall, span: free.len, couloir, rank: 0 });
    }
    for (const room of plan.rooms) {
      if (room === couloir || room.exterior || room === salle) continue;
      if (forbidden(room.kind)) continue;
      if (!sharedBoundary(couloir, room)) continue;
      for (const wall of ["N", "S", "E", "W"] as WallSide[]) {
        if (!evacuationFacadeWall(room, wall, plan)) continue;
        const free = wallFreeSpan(room, wall);
        if (free.len < width + 0.4) continue;
        candidates.push({
          room,
          wall,
          span: free.len,
          couloir,
          rank: exitSupportRank(room.kind),
        });
      }
    }
  }
  candidates.sort(
    (a, b) =>
      (a.wall === entrySide ? 1 : 0) - (b.wall === entrySide ? 1 : 0) ||
      a.rank - b.rank ||
      b.span - a.span,
  );
  return candidates[0] ?? null;
}

/** Élargit l'entrée principale pour tenir l'effectif (dégagement le plus large). */
function widenFoodServiceEntry(plan: FloorPlan, salle: PlanRoom, target: number): void {
  const entry = salle.doors.find((d) => d.isEntry);
  if (!entry || entry.width >= target - 0.01) return;
  const wall = entry.wall;
  const preferred = entry.position - (target - entry.width) / 2;
  salle.doors = salle.doors.filter((d) => d !== entry);
  if (!addFacadeDoor(salle, wall, target, { isEntry: true }, preferred)) {
    salle.doors.push(entry);
  }
}

/**
 * Circulation d'évacuation : un couloir de moins de 0,90 m de largeur libre ne
 * peut pas servir de cheminement. Il est élargi sur son axe court en prenant
 * la profondeur à un local mitoyen qui couvre tout le côté ; les portes du mur
 * déplacé restent alignées (leur position est prise le long du mur). La surface
 * totale du niveau est conservée : c'est un transfert entre deux locaux.
 */
function growCirculation(
  rooms: readonly PlanRoom[],
  room: PlanRoom,
  axis: "h" | "w",
  need: number,
): boolean {
  const donors: { other: PlanRoom; side: WallSide; give: number }[] = [];
  for (const other of rooms) {
    if (other === room || other.exterior || other.kind === "bassin") continue;
    if (
      other.kind === "salle_cafe" ||
      other.kind === "salle_client" ||
      other.kind === "comptoir" ||
      isSanitaryKind(other.kind)
    ) {
      continue;
    }
    const full = axis === "h"
      ? Math.abs(other.x - room.x) < TOL && Math.abs(other.w - room.w) < TOL
      : Math.abs(other.y - room.y) < TOL && Math.abs(other.h - room.h) < TOL;
    if (!full) continue;
    const side: WallSide | null = axis === "h"
      ? Math.abs(other.y + other.h - room.y) < TOL
        ? "N"
        : Math.abs(other.y - (room.y + room.h)) < TOL
          ? "S"
          : null
      : Math.abs(other.x + other.w - room.x) < TOL
        ? "W"
        : Math.abs(other.x - (room.x + room.w)) < TOL
          ? "E"
          : null;
    if (!side) continue;
    const depth = axis === "h" ? other.h : other.w;
    const len = axis === "h" ? other.w : other.h;
    const give = Math.min(need, depth - 0.8, (other.area - 1.2) / Math.max(0.01, len));
    if (give < need * 0.5) continue;
    donors.push({ other, side, give });
  }
  // Un local de stockage / vestiaire avant la cuisine ou la plonge.
  donors.sort(
    (a, b) =>
      Number(isFoodPrepKind(a.other.kind)) - Number(isFoodPrepKind(b.other.kind)) ||
      b.give - a.give,
  );
  const pick = donors[0];
  if (!pick) return false;
  const { other, side, give } = pick;
  if (side === "N") {
    room.y = round3(room.y - give);
    room.h = round3(room.h + give);
    other.h = round3(other.h - give);
  } else if (side === "S") {
    room.h = round3(room.h + give);
    other.y = round3(other.y + give);
    other.h = round3(other.h - give);
  } else if (side === "W") {
    room.x = round3(room.x - give);
    room.w = round3(room.w + give);
    other.w = round3(other.w - give);
  } else {
    room.w = round3(room.w + give);
    other.x = round3(other.x + give);
    other.w = round3(other.w - give);
  }
  room.area = round3(room.w * room.h);
  other.area = round3(other.w * other.h);
  for (const d of other.doors) clampOpening(d, other);
  for (const w of other.windows) clampOpening(w, other);
  return true;
}

/** Rend chaque circulation d'évacuation assez large pour le cheminement. */
function widenEvacuationCirculation(plan: FloorPlan): void {
  for (const room of plan.rooms) {
    if (room.exterior || !EVACUATION_CIRCULATION_KINDS.has(room.kind)) continue;
    // Marge de 5 mm : les cotes sont arrondies au millimètre et le contrôle
    // d'évacuation travaille à ±2 mm.
    const target = EVACUATION_MIN_CORRIDOR_WIDTH + 0.005;
    for (let guard = 0; guard < 4; guard++) {
      const axis: "h" | "w" | null =
        room.h < target - 0.001 ? "h" : room.w < target - 0.001 ? "w" : null;
      if (!axis) break;
      const need = target - (axis === "h" ? room.h : room.w);
      if (!growCirculation(plan.rooms, room, axis, need)) break;
    }
  }
}

/**
 * Sortie de secours d'un café / restaurant : desservie par la circulation
 * technique, dimensionnée pour l'effectif, jamais directement dans la salle,
 * le comptoir, la cuisine ou la plonge. Aucune surface n'est modifiée.
 */
function ensureFoodServiceEvacuation(plan: FloorPlan): void {
  const salle = plan.rooms.find((r) => !r.exterior && isSalleKind(r.kind));
  if (!salle) return;
  const headcount = foodServiceHeadcount(salle, plan.rooms.filter((r) => !r.exterior));
  const requirement = requiredEgress(headcount.people);
  const exitWidth = Math.max(0.9, requirement.widths[requirement.widths.length - 1] ?? 0.9);
  const entryWidth = Math.max(1.1, requirement.widths[0] ?? 0.9);

  // 0. Cheminement dégagé : le couloir d'évacuation fait au moins 0,90 m.
  widenEvacuationCirculation(plan);

  // 1. Le couloir de service doit être relié au bloc de production.
  connectCirculationToService(plan, salle);

  // 2. Support de la sortie : couloir, puis local de service relié au couloir.
  const support =
    pickExitSupport(plan, salle, exitWidth, false) ??
    pickExitSupport(plan, salle, exitWidth, true);
  if (support) {
    // Toute ancienne sortie de secours (salle, cuisine, sanitaire…) est retirée :
    // une seule issue de secours, celle de la circulation. Un local dont c'était
    // l'unique accès reçoit d'abord une porte sur son plus grand mur mitoyen :
    // retirer la sortie ne doit jamais encloisonner une pièce.
    for (const room of plan.rooms) {
      const emergency = room.doors.filter((d) => d.isEmergency);
      if (emergency.length === 0) continue;
      if (room.doors.length === emergency.length) {
        const neighbour = plan.rooms
          .filter(
            (r) =>
              r !== room &&
              !r.exterior &&
              !isSanitaryKind(r.kind) &&
              r.kind !== "bassin",
          )
          .map((r) => ({ room: r, shared: sharedBoundary(room, r) }))
          .filter((x): x is { room: PlanRoom; shared: SharedBoundary } => !!x.shared)
          .sort((a, b) => b.shared.len - a.shared.len)[0];
        if (!neighbour || !addPairedServiceDoor(room, neighbour.room, neighbour.shared)) {
          continue; // dernier accès : la porte reste (le contrôle le signalera)
        }
      }
      room.doors = room.doors.filter((d) => !d.isEmergency);
    }
    if (support.room !== support.couloir && !evacuationLinked(support.room, support.couloir)) {
      const shared = sharedBoundary(support.room, support.couloir);
      if (shared) addPairedServiceDoor(support.room, support.couloir, shared);
    }
    addFacadeDoor(support.room, support.wall, exitWidth, { isEmergency: true });
  }

  // 3. Nombre et largeur des dégagements adaptés à l'effectif.
  widenFoodServiceEntry(plan, salle, entryWidth);
}

/**
 * Génère les 10 variantes de plans d'architecte pour un projet.
 * Déterministe : le même projet produit toujours les mêmes plans.
 */
export function generateFloorPlans(input: FloorPlanInput): FloorPlanVariant[] {
  // Typologie réelle du projet : elle pilote le programme, les niveaux, la
  // distribution et les éléments extérieurs. Aucun type ne réutilise le plan
  // d'un autre type par défaut.
  const kind = planKindForCategory(input.category);
  const isPool = kind === "pool";
  const isRenovationSpace = kind === "kitchen" || kind === "bathroom";
  const surface = Math.max(
    isPool ? 12 : isRenovationSpace ? 4 : 18,
    input.surface || (isPool ? 32 : isRenovationSpace ? 10 : 90),
  );
  // Un café et un restaurant sont des locaux de plain-pied (le formulaire ne
  // propose d'ailleurs aucun étage pour ces types) : la règle de part de salle
  // porte sur la seule surface réellement couverte.
  const cafe = isCafeCategory(input.category);
  const restaurant = isRestaurantCategory(input.category);
  const levels = cafe || restaurant ? 1 : structuralLevels(kind, input.floors ?? 1);
  const family = familyForCategory(input.category);
  // Surface couverte RÉELLE de chaque niveau : `surface` est la surface du
  // rez-de-chaussée, `input.levelSurfaces` porte celle des étages. Elle n'est
  // jamais divisée par le nombre de niveaux (100 m² au RDC + 80 m² à l'étage
  // = 180 m² couverts, et non 50 m² par niveau).
  const levelAreas = normalizeLevelSurfaces(surface, levels, input.levelSurfaces);
  const totalSurface = round3(levelAreas.reduce((s, a) => s + a, 0));
  const baseSeed = 1337 +
    input.category.length * 31 +
    Math.round(totalSurface) * 17 +
    levels * 101;

  const variants: FloorPlanVariant[] = [];
  for (let v = 0; v < STYLE_PROFILES.length; v++) {
    const profile = STYLE_PROFILES[v];
    const rng = mulberry32(baseSeed + v * 977);
    const seed = baseSeed + v * 977;
    const floors: FloorPlan[] = [];
    let L: number;
    let W: number;

    // Emprise d'un niveau : calculée depuis SA propre surface couverte et le
    // ratio du parti architectural, jamais recopiée d'un autre niveau.
    const footprintFor = (area: number) => {
      const length = Math.min(Math.max(Math.sqrt(area * profile.ratio), 5), 60);
      const width = Math.min(Math.max(Math.sqrt(area / profile.ratio), 4), 40);
      return { length: round3(length), width: round3(width) };
    };
    const groundFootprint = footprintFor(levelAreas[0]);
    // Gaine d'escalier du niveau de référence : mêmes dimensions sur tous les
    // étages, pour que la liaison verticale reste réelle même lorsque les
    // surfaces couvertes diffèrent (étage en gradin).
    const sharedShaft = {
      w: round3(Math.min(2.5, groundFootprint.length * 0.32)),
      h: round3(Math.min(4.2, groundFootprint.width * 0.38)),
    };
    L = groundFootprint.length;
    W = groundFootprint.width;

    if (isPool) {
      // Le bassin impose ses dimensions : le ratio du parti architectural fait
      // varier sa proportion, jamais sa surface.
      const ratio = Math.min(2.4, Math.max(1.6, profile.ratio + 0.35));
      const basinLength = round3(Math.sqrt(surface * ratio));
      const basinWidth = round3(surface / basinLength);
      const pool = buildPoolPlan({ levelIdx: 0, basinLength, basinWidth, profile });
      L = pool.length;
      W = pool.width;
      floors.push(pool);
    } else if (isRenovationSpace) {
      // Rénovation cuisine / salle de bain : un espace unique aux dimensions
      // réelles du projet, jamais une maison de 100 m² déguisée.
      const ratio = Math.min(2.0, Math.max(1.25, profile.ratio));
      L = round3(Math.sqrt(surface * ratio));
      W = round3(surface / L);
      floors.push(
        buildRenovationSpacePlan({
          levelIdx: 0,
          length: L,
          width: W,
          kind: kind === "kitchen" ? "kitchen" : "bathroom",
          seed,
          profile,
        }),
      );
    } else {
      // Emprise du rez-de-chaussée : L × W déjà dérivés de la surface réelle
      // du RDC, selon le ratio du parti architectural.

      if (kind === "building" || kind === "hotel") {
        // Collectif : palier + unités autonomes (appartements ou chambres).
        for (let lvl = 0; lvl < levels; lvl++) {
          // Chaque étage est composé sur SA surface couverte : aucun étage ne
          // recopie la surface d'un autre (immeuble à niveaux différents).
          const levelFootprint = footprintFor(levelAreas[lvl]);
          const levelArea = round3(levelFootprint.length * levelFootprint.width);
          const perLevel =
            kind === "building"
              ? Math.max(1, Math.min(3, Math.floor(levelArea / 45)))
              : Math.max(2, Math.min(6, Math.floor(levelArea / 26)));
          // Un immeuble n'a pas besoin d'un salon commun : le palier du
          // rez-de-chaussée EST le hall d'entrée. Une résidence touristique,
          // elle, porte sa réception au rez-de-chaussée.
          const hasCommon = lvl === 0 && kind === "hotel";
          const slots = perLevel + (hasCommon ? 1 : 0);
          const sliceArea = levelArea / slots;
          const units: { label: string; items: ProgramItem[] }[] = [];
          if (hasCommon) {
            units.push({ label: "Communs", items: commonAreaProgram("hotel") });
          }
          for (let u = 0; u < perLevel; u++) {
            const code = `${lvl + 1}${String.fromCharCode(65 + u)}`;
            units.push({
              label: kind === "building" ? `Appt ${code}` : `Chambre ${code}`,
              items: dwellingUnitProgram(
                sliceArea,
                code,
                kind === "building" ? "apartment" : "hotel",
              ),
            });
          }
          floors.push(
            buildMultiDwellingLevel({
              levelIdx: lvl,
              length: levelFootprint.length,
              width: levelFootprint.width,
              units,
              seed,
              profile,
              withStair: levels > 1,
            }),
          );
        }
      } else if (kind === "apartment" || kind === "studio") {
        const items =
          kind === "studio"
            ? studioProgram(levelAreas[0])
            : apartmentProgram(input, levelAreas[0]);
        floors.push(buildLevel(0, 1, L, W, items, seed, profile, true));
      } else if (kind === "shop") {
        // Local commercial : un programme de vente par niveau. Un local sur
        // plusieurs étages (RDC + réserve/mezzanine à l'étage) conserve SA
        // surface réelle par niveau et la même gaine d'escalier.
        for (let lvl = 0; lvl < levels; lvl++) {
          const levelFootprint = footprintFor(levelAreas[lvl]);
          const levelArea = round3(levelFootprint.length * levelFootprint.width);
          floors.push(
            buildLevel(
              lvl,
              levels,
              levelFootprint.length,
              levelFootprint.width,
              shopProgram(levelArea),
              seed,
              profile,
              false,
              sharedShaft,
            ),
          );
        }
      } else if (cafe) {
        // Café : salle unique des clients (comptoir inclus) + locaux de
        // service, sur la totalité de l'emprise réelle du niveau.
        const levelFootprint = footprintFor(levelAreas[0]);
        const levelArea = round3(levelFootprint.length * levelFootprint.width);
        const plan = buildLevel(
          0,
          1,
          levelFootprint.length,
          levelFootprint.width,
          cafeProgram(levelArea),
          seed,
          profile,
          false,
          undefined,
          true,
        );
        // Sortie de secours : desservie par la circulation technique, hors
        // salle et comptoir, dimensionnée pour l'effectif.
        ensureFoodServiceEvacuation(plan);
        floors.push(plan);
      } else if (kind === "restaurant") {
        // Restaurant : salle de restauration à 60 % de la surface couverte,
        // bar intégré à la salle et cuisine professionnelle mitoyenne (une
        // seule géométrie, consommée par le plan 2D, le mobilier et les
        // surfaces). Le plan est de plain-pied, comme le prévoit le formulaire.
        const levelFootprint = footprintFor(levelAreas[0]);
        const levelArea = round3(levelFootprint.length * levelFootprint.width);
        const plan = buildLevel(
          0,
          1,
          levelFootprint.length,
          levelFootprint.width,
          restaurantProgram(levelArea),
          seed,
          profile,
          false,
          undefined,
          true,
        );
        linkRestaurantService(plan);
        // Personnel, livraisons et déchets : une issue extérieure propre au
        // bloc service, sans jamais traverser la salle de restauration.
        ensureRestaurantServiceAccess(plan);
        // Sortie de secours : desservie par la circulation technique, hors
        // salle, bar, cuisine et plonge, dimensionnée pour l'effectif.
        ensureFoodServiceEvacuation(plan);
        floors.push(plan);
      } else if (kind === "office" || kind === "warehouse") {
        for (let lvl = 0; lvl < levels; lvl++) {
          const levelFootprint = footprintFor(levelAreas[lvl]);
          const levelArea = round3(levelFootprint.length * levelFootprint.width);
          const items =
            kind === "office"
              ? commercialProgram(levelArea)
              : logisticsProgram(levelArea);
          floors.push(
            buildLevel(
              lvl,
              levels,
              levelFootprint.length,
              levelFootprint.width,
              items.map((i) => ({ ...i })),
              seed,
              profile,
              false,
              sharedShaft,
            ),
          );
        }
      } else {
        // Maison, villa, duplex, projet neuf, rénovation complète.
        const programs = residentialProgram(input, levelAreas, levels, profile);
        for (const prog of programs) {
          const levelFootprint = footprintFor(levelAreas[prog.level] ?? levelAreas[0]);
          floors.push(
            buildLevel(
              prog.level,
              levels,
              levelFootprint.length,
              levelFootprint.width,
              prog.items,
              seed,
              profile,
              false,
              sharedShaft,
            ),
          );
        }
      }
    }

    // Cohérence inter-niveaux : la chambre principale est la plus grande
    // chambre de TOUT le logement, pas seulement du niveau où elle est née.
    if (kind === "house" || kind === "duplex" || kind === "renovation" || kind === "apartment") {
      const chambres = floors.flatMap((f) => f.rooms.filter((r) => r.kind === "chambre"));
      const master = chambres.find((r) => r.label === "Chambre principale");
      const biggest = chambres.reduce<PlanRoom | null>(
        (best, r) => (!best || r.area > best.area ? r : best),
        null,
      );
      if (master && biggest && biggest !== master && biggest.area > master.area + 0.01) {
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
    variant.conceptNote = conceptNote(profile, input, variant, rng, kind);
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
 *     (l'entrée principale et la sortie de secours restent des portes) ;
 *  6. toute pièce sans accès reçoit une porte sur son mur le plus grand.
 */
export function repairFloorPlan(plan: FloorPlan): FloorPlan {
  const { rooms } = plan;

  // 1) Bornes de l'emprise + surface minimale.
  //    Le plancher de 0,80 m n'est appliqué que si la pièce ne déborde pas sur
  //    une voisine : élargir une cabine de 0,68 m collée à un local adjacent
  //    changerait les surfaces du tableau (2D, 3D et quantitatif divergents).
  const overlapsOther = (cand: { x: number; y: number; w: number; h: number }, self: PlanRoom) =>
    rooms.some(
      (o) =>
        o !== self &&
        Math.min(cand.x + cand.w, o.x + o.w) - Math.max(cand.x, o.x) > REPAIR_TOL &&
        Math.min(cand.y + cand.h, o.y + o.h) - Math.max(cand.y, o.y) > REPAIR_TOL,
    );
  for (const r of rooms) {
    const w = Math.min(r.w, plan.length);
    const h = Math.min(r.h, plan.width);
    r.w = w < 0.8 && !overlapsOther({ ...r, w: 0.8 }, r) ? 0.8 : w;
    r.h = h < 0.8 && !overlapsOther({ ...r, h: 0.8 }, r) ? 0.8 : h;
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
      // L'entrée principale, la sortie de secours et la porte de service sont
      // des issues voulues : elles restent des portes, jamais requalifiées en
      // fenêtres.
      if (d.isEntry || d.isEmergency || d.isService) continue;
      const isOnFacade =
        (d.wall === "N" && onEdge(r.y, 0)) ||
        (d.wall === "S" && onEdge(r.y + r.h, plan.width)) ||
        (d.wall === "W" && onEdge(r.x, 0)) ||
        (d.wall === "E" && onEdge(r.x + r.w, plan.length));
      if (isOnFacade && otherDoors >= 1) {
        // La fenêtre issue de la conversion ne doit jamais recouvrir une
        // ouverture déjà présente sur le même mur (entrée, sortie de secours
        // ou fenêtre existante) : elle est décalée dans l'espace libre, sinon
        // simplement omise — la baie reste alors une porte du plan.
        const wallLen = d.wall === "N" || d.wall === "S" ? r.w : r.h;
        const width = Math.min(d.width, wallLen * 0.9);
        const overlaps = (pos: number, w: number, o: { position: number; width: number }) =>
          pos < o.position + o.width + 0.1 && pos + w > o.position - 0.1;
        // Obstacles encore présents : fenêtres du mur + autres portes du mur
        // (entrée, sortie de secours) — la porte convertie est retirée.
        const blockers = [
          ...r.windows.filter((w) => w.wall === d.wall),
          ...r.doors
            .filter((o) => o !== d && o.width > 0.01 && o.wall === d.wall)
            .map((o) => ({ position: o.position, width: o.width })),
        ];
        let pos = Math.min(Math.max(0, d.position), Math.max(0, wallLen - width));
        for (const b of blockers) {
          if (overlaps(pos, width, b)) pos = b.position + b.width + 0.15;
        }
        if (pos + width > wallLen) pos = Math.max(0, wallLen - width);
        if (!blockers.some((b) => overlaps(pos, width, b))) {
          r.windows.push({ wall: d.wall, position: round3(pos), width: round3(width) });
        }
        d.width = 0; // marquée pour suppression
      }
    }
    r.doors = r.doors.filter((d) => d.width > 0.01);
  }

  // 6) Toute pièce reçoit un accès : porte sur le mur le plus grand si aucun accès
  for (const r of rooms) {
    // Le bassin n'est pas une pièce : il ne reçoit jamais de porte.
    if (r.kind === "bassin") continue;
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
