import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// ALERTES PRIX MATÉRIAUX
// ----------------------------------------------------------------------------
// Un utilisateur suit un matériau et reçoit une notification (table
// `notifications`, type `price_alert`) lorsque :
//   - « below » : le prix passe SOUS un seuil cible ;
//   - « above » : le prix passe AU-DESSUS d'un seuil cible ;
//   - « change » : le prix varie d'au moins `thresholdPercent` % (hausse OU baisse).
//
// Le moteur d'évaluation est une fonction pure appelée par les mutations de
// `materials.ts` qui modifient un prix : aucune duplication d'historique et
// aucune tâche cron supplémentaire ne sont nécessaires.
// ============================================================================

export const alertDirectionValidator = v.union(
  v.literal("below"),
  v.literal("above"),
  v.literal("change"),
);

export type AlertDirection = "below" | "above" | "change";

/** Contexte minimal d'un matériau nécessaire à la décision de déclenchement. */
export type AlertMaterial = {
  _id: Id<"materialPrices">;
  name: string;
  unit: string;
  currency?: string;
};

/** Décide si une alerte se déclenche pour un passage previousPrice → newPrice. */
export function shouldTrigger(
  direction: AlertDirection,
  previousPrice: number,
  newPrice: number,
  targetPrice?: number,
  thresholdPercent?: number,
): boolean {
  if (previousPrice === newPrice) return false;
  if (direction === "change") {
    const threshold = thresholdPercent ?? 5;
    if (previousPrice <= 0) return false;
    const pct = Math.abs((newPrice - previousPrice) / previousPrice) * 100;
    return pct >= threshold;
  }
  if (targetPrice === undefined) return false;
  if (direction === "below") {
    // Franchissement vers le BAS uniquement (évite les rappels).
    return previousPrice > targetPrice && newPrice <= targetPrice;
  }
  // direction === "above"
  return previousPrice < targetPrice && newPrice >= targetPrice;
}

function formatPrice(value: number, currency: string): string {
  return `${value.toFixed(3)} ${currency}`;
}

function alertMessage(
  material: AlertMaterial,
  direction: AlertDirection,
  previousPrice: number,
  newPrice: number,
): string {
  const currency = material.currency || "TND";
  const before = formatPrice(previousPrice, currency);
  const after = formatPrice(newPrice, currency);
  const unit = material.unit ? ` / ${material.unit}` : "";
  if (direction === "below") {
    return `Le prix du matériau « ${material.name} » est passé sous votre seuil : ${before} → ${after}${unit}.`;
  }
  if (direction === "above") {
    return `Le prix du matériau « ${material.name} » a dépassé votre seuil : ${before} → ${after}${unit}.`;
  }
  const pct = previousPrice > 0 ? ((newPrice - previousPrice) / previousPrice) * 100 : 0;
  return `Le prix de « ${material.name} » a varié de ${pct >= 0 ? "+" : ""}${pct.toFixed(1)} % : ${before} → ${after}${unit}.`;
}

/**
 * Évalue et déclenche les alertes actives d'un matériau après un changement de
 * prix. Utilisable depuis n'importe quelle mutation. Retourne le nombre
 * d'alertes déclenchées.
 */
export async function evaluatePriceAlerts(
  ctx: MutationCtx,
  material: AlertMaterial,
  previousPrice: number,
  newPrice: number,
): Promise<number> {
  if (previousPrice === newPrice) return 0;

  const alerts = await ctx.db
    .query("materialPriceAlerts")
    .withIndex("by_material_active", (q) =>
      q.eq("materialPriceId", material._id).eq("active", true),
    )
    .collect();

  let triggered = 0;
  const now = Date.now();

  for (const alert of alerts) {
    if (
      !shouldTrigger(
        alert.direction,
        previousPrice,
        newPrice,
        alert.targetPrice,
        alert.thresholdPercent,
      )
    ) {
      continue;
    }

    await ctx.db.insert("notifications", {
      userId: alert.userId,
      type: "price_alert",
      title: "Alerte prix matériau",
      message: alertMessage(material, alert.direction, previousPrice, newPrice),
      read: false,
      link: `/dashboard/materials/${material._id}`,
      createdAt: now,
    });

    await ctx.db.patch(alert._id, {
      lastTriggeredAt: now,
      triggerCount: (alert.triggerCount ?? 0) + 1,
    });
    triggered++;
  }

  return triggered;
}

