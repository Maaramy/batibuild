import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { Loader2, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { categorySpecialties } from "@/lib/supplierMatch";
import { ClientProPaywall } from "@/components/ClientProPaywall";
import type { RecommendResult } from "@/convex/aiMaterialsEngine";
import { AiAnalysisResults } from "@/components/ai/AiAnalysisResults";
import { usePageSEO } from "@/hooks/use-page-seo";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { buildAiMaterialsResultJourney } from "@/lib/projectJourney";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

/** Durée fixe de l'écran de chargement : 3 secondes. */
const LOADING_DURATION_MS = 3000;

export default function AiMaterialsResult() {
  usePageSEO({
    title: "Résultat de l'analyse IA - batibuild",
    description: "Résultats de votre analyse de matériaux par IA : recommandation, coût estimatif et fournisseurs.",
  });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { flags: journeyFlags } = useFeatureFlags();

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Écran de chargement fixe de 3 secondes
  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / LOADING_DURATION_MS) * 100));
    }, 50);
    const timer = setTimeout(() => {
      setLoading(false);
      clearInterval(tick);
    }, LOADING_DURATION_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, []);

  const analysis = useQuery(
    api.aiMaterials.getCopilotAnalysis,
    loading || !id ? "skip" : { analysisId: id as any },
  );

  // Projet d'origine de l'analyse — contexte du parcours du projet.
  const journeyProject = useQuery(
    api.projects.getProject,
    analysis?.projectId ? { projectId: analysis.projectId } : "skip",
  );

  const result: RecommendResult | null = (analysis?.results?.recommend as RecommendResult) ?? null;

  // Lien annuaire pré-filtré : région du projet + spécialités fournisseurs
  // correspondant aux catégories de matériaux analysées (contexte projet
  // conservé pour la barre d'étapes).
  const suppliersDirectoryHref = (() => {
    const params = new URLSearchParams();
    if (analysis?.projectId) params.set("project", analysis.projectId);
    if (!result) return `/dashboard/suppliers-directory?${params.toString()}`;
    params.set("from", "materials");
    if (result.context?.region) params.set("region", result.context.region);
    const specs = categorySpecialties(result.categories.map((c) => c.categoryId));
    if (specs.length > 0) params.set("specialty", specs.join(","));
    return `/dashboard/suppliers-directory?${params.toString()}`;
  })();

  // Les résultats sont réellement disponibles (chargement terminé, analyse,
  // recommandation et projet d'origine connus) : la barre d'étapes n'est
  // affichée qu'à ce moment-là, jamais pendant le rechargement des résultats.
  // Son ordre (Coût estimatif → Liste prix → Fournisseur) ne dépend pas du type
  // de projet.
  const journeyReady =
    !loading && analysis != null && result != null && journeyProject !== undefined;

  const journeySteps = useMemo(
    () =>
      journeyReady
        ? buildAiMaterialsResultJourney(analysis?.projectId ?? null, suppliersDirectoryHref, journeyFlags)
        : [],
    [journeyReady, analysis?.projectId, suppliersDirectoryHref, journeyFlags],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-10">
        <ClientProPaywall>
      {/* En-tête : l'en-tête projet unifié du JourneyNav remplace l'ancien
          en-tête de fonctionnalité (« Résultat de l'analyse IA »). */}
      {/* Journey du projet — masqué tant que les résultats ne sont pas affichés :
          coût estimatif, liste des prix, puis fournisseurs trouvés par l'analyse. */}
      <ProjectJourneyNav
        steps={journeySteps}
        projectId={analysis?.projectId ?? null}
        activeKey="priceList"
        featureLabel="Résultat de l'analyse IA"
        maxWidthClassName="max-w-7xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-5 space-y-5">
        {/* ── Écran de chargement (3 secondes) ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30">
                <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold tracking-tight">Analyse des matériaux en cours…</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              Croisement du catalogue 2026, des offres fournisseurs et de votre projet — cela ne prend que quelques instants.
            </p>
            {/* Barre de progression */}
            <div className="mt-6 w-64 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : !analysis ? (
          /* Analyse introuvable ou non autorisée */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
              <Info className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Analyse introuvable</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              Cette analyse n'existe pas ou n'est pas accessible avec votre compte.
            </p>
            <Button size="sm" className="mt-4" onClick={() => navigate("/dashboard/ai-materials")}>
              Retour à l'assistant matériaux
            </Button>
          </div>
        ) : !result ? (
          /* Analyse sans recommandation */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
              <Info className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Analyse sans recommandation enregistrée</h2>
            <Button size="sm" className="mt-4" onClick={() => navigate("/dashboard/ai-materials")}>
              Relancer une analyse
            </Button>
          </div>
        ) : (
          /* ── Résultats (structure et design conservés) ── */
          <AiAnalysisResults result={result} analysisRegion={result.context?.region} />
        )}

        {/* Pied de page */}
        <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Les prix ne sont jamais inventés : toutes les valeurs proviennent du catalogue 2026 et des offres fournisseurs (données datées).
          </span>
          <span className="flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Pour les éléments structurels, la validation d'un professionnel qualifié reste requise.
          </span>
        </div>
      </div>

            </ClientProPaywall>
</main>
  );
}
