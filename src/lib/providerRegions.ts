// ============================================================================
// RÉGIONS — libellés partagés par les fiches professionnelles
//
// Dérivé de la liste officielle des 24 gouvernorats déjà utilisée par l'espace
// expert (`TUNISIA_REGIONS`), pour éviter de dupliquer la même table dans
// chaque page de profil.
// ============================================================================

import { TUNISIA_REGIONS } from "@/components/expert/expertProfileOptions";

export const TUNISIA_REGION_LABELS: Record<string, string> = Object.fromEntries(
  TUNISIA_REGIONS.map((r) => [r.value, r.label]),
);

/** Libellé lisible d'une région (« beja » → « Béja »). */
export function regionLabel(value: string): string {
  return TUNISIA_REGION_LABELS[value] ?? value;
}
