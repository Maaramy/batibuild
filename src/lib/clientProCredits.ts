// ============================================================================
// COTISATION CLIENT PRO — CRÉDITS DE PROJETS (logique pure, partagée)
// ============================================================================
// Le forfait Client Pro n'est PAS un abonnement mensuel : il fonctionne par
// crédits de projets.
//
//   1. À sa première inscription, l'utilisateur reçoit un nombre de projets
//      gratuits réglé par l'administrateur (une seule fois — marqueur
//      immuable `clientProFreeGrantedAt`).
//   2. Chaque nouveau projet consomme un crédit (gratuit d'abord, puis payant).
//   3. Quand tous les crédits sont épuisés, une cotisation doit être payée
//      pour obtenir de nouveaux projets.
//   4. Un paiement confirmé attribue exactement le nombre de projets acheté.
//   5. Aucun renouvellement mensuel automatique.
//
// Ce module ne contient que des types, des constantes et des fonctions pures :
// il est importé par le backend (`convex/clientProCredits.ts`), par
// l'administration et par la page Abonnements. Aucune valeur n'est devinée
// côté client : la configuration est toujours relue depuis Convex.
// ============================================================================

/** Marqueur d'erreur serveur : crédits Client Pro épuisés. */
export const CLIENT_PRO_CREDITS_MARKER = "CLIENT_PRO_CREDITS_REQUIRED:";

export const CLIENT_PRO_PROJECT_MIN = 1;
export const CLIENT_PRO_PROJECT_MAX = 500;
export const CLIENT_PRO_PRICE_MIN = 1;
export const CLIENT_PRO_PRICE_MAX = 100000;

/** Un pack de projets proposé à l'utilisateur (quantité → prix). */
export interface ClientProCreditPackage {
  projects: number;
  price: number;
}

export interface ClientProCreditConfig {
  /** Gratuité initiale activée ? */
  freeGrantEnabled: boolean;
  /** Projets gratuits accordés une seule fois au premier projet/à l'inscription. */
  freeProjects: number;
  /** Cotisation de base : montant et projets inclus. */
  cotisationPrice: number;
  cotisationProjects: number;
  /** Packs supplémentaires (quantité → prix), réglés par l'administrateur. */
  tiers: ClientProCreditPackage[];
  /** Rendre le crédit lorsqu'un projet est supprimé. */
  refundOnDelete: boolean;
  /** Autoriser l'achat d'un pack alors que des crédits restent disponibles. */
  allowStacking: boolean;
}

/**
 * Valeurs initiales — utilisées UNIQUEMENT à la première initialisation et
 * lorsqu'un document ancien ne porte pas encore les champs. Elles ne
 * remplacent jamais une valeur enregistrée.
 */
export const DEFAULT_CLIENT_PRO_CREDIT_CONFIG: ClientProCreditConfig = {
  freeGrantEnabled: true,
  freeProjects: 1,
  cotisationPrice: 80,
  cotisationProjects: 1,
  tiers: [
    { projects: 5, price: 350 },
    { projects: 10, price: 650 },
  ],
  refundOnDelete: false,
  allowStacking: true,
};

