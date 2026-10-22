// ============================================================================
// RÉSULTATS ANIMÉS PAR ÉTAPE — parcours « De l'idée à la réalisation »
//
// Sous chaque étape terminée du cycle de vie, un court « clip statistique »
// animé affiche les résultats RÉELS du projet de référence : les chiffres
// proviennent du backend (`api.lifecycleShowcase.getShowcase` — moteurs BIM,
// feuille de route + annuaires réels). Aucune valeur
// fictive ni aléatoire n'est générée ici.
//
// L'étape « Plans AI » utilise le VRAI moteur de plans (`generateFloorPlans`) :
//   · phases 2D  → `FloorPlan2D` (pièces, portes, fenêtres, dimensions réelles) ;
//   · phase 3D   → VUE 3D RÉELLE (`FloorPlan3D`, moteur Three.js) : maquette
//                  navigable (rotation, zoom) construite à partir de la même
//                  géométrie que le plan 2D. En cas d'échec de rendu (WebGL
//                  indisponible), une projection isométrique SVG du plan réel
//                  sert de repli — le panneau ne casse jamais.
//
// Compacité & lisibilité : le média est volontairement bas, et AUCUN texte
// n'est tronqué (`truncate`/`line-clamp` proscrits) — les libellés passent sur
// plusieurs lignes si nécessaire. Les nombres sont animés progressivement
// (compteurs) ; « réduire les animations » les affiche directement à leur
// valeur finale.
// ============================================================================

import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Banknote,
  BrainCircuit,
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
  Users,
  Wand2,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatTnd, cn } from "@/lib/utils";
import {
  generateFloorPlans,
  PLAN_ROOM_COLORS,
  PLAN_ROOM_LABELS,
  type FloorPlan,
} from "@/lib/floorPlanEngine";
import { FloorPlan2D } from "@/components/floorplan/FloorPlan2D";
import { FloorPlan3D } from "@/components/floorplan/FloorPlan3D";
import { allowsPlan3DLevel } from "@/lib/plan3dAccess";
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
  const text = format ? format(v) : Math.round(v).toLocaleString("fr-FR");
  return (
    <>
      {text}
      {suffix}
    </>
  );
}

// ============================================================================
// BRIQUES D'INTERFACE (compactes · textes jamais tronqués)
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
  value: ReactNode;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-background/70 p-2.5">
      <div className="flex items-start gap-1 text-[9.5px] font-medium uppercase leading-snug tracking-wide text-muted-foreground">
        <Icon className={cn("mt-px h-3 w-3 shrink-0", tone)} />
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <p className="mt-0.5 break-words text-[15px] font-bold leading-tight tabular-nums">{value}</p>
      {sub && (
        <p className="mt-0.5 break-words text-[9.5px] leading-snug text-muted-foreground">{sub}</p>
      )}
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
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[10px]">
        <span className="min-w-0 break-words font-medium leading-snug">{label}</span>
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

