/**
 * HISTORIQUE DES ANALYSES D'INVESTISSEMENT (Dashboard).
 *
 * Même rôle que `src/lib/aiMaterialsHistory.ts`, mais pour les documents
 * `investmentAnalyses` renvoyés par la requête existante
 * `api.investments.listAnalyses` (déjà utilisée par le Dashboard).
 *
 * Ce module ne fait que **lire** : aucun calcul d'investissement n'est refait,
 * aucune donnée n'est transformée. Les indicateurs (coût total, rendement net,
 * cashflow, score) sont repris tels quels depuis `results.indicators` /
 * `results.score` — les mêmes valeurs que celles affichées avant.
 *
 * Les fonctions sont pures, donc testables.
 */

import type { AnalysisHistoryStatus } from "./analysisHistory";

export type InvestmentHistoryEntry = {
  /** Identifiant réel de l'analyse (utilisé pour « Voir l'analyse »). */
  id: string;
  /** Nom donné à l'analyse, sinon le libellé du type de bien. */
  name: string;
  /** Horodatage d'origine, tel qu'enregistré. */
  createdAt: number;
  /** Type de bien (`villa`, `appartement`, …), `null` si absent. */
  investmentType: string | null;
  /** Région de l'analyse, `null` si absente. */
  region: string | null;
  /** Surface (m²), `null` si absente. */
  area: number | null;
  /** Horizon de projection (années), `null` si absent. */
  horizonYears: number | null;
  /** Score global d'investissement (/100), `null` si absent. */
  score: number | null;
  /** Coût total de l'opération (TND), `null` si absent. */
  totalCost: number | null;
  /** Rendement net annuel (%), `null` si absent. */
  netYieldPct: number | null;
  /** Cashflow mensuel (TND/mois), `null` si absent. */
  monthlyCashflow: number | null;
  /** Favori enregistré sur l'analyse. */
  isFavorite: boolean;
  status: AnalysisHistoryStatus;
  /** `true` si l'analyse contient des résultats exploitables (page de résultat). */
  hasResults: boolean;
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Construit l'entrée d'historique d'une analyse d'investissement enregistrée.
 *
 * @param doc document `investmentAnalyses` tel que renvoyé par `listAnalyses`
 */
export function buildInvestmentHistoryEntry(doc: any): InvestmentHistoryEntry {
  const ind = doc?.results?.indicators;
  const score = doc?.results?.score;
  const input = doc?.input ?? {};

  // Une analyse enregistrée contient toujours ses indicateurs ; sans eux, la
  // page de résultat n'a rien à afficher.
  const hasResults = Boolean(ind);
  const status: AnalysisHistoryStatus = hasResults ? "completed" : "error";

  const scoreTotal = asNumber(score?.total);

  return {
    id: String(doc?._id ?? ""),
    name: asOptionalString(input.name) ?? "",
    createdAt: typeof doc?.createdAt === "number" ? doc.createdAt : 0,
    investmentType: asOptionalString(input.investmentType),
    region: asOptionalString(input.region),
    area: asNumber(input.area),
    horizonYears: asNumber(input.horizonYears),
    score: scoreTotal === null ? null : Math.round(scoreTotal),
    totalCost: asNumber(ind?.totalCost),
    netYieldPct: asNumber(ind?.netYieldPct),
    monthlyCashflow: asNumber(ind?.monthlyCashflow),
    isFavorite: Boolean(doc?.isFavorite),
    status,
    hasResults,
  };
}
