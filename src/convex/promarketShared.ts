import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import {
  PROMARKET_CATEGORY_BY_TRADE,
  normalizeProMarketText,
  promarketDistanceKm,
  promarketRegion,
  promarketRegionLabel,
  promarketTradeLabel,
} from "../lib/promarketMeta";

// ============================================================================
// ProMarket — helpers partagés (permissions serveur, recherche, notifications)
//
// Aucune fonction Convex n'est exportée ici : ce module est importé par
// `promarket.ts` (client & professionnels) et `promarketAdmin.ts` (modération).
// Toutes les règles de sécurité vivent dans ces helpers, donc côté serveur.
// ============================================================================

export const MAX_ATTACHMENTS = 5;
export const MAX_RESULTS = 60;
export const DEFAULT_LIMIT = 24;

export const requestStatusValidator = v.union(
  v.literal("new"),
  v.literal("contact"),
  v.literal("quote_requested"),
  v.literal("quote_received"),
  v.literal("discussing"),
  v.literal("accepted"),
  v.literal("in_progress"),
  v.literal("done"),
  v.literal("canceled"),
);

export const profileStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("suspended"),
);

export const reviewStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("hidden"),
);

export const serviceValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  priceFrom: v.optional(v.number()),
  unit: v.optional(v.string()),
});

export function isStaff(user: Doc<"users"> | null | undefined): boolean {
  return user?.role === "admin" || user?.role === "moderator";
}

export async function requireUser(ctx: any): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError("Authentification requise");
  if (user.status === "disabled") throw new ConvexError("Compte désactivé");
  return user;
}

export async function requireStaff(ctx: any): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!isStaff(user)) {
    throw new ConvexError("Accès réservé à l'administration");
  }
  return user;
}

/** Catégorie d'un métier d'après le catalogue partagé. */
export function categoryForTrade(trade: string): string {
  return PROMARKET_CATEGORY_BY_TRADE[trade] ?? "services";
}

/** Note moyenne d'une fiche (0 si aucun avis). */
export function avgRating(p: { ratingSum: number; ratingCount: number }): number {
  if (!p.ratingCount) return 0;
  return Math.round((p.ratingSum / p.ratingCount) * 10) / 10;
}

/**
 * Coordonnées approximatives d'une fiche (centre du gouvernorat + décalage
 * déterministe lié à la ville). Sert uniquement au tri « plus proche » :
 * aucune position exacte n'est collectée auprès des professionnels.
 */
export function profileCoords(region: string, city: string) {
  const r = promarketRegion(region);
  if (!r) return undefined;
  let hash = 0;
  for (let i = 0; i < city.length; i++) hash = (hash * 31 + city.charCodeAt(i)) % 997;
  const angle = (hash / 997) * Math.PI * 2;
  const radius = 0.03 + (hash % 7) * 0.012; // ~3 à 10 km autour du centre
  return {
    lat: r.lat + Math.sin(angle) * radius,
    lng: r.lng + Math.cos(angle) * radius,
  };
}

/** Notification interne (best-effort : ne bloque jamais le flux métier). */
export async function notify(
  ctx: any,
  params: {
    userId: Id<"users">;
    type:
      | "promarket_new_request"
      | "promarket_quote"
      | "promarket_message"
      | "promarket_review"
      | "promarket_verified";
    title: string;
    message: string;
    link?: string;
  },
) {
  try {
    await ctx.db.insert("notifications", {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      read: false,
      createdAt: Date.now(),
    });
  } catch {
    // best-effort
  }
}

/** Notifie les professionnels actifs d'un même métier (jamais tout le monde). */
export async function notifyProfessionalsByTrade(
  ctx: any,
  trade: string,
  payload: { title: string; message: string; link: string },
  excludeUserId?: Id<"users">,
) {
  const profiles = await ctx.db
    .query("promarketProfiles")
    .withIndex("by_trade", (q: any) => q.eq("trade", trade))
    .take(80);
  for (const p of profiles) {
    if (!p.userId || p.userId === excludeUserId) continue;
    if (p.status !== "active") continue;
    await notify(ctx, {
      userId: p.userId,
      type: "promarket_new_request",
      title: payload.title,
      message: payload.message,
      link: payload.link,
    });
  }
}

