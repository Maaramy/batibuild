// ============================================================================
// ANALYSE & OPTIMISATION ARCHITECTURALE (Expert 2D/3D)
// ----------------------------------------------------------------------------
// Moteur déterministe qui évalue un plan d'étage (FloorPlan) selon les critères
// d'un architecte d'intérieur / spécialiste BIM :
//   · Zonage & circulation  — répartition jour/nuit/service, m² perdus en
//     circulations (couloirs / gaine escalier), surface « utile ».
//   · Ergonomie             — hauteur sous plafond, largeur minimale des
//     passages (≥ 80-90 cm), dégagement autour du mobilier.
//   · Agencement intérieur  — positionnement des portes, fenêtres, cloisons et
//     rangements ; pièces habitables sans apport de lumière naturelle.
// Chaque analyse produit des recommandations actionnables et un score /100.
// ============================================================================

import type { FloorPlan, PlanRoom, RoomKind } from "./floorPlanEngine";

/** Hauteur sous plafond retenue par le rendu 3D (m). */
export const CEILING_HEIGHT = 2.7;
/** Passage courant minimum conseillé (m). */
export const MIN_PASSAGE = 0.8;
/** Passage confortable cible (m). */
export const MIN_PASSAGE_COMFORT = 0.9;

export type AnalysisCategory =
  | "zonage"
  | "circulation"
  | "ergonomie"
  | "agencement"
  | "lumiere";

export type Severity = "info" | "warning" | "critical";

export interface PlanRecommendation {
  category: AnalysisCategory;
  severity: Severity;
  title: string;
  detail: string;
}

export interface ZoneGroup {
  zone: string;
  kind: "nuit" | "jour" | "service" | "circulation";
  rooms: { label: string; area: number }[];
  area: number;
}

export interface ZoningAnalysis {
  groups: ZoneGroup[];
  /** Surface cumulée des circulations (couloirs + escaliers + halls). */
  circulationM2: number;
  /** Part des circulations dans la surface totale (%). */
  circulationPct: number;
  /** Surface vraiment utile (total − circulations), m². */
  usefulM2: number;
}

export interface ErgonomicsAnalysis {
  ceilingHeight: number;
  /** Largeur du couloir / passage le plus étroit (m). */
  minPassage: number;
  passable: boolean;
  /** Pièces trop étroites (une dimension < 1,6 m). */
  narrowRooms: { label: string; dim: number }[];
}

export interface LayoutAnalysis {
  totalDoors: number;
  totalWindows: number;
  /** Pièces habitables dépourvues de fenêtre. */
  roomsWithoutDaylight: { label: string; kind: RoomKind }[];
}

export interface FloorPlanAnalysis {
  score: number;
  zoning: ZoningAnalysis;
  ergonomics: ErgonomicsAnalysis;
  layout: LayoutAnalysis;
  recommendations: PlanRecommendation[];
}

// ── Groupes de destination ──────────────────────────────────────────────────

const NIGHT_KINDS = new Set<RoomKind>(["chambre", "sdb", "wc"]);
const DAY_KINDS = new Set<RoomKind>([
  "sejour",
  "cuisine",
  "bureau",
  "reception",
  "openspace",
  "polyvalent",
  "terrasse",
  "attente",
  "salle_cafe",
  "salle_client",
]);
const CIRCULATION_KINDS = new Set<RoomKind>(["couloir", "escalier", "hall"]);

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
]);

function zoneKindFor(room: PlanRoom): ZoneGroup["kind"] {
  if (NIGHT_KINDS.has(room.kind)) return "nuit";
  if (DAY_KINDS.has(room.kind)) return "jour";
  if (CIRCULATION_KINDS.has(room.kind)) return "circulation";
  return "service";
}

// ── Analyse principale ──────────────────────────────────────────────────────

