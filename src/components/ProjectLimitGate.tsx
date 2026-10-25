import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { CreditCard, FolderKanban, Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// ProjectLimitGate — limite du nombre de projets par offre
// ----------------------------------------------------------------------------
// Bloque la CRÉATION d'un nouveau projet lorsque le plafond réglé par
// l'administrateur pour l'offre du compte (période d'essai, offre gratuite ou
// Client Pro) est atteint. Le backend revérifie la limite dans la transaction
// de création (`projects.createProject`) : cette barrière d'interface est un
// confort, jamais la seule protection.
//
// Les projets DÉJÀ créés restent consultables et modifiables : seule la
// création est empêchée.
// ============================================================================

export function ProjectLimitGate({ children }: { children: ReactNode }) {
  const limit = useQuery(api.projectLimits.getMyProjectLimit);
  const navigate = useNavigate();

  // Chargement (ou visiteur sans compte) : comportement inchangé.
  if (limit === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (limit === null || limit.allowed) return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl px-3 py-10 sm:px-6">
      <Card className="overflow-hidden border border-border/40 bg-background/60 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight sm:text-lg">
            Limite de projets atteinte
          </h3>
          {limit.tierLabel && limit.maxProjects != null && (
            <Badge variant="outline" className="text-[10px]">
              {limit.tierLabel} · {limit.usedProjects}/{limit.maxProjects} projet
              {limit.maxProjects > 1 ? "s" : ""}
            </Badge>
          )}
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {limit.message}
          </p>
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            Vos projets existants restent accessibles et modifiables : aucune donnée n'est supprimée.
          </p>
          <Button className="mt-2 gap-1.5" onClick={() => navigate("/dashboard/pricing")}>
            <CreditCard className="h-4 w-4" />
            Voir les offres et passer à Client Pro
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/projects")}>
            Accéder à mes projets
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectLimitGate;
