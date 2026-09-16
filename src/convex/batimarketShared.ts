import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import {
  BATIMARKET_DEFAULT_VAT_RATE,
  BATIMARKET_ORDER_STATUS_LABELS,
  computeTotals,
  deliveryFeeFor,
  lineHT,
  round3,
  ttcFromHT,
  tvaAmount,
  type BatiMarketOrderStatus,
} from "../lib/batimarketMeta";

// ============================================================================
// BatiMarket — helpers partagés (catalogue, panier, commandes, permissions)
//
// ⚠️ Module SANS fonction Convex : aucune de ses exports n'est exposée dans
// `api.*`. La logique métier publique vit dans `batimarket.ts` (acheteur) et
// `batimarketVendor.ts` (espace vendeur + administration).
// ============================================================================

export const MAX_CATALOG_SCAN = 600;

export type Ctx = QueryCtx | MutationCtx;

// ── Utilitaires ─────────────────────────────────────────────────────────────

export function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function slugify(value: string): string {
  return norm(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === "admin" || user?.role === "moderator";
}

export async function requireUser(ctx: Ctx) {
  const user = await getCurrentUser(ctx as QueryCtx);
  if (!user) throw new Error("Authentification requise pour accéder à BatiMarket.");
  return user;
}

export async function requireAdmin(ctx: Ctx) {
  const user = await requireUser(ctx);
  if (!isAdmin(user)) throw new Error("Accès réservé à l'administration BatiMarket.");
  return user;
}

export interface MarketSettings {
  defaultVatRate: number;
  currency: string;
  commissionRate: number;
  demoMode: boolean;
  lowStockThreshold: number;
}

/** Paramètres BatiMarket (valeurs par défaut avant tout enregistrement admin). */
export async function readSettings(ctx: Ctx): Promise<MarketSettings> {
  const doc = await (ctx as QueryCtx).db.query("marketplaceSettings").order("desc").first();
  return {
    defaultVatRate: doc?.defaultVatRate ?? BATIMARKET_DEFAULT_VAT_RATE,
    currency: doc?.currency ?? "TND",
    commissionRate: doc?.commissionRate ?? 0,
    demoMode: doc?.demoMode ?? false,
    lowStockThreshold: doc?.lowStockThreshold ?? 10,
  };
}

/** Dossier fournisseur de l'utilisateur (null s'il n'en a pas). */
export async function mySupplier(ctx: Ctx, userId: Id<"users">) {
  return await (ctx as QueryCtx).db
    .query("marketplaceSuppliers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/**
 * Fournisseur autorisé à GÉRER sa boutique. Un dossier suspendu est en lecture
 * seule : seul un administrateur peut le réactiver.
 */
export async function requireSupplierManager(ctx: Ctx) {
  const user = await requireUser(ctx);
  const supplier = await mySupplier(ctx, user._id);
  if (!supplier) {
    throw new Error(
      "Aucun dossier fournisseur BatiMarket n'est associé à ce compte. Créez votre boutique pour commencer.",
    );
  }
  if (supplier.status === "suspended") {
    throw new Error(
      "Votre boutique BatiMarket est suspendue : contactez l'administration avant de poursuivre.",
    );
  }
  return { user, supplier };
}

/** Un fournisseur non ACTIF (ou de démo quand le mode démo est éteint) est invisible. */
export function supplierIsPublic(
  supplier: { status?: string; demo?: boolean } | null | undefined,
  demoMode: boolean,
): boolean {
  if (!supplier) return false;
  if (supplier.status !== "active") return false;
  if (supplier.demo && !demoMode) return false;
  return true;
}

export function productIsPublic(
  product: { status?: string; demo?: boolean } | null | undefined,
  supplier: { status?: string; demo?: boolean } | null | undefined,
  demoMode: boolean,
): boolean {
  if (!product || product.status !== "active") return false;
  if (product.demo && !demoMode) return false;
  return supplierIsPublic(supplier, demoMode);
}

// ── Prix & promotions ───────────────────────────────────────────────────────

export interface PromoInfo {
  title: string;
  priceHT: number;
  discountPct: number;
}

/** Promotions actives, indexées par produit (la plus avantageuse gagne). */
export async function activePromotions(ctx: Ctx): Promise<Map<string, PromoInfo>> {
  const now = Date.now();
  const promos = await (ctx as QueryCtx).db
    .query("marketplacePromotions")
    .withIndex("by_active", (q) => q.eq("active", true))
    .collect();
  const map = new Map<string, PromoInfo>();
  for (const promo of promos) {
    if (!promo.productId) continue;
    if (promo.startAt > now) continue;
    if (promo.endAt && promo.endAt < now) continue;
    const key = String(promo.productId);
    const existing = map.get(key);
    const price = promo.priceHT ?? 0;
    if (!existing || (price > 0 && price < existing.priceHT)) {
      map.set(key, {
        title: promo.title,
        priceHT: price,
        discountPct: promo.discountPct ?? 0,
      });
    }
  }
  return map;
}

export function effectivePriceHT(
  product: { priceHT: number },
  promo: PromoInfo | undefined,
): { priceHT: number; originalPriceHT?: number; promoTitle?: string } {
  if (!promo) return { priceHT: product.priceHT };
  const discounted =
    promo.priceHT > 0
      ? promo.priceHT
      : round3(product.priceHT * (1 - (promo.discountPct || 0) / 100));
  if (discounted <= 0 || discounted >= product.priceHT) return { priceHT: product.priceHT };
  return { priceHT: discounted, originalPriceHT: product.priceHT, promoTitle: promo.title };
}

/** Favoris d'un type donné (table courte : filtrage en mémoire). */
export async function favoritesByKind(ctx: Ctx, kind: "product" | "supplier" | "store") {
  const all = await (ctx as QueryCtx).db.query("marketplaceFavorites").collect();
  return all.filter((f) => f.kind === kind);
}

// ── Vue produit (produit + boutique + fournisseur + prix TTC) ───────────────

export function productView(
  product: any,
  supplier: any,
  store: any,
  promo: PromoInfo | undefined,
) {
  const price = effectivePriceHT(product, promo);
  return {
    _id: product._id as Id<"marketplaceProducts">,
    name: product.name as string,
    description: (product.description ?? "") as string,
    category: product.category as string,
    subcategory: (product.subcategory ?? null) as string | null,
    brand: (product.brand ?? null) as string | null,
    sku: (product.sku ?? null) as string | null,
    images: (product.images ?? []) as string[],
    unit: product.unit as string,
    priceHT: price.priceHT,
    originalPriceHT: (price.originalPriceHT ?? null) as number | null,
    promoTitle: (price.promoTitle ?? null) as string | null,
    vatRate: product.vatRate as number,
    tvaAmount: tvaAmount(price.priceHT, product.vatRate),
    priceTTC: ttcFromHT(price.priceHT, product.vatRate),
    stock: product.stock as number,
    minOrderQty: (product.minOrderQty ?? 1) as number,
    availability: product.availability as string,
    deliveryAvailable: product.deliveryAvailable !== false,
    pickupAvailable: product.pickupAvailable !== false,
    deliveryDays: (product.deliveryDays ?? null) as number | null,
    deliveryZones: (product.deliveryZones ?? []) as string[],
    deliveryFee: (product.deliveryFee ?? 0) as number,
    specs: (product.specs ?? []) as { label: string; value: string }[],
    status: product.status as string,
    views: (product.views ?? 0) as number,
    salesCount: (product.salesCount ?? 0) as number,
    ratingSum: (product.ratingSum ?? 0) as number,
    ratingCount: (product.ratingCount ?? 0) as number,
    rating: product.ratingCount ? (product.ratingSum as number) / (product.ratingCount as number) : 0,
    demo: product.demo === true,
    createdAt: product.createdAt as number,
    supplier: supplier
      ? {
          _id: supplier._id as Id<"marketplaceSuppliers">,
          companyName: supplier.companyName as string,
          governorate: supplier.governorate as string,
          logoUrl: (supplier.logoUrl ?? null) as string | null,
          verified: supplier.status === "active",
          demo: supplier.demo === true,
        }
      : null,
    store: store
      ? {
          _id: store._id as Id<"marketplaceStores">,
          name: store.name as string,
          slug: store.slug as string,
          rating: store.ratingCount ? (store.ratingSum as number) / (store.ratingCount as number) : 0,
          ratingCount: (store.ratingCount ?? 0) as number,
        }
      : null,
  };
}

export type ProductView = ReturnType<typeof productView>;

/** Jointure produit → fournisseur/boutique + filtrage de visibilité publique. */
export async function decorate(
  ctx: Ctx,
  products: any[],
  demoMode: boolean,
): Promise<ProductView[]> {
  const promos = await activePromotions(ctx);
  const db = (ctx as QueryCtx).db;
  const supplierCache = new Map<string, any>();
  const storeCache = new Map<string, any>();
  const out: ProductView[] = [];
  for (const product of products) {
    const sKey = String(product.supplierId);
    if (!supplierCache.has(sKey)) {
      supplierCache.set(sKey, await db.get(product.supplierId as Id<"marketplaceSuppliers">));
    }
    const supplier = supplierCache.get(sKey);
    if (!productIsPublic(product, supplier, demoMode)) continue;
    const stKey = String(product.storeId);
    if (!storeCache.has(stKey)) {
      storeCache.set(stKey, await db.get(product.storeId as Id<"marketplaceStores">));
    }
    out.push(productView(product, supplier, storeCache.get(stKey), promos.get(String(product._id))));
  }
  return out;
}

// ── Notifications & stock ───────────────────────────────────────────────────

export async function notify(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    type:
      | "marketplace_order"
      | "marketplace_status"
      | "marketplace_stock"
      | "marketplace_review"
      | "marketplace_promo"
      | "marketplace_availability"
      | "marketplace_message"
      | "marketplace_supplier";
    title: string;
    message: string;
    link?: string;
  },
) {
  if (!args.userId) return;
  await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    title: args.title,
    message: args.message,
    read: false,
    ...(args.link ? { link: args.link } : {}),
    createdAt: Date.now(),
  });
}

