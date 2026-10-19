// ============================================================================
// CORRECTION « QUANTITATIF DÉTAILLÉ » — PORTES & FENÊTRES
// La mise à l'échelle budgétaire du moteur BIM déforme les quantités des
// portes et fenêtres (ex. 55 portes pour une maison de 150 m²). Ce module
// recalcule ces quantités selon le nombre de pièces réel du projet :
//   - 1 porte intérieure par pièce (chambres, salon, cuisine, SDB, WC…)
//   - 1 fenêtre par pièce, 2 pour chaque chambre
//   - 2 portes principales (entrée principale + entrée de service)
// Les prix unitaires du catalogue officiel 2026 (et les prix en direct de la
// base materialPrices) sont conservés tels quels ; l'écart de budget de la
// catégorie « Second œuvre » est réparti proportionnellement sur les autres
// postes pour que le total de la catégorie reste inchangé.
// ============================================================================

import { isEnduitLissageName } from "../lib/enduitLissage";

export interface RoomCountsInput {
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  garages?: number;
  wcs?: number;
  pools?: number;
}

/**
 * Libellés des postes tels qu'ils apparaissent dans le « Quantitatif détaillé »
 * (résolus depuis le catalogue officiel 2026) → quantité à appliquer.
 */
const DOOR_WINDOW_ITEMS: Record<
  string,
  (roomTotal: number, bedrooms: number) => number
> = {
  "Porte intérieure bois pleine": (roomTotal) => Math.max(1, roomTotal),
  "Porte d'entrée métallique": () => 2,
  "Fenêtre aluminium 90×120": (roomTotal, bedrooms) => Math.max(2, roomTotal + bedrooms),
  "Grille de protection métallique": (roomTotal, bedrooms) => Math.max(2, roomTotal + bedrooms),
};

/**
 * Recalcule les quantités des portes et fenêtres du « Quantitatif détaillé »
 * selon le nombre de pièces du projet. Les prix unitaires du catalogue sont
 * conservés et le total de la catégorie « Second œuvre » est préservé (l'écart
 * est réparti proportionnellement sur les autres postes).
 */
export function applyRealisticDoorsWindows<
  T extends { category: string; estimatedCost?: number; items?: any[] },
>(
  breakdown: T[],
  rooms: RoomCountsInput = {},
): T[] {
  const roomTotal =
    (rooms.bedrooms ?? 0) +
    (rooms.bathrooms ?? 0) +
    (rooms.kitchens ?? 0) +
    (rooms.livingRooms ?? 0) +
    (rooms.garages ?? 0) +
    (rooms.wcs ?? 0) +
    (rooms.pools ?? 0);
  const bedrooms = rooms.bedrooms ?? 0;

  return breakdown.map((cat) => {
    if (cat.category !== "second_oeuvre" || !cat.items?.length) return cat;
    const items = cat.items;
    const hasEnduit = items.some((it: any) => isEnduitLissageName(it?.name));
    // Budget mobile du lot, HORS enduit de lissage : celui-ci est déjà corrigé
    // physiquement par le moteur BIM (kg → seaux). Sa quantité, son prix
    // unitaire et son montant ne sont jamais recalés ; les autres postes
    // conservent donc exactement leurs montants (hors correction portes /
    // fenêtres). Le total du lot diminue de l'écart réel de l'enduit.
    const budget = items.reduce(
      (s: number, it: any) =>
        s + (isEnduitLissageName(it?.name) ? 0 : Number(it.totalPrice) || 0),
      0,
    );

    // Applique les quantités réalistes par pièce (portes / fenêtres).
    let fixedTotal = 0;
    const fixedIdx: number[] = [];
    items.forEach((it: any, idx: number) => {
      const target = it.name ? DOOR_WINDOW_ITEMS[it.name] : undefined;
      if (!target) return;
      const qty = target(roomTotal, bedrooms);
      it.quantity = qty;
      it.totalPrice = Math.round(qty * (Number(it.unitPrice) || 0));
      fixedTotal += it.totalPrice;
      fixedIdx.push(idx);
    });
    if (!fixedIdx.length) return cat;

    // Répartit l'écart de budget sur les autres postes de la catégorie.
    const movable = items.filter(
      (it: any, i: number) => !fixedIdx.includes(i) && !isEnduitLissageName(it?.name),
    );
    const movableTotal = movable.reduce(
      (s: number, it: any) => s + (Number(it.totalPrice) || 0),
      0,
    );
    const scale =
      movableTotal > 0
        ? Math.max(0, (budget - fixedTotal) / movableTotal)
        : 1;
    for (const it of movable) {
      it.totalPrice = Math.round((Number(it.totalPrice) || 0) * scale);
    }

    const newTotal = items.reduce(
      (s: number, it: any) => s + (Number(it.totalPrice) || 0),
      0,
    );
    // Catégorie avec enduit : l'enveloppe budgétaire du lot reste la référence
    // (le total global et la somme des catégories ne bougent pas) ; le détail
    // des postes porte la quantité et le prix réels de l'enduit.
    if (typeof cat.estimatedCost === "number" && !hasEnduit) {
      cat.estimatedCost = newTotal;
    }
    return cat;
  });
}
