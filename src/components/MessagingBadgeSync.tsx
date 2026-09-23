import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { postUnreadCount } from "@/lib/nativeBridge";

/**
 * PASTILLE DE LA MESSAGERIE — synchronisation temps réel vers l'application
 * Android.
 *
 * Monté une seule fois pour toute l'application (`src/main.tsx`), ce composant
 * écoute la requête Convex réactive `api.messaging.unreadCount` — le MÊME
 * compteur que celui du menu web — et publie chaque changement à la coque
 * native (WebView), qui l'affiche sur l'icône « Messagerie » de la barre du bas.
 *
 *   - **temps réel** : Convex pousse la nouvelle valeur ; aucun rechargement de
 *     page n'est nécessaire, y compris si l'utilisateur est sur une autre page ;
 *   - **démarrage** : rien n'est publié tant que la valeur n'est pas connue
 *     (`undefined`) → aucune pastille « 0 » fantôme ni clignotement ;
 *   - **erreur de synchronisation** : aucune publication non plus → le natif
 *     conserve son dernier compteur fiable ;
 *   - **aucune donnée fictive** : la valeur vient du serveur et n'est publiée
 *     qu'une fois par changement réel.
 *
 * Sur le Web, le pont natif est absent : le composant ne fait rien.
 */
export function MessagingBadgeSync() {
  const unread = useQuery(api.messaging.unreadCount);
  const lastPosted = useRef<number | null>(null);

  useEffect(() => {
    if (typeof unread !== "number") return;
    if (lastPosted.current === unread) return;
    if (postUnreadCount(unread)) lastPosted.current = unread;
  }, [unread]);

  return null;
}

export default MessagingBadgeSync;
