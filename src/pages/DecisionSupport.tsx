// ============================================================================
// AIDE À LA DÉCISION — page dédiée (copilote budget & achats)
// ----------------------------------------------------------------------------
// Page individuelle du parcours du projet (groupe A, étape n°2). Elle affiche
// le module de budget (« Capacité de construction ») sur les données déjà
// enregistrées du projet — aucune analyse n'est relancée ici.
//
// Le module a été RETIRÉ de la page de résultat « Coût estimatif » : il n'est
// plus affiché en extension du résultat, mais uniquement sur cette page,
// atteignable depuis l'étape « Aide à la décision » du Journey.
//
// Le coût total du scénario retenu (même valeur que « Coût estimatif ») est
// déduit du scénario persisté du projet ; il sert de contexte au module pour le
// risque de dépassement et les simulations. Le module gère lui-même son état de
// chargement, sa mise en cache et son accès réservé au forfait Client Pro.
// ============================================================================

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "convex/react";
import { Building2, Info, Loader2, MapPin, Ruler } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { DecisionSupportModule } from "@/components/decision/DecisionSupportModule";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageSEO } from "@/hooks/use-page-seo";
import { projectTypeLabel } from "@/convex/projectTypes";
import { REGION_LABELS } from "@/lib/projectPdf";
import {
  BUDGET_SCENARIO_LABELS,
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
  type BudgetScenarioKey,
} from "@/convex/quantitatifCustomLogic";
import type { Id } from "@/convex/_generated/dataModel";
import { withRealConstructionCost } from "@/lib/investmentPrefill";
import type { ScenarioTotal } from "@/lib/constructionPlanEngine";

const SCENARIO_KEYS: BudgetScenarioKey[] = ["economique", "standard", "premium"];

export default function DecisionSupport() {
  usePageSEO({
    title: "Aide à la décision - batibuild",
    description:
      "Intelligence prédictive IA : anticipez vos achats, maîtrisez votre budget et réduisez les pertes de votre projet de construction.",
  });

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project = useQuery(
    api.projects.getProject,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );

  // ── Coût des scénarios — MÊME source ET MÊME correction que le résultat
  // « Coût de construction » (étape du parcours) : la page résultat retire la
  // majoration d'imprévus des anciennes estimations (`contingencyPercentage`,
  // ≈ 8 %) avant d'afficher totaux et scénarios. On passe par le même helper
  // partagé (`withRealConstructionCost`), donc les montants affichés ici sont
  // IDENTIQUES à ceux du résultat (Standard = même montant affiché, aucune
  // double application du facteur).
  const ce = withRealConstructionCost(project?.costEstimate);

  const scenarios = ce?.budgetScenarios;
  const persistedScenario = project?.selectedScenario;
  const scenarioKey: BudgetScenarioKey =
    typeof persistedScenario === "string" &&
    (SCENARIO_KEYS as string[]).includes(persistedScenario)
      ? (persistedScenario as BudgetScenarioKey)
      : "standard";
  const scenarioSel = scenarios?.[scenarioKey];
  const projectTotal = scenarioSel?.totalCost ?? ce?.totalCost ?? 0;
  const scenarioLabel = scenarioSel?.label ?? BUDGET_SCENARIO_LABELS[scenarioKey];

  // Scénario « Personnalisé » : montant du scénario de référence (logique
  // identique à la page résultat), affiché seulement s'il porte des
  // modifications.
  const customization = useQuery(
    api.quantitatifCustom.getCustomization,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );

  // Totaux des 4 solutions (Économique / Standard / Premium / Personnalisé)
  // → comparaison dans le module « Capacité de construction ».
  const scenarioTotals = useMemo<ScenarioTotal[]>(() => {
    if (!scenarios) return [];
    const rows: ScenarioTotal[] = SCENARIO_KEYS.map((key) => ({
      key,
      label: scenarios[key]?.label ?? BUDGET_SCENARIO_LABELS[key],
      totalCost: Number(scenarios[key]?.totalCost) || 0,
      selected: key === scenarioKey,
    })).filter((row) => row.totalCost > 0);

    const baseKey = (customization?.baseScenario ?? "standard") as BudgetScenarioKey;
    const modifiedCount = Number(customization?.modifiedCount) || 0;
    const baseTotal = Number(scenarios?.[baseKey]?.totalCost) || 0;
    if (modifiedCount > 0 && baseTotal > 0) {
      rows.push({
        key: PERSONALIZED_SCENARIO_KEY,
        label: PERSONALIZED_SCENARIO_LABEL,
        totalCost: baseTotal,
        selected: false,
      });
    }
    return rows;
  }, [scenarios, scenarioKey, customization]);

  const builtSurface = project?.surface
    ? project.surface * (project.floors || 1)
    : 0;
  const regionLabel = project?.region
    ? REGION_LABELS[project.region] ?? project.region
    : undefined;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* Parcours du projet — l'étape « Aide à la décision » est mise en avant
          (route dédiée), avec « Étape précédente : Coût estimatif » et
          « Suivant → : Plans architecturaux AI ». */}
      <ProjectJourneyNav
        projectId={id}
        category={project?.category}
        featureLabel="Aide à la décision"
        maxWidthClassName="max-w-7xl"
      />

      <div className="mx-auto mt-5 max-w-7xl space-y-5 px-4 sm:px-6">
        {project === undefined ? (
          /* ── Chargement du projet ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-xs text-muted-foreground">
              Chargement du projet…
            </p>
          </div>
        ) : project === null ? (
          /* ── Projet introuvable ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Info className="mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="text-base font-semibold">Projet introuvable</h2>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              Ce projet n'existe pas ou n'est pas accessible.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Retour au tableau de bord
            </Button>
          </div>
        ) : (
          <>
            {/* ── Bandeau synthèse projet ── */}
            <Card className="border-primary/15 bg-gradient-to-r from-primary/[0.06] to-transparent">
              <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight">
                      {project.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {projectTypeLabel(project.category)}
                    </p>
                  </div>
                </div>
                <SynthStat
                  icon={Ruler}
                  label="Surface"
                  value={builtSurface ? `${builtSurface} m²` : "—"}
                />
                <SynthStat icon={MapPin} label="Région" value={regionLabel ?? "—"} />
                <SynthStat label="Scénario" value={scenarioLabel} />
              </CardContent>
            </Card>

            {/* ── Module budget / capacité de construction ── */}
            <DecisionSupportModule
              projectId={project._id}
              projectName={project.name}
              projectTypeLabel={projectTypeLabel(project.category)}
              regionLabel={regionLabel}
              surface={builtSurface}
              projectTotal={projectTotal}
              scenarioLabel={scenarioLabel}
              scenarioTotals={scenarioTotals.length > 0 ? scenarioTotals : undefined}
            />
          </>
        )}
      </div>
    </main>
  );
}

function SynthStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-xs font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
