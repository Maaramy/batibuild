import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import { isHeaderNavItemActive } from "@/components/HeaderNav";
import {
  buildProjectJourney,
  type ProjectJourneyFlags,
  type ProjectJourneyStep,
} from "@/lib/projectJourney";
import { cn } from "@/lib/utils";

/**
 * BARRE DE NAVIGATION DU PARCOURS DU PROJET
 *
 * Rendu sous forme d'ÉTAPES NUMÉROTÉES (pastilles 1, 2, 3… reliées par une
 * ligne), exactement comme la barre de progression des phases du guide A-Z :
 *
 *   - étapes déterminées automatiquement par le type du projet (5 étapes pour
 *     les projets neufs / immobiliers, 3 pour les autres), puis filtrées par
 *     les feature flags de l'administration via la prop `flags` — une étape
 *     dont le module est désactivé disparaît, les autres conservent leur ordre ;
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
 *
 * Une page peut fournir son propre parcours via `steps` (ex. « Résultat de
 * l'analyse IA », où le groupe A s'affiche « Coût estimatif → Fournisseur ») ;
 * un tableau vide masque alors la barre (utile pendant le rechargement des
 * résultats).
 */

interface ProjectJourneyNavProps {
  /** Identifiant du projet courant : sans lui, la barre n'est pas affichée. */
  projectId?: string | null;
  /** Type de projet enregistré (détermine le groupe du parcours). */
  category?: string | null;
  /**
   * État des feature flags de l'administration : retire les étapes dont le
   * module est désactivé. Sans état fourni, toutes les étapes s'affichent.
   */
  flags?: ProjectJourneyFlags;
  /**
   * Parcours imposé par la page (prioritaire). Un tableau vide masque la barre.
   * Sans cette prop, le parcours est déduit du type de projet.
   */
  steps?: ProjectJourneyStep[];
  maxWidthClassName?: string;
  className?: string;
}

export function ProjectJourneyNav({
  projectId,
  category,
  flags,
  steps: stepsOverride,
  maxWidthClassName = "max-w-5xl",
  className,
}: ProjectJourneyNavProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const defaultSteps = useMemo(
    () => buildProjectJourney(category, projectId, flags),
    [category, projectId, flags],
  );

  const steps = stepsOverride ?? defaultSteps;

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
                          ? "border-emerald-400 bg-emerald-400/15 text-emerald-500 dark:border-emerald-500/60 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "border-border text-muted-foreground group-hover:border-foreground/40 group-hover:text-foreground",
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
                  {/* Tiré gris reliant les chiffres entre eux. */}
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
