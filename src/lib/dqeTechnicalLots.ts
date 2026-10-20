// ============================================================================
// RÈGLES PARTAGÉES — POSTES DE PLOMBERIE ET D'ÉLECTRICITÉ (QUANTITATIF DÉTAILLÉ)
// ----------------------------------------------------------------------------
// Source UNIQUE des quantités et des prix des deux corps d'état techniques du
// « Quantitatif détaillé » (DQE). Tous les types de projet concernés — maisons,
// villas, appartements, studios, duplex, immeubles, résidences, locaux
// commerciaux, restaurants, cafés, bureaux, bâtiments industriels, garages,
// rénovations complètes / SdB / cuisine — passent par ces mêmes règles :
//
//   • quantité = surface RÉELLEMENT construite du projet (tous les niveaux),
//     et JAMAIS la quantité d'un projet de référence ramenée telle quelle ;
//   • majoration d'« équivalent m² » lorsque le projet déclare PLUS d'équipements
//     sanitaires que la densité de référence (salles de bain, cuisines, WC) ;
//   • prix unitaire issu du barème national (`lib/technicalBareme`), ajusté une
//     seule fois du coefficient régional par le moteur du DQE ;
//   • part « main-d'œuvre » exposée et incluse dans le prix, jamais recomptée.
//
// Le module est PUR (aucune dépendance Convex / React) : il est utilisé par
// `src/convex/dqeEngine.ts` et testable directement.
// ============================================================================

import {
  ELECTRICITY_BAREME_M2,
  ELECTRICITY_LABOR_M2,
  PLUMBING_BAREME_M2,
  PLUMBING_LABOR_M2,
  type TechnicalScenario,
} from "./technicalBareme";

export type TechnicalInstallation = "plomberie" | "electricite";

/**
 * Profil technique d'un type de projet : il ne change ni la règle de quantité
 * (toujours la surface construite) ni le barème national, mais il documente le
 * poste et permet d'afficher une observation adaptée au type de bien.
 */
export type TechnicalProfile =
  | "residentiel"
  | "commercial"
  | "industriel"
  | "renovation";

/** Équipements sanitaires déclarés par le projet (facultatifs). */
export interface TechnicalRooms {
  bathrooms?: number;
  kitchens?: number;
  wcs?: number;
}

export const TECHNICAL_DESIGNATIONS: Record<TechnicalInstallation, string> = {
  plomberie: "Plomberie sanitaire",
  electricite: "Électricité",
};

export const TECHNICAL_LABELS: Record<TechnicalInstallation, string> = {
  plomberie: "Plomberie",
  electricite: "Électricité",
};

const COMMERCIAL_CATEGORIES = new Set([
  "local_commercial",
  "boutique_commerciale",
  "magasin",
  "bureau",
  "bureau_cabinet",
  "restaurant",
  "cafe",
  "hotel",
  "maison_hote",
  "centre_commercial",
]);

const INDUSTRIAL_CATEGORIES = new Set([
  "entrepot",
  "depot",
  "atelier",
  "usine",
  "batiment_agricole",
  "ferme",
  "serre_agricole",
  "garage",
  "parking",
]);

/**
 * Profil technique du type de projet. Un slug inconnu (ou ancien) retombe sur
 * le profil résidentiel, comme le moteur du DQE.
 */
export function technicalProfileFor(
  category: string | null | undefined,
): TechnicalProfile {
  const cat = (category ?? "").trim().toLowerCase();
  if (!cat) return "residentiel";
  if (cat.startsWith("renovation") || cat === "peinture_interieure") {
    return "renovation";
  }
  if (INDUSTRIAL_CATEGORIES.has(cat)) return "industriel";
  if (COMMERCIAL_CATEGORIES.has(cat)) return "commercial";
  return "residentiel";
}

/**
 * Densité d'équipements de référence pour une surface construite — mêmes
 * conventions que les valeurs par défaut de la plateforme :
 * 1 salle de bain / 80 m², 1 cuisine / 120 m², 1 WC / 90 m².
 */
export function referenceRoomsFor(builtArea: number): Required<TechnicalRooms> {
  const area = Math.max(1, Number(builtArea) || 0);
  return {
    bathrooms: Math.max(1, Math.round(area / 80)),
    kitchens: Math.max(1, Math.round(area / 120)),
    wcs: Math.max(1, Math.round(area / 90)),
  };
}

/**
 * Équivalent m² ajouté par équipement sanitaire SUPPLÉMENTAIRE par rapport à la
 * densité de référence. Il traduit le coût réel d'un réseau et d'un appareil de
 * plus (alimentation, évacuation, raccordement électrique, mise en service).
 */
