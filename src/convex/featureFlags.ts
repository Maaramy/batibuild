import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// FEATURE FLAGS — système central de gestion des fonctionnalités
// ============================================================================
// Chaque fonctionnalité majeure de la plateforme (estimation, investissement,
// matériaux IA, plans…) peut être activée/désactivée par l'administrateur.
//
// Le flag contrôle UNIQUEMENT la visibilité et l'accessibilité dans l'UI :
//   - désactivé → entrées masquées (menus, cartes, CTA) + routes bloquées
//   - le code source, les routes React, les fonctions Convex et les tables
//     restent intacts et se réactivent sans aucune restauration.
//
// Système générique : les flags vivent dans la table `featureFlags` (key /
// name / description / enabled). Ajouter une fonctionnalité = ajouter une
// entrée au catalogue + un document, sans toucher à la structure.

/** Catalogue des fonctionnalités pilotables (extensible). */
export const FEATURE_FLAGS_CATALOG = [
  {
    key: "construction_cost_estimation",
    name: "Estimation des coûts de construction",
    description: "Estimation des projets de construction",
  },
  {
    key: "investment_project",
    name: "Projet d'investissement",
    description: "Analyse des projets d'investissement",
  },
  {
    key: "ai_materials",
    name: "Matériaux AI",
    description: "Assistant intelligent de choix des matériaux",
  },
  {
    key: "architectural_plans",
    name: "Plans architecturaux",
    description: "Génération/analyse des plans",
  },
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS_CATALOG)[number]["key"];

/** Les 4 fonctionnalités sont actives aujourd'hui → état initial « enabled ». */
const DEFAULT_ENABLED = true;

// ── Lecture ─────────────────────────────────────────────────────────────────

/**
 * Map complète des flags, fusion catalogue + base. Un flag du catalogue absent
 * de la base est créé à la volée (auto-provisionnement) — aucune migration
 * nécessaire lors de l'ajout d'une nouvelle fonctionnalité.
 */
export const getAllFlags = query({
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return null;

    const rows = await ctx.db.query("featureFlags").collect();
    const byKey = new Map(rows.map((r) => [r.key, r]));

    return FEATURE_FLAGS_CATALOG.map((entry) => {
      const row = byKey.get(entry.key);
      return {
        key: entry.key,
        name: entry.name,
        description: entry.description,
        enabled: row?.enabled ?? DEFAULT_ENABLED,
        updatedAt: row?.updatedAt,
      };
    });
  },
});

/**
 * Map publique { key → enabled } pour le contexte frontend. Lisible par tout
 * utilisateur connecté (l'état d'un flag n'est pas sensible ; seule la
 * modification est réservée aux admins). Utilisée par `useFeatureFlag`.
 */
export const getFlagsMap = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const rows = await ctx.db.query("featureFlags").collect();
    const map: Record<string, boolean> = {};
    for (const entry of FEATURE_FLAGS_CATALOG) {
      const row = rows.find((r) => r.key === entry.key);
      map[entry.key] = row?.enabled ?? DEFAULT_ENABLED;
    }
    return map;
  },
});

// ── Écriture (admin uniquement, vérifié côté serveur) ───────────────────────

function assertAdmin(user: { role?: string | null } | null) {
  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    throw new Error("Unauthorized: Admin access required");
  }
}

/** Journalise le changement dans `adminLogs`. */
async function logFlagChange(
  ctx: MutationCtx,
  admin: { _id: any; name?: string | null },
  key: string,
  name: string,
  enabled: boolean,
  now: number,
) {
  try {
    await ctx.db.insert("adminLogs", {
      adminId: admin._id,
      adminName: admin.name || "Admin",
      action: enabled ? "feature_flag_enabled" : "feature_flag_disabled",
      details: `Fonctionnalité « ${name} » ${enabled ? "activée" : "désactivée"}`,
      createdAt: now,
    });
  } catch {
    /* journalisation optionnelle */
  }
}

/**
 * Active/désactive une fonctionnalité. Le document est créé à la première
 * écriture si absent (upsert). Retourne le nouvel état.
 */
export const setFlag = mutation({
  args: {
    key: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    assertAdmin(admin);
    if (!admin) throw new Error("Unauthorized: Admin access required");

    const entry = FEATURE_FLAGS_CATALOG.find((f) => f.key === args.key);
    if (!entry) throw new Error("Fonctionnalité inconnue");

    const now = Date.now();
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      if (existing.enabled === args.enabled) return { key: args.key, enabled: args.enabled };
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: now,
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("featureFlags", {
        key: entry.key,
        name: entry.name,
        description: entry.description,
        enabled: args.enabled,
        updatedAt: now,
        updatedBy: admin._id,
      });
    }

    await logFlagChange(ctx, admin, entry.key, entry.name, args.enabled, now);

    return { key: args.key, enabled: args.enabled };
  },
});

/**
 * Auto-provisionnement (interne, appelé par le cron quotidien existant) :
 * crée les documents manquants du catalogue avec l'état par défaut. Idempotent.
 */
export const ensureFlagDocs = internalMutation({
  handler: async (ctx) => {
    const rows = await ctx.db.query("featureFlags").collect();
    const known = new Set(rows.map((r) => r.key));
    let created = 0;
    for (const entry of FEATURE_FLAGS_CATALOG) {
      if (known.has(entry.key)) continue;
      await ctx.db.insert("featureFlags", {
        key: entry.key,
        name: entry.name,
        description: entry.description,
        enabled: DEFAULT_ENABLED,
        updatedAt: Date.now(),
      });
      created++;
    }
    return { created };
  },
});

// ── Helpers internes (utilisables dans d'autres modules Convex) ─────────────

/** Lecture brutale d'un flag depuis n'importe quel contexte serveur. */
export async function readFlag(
  ctx: QueryCtx | MutationCtx,
  key: FeatureFlagKey,
): Promise<boolean> {
  const row = await ctx.db
    .query("featureFlags")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return row?.enabled ?? DEFAULT_ENABLED;
}
