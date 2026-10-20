/**
 * REGISTRE CENTRAL DES RAPPORTS PDF
 *
 * Source unique décrivant chaque module de batibuild capable de produire un
 * rapport PDF : nom, icône, feature flag de l'administration, types de projets
 * compatibles, route du module et état d'exécution. La page « Rapports PDF »
 * est entièrement générée à partir de ce registre : ajouter un module ici
 * l'intègre automatiquement à la page, sans dupliquer de logique dans les
 * cartes projet.
 *
 * Aucune donnée n'est inventée : l'état de chaque rapport est déduit des
 * données réellement enregistrées sur le projet (`costEstimate`, `surface`) et
 * des artefacts persistés côté serveur (`aiMaterialAnalyses`,
 * `projectRoadmaps`). Voir `src/convex/reportCenter.ts`.
 */

import {
  Calculator,
  HardHat,
  Ruler,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { projectJourneyGroup, type ProjectJourneyGroup } from "./projectJourney";

/** Identifiant d'un module du registre. */
export type ReportModuleKey =
  | "cost"
  | "plans"
  | "materials"
  | "execution";

/**
 * État d'exécution d'un rapport — toujours dérivé de données réelles.
 * `generating` et `error` sont des états transitoires d'interface (téléchargement).
 */
export type ReportStatus = "available" | "not_executed" | "generating" | "error";

export interface ReportModuleDef {
  key: ReportModuleKey;
  /** Nom affiché de la fonctionnalité. */
  label: string;
  /** Courte description affichée sous le nom (facultative à l'usage). */
  description: string;
  /** Icône (famille lucide, comme le reste de la plateforme). */
  icon: LucideIcon;
  /** Clé de feature flag pilotée par l'administration. */
  flag: string;
  /** Route du module, contexte du projet inclus (aucun identifiant perdu). */
  buildHref: (projectId: string) => string;
  /** Disponibilité selon le type de projet (tous les types par défaut). */
  appliesTo?: (category: string | null | undefined) => boolean;
}

const projectId = (id: string) => encodeURIComponent(id);

/**
 * Registre des modules. L'ordre du tableau est l'ordre d'affichage dans la page.
 * Pour ajouter un module : ajouter une entrée ici (+ son rapport disponible).
 */
export const REPORT_MODULES: readonly ReportModuleDef[] = [
  {
    key: "cost",
    label: "Coût estimatif",
    description: "Devis estimatif complet — matériaux, main-d'œuvre, récapitulatif.",
    icon: Calculator,
    flag: "construction_cost_estimation",
    buildHref: (id) => `/dashboard/project/${projectId(id)}`,
  },
  {
    key: "plans",
    label: "Plan IA",
    description: "Plan d'architecte 2D / 3D généré pour le projet.",
    icon: Ruler,
    flag: "architectural_plans",
    buildHref: (id) => `/dashboard/plans/${projectId(id)}`,
  },
  {
    key: "materials",
    label: "Matériaux AI",
    description: "Recommandations de matériaux, optimisation budgétaire et performance.",
    icon: Sparkles,
    flag: "ai_materials",
    buildHref: (id) => `/dashboard/ai-materials?project=${projectId(id)}`,
  },
  {
    key: "execution",
    label: "Exécution & suivi",
    description: "Guide construction A-Z — planning prévisionnel et suivi du chantier.",
    icon: HardHat,
    flag: "construction_guide",
    buildHref: (id) => `/dashboard/guide?project=${projectId(id)}`,
  },
] as const;

/** Champs du projet utilisés pour déduire l'état des rapports. */
export interface ProjectReportInput {
  _id: string;
  category?: string | null;
  surface?: number | null;
  costEstimate?: unknown;
}

/** Artefacts persistés côté serveur (`reportCenter.getMyReportArtifacts`). */
export interface ProjectReportArtifacts {
  materialsAnalysisId?: string | null;
  roadmapId?: string | null;
}

/** État de chaque rapport d'un projet, déduit uniquement de données réelles. */
export function reportStatuses(
  project: ProjectReportInput,
  artifacts: ProjectReportArtifacts | undefined,
): Record<ReportModuleKey, ReportStatus> {
  const hasDimensions = typeof project.surface === "number" && project.surface > 0;
  return {
    cost: project.costEstimate ? "available" : "not_executed",
    // Le plan IA est composé de façon déterministe à partir des dimensions du
    // projet : il est disponible dès que le projet porte une surface.
    plans: hasDimensions ? "available" : "not_executed",
    materials: artifacts?.materialsAnalysisId ? "available" : "not_executed",
    execution: artifacts?.roadmapId ? "available" : "not_executed",
  };
}

/**
 * RÈGLE D'AFFICHAGE DU RAPPORT PDF SELON LE GROUPE DU PROJET
 *
 * Le groupe est déduit automatiquement du type de projet enregistré
 * (`projectJourneyGroup`) : aucune sélection manuelle de l'utilisateur n'est
 * requise. Chaque section correspond à une étape réellement présente dans le
 * parcours du groupe — aucune section vide ni place-holder.
 *
 *   • **Groupe A** — rapport PDF complet : toutes les fonctionnalités du
 *     parcours réellement activées et compatibles avec le type de projet
 *     (Coût estimatif, Plan IA, Matériaux AI, Exécution).
 *   • **Groupes B et C** — rapport d'estimation uniquement : seule la section
 *     « Coût estimatif » est présente. Leur parcours se limite au coût
 *     estimatif puis à la mise en relation : ni Plan IA, ni Exécution & suivi.
 *
 * L'ordre du tableau suit celui du registre : le filtre retire les sections,
 * il n'en crée jamais.
 */
export const REPORT_MODULE_KEYS_BY_GROUP: Record<ProjectJourneyGroup, readonly ReportModuleKey[]> = {
  A: ["cost", "plans", "materials", "execution"],
  B: ["cost"],
  C: ["cost"],
};

/** Clés des sections du rapport PDF autorisées pour un groupe de projet. */
export function reportModuleKeysForGroup(
  group: ProjectJourneyGroup,
): readonly ReportModuleKey[] {
  return REPORT_MODULE_KEYS_BY_GROUP[group];
}

/**
 * Modules réellement affichables pour un projet :
 *   - masqués si leur section n'est pas autorisée pour le groupe du projet
 *     (groupes B et C → Coût estimatif uniquement) ;
 *   - masqués si leur feature flag est désactivé par l'administration ;
 *   - masqués s'ils ne s'appliquent pas au type de projet.
 */
export function visibleReportModules(
  isFeatureEnabled: (flag: string) => boolean,
  category: string | null | undefined,
): ReportModuleDef[] {
  const allowedKeys = reportModuleKeysForGroup(projectJourneyGroup(category));
  return REPORT_MODULES.filter(
    (module) =>
      allowedKeys.includes(module.key) &&
      isFeatureEnabled(module.flag) &&
      (!module.appliesTo || module.appliesTo(category)),
  );
}

/** Nombre de rapports réellement disponibles pour un projet. */
export function countAvailableReports(
  modules: readonly ReportModuleDef[],
  statuses: Record<ReportModuleKey, ReportStatus>,
): number {
  return modules.filter((module) => statuses[module.key] === "available").length;
}

/** Libellé lisible d'un état de rapport. */
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  available: "Disponible",
  not_executed: "Non exécuté",
  generating: "Génération…",
  error: "Erreur",
};

/** Message affiché lorsqu'un rapport n'est pas encore disponible. */
export function reportUnavailableMessage(label: string): string {
  return `Ce rapport n'est pas encore disponible. Veuillez d'abord exécuter le module ${label}.`;
}
