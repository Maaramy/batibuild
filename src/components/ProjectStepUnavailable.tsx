import { useNavigate } from "react-router";
import { ArrowLeft, Lock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * ÉCRAN « ÉTAPE INDISPONIBLE POUR CE TYPE DE PROJET »
 *
 * Affiché quand un projet ouvre directement l'URL d'une étape absente de son
 * parcours : « Plans architecturaux AI » et « Exécution & Suivi » pour les
 * groupes B et C (seuls les groupes A et D ont ces étapes ; l'aide à la
 * décision a son propre écran de refus).
 *
 * Aucune donnée du projet n'est recalculée ni supprimée : le projet, son
 * estimation, ses scénarios et son historique restent intacts. L'écran propose
 * simplement de revenir au projet ou d'ouvrir l'étape autorisée suivante
 * (« Mise en relation »).
 */
export function ProjectStepUnavailable({
  stepLabel,
  projectName,
  backHref,
  consultHref,
  className,
}: {
  /** Nom de l'étape refusée (ex. « Plans architecturaux AI »). */
  stepLabel: string;
  /** Nom du projet, affiché pour conserver le contexte. */
  projectName?: string | null;
  /** Retour à la fiche du projet (aucune donnée perdue). */
  backHref: string;
  /** Lien vers la mise en relation (étape toujours autorisée). */
  consultHref?: string | null;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <section
      aria-label={`${stepLabel} indisponible pour ce projet`}
      className={
        className ??
        "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elev-1"
      }
    >
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold tracking-tight sm:text-lg">
          {stepLabel} indisponible pour ce type de projet
        </h2>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {projectName ? (
            <>
              Le projet <strong className="text-foreground">{projectName}</strong>{" "}
              appartient au parcours simplifié.{" "}
            </>
          ) : null}
          Cette étape est réservée aux projets du parcours complet (maison,
          appartement, villa, immeuble, local, studio, duplex, résidence
          touristique, projet immobilier neuf, rénovation complète). Vos données,
          votre estimation et votre historique sont conservés.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button className="gap-1.5" onClick={() => navigate(backHref)}>
            <ArrowLeft className="h-4 w-4" />
            Retour au projet
          </Button>
          {consultHref ? (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => navigate(consultHref)}
            >
              <Users className="h-4 w-4" />
              Mise en relation
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
