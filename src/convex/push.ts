// ============================================================================
// MODULE ADMINISTRATION — PUSH NOTIFICATIONS ANDROID (FCM)
// ----------------------------------------------------------------------------
// · Destinataires : uniquement les appareils Android dont le token FCM est
//   actif ET dont l'autorisation système est accordée. Les utilisateurs
//   désinscrits (`pushOptOut`) ou désactivés sont TOUJOURS exclus.
// · Un seul envoi par utilisateur et par campagne (le token le plus récent est
//   retenu) : aucun doublon possible.
// · Envoi réel via Firebase Cloud Messaging HTTP v1 (`pushSender.ts`, Node).
//   Les secrets ne quittent jamais le backend.
// · Lots de 20 notifications espacées de 1,2 s, plafond 5 000 destinataires,
//   reprise automatique tant qu'il reste des envois en attente.
// · Suivi : accepté par FCM, ouvert, cliqué, converti — mesuré uniquement
//   lorsque l'application Android le signale (tap sur la notification et
//   ouverture de la destination).
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
import { PUSH_CONFIG_ERROR, isPushConfigured } from "./pushConfig";
import {
  PUSH_AUDIENCE_IDS,
  PUSH_MODULE_IDS,
  isConversionDestination,
  safePushDestination,
  type PushAudienceId,
  type PushFilters,
} from "../lib/pushAudience";
import { PUSH_MESSAGE_MAX, PUSH_TITLE_MAX } from "../lib/pushTemplates";

const BATCH_SIZE = 20;
const BATCH_INTERVAL_MS = 1200;
const MAX_RECIPIENTS = 5000;
const STAFF_ROLES = ["admin", "moderator", "support_agent"];

