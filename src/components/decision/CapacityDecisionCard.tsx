// ============================================================================
// AIDE À LA DÉCISION — « Capacité de construction » : module d'aide à la
// décision (sélection de travaux, % global, plan de construction, priorisation
// IA, simulations de budget, comparaison des scénarios d'estimation).
// ----------------------------------------------------------------------------
// Ce module répond à la question : « Avec mon budget actuel, qu'est-ce que je
// peux réellement construire, jusqu'où puis-je aller et quels travaux dois-je
// prioriser ? ».
//
// • Tous les montants viennent du Quantitatif (`BudgetAnalysis`) — aucun
//   montant ni pourcentage n'est codé en dur ;
// • le cœur de calcul est `constructionPlanEngine` (testé) ;
// • la sélection de travaux, les travaux personnalisés et le détail repliable
//   sont gérés localement ici.
// ============================================================================

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Hammer,
  Info,
  Plus,
  Sparkles,
  Sun,
  Wallet,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomWorkIcon } from "@/components/CustomWorkIcon";
import { CircularProgress } from "@/components/decision/CircularProgress";
import {
  CUSTOM_WORK_CATALOG,
  SOLAR_PANEL_COUNT_OPTIONS,
  SOLAR_PANEL_DEFAULT_COUNT,
  SOLAR_PANEL_TYPE,
  getCustomWorkDef,
  type CustomWorkKey,
} from "@/lib/customWorksCatalog";
import type { CustomWorkEstimate, CustomWorkNature } from "@/convex/customWorksEngine";
import {
  formatPercent,
  formatTndAmount,
  type BudgetAnalysis,
  type BudgetStatus,
  type QuantitatifLot,
} from "@/lib/budgetEngine";
import {
  buildConstructionPlan,
  compareScenarioCapacity,
  customWorkRank,
  deriveWorks,
  estimateBuildableSurface,
  planBudgetSteps,
  type ScenarioTotal,
  type WorkItem,
  type WorkPart,
  type WorkPartSource,
} from "@/lib/constructionPlanEngine";
import {
  resolveWorkLevels,
  type PlanArticleLike,
} from "@/lib/planWorkLevels";

// ── Helpers visuels (reprises du module budget) ────────────────────────────

