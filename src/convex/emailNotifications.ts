import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { DEFAULT_TEMPLATES, EMAIL_EVENT_LABELS } from "./emailTemplates";
import type { AdminNotificationEventType } from "./emailTemplates";
import { decryptPassword } from "./emailConfig";
import { getFreePlanStatus, isProfilePaymentActive } from "./access";

// ============================================================================
// Automatic Email Notifications Engine
// Orchestration runs in internal mutations (config, dedup, rendering, history);
// the actual network send happens in the Node action emailSender.sendEmailAction
// (SMTP primary, VLY email fallback).
// ============================================================================

export type EmailVars = {
  nom?: string;
  prenom?: string;
  nomEntreprise?: string;
  typeAbonnement?: string;
  dateActivation?: string;
  dateExpiration?: string;
  montant?: string;
  numeroFacture?: string;
  lienConnexion?: string;
  nomPlateforme?: string;
  // Variables des flux de demande de devis / service
  nomProjet?: string;
  typeProjet?: string;
  entreprise?: string;
  detailsDemande?: string;
  montantDevis?: string;
  message?: string;
  // Variables des demandes reçues par un professionnel (ProMarket)
  creneau?: string;
  motif?: string;
  region?: string;
  // Informations du projet attaché à une demande (rendez-vous / urgent)
  surfaceProjet?: string;
  // Contexte de la demande / de la réponse (utilisé par les modèles admin)
  expediteur?: string;
  typeDemande?: string;
  statut?: string;
  date?: string;
  heure?: string;
  // Notifications administrateur (compte / abonnement / projet concerné)
  email?: string;
  profil?: string;
};

export const emailEventValidator = v.union(
  v.literal("subscription_activated"),
  v.literal("subscription_renewed"),
  v.literal("subscription_expired"),
  v.literal("payment_confirmed"),
  v.literal("payment_rejected"),
  v.literal("subscription_suspended"),
  v.literal("subscription_canceled"),
  v.literal("quote_request_sent"),
  v.literal("service_request_sent"),
  v.literal("expert_quote_request"),
  v.literal("expert_appointment_request"),
  v.literal("expert_urgent_request"),
  v.literal("quote_received"),
  v.literal("service_received"),
  v.literal("expert_quote_received"),
  v.literal("expert_appointment_response"),
  v.literal("expert_urgent_response"),
  v.literal("support_ticket_created"),
  v.literal("support_reply"),
  v.literal("admin_new_user"),
  v.literal("admin_new_subscription"),
  v.literal("admin_new_project"),
);

/** Validateur des variables de modèle (partagé par les deux diffusions). */
const emailVarsValidator = v.object({
  nom: v.optional(v.string()),
  prenom: v.optional(v.string()),
  nomEntreprise: v.optional(v.string()),
  typeAbonnement: v.optional(v.string()),
  dateActivation: v.optional(v.string()),
  dateExpiration: v.optional(v.string()),
  montant: v.optional(v.string()),
  numeroFacture: v.optional(v.string()),
  lienConnexion: v.optional(v.string()),
  nomPlateforme: v.optional(v.string()),
  nomProjet: v.optional(v.string()),
  typeProjet: v.optional(v.string()),
  entreprise: v.optional(v.string()),
  detailsDemande: v.optional(v.string()),
  montantDevis: v.optional(v.string()),
  message: v.optional(v.string()),
  creneau: v.optional(v.string()),
  motif: v.optional(v.string()),
  region: v.optional(v.string()),
  surfaceProjet: v.optional(v.string()),
  expediteur: v.optional(v.string()),
  typeDemande: v.optional(v.string()),
  statut: v.optional(v.string()),
  date: v.optional(v.string()),
  heure: v.optional(v.string()),
  email: v.optional(v.string()),
  profil: v.optional(v.string()),
});

// ----------------------------------------------------------------------------
// Shared helpers used by the trigger hooks
// ----------------------------------------------------------------------------

export function formatDateFr(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function planLabel(plan?: string): string {
  switch (plan) {
    case "pro":
      return "Client Pro";
    case "supplier":
      return "Fournisseur";
    case "expert":
      return "Expert";
    case "free":
      return "Aucun";
    case "monthly":
      return "Fournisseur";
    default:
      return plan || "—";
  }
}

export function splitName(fullName?: string): { nom: string; prenom: string } {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nom: "", prenom: "" };
  if (parts.length === 1) return { nom: parts[0], prenom: "" };
  return { nom: parts.slice(1).join(" "), prenom: parts[0] };
}