function Chip({ children, tone = "bg-muted/40 text-muted-foreground" }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 break-words rounded-full border border-border/40 px-2 py-0.5 text-[9.5px] font-medium leading-snug",
        tone,
      )}
    >
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
    <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-background/70 p-2">
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tone)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[8.5px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="break-words text-[11px] font-semibold leading-tight">{name}</p>
        <p className="break-words text-[9.5px] leading-snug text-muted-foreground">
          {specialty ? `${specialty} · ` : ""}
          {region}
        </p>
      </div>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</div>;
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
      className={cn("rounded-2xl border border-dashed border-border/60 bg-card/40 p-3.5", className)}
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <p className="break-words text-[11px] font-medium text-muted-foreground">
          Résultat de « {stepLabel} » en cours de calcul…
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// APERÇU 3D — VUE RÉELLE (Three.js) + repli isométrique SVG
// ============================================================================

/** Éclaircit/fonce une couleur hexadécimale (0 = noir, 1 = couleur). */
function shade(hex: string, factor: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Projection isométrique légère de la géométrie RÉELLE du plan — utilisée
 * uniquement en repli si le rendu WebGL n'est pas disponible.
 */
function IsometricPlan({ plan }: { plan: FloorPlan }) {
  const H = 0.62; // hauteur de projection des murs (m) — rendu compact
  const iso = (x: number, y: number, z: number): [number, number] => [
    (x - y) * 0.866,
    (x + y) * 0.5 - z,
  ];

  const projected: [number, number][] = [];
  for (const r of plan.rooms) {
    for (const [x, y] of [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x + r.w, r.y + r.h],
      [r.x, r.y + r.h],
    ] as const) {
      projected.push(iso(x, y, 0), iso(x, y, H));
    }
  }
  const xs = projected.map((p) => p[0]);
  const ys = projected.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 0.5;
  const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;

  const poly = (arr: [number, number][]) => arr.map(([x, y]) => `${x},${y}`).join(" ");
  const ordered = [...plan.rooms].sort((a, b) => a.x + a.y - (b.x + b.y));

  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="h-full w-full" role="img" aria-label="Aperçu 3D du plan">
      {ordered.map((r) => {
        const color = PLAN_ROOM_COLORS[r.kind] ?? "#e5e7eb";
        const top: [number, number][] = [
          iso(r.x, r.y, H),
          iso(r.x + r.w, r.y, H),
          iso(r.x + r.w, r.y + r.h, H),
          iso(r.x, r.y + r.h, H),
        ];
        const wallSouth: [number, number][] = [
          iso(r.x, r.y + r.h, 0),
          iso(r.x + r.w, r.y + r.h, 0),
          iso(r.x + r.w, r.y + r.h, H),
          iso(r.x, r.y + r.h, H),
        ];
        const wallEast: [number, number][] = [
          iso(r.x + r.w, r.y, 0),
          iso(r.x + r.w, r.y + r.h, 0),
          iso(r.x + r.w, r.y + r.h, H),
          iso(r.x + r.w, r.y, H),
        ];
        return (
          <g key={r.id}>
            <polygon points={poly(wallSouth)} fill={shade(color, 0.72)} stroke="#1c1917" strokeWidth={0.035} />
            <polygon points={poly(wallEast)} fill={shade(color, 0.58)} stroke="#1c1917" strokeWidth={0.035} />
            <polygon points={poly(top)} fill={color} stroke="#1c1917" strokeWidth={0.04} />
          </g>
        );
      })}
    </svg>
  );
}

/** Boundary minimaliste : bascule sur le repli isométrique au premier échec. */
class Plan3DErrorBoundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/** Cadre du média de plan (hauteur compacte, contenu toujours contenu). */
const STAGE_CLASS =
  "relative h-[165px] w-full overflow-hidden rounded-lg border border-border/40 bg-[#fdfdfb] sm:h-[195px] [&>svg]:h-full [&>svg]:w-full";

/**
 * Vue 3D RÉELLE du plan généré (moteur Three.js, rendu compact). Le niveau de
 * qualité est détecté automatiquement (ombres/arêtes sur appareil puissant,
 * mode allégé sur mobile). En cas d'absence de WebGL, repli sur la projection
 * isométrique du même plan — jamais d'écran vide, jamais de faux plan.
 */
function Plan3DView({ plan }: { plan: FloorPlan }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={cn(STAGE_CLASS, "bg-sky-50/70 dark:bg-slate-900/60")}>
        <IsometricPlan plan={plan} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}>
      <Plan3DErrorBoundary
        fallback={
          <div className={cn(STAGE_CLASS, "bg-sky-50/70 dark:bg-slate-900/60")}>
            <IsometricPlan plan={plan} />
          </div>
        }
        onError={() => setFailed(true)}
      >
        <FloorPlan3D plan={plan} compact />
      </Plan3DErrorBoundary>
    </motion.div>
  );
}

// ============================================================================
// PANNEAU DE RÉSULTAT PAR ÉTAPE
// ============================================================================

