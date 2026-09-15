import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { getFreePlanStatus, type FreePlanStatus } from "./access";
import {
  PROMARKET_CATEGORY_BY_TRADE,
  PROMARKET_REGIONS,
  expertProfessionTrade,
  isProMarketTrade,
  promarketRegion,
} from "../lib/promarketMeta";

// ============================================================================
// RÈGLE D'ACCÈS PROFESSIONNELS — ProMarket accueille EXCLUSIVEMENT les Experts
// BatiBuild actifs et autorisés.
//
//   1. Aucun compte professionnel ProMarket indépendant : la fiche ProMarket
//      est la PROJECTION de l'`expertProfiles` du compte (jamais l'inverse).
//   2. ACTIVATION AUTOMATIQUE : dès qu'un compte possède un profil Expert
//      BatiBuild valide, ProMarket est activé pour ce profil. Aucune adhésion
//      (« Disponible sur ProMarket ») ni validation de l'administration n'est
//      nécessaire : un expert éligible est publié et peut postuler.
//   3. L'expert doit rester : compte actif, profil Expert visible, espace
//      Expert actif et profil suffisamment renseigné. L'administration
//      conserve le pouvoir de SUSPENDRE un profil (`disabled`).
//   4. Postuler (envoyer un devis) exige en plus d'être DISPONIBLE.
//
// Ce module n'importe ni `promarket.ts`, ni `promarketShared.ts`, ni
// `expertProfiles.ts` (Convex interdit les cycles d'import) : il est la seule
// source de vérité, réutilisée par ces trois modules.
// ============================================================================

export type ProMarketIneligibleReason =
  | "no_expert_profile"
  | "account_inactive"
  | "expert_hidden"
  | "expert_account_inactive"
  | "disabled_by_admin"
  | "incomplete_profile";

/**
 * Champs obligatoires du profil Expert pour ProMarket — EXACTEMENT ceux du
 * cahier des charges (nom, téléphone, métier, spécialités, régions,
 * présentation). Le libellé affiché côté client vient de l'i18n
 * (`proSpace.expertOnly.missingFields.<clé>`).
 */
export type IncompleteProfileField =
  | "displayName"
  | "phone"
  | "trade"
  | "specialties"
  | "regions"
  | "description";

export interface ProMarketEligibility {
  eligible: boolean;
  available: boolean;
  reasons: ProMarketIneligibleReason[];
  /** Champs précis manquants (vide si le profil est complet ou non concerné). */
  missingFields: IncompleteProfileField[];
  trade: string;
  category: string;
  region: string;
  city: string;
  zones: string[];
}

/** Métier ProMarket de l'expert : préférence ProMarket, sinon déduit du métier. */
export function proMarketTradeForExpert(expert: {
  profession: string;
  proMarketPrefs?: { trade?: string } | undefined;
}): string {
  const chosen = expert.proMarketPrefs?.trade;
  if (isProMarketTrade(chosen)) return chosen as string;
  return expertProfessionTrade(expert.profession);
}

/** Gouvernorat ProMarket : premier gouvernorat d'intervention valide. */
function proMarketRegionForExpert(expert: { regions?: string[] }): string {
  for (const region of expert.regions ?? []) {
    if (promarketRegion(region)) return region;
  }
  return "";
}

/**
 * Le compte Expert est-il actif au sens BatiBuild ?
 * Reprend la règle de `expertProfiles.getActiveExperts` (« Offre gratuite »
 * admin = tout profil visible est actif, sinon abonnement actif non expiré).
 */
export async function isExpertAccountActive(
  ctx: any,
  expert: Doc<"expertProfiles">,
  cachedFree?: FreePlanStatus,
): Promise<boolean> {
  if (!expert.isVisible) return false;
  const free = cachedFree ?? (await getFreePlanStatus(ctx));
  if (free.expertFree) return true;
  if (expert.subscriptionStatus !== "active" && expert.subscriptionStatus !== "trial") {
    return false;
  }
  const now = Date.now();
  if (expert.subscriptionEndDate && expert.subscriptionEndDate < now) return false;
  return true;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyItem(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => isNonEmptyString(item));
}

