import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { resolveProfileRole } from "./profileSubscription";
import { assertPaymentMethodEnabled } from "./paymentMethodStates";
import { issueInvoice } from "./invoices";
import { scheduleAdminNotification, scheduleEmailEvent, formatDateFr, splitName } from "./emailNotifications";
import {
  CLIENT_PRO_CREDITS_MARKER,
  CLIENT_PRO_PRICE_MAX,
  CLIENT_PRO_PRICE_MIN,
  CLIENT_PRO_PROJECT_MAX,
  CLIENT_PRO_PROJECT_MIN,
  DEFAULT_CLIENT_PRO_CREDIT_CONFIG,
  canCreateProjectWithCredits,
  canPurchaseCotisation,
  clientProCreditStoragePatch,
  clientProPackages,
  computeClientProBalance,
  initialFreeUsage,
  normalizeClientProCreditConfig,
  projectsLabel,
  validateClientProCreditConfig,
  type ClientProCreditBalance,
  type ClientProCreditConfig,
  type ClientProCreditConfigSource,
  type ClientProCreditPackage,
} from "../lib/clientProCredits";
import { defaultPlanPriceFields } from "../lib/planPricing";
import { isTrialCampaignOpen, readTrialConfig } from "./trialConfig";

// ============================================================================
// COTISATION CLIENT PRO — CRÉDITS DE PROJETS (source de vérité serveur)
// ============================================================================
// • la gratuité initiale est accordée UNE SEULE FOIS (`clientProFreeGrantedAt`) ;
// • chaque création de projet consomme un crédit dans LA MÊME TRANSACTION que
//   l'insertion du projet : aucune création simultanée ne peut dépasser le quota ;
// • une cotisation n'attribue des crédits qu'après confirmation du paiement par
//   un administrateur ; la transition pending → confirmed est unique ;
// • aucun abonnement mensuel n'est créé pour Client Pro ;
// • les droits Client Pro sont INDÉPENDANTS du forfait professionnel Expert /
//   Fournisseur : un même compte peut cumuler les deux.
// ============================================================================

type DbCtx = QueryCtx | MutationCtx;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Configuration en vigueur (relecture serveur systématique). */
export async function readClientProCreditConfig(
  ctx: DbCtx,
): Promise<ClientProCreditConfig> {
  const config = await ctx.db.query("paymentConfig").order("desc").first();
  return normalizeClientProCreditConfig(config as ClientProCreditConfigSource | null);
}

/* -------------------------------------------------------------------------- */
/* Solde & droits                                                             */
/* -------------------------------------------------------------------------- */

export interface ClientProCreditSnapshot {
  balance: ClientProCreditBalance;
  config: ClientProCreditConfig;
  packages: ClientProCreditPackage[];
  /** Gratuité initiale déjà accordée ? */
  freeGranted: boolean;
  freeGrantedAt: number | null;
  /** Un abonnement mensuel Client Pro historique (legacy) est-il encore actif ? */
  legacyMonthlyActive: boolean;
  legacyEndDate: number | null;
  /** L'utilisateur a-t-il droit aux services Client Pro ? */
  entitled: boolean;
  /** Peut-il créer un nouveau projet maintenant ? */
  canCreateProject: boolean;
}

/** Solde calculé depuis les compteurs persistés du compte. */
export function balanceFromUser(user: {
  clientProFreeProjectsGranted?: number | null;
  clientProFreeProjectsUsed?: number | null;
  clientProPaidProjectsGranted?: number | null;
  clientProPaidProjectsUsed?: number | null;
}): ClientProCreditBalance {
  return computeClientProBalance({
    freeGranted: user.clientProFreeProjectsGranted,
    freeUsed: user.clientProFreeProjectsUsed,
    paidGranted: user.clientProPaidProjectsGranted,
    paidUsed: user.clientProPaidProjectsUsed,
  });
}

/**
 * Abonnement Client Pro mensuel HISTORIQUE encore valide. Le modèle mensuel est
 * remplacé par les crédits, mais les paiements déjà confirmés ne sont jamais
 * révoqués : l'accès reste ouvert jusqu'à leur échéance.
 */