const STEP_TONES: Record<string, { accent: string; icon: LucideIcon }> = {
  type: { accent: "text-slate-600", icon: Building2 },
  cost: { accent: "text-emerald-600", icon: Wallet },
  decision: { accent: "text-violet-600", icon: BrainCircuit },
  plans: { accent: "text-sky-600", icon: Ruler },
  consult: { accent: "text-amber-600", icon: Users },
  execution: { accent: "text-teal-600", icon: HardHat },
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
      className={cn("min-w-0", className)}
    >
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/50 px-3 py-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-3 w-3" />
          </div>
          <p className="min-w-0 break-words text-[11.5px] font-semibold">
            Résultat — <span className={tone.accent}>{stepLabel}</span>
          </p>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> Terminé
          </span>
        </div>

        <div className="p-3">
          {stepKey === "type" && <TypeResult data={data} />}
          {stepKey === "cost" && <CostResult data={data} />}
          {stepKey === "decision" && <DecisionResult data={data} />}
          {stepKey === "plans" && <PlanResult data={data} />}
          {stepKey === "consult" && <ConsultResult data={data} />}
          {stepKey === "execution" && <ExecutionResult data={data} />}
        </div>
      </div>
    </motion.div>
  );
}

// ── 1. Type de projet — informations réelles du projet de référence ────────

function TypeResult({ data }: { data: LifecycleShowcase }) {
  const { project, plan } = data;
  return (
    <div className="space-y-3">
      <Grid>
        <Metric
          icon={Building2}
          label="Type de projet"
          value={<span className="text-[12px]">{project.categoryLabel}</span>}
          sub="Informations du projet"
          tone="text-slate-600"
        />
        <Metric
          icon={Ruler}
          label="Surface"
          value={<AnimatedNumber value={project.surface} suffix=" m²" />}
          sub="Surface couverte"
          tone="text-slate-600"
        />
        <Metric
          icon={Layers}
          label="Niveaux"
          value={<AnimatedNumber value={project.floors} />}
          sub={`${plan.roomsTotal} pièces`}
          tone="text-slate-600"
        />
        <Metric
          icon={MapPin}
          label="Région"
          value={<span className="text-[12px]">{project.regionLabel || "—"}</span>}
          sub="Localisation du projet"
          tone="text-slate-600"
        />
      </Grid>
    </div>
  );
}

// ── 2. Coût estimatif ───────────────────────────────────────────────────────

