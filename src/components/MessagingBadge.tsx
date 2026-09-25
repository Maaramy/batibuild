import { useQuery } from "convex/react";
import { MessageSquare } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { formatUnreadBadge } from "@/lib/messagingBadge";
import { cn } from "@/lib/utils";

// ============================================================================
// PASTILLE DE LA MESSAGERIE — composants centralisés
//
// Toute interface qui affiche « Messagerie » passe par ces composants : le
// compteur est TOUJOURS celui du serveur, via la requête réactive
// `api.messaging.unreadCount` — la même source que la page « Messagerie » et
// que la barre de navigation de l'application Android (`MessagingBadgeSync`).
//
//   • jamais de logique dupliquée : un seul compteur pour le menu desktop, le
//     menu mobile, les en-têtes d'espace Fournisseur / Expert et le natif ;
//   • temps réel : Convex pousse la nouvelle valeur → la pastille apparaît à la
//     réception d'un message et disparaît dès que la messagerie est lue, sans
//     rechargement de page ;
//   • « 99+ » au-delà de 99, pastille entièrement masquée à 0 ;
//   • isolation : le compteur est résolu côté serveur à partir de la session
//     (aucun identifiant en argument) — chaque utilisateur ne voit que ses
//     propres messages non lus.
//
// Usage dans une liste / une boucle : lire le compteur UNE fois avec
// `useMessagingUnread()` puis passer la valeur à `MessagingIconWithBadge`
// (les boucles ne peuvent pas appeler de hook).
// ============================================================================

/**
 * Compteur réactif des messages non lus de l'utilisateur connecté.
 * `undefined` tant que la valeur n'est pas connue (aucune pastille fantôme).
 */
export function useMessagingUnread(): number | undefined {
  const count = useQuery(api.messaging.unreadCount);
  return typeof count === "number" ? count : undefined;
}

/**
 * Pastille rouge. Ne rend rien (`null`) quand il n'y a aucun message non lu.
 * `<UnreadBadge count={n} className="absolute …" />` pour la positionner.
 */
export function UnreadBadge({
  count,
  className,
}: {
  count: unknown;
  className?: string;
}) {
  const label = formatUnreadBadge(count);
  if (label === null) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm",
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * Icône « Messagerie » avec sa pastille posée en haut à droite.
 *
 * Composant SANS hook : utilisable dans une liste, un tableau ou une boucle
 * (le compteur est passé en propriété).
 */
export function MessagingIconWithBadge({
  unread,
  className,
}: {
  unread?: unknown;
  className?: string;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <MessageSquare className={className} />
      <UnreadBadge count={unread} className="absolute -right-1.5 -top-1.5" />
    </span>
  );
}

/**
 * Icône « Messagerie » autonome : lit elle-même le compteur réactif.
 * À utiliser hors boucle (un composant = un seul appel de hook).
 */
export function MessagingIcon({ className }: { className?: string }) {
  const unread = useMessagingUnread();
  return <MessagingIconWithBadge unread={unread} className={className} />;
}

export default MessagingIcon;