export interface ClientProCreditConfigSource {
  clientProFreeGrantEnabled?: boolean | null;
  clientProFreeProjects?: number | null;
  clientProCotisationPrice?: number | null;
  clientProCotisationProjects?: number | null;
  clientProCreditTiers?: ClientProCreditPackage[] | null;
  clientProRefundOnDelete?: boolean | null;
  clientProAllowStacking?: boolean | null;
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isLeap(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

/** Normalise une configuration lue en base (documents anciens tolérés). */
export function normalizeClientProCreditConfig(
  source: ClientProCreditConfigSource | null | undefined,
): ClientProCreditConfig {
  const fallback = DEFAULT_CLIENT_PRO_CREDIT_CONFIG;

  const tiers = Array.isArray(source?.clientProCreditTiers)
    ? source!.clientProCreditTiers
        .filter(
          (tier): tier is ClientProCreditPackage =>
            !!tier &&
            isLeap(tier.projects) &&
            isLeap(tier.price),
        )
        .map((tier) => ({
          projects: clampInt(tier.projects, CLIENT_PRO_PROJECT_MIN, CLIENT_PRO_PROJECT_MAX, 1),
          price: clampInt(tier.price, 0, CLIENT_PRO_PRICE_MAX, 0),
        }))
    : fallback.tiers;

  return {
    freeGrantEnabled:
      source?.clientProFreeGrantEnabled === undefined
        ? fallback.freeGrantEnabled
        : source.clientProFreeGrantEnabled === true,
    freeProjects: clampInt(
      source?.clientProFreeProjects ?? fallback.freeProjects,
      0,
      CLIENT_PRO_PROJECT_MAX,
      fallback.freeProjects,
    ),
    cotisationPrice: clampInt(
      source?.clientProCotisationPrice ?? fallback.cotisationPrice,
      CLIENT_PRO_PRICE_MIN,
      CLIENT_PRO_PRICE_MAX,
      fallback.cotisationPrice,
    ),
    cotisationProjects: clampInt(
      source?.clientProCotisationProjects ?? fallback.cotisationProjects,
      CLIENT_PRO_PROJECT_MIN,
      CLIENT_PRO_PROJECT_MAX,
      fallback.cotisationProjects,
    ),
    tiers,
    refundOnDelete:
      source?.clientProRefundOnDelete === undefined
        ? fallback.refundOnDelete
        : source.clientProRefundOnDelete === true,
    allowStacking:
      source?.clientProAllowStacking === undefined
        ? fallback.allowStacking
        : source.clientProAllowStacking === true,
  };
}

/** Erreurs de validation (liste vide = configuration valide). */
export function validateClientProCreditConfig(config: ClientProCreditConfig): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(config.freeProjects) || config.freeProjects < 0) {
    errors.push("Le nombre de projets gratuits doit être un entier positif ou nul.");
  }
  if (config.freeProjects > CLIENT_PRO_PROJECT_MAX) {
    errors.push(`Le nombre de projets gratuits ne peut pas dépasser ${CLIENT_PRO_PROJECT_MAX}.`);
  }
  if (
    !Number.isInteger(config.cotisationProjects) ||
    config.cotisationProjects < CLIENT_PRO_PROJECT_MIN ||
    config.cotisationProjects > CLIENT_PRO_PROJECT_MAX
  ) {
    errors.push(
      `La cotisation doit inclure entre ${CLIENT_PRO_PROJECT_MIN} et ${CLIENT_PRO_PROJECT_MAX} projets.`,
    );
  }
  if (
    !Number.isFinite(config.cotisationPrice) ||
    config.cotisationPrice < CLIENT_PRO_PRICE_MIN ||
    config.cotisationPrice > CLIENT_PRO_PRICE_MAX
  ) {
    errors.push("Le montant de la cotisation doit être un prix strictement positif.");
  }
  if (!Array.isArray(config.tiers)) {
    errors.push("Les packs de projets sont invalides.");
  } else {
    const seen = new Set<number>();
    for (const tier of config.tiers) {
      if (
        !Number.isInteger(tier.projects) ||
        tier.projects < CLIENT_PRO_PROJECT_MIN ||
        tier.projects > CLIENT_PRO_PROJECT_MAX
      ) {
        errors.push(
          `Chaque pack doit contenir entre ${CLIENT_PRO_PROJECT_MIN} et ${CLIENT_PRO_PROJECT_MAX} projets.`,
        );
      }
      if (!Number.isFinite(tier.price) || tier.price < CLIENT_PRO_PRICE_MIN) {
        errors.push("Chaque pack doit avoir un prix strictement positif.");
      }
      if (seen.has(tier.projects)) {
        errors.push(`Deux packs proposent ${tier.projects} projets : les quantités doivent être uniques.`);
      }
      seen.add(tier.projects);
    }
  }

  return errors;
}

/** Champs à enregistrer dans `paymentConfig`. */
export function clientProCreditStoragePatch(config: ClientProCreditConfig) {
  return {
    clientProFreeGrantEnabled: config.freeGrantEnabled,
    clientProFreeProjects: Math.round(config.freeProjects),
    clientProCotisationPrice: Math.round(config.cotisationPrice),
    clientProCotisationProjects: Math.round(config.cotisationProjects),
    clientProCreditTiers: config.tiers.map((tier) => ({
      projects: Math.round(tier.projects),
      price: Math.round(tier.price),
    })),
    clientProRefundOnDelete: config.refundOnDelete,
    clientProAllowStacking: config.allowStacking,
  };
}

