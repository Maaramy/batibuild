// ============================================================================
// MODULE ADMINISTRATION — OFFRES & CAMPAGNES MARKETING
// ----------------------------------------------------------------------------
// · Campagnes : brouillon → programmée / en cours → envoyée / annulée.
// · Aucune deuxième authentification : `getCurrentUser` + rôle admin.
// · Envoi : le circuit existant (`emailHistory` + `emailSender.sendEmailAction`)
//   est réutilisé — SMTP configuré par l'administrateur, secrets jamais côté
//   client. Les envois sont découpés en lots espacés (limitation de débit).
// · Suivi : pixel d'ouverture, redirection de clic, désinscription et page
//   d'avis via le routeur HTTP Convex (identifiants opaques, idempotents).
// · Consentement : `users.marketingOptOut` exclut définitivement des envois.
// ============================================================================

import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { decryptPassword } from "./emailConfig";
import { buildMarketingEmail, safeMarketingUrl } from "../lib/marketingEmail";
import { SEGMENT_IDS, type MarketingSegmentId } from "../lib/marketingAudience";

type SegmentId = MarketingSegmentId;

const categoryValidator = v.union(
  v.literal("client_pro"),
  v.literal("expert"),
  v.literal("supplier"),
);

const BATCH_SIZE = 20;
const BATCH_INTERVAL_MS = 1200;
const MAX_RECIPIENTS = 2000;
const STAFF_ROLES = ["admin", "moderator", "support_agent"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Accès administrateur requis.");
  }
  return user;
}

