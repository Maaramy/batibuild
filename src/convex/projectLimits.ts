import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";
import { getUserSubscriptionStatus } from "./subscriptionStatus";
import { isFreeOffer } from "./subscriptionPeriods";
import type { Id } from "./_generated/dataModel";
import {
  DEFAULT_PROJECT_LIMIT_CONFIG,
  PROJECT_LIMIT_MARKER,
  PROJECT_LIMIT_MAX,
  PROJECT_LIMIT_MIN,
  PROJECT_LIMIT_TIER_LABELS,
  UNLIMITED_PROJECT_LIMIT,
  evaluateProjectLimit,
  normalizeProjectLimitConfig,
  projectLimitPeriodStart,
  projectLimitReachedMessage,
  projectLimitStoragePatch,
  resolveProjectLimitTier,
  validateProjectLimitConfig,
  type ProjectLimitConfig,
  type ProjectLimitConfigSource,
  type ProjectLimitStatus,
  type ProjectLimitTier,
} from "../lib/projectLimits";
import { defaultPlanPriceFields } from "../lib/planPricing";

// ============================================================================
// LIMITE DU NOMBRE DE PROJETS PAR OFFRE — CONTRÔLE SERVEUR (source de vérité)
// ----------------------------------------------------------------------------
// L'administrateur active un plafond de projets pour la période d'essai, pour
// l'offre gratuite et — facultativement — pour Client Pro payant
// (Admin → Abonnements mensuels → Prix et configuration).
//
// La limite est vérifiée DANS LA MÊME TRANSACTION que l'insertion du projet
// (`projects.createProject`), donc :
//   • impossible de la contourner depuis l'interface (site web ou WebView) ;
//   • aucune création simultanée ne peut dépasser le plafond ;
//   • les projets DÉJÀ créés ne sont ni supprimés, ni verrouillés.
//
// Les projets existants restent consultables et modifiables : seule la
// CRÉATION d'un nouveau projet est refusée lorsque le plafond est atteint.
// ============================================================================

export { PROJECT_LIMIT_MARKER };

type DbCtx = QueryCtx | MutationCtx;

/** Configuration en vigueur (lecture serveur, jamais une valeur du client). */
export async function readProjectLimitConfig(ctx: DbCtx): Promise<ProjectLimitConfig> {
  const config = await ctx.db.query("paymentConfig").order("desc").first();
  return normalizeProjectLimitConfig(config as ProjectLimitConfigSource | null);
}

/**
 * Nombre de projets du compte dans la fenêtre de décompte.
 * `since == null` → tous les projets du compte (« total cumulé »).
 */
export async function countUserProjects(
  ctx: DbCtx,
  userId: Id<"users">,
  since: number | null,
): Promise<number> {
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (since == null) return projects.length;
  return projects.filter((p) => (p.createdAt ?? 0) >= since).length;
}

/**
 * État de la limite de projets de l'utilisateur (offre, plafond, consommation).
 * Administrateurs et modérateurs ne sont jamais limités.
 */
export async function resolveProjectCreationLimit(
  ctx: DbCtx,
  user: any,
  snapshotInput?: Awaited<ReturnType<typeof getUserSubscriptionStatus>> | null,
): Promise<ProjectLimitStatus> {
  if (!user) return UNLIMITED_PROJECT_LIMIT;
  if (user.role === "admin" || user.role === "moderator") return UNLIMITED_PROJECT_LIMIT;

  const snapshot =
    snapshotInput === undefined
      ? await getUserSubscriptionStatus(ctx, user._id as Id<"users">)
      : snapshotInput;

  const tier = resolveProjectLimitTier({
    type: snapshot?.type ?? null,
    isActive: snapshot?.isActive ?? false,
    price: snapshot?.price ?? null,
    isFreeOffer: isFreeOffer(snapshot?.price ?? null),
  });
  if (!tier) return { ...UNLIMITED_PROJECT_LIMIT };

  const config = await readProjectLimitConfig(ctx);
  const rule = config[tier];
  if (!rule.enabled) return { ...UNLIMITED_PROJECT_LIMIT, tier };

  const since = projectLimitPeriodStart(rule, tier, {
    trialStartDate: snapshot?.trialStartDate ?? user.trialStartDate ?? null,
    subscriptionStartDate: snapshot?.subscriptionStartDate ?? user.subscriptionStartDate ?? null,
  });
  const used = await countUserProjects(ctx, user._id as Id<"users">, since);
  return evaluateProjectLimit(rule, tier, used);
}

/**
 * Lève une erreur explicite (avec marqueur) si le plafond de l'offre est
 * atteint. Appelée par `projects.createProject` avant toute insertion.
 */
