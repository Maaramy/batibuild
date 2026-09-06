import { Link } from "react-router";
import { AlertTriangle, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

/**
 * Bandeau « Complétez votre profil » affiché quand le compte de l'utilisateur
 * ne contient pas encore de nom complet ou de numéro de téléphone (source
 * centralisée : table `users`). Sert aux comptes existants créés avant la
 * collecte obligatoire de ces champs. Ne bloque rien : simple notification
 * avec renvoi vers la page Mon Profil.
 */
export function ProfileCompletionBanner() {
  const { isLoading, user } = useAuth();

  if (isLoading || !user) return null;

  const missing = [];
  if (!user.name?.trim()) missing.push("nom complet");
  if (!user.phone?.trim()) missing.push("numéro de téléphone");
  if (missing.length === 0) return null;

  return (
    <div
      role="status"
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-950/30"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Complétez votre profil
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajoutez votre {missing.join(" et votre ")} — il est utilisé pour vos
            projets, devis et communications.
          </p>
        </div>
      </div>
      <Button
        asChild
        size="sm"
        className="h-8 shrink-0 gap-1.5 text-xs self-start sm:self-auto"
      >
        <Link to="/dashboard/profile">
          <UserRound className="h-3.5 w-3.5" />
          Compléter
        </Link>
      </Button>
    </div>
  );
}