const EXTRA_EQUIPMENT_M2: Record<
  TechnicalInstallation,
  { bathrooms: number; kitchens: number; wcs: number }
> = {
  plomberie: { bathrooms: 14, kitchens: 10, wcs: 7 },
  electricite: { bathrooms: 11, kitchens: 9, wcs: 5 },
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const extraCount = (
  provided: number | undefined,
  reference: number,
): number =>
  typeof provided === "number" && Number.isFinite(provided)
    ? Math.max(0, Math.round(provided) - reference)
    : 0;

/**
 * Quantité d'un poste technique, exprimée en m² de surface construite
 * (l'unité du barème). Elle suit la surface réelle du projet et s'adapte aux
 * équipements déclarés. Sans équipements connus, la quantité est EXACTEMENT la
 * surface construite (aucune majoration arbitraire).
 */
export function technicalQuantity(
  installation: TechnicalInstallation,
  input: { builtArea: number; rooms?: TechnicalRooms },
): number {
  const area = Math.max(0, Number(input.builtArea) || 0);
  if (area <= 0) return 0;
  if (!input.rooms) return round1(area);

  const reference = referenceRoomsFor(area);
  const extra = EXTRA_EQUIPMENT_M2[installation];
  const uplift =
    extraCount(input.rooms.bathrooms, reference.bathrooms) * extra.bathrooms +
    extraCount(input.rooms.kitchens, reference.kitchens) * extra.kitchens +
    extraCount(input.rooms.wcs, reference.wcs) * extra.wcs;

  return round1(area + uplift);
}

/** Prix unitaire TTC (DT/m²) du barème national pour un scénario donné. */
export function technicalUnitPrice(
  installation: TechnicalInstallation,
  scenario: TechnicalScenario = "standard",
): number {
  return installation === "plomberie"
    ? PLUMBING_BAREME_M2[scenario]
    : ELECTRICITY_BAREME_M2[scenario];
}

/** Part « main-d'œuvre » incluse dans le prix au m² (DT/m²). */
export function technicalLaborUnitPrice(
  installation: TechnicalInstallation,
  scenario: TechnicalScenario = "standard",
): number {
  return installation === "plomberie"
    ? PLUMBING_LABOR_M2[scenario]
    : ELECTRICITY_LABOR_M2[scenario];
}

/** Libellé de la part « main-d'œuvre » affichée sous le poste. */
export function technicalLaborLabel(
  installation: TechnicalInstallation,
): string {
  return `Main-d'œuvre — ${installation === "plomberie" ? "Plomberie complète" : "Électricité complète"}`;
}

/**
 * Observation factuelle du poste : surface construite retenue et équipements
 * pris en compte. Elle n'est jamais un texte commercial ni une note de calcul
 * interne — uniquement les données du projet.
 */
export function technicalObservation(
  installation: TechnicalInstallation,
  input: {
    builtArea: number;
    quantity: number;
    rooms?: TechnicalRooms;
    profile?: TechnicalProfile;
  },
): string {
  const area = round1(Math.max(0, Number(input.builtArea) || 0));
  const parts = [
    `${area} m² construits`,
  ];
  if (input.rooms) {
    const reference = referenceRoomsFor(area);
    const extra =
      extraCount(input.rooms.bathrooms, reference.bathrooms) +
      extraCount(input.rooms.kitchens, reference.kitchens) +
      extraCount(input.rooms.wcs, reference.wcs);
    const declared: string[] = [];
    if (typeof input.rooms.bathrooms === "number") {
      declared.push(`${Math.max(0, Math.round(input.rooms.bathrooms))} SdB`);
    }
    if (typeof input.rooms.kitchens === "number") {
      declared.push(`${Math.max(0, Math.round(input.rooms.kitchens))} cuisine(s)`);
    }
    if (typeof input.rooms.wcs === "number") {
      declared.push(`${Math.max(0, Math.round(input.rooms.wcs))} WC`);
    }
    if (declared.length > 0) parts.push(declared.join(" · "));
    if (extra > 0) {
      parts.push(`${round1(input.quantity)} m² équivalents (équipements supplémentaires)`);
    }
  }
  const profile = input.profile ?? "residentiel";
  const profileNote =
    profile === "commercial"
      ? "installation commerciale dimensionnée sur la surface"
      : profile === "industriel"
        ? "installation dimensionnée sur la surface du bâtiment"
        : profile === "renovation"
          ? "reprise sur réseaux et équipements existants"
          : "installation commune comptée une seule fois";
  parts.push(profileNote);
  return parts.join(" · ");
}
