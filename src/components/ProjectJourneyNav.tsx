import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Calculator,
  DraftingCompass,
  Hammer,
  HardHat,
  Package,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { isHeaderNavItemActive } from "@/components/HeaderNav";
import { buildProjectJourney, type ProjectJourneyStepKey } from "@/lib/projectJourney";
import { cn } from "@/lib/utils";

/**
 * BARRE DE NAVIGATION DU PARCOURS DU PROJET
 *
 * Rendu sous forme d'ÉTAPES NUMÉROTÉES (pastilles 1, 2, 3… reliées par une
 * ligne), exactement comme la barre de progression des phases du guide A-Z :
 *
 *   - étapes déterminées automatiquement par le type du projet (6 étapes pour
 *     les projets neufs / immobiliers, 2 étapes pour les autres), chacune avec
 *     son icône et son libellé en vert clair et en gras ;
 *   - chaque étape est un vrai lien vers le module correspondant, avec
 *     l'identifiant du projet conservé dans l'URL ;
 *   - navigation libre : aucune étape n'est désactivée, et l'étape active est
 *     déduite de la route affichée ;
 *   - rangée scrollable horizontalement (mobile / tablette / desktop).
 *
 * Le composant ne contient aucune logique métier : les liens et les libellés
 * viennent de `@/lib/projectJourney`.
 */

/** Icône associée à chaque étape du parcours (contrôle d'exhaustivité par le type). */
const STEP_ICONS: Record<ProjectJourneyStepKey, LucideIcon> = {
  cost: Calculator,
  plans: DraftingCompass,
  materials: Package,
  consult: HardHat,
  execution: Hammer,
  investment: TrendingUp,
};

interface ProjectJourneyNavProps {
  /** Identifiant du projet courant : sans lui, la barre n'est pas affichée. */
  projectId?: string | null;
  /** Type de projet enregistré (détermine le groupe du parcours). */
  category?: string | null;
  maxWidthClassName?: string;
  className?: string;
}

export function ProjectJourneyNav({
  projectId,
  category,
  maxWidthClassName = "max-w-5xl",
  className,
}: ProjectJourneyNavProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const steps = useMemo(
    () => buildProjectJourney(category, projectId),
    [category, projectId],
  );

  if (steps.length === 0) return null;

  return (
    <nav
      aria-label="Étapes du projet"
      className={cn("border-t border-border/25", className)}
    >
      <div className={cn("mx-auto px-2 sm:px-3 lg:px-4", maxWidthClassName)}>
        {/* Rangée scrollable : un seul axe, aucune étape coupée. */}
        <div className="overflow-x-auto overscroll-x-contain scrollbar-none py-1.5">
          <div className="flex items-center">
            {steps.map((step, i) => {
              const active = isHeaderNavItemActive({ path: step.path }, pathname);
              const Icon = STEP_ICONS[step.key];
              return (
                <div key={step.key} className="flex flex-1 items-center last:flex-none">
                  <button
                    type="button"
                    onClick={() => navigate(step.href)}
                    aria-current={active ? "step" : undefined}
                    title={step.label}
                    className="group flex flex-1 flex-col items-center gap-1 px-1 active:scale-[0.97] transition-transform"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                        active
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 group-hover:border-emerald-500 group-hover:bg-emerald-500/15",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[9px] font-bold whitespace-nowrap transition-colors",
                        active
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-emerald-500/80 dark:text-emerald-400/80 group-hover:text-emerald-600 dark:group-hover:text-emerald-300",
                      )}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                      {step.label}
                    </span>
                  </button>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "mb-4 h-px flex-1",
                        active ? "bg-emerald-500/50" : "bg-emerald-500/25",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
