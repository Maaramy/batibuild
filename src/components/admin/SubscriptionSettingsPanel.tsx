import { ClientProCotisationSettings } from "./ClientProCotisationSettings";
import { ProfessionalPlanSettings } from "./ProfessionalPlanSettings";
import { SubscriptionFollowUp } from "./SubscriptionFollowUp";

// ============================================================================
// « Abonnements mensuels — prix et configuration » — nouvelle organisation
// ----------------------------------------------------------------------------
//   A. Cotisation Client Pro (crédits de projets)
//   B. Abonnement mensuel Expert
//   C. Abonnement mensuel Fournisseur
//   + Suivi par utilisateur (profil, essai, échéance, droits Client Pro, solde)
//
// Les mutations correspondantes revalident TOUT côté serveur : cette page ne
// fait qu'enregistrer et afficher la configuration Convex.
// ============================================================================

export function SubscriptionSettingsPanel() {
  return (
    <div className="space-y-6">
      <ClientProCotisationSettings />
      <ProfessionalPlanSettings role="expert" />
      <ProfessionalPlanSettings role="supplier" />
      <SubscriptionFollowUp />
    </div>
  );
}

export default SubscriptionSettingsPanel;