async function readLegacyMonthlyPro(
  ctx: DbCtx,
  userId: Id<"users">,
  now = Date.now(),
): Promise<{ active: boolean; endDate: number | null }> {
  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const active = subs.find(
    (sub) =>
      sub.plan === "pro" &&
      sub.status === "active" &&
      sub.endDate != null &&
      sub.endDate > now,
  );
  return { active: !!active, endDate: active?.endDate ?? null };
}

export async function buildClientProCreditSnapshot(
  ctx: DbCtx,
  user: Doc<"users">,
  now = Date.now(),
): Promise<ClientProCreditSnapshot> {
  const config = await readClientProCreditConfig(ctx);
  // Gratuité initiale pas encore matérialisée : on calcule le solde EFFECTIF
  // (les projets déjà existants consomment le quota) sans écrire — la query
  // reste pure. La matérialisation a lieu à la connexion / à la création d'un
  // projet, une seule fois (`clientProFreeGrantedAt`).
  let balance = balanceFromUser(user);
  if (user.clientProFreeGrantedAt == null && config.freeGrantEnabled) {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    balance = computeClientProBalance({
      freeGranted: config.freeProjects,
      freeUsed: initialFreeUsage(projects.length, config.freeProjects),
      paidGranted: user.clientProPaidProjectsGranted,
      paidUsed: user.clientProPaidProjectsUsed,
    });
  }
  const legacy = await readLegacyMonthlyPro(ctx, user._id, now);
  const entitled =
    user.role === "admin" ||
    user.role === "moderator" ||
    legacy.active ||
    balance.granted > 0;

  return {
    balance,
    config,
    packages: clientProPackages(config),
    freeGranted: user.clientProFreeGrantedAt != null,
    freeGrantedAt: user.clientProFreeGrantedAt ?? null,
    legacyMonthlyActive: legacy.active,
    legacyEndDate: legacy.endDate,
    entitled,
    canCreateProject:
      user.role === "admin" ||
      user.role === "moderator" ||
      legacy.active ||
      canCreateProjectWithCredits(balance),
  };
}

/**
 * Accorde la gratuité initiale UNE SEULE FOIS. Idempotent : un compte déjà
 * crédité n'est jamais re-crédité, même après déconnexion ou changement de
 * profil. Les projets déjà existants consomment le quota accordé : un ancien
 * compte ne reçoit pas de crédits en plus de ses projets.
 */