/**
 * Schedule an email notification from a mutation.
 * Hooks call this — it enqueues the orchestration as an internal mutation.
 */
export async function scheduleEmailEvent(
  ctx: any,
  params: {
    to: string;
    recipientName?: string;
    templateKey:
      | "subscription_activated"
      | "subscription_renewed"
      | "subscription_expired"
      | "payment_confirmed"
      | "payment_rejected"
      | "subscription_suspended"
      | "subscription_canceled"
      | "quote_request_sent"
      | "service_request_sent"
      | "expert_quote_request"
      | "expert_appointment_request"
      | "expert_urgent_request"
      | "quote_received"
      | "service_received"
      | "expert_quote_received"
      | "expert_appointment_response"
      | "expert_urgent_response"
      | "support_ticket_created"
      | "support_reply"
      | "admin_new_user"
      | "admin_new_subscription"
      | "admin_new_project";
    vars: EmailVars;
    dedupeKey?: string;
    sendToAdmins?: boolean;
    /**
     * Facture à joindre en PDF (activation d'abonnement, paiement confirmé).
     * Le PDF est produit côté serveur puis joint à l'e-mail.
     */
    invoiceId?: Id<"invoices">;
  },
) {
  if (!params.to) return;
  try {
    await ctx.scheduler.runAfter(0, internal.emailNotifications.processEmailEvent, params);
  } catch (e) {
    // Sending is best-effort — never block the subscription flow
  }
}

/**
 * Notifie l'ADMINISTRATEUR de la plateforme d'un événement (nouvelle
 * inscription, nouvel abonnement, nouveau projet).
 *
 * À appeler DANS la mutation concernée, après la réussite effective de
 * l'opération : la diffusion (modèle actif ? destinataires ?) est résolue par
 * `dispatchAdminNotification`, qui planifie un envoi distinct par destinataire
 * — chacun tracé dans `emailHistory` (type, destinataire, date, statut).
 *
 * `entityId` rend la déduplication fiable : un même événement (même compte,
 * même abonnement, même projet) n'est jamais notifié deux fois, alors que deux
 * événements distincts du même utilisateur le sont normalement.
 */
export async function scheduleAdminNotification(
  ctx: any,
  params: {
    templateKey: AdminNotificationEventType;
    entityId: string;
    vars: EmailVars;
  },
) {
  try {
    await ctx.scheduler.runAfter(0, internal.emailNotifications.dispatchAdminNotification, {
      templateKey: params.templateKey,
      entityId: params.entityId,
      vars: params.vars,
    });
  } catch (e) {
    // La notification ne doit jamais faire échouer l'opération métier.
  }
}

// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------

/**
 * Remplace les jetons `{{Variable}}` d'un modèle par les valeurs résolues.
 * Exporté pour les tests : c'est le seul endroit qui connaît la liste des
 * variables disponibles dans l'espace admin.
 */
export function renderTokens(text: string, vars: Record<string, string>): string {
  // `[^}]+` (et non `\w+`) : les variables accentuées de la plateforme
  // ({{Prénom}}, {{NuméroFacture}}, {{Créneau}}, {{Région}}…) doivent être
  // remplacées elles aussi, sinon le client reçoit le jeton brut.
  return text.replace(/\{\{([^}]+)\}\}/g, (m, key: string) => {
    const lookup: Record<string, string> = {
      Nom: vars.nom || "",
      Prénom: vars.prenom || "",
      NomEntreprise: vars.nomEntreprise || "",
      TypeAbonnement: vars.typeAbonnement || "",
      DateActivation: vars.dateActivation || "",
      DateExpiration: vars.dateExpiration || "",
      Montant: vars.montant || "",
      NuméroFacture: vars.numeroFacture || "",
      LienConnexion: vars.lienConnexion || "#",
      NomPlateforme: vars.nomPlateforme || "batibuild",
      NomProjet: vars.nomProjet || "",
      TypeProjet: vars.typeProjet || "",
      Entreprise: vars.entreprise || "",
      DétailsDemande: vars.detailsDemande || "",
      MontantDevis: vars.montantDevis || "",
      Message: vars.message || "",
      Créneau: vars.creneau || "",
      Motif: vars.motif || "",
      Région: vars.region || "",
      SurfaceProjet: vars.surfaceProjet || "",
      Expéditeur: vars.expediteur || "",
      TypeDemande: vars.typeDemande || "",
      Statut: vars.statut || "",
      Date: vars.date || "",
      Heure: vars.heure || "",
      Email: vars.email || "",
      Profil: vars.profil || "",
    };
    return lookup[key] !== undefined ? lookup[key] : m;
  });
}

