import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  TRIAL_CLIENT_PRO_DEFAULT_DAYS,
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

// ============================================================================
// PÉRIODE D'ESSAI GRATUITE — CONFIGURATION ADMINISTRABLE (source de vérité)
// ============================================================================
// Remplace l'ancien forfait « Free » : plus aucune offre gratuite permanente
// n'est proposée. À la place, une période d'essai dont l'administrateur règle
// l'activation, la durée, la fenêtre de validité, les profils éligibles et les
// modules ouverts — sans modification du code source.
//
// Client Pro est désormais éligible SI — et seulement si — l'administrateur le
// coche dans `trialEligibleProfiles`. Sa durée peut être réglée séparément
// (`trialClientProDurationDays`, repli sur la durée commune). À l'expiration,
// l'accès Client Pro est retiré et l'abonnement payant reste obligatoire :
// aucun abonnement n'est activé sans paiement confirmé.
//
// Toutes les décisions (démarrage de l'essai, droits pendant l'essai) sont
// prises CÔTÉ SERVEUR à partir de cette configuration : l'interface ne fait que
// l'afficher, elle ne peut pas accorder de droits.
//
// Stockage : `paymentConfig` (document unique le plus récent), champs
// `trialEnabled`, `trialDurationDays`, `trialClientProDurationDays`,
// `trialValidFrom`, `trialValidUntil`, `trialEligibleProfiles`, `trialModules`,
// `trialNewAccountsOnly`. Le plafond de projets de l'essai reste réglé par
// `convex/projectLimits.ts` (aucune duplication de configuration).
// Aucune donnée existante n'est supprimée : les estimations, projets,
// abonnements payants et comptes restent strictement inchangés.

export interface TrialConfig {
  /** Période d'essai proposée aux nouveaux comptes ? */
  enabled: boolean;
  /** Durée accordée à chaque nouvel essai (jours, 1 à 365). */
  durationDays: number;
  /**
   * Durée de l'essai du forfait Client Pro (jours). `null` = même durée que
   * `durationDays`. Permet, par exemple, 7 jours pour Fournisseur / Expert et
   * 14 jours pour Client Pro.
   */
  clientProDurationDays: number | null;
  /** Début de la campagne (ms) — `null` = sans borne. */
  validFrom: number | null;
  /** Fin de la campagne (ms) — `null` = sans borne. */
  validUntil: number | null;
  /** Profils pouvant bénéficier de l'essai (Client Pro inclus si coché). */
  eligibleProfiles: TrialProfileKey[];
  /** Modules ouverts pendant l'essai. */
  modules: TrialModuleKey[];
  /** Interdire le rattrapage des comptes existants (essai réservé aux nouveaux inscrits). */
  newAccountsOnly: boolean;
}

export const DEFAULT_TRIAL_CONFIG: TrialConfig = {
  enabled: false,
  durationDays: TRIAL_DEFAULT_DAYS,
  clientProDurationDays: TRIAL_CLIENT_PRO_DEFAULT_DAYS,
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
  /** Durée spécifique au forfait Client Pro — absente = durée commune. */
  trialClientProDurationDays?: number | null;
  trialValidFrom?: number | null;
  trialValidUntil?: number | null;
  trialEligibleProfiles?: string[] | null;
  trialModules?: string[] | null;
  trialNewAccountsOnly?: boolean | null;
  /** Legacy : ancien interrupteur d'offre gratuite — IGNORÉ (voir ci-dessous). */
  proPrice?: number | null;
  freePlanEnabled?: boolean | null;
}

export function clampTrialDays(days: number | null | undefined): number {
  const value =
    typeof days === "number" && Number.isFinite(days) ? Math.round(days) : TRIAL_DEFAULT_DAYS;
  return Math.min(TRIAL_MAX_DAYS, Math.max(TRIAL_MIN_DAYS, value));
}

/** Durée Client Pro enregistrée : `null` (durée commune) ou jours bornés. */
export function clampClientProTrialDays(days: number | null | undefined): number | null {
  if (days == null || !Number.isFinite(days)) return null;
  return clampTrialDays(days);
}

/**
 * Normalise la configuration enregistrée.
 *
 * SEUL `trialEnabled` commande la période d'essai. L'ancien couplage avec le
 * prix Client Pro (null/0 = ancienne « Offre gratuite » Client Pro) a été
 * SUPPRIMÉ : il réactivait l'essai dans le dos de l'administrateur et
 * maintenait un mécanisme gratuit contradictoire. Un document historique sans
 * `trialEnabled` est donc lu comme « essai désactivé ».
 */