export async function ensureClientProFreeGrant(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"users"> | null> {
  const user = await ctx.db.get(userId);
  if (!user) return null;
  if (user.clientProFreeGrantedAt != null) return user;

  const config = await readClientProCreditConfig(ctx);
  const now = Date.now();

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const freeGranted = config.freeGrantEnabled ? config.freeProjects : 0;
  const freeUsed = initialFreeUsage(projects.length, freeGranted);

  await ctx.db.patch(userId, {
    clientProFreeGrantedAt: now,
    clientProFreeProjectsGranted: freeGranted,
    clientProFreeProjectsUsed: freeUsed,
    updatedAt: now,
  });

  if (freeGranted > 0) {
    try {
      await ctx.db.insert("clientProCreditEvents", {
        userId,
        type: "free_grant",
        projects: freeGranted,
        bucket: "free",
        note:
          freeUsed > 0
            ? `${projectsLabel(freeGranted)} gratuits accordés (${freeUsed} déjà consommés par les projets existants).`
            : `${projectsLabel(freeGranted)} gratuits accordés une seule fois.`,
        createdAt: now,
      });
    } catch {
      // Journal optionnel : l'attribution reste valide.
    }
  }

  const updated = await ctx.db.get(userId);
  return updated ?? user;
}

/**
 * Contrôle AVANT insertion d'un projet : crédits disponibles (ou abonnement
 * mensuel pro historique encore actif). Lève une erreur marquée sinon.
 */
export async function assertClientProProjectCredit(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<void> {
  if (user.role === "admin" || user.role === "moderator") return;

  const fresh = (await ensureClientProFreeGrant(ctx, user._id)) ?? user;
  const snapshot = await buildClientProCreditSnapshot(ctx, fresh);
  if (snapshot.canCreateProject) return;

  throw new Error(
    `${CLIENT_PRO_CREDITS_MARKER}${projectsLabel(snapshot.balance.granted)} au total, ` +
      `${projectsLabel(snapshot.balance.used)} déjà utilisés : payez une cotisation pour créer un nouveau projet. ` +
      "Vos projets existants restent accessibles et modifiables.",
  );
}

/**
 * Consomme un crédit pour un projet qui vient d'être créé. Appelée dans la
 * transaction de création : le solde et l'historique sont écrits ensemble.
 */
export async function consumeClientProCredit(
  ctx: MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user) return;
  if (user.role === "admin" || user.role === "moderator") return;

  // Un abonnement mensuel pro historique actif couvre la création : aucune
  // consommation de crédits (le client a payé sa période mensuelle).
  const legacy = await readLegacyMonthlyPro(ctx, userId);
  if (legacy.active) return;

  const balance = balanceFromUser(user);
  if (balance.remaining <= 0) {
    // Le contrôle a lieu AVANT l'insertion ; cette garde couvre une
    // configuration modifiée entre-temps. On refuse plutôt que d'écrire un
    // solde négatif.
    throw new Error(
      `${CLIENT_PRO_CREDITS_MARKER}Crédits Client Pro épuisés : le projet ne peut pas être créé.`,
    );
  }

  const useFree = balance.freeRemaining > 0;
  const now = Date.now();
  await ctx.db.patch(userId, {
    clientProFreeProjectsUsed: useFree
      ? (user.clientProFreeProjectsUsed ?? 0) + 1
      : user.clientProFreeProjectsUsed,
    clientProPaidProjectsUsed: useFree
      ? user.clientProPaidProjectsUsed
      : (user.clientProPaidProjectsUsed ?? 0) + 1,
    updatedAt: now,
  });

  await ctx.db.insert("clientProCreditEvents", {
    userId,
    type: "consume",
    projects: -1,
    bucket: useFree ? "free" : "paid",
    projectId,
    createdAt: now,
  });
}

/**
 * Rembourse le crédit consommé par un projet supprimé, si l'administrateur a
 * activé cette règle. Idempotent : un projet ne peut être remboursé qu'une fois.
 */
export async function refundClientProCredit(
  ctx: MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
): Promise<void> {
  const config = await readClientProCreditConfig(ctx);
  if (!config.refundOnDelete) return;

  const events = await ctx.db
    .query("clientProCreditEvents")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  const consume = events.find((e) => e.type === "consume");
  if (!consume) return;
  const alreadyRefunded = events.some((e) => e.type === "refund");
  if (alreadyRefunded) return;

  const user = await ctx.db.get(userId);
  if (!user) return;
  const now = Date.now();
  const bucket = consume.bucket === "free" ? "free" : "paid";

  await ctx.db.patch(userId, {
    clientProFreeProjectsUsed:
      bucket === "free"
        ? Math.max(0, (user.clientProFreeProjectsUsed ?? 0) - 1)
        : user.clientProFreeProjectsUsed,
    clientProPaidProjectsUsed:
      bucket === "paid"
        ? Math.max(0, (user.clientProPaidProjectsUsed ?? 0) - 1)
        : user.clientProPaidProjectsUsed,
    updatedAt: now,
  });

  await ctx.db.insert("clientProCreditEvents", {
    userId,
    type: "refund",
    projects: 1,
    bucket,
    projectId,
    note: "Projet supprimé : crédit restitué.",
    createdAt: now,
  });
}

/* -------------------------------------------------------------------------- */
/* Queries utilisateur                                                        */
/* -------------------------------------------------------------------------- */

/** Solde et possibilités de cotisation de l'utilisateur connecté (réactif). */
export const getMyClientProCredits = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await buildClientProCreditSnapshot(ctx, user);
  },
});

