import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

/** Étapes affichées pendant l'analyse — repères de progression lisibles. */
const LOADING_STEPS = [
  "Lecture des caractéristiques du projet…",
  "Croisement du catalogue 2026 et des offres fournisseurs…",
  "Calcul des coûts et classement des solutions…",
];

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

  // Étape courante de l'écran de chargement (déduite de la progression).
  const loadingStepIndex = Math.min(
    LOADING_STEPS.length - 1,
    Math.floor((Math.min(100, progress) / 100) * LOADING_STEPS.length),
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
          <div className="flex flex-col items-center justify-center py-16 text-center sm:py-24">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
                <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold tracking-tight">Analyse des matériaux en cours…</h2>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
              Croisement du catalogue 2026, des offres fournisseurs et de votre projet.
            </p>

            {/* Progression + repères d'étapes */}
            <div className="mt-6 w-full max-w-sm">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Progression</span>
                <span className="font-semibold tabular-nums">{Math.round(progress)} %</span>
              </div>

              <ul className="mt-4 space-y-1.5 text-left">
                {LOADING_STEPS.map((label, i) => {
                  const done = i < loadingStepIndex;
                  const current = i === loadingStepIndex;
                  return (
                    <li
                      key={label}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] transition-colors",
                        current
                          ? "border-emerald-500/40 bg-emerald-500/[0.06] font-medium text-foreground"
                          : done
                            ? "border-border/40 bg-muted/10 text-muted-foreground"
                            : "border-border/30 bg-background text-muted-foreground/70",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : current ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600" />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                      )}
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : !analysis ? (
          /* Analyse introuvable ou non autorisée */
          <Card className="mx-auto max-w-md rounded-2xl border-amber-500/25 bg-amber-500/[0.04]">
            <CardContent className="flex flex-col items-center px-5 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                <Info className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-base font-bold tracking-tight">Analyse introuvable</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Cette analyse n'existe pas ou n'est pas accessible avec votre compte.
              </p>
              <Button size="sm" className="mt-5" onClick={() => navigate("/dashboard/ai-materials")}>
                Retour à l'assistant matériaux
              </Button>
            </CardContent>
          </Card>
        ) : !result ? (
          /* Analyse sans recommandation enregistrée */
          <Card className="mx-auto max-w-md rounded-2xl border-amber-500/25 bg-amber-500/[0.04]">
            <CardContent className="flex flex-col items-center px-5 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                <Info className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-base font-bold tracking-tight">
                Analyse sans recommandation enregistrée
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Les résultats n'ont pas pu être reconstitués pour cette analyse.
              </p>
              <Button size="sm" className="mt-5" onClick={() => navigate("/dashboard/ai-materials")}>
                Relancer une analyse
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* ── Résultats ── */
          <AiAnalysisResults result={result} analysisRegion={result.context?.region} />
        )}
      </div>

            </ClientProPaywall>
</main>
  );
}