// ============================================================================
// Queries
// ============================================================================

/** Alertes de l'utilisateur courant, enrichies avec le matériau suivi. */
export const getMyAlerts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const alerts = await ctx.db
      .query("materialPriceAlerts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const rows = [];
    for (const alert of alerts) {
      const material = await ctx.db.get(alert.materialPriceId);
      if (!material) continue;
      rows.push({
        _id: alert._id,
        direction: alert.direction,
        targetPrice: alert.targetPrice,
        thresholdPercent: alert.thresholdPercent,
        note: alert.note,
        active: alert.active,
        createdAt: alert.createdAt,
        lastTriggeredAt: alert.lastTriggeredAt,
        triggerCount: alert.triggerCount ?? 0,
        materialId: material._id,
        materialName: material.name,
        materialUnit: material.unit,
        materialPrice: material.unitPrice,
        currency: material.currency || "TND",
      });
    }
    return rows;
  },
});

/** Nombre d'alertes actives de l'utilisateur (badge). */
export const getMyAlertsCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const alerts = await ctx.db
      .query("materialPriceAlerts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return alerts.filter((a) => a.active).length;
  },
});

/** Alertes de l'utilisateur courant pour un matériau donné. */
export const getAlertsForMaterial = query({
  args: { materialPriceId: v.id("materialPrices") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("materialPriceAlerts")
      .withIndex("by_user_material", (q) =>
        q.eq("userId", user._id).eq("materialPriceId", args.materialPriceId),
      )
      .collect();
  },
});

// ============================================================================
// Mutations
// ============================================================================

/** Crée une alerte prix sur un matériau. */
export const createAlert = mutation({
  args: {
    materialPriceId: v.id("materialPrices"),
    direction: alertDirectionValidator,
    targetPrice: v.optional(v.number()),
    thresholdPercent: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const material = await ctx.db.get(args.materialPriceId);
    if (!material) throw new Error("Matériau introuvable");

    if (args.direction === "change") {
      const threshold = args.thresholdPercent ?? 5;
      if (threshold <= 0 || threshold > 100) {
        throw new Error("Le seuil de variation doit être compris entre 0 et 100 %.");
      }
    } else {
      if (args.targetPrice === undefined || args.targetPrice <= 0) {
        throw new Error("Un prix cible positif est requis pour ce type d'alerte.");
      }
    }

    return await ctx.db.insert("materialPriceAlerts", {
      materialPriceId: args.materialPriceId,
      userId: user._id,
      direction: args.direction,
      targetPrice: args.direction === "change" ? undefined : args.targetPrice,
      thresholdPercent: args.direction === "change" ? (args.thresholdPercent ?? 5) : undefined,
      note: args.note,
      active: true,
      createdAt: Date.now(),
      triggerCount: 0,
    });
  },
});

/** Met à jour une alerte existante (propriétaire uniquement). */
export const updateAlert = mutation({
  args: {
    alertId: v.id("materialPriceAlerts"),
    targetPrice: v.optional(v.number()),
    thresholdPercent: v.optional(v.number()),
    note: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.userId !== user._id) throw new Error("Alerte introuvable");

    const patch: Record<string, unknown> = {};
    if (args.targetPrice !== undefined) {
      if (args.targetPrice <= 0) throw new Error("Prix cible invalide.");
      patch.targetPrice = args.targetPrice;
    }
    if (args.thresholdPercent !== undefined) {
      if (args.thresholdPercent <= 0 || args.thresholdPercent > 100) {
        throw new Error("Seuil de variation invalide.");
      }
      patch.thresholdPercent = args.thresholdPercent;
    }
    if (args.note !== undefined) patch.note = args.note;
    if (args.active !== undefined) patch.active = args.active;

    await ctx.db.patch(args.alertId, patch);
    return args.alertId;
  },
});

/** Active/désactive une alerte (propriétaire uniquement). */
export const toggleAlert = mutation({
  args: { alertId: v.id("materialPriceAlerts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.userId !== user._id) throw new Error("Alerte introuvable");
    await ctx.db.patch(args.alertId, { active: !alert.active });
    return !alert.active;
  },
});

/** Supprime une alerte (propriétaire uniquement). */
export const deleteAlert = mutation({
  args: { alertId: v.id("materialPriceAlerts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.userId !== user._id) throw new Error("Alerte introuvable");
    await ctx.db.delete(args.alertId);
  },
});