/** Demandes de cotisation de l'utilisateur (historique + demande en attente). */
export const getMyClientProOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("clientProCreditOrders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/** Journal des mouvements de crédits de l'utilisateur connecté. */
export const getMyClientProCreditHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("clientProCreditEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});

/* -------------------------------------------------------------------------- */
/* Achat d'une cotisation                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Demande de cotisation : crée une commande « pending » et une facture
 * « en attente ». AUCUN crédit n'est attribué à ce stade.
 */
export const requestClientProCotisation = mutation({
  args: {
    projects: v.number(),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const config = await readClientProCreditConfig(ctx);
    const pack = clientProPackages(config).find((p) => p.projects === args.projects);
    if (!pack) {
      throw new Error(
        "Cette quantité de projets n'est pas proposée. Rechargez la page pour voir les cotisations disponibles.",
      );
    }

    const balance = balanceFromUser(user);
    if (!canPurchaseCotisation(config, balance)) {
      throw new Error(
        "Vous disposez encore de crédits de projets. Utilisez-les avant de payer une nouvelle cotisation.",
      );
    }

    const pending = await ctx.db
      .query("clientProCreditOrders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (pending.some((order) => order.status === "pending")) {
      throw new Error(
        "Une cotisation est déjà en attente de validation. Joignez votre justificatif ou patientez.",
      );
    }

    if (pack.price > 0) {
      await assertPaymentMethodEnabled(ctx, args.paymentMethod);
    }

    const now = Date.now();
    const orderId = await ctx.db.insert("clientProCreditOrders", {
      userId: user._id,
      projects: pack.projects,
      price: pack.price,
      currency: "TND",
      status: "pending",
      paymentMethod: args.paymentMethod,
      createdAt: now,
      updatedAt: now,
    });

    // Facture « en attente » — le montant est FIGÉ à la commande. Un changement
    // de tarif ultérieur ne modifie jamais cette facture.
    const profileRole = await resolveProfileRole(ctx, user);
    const profileType =
      profileRole === "supplier" ? "supplier" : profileRole === "expert" ? "expert" : "client";
    const invoice = await issueInvoice(ctx, {
      userId: user._id,
      subscriptionId: `clientProOrder:${orderId}`,
      plan: "pro",
      profileType,
      amountTTC: pack.price,
      currency: "TND",
      paymentMethod: args.paymentMethod,
      status: "pending",
      billingPeriodStart: now,
      billingPeriodEnd: now,
      customer: {
        name: user.name,
        email: user.email,
        company: user.company,
      },
    });
    await ctx.db.patch(orderId, { invoiceId: invoice._id, updatedAt: now });

    try {
      await scheduleAdminNotification(ctx, {
        templateKey: "admin_new_subscription",
        entityId: `client-pro-order:${orderId}`,
        vars: {
          ...splitName(user.name),
          email: user.email || "",
          profil: "Client Pro",
          typeAbonnement: `Cotisation Client Pro — ${projectsLabel(pack.projects)}`,
          montant: `${pack.price} TND`,
          statut: "En attente de validation du paiement",
          date: formatDateFr(now),
        },
      });
    } catch {
      // Best-effort
    }

    return { orderId, price: pack.price, projects: pack.projects, currency: "TND" };
  },
});

/** Justificatif de paiement d'une cotisation. */
export const uploadClientProPaymentProof = mutation({
  args: {
    orderId: v.id("clientProCreditOrders"),
    storageId: v.id("_storage"),
    url: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Cotisation introuvable");
    if (order.userId !== user._id) throw new Error("Cette cotisation ne vous appartient pas");
    if (order.status !== "pending") throw new Error("Cette cotisation n'est plus en attente");

    const resolvedUrl = (await ctx.storage.getUrl(args.storageId)) || args.url;
    await ctx.db.patch(args.orderId, {
      paymentProofStorageId: args.storageId,
      paymentProofUrl: resolvedUrl,
      paymentProofFileName: args.fileName || "recu_cotisation",
      paymentProofUploadedAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (order.invoiceId) {
      try {
        await ctx.db.patch(order.invoiceId, {
          paymentMethod: order.paymentMethod,
          updatedAt: Date.now(),
        });
      } catch {
        // Facture optionnelle
      }
    }

    return { success: true };
  },
});

/** Annulation d'une demande encore en attente (aucun crédit n'a été attribué). */
export const cancelClientProOrder = mutation({
  args: { orderId: v.id("clientProCreditOrders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Cotisation introuvable");
    if (order.userId !== user._id) throw new Error("Cette cotisation ne vous appartient pas");
    if (order.status !== "pending") {
      return { success: true, alreadyProcessed: true };
    }

    const now = Date.now();
    await ctx.db.patch(args.orderId, { status: "cancelled", updatedAt: now });
    if (order.invoiceId) {
      const invoice = await ctx.db.get(order.invoiceId);
      if (invoice && invoice.status === "pending") {
        await ctx.db.patch(invoice._id, {
          status: "cancelled",
          updatedAt: now,
        });
      }
    }
    return { success: true };
  },
});

/* -------------------------------------------------------------------------- */
/* Administration — configuration                                             */
/* -------------------------------------------------------------------------- */

function requireAdmin(user: Doc<"users"> | null): Doc<"users"> {
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

/** Configuration de la cotisation Client Pro (admin). */
export const getClientProCreditConfig = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return null;
    const config = await readClientProCreditConfig(ctx);
    return { config, packages: clientProPackages(config) };
  },
});

/** Configuration publique (page Abonnements) — aucune donnée personnelle. */
export const getPublicClientProCreditConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await readClientProCreditConfig(ctx);
    return {
      freeGrantEnabled: config.freeGrantEnabled,
      freeProjects: config.freeProjects,
      packages: clientProPackages(config),
      refundOnDelete: config.refundOnDelete,
      allowStacking: config.allowStacking,
    };
  },
});

