import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// MESSAGERIE — compteur de messages non lus
//
// SOURCE UNIQUE de la pastille rouge de la Messagerie : elle est utilisée par
// le menu web ET par la barre de navigation native de l'application Android
// (diffusée à la WebView, voir `MessagingBadgeSync`).
//
// Ce que compte la pastille = EXACTEMENT ce que la page « Messagerie »
// (`/dashboard/messages`) affiche ET marque comme lu à l'ouverture, ni plus ni
// moins. Ouvrir la messagerie suffit donc à faire disparaître la pastille :
//
//   • onglet « Devis fournisseurs »    → `quoteResponses` (réponses reçues)
//   • onglet « Services experts »      → `expertServiceResponses` (réponses)
//   • onglet « Demandes reçues » (pro) → `expertAppointments` (rendez-vous)
//                                        + `expertUrgentRequests` (urgences)
//
// Ne sont PAS comptés ici :
//   • l'ESPACE PROFESSIONNEL (`quoteRequests` / `expertServiceRequests` reçus),
//     affiché et vidé par les pages « Devis reçus » (fournisseur / expert),
//     avec leurs propres compteurs — deux systèmes distincts, comme demandé ;
//   • le CENTRE DE NOTIFICATIONS (`notifications`) : les événements système
//     (annonces, alertes, changements de statut) restent gérés par
//     `NotificationCenter` / `notifications.ts`. Une notification qui pointe
//     vers une conversation laisse simplement le compteur ci-dessous refléter
//     l'état « lu / non lu » réel de cette conversation.
//
// SÉCURITÉ : chaque requête est filtrée sur l'utilisateur connecté (ou sur SON
// propre profil expert pour les demandes reçues). Un utilisateur ne peut donc
// ni connaître ni influencer le compteur d'un autre : aucun identifiant n'est
// accepté en argument, tout est résolu côté serveur à partir de la session.
// Aucune mutation n'expose le compteur : il ne peut pas être forcé par un
// client (il est recalculé à partir des états « lu / non lu » enregistrés).
// ============================================================================

/** Nombre d'éléments non consultés d'une liste (`readAt` absent = non lu). */
function countUnread(items: { readAt?: number }[]): number {
  return items.filter((item) => item.readAt === undefined).length;
}

/**
 * Nombre de messages / demandes non lus de l'utilisateur connecté.
 *
 * Retourne `0` sans session (aucune donnée n'est exposée). Les listes vides
 * et les profils professionnels absents ne contribuent pas au compteur.
 */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    let total = 0;

    // ── Côté client : réponses reçues (fournisseurs + experts) ──────────────
    total += countUnread(
      await ctx.db
        .query("quoteResponses")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    );
    total += countUnread(
      await ctx.db
        .query("expertServiceResponses")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    );

    // ── Côté professionnel : rendez-vous et urgences reçus (onglet
    //    « Demandes reçues » de la messagerie) ────────────────────────────────
    const expertProfile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (expertProfile) {
      total += countUnread(
        await ctx.db
          .query("expertAppointments")
          .withIndex("by_expert", (q) => q.eq("expertId", expertProfile._id))
          .collect(),
      );
      total += countUnread(
        await ctx.db
          .query("expertUrgentRequests")
          .withIndex("by_expert", (q) => q.eq("expertId", expertProfile._id))
          .collect(),
      );
    }

    return total;
  },
});