export function normalizeTrialConfig(source: TrialConfigSource | null | undefined): TrialConfig {
  const enabled = source?.trialEnabled === true;

  return {
    enabled,
    durationDays: clampTrialDays(source?.trialDurationDays),
    clientProDurationDays: clampClientProTrialDays(source?.trialClientProDurationDays),
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

  if (config.clientProDurationDays != null) {
    if (!Number.isInteger(config.clientProDurationDays)) {
      errors.push("La durée de l'essai Client Pro doit être un nombre entier de jours.");
    } else if (
      config.clientProDurationDays < TRIAL_MIN_DAYS ||
      config.clientProDurationDays > TRIAL_MAX_DAYS
    ) {
      errors.push(
        `La durée de l'essai Client Pro doit être comprise entre ${TRIAL_MIN_DAYS} et ${TRIAL_MAX_DAYS} jours.`,
      );
    }
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
 * Le profil doit être explicitement coché par l'administrateur. Un profil NON
 * RÉSOLU est refusé (aucune information fiable pour l'identifier) ; Client Pro
 * n'est donc éligible que si l'administrateur l'a sélectionné.
 */
export function isProfileEligibleForTrial(
  config: TrialConfig,
  profileRole: string | null | undefined,
): boolean {
  if (isTrialExcludedProfile(profileRole)) return false;
  return config.eligibleProfiles.includes(profileRole as TrialProfileKey);
}

/**
 * Durée d'essai applicable à un profil : durée Client Pro si elle est réglée,
 * sinon durée commune. Source unique utilisée au démarrage de l'essai et par
 * l'affichage (page Abonnements, « Mon abonnement »).
 */
export function trialDaysFor(
  config: TrialConfig,
  profileRole: string | null | undefined,
): number {
  if (profileRole === "client" && config.clientProDurationDays != null) {
    return config.clientProDurationDays;
  }
  return config.durationDays;
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
      clientProDurationDays: config.clientProDurationDays,
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
    // Durée dédiée à Client Pro. Omise = valeur déjà enregistrée conservée
    // (compatibilité avec les appels existants), `null` = durée commune.
    clientProDurationDays: v.optional(v.union(v.number(), v.null())),
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

    // Durée Client Pro : validée AVANT d'être enregistrée (jamais corrigée en
    // silence). Une valeur omise conserve la configuration en cours.
    const current = await readTrialConfig(ctx);
    if (args.clientProDurationDays != null) {
      if (
        !Number.isInteger(args.clientProDurationDays) ||
        args.clientProDurationDays < TRIAL_MIN_DAYS ||
        args.clientProDurationDays > TRIAL_MAX_DAYS
      ) {
        throw new Error(
          `La durée de l'essai Client Pro doit être comprise entre ${TRIAL_MIN_DAYS} et ${TRIAL_MAX_DAYS} jours.`,
        );
      }
    }
    const clientProDurationDays =
      args.clientProDurationDays === undefined
        ? current.clientProDurationDays
        : args.clientProDurationDays;

    const next: TrialConfig = {
      enabled: args.enabled,
      durationDays: args.durationDays,
      clientProDurationDays,
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
        // Un nouveau document de configuration porte TOUJOURS les prix des
        // forfaits : un document partiel faisait perdre le prix Client Pro
        // (champ absent lu comme « gratuit » par l'administration).
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
          `Période d'essai ${next.enabled ? "activée" : "désactivée"} — ${next.durationDays} jour(s)` +
          (next.clientProDurationDays != null
            ? ` (Client Pro : ${next.clientProDurationDays} jour(s))`
            : "") +
          ` · profils : ${next.eligibleProfiles.join(", ")} · modules : ${next.modules.join(", ")}`,
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
        // Un nouveau document de configuration porte TOUJOURS les prix des
        // forfaits : un document partiel faisait perdre le prix Client Pro
        // (champ absent lu comme « gratuit » par l'administration).
        ...defaultPlanPriceFields(),
        ...stored,
        updatedAt: now,
        updatedBy: admin._id,
      } as any);
    }

    return { success: true, config: DEFAULT_TRIAL_CONFIG };
  },
});
