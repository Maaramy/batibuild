import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Suppression complète et définitive d'un utilisateur — appelée uniquement par
 * les mutations admin (`users.deleteUser`, `users.batchDeleteUsers`).
 *
 * Principe : identifier TOUTES les tables contenant une référence au compte
 * (userId, ownerId/createdBy/authorId, profileId, projectId appartenant à
 * l'utilisateur) et supprimer les enfants AVANT le compte, pour ne laisser
 * aucune donnée orpheline. Les catalogues globaux (materialPrices,
 * marketSources, paymentConfig, bimConfig, emailConfig/Templates, seoConfig,
 * featureFlags…) ne sont JAMAIS supprimés : seules les références
 * `updatedBy`/`refreshedBy` d'un utilisateur supprimé y deviennent
 * historiquement orphelines, ce qui est voulu (historique global conservé).
 *
 * Ordre respecté (dépendances réelles du schéma) :
 *   1. données dépendantes des profils et projets (enfants d'enfants)
 *   2. projets + données dérivées (analyses, roadmaps, rapports, DQE…)
 *   3. fichiers storage (reçus, pièces jointes, images de profil/logos)
 *   4. profils spécialisés (expert, fournisseur) et leurs analytics
 *   5. abonnements / reçus / paiements
 *   6. rendez-vous, demandes de service, urgences (créées OU reçues)
 *   7. ratings, devis, recommandations IA, support, notifications, e-mails
 *   8. compte auth (accounts, sessions, codes de vérification) + user
 *   9. vérification : plus aucune ligne liée ne doit rester.
 */

type UserDoc = {
  _id: Id<"users">;
  name?: string;
  email?: string;
  image?: string;
  userRole?: "client" | "supplier" | "expert";
};

async function deleteAll(
  ctx: { db: any },
  rows: { _id: unknown }[],
): Promise<number> {
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function collectByUser(
  ctx: { db: any },
  table: string,
  userId: Id<"users">,
): Promise<any[]> {
  try {
    return await ctx.db
      .query(table)
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  } catch {
    // Table sans index `by_user` : jamais le cas aujourd'hui, garde-fou.
    return [];
  }
}

/** Supprime un fichier storage en tolérant l'absence (déjà purgé). */
async function deleteStorage(
  ctx: { storage: any },
  storageId: Id<"_storage"> | undefined,
): Promise<void> {
  if (!storageId) return;
  try {
    await ctx.storage.delete(storageId);
  } catch {
    /* fichier déjà supprimé */
  }
}

/**
 * Extrait l'identifiant Convex storage d'une URL de fichier
 * (`https://…/<id>` ou legacy `${origin}/api/storage/<id>`).
 */
function storageIdFromUrl(url: string | undefined): Id<"_storage"> | undefined {
  if (!url) return undefined;
  const match = url.match(/(?:\/api\/storage\/|\/files\/)([A-Za-z0-9]+)(?:[?#]|$)/);
  return (match?.[1] as Id<"_storage">) ?? undefined;
}

export const deleteUserCompletely = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = args.userId;
    const user = (await ctx.db.get(userId)) as UserDoc | null;
    if (!user) throw new Error("Utilisateur introuvable");

    const counts: Record<string, number> = {};

    // ── 0. Profil expert / fournisseur ciblés réciproquement par ses demandes
    // (à récupérer tôt : les étapes 5-7 suppriment les demandes reçues).
    const expertProfiles = await collectByUser(ctx, "expertProfiles", userId);
    const supplierProfiles = await collectByUser(ctx, "supplierProfiles", userId);
    const expertProfileIds = expertProfiles.map((p) => p._id as Id<"expertProfiles">);
    const supplierProfileIds = supplierProfiles.map((p) => p._id as Id<"supplierProfiles">);

    // ── 1. Projets : d'abord les enfants, puis les projets ──────────────────
    const projects = await collectByUser(ctx, "projects", userId);
    counts.projects = projects.length;

    // Rapports générés (PDF/Excel/CSV) + fichiers storage associés.
    for (const project of projects) {
      const reports = await ctx.db
        .query("reports")
        .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
        .collect();
      for (const r of reports) await deleteStorage(ctx, r.storageId);
      counts.reports = (counts.reports ?? 0) + (await deleteAll(ctx, reports));
    }
    // Rapports créés hors projet (index by_user).
    counts.reports =
      (counts.reports ?? 0) +
      (await deleteAll(ctx, await collectByUser(ctx, "reports", userId)));

    // DQE / BIM / roadmaps / prestataires recommandés — dérivés du projet.
    for (const project of projects) {
      counts.projectRoadmaps =
        (counts.projectRoadmaps ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("projectRoadmaps")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect(),
        ));
      counts.projectRecommendedProviders =
        (counts.projectRecommendedProviders ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("projectRecommendedProviders")
            .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
            .collect(),
        ));
    }

    // Analyses IA liées aux projets ou au compte (indexes by_user).
    counts.aiMaterialAnalyses =
      (counts.aiMaterialAnalyses ?? 0) +
      (await deleteAll(ctx, await collectByUser(ctx, "aiMaterialAnalyses", userId)));
    counts.investmentAnalyses =
      (counts.investmentAnalyses ?? 0) +
      (await deleteAll(ctx, await collectByUser(ctx, "investmentAnalyses", userId)));

    // Fichiers téléversés sur les projets (plans, photos, DWG…) + comptes
    // auth/sessions (l'auth doit disparaître avant la suppression du compte).
    for (const project of projects) {
      for (const f of project.files ?? []) {
        await deleteStorage(ctx, f.storageId as Id<"_storage"> | undefined);
      }
    }
    for (const project of projects) await ctx.db.delete(project._id);

    // ── 2. Support & messagerie ─────────────────────────────────────────────
    const supportTickets = await collectByUser(ctx, "supportTickets", userId);
    counts.supportTickets = supportTickets.length;
    for (const ticket of supportTickets) {
      const messages = await ctx.db
        .query("supportMessages")
        .withIndex("by_ticket", (q: any) => q.eq("ticketId", ticket._id))
        .collect();
      for (const m of messages) {
        await deleteStorage(ctx, m.attachmentStorageId);
        await ctx.db.delete(m._id);
      }
      const notes = await ctx.db
        .query("supportNotes")
        .withIndex("by_ticket", (q: any) => q.eq("ticketId", ticket._id))
        .collect();
      await deleteAll(ctx, notes);
      await ctx.db.delete(ticket._id);
    }
    // Messages envoyés par l'utilisateur dans les tickets d'AUTRES comptes
    // (jamais laissés orphelins, sans toucher aux tickets d'autrui).
    const sentSupportMessages = await ctx.db
      .query("supportMessages")
      .filter((q: any) => q.eq(q.field("senderId"), userId))
      .collect();
    for (const m of sentSupportMessages) {
      await deleteStorage(ctx, m.attachmentStorageId);
      await ctx.db.delete(m._id);
    }
    const ownSupportNotes = await ctx.db
      .query("supportNotes")
      .filter((q: any) => q.eq(q.field("authorId"), userId))
      .collect();
    await deleteAll(ctx, ownSupportNotes);

    // ── 3. Abonnements, reçus et paiements ──────────────────────────────────
    const subscriptions = await collectByUser(ctx, "subscriptions", userId);
    counts.subscriptions = subscriptions.length;
    for (const sub of subscriptions) {
      await deleteStorage(ctx, sub.paymentProofStorageId);
      await ctx.db.delete(sub._id);
    }

    // ── 4. Profils expert / fournisseur et leurs données liées ──────────────
    for (const profileId of supplierProfileIds) {
      counts.supplierAnalytics =
        (counts.supplierAnalytics ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("supplierAnalytics")
            .withIndex("by_supplier", (q: any) => q.eq("supplierId", profileId))
            .collect(),
        ));
      counts.supplierRatings =
        (counts.supplierRatings ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("supplierRatings")
            .withIndex("by_supplier", (q: any) => q.eq("supplierId", profileId))
            .collect(),
        ));
      // Devis reçus sur ce profil fournisseur + réponses liées.
      const quotes = await ctx.db
        .query("quoteRequests")
        .withIndex("by_supplier", (q: any) => q.eq("supplierId", profileId))
        .collect();
      for (const quote of quotes) {
        counts.quoteResponses =
          (counts.quoteResponses ?? 0) +
          (await deleteAll(
            ctx,
            await ctx.db
              .query("quoteResponses")
              .withIndex("by_quote", (q: any) => q.eq("quoteRequestId", quote._id))
              .collect(),
          ));
        await ctx.db.delete(quote._id);
      }
    }
    for (const profile of supplierProfiles) {
      await deleteStorage(ctx, profile.paymentProofStorageId);
      await deleteStorage(ctx, storageIdFromUrl(profile.logo));
      await ctx.db.delete(profile._id);
    }
    counts.supplierProfiles = supplierProfiles.length;

    for (const profileId of expertProfileIds) {
      counts.expertAnalytics =
        (counts.expertAnalytics ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("expertAnalytics")
            .withIndex("by_expert", (q: any) => q.eq("expertId", profileId))
            .collect(),
        ));
      counts.expertRatings =
        (counts.expertRatings ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("expertRatings")
            .withIndex("by_expert", (q: any) => q.eq("expertId", profileId))
            .collect(),
        ));
      // Demandes de service reçues + réponses correspondantes.
      const serviceRequests = await ctx.db
        .query("expertServiceRequests")
        .withIndex("by_expert", (q: any) => q.eq("expertId", profileId))
        .collect();
      for (const request of serviceRequests) {
        counts.expertServiceResponses =
          (counts.expertServiceResponses ?? 0) +
          (await deleteAll(
            ctx,
            await ctx.db
              .query("expertServiceResponses")
              .withIndex("by_request", (q: any) => q.eq("serviceRequestId", request._id))
              .collect(),
          ));
        await ctx.db.delete(request._id);
      }
      // Demandes de rendez-vous et urgences reçues sur ce profil.
      counts.expertAppointments =
        (counts.expertAppointments ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("expertAppointments")
            .withIndex("by_expert", (q: any) => q.eq("expertId", profileId))
            .collect(),
        ));
      counts.expertUrgentRequests =
        (counts.expertUrgentRequests ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("expertUrgentRequests")
            .withIndex("by_expert", (q: any) => q.eq("expertId", profileId))
            .collect(),
        ));
    }
    for (const profile of expertProfiles) {
      await deleteStorage(ctx, profile.paymentProofStorageId);
      await deleteStorage(ctx, storageIdFromUrl(profile.logo));
      await ctx.db.delete(profile._id);
    }
    counts.expertProfiles = expertProfiles.length;

    // ── 5. Demandes créées par l'utilisateur (rendez-vous, services, urgences)
    counts.expertAppointments =
      (counts.expertAppointments ?? 0) +
      (await deleteAll(ctx, await collectByUser(ctx, "expertAppointments", userId)));
    counts.expertUrgentRequests =
      (counts.expertUrgentRequests ?? 0) +
      (await deleteAll(ctx, await collectByUser(ctx, "expertUrgentRequests", userId)));
    counts.expertServiceRequests =
      (counts.expertServiceRequests ?? 0) +
      (await deleteAll(ctx, await collectByUser(ctx, "expertServiceRequests", userId)));
    const ownServiceResponses = await collectByUser(ctx, "expertServiceResponses", userId);
    for (const r of ownServiceResponses) await deleteStorage(ctx, r.attachmentStorageId);
    counts.expertServiceResponses =
      (counts.expertServiceResponses ?? 0) + (await deleteAll(ctx, ownServiceResponses));

    // Devis envoyés par l'utilisateur (+ réponses fournisseur associées).
    const ownQuotes = await collectByUser(ctx, "quoteRequests", userId);
    for (const quote of ownQuotes) {
      counts.quoteResponses =
        (counts.quoteResponses ?? 0) +
        (await deleteAll(
          ctx,
          await ctx.db
            .query("quoteResponses")
            .withIndex("by_quote", (q: any) => q.eq("quoteRequestId", quote._id))
            .collect(),
        ));
    }
    counts.quoteRequests = ownQuotes.length;
    const ownQuoteResponses = await collectByUser(ctx, "quoteResponses", userId);
    for (const r of ownQuoteResponses) await deleteStorage(ctx, r.attachmentStorageId);
    counts.quoteResponses =
      (counts.quoteResponses ?? 0) + (await deleteAll(ctx, ownQuoteResponses));

    // ── 6. Ratings laissés par l'utilisateur (hors profils déjà supprimés) ──
    counts.supplierRatings =
      (counts.supplierRatings ?? 0) +
      (await deleteAll(ctx, await collectByUser(ctx, "supplierRatings", userId)));
    counts.expertRatings =
      (counts.expertRatings ?? 0) +
      (await deleteAll(ctx, await collectByUser(ctx, "expertRatings", userId)));

    // ── 7. Notifications & e-mails personnels ───────────────────────────────
    counts.notifications = await deleteAll(
      ctx,
      await collectByUser(ctx, "notifications", userId),
    );
    // e-mailHistory n'a pas d'index utilisateur : filtre sur l'adresse du compte.
    if (user.email) {
      const emails = await ctx.db
        .query("emailHistory")
        .filter((q: any) => q.eq(q.field("to"), user.email))
        .collect();
      counts.emailHistory = await deleteAll(ctx, emails);
    }

    // ── 8. Compte auth : sessions, comptes, codes de vérification ───────────
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .collect();
    counts.authAccounts = authAccounts.length;
    for (const account of authAccounts) {
      const verifications = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q: any) => q.eq("accountId", account._id))
        .collect();
      await deleteAll(ctx, verifications);
      await ctx.db.delete(account._id);
    }
    const authSessions = await ctx.db
      .query("authSessions")
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .collect();
    counts.authSessions = authSessions.length;
    for (const session of authSessions) await ctx.db.delete(session._id);

    // Image de profil (URL storage) — supprimée en dernier.
    await deleteStorage(ctx, storageIdFromUrl(user.image));

    // ── 9. Compte utilisateur ───────────────────────────────────────────────
    await ctx.db.delete(userId);

    // ── 10. Vérification post-suppression ───────────────────────────────────
    const leftover: string[] = [];
    const verify = async (table: string, rows: any[]) => {
      if (rows.length > 0) leftover.push(`${table}:${rows.length}`);
    };
    await verify("projects", await collectByUser(ctx, "projects", userId));
    await verify("subscriptions", await collectByUser(ctx, "subscriptions", userId));
    await verify("notifications", await collectByUser(ctx, "notifications", userId));
    await verify("reports", await collectByUser(ctx, "reports", userId));
    await verify("expertProfiles", await collectByUser(ctx, "expertProfiles", userId));
    await verify("supplierProfiles", await collectByUser(ctx, "supplierProfiles", userId));
    await verify(
      "expertAppointments",
      await collectByUser(ctx, "expertAppointments", userId),
    );
    await verify(
      "expertUrgentRequests",
      await collectByUser(ctx, "expertUrgentRequests", userId),
    );
    await verify(
      "expertServiceRequests",
      await collectByUser(ctx, "expertServiceRequests", userId),
    );
    await verify("quoteRequests", await collectByUser(ctx, "quoteRequests", userId));
    await verify("quoteResponses", await collectByUser(ctx, "quoteResponses", userId));
    await verify("investmentAnalyses", await collectByUser(ctx, "investmentAnalyses", userId));
    await verify("aiMaterialAnalyses", await collectByUser(ctx, "aiMaterialAnalyses", userId));
    await verify("supportTickets", await collectByUser(ctx, "supportTickets", userId));
    const authLeft = await ctx.db
      .query("authAccounts")
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .collect();
    await verify("authAccounts", authLeft);
    const userLeft = await ctx.db.get(userId);
    if (userLeft) leftover.push("users:1");

    if (leftover.length > 0) {
      // Ne JAMAIS considérer l'utilisateur comme supprimé : la mutation
      // échoue (transaction Convex annulée) et l'erreur est tracée.
      throw new Error(`Suppression incomplète : ${leftover.join(", ")}`);
    }

    return { success: true, deleted: counts };
  },
});
