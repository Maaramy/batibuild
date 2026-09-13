/**
 * HISTORIQUE DES ANALYSES — MATÉRIAUX AI (page Assistant Matériaux IA).
 *
 * Ce module ne touche à AUCUNE logique métier : il ne fait que **lire** les
 * documents déjà renvoyés par la requête existante `api.aiMaterials.getCopilotAnalyses`
 * et en extraire ce que la carte d'historique doit afficher (nom du projet, date,
 * nombre de matériaux analysés, statut, résumé de coût).
 *
 * Les compteurs reprennent exactement les formules déjà utilisées ailleurs dans
 * la plateforme :
 *   - « matériaux analysés » = somme des `candidatesCount` des catégories,
 *     la même valeur que « Références examinées » du rapport PDF matériaux
 *     (`src/lib/materialReportPdf.ts`) ;
 *   - coût = `results.recommend.cost.total` (inchangé).
 *
 * Aucun identifiant, aucune date, aucun résultat n'est recalculé ou transformé :
 * les fonctions sont pures et donc testables.
 */

import {
  ANALYSIS_STATUS_LABEL,
  type AnalysisHistoryStatus,
} from "./analysisHistory";

/** Statuts affichés par le badge de la carte d'historique. */
export type AiMaterialsHistoryStatus = AnalysisHistoryStatus;

export type AiMaterialsHistoryEntry = {
  /** Identifiant réel de l'analyse (utilisé pour « Voir l'analyse »). */
  id: string;
  /** Nom du projet analysé, ou « Analyse manuelle » si l'analyse n'en a pas. */
  projectName: string;
  /** Horodatage d'origine, tel qu'enregistré. */
  createdAt: number;
  /** Nombre de matériaux examinés (somme des `candidatesCount`), `null` si absent. */
  materialCount: number | null;
  /** Nombre de catégories retenues pour l'analyse. */
  categoryCount: number;
  /** Budget matériaux estimé (TTC), `null` si l'analyse n'en a pas. */
  totalCost: number | null;
  /** Surface analysée (m²), `null` si absente. */
  surface: number | null;
  /** Région de l'analyse, `null` si absente. */
  region: string | null;
  /** Niveau de gamme (`economique` / `equilibre` / `premium`), `null` si absent. */
  standing: string | null;
  status: AiMaterialsHistoryStatus;
  /** `true` si l'analyse contient une recommandation exploitable (page de résultat). */
  hasRecommendation: boolean;
};

export const AI_MATERIALS_STATUS_LABEL: Record<AiMaterialsHistoryStatus, string> = ANALYSIS_STATUS_LABEL;

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Somme des matériaux examinés par catégorie — même formule que le rapport PDF. */
export function countMaterialsAnalyzed(categories: unknown): number | null {
  if (!Array.isArray(categories) || categories.length === 0) return null;
  let total = 0;
  let found = false;
  for (const cat of categories as Array<{ candidatesCount?: unknown }>) {
    const n = asNumber(cat?.candidatesCount);
    if (n !== null) {
      total += n;
      found = true;
    }
  }
  return found ? total : null;
}

/**
 * Construit l'entrée d'historique d'une analyse enregistrée.
 *
 * @param doc document `aiMaterialAnalyses` tel que renvoyé par la requête existante
 * @param currentAnalysisId identifiant de l'analyse actuellement chargée dans la
 *   session (état `savedId` existant) — l'analyse correspondante est marquée « En cours »
 */
export function buildAiMaterialsHistoryEntry(
  doc: any,
  currentAnalysisId?: string | null,
): AiMaterialsHistoryEntry {
  const recommend = doc?.results?.recommend;
  const categories: unknown = recommend?.categories;
  const categoryCount = Array.isArray(categories) ? categories.length : 0;
  const error = recommend?.error ?? doc?.results?.error;

  let status: AiMaterialsHistoryStatus = "completed";
  if (error) status = "error";
  else if (!recommend) status = "error";
  else if (currentAnalysisId && doc?._id === currentAnalysisId) status = "running";

  const context = doc?.input?.context;

  return {
    id: String(doc?._id ?? ""),
    projectName: context?.projectName || "Analyse manuelle",
    createdAt: typeof doc?.createdAt === "number" ? doc.createdAt : 0,
    materialCount: countMaterialsAnalyzed(categories),
    categoryCount,
    totalCost: asNumber(recommend?.cost?.total),
    surface: asNumber(context?.surface),
    region: typeof context?.region === "string" && context.region ? context.region : null,
    standing: typeof context?.standing === "string" && context.standing ? context.standing : null,
    status,
    hasRecommendation: Boolean(recommend),
  };
}

export type AiMaterialsHistoryFilter = {
  /** Recherche libre (nom du projet, région, gamme). */
  query?: string;
  /** Statut retenu, ou `"all"` / absent pour tout afficher. */
  status?: AiMaterialsHistoryStatus | "all";
};

/** Normalise une chaîne pour une recherche insensible à la casse et aux accents. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Filtrage **purement côté interface** de la liste déjà récupérée : aucune
 * requête supplémentaire, aucune donnée modifiée.
 */
export function filterAiMaterialsHistory(
  entries: AiMaterialsHistoryEntry[],
  filter: AiMaterialsHistoryFilter = {},
): AiMaterialsHistoryEntry[] {
  const query = normalizeSearchText(filter.query ?? "");
  const status = filter.status && filter.status !== "all" ? filter.status : null;

  return entries.filter((entry) => {
    if (status && entry.status !== status) return false;
    if (!query) return true;
    const haystack = normalizeSearchText(
      [entry.projectName, entry.region ?? "", entry.standing ?? ""].join(" "),
    );
    return haystack.includes(query);
  });
}
