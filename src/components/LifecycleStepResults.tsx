// ============================================================================
// RÉSULTATS ANIMÉS PAR ÉTAPE — parcours « De l'idée à l'investissement »
//
// Sous chaque étape terminée du cycle de vie, un court « clip statistique »
// animé affiche les résultats RÉELS du projet de référence : les chiffres
// proviennent du backend (`api.lifecycleShowcase.getShowcase` — moteurs BIM,
// feuille de route et investissement + annuaires réels). Aucune valeur
// fictive ni aléatoire n'est générée ici.
//
// Apparition : fade + léger slide (framer-motion). Les nombres sont animés
// progressivement (compteurs) ; « réduire les animations » les affiche
// directement à leur valeur finale.
// ============================================================================

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Banknote,
  Building2,
  CalendarRange,
  CheckCircle2,
  Coins,
  Gauge,
  HardHat,
  Layers,
  Loader2,
  MapPin,
  Percent,
  Ruler,
  Store,
  TrendingUp,
  Users,
  Wand2,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatTnd } from "@/lib/utils";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/lib/supplierSpecialties";
import { cn } from "@/lib/utils";
import type { LifecycleShowcase } from "@/convex/lifecycleShowcase";

// ============================================================================
// COMPTEURS ANIMÉS
// ============================================================================

/** Interpolation douce (easeOutCubic) d'un nombre vers sa cible. */
function useCountUp(target: number, duration = 950): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const safe = Number.isFinite(target) ? target : 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(safe * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(safe);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduceMotion]);

  return value;
}

/** Nombre animé (compteur) avec formatage personnalisable. */
function AnimatedNumber({
  value,
  format,
  suffix = "",
}: {
  value: number;
  format?: (n: number) => string;
  suffix?: string;
}) {
  const v = useCountUp(value);
  const text = format
    ? format(v)
    : Math.round(v).toLocaleString("fr-FR");
  return (
    <>
      {text}
      {suffix}
    </>
  );
}

// ============================================================================
// BRIQUES D'INTERFACE
// ============================================================================

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tone = "text-muted-foreground",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className={cn("h-3 w-3 shrink-0", tone)} />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold leading-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Bar({
  label,
  percentage,
  cost,
  delay,
}: {
  label: string;
  percentage: number;
  cost: number;
  delay: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10.5px] mb-1">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {formatTnd(cost)} · {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, Math.min(100, percentage))}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function Chip({ children, tone = "bg-muted/40 text-muted-foreground" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5 text-[10px] font-medium", tone)}>
      {children}
    </span>
  );
}

/** Carte compacte d'un prestataire réel (fournisseur ou expert). */
function ProfileMiniCard({
  title,
  name,
  region,
  specialty,
  icon: Icon,
  tone,
}: {
  title: string;
  name: string;
  region: string;
  specialty?: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/70 p-2.5">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="truncate text-[12px] font-semibold leading-tight">{name}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {specialty ? `${specialty} · ` : ""}{region}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATIONS VISUELLES LÉGÈRES (plan 2D / vue 3D)
// ============================================================================

/** Plan 2D schématique animé — construit à partir des données réelles. */
function PlanSketch({ rooms, floors }: { rooms: number; floors: number }) {
  const cells = Math.max(2, Math.min(6, rooms));
  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
        <Ruler className="h-3 w-3" /> Plan 2D généré
      </p>
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: cells }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 * i, duration: 0.35, ease: "easeOut" }}
            className="h-7 rounded-md border border-sky-500/30 bg-sky-500/10"
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        {floors} niveau{floors > 1 ? "x" : ""} · {rooms} pièce{rooms > 1 ? "s" : ""}
      </p>
    </div>
  );
}

