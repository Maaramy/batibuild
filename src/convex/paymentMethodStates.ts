import {
  defaultPaymentMethodStates,
  enabledPaymentMethodSlugs,
  isPaymentMethodEnabled,
  mergePaymentMethodStates,
  paymentMethodDefinition,
  type PaymentMethodState,
} from "../lib/paymentMethods";

/**
 * Lecture de la configuration des méthodes de paiement.
 *
 * Module volontairement sans dépendance vers les autres modules Convex afin
 * que tous les flux de règlement (abonnements, profils Expert/Fournisseur)
 * puissent vérifier côté serveur sans créer de cycle d'import.
 */

const DISABLED_MARKER = "PAYMENT_METHOD_DISABLED:";

/** États effectifs des méthodes de paiement (catalogue + configuration admin). */
export async function getPaymentMethodStates(
  ctx: any,
): Promise<PaymentMethodState[]> {
  try {
    const config = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();
    if (!config) return defaultPaymentMethodStates();
    return mergePaymentMethodStates(config.paymentMethodStates);
  } catch {
    // Configuration illisible → on retombe sur les valeurs par défaut du catalogue
    // plutôt que de bloquer tous les paiements.
    return defaultPaymentMethodStates();
  }
}

/** Slugs des méthodes actuellement utilisables par les utilisateurs. */
export async function getEnabledPaymentMethodSlugs(
  ctx: any,
): Promise<string[]> {
  return enabledPaymentMethodSlugs(await getPaymentMethodStates(ctx));
}

/**
 * Contrôle serveur : refuse une nouvelle transaction si la méthode a été
 * désactivée par l'administrateur. Le frontend seul ne suffit jamais.
 */
export async function assertPaymentMethodEnabled(
  ctx: any,
  slug: string | undefined | null,
): Promise<void> {
  if (!slug) return;
  const method = paymentMethodDefinition(slug);
  if (!method || !method.implemented) {
    throw new Error(
      `${DISABLED_MARKER}La méthode de paiement « ${slug} » n'est pas disponible.`,
    );
  }
  const states = await getPaymentMethodStates(ctx);
  if (!isPaymentMethodEnabled(states, slug)) {
    throw new Error(
      `${DISABLED_MARKER}La méthode de paiement « ${method.label} » est désactivée. Choisissez une autre méthode.`,
    );
  }
}

export { DISABLED_MARKER as PAYMENT_METHOD_DISABLED_MARKER };