/**
 * Toutes les possibilités de cotisation, sans doublon de quantité : la
 * cotisation de base d'abord, puis les packs, triés par nombre de projets.
 */
export function clientProPackages(
  config: ClientProCreditConfig,
): ClientProCreditPackage[] {
  const byProjects = new Map<number, ClientProCreditPackage>();
  const base: ClientProCreditPackage = {
    projects: config.cotisationProjects,
    price: config.cotisationPrice,
  };
  byProjects.set(base.projects, base);
  for (const tier of config.tiers) {
    if (!byProjects.has(tier.projects)) byProjects.set(tier.projects, tier);
  }
  return [...byProjects.values()].sort((a, b) => a.projects - b.projects);
}

/** Retrouve un pack par nombre de projets (ou `null`). */
export function clientProPackageFor(
  config: ClientProCreditConfig,
  projects: number,
): ClientProCreditPackage | null {
  return clientProPackages(config).find((pack) => pack.projects === projects) ?? null;
}

export interface ClientProCreditBalance {
  /** Projets gratuits accordés (une seule fois). */
  freeGranted: number;
  freeUsed: number;
  freeRemaining: number;
  /** Projets payants attribués par des cotisations confirmées. */
  paidGranted: number;
  paidUsed: number;
  paidRemaining: number;
  /** Solde total. */
  granted: number;
  used: number;
  remaining: number;
}

/** Calcule le solde à partir des compteurs persistés (jamais négatifs). */
export function computeClientProBalance(input: {
  freeGranted?: number | null;
  freeUsed?: number | null;
  paidGranted?: number | null;
  paidUsed?: number | null;
}): ClientProCreditBalance {
  const freeGranted = Math.max(0, Math.round(input.freeGranted ?? 0));
  const freeUsed = Math.min(freeGranted, Math.max(0, Math.round(input.freeUsed ?? 0)));
  const paidGranted = Math.max(0, Math.round(input.paidGranted ?? 0));
  const paidUsed = Math.min(paidGranted, Math.max(0, Math.round(input.paidUsed ?? 0)));

  return {
    freeGranted,
    freeUsed,
    freeRemaining: freeGranted - freeUsed,
    paidGranted,
    paidUsed,
    paidRemaining: paidGranted - paidUsed,
    granted: freeGranted + paidGranted,
    used: freeUsed + paidUsed,
    remaining: freeGranted - freeUsed + paidGranted - paidUsed,
  };
}

/**
 * Nombre de crédits gratuits déjà consommés par les projets existants au moment
 * de l'attribution initiale. Les projets créés AVANT la mise en place du
 * système comptent : un ancien compte ne reçoit pas de crédits supplémentaires
 * en plus de ses projets déjà réalisés.
 */
export function initialFreeUsage(existingProjects: number, freeProjects: number): number {
  const existing = Math.max(0, Math.round(existingProjects));
  const free = Math.max(0, Math.round(freeProjects));
  return Math.min(existing, free);
}

/** Vrai si la gratuité initiale doit être accordée maintenant. */
export function shouldGrantFreeCredits(input: {
  grantedAt?: number | null;
}): boolean {
  return input.grantedAt == null;
}

/** Vrai si un nouveau projet peut être créé avec le solde courant. */
export function canCreateProjectWithCredits(balance: ClientProCreditBalance): boolean {
  return balance.remaining > 0;
}

/** Libellé « 5 projets » / « 1 projet ». */
export function projectsLabel(projects: number): string {
  return `${projects} projet${projects > 1 ? "s" : ""}`;
}

/** Message présenté lorsque les crédits Client Pro sont épuisés. */
export function clientProCreditsExhaustedMessage(balance: ClientProCreditBalance): string {
  return (
    `Vous avez utilisé ${projectsLabel(balance.used)} sur ${projectsLabel(balance.granted)} ` +
    "de votre forfait Client Pro. Payez une cotisation pour obtenir de nouveaux projets : " +
    "vos projets existants restent accessibles et modifiables."
  );
}

/**
 * Indique si la cotisation de base doit être proposée même avec des crédits
 * restants. Par défaut l'achat anticipé est autorisé (`allowStacking`) ; quand
 * il est désactivé, l'utilisateur doit d'abord épuiser son solde.
 */
export function canPurchaseCotisation(
  config: ClientProCreditConfig,
  balance: ClientProCreditBalance,
): boolean {
  return config.allowStacking || balance.remaining === 0;
}
