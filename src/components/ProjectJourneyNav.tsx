import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { Target } from "lucide-react";

import { isHeaderNavItemActive } from "@/components/HeaderNav";
import { buildProjectJourney } from "@/lib/projectJourney";
import { cn } from "@/lib/utils";

/**
 * BARRE DE NAVIGATION DU PARCOURS — « OÙ SUIS-JE DANS MON PROJET ? »
 *
 * Rendu sous forme d'ÉTAPES NUMÉROTÉES (pastilles 1, 2, 3… reliées par une
 * ligne), exactement comme la barre de progression des phases du guide A-Z :
 *
 *   - étapes déterminées automatiquement par le type du projet (5 étapes pour
 *     les projets neufs / immobiliers, 2 étapes pour les autres) ;
 *   - chaque étape est un vrai lien vers le module correspondant, avec
 *     l'identifiant du projet conservé dans l'URL ;
 *   - navigation libre : aucune étape n'est désactivée, et l'étape active est
 *     déduite de la route affichée ;
 *   - rangée scrollable horizontalement (mobile / tablette / desktop).
 *
 * Le composant ne contient aucune logique métier : les liens et les libellés
 * viennent de `@/lib/projectJourney`.
 */

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
      aria-label="Où suis-je dans mon projet"
      className={cn("border-t border-border/25", className)}
    >
      <div className={cn("mx-auto px-2 sm:px-3 lg:px-4", maxWidthClassName)}>
        <p className="flex items-center gap-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Target className="h-3 w-3 shrink-0" /> Où suis-je dans mon projet ?
        </p>

        {/* Rangée scrollable : un seul axe, aucune étape coupée. */}
        <div className="overflow-x-auto overscroll-x-contain scrollbar-none py-1.5">
          <div className="flex items-center">
            {steps.map((step, i) => {
              const active = isHeaderNavItemActive({ path: step.path }, pathname);
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
                          ? "border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                          : "border-border/50 bg-muted/20 text-muted-foreground/60 group-hover:border-cyan-500/50 group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-medium whitespace-nowrap transition-colors",
                        active
                          ? "text-cyan-600 dark:text-cyan-400"
                          : "text-muted-foreground/60 group-hover:text-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "mb-4 h-px flex-1",
                        active ? "bg-cyan-500/50" : "bg-border/60",
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
