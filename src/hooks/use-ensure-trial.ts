import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

// ============================================================================
// useEnsureTrialStarted — démarrage automatique de l'essai gratuit (7 jours)
// ============================================================================
// Les nouveaux comptes démarrent leur essai dès l'inscription
// (`auth.callbacks.afterUserCreatedOrUpdated`). Ce hook couvre les comptes
// existants (créés avant la mise en place de l'essai) et tout compte dont
// l'essai n'a pas encore été accordé : à la première page protégée ouverte, le
// serveur démarre la période.
//
// L'appel est idempotent (`trialClaimedAt` immuable côté serveur) : une fois
// l'essai accordé, la query réactive renvoie le marqueur et plus aucun appel
// n'est effectué.

export function useEnsureTrialStarted() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const startTrial = useMutation(api.subscriptionStatus.startMyTrial);
  const requested = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    // Essai déjà accordé (ou compte administrateur) : rien à faire.
    if (user.trialClaimedAt != null) return;
    if (requested.current) return;

    requested.current = true;
    void startTrial();
  }, [isAuthenticated, user, startTrial]);
}
