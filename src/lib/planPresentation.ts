// ============================================================================
// PRÉSENTATION COMMUNE DES PLANS D'ARCHITECTE (2D & 3D)
// ----------------------------------------------------------------------------
// Une seule identité graphique pour tous les plans Batibuild, inspirée de la
// maquette architecturale de référence :
//   · fond papier blanc cassé, panneau d'information beige clair ;
//   · typographie noire, encadrés à coins légèrement arrondis ;
//   · sols bois clair / pierre / béton, murs blancs, végétation réaliste ;
//   · signalétique « ENTRÉE PRINCIPALE » (vert) et « SORTIE DE SECOURS » (rouge).
//
// Ce module ne contient AUCUNE donnée géométrique : il lit le `FloorPlan` produit
// par le moteur (`floorPlanEngine`) et en déduit uniquement du texte d'affichage
// (type de projet, éléments clés, légende). Aucune surface n'est recalculée ni
// modifiée : les valeurs affichées proviennent des pièces du plan.
// ============================================================================

import type { DoorSpec, FloorPlan, PlanRoom, WallSide } from "./floorPlanEngine";

/** Palette unique, partagée par la feuille de présentation, le 2D et le 3D. */
export const PLAN_MATERIALS = {
  /** Fond papier de la feuille. */
  paper: "#FBF9F5",
  /** Panneau d'information beige clair. */
  panel: "#F2EBDD",
  panelEdge: "#E4D9C5",
  /** Encre : titres, cotes, contours. */
  ink: "#23201C",
  muted: "#6E6559",
  faint: "#A79C8C",
  /** Sols. */
  oak: "#E6C9A2",
  oakLight: "#EFD9B8",
  oakDark: "#C9A473",
  stone: "#EDE8DD",
  stoneEdge: "#D9D1C1",
  concrete: "#D7D3CA",
  grass: "#A8BC8B",
  /** Murs blancs coupés (maquette). */
  wall: "#FAF8F3",
  wallShade: "#E7E1D5",
  /** Signalétique. */
  entry: "#15803D",
  exit: "#B3261E",
  /** Décoration bois autour de l'entrée principale. */
  wood: "#B07A45",
  woodDark: "#8A5A32",
  selection: "#7C3AED",
} as const;

export type PlanProjectGroup =
  | "residentiel"
  | "restauration"
  | "commerce"
  | "bureau"
  | "tourisme"
  | "piscine"
  | "generique";

export interface PlanTypeMeta {
  /** Libellé du type de projet sélectionné. */
  label: string;
  group: PlanProjectGroup;
  /** Précision affichée sous le type (concept, usage). */
  caption: string;
}

const TYPE_LABELS: Record<string, string> = {
  maison: "Maison",
  maison_r_plus_1: "Maison R+1",
  maison_r_plus_2: "Maison R+2",
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  immeuble: "Immeuble",
  local_commercial: "Local commercial",
  commerce: "Commerce",
  bureau: "Bureau",
  entrepot: "Entrepôt",
  residence_touristique: "Résidence touristique",
  projet_neuf: "Projet immobilier neuf",
  restaurant: "Restaurant",
  cafe: "Café",
  piscine: "Piscine",
};

const TYPE_GROUPS: Record<string, PlanProjectGroup> = {
  maison: "residentiel",
  maison_r_plus_1: "residentiel",
  maison_r_plus_2: "residentiel",
  villa: "residentiel",
  appartement: "residentiel",
  studio: "residentiel",
  duplex: "residentiel",
  immeuble: "residentiel",
  residence_touristique: "tourisme",
  projet_neuf: "generique",
  restaurant: "restauration",
  cafe: "restauration",
  local_commercial: "commerce",
  commerce: "commerce",
  entrepot: "commerce",
  bureau: "bureau",
  piscine: "piscine",
};