const categoryValidator = v.union(
  v.literal("client_pro"),
  v.literal("expert"),
  v.literal("supplier"),
  v.literal("custom"),
);

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("suspended"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const permissionValidator = v.union(
  v.literal("granted"),
  v.literal("denied"),
  v.literal("default"),
);

const platformValidator = v.union(
  v.literal("android"),
  v.literal("ios"),
  v.literal("web"),
);

const filtersValidator = v.optional(
  v.object({
    createdFrom: v.optional(v.number()),
    createdTo: v.optional(v.number()),
    lastActiveDays: v.optional(v.number()),
    subscriptionPlan: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    region: v.optional(v.string()),
    notUsedModule: v.optional(v.string()),
  }),
);

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

function randomToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function validFcmToken(token: string | undefined): token is string {
  const value = (token ?? "").trim();
  return value.length >= 20 && value.length <= 4096 && !/\s/.test(value);
}

function normalizeImageUrl(raw: string | undefined | null): string | undefined {
  const value = (raw ?? "").trim();
  if (!value) return undefined;
  if (!/^https:\/\//i.test(value)) {
    throw new Error("L'image doit être une URL HTTPS.");
  }
  return value;
}

function clientProIsActive(user: Doc<"users">, now: number): boolean {
  const credits =
    Math.max(0, (user.clientProFreeProjectsGranted ?? 0) - (user.clientProFreeProjectsUsed ?? 0)) +
    Math.max(0, (user.clientProPaidProjectsGranted ?? 0) - (user.clientProPaidProjectsUsed ?? 0));
  if (credits > 0) return true;
  if (
    user.subscriptionStatus === "active" &&
    (!user.subscriptionEndDate || user.subscriptionEndDate > now)
  ) {
    return true;
  }
  return user.subscriptionStatus === "trialing" && (!user.trialEndDate || user.trialEndDate > now);
}

function profileIsActive(
  profile: { subscriptionStatus: string; subscriptionEndDate?: number } | undefined,
  now: number,
): boolean {
  return (
    !!profile &&
    (profile.subscriptionStatus === "active" || profile.subscriptionStatus === "trial") &&
    (!profile.subscriptionEndDate || profile.subscriptionEndDate > now)
  );
}

function normalizeAudience(value: string | undefined): PushAudienceId {
  const id = (value ?? "").trim();
  if ((PUSH_AUDIENCE_IDS as readonly string[]).includes(id)) return id as PushAudienceId;
  return "all_android";
}

type EligibleRecipient = { user: Doc<"users">; token: Doc<"pushTokens"> };

type AudienceArgs = {
  audience: string;
  userIds?: Id<"users">[];
  filters?: PushFilters;
};

/**
 * Résout les destinataires : appareils Android autorisés, consentement,
 * segments et filtres complémentaires. Un utilisateur n'apparaît qu'UNE fois.
 */
async function resolvePushAudience(
  ctx: QueryCtx | MutationCtx,
  args: AudienceArgs,
): Promise<{
  recipients: EligibleRecipient[];
  counts: Record<string, number>;
}> {
  const now = Date.now();
  const filters = args.filters ?? {};
  const selected = new Set((args.userIds ?? []).map(String));

  const [users, tokens, expertProfiles, supplierProfiles] = await Promise.all([
    ctx.db.query("users").take(5000),
    ctx.db.query("pushTokens").take(20000),
    ctx.db.query("expertProfiles").take(5000),
    ctx.db.query("supplierProfiles").take(5000),
  ]);

  const expertByUser = new Map(expertProfiles.map((p) => [String(p.userId), p] as const));
  const supplierByUser = new Map(supplierProfiles.map((p) => [String(p.userId), p] as const));

  // Un seul appareil par utilisateur : le token autorisé le plus récent.
  const tokenByUser = new Map<string, Doc<"pushTokens">>();
  for (const token of tokens) {
    if (!token.isActive || token.permissionStatus !== "granted") continue;
    if (!validFcmToken(token.fcmToken)) continue;
    const key = String(token.userId);
    const previous = tokenByUser.get(key);
    if (!previous || token.updatedAt > previous.updatedAt) tokenByUser.set(key, token);
  }

  // Filtre « module jamais utilisé » : une seule lecture par module.
  let moduleUsers: Set<string> | null = null;
  const moduleId = (filters.notUsedModule ?? "").trim();
  if (moduleId && (PUSH_MODULE_IDS as readonly string[]).includes(moduleId)) {
    moduleUsers = new Set<string>();
    const collect = (rows: Array<{ userId: Id<"users"> }>) => {
      for (const row of rows) moduleUsers!.add(String(row.userId));
    };
    if (moduleId === "cost") collect(await ctx.db.query("projects").take(5000));
    if (moduleId === "plans") collect(await ctx.db.query("projectTechnicalPlans").take(5000));
    if (moduleId === "decision") collect(await ctx.db.query("budgetAnalyses").take(5000));
    if (moduleId === "investments") collect(await ctx.db.query("investmentAnalyses").take(5000));
    if (moduleId === "materials") collect(await ctx.db.query("aiMaterialAnalyses").take(5000));
    if (moduleId === "sites") collect(await ctx.db.query("siteProjects").take(5000));
  }

  // Région : dernier projet de construction ou dernier chantier.
  let regionByUser: Map<string, string> | null = null;
  if (filters.region) {
    regionByUser = new Map();
    const projects = await ctx.db.query("projects").take(5000);
    for (const project of projects) {
      if (!project.region) continue;
      const key = String(project.userId);
      if (!regionByUser.has(key)) regionByUser.set(key, project.region);
    }
    const sites = await ctx.db.query("siteProjects").take(5000);
    for (const site of sites) {
      if (!site.region) continue;
      const key = String(site.userId);
      if (!regionByUser.has(key)) regionByUser.set(key, site.region);
    }
  }

  const baseEligible: EligibleRecipient[] = [];
  for (const user of users) {
    const token = tokenByUser.get(String(user._id));
    if (!token) continue;
    if (user.status === "disabled") continue;
    if (user.isAnonymous) continue;
    if (user.pushOptOut === true) continue;
    if (user.role && STAFF_ROLES.includes(user.role)) continue;

    const createdAt = user.createdAt ?? user._creationTime;
    if (filters.createdFrom && createdAt < filters.createdFrom) continue;
    if (filters.createdTo && createdAt > filters.createdTo) continue;

    if (filters.lastActiveDays && filters.lastActiveDays > 0) {
      const lastSeen = token.lastSeenAt ?? token.updatedAt;
      if (lastSeen < now - filters.lastActiveDays * 86_400_000) continue;
    }
    if (filters.subscriptionPlan && user.subscriptionPlan !== filters.subscriptionPlan) continue;
    if (filters.subscriptionStatus && user.subscriptionStatus !== filters.subscriptionStatus) {
      continue;
    }
    if (regionByUser) {
      const region = regionByUser.get(String(user._id));
      if (!region || region !== filters.region) continue;
    }
    if (moduleUsers && moduleUsers.has(String(user._id))) continue;

    baseEligible.push({ user, token });
  }

  const isClient = (user: Doc<"users">) =>
    (!user.userRole || user.userRole === "client") &&
    !expertByUser.has(String(user._id)) &&
    !supplierByUser.has(String(user._id));

  const matches = (entry: EligibleRecipient, audience: PushAudienceId): boolean => {
    const { user } = entry;
    const expertProfile = expertByUser.get(String(user._id));
    const supplierProfile = supplierByUser.get(String(user._id));
    const isExpert = user.userRole === "expert" || !!expertProfile;
    const isSupplier = user.userRole === "supplier" || !!supplierProfile;

    switch (audience) {
      case "all_android":
        return true;
      case "client_pro_all":
        return isClient(user);
      case "client_pro_active":
        return isClient(user) && clientProIsActive(user, now);
      case "client_pro_inactive":
        return isClient(user) && !clientProIsActive(user, now);
      case "expert_all":
        return isExpert;
      case "expert_active":
        return isExpert && profileIsActive(expertProfile, now);
      case "expert_inactive":
        return isExpert && !profileIsActive(expertProfile, now);
      case "supplier_all":
        return isSupplier;
      case "supplier_active":
        return isSupplier && profileIsActive(supplierProfile, now);
      case "supplier_inactive":
        return isSupplier && !profileIsActive(supplierProfile, now);
      case "selected":
        return selected.has(String(user._id));
      default:
        return false;
    }
  };

  const counts: Record<string, number> = {};
  for (const audience of PUSH_AUDIENCE_IDS) {
    counts[audience] = baseEligible.filter((entry) => matches(entry, audience)).length;
  }

  const audience = normalizeAudience(args.audience);
  return { recipients: baseEligible.filter((entry) => matches(entry, audience)), counts };
}

function validateCampaignInput(args: {
  title: string;
  message: string;
  campaignName: string;
  destination?: string;
  imageUrl?: string;
}) {
  if (!args.campaignName.trim()) throw new Error("Renseignez le nom interne de la campagne.");
  if (!args.title.trim()) throw new Error("Renseignez le titre de la notification.");
  if (!args.message.trim()) throw new Error("Renseignez le message de la notification.");
  if (args.title.trim().length > PUSH_TITLE_MAX) {
    throw new Error(`Le titre ne doit pas dépasser ${PUSH_TITLE_MAX} caractères.`);
  }
  if (args.message.trim().length > PUSH_MESSAGE_MAX) {
    throw new Error(`Le message ne doit pas dépasser ${PUSH_MESSAGE_MAX} caractères.`);
  }
  const destination = (args.destination ?? "").trim();
  if (destination && !safePushDestination(destination)) {
    throw new Error("Destination invalide : utilisez une route interne ou une URL HTTPS.");
  }
  normalizeImageUrl(args.imageUrl);
}

async function launchCampaign(
  ctx: MutationCtx,
  campaign: Doc<"pushCampaigns">,
): Promise<{ recipients: number }> {
  if (!isPushConfigured()) throw new Error(PUSH_CONFIG_ERROR);
  if (!campaign.title.trim() || !campaign.message.trim()) {
    throw new Error("Renseignez le titre et le message avant l'envoi.");
  }
  if (campaign.expiresAt && campaign.expiresAt < Date.now()) {
    throw new Error("Cette notification est expirée : mettez à jour sa date de validité.");
  }

  // Repartir d'une base propre (relance après annulation / suspension).
  const previous = await ctx.db
    .query("pushLogs")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
    .take(MAX_RECIPIENTS + 500);
  for (const log of previous) await ctx.db.delete(log._id);

  const { recipients } = await resolvePushAudience(ctx, {
    audience: campaign.targetAudience,
    userIds: campaign.selectedUserIds,
    filters: campaign.filters,
  });

  if (recipients.length === 0) {
    throw new Error(
      "Aucun appareil Android éligible : vérifiez l'audience, les filtres et les autorisations de notifications.",
    );
  }
  if (recipients.length > MAX_RECIPIENTS) {
    throw new Error(
      `Trop de destinataires (${recipients.length}). Limitez l'audience à ${MAX_RECIPIENTS}.`,
    );
  }

  const now = Date.now();
  for (const recipient of recipients) {
    await ctx.db.insert("pushLogs", {
      campaignId: campaign._id,
      userId: recipient.user._id,
      deviceToken: recipient.token.fcmToken,
      token: randomToken(),
      deliveryStatus: "pending",
      createdAt: now,
    });
  }

  await ctx.db.patch(campaign._id, {
    status: "sending",
    scheduledAt: undefined,
    sentAt: undefined,
    audienceCount: recipients.length,
    updatedAt: now,
  });

  await ctx.scheduler.runAfter(0, internal.push.deliverBatch, { campaignId: campaign._id });
  return { recipients: recipients.length };
}

async function publicCampaign(
  ctx: QueryCtx | MutationCtx,
  campaign: Doc<"pushCampaigns">,
) {
  const logs = await ctx.db
    .query("pushLogs")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
    .take(MAX_RECIPIENTS);

  const count = (predicate: (log: Doc<"pushLogs">) => boolean) => logs.filter(predicate).length;
  const delivered = count((l) => l.deliveryStatus === "accepted");
  const opened = count((l) => l.openedAt !== undefined);
  const clicked = count((l) => l.clickedAt !== undefined);
  const conversions = count((l) => l.convertedAt !== undefined);

  return {
    _id: campaign._id,
    campaignName: campaign.campaignName,
    category: campaign.category,
    templateId: campaign.templateId,
    title: campaign.title,
    message: campaign.message,
    imageUrl: campaign.imageUrl,
    icon: campaign.icon,
    actionLabel: campaign.actionLabel,
    destination: campaign.destination,
    targetAudience: campaign.targetAudience,
    filters: campaign.filters,
    selectedUserIds: campaign.selectedUserIds,
    status: campaign.status,
    scheduledAt: campaign.scheduledAt,
    expiresAt: campaign.expiresAt,
    sentAt: campaign.sentAt,
    audienceCount: campaign.audienceCount,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    stats: {
      targeted: logs.length,
      delivered,
      failed: count((l) => l.deliveryStatus === "failed"),
      skipped: count((l) => l.deliveryStatus === "skipped"),
      opened,
      clicked,
      conversions,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 1000) / 10 : 0,
      clickRate: delivered > 0 ? Math.round((clicked / delivered) * 1000) / 10 : 0,
      conversionRate: delivered > 0 ? Math.round((conversions / delivered) * 1000) / 10 : 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Enregistrement des appareils (application Android)
// ---------------------------------------------------------------------------

/** Enregistre / met à jour le token FCM de l'appareil connecté. */
export const registerPushToken = mutation({
  args: {
    fcmToken: v.string(),
    platform: v.optional(platformValidator),
    deviceId: v.optional(v.string()),
    permissionStatus: v.optional(permissionValidator),
    appVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connexion requise pour enregistrer l'appareil.");

    const fcmToken = args.fcmToken.trim();
    if (!validFcmToken(fcmToken)) throw new Error("Token FCM invalide.");

    const now = Date.now();
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("fcmToken", fcmToken))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: user._id,
        platform: args.platform ?? existing.platform,
        deviceId: args.deviceId ?? existing.deviceId,
        isActive: true,
        permissionStatus: args.permissionStatus ?? existing.permissionStatus,
        appVersion: args.appVersion ?? existing.appVersion,
        lastSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("pushTokens", {
        userId: user._id,
        fcmToken,
        platform: args.platform ?? "android",
        deviceId: args.deviceId,
        isActive: true,
        permissionStatus: args.permissionStatus ?? "granted",
        appVersion: args.appVersion,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Rotation de token sur le même appareil : l'ancien token ne doit plus
    // recevoir de notification.
    if (args.deviceId) {
      const mine = await ctx.db
        .query("pushTokens")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .take(50);
      for (const token of mine) {
        if (
          token._id !== existing?._id &&
          token.deviceId === args.deviceId &&
          token.fcmToken !== fcmToken
        ) {
          await ctx.db.patch(token._id, { isActive: false, updatedAt: now });
        }
      }
    }

    return { ok: true };
  },
});

/** Rotation automatique du token (Firebase `onNewToken`). */
export const refreshPushToken = mutation({
  args: {
    oldToken: v.optional(v.string()),
    newToken: v.string(),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false, reason: "unauthenticated" as const };

    const newToken = args.newToken.trim();
    if (!validFcmToken(newToken)) throw new Error("Token FCM invalide.");

    const now = Date.now();
    if (args.oldToken && args.oldToken.trim() && args.oldToken.trim() !== newToken) {
      const old = await ctx.db
        .query("pushTokens")
        .withIndex("by_token", (q) => q.eq("fcmToken", args.oldToken!.trim()))
        .unique();
      if (old) await ctx.db.patch(old._id, { isActive: false, updatedAt: now });
    }

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("fcmToken", newToken))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: user._id,
        isActive: true,
        deviceId: args.deviceId ?? existing.deviceId,
        lastSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("pushTokens", {
        userId: user._id,
        fcmToken: newToken,
        platform: "android",
        deviceId: args.deviceId,
        isActive: true,
        permissionStatus: "granted",
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { ok: true, reason: "registered" as const };
  },
});

/** Mise à jour de l'autorisation système (Android 13+). */
export const updatePushPermission = mutation({
  args: { fcmToken: v.string(), permissionStatus: permissionValidator },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("fcmToken", args.fcmToken.trim()))
      .unique();
    if (!token) return { ok: false };
    await ctx.db.patch(token._id, {
      permissionStatus: args.permissionStatus,
      isActive: args.permissionStatus === "granted" ? true : token.isActive,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Déconnexion : l'appareil ne reçoit plus de notifications jusqu'au retour. */
export const unregisterPushToken = mutation({
  args: { fcmToken: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false };
    const token = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("fcmToken", args.fcmToken.trim()))
      .unique();
    if (token && token.userId === user._id) {
      await ctx.db.patch(token._id, { isActive: false, updatedAt: Date.now() });
    }
    return { ok: true };
  },
});

/** Consentement : l'utilisateur coupe / réactive les notifications. */
export const setPushOptOut = mutation({
  args: { optOut: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connexion requise.");
    await ctx.db.patch(user._id, {
      pushOptOut: args.optOut,
      pushOptOutAt: args.optOut ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
    return { ok: true, optOut: args.optOut };
  },
});

/** État des notifications pour l'utilisateur connecté (réglages). */
export const getMyPushStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);
    const active = tokens.filter((t) => t.isActive);
    const latest = active.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    return {
      optOut: user.pushOptOut === true,
      hasDevice: active.length > 0,
      permissionStatus: latest?.permissionStatus ?? "default",
      platform: latest?.platform ?? null,
      lastSeenAt: latest?.lastSeenAt ?? latest?.updatedAt ?? null,
    };
  },
});

// ---------------------------------------------------------------------------
// Suivi des événements
// ---------------------------------------------------------------------------

async function recordEventImpl(
  ctx: MutationCtx,
  args: { token: string; kind: "open" | "click" },
) {
  const log = await ctx.db
    .query("pushLogs")
    .withIndex("by_token", (q) => q.eq("token", args.token))
    .unique();
  if (!log) return { ok: false as const, destination: "/dashboard" };

  const campaign = await ctx.db.get(log.campaignId);
  const destination = safePushDestination(campaign?.destination) ?? "/dashboard";
  const now = Date.now();
  const patch: Partial<Doc<"pushLogs">> = {};

  if (args.kind === "open" && !log.openedAt) patch.openedAt = now;
  if (args.kind === "click" && !log.clickedAt) {
    patch.clickedAt = now;
    // Conversion attribuée : destination monétisable ou évaluation.
    if (!log.convertedAt && isConversionDestination(destination)) patch.convertedAt = now;
  }
  if (Object.keys(patch).length > 0) await ctx.db.patch(log._id, patch);

  return { ok: true as const, destination };
}

/** Ouverture / clic signalé par l'application Android (jeton opaque). */
export const recordPushEvent = mutation({
  args: {
    token: v.string(),
    kind: v.union(v.literal("open"), v.literal("click")),
  },
  handler: async (ctx, args) => recordEventImpl(ctx, args),
});

/** Variante interne utilisée par les routes HTTP (pixel / redirection). */
export const trackEvent = internalMutation({
  args: {
    token: v.string(),
    kind: v.union(v.literal("open"), v.literal("click")),
  },
  handler: async (ctx, args) => recordEventImpl(ctx, args),
});

/** Désabonnement en un clic depuis une notification (jeton opaque). */
export const unsubscribeByToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("pushLogs")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!log) return { ok: false, name: "" };
    const user = await ctx.db.get(log.userId);
    if (!user) return { ok: false, name: "" };
    await ctx.db.patch(user._id, {
      pushOptOut: true,
      pushOptOutAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ok: true, name: user.name ?? "" };
  },
});