function isValidEmail(email: string | undefined): email is string {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function siteInfo(ctx: QueryCtx | MutationCtx) {
  const seo = await ctx.db.query("seoConfig").order("desc").first();
  const config = await ctx.db.query("emailConfig").order("desc").first();
  const siteUrl = (seo?.canonicalUrl || process.env.SITE_URL || "https://batibuild.app").replace(/\/$/, "");
  // Les routes HTTP (pixel, clic, désinscription) vivent sur le domaine Convex.
  const trackingBase = (process.env.CONVEX_SITE_URL || siteUrl).replace(/\/$/, "");
  return {
    siteUrl,
    trackingBase,
    siteName: seo?.siteName || config?.senderName || "batibuild",
    logoUrl: config?.logoUrl || undefined,
  };
}

function splitFullName(name: string | undefined): { prenom: string; nom: string } {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { prenom: "", nom: "" };
  // « Amine Ben Salah » → prénom « Amine », nom « Ben Salah ».
  return { prenom: parts[0], nom: parts.slice(1).join(" ") };
}

function profileTypeLabel(category: "client_pro" | "expert" | "supplier"): string {
  return category === "client_pro" ? "Client Pro" : category === "expert" ? "Expert" : "Fournisseur";
}

/**
 * Un Client Pro est « actif » s'il lui reste des crédits de projets, ou s'il
 * bénéficie d'un accès en cours (essai / abonnement). Sinon il est inactif.
 */
function clientProIsActive(user: Doc<"users">, now: number): boolean {
  const free =
    Math.max(0, (user.clientProFreeProjectsGranted ?? 0) - (user.clientProFreeProjectsUsed ?? 0)) +
    Math.max(0, (user.clientProPaidProjectsGranted ?? 0) - (user.clientProPaidProjectsUsed ?? 0));
  if (free > 0) return true;
  if (user.subscriptionStatus === "active" && (!user.subscriptionEndDate || user.subscriptionEndDate > now)) {
    return true;
  }
  return user.subscriptionStatus === "trialing" && (!user.trialEndDate || user.trialEndDate > now);
}

type AudienceOptions = {
  segments: string[];
  userIds?: Id<"users">[];
};

/**
 * Résout l'audience : segments + sélection individuelle, puis applique les
 * règles de consentement. Un utilisateur n'apparaît JAMAIS deux fois.
 */
async function resolveAudience(
  ctx: QueryCtx | MutationCtx,
  options: AudienceOptions,
): Promise<{ users: Doc<"users">[]; bySegment: Record<string, number> }> {
  const now = Date.now();
  const segments = new Set(options.segments as SegmentId[]);
  const selected = new Set((options.userIds ?? []).map(String));
  const users = await ctx.db.query("users").take(5000);

  const needsProfiles =
    segments.has("expert_all") ||
    segments.has("expert_active") ||
    segments.has("expert_inactive") ||
    segments.has("supplier_all") ||
    segments.has("supplier_active") ||
    segments.has("supplier_inactive");

  const expertProfiles = needsProfiles
    ? await ctx.db.query("expertProfiles").take(5000)
    : [];
  const supplierProfiles = needsProfiles
    ? await ctx.db.query("supplierProfiles").take(5000)
    : [];

  const expertByUser = new Map(
    expertProfiles.map((p) => [String(p.userId), p] as const),
  );
  const supplierByUser = new Map(
    supplierProfiles.map((p) => [String(p.userId), p] as const),
  );

  const isActiveProfile = (p: { subscriptionStatus: string; subscriptionEndDate?: number } | undefined) =>
    !!p &&
    (p.subscriptionStatus === "active" || p.subscriptionStatus === "trial") &&
    (!p.subscriptionEndDate || p.subscriptionEndDate > now);

  const eligible = users.filter((u) => {
    if (!isValidEmail(u.email)) return false;
    if (u.status === "disabled") return false;
    if (u.marketingOptOut === true) return false;
    if (u.role && STAFF_ROLES.includes(u.role)) return false;
    return true;
  });

  const isClient = (u: Doc<"users">) =>
    (!u.userRole || u.userRole === "client") &&
    !expertByUser.has(String(u._id)) &&
    !supplierByUser.has(String(u._id));

  const matches = (u: Doc<"users">): boolean => {
    if (selected.has(String(u._id))) return true;
    const expertProfile = expertByUser.get(String(u._id));
    const supplierProfile = supplierByUser.get(String(u._id));
    const isExpert = u.userRole === "expert" || !!expertProfile;
    const isSupplier = u.userRole === "supplier" || !!supplierProfile;

    for (const segment of segments) {
      switch (segment) {
        case "client_pro_all":
          if (isClient(u)) return true;
          break;
        case "client_pro_active":
          if (isClient(u) && clientProIsActive(u, now)) return true;
          break;
        case "client_pro_inactive":
          if (isClient(u) && !clientProIsActive(u, now)) return true;
          break;
        case "expert_all":
          if (isExpert) return true;
          break;
        case "expert_active":
          if (isExpert && isActiveProfile(expertProfile)) return true;
          break;
        case "expert_inactive":
          if (isExpert && !isActiveProfile(expertProfile)) return true;
          break;
        case "supplier_all":
          if (isSupplier) return true;
          break;
        case "supplier_active":
          if (isSupplier && isActiveProfile(supplierProfile)) return true;
          break;
        case "supplier_inactive":
          if (isSupplier && !isActiveProfile(supplierProfile)) return true;
          break;
        default:
          break;
      }
    }
    return false;
  };

  const bySegment: Record<string, number> = {};
  for (const segment of SEGMENT_IDS) {
    bySegment[segment] = eligible.filter((u) => matches(u)).length;
  }

  return { users: eligible.filter(matches), bySegment };
}

function buildVarsForUser(
  user: Doc<"users">,
  category: "client_pro" | "expert" | "supplier",
  info: { siteUrl: string },
) {
  const { prenom, nom } = splitFullName(user.name);
  return {
    prenom,
    nom,
    email: user.email || "",
    nom_entreprise: user.company || "",
    type_abonnement: profileTypeLabel(category),
    lien_parrainage: `${info.siteUrl}/dashboard`,
    lien_espace_personnel: `${info.siteUrl}/dashboard`,
    date_expiration: user.subscriptionEndDate
      ? new Date(user.subscriptionEndDate).toLocaleDateString("fr-FR")
      : "",
  };
}

type MailerSettings = {
  senderName: string;
  senderEmail: string;
  replyTo?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: "ssl" | "tls" | "none";
  smtpUser?: string;
  smtpPassword?: string;
};

/**
 * Réglages d'envoi effectifs — MÊME priorité que le moteur d'e-mails existant :
 *   1. variables d'environnement Convex SMTP_* (configuration de la plateforme) ;
 *   2. à défaut, configuration enregistrée dans « Configuration E-mail » ;
 *   3. à défaut encore, envoi via l'intégration e-mail de la plateforme (VLY)
 *      si un expéditeur est connu.
 * Le mot de passe n'est jamais renvoyé au client : il ne sert qu'à l'action
 * d'envoi planifiée.
 */
async function resolveMarketingMailer(
  ctx: QueryCtx | MutationCtx,
): Promise<{ settings?: MailerSettings; error?: string }> {
  const config = await ctx.db.query("emailConfig").order("desc").first();
  const envHost = (process.env.SMTP_HOST || "").trim();
  const dbSender = (config?.senderEmail || "").trim();

  if (envHost) {
    const senderEmail = ((process.env.SMTP_FROM || "") || dbSender).trim();
    if (!senderEmail) {
      return {
        error:
          "Aucune adresse d'expéditeur : définissez SMTP_FROM dans les variables du serveur, ou l'adresse d'envoi dans Configuration E-mail.",
      };
    }
    const rawSecurity = (process.env.SMTP_SECURE || "").toLowerCase();
    const security: "ssl" | "tls" | "none" =
      rawSecurity === "ssl" || rawSecurity === "true" || rawSecurity === "465"
        ? "ssl"
        : rawSecurity === "none" || rawSecurity === "false" || rawSecurity === "25"
          ? "none"
          : "tls";
    const parsedPort = Number((process.env.SMTP_PORT || "").trim());
    const port =
      Number.isInteger(parsedPort) && parsedPort > 0
        ? parsedPort
        : security === "ssl"
          ? 465
          : 587;

    return {
      settings: {
        senderName: (process.env.SMTP_FROM_NAME || config?.senderName || "batibuild").trim(),
        senderEmail,
        replyTo: config?.replyTo || undefined,
        smtpHost: envHost,
        smtpPort: port,
        smtpSecurity: security,
        smtpUser: (process.env.SMTP_USER || "").trim() || undefined,
        smtpPassword: process.env.SMTP_PASSWORD || undefined,
      },
    };
  }

  if (!config?.senderEmail) {
    return {
      error:
        "Aucune configuration e-mail : renseignez l'expéditeur dans Configuration E-mail (ou les variables SMTP_HOST / SMTP_FROM).",
    };
  }

  return {
    settings: {
      senderName: config.senderName || "batibuild",
      senderEmail: config.senderEmail,
      replyTo: config.replyTo || undefined,
      smtpHost: config.smtpHost || undefined,
      smtpPort: config.smtpPort ?? undefined,
      smtpSecurity: config.smtpSecurity ?? undefined,
      smtpUser: config.smtpUser || undefined,
      smtpPassword: config.smtpPasswordEnc ? decryptPassword(config.smtpPasswordEnc) : undefined,
    },
  };
}

type CampaignDoc = Doc<"marketingCampaigns">;

function publicCampaign(campaign: CampaignDoc) {
  const rate = (value: number, base: number) =>
    base > 0 ? Math.round((value / base) * 1000) / 10 : 0;
  return {
    ...campaign,
    openRate: rate(campaign.stats.opened, campaign.stats.delivered),
    clickRate: rate(campaign.stats.clicked, campaign.stats.delivered),
    conversionRate: rate(campaign.stats.conversions, campaign.stats.delivered),
  };
}

function emptyStats() {
  return {
    recipients: 0,
    delivered: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    feedbacks: 0,
    conversions: 0,
  };
}

/** Enregistre un e-mail marketing dans l'historique et planifie l'envoi SMTP. */
async function enqueueEmail(
  ctx: MutationCtx,
  args: {
    campaign: CampaignDoc;
    to: string;
    recipientName?: string;
    subject: string;
    html: string;
    text: string;
    feedbackUrl?: string;
    unsubscribeUrl?: string;
    trackingPixelUrl?: string;
    recipientId?: Id<"marketingRecipients">;
    isTest?: boolean;
  },
): Promise<{ ok: boolean; error?: string }> {
  const mailer = await resolveMarketingMailer(ctx);
  if (!mailer.settings) {
    return { ok: false, error: mailer.error || "Configuration e-mail manquante." };
  }
  const settings = mailer.settings;

  const historyId = await ctx.db.insert("emailHistory", {
    to: args.to,
    recipientName: args.recipientName,
    templateKey: `marketing:${args.campaign.templateId || "custom"}`,
    subject: args.subject,
    status: "pending",
    createdAt: Date.now(),
    attemptCount: 1,
    dedupeKey: args.isTest
      ? `marketing-test:${args.campaign._id}:${Date.now()}`
      : `marketing:${args.campaign._id}:${args.recipientId}`,
    payloadJson: JSON.stringify({
      campaignId: args.campaign._id,
      recipientId: args.recipientId,
      feedbackUrl: args.feedbackUrl,
      isTest: !!args.isTest,
    }),
  });

  await ctx.scheduler.runAfter(0, internal.emailSender.sendEmailAction, {
    historyId,
    to: args.to,
    subject: args.subject,
    html: args.html,
    senderName: settings.senderName,
    senderEmail: settings.senderEmail,
    replyTo: settings.replyTo,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecurity: settings.smtpSecurity,
    smtpUser: settings.smtpUser,
    smtpPassword: settings.smtpPassword,
    marketingRecipientId: args.recipientId,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Lecture — administration
// ---------------------------------------------------------------------------

export const listCampaigns = query({
  args: {
    category: v.optional(categoryValidator),
    status: v.optional(v.string()),
    periodDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];

    const since = args.periodDays ? Date.now() - args.periodDays * 86_400_000 : 0;
    let campaigns: CampaignDoc[];
    if (args.category) {
      campaigns = await ctx.db
        .query("marketingCampaigns")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .take(200);
    } else {
      campaigns = await ctx.db
        .query("marketingCampaigns")
        .withIndex("by_created")
        .order("desc")
        .take(200);
    }

    return campaigns
      .filter((c) => c.createdAt >= since)
      .filter((c) => !args.status || c.status === args.status)
      .map(publicCampaign);
  },
});

export const getDashboardStats = query({
  args: {
    periodDays: v.optional(v.number()),
    category: v.optional(categoryValidator),
    campaignId: v.optional(v.id("marketingCampaigns")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;

    const since = args.periodDays ? Date.now() - args.periodDays * 86_400_000 : 0;
    const campaigns = (await ctx.db.query("marketingCampaigns").order("desc").take(300)).filter(
      (c) =>
        c.createdAt >= since &&
        (!args.category || c.category === args.category) &&
        (!args.campaignId || c._id === args.campaignId),
    );

    const totals = campaigns.reduce(
      (acc, c) => {
        acc.recipients += c.stats.recipients;
        acc.delivered += c.stats.delivered;
        acc.failed += c.stats.failed;
        acc.opened += c.stats.opened;
        acc.clicked += c.stats.clicked;
        acc.feedbacks += c.stats.feedbacks;
        acc.conversions += c.stats.conversions;
        if (c.status === "sent") acc.sentCampaigns += 1;
        return acc;
      },
      {
        recipients: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
        feedbacks: 0,
        conversions: 0,
        sentCampaigns: 0,
      },
    );

    const rate = (value: number, base: number) =>
      base > 0 ? Math.round((value / base) * 1000) / 10 : 0;

    const feedbacks = await ctx.db.query("marketingFeedback").order("desc").take(300);
    const filteredFeedbacks = feedbacks.filter(
      (f) =>
        f.createdAt >= since &&
        (!args.campaignId || f.campaignId === args.campaignId) &&
        (!args.category ||
          campaigns.some((c) => c._id === f.campaignId)),
    );
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: filteredFeedbacks.filter((f) => f.rating === rating).length,
    }));

    return {
      totals: {
        ...totals,
        openRate: rate(totals.opened, totals.delivered),
        clickRate: rate(totals.clicked, totals.delivered),
        conversionRate: rate(totals.conversions, totals.delivered),
        averageRating:
          filteredFeedbacks.length > 0
            ? Math.round(
                (filteredFeedbacks.reduce((s, f) => s + f.rating, 0) / filteredFeedbacks.length) * 10,
              ) / 10
            : null,
      },
      series: campaigns
        .slice(0, 12)
        .reverse()
        .map((c) => ({
          id: c._id,
          name: c.name,
          date: c.sentAt ?? c.createdAt,
          sent: c.stats.delivered,
          opened: c.stats.opened,
          clicked: c.stats.clicked,
        })),
      distribution,
      recentFeedbacks: filteredFeedbacks.slice(0, 8).map((f) => ({
        _id: f._id,
        campaignId: f.campaignId,
        campaignName: campaigns.find((c) => c._id === f.campaignId)?.name ?? "Campagne",
        rating: f.rating,
        comment: f.comment,
        userRole: f.userRole,
        createdAt: f.createdAt,
      })),
    };
  },
});

export const getCampaign = query({
  args: { campaignId: v.id("marketingCampaigns") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return null;

    const recipients = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .take(200);

    const feedbacks = await ctx.db
      .query("marketingFeedback")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .take(200);

    return {
      campaign: publicCampaign(campaign),
      recipients: recipients.map((r) => ({
        _id: r._id,
        email: r.email,
        name: r.name,
        status: r.status,
        error: r.error,
        sentAt: r.sentAt,
        openedAt: r.openedAt,
        clickedAt: r.clickedAt,
        feedbackAt: r.feedbackAt,
      })),
      feedbacks: feedbacks.map((f) => ({
        _id: f._id,
        rating: f.rating,
        comment: f.comment,
        createdAt: f.createdAt,
        userRole: f.userRole,
      })),
    };
  },
});

export const previewAudience = query({
  args: {
    segments: v.array(v.string()),
    userIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;

    const { users, bySegment } = await resolveAudience(ctx, {
      segments: args.segments,
      userIds: args.userIds,
    });

    return {
      total: users.length,
      bySegment,
      sample: users.slice(0, 100).map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        userRole: u.userRole ?? "client",
      })),
    };
  },
});