const GROUP_CAPTIONS: Record<PlanProjectGroup, string> = {
  residentiel: "Habitat — espaces jour, nuit et service",
  restauration: "Restauration — salle, comptoir et production",
  commerce: "Commerce — surface de vente et réserve",
  bureau: "Tertiaire — postes de travail et réunions",
  tourisme: "Hébergement — chambres et espaces communs",
  piscine: "Équipement extérieur — bassin et plages",
  generique: "Programme neuf — espaces et circulations",
};

/** Type de projet affiché dans le panneau d'information. */
export function planTypeMeta(category?: string | null): PlanTypeMeta {
  const key = (category ?? "").trim();
  const group = TYPE_GROUPS[key] ?? "generique";
  return {
    label: TYPE_LABELS[key] ?? "Projet",
    group,
    caption: GROUP_CAPTIONS[group],
  };
}

/** Libellé du niveau affiché (RDC, niveau 1, niveau 2…). */
export function planLevelLabel(level: number): string {
  return level <= 0 ? "Rez-de-chaussée" : `Niveau ${level}`;
}

/** Libellé court pour les onglets de niveau. */
export function planLevelShort(level: number): string {
  return level <= 0 ? "RDC" : `R+${level}`;
}

const WALL_LABELS: Record<WallSide, string> = {
  N: "Façade nord",
  S: "Façade sud",
  E: "Façade est",
  W: "Façade ouest",
};

export function wallLabel(wall: WallSide): string {
  return WALL_LABELS[wall];
}

const fmt = (value: number) => (Math.round(value * 10) / 10).toFixed(1);

export function builtArea(plan: FloorPlan): number {
  return plan.rooms.filter((r) => !r.exterior).reduce((sum, r) => sum + r.area, 0);
}

/** Porte d'entrée principale du niveau, avec sa pièce support. */
export function planEntry(plan: FloorPlan): { room: PlanRoom; door: DoorSpec } | null {
  for (const room of plan.rooms) {
    const door = room.doors.find((d) => d.isEntry);
    if (door) return { room, door };
  }
  return null;
}

/** Sortie de secours du niveau, avec sa pièce support. */
export function planEmergencyExit(plan: FloorPlan): { room: PlanRoom; door: DoorSpec } | null {
  for (const room of plan.rooms) {
    const door = room.doors.find((d) => d.isEmergency);
    if (door) return { room, door };
  }
  return null;
}

/** Porte de service (livraison, personnel, déchets). */
export function planServiceExit(plan: FloorPlan): { room: PlanRoom; door: DoorSpec } | null {
  for (const room of plan.rooms) {
    const door = room.doors.find((d) => d.isService);
    if (door) return { room, door };
  }
  return null;
}

export interface PlanKeyElement {
  label: string;
  value: string;
}

const KIND_AREAS = (plan: FloorPlan, kinds: readonly PlanRoom["kind"][]) =>
  plan.rooms.filter((r) => kinds.includes(r.kind)).reduce((s, r) => s + r.area, 0);

const KIND_COUNT = (plan: FloorPlan, kinds: readonly PlanRoom["kind"][]) =>
  plan.rooms.filter((r) => kinds.includes(r.kind)).length;

/**
 * « Éléments clés » du plan affiché, déduits des pièces réellement dessinées.
 * Les valeurs (surfaces, parts) sont celles du moteur : aucun recalcul.
 */
