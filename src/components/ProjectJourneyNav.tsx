import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import { isHeaderNavItemActive } from "@/components/HeaderNav";
import { buildProjectJourney } from "@/lib/projectJourney";
import { cn } from "@/lib/utils";

/**
 * BARRE DE NAVIGATION DU PARCOURS DU PROJET
 *
 * Rendu sous forme d'ÉTAPES NUMÉROTÉES (pastilles 1, 2, 3… reliées par une
 * ligne), exactement comme la barre de progression des phases du guide A-Z :
 *
 *   - étapes déterminées automatiquement par le type du projet (6 étapes pour
 *     les projets neufs / immobiliers, 2 étapes pour les autres) ;
 *   - chaque étape est un vrai lien vers le module correspondant, avec
 *     l'identifiant du projet conservé dans l'URL ;
 *   - navigation libre : aucune étape n'est désactivée, et l'étape active est
 *     déduite de la route affichée (libellé noir) tandis que les autres restent
 *     en gris ; le numéro de chaque étape est vert clair et les numéros sont
 *     reliés entre eux par un tiret gris ;
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
      aria-label="Étapes du projet"
      className={cn("border-t border-border/25", className)}
    >
      <div className={cn("mx-auto px-2 sm:px-3 lg:px-4", maxWidthClassName)}>
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
                        "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] transition-colors",
                        active
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border text-emerald-500/70 dark:text-emerald-400/70 group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] whitespace-nowrap transition-colors",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className="mb-4 h-px flex-1 bg-border" />
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