/** Applique un mouvement de stock et journalise l'opération (traçabilité). */
export async function applyStockMovement(
  ctx: MutationCtx,
  args: {
    product: any;
    delta: number;
    reason: "initial" | "restock" | "sale" | "cancel" | "adjustment";
    userId?: Id<"users">;
    orderId?: Id<"marketplaceOrders">;
    note?: string;
  },
): Promise<number> {
  const stockAfter = Math.max(0, round3((args.product.stock ?? 0) + args.delta));
  await ctx.db.patch(args.product._id as Id<"marketplaceProducts">, {
    stock: stockAfter,
    updatedAt: Date.now(),
  });
  await ctx.db.insert("marketplaceInventory", {
    productId: args.product._id,
    supplierId: args.product.supplierId,
    ...(args.userId ? { userId: args.userId } : {}),
    delta: args.delta,
    stockAfter,
    reason: args.reason,
    ...(args.orderId ? { orderId: args.orderId } : {}),
    ...(args.note ? { note: args.note } : {}),
    createdAt: Date.now(),
  });
  return stockAfter;
}

// ── Panier & livraison ──────────────────────────────────────────────────────

export async function getOrCreateCart(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("marketplaceCarts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("marketplaceCarts", { userId, createdAt: now, updatedAt: now });
  return (await ctx.db.get(id))!;
}

/** Règle de livraison applicable pour un gouvernorat donné. */
export async function deliveryRuleFor(
  ctx: Ctx,
  supplierId: Id<"marketplaceSuppliers">,
  governorate?: string,
) {
  if (!governorate) return null;
  const rules = await (ctx as QueryCtx).db
    .query("marketplaceDeliveries")
    .withIndex("by_supplier_governorate", (q) =>
      q.eq("supplierId", supplierId).eq("governorate", governorate),
    )
    .collect();
  return rules.find((r) => r.active) ?? null;
}

/** Numéro de commande lisible et séquentiel (BM-000001). */
export async function nextOrderNumber(ctx: MutationCtx): Promise<string> {
  const counter = await ctx.db
    .query("marketplaceCounters")
    .withIndex("by_kind", (q) => q.eq("kind", "order"))
    .first();
  const value = (counter?.value ?? 0) + 1;
  if (counter) await ctx.db.patch(counter._id, { value });
  else await ctx.db.insert("marketplaceCounters", { kind: "order", value });
  return `BM-${String(value).padStart(6, "0")}`;
}

// ── Commandes ───────────────────────────────────────────────────────────────

export async function buildOrders(
  ctx: Ctx,
  filter: {
    userId?: Id<"users">;
    supplierId?: Id<"marketplaceSuppliers">;
    limit: number;
    status?: string;
  },
) {
  const db = (ctx as QueryCtx).db;
  let orders = filter.supplierId
    ? await db
        .query("marketplaceOrders")
        .withIndex("by_supplier_created", (q) => q.eq("supplierId", filter.supplierId!))
        .order("desc")
        .take(filter.limit)
    : filter.userId
      ? await db
          .query("marketplaceOrders")
          .withIndex("by_user", (q) => q.eq("userId", filter.userId!))
          .order("desc")
          .take(filter.limit)
      : await db
          .query("marketplaceOrders")
          .withIndex("by_created")
          .order("desc")
          .take(filter.limit);

  if (filter.status) orders = orders.filter((o) => o.status === filter.status);

  const out = [];
  for (const order of orders) out.push(await buildOrderView(ctx, order));
  return out;
}

/** Vue complète d'une commande (lignes, vendeur, boutique, acheteur). */
export async function buildOrderView(ctx: Ctx, order: any) {
  {
    const db = (ctx as QueryCtx).db;
    const items = await db
      .query("marketplaceOrderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();
    const supplier = await db.get(order.supplierId as Id<"marketplaceSuppliers">);
    const store = await db.get(order.storeId as Id<"marketplaceStores">);
    const buyer = await db.get(order.userId as Id<"users">);
    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: BATIMARKET_ORDER_STATUS_LABELS[order.status as BatiMarketOrderStatus],
      subtotalHT: order.subtotalHT,
      vatAmount: order.vatAmount,
      deliveryFee: order.deliveryFee,
      totalTTC: order.totalTTC,
      itemCount: order.itemCount,
      pickup: order.pickup,
      deliveryMode: order.deliveryMode,
      shipping: order.shipping ?? null,
      projectId: order.projectId ?? null,
      source: order.source ?? "catalog",
      statusHistory: order.statusHistory ?? [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      supplier: supplier
        ? {
            _id: supplier._id,
            companyName: supplier.companyName,
            userId: supplier.userId,
            governorate: supplier.governorate,
            phone: supplier.phone,
          }
        : null,
      store: store ? { _id: store._id, name: store.name, slug: store.slug } : null,
      buyer: buyer
        ? {
            _id: buyer._id,
            name: buyer.name ?? null,
            email: buyer.email ?? null,
            phone: buyer.phone ?? null,
          }
        : null,
      items: items.map((i) => ({
        _id: i._id,
        productId: i.productId,
        name: i.name,
        unit: i.unit,
        image: i.image ?? null,
        quantity: i.quantity,
        unitPriceHT: i.unitPriceHT,
        vatRate: i.vatRate,
        lineHT: i.lineHT,
        lineVAT: i.lineVAT,
        lineTTC: i.lineTTC,
        reviewed: i.reviewed,
      })),
    };
  }
}

export type BatiMarketOrderView = Awaited<ReturnType<typeof buildOrders>>[number];

// ── Pont PROJET / DQE → besoins matériaux ───────────────────────────────────

export interface MaterialNeed {
  designation: string;
  quantity: number;
  unit: string;
  source: "dqe" | "estimation";
  lot?: string;
}

/** Besoins en matériaux d'un projet : DQE détaillé + estimation de coûts. */
export function extractMaterialNeeds(project: any): MaterialNeed[] {
  const needs: MaterialNeed[] = [];
  const push = (need: MaterialNeed) => {
    if (!need.designation || !need.quantity || need.quantity <= 0) return;
    const existing = needs.find(
      (n) => norm(n.designation) === norm(need.designation) && n.unit === need.unit,
    );
    if (existing) existing.quantity += need.quantity;
    else needs.push(need);
  };

  const dqe = project?.dqe;
  if (dqe && Array.isArray(dqe.lots)) {
    for (const lot of dqe.lots) {
      for (const line of lot?.lines ?? []) {
        push({
          designation: String(line.designation ?? line.d ?? "").trim(),
          quantity: Number(line.quantity ?? line.q ?? 0),
          unit: String(line.unit ?? line.u ?? "unite"),
          source: "dqe",
          ...(lot?.name ? { lot: String(lot.name) } : {}),
        });
      }
    }
  }

  const breakdown = project?.costEstimate?.breakdown;
  if (Array.isArray(breakdown)) {
    for (const group of breakdown) {
      for (const item of group?.items ?? []) {
        push({
          designation: String(item.name ?? "").trim(),
          quantity: Number(item.quantity ?? 0),
          unit: String(item.unit ?? "unite"),
          source: "estimation",
          ...(group?.label ? { lot: String(group.label) } : {}),
        });
      }
    }
  }
  return needs;
}

function matchScore(product: ProductView, need: MaterialNeed): number {
  const needText = norm(`${need.designation} ${need.unit}`);
  const productText = norm(
    `${product.name} ${product.category} ${product.subcategory ?? ""} ${
      product.brand ?? ""
    } ${product.description}`,
  );
  let score = 0;
  for (const token of needText.split(/[^a-z0-9]+/).filter((t) => t.length > 3)) {
    if (productText.includes(token)) score += 2;
  }
  if (norm(product.unit) === norm(need.unit)) score += 3;
  if (product.availability === "disponible") score += 1;
  if (product.stock > 0) score += 1;
  return score;
}

/** Produits BatiMarket correspondant à un besoin (score décroissant, prix croissant). */
export function matchProducts(
  products: ProductView[],
  need: MaterialNeed,
  limit: number,
): ProductView[] {
  return products
    .map((p) => ({ p, score: matchScore(p, need) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.p.priceTTC - b.p.priceTTC)
    .slice(0, limit)
    .map((entry) => entry.p);
}

/** Produits publics actifs (base commune aux recherches et recommandations). */
export async function publicProducts(ctx: Ctx): Promise<ProductView[]> {
  const settings = await readSettings(ctx);
  const rows = await (ctx as QueryCtx).db
    .query("marketplaceProducts")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .take(MAX_CATALOG_SCAN);
  return await decorate(ctx, rows, settings.demoMode);
}

export { computeTotals, deliveryFeeFor, lineHT, round3, ttcFromHT, tvaAmount };
