import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  TRIAL_DEFAULT_DAYS,
  DEFAULT_TRIAL_MODULES,
  DEFAULT_TRIAL_PROFILES,
  TRIAL_MAX_DAYS,
  TRIAL_MIN_DAYS,
  isTrialExcludedProfile,
  isTrialModuleKey,
  isTrialProfileKey,
  sanitizeTrialModules,
  sanitizeTrialProfiles,
  type TrialModuleKey,
  type TrialProfileKey,
} from "../lib/subscriptionPlans";
import { defaultPlanPriceFields } from "../lib/planPricing";

/** Durée par défaut de l'essai de chaque abonnement professionnel. */
const TRIAL_EXPERT_DEFAULT_DAYS = 7;
const TRIAL_SUPPLIER_DEFAULT_DAYS = 7;

// ============================================================================
// PÉRIODE D'ESSAI GRATUITE — ABONNEMENTS MENSUELS EXPERT / FOURNISSEUR
// ============================================================================
// Le forfait Client Pro n'est plus un abonnement mensuel : il fonctionne par
// crédits de projets (`convex/clientProCredits.ts`). La période d'essai est
// donc réservée aux DEUX abonnements professionnels, avec des paramètres
// INDÉPENDANTS :
//   • activation propre à chaque forfait ;
//   • durée propre à chaque forfait (jours) ;
//   • services inclus (modules ouverts pendant l'essai) ;
//   • conditions de renouvellement (mensuel, sans reconduction automatique).
//
// Toutes les décisions (démarrage de l'essai, droits pendant l'essai) sont
// prises CÔTÉ SERVEUR à partir de cette configuration : l'interface ne fait
// que l'afficher, elle ne peut pas accorder de droits.
// ============================================================================

export interface TrialConfig {
  /** Campagne d'essai ouverte (interrupteur général + fenêtre de dates). */
  enabled: boolean;
  /** Durée commune (repli quand un forfait n'a pas de durée dédiée). */
  durationDays: number;
  /** Legacy : durée Client Pro (conservée en lecture, sans effet). */
  clientProDurationDays: number | null;
  /** Essai de l'abonnement mensuel Expert. */
  expertTrialEnabled: boolean;
  expertTrialDays: number;
  /** Essai de l'abonnement mensuel Fournisseur. */
  supplierTrialEnabled: boolean;
  supplierTrialDays: number;
  validFrom: number | null;
  validUntil: number | null;
  /** Profils éligibles (Expert / Fournisseur uniquement). */
  eligibleProfiles: TrialProfileKey[];
  /** Modules ouverts pendant l'essai. */
  modules: TrialModuleKey[];
  newAccountsOnly: boolean;
}

export const DEFAULT_TRIAL_CONFIG: TrialConfig = {
  enabled: false,
  durationDays: TRIAL_DEFAULT_DAYS,
  clientProDurationDays: null,
  expertTrialEnabled: true,
  expertTrialDays: TRIAL_EXPERT_DEFAULT_DAYS,
  supplierTrialEnabled: true,
  supplierTrialDays: TRIAL_SUPPLIER_DEFAULT_DAYS,
  validFrom: null,
  validUntil: null,
  eligibleProfiles: DEFAULT_TRIAL_PROFILES,
  modules: DEFAULT_TRIAL_MODULES,
  newAccountsOnly: false,
};

export interface TrialConfigSource {
  trialEnabled?: boolean | null;
  trialDurationDays?: number | null;
  trialClientProDurationDays?: number | null;
  expertTrialEnabled?: boolean | null;
  expertTrialDays?: number | null;
  supplierTrialEnabled?: boolean | null;
  supplierTrialDays?: number | null;
  trialValidFrom?: number | null;
  trialValidUntil?: number | null;
  trialEligibleProfiles?: string[] | null;
  trialModules?: string[] | null;
  trialNewAccountsOnly?: boolean | null;
  proPrice?: number | null;
  freePlanEnabled?: boolean | null;
}

export function clampTrialDays(days: number | null | undefined): number {
  const value =
    typeof days === "number" && Number.isFinite(days) ? Math.round(days) : TRIAL_DEFAULT_DAYS;
  return Math.min(TRIAL_MAX_DAYS, Math.max(TRIAL_MIN_DAYS, value));
}

/** Legacy : conservé pour la lecture des documents anciens (sans effet). */
export function clampClientProTrialDays(days: number | null | undefined): number | null {
  if (days == null || !Number.isFinite(days)) return null;
  return clampTrialDays(days);
}