export const searchRecipients = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];

    const term = args.search.trim().toLowerCase();
    if (term.length < 2) return [];

    const users = await ctx.db.query("users").take(5000);
    return users
      .filter(
        (u) =>
          isValidEmail(u.email) &&
          u.marketingOptOut !== true &&
          u.status !== "disabled" &&
          !(u.role && STAFF_ROLES.includes(u.role)),
      )
      .filter(
        (u) =>
          (u.email || "").toLowerCase().includes(term) ||
          (u.name || "").toLowerCase().includes(term),
      )
      .slice(0, 20)
      .map((u) => ({ _id: u._id, name: u.name, email: u.email, userRole: u.userRole ?? "client" }));
  },
});

export const listFeedback = query({
  args: { campaignId: v.optional(v.id("marketingCampaigns")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];

    const feedbacks = args.campaignId
      ? await ctx.db
          .query("marketingFeedback")
          .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
          .order("desc")
          .take(300)
      : await ctx.db.query("marketingFeedback").order("desc").take(300);

    const out = [];
    for (const f of feedbacks) {
      const campaign = await ctx.db.get(f.campaignId);
      const recipient = await ctx.db.get(f.recipientId);
      out.push({
        _id: f._id,
        rating: f.rating,
        comment: f.comment,
        createdAt: f.createdAt,
        userRole: f.userRole,
        campaignName: campaign?.name ?? "Campagne supprimée",
        email: recipient?.email,
        name: recipient?.name,
      });
    }
    return out;
  },
});