function CostResult({ data }: { data: LifecycleShowcase }) {
  const { cost } = data;
  return (
    <div className="space-y-3">
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
          sub="Indice de fiabilité"
          tone="text-sky-600"
        />
        <Metric
          icon={Layers}
          label="Quantitatif"
          value={<AnimatedNumber value={cost.itemsCount} />}
          sub={`${cost.quantitatifLots} lots`}
          tone="text-violet-600"
        />
      </Grid>

      <div className="rounded-lg border border-border/50 bg-background/70 p-2.5">
        <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Répartition du budget
        </p>
        <div className="space-y-1.5">
          {cost.breakdown.map((b, i) => (
            <Bar key={b.label} label={b.label} percentage={b.percentage} cost={b.cost} delay={0.08 * i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 2. Plan IA — plans RÉELS générés par le moteur Batibuild ────────────────

const PLAN_PHASES = [
  { key: "plan2d", label: "Plan 2D" },
  { key: "rooms", label: "Pièces" },
  { key: "dims", label: "Dimensions" },
  { key: "3d", label: "Vue 3D" },
] as const;

/** Durée de chaque phase (ms) — la vue 3D reste affichée plus longtemps. */
const PLAN_PHASE_DURATIONS = [1800, 1600, 1600, 3400];

function PlanResult({ data }: { data: LifecycleShowcase }) {
  const reduceMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  // Plans réellement générés à partir des données du projet (moteur Batibuild,
  // déterministe : mêmes entrées → mêmes plans).
  const variants = useMemo(
    () =>
      generateFloorPlans({
        category: data.project.category,
        surface: data.plan.surface,
        floors: data.plan.floors,
        bedrooms: data.plan.bedrooms,
        bathrooms: data.plan.bathrooms,
        kitchens: data.plan.kitchens,
        livingRooms: data.plan.livingRooms,
        wcs: data.plan.wcs,
      }),
    [
      data.project.category,
      data.plan.surface,
      data.plan.floors,
      data.plan.bedrooms,
      data.plan.bathrooms,
      data.plan.kitchens,
      data.plan.livingRooms,
      data.plan.wcs,
    ],
  );

  // La phase « Vue 3D » n'est proposée que pour un type de projet autorisé et
  // au RDC (voir `@/lib/plan3dAccess`) : aucun plan 3D interdit n'est généré.
  const phases = useMemo(
    () =>
      allowsPlan3DLevel(data.project.category, 0)
        ? PLAN_PHASES
        : PLAN_PHASES.filter((p) => p.key !== "3d"),
    [data.project.category],
  );

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setTimeout(
      () => setPhaseIndex((i) => (i + 1) % phases.length),
      PLAN_PHASE_DURATIONS[phaseIndex] ?? 1800,
    );
    return () => window.clearTimeout(id);
  }, [phaseIndex, reduceMotion, phases.length]);

  // Un nouveau cycle de pièces à chaque retour à la phase « Plan 2D ».
  useEffect(() => {
    if (phaseIndex === 0) setCycle((c) => c + 1);
  }, [phaseIndex]);

  const variant = variants[0];
  const plan = variant?.floors[0];

  if (!plan) {
    // Aucune donnée de plan : on n'invente rien.
    return <ResultPlaceholder stepLabel="Plan IA" />;
  }

  const phase = reduceMotion ? 2 : phaseIndex;
  const rooms = plan.rooms;
  const activeRoom = rooms.length ? rooms[(reduceMotion ? 0 : cycle) % rooms.length] : undefined;

  // Zoom vers la pièce affichée (phase « Pièces »).
  const originX = activeRoom ? ((activeRoom.x + activeRoom.w / 2) / plan.length) * 100 : 50;
  const originY = activeRoom ? ((activeRoom.y + activeRoom.h / 2) / plan.width) * 100 : 50;
  const zoomStyle =
    phase === 1
      ? { transform: "scale(1.7)", transformOrigin: `${originX}% ${originY}%` }
      : { transform: "scale(1)", transformOrigin: "50% 50%" };

  const caption =
    phase === 1 && activeRoom
      ? `Zoom — ${activeRoom.label} · ${activeRoom.area.toFixed(1)} m²`
      : phase === 2
        ? `Dimensions · emprise ${plan.length.toFixed(1)} × ${plan.width.toFixed(1)} m · ${rooms.length} pièces`
        : phase === 3
          ? "Vue 3D réelle du plan — faites glisser pour tourner, pincez pour zoomer"
          : `Plan 2D généré · ${variant?.name ?? ""}`;

  return (
    <div className="space-y-3">
      <Grid>
        <Metric icon={Ruler} label="Surface" value={<AnimatedNumber value={data.plan.surface} suffix=" m²" />} tone="text-sky-600" />
        <Metric icon={Layers} label="Pièces" value={<AnimatedNumber value={data.plan.roomsTotal} />} tone="text-sky-600" />
        <Metric icon={Building2} label="Niveaux" value={<AnimatedNumber value={data.plan.floors} />} tone="text-sky-600" />
        <Metric
          icon={CheckCircle2}
          label="Conformité"
          value={<AnimatedNumber value={variant?.validation.score ?? 0} suffix=" %" />}
          sub={`${variants.length} variantes générées`}
          tone="text-emerald-600"
        />
      </Grid>

      {/* Animation compacte : plan 2D → pièces → dimensions → vue 3D réelle */}
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-2.5">
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {phases.map((p, i) => (
            <span
              key={p.key}
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors",
                i === phase
                  ? "border-sky-500/50 bg-sky-500/15 text-sky-700 dark:text-sky-300"
                  : "border-border/40 bg-muted/30 text-muted-foreground",
              )}
            >
              {p.label}
            </span>
          ))}
          <span className="ml-auto text-[9px] text-muted-foreground tabular-nums">
            {plan.length.toFixed(1)} × {plan.width.toFixed(1)} m
          </span>
        </div>

        {phase === 3 ? (
          <Plan3DView plan={plan} />
        ) : (
          <div className={STAGE_CLASS}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="h-full w-full transition-transform duration-700 ease-out [&>svg]:h-full [&>svg]:w-full"
              style={zoomStyle}
            >
              <FloorPlan2D plan={plan} selectedRoomId={phase === 1 ? activeRoom?.id ?? null : null} />
            </motion.div>
          </div>
        )}

        <p className="mt-2 break-words text-[9.5px] leading-snug text-muted-foreground">{caption}</p>
      </div>

      {/* Pièces réelles du plan (nom + dimensions) */}
      <div className="flex flex-wrap gap-1.5">
        {rooms.slice(0, 8).map((r) => (
          <Chip key={r.id} tone="bg-sky-500/10 text-sky-700 dark:text-sky-400">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PLAN_ROOM_COLORS[r.kind] ?? "#e5e7eb", outline: "1px solid rgba(0,0,0,.15)" }} />
            {PLAN_ROOM_LABELS[r.kind] ?? r.label} · {r.w.toFixed(1)}×{r.h.toFixed(1)} m
          </Chip>
        ))}
      </div>
    </div>
  );
}