/**
 * Normalise la configuration enregistrée.
 *
 * SEUL `trialEnabled` commande l'ouverture de la campagne. Chaque forfait
 * professionnel conserve ensuite son propre interrupteur : couper l'essai
 * Expert ne coupe pas l'essai Fournisseur. Un document historique (sans les
 * nouveaux champs) hérite de l'interrupteur commun, ce qui préserve le
 * comportement existant sans jamais accorder d'essai Client Pro.
 */
export function normalizeTrialConfig(source: TrialConfigSource | null | undefined): TrialConfig {
  const enabled = source?.trialEnabled === true;

  return {
    enabled,
    durationDays: clampTrialDays(source?.trialDurationDays),
    clientProDurationDays: clampClientProTrialDays(source?.trialClientProDurationDays),
    expertTrialEnabled:
      source?.expertTrialEnabled === undefined ? enabled : source.expertTrialEnabled === true,
    expertTrialDays: clampTrialDays(
      source?.expertTrialDays ?? source?.trialDurationDays ?? TRIAL_EXPERT_DEFAULT_DAYS,
    ),
    supplierTrialEnabled:
      source?.supplierTrialEnabled === undefined ? enabled : source.supplierTrialEnabled === true,
    supplierTrialDays: clampTrialDays(
      source?.supplierTrialDays ?? source?.trialDurationDays ?? TRIAL_SUPPLIER_DEFAULT_DAYS,
    ),
    validFrom: typeof source?.trialValidFrom === "number" ? source.trialValidFrom : null,
    validUntil: typeof source?.trialValidUntil === "number" ? source.trialValidUntil : null,
    eligibleProfiles: source?.trialEligibleProfiles
      ? sanitizeTrialProfiles(source.trialEligibleProfiles)
      : DEFAULT_TRIAL_PROFILES,
    modules: source?.trialModules
      ? sanitizeTrialModules(source.trialModules)
      : DEFAULT_TRIAL_MODULES,
    newAccountsOnly: source?.trialNewAccountsOnly === true,
  };
}

/** Erreurs de validation (liste vide = configuration valide). */
export function validateTrialConfig(config: TrialConfig): string[] {
  const errors: string[] = [];

  const checkDays = (days: number, label: string) => {
    if (!Number.isInteger(days)) {
      errors.push(`${label} : la durée doit être un nombre entier de jours.`);
    } else if (days < TRIAL_MIN_DAYS || days > TRIAL_MAX_DAYS) {
      errors.push(`${label} : la durée doit être comprise entre ${TRIAL_MIN_DAYS} et ${TRIAL_MAX_DAYS} jours.`);
    }
  };

  checkDays(config.durationDays, "Durée commune de l'essai");
  checkDays(config.expertTrialDays, "Durée de l'essai Expert");
  checkDays(config.supplierTrialDays, "Durée de l'essai Fournisseur");

  if (config.validFrom != null && !Number.isFinite(config.validFrom)) {
    errors.push("La date de début de la période d'essai est invalide.");
  }
  if (config.validUntil != null && !Number.isFinite(config.validUntil)) {
    errors.push("La date de fin de la période d'essai est invalide.");
  }
  if (config.validFrom != null && config.validUntil != null && config.validUntil <= config.validFrom) {
    errors.push("La date de fin doit être postérieure à la date de début.");
  }

  if (config.eligibleProfiles.length === 0) {
    errors.push("Sélectionnez au moins un profil éligible à la période d'essai.");
  }
  if (!config.expertTrialEnabled && !config.supplierTrialEnabled) {
    errors.push("Activez au moins un forfait professionnel pour la période d'essai.");
  }
  if (config.modules.length === 0) {
    errors.push("Sélectionnez au moins un module accessible pendant la période d'essai.");
  }

  return errors;
}

/** La campagne d'essai est-elle ouverte à cet instant (dates + activation) ? */
export function isTrialCampaignOpen(config: TrialConfig, now = Date.now()): boolean {
  if (!config.enabled) return false;
  if (config.validFrom != null && now < config.validFrom) return false;
  if (config.validUntil != null && now > config.validUntil) return false;
  return true;
}

/**
 * Ce profil peut-il bénéficier de l'essai ?
 *
 * Client Pro est TOUJOURS exclu : ses droits viennent des crédits de projets.
 * Pour Expert / Fournisseur, le profil doit être coché ET son forfait doit
 * avoir son propre essai activé.
 */
