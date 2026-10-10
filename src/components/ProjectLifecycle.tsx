import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQuery } from "convex/react";
import {
  BrainCircuit,
  Calculator,
  Check,
  HardHat,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { JOURNEY_FLAG_KEYS } from "@/lib/projectJourney";
import { ResultPlaceholder, StepResultPanel } from "@/components/LifecycleStepResults";

/**
 * CYCLE DE VIE COMPLET D'UN PROJET — parcours animé de la page d'accueil.
 *
 * Représente les 5 étapes du projet, dans l'ordre officiel de « Projet Journey »
 * (`src/lib/projectJourney.ts`) :
 *
 *   01 Coût estimatif → 02 Aide à la décision → 03 Plan IA →
 *   04 Consultations → 05 Exécution & suivi
 *
 * Les intitulés, l'ordre et les feature flags sont identiques à ceux du
 * parcours projet : une fonctionnalité désactivée par l'administrateur est
 * retirée du parcours visuel, la progression se recalcule et aucun trou n'est
 * laissé. Aucun asset vidéo n'existe dans le projet : les étapes réutilisent
 * uniquement les icônes déjà disponibles (aucune dépendance supplémentaire).
 */

interface StepAccents {
  /** Dégradé du cercle à l'état terminé / actif. */
  gradient: string;
  /** Couleur du texte d'état. */
  text: string;
  /** Teinte douce (ring / halos). */
  ring: string;
  /** Ombre portée colorée. */
  shadow: string;
  /** Fond très léger de la pastille d'état. */
  chip: string;
}

interface LifecycleStep {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Feature flag qui pilote l'affichage (`null` = toujours affichée). */
  flag: string | null;
  accents: StepAccents;
}

const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    key: "cost",
    label: "Coût estimatif",
    description: "Évaluez le budget et les coûts de votre projet.",
    icon: Calculator,
    flag: JOURNEY_FLAG_KEYS.cost,
    accents: {
      gradient: "from-emerald-500 to-teal-500",
      text: "text-emerald-600 dark:text-emerald-400",
      ring: "ring-emerald-500/20",
      shadow: "shadow-emerald-500/30",
      chip: "bg-emerald-500/10",
    },
  },
  {
    key: "decision",
    label: "Aide à la décision",
    description:
      "Anticipez vos achats, maîtrisez votre budget et réduisez les pertes grâce à l'analyse prédictive.",
    icon: BrainCircuit,
    // Extension directe du résultat « Coût estimatif » : suit son activation.
    flag: JOURNEY_FLAG_KEYS.decision,
    accents: {
      gradient: "from-violet-500 to-purple-500",
      text: "text-violet-600 dark:text-violet-400",
      ring: "ring-violet-500/20",
      shadow: "shadow-violet-500/30",
      chip: "bg-violet-500/10",
    },
  },
  {
    key: "plans",
    label: "Plan IA",
    description:
      "Obtenir des plans architecturaux en 2D/3D pour votre projet avec l'intelligence artificielle.",
    icon: Ruler,
    flag: JOURNEY_FLAG_KEYS.plans,
    accents: {
      gradient: "from-sky-500 to-cyan-500",
      text: "text-sky-600 dark:text-sky-400",
      ring: "ring-sky-500/20",
      shadow: "shadow-sky-500/30",
      chip: "bg-sky-500/10",
    },
  },
  {
    key: "consult",
    label: "Consultations",
    description: "Trouvez des experts et prestataires adaptés à vos besoins.",
    icon: Users,
    // Étape de consultation : pas de feature flag dédié (toujours disponible).
    flag: null,
    accents: {
      gradient: "from-amber-500 to-orange-500",
      text: "text-amber-600 dark:text-amber-400",
      ring: "ring-amber-500/20",
      shadow: "shadow-amber-500/30",
      chip: "bg-amber-500/10",
    },
  },
  {
    key: "execution",
    label: "Exécution & suivi",
    description: "Organisez, suivez et pilotez la réalisation de votre projet.",
    icon: HardHat,
    flag: JOURNEY_FLAG_KEYS.execution,
    accents: {
      gradient: "from-teal-500 to-emerald-500",
      text: "text-teal-600 dark:text-teal-400",
      ring: "ring-teal-500/20",
      shadow: "shadow-teal-500/30",
      chip: "bg-teal-500/10",
    },
  },
];