/** Fiche publique : les coordonnées ne sortent jamais pour un visiteur anonyme. */
export function publicProfile(
  profile: Doc<"promarketProfiles">,
  viewer: Doc<"users"> | null,
  viewerCoords?: { lat: number; lng: number },
) {
  const coords = profileCoords(profile.region, profile.city);
  const distanceKm =
    viewerCoords && coords ? promarketDistanceKm(viewerCoords, coords) : undefined;
  const known = Boolean(viewer);
  return {
    _id: profile._id,
    displayName: profile.displayName,
    companyName: profile.companyName,
    trade: profile.trade,
    tradeLabel: promarketTradeLabel(profile.trade),
    category: profile.category,
    kind: profile.kind,
    description: profile.description,
    specialties: profile.specialties,
    services: profile.services ?? [],
    region: profile.region,
    regionLabel: promarketRegionLabel(profile.region),
    city: profile.city,
    zones: profile.zones,
    experienceYears: profile.experienceYears,
    availability: profile.availability,
    urgent: profile.urgent,
    homeService: profile.homeService,
    priceFrom: profile.priceFrom,
    priceUnit: profile.priceUnit,
    rating: avgRating(profile),
    ratingCount: profile.ratingCount,
    views: profile.views,
    contacts: profile.contacts,
    completedCount: profile.completedCount ?? 0,
    verifiedIdentity: profile.verifiedIdentity,
    verifiedPro: profile.verifiedPro,
    verifiedDocs: profile.verifiedDocs,
    recommended: profile.recommended,
    status: profile.status,
    demo: profile.demo,
    userId: profile.userId ?? null,
    phone: known ? profile.phone : undefined,
    whatsapp: known ? profile.whatsapp : undefined,
    email: known ? profile.email : undefined,
    website: profile.website,
    logoStorageId: profile.logoStorageId ?? null,
    certifications: profile.certifications ?? [],
    distanceKm,
    isOwner: viewer ? profile.userId === viewer._id : false,
    createdAt: profile.createdAt,
  };
}

export type ProMarketProfileView = ReturnType<typeof publicProfile>;

export type SearchArgs = {
  q?: string;
  category?: string;
  trade?: string;
  region?: string;
  city?: string;
  kind?: "independant" | "entreprise";
  minRating?: number;
  verifiedOnly?: boolean;
  urgent?: boolean;
  homeService?: boolean;
  availability?: "immediate" | "week" | "busy";
  maxPrice?: number;
  maxDistanceKm?: number;
  userLat?: number;
  userLng?: number;
  sort?: string;
  limit?: number;
  offset?: number;
};