// ── 2 bis. Aide à la décision — aperçu de l'Intelligence prédictive ─────────

function DecisionResult({ data }: { data: LifecycleShowcase }) {
  const { materials } = data;
  return (
    <div className="space-y-3">
      <Grid>
        <Metric icon={BrainCircuit} label="Postes analysés" value={<AnimatedNumber value={materials.analyzed} />} tone="text-violet-600" />
        <Metric icon={Gauge} label="Matériaux suivis" value={<AnimatedNumber value={materials.selected} />} sub="prix & variantes réels" tone="text-violet-600" />
        <Metric
          icon={Banknote}
          label="Économie accessible"
          value={<AnimatedNumber value={materials.potentialSaving} format={(n) => formatTnd(n)} />}
          sub="optimisation du budget"
          tone="text-emerald-600"
        />
        <Metric icon={Percent} label="Prix unitaires" value={<AnimatedNumber value={materials.unitPrices.length} />} sub="prévisions de prix" tone="text-sky-600" />
      </Grid>

      <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.04] p-2.5">
        <p className="flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
          <Wand2 className="mt-0.5 h-3 w-3 shrink-0 text-violet-600" />
          L'IA analyse les prix, le budget, les quantités et les opportunités d'achat : prévisions,
          alertes, priorité d'achat et scénarios « Et si ? » — à partir des données réelles du projet.
        </p>
      </div>
    </div>
  );
}

// ── 3. Consultations / experts ──────────────────────────────────────────────

function ConsultResult({ data }: { data: LifecycleShowcase }) {
  const { consultations } = data;
  return (
    <div className="space-y-3">
      <Grid>
        <Metric icon={Users} label="Experts identifiés" value={<AnimatedNumber value={consultations.expertsCount} />} tone="text-amber-600" />
        <Metric icon={Layers} label="Catégories" value={<AnimatedNumber value={consultations.categories.length} />} tone="text-amber-600" />
        <Metric
          icon={MapPin}
          label="Régions couvertes"
          value={<AnimatedNumber value={consultations.regionsCount} />}
          sub={consultations.topRegion ? `Plus active : ${consultations.topRegion}` : undefined}
          tone="text-emerald-600"
        />
        <Metric icon={Wand2} label="Recommandations IA" value={<span className="text-[12px]">Actives</span>} sub="classées par besoin & région" tone="text-indigo-600" />
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
    <div className="space-y-3">
      <div className="rounded-lg border border-border/50 bg-background/70 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="break-words">Progression du projet</span>
          <span className="shrink-0 tabular-nums text-teal-600">
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
        <Metric icon={CheckCircle2} label="Étapes réalisées" value={<AnimatedNumber value={execution.tasksDone} />} sub={`sur ${execution.tasksTotal} tâches`} tone="text-teal-600" />
        <Metric icon={Layers} label="Phases" value={<AnimatedNumber value={execution.phases} />} tone="text-teal-600" />
        <Metric icon={Wallet} label="Coûts suivis" value={<AnimatedNumber value={execution.plannedBudget} format={(n) => formatTnd(n)} />} tone="text-emerald-600" />
        <Metric icon={CalendarRange} label="Durée planifiée" value={<AnimatedNumber value={execution.plannedDurationDays} suffix=" j" />} tone="text-sky-600" />
      </Grid>
    </div>
  );
}
