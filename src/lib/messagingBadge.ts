// ============================================================================
// Pastille rouge de la Messagerie — mise en forme du compteur
//
// Règle unique, partagée par tous les menus de la plateforme (web desktop,
// menu mobile, barre de navigation native) et couverte par des tests :
//
//   • aucun message non lu      → aucune pastille (`null`)
//   • 1 à 99 messages non lus   → le nombre tel quel (« 1 », « 5 », « 12 »)
//   • plus de 99                → « 99+ »
//
// Le compteur lui-même vient du serveur (`api.messaging.unreadCount`) : ces
// fonctions ne calculent jamais un nombre, elles ne font que le formater.
// ============================================================================

/** Au-delà de cette valeur, la pastille affiche « 99+ ». */
export const UNREAD_BADGE_MAX = 99;

/**
 * Libellé de la pastille, ou `null` quand il n'y a rien à afficher.
 *
 * `null` couvre le compteur non encore chargé (`undefined`), le zéro, les
 * valeurs négatives et les valeurs non numériques : l'absence de message non lu
 * ne doit JAMAIS produire une pastille « 0 ».
 */
export function formatUnreadBadge(count: unknown): string | null {
  if (typeof count !== "number" || !Number.isFinite(count)) return null;
  const value = Math.floor(count);
  if (value <= 0) return null;
  return value > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : String(value);
}