export function isProfileEligibleForTrial(
  config: TrialConfig,
  profileRole: string | null | undefined,
): boolean {
  if (isTrialExcludedProfile(profileRole)) return false;
  if (profileRole === "expert" && !config.expertTrialEnabled) return false;
  if (profileRole === "supplier" && !config.supplierTrialEnabled) return false;
  return config.eligibleProfiles.includes(profileRole as TrialProfileKey);
}

/** Durée d'essai applicable au forfait du profil (jours réglés par l'admin). */
export function trialDaysFor(
  config: TrialConfig,
  profileRole: string | null | undefined,
): number {
  if (profileRole === "expert") return config.expertTrialDays;
  if (profileRole === "supplier") return config.supplierTrialDays;
  // Client Pro (ou profil inconnu) : aucune période d'essai.
  return config.durationDays;
}

/** Un module est-il ouvert pendant l'essai ? */
export function trialIncludes(config: TrialConfig, module: TrialModuleKey): boolean {
  return config.modules.includes(module);
}

/**
 * Date de fin d'un essai démarré à `startedAt`. L'essai ne dépasse JAMAIS la
 * fin de la campagne lorsqu'une fenêtre globale est définie.
 */
export function trialEndDateFor(
  config: TrialConfig,
  startedAt: number,
  days: number = config.durationDays,
): number {
  const nominalEnd = startedAt + days * 24 * 60 * 60 * 1000;
  if (config.validUntil != null) return Math.min(nominalEnd, config.validUntil);
  return nominalEnd;
}

// ============================================================================
// Lecture / écriture (Convex)
// ============================================================================

type DbCtx = QueryCtx | MutationCtx;

/** Configuration d'essai en vigueur (lecture serveur). */
export async function readTrialConfig(ctx: DbCtx): Promise<TrialConfig> {
  const config = await ctx.db.query("paymentConfig").order("desc").first();
  return normalizeTrialConfig(config as TrialConfigSource | null);
}

/** Configuration complète + statistiques (administration). */
export const getTrialConfig = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return null;

    const config = await readTrialConfig(ctx);

    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    let activeTrials = 0;
    let expiredTrials = 0;
    let legacyFreePlanAccounts = 0;
    for (const user of users) {
      if (user.subscriptionPlan === "free") legacyFreePlanAccounts++;
      if (user.trialEndDate != null && user.trialEndDate > now) activeTrials++;
      else if (user.trialClaimedAt != null) expiredTrials++;
    }

    return {
      config,
      stats: {
        activeTrials,
        expiredTrials,
        legacyFreePlanAccounts,
        campaignOpen: isTrialCampaignOpen(config, now),
      },
    };
  },
});

/** Informations publiques (page Abonnements) — jamais de données personnelles. */
export const getPublicTrialConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await readTrialConfig(ctx);
    return {
      enabled: isTrialCampaignOpen(config),
      durationDays: config.durationDays,
      expertTrialEnabled: config.expertTrialEnabled,
      expertTrialDays: config.expertTrialDays,
      supplierTrialEnabled: config.supplierTrialEnabled,
      supplierTrialDays: config.supplierTrialDays,
      eligibleProfiles: config.eligibleProfiles,
      modules: config.modules,
      validUntil: config.validUntil,
    };
  },
});

function requireAdmin<T extends { role?: string | null } | null>(user: T): NonNullable<T> {
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user as NonNullable<T>;
}

