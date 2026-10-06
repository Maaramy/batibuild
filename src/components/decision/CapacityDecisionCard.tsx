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
import {
  ChevronDown,
  ChevronUp,
  Hammer,
  Info,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
} from "@/lib/constructionPlanEngine";

// ── Helpers visuels (reprises du module budget) ────────────────────────────

const STATUS_META: Record<BudgetStatus, { label: string; cls: string; dot: string }> = {
  realisable: {
    label: "100 % ✅",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  partiel: {
    label: "Partiel 🟠",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  report: {
    label: "0 % 🔴",
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

/** Barre de réalisation d'un poste (montant financé / montant estimé). */
function RealizationBar({ pct }: { pct: number }) {
  const v = clampPct(pct);
  const tone = v >= 100 ? "bg-emerald-500" : v > 0 ? "bg-amber-500" : "bg-border";
  return (
    <div className="flex w-24 shrink-0 items-center justify-end gap-1.5 sm:w-36">
      <div className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-muted sm:w-20">
        <div className={cn("h-full rounded-full transition-[width] duration-300", tone)} style={{ width: `${v}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums text-[9.5px] text-muted-foreground">
        {formatPercent(v)}
      </span>
    </div>
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
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <p className={cn("mt-0.5 text-sm font-bold tabular-nums", tone)}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// ── Quantitatif détaillé (repliable) ───────────────────────────────────────

function QuantitatifTable({ analysis }: { analysis: BudgetAnalysis }) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-2">
      {analysis.breakdown.map((cat) => {
        const catOpen = openCategories[cat.categoryId] ?? false;
        return (
          <div key={cat.categoryId} className="overflow-hidden rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setOpenCategories((s) => ({ ...s, [cat.categoryId]: !catOpen }))}
              className="flex w-full items-center gap-2.5 bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold">{shortLabel(cat.categoryLabel)}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {formatTndAmount(cat.estimatedCost)} · {formatPercent(cat.pctOfTotal)} du projet
                </span>
              </span>
              <RealizationBar pct={cat.realizationPct} />
              <StatusBadge status={cat.status} />
              {catOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>

            {catOpen && (
              <div className="space-y-1.5 border-t border-border/30 p-2.5">
                {cat.subcategories.map((sub) => {
                  const subKey = `${cat.categoryId}:${sub.subcategoryId}`;
                  const subOpen = openSubs[subKey] ?? false;
                  return (
                    <div key={subKey} className="overflow-hidden rounded-lg border border-border/30">
                      <button
                        type="button"
                        onClick={() => setOpenSubs((s) => ({ ...s, [subKey]: !subOpen }))}
                        className="flex w-full items-center gap-2 bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/20"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-medium">{shortLabel(sub.subcategoryLabel)}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {formatTndAmount(sub.estimatedCost)} · {formatPercent(sub.pctOfCategory)} de la catégorie
                          </span>
                        </span>
                        <RealizationBar pct={sub.realizationPct} />
                        <StatusBadge status={sub.status} />
                        {subOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>

                      {subOpen && (
                        <div className="border-t border-border/20 p-2">
                          <ul className="space-y-1">
                            {sub.articles.map((art, idx) => (
                              <li key={`${subKey}:${idx}`} className="flex items-start gap-2 text-[11px]">
                                <span className="min-w-0 flex-1 break-words">
                                  {art.quantity !== undefined ? (
                                    <span className="text-muted-foreground">
                                      {art.quantity} {art.unit} —{" "}
                                    </span>
                                  ) : null}
                                  {art.designation}
                                </span>
                                <span className="w-20 shrink-0 whitespace-nowrap text-right tabular-nums sm:w-24">
                                  {formatTndAmount(art.estimatedCost)}
                                </span>
                                <RealizationBar pct={art.realizationPct} />
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
    </div>
  );
}

// ── Module principal ───────────────────────────────────────────────────────

export interface CapacityDecisionCardProps {
  analysis: BudgetAnalysis;
  /** Lots du Quantitatif détaillé (source des postes manquant au coût). */
  lots?: QuantitatifLot[];
  /** Totaux des scénarios d'estimation (Économique / Standard / Premium). */
  scenarioTotals?: ScenarioTotal[];
}

interface CustomWorkDraft {
  id: string;
  label: string;
  cost: number;
}

export function CapacityDecisionCard({ analysis, lots, scenarioTotals }: CapacityDecisionCardProps) {
  const [open, setOpen] = useState(true);
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const [customWorks, setCustomWorks] = useState<CustomWorkDraft[]>([]);
  const [customLabel, setCustomLabel] = useState("");
  const [customCost, setCustomCost] = useState("");
  const [seq, setSeq] = useState(1);
  const [openPlanRows, setOpenPlanRows] = useState<Record<string, boolean>>({});
  const [openPlanArticles, setOpenPlanArticles] = useState<Record<string, boolean>>({});
  const [showQuantitatif, setShowQuantitatif] = useState(false);

  // ── Postes du plan : Quantitatif + travaux personnalisés ────────────────
  const works = useMemo<WorkItem[]>(() => {
    const base = deriveWorks(analysis, lots);
    const custom: WorkItem[] = customWorks.map((w) => ({
      id: w.id,
      label: w.label,
      cost: w.cost,
      rank: CUSTOM_WORK_RANK,
      categoryId: "custom",
      custom: true,
    }));
    return [...base, ...custom];
  }, [analysis, lots, customWorks]);

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

  const scenarioRows = useMemo(
    () => compareScenarioCapacity(analysis.availableBudget, scenarioTotals ?? [], analysis.surface),
    [analysis.availableBudget, scenarioTotals, analysis.surface],
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

  const addCustomWork = () => {
    const cost = Math.round(Number(customCost.replace(",", ".")));
    if (!customLabel.trim() || !Number.isFinite(cost) || cost <= 0) return;
    setCustomWorks((prev) => [...prev, { id: `custom:${seq}`, label: customLabel.trim(), cost }]);
    setSeq((n) => n + 1);
    setCustomLabel("");
    setCustomCost("");
  };

  const removeCustomWork = (id: string) => {
    setCustomWorks((prev) => prev.filter((w) => w.id !== id));
    setDeselected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        {/* ── En-tête ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Hammer className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold tracking-tight">Capacité de construction</h3>
          <span className="rounded-full border border-primary/30 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-semibold text-primary">
            budget restant {formatTndAmount(plan.budget)}
          </span>
          <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setOpen((v) => !v)}>
            {open ? "Masquer le détail" : "Voir le détail"}
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* ── Bandeau supérieur ── */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile
            icon={<span aria-hidden>💰</span>}
            label="Budget"
            value={formatTndAmount(plan.budget)}
            hint="budget restant à allouer"
          />
          <SummaryTile
            icon={<span aria-hidden>🏗️</span>}
            label="Capacité de construction"
            value={formatPercent(globalPct)}
            tone={
              globalPct >= 80
                ? "text-emerald-600 dark:text-emerald-400"
                : globalPct >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
            }
            hint={`sur un programme de ${formatTndAmount(plan.selectedCost)}`}
          />
          <SummaryTile
            icon={<span aria-hidden>✅</span>}
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
            icon={<span aria-hidden>💰</span>}
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

              {/* Travaux prioritaires personnalisés */}
              <div className="mt-2 rounded-lg border border-dashed border-border/50 p-2">
                <SectionTitle>Travaux prioritaires personnalisés</SectionTitle>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Ex. : Garage, terrasse, clôture…"
                    className="h-8 text-[11px]"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    value={customCost}
                    onChange={(e) => setCustomCost(e.target.value)}
                    placeholder="Montant (TND)"
                    className="h-8 text-[11px] tabular-nums sm:w-40"
                  />
                  <Button size="sm" className="h-8 gap-1 whitespace-nowrap" onClick={addCustomWork}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                </div>
                {customWorks.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {customWorks.map((w) => (
                      <li
                        key={w.id}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/[0.06] px-2 py-0.5 text-[10px]"
                      >
                        {shortLabel(w.label)} · {formatTndAmount(w.cost)}
                        <button
                          type="button"
                          aria-label={`Retirer ${w.label}`}
                          className="rounded-full p-0.5 hover:bg-primary/10"
                          onClick={() => removeCustomWork(w.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
                                          <span className="w-20 shrink-0 text-right sm:w-32">
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
                        <span className="text-[11px] font-bold tabular-nums text-primary">
                          {formatPercent(globalPct)}
                        </span>
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
                Personnalisé) — mêmes montants que le résultat « Coût de
                construction » ── */}
            {scenarioRows.length > 0 && (
              <div className="space-y-1.5">
                <SectionTitle hint="même budget, selon la solution d'estimation">
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
                        coût {formatTndAmount(row.totalCost)}
                        {row.perSqm ? ` · ${formatTndAmount(row.perSqm)}/m²` : ""}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <RealizationBar pct={row.capacityPct} />
                        <span className="w-14 text-right text-[11px] font-bold tabular-nums text-primary">
                          {formatPercent(row.capacityPct)}
                        </span>
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

            <div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setShowQuantitatif((v) => !v)}
              >
                {showQuantitatif ? "Masquer" : "Voir"} le Quantitatif détaillé
                {showQuantitatif ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
              {showQuantitatif && (
                <div className="mt-2">
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Quantitatif détaillé — réalisation par poste
                  </p>
                  <QuantitatifTable analysis={analysis} />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CapacityDecisionCard;
