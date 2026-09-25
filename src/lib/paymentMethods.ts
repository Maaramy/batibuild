/**
 * Catalogue central des méthodes de paiement de batibuild.
 *
 * Source de vérité UNIQUE : le backend Convex et l'interface lisent ce fichier,
 * afin qu'aucune méthode ne soit codée en dur dans un écran ou un flux.
 *
 * Ajouter une méthode de paiement = ajouter une entrée ici (puis brancher son
 * flux de règlement). Rien d'autre dans la logique de paiement ne doit être
 * modifié : la configuration admin, le filtrage utilisateur et le contrôle
 * serveur s'appuient tous sur ce catalogue.
 */

/** Identifiant technique persisté en base — ne jamais renommer. */
export type PaymentMethodSlug = string;

export interface PaymentMethodDefinition {
  slug: PaymentMethodSlug;
  /** Libellé complet (cartes admin, récapitulatifs). */
  label: string;
  /** Libellé compact pour les sélecteurs utilisateur. */
  shortLabel: string;
  description: string;
  /** Pictogramme affiché dans la vitrine admin. */
  emoji: string;
  /** Famille d'icône utilisée par les interfaces (clé stable, pas un composant). */
  icon: "bank" | "smartphone" | "card";
  /**
   * `false` = méthode déclarée mais dont le flux de règlement n'est pas encore
   * connecté : elle reste visible dans l'admin (en lecture) et ne peut jamais
   * être activée côté utilisateurs.
   */
  implemented: boolean;
  /** État appliqué tant qu'aucune configuration n'existe en base. */
  defaultEnabled: boolean;
}

export const PAYMENT_METHOD_CATALOG: readonly PaymentMethodDefinition[] = [
  {
    slug: "bank_transfer",
    label: "Virement bancaire",
    shortLabel: "Virement",
    description:
      "Paiement par virement sur le compte bancaire de batibuild, validé manuellement par un administrateur.",
    emoji: "🏦",
    icon: "bank",
    implemented: true,
    defaultEnabled: true,
  },
  {
    slug: "d17",
    label: "D17 (La Poste Tunisienne)",
    shortLabel: "D17",
    description:
      "Paiement mobile D17 via l'application de La Poste Tunisienne.",
    emoji: "📱",
    icon: "smartphone",
    implemented: true,
    defaultEnabled: true,
  },
  {
    slug: "card",
    label: "Carte bancaire",
    shortLabel: "Carte",
    description:
      "Paiement sécurisé par carte bancaire. Le module de règlement n'est pas encore connecté.",
    emoji: "💳",
    icon: "card",
    implemented: false,
    defaultEnabled: false,
  },
];

export interface PaymentMethodState {
  slug: PaymentMethodSlug;
  enabled: boolean;
}

export function paymentMethodDefinition(
  slug: PaymentMethodSlug,
): PaymentMethodDefinition | undefined {
  return PAYMENT_METHOD_CATALOG.find((m) => m.slug === slug);
}

/** États par défaut, dans l'ordre du catalogue. */
export function defaultPaymentMethodStates(): PaymentMethodState[] {
  return PAYMENT_METHOD_CATALOG.map((m) => ({
    slug: m.slug,
    enabled: m.defaultEnabled && m.implemented,
  }));
}

/**
 * Fusionne la configuration enregistrée avec le catalogue : l'ordre et la
 * liste des méthodes viennent toujours du catalogue, la base ne fait que
 * surcharger l'état activé/désactivé. Un slug inconnu en base est ignoré et
 * une méthode non implémentée reste forcément désactivée.
 */
export function mergePaymentMethodStates(
  stored: readonly PaymentMethodState[] | null | undefined,
): PaymentMethodState[] {
  const overrides = new Map<string, boolean>();
  for (const entry of stored ?? []) {
    if (entry && typeof entry.slug === "string") {
      overrides.set(entry.slug, entry.enabled === true);
    }
  }
  return PAYMENT_METHOD_CATALOG.map((method) => ({
    slug: method.slug,
    enabled: method.implemented
      ? (overrides.get(method.slug) ?? method.defaultEnabled)
      : false,
  }));
}

export function isPaymentMethodEnabled(
  states: readonly PaymentMethodState[] | null | undefined,
  slug: PaymentMethodSlug,
): boolean {
  const method = paymentMethodDefinition(slug);
  if (!method || !method.implemented) return false;
  const state = (states ?? []).find((s) => s.slug === slug);
  return state ? state.enabled === true : method.defaultEnabled;
}

/** Slugs des méthodes réellement sélectionnables par un utilisateur. */
export function enabledPaymentMethodSlugs(
  states: readonly PaymentMethodState[] | null | undefined,
): PaymentMethodSlug[] {
  return mergePaymentMethodStates(states)
    .filter((s) => s.enabled)
    .map((s) => s.slug);
}

/**
 * Méthodes à afficher dans une interface de règlement.
 *
 * `enabledSlugs` provient de la configuration serveur (`paymentMethods` de
 * `getPublicPricing`). Tant que la configuration n'est pas chargée (`null`),
 * on retombe sur les méthodes activées par défaut du catalogue afin de ne pas
 * faire clignoter le sélecteur.
 */
export function availablePaymentMethods(
  enabledSlugs: readonly string[] | null | undefined,
): PaymentMethodDefinition[] {
  if (enabledSlugs == null) {
    return PAYMENT_METHOD_CATALOG.filter(
      (m) => m.implemented && m.defaultEnabled,
    );
  }
  return PAYMENT_METHOD_CATALOG.filter(
    (m) => m.implemented && enabledSlugs.includes(m.slug),
  );
}
