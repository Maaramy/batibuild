// ============================================================================
// PLAN ARCHITECTURAL VALIDÉ — SOURCE DES DONNÉES DU PARCOURS
// ----------------------------------------------------------------------------
// Le Project Journey commence par « Plans architecturaux AI ». Lorsque
// l'utilisateur valide une variante, sa géométrie devient la référence des
// étapes suivantes :
//
//   • surfaces couvertes réelles de chaque niveau (m²) → coût estimatif ;
//   • nombre de niveaux → calcul multi-niveaux (RDC / R+1 / R+2…) ;
//   • dimensions des pièces (largeur × profondeur) → conservation du métré ;
//   • nombre de pièces par type → quantitatif (portes, fenêtres, cloisons…).
//
// Ce module est PUR (aucun accès Convex ni React). Il ne modifie aucune donnée :
// il convertit une variante du moteur de plans en instantané enregistrable et
// dérive les champs du projet lus par les moteurs de coût / matériaux / aide à
// la décision. La mutation `projects.validateProjectPlan` est le seul point
// d'écriture.
// ============================================================================

import type { FloorPlanVariant } from "./floorPlanEngine";

/** Pièce d'un plan validé, avec ses dimensions réelles (m). */
export interface ValidatedPlanRoom {
  id: string;
  /** Type de pièce du moteur (`chambre`, `sdb`, `cuisine`, `sejour`…). */
  kind: string;
  label: string;
  /** Largeur de la pièce (m). */
  w: number;
  /** Profondeur de la pièce (m). */
  h: number;
  /** Surface de la pièce (m²) = w × h, arrondie au cm². */
  area: number;
}

/** Niveau d'un plan validé (0 = rez-de-chaussée). */
export interface ValidatedPlanFloor {
  level: number;
  /** Surface couverte du niveau (m²). */
  area: number;
  rooms: ValidatedPlanRoom[];
}

/**
 * Instantané transmis par la page Plans puis enregistré sur le projet.
 * `validatedAt` est ajouté côté serveur : le client ne fixe jamais la date.
 */
export interface ValidatedPlanDraft {
  variantId: string;
  variantName: string;
  /** Note de validation spatiale du moteur (0-100). */
  score: number;
  footprint: { length: number; width: number };
  /** Somme des surfaces de tous les niveaux (m²). */
  totalArea: number;
  floors: ValidatedPlanFloor[];
}

/** Plan validé tel qu'enregistré dans `projects.validatedPlan`. */
export interface ValidatedPlanSnapshot extends ValidatedPlanDraft {
  validatedAt: number;
}

/**
 * Champs du projet dérivés du plan validé. Ils remplacent les valeurs saisies
 * avant la génération du plan, afin que TOUTES les étapes suivantes travaillent
 * sur la même géométrie.
 */
export interface PlanProjectFields {
  /** Surface couverte du RDC (m²). */
  surface: number;
  /** Nombre de niveaux du plan. */
  floors: number;
  /** Surface couverte de chaque niveau, RDC en premier (m²). */
  levelSurfaces: number[];
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  livingRooms: number;
  wcs: number;
  garages: number;
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const round3 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 1000) / 1000;

/** Surface d'une pièce, recalculée depuis ses dimensions si nécessaire. */
function roomArea(room: { w: number; h: number; area: number }): number {
  const declared = Number(room.area);
  if (Number.isFinite(declared) && declared > 0) return round3(declared);
  return round3(round3(room.w) * round3(room.h));
}

/** Somme des surfaces des pièces d'un niveau. */
function floorRoomArea(floor: ValidatedPlanFloor): number {
  return round2(floor.rooms.reduce((sum, room) => sum + roomArea(room), 0));
}

/**
 * Convertit une variante du moteur de plans en instantané enregistrable.
 * Les niveaux sont ordonnés du RDC vers le haut et les surfaces sont
 * recalculées à partir des pièces : aucune valeur d'affichage n'est reprise
 * sans vérification.
 */