/** Enregistre la configuration de la période d'essai (admin uniquement). */
export const updateTrialConfig = mutation({
  args: {
    enabled: v.boolean(),
    durationDays: v.number(),
    // Legacy : accepté pour compatibilité, sans effet sur Client Pro.
    clientProDurationDays: v.optional(v.union(v.number(), v.null())),
    expertTrialEnabled: v.optional(v.boolean()),
    expertTrialDays: v.optional(v.number()),
    supplierTrialEnabled: v.optional(v.boolean()),
    supplierTrialDays: v.optional(v.number()),
    validFrom: v.union(v.number(), v.null()),
    validUntil: v.union(v.number(), v.null()),
    eligibleProfiles: v.array(v.string()),
    modules: v.array(v.string()),
    newAccountsOnly: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getCurrentUser(ctx));

    const unknownProfile = args.eligibleProfiles.find((p) => !isTrialProfileKey(p));
    if (unknownProfile) throw new Error(`Profil inconnu : « ${unknownProfile} ».`);
    const unknownModule = args.modules.find((m) => !isTrialModuleKey(m));
    if (unknownModule) throw new Error(`Module inconnu : « ${unknownModule} ».`);

    const current = await readTrialConfig(ctx);

    const validateDays = (days: number, label: string) => {
      if (!Number.isInteger(days) || days < TRIAL_MIN_DAYS || days > TRIAL_MAX_DAYS) {
        throw new Error(
          `${label} : la durée doit être comprise entre ${TRIAL_MIN_DAYS} et ${TRIAL_MAX_DAYS} jours.`,
        );
      }
    };
    validateDays(args.durationDays, "Durée commune de l'essai");

    const expertTrialDays = args.expertTrialDays ?? current.expertTrialDays;
    const supplierTrialDays = args.supplierTrialDays ?? current.supplierTrialDays;
    validateDays(expertTrialDays, "Durée de l'essai Expert");
    validateDays(supplierTrialDays, "Durée de l'essai Fournisseur");

    const next: TrialConfig = {
      enabled: args.enabled,
      durationDays: args.durationDays,
      clientProDurationDays:
        args.clientProDurationDays === undefined
          ? current.clientProDurationDays
          : args.clientProDurationDays,
      expertTrialEnabled: args.expertTrialEnabled ?? current.expertTrialEnabled,
      expertTrialDays,
      supplierTrialEnabled: args.supplierTrialEnabled ?? current.supplierTrialEnabled,
      supplierTrialDays,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      eligibleProfiles: sanitizeTrialProfiles(args.eligibleProfiles),
      modules: sanitizeTrialModules(args.modules),
      newAccountsOnly: args.newAccountsOnly,
    };

    const errors = validateTrialConfig(next);
    if (errors.length > 0) throw new Error(errors.join(" "));

    const now = Date.now();
    const existing = await ctx.db.query("paymentConfig").order("desc").first();
    const stored = {
      trialEnabled: next.enabled,
      trialDurationDays: next.durationDays,
      trialClientProDurationDays: next.clientProDurationDays ?? undefined,
      expertTrialEnabled: next.expertTrialEnabled,
      expertTrialDays: next.expertTrialDays,
      supplierTrialEnabled: next.supplierTrialEnabled,
      supplierTrialDays: next.supplierTrialDays,
      trialValidFrom: next.validFrom ?? undefined,
      trialValidUntil: next.validUntil ?? undefined,
      trialEligibleProfiles: next.eligibleProfiles,
      trialModules: next.modules,
      trialNewAccountsOnly: next.newAccountsOnly,
    };

    if (existing) {
      await ctx.db.patch(existing._id, { ...stored, updatedAt: now, updatedBy: admin._id });
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
        ...stored,
        updatedAt: now,
        updatedBy: admin._id,
      } as any);
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "update_trial_config",
        details:
          `Essai ${next.enabled ? "activé" : "désactivé"} — Expert ${
            next.expertTrialEnabled ? `${next.expertTrialDays} j` : "désactivé"
          }, Fournisseur ${
            next.supplierTrialEnabled ? `${next.supplierTrialDays} j` : "désactivé"
          } · profils : ${next.eligibleProfiles.join(", ")} · modules : ${next.modules.join(", ")}`,
        createdAt: now,
      });
    } catch {
      // Journal optionnel : ne bloque jamais l'enregistrement des paramètres.
    }

    return { success: true, config: next };
  },
});

/** Réinitialise les paramètres d'essai aux valeurs par défaut (admin uniquement). */
export const resetTrialConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = requireAdmin(await getCurrentUser(ctx));

    const now = Date.now();
    const stored = {
      trialEnabled: DEFAULT_TRIAL_CONFIG.enabled,
      trialDurationDays: DEFAULT_TRIAL_CONFIG.durationDays,
      trialClientProDurationDays: undefined,
      expertTrialEnabled: DEFAULT_TRIAL_CONFIG.expertTrialEnabled,
      expertTrialDays: DEFAULT_TRIAL_CONFIG.expertTrialDays,
      supplierTrialEnabled: DEFAULT_TRIAL_CONFIG.supplierTrialEnabled,
      supplierTrialDays: DEFAULT_TRIAL_CONFIG.supplierTrialDays,
      trialValidFrom: undefined,
      trialValidUntil: undefined,
      trialEligibleProfiles: DEFAULT_TRIAL_CONFIG.eligibleProfiles,
      trialModules: DEFAULT_TRIAL_CONFIG.modules,
      trialNewAccountsOnly: DEFAULT_TRIAL_CONFIG.newAccountsOnly,
    };

    const existing = await ctx.db.query("paymentConfig").order("desc").first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...stored, updatedAt: now, updatedBy: admin._id });
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
        ...stored,
        updatedAt: now,
        updatedBy: admin._id,
      } as any);
    }

    return { success: true, config: DEFAULT_TRIAL_CONFIG };
  },
});
