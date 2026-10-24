import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  buildImpactPreview,
  defaultCostEvolutionSettings,
  normalizeCostEvolutionSettings,
  validateCostEvolutionSettings,
  COST_EVOLUTION_CATEGORY_LABELS,
  type CostEvolutionCategoryKey,
  type CostEvolutionScenarioKey,
  type CostEvolutionSettings,
} from "../lib/costEvolution";

// ============================================================================
// ÉVOLUTION ANNUELLE DES COÛTS DE CONSTRUCTION — backend
// ----------------------------------------------------------------------------
// • Le paramétrage est UNIQUE (la dernière ligne de `costEvolutionConfig` est
//   la version en vigueur) et versionné : chaque modification écrit une ligne
//   d'historique avec l'auteur, la date, les anciennes ET les nouvelles valeurs.
// • Seuls les administrateurs peuvent modifier le barème (contrôle serveur, pas
//   seulement dans l'interface).
// • La prévisualisation est une LECTURE : elle n'écrit jamais rien.
// • Aucun projet n'est recalculé par ce module : les estimations historiques
//   restent intactes. Les taux ne s'appliquent qu'aux projections demandées.
// ============================================================================

/** Lit le paramétrage en vigueur (jamais null : repli sur les défauts). */
export async function readCostEvolutionSettings(ctx: any): Promise<{
  settings: CostEvolutionSettings;
  version: number;
  updatedAt: number | null;
  updatedByName: string | null;
}> {
  const doc = await ctx.db.query("costEvolutionConfig").order("desc").first();
  if (!doc) {
    return { settings: defaultCostEvolutionSettings(), version: 0, updatedAt: null, updatedByName: null };
  }
  const settings = normalizeCostEvolutionSettings(doc);
  let updatedByName: string | null = null;
  if (doc.updatedBy) {
    const author = await ctx.db.get(doc.updatedBy);
    updatedByName = author?.name ?? null;
  }
  return {
    settings,
    version: doc.version ?? 0,
    updatedAt: doc.updatedAt ?? null,
    updatedByName,
  };
}

/** Refuse toute écriture qui ne vient pas d'un administrateur. */
async function requireAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Accès refusé : seuls les administrateurs peuvent modifier le barème des coûts.");
  }
  return user;
}

const scenarioValidator = v.union(
  v.literal("moderee"),
  v.literal("moyen"),
  v.literal("eleve"),
);

const categoryValidator = v.object({
  key: v.string(),
  rate: v.number(),
  useComponents: v.boolean(),
  components: v.object({
    materials: v.number(),
    labor: v.number(),
    transport: v.number(),
    equipment: v.number(),
  }),
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Paramétrage public (lecture seule) — utilisé par le panneau d'administration
 * et par les rapports PDF. Les taux ne sont pas des secrets ; les droits
 * d'ÉCRITURE restent, eux, strictement réservés aux administrateurs.
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const { settings, version, updatedAt, updatedByName } = await readCostEvolutionSettings(ctx);
    return {
      ...settings,
      version,
      updatedAt,
      updatedByName,
      isDefault: version === 0,
    };
  },
});

/** Historique des versions du barème — administrateur uniquement. */
export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];
    const limit = Math.min(50, Math.max(1, args.limit ?? 20));
    return await ctx.db
      .query("costEvolutionHistory")
      .withIndex("by_changed")
      .order("desc")
      .take(limit);
  },
});

/**
 * Prévisualisation d'impact — AUCUNE écriture.
 *
 * `projectId` : utilise le coût estimatif RÉELLEMENT enregistré du projet
 * (propriétaire ou administrateur uniquement) comme coût de référence.
 * `categoryAmounts` : montants réels par poste, quand l'appelant les connaît ;
 * chaque poste est alors projeté séparément puis additionné (aucun taux global
 * n'est réappliqué ensuite).
 */
export const previewImpact = query({
  args: {
    projectId: v.optional(v.id("projects")),
    referenceCost: v.optional(v.number()),
    years: v.optional(v.number()),
    scenario: v.optional(scenarioValidator),
    categoryAmounts: v.optional(
      v.array(v.object({ key: v.string(), amount: v.number() })),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Authentification requise.");

    const { settings } = await readCostEvolutionSettings(ctx);

    let referenceCost = args.referenceCost ?? 0;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project) throw new Error("Projet introuvable.");
      if (project.userId !== user._id && user.role !== "admin") {
        throw new Error("Accès refusé à ce projet.");
      }
      referenceCost = project.costEstimate?.totalCost ?? 0;
    }

    const amounts: Partial<Record<CostEvolutionCategoryKey, number>> = {};
    for (const entry of args.categoryAmounts ?? []) {
      if (!(entry.key in COST_EVOLUTION_CATEGORY_LABELS)) continue;
      if (!(entry.amount > 0)) continue;
      amounts[entry.key as CostEvolutionCategoryKey] = entry.amount;
    }

    return buildImpactPreview({
      settings,
      referenceCost,
      years: args.years ?? 1,
      scenario: args.scenario as CostEvolutionScenarioKey | undefined,
      categoryAmounts: Object.keys(amounts).length > 0 ? amounts : undefined,
    });
  },
});

// ============================================================================
// Mutations (administrateur uniquement)
// ============================================================================

/**
 * Enregistre un nouveau paramétrage. Les valeurs précédentes et nouvelles sont
 * conservées dans l'historique ; le numéro de version est incrémenté.
 */
