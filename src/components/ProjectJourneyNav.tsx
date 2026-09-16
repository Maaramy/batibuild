import { useMemo } from "react";
import { useNavigate } from "react-router";
import { HardHat, LayoutGrid, Rocket, Sparkles, Target, Wallet } from "lucide-react";

import { HeaderNav, type HeaderNavItem } from "@/components/HeaderNav";
import {
  buildProjectJourney,
  type ProjectJourneyStepKey,
} from "@/lib/projectJourney";

/**
 * BARRE DE NAVIGATION DU PARCOURS — « OÙ SUIS-JE DANS MON PROJET ? »
 *
 * Rend, dans le style du Top Menu existant (`HeaderNav`), les étapes du
 * parcours du projet courant :
 *
 *   - étapes déterminées automatiquement par le type du projet (5 étapes pour
 *     les projets neufs / immobiliers, 2 étapes pour les autres) ;
 *   - chacun des éléments est un vrai lien vers le module correspondant, avec
 *     l'identifiant du projet conservé dans l'URL ;
 *   - navigation libre : aucune étape n'est désactivée, et l'étape active est
 *     déduite de la route affichée ;
 *   - rangée scrollable horizontalement (mobile / tablette / desktop).
 *
 * Le composant ne contient aucune logique métier : les liens et les libellés
 * viennent de `@/lib/projectJourney`.
 */

const STEP_ICONS: Record<ProjectJourneyStepKey, React.ReactNode> = {
  cost: <Wallet className="h-3.5 w-3.5" />,
  plans: <LayoutGrid className="h-3.5 w-3.5" />,
  materials: <Sparkles className="h-3.5 w-3.5" />,
  execution: <Rocket className="h-3.5 w-3.5" />,
  consult: <HardHat className="h-3.5 w-3.5" />,
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

  const steps = useMemo(
    () => buildProjectJourney(category, projectId),
    [category, projectId],
  );

  const items: HeaderNavItem[] = useMemo(
    () =>
      steps.map((step) => ({
        icon: STEP_ICONS[step.key],
        label: step.label,
        path: step.path,
        onClick: () => navigate(step.href),
      })),
    [steps, navigate],
  );

  if (items.length === 0) return null;

  return (
    <HeaderNav
      items={items}
      ariaLabel="Où suis-je dans mon projet"
      maxWidthClassName={maxWidthClassName}
      className={className}
      title={
        <>
          <Target className="h-3 w-3 shrink-0" /> Où suis-je dans mon projet ?
        </>
      }
    />
  );
}
