import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  TRIAL_DEFAULT_DAYS,
  DEFAULT_TRIAL_MODULES,
  DEFAULT_TRIAL_PROFILES,
  TRIAL_EXCLUDED_PROFILE,
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

// ============================================================================
// PÉRIODE D'ESSAI GRATUITE — CONFIGURATION ADMINISTRABLE (source de vérité)
// ============================================================================
// Remplace l'ancien forfait « Free » : plus aucune offre gratuite permanente
// n'est proposée. À la place, une période d'essai dont l'administrateur règle
// l'activation, la durée, la fenêtre de validité, les profils éligibles et les
// modules ouverts — sans modification du code source.
//
// IMPORTANT : le profil Client Pro est EXCLU de la période d'essai, à la fois
// dans le catalogue (`lib/subscriptionPlans.ts`) et ici côté serveur. Aucune
// configuration enregistrée ne peut lui accorder un essai automatique.
//
// Toutes les décisions (démarrage de l'essai, droits pendant l'essai) sont
// prises CÔTÉ SERVEUR à partir de cette configuration : l'interface ne fait que
// l'afficher, elle ne peut pas accorder de droits.
//
// Stockage : `paymentConfig` (document unique le plus récent), champs
// `trialEnabled`, `trialDurationDays`, `trialValidFrom`, `trialValidUntil`,
// `trialEligibleProfiles`, `trialModules`, `trialNewAccountsOnly`.
// Aucune donnée existante n'est supprimée : les estimations, projets,
// abonnements payants et comptes restent strictement inchangés.

export interface TrialConfig {
  /** Période d'essai proposée aux nouveaux comptes ? */
  enabled: boolean;
  /** Durée accordée à chaque nouvel essai (jours, 1 à 365). */
  durationDays: number;
  /** Début de la campagne (ms) — `null` = sans borne. */
  validFrom: number | null;
  /** Fin de la campagne (ms) — `null` = sans borne. */
  validUntil: number | null;
  /** Profils pouvant bénéficier de l'essai (Fournisseur / Expert uniquement). */
  eligibleProfiles: TrialProfileKey[];
  /** Modules ouverts pendant l'essai. */
  modules: TrialModuleKey[];
  /** Interdire le rattrapage des comptes existants (essai réservé aux nouveaux inscrits). */
  newAccountsOnly: boolean;
}

export const DEFAULT_TRIAL_CONFIG: TrialConfig = {
  enabled: false,
  durationDays: TRIAL_DEFAULT_DAYS,
  validFrom: null,
  validUntil: null,
  eligibleProfiles: DEFAULT_TRIAL_PROFILES,
  modules: DEFAULT_TRIAL_MODULES,
  newAccountsOnly: false,
};

/** Champs `paymentConfig` lus par ce module (tolérants : documents anciens). */
export interface TrialConfigSource {
  trialEnabled?: boolean | null;
  trialDurationDays?: number | null;
  trialValidFrom?: number | null;
  trialValidUntil?: number | null;
  trialEligibleProfiles?: string[] | null;
  trialModules?: string[] | null;
  trialNewAccountsOnly?: boolean | null;
  /** Legacy : l'ancien interrupteur d'offre gratuite (prix null/0). */
  proPrice?: number | null;
  freePlanEnabled?: boolean | null;
}

export function clampTrialDays(days: number | null | undefined): number {
  const value =
    typeof days === "number" && Number.isFinite(days) ? Math.round(days) : TRIAL_DEFAULT_DAYS;
  return Math.min(TRIAL_MAX_DAYS, Math.max(TRIAL_MIN_DAYS, value));
}

/**
 * Normalise la configuration enregistrée.
 *
 * Compatibilité : tant que l'administrateur n'a jamais enregistré la nouvelle
 * configuration (`trialEnabled` absent), l'ancien interrupteur « Offre
 * gratuite » (prix Client Pro null/0) continue de commander l'essai — le
 * comportement en production ne change donc pas au déploiement. Dès que
 * l'administrateur enregistre, `trialEnabled` fait foi.
 */