/**
 * Encart « facture jointe » ajouté au corps de l'e-mail lorsqu'un PDF de
 * facture est joint (activation d'abonnement, paiement confirmé).
 *
 * Il est ajouté au moment de l'envoi, et non depuis le modèle : il reste donc
 * exact même si l'administrateur personnalise le modèle, et il n'apparaît
 * jamais sur un e-mail sans pièce jointe.
 * Exporté pour les tests (rendu pur, sans scheduler ni réseau).
 */
export function renderInvoiceAttachmentNotice(invoiceNumber?: string | null): string {
  const number = (invoiceNumber || "").replace(/[^A-Za-z0-9\-/]/g, "").trim();
  if (!number) return "";
  return `<p style="margin:18px 0 0;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#065f46;font-size:13px;line-height:1.6;">Votre facture <strong>${number}</strong> est jointe à cet e-mail au format PDF (elle reste également téléchargeable depuis votre profil, rubrique «&nbsp;Mes factures&nbsp;»).</p>`;
}

function buildBrandedHtml(bodyHtml: string, opts: {
  platformName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  signature?: string;
}): string {
  const logo = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${opts.platformName}" style="max-height:44px;max-width:180px;" />`
    : `<span style="font-size:20px;font-weight:800;color:#ffffff;">${opts.platformName}</span>`;
  const signature = opts.signature
    ? `<div style="margin-top:26px;padding-top:16px;border-top:1px solid #e5e7eb;color:#374151;font-size:13px;line-height:1.7;">${opts.signature.replace(/\n/g, "<br/>")}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,${opts.primaryColor},${opts.accentColor});padding:24px 32px;display:flex;align-items:center;justify-content:space-between;">
      ${logo}
      <span style="color:rgba(255,255,255,0.85);font-size:12px;letter-spacing:1px;">NOTIFICATION</span>
    </div>
    <div style="padding:32px;">
      ${bodyHtml}
      ${signature}
    </div>
    <div style="background:#f9fafb;padding:18px 32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #eef0f3;">
      © ${new Date().getFullYear()} ${opts.platformName} — <a href="{{LINK}}" style="color:#6b7280;">${opts.platformName}</a>
      <br/>Cet e-mail vous a été envoyé automatiquement. Merci de ne pas y répondre.
    </div>
  </div>
</body>
</html>`;
}

// ----------------------------------------------------------------------------
// Diffusion administrateur (internal mutation)
// ----------------------------------------------------------------------------

/**
 * Résout le modèle puis les destinataires et planifie un envoi PAR destinataire.
 *
 * Aucun e-mail n'est envoyé si :
 *  - le modèle a été supprimé (`deletedAt`) ou désactivé par l'administrateur ;
 *  - aucun destinataire actif n'est configuré pour cette catégorie.
 * Ces deux cas sont retournés explicitement (jamais silencieux).
 */
