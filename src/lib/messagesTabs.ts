// ============================================================================
// ONGLETS DE LA MESSAGERIE — règles partagées
//
// L'URL (`?tab=`) est la source de vérité de l'onglet : le menu, le centre de
// notifications et les liens profonds y pointent directement, y compris après
// un rafraîchissement.
//
// Règles de visibilité :
//   - « Demandes reçues » : uniquement pour un compte expert (demandes que le
//     professionnel reçoit) ;
//   - « Mes demandes » (rendez-vous côté client) : jamais dans l'espace expert,
//     où les demandes reçues sont l'entrée pertinente ;
//   - un compte fournisseur (sans profil expert) ne voit pas les services
//     experts, et inversement ; un compte double rôle voit les deux.
//
// Un onglet masqué pour le rôle retombe toujours sur un onglet visible : jamais
// d'écran vide, ni de lien mort venu d'une notification ou d'un ancien lien.
// ============================================================================

export type MessagesTab = "quotes" | "services" | "appointments" | "received";

export const MESSAGES_TABS: MessagesTab[] = [
  "quotes",
  "services",
  "appointments",
  "received",
];

/** Onglet « par défaut » quand l'URL n'en demande pas (ou en demande un inconnu). */
export const DEFAULT_MESSAGES_TAB: MessagesTab = "services";

export interface MessagesTabLayout {
  /** Le compte possède un profil expert (chargé). */
  isExpertAccount: boolean;
  /** Le compte possède un profil fournisseur (chargé). */
  isSupplierAccount: boolean;
  /** Onglet « Services experts » affiché. */
  showExpertServices: boolean;
  /** Onglet « Devis fournisseurs » affiché. */
  showSupplierQuotes: boolean;
  /** Onglets affichés, dans l'ordre de la barre. */
  visibleTabs: MessagesTab[];
}

/**
 * Rôle de messagerie déduit des profils (encore `undefined` tant qu'ils
 * chargent : on n'affiche jamais un onglet à l'aveugle sans le masquer ensuite).
 */
export function messagesTabLayout(
  hasExpertProfile: boolean | undefined,
  hasSupplierProfile: boolean | undefined,
): MessagesTabLayout {
  const isExpertAccount = hasExpertProfile === true;
  const isSupplierAccount = hasSupplierProfile === true;
  const showExpertServices = !(isSupplierAccount && !isExpertAccount);
  const showSupplierQuotes = !(isExpertAccount && !isSupplierAccount);
  return {
    isExpertAccount,
    isSupplierAccount,
    showExpertServices,
    showSupplierQuotes,
    visibleTabs: [
      ...(isExpertAccount ? (["received"] as MessagesTab[]) : []),
      ...(showExpertServices ? (["services"] as MessagesTab[]) : []),
      ...(showSupplierQuotes ? (["quotes"] as MessagesTab[]) : []),
      ...(isExpertAccount ? [] : (["appointments"] as MessagesTab[])),
    ],
  };
}

/** Onglet lu depuis l'URL (`?tab=`), sinon l'onglet par défaut. */
export function tabFromSearch(value: string | null | undefined): MessagesTab {
  return MESSAGES_TABS.includes(value as MessagesTab)
    ? (value as MessagesTab)
    : DEFAULT_MESSAGES_TAB;
}

/**
 * Onglet réellement affiché : la demande de l'URL si elle est visible pour ce
 * rôle, sinon l'onglet par défaut, sinon le premier onglet disponible.
 */
export function resolveMessagesTab(
  requested: MessagesTab,
  layout: Pick<MessagesTabLayout, "visibleTabs">,
): MessagesTab {
  if (layout.visibleTabs.includes(requested)) return requested;
  if (layout.visibleTabs.includes(DEFAULT_MESSAGES_TAB)) return DEFAULT_MESSAGES_TAB;
  return layout.visibleTabs[0] ?? DEFAULT_MESSAGES_TAB;
}