// ---------------------------------------------------------------------------
// Page publique d'avis
// ---------------------------------------------------------------------------

export const getFeedbackContext = query({
  args: { campaignId: v.id("marketingCampaigns"), token: v.string() },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return null;

    const info = await siteInfo(ctx);

    if (args.token === "demo") {
      return {
        demo: true,
        alreadySubmitted: false,
        campaignName: campaign.name,
        category: campaign.category,
        siteName: info.siteName,
        logoUrl: info.logoUrl,
        existingRating: null as number | null,
        userName: "",
      };
    }

    const recipient = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!recipient || recipient.campaignId !== args.campaignId) return null;

    const existing = await ctx.db
      .query("marketingFeedback")
      .withIndex("by_campaign_user", (q) =>
        q.eq("campaignId", args.campaignId).eq("userId", recipient.userId),
      )
      .first();

    return {
      demo: false,
      alreadySubmitted: !!existing,
      campaignName: campaign.name,
      category: campaign.category,
      siteName: info.siteName,
      logoUrl: info.logoUrl,
      existingRating: existing?.rating ?? null,
      userName: recipient.name || "",
    };
  },
});

/** Évaluation publique — un seul avis par utilisateur et par campagne. */
export const submitFeedback = mutation({
  args: {
    campaignId: v.id("marketingCampaigns"),
    token: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new Error("La note doit être comprise entre 1 et 5 étoiles.");
    }
    const comment = (args.comment || "").trim().slice(0, 2000);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");

    const recipient = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!recipient || recipient.campaignId !== args.campaignId) {
      throw new Error("Lien d'évaluation invalide ou expiré.");
    }

    const existing = await ctx.db
      .query("marketingFeedback")
      .withIndex("by_campaign_user", (q) =>
        q.eq("campaignId", args.campaignId).eq("userId", recipient.userId),
      )
      .first();
    if (existing) throw new Error("Vous avez déjà évalué cette campagne. Merci !");

    const now = Date.now();
    await ctx.db.insert("marketingFeedback", {
      campaignId: args.campaignId,
      recipientId: recipient._id,
      userId: recipient.userId,
      userRole: recipient.userId ? (await ctx.db.get(recipient.userId))?.userRole : undefined,
      rating: args.rating,
      comment: comment || undefined,
      createdAt: now,
    });

    if (!recipient.feedbackAt) {
      await ctx.db.patch(recipient._id, {
        feedbackAt: now,
        convertedAt: recipient.convertedAt ?? now,
      });
    }
    await ctx.db.patch(campaign._id, {
      stats: {
        ...campaign.stats,
        feedbacks: campaign.stats.feedbacks + (recipient.feedbackAt ? 0 : 1),
        conversions: campaign.stats.conversions + (recipient.convertedAt ? 0 : 1),
      },
    });

    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Écriture — campagnes (admin)
// ---------------------------------------------------------------------------

const campaignFields = {
  name: v.string(),
  category: categoryValidator,
  templateId: v.optional(v.string()),
  subject: v.string(),
  intro: v.string(),
  body: v.string(),
  bannerUrl: v.optional(v.string()),
  ctaLabel: v.optional(v.string()),
  ctaUrl: v.optional(v.string()),
  conditions: v.optional(v.string()),
  validUntil: v.optional(v.string()),
  signature: v.optional(v.string()),
  feedbackEnabled: v.boolean(),
  audienceSegments: v.array(v.string()),
  audienceUserIds: v.optional(v.array(v.id("users"))),
};

export const saveCampaign = mutation({
  args: {
    campaignId: v.optional(v.id("marketingCampaigns")),
    ...campaignFields,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    if (!args.name.trim()) throw new Error("Le nom de la campagne est obligatoire.");
    if (args.name.length > 160) throw new Error("Le nom de la campagne est trop long (160 caractères max).");
    if (args.subject.length > 200) throw new Error("L'objet de l'e-mail est trop long (200 caractères max).");
    if (args.audienceSegments.length === 0 && (args.audienceUserIds ?? []).length === 0) {
      throw new Error("Sélectionnez au moins un segment ou un utilisateur.");
    }

    const payload = {
      name: args.name.trim(),
      category: args.category,
      templateId: args.templateId,
      subject: args.subject,
      intro: args.intro,
      body: args.body,
      bannerUrl: args.bannerUrl?.trim() || undefined,
      ctaLabel: args.ctaLabel?.trim() || undefined,
      ctaUrl: args.ctaUrl?.trim() || undefined,
      conditions: args.conditions?.trim() || undefined,
      validUntil: args.validUntil?.trim() || undefined,
      signature: args.signature?.trim() || undefined,
      feedbackEnabled: args.feedbackEnabled,
      audienceSegments: args.audienceSegments,
      audienceUserIds: args.audienceUserIds,
      updatedAt: now,
    };

    if (args.campaignId) {
      const existing = await ctx.db.get(args.campaignId);
      if (!existing) throw new Error("Campagne introuvable.");
      if (existing.status === "sending") {
        throw new Error("Impossible de modifier une campagne en cours d'envoi.");
      }
      await ctx.db.patch(args.campaignId, payload);
      return { campaignId: args.campaignId };
    }

    const campaignId = await ctx.db.insert("marketingCampaigns", {
      ...payload,
      status: "draft",
      createdBy: admin._id,
      createdAt: now,
      stats: emptyStats(),
    });
    return { campaignId };
  },
});

export const deleteCampaign = mutation({
  args: { campaignId: v.id("marketingCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");
    if (campaign.status === "sending") {
      throw new Error("Annulez l'envoi avant de supprimer la campagne.");
    }
    if (campaign.status === "sent") {
      throw new Error("Une campagne envoyée est conservée dans l'historique.");
    }

    const recipients = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .take(2500);
    for (const r of recipients) await ctx.db.delete(r._id);

    const feedbacks = await ctx.db
      .query("marketingFeedback")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .take(500);
    for (const f of feedbacks) await ctx.db.delete(f._id);

    await ctx.db.delete(args.campaignId);
    return { ok: true };
  },
});

/**
 * Prépare et lance l'envoi immédiat : destinataires figés, doublons supprimés,
 * désinscrits exclus. L'envoi réel est découpé en lots espacés (débit maîtrisé).
 */
export const startCampaign = mutation({
  args: { campaignId: v.id("marketingCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");
    if (campaign.status === "sending") throw new Error("Cette campagne est déjà en cours d'envoi.");
    if (campaign.status === "sent") throw new Error("Cette campagne a déjà été envoyée.");
    if (!campaign.subject.trim() || !(campaign.intro.trim() || campaign.body.trim())) {
      throw new Error("Renseignez l'objet et le contenu de l'e-mail avant l'envoi.");
    }

    const mailer = await resolveMarketingMailer(ctx);
    if (!mailer.settings) {
      throw new Error(mailer.error || "Configuration e-mail manquante.");
    }

    // Repartir d'une base propre (ex. campagne annulée puis relancée).
    const previous = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .take(2500);
    for (const r of previous) await ctx.db.delete(r._id);

    const { users } = await resolveAudience(ctx, {
      segments: campaign.audienceSegments,
      userIds: campaign.audienceUserIds,
    });
    if (users.length === 0) throw new Error("Aucun destinataire éligible pour cette campagne.");
    if (users.length > MAX_RECIPIENTS) {
      throw new Error(
        `Trop de destinataires pour un envoi unique (${users.length}). Limitez l'audience à ${MAX_RECIPIENTS} personnes.`,
      );
    }

    const now = Date.now();
    for (const user of users) {
      await ctx.db.insert("marketingRecipients", {
        campaignId: args.campaignId,
        userId: user._id,
        email: user.email!.trim(),
        name: user.name,
        token: randomToken(),
        status: "pending",
      });
    }

    await ctx.db.patch(args.campaignId, {
      status: "sending",
      sentAt: undefined,
      scheduledAt: undefined,
      updatedAt: now,
      stats: { ...emptyStats(), recipients: users.length },
    });

    await ctx.scheduler.runAfter(0, internal.marketing.deliverBatch, {
      campaignId: args.campaignId,
    });

    return { ok: true, recipients: users.length };
  },
});

export const scheduleCampaign = mutation({
  args: { campaignId: v.id("marketingCampaigns"), scheduledAt: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");
    if (campaign.status === "sending" || campaign.status === "sent") {
      throw new Error("Cette campagne ne peut plus être programmée.");
    }
    if (args.scheduledAt < Date.now() + 60_000) {
      throw new Error("Choisissez une date d'envoi au moins une minute dans le futur.");
    }
    if (!campaign.subject.trim()) throw new Error("Renseignez l'objet de l'e-mail.");

    await ctx.db.patch(args.campaignId, {
      status: "scheduled",
      scheduledAt: args.scheduledAt,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAt(args.scheduledAt, internal.marketing.startScheduledCampaign, {
      campaignId: args.campaignId,
    });
    return { ok: true };
  },
});

export const cancelCampaign = mutation({
  args: { campaignId: v.id("marketingCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");
    if (campaign.status === "sent") throw new Error("Une campagne déjà envoyée ne peut pas être annulée.");

    await ctx.db.patch(args.campaignId, { status: "cancelled", updatedAt: Date.now() });
    return { ok: true };
  },
});

export const sendTestEmail = mutation({
  args: { campaignId: v.id("marketingCampaigns"), to: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");

    const to = (args.to || admin.email || "").trim();
    if (!isValidEmail(to)) throw new Error("Adresse e-mail de test invalide.");

    const info = await siteInfo(ctx);
    const vars = buildVarsForUser(admin, campaign.category, info);
    const feedbackUrl = campaign.feedbackEnabled
      ? `${info.siteUrl}/avis?c=${campaign._id}&t=demo`
      : undefined;
    const email = buildMarketingEmail(
      {
        subject: campaign.subject,
        intro: campaign.intro,
        body: campaign.body,
        bannerUrl: campaign.bannerUrl,
        ctaLabel: campaign.ctaLabel,
        ctaUrl: campaign.ctaUrl,
        conditions: campaign.conditions,
        validUntil: campaign.validUntil,
        signature: campaign.signature,
        feedbackEnabled: campaign.feedbackEnabled,
        feedbackUrl,
        siteUrl: info.siteUrl,
        siteName: info.siteName,
        logoUrl: info.logoUrl,
      },
      vars,
    );

    const res = await enqueueEmail(ctx, {
      campaign,
      to,
      recipientName: admin.name,
      subject: `[TEST] ${email.subject}`,
      html: email.html.replace("Comment évaluez-vous votre expérience ?", "Aperçu — Comment évaluez-vous votre expérience ?"),
      text: email.text,
      isTest: true,
    });
    if (!res.ok) throw new Error(res.error || "Envoi de test impossible.");
    return { ok: true, to };
  },
});

// ---------------------------------------------------------------------------
// Envoi (interne)
// ---------------------------------------------------------------------------

export const startScheduledCampaign = internalMutation({
  args: { campaignId: v.id("marketingCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    // Annulée entre-temps : ne rien envoyer.
    if (!campaign || campaign.status !== "scheduled") return { skipped: true };

    const { users } = await resolveAudience(ctx, {
      segments: campaign.audienceSegments,
      userIds: campaign.audienceUserIds,
    });
    if (users.length === 0) {
      await ctx.db.patch(campaign._id, { status: "failed", updatedAt: Date.now() });
      return { skipped: true };
    }

    const existing = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .take(2500);
    for (const r of existing) await ctx.db.delete(r._id);

    for (const user of users.slice(0, MAX_RECIPIENTS)) {
      await ctx.db.insert("marketingRecipients", {
        campaignId: campaign._id,
        userId: user._id,
        email: user.email!.trim(),
        name: user.name,
        token: randomToken(),
        status: "pending",
      });
    }

    await ctx.db.patch(campaign._id, {
      status: "sending",
      updatedAt: Date.now(),
      stats: { ...emptyStats(), recipients: Math.min(users.length, MAX_RECIPIENTS) },
    });
    await ctx.scheduler.runAfter(0, internal.marketing.deliverBatch, {
      campaignId: campaign._id,
    });
    return { ok: true };
  },
});

/** Lot suivant : 20 destinataires, puis re-planification espacée. */
export const deliverBatch = internalMutation({
  args: { campaignId: v.id("marketingCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.status !== "sending") return { stopped: true };

    const batch = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_campaign_status", (q) =>
        q.eq("campaignId", args.campaignId).eq("status", "pending"),
      )
      .take(BATCH_SIZE);

    if (batch.length === 0) {
      await ctx.db.patch(campaign._id, {
        status: "sent",
        sentAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { done: true };
    }

    const info = await siteInfo(ctx);
    const mailer = await resolveMarketingMailer(ctx);
    if (!mailer.settings) {
      const reason = mailer.error || "Configuration e-mail manquante.";
      for (const r of batch) {
        await ctx.db.patch(r._id, { status: "failed", error: reason });
      }
      await ctx.db.patch(campaign._id, { status: "failed", updatedAt: Date.now() });
      return { stopped: true };
    }

    let delivered = campaign.stats.delivered;
    let failed = campaign.stats.failed;

    for (const recipient of batch) {
      const user = await ctx.db.get(recipient.userId);
      if (!user || user.marketingOptOut === true || !isValidEmail(user.email)) {
        // Consentement retiré après le lancement : exclusion, pas d'envoi.
        await ctx.db.patch(recipient._id, {
          status: "failed",
          error: "Désinscrit ou adresse invalide.",
        });
        failed += 1;
        continue;
      }

      const feedbackBase = campaign.feedbackEnabled
        ? `${info.siteUrl}/avis?c=${campaign._id}&t=${recipient.token}`
        : undefined;
      const feedbackUrl =
        campaign.feedbackEnabled && feedbackBase ? feedbackBase : undefined;

      // Le bouton passe par la redirection de clic : le compteur est attribué
      // au destinataire, puis l'utilisateur arrive sur la destination réelle.
      const ctaTarget = campaign.ctaUrl
        ? safeMarketingUrl(campaign.ctaUrl, info.siteUrl)
        : undefined;
      const trackedCta = ctaTarget
        ? `${info.trackingBase}/t/c?token=${recipient.token}&u=${encodeURIComponent(ctaTarget)}`
        : undefined;

      const email = buildMarketingEmail(
        {
          subject: campaign.subject,
          intro: campaign.intro,
          body: campaign.body,
          bannerUrl: campaign.bannerUrl,
          ctaLabel: campaign.ctaLabel,
          ctaUrl: trackedCta,
          conditions: campaign.conditions,
          validUntil: campaign.validUntil,
          signature: campaign.signature,
          feedbackEnabled: campaign.feedbackEnabled,
          feedbackUrl,
          unsubscribeUrl: `${info.trackingBase}/t/u?token=${recipient.token}`,
          trackingPixelUrl: `${info.trackingBase}/t/o?token=${recipient.token}`,
          siteUrl: info.siteUrl,
          siteName: info.siteName,
          logoUrl: info.logoUrl,
        },
        buildVarsForUser(user, campaign.category, info),
      );

      const res = await enqueueEmail(ctx, {
        campaign,
        to: recipient.email,
        recipientName: recipient.name,
        subject: email.subject,
        html: email.html,
        text: email.text,
        feedbackUrl,
        unsubscribeUrl: `${info.trackingBase}/t/u?token=${recipient.token}`,
        trackingPixelUrl: `${info.trackingBase}/t/o?token=${recipient.token}`,
        recipientId: recipient._id,
      });

      if (res.ok) {
        await ctx.db.patch(recipient._id, { status: "sent", sentAt: Date.now() });
        delivered += 1;
      } else {
        await ctx.db.patch(recipient._id, {
          status: "failed",
          error: res.error || "Échec d'envoi",
        });
        failed += 1;
      }
    }

    await ctx.db.patch(campaign._id, {
      stats: { ...campaign.stats, delivered, failed },
      updatedAt: Date.now(),
    });

    const remaining = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_campaign_status", (q) =>
        q.eq("campaignId", args.campaignId).eq("status", "pending"),
      )
      .first();

    if (remaining) {
      await ctx.scheduler.runAfter(BATCH_INTERVAL_MS, internal.marketing.deliverBatch, {
        campaignId: args.campaignId,
      });
    } else {
      await ctx.db.patch(campaign._id, {
        status: "sent",
        sentAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { processed: batch.length };
  },
});

/** Retour du serveur SMTP : compteur de réussite / échec (idempotent). */
export const markRecipientDelivery = internalMutation({
  args: {
    recipientId: v.id("marketingRecipients"),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) return { ok: false };
    const campaign = await ctx.db.get(recipient.campaignId);
    if (!campaign) return { ok: false };

    if (args.ok) {
      if (recipient.status === "failed") {
        await ctx.db.patch(recipient._id, { status: "sent", error: undefined });
      }
      return { ok: true };
    }

    if (recipient.status !== "failed") {
      await ctx.db.patch(recipient._id, {
        status: "failed",
        error: args.error || "Échec d'envoi",
      });
      await ctx.db.patch(campaign._id, {
        stats: {
          ...campaign.stats,
          failed: campaign.stats.failed + 1,
          delivered: Math.max(0, campaign.stats.delivered - 1),
        },
      });
    }
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Suivi (HTTP — liens opaques)
// ---------------------------------------------------------------------------

export const trackOpen = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const recipient = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!recipient || recipient.openedAt) return { ok: false };

    const campaign = await ctx.db.get(recipient.campaignId);
    if (!campaign) return { ok: false };

    await ctx.db.patch(recipient._id, { openedAt: Date.now() });
    await ctx.db.patch(campaign._id, {
      stats: {
        ...campaign.stats,
        opened: campaign.stats.opened + 1,
        conversions: campaign.stats.conversions + (recipient.convertedAt ? 0 : 1),
      },
    });
    if (!recipient.convertedAt) {
      await ctx.db.patch(recipient._id, { convertedAt: Date.now() });
    }
    return { ok: true };
  },
});

export const trackClick = internalMutation({
  args: { token: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const fallback = "https://batibuild.app";
    const target = /^https?:\/\//i.test(args.url) ? args.url : fallback;

    const recipient = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!recipient) return { url: target };

    const campaign = await ctx.db.get(recipient.campaignId);
    if (!campaign) return { url: target };

    const now = Date.now();
    if (!recipient.clickedAt) {
      await ctx.db.patch(recipient._id, {
        clickedAt: now,
        convertedAt: recipient.convertedAt ?? now,
      });
      await ctx.db.patch(campaign._id, {
        stats: {
          ...campaign.stats,
          clicked: campaign.stats.clicked + 1,
          conversions: campaign.stats.conversions + (recipient.convertedAt ? 0 : 1),
        },
      });
    }
    return { url: target };
  },
});

export const unsubscribe = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const recipient = await ctx.db
      .query("marketingRecipients")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!recipient) return { ok: false, siteName: "batibuild", email: "" };

    const user = await ctx.db.get(recipient.userId);
    if (user && user.marketingOptOut !== true) {
      await ctx.db.patch(user._id, { marketingOptOut: true, marketingOptOutAt: Date.now() });
    }
    const info = await siteInfo(ctx);
    return { ok: true, siteName: info.siteName, email: recipient.email };
  },
});