/**
 * Liste PRÉCISE des champs obligatoires manquants du profil Expert, évaluée
 * sur les données PERSISTÉES (document Convex), jamais sur l'état local d'un
 * formulaire. Chaque valeur est nettoyée : trim(), gestion de null/undefined
 * et des chaînes vides ; les tableaux (spécialités, régions) doivent contenir
 * au moins un élément valide. Aucune exigence cachée (longueur minimale de
 * présentation…) : un champ renseigné compte comme rempli.
 */
export function incompleteProfileFields(
  expert: Doc<"expertProfiles">,
  trade: string,
): IncompleteProfileField[] {
  const missing: IncompleteProfileField[] = [];
  if (!isNonEmptyString(expert.displayName) || expert.displayName.trim().length < 3) {
    missing.push("displayName");
  }
  if (!isNonEmptyString(expert.phone)) missing.push("phone");
  if (!isNonEmptyString(trade)) missing.push("trade");
  if (!hasNonEmptyItem(expert.specialties)) missing.push("specialties");
  if (!proMarketRegionForExpert(expert)) missing.push("regions");
  if (!isNonEmptyString(expert.description)) missing.push("description");
  return missing;
}

function isProfileComplete(expert: Doc<"expertProfiles">, trade: string): boolean {
  return incompleteProfileFields(expert, trade).length === 0;
}

/** Évalue l'éligibilité ProMarket d'un profil Expert (règles serveur). */
export async function evaluateExpertForProMarket(
  ctx: any,
  expert: Doc<"expertProfiles"> | null | undefined,
  cachedFree?: FreePlanStatus,
): Promise<ProMarketEligibility> {
  if (!expert) {
    return {
      eligible: false,
      available: false,
      reasons: ["no_expert_profile"],
      missingFields: [],
      trade: "",
      category: "",
      region: "",
      city: "",
      zones: [],
    };
  }

  const reasons: ProMarketIneligibleReason[] = [];
  const trade = proMarketTradeForExpert(expert);
  const region = proMarketRegionForExpert(expert);
  const user = expert.userId ? await ctx.db.get(expert.userId) : null;

  if (!user || user.status === "disabled") reasons.push("account_inactive");
  if (!expert.isVisible) reasons.push("expert_hidden");
  if (!(await isExpertAccountActive(ctx, expert, cachedFree))) {
    reasons.push("expert_account_inactive");
  }
  // Activation automatique : seule une suspension explicite de
  // l'administration retire un expert de ProMarket. Aucune adhésion ni
  // validation manuelle n'est requise (le profil Expert suffit).
  if (expert.proMarketStatus === "disabled") reasons.push("disabled_by_admin");

  const missingFields = incompleteProfileFields(expert, trade);
  if (missingFields.length > 0) {
    reasons.push("incomplete_profile");
    // Journal de développement temporaire : valeurs EXACTES lues en base et
    // utilisées par la validation (retirer une fois le diagnostic terminé).
    console.log("[ProMarket][validateProfile]", {
      expertId: String(expert._id),
      fullName: expert.displayName,
      phone: expert.phone,
      job: expert.profession,
      trade,
      specialties: expert.specialties,
      regions: expert.regions,
      presentation: expert.description,
      missingFields,
      isProfileComplete: false,
    });
  }

  const eligible = reasons.length === 0;
  const available = eligible && expert.proMarketAvailable !== false;
  const regionInfo = promarketRegion(region);

  const zones: string[] = [];
  for (const slug of expert.regions ?? []) {
    const info = PROMARKET_REGIONS.find((r) => r.slug === slug);
    if (info) zones.push(info.label);
  }

  return {
    eligible,
    available,
    reasons,
    missingFields: reasons.includes("incomplete_profile") ? missingFields : [],
    trade,
    category: trade ? PROMARKET_CATEGORY_BY_TRADE[trade] ?? "services" : "",
    region,
    city: expert.address?.trim() || regionInfo?.cities[0] || "",
    zones,
  };
}