/** Vue 3D isométrique décorative (aucune donnée 3D inventée : proportions réelles). */
function IsometricSketch() {
  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
        <Building2 className="h-3 w-3" /> Vue 3D
      </p>
      <div className="flex h-[70px] items-center justify-center [perspective:600px]">
        <motion.div
          initial={{ opacity: 0, rotateX: -30, rotateZ: 0, scale: 0.9 }}
          animate={{ opacity: 1, rotateX: -18, rotateZ: -28, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative h-8 w-14 rounded-md bg-gradient-to-br from-sky-500/70 to-cyan-500/50 shadow-lg"
          style={{ transformStyle: "preserve-3d" }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// PANNEAU DE RÉSULTAT PAR ÉTAPE
// ============================================================================

const STEP_TONES: Record<string, { accent: string; icon: LucideIcon }> = {
  cost: { accent: "text-emerald-600", icon: Wallet },
  plans: { accent: "text-sky-600", icon: Ruler },
  materials: { accent: "text-violet-600", icon: Layers },
  consult: { accent: "text-amber-600", icon: Users },
  execution: { accent: "text-teal-600", icon: HardHat },
  investment: { accent: "text-indigo-600", icon: TrendingUp },
};

export function StepResultPanel({
  stepKey,
  stepLabel,
  data,
  className,
}: {
  stepKey: string;
  stepLabel: string;
  data: LifecycleShowcase;
  /** Marge / positionnement imposés par l'appelant (mobile vs desktop). */
  className?: string;
}) {
  const tone = STEP_TONES[stepKey] ?? { accent: "text-primary", icon: Gauge };
  const Icon = tone.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={className}
    >
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className="text-[12px] font-semibold">
            Résultat — <span className={tone.accent}>{stepLabel}</span>
          </p>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> Terminé
          </span>
        </div>

        <div className="p-3.5 sm:p-4">
          {stepKey === "cost" && <CostResult data={data} />}
          {stepKey === "plans" && <PlanResult data={data} />}
          {stepKey === "materials" && <MaterialsResult data={data} />}
          {stepKey === "consult" && <ConsultResult data={data} />}
          {stepKey === "execution" && <ExecutionResult data={data} />}
          {stepKey === "investment" && <InvestmentResult data={data} />}
        </div>
      </div>
    </motion.div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{children}</div>;
}

/**
 * Attente d'un résultat : l'étape est déjà « Terminé » mais les données réelles
 * ne sont pas encore chargées. On affiche une progression générique — jamais de
 * chiffres inventés.
 */
export function ResultPlaceholder({
  stepLabel,
  className,
}: {
  stepLabel: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("rounded-2xl border border-dashed border-border/60 bg-card/40 p-4", className)}
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <p className="text-[11px] font-medium text-muted-foreground">
          Résultat de « {stepLabel} » en cours de calcul…
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    </motion.div>
  );
}

// ── 1. Coût estimatif ───────────────────────────────────────────────────────

function CostResult({ data }: { data: LifecycleShowcase }) {
  const { cost } = data;
  return (
    <div className="space-y-3.5">
      <Grid>
        <Metric
          icon={Coins}
          label="Coût estimatif"
          value={<AnimatedNumber value={cost.total} format={(n) => formatTnd(n)} />}
          sub={`${data.project.categoryLabel} · ${cost.surface} m²`}
          tone="text-emerald-600"
        />
        <Metric
          icon={Ruler}
          label="Coût au m²"
          value={<AnimatedNumber value={cost.costPerM2} format={(n) => formatTnd(n)} />}
          sub={`${cost.surface} m² construits`}
          tone="text-emerald-600"
        />
        <Metric
          icon={Gauge}
          label="Confiance IA"
          value={<AnimatedNumber value={cost.confidence} suffix=" %" />}
          sub="Indice de fiabilité de l'estimation"
          tone="text-sky-600"
        />
        <Metric
          icon={Layers}
          label="Quantitatif"
          value={<AnimatedNumber value={cost.itemsCount} />}
          sub={`${cost.itemsCount} postes · ${cost.quantitatifLots} lots`}
          tone="text-violet-600"
        />
      </Grid>

      <div className="rounded-xl border border-border/50 bg-background/70 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Répartition du budget
        </p>
        <div className="space-y-2">
          {cost.breakdown.map((b, i) => (
            <Bar key={b.label} label={b.label} percentage={b.percentage} cost={b.cost} delay={0.08 * i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 2. Plan IA ──────────────────────────────────────────────────────────────

function PlanResult({ data }: { data: LifecycleShowcase }) {
  const { plan } = data;
  return (
    <div className="space-y-3.5">
      <Grid>
        <Metric
          icon={Ruler}
          label="Surface"
          value={<AnimatedNumber value={plan.surface} suffix=" m²" />}
          tone="text-sky-600"
        />
        <Metric
          icon={Building2}
          label="Niveaux"
          value={<AnimatedNumber value={plan.floors} />}
          tone="text-sky-600"
        />
        <Metric
          icon={Layers}
          label="Pièces"
          value={<AnimatedNumber value={plan.roomsTotal} />}
          tone="text-sky-600"
        />
        <Metric
          icon={Wand2}
          label="Variantes"
          value={<AnimatedNumber value={plan.variants} />}
          sub="scénarios de budget"
          tone="text-indigo-600"
        />
      </Grid>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <PlanSketch rooms={plan.roomsTotal} floors={plan.floors} />
        <IsometricSketch />
      </div>

      {plan.methods.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.methods.slice(0, 6).map((m) => (
            <Chip key={m} tone="bg-sky-500/10 text-sky-700 dark:text-sky-400">{m}</Chip>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 3. Choix des matériaux ──────────────────────────────────────────────────

function MaterialsResult({ data }: { data: LifecycleShowcase }) {
  const { materials } = data;
  return (
    <div className="space-y-3.5">
      <Grid>
        <Metric
          icon={Layers}
          label="Matériaux analysés"
          value={<AnimatedNumber value={materials.analyzed} />}
          tone="text-violet-600"
        />
        <Metric
          icon={CheckCircle2}
          label="Sélectionnés"
          value={<AnimatedNumber value={materials.selected} />}
          tone="text-emerald-600"
        />
        <Metric
          icon={Banknote}
          label="Économie possible"
          value={<AnimatedNumber value={materials.potentialSaving} format={(n) => formatTnd(n)} />}
          sub="standard → économique"
          tone="text-emerald-600"
        />
        <Metric
          icon={Percent}
          label="Prix unitaires"
          value={<AnimatedNumber value={materials.unitPrices.length} />}
          sub="matériaux clés suivis"
          tone="text-violet-600"
        />
      </Grid>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {materials.unitPrices.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-background/70 p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Prix unitaires
            </p>
            <ul className="space-y-1">
              {materials.unitPrices.map((m) => (
                <li key={m.name} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-muted-foreground">{m.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {m.unitPrice.toLocaleString("fr-FR")} <span className="text-[9px] font-normal text-muted-foreground">TND{m.unit ? `/${m.unit}` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {materials.supplier && (
          <ProfileMiniCard
            title="Carte fournisseur"
            name={materials.supplier.name}
            region={materials.supplier.regionLabel}
            specialty={materials.supplier.specialties
              .map((s) => SUPPLIER_SPECIALTIES_LABELS[s] ?? s)
              .slice(0, 2)
              .join(" · ")}
            icon={Store}
            tone="bg-violet-500/10 text-violet-600"
          />
        )}
      </div>
    </div>
  );
}

// ── 4. Consultations / experts ──────────────────────────────────────────────

function ConsultResult({ data }: { data: LifecycleShowcase }) {
  const { consultations } = data;
  return (
    <div className="space-y-3.5">
      <Grid>
        <Metric
          icon={Users}
          label="Experts identifiés"
          value={<AnimatedNumber value={consultations.expertsCount} />}
          tone="text-amber-600"
        />
        <Metric
          icon={Layers}
          label="Catégories"
          value={<AnimatedNumber value={consultations.categories.length} />}
          tone="text-amber-600"
        />
        <Metric
          icon={MapPin}
          label="Régions couvertes"
          value={<AnimatedNumber value={consultations.regionsCount} />}
          sub={consultations.topRegion ? `Plus active : ${consultations.topRegion}` : undefined}
          tone="text-emerald-600"
        />
        <Metric
          icon={Wand2}
          label="Recommandations IA"
          value={<span className="text-[13px]">Actives</span>}
          sub="classées par besoin & région"
          tone="text-indigo-600"
        />
      </Grid>

      {consultations.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {consultations.categories.map((c) => (
            <Chip key={c.key} tone="bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <span aria-hidden>{c.icon}</span>
              {c.label} · {c.count}
            </Chip>
          ))}
        </div>
      )}

      {consultations.engineer && (
        <ProfileMiniCard
          title="Carte ingénieur"
          name={consultations.engineer.name}
          region={consultations.engineer.regionLabel}
          specialty={consultations.engineer.professionLabel}
          icon={Wrench}
          tone="bg-amber-500/10 text-amber-600"
        />
      )}
    </div>
  );
}

// ── 5. Exécution & suivi ────────────────────────────────────────────────────

function ExecutionResult({ data }: { data: LifecycleShowcase }) {
  const { execution } = data;
  return (
    <div className="space-y-3.5">
      <div className="rounded-xl border border-border/50 bg-background/70 p-3">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Progression du projet</span>
          <span className="tabular-nums text-teal-600">
            <AnimatedNumber value={execution.progress} suffix=" %" />
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(1, Math.min(100, execution.progress))}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <Grid>
        <Metric
          icon={CheckCircle2}
          label="Étapes réalisées"
          value={<AnimatedNumber value={execution.tasksDone} />}
          sub={`sur ${execution.tasksTotal} tâches`}
          tone="text-teal-600"
        />
        <Metric
          icon={Layers}
          label="Phases"
          value={<AnimatedNumber value={execution.phases} />}
          tone="text-teal-600"
        />
        <Metric
          icon={Wallet}
          label="Coûts suivis"
          value={<AnimatedNumber value={execution.plannedBudget} format={(n) => formatTnd(n)} />}
          tone="text-emerald-600"
        />
        <Metric
          icon={CalendarRange}
          label="Durée planifiée"
          value={<AnimatedNumber value={execution.plannedDurationDays} suffix=" j" />}
          tone="text-sky-600"
        />
      </Grid>
    </div>
  );
}

// ── 6. Investissement ───────────────────────────────────────────────────────

function InvestmentResult({ data }: { data: LifecycleShowcase }) {
  const { investment } = data;
  return (
    <Grid>
      <Metric
        icon={Wallet}
        label="Montant d'investissement"
        value={<AnimatedNumber value={investment.amount} format={(n) => formatTnd(n)} />}
        tone="text-indigo-600"
      />
      <Metric
        icon={Percent}
        label="Rendement estimatif"
        value={<AnimatedNumber value={investment.netYieldPct} suffix=" %" />}
        sub={`Brut ${investment.grossYieldPct.toLocaleString("fr-FR")} %`}
        tone="text-emerald-600"
      />
      <Metric
        icon={Coins}
        label="Revenus nets / an"
        value={<AnimatedNumber value={investment.annualNetIncome} format={(n) => formatTnd(n)} />}
        sub={`Cash-flow ${Math.round(investment.monthlyCashflow).toLocaleString("fr-FR")} TND/mois`}
        tone="text-emerald-600"
      />
      <Metric
        icon={TrendingUp}
        label="ROI 10 ans"
        value={<AnimatedNumber value={investment.roi10yPct} suffix=" %" />}
        sub="Return on Investment"
        tone="text-violet-600"
      />
    </Grid>
  );
}
