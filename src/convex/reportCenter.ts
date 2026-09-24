import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// CENTRE DE RAPPORTS PDF — DISPONIBILITÉ RÉELLE DES RAPPORTS
// ----------------------------------------------------------------------------
// Une seule requête agrégée et STRICTEMENT PRIVÉE : elle ne renvoie que les
// projets de l'utilisateur connecté (aucun identifiant n'est accepté en
// argument, donc aucun projet d'un autre utilisateur ne peut être demandé).
//
// Le statut de chaque rapport est déduit des DONNÉES RÉELLEMENT ENREGISTRÉES :
//   • Coût estimatif / Quantitatif détaillé → `costEstimate` / `dqe` du projet ;
//   • Matériaux AI      → une analyse `aiMaterialAnalyses` du couple
//                         (utilisateur, projet) ;
//   • Intelligence prédictive → une analyse `investmentAnalyses` du projet ;
//   • Exécution & suivi → une feuille de route `projectRoadmaps` du projet.
//
// Aucun rapport n'est inventé : la page ne peut donc jamais afficher « PDF
// disponible » si le module correspondant n'a pas réellement été exécuté.
// ============================================================================

export const getMyReportArtifacts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return await Promise.all(
      projects.map(async (project) => {
        const [materials, roadmap, investment] = await Promise.all([
          ctx.db
            .query("aiMaterialAnalyses")
            .withIndex("by_user_project", (q) =>
              q.eq("userId", user._id).eq("projectId", project._id),
            )
            .order("desc")
            .first(),
          ctx.db
            .query("projectRoadmaps")
            .withIndex("by_user_project", (q) =>
              q.eq("userId", user._id).eq("projectId", project._id),
            )
            .first(),
          ctx.db
            .query("investmentAnalyses")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("projectId"), project._id))
            .order("desc")
            .first(),
        ]);

        return {
          projectId: project._id,
          materialsAnalysisId: materials?._id ?? null,
          roadmapId: roadmap?._id ?? null,
          investmentAnalysisId: investment?._id ?? null,
        };
      }),
    );
  },
});
