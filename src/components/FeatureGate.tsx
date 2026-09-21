import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useFeatureFlags,
  LOCAL_DEFAULT_FLAGS,
} from "@/hooks/use-feature-flags";

// ============================================================================
// GARDE DE ROUTE PAR FEATURE FLAG
// ============================================================================
// Enveloppe les pages d'une fonctionnalité pilotable : si le flag serveur est
// désactivé, l'utilisateur est redirigé vers le tableau de bord avec un
// message générique (l'état interne des flags n'est jamais exposé).
//
// Tant que le serveur n'a pas répondu, la page se rend normalement (repli
// local « actif ») — aucune régression, pas de flash de redirection.

export function FeatureGate({
  flag,
  children,
}: {
  /** Clé du feature flag (ex. "ai_materials"). */
  flag: string;
  children: ReactNode;
}) {
  const { flags, isLoaded, isEnabled } = useFeatureFlags();
  const location = useLocation();
  const enabled = isEnabled(flag);

  // Message générique une seule fois, uniquement après confirmation serveur.
  useEffect(() => {
    if (isLoaded && flags && !enabled) {
      toast.info("Cette fonctionnalité n'est actuellement pas disponible.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, flag, enabled]);

  // Chargement : repli local (état actuel = tout actif) → rendu normal.
  if (!flags && !isLoaded) {
    return LOCAL_DEFAULT_FLAGS[flag] === false ? null : children;
  }

  if (!enabled) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return children;
}