export function planDraftFromVariant(variant: FloorPlanVariant): ValidatedPlanDraft {
  const floors = [...variant.floors]
    .sort((a, b) => a.level - b.level)
    .map((floor) => {
      const rooms = floor.rooms.map((room) => ({
        id: room.id,
        kind: room.kind,
        label: room.label,
        // Dimensions conservées au millimètre (précision du moteur).
        w: round3(room.w),
        h: round3(room.h),
        area: roomArea(room),
      }));
      const roomsArea = round2(rooms.reduce((sum, room) => sum + room.area, 0));
      const declared = Number(floor.area);
      return {
        level: floor.level,
        // La surface du niveau est la somme réelle des pièces ; `floor.area`
        // (emprise) ne sert que de repli si le niveau est vide.
        area: rooms.length > 0 ? roomsArea : round2(declared),
        rooms,
      };
    });

  return {
    variantId: variant.id,
    variantName: variant.name,
    score: Math.max(0, Math.min(100, Math.round(variant.validation?.score ?? 0))),
    footprint: {
      length: round2(variant.footprint.length),
      width: round2(variant.footprint.width),
    },
    totalArea: round2(floors.reduce((sum, floor) => sum + floor.area, 0)),
    floors,
  };
}

/**
 * Dérive les champs du projet à partir du plan validé.
 *
 * Les surfaces sont celles des niveaux du plan ; le RDC devient la surface de
 * référence du projet et `levelSurfaces` conserve chaque niveau. Les pièces
 * sont comptées par type pour alimenter le quantitatif (portes / fenêtres).
 *
 * Lève une erreur explicite si le plan ne contient aucun niveau exploitable :
 * mieux vaut refuser la validation que d'écrire des surfaces nulles.
 */
export function planProjectFields(plan: ValidatedPlanDraft): PlanProjectFields {
  const floors = [...(plan.floors ?? [])].sort((a, b) => a.level - b.level);
  if (floors.length === 0) {
    throw new Error("Plan invalide : aucun niveau à valider.");
  }
  if (floors.length > 5) {
    throw new Error("Plan invalide : 5 niveaux maximum.");
  }

  const levelSurfaces = floors.map((floor) => {
    const area = floor.rooms.length > 0 ? floorRoomArea(floor) : round2(floor.area);
    return area > 0 ? area : 0;
  });
  if (levelSurfaces.some((area) => area <= 0)) {
    throw new Error("Plan invalide : chaque niveau doit avoir une surface positive.");
  }

  const counts = countRoomsByKind(floors);

  return {
    surface: levelSurfaces[0],
    floors: levelSurfaces.length,
    levelSurfaces,
    bedrooms: counts.bedrooms,
    bathrooms: counts.bathrooms,
    kitchens: counts.kitchens,
    livingRooms: counts.livingRooms,
    wcs: counts.wcs,
    garages: counts.garages,
  };
}

/** Compte les pièces par type sur l'ensemble des niveaux du plan. */
export function countRoomsByKind(floors: readonly ValidatedPlanFloor[]): {
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  livingRooms: number;
  wcs: number;
  garages: number;
  total: number;
} {
  const counts = {
    bedrooms: 0,
    bathrooms: 0,
    kitchens: 0,
    livingRooms: 0,
    wcs: 0,
    garages: 0,
    total: 0,
  };
  for (const floor of floors) {
    for (const room of floor.rooms) {
      counts.total += 1;
      switch (room.kind) {
        case "chambre":
          counts.bedrooms += 1;
          break;
        case "sdb":
        case "sanitaire":
          counts.bathrooms += 1;
          break;
        case "cuisine":
        case "cuisine_pro":
          counts.kitchens += 1;
          break;
        case "sejour":
        case "reception":
          counts.livingRooms += 1;
          break;
        case "wc":
          counts.wcs += 1;
          break;
        case "garage":
          counts.garages += 1;
          break;
        default:
          break;
      }
    }
  }
  return counts;
}

/** Résumé affichable du plan validé (aucun recalcul métier). */
export function validatedPlanSummary(plan: ValidatedPlanDraft | null | undefined): {
  surface: number;
  levels: number;
  rooms: number;
  totalArea: number;
  footprintLabel: string;
} | null {
  if (!plan || !Array.isArray(plan.floors) || plan.floors.length === 0) return null;
  const fields = planProjectFields(plan);
  return {
    surface: fields.surface,
    levels: fields.floors,
    rooms: countRoomsByKind(plan.floors).total,
    totalArea: round2(plan.floors.reduce((sum, floor) => sum + floorRoomArea(floor), 0)),
    footprintLabel: `${round2(plan.footprint.length)} × ${round2(plan.footprint.width)} m`,
  };
}