/** Enregistrement de la configuration (admin uniquement). */
export const updateClientProCreditConfig = mutation({
  args: {
    freeGrantEnabled: v.boolean(),
    freeProjects: v.number(),
    cotisationPrice: v.number(),
    cotisationProjects: v.number(),
    tiers: v.array(
      v.object({
        projects: v.number(),
        price: v.number(),
      }),
    ),
    refundOnDelete: v.boolean(),
    allowStacking: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getCurrentUser(ctx));

    const next: ClientProCreditConfig = {
      freeGrantEnabled: args.freeGrantEnabled,
      freeProjects: args.freeProjects,
      cotisationPrice: args.cotisationPrice,
      cotisationProjects: args.cotisationProjects,
      tiers: args.tiers,
      refundOnDelete: args.refundOnDelete,
      allowStacking: args.allowStacking,
    };

    // Bornes strictes : une valeur hors limites est REFUSÉE, jamais corrigée
    // en silence (les paramètres enregistrés sont exactement ceux saisis).
    if (
      !Number.isInteger(next.freeProjects) ||
      next.freeProjects < 0 ||
      next.freeProjects > CLIENT_PRO_PROJECT_MAX
    ) {
      throw new Error(
        `Le nombre de projets gratuits doit être compris entre 0 et ${CLIENT_PRO_PROJECT_MAX}.`,
      );
    }
    if (
      !Number.isInteger(next.cotisationProjects) ||
      next.cotisationProjects < CLIENT_PRO_PROJECT_MIN ||
      next.cotisationProjects > CLIENT_PRO_PROJECT_MAX
    ) {
      throw new Error(
        `La cotisation doit inclure entre ${CLIENT_PRO_PROJECT_MIN} et ${CLIENT_PRO_PROJECT_MAX} projets.`,
      );
    }
    if (
      !Number.isFinite(next.cotisationPrice) ||
      next.cotisationPrice < CLIENT_PRO_PRICE_MIN ||
      next.cotisationPrice > CLIENT_PRO_PRICE_MAX
    ) {
      throw new Error("Le montant de la cotisation doit être un prix strictement positif.");
    }
    for (const tier of next.tiers) {
      if (
        !Number.isInteger(tier.projects) ||
        tier.projects < CLIENT_PRO_PROJECT_MIN ||
        tier.projects > CLIENT_PRO_PROJECT_MAX ||
        !Number.isFinite(tier.price) ||
        tier.price < CLIENT_PRO_PRICE_MIN ||
        tier.price > CLIENT_PRO_PRICE_MAX
      ) {
        throw new Error("Chaque pack doit avoir une quantité et un prix valides.");
      }
    }

    const errors = validateClientProCreditConfig(next);
    if (errors.length > 0) throw new Error(errors.join(" "));

    const now = Date.now();
    const patch = {
      ...clientProCreditStoragePatch(next),
      updatedAt: now,
      updatedBy: admin._id,
    };
    const existing = await ctx.db.query("paymentConfig").order("desc").first();
    if (existing) {
      await ctx.db.patch(existing._id, patch as any);
    } else {
      await ctx.db.insert("paymentConfig", {
        bankName: "",
        bankTitulaire: "",
        bankRib: "",
        bankIban: "",
        bankSwift: "",
        d17MerchantName: "",
        d17Phone: "",
        d17Email: "",
        d17Notice: "",
        currency: "TND",
        ...defaultPlanPriceFields(),
        ...patch,
      } as any);
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "update_client_pro_credits",
        details:
          `Cotisation Client Pro — gratuité ${next.freeGrantEnabled ? "activée" : "désactivée"} ` +
          `(${projectsLabel(next.freeProjects)}) · ${projectsLabel(next.cotisationProjects)} pour ` +
          `${next.cotisationPrice} TND · ${next.tiers.length} pack(s)`,
        createdAt: now,
      });
    } catch {
      // Journal optionnel
    }

    return { success: true, config: next, packages: clientProPackages(next) };
  },
});

