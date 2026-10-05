// ============================================================================
// AIDE À LA DÉCISION — Optimisation + Budget IA
// ----------------------------------------------------------------------------
// Composant principal affiché dans la page dédiée « Aide à la décision » :
//   • Analyse de vos matériaux (matériau par matériau) — maintenant dans
//     « Coût de construction » (sous la carte « Confiance »).
//   • Optimisation « Optimisez votre projet » (leviers, simulation, décisions).
// ============================================================================

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock3,
  Coins,
  Info,
  Lightbulb,
  Pitcher,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatTnd } from "@/lib/utils";
import { PREDICTION_CONFIDENCE_LABELS } from "@/lib/decisionAnalysis";
import {
  buildProgress,
  combineSavings,
  progressionBlocks,
  type OptimizationLeverKey,
  type OptimizationOpportunity,
  type OptimizationPlan,
  type OptimizationRisk,
  type OpportunityAction,
} from "@/lib/optimizationEngine";

function budgetProgressionBlocks(pct: number, total = 24, max = 100): string {
  const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
  const filled = clamp(Math.round((clamp(pct, 0, max) / max) * total), 0, total);
  return "\u2588".repeat(filled) + "\u2591".repeat(total - filled);
}

function formatTndInt(n: number) {
  return formatTnd(Math.round(n));
}