const STATUS_META: Record<BudgetStatus, { label: string; cls: string; dot: string }> = {
  realisable: {
    label: "Financé",
    cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  partiel: {
    label: "Partiel",
    cls: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  report: {
    label: "Non financé",
    cls: "border-border/60 bg-muted/50 text-muted-foreground",
    dot: "bg-border",
  },
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

/** Couleur de l'anneau selon le niveau atteint — contraste accessible. */
function toneForPct(pct: number): "success" | "warning" | "danger" {
  return pct >= 80 ? "success" : pct >= 50 ? "warning" : "danger";
}

function StatusBadge({ status }: { status: BudgetStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        meta.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Barre de réalisation (montant financé / montant estimé). */
function ProgressTrack({
  pct,
  className,
  label,
}: {
  pct: number;
  className?: string;
  label?: string;
}) {
  const v = clampPct(pct);
  const tone = v >= 100 ? "bg-emerald-500" : v > 0 ? "bg-amber-500" : "bg-border";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tone)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** Montant fort : chiffres bien espacés, devise discrète mais explicite. */
function Amount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [digits] = formatTndAmount(value).split(" TND");
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {digits}
      <span className="ml-1 text-[0.58em] font-semibold tracking-wide text-muted-foreground">TND</span>
    </span>
  );
}

/** Libellé de poste sans le complément entre parenthèses. */
function shortLabel(label: string): string {
  const cleaned = label.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return cleaned.length > 0 ? cleaned : label;
}

/**
 * Articles d'un poste : présentation en cartes (mobile-first, aucun tableau
 * large). La quantité est une information secondaire, le montant reste lisible
 * même sur un écran de 320 px.
 */
function ArticleTable({
  articles,
  divided = true,
}: {
  /** Article affichable (sous-ensemble structurel de `WorkPartArticle`). */
  articles: PlanArticleLike[];
  /** Séparateur supérieur (inutile quand le tableau suit déjà un bloc encadré). */
  divided?: boolean;
}) {
  return (
    <div className={cn("pt-2", divided && "border-t border-border/40")}>
      <p className="pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {articles.length} article{articles.length > 1 ? "s" : ""}
      </p>
      <ul className="space-y-2">
        {articles.map((a) => (
          <li key={a.id} className="rounded-xl bg-muted/30 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-[12.5px] font-medium leading-snug">
                {a.quantity !== undefined ? (
                  <span className="text-muted-foreground">
                    {a.quantity} {a.unit} ·{" "}
                  </span>
                ) : null}
                {a.label}
              </p>
              <p className="shrink-0 whitespace-nowrap text-[12.5px] font-semibold tabular-nums">
                {formatTndAmount(a.cost)}
              </p>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <ProgressTrack pct={a.pct} className="flex-1" label={`Réalisation de ${a.label}`} />
              <span className="w-11 shrink-0 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
                {formatPercent(a.pct)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Sous-catégories d'un poste du plan (niveau intermédiaire). Chaque
 * sous-catégorie reste dépliable pour révéler ses articles.
 *
 * Ce niveau n'est affiché que lorsqu'il apporte une information : un poste dont
 * l'unique sous-catégorie porte déjà son nom passe par `ArticleTable`
 * directement (voir `resolveWorkLevels`) — aucun libellé en double.
 */
function SubCategoryList({
  workLabel,
  parts,
  openArticles,
  onToggleArticles,
}: {
  workLabel: string;
  parts: WorkPart[];
  openArticles: Record<string, boolean>;
  onToggleArticles: (partId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sous-catégories du poste « {shortLabel(workLabel)} »
      </p>
      {parts.map((p) => {
        const articleList = p.articles ?? [];
        const hasArticles = articleList.length > 0;
        const articleOpen = openArticles[p.id] ?? false;
        return (
          <div key={p.id} className="overflow-hidden rounded-xl border border-border/40">
            <button
              type="button"
              disabled={!hasArticles}
              onClick={() => onToggleArticles(p.id)}
              className={cn(
                "flex w-full flex-col gap-2 bg-background p-3 text-left sm:flex-row sm:items-center sm:gap-3",
                hasArticles && "transition-colors hover:bg-muted/20",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-snug">
                  {shortLabel(p.label)}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                  {formatTndAmount(p.cost)} · {formatPercent(p.pct)} financé
                  {hasArticles
                    ? ` · ${articleList.length} article${articleList.length > 1 ? "s" : ""}`
                    : ""}
                </span>
              </span>
              <span className="flex items-center gap-2 sm:w-56 sm:shrink-0">
                <ProgressTrack
                  pct={p.pct}
                  className="flex-1"
                  label={`Réalisation de ${p.label}`}
                />
                <StatusBadge status={p.status} />
                {hasArticles ? (
                  articleOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )
                ) : null}
              </span>
            </button>

            {hasArticles && articleOpen && (
              <div className="border-t border-border/40 p-2.5 sm:p-3">
                <ArticleTable articles={articleList} divided={false} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <h4 className="text-[13px] font-semibold leading-tight sm:text-sm">{children}</h4>
      {hint ? (
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 sm:p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {icon} {label}
      </p>
      <p className={cn("mt-1 text-lg font-bold leading-tight tabular-nums", tone)}>{value}</p>
      {hint ? (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Indicateur circulaire + libellé sous le cercle (mobile-first). */
function CircularStat({
  value,
  label,
  hint,
  tone,
}: {
  value: number;
  label: string;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const pct = clampPct(value);
  return (
    <div className="flex flex-col items-center justify-start gap-2.5 rounded-2xl border border-border/60 bg-card p-3 text-center sm:p-4">
      <CircularProgress
        value={pct}
        tone={tone ?? toneForPct(pct)}
        label={`${label} : ${formatPercent(pct)}`}
        className="h-20 w-20 sm:h-24 sm:w-24"
      >
        <span className="text-[15px] font-bold leading-none tracking-tight tabular-nums sm:text-lg">
          {formatPercent(pct)}
        </span>
      </CircularProgress>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold leading-tight">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

// ── Module principal ───────────────────────────────────────────────────────

export interface CapacityDecisionCardProps {
  analysis: BudgetAnalysis;
  /** Identifiant du projet — travaux personnalisés enregistrés pour ce projet. */
  projectId?: string;
  /** Lots du Quantitatif détaillé (source des postes manquant au coût). */
  lots?: QuantitatifLot[];
  /** Totaux des scénarios d'estimation (Économique / Standard / Premium). */
  scenarioTotals?: ScenarioTotal[];
  /**
   * Travaux complémentaires accessibles ? (SEPT types de projet autorisés :
   * maison, villa, appartement, duplex, immeuble, résidence touristique, projet
   * immobilier neuf — ET surface couverte ≥ 120 m²). Masqués sinon — les
   * montants des travaux enregistrés sont alors ignorés eux aussi.
   */
  complementaryWorksEnabled?: boolean;
}

/**
 * Convertit un travail personnalisé chiffré en poste du plan de construction :
 * le travail devient une CATÉGORIE à part entière, détaillée en natures
 * (Matériaux, Équipements, Main-d'œuvre, Transport, Études) et en articles du
 * Quantitatif (quantité, unité, prix unitaire, montant).
 */
function customWorkToItem(cw: CustomWorkEstimate): WorkItem {
  const parts: WorkPartSource[] = [];
  const addPart = (id: string, label: string, cost: number, nature: CustomWorkNature) => {
    if (cost <= 0) return;
    parts.push({
      id,
      label,
      cost,
      articles: cw.lines
        .filter((l) => l.nature === nature)
        .map((l, i) => ({
          id: `${id}:${i}`,
          label: l.designation,
          cost: l.total,
          quantity: l.quantity,
          unit: l.unit,
        })),
    });
  };
  addPart(`cw:${cw.key}:mat`, "Matériaux", cw.materials, "materiaux");
  addPart(`cw:${cw.key}:eq`, "Équipements", cw.equipments, "equipements");
  addPart(`cw:${cw.key}:mo`, "Main-d'œuvre", cw.labor, "main_oeuvre");
  addPart(`cw:${cw.key}:tr`, "Transport", cw.transport, "transport");
  addPart(`cw:${cw.key}:et`, "Études & frais", cw.studies, "etudes");
  // Les travaux complémentaires terminent le plan de construction, APRÈS
  // « Main-d'œuvre », dans l'ordre stable du catalogue (piscine, garage,
  // cuisine extérieure, jardin, panneaux solaires).
  const catalogIndex = CUSTOM_WORK_CATALOG.findIndex((d) => d.key === cw.key);
  return {
    id: `cw:${cw.key}`,
    // Aucune icône dans le texte : elle est rendue par `CustomWorkIcon` (même
    // bibliothèque et même style que toutes les icônes de la plateforme).
    label: cw.label,
    cost: cw.total,
    rank: customWorkRank(catalogIndex),
    categoryId: "custom",
    custom: true,
    parts: parts.length > 0 ? parts : undefined,
  };
}

export function CapacityDecisionCard({
  analysis,
  projectId,
  lots,
  scenarioTotals,
  complementaryWorksEnabled = true,
}: CapacityDecisionCardProps) {
  const [open, setOpen] = useState(true);
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  // Travaux personnalisés : sélection candidate avant validation.
  const [selectedKeys, setSelectedKeys] = useState<Set<CustomWorkKey>>(() => new Set());
  // Nombre de panneaux solaires choisi localement (prioritaire jusqu'au prochain
  // enregistrement serveur). Aucun métrage : le poste se chiffre au nombre de
  // panneaux × prix unitaire système.
  const [solarPanels, setSolarPanels] = useState<number | null>(null);
  const [openPlanRows, setOpenPlanRows] = useState<Record<string, boolean>>({});
  const [openPlanArticles, setOpenPlanArticles] = useState<Record<string, boolean>>({});

  // ── Travaux personnalisés (liste prédéfinie, chiffrés automatiquement) ──
  const customWorksData = useQuery(
    api.customWorks.getProjectCustomWorks,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const saveCustomWorks = useMutation(api.customWorks.setProjectCustomWorks);
  // Hors conditions d'accès (type de projet / surface), les travaux
  // complémentaires sont entièrement masqués et n'entrent dans aucun montant.
  const customWorks = complementaryWorksEnabled ? customWorksData?.works ?? [] : [];
  const customWorksTotal = complementaryWorksEnabled ? customWorksData?.total ?? 0 : 0;

  // Nombre de panneaux affiché : choix local → valeur enregistrée → défaut.
  const panelCount =
    solarPanels ?? customWorksData?.solarPanels ?? SOLAR_PANEL_DEFAULT_COUNT;
  const solarWork = customWorks.find((w) => w.key === "solaire");
  // Le sélecteur de panneaux apparaît dès que le poste solaire est sélectionné
  // ou déjà ajouté au projet.
  const solarSelectorVisible =
    solarWork !== undefined || selectedKeys.has("solaire");

  // ── Postes du plan : Quantitatif + travaux personnalisés ────────────────
  const works = useMemo<WorkItem[]>(() => {
    const base = deriveWorks(analysis, lots);
    const custom = complementaryWorksEnabled
      ? (customWorksData?.works ?? []).map(customWorkToItem)
      : [];
    return [...base, ...custom];
  }, [analysis, lots, customWorksData, complementaryWorksEnabled]);

  const selectedIds = useMemo(
    () => works.filter((w) => !deselected.has(w.id)).map((w) => w.id),
    [works, deselected],
  );

  const plan = useMemo(
    () => buildConstructionPlan({ works, budget: analysis.availableBudget, selectedIds }),
    [works, analysis.availableBudget, selectedIds],
  );

  const steps = useMemo(
    () => planBudgetSteps({ works, budget: analysis.availableBudget, selectedIds }),
    [works, analysis.availableBudget, selectedIds],
  );

  // Comparaison des scénarios : les travaux personnalisés (dont les panneaux
  // solaires) sont intégrés AUTOMATIQUEMENT au coût de chaque scénario —
  // notamment au scénario Économique — avec un montant strictement identique à
  // celui du récapitulatif et du coût total du projet.
  const scenarioRows = useMemo(
    () =>
      compareScenarioCapacity(
        analysis.availableBudget,
        scenarioTotals ?? [],
        analysis.surface,
        customWorksTotal,
      ),
    [analysis.availableBudget, scenarioTotals, analysis.surface, customWorksTotal],
  );

  const surface = useMemo(
    () => estimateBuildableSurface(analysis.availableBudget, analysis.perUnitEstimate),
    [analysis.availableBudget, analysis.perUnitEstimate],
  );

  const globalPct = clampPct(plan.globalPct);
  const pricedWorks = plan.works.filter((w) => w.cost > 0);
  const worksRealisable = pricedWorks.filter((w) => w.status === "realisable");
  const worksPartiel = pricedWorks.filter((w) => w.status === "partiel");
  const worksReport = pricedWorks.filter((w) => w.status === "report");

  const toggleWork = (id: string) => {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Ouvre/ferme le détail des articles d'une sous-catégorie du plan. */
  const togglePlanArticles = (partId: string) =>
    setOpenPlanArticles((s) => ({ ...s, [partId]: !(s[partId] ?? false) }));

  // Ajoute les travaux sélectionnés à ceux déjà enregistrés (dédoublonnage
  // serveur : un travail déjà ajouté ne peut pas l'être deux fois).
  const addSelectedCustomWorks = () => {
    if (!projectId || selectedKeys.size === 0) return;
    const merged = new Set<string>(customWorksData?.keys ?? []);
    for (const key of selectedKeys) merged.add(key);
    void saveCustomWorks({
      projectId: projectId as Id<"projects">,
      keys: Array.from(merged),
      solarPanels: panelCount,
    });
    setSelectedKeys(new Set());
    setSolarPanels(null);
  };

  const removeCustomWork = (key: CustomWorkKey) => {
    if (!projectId) return;
    const remaining = (customWorksData?.keys ?? []).filter((k) => k !== key);
    void saveCustomWorks({
      projectId: projectId as Id<"projects">,
      keys: remaining,
      solarPanels: panelCount,
    });
  };

  /**
   * Change le nombre de panneaux solaires : le coût est recalculé
   * IMMÉDIATEMENT (nombre × prix unitaire système). Si le poste est déjà ajouté,
   * la nouvelle valeur est enregistrée — la requête réactive met le
   * récapitulatif, le budget et les scénarios à jour. Aucun métrage en m².
   */
  const changeSolarPanels = (count: number) => {
    setSolarPanels(count);
    const added = (customWorksData?.keys ?? []).includes("solaire");
    if (projectId && added) {
      void saveCustomWorks({
        projectId: projectId as Id<"projects">,
        keys: customWorksData?.keys ?? [],
        solarPanels: count,
      });
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-elev-1">
      <CardContent className="p-0">
        {/* ── En-tête ── */}
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Hammer className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight tracking-tight sm:text-lg">
              Capacité de construction
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 rounded-full px-3 text-xs"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span className="hidden min-[360px]:inline">{open ? "Masquer le détail" : "Voir le détail"}</span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* ── Synthèse budgétaire ── */}
        <section
          aria-labelledby="synthese-budgetaire"
          className="border-y border-border/50 bg-gradient-to-br from-primary/[0.08] via-card to-card p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                id="synthese-budgetaire"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Coût estimé du scénario
              </p>
              <p className="mt-1">
                <Amount
                  value={analysis.projectTotal}
                  className="text-3xl font-bold leading-none tracking-tight sm:text-4xl"
                />
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {analysis.scenarioLabel}
                </span>
                {analysis.surface ? (
                  <span className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {analysis.surface} m²
                  </span>
                ) : null}
                {analysis.perUnitEstimate ? (
                  <span className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {formatTndAmount(analysis.perUnitEstimate)}/m²
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/90 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Budget disponible
              </p>
              <p className="mt-1">
                <Amount value={plan.budget} className="text-lg font-bold sm:text-xl" />
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                à répartir sur les travaux sélectionnés
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl border p-3",
                analysis.gapToProjectTotal > 0
                  ? "border-amber-500/30 bg-amber-500/[0.07]"
                  : "border-emerald-500/30 bg-emerald-500/[0.07]",
              )}
            >
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
                {analysis.gapToProjectTotal > 0 ? "Reste à financer" : "Budget suffisant"}
              </p>
              <p className="mt-1">
                {analysis.gapToProjectTotal > 0 ? (
                  <Amount
                    value={analysis.gapToProjectTotal}
                    className="text-lg font-bold text-amber-700 dark:text-amber-300 sm:text-xl"
                  />
                ) : (
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 sm:text-xl">
                    Projet couvert
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {analysis.gapToProjectTotal > 0
                  ? "pour couvrir l'intégralité du coût estimé"
                  : `marge disponible : ${formatTndAmount(analysis.remainingBudget)}`}
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
            Montant identique à celui de « Coût de construction » pour le scénario {analysis.scenarioLabel} — aucun
            recalcul indépendant.
          </p>
        </section>

        {!open ? null : (
          <div>
            {/* ── Indicateurs circulaires ── */}
            <section aria-label="Indicateurs clés" className="border-b border-border/50 p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <SectionTitle hint="Les pourcentages essentiels de votre simulation.">
                  Indicateurs clés
                </SectionTitle>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                <CircularStat
                  value={globalPct}
                  label="Capacité de construction"
                  hint="du programme sélectionné"
                />
                <CircularStat
                  value={analysis.budgetUsedPct}
                  label="Budget engagé"
                  hint="de votre budget disponible"
                  tone="primary"
                />
                <SummaryTile
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label="Budget restant"
                  value={formatTndAmount(plan.remainingBudget)}
                  hint="après répartition sur le programme"
                />
                <SummaryTile
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  label="Travaux financés"
                  value={`${worksRealisable.length} / ${pricedWorks.length}`}
                  tone={
                    worksRealisable.length === pricedWorks.length
                      ? "text-emerald-600 dark:text-emerald-400"
                      : undefined
                  }
                  hint={
                    plan.partialWorks.length > 0
                      ? `${plan.partialWorks.length} partiel · ${worksReport.length} à reporter`
                      : worksReport.length > 0
                        ? `${worksReport.length} à reporter`
                        : "programme intégralement finançable"
                  }
                />
              </div>
            </section>

            {/* ── Niveau de construction atteint ── */}
            <section aria-label="Niveau de construction atteint" className="border-b border-border/50 p-4 sm:p-5">
              <div className="mb-3">
                <SectionTitle hint="Votre budget permet de réaliser environ le programme ci-dessous.">
                  Niveau de construction atteint
                </SectionTitle>
              </div>
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {[
                  {
                    title: "Réalisables à 100 %",
                    cls: "border-emerald-500/30 bg-emerald-500/[0.06]",
                    titleCls: "text-emerald-700 dark:text-emerald-300",
                    items: worksRealisable,
                  },
                  {
                    title: "Partiellement réalisables",
                    cls: "border-amber-500/30 bg-amber-500/[0.06]",
                    titleCls: "text-amber-700 dark:text-amber-300",
                    items: worksPartiel,
                  },
                  {
                    title: "Non réalisables (budget actuel)",
                    cls: "border-border/50 bg-muted/30",
                    titleCls: "text-muted-foreground",
                    items: worksReport,
                  },
                ].map((group) => (
                  <div key={group.title} className={cn("rounded-xl border p-3", group.cls)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-[11px] font-semibold leading-snug", group.titleCls)}>
                        {group.title}
                      </p>
                      <span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.length === 0 ? (
                      <p className="mt-1.5 text-[11.5px] text-muted-foreground">Aucun poste.</p>
                    ) : (
                      <ul className="mt-1.5 space-y-1">
                        {group.items.map((w) => (
                          <li
                            key={w.id}
                            className="flex items-start justify-between gap-2 text-[12px] leading-snug"
                          >
                            <span className="min-w-0 break-words">{shortLabel(w.label)}</span>
                            {group.title.startsWith("Partiellement") ? (
                              <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">
                                {formatPercent(w.pct)}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── Sélection des travaux ── */}
            <section aria-label="Sélection des travaux" className="border-b border-border/50 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <SectionTitle hint="Décochez les travaux que vous ne souhaitez pas réaliser.">
                  Sélectionnez les travaux à réaliser
                </SectionTitle>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full px-3 text-xs"
                    onClick={() => setDeselected(new Set())}
                  >
                    Tout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full px-3 text-xs"
                    onClick={() => setDeselected(new Set(works.map((w) => w.id)))}
                  >
                    Aucun
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {works.map((w) => {
                  const checked = !deselected.has(w.id);
                  // Travail personnalisé : même icône (lucide-react) que partout
                  // ailleurs dans la plateforme.
                  const cwDef = w.id.startsWith("cw:") ? getCustomWorkDef(w.id.slice(3)) : undefined;
                  return (
                    <label
                      key={w.id}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-[12.5px] transition-colors",
                        checked
                          ? "border-primary/30 bg-primary/[0.05]"
                          : "border-border/40 bg-background opacity-60 hover:opacity-100",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-primary"
                        checked={checked}
                        onChange={() => toggleWork(w.id)}
                      />
                      {cwDef && (
                        <CustomWorkIcon
                          icon={cwDef.icon}
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                        />
                      )}
                      <span className="min-w-0 flex-1 font-medium leading-snug">
                        {shortLabel(w.label)}
                        {w.custom ? (
                          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[10px] text-primary">
                            perso.
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-muted-foreground">
                        {w.cost > 0 ? formatTndAmount(w.cost) : "À chiffrer"}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* ── Travaux complémentaires (liste prédéfinie) ──
                  Placés à la fin des étapes de calcul des travaux (après la
                  sélection et la main-d'œuvre, avant le total du projet). Le
                  coût de chaque travail est chiffré AUTOMATIQUEMENT par le
                  système selon le scénario budgétaire actif, avec les mêmes
                  données de prix que le reste de l'estimation.
                  Accessibles uniquement pour les projets éligibles (les sept
                  types autorisés : maison, villa, appartement, duplex,
                  immeuble, résidence touristique, projet immobilier neuf — ET
                  surface couverte ≥ 120 m²) : entièrement masqués sinon. */}
              {complementaryWorksEnabled ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/[0.15] p-3 sm:p-4">
                  <SectionTitle hint="Chiffrés automatiquement avec les prix de votre scénario. Panneaux solaires : nombre × prix unitaire TTC posé.">
                    Ajouter des travaux personnalisés
                  </SectionTitle>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CUSTOM_WORK_CATALOG.map((def) => {
                    const added = (customWorksData?.keys ?? []).includes(def.key);
                    const checked = selectedKeys.has(def.key);
                    return (
                      <label
                        key={def.key}
                        className={cn(
                          "flex min-h-11 items-center gap-2.5 rounded-xl border p-2.5 text-[12.5px] transition-colors",
                          added
                            ? "cursor-not-allowed border-border/40 bg-muted/40 opacity-70"
                            : checked
                              ? "cursor-pointer border-primary/30 bg-primary/[0.05]"
                              : "cursor-pointer border-border/40 bg-background hover:bg-muted/20",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 accent-primary"
                          disabled={added}
                          checked={added || checked}
                          onChange={() =>
                            setSelectedKeys((prev) => {
                              const next = new Set(prev);
                              if (next.has(def.key)) next.delete(def.key);
                              else next.add(def.key);
                              return next;
                            })
                          }
                        />
                        <CustomWorkIcon
                          icon={def.icon}
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                        />
                        <span className="min-w-0 flex-1 font-medium leading-snug">{def.label}</span>
                        {added ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            ajouté
                          </span>
                        ) : (
                          <span className="hidden shrink-0 text-[10.5px] text-muted-foreground min-[380px]:inline">
                            chiffré à l'ajout
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* ── Sélecteur du nombre de panneaux solaires ──
                    Les panneaux solaires ne se chiffrent JAMAIS au m² : le coût
                    du poste = nombre de panneaux × prix unitaire système d'un
                    panneau. Le changement du nombre est immédiat. */}
                {solarSelectorVisible ? (
                  <div className="mt-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Sun className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-[12.5px] font-semibold">Nombre de panneaux solaires</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {SOLAR_PANEL_TYPE.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SOLAR_PANEL_COUNT_OPTIONS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={panelCount === n}
                          aria-label={`${n} panneau${n > 1 ? "x" : ""} solaire${n > 1 ? "s" : ""}`}
                          onClick={() => changeSolarPanels(n)}
                          className={cn(
                            "min-h-9 rounded-lg border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors",
                            panelCount === n
                              ? "border-primary/40 bg-primary text-primary-foreground"
                              : "border-border/50 bg-background hover:bg-muted/30",
                          )}
                        >
                          {n} panneau{n > 1 ? "x" : ""}
                        </button>
                      ))}
                    </div>
                    {solarWork ? (
                      <p className="mt-2 text-[12.5px] font-semibold tabular-nums">
                        {solarWork.panelCount} panneaux × {formatTndAmount(solarWork.panelUnitPrice ?? 0)} ={" "}
                        <span className="text-primary">{formatTndAmount(solarWork.total)}</span>
                      </p>
                    ) : (
                      <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
                        Coût calculé automatiquement après ajout : {panelCount} panneaux × prix unitaire
                        TTC posé d'un panneau (matériel + pose + raccordement) — aucun métrage en m².
                      </p>
                    )}
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      Changer le nombre de panneaux recalcule immédiatement le coût du poste, intégré tel
                      quel au récapitulatif, au budget disponible et aux scénarios budgétaires
                      (Économique compris).
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    className="h-10 w-full gap-1.5 sm:w-auto"
                    disabled={!projectId || selectedKeys.size === 0}
                    onClick={addSelectedCustomWorks}
                  >
                    <Plus className="h-4 w-4" /> Ajouter les travaux sélectionnés
                  </Button>
                  {selectedKeys.size > 0 ? (
                    <Button
                      variant="ghost"
                      className="h-10 w-full text-xs sm:w-auto"
                      onClick={() => setSelectedKeys(new Set())}
                    >
                      Annuler la sélection
                    </Button>
                  ) : null}
                </div>

                {/* ── Récapitulatif : travaux personnalisés + total projet ── */}
                {customWorks.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
                    <SectionTitle hint="Articles, quantités et prix unitaires du Quantitatif.">
                      Travaux personnalisés sélectionnés
                    </SectionTitle>
                    <ul className="space-y-2">
                      {customWorks.map((w) => (
                        <li key={w.key} className="rounded-xl border border-border/50 bg-background p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <CustomWorkIcon
                              icon={w.icon}
                              className="h-4 w-4 shrink-0 text-primary"
                            />
                            <span className="text-[12.5px] font-semibold">{w.label}</span>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {/* Panneaux solaires : la quantité s'exprime EN
                                  PANNEAUX (nombre × prix unitaire système),
                                  jamais en m². */}
                              {w.key === "solaire"
                                ? `${w.panelCount ?? 0} panneaux × ${formatTndAmount(w.panelUnitPrice ?? 0)}`
                                : `${w.surface} m²`}
                              {" · "}
                              {w.finishLevel}
                            </span>
                            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-bold tabular-nums text-primary">
                              {formatTndAmount(w.total)}
                            </span>
                            <button
                              type="button"
                              aria-label={`Retirer ${w.label}`}
                              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeCustomWork(w.key)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            {w.materials > 0 ? (
                              <span>Matériaux : {formatTndAmount(w.materials)}</span>
                            ) : null}
                            {w.equipments > 0 ? (
                              <span>Équipements : {formatTndAmount(w.equipments)}</span>
                            ) : null}
                            {w.labor > 0 ? (
                              <span>Main-d'œuvre : {formatTndAmount(w.labor)}</span>
                            ) : null}
                            {w.transport > 0 ? (
                              <span>Transport : {formatTndAmount(w.transport)}</span>
                            ) : null}
                            {w.studies > 0 ? (
                              <span>Études : {formatTndAmount(w.studies)}</span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2">
                      <span className="text-[12px] font-semibold">Total des travaux personnalisés</span>
                      <span className="text-[13px] font-bold tabular-nums text-primary">
                        {formatTndAmount(customWorksTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold">Coût total estimatif du projet</span>
                      <span className="text-[13px] font-bold tabular-nums">
                        {formatTndAmount(analysis.projectTotal + customWorksTotal)}
                      </span>
                    </div>
                    <p className="text-[10.5px] leading-snug text-muted-foreground">
                      Ces travaux sont intégrés comme catégories supplémentaires du projet et restent
                      synchronisés avec le Quantitatif détaillé, le scénario retenu et l'estimation du
                      coût de construction.
                    </p>
                  </div>
                ) : null}
                </div>
              ) : null}
            </section>

            {/* ── ⭐ Plan de construction selon votre budget ── */}
            <section aria-label="Plan de construction" className="border-b border-border/50 p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <SectionTitle hint="Chaque poste est financé dans l'ordre technique du chantier.">
                  Plan de construction selon votre budget
                </SectionTitle>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11.5px] font-semibold tabular-nums text-primary">
                  {formatTndAmount(plan.budget)} → {formatPercent(globalPct)}
                </span>
              </div>

              <div className="space-y-2">
                {plan.works.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
                    Sélectionnez au moins un travail pour générer le plan.
                  </div>
                ) : (
                  <>
                    {plan.works.map((w) => {
                      const parts = w.parts ?? [];
                      // Doublons d'affichage : un poste dont l'unique
                      // sous-catégorie porte son nom n'affiche pas deux fois le
                      // même intitulé (les articles passent sous le poste).
                      const { showSubLevel, directLabel, directArticles } = resolveWorkLevels(w);
                      const expandable =
                        showSubLevel || directArticles.length > 0 || directLabel !== null;
                      const rowOpen = openPlanRows[w.id] ?? false;
                      return (
                        <div
                          key={w.id}
                          className={cn(
                            "overflow-hidden rounded-xl border bg-background transition-colors",
                            rowOpen ? "border-primary/30" : "border-border/50",
                          )}
                        >
                          <button
                            type="button"
                            disabled={!expandable}
                            onClick={() =>
                              setOpenPlanRows((s) => ({ ...s, [w.id]: !rowOpen }))
                            }
                            aria-expanded={expandable ? rowOpen : undefined}
                            className={cn(
                              "w-full p-3 text-left sm:p-3.5",
                              expandable && "transition-colors hover:bg-muted/25",
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[13px] font-semibold leading-snug sm:text-sm">
                                    {shortLabel(w.label)}
                                  </span>
                                  {w.custom ? (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                      perso.
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                                  {w.cost > 0
                                    ? `${formatTndAmount(w.cost)} · ${formatPercent(w.pct)} financé`
                                    : "à chiffrer · hors coût estimé"}
                                  {showSubLevel
                                    ? ` · ${parts.length} sous-catégories`
                                    : directArticles.length > 0
                                      ? ` · ${directArticles.length} article${
                                          directArticles.length > 1 ? "s" : ""
                                        }`
                                      : ""}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {w.cost > 0 ? (
                                  <StatusBadge status={w.status} />
                                ) : (
                                  <span className="whitespace-nowrap rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                                    À chiffrer
                                  </span>
                                )}
                                {expandable ? (
                                  rowOpen ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )
                                ) : null}
                              </div>
                            </div>
                            {w.cost > 0 ? (
                              <div className="mt-2 flex items-center gap-2">
                                <ProgressTrack
                                  pct={w.pct}
                                  className="flex-1"
                                  label="Réalisation du poste"
                                />
                                <span className="w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
                                  {formatPercent(w.pct)}
                                </span>
                              </div>
                            ) : null}
                          </button>

                          {expandable && rowOpen && (
                            <div className="space-y-2 border-t border-border/40 p-3">
                              {showSubLevel ? (
                                <SubCategoryList
                                  workLabel={w.label}
                                  parts={parts}
                                  openArticles={openPlanArticles}
                                  onToggleArticles={togglePlanArticles}
                                />
                              ) : (
                                /* Poste aplati : sous-catégorie unique. Aucun nom
                                   répété — le libellé n'est repris que s'il
                                   apporte une information différente. */
                                <>
                                  {directLabel ? (
                                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Sous-catégorie « {directLabel} »
                                    </p>
                                  ) : null}
                                  {directArticles.length > 0 ? (
                                    <ArticleTable articles={directArticles} divided={false} />
                                  ) : null}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 to-primary/[0.04] p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold sm:text-sm">Total programme sélectionné</p>
                          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                            {formatTndAmount(plan.selectedCost)} · {formatTndAmount(plan.funded)} financés
                          </p>
                        </div>
                        <p className="text-2xl font-bold leading-none tabular-nums text-primary">
                          {formatPercent(globalPct)}
                        </p>
                      </div>
                      <ProgressTrack
                        pct={globalPct}
                        className="mt-2.5 h-2"
                        label="Financement du programme sélectionné"
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ── Priorisation intelligente par IA ── */}
            {plan.aiPriorities.length > 0 && (
              <section aria-label="Priorisation par l'IA" className="border-b border-border/50 p-4 sm:p-5">
                <SectionTitle hint="Nécessité technique, dépendances, budget et risque de reprise.">
                  Priorisation intelligente par l'IA
                </SectionTitle>
                <ol className="mt-3 space-y-2">
                  {plan.aiPriorities.map((p) => (
                    <li key={p.id} className="flex items-start gap-3 rounded-xl border border-border/50 p-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          p.status === "realisable"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : p.status === "partiel"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {p.order}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold leading-snug">
                          {shortLabel(p.label)}{" "}
                          <span className="font-normal tabular-nums text-muted-foreground">
                            · {formatPercent(p.pct)} · {formatPercent(p.sharePct)} du programme
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                          {p.reason}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* ── Que puis-je construire avec ce budget ? + surface ── */}
            <section aria-label="Réponse et surface constructible" className="space-y-2.5 border-b border-border/50 p-4 sm:p-5">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-3.5">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[13px] font-semibold">Que puis-je construire avec ce budget ?</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed">{plan.answerSentence}</p>
                  </div>
                </div>
              </div>

              {surface !== null && analysis.perUnitEstimate ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-3.5">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Surface constructible estimée
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-primary">≈ {surface} m²</p>
                  </div>
                  <p className="max-w-[16rem] text-right text-[11px] leading-snug text-muted-foreground">
                    {formatTndAmount(analysis.perUnitEstimate)}/m² · scénario {analysis.scenarioLabel}
                    {analysis.surface ? ` · projet ${analysis.surface} m²` : ""}
                  </p>
                </div>
              ) : null}
            </section>

            {/* ── Simulation d'augmentation du budget ── */}
            <section aria-label="Simulation de scénarios" className="border-b border-border/50 p-4 sm:p-5">
              <SectionTitle hint="Travaux qui deviennent réalisables avec un budget plus élevé.">
                Simulation de scénarios
              </SectionTitle>
              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
                {steps.map((step) => (
                  <div key={step.delta} className="rounded-xl border border-border/60 bg-background p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[12.5px] font-semibold">
                        Budget + {formatTndAmount(step.delta)}
                      </p>
                      <p className="text-base font-bold leading-none tabular-nums text-primary">
                        {formatPercent(step.globalPct)}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                      → {formatTndAmount(step.budget)}
                    </p>
                    <ProgressTrack pct={step.globalPct} className="mt-2" label={`Financement avec ${formatTndAmount(step.budget)}`} />
                    <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
                      {step.additionalFullLabels.length > 0
                        ? `Travaux supplémentaires réalisables : ${step.additionalFullLabels
                            .map(shortLabel)
                            .join(", ")} (+${formatPercent(step.extraPct)})`
                        : "Aucun travail supplémentaire ne devient entièrement réalisable à ce palier."}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Comparaison des scénarios (Économique / Standard / Premium /
                Personnalisé) — le coût de construction est identique au
                résultat « Coût de construction » ; les travaux personnalisés
                (dont les panneaux solaires) y sont intégrés automatiquement. ── */}
            {scenarioRows.length > 0 && (
              <section aria-label="Comparaison des scénarios" className="border-b border-border/50 p-4 sm:p-5">
                <SectionTitle hint="Même budget, travaux personnalisés inclus (panneaux solaires compris).">
                  Comparaison des scénarios d'estimation
                </SectionTitle>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {scenarioRows.map((row) => (
                    <div
                      key={row.key}
                      className={cn(
                        "rounded-xl border p-3",
                        row.selected ? "border-primary/40 bg-primary/[0.05]" : "border-border/60 bg-background",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[12.5px] font-semibold">{row.label}</p>
                            {row.selected && (
                              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                Retenu
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11.5px] leading-snug tabular-nums text-muted-foreground">
                            coût {formatTndAmount(row.baseCost)}
                            {row.extraCost > 0
                              ? ` + ${formatTndAmount(row.extraCost)} travaux perso. = ${formatTndAmount(row.totalCost)}`
                              : ""}
                            {row.perSqm ? ` · ${formatTndAmount(row.perSqm)}/m²` : ""}
                          </p>
                        </div>
                        <p className="text-lg font-bold leading-none tabular-nums text-primary">
                          {formatPercent(row.capacityPct)}
                        </p>
                      </div>
                      <ProgressTrack
                        pct={row.capacityPct}
                        className="mt-2"
                        label={`Capacité du scénario ${row.label}`}
                      />
                      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                        {row.missing > 0
                          ? `Reste nécessaire : ${formatTndAmount(row.missing)} pour couvrir ce scénario.`
                          : "Budget couvrant intégralement ce scénario."}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Budget nécessaire pour terminer ── */}
            {plan.remainingToComplete > 0 ? (
              <section aria-label="Budget nécessaire pour terminer" className="border-b border-border/50 p-4 sm:p-5">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5">
                  <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-200">
                    Budget nécessaire pour terminer le programme
                  </p>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
                    <div className="rounded-lg border border-border/60 bg-background p-2.5">
                      <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                        Budget disponible
                      </p>
                      <p className="mt-0.5 text-base font-bold tabular-nums">{formatTndAmount(plan.budget)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background p-2.5">
                      <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                        Coût estimé total
                      </p>
                      <p className="mt-0.5 text-base font-bold tabular-nums">{formatTndAmount(plan.selectedCost)}</p>
                    </div>
                    <div className="rounded-lg border border-amber-500/40 bg-background p-2.5">
                      <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                        Reste nécessaire
                      </p>
                      <p className="mt-0.5 text-base font-bold tabular-nums text-amber-600 dark:text-amber-400">
                        {formatTndAmount(plan.remainingToComplete)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* ── Prochaine étape + recommandation ── */}
            <section aria-label="Prochaine étape et recommandation" className="space-y-2.5 p-4 sm:p-5">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-200">
                      Prochaine étape recommandée
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed">{plan.nextStep}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5">
                <div className="flex items-start gap-2.5">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[13px] font-semibold">Recommandation</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                      {analysis.recommendation}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                      Combinaison conseillée : {analysis.optimalCombination}
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CapacityDecisionCard;
