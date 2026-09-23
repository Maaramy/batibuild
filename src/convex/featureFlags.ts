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
//
// Extension tri-état : un flag dont `mode` vaut "off" / "beta" / "on" pilote
// un déploiement progressif (ex. rendu 3D amélioré). La table existante porte
// les deux champs ; `enabled` reste la source de vérité binaire pour les flags
// classiques, `mode` enrichit les flags progressifs sans casser rien d'existant.

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
  {
    key: "plans_3d_enhanced",
    name: "Rendu 3D amélioré des plans architecturaux",
    description:
      "Vue 3D haute netteté (HD, ombres adaptatives, arêtes architecturales, modes Architectural/Réaliste). Bêta = activé pour tests, ON = déployé.",
    progressive: true,
  },
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS_CATALOG)[number]["key"];

/** Les fonctionnalités historiques sont actives aujourd'hui → état initial. */
const DEFAULT_ENABLED = true;
/** Les nouveaux flags progressifs démarrent en BÊTA (test, retour possible). */
const DEFAULT_MODE: FlagMode = "beta";

/** Modes d'un flag progressif. */
export type FlagMode = "off" | "beta" | "on";
const VALID_MODES: FlagMode[] = ["off", "beta", "on"];

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
      const mode = (row as any)?.mode as FlagMode | undefined;
      return {
        key: entry.key,
        name: entry.name,
        description: entry.description,
        enabled: row?.enabled ?? DEFAULT_ENABLED,
        mode: mode ?? defaultModeFor(entry.key),
        progressive: "progressive" in entry && entry.progressive === true,
        updatedAt: row?.updatedAt,
      };
    });
  },
});

/** Mode par défaut d'un flag selon sa nature (classique → binary, progressif → beta). */
function defaultModeFor(key: string): FlagMode {
  const entry = FEATURE_FLAGS_CATALOG.find((f) => f.key === key) as
    | { key: string; progressive?: boolean }
    | undefined;
  // Un flag progressif démarre en « beta » (tests), les autres en « on ».
  return entry && entry.progressive === true ? "beta" : "on";
}

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

/**
 * Map publique des modes { key → "off" | "beta" | "on" } pour le contexte
 * frontend. Les flags classiques répondent "on"/"off" selon `enabled` ;
 * les flags progressifs exposent leur mode complet.
 */
export const getModesMap = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const rows = await ctx.db.query("featureFlags").collect();
    const map: Record<string, "off" | "beta" | "on"> = {};
    for (const entry of FEATURE_FLAGS_CATALOG) {
      const row = rows.find((r) => r.key === entry.key);
      const mode = (row as any)?.mode as FlagMode | undefined;
      if (mode && VALID_MODES.includes(mode)) {
        map[entry.key] = mode;
      } else {
        // Repli historique : dériver le mode du champ enabled existant.
        map[entry.key] = (row?.enabled ?? DEFAULT_ENABLED) ? "on" : "off";
      }
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

/** Journalise un changement de mode (off/beta/on) dans `adminLogs`. */
async function logModeChange(
  ctx: MutationCtx,
  admin: { _id: any; name?: string | null },
  key: string,
  name: string,
  mode: FlagMode,
  now: number,
) {
  try {
    // Réutilise l'action binaire existante (le type `action` est une union
    // fermée) ; le mode exact figure dans `details`.
    await ctx.db.insert("adminLogs", {
      adminId: admin._id,
      adminName: admin.name || "Admin",
      action: mode === "off" ? "feature_flag_disabled" : "feature_flag_enabled",
      details: `« ${name} » → mode ${mode.toUpperCase()}`,
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
 * Définit le mode d'un flag progressif (off / beta / on). Synchronise
 * `enabled` (mode ≠ off ⇒ enabled) pour la compatibilité avec les lectures
 * binaires existantes. Upsert à la première écriture.
 */
export const setFlagMode = mutation({
  args: {
    key: v.string(),
    mode: v.union(v.literal("off"), v.literal("beta"), v.literal("on")),
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

    const enabled = args.mode !== "off";
    if (existing) {
      await ctx.db.patch(existing._id, {
        mode: args.mode,
        enabled,
        updatedAt: now,
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("featureFlags", {
        key: entry.key,
        name: entry.name,
        description: entry.description,
        mode: args.mode,
        enabled,
        updatedAt: now,
        updatedBy: admin._id,
      });
    }

    await logModeChange(ctx, admin, entry.key, entry.name, args.mode, now);

    return { key: args.key, mode: args.mode };
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
