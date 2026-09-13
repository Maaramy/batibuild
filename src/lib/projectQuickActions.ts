import { investmentTypeForProject } from "@/convex/projectTypes";

/**
 * ACCÈS RAPIDES D'UN PROJET (liste des projets du Dashboard).
 *
 * Construit les 4 liens vers les modules liés à un projet :
 *
 *   - **Matériaux** → `/dashboard/ai-materials?project=…` : la page de l'assistant
 *     Matériaux IA s'ouvre avec le projet déjà sélectionné ;
 *   - **ROI** → le **résultat d'investissement du projet** s'il existe déjà
 *     (`/dashboard/investments/result/:id`), sinon la page d'analyse
 *     d'investissement **pré-remplie** avec les données du projet (nom, type,
 *     coût de construction estimé, surface, région) et liée au projet ;
 *   - **Expert** → `/dashboard/professionals-directory?project=…` : la liste des
 *     experts s'ouvre avec le contexte du projet (elle charge le projet et
 *     pré-remplit les demandes de devis / service) ;
 *   - **Plan AI** → `/dashboard/plans/:id` : le générateur de plans du projet.
 *
 * Les routes sont celles qui EXISTENT déjà (`src/main.tsx`) : aucune page n'est
 * créée ni dupliquée, aucun calcul n'est refait ici. La fonction est pure et
 * sans dépendance React, donc testable telle quelle.
 */

export type ProjectQuickActionKey = "materials" | "roi" | "expert" | "plan";

export type ProjectQuickAction = {
  key: ProjectQuickActionKey;
  label: string;
  href: string;
  /** État transmis au routeur (analyse d'investissement pré-remplie). */
  state?: { prefill: Record<string, unknown>; projectId: string };
  /** Classes Tailwind de survol (teinte propre au module). */
  tone: string;
};

/** Sous-ensemble des champs du projet utilisés pour construire les liens. */
export type ProjectForQuickActions = {
  _id: string;
  name?: string;
  category?: string;
  region?: string;
  surface?: number;
  costEstimate?: { totalCost?: number } | null;
};

const TONES = {
  materials:
    "hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400",
  roi: "hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400",
  expert:
    "hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400",
  plan: "hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400",
} as const;

export function buildProjectQuickActions(
  project: ProjectForQuickActions,
  linkedAnalysisId?: string,
): ProjectQuickAction[] {
  const investmentType = investmentTypeForProject(project.category ?? "appartement");

  return [
    {
      key: "materials",
      label: "Matériaux",
      href: `/dashboard/ai-materials?project=${project._id}`,
      tone: TONES.materials,
    },
    {
      key: "roi",
      label: "ROI",
      href: linkedAnalysisId
        ? `/dashboard/investments/result/${linkedAnalysisId}`
        : `/dashboard/investments?type=${investmentType}&project=${project._id}`,
      // Sans analyse enregistrée : l'analyse s'ouvre déjà remplie avec le projet.
      state: linkedAnalysisId
        ? undefined
        : {
            prefill: {
              name: project.name || undefined,
              investmentType,
              purchasePrice: Math.round(project.costEstimate?.totalCost ?? 0),
              area: project.surface ?? undefined,
              region: project.region ?? "tunis",
              city: "",
              quartier: "",
              rentMode: "mensuel",
              rentAmount: 1500,
              monthlyRent: 1500,
              occupancyRate: 95,
              annualCharges: 1200,
              insurance: 300,
              managementFees: 0,
              taxationPct: 10,
              renovationCost: 0,
              financingFees: 0,
              agencyFees: 0,
              furnishingCost: 0,
              acquisitionFeesPct: 6,
              annualAppreciationPct: 5,
              rentGrowthPct: 5,
              inflationPct: 6,
              horizonYears: 10,
            },
            projectId: project._id,
          },
      tone: TONES.roi,
    },
    {
      key: "expert",
      label: "Expert",
      href: `/dashboard/professionals-directory?project=${project._id}`,
      tone: TONES.expert,
    },
    {
      key: "plan",
      label: "Plan AI",
      href: `/dashboard/plans/${project._id}`,
      tone: TONES.plan,
    },
  ];
}
