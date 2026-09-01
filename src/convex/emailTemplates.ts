import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Email Templates — 7 subscription/payment events, HTML with dynamic variables
// Variables disponibles :
//   {{Nom}} {{Prénom}} {{NomEntreprise}} {{TypeAbonnement}}
//   {{DateActivation}} {{DateExpiration}} {{Montant}} {{NuméroFacture}}
//   {{LienConnexion}} {{NomPlateforme}}
// ============================================================================

export const EMAIL_EVENT_TYPES = [
  "subscription_activated",
  "subscription_renewed",
  "subscription_expired",
  "payment_confirmed",
  "payment_rejected",
  "subscription_suspended",
  "subscription_canceled",
] as const;

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

export const EMAIL_EVENT_LABELS: Record<EmailEventType, string> = {
  subscription_activated: "Abonnement activé",
  subscription_renewed: "Abonnement renouvelé",
  subscription_expired: "Abonnement expiré",
  payment_confirmed: "Paiement confirmé",
  payment_rejected: "Paiement refusé",
  subscription_suspended: "Abonnement suspendu",
  subscription_canceled: "Abonnement annulé",
};

export const EMAIL_VARIABLES = [
  { token: "{{Nom}}", label: "Nom du destinataire" },
  { token: "{{Prénom}}", label: "Prénom du destinataire" },
  { token: "{{NomEntreprise}}", label: "Nom de l'entreprise" },
  { token: "{{TypeAbonnement}}", label: "Type d'abonnement (Client Pro/Fournisseur/Expert)" },
  { token: "{{DateActivation}}", label: "Date d'activation" },
  { token: "{{DateExpiration}}", label: "Date d'expiration" },
  { token: "{{Montant}}", label: "Montant payé" },
  { token: "{{NuméroFacture}}", label: "Numéro de facture" },
  { token: "{{LienConnexion}}", label: "Lien de connexion à la plateforme" },
  { token: "{{NomPlateforme}}", label: "Nom de la plateforme" },
] as const;

const P = "{{NomPlateforme}}";

export interface DefaultTemplate {
  key: EmailEventType;
  label: string;
  subject: string;
  bodyHtml: string;
  active?: boolean;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    key: "subscription_activated",
    label: "Abonnement activé",
    subject: "Votre abonnement est maintenant actif",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Nous avons le plaisir de vous informer que votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» a été activé avec succès.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date d'activation :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{DateActivation}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date d'expiration :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{DateExpiration}}</td></tr>
</table>
Vous pouvez dès maintenant profiter de toutes les fonctionnalités de la plateforme.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Accéder à votre espace</a>
<br/><br/>
Merci de votre confiance.
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "subscription_renewed",
    label: "Abonnement renouvelé",
    subject: "Votre abonnement a été renouvelé",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» a été renouvelé avec succès.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Montant :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Montant}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Nouvelle date d'expiration :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{DateExpiration}}</td></tr>
</table>
Votre accès reste actif sans interruption.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Accéder à mon espace</a>
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "subscription_expired",
    label: "Abonnement expiré",
    subject: "Votre abonnement a expiré",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» est arrivé à expiration le {{DateExpiration}}.
<br/><br/>
Pour continuer à bénéficier de toutes les fonctionnalités de la plateforme, renouvelez votre abonnement dès maintenant.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Renouveler mon abonnement</a>
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "payment_confirmed",
    label: "Paiement confirmé",
    subject: "Votre paiement a été confirmé",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre paiement a été confirmé avec succès.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Abonnement :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeAbonnement}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Montant :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Montant}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Numéro de facture :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{NuméroFacture}}</td></tr>
</table>
Votre abonnement est désormais actif.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Accéder à mon espace</a>
<br/><br/>
Merci pour votre confiance.
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "payment_rejected",
    label: "Paiement refusé",
    subject: "Votre paiement n'a pas pu être confirmé",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Nous n'avons malheureusement pas pu confirmer votre paiement pour l'abonnement «&nbsp;{{TypeAbonnement}}&nbsp;».
<br/><br/>
Cela peut être dû à un reçu manquant, illisible ou non conforme. Veuillez vérifier votre reçu de paiement et réessayer, ou contactez notre support pour plus d'informations.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Réessayer le paiement</a>
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "subscription_suspended",
    label: "Abonnement suspendu",
    subject: "Votre abonnement a été suspendu",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» a été temporairement suspendu.
<br/><br/>
Vos fonctionnalités sont momentanément restreintes. Contactez notre support pour comprendre les raisons de cette suspension et retrouver l'accès complet à la plateforme.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Contacter le support</a>
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "subscription_canceled",
    label: "Abonnement annulé",
    subject: "Votre abonnement a été annulé",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» a été annulé.
<br/><br/>
Vous pouvez à tout moment souscrire à nouveau à l'un de nos forfaits pour retrouver l'accès à toutes les fonctionnalités de la plateforme.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Voir les forfaits</a>
<br/><br/>
L'équipe {{P}}`,
  },
];

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------

/** Get all templates with DB overrides merged over defaults (admin only) */
export const getEmailTemplates = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") return [];

    const stored = await ctx.db.query("emailTemplates").collect();
    const storedMap = new Map(stored.map((t) => [t.key, t]));

    return DEFAULT_TEMPLATES.map((def) => {
      const s = storedMap.get(def.key);
      return {
        key: def.key,
        label: s?.label ?? def.label,
        subject: s?.subject ?? def.subject,
        bodyHtml: s?.bodyHtml ?? def.bodyHtml,
        active: s?.active ?? true,
        updatedAt: s?.updatedAt ?? undefined,
      };
    });
  },
});

// ----------------------------------------------------------------------------
// Mutations
// ----------------------------------------------------------------------------

/** Save a template's subject/body (admin only) */
export const adminSaveEmailTemplate = mutation({
  args: {
    key: v.union(
      v.literal("subscription_activated"),
      v.literal("subscription_renewed"),
      v.literal("subscription_expired"),
      v.literal("payment_confirmed"),
      v.literal("payment_rejected"),
      v.literal("subscription_suspended"),
      v.literal("subscription_canceled"),
    ),
    subject: v.string(),
    bodyHtml: v.string(),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db
      .query("emailTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const label = EMAIL_EVENT_LABELS[args.key];

    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        bodyHtml: args.bodyHtml,
        active: args.active ?? true,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("emailTemplates", {
        key: args.key,
        label,
        subject: args.subject,
        bodyHtml: args.bodyHtml,
        active: args.active ?? true,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      } as any);
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "email_template_save",
        details: `Modèle e-mail mis à jour — ${label}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});