export function analyzeFloorPlan(plan: FloorPlan): FloorPlanAnalysis {
  // Les patios / cours extérieures ne sont pas des pièces : ils ne faussent
  // ni le zonage, ni le taux de circulation, ni la surface utile.
  const rooms = plan.rooms.filter((r) => !r.exterior);
  const total = rooms.reduce((s, r) => s + r.area, 0) || 1;

  // 1. Zonage
  const groupMap = new Map<ZoneGroup["kind"], ZoneGroup>();
  const init = (k: ZoneGroup["kind"]): ZoneGroup => ({
    zone:
      k === "nuit"
        ? "Zone nuit"
        : k === "jour"
          ? "Zone jour"
          : k === "service"
            ? "Zone service / technique"
            : "Circulations",
    kind: k,
    rooms: [],
    area: 0,
  });
  const seed = ["nuit", "jour", "service", "circulation"] as ZoneGroup["kind"][];
  for (const k of seed) groupMap.set(k, init(k));

  for (const r of rooms) {
    const g = groupMap.get(zoneKindFor(r))!;
    g.rooms.push({ label: r.label, area: r.area });
    g.area += r.area;
  }
  const groups = seed.map((k) => groupMap.get(k)!);
  const circulationM2 = groupMap.get("circulation")!.area;
  const circulationPct = (circulationM2 / total) * 100;
  const usefulM2 = total - circulationM2;
  const zoning: ZoningAnalysis = {
    groups,
    circulationM2,
    circulationPct,
    usefulM2,
  };

  // 2. Ergonomie
  const circRooms = rooms.filter((r) => CIRCULATION_KINDS.has(r.kind));
  const minPassage = circRooms.length
    ? Math.min(...circRooms.map((r) => Math.min(r.w, r.h)))
    : Math.min(...rooms.map((r) => Math.min(r.w, r.h)));
  const narrowRooms = rooms
    .filter((r) => !CIRCULATION_KINDS.has(r.kind) && Math.min(r.w, r.h) < 1.6)
    .map((r) => ({ label: r.label, dim: Math.round(Math.min(r.w, r.h) * 100) / 100 }));
  const ergonomics: ErgonomicsAnalysis = {
    ceilingHeight: CEILING_HEIGHT,
    minPassage,
    passable: minPassage >= MIN_PASSAGE,
    narrowRooms,
  };

  // 3. Agencement / lumière
  const totalDoors = rooms.reduce((s, r) => s + r.doors.length, 0);
  const totalWindows = rooms.reduce((s, r) => s + r.windows.length, 0);
  const roomsWithoutDaylight = rooms
    .filter((r) => HABITABLE_KINDS.has(r.kind) && r.windows.length === 0)
    .map((r) => ({ label: r.label, kind: r.kind }));
  const layout: LayoutAnalysis = {
    totalDoors,
    totalWindows,
    roomsWithoutDaylight,
  };

  // 4. Recommandations
  const recommendations: PlanRecommendation[] = [];
  let score = 100;

  if (circulationPct > 12) {
    recommendations.push({
      category: "circulation",
      severity: "warning",
      title: "Circulations trop généreuses",
      detail: `${circulationPct.toFixed(0)}% de la surface (${circulationM2.toFixed(1)} m²) est consommée par les couloirs et la gaine. Recomposer le plan pour éliminer les m² perdus : regrouper les pièces de service en blocs contigus et réduire la longueur des couloirs.`,
    });
    score -= Math.min(15, Math.round((circulationPct - 12) * 1.5));
  } else {
    recommendations.push({
      category: "circulation",
      severity: "info",
      title: "Bonne compacité des circulations",
      detail: `Seuls ${circulationPct.toFixed(1)}% de la surface (${circulationM2.toFixed(1)} m²) sont consacrés aux couloirs et à la gaine d'escalier, laissant ${usefulM2.toFixed(1)} m² de surface utile.`,
    });
  }

  const night = groupMap.get("nuit")!;
  const day = groupMap.get("jour")!;
  if (night.area > 0 && day.area > 0) {
    if (night.area > day.area) {
      recommendations.push({
        category: "zonage",
        severity: "warning",
        title: "Déséquilibre zone jour / nuit",
        detail: `La zone nuit (${night.area.toFixed(1)} m²) excède la zone jour (${day.area.toFixed(1)} m²). Rééquilibrer en faveur des espaces de vie (séjour ouvert sur la cuisine) pour un rythme jour/nuit plus lisible et une meilleure isolation acoustique des chambres.`,
      });
    } else {
      recommendations.push({
        category: "zonage",
        severity: "info",
        title: "Zonage jour / nuit cohérent",
        detail: `Les espaces de jour (${
          day.area.toFixed(1)
        } m²) dominent la zone nuit (${
          night.area.toFixed(1)
        } m²) : l'entrée mène naturellement au séjour, tandis que les chambres s'éloignent des sources de bruit.`,
      });
    }
  }

  if (!ergonomics.passable) {
    recommendations.push({
      category: "ergonomie",
      severity: "critical",
      title: "Passage trop étroit",
      detail: `Le passage le plus étroit mesure ${(ergonomics.minPassage * 100).toFixed(0)} cm, sous le minimum de ${
        MIN_PASSAGE_COMFORT * 100
      } cm conseillé. Élargir ce couloir à ${(MIN_PASSAGE_COMFORT * 100).toFixed(0)} cm pour permettre le croisement et le transport de mobilier.`,
    });
    score -= 18;
  } else if (ergonomics.minPassage < MIN_PASSAGE_COMFORT) {
    recommendations.push({
      category: "ergonomie",
      severity: "warning",
      title: "Passage fonctionnel mais strict",
      detail: `Le passage le plus étroit atteint ${(ergonomics.minPassage * 100).toFixed(0)} cm (cible ${(MIN_PASSAGE_COMFORT * 100).toFixed(0)} cm). Le garder dégagé sur toute sa longueur — aucun rangement saillant, porte battante hors du chemin.`,
    });
  }

  if (ergonomics.narrowRooms.length > 0) {
    recommendations.push({
      category: "agencement",
      severity: "warning",
      title: "Pièces trop étroites",
      detail: `${ergonomics.narrowRooms
        .map((r) => `${r.label} (${(r.dim * 100).toFixed(0)} cm)`)
        .join(", ")}. Sous ${(1.6 * 100).toFixed(0)} cm de profondeur, préférer un mobilier sur-mesure (dressing, banquette) plutôt que du mobilier standard pour ne pas obstruer la circulation.`,
    });
    score -= 5;
  }

  if (layout.roomsWithoutDaylight.length > 0) {
    recommendations.push({
      category: "lumiere",
      severity: "warning",
      title: "Pièces habitables sans lumière naturelle",
      detail: `${layout.roomsWithoutDaylight
        .map((r) => r.label)
        .join(", ")} n'ont pas de fenêtre. Percer une ouverture vers l'extérieur, ou en dernier recours prévoir un conduit de lumière / verrière et des cloisons vitrées pour diffuser la clarté.`,
    });
    score -= 10;
  } else {
    recommendations.push({
      category: "lumiere",
      severity: "info",
      title: "Bon apport de lumière naturelle",
      detail: `Toutes les pièces de séjour bénéficient d'une ouverture extérieure (${layout.totalWindows} fenêtres au total), limitant le recours à l'éclairage artificiel en journée.`,
    });
  }

  if (layout.totalWindows > 0) {
    recommendations.push({
      category: "agencement",
      severity: "info",
      title: "Mobilier face aux ouvertures",
      detail: `Conserver un dégagement d'au moins ${(0.9 * 100).toFixed(0)} cm devant les ${layout.totalWindows} fenêtres et positionner les rangements pleins (penderies, bibliothèques) sur les murs intérieurs pour ne pas occulter la lumière.`,
    });
  }

  if (layout.totalDoors === 0) {
    recommendations.push({
      category: "agencement",
      severity: "critical",
      title: "Aucune porte sur ce niveau",
      detail: "Chaque pièce doit disposer d'un accès dédié pour garantir la fluidité du parcours intérieur.",
    });
    score -= 10;
  }

  // Score borné 40–100
  const finalScore = Math.max(40, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    zoning,
    ergonomics,
    layout,
    recommendations,
  };
}