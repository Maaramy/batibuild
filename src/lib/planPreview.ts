import type { GeneratedPlan } from "@/convex/planEngine";

// ============================================================================
// Reconstruit un GeneratedPlan complet à partir de l'aperçu léger stocké dans
// les documents architecturalPlans (getMyPlans). Utilisé pour les miniatures
// des cartes (bibliothèque, dashboard) sans transporter les données lourdes.
// ============================================================================

export type PlanPreview = Partial<Omit<GeneratedPlan, "stats" | "scores">> & {
  stats: GeneratedPlan["stats"];
  scores: GeneratedPlan["scores"];
};

export function planPreviewToGeneratedPlan(preview: PlanPreview, name: string): GeneratedPlan {
  return {
    index: preview.index ?? 1,
    key: "saved",
    name,
    description: "",
    strengths: [],
    weaknesses: [],
    width: preview.width ?? 10,
    depth: preview.depth ?? 8,
    levels: preview.levels ?? 1,
    rooms: preview.rooms ?? [],
    doors: preview.doors ?? [],
    windows: preview.windows ?? [],
    stairs: preview.stairs ?? [],
    alerts: { incompatible: false, messages: [] },
    scores: preview.scores,
    stats: preview.stats,
  };
}