/** Raccourci booléen (apparaît / peut être contacté). */
export async function isExpertEligibleForProMarket(
  ctx: any,
  expert: Doc<"expertProfiles"> | null | undefined,
  cachedFree?: FreePlanStatus,
): Promise<boolean> {
  return (await evaluateExpertForProMarket(ctx, expert, cachedFree)).eligible;
}

/**
 * Filtre d'éligibilité mémorisé (une seule lecture de la config tarifaire et
 * un seul accès par profil Expert) — utilisé par la recherche et les listes.
 */
export async function buildProMarketEligibilityFilter(ctx: any) {
  const free = await getFreePlanStatus(ctx);
  const cache = new Map<string, boolean>();

  return async (profile: Doc<"promarketProfiles">): Promise<boolean> => {
    // Fiches de démonstration : vitrine explicitement badgée « Démo ».
    if (profile.demo) return profile.status === "active";
    // Une fiche réelle SANS compte Expert n'a aucune raison d'être publiée.
    if (!profile.expertProfileId) return false;
    // Suspension explicite de la fiche par l'administration (onglet
    // « Professionnels ») : toujours respectée.
    if (profile.status === "suspended") return false;

    // Au-delà, l'éligibilité de l'Expert fait autorité : l'activation est
    // automatique et publie donc aussi les fiches créées avant la suppression
    // de la validation administrative (ancien statut « pending »).
    const key = profile.expertProfileId as string;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const expert = await ctx.db.get(profile.expertProfileId);
    const eligible = await isExpertEligibleForProMarket(ctx, expert, free);
    cache.set(key, eligible);
    return eligible;
  };
}

export interface SyncedProMarketProfile {
  profileId: Id<"promarketProfiles"> | null;
  eligibility: ProMarketEligibility;
}

/**
 * Synchronise la fiche ProMarket depuis le profil Expert.
 *
 * La fiche existante n'est JAMAIS supprimée (elle porte les avis, les vues et
 * les demandes déjà reçues) : elle est masquée (`status: "pending"`) dès que
 * l'expert redevient inéligible, et republiée dès qu'il remplit les règles.
 */
