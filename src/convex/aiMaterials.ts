import { query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ── Données projet pour l'IA Matériaux (source du besoin = DQE) ──────────────/ ** Poste de besoin extrait d'un lot du Quantitatif détaillé. */
export interface DqeNeedPoste {
  /** Libellé du lot / sous-lot (ex : « Fondations », « Murs porteurs »). */
  poste: string;
  /** Sous-poste (anciennement `sousLot`). */
  sousPoste?: string;
  designation: string;
  /** Unité du besoin calculé (m², m, sac, tonne…). */
  unit: string;
  /** Quantité calculée (après transformation du lot + calage de prix). */
  quantity: number;
  /** Total du besoin dans la monnaie du projet. */
  total: number;
  nature: "materiaux" | "main_oeuvre" | "equipements" | "transport" | "etudes";
}

/** Déroulé des besoins réellement calculés dans le DQE, par catégorie. */
export interface DqeNeedsByCategory {
  id: string;
  label: string;
  nature: string;
  needs: DqeNeedPoste[];
}

/** Données calculées à partir du projet pour le moteur Matériaux AI. */
export interface AiMaterialsProjectData {
  /** Pré-sélection proposée par l'IA depuis les besoins du DQE. */
  preSelectedMaterialIds: string[];
  needs: DqeNeedPoste[];
  needsByCategory: DqeNeedsByCategory[];
  totalDqeCost: number;
  referenceSurface: number;
  generatedAt: number;
}

export const getAiMaterialsProjectData = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<AiMaterialsProjectData | null> => {
    const project = await ctx.runQuery<any>(api.projects.getProject, { projectId: args.projectId });
    if (!project) return null;

    // Coût total du DQE (dérivé du coût estimatif si stocké, sinon 0).
    const dqeCost = project.costEstimate?.total ?? 0;

    // Déroulé des besoins par lot du DQE.
    const needsByCategory: DqeNeedsByCategory[] = (project.costEstimate?.dqe?.lots ?? []).map((lot: any) => ({
      id: lot.id,
      label: lot.name,
      nature: lot.nature,
      needs: lot.lines.map((line: any) => ({
        poste: lot.name,
        sousPoste: line.sousLot,
        designation: line.designation,
        unit: line.unit,
        quantity: line.quantity,
        total: line.total,
        nature: line.nature,
      })),
    }));

    return {
      preSelectedMaterialIds: [],
      needs: needsByCategory.flatMap((c) => c.needs),
      needsByCategory,
      totalDqeCost: dqeCost,
      referenceSurface: project.costEstimate?.dqe?.referenceSurface ?? 0,
      generatedAt: project.costEstimate?.dqe?.generatedAt ?? 0,
    };
  },
});

export type { ProjectContext } from "./aiMaterialsEngine";
