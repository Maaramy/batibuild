// ── Alignement du « Quantitatif détaillé » ──────────────────────────────────
// La section « Quantitatif détaillé » est la référence unique des prix et des
// pourcentages de la page de résultats. Les trois sections (Répartition,
// Détail par catégorie, Quantitatif) doivent afficher STRICTEMENT les mêmes
// totaux, prix et pourcentages — sans ligne « Imprévus ».
//
// Les lots DQE sont parfois calibrés sur un budget incluant les imprévus
// (projets générés avant l'alignement). On les réaligne donc sur la base de la
// grille (somme des catégories) pour que le total du quantitatif soit
// exactement égal à celui de « Répartition » et de « Détail par catégorie ».

export interface AlignedDqe {
  lots: any[];
  /** Facteur appliqué (1 si déjà aligné sur la base). */
  factor: number;
  /** Total après alignement (somme des sous-totaux de lots). */
  total: number;
}

/**
 * Réaligne des lots DQE (déjà scalés pour le scénario) sur la base de la
 * grille tarifaire : `baseTotal` = somme des catégories affichées dans
 * « Répartition » / « Détail par catégorie ».
 */
export function alignDqeToBase(dqeLots: any[], baseTotal: number): AlignedDqe {
  const target = baseTotal > 0 ? baseTotal : 0;
  const raw = (dqeLots ?? []).map((lot: any) => ({
    ...lot,
    lines: [...(lot.lines ?? [])],
  }));
  const rawTotal = raw.reduce((s: number, lot: any) => s + (lot.subtotal || 0), 0);
  const factor = target > 0 && rawTotal > 0 ? target / rawTotal : 1;
  const lots = raw.map((lot: any) => ({
    ...lot,
    subtotal: Math.round((lot.subtotal || 0) * factor),
    lines: lot.lines.map((line: any) => {
      const total = Math.round((line.total || 0) * factor);
      const quantity = Math.max(1, line.quantity || 1);
      return {
        ...line,
        total,
        unitPrice: Math.round((total / quantity) * 100) / 100,
      };
    }),
  }));
  const total = lots.reduce((s: number, lot: any) => s + lot.subtotal, 0);
  return { lots, factor, total };
}
