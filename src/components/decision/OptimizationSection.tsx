// ============================================================================
// AIDE À LA DÉCISION — « OPTIMISEZ VOTRE PROJET »
// ----------------------------------------------------------------------------
// Couche d'OPTIMISATION au-dessus de l'analyse matériau-par-matériau :
//   • objectif d'optimisation dynamique (jauge + zone cible) ;
//   • coût total → potentiel → coût optimisé estimé ;
//   • matériaux optimisables + score d'optimisation du projet ;
//   • parcours d'optimisation guidé par 6 leviers ;
//   • examen, simulation (Avant / Après / Gain / %) et décision utilisateur
//     (Appliquer / Ignorer / Plus tard) — aucune modification immédiate.
// Le potentiel n'est JAMAIS forcé : il découle des opportunités réellement
// détectées (voir `optimizationEngine`).
// ============================================================================

import { useMemo, useState } from "react";
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
  Gauge,
  Info,
  Layers,
  Lightbulb,
  Package,
  Recycle,
  Scale,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const LEVER_ICONS: Record<OptimizationLeverKey, typeof Tag> = {
  prix: Tag,
  materiaux: Layers,
  quantites: Recycle,
  periode: CalendarClock,
  regroupement: ShoppingCart,
  scenario: Scale,
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

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Tag; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <Icon className={cn("h-3.5 w-3.5", tone ?? "text-muted-foreground")} />
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
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
  // « Plus tard » reste révisable : seuls Appliquer / Ignorer figent l'opportunité.
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
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Économie potentielle : {formatTnd(op.saving)} · {op.savingPct.toLocaleString("fr-FR")} %
            </span>
            <span>Impact {op.impactScore}/100</span>
            <span
              className={cn("rounded-full border px-2 py-0.5 font-semibold", risk.cls)}
              title="Niveau de risque / d'arbitrage de cette opportunité"
            >
              {risk.label}
            </span>
            <span>Compatibilité {op.compatibility}/100</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-2.5 w-2.5" /> Confiance {PREDICTION_CONFIDENCE_LABELS[op.confidence]}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[11px]" onClick={onToggleOpen}>
          {open ? "Réduire" : "+ Examiner"}
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-border/30 bg-muted/10 p-3">
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
            {op.currentLabel && (
              <p>
                <span className="text-muted-foreground">Situation actuelle : </span>
                <span className="font-medium">{op.currentLabel}</span>
              </p>
            )}
            {op.alternativeLabel && (
              <p>
                <span className="text-muted-foreground">Alternative : </span>
                <span className="font-medium">{op.alternativeLabel}</span>
              </p>
            )}
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

export function OptimizationSection({ plan }: { plan: OptimizationPlan }) {
  const [decisions, setDecisions] = useState<Record<string, OpportunityAction>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const appliedIds = useMemo(
    () => plan.opportunities.filter((o) => decisions[o.id] === "applied").map((o) => o.id),
    [plan.opportunities, decisions],
  );
  const pendingSelected = useMemo(
    () => selected.filter((id) => decisions[id] !== "applied" && decisions[id] !== "ignored"),
    [selected, decisions],
  );

  const progress = useMemo(
    () => buildProgress(plan.opportunities, appliedIds, pendingSelected, plan.projectTotal),
    [plan.opportunities, plan.projectTotal, appliedIds, pendingSelected],
  );

  // Gain simulé pour la sélection courante (§8).
  const simulation = useMemo(() => {
    const union = Array.from(new Set([...appliedIds, ...pendingSelected]));
    const c = combineSavings(plan.opportunities, union, plan.projectTotal);
    const gain = Math.max(0, Math.round(c.realisable - progress.niveauActuel));
    const apres = Math.max(0, Math.round(plan.coutInitial - c.realisable));
    return { gain, apres, pct: c.realisablePct };
  }, [plan.opportunities, plan.projectTotal, plan.coutInitial, appliedIds, pendingSelected, progress.niveauActuel]);

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

  if (!plan.available) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2.5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-bold">🎯 Optimisez votre projet</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{plan.reason ?? "Données insuffisantes."}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const obj = plan.objective;
  const trackPct = (v: number) => `${Math.max(0, Math.min(100, (v / 25) * 100))}%`;
  const bandTone =
    obj.band === "eleve" ? "text-amber-600 dark:text-amber-400" : obj.band === "atteint" ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400";

  return (
    <div className="space-y-3">
      {/* ── §16 Récapitulatif supérieur (dynamique) ── */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat icon={Package} label="Total des matériaux" value={String(plan.topCards.materials)} tone="text-primary" />
        <Stat
          icon={Wallet}
          label="Budget optimisé"
          value={`${formatTnd(plan.topCards.budgetOptimise)} · −${plan.topCards.budgetOptimisePct.toLocaleString("fr-FR")} %`}
          tone="text-emerald-600"
        />
        <Stat
          icon={Recycle}
          label="Réduction des pertes"
          value={`${plan.topCards.pertesPct.toLocaleString("fr-FR")} %`}
          tone="text-amber-600"
        />
        <Stat
          icon={TrendingUp}
          label="Prévision des prix"
          value={formatTnd(plan.topCards.previsionPrix)}
          tone="text-sky-600"
        />
      </div>

      {/* ── §3 Objectif d'optimisation (jauge) ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-background">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Objectif d'optimisation</h3>
                <p className="text-[11px] text-muted-foreground">
                  Zone de référence {obj.targetLow}–{obj.targetHigh} % — une orientation, jamais une obligation.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Potentiel actuel</p>
              <p className={cn("text-2xl font-black tabular-nums", bandTone)}>
                {obj.currentPct.toLocaleString("fr-FR")} %
              </p>
            </div>
          </div>

          {/* Jauge : piste 0–25 %, zone cible 15–20 % matérialisée. */}
          <div className="mt-3">
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 border-x border-primary/40 bg-primary/10"
                style={{ left: trackPct(obj.targetLow), width: trackPct(obj.targetHigh - obj.targetLow) }}
                title={`Zone cible ${obj.targetLow}–${obj.targetHigh} %`}
              />
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  obj.band === "en_cours" ? "bg-sky-500" : obj.band === "atteint" ? "bg-emerald-500" : "bg-amber-500",
                )}
                style={{ width: trackPct(obj.currentPct) }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
              <span>0 %</span>
              <span>Zone cible : {obj.targetLow}–{obj.targetHigh} %</span>
              <span>25 %</span>
            </div>
          </div>

          <p className={cn("mt-2 text-[11px] font-semibold", bandTone)}>{obj.message}</p>

          {plan.honesty && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/[0.05] p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">{plan.honesty}</p>
            </div>
          )}

          {obj.band !== "en_cours" && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-2.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                  🎯 Potentiel intéressant détecté
                </p>
                <p className="text-[11px] leading-snug text-emerald-800/90 dark:text-emerald-200/90">
                  Plusieurs leviers d'optimisation peuvent permettre d'améliorer le coût du projet. Sélectionnez les
                  recommandations qui correspondent à vos priorités.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── §12/13 Coût total optimisable + §14 Matériaux optimisables ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold tracking-tight">💰 Coût total</h3>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold tracking-tight">🧱 Matériaux optimisables</h3>
            </div>
            <p className="mt-2 text-2xl font-black tabular-nums">
              {plan.materiauxOptimisables}
              <span className="text-sm font-medium text-muted-foreground"> / {plan.materiauxTotal}</span>
            </p>
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{plan.fortImpact}</span> matériau(x) à fort impact
              </p>
              <p>
                <span className="font-semibold text-foreground">{plan.alternativesDisponibles}</span> alternative(s) disponible(s)
              </p>
              <p>
                <span className="font-semibold text-foreground">{plan.opportunitesAchat}</span> opportunité(s) d'achat
              </p>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Analyse individuelle des matériaux (jamais des catégories).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── §15 Score d'optimisation du projet ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">Score d'optimisation du projet</h3>
            <span className="ml-auto text-lg font-black tabular-nums text-primary">{plan.scoreOptimisation}/100</span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Capacité du projet à être optimisé — à ne pas confondre avec le pourcentage d'économie (potentiel{" "}
            {plan.potentielPct.toLocaleString("fr-FR")} %).
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
            {plan.scoreCriteria.map((c) => (
              <div key={c.label}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium">{c.label}</span>
                  <span className="ml-auto text-[11px] font-bold tabular-nums">{c.value}/100</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, c.value))}%` }} />
                </div>
                <p className="mt-0.5 text-[9.5px] text-muted-foreground">{c.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── §4 Parcours d'optimisation ── */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">🎯 Optimisez votre projet</h3>
            <span className="text-[10px] text-muted-foreground">
              Objectif de référence : {obj.targetLow}–{obj.targetHigh} %
            </span>
          </div>

          {/* Progression (§9) */}
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
          <div className="mt-2 overflow-x-auto">
            <span className="font-mono text-[12px] tracking-widest text-primary" aria-hidden>
              {progressionBlocks(progress.niveauActuelPct)}
            </span>
            <span className="ml-2 text-[10px] text-muted-foreground">
              Optimisation actuelle {progress.niveauActuelPct.toLocaleString("fr-FR")} % · potentiel total{" "}
              {progress.fullPct.toLocaleString("fr-FR")} %
            </span>
          </div>

          {/* Leviers (§5) */}
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
                      {lever.note && (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Info className="h-3 w-3 shrink-0" /> {lever.note}
                        </p>
                      )}
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

          {/* §8 Simulation avant application */}
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

          {/* §18 Explication */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[11px] font-semibold">ℹ️ Comment fonctionne l'optimisation ?</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{plan.explainer}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
