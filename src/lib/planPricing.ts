// ============================================================================
// Tarifs des forfaits — sémantique partagée (serveur, administration, tarifs)
// ============================================================================
// La SEULE source de vérité d'un prix de forfait est le document `paymentConfig`
// enregistré par l'administrateur (Convex). Ce module ne stocke aucune donnée :
// il fixe la RÈGLE de lecture d'un prix, identique partout (site web, panneau
// d'administration, application Android via la WebView).
//
//   • champ ABSENT (`undefined`) → le forfait n'a jamais été tarifé : on lit la
//     valeur INITIALE (Client Pro 80 TND, Fournisseur / Expert 120 TND).
//     Un prix absent ne signifie JAMAIS « gratuit » — c'était la cause de la
//     perte du prix Client Pro : le panneau d'administration interprétait
//     l'absence comme « Offre gratuite », réécrivait `null` et le prix saisi
//     (95 TND) n'était jamais conservé.
//   • `null` ou `0` EXPLICITE → « Offre gratuite » activée par l'administrateur
//     (accès sans paiement).
//   • nombre → prix enregistré par l'administrateur, utilisé tel quel.
//
// AUCUN prix ne doit être codé en dur ailleurs : ni dans l'interface, ni dans
// un repli de chargement. Les valeurs initiales ci-dessous ne servent qu'à la
// première initialisation et à l'affichage d'un forfait explicitement gratuit.

/** Valeurs initiales (TND/mois) — jamais utilisées pour écraser un prix enregistré. */
export const DEFAULT_PLAN_PRICES = {
  pro: 80,
  supplier: 120,
  expert: 120,
} as const;

/** Prix Client Pro (forfait payant principal). */
export const DEFAULT_CLIENT_PRO_PRICE = DEFAULT_PLAN_PRICES.pro;

/**
 * Prix effectif d'un forfait à partir de la valeur enregistrée.
 *
 * @param stored   valeur du document `paymentConfig` (`undefined` = jamais tarifé)
 * @param fallback valeur initiale du forfait
 * @returns le prix enregistré, `null` si l'offre est gratuite, sinon la valeur initiale
 */
export function resolvePlanPrice(
  stored: number | null | undefined,
  fallback: number,
): number | null {
  // Le champ absent n'est pas un prix : on applique la valeur initiale.
  if (stored === undefined) return fallback;
  return stored;
}

/** Vrai si l'offre est EXPLICITEMENT gratuite (prix `null` ou `0`). */
export function isFreePlanPrice(stored: number | null | undefined): boolean {
  return stored === null || stored === 0;
}

/** Champs de prix à écrire à la CRÉATION d'un document `paymentConfig`. */
export function defaultPlanPriceFields(): {
  proPrice: number;
  supplierPrice: number;
  expertPrice: number;
} {
  return {
    proPrice: DEFAULT_PLAN_PRICES.pro,
    supplierPrice: DEFAULT_PLAN_PRICES.supplier,
    expertPrice: DEFAULT_PLAN_PRICES.expert,
  };
}

// ── Formulaire d'administration « Abonnements mensuels — prix » ─────────────
export interface PlanPricingSource {
  proPrice: number | null | undefined;
  supplierPrice: number | null | undefined;
  expertPrice: number | null | undefined;
}

export interface PlanPriceFormValues {
  clientProPrice: number;
  clientProFree: boolean;
  supplierPrice: number;
  supplierFree: boolean;
  expertPrice: number;
  expertFree: boolean;
}

/**
 * Valeurs du formulaire d'administration à partir de la configuration lue.
 *
 * @returns `null` tant que la configuration n'est pas chargée : l'interface
 *          affiche alors un indicateur de chargement et n'invente aucun prix.
 */
export function planPricingFormValues(
  config: PlanPricingSource | null | undefined,
): PlanPriceFormValues | null {
  if (config == null) return null;

  // Un forfait explicitement gratuit n'a pas de montant enregistré : le champ,
  // désactivé (bascule « Offre gratuite »), réaffiche la valeur initiale du
  // forfait — cette valeur n'est écrite que si l'administrateur redonne un prix.
  const fieldValue = (stored: number | null | undefined, fallback: number): number =>
    isFreePlanPrice(stored) ? fallback : (resolvePlanPrice(stored, fallback) as number);

  return {
    clientProPrice: fieldValue(config.proPrice, DEFAULT_PLAN_PRICES.pro),
    clientProFree: isFreePlanPrice(config.proPrice),
    supplierPrice: fieldValue(config.supplierPrice, DEFAULT_PLAN_PRICES.supplier),
    supplierFree: isFreePlanPrice(config.supplierPrice),
    expertPrice: fieldValue(config.expertPrice, DEFAULT_PLAN_PRICES.expert),
    expertFree: isFreePlanPrice(config.expertPrice),
  };
}

/** Libellé d'un prix de forfait (« 95 TND », « Gratuit », « — » si inconnu). */
export function planPriceLabel(stored: number | null | undefined): string {
  if (stored === undefined) return "—";
  if (isFreePlanPrice(stored)) return "Gratuit";
  return `${stored} TND`;
}
