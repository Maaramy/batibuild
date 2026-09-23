/**
 * PAGE « MES PROJETS » — règles d'affichage (pures, testables).
 *
 * Aucune donnée n'est inventée ici : tout provient des champs réellement
 * enregistrés sur le projet (statut, surface, région, dates, documents, analyse
 * IA, coût estimatif, quantitatif, fournisseurs recommandés). Aucune copie de
 * projet n'est créée : la page se contente de lire la liste du propriétaire.
 *
 *   - **Filtres** : Tous · En cours · Terminés / réalisés · Archivés
 *     (les quatre statuts existants de la plateforme : `draft`, `analyzing`,
 *     `completed`, `archived`).
 *   - **Progression** : somme de jalons VÉRIFIABLES du dossier (documents
 *     importés, analyse IA, coût estimatif, quantitatif détaillé, fournisseurs
 *     recommandés). Un projet terminé atteint naturellement 100 %.
 *   - **Durée d'exécution** : celle estimée par l'analyse IA, si présente.
 */

import { REGION_LABELS } from "@/convex/investmentTypes";

/** Statuts réellement stockés sur un projet (schéma Convex). */
export type ProjectStatusKey = "draft" | "analyzing" | "completed" | "archived";

export interface ProjectStatusMeta {
  label: string;
  /** Couleurs de la pastille de statut (clair + sombre). */
  badge: string;
  /** Couleur d'accent de la carte (barre latérale + barre de progression). */
  accent: string;
}

export const PROJECT_STATUS_META: Record<string, ProjectStatusMeta> = {
  draft: {
    label: "Brouillon",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    accent: "bg-amber-500",
  },
  analyzing: {
    label: "Analyse en cours",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    accent: "bg-blue-500",
  },
  completed: {
    label: "Terminé",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    accent: "bg-emerald-500",
  },
  archived: {
    label: "Archivé",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
    accent: "bg-slate-500",
  },
};

/** Métadonnées de statut d'un projet (repli « Brouillon » si inconnu). */
export function projectStatusMeta(status: string | null | undefined): ProjectStatusMeta {
  return PROJECT_STATUS_META[status ?? ""] ?? PROJECT_STATUS_META.draft;
}

export type MyProjectsFilter = "all" | "active" | "completed" | "archived";

export interface MyProjectsFilterDef {
  key: MyProjectsFilter;
  label: string;
}

/** Filtres affichés dans la page, dans l'ordre. */
export const MY_PROJECTS_FILTERS: readonly MyProjectsFilterDef[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "En cours" },
  { key: "completed", label: "Terminés / réalisés" },
  { key: "archived", label: "Archivés" },
] as const;

/** Le projet correspond-il au filtre choisi ? */
export function projectMatchesFilter(
  project: { status?: string },
  filter: MyProjectsFilter,
): boolean {
  const status = project.status ?? "draft";
  if (filter === "all") return true;
  if (filter === "active") return status === "draft" || status === "analyzing";
  if (filter === "completed") return status === "completed";
  return status === "archived";
}

/** Nombre de projets par filtre (pour les compteurs des onglets). */
export function countByFilter(
  projects: { status?: string }[],
): Record<MyProjectsFilter, number> {
  return MY_PROJECTS_FILTERS.reduce(
    (acc, filter) => {
      acc[filter.key] = projects.filter((p) => projectMatchesFilter(p, filter.key)).length;
      return acc;
    },
    { all: 0, active: 0, completed: 0, archived: 0 } as Record<MyProjectsFilter, number>,
  );
}

/** Un jalon du dossier, avec son poids dans la progression. */
export interface ProjectMilestone {
  key: string;
  label: string;
  done: boolean;
  weight: number;
}

/** Champs du projet utilisés pour la progression (tous optionnels). */
export interface ProjectProgressInput {
  status?: string;
  files?: { name?: string; type?: string }[];
  aiAnalysis?: unknown;
  costEstimate?: unknown;
  dqe?: unknown;
  providerRecommendations?: unknown;
}

/**
 * Jalons réellement vérifiables sur un projet enregistré.
 * Le total des poids fait exactement 100.
 */
export function projectMilestones(project: ProjectProgressInput): ProjectMilestone[] {
  const files = project.files ?? [];
  return [
    {
      key: "documents",
      label: "Documents importés",
      done: files.length > 0,
      weight: 20,
    },
    {
      key: "analysis",
      label: "Analyse IA",
      done: Boolean(project.aiAnalysis),
      weight: 20,
    },
    {
      key: "estimate",
      label: "Coût estimatif",
      done: Boolean(project.costEstimate),
      weight: 25,
    },
    {
      key: "quantitatif",
      label: "Quantitatif détaillé",
      done: Boolean(project.dqe),
      weight: 20,
    },
    {
      key: "providers",
      label: "Fournisseurs recommandés",
      done: Boolean(project.providerRecommendations),
      weight: 15,
    },
  ];
}

export interface ProjectProgress {
  /** Progression en pourcentage (0-100), somme des jalons atteints. */
  percent: number;
  done: number;
  total: number;
  milestones: ProjectMilestone[];
}

/** Progression d'un projet, calculée uniquement sur ses données réelles. */
export function projectProgress(project: ProjectProgressInput): ProjectProgress {
  const milestones = projectMilestones(project);
  const percent = milestones.reduce((sum, m) => sum + (m.done ? m.weight : 0), 0);
  return {
    percent: Math.max(0, Math.min(100, percent)),
    done: milestones.filter((m) => m.done).length,
    total: milestones.length,
    milestones,
  };
}

/** Durée d'exécution estimée par l'analyse IA, si elle existe. */
export function projectDurationLabel(project: {
  aiAnalysis?: { estimatedDuration?: string } | null;
}): string | null {
  const label = project.aiAnalysis?.estimatedDuration?.trim();
  return label ? label : null;
}

/** Libellé de la région du projet (« Tunis », « Sousse »…), sinon `null`. */
export function projectRegionLabel(project: { region?: string | null }): string | null {
  const region = project.region?.trim();
  if (!region) return null;
  return REGION_LABELS[region] ?? region;
}

/** Date courte et lisible (jour + mois + année), fuseau local. */
export function formatProjectDate(timestamp: number | null | undefined): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Libellé de compteur de la pastille (« 3 », « 99+ »), `null` si aucun. */
export function badgeCountLabel(count: number | null | undefined): string | null {
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(Math.floor(count));
}