export function normalizeTrialConfig(source: TrialConfigSource | null | undefined): TrialConfig {
  // Sans aucun document `paymentConfig`, l'essai est DÉSACTIVÉ (aucune offre
  // gratuite par défaut). Le repli legacy ne s'applique qu'à un document
  // existant dont le prix Client Pro est explicitement null/0.
  const hasConfig = source != null;
  const legacyFreeOffer =
    hasConfig && (source!.proPrice === null || source!.proPrice === 0);
  const enabled =
    typeof source?.trialEnabled === "boolean" ? source.trialEnabled : legacyFreeOffer;

  return {
    enabled,
    durationDays: clampTrialDays(source?.trialDurationDays),
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

  if (!Number.isInteger(config.durationDays)) {
    errors.push("La durée de l'essai doit être un nombre entier de jours.");
  } else if (config.durationDays < TRIAL_MIN_DAYS || config.durationDays > TRIAL_MAX_DAYS) {
    errors.push(
      `La durée de l'essai doit être comprise entre ${TRIAL_MIN_DAYS} et ${TRIAL_MAX_DAYS} jours.`,
    );
  }

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
 * Règle produit : Client Pro et profil non résolu (traité comme Client Pro)
 * sont TOUJOURS exclus, même si une configuration ancienne les mentionnait.
 */
export function isProfileEligibleForTrial(
  config: TrialConfig,
  profileRole: string | null | undefined,
): boolean {
  if (isTrialExcludedProfile(profileRole)) return false;
  return config.eligibleProfiles.includes(profileRole as TrialProfileKey);
}

/** Un module est-il ouvert pendant l'essai ? */
export function trialIncludes(
  config: TrialConfig,
  module: TrialModuleKey,
): boolean {
  return config.modules.includes(module);
}

/**
 * Date de fin d'un essai démarré à `startedAt`.
 *
 * L'essai ne dépasse JAMAIS la fin de la campagne lorsqu'une fenêtre globale
 * est définie : sinon un essai démarré la veille de la clôture donnerait des
 * jours au-delà de la période autorisée par l'administrateur.
 */
export function trialEndDateFor(
  config: TrialConfig,
  startedAt: number,
): number {
  const nominalEnd = startedAt + config.durationDays * 24 * 60 * 60 * 1000;
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
    validFrom: v.union(v.number(), v.null()),
    validUntil: v.union(v.number(), v.null()),
    eligibleProfiles: v.array(v.string()),
    modules: v.array(v.string()),
    newAccountsOnly: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getCurrentUser(ctx));

    // Client Pro exclu : refus explicite (jamais de correction silencieuse).
    if (args.eligibleProfiles.includes(TRIAL_EXCLUDED_PROFILE)) {
      throw new Error(
        "La période d'essai ne peut pas être accordée au profil Client Pro : " +
          "il passe directement par l'offre gratuite ou l'abonnement Client Pro payant.",
      );
    }

    const unknownProfile = args.eligibleProfiles.find((p) => !isTrialProfileKey(p));
    if (unknownProfile) throw new Error(`Profil inconnu : « ${unknownProfile} ».`);
    const unknownModule = args.modules.find((m) => !isTrialModuleKey(m));
    if (unknownModule) throw new Error(`Module inconnu : « ${unknownModule} ».`);

    // La durée est validée AVANT d'être bornée : une valeur hors limites est
    // refusée (jamais corrigée en silence).
    if (
      !Number.isInteger(args.durationDays) ||
      args.durationDays < TRIAL_MIN_DAYS ||
      args.durationDays > TRIAL_MAX_DAYS
    ) {
      throw new Error(
        `La durée de l'essai doit être comprise entre ${TRIAL_MIN_DAYS} et ${TRIAL_MAX_DAYS} jours.`,
      );
    }

    const next: TrialConfig = {
      enabled: args.enabled,
      durationDays: args.durationDays,
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
          `Période d'essai ${next.enabled ? "activée" : "désactivée"} — ${next.durationDays} jour(s) · ` +
          `profils : ${next.eligibleProfiles.join(", ")} · modules : ${next.modules.join(", ")}`,
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
        ...stored,
        updatedAt: now,
        updatedBy: admin._id,
      } as any);
    }

    return { success: true, config: DEFAULT_TRIAL_CONFIG };
  },
});