/** Recherche multicritère (filtres + tri + pagination). */
export async function runSearch(
  ctx: any,
  args: SearchArgs,
  viewer: Doc<"users"> | null,
) {
  const rows = await ctx.db
    .query("promarketProfiles")
    .withIndex("by_status", (q: any) => q.eq("status", "active"))
    .take(600);

  const viewerCoords =
    args.userLat !== undefined && args.userLng !== undefined
      ? { lat: args.userLat, lng: args.userLng }
      : undefined;

  const normalizedQuery = args.q ? normalizeProMarketText(args.q) : "";

  const matches = rows.filter((p: Doc<"promarketProfiles">) => {
    if (args.category && p.category !== args.category) return false;
    if (args.trade && p.trade !== args.trade) return false;
    if (args.region && p.region !== args.region) return false;
    if (args.kind && p.kind !== args.kind) return false;
    if (args.availability && p.availability !== args.availability) return false;
    if (args.urgent && !p.urgent) return false;
    if (args.homeService && !p.homeService) return false;
    if (args.verifiedOnly && !(p.verifiedPro || p.verifiedIdentity)) return false;
    if (args.minRating !== undefined && avgRating(p) < args.minRating) return false;
    if (args.maxPrice !== undefined) {
      if (p.priceFrom === undefined || p.priceFrom > args.maxPrice) return false;
    }
    if (args.city) {
      const needle = normalizeProMarketText(args.city);
      const hay = normalizeProMarketText(`${p.city} ${p.zones.join(" ")}`);
      if (!hay.includes(needle)) return false;
    }
    if (normalizedQuery) {
      const hay = normalizeProMarketText(
        [
          p.displayName,
          p.companyName ?? "",
          p.city,
          p.region,
          promarketTradeLabel(p.trade),
          p.description ?? "",
          p.specialties.join(" "),
          p.zones.join(" "),
        ].join(" "),
      );
      const words = normalizedQuery.split(/\s+/).filter((w) => w.length > 2);
      if (words.length > 0 && !words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  let enriched = matches.map((p: Doc<"promarketProfiles">) =>
    publicProfile(p, viewer, viewerCoords),
  );

  if (args.maxDistanceKm !== undefined && args.maxDistanceKm > 0 && viewerCoords) {
    enriched = enriched.filter(
      (p: ProMarketProfileView) =>
        p.distanceKm !== undefined && p.distanceKm <= args.maxDistanceKm!,
    );
  }

  const sort = args.sort ?? "relevance";
  const score = (p: ProMarketProfileView) => {
    let s = 0;
    if (p.recommended) s += 4;
    if (p.verifiedPro) s += 3;
    if (p.verifiedIdentity) s += 1;
    s += p.rating * 1.5;
    s += Math.min(p.ratingCount, 60) / 20;
    s += Math.min(p.experienceYears, 20) / 6;
    if (p.availability === "immediate") s += 2;
    if (p.urgent) s += 0.5;
    if (p.homeService) s += 0.5;
    if (p.distanceKm !== undefined) s += Math.max(0, 6 - p.distanceKm / 5);
    return s;
  };

  enriched.sort((a: ProMarketProfileView, b: ProMarketProfileView) => {
    switch (sort) {
      case "nearest":
        return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
      case "rating":
        return b.rating - a.rating || b.ratingCount - a.ratingCount;
      case "reviews":
        return b.ratingCount - a.ratingCount;
      case "verified":
        return Number(b.verifiedPro) - Number(a.verifiedPro) || b.rating - a.rating;
      case "price":
        return (
          (a.priceFrom ?? Number.MAX_SAFE_INTEGER) -
          (b.priceFrom ?? Number.MAX_SAFE_INTEGER)
        );
      case "availability": {
        const rank = (value: string) =>
          value === "immediate" ? 0 : value === "week" ? 1 : 2;
        return rank(a.availability) - rank(b.availability) || b.rating - a.rating;
      }
      default:
        return score(b) - score(a);
    }
  });

  const total = enriched.length;
  const offset = Math.max(0, args.offset ?? 0);
  const limit = Math.min(MAX_RESULTS, Math.max(1, args.limit ?? DEFAULT_LIMIT));
  const page = enriched.slice(offset, offset + limit);

  return { results: page, total, offset, limit, hasMore: offset + limit < total };
}

/** Fiche ProMarket de l'utilisateur courant (s'il en possède une). */
export async function getOwnProfile(ctx: any, userId: Id<"users">) {
  return await ctx.db
    .query("promarketProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
}

/** Un professionnel éligible peut-il répondre (devis) à cette demande ? */
export async function canQuoteRequest(
  ctx: any,
  user: Doc<"users">,
  request: Doc<"promarketRequests">,
): Promise<Doc<"promarketProfiles"> | null> {
  if (request.professionalId) {
    const target = await ctx.db.get(request.professionalId);
    if (target?.userId === user._id) return target;
    // Une demande adressée à une fiche de démonstration (sans compte) reste
    // ouverte aux professionnels du même métier inscrits sur la plateforme.
    if (target?.userId) return null;
  }
  if (isStaff(user)) return null;
  const own = await getOwnProfile(ctx, user._id);
  if (!own || own.status !== "active") return null;
  if (own.trade !== request.trade) return null;
  return own;
}

/** Droit de lecture d'une demande : client, professionnel visé, répondant, staff. */
export async function canViewRequest(
  ctx: any,
  user: Doc<"users">,
  request: Doc<"promarketRequests">,
): Promise<{ allowed: boolean; profile: Doc<"promarketProfiles"> | null }> {
  if (request.userId === user._id) return { allowed: true, profile: null };
  if (isStaff(user)) return { allowed: true, profile: null };
  if (request.professionalId) {
    const target = await ctx.db.get(request.professionalId);
    if (target?.userId === user._id) return { allowed: true, profile: target };
  }
  const own = await getOwnProfile(ctx, user._id);
  if (own) {
    const quotes = await ctx.db
      .query("promarketQuotes")
      .withIndex("by_request", (q: any) => q.eq("requestId", request._id))
      .collect();
    if (quotes.some((qt: Doc<"promarketQuotes">) => qt.professionalId === own._id)) {
      return { allowed: true, profile: own };
    }
  }
  return { allowed: false, profile: null };
}

/** Demande enrichie des libellés (métier, gouvernorat). */
export function requestSummary(request: Doc<"promarketRequests">) {
  return {
    ...request,
    tradeLabel: promarketTradeLabel(request.trade),
    regionLabel: promarketRegionLabel(request.region),
  };
}