export async function syncProMarketProfileFromExpert(
  ctx: any,
  expert: Doc<"expertProfiles"> | null | undefined,
): Promise<SyncedProMarketProfile> {
  const eligibility = await evaluateExpertForProMarket(ctx, expert);
  if (!expert) return { profileId: null, eligibility };

  const existing = await ctx.db
    .query("promarketProfiles")
    .withIndex("by_expert", (q: any) => q.eq("expertProfileId", expert._id))
    .first();

  const now = Date.now();
  const prefs = expert.proMarketPrefs;

  const payload = {
    // ── Données issues du profil Expert (source unique) ──────────────────
    userId: expert.userId,
    expertProfileId: expert._id,
    displayName: expert.displayName,
    companyName: expert.companyName,
    description: expert.description,
    specialties: (expert.specialties ?? []).filter(Boolean).slice(0, 30),
    region: eligibility.region,
    city: eligibility.city,
    zones: eligibility.zones,
    phone: expert.phone,
    whatsapp: expert.phone,
    email: expert.email,
    website: expert.website,
    // ── Préférences ProMarket (sans équivalent côté Expert) ──────────────
    trade: eligibility.trade,
    category: eligibility.category,
    kind: prefs?.kind ?? (expert.companyName ? "entreprise" : "independant"),
    services: (expert.specialties ?? [])
      .filter(Boolean)
      .slice(0, 30)
      .map((name) => ({ name })),
    experienceYears: Math.max(0, Math.round(prefs?.experienceYears ?? 0)),
    availability: prefs?.availability ?? "week",
    urgent: prefs?.urgent ?? false,
    homeService: prefs?.homeService ?? false,
    priceFrom: prefs?.priceFrom,
    priceUnit: prefs?.priceUnit,
    // ── Disponibilité + validation administrative ────────────────────────
    status: eligibility.eligible ? ("active" as const) : ("pending" as const),
    updatedAt: now,
  };

  if (!eligibility.eligible) {
    // Le métier peut être vide (profil incomplet) : on conserve l'ancien.
    const patch = { ...payload };
    if (!patch.trade) delete (patch as Record<string, unknown>).trade;
    if (!patch.category) delete (patch as Record<string, unknown>).category;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { profileId: existing._id, eligibility };
    }
    // Rien à afficher : aucune fiche n'est créée avant l'éligibilité complète.
    return { profileId: null, eligibility };
  }

  if (existing) {
    // Les badges de vérification et les agrégats d'avis restent intacts.
    await ctx.db.patch(existing._id, {
      ...payload,
      availability: eligibility.available ? payload.availability : ("busy" as const),
    });
    return { profileId: existing._id, eligibility };
  }

  const profileId = await ctx.db.insert("promarketProfiles", {
    ...payload,
    availability: eligibility.available ? payload.availability : ("busy" as const),
    ratingSum: 0,
    ratingCount: 0,
    views: 0,
    contacts: 0,
    quoteCount: 0,
    completedCount: 0,
    verifiedIdentity: false,
    verifiedPro: false,
    verifiedDocs: false,
    recommended: false,
    demo: false,
    createdAt: now,
  });

  return { profileId, eligibility };
}

/**
 * Fiche ProMarket (projection) liée au compte Expert de l'utilisateur, avec
 * sa fiche Expert. Utilisé par l'espace professionnel et par les contrôles de
 * permissions des demandes / devis.
 */
export async function getExpertProMarketContext(
  ctx: any,
  userId: Id<"users">,
): Promise<{
  expert: Doc<"expertProfiles"> | null;
  profile: Doc<"promarketProfiles"> | null;
  eligibility: ProMarketEligibility;
}> {
  const expert = await ctx.db
    .query("expertProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  const eligibility = await evaluateExpertForProMarket(ctx, expert);

  let profile: Doc<"promarketProfiles"> | null = null;
  if (expert) {
    profile = await ctx.db
      .query("promarketProfiles")
      .withIndex("by_expert", (q: any) => q.eq("expertProfileId", expert._id))
      .first();
  } else {
    profile = await ctx.db
      .query("promarketProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
  }

  return { expert: expert ?? null, profile: profile ?? null, eligibility };
}

/**
 * Refuse explicitement toute tentative de création d'une fiche ProMarket
 * indépendante (règle §1) avec un message actionnable.
 */
export function proMarketExpertOnlyError(reason?: ProMarketIneligibleReason): ConvexError<string> {
  const message: Record<ProMarketIneligibleReason, string> = {
    no_expert_profile:
      "ProMarket est réservé aux Experts BatiBuild : créez d'abord votre profil Expert, puis activez ProMarket.",
    account_inactive:
      "Votre compte BatiBuild est inactif : contactez le support pour le réactiver.",
    expert_hidden:
      "Votre profil Expert est masqué : rendez-le visible pour apparaître sur ProMarket.",
    expert_account_inactive:
      "Votre espace Expert n'est pas actif : activez votre abonnement Expert pour apparaître sur ProMarket.",
    disabled_by_admin:
      "ProMarket est désactivé pour votre compte par l'administration BatiBuild.",
    incomplete_profile:
      "Complétez votre profil Expert (nom, téléphone, métier, spécialités, régions et description) pour apparaître sur ProMarket.",
  };
  return new ConvexError(
    message[reason ?? "no_expert_profile"] ?? message.no_expert_profile,
  );
}
