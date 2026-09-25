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
//   - « Demandes de devis » : uniquement pour un compte fournisseur — c'est
//     désormais l'UNIQUE point d'entrée des demandes de devis fournisseur
//     (l'ancien espace « Devis reçus » a été supprimé) ;
//   - « Services experts » combine les demandes de service ET les rendez-vous /
//     urgences envoyés par le client ;
//   - « Devis fournisseurs » liste les demandes ENVOYÉES par l'utilisateur en
//     tant que client : un compte purement professionnel (fournisseur ou expert)
//     ne le voit pas ;
//   - un compte fournisseur (sans profil expert) ne voit pas les services
//     experts, et inversement ; un compte double rôle voit les deux.
//
// Un onglet masqué pour le rôle retombe toujours sur un onglet visible : jamais
// d'écran vide, ni de lien mort venu d'une notification ou d'un ancien lien.
// ============================================================================

export type MessagesTab = "quotes" | "services" | "received" | "requests";

export const MESSAGES_TABS: MessagesTab[] = [
  "received",
  "services",
  "requests",
  "quotes",
];

/** Onglet « par défaut » quand l'URL n'en demande pas (ou en demande un inconnu). */
export const DEFAULT_MESSAGES_TAB: MessagesTab = "services";

/** Ancien onglet « Rendez-vous », fusionné dans « Services experts ». */
export const APPOINTMENTS_TAB_ALIAS: MessagesTab = "services";

/**
 * Rend un onglet demandé (venu d'une URL) : l'ancien onglet « appointments » est
 * transparentement renvoyé vers « services » — aucun lien ne meurt.
 */
export function normalizeMessagesTab(value: string | null | undefined): MessagesTab {
  if (value === "appointments") return APPOINTMENTS_TAB_ALIAS;
  return MESSAGES_TABS.includes(value as MessagesTab)
    ? (value as MessagesTab)
    : DEFAULT_MESSAGES_TAB;
}

export interface MessagesTabLayout {
  /** Le compte possède un profil expert (chargé). */
  isExpertAccount: boolean;
  /** Le compte possède un profil fournisseur (chargé). */
  isSupplierAccount: boolean;
  /** Onglet « Services experts » affiché (demandes de service + rendez-vous). */
  showExpertServices: boolean;
  /** Onglet « Demandes de devis » affiché — demandes reçues par le fournisseur. */
  showSupplierRequests: boolean;
  /** Onglet « Devis fournisseurs » affiché — demandes envoyées par le client. */
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
  const isSupplierOnly = isSupplierAccount && !isExpertAccount;
  const showExpertServices = !isSupplierOnly;
  const showSupplierRequests = isSupplierAccount;
  // Demandes envoyées (côté client) : visibles quand le compte a un rôle client
  // — soit un client pur, soit un compte double rôle.
  const showSupplierQuotes = isExpertAccount === isSupplierAccount;

  return {
    isExpertAccount,
    isSupplierAccount,
    showExpertServices,
    showSupplierRequests,
    showSupplierQuotes,
    visibleTabs: [
      ...(isExpertAccount ? (["received"] as MessagesTab[]) : []),
      ...(showExpertServices ? (["services"] as MessagesTab[]) : []),
      ...(showSupplierRequests ? (["requests"] as MessagesTab[]) : []),
      ...(showSupplierQuotes ? (["quotes"] as MessagesTab[]) : []),
    ],
  };
}

/** Onglet lu depuis l'URL (`?tab=`), sinon l'onglet par défaut. */
export function tabFromSearch(value: string | null | undefined): MessagesTab {
  return normalizeMessagesTab(value);
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