export async function assertProjectCreationLimit(
  ctx: MutationCtx,
  user: any,
  snapshot?: Awaited<ReturnType<typeof getUserSubscriptionStatus>> | null,
): Promise<void> {
  const limit = await resolveProjectCreationLimit(ctx, user, snapshot);
  if (limit.allowed) return;
  const tier = (limit.tier ?? "trial") as ProjectLimitTier;
  throw new Error(
    `${PROJECT_LIMIT_MARKER}${projectLimitReachedMessage(tier, limit.maxProjects ?? 1)}`,
  );
}

// ============================================================================
// Queries / mutations
// ============================================================================

/** Configuration complète (administration uniquement). */
export const getProjectLimitConfig = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return null;
    return { config: await readProjectLimitConfig(ctx) };
  },
});

/**
 * État de la limite pour l'utilisateur connecté (réactif) : sert à afficher le
 * compteur et à bloquer l'interface AVANT toute tentative de création. Le
 * backend revérifie quoi qu'il arrive.
 */
export const getMyProjectLimit = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const limit = await resolveProjectCreationLimit(ctx, user);
    return {
      ...limit,
      tierLabel: limit.tier ? PROJECT_LIMIT_TIER_LABELS[limit.tier] : null,
      message:
        !limit.allowed && limit.tier
          ? projectLimitReachedMessage(limit.tier, limit.maxProjects ?? 1)
          : null,
      upgradeUrl: "/dashboard/pricing",
    };
  },
});

/** Enregistre les plafonds de projets par offre (admin uniquement). */
export const updateProjectLimitConfig = mutation({
  args: {
    trial: v.object({
      enabled: v.boolean(),
      maxProjects: v.number(),
      resetMode: v.union(v.literal("offer"), v.literal("total")),
    }),
    free: v.object({
      enabled: v.boolean(),
      maxProjects: v.number(),
      resetMode: v.union(v.literal("offer"), v.literal("total")),
    }),
    paid: v.object({
      enabled: v.boolean(),
      maxProjects: v.number(),
      resetMode: v.union(v.literal("offer"), v.literal("total")),
    }),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const next: ProjectLimitConfig = {
      trial: {
        enabled: args.trial.enabled,
        maxProjects: args.trial.maxProjects,
        resetMode: args.trial.resetMode,
      },
      free: {
        enabled: args.free.enabled,
        maxProjects: args.free.maxProjects,
        resetMode: args.free.resetMode,
      },
      paid: {
        enabled: args.paid.enabled,
        maxProjects: args.paid.maxProjects,
        resetMode: args.paid.resetMode,
      },
    };

    // Validation stricte : une valeur hors bornes est REFUSÉE (jamais corrigée
    // en silence), pour que les paramètres enregistrés soient exactement ceux
    // saisis par l'administrateur.
    const outOfRange = ([next.trial, next.free, next.paid] as const).find(
      (rule) =>
        !Number.isInteger(rule.maxProjects) ||
        rule.maxProjects < PROJECT_LIMIT_MIN ||
        rule.maxProjects > PROJECT_LIMIT_MAX,
    );
    if (outOfRange) {
      throw new Error(
        `Le nombre maximal de projets doit être compris entre ${PROJECT_LIMIT_MIN} et ${PROJECT_LIMIT_MAX}.`,
      );
    }
    const errors = validateProjectLimitConfig(next);
    if (errors.length > 0) throw new Error(errors.join(" "));

    const now = Date.now();
    const patch = { ...projectLimitStoragePatch(next), updatedAt: now, updatedBy: admin._id };

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
        // Un nouveau document de configuration porte TOUJOURS les prix des
        // forfaits (voir `lib/planPricing.ts`) : sans eux, le prix enregistré
        // par l'administrateur était perdu à la prochaine sauvegarde.
        ...defaultPlanPriceFields(),
        ...patch,
      } as any);
    }

    try {
      const describe = (tier: ProjectLimitTier) => {
        const rule = next[tier];
        return rule.enabled
          ? `${PROJECT_LIMIT_TIER_LABELS[tier]} : ${rule.maxProjects} projet(s)`
          : `${PROJECT_LIMIT_TIER_LABELS[tier]} : illimité`;
      };
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "update_project_limits",
        details: (["trial", "free", "paid"] as ProjectLimitTier[]).map(describe).join(" · "),
        createdAt: now,
      });
    } catch {
      // Journal optionnel : ne bloque jamais l'enregistrement des paramètres.
    }

    return { success: true, config: next };
  },
});

/** Réinitialise les plafonds (aucune limite) — admin uniquement. */
export const resetProjectLimitConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const now = Date.now();
    const patch = {
      ...projectLimitStoragePatch(DEFAULT_PROJECT_LIMIT_CONFIG),
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
        // Un nouveau document de configuration porte TOUJOURS les prix des
        // forfaits (voir `lib/planPricing.ts`) : sans eux, le prix enregistré
        // par l'administrateur était perdu à la prochaine sauvegarde.
        ...defaultPlanPriceFields(),
        ...patch,
      } as any);
    }

    return { success: true, config: DEFAULT_PROJECT_LIMIT_CONFIG };
  },
});