export const saveConfig = mutation({
  args: {
    referenceYear: v.number(),
    effectiveFrom: v.number(),
    defaultScenario: scenarioValidator,
    customRate: v.number(),
    enabled: v.boolean(),
    scenarioRates: v.object({
      moderee: v.number(),
      moyen: v.number(),
      eleve: v.number(),
    }),
    categories: v.array(categoryValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    // Validation sur les valeurs RÉELLEMENT SAISIES (jamais sur une version
    // déjà normalisée : une saisie hors bornes doit être refusée, pas
    // silencieusement remplacée par la valeur par défaut).
    const candidate: CostEvolutionSettings = {
      referenceYear: args.referenceYear,
      effectiveFrom: args.effectiveFrom,
      defaultScenario: args.defaultScenario as CostEvolutionScenarioKey,
      customRate: args.customRate,
      // `enabled` est un booléen : une valeur absente ne doit jamais activer
      // le mécanisme par accident.
      enabled: args.enabled === true,
      scenarioRates: args.scenarioRates,
      categories: args.categories as never,
    };

    const errors = validateCostEvolutionSettings(candidate);
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    const next = normalizeCostEvolutionSettings(candidate);

    const existing = await ctx.db.query("costEvolutionConfig").order("desc").first();
    const previous = existing ? normalizeCostEvolutionSettings(existing as never) : null;
    const version = (existing?.version ?? 0) + 1;
    const now = Date.now();

    const payload = {
      referenceYear: next.referenceYear,
      effectiveFrom: next.effectiveFrom,
      defaultScenario: next.defaultScenario,
      customRate: next.customRate,
      enabled: next.enabled,
      scenarioRates: next.scenarioRates,
      categories: next.categories.map((c) => ({
        key: c.key,
        rate: c.rate,
        useComponents: c.useComponents,
        components: { ...c.components },
      })),
      version,
      updatedAt: now,
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("costEvolutionConfig", payload);
    }

    await ctx.db.insert("costEvolutionHistory", {
      version,
      action: "save",
      previous: JSON.stringify(previous),
      next: JSON.stringify(next),
      details: `Barème ${next.referenceYear} — ${next.enabled ? "actif" : "inactif"} · scénario par défaut ${next.defaultScenario} · ${next.categories.length} postes`,
      changedBy: user._id,
      changedByName: user.name || "Admin",
      changedAt: now,
    });

    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: "cost_evolution_save" as any,
      details: `Évolution annuelle des coûts v${version} — ${next.enabled ? "activée" : "désactivée"} (barème ${next.referenceYear})`,
      createdAt: now,
    });

    return { ...next, version, updatedAt: now };
  },
});

/**
 * Réinitialise les valeurs par défaut (3 / 5 / 8 %, tous les postes à 3 %).
 * Le statut actif/inactif est CONSERVÉ : réinitialiser ne désactive ni
 * n'active jamais le mécanisme à l'insu de l'administrateur.
 */
export const resetDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const existing = await ctx.db.query("costEvolutionConfig").order("desc").first();
    const previous = existing ? normalizeCostEvolutionSettings(existing as never) : null;
    const defaults = defaultCostEvolutionSettings();
    const next: CostEvolutionSettings = {
      ...defaults,
      enabled: previous?.enabled ?? defaults.enabled,
    };
    const version = (existing?.version ?? 0) + 1;
    const now = Date.now();

    const payload = {
      referenceYear: next.referenceYear,
      effectiveFrom: next.effectiveFrom,
      defaultScenario: next.defaultScenario,
      customRate: next.customRate,
      enabled: next.enabled,
      scenarioRates: next.scenarioRates,
      categories: next.categories.map((c) => ({
        key: c.key,
        rate: c.rate,
        useComponents: c.useComponents,
        components: { ...c.components },
      })),
      version,
      updatedAt: now,
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("costEvolutionConfig", payload);
    }

    await ctx.db.insert("costEvolutionHistory", {
      version,
      action: "reset",
      previous: JSON.stringify(previous),
      next: JSON.stringify(next),
      details: `Réinitialisation aux valeurs par défaut (statut ${next.enabled ? "actif" : "inactif"} conservé)`,
      changedBy: user._id,
      changedByName: user.name || "Admin",
      changedAt: now,
    });

    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: "cost_evolution_reset" as any,
      details: `Réinitialisation du barème d'évolution annuelle (v${version})`,
      createdAt: now,
    });

    return { ...next, version, updatedAt: now };
  },
});

/**
 * Active / désactive le mécanisme sans supprimer les paramètres enregistrés.
 */
export const setEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const existing = await ctx.db.query("costEvolutionConfig").order("desc").first();
    const now = Date.now();
    const current = existing
      ? normalizeCostEvolutionSettings(existing as never)
      : defaultCostEvolutionSettings();
    const version = (existing?.version ?? 0) + 1;

    const payload = {
      referenceYear: current.referenceYear,
      effectiveFrom: current.effectiveFrom,
      defaultScenario: current.defaultScenario,
      customRate: current.customRate,
      enabled: args.enabled === true,
      scenarioRates: current.scenarioRates,
      categories: current.categories.map((c) => ({
        key: c.key,
        rate: c.rate,
        useComponents: c.useComponents,
        components: { ...c.components },
      })),
      version,
      updatedAt: now,
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("costEvolutionConfig", payload);
    }

    await ctx.db.insert("costEvolutionHistory", {
      version,
      action: "toggle",
      previous: JSON.stringify(existing ? normalizeCostEvolutionSettings(existing as never) : null),
      next: JSON.stringify({ ...current, enabled: args.enabled === true }),
      details: args.enabled ? "Mécanisme activé" : "Mécanisme désactivé (paramètres conservés)",
      changedBy: user._id,
      changedByName: user.name || "Admin",
      changedAt: now,
    });

    return { enabled: args.enabled === true, version };
  },
});