/* -------------------------------------------------------------------------- */
/* Administration — suivi, approbation et attribution                         */
/* -------------------------------------------------------------------------- */

/** Demandes de cotisation (admin) — en attente d'abord. */
export const adminListClientProOrders = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return [];

    const orders = await ctx.db.query("clientProCreditOrders").order("desc").collect();
    const rows = await Promise.all(
      orders.map(async (order) => {
        const user = await ctx.db.get(order.userId);
        return {
          ...order,
          user: user
            ? {
                _id: user._id,
                name: user.name ?? null,
                email: user.email ?? null,
                phone: user.phone ?? null,
                company: user.company ?? null,
              }
            : null,
        };
      }),
    );
    return rows.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * CONFIRMATION du paiement d'une cotisation — attribue EXACTEMENT le nombre de
 * projets acheté. Idempotent : seule une commande « pending » peut être
 * confirmée, et la transition est atomique.
 */
export const adminApproveClientProOrder = mutation({
  args: { orderId: v.id("clientProCreditOrders") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      throw new Error("Unauthorized: Admin access required");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Cotisation introuvable");
    if (order.status === "confirmed") {
      return { success: true, alreadyConfirmed: true, grantedProjects: order.grantedProjects ?? 0 };
    }
    if (order.status !== "pending") {
      throw new Error("Cette cotisation n'est pas en attente de validation.");
    }

    const user = await ctx.db.get(order.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    const now = Date.now();
    const granted = Math.round(order.projects);

    // 1. Verrou d'idempotence : la commande n'est confirmable qu'une fois.
    await ctx.db.patch(args.orderId, {
      status: "confirmed",
      grantedProjects: granted,
      confirmedAt: now,
      confirmedBy: admin._id,
      updatedAt: now,
    });

    // 2. Attribution des crédits, dans la même transaction.
    await ctx.db.patch(user._id, {
      clientProPaidProjectsGranted: (user.clientProPaidProjectsGranted ?? 0) + granted,
      updatedAt: now,
    });
    await ctx.db.insert("clientProCreditEvents", {
      userId: user._id,
      type: "purchase",
      projects: granted,
      bucket: "paid",
      orderId: order._id,
      note: `Cotisation confirmée — ${projectsLabel(granted)}`,
      createdAt: now,
    });

    // 3. Facture du terme : elle passe en « payée » (historique conservé).
    if (order.invoiceId) {
      const invoice = await ctx.db.get(order.invoiceId);
      if (invoice) {
        await ctx.db.patch(invoice._id, {
          status: "paid",
          paymentDate: now,
          updatedAt: now,
        });
      }
    }

    // 4. Notifications.
    try {
      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "subscription",
        title: "Cotisation Client Pro confirmée",
        message: `${projectsLabel(granted)} ont été ajoutés à votre forfait Client Pro. Paiement validé, aucun renouvellement automatique.`,
        read: false,
        link: "/dashboard/pricing",
        createdAt: now,
      });
    } catch {
      // Optionnel
    }

    if (user.email && user.emailNotifications !== false) {
      await scheduleEmailEvent(ctx, {
        to: user.email,
        recipientName: user.name || undefined,
        templateKey: "payment_confirmed",
        vars: {
          ...splitName(user.name),
          typeAbonnement: `Cotisation Client Pro — ${projectsLabel(granted)}`,
          montant: `${order.price} ${order.currency}`,
          dateActivation: formatDateFr(now),
        },
        dedupeKey: `client_pro_order:${order._id}`,
        sendToAdmins: false,
      });
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "approve_client_pro_cotisation",
        targetUserId: user._id,
        targetUserEmail: user.email ?? undefined,
        details: `Cotisation Client Pro confirmée — ${projectsLabel(granted)} — ${order.price} ${order.currency}`,
        createdAt: now,
      });
    } catch {
      // Optionnel
    }

    return { success: true, grantedProjects: granted };
  },
});

