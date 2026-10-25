import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
// Les catégories sont déclarées ici en littéraux (et non importées de
// `emailTemplates`) pour ne pas créer de cycle d'initialisation entre
// `emailTemplates` → `users` → `emailNotifications` → ce module.
const ADMIN_NOTIFICATION_ALL_TOPIC = "all";
const NOTIFICATION_TOPIC_LABELS: Record<string, string> = {
  admin_new_user: "Administrateur — nouvelle inscription",
  admin_new_subscription: "Administrateur — nouvel abonnement",
  admin_new_project: "Administrateur — nouveau projet",
};

// ============================================================================
// Destinataires des notifications administrateur
// ----------------------------------------------------------------------------
// Adresses e-mail qui reçoivent les notifications d'événements de la
// plateforme (nouvelle inscription, nouvel abonnement, nouveau projet).
//
// Règles :
//  - Gestion réservée aux administrateurs, vérifiée CÔTÉ SERVEUR sur chaque
//    mutation (jamais uniquement dans l'interface).
//  - Une adresse = une ligne ; `topics` filtre les catégories reçues
//    (`all` = toutes). `active: false` suspend les envois sans suppression.
//  - Aucun secret (SMTP, clés) n'est stocké ici : seules les adresses le sont.
// ============================================================================

/** Format d'adresse e-mail accepté (identique au reste de la plateforme). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Sujets valides pour un destinataire (catégories + « all »). */
const TOPIC_VALUES = [
  ADMIN_NOTIFICATION_ALL_TOPIC,
  "admin_new_user",
  "admin_new_subscription",
  "admin_new_project",
] as const;

export function normalizeRecipientEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function isValidRecipientEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeRecipientEmail(email));
}

/**
 * Un destinataire reçoit-il cette catégorie ?
 * `all` (ou une liste vide) = toutes les notifications ; sinon la catégorie
 * doit figurer explicitement dans `topics`.
 */
export function recipientMatchesTopic(
  topics: string[] | undefined,
  topic: string,
): boolean {
  const list = (topics || []).map((t) => String(t));
  if (list.length === 0) return true;
  if (list.includes(ADMIN_NOTIFICATION_ALL_TOPIC)) return true;
  return list.includes(topic);
}

/** Liste des destinataires configurés (administrateur uniquement). */
export const listAdminNotificationRecipients = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") return [];

    const rows = await ctx.db.query("adminNotificationRecipients").collect();
    return rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((r) => ({
        _id: r._id,
        email: r.email,
        name: r.name ?? "",
        topics: r.topics,
        active: r.active !== false,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        /** Libellés lisibles des catégories reçues (affichage admin). */
        topicLabels:
          r.topics.length === 0 ||
          r.topics.includes(ADMIN_NOTIFICATION_ALL_TOPIC)
            ? ["Toutes les notifications"]
            : r.topics.map((t) => NOTIFICATION_TOPIC_LABELS[t] ?? t),
      }));
  },
});

/**
 * Ajoute ou modifie un destinataire (administrateur uniquement).
 * `recipientId` absent = ajout. Une adresse ne peut exister qu'une fois.
 */
export const saveAdminNotificationRecipient = mutation({
  args: {
    recipientId: v.optional(v.id("adminNotificationRecipients")),
    email: v.string(),
    name: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const email = normalizeRecipientEmail(args.email);
    if (!email) {
      throw new Error("Indiquez l'adresse e-mail du destinataire.");
    }
    if (!isValidRecipientEmail(email)) {
      throw new Error(`L'adresse e-mail « ${args.email.trim()} » est invalide.`);
    }

    const topics = Array.from(
      new Set((args.topics ?? [ADMIN_NOTIFICATION_ALL_TOPIC]).map((t) => String(t).trim())),
    ).filter(Boolean);
    const unknown = topics.filter(
      (t) => !(TOPIC_VALUES as readonly string[]).includes(t),
    );
    if (unknown.length > 0) {
      throw new Error(`Catégorie de notification inconnue : ${unknown.join(", ")}`);
    }

    const all = await ctx.db.query("adminNotificationRecipients").collect();
    const sameEmail = all.find((r) => normalizeRecipientEmail(r.email) === email);

    if (args.recipientId) {
      const existing = await ctx.db.get(args.recipientId);
      if (!existing) throw new Error("Destinataire introuvable");
      if (sameEmail && sameEmail._id !== existing._id) {
        throw new Error(`L'adresse « ${email} » est déjà enregistrée comme destinataire.`);
      }
      await ctx.db.patch(existing._id, {
        email,
        name: (args.name ?? "").trim() || undefined,
        topics,
        active: args.active ?? existing.active ?? true,
        updatedAt: Date.now(),
      });
    } else {
      if (sameEmail) {
        throw new Error(`L'adresse « ${email} » est déjà enregistrée comme destinataire.`);
      }
      await ctx.db.insert("adminNotificationRecipients", {
        email,
        name: (args.name ?? "").trim() || undefined,
        topics,
        active: args.active ?? true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: admin._id,
      });
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "notification_recipient_save",
        targetUserEmail: email,
        details: `Destinataire de notification ${args.recipientId ? "modifié" : "ajouté"} — ${email}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true, email };
  },
});

/** Supprime un destinataire (administrateur uniquement). */
export const deleteAdminNotificationRecipient = mutation({
  args: { recipientId: v.id("adminNotificationRecipients") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db.get(args.recipientId);
    if (!existing) throw new Error("Destinataire introuvable");

    await ctx.db.delete(args.recipientId);

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "notification_recipient_delete",
        targetUserEmail: existing.email,
        details: `Destinataire de notification supprimé — ${existing.email}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});
