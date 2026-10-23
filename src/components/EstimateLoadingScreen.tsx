import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  BrainCircuit,
  Building2,
  Calculator,
  Check,
  Coins,
  HardHat,
  Layers,
  Loader2,
  MapPin,
  RotateCcw,
  Ruler,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatTndAmount } from "@/lib/budgetEngine";
import type { EstimateLoadingSummary } from "@/lib/estimateLoadingSummary";
import { cn } from "@/lib/utils";
import {
  ESTIMATE_INTRO_MS,
  ESTIMATE_JOURNEY_STEPS,
  estimateIntroElapsed,
  estimateIntroState,
  isEstimateResultReady,
  loadingLevelsLabel,
  resolveEstimateFlowPhase,
  type EstimateIntroState,
} from "@/lib/estimateLoaderTiming";

/**
 * ÉCRAN DE CHARGEMENT — ESTIMATION DU COÛT DE CONSTRUCTION
 *
 * Animation d'introduction de 4 secondes exactement (voir
 * `@/lib/estimateLoaderTiming`), parallèle au calcul réel : elle présente le
 * logo officiel BatiBuild et les étapes du parcours Journey du projet (5 pour
 * les groupes A et D, 2 pour les groupes B et C), puis rend la main dès que
 * l'animation ET le calcul sont terminés.
 *
 * Quand le parent fournit `summary`, les étapes génériques du parcours sont
 * remplacées — dans le MÊME design — par les résultats réels du coût estimatif
 * (projet, scénario, budget TTC, coût au m², répartition et progression du
 * calcul). Une valeur pas encore calculée garde son emplacement avec un
 * indicateur discret : aucun montant n'est inventé.
 *
 * Aucune donnée n'est inventée : si le calcul dépasse 4 s, l'animation se
 * termine à 4 s et un indicateur d'attente discret reste affiché jusqu'à la
 * disponibilité réelle des résultats (`pending`). En cas d'échec réel, un
 * message explicite et une action « Réessayer » remplacent l'attente : l'écran
 * ne peut jamais rester bloqué.
 *
 * « Réduire les animations » conserve la progression (barre, étapes, %) mais
 * supprime les mouvements (pulsation, flottement, transitions).
 */

/**
 * Icône de chaque étape, associée à son LIBELLÉ : la liste d'étapes dépend du
 * groupe du projet (5, 4 ou 2 étapes), l'icône reste donc toujours cohérente
 * avec l'étape affichée.
 */
const STEP_ICONS_BY_LABEL: Record<string, LucideIcon> = {
  "Coût estimatif": Calculator,
  "Aide à la décision": BrainCircuit,
  "Plans architecturaux AI": Ruler,
  "Mise en relation": Users,
  "Exécution & Suivi": HardHat,
  // Étapes du traitement « Aide à la décision » (même écran, mêmes icônes).
  "Analyse du Quantitatif": Boxes,
  "Prix & matériaux": Coins,
  "Capacité de construction": Wallet,
  "Plan de construction": HardHat,
  "Optimisation budgétaire": Sparkles,
};

const FALLBACK_STEP_ICONS: LucideIcon[] = [Calculator, Boxes, Ruler, Users, HardHat];

function stepIcon(label: string, index: number): LucideIcon {
  return STEP_ICONS_BY_LABEL[label] ?? FALLBACK_STEP_ICONS[index % FALLBACK_STEP_ICONS.length];
}

type StepVisual = "done" | "active" | "pending";

const STEP_LABELS: Record<StepVisual, string> = {
  done: "Terminé",
  active: "En cours",
  pending: "À venir",
};