export function planKeyElements(plan: FloorPlan, category?: string | null): PlanKeyElement[] {
  const meta = planTypeMeta(category);
  const built = builtArea(plan);
  const share = (area: number) => (built > 0 ? `${Math.round((area / built) * 100)} %` : "—");
  const out: PlanKeyElement[] = [];

  switch (meta.group) {
    case "restauration": {
      const salle = plan.rooms.find((r) => r.kind === "salle_cafe" || r.kind === "salle_client");
      if (salle) {
        out.push({
          label: salle.kind === "salle_cafe" ? "Salle café" : "Salle de restauration",
          value: `${fmt(salle.area)} m² · ${share(salle.area)}`,
        });
      }
      const cuisine = plan.rooms.find((r) => r.kind === "cuisine_pro");
      if (cuisine) out.push({ label: "Cuisine professionnelle", value: `${fmt(cuisine.area)} m²` });
      const service = ["plonge", "chambre_froide", "stockage"] as const;
      const serviceArea = KIND_AREAS(plan, service);
      if (serviceArea > 0) {
        out.push({ label: "Locaux de service", value: `${fmt(serviceArea)} m²` });
      }
      const wc = KIND_COUNT(plan, ["wc", "sanitaire"]);
      if (wc > 0) out.push({ label: "Sanitaires clientèle", value: `${wc}` });
      const couloir = plan.rooms.find((r) => r.kind === "couloir");
      if (couloir) {
        out.push({
          label: "Circulation technique",
          value: `${fmt(Math.min(couloir.w, couloir.h))} m`,
        });
      }
      break;
    }
    case "commerce": {
      const vente = KIND_AREAS(plan, ["vente", "salle_client", "reception"]);
      if (vente > 0) out.push({ label: "Surface de vente", value: `${fmt(vente)} m² · ${share(vente)}` });
      const reserve = KIND_AREAS(plan, ["stockage", "logistique"]);
      if (reserve > 0) out.push({ label: "Réserve / logistique", value: `${fmt(reserve)} m²` });
      const sanitaires = KIND_COUNT(plan, ["wc", "sanitaire"]);
      if (sanitaires > 0) out.push({ label: "Sanitaires", value: `${sanitaires}` });
      break;
    }
    case "bureau": {
      const postes = KIND_AREAS(plan, ["openspace", "bureau"]);
      if (postes > 0) out.push({ label: "Espaces de travail", value: `${fmt(postes)} m²` });
      if (KIND_COUNT(plan, ["reunion"]) > 0) {
        out.push({ label: "Salle de réunion", value: `${fmt(KIND_AREAS(plan, ["reunion"]))} m²` });
      }
      const accueil = KIND_AREAS(plan, ["reception", "hall", "attente"]);
      if (accueil > 0) out.push({ label: "Accueil / attente", value: `${fmt(accueil)} m²` });
      break;
    }
    case "piscine": {
      const bassin = KIND_AREAS(plan, ["bassin"]);
      if (bassin > 0) out.push({ label: "Bassin", value: `${fmt(bassin)} m²` });
      const plages = KIND_AREAS(plan, ["terrasse", "patio"]);
      if (plages > 0) out.push({ label: "Plages / terrasses", value: `${fmt(plages)} m²` });
      const local = KIND_AREAS(plan, ["local_technique"]);
      if (local > 0) out.push({ label: "Local technique", value: `${fmt(local)} m²` });
      break;
    }
    default: {
      const chambres = KIND_COUNT(plan, ["chambre"]);
      if (chambres > 0) out.push({ label: "Chambres", value: `${chambres}` });
      const sejour = KIND_AREAS(plan, ["sejour"]);
      if (sejour > 0) out.push({ label: "Séjour", value: `${fmt(sejour)} m²` });
      const service = KIND_AREAS(plan, ["cuisine", "buanderie"]);
      if (service > 0) out.push({ label: "Cuisine & service", value: `${fmt(service)} m²` });
      const bains = KIND_COUNT(plan, ["sdb", "wc"]);
      if (bains > 0) out.push({ label: "Salles d'eau & WC", value: `${bains}` });
      const exterieur = plan.rooms.filter((r) => r.exterior).reduce((s, r) => s + r.area, 0);
      if (exterieur > 0) out.push({ label: "Extérieur sur l'emprise", value: `${fmt(exterieur)} m²` });
      break;
    }
  }

  // Trois caractéristiques du type de projet au maximum, puis les données
  // communes : la surface, l'entrée et l'évacuation ne sont jamais coupées.
  const specific = out.slice(0, 3);
  const entry = planEntry(plan);
  const exit = planEmergencyExit(plan);
  return [
    ...specific,
    { label: "Surface couverte", value: `${fmt(built)} m²` },
    { label: "Emprise", value: `${fmt(plan.length)} × ${fmt(plan.width)} m` },
    {
      label: "Entrée principale",
      value: entry ? wallLabel(entry.door.wall) : "Non dessinée",
    },
    {
      label: "Sortie de secours",
      value: exit ? wallLabel(exit.door.wall) : "Entrée unique",
    },
  ];
}