function KPIBlock({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-bold tabular-nums", tone && tone.startsWith("text-") ? tone : "")}>
        {value}
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Tag; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <Icon className={cn("h-3.5 w-3.5", tone ?? "text-muted-foreground")} />
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

const LEVER_ICONS: Record<OptimizationLeverKey, typeof Tag> = {
  prix: Tag,
  materiaux: Pitcher,
  quantites: Pitcher,
  periode: CalendarClock,
  regroupement: ShoppingCart,
  scenario: Pitcher,
};

const RISK_META: Record<OptimizationRisk, { label: string; cls: string }> = {
  faible: { label: "Risque faible", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  moyen: { label: "Risque modéré", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  eleve: { label: "Arbitrage à valider", cls: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" },
};

const ACTION_BADGE: Record<Exclude<OpportunityAction, "pending">, string> = {
  applied: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ignored: "border-border/50 bg-muted/40 text-muted-foreground",
  later: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};
const ACTION_LABEL: Record<Exclude<OpportunityAction, "pending">, string> = {
  applied: "Appliquée",
  ignored: "Ignorée",
  later: "Plus tard",
};

export function OptimizationSection({
  plan,
  budgetAnalysis,
  onBudgetAnalyze,
  onBudgetEdit,
  budgetAvailable,
  onBudgetChange,
}: {
  plan: OptimizationPlan;
  budgetAnalysis?: { available: boolean } | null;
  onBudgetAnalyze?: () => void;
  onBudgetEdit?: () => void;
  budgetAvailable?: number;
  onBudgetChange?: (value: string) => void;
}) {
  const [decisions, setDecisions] = useState<Record<string, OpportunityAction>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const budgetInputRef = useRef<HTMLInputElement>(null);

  const appliedIds = useMemo(
    () => plan.opportunities.filter((o) => decisions[o.id] === "applied").map((o) => o.id),
    [decisions],
  );
  const pendingSelected = useMemo(
    () => selected.filter((id) => decisions[id] !== "applied" && decisions[id] !== "ignored"),
    [selected, decisions],
  );

  const progress = useMemo(
    () => buildProgress(plan.opportunities, appliedIds, selected, plan.projectTotal),
    [plan.opportunities, plan.projectTotal, appliedIds, selected],
  );

  const simulation = useMemo(
    () => {
      const union = Array.from(new Set([...appliedIds, ...selected]));
      const c = combineSavings(plan.opportunities, union);
      const gain = Math.max(0, Math.round(c.realisable - progress.niveauActuel));
      const apres = Math.max(0, Math.round(plan.coutTotal - c.realisable));
      return { gain, apres, pct: c.realisablePct };
    },
    [plan.opportunities, plan.projectTotal, plan.coutTotal, appliedIds, selected, progress.niveauActuel],
  );

  const setAction = (id: string, action: Exclude<OpportunityAction, "pending">) => {
    setDecisions((d) => ({ ...d, [id]: action }));
    setSelected((s) => s.filter((x) => x !== id));
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const validateSelection = () => {
    if (pendingSelected.length === 0) return;
    setDecisions((d) => {
      const next = { ...d };
      for (const id of pendingSelected) next[id] = "applied";
      return next;
    });
    setSelected([]);
  };

  const budgetInputValue = typeof budgetAvailable === "number" ? String(budgetAvailable) : "";

  if (!plan.available) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2.5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-bold">Optimisez votre projet</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{plan.reason ?? "Données insuffisantes."}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Saisie du budget ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Coins className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold tracking-tight">Quel est votre budget disponible ?</p>
              <p className="text-[11px] text-muted-foreground">
                Saisissez votre budget total disponible pour ce projet. L'analyse sera calculée automatiquement.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="sr-only">Budget total (TND)</label>
              <Input
                ref={budgetInputRef}
                type="number"
                min="0"
                step="1"
                value={budgetInputValue}
                onChange={(e) => onBudgetChange?.(e.target.value)}
                placeholder="0 TND"
                className="h-10 text-base font-medium tabular-nums"
              />
            </div>
            <Button
              className="gap-1.5 whitespace-nowrap"
              disabled={!Number.isFinite(Number(budgetInputValue)) || Number(budgetInputValue) <= 0}
              onClick={() => onBudgetAnalyze?.()}
            >
              <Sparkles className="h-4 w-4" />
              Analyser mon budget avec l'IA
            </Button>
          </div>
          {typeof budgetAvailable === "number" && budgetAvailable > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Budget analysé : <span className="font-semibold text-foreground">{formatTndInt(budgetAvailable)} TND</span>
              {budgetAnalysis && (
                <span className="ml-2 text-amber-700 dark:text-amber-300"> — {budgetAnalysis.available ? "analyse disponible" : "non disponible"}</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Coût total ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Pitcher className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">Coût total</h3>
          </div>
          <div className="mt-3 grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coût initial</p>
              <p className="text-base font-black tabular-nums">{formatTnd(plan.coutInitial)}</p>
            </div>
            <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Potentiel d'optimisation</p>
              <p className="text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {plan.potentielPct.toLocaleString("fr-FR")} %
              </p>
            </div>
            <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coût optimisé estimé</p>
              <p className="text-base font-black tabular-nums text-primary">{formatTnd(plan.coutOptimise)}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span>
              Économie réellement réalisable : <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatTnd(plan.economieRealisable)}</span>
            </span>
            <span>
              Somme brute des opportunités : <span className="font-semibold text-foreground">{formatTnd(plan.economieBrute)}</span>
            </span>
            {plan.overlap > 0 && (
              <span>
                Dédoublonnage (chevauchements) : −{formatTnd(plan.overlap)} ({plan.overlapPct.toLocaleString("fr-FR")} %)
              </span>
            )}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Estimation basée sur les opportunités actuellement détectées. Les économies ne sont jamais additionnées
            naïvement : les recommandations qui se chevauchent sont dédoublonnées.
          </p>
        </CardContent>
      </Card>

      {/* ── Parcours d'optimisation ── */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pitcher className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">Optimisez votre projet</h3>
          </div>

          {/* Progression */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Niveau actuel</p>
              <p className="text-lg font-black tabular-nums">{progress.niveauActuelPct.toLocaleString("fr-FR")} %</p>
              <p className="text-[10px] text-muted-foreground">{formatTnd(progress.niveauActuel)} d'économie validée</p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Après recommandations sélectionnées</p>
              <p className="text-lg font-black tabular-nums text-sky-600 dark:text-sky-400">
                {progress.apresSelectionPct.toLocaleString("fr-FR")} %
              </p>
              <p className="text-[10px] text-muted-foreground">{formatTnd(progress.apresSelection)} d'économie estimée</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Potentiel restant</p>
              <p className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                +{progress.potentielRestantPct.toLocaleString("fr-FR")} %
              </p>
              <p className="text-[10px] text-muted-foreground">{formatTnd(progress.potentielRestant)} encore mobilisables</p>
            </div>
          </div>
          <div className="mt-2 overflow-x-auto pb-2">
            <span className="font-mono text-[12px] tracking-widest text-primary" aria-hidden>
              {progressionBlocks(progress.niveauActuelPct)}
            </span>
            <span className="ml-2 text-[10px] text-muted-foreground">
              Optimisation actuelle {progress.niveauActuelPct.toLocaleString("fr-FR")} % · potentiel total{" "}
              {progress.fullPct.toLocaleString("fr-FR")} %
            </span>
          </div>

          {/* Leviers */}
          <div className="mt-3 space-y-2">
            {plan.levers.map((lever) => {
              const Icon = LEVER_ICONS[lever.key];
              const isOpen = expanded[lever.key] ?? false;
              const ops = plan.opportunities.filter((o) => o.lever === lever.key);
              return (
                <div key={lever.key} className="overflow-hidden rounded-xl border border-border/40">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [lever.key]: !isOpen }))}
                    className="flex w-full items-center gap-2.5 bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-black text-primary">
                      {lever.index}
                    </span>
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold">{lever.title}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{lever.description}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[12px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {lever.savingPct.toLocaleString("fr-FR")} %
                      </span>
                      <span className="block text-[9.5px] text-muted-foreground">
                        {lever.opportunityCount} opportunité(s)
                      </span>
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-border/30 p-2.5">
                      {ops.map((op) => (
                        <OpportunityRow
                          key={op.id}
                          op={op}
                          action={decisions[op.id] ?? "pending"}
                          selected={pendingSelected.includes(op.id)}
                          open={openId === op.id}
                          onToggleSelect={() => toggleSelect(op.id)}
                          onToggleOpen={() => setOpenId((v) => (v === op.id ? null : op.id))}
                          onAction={(a) => setAction(op.id, a)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Simulation avant application */}
          {pendingSelected.length > 0 && (
            <div className="mt-3 rounded-xl border border-sky-500/40 bg-sky-500/[0.05] p-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-sky-600" />
                <h4 className="text-[12px] font-bold">Simulation — avant validation</h4>
                <span className="ml-auto rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                  {pendingSelected.length} sélectionnée(s)
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avant</p>
                  <p className="text-sm font-bold tabular-nums">{formatTnd(plan.coutInitial)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Après optimisation</p>
                  <p className="text-sm font-bold tabular-nums text-primary">{formatTnd(simulation.apres)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gain</p>
                  <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatTnd(simulation.gain)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Optimisation</p>
                  <p className="text-sm font-bold tabular-nums">{simulation.pct.toLocaleString("fr-FR")} %</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Aucune modification n'est appliquée à votre projet avant validation.
              </p>
              <Button size="sm" className="mt-2 h-8 gap-1.5" onClick={validateSelection}>
                <CircleCheck className="h-3.5 w-3.5" /> Valider cette optimisation
              </Button>
            </div>
          )}

          {/* Explication */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[11px] font-semibold">Comment fonctionne l'optimisation ?</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{plan.explainer}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OpportunityRow({
  op,
  action,
  selected,
  open,
  onToggleSelect,
  onToggleOpen,
  onAction,
}: {
  op: OptimizationOpportunity;
  action: OpportunityAction;
  selected: boolean;
  open: boolean;
  onToggleSelect: () => void;
  onToggleOpen: () => void;
  onAction: (a: Exclude<OpportunityAction, "pending">) => void;
}) {
  const risk = RISK_META[op.risk];
  const Icon = LEVER_ICONS[op.lever];
  const done = action === "applied" || action === "ignored";
  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        action === "applied"
          ? "border-emerald-500/40 bg-emerald-500/[0.04]"
          : action === "ignored"
            ? "border-border/40 bg-muted/20 opacity-60"
            : "border-border/40 bg-background",
      )}
    >
      <div className="flex items-start gap-2.5 p-3">
        <label className="mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={selected}
            disabled={done}
            onChange={onToggleSelect}
            aria-label={`Inclure ${op.title} dans la simulation`}
            className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-[12px] font-semibold">{op.title}</span>
            {action !== "pending" && (
              <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold", ACTION_BADGE[action as Exclude<OpportunityAction, "pending">])}>
                {ACTION_LABEL[action as Exclude<OpportunityAction, "pending">]}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
            <span>Impact {op.impactScore}/100</span>
            <span className={cn("rounded-full border px-2 py-0.5 font-semibold", risk.cls)} title="Niveau de risque / d'arbitrage de cette opportunité">
              {risk.label}
            </span>
            <span>Compatibilité {op.compatibility}/100</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-2.5 w-2.5" /> Confiance {PREDICTION_CONFIDENCE_LABELS[op.confidence]}
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-border/30 bg-muted/10 p-3">
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Situation actuelle : </span>
              <span className="font-medium">{op.currentLabel}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Alternative : </span>
              <span className="font-medium">{op.alternativeLabel}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Matériau concerné : </span>
              <span className="font-medium">{op.designation}</span>
              {op.group ? ` (${op.group})` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Base de coût : </span>
              <span className="font-medium">{formatTnd(op.baseCost)}</span>
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-2.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-[11px] leading-snug">{op.justification}</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-snug">
              <span className="font-semibold">Conséquences éventuelles : </span>
              {op.consequences}
            </p>
          </div>
          {!done && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="h-8 gap-1.5" onClick={() => onAction("applied")}>
                <Check className="h-3.5 w-3.5" /> Appliquer
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onAction("ignored")}>
                Ignorer
              </Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => onAction("later")}>
                <Clock3 className="h-3.5 w-3.5" /> Plus tard
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}