/**
 * Durée EXACTE d'une étape (ms) : 4 secondes fixes par étape, soit une
 * séquence complète de 20 secondes pour les 5 étapes. Aucune durée aléatoire,
 * aucune accélération liée au chargement des données.
 */
const STEP_DURATION_MS = 4000;
/**
 * Courte pause, une fois les 5 étapes terminées, avant la reprise de la boucle
 * (durée fixe elle aussi). À la fin, les 5 résultats restent affichés, puis la
 * séquence repart en douceur de l'étape 1.
 */
const LOOP_HOLD_MS = 1500;

type StepState = "done" | "active" | "pending";

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Séquence animée du cycle de vie, EN BOUCLE : une étape se termine exactement
 * toutes les 4 secondes (0–4 s étape 1 … 16–20 s étape 5). Dès qu'une étape
 * passe à « Terminé », son résultat réel s'affiche sous elle et reste visible.
 * À la fin des 20 secondes, les 5 étapes et leurs résultats sont affichés, puis
 * la boucle repart de l'étape 1 — sans rechargement, de façon fluide. Seul
 * « réduire les animations » court-circuite le parcours (tout affiché d'emblée).
 */
export function ProjectLifecycle({ className }: { className?: string }) {
  const { isEnabled } = useFeatureFlags();
  // Résultats RÉELS par étape (moteurs BIM / feuille de route
  // + annuaires actifs) : affichés sous l'étape dès qu'elle passe « Terminé ».
  const showcase = useQuery(api.lifecycleShowcase.getShowcase);
  // Respecte « réduire les animations » du système : aucun mouvement lourd,
  // le parcours s'affiche alors directement à l'état terminé.
  const reduceMotion = useReducedMotion();

  // Étapes réellement disponibles (flags admin) — l'ordre officiel est conservé.
  const steps = useMemo(
    () => LIFECYCLE_STEPS.filter((s) => !s.flag || isEnabled(s.flag)),
    // `isEnabled` dépend de la souscription Convex aux flags : on recalcule à
    // chaque rendu du parent (petit tableau, coût négligeable).
    [isEnabled],
  );

  const total = steps.length;
  const [completed, setCompleted] = useState(0);
  // `started` verrouille le démarrage : une fois la séquence lancée, elle va
  // jusqu'au bout sans pause ni réinitialisation (durée fixe garantie).
  const [started, setStarted] = useState(false);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Suit la visibilité du parcours : l'animation démarre à l'entrée dans
  // l'écran et se met en pause lorsqu'il en sort (aucun travail inutile).
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Démarrage unique, dès la première apparition du parcours à l'écran.
  useEffect(() => {
    if (reduceMotion || total === 0) return;
    if (inView) setStarted(true);
  }, [inView, reduceMotion, total]);

  // Séquençage à durée fixe, EN BOUCLE : une étape passe à « Terminé » toutes
  // les 4 s exactement (0–4 s étape 1, 4–8 s étape 2, … 16–20 s étape 5). Les
  // 5 étapes tiennent alors toutes « Terminé » avec leurs résultats, puis la
  // boucle repart de l'étape 1. Aucun chevauchement entre deux étapes.
  useEffect(() => {
    if (!started || total === 0) return;
    if (completed >= total) {
      // Fin de cycle : tous les résultats visibles, puis reprise à zéro.
      const hold = window.setTimeout(() => setCompleted(0), LOOP_HOLD_MS);
      return () => window.clearTimeout(hold);
    }
    const timer = window.setTimeout(() => {
      setCompleted((c) => Math.min(c + 1, total));
    }, STEP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [started, completed, total]);

  // Un flag désactivé pendant l'animation rétrécit le parcours : on recale la
  // progression pour ne jamais laisser d'étape vide ni de trou.
  useEffect(() => {
    setCompleted((c) => Math.min(c, total));
  }, [total]);

  // Animations réduites : parcours immédiatement complet, aucun minuteur.
  useEffect(() => {
    if (reduceMotion) setCompleted(total);
  }, [reduceMotion, total]);

  const pct = total > 0 ? Math.round((Math.min(completed, total) / total) * 100) : 0;
  const finished = total > 0 && completed >= total;

  const stateOf = (index: number): StepState => {
    if (index < completed) return "done";
    if (index === completed && !finished) return "active";
    return "pending";
  };

  return (
    <div ref={rootRef} className={className}>
      {/* Barre de progression globale + statut */}
      <div className="mx-auto mb-8 flex max-w-md flex-col items-center gap-2">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border/50">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {/* Reflet qui balaie la barre : mouvement discret qui garde la
              section vivante pendant la séquence. */}
          {!reduceMotion && inView && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/30"
              initial={{ x: "-120%" }}
              animate={{ x: "300%" }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 0.6,
              }}
            />
          )}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {finished
            ? "Parcours prêt"
            : `Étape ${Math.min(completed + 1, total)} sur ${total}`}
        </span>
      </div>

      {/* ── Desktop : parcours horizontal relié par une ligne de progression ── */}
      <div className="relative hidden md:block">
        <div className="absolute left-0 right-0 top-6 h-0.5 -translate-y-1/2 rounded-full bg-border/60" />
        <motion.div
          className="absolute left-0 top-6 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <div
          className="relative grid gap-3"
          style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        >
          {steps.map((step, i) => (
            <DesktopStep
              key={step.key}
              step={step}
              index={i}
              state={stateOf(i)}
            />
          ))}
        </div>
      </div>

      {/* ── Mobile : timeline verticale compacte, aucun débordement ── */}
      <div className="relative md:hidden">
        {/* Rail borné (top/bottom) + remplissage interne : la ligne ne déborde
            jamais du parcours, même lorsque toutes les étapes sont terminées. */}
        <div className="absolute bottom-2 left-5 top-2 w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-border/60">
          <motion.div
            className="w-full rounded-full bg-gradient-to-b from-emerald-500 via-sky-500 to-indigo-500"
            initial={{ height: 0 }}
            animate={{ height: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <ul className="relative space-y-5">
          {steps.map((step, i) => (
            <MobileStep
              key={step.key}
              step={step}
              index={i}
              state={stateOf(i)}
              // Résultat affiché DIRECTEMENT sous chaque étape terminée, et
              // conservé une fois affiché (données réelles ou attente).
              resultSlot={
                stateOf(i) !== "done" ? null : showcase ? (
                  <StepResultPanel
                    key={step.key}
                    stepKey={step.key}
                    stepLabel={step.label}
                    data={showcase}
                    className="mt-4"
                  />
                ) : (
                  <ResultPlaceholder key={step.key} stepLabel={step.label} className="mt-4" />
                )
              }
            />
          ))}
        </ul>
      </div>

      {/* ── Desktop : un résultat par étape terminée, empilés et persistants ── */}
      {completed > 0 && (
        <div className="mt-6 hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {steps.map((step, i) => {
              if (stateOf(i) !== "done") return null;
              return showcase ? (
                <StepResultPanel
                  key={step.key}
                  stepKey={step.key}
                  stepLabel={step.label}
                  data={showcase}
                />
              ) : (
                <ResultPlaceholder key={step.key} stepLabel={step.label} />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function StepIcon({
  step,
  state,
  size,
}: {
  step: LifecycleStep;
  state: StepState;
  size: "sm" | "md";
}) {
  const Icon = step.icon;
  const box = size === "md" ? "h-12 w-12" : "h-10 w-10";
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";

  const base = `${box} relative z-10 flex items-center justify-center rounded-full border-2 transition-colors duration-300`;

  if (state === "done" || state === "active") {
    return (
      <motion.div
        initial={false}
        animate={{ scale: state === "active" ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className={`${base} border-transparent bg-gradient-to-br ${step.accents.gradient} text-white shadow-lg ${step.accents.shadow} ${
          state === "active" ? `ring-4 ${step.accents.ring}` : ""
        }`}
      >
        {state === "done" ? (
          <Check className={iconSize} />
        ) : (
          <Icon className={iconSize} />
        )}
      </motion.div>
    );
  }

  return (
    <div className={`${base} border-border bg-background text-muted-foreground/70`}>
      <Icon className={iconSize} />
    </div>
  );
}

function StepStatus({
  step,
  state,
  compact,
}: {
  step: LifecycleStep;
  state: StepState;
  compact?: boolean;
}) {
  if (state === "done") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${step.accents.chip} ${step.accents.text}`}
      >
        <Check className="h-2.5 w-2.5" />
        Terminé
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        {compact ? "En cours" : "En cours…"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70">
      À venir
    </span>
  );
}

function DesktopStep({
  step,
  index,
  state,
}: {
  step: LifecycleStep;
  index: number;
  state: StepState;
}) {
  const dim = state === "pending";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col items-center px-1 text-center transition-opacity duration-300 ${
        dim ? "opacity-55" : "opacity-100"
      }`}
    >
      <div className="relative">
        <StepIcon step={step} state={state} size="md" />
        <span className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-[10px] font-bold tabular-nums text-muted-foreground">
          {pad(index + 1)}
        </span>
      </div>
      <h3
        className={`mt-3 text-sm font-semibold tracking-tight ${
          state === "active" ? "text-primary" : "text-foreground"
        }`}
      >
        {step.label}
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {step.description}
      </p>
      <div className="mt-2">
        <StepStatus step={step} state={state} />
      </div>
    </motion.div>
  );
}

function MobileStep({
  step,
  index,
  state,
  resultSlot,
}: {
  step: LifecycleStep;
  index: number;
  state: StepState;
  /** Résultat animé de l'étape, affiché sous celle-ci quand elle est terminée. */
  resultSlot?: React.ReactNode;
}) {
  const dim = state === "pending";
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className={`flex items-start gap-4 transition-opacity duration-300 ${
        dim ? "opacity-55" : "opacity-100"
      }`}
    >
      <StepIcon step={step} state={state} size="sm" />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
            {pad(index + 1)}
          </span>
          <h3
            className={`text-sm font-semibold tracking-tight ${
              state === "active" ? "text-primary" : "text-foreground"
            }`}
          >
            {step.label}
          </h3>
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
          {step.description}
        </p>
        <div className="mt-1.5">
          <StepStatus step={step} state={state} compact />
        </div>
        {/* Apparition/disparition fluide (fade + slide) du résultat. */}
        <AnimatePresence>{resultSlot}</AnimatePresence>
      </div>
    </motion.li>
  );
}

/**
 * Section de la page d'accueil : en-tête discret + parcours animé du cycle de
 * vie. Se place juste après le texte d'introduction de la page.
 */
export function ProjectLifecycleSection() {
  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
      <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-72 w-72 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <p className="label-overline mb-3 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Cycle de vie du projet
          </p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            De l'idée à la <span className="gradient-text">réalisation</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            batibuild vous accompagne à chaque étape de votre projet — de
            l'estimation initiale jusqu'au suivi du chantier.
          </p>
        </motion.div>

        <ProjectLifecycle />
      </div>
    </section>
  );
}

export default ProjectLifecycle;