export type PlanLegendSymbol =
  | "entry"
  | "emergency"
  | "service"
  | "door"
  | "window"
  | "wall"
  | "furniture"
  | "wood"
  | "stairs"
  | "corridor"
  | "terrace"
  | "counter"
  | "pool";

export interface PlanLegendEntry {
  symbol: PlanLegendSymbol;
  label: string;
  tone: "entry" | "exit" | "wood" | "ink" | "muted" | "oak" | "water";
}

/**
 * Légende graphique adaptée au plan : seuls les symboles réellement présents
 * sont listés (aucune entrée fictive, aucune sortie de secours annoncée si la
 * porte n'existe pas).
 */
export function planLegend(plan: FloorPlan, category?: string | null): PlanLegendEntry[] {
  const meta = planTypeMeta(category);
  const out: PlanLegendEntry[] = [];
  const hasEntry = planEntry(plan) !== null;
  const hasExit = planEmergencyExit(plan) !== null;

  out.push({ symbol: "wall", label: "Murs & cloisons", tone: "ink" });
  out.push({ symbol: "door", label: "Porte intérieure", tone: "ink" });
  if (plan.rooms.some((r) => r.windows.length > 0)) {
    out.push({ symbol: "window", label: "Fenêtre", tone: "muted" });
  }
  if (hasEntry) out.push({ symbol: "entry", label: "Entrée principale", tone: "entry" });
  if (hasExit) out.push({ symbol: "emergency", label: "Sortie de secours", tone: "exit" });
  if (planServiceExit(plan)) {
    out.push({ symbol: "service", label: "Porte de service", tone: "exit" });
  }
  if (plan.rooms.some((r) => r.kind === "escalier")) {
    out.push({ symbol: "stairs", label: "Escalier", tone: "ink" });
  }
  if (
    plan.rooms.some((r) => r.kind === "couloir") &&
    (meta.group === "restauration" || meta.group === "commerce")
  ) {
    out.push({ symbol: "corridor", label: "Circulation technique", tone: "muted" });
  }
  if (
    meta.group === "restauration" ||
    plan.rooms.some((r) => r.kind === "comptoir")
  ) {
    out.push({ symbol: "counter", label: "Comptoir", tone: "wood" });
  }
  if (hasEntry) {
    out.push({
      symbol: "wood",
      label:
        meta.group === "restauration" || meta.group === "commerce" || meta.group === "bureau"
          ? "Habillage bois de l'entrée"
          : "Pergola bois de l'entrée",
      tone: "wood",
    });
  }
  if (plan.rooms.some((r) => r.exterior || r.kind === "terrasse")) {
    out.push({ symbol: "terrace", label: "Terrasse / extérieur", tone: "oak" });
  }
  if (plan.rooms.some((r) => r.kind === "bassin")) {
    out.push({ symbol: "pool", label: "Bassin", tone: "water" });
  }
  out.push({ symbol: "furniture", label: "Mobilier & équipements", tone: "muted" });
  return out;
}

/** Mention exacte portée par l'enseigne verte au-dessus de l'entrée. */
export const ENTRY_SIGN_TEXT = "ENTRÉE PRINCIPALE";
/** Mention exacte portée par la signalétique de secours. */
export const EXIT_SIGN_TEXT = "SORTIE DE SECOURS";

/** Vignette extérieure : seulement pour les typologies rendues en 3D. */
export function planHasExteriorThumbnail(category?: string | null): boolean {
  const group = planTypeMeta(category).group;
  return group === "residentiel" || group === "tourisme" || group === "generique";
}