export const dispatchAdminNotification = internalMutation({
  args: {
    templateKey: emailEventValidator,
    entityId: v.string(),
    vars: v.optional(emailVarsValidator),
  },
  handler: async (ctx, args) => {
    const templateKey = args.templateKey as AdminNotificationEventType;

    const stored = await ctx.db
      .query("emailTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.templateKey))
      .first();

    if ((stored as { deletedAt?: number } | null)?.deletedAt != null) {
      return { success: true, skipped: "deleted", sentTo: [] as string[] };
    }

    const template = stored || DEFAULT_TEMPLATES.find((t) => t.key === templateKey);
    if (!template || template.active === false) {
      return { success: true, skipped: "disabled", sentTo: [] as string[] };
    }

    // Destinataires ACTIFS de cette catégorie (table dédiée, gérée depuis
    // l'administration). Lecture directe : évite un cycle d'imports entre le
    // moteur d'envoi et les modules d'administration.
    const recipientRows = await ctx.db
      .query("adminNotificationRecipients")
      .collect();
    const recipients = Array.from(
      new Set(
        recipientRows
          .filter((r: any) => r.active !== false)
          .filter((r: any) => {
            const list: string[] = (r.topics || []).map((t: any) => String(t));
            return list.length === 0 || list.includes("all") || list.includes(templateKey);
          })
          .map((r: any) => String(r.email || "").trim().toLowerCase())
          .filter(Boolean),
      ),
    ) as string[];
    if (recipients.length === 0) {
      // Aucune adresse configurée : rien n'est envoyé (jamais aux comptes
      // administrateur par défaut — la liste est gérée par l'administrateur).
      return { success: true, skipped: "no_recipients", sentTo: [] as string[] };
    }

    const vars = (args.vars || {}) as EmailVars;
    for (const email of recipients) {
      await ctx.scheduler.runAfter(0, internal.emailNotifications.processEmailEvent, {
        to: email,
        templateKey: args.templateKey,
        vars,
        // Déduplication par événement ET par destinataire.
        dedupeKey: `admin:${templateKey}:${args.entityId}:${email}`,
      });
    }

    return { success: true, status: "scheduled", sentTo: recipients };
  },
});

// ----------------------------------------------------------------------------
// Orchestration (internal mutation)
// ----------------------------------------------------------------------------

export const processEmailEvent = internalMutation({
  args: {
    to: v.string(),
    recipientName: v.optional(v.string()),
    templateKey: emailEventValidator,
    vars: v.optional(emailVarsValidator),
    dedupeKey: v.optional(v.string()),
    sendToAdmins: v.optional(v.boolean()),
    force: v.optional(v.boolean()),
    /** Facture dont le PDF est joint à l'e-mail. */
    invoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const vars = (args.vars || {}) as EmailVars;
    const now = Date.now();
    const dedupeKey = args.dedupeKey;

    const recordFailed = async (error: string, subject: string) => {
      const payloadJson = JSON.stringify({
        to: args.to,
        recipientName: args.recipientName,
        templateKey: args.templateKey,
        vars: args.vars,
        dedupeKey: args.dedupeKey,
        sendToAdmins: args.sendToAdmins,
        // Conservé pour que « Renvoyer » réexpédie aussi la facture PDF.
        invoiceId: args.invoiceId,
      });
      await ctx.db.insert("emailHistory", {
        to: args.to,
        recipientName: args.recipientName,
        templateKey: args.templateKey,
        subject,
        status: "failed",
        error,
        createdAt: now,
        attemptCount: 1,
        dedupeKey,
        payloadJson,
        sentToAdmins: !!args.sendToAdmins,
      });
    };

    // 1. Load configuration
    const config = await ctx.db.query("emailConfig").order("desc").first();
    if (!config || !config.senderEmail) {
      await recordFailed(
        "Configuration e-mail manquante — définissez l'expéditeur dans Configuration E-mail",
        EMAIL_EVENT_LABELS[args.templateKey],
      );
      return { success: false, status: "failed" };
    }
    if (config.autoEnabled === false) {
      await recordFailed(
        "Notifications e-mail désactivées dans la configuration",
        EMAIL_EVENT_LABELS[args.templateKey],
      );
      return { success: false, status: "failed" };
    }

    // 2. Deduplication — skip if the same event was already sent successfully < 24h
    if (dedupeKey && !args.force) {
      const dupes = await ctx.db
        .query("emailHistory")
        .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
        .take(10);
      const recentSent = dupes.find(
        (d) => d.status === "sent" && d.createdAt > now - 24 * 60 * 60 * 1000,
      );
      if (recentSent) {
        return { success: true, skipped: true, status: "sent" };
      }
    }

    // 3. Load template (DB override or default)
    const storedTemplate = await ctx.db
      .query("emailTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.templateKey))
      .first();
    const template =
      storedTemplate ||
      DEFAULT_TEMPLATES.find((t) => t.key === args.templateKey);
    // Modèle supprimé par l'administrateur (tombstone) = aucun envoi, et le
    // modèle du code n'est PAS utilisé en remplacement.
    const deleted = (storedTemplate as { deletedAt?: number } | null)?.deletedAt != null;
    if (!template || deleted || template.active === false) {
      await recordFailed(
        "Modèle de notification désactivé ou introuvable",
        EMAIL_EVENT_LABELS[args.templateKey],
      );
      return { success: false, status: "failed" };
    }

    // 4. Resolve vars
    const seo = await ctx.db.query("seoConfig").order("desc").first();
    const platformName = vars.nomPlateforme || seo?.siteName || config.senderName || "batibuild";
    const loginLink = vars.lienConnexion || config.loginLink || seo?.canonicalUrl || "https://batibuild.app";

    const resolvedVars: Record<string, string> = {
      nom: vars.nom || "",
      prenom: vars.prenom || "",
      nomEntreprise: vars.nomEntreprise || "",
      typeAbonnement: vars.typeAbonnement || "",
      dateActivation: vars.dateActivation || "",
      dateExpiration: vars.dateExpiration || "",
      montant: vars.montant || "",
      numeroFacture: vars.numeroFacture || "",
      lienConnexion: loginLink,
      nomPlateforme: platformName,
      nomProjet: vars.nomProjet || "",
      typeProjet: vars.typeProjet || "",
      entreprise: vars.entreprise || "",
      detailsDemande: vars.detailsDemande || "",
      montantDevis: vars.montantDevis || "",
      message: vars.message || "",
      creneau: vars.creneau || "",
      motif: vars.motif || "",
      region: vars.region || "",
      expediteur: vars.expediteur || "",
      typeDemande: vars.typeDemande || "",
      statut: vars.statut || "",
      date: vars.date || "",
      heure: vars.heure || "",
      email: vars.email || "",
      profil: vars.profil || "",
    };

    // 4bis. Facture jointe : numéro réel issu de la facture enregistrée.
    // Le document joint est la source de vérité : le numéro affiché dans
    // l'e-mail est toujours celui de la facture PDF jointe.
    let invoiceNumber = vars.numeroFacture || "";
    if (args.invoiceId) {
      const invoice = await ctx.db.get(args.invoiceId);
      if (invoice) {
        invoiceNumber = invoice.invoiceNumber;
        resolvedVars.numeroFacture = invoiceNumber;
      }
    }

    const subject = renderTokens(template.subject, resolvedVars);
    const bodyHtml = buildBrandedHtml(
      renderTokens(template.bodyHtml, resolvedVars) + renderInvoiceAttachmentNotice(invoiceNumber),
      {
        platformName,
        logoUrl: config.logoUrl || undefined,
        primaryColor: config.primaryColor || "#7c3aed",
        accentColor: config.accentColor || "#0ea5e9",
        signature: config.signature || undefined,
      },
    ).replace("{{LINK}}", loginLink);

    // 5. Admin copy
    let adminCc: string[] = [];
    if (args.sendToAdmins && config.notifyAdminCc) {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
      adminCc = admins.map((a) => a.email || "").filter(Boolean);
    }

    // 6. Insert history record (pending) and schedule the Node send action
    const payloadJson = JSON.stringify({
      to: args.to,
      recipientName: args.recipientName,
      templateKey: args.templateKey,
      vars: args.vars,
      dedupeKey: args.dedupeKey,
      sendToAdmins: args.sendToAdmins,
      // Conservé pour que « Renvoyer » réexpédie aussi la facture PDF.
      invoiceId: args.invoiceId,
    });

    const historyId = await ctx.db.insert("emailHistory", {
      to: args.to,
      recipientName: args.recipientName,
      templateKey: args.templateKey,
      subject,
      status: "pending",
      createdAt: now,
      attemptCount: 1,
      dedupeKey,
      payloadJson,
      sentToAdmins: !!args.sendToAdmins,
    });

    await ctx.scheduler.runAfter(0, internal.emailSender.sendEmailAction, {
      historyId,
      to: args.to,
      subject,
      html: bodyHtml,
      senderName: config.senderName || "batibuild",
      senderEmail: config.senderEmail,
      replyTo: config.replyTo || undefined,
      cc: adminCc,
      smtpHost: config.smtpHost || undefined,
      smtpPort: config.smtpPort ?? undefined,
      smtpSecurity: config.smtpSecurity ?? undefined,
      smtpUser: config.smtpUser || undefined,
      smtpPassword: config.smtpPasswordEnc
        ? decryptPassword(config.smtpPasswordEnc)
        : undefined,
      // La facture (si l'événement en porte une) est jointe en PDF.
      invoiceId: args.invoiceId,
    });

    return { success: true, status: "pending", historyId };
  },
});

/** Record the outcome of a send (called by the Node action) */
export const updateEmailStatus = internalMutation({
  args: {
    historyId: v.id("emailHistory"),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.historyId, {
      status: args.ok ? "sent" : "failed",
      error: args.ok ? undefined : args.error,
      sentAt: args.ok ? Date.now() : undefined,
    });
    return { success: true };
  },
});

// ----------------------------------------------------------------------------
// Expiry check (internal, called by daily cron)
// ----------------------------------------------------------------------------

/** Mark expired subscriptions (members + suppliers) and notify by email */
export const checkExpiredSubscriptions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Member subscriptions
    const activeSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let expiredCount = 0;

    for (const sub of activeSubs) {
      if (sub.endDate && sub.endDate < now) {
        expiredCount++;
        await ctx.db.patch(sub._id, {
          status: "expired",
          updatedAt: now,
        });

        // Abonnement échu : le compte n'a plus de forfait (le forfait gratuit
        // permanent a été supprimé — période d'essai ou souscription requise).
        // Miroir du statut utilisé par « Mon abonnement » et l'accès central.
        const user = await ctx.db.get(sub.userId);
        if (user) {
          await ctx.db.patch(user._id, {
            subscriptionPlan: undefined,
            subscriptionEndDate: undefined,
            subscriptionDaysRemaining: 0,
            subscriptionStatus: "expired",
          });
        }

        if (user?.email && user.emailNotifications !== false) {
          await ctx.scheduler.runAfter(
            0,
            internal.emailNotifications.processEmailEvent,
            {
              to: user.email,
              recipientName: user.name || undefined,
              templateKey: "subscription_expired",
              vars: {
                ...splitName(user.name),
                typeAbonnement: planLabel(sub.plan),
                dateExpiration: formatDateFr(sub.endDate),
                dateActivation: formatDateFr(sub.startDate),
              },
              dedupeKey: `subscription_expired:${user.email}:${sub._id}`,
              sendToAdmins: true,
            },
          );
        }
      }
    }

    // Supplier profiles — « Offre gratuite » (switch admin) : pas d'expiration
    const pricingConfig = await ctx.db.query("paymentConfig").order("desc").first();
    const supplierFree =
      pricingConfig?.supplierPrice === null || pricingConfig?.supplierPrice === 0;

    const activeSuppliers = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_subscription", (q) => q.eq("subscriptionStatus", "active"))
      .collect();

    for (const profile of activeSuppliers) {
      if (supplierFree) continue;
      if (profile.subscriptionEndDate && profile.subscriptionEndDate < now) {
        expiredCount++;
        await ctx.db.patch(profile._id, {
          subscriptionStatus: "inactive",
          isVisible: false,
          updatedAt: now,
        });

        const user = await ctx.db.get(profile.userId);
        const to = profile.email || user?.email;
        if (to) {
          await ctx.scheduler.runAfter(
            0,
            internal.emailNotifications.processEmailEvent,
            {
              to,
              recipientName: profile.companyName,
              templateKey: "subscription_expired",
              vars: {
                nomEntreprise: profile.companyName,
                typeAbonnement: "Fournisseur",
                dateExpiration: formatDateFr(profile.subscriptionEndDate),
                dateActivation: formatDateFr(profile.subscriptionStartDate),
              },
              dedupeKey: `supplier_expired:${to}:${profile._id}`,
              sendToAdmins: true,
            },
          );
        }
      }
    }

    // Expert profiles — paiement obligatoire : un profil visible dont
    // l'abonnement expire est masqué automatiquement (miroir des fournisseurs).
    // « Offre gratuite » (switch admin) : pas d'expiration.
    const free = await getFreePlanStatus(ctx);
    if (!free.expertFree) {
      const activeExperts = await ctx.db
        .query("expertProfiles")
        .withIndex("by_subscription", (q) => q.eq("subscriptionStatus", "active"))
        .collect();

      for (const profile of activeExperts) {
        if (
          profile.isVisible &&
          !(await isProfilePaymentActive(ctx, false, profile, now))
        ) {
          expiredCount++;
          await ctx.db.patch(profile._id, {
            subscriptionStatus: "inactive",
            isVisible: false,
            updatedAt: now,
          });

          const user = await ctx.db.get(profile.userId);
          const to = profile.email || user?.email;
          if (to) {
            await ctx.scheduler.runAfter(
              0,
              internal.emailNotifications.processEmailEvent,
              {
                to,
                recipientName: profile.displayName,
                templateKey: "subscription_expired",
                vars: {
                  nomEntreprise: profile.displayName,
                  typeAbonnement: "Expert",
                  dateExpiration: formatDateFr(profile.subscriptionEndDate),
                  dateActivation: formatDateFr(profile.subscriptionStartDate),
                },
                dedupeKey: `expert_expired:${to}:${profile._id}`,
                sendToAdmins: true,
              },
            );
          }
        }
      }
    }

    return { expiredCount };
  },
});
