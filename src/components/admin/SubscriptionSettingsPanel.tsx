import { ClientProCotisationSettings } from "./ClientProCotisationSettings";
import { ProfessionalPlanSettings } from "./ProfessionalPlanSettings";
import { InvestmentCotisationSettings } from "./InvestmentCotisationSettings";
import { SiteCotisationSettings } from "./SiteCotisationSettings";

// ============================================================================
// « Abonnements mensuels — prix et configuration » — nouvelle organisation
// ----------------------------------------------------------------------------
//   A. Cotisation Client Pro (crédits de projets)
//   B. Abonnement mensuel Expert
//   C. Abonnement mensuel Fournisseur
//   D. Cotisation « Mes projets d'investissement » (tarif de référence)
//   E. Cotisation « Gestion & Suivi de Chantier » (prix, durée, validations)
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
      <InvestmentCotisationSettings />
      <SiteCotisationSettings />
    </div>
  );
}

export default SubscriptionSettingsPanel;