export function EstimateLoadingScreen({
  projectName,
  pending,
  error = null,
  onComplete,
  onRetry,
  durationMs = ESTIMATE_INTRO_MS,
  title = "BatiBuild prépare votre estimation",
  description,
  steps,
  progressLabel = "Progression de l'estimation",
  readyLabel = "Estimation prête, affichage des résultats…",
  waitingLabel = "Calculs en cours — attente des données réelles…",
  waitingDetail = "Finalisation des calculs réels…",
  summary,
  startedAt,
  className,
}: {
  /** Nom du projet envoyé au calcul (affichage uniquement). */
  projectName?: string;
  /** `true` tant que les résultats réels ne sont pas disponibles. */
  pending: boolean;
  /** Message d'erreur réel : affiché avec une action « Réessayer ». */
  error?: string | null;
  /** Appelé une seule fois : animation terminée ET données réelles prêtes. */
  onComplete: () => void;
  /** Nouvelle tentative sans recréer le projet (action utilisateur). */
  onRetry?: () => void;
  /** Durée de l'animation initiale (4 000 ms par défaut). */
  durationMs?: number;
  /** Titre contextuel de l'écran (même design dans tous les cas). */
  title?: string;
  /** Texte contextuel sous le titre. */
  description?: string;
  /** Étapes affichées (6 étapes du Journey par défaut). */
  steps?: readonly string[];
  /** Libellé accessible de la barre de progression. */
  progressLabel?: string;
  /** Texte de la phase « données prêtes, fin d'animation ». */
  readyLabel?: string;
  /** Texte de la phase d'attente discrète (animation terminée, données en cours). */
  waitingLabel?: string;
  /** Détail affiché sous l'indicateur d'attente discrète. */
  waitingDetail?: string;
  /**
   * Résultats RÉELS du coût estimatif, affichés à la place des étapes
   * génériques du parcours : informations du projet, scénario, budget TTC,
   * coût au m² et répartition des coûts. Les valeurs encore indisponibles
   * gardent leur emplacement avec un indicateur de chargement discret.
   * `undefined` conserve exactement l'écran d'origine (parcours du projet).
   */
  summary?: EstimateLoadingSummary;
  /**
   * Horodatage (`performance.now()`) du début réel du chargement. Permet de
   * reprendre l'animation déjà commencée par l'écran parent au lieu de
   * redémarrer les 4 s : aucune animation en double, aucun flash visuel.
   */
  startedAt?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const stepLabels =
    steps && steps.length > 0 ? steps : ESTIMATE_JOURNEY_STEPS;
  const stepCount = stepLabels.length;
  // Colonnes de la vue « tablette / ordinateur » : une colonne par étape, afin
  // qu'aucune colonne vide ne subsiste selon le groupe (5, 4 ou 2 étapes).
  const tabletColumns = stepCount <= 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  const desktopColumns =
    stepCount <= 2
      ? "xl:grid-cols-2"
      : stepCount === 3
        ? "xl:grid-cols-3"
        : stepCount === 4
          ? "xl:grid-cols-4"
          : stepCount === 5
            ? "xl:grid-cols-5"
            : "xl:grid-cols-6";
  const duration =
    Number.isFinite(durationMs) && durationMs > 0
      ? durationMs
      : ESTIMATE_INTRO_MS;
  const [intro, setIntro] = useState<EstimateIntroState>(() =>
    estimateIntroState(
      estimateIntroElapsed(startedAt, performance.now()),
      duration,
      stepCount,
    ),
  );
  const notifiedRef = useRef(false);

  // Horloge dédiée (requestAnimationFrame) + filet de sécurité : la fin des
  // 4 s ne dépend JAMAIS d'une frame (onglet en arrière-plan, appareil lent).
  // Une seule boucle et un seul timer, tous deux nettoyés au démontage.
  useEffect(() => {
    const now = performance.now();
    const declaredStart = Number(startedAt);
    const start =
      Number.isFinite(declaredStart) && declaredStart > 0 ? declaredStart : now;
    const elapsedAtMount = Math.max(0, now - start);
    let frame = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      setIntro(estimateIntroState(duration, duration, stepCount));
    };

    // Chargement déjà plus long que l'animation : l'écran est immédiatement en
    // fin d'introduction (« waiting » ou « complete »), sans rejouer 4 s.
    if (elapsedAtMount >= duration) {
      finish();
      return;
    }

    const tick = (now: number) => {
      if (finished) return;
      const next = estimateIntroState(now - start, duration, stepCount);
      if (next.done) {
        finish();
        return;
      }
      setIntro((prev) =>
        prev.progress === next.progress &&
        prev.activeIndex === next.activeIndex
          ? prev
          : next,
      );
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    const backstop = window.setTimeout(
      finish,
      Math.max(0, duration - elapsedAtMount),
    );
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(backstop);
    };
  }, [duration, stepCount, startedAt]);

  // Machine à états : les données réelles priment, puis l'erreur, puis
  // l'attente / l'animation.
  const phase = resolveEstimateFlowPhase({
    introDone: intro.done,
    dataReady: !pending,
    error,
  });

  // Fin de l'écran : jamais avant 4 s, jamais sans données réelles. Si les
  // données arrivent après une erreur (calcul finalement abouti), l'écran se
  // ferme automatiquement. `notifiedRef` garantit un unique appel.
  useEffect(() => {
    if (notifiedRef.current || !isEstimateResultReady(intro.done, !pending)) {
      return;
    }
    notifiedRef.current = true;
    onComplete();
  }, [intro.done, pending, onComplete]);

  const stateOf = (index: number): StepVisual => {
    // En erreur, l'étape en cours n'est plus « active » : aucun indicateur
    // animé ne doit laisser croire que le chargement continue.
    if (error) return index < intro.activeIndex ? "done" : "pending";
    if (intro.done) return "done";
    if (index < intro.activeIndex) return "done";
    if (index === intro.activeIndex) return "active";
    return "pending";
  };

  return (
    <div
      aria-busy={phase === "loading" || phase === "waiting"}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-600/15 bg-gradient-to-b from-emerald-500/[0.07] via-background to-background px-4 py-8 sm:px-8 sm:py-10",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* ── Logo officiel animé ── */}
        <div className="relative mb-5">
          <motion.span
            aria-hidden
            className="absolute -inset-5 rounded-full bg-emerald-500/15 blur-xl"
            animate={
              reduceMotion
                ? undefined
                : { opacity: [0.45, 0.9, 0.45], scale: [0.95, 1.08, 0.95] }
            }              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                animate={reduceMotion ? undefined : { scale: [1, 1.03, 1] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <LogoMark
                  size="lg"
                  className="h-16 w-16 rounded-2xl shadow-lg shadow-emerald-950/15 ring-1 ring-emerald-500/25"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        <h2 className="text-base font-bold tracking-tight sm:text-lg">
          {title}
        </h2>
        <p className="mt-1 max-w-md text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          {projectName ? (
            <>
              <span className="font-medium text-foreground">{projectName}</span>
              {" · "}
            </>
          ) : null}
          {description ??
            `Calcul selon les prix du marché tunisien 2026 — les ${stepCount} étapes de votre parcours se préparent.`}
        </p>

        {/* ── Barre de progression + étape en cours ── */}
        <div className="mt-6 w-full max-w-md">
          <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="truncate">
              {phase === "error"
                ? "Chargement interrompu"
                : summary
                  ? phase === "complete"
                    ? "Calcul terminé"
                    : "Calcul du coût estimatif"
                  : phase === "loading"
                    ? `Étape ${intro.activeIndex + 1} sur ${stepCount}`
                    : "Parcours prêt"}
            </span>
            <span className="shrink-0 tabular-nums text-emerald-700 dark:text-emerald-400">
              {intro.progress} %
            </span>
          </div>
          <Progress
            value={intro.progress}
            aria-label={progressLabel}
            className="h-2 [&_[data-slot=progress-indicator]]:transition-none"
          />
          {phase === "error" ? (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-3 text-left"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    Le chargement des résultats a échoué
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {error}
                  </p>
                </div>
              </div>
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full gap-1.5 sm:w-auto"
                  onClick={onRetry}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réessayer
                </Button>
              )}
            </div>
          ) : (
            <>
              <p
                className="mt-2 min-h-4 text-[11px] font-medium text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {phase === "complete"
                  ? readyLabel
                  : phase === "waiting"
                    ? waitingLabel
                    : summary
                      ? summary.steps.find((s) => !s.done)?.label ??
                        "Vérification des résultats…"
                      : stepLabels[intro.activeIndex]}
              </p>
              {phase === "waiting" && (
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  {waitingDetail}
                </div>
              )}
            </>
          )}
        </div>

        {summary ? (
          <EstimateSummaryPanel
            summary={summary}
            reduceMotion={Boolean(reduceMotion)}
          />
        ) : (
          <>
        {/* ── Parcours horizontal (tablette / ordinateur) ── */}
        <div className="mt-7 hidden w-full md:block">
          <div className="relative">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-7 hidden h-px bg-border/70 xl:block"
            />
            <motion.div
              aria-hidden
              className="absolute left-0 top-7 hidden h-px bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 xl:block"
              animate={{ width: `${intro.progress}%` }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.25, ease: "linear" }
              }
            />
            <ol
              className={cn(
                "relative grid grid-cols-3 gap-2",
                tabletColumns,
                desktopColumns,
              )}
            >
              {stepLabels.map((label, index) => {
                const state = stateOf(index);
                return (
                  <li
                    key={label}
                    className={cn(
                      "flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors duration-300",
                      state === "active" &&
                        "border-emerald-500/40 bg-emerald-500/[0.06] shadow-sm",
                      state === "done" && "border-emerald-500/20 bg-background/60",
                      state === "pending" &&
                        "border-border/50 bg-background/40 opacity-70",
                    )}
                  >
                    <StepNode
                      state={state}
                      icon={stepIcon(label, index)}
                      reduceMotion={Boolean(reduceMotion)}
                    />
                    <span className="line-clamp-2 min-w-0 text-center text-[10.5px] font-medium leading-tight">
                      {label}
                    </span>
                    <StepStatus state={state} />
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* ── Parcours vertical (mobile) : aucun débordement horizontal ── */}
        <ol className="relative mt-6 w-full space-y-2 md:hidden">
          <span
            aria-hidden
            className="absolute bottom-4 left-7 top-4 w-px bg-border/70"
          />
          {stepLabels.map((label, index) => {
            const state = stateOf(index);
            return (
              <li
                key={label}
                className={cn(
                  "relative flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2 transition-colors duration-300",
                  state === "active" &&
                    "border-emerald-500/40 bg-emerald-500/[0.06] shadow-sm",
                  state === "done" && "border-emerald-500/20 bg-background/60",
                  state === "pending" &&
                    "border-border/50 bg-background/40 opacity-70",
                )}
              >
                <StepNode
                  state={state}
                  icon={stepIcon(label, index)}
                  reduceMotion={Boolean(reduceMotion)}
                />
                <span className="min-w-0 flex-1 text-left text-[11px] font-medium leading-tight">
                  {label}
                </span>
                <StepStatus state={state} />
              </li>
            );
          })}
        </ol>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Résultats réels du coût estimatif dans le design du chargement : mêmes
 * cartes, mêmes bordures, mêmes arrondis, mêmes tailles de texte. Chaque
 * valeur absente laisse un emplacement vide animé (aucune donnée inventée).
 */
function EstimateSummaryPanel({
  summary,
  reduceMotion,
}: {
  summary: EstimateLoadingSummary;
  reduceMotion: boolean;
}) {
  const levels = loadingLevelsLabel(summary.floors);

  const tiles = [
    { icon: Building2, label: "Type", value: summary.projectType },
    { icon: MapPin, label: "Région", value: summary.region },
    {
      icon: Ruler,
      label: "Surface couverte",
      value: summary.builtSurface != null ? `${summary.builtSurface} m²` : null,
    },
    { icon: Layers, label: "Niveaux", value: levels },
  ];

  // Catégories attendues tant que la répartition réelle n'est pas disponible :
  // les mêmes que la page finale (études, gros œuvre, second œuvre, extérieurs).
  const pendingRows = [
    "Frais préliminaires et études",
    "Gros œuvre",
    "Second œuvre et finitions",
    "Aménagements extérieurs",
  ];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
      className="mt-7 w-full text-left"
    >
      {/* ── Informations réelles du projet ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border/40 bg-background/60 p-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <tile.icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">
                {tile.label}
              </span>
              <span className="block truncate text-[11.5px] font-semibold" title={tile.value ?? undefined}>
                {tile.value ?? <PendingValue />}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* ── Scénario sélectionné + budget total réel ── */}
      <div className="mt-2.5 rounded-xl border border-emerald-500/20 bg-background/60 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Scénario sélectionné
            </p>
            <span className="mt-1 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300">
              {summary.scenario ?? <PendingValue />}
            </span>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Budget total estimé
            </p>
            <p className="mt-0.5 text-xl font-bold leading-tight tabular-nums sm:text-2xl">
              {summary.total != null ? formatTndAmount(summary.total) : <PendingValue wide />}
            </p>
            <p className="mt-0.5 min-h-4 text-[10.5px] text-muted-foreground">
              {summary.costPerM2 != null ? (
                <>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatTndAmount(summary.costPerM2)}
                  </span>
                  /m²
                </>
              ) : (
                <PendingValue />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Répartition réelle des coûts ── */}
      <div className="mt-2.5 rounded-xl border border-border/50 bg-background/40 p-3.5">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Répartition des coûts
        </p>
        <div className="space-y-1.5">
          {summary.breakdown.length > 0
            ? summary.breakdown.map((row) => (
                <div key={`${row.category ?? row.label}`} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium" title={row.label}>
                    {row.label}
                  </span>
                  <span className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted/40 sm:block">
                    <span
                      className="block h-full rounded-full bg-emerald-500/70"
                      style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                    />
                  </span>
                  <span className="w-[94px] shrink-0 whitespace-nowrap text-right text-[11px] font-semibold tabular-nums sm:w-[112px]">
                    {formatTndAmount(row.amount)}
                  </span>
                  <span className="w-9 shrink-0 text-right text-[9.5px] tabular-nums text-muted-foreground">
                    {row.percentage}%
                  </span>
                </div>
              ))
            : pendingRows.map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
                    {label}
                  </span>
                  <span className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted/30 sm:block" />
                  <span className="w-[94px] shrink-0 text-right sm:w-[112px]">
                    <PendingValue />
                  </span>
                  <span className="w-9 shrink-0" />
                </div>
              ))}
        </div>
      </div>

      {/* ── Progression réelle du calcul (4 opérations) ── */}
      <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2" aria-live="polite">
        {summary.steps.map((step) => (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors duration-300",
              step.done
                ? "border-emerald-500/20 bg-background/60"
                : "border-border/40 bg-background/40",
            )}
          >
            {step.done ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            ) : (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium">
              {step.label}
            </span>
            <span
              className={cn(
                "shrink-0 text-[9px] font-semibold uppercase tracking-wide",
                step.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/70",
              )}
            >
              {step.done ? "Calculé" : "En cours"}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/** Emplacement d'une valeur pas encore calculée (indicateur discret). */
function PendingValue({ wide = false }: { wide?: boolean }) {
  return (
    <span
      aria-label="Calcul en cours"
      className={cn(
        "inline-block h-3 animate-pulse rounded bg-muted/70 align-middle",
        wide ? "w-20" : "w-12",
      )}
    />
  );
}

function StepNode({
  state,
  icon: Icon,
  reduceMotion,
}: {
  state: StepVisual;
  icon: LucideIcon;
  reduceMotion: boolean;
}) {
  return (
    <span
      className={cn(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
        state === "done" && "border-emerald-500 bg-emerald-500 text-white",
        state === "active" &&
          "border-emerald-500 bg-background text-emerald-600 dark:text-emerald-400",
        state === "pending" &&
          "border-border/70 bg-muted/40 text-muted-foreground/70",
      )}
    >
      {state === "done" ? (
        <motion.span
          initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </motion.span>
      ) : (
        <Icon
          className={cn(
            "h-4 w-4",
            state === "active" && "text-emerald-600 dark:text-emerald-400",
          )}
        />
      )}
      {state === "active" && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full ring-2 ring-emerald-500/50"
          animate={
            reduceMotion
              ? undefined
              : { scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </span>
  );
}

function StepStatus({ state }: { state: StepVisual }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide",
        state === "done" && "text-emerald-600 dark:text-emerald-400",
        state === "active" && "text-emerald-700 dark:text-emerald-300",
        state === "pending" && "text-muted-foreground/70",
      )}
    >
      {state === "active" && (
        <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
      )}
      {STEP_LABELS[state]}
    </span>
  );
}

/** Durée totale exposée aux tests / au parent (4 000 ms exactement). */
export const ESTIMATE_LOADING_DURATION_MS = ESTIMATE_INTRO_MS;
