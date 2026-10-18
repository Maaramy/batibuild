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
  Building2,
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
  budgetProgressionBlocks,
  formatPercent,
  formatTndAmount,
  type BudgetAnalysis,
  type BudgetStatus,
  type QuantitatifLot,
} from "@/lib/budgetEngine";
import {
  CUSTOM_WORK_RANK,
  buildConstructionPlan,
  compareScenarioCapacity,
  deriveWorks,
  estimateBuildableSurface,
  planBudgetSteps,
  type ScenarioTotal,
  type WorkItem,
  type WorkPartSource,
} from "@/lib/constructionPlanEngine";

// ── Helpers visuels (reprises du module budget) ────────────────────────────

const STATUS_META: Record<BudgetStatus, { label: string; cls: string; dot: string }> = {
  realisable: {
    label: "100 %",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  partiel: {
    label: "Partiel",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  report: {
    label: "0 %",
    cls: "border-border/50 bg-muted/40 text-muted-foreground",
    dot: "bg-border",
  },
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

function StatusBadge({ status }: { status: BudgetStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[9.5px] font-semibold whitespace-nowrap", meta.cls)}>
      {meta.label}
    </span>
  );
}

/** Réalisation d'un poste (montant financé / montant estimé) — anneau %. */
function RealizationBar({ pct }: { pct: number }) {
  const v = clampPct(pct);
  return (
    <CircularProgress
      value={v}
      displayValue={formatPercent(v)}
      label="Réalisation du poste"
      size="sm"
    />
  );
}

/** Libellé de poste sans le complément entre parenthèses. */
function shortLabel(label: string): string {
  const cleaned = label.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return cleaned.length > 0 ? cleaned : label;
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
      {hint ? <p className="text-[10px] text-muted-foreground/70">{hint}</p> : null}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
  tone,
  ring,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  hint?: string;
  tone?: string;
  /** Pourcentage en anneau, aligné à droite de la tuile (design maquette). */
  ring?: { value: number; display: string };
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {icon} {label}
          </p>
          {value ? (
            <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", tone)}>{value}</p>
          ) : null}
        </div>
        {ring ? (
          <CircularProgress
            value={ring.value}
            displayValue={ring.display}
            label={label}
            size="sm"
          />
        ) : null}
      </div>
      {hint ? <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
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
  return {
    id: `cw:${cw.key}`,
    // Aucune icône dans le texte : elle est rendue par `CustomWorkIcon` (même
    // bibliothèque et même style que toutes les icônes de la plateforme).
    label: cw.label,
    cost: cw.total,
    rank: CUSTOM_WORK_RANK,
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
    <Card className="border-border/60 bg-card shadow-elev-1">
      <CardContent className="p-4">
        {/* ── En-tête ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Hammer className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Capacité de construction</h3>
          <span className="rounded-full border border-primary/30 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-semibold text-primary">
            budget disponible {formatTndAmount(plan.budget)}
          </span>
          <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setOpen((v) => !v)}>
            {open ? "Masquer le détail" : "Voir le détail"}
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* ── Bandeau supérieur ── */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Budget"
            value={formatTndAmount(plan.budget)}
            hint="budget disponible à allouer"
          />
          <SummaryTile
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Capacité de construction"
            hint={`sur un programme de ${formatTndAmount(plan.selectedCost)}`}
            ring={{ value: globalPct, display: formatPercent(globalPct) }}
          />
          <SummaryTile
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Travaux réalisables"
            value={`${worksRealisable.length} / ${pricedWorks.length}`}
            hint={
              plan.partialWorks.length > 0
                ? `${plan.partialWorks.length} partiel · ${worksReport.length} à reporter`
                : worksReport.length > 0
                  ? `${worksReport.length} à reporter`
                  : "programme intégralement finançable"
            }
          />
          <SummaryTile
            icon={<Coins className="h-3.5 w-3.5" />}
            label="Budget supplémentaire recommandé"
            value={plan.extraBudgetRecommended > 0 ? formatTndAmount(plan.extraBudgetRecommended) : "Aucun"}
            tone={plan.extraBudgetRecommended > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
            hint={plan.extraBudgetRecommended > 0 ? "pour terminer le programme sélectionné" : "programme sélectionné couvert"}
          />
        </div>

        {!open ? null : (
          <div className="mt-3 space-y-3">
            {/* ── % global de construction ── */}
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
              <p className="text-[13px] font-bold">
                Votre budget permet de réaliser environ {formatPercent(globalPct)} du projet
              </p>
              <div className="mt-1.5 overflow-x-auto pb-1">
                <span className="font-mono text-[13px] tracking-widest text-primary" aria-hidden>
                  {budgetProgressionBlocks(globalPct)}
                </span>
              </div>
              <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
                {formatTndAmount(plan.funded)} financés sur {formatTndAmount(plan.selectedCost)} — postes sélectionnés
                ci-dessous ({plan.works.length} retenus, {plan.excludedWorks.length} exclus).
              </p>
            </div>

            {/* ── Niveau de construction atteint ── */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                <div key={group.title} className={cn("rounded-xl border p-2.5", group.cls)}>
                  <p className={cn("text-[10px] font-semibold uppercase tracking-wide", group.titleCls)}>
                    {group.title} ({group.items.length})
                  </p>
                  {group.items.length === 0 ? (
                    <p className="mt-1 text-[10.5px] text-muted-foreground">Aucun poste.</p>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {group.items.map((w) => (
                        <li key={w.id} className="text-[11px] leading-snug">
                          {shortLabel(w.label)}
                          {group.title.startsWith("Partiellement") ? (
                            <span className="tabular-nums text-muted-foreground"> — {formatPercent(w.pct)}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* ── Sélection des travaux ── */}
            <div className="rounded-xl border border-border/40 bg-background p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <SectionTitle hint="décochez les travaux que vous ne souhaitez pas réaliser">
                  Sélectionnez les travaux à réaliser
                </SectionTitle>
                <div className="ml-auto flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setDeselected(new Set())}
                  >
                    Tout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setDeselected(new Set(works.map((w) => w.id)))}
                  >
                    Aucun
                  </Button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {works.map((w) => {
                  const checked = !deselected.has(w.id);
                  // Travail personnalisé : même icône (lucide-react) que partout
                  // ailleurs dans la plateforme.
                  const cwDef = w.id.startsWith("cw:") ? getCustomWorkDef(w.id.slice(3)) : undefined;
                  return (
                    <label
                      key={w.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-colors",
                        checked
                          ? "border-primary/30 bg-primary/[0.05]"
                          : "border-border/40 bg-background opacity-60 hover:opacity-100",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={checked}
                        onChange={() => toggleWork(w.id)}
                      />
                      {cwDef && (
                        <CustomWorkIcon
                          icon={cwDef.icon}
                          className="h-3.5 w-3.5 text-muted-foreground"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium" title={w.label}>
                        {shortLabel(w.label)}
                        {w.custom ? (
                          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[9px] text-primary">
                            perso.
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {w.cost > 0 ? formatTndAmount(w.cost) : "à chiffrer"}
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
              <div className="mt-2 rounded-xl border border-dashed border-border/50 p-2.5">
                <SectionTitle hint="chiffrés automatiquement — panneaux solaires : nombre × prix unitaire TTC posé">
                  Ajouter des travaux personnalisés
                </SectionTitle>

                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {CUSTOM_WORK_CATALOG.map((def) => {
                    const added = (customWorksData?.keys ?? []).includes(def.key);
                    const checked = selectedKeys.has(def.key);
                    return (
                      <label
                        key={def.key}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-colors",
                          added
                            ? "cursor-not-allowed border-border/40 bg-muted/40 opacity-70"
                            : checked
                              ? "cursor-pointer border-primary/30 bg-primary/[0.05]"
                              : "cursor-pointer border-border/40 bg-background hover:bg-muted/20",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-primary"
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
                          className="h-3.5 w-3.5 text-muted-foreground"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{def.label}</span>
                        {added ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-px text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                            ajouté
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
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
                  <div className="mt-2 rounded-lg border border-primary/25 bg-primary/[0.04] p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Sun className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-[11px] font-semibold">Nombre de panneaux solaires</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {SOLAR_PANEL_TYPE.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {SOLAR_PANEL_COUNT_OPTIONS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={panelCount === n}
                          aria-label={`${n} panneau${n > 1 ? "x" : ""} solaire${n > 1 ? "s" : ""}`}
                          onClick={() => changeSolarPanels(n)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-[11px] font-semibold tabular-nums transition-colors",
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
                      <p className="mt-1.5 text-[11px] font-semibold tabular-nums">
                        {solarWork.panelCount} panneaux × {formatTndAmount(solarWork.panelUnitPrice ?? 0)} ={" "}
                        <span className="text-primary">{formatTndAmount(solarWork.total)}</span>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                        Coût calculé automatiquement après ajout : {panelCount} panneaux × prix unitaire
                        TTC posé d'un panneau (matériel + pose + raccordement) — aucun métrage en m².
                      </p>
                    )}
                    <p className="mt-0.5 text-[9.5px] leading-snug text-muted-foreground">
                      Changer le nombre de panneaux recalcule immédiatement le coût du poste, intégré tel
                      quel au récapitulatif, au budget disponible et aux scénarios budgétaires
                      (Économique compris).
                    </p>
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 gap-1"
                    disabled={!projectId || selectedKeys.size === 0}
                    onClick={addSelectedCustomWorks}
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter les travaux sélectionnés
                  </Button>
                  {selectedKeys.size > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[10.5px]"
                      onClick={() => setSelectedKeys(new Set())}
                    >
                      Annuler la sélection
                    </Button>
                  ) : null}
                </div>

                {/* ── Récapitulatif : travaux personnalisés + total projet ── */}
                {customWorks.length > 0 ? (
                  <div className="mt-2.5 space-y-1.5 rounded-lg border border-primary/20 bg-primary/[0.03] p-2.5">
                    <SectionTitle hint="articles, quantités et prix unitaires du Quantitatif">
                      Travaux personnalisés sélectionnés
                    </SectionTitle>
                    <ul className="space-y-1.5">
                      {customWorks.map((w) => (
                        <li key={w.key} className="rounded-lg border border-border/40 bg-background p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <CustomWorkIcon
                              icon={w.icon}
                              className="h-3.5 w-3.5 text-primary"
                            />
                            <span className="text-[11.5px] font-semibold">{w.label}</span>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {/* Panneaux solaires : la quantité s'exprime EN
                                  PANNEAUX (nombre × prix unitaire système),
                                  jamais en m². */}
                              {w.key === "solaire"
                                ? `${w.panelCount ?? 0} panneaux × ${formatTndAmount(w.panelUnitPrice ?? 0)}`
                                : `${w.surface} m²`}
                              {" · "}
                              {w.finishLevel}
                            </span>
                            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-primary">
                              {formatTndAmount(w.total)}
                            </span>
                            <button
                              type="button"
                              aria-label={`Retirer ${w.label}`}
                              className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeCustomWork(w.key)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
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

                    <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                      <span className="text-[11px] font-semibold">Total des travaux personnalisés</span>
                      <span className="text-[12px] font-bold tabular-nums text-primary">
                        {formatTndAmount(customWorksTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold">Coût total estimatif du projet</span>
                      <span className="text-[12px] font-bold tabular-nums">
                        {formatTndAmount(analysis.projectTotal + customWorksTotal)}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground">
                      Ces travaux sont intégrés comme catégories supplémentaires du projet et restent
                      synchronisés avec le Quantitatif détaillé, le scénario retenu et l'estimation du
                      coût de construction.
                    </p>
                  </div>
                ) : null}
              </div>
              ) : null}
            </div>

            {/* ── ⭐ Plan de construction selon votre budget ──
                (présentation alignée sur « Quantitatif détaillé — réalisation
                par poste » : même lignes, même barre, même badge d'état) ── */}
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Plan de construction selon votre budget
                </p>
                <span className="ml-auto text-[10px] font-semibold tabular-nums text-primary">
                  {formatTndAmount(plan.budget)} → {formatPercent(globalPct)}
                </span>
              </div>

              <div className="space-y-2">
                {plan.works.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-3 py-3 text-center text-[11px] text-muted-foreground">
                    Sélectionnez au moins un travail pour générer le plan.
                  </div>
                ) : (
                  <>
                    {plan.works.map((w) => {
                      const parts = w.parts ?? [];
                      const hasParts = parts.length > 0;
                      const rowOpen = openPlanRows[w.id] ?? false;
                      return (
                        <div key={w.id} className="overflow-hidden rounded-xl border border-border/40">
                          <button
                            type="button"
                            disabled={!hasParts}
                            onClick={() =>
                              setOpenPlanRows((s) => ({ ...s, [w.id]: !rowOpen }))
                            }
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-2.5 text-left bg-muted/20",
                              hasParts && "transition-colors hover:bg-muted/40",
                            )}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] font-semibold">
                                {shortLabel(w.label)}
                                {w.custom ? (
                                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-medium text-primary">
                                    perso.
                                  </span>
                                ) : null}
                              </span>
                              <span className="block text-[10px] text-muted-foreground">
                                {w.cost > 0
                                  ? `${formatTndAmount(w.cost)} · ${formatPercent(w.pct)} financé`
                                  : "à chiffrer · hors coût estimé"}
                                {hasParts
                                  ? ` · ${parts.length} sous-catégorie${parts.length > 1 ? "s" : ""}`
                                  : ""}
                              </span>
                            </span>
                            <RealizationBar pct={w.pct} />
                            {w.cost > 0 ? (
                              <StatusBadge status={w.status} />
                            ) : (
                              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9.5px] font-semibold text-sky-700 dark:text-sky-300">
                                À chiffrer
                              </span>
                            )}
                            {hasParts ?
                              rowOpen ? (
                                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )
                            : null}
                          </button>

                          {hasParts && rowOpen && (
                            <div className="space-y-1.5 border-t border-border/30 p-2.5">
                              <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
                                Sous-catégories du poste « {shortLabel(w.label)} »
                              </p>
                              {parts.map((p) => {
                                const articleList = p.articles ?? [];
                                const hasArticles = articleList.length > 0;
                                const articleOpen = openPlanArticles[p.id] ?? false;
                                return (
                                  <div
                                    key={p.id}
                                    className="overflow-hidden rounded-lg border border-border/30"
                                  >
                                    <button
                                      type="button"
                                      disabled={!hasArticles}
                                      onClick={() =>
                                        setOpenPlanArticles((s) => ({ ...s, [p.id]: !articleOpen }))
                                      }
                                      className={cn(
                                        "flex w-full items-center gap-2 bg-background px-2.5 py-2 text-left",
                                        hasArticles && "transition-colors hover:bg-muted/20",
                                      )}
                                    >
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-[11.5px] font-medium">
                                          {shortLabel(p.label)}
                                        </span>
                                        <span className="block text-[10px] text-muted-foreground">
                                          {formatTndAmount(p.cost)} · {formatPercent(p.pct)} financé
                                          {hasArticles
                                            ? ` · ${articleList.length} article${
                                                articleList.length > 1 ? "s" : ""
                                              }`
                                            : ""}
                                        </span>
                                      </span>
                                      <RealizationBar pct={p.pct} />
                                      <StatusBadge status={p.status} />
                                      {hasArticles ?
                                        articleOpen ? (
                                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        ) : (
                                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        )
                                      : null}
                                    </button>

                                    {hasArticles && articleOpen && (
                                      <div className="border-t border-border/20 p-2">
                                        <div className="flex items-baseline gap-2 pb-1 text-[9.5px] uppercase tracking-wide text-muted-foreground">
                                          <span className="min-w-0 flex-1">Article</span>
                                          <span className="w-20 shrink-0 text-right sm:w-24">
                                            Montant
                                          </span>
                                          <span className="w-12 shrink-0 text-right">
                                            Réalisation
                                          </span>
                                        </div>
                                        <ul className="space-y-1">
                                          {articleList.map((a) => (
                                            <li
                                              key={a.id}
                                              className="flex items-start gap-2 text-[11px]"
                                            >
                                              <span className="min-w-0 flex-1 break-words">
                                                {a.quantity !== undefined ? (
                                                  <span className="text-muted-foreground">
                                                    {a.quantity} {a.unit} —{" "}
                                                  </span>
                                                ) : null}
                                                {a.label}
                                              </span>
                                              <span className="w-20 shrink-0 whitespace-nowrap text-right tabular-nums sm:w-24">
                                                {formatTndAmount(a.cost)}
                                              </span>
                                              <RealizationBar pct={a.pct} />
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="overflow-hidden rounded-xl border border-primary/20">
                      <div className="flex items-center gap-2.5 bg-primary/[0.06] px-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-semibold">Total programme sélectionné</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {formatTndAmount(plan.selectedCost)} · {formatTndAmount(plan.funded)} financés
                          </span>
                        </span>
                        <RealizationBar pct={globalPct} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Priorisation intelligente par IA ── */}
            {plan.aiPriorities.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-background p-2.5">
                <SectionTitle hint="nécessité technique · dépendances · budget · risque de reprise">
                  Priorisation intelligente par l'IA
                </SectionTitle>
                <ol className="mt-2 space-y-1.5">
                  {plan.aiPriorities.map((p) => (
                    <li key={p.id} className="flex items-start gap-2 rounded-lg border border-border/30 px-2 py-1.5">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
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
                        <p className="text-[11px] font-semibold">
                          {shortLabel(p.label)}{" "}
                          <span className="font-normal tabular-nums text-muted-foreground">
                            · {formatPercent(p.pct)} · {formatPercent(p.sharePct)} du programme
                          </span>
                        </p>
                        <p className="text-[10.5px] leading-snug text-muted-foreground">{p.reason}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* ── Que puis-je construire avec ce budget ? ── */}
            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-2.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div>
                <p className="text-[11px] font-semibold">Que puis-je construire avec ce budget ?</p>
                <p className="mt-0.5 text-[11.5px] leading-snug">{plan.answerSentence}</p>
              </div>
            </div>

            {/* ── Surface constructible estimée ── */}
            {surface !== null && analysis.perUnitEstimate ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-background px-2.5 py-2">
                <span className="text-[11px] font-semibold">Surface constructible estimée</span>
                <span className="text-[13px] font-bold tabular-nums text-primary">≈ {surface} m²</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatTndAmount(analysis.perUnitEstimate)}/m² · scénario {analysis.scenarioLabel}
                  {analysis.surface ? ` · projet ${analysis.surface} m²` : ""}
                </span>
              </div>
            ) : null}

            {/* ── Simulation d'augmentation du budget ── */}
            <div className="space-y-1.5">
              <SectionTitle hint="travaux supplémentaires rendus réalisables">
                Simulation de scénarios
              </SectionTitle>
              {steps.map((step) => (
                <div
                  key={step.delta}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background px-2.5 py-2"
                >
                  <span className="text-[11.5px] font-semibold">
                    Budget actuel{step.delta > 0 ? ` + ${formatTndAmount(step.delta)}` : ""}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    → {formatTndAmount(step.budget)}
                  </span>
                  <span className="ml-auto text-[11px] font-bold tabular-nums text-primary">
                    {formatPercent(step.globalPct)} du programme
                  </span>
                  <span className="w-full text-[10.5px] leading-snug text-muted-foreground">
                    {step.additionalFullLabels.length > 0
                      ? `Travaux supplémentaires réalisables : ${step.additionalFullLabels
                          .map(shortLabel)
                          .join(", ")} (+${formatPercent(step.extraPct)})`
                      : "Aucun travail supplémentaire ne devient entièrement réalisable à ce palier."}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Comparaison des scénarios (Économique / Standard / Premium /
                Personnalisé) — le coût de construction est identique au
                résultat « Coût de construction » ; les travaux personnalisés
                (dont les panneaux solaires) y sont intégrés automatiquement. ── */}
            {scenarioRows.length > 0 && (
              <div className="space-y-1.5">
                <SectionTitle hint="même budget, travaux personnalisés inclus (panneaux solaires compris)">
                  Comparaison des scénarios d'estimation
                </SectionTitle>
                <div className="overflow-hidden rounded-xl border border-border/40">
                  {scenarioRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex flex-wrap items-center gap-2 border-b border-border/25 bg-background px-2.5 py-2 last:border-0"
                    >
                      <span className="text-[11.5px] font-semibold">{row.label}</span>
                      {row.selected && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-primary">
                          Retenu
                        </span>
                      )}
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        coût {formatTndAmount(row.baseCost)}
                        {row.extraCost > 0
                          ? ` + ${formatTndAmount(row.extraCost)} travaux perso. = ${formatTndAmount(row.totalCost)}`
                          : ""}
                        {row.perSqm ? ` · ${formatTndAmount(row.perSqm)}/m²` : ""}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <RealizationBar pct={row.capacityPct} />
                      </div>
                      <span className="w-full text-[10.5px] text-muted-foreground">
                        {row.missing > 0
                          ? `Reste nécessaire : ${formatTndAmount(row.missing)} pour couvrir ce scénario.`
                          : "Budget couvrant intégralement ce scénario."}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Budget nécessaire pour terminer ── */}
            {plan.remainingToComplete > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-2.5">
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                  Budget nécessaire pour terminer le programme
                </p>
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/40 bg-background p-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Budget disponible</p>
                    <p className="text-sm font-bold tabular-nums">{formatTndAmount(plan.budget)}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background p-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coût estimé total</p>
                    <p className="text-sm font-bold tabular-nums">{formatTndAmount(plan.selectedCost)}</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/40 bg-background p-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reste nécessaire</p>
                    <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatTndAmount(plan.remainingToComplete)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── Prochaine étape recommandée ── */}
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-2.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                  Prochaine étape recommandée
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug">{plan.nextStep}</p>
              </div>
            </div>

            {/* ── Recommandation générale + Quantitatif détaillé ── */}
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div>
                <p className="text-[11px] font-semibold">Recommandation</p>
                <p className="text-[11px] leading-snug text-muted-foreground">{analysis.recommendation}</p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  Combinaison conseillée : {analysis.optimalCombination}
                </p>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CapacityDecisionCard;
