import { useAuth } from "@/hooks/use-auth";
import { useEnsureTrialStarted } from "@/hooks/use-ensure-trial";
import { useNetworkStatus } from "@/lib/networkStatus";
import { Loader2, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router";

/**
 * PROTECTION DES ROUTES PRIVÉES.
 *
 * Le seul juge de la session reste le serveur : `RequireAuth` n'invalide jamais
 * une session de lui-même. En particulier, une PERTE DE CONNEXION ne déconnecte
 * pas l'utilisateur — la session est conservée localement et l'accès reprend dès
 * le retour du réseau. La redirection vers `/auth` n'a donc lieu que lorsque le
 * serveur a réellement confirmé l'absence de session, réseau disponible.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const { phase } = useNetworkStatus();
  const { t } = useTranslation("common");
  const location = useLocation();

  const offline = phase === "offline";

  // Démarre la période d'essai gratuite (durée configurée par l'administrateur)
  // à la première page protégée ouverte
  // (idempotent côté serveur — jamais un second essai).
  useEnsureTrialStarted();

  if (isLoading && !offline) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    // Hors ligne : la session n'est PAS considérée comme expirée. On garde
    // l'utilisateur sur sa page au lieu de le renvoyer vers la connexion.
    if (offline) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-sm text-center">
            <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <WifiOff className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold">{t("network.sessionOfflineTitle")}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t("network.sessionOfflineDetail")}
            </p>
          </div>
        </main>
      );
    }

    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return children;
}