// ---------------------------------------------------------------------------
// Campagnes
// ---------------------------------------------------------------------------

export const saveCampaign = mutation({
  args: {
    campaignId: v.optional(v.id("pushCampaigns")),
    campaignName: v.string(),
    category: categoryValidator,
    templateId: v.optional(v.string()),
    title: v.string(),
    message: v.string(),
    imageUrl: v.optional(v.string()),
    icon: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    destination: v.optional(v.string()),
    targetAudience: v.string(),
    filters: filtersValidator,
    selectedUserIds: v.optional(v.array(v.id("users"))),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    validateCampaignInput(args);

    const audience = normalizeAudience(args.targetAudience);
    if (audience === "selected" && (args.selectedUserIds ?? []).length === 0) {
      throw new Error("Sélectionnez au moins un utilisateur pour une audience personnalisée.");
    }

    const destination = safePushDestination(args.destination) ?? undefined;
    const now = Date.now();

    if (args.campaignId) {
      const campaign = await ctx.db.get(args.campaignId);
      if (!campaign) throw new Error("Campagne introuvable.");
      if (campaign.status === "sending") {
        throw new Error("Une campagne en cours d'envoi ne peut pas être modifiée.");
      }
      if (campaign.status === "sent") {
        throw new Error("Une campagne déjà envoyée ne peut pas être modifiée.");
      }

      const { recipients } = await resolvePushAudience(ctx, {
        audience,
        userIds: args.selectedUserIds,
        filters: args.filters,
      });

      await ctx.db.patch(args.campaignId, {
        campaignName: args.campaignName.trim(),
        category: args.category,
        templateId: args.templateId,
        title: args.title.trim(),
        message: args.message.trim(),
        imageUrl: normalizeImageUrl(args.imageUrl),
        icon: args.icon,
        actionLabel: args.actionLabel?.trim() || undefined,
        destination,
        targetAudience: audience,
        filters: args.filters,
        selectedUserIds: args.selectedUserIds,
        expiresAt: args.expiresAt,
        audienceCount: recipients.length,
        updatedAt: now,
      });
      return { ok: true, campaignId: args.campaignId, audienceCount: recipients.length };
    }

    const { recipients } = await resolvePushAudience(ctx, {
      audience,
      userIds: args.selectedUserIds,
      filters: args.filters,
    });

    const campaignId = await ctx.db.insert("pushCampaigns", {
      campaignName: args.campaignName.trim(),
      category: args.category,
      templateId: args.templateId,
      title: args.title.trim(),
      message: args.message.trim(),
      imageUrl: normalizeImageUrl(args.imageUrl),
      icon: args.icon,
      actionLabel: args.actionLabel?.trim() || undefined,
      destination,
      targetAudience: audience,
      filters: args.filters,
      selectedUserIds: args.selectedUserIds,
      status: "draft",
      expiresAt: args.expiresAt,
      audienceCount: recipients.length,
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, campaignId, audienceCount: recipients.length };
  },
});

export const deleteCampaign = mutation({
  args: { campaignId: v.id("pushCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return { ok: true };
    if (campaign.status === "sending") throw new Error("Campagne en cours d'envoi : suspendez-la d'abord.");
    const logs = await ctx.db
      .query("pushLogs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .take(MAX_RECIPIENTS + 500);
    for (const log of logs) await ctx.db.delete(log._id);
    await ctx.db.delete(args.campaignId);
    return { ok: true };
  },
});

/** Envoi immédiat : confirmation avec le nombre exact de destinataires. */
export const startCampaign = mutation({
  args: { campaignId: v.id("pushCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");
    if (campaign.status === "sending") throw new Error("Cette campagne est déjà en cours d'envoi.");
    if (campaign.status === "sent") throw new Error("Cette campagne a déjà été envoyée.");
    return launchCampaign(ctx, campaign);
  },
});

export const scheduleCampaign = mutation({
  args: {
    campaignId: v.id("pushCampaigns"),
    scheduledAt: v.number(),
  },
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
    if (campaign.expiresAt && campaign.expiresAt < args.scheduledAt) {
      throw new Error("La date d'expiration est antérieure à l'envoi programmé.");
    }
    if (!isPushConfigured()) throw new Error(PUSH_CONFIG_ERROR);
    validateCampaignInput(campaign);

    await ctx.db.patch(args.campaignId, {
      status: "scheduled",
      scheduledAt: args.scheduledAt,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAt(args.scheduledAt, internal.push.startScheduledCampaign, {
      campaignId: args.campaignId,
    });
    return { ok: true };
  },
});

export const startScheduledCampaign = internalMutation({
  args: { campaignId: v.id("pushCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.status !== "scheduled") return { ok: false };
    try {
      const result = await launchCampaign(ctx, campaign);
      return { ok: true, recipients: result.recipients };
    } catch {
      await ctx.db.patch(args.campaignId, { status: "failed", updatedAt: Date.now() });
      return { ok: false };
    }
  },
});

/** Suspend une campagne programmée ; elle peut être relancée ensuite. */
export const suspendCampaign = mutation({
  args: { campaignId: v.id("pushCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");
    if (campaign.status !== "scheduled") {
      throw new Error("Seule une campagne programmée peut être suspendue.");
    }
    await ctx.db.patch(args.campaignId, { status: "suspended", updatedAt: Date.now() });
    return { ok: true };
  },
});

export const cancelCampaign = mutation({
  args: { campaignId: v.id("pushCampaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");
    if (campaign.status === "sent") {
      throw new Error("Une campagne déjà envoyée ne peut pas être annulée.");
    }

    const pending = await ctx.db
      .query("pushLogs")
      .withIndex("by_campaign_status", (q) =>
        q.eq("campaignId", args.campaignId).eq("deliveryStatus", "pending"),
      )
      .take(MAX_RECIPIENTS + 500);
    for (const log of pending) {
      await ctx.db.patch(log._id, {
        deliveryStatus: "skipped",
        errorMessage: "Campagne annulée.",
      });
    }

    await ctx.db.patch(args.campaignId, {
      status: "cancelled",
      scheduledAt: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Notification de test : envoyée uniquement à l'appareil de l'administrateur. */
export const sendTestNotification = mutation({
  args: { campaignId: v.id("pushCampaigns") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!isPushConfigured()) throw new Error(PUSH_CONFIG_ERROR);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campagne introuvable.");
    validateCampaignInput(campaign);

    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", admin._id))
      .take(20);
    const device = tokens
      .filter((t) => t.isActive && t.permissionStatus === "granted" && validFcmToken(t.fcmToken))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    if (!device) {
      throw new Error(
        "Aucun appareil de test : connectez-vous à l'application Android avec ce compte administrateur et autorisez les notifications.",
      );
    }

    await ctx.scheduler.runAfter(0, internal.pushSender.sendPushAction, {
      token: device.fcmToken,
      title: campaign.title,
      message: campaign.message,
      imageUrl: campaign.imageUrl,
      destination: campaign.destination,
      actionLabel: campaign.actionLabel,
      test: true,
    });
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Envoi par lots
// ---------------------------------------------------------------------------

export const deliverBatch = internalMutation({
  args: { campaignId: v.id("pushCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return { stopped: true };
    if (campaign.status === "suspended" || campaign.status === "cancelled") {
      return { stopped: true };
    }
    if (campaign.status !== "sending") return { stopped: true };

    const batch = await ctx.db
      .query("pushLogs")
      .withIndex("by_campaign_status", (q) =>
        q.eq("campaignId", args.campaignId).eq("deliveryStatus", "pending"),
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

    const now = Date.now();
    let scheduled = 0;
    for (const log of batch) {
      const user = await ctx.db.get(log.userId);
      const token = await ctx.db
        .query("pushTokens")
        .withIndex("by_token", (q) => q.eq("fcmToken", log.deviceToken))
        .unique();

      if (
        !user ||
        user.pushOptOut === true ||
        user.status === "disabled" ||
        !token ||
        !token.isActive ||
        token.permissionStatus !== "granted"
      ) {
        await ctx.db.patch(log._id, {
          deliveryStatus: "skipped",
          errorMessage: "Consentement retiré ou appareil inactif.",
        });
        continue;
      }

      await ctx.scheduler.runAfter(scheduled * BATCH_INTERVAL_MS, internal.pushSender.sendPushAction, {
        token: log.deviceToken,
        title: campaign.title,
        message: campaign.message,
        imageUrl: campaign.imageUrl,
        destination: campaign.destination,
        actionLabel: campaign.actionLabel,
        campaignId: args.campaignId,
        logId: log._id,
        logToken: log.token,
      });
      scheduled += 1;
    }

    await ctx.scheduler.runAfter(
      Math.max(BATCH_INTERVAL_MS, scheduled * BATCH_INTERVAL_MS) + 2500,
      internal.push.deliverBatch,
      { campaignId: args.campaignId },
    );
    void now;
    return { scheduled };
  },
});

export const markDeliveryResult = internalMutation({
  args: {
    logId: v.id("pushLogs"),
    ok: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
    invalidToken: v.optional(v.boolean()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) return { ok: false };

    if (args.ok) {
      await ctx.db.patch(log._id, {
        deliveryStatus: "accepted",
        fcmMessageId: args.messageId,
        errorMessage: undefined,
      });
    } else {
      await ctx.db.patch(log._id, {
        deliveryStatus: "failed",
        errorMessage: (args.error ?? "Échec FCM").slice(0, 300),
      });
    }

    if (args.invalidToken) {
      const raw = args.token ?? log.deviceToken;
      const token = await ctx.db
        .query("pushTokens")
        .withIndex("by_token", (q) => q.eq("fcmToken", raw))
        .unique();
      if (token) {
        await ctx.db.patch(token._id, { isActive: false, updatedAt: Date.now() });
      }
    }
    return { ok: true };
  },
});

/** Cron : lance les campagnes programmées arrivées à échéance. */
export const processScheduledCampaigns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const scheduled = await ctx.db
      .query("pushCampaigns")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .take(20);

    let launched = 0;
    for (const campaign of scheduled) {
      if (!campaign.scheduledAt || campaign.scheduledAt > now) continue;
      if (campaign.expiresAt && campaign.expiresAt < now) {
        await ctx.db.patch(campaign._id, { status: "failed", updatedAt: now });
        continue;
      }
      try {
        await launchCampaign(ctx, campaign);
        launched += 1;
      } catch {
        await ctx.db.patch(campaign._id, { status: "failed", updatedAt: now });
      }
    }
    return { launched };
  },
});

// ---------------------------------------------------------------------------
// Lecture / administration
// ---------------------------------------------------------------------------

export const listCampaigns = query({
  args: { status: v.optional(statusValidator) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];

    const campaigns = await ctx.db
      .query("pushCampaigns")
      .order("desc")
      .take(120);

    return campaigns
      .filter((c) => !args.status || c.status === args.status)
      .map((campaign) => ({
        _id: campaign._id,
        campaignName: campaign.campaignName,
        category: campaign.category,
        title: campaign.title,
        message: campaign.message,
        status: campaign.status,
        targetAudience: campaign.targetAudience,
        audienceCount: campaign.audienceCount ?? 0,
        scheduledAt: campaign.scheduledAt,
        sentAt: campaign.sentAt,
        createdAt: campaign.createdAt,
        destination: campaign.destination,
      }));
  },
});

export const getCampaign = query({
  args: { campaignId: v.id("pushCampaigns") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return null;

    const publicData = await publicCampaign(ctx, campaign);
    const logs = await ctx.db
      .query("pushLogs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .take(200);

    const rows = [];
    for (const log of logs.slice(0, 100)) {
      const target = await ctx.db.get(log.userId);
      rows.push({
        _id: log._id,
        userName: target?.name ?? "Utilisateur",
        userEmail: target?.email ?? "",
        deliveryStatus: log.deliveryStatus,
        openedAt: log.openedAt,
        clickedAt: log.clickedAt,
        convertedAt: log.convertedAt,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
      });
    }

    return { campaign: publicData, logs: rows };
  },
});

export const getDashboardStats = query({
  args: {
    periodDays: v.optional(v.number()),
    category: v.optional(categoryValidator),
    campaignId: v.optional(v.id("pushCampaigns")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;

    const since = args.periodDays ? Date.now() - args.periodDays * 86_400_000 : 0;
    const all = await ctx.db.query("pushCampaigns").order("desc").take(120);
    const campaigns = all.filter(
      (c) =>
        c.createdAt >= since &&
        (!args.category || c.category === args.category) &&
        (!args.campaignId || c._id === args.campaignId),
    );

    const totals = {
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
      conversions: 0,
      campaignsSent: 0,
    };
    const byCategory: Record<
      string,
      { sent: number; delivered: number; opened: number; clicked: number }
    > = {
      client_pro: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
      expert: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
      supplier: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
      custom: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
    };
    const series: Array<{
      id: string;
      name: string;
      date: number;
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    }> = [];

    for (const campaign of campaigns.slice(0, 80)) {
      const logs = await ctx.db
        .query("pushLogs")
        .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
        .take(MAX_RECIPIENTS);
      const delivered = logs.filter((l) => l.deliveryStatus === "accepted").length;
      const opened = logs.filter((l) => l.openedAt !== undefined).length;
      const clicked = logs.filter((l) => l.clickedAt !== undefined).length;
      const conversions = logs.filter((l) => l.convertedAt !== undefined).length;

      totals.sent += logs.length;
      totals.delivered += delivered;
      totals.failed += logs.filter((l) => l.deliveryStatus === "failed").length;
      totals.opened += opened;
      totals.clicked += clicked;
      totals.conversions += conversions;
      if (campaign.status === "sent") totals.campaignsSent += 1;

      const bucket = byCategory[campaign.category] ?? byCategory.custom;
      bucket.sent += logs.length;
      bucket.delivered += delivered;
      bucket.opened += opened;
      bucket.clicked += clicked;

      series.push({
        id: campaign._id,
        name: campaign.campaignName,
        date: campaign.sentAt ?? campaign.createdAt,
        sent: logs.length,
        delivered,
        opened,
        clicked,
      });
    }

    const rate = (value: number, base: number) =>
      base > 0 ? Math.round((value / base) * 1000) / 10 : 0;

    const tokens = await ctx.db.query("pushTokens").take(20000);
    const androidUsers = new Set(
      tokens.filter((t) => t.isActive).map((t) => String(t.userId)),
    );
    const authorizedUsers = new Set(
      tokens
        .filter((t) => t.isActive && t.permissionStatus === "granted")
        .map((t) => String(t.userId)),
    );

    return {
      totals: {
        ...totals,
        openRate: rate(totals.opened, totals.delivered),
        clickRate: rate(totals.clicked, totals.delivered),
        conversionRate: rate(totals.conversions, totals.delivered),
        androidUsers: androidUsers.size,
        authorizedUsers: authorizedUsers.size,
        activeDevices: tokens.filter((t) => t.isActive).length,
      },
      series: series.slice(0, 12).reverse(),
      byCategory: Object.entries(byCategory).map(([category, value]) => ({
        category,
        ...value,
      })),
      campaignOptions: all.slice(0, 100).map((c) => ({ id: c._id, name: c.campaignName })),
    };
  },
});

export const previewAudience = query({
  args: {
    audience: v.string(),
    userIds: v.optional(v.array(v.id("users"))),
    filters: filtersValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;

    const { recipients, counts } = await resolvePushAudience(ctx, {
      audience: args.audience,
      userIds: args.userIds,
      filters: args.filters,
    });

    return {
      total: recipients.length,
      counts,
      sample: recipients.slice(0, 100).map((entry) => ({
        _id: entry.user._id,
        name: entry.user.name ?? "Utilisateur",
        email: entry.user.email ?? "",
        userRole: entry.user.userRole ?? "client",
        platform: entry.token.platform,
        lastSeenAt: entry.token.lastSeenAt ?? entry.token.updatedAt,
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

    const [users, tokens] = await Promise.all([
      ctx.db.query("users").take(5000),
      ctx.db.query("pushTokens").take(20000),
    ]);
    const withDevice = new Set(
      tokens
        .filter((t) => t.isActive && t.permissionStatus === "granted")
        .map((t) => String(t.userId)),
    );

    return users
      .filter((u) => withDevice.has(String(u._id)) && u.pushOptOut !== true)
      .filter(
        (u) =>
          (u.email || "").toLowerCase().includes(term) ||
          (u.name || "").toLowerCase().includes(term),
      )
      .slice(0, 20)
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "Utilisateur",
        email: u.email ?? "",
        userRole: u.userRole ?? "client",
      }));
  },
});

/** Indicateurs légers pour le tableau de bord admin (compteurs d'appareils). */
export const getTokenSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;
    const tokens = await ctx.db.query("pushTokens").take(20000);
    return {
      total: tokens.length,
      active: tokens.filter((t) => t.isActive).length,
      granted: tokens.filter((t) => t.isActive && t.permissionStatus === "granted").length,
      denied: tokens.filter((t) => t.permissionStatus === "denied").length,
    };
  },
});