/** Refus d'une cotisation en attente (aucun crédit attribué). */
export const adminRejectClientProOrder = mutation({
  args: {
    orderId: v.id("clientProCreditOrders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      throw new Error("Unauthorized: Admin access required");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Cotisation introuvable");
    if (order.status !== "pending") {
      return { success: true, alreadyProcessed: true };
    }

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: "rejected",
      rejectedAt: now,
      rejectionReason: args.reason,
      updatedAt: now,
    });

    if (order.invoiceId) {
      const invoice = await ctx.db.get(order.invoiceId);
      if (invoice && invoice.status === "pending") {
        await ctx.db.patch(invoice._id, { status: "cancelled", updatedAt: now });
      }
    }

    try {
      await ctx.db.insert("notifications", {
        userId: order.userId,
        type: "subscription",
        title: "Cotisation Client Pro refusée",
        message:
          args.reason?.trim() ||
          "Votre demande de cotisation n'a pas été validée. Aucun crédit n'a été attribué. Contactez le support pour plus d'informations.",
        read: false,
        link: "/dashboard/pricing",
        createdAt: now,
      });
    } catch {
      // Optionnel
    }

    return { success: true };
  },
});

/** Attribution manuelle de crédits (geste commercial) — tracée. */
export const adminGrantClientProCredits = mutation({
  args: {
    userId: v.id("users"),
    projects: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getCurrentUser(ctx));
    if (
      !Number.isInteger(args.projects) ||
      args.projects < CLIENT_PRO_PROJECT_MIN ||
      args.projects > CLIENT_PRO_PROJECT_MAX
    ) {
      throw new Error(
        `Le nombre de projets à attribuer doit être compris entre ${CLIENT_PRO_PROJECT_MIN} et ${CLIENT_PRO_PROJECT_MAX}.`,
      );
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    const now = Date.now();
    await ctx.db.patch(args.userId, {
      clientProPaidProjectsGranted:
        (user.clientProPaidProjectsGranted ?? 0) + Math.round(args.projects),
      updatedAt: now,
    });
    await ctx.db.insert("clientProCreditEvents", {
      userId: args.userId,
      type: "admin_grant",
      projects: Math.round(args.projects),
      bucket: "paid",
      note: args.note?.trim() || `Attribution manuelle par ${admin.name}`,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Vue de suivi administrateur : pour chaque utilisateur, profil, forfait
 * professionnel, essai, échéance, droits Client Pro et solde de projets.
 */
export const getSubscriptionFollowUp = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return [];

    const now = Date.now();
    const trial = await readTrialConfig(ctx);
    const trialOpen = isTrialCampaignOpen(trial, now);
    const config = await readClientProCreditConfig(ctx);
    const users = await ctx.db.query("users").collect();

    const rows = await Promise.all(
      users.map(async (user) => {
        const profileRole = await resolveProfileRole(ctx, user);
        const [supplier, expert, proSubs] = await Promise.all([
          ctx.db
            .query("supplierProfiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first(),
          ctx.db
            .query("expertProfiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first(),
          ctx.db
            .query("subscriptions")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect(),
        ]);

        const profile = profileRole === "expert" ? expert : profileRole === "supplier" ? supplier : null;
        const professionalStatus =
          profile?.subscriptionStatus === "trial" &&
          profile.trialStartDate != null &&
          profile.subscriptionEndDate != null &&
          profile.subscriptionEndDate > now
            ? "trial"
            : profile?.subscriptionStatus ?? null;

        const activeProMonthly = proSubs.find(
          (sub) =>
            sub.plan === "pro" &&
            sub.status === "active" &&
            sub.endDate != null &&
            sub.endDate > now,
        );
        const balance = balanceFromUser(user);

        return {
          userId: user._id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: profileRole,
          accountStatus: user.status ?? "active",
          professionalPlan: profile?.plan ?? null,
          professionalStatus,
          professionalEndDate: profile?.subscriptionEndDate ?? null,
          trialStartDate: profile?.trialStartDate ?? user.trialStartDate ?? null,
          trialEndDate: profile?.subscriptionEndDate ?? user.trialEndDate ?? null,
          visible: profile ? profile.isVisible : null,
          clientProStatus: activeProMonthly
            ? "legacy_monthly"
            : balance.remaining > 0
              ? "credits"
              : balance.granted > 0
                ? "credits_exhausted"
                : "none",
          clientProGranted: balance.granted,
          clientProUsed: balance.used,
          clientProRemaining: balance.remaining,
          clientProLegacyEndDate: activeProMonthly?.endDate ?? null,
          pendingCotisation: null as number | null,
          freeGrantEnabled: config.freeGrantEnabled,
          trialAvailable:
            trialOpen &&
            (profileRole === "expert" || profileRole === "supplier") &&
            trial.eligibleProfiles.includes(profileRole),
        };
      }),
    );

    const pendingOrders = await ctx.db
      .query("clientProCreditOrders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const pendingByUser = new Map<string, number>();
    for (const order of pendingOrders) {
      pendingByUser.set(
        String(order.userId),
        (pendingByUser.get(String(order.userId)) ?? 0) + order.projects,
      );
    }

    return rows
      .map((row) => ({
        ...row,
        pendingCotisation: pendingByUser.get(String(row.userId)) ?? null,
      }))
      .sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));
  },
});

/* -------------------------------------------------------------------------- */
/* Migration                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Migration : accorde la gratuité initiale aux comptes EXISTANTS, une seule
 * fois. Idempotent (le marqueur `clientProFreeGrantedAt` est immuable).
 * Aucune donnée (projets, paiements, abonnements) n'est supprimée ni modifiée.
 */
export const migrateClientProCredits = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getCurrentUser(ctx));
    const dryRun = args.dryRun === true;
    const config = await readClientProCreditConfig(ctx);
    const users = await ctx.db.query("users").collect();
    const candidates = users.filter((user) => user.clientProFreeGrantedAt == null);

    if (dryRun) {
      return {
        dryRun,
        candidates: candidates.length,
        granted: 0,
        freeProjects: config.freeGrantEnabled ? config.freeProjects : 0,
      };
    }

    let granted = 0;
    for (const user of candidates) {
      await ensureClientProFreeGrant(ctx, user._id);
      granted += 1;
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "migrate_client_pro_credits",
        details: `Crédits Client Pro : ${granted} compte(s) initialisé(s) — ${projectsLabel(
          config.freeGrantEnabled ? config.freeProjects : 0,
        )} gratuits (une seule fois). Aucune donnée supprimée.`,
        createdAt: Date.now(),
      });
    } catch {
      // Optionnel
    }

    return {
      dryRun,
      candidates: candidates.length,
      granted,
      freeProjects: config.freeGrantEnabled ? config.freeProjects : 0,
    };
  },
});

/** Point d'entrée interne (inscription / test). */
export const grantFreeCreditsOnSignup = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ensureClientProFreeGrant(ctx, args.userId);
    return { granted: user?.clientProFreeGrantedAt != null };
  },
});
