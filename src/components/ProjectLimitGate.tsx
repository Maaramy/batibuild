import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { CreditCard, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// ProjectLimitGate — limite du nombre de projets par offre
// ----------------------------------------------------------------------------
// Cet écran n'est PAS piloté directement par la requête réactive du quota :
// il s'affiche uniquement lorsque la page de création constate, AU MOMENT d'une
// tentative de création, que le plafond réglé par l'administrateur pour l'offre
// du compte (période d'essai, offre gratuite ou Client Pro) est déjà atteint.
//
// Bug corrigé : auparavant, la barrière observait le quota en continu et
// remplaçait donc la page dès que le projet venait d'être créé (le compteur
// passait à X/X), masquant le résultat du dernier projet autorisé.
//
// Les projets DÉJÀ créés restent consultables et modifiables : seule la
// création d'un projet SUPPLÉMENTAIRE est empêchée. Le backend revérifie la
// limite dans la transaction de création (`projects.createProject`) : cette
// barrière d'interface est un confort, jamais la seule protection.
// ============================================================================

/** Données d'affichage de l'écran de limitation (issues du contrôle serveur). */
export interface ProjectLimitView {
  tierLabel?: string | null;
  maxProjects?: number | null;
  usedProjects?: number;
  message?: string | null;
}

export function ProjectLimitScreen({ limit }: { limit: ProjectLimitView }) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-3 py-10 sm:px-6">
      <Card className="overflow-hidden border border-border/40 bg-background/60 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight sm:text-lg">
            Crédits de projets épuisés
          </h3>
          {limit.tierLabel && limit.maxProjects != null && (
            <Badge variant="outline" className="text-[10px]">
              {limit.tierLabel} · {limit.usedProjects ?? 0}/{limit.maxProjects} projet
              {limit.maxProjects > 1 ? "s" : ""}
            </Badge>
          )}
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {limit.message ??
              "Vous avez utilisé tous les projets de votre forfait Client Pro. Payez une cotisation pour obtenir de nouveaux projets : vos projets existants restent accessibles et modifiables."}
          </p>
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            Vos projets existants restent accessibles et modifiables : aucune donnée n'est supprimée.
          </p>
          <Button className="mt-2 gap-1.5" onClick={() => navigate("/dashboard/pricing")}>
            <CreditCard className="h-4 w-4" />
            Acheter une cotisation Client Pro
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/projects")}>
            Accéder à mes projets
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Affiche `children` — et remplace la page par l'écran de limitation SEULEMENT
 * lorsque `blocked` est fourni (tentative de création au-delà du quota).
 */
export function ProjectLimitGate({
  children,
  blocked,
}: {
  children: ReactNode;
  blocked: ProjectLimitView | null;
}) {
  if (!blocked) return <>{children}</>;
  return <ProjectLimitScreen limit={blocked} />;
}

export default ProjectLimitGate;
