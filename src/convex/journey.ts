// ============================================================================
// PROJECT JOURNEY — CACHE / ÉTAT PAR PROJET
//
// Une seule logique de persistance pour TOUTES les étapes du parcours :
//
//   « projectId + module/étape + version des données »
//
// Chaque étape (coût estimatif, plan IA, choix matériaux, consultations,
// exécution & suivi, investissement) enregistre ICI son ÉTAT — jamais le
// résultat lui-même : les résultats restent dans leurs tables d'origine
// (`projects.costEstimate`, `aiMaterialAnalyses`, `investmentAnalyses`,
// `projectRoadmaps`, `projectRecommendedProviders`…). Cette table
// (`journeyAnalyses`) ne fait qu'associer un projet et une étape à :
//
//   - `status`      : « running » (analyse en cours) ou « done » (terminée) ;
//   - `dataVersion` : empreinte déterministe des données importantes du projet
//                     au moment de l'analyse (surface, type, niveaux, pièces,
//                     budget, localisation, qualité…) ;
//   - `resultRef`   : identifiant du résultat persisté dans sa table dédiée ;
//   - `analyzedAt`  : date de l'analyse.
//
// À la lecture (`getJourneyState`), l'empreinte ACTUELLE du projet est
// recalculée et comparée à celle enregistrée : si elles diffèrent, le résultat
// est marqué « à actualiser » (⚠) SANS être supprimé — l'ancien résultat reste
// affichable jusqu'à ce qu'une nouvelle analyse soit terminée.
//
// Aucun calcul coûteux (IA, moteurs) n'est relancé ici : ce module est purement
// déclaratif et sert au frontend à décider d'afficher un résultat sauvegardé
// plutôt que de relancer une analyse.
// ============================================================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";

/** Étapes officielles du parcours (ordre du Project Journey). */
export const JOURNEY_MODULES = [
  "cost",
  "plans",
  "materials",
  "consult",
  "execution",
  "investment",
] as const;

export type JourneyModule = (typeof JOURNEY_MODULES)[number];

const JOURNEY_MODULE_SET = new Set<string>(JOURNEY_MODULES);

/** État d'une étape tel qu'affiché dans le parcours. */
export type JourneyStepStatus = "none" | "running" | "done" | "stale";

export interface JourneyStepState {
  module: JourneyModule;
  status: JourneyStepStatus;
  /** Date de la dernière analyse terminée (0 si aucune). */
  analyzedAt: number;
  /** Référence du résultat persisté dans sa table dédiée. */
  resultRef?: string;
}

export interface JourneyState {
  projectId: string;
  /** Empreinte actuelle des données du projet. */
  dataVersion: string;
  modules: Record<JourneyModule, JourneyStepState>;
}

// ── Empreinte des données du projet (« version des données ») ───────────────

/**
 * Champs du projet qui rendent une analyse obsolète lorsqu'ils changent :
 * type, surface, niveaux, pièces, budget (description/manualInput) et
 * localisation (région). Toute modification d'un de ces champs change
 * l'empreinte et marque les analyses comme « à actualiser ».
 */
export function projectDataInputs(project: any): Record<string, unknown> {
  return {
    category: project?.category ?? "",
    surface: project?.surface ?? 0,
    surfaceTotale: project?.surfaceTotale ?? 0,
    floors: project?.floors ?? 0,
    bedrooms: project?.bedrooms ?? 0,
    bathrooms: project?.bathrooms ?? 0,
    kitchens: project?.kitchens ?? 0,
    livingRooms: project?.livingRooms ?? 0,
    garages: project?.garages ?? 0,
    wcs: project?.wcs ?? 0,
    pools: project?.pools ?? 0,
    region: project?.region ?? "",
    description: project?.description ?? "",
    manualInput: project?.manualInput ?? null,
  };
}

/** Hash FNV-1a 32 bits (hex) — déterministe et stable entre mobile et web. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Sérialise les entrées projet de façon déterministe (clés triées). */
function stableStringify(value: Record<string, unknown>): string {
  const keys = Object.keys(value).sort();
  return keys
    .map((k) => `${k}=${JSON.stringify(value[k] ?? null)}`)
    .join("|");
}

/** Empreinte des données importantes du projet (version des données). */
export function projectDataVersion(project: any): string {
  const inputs = projectDataInputs(project);
  // Deux parties : lisible (debug) + hash court déterministe.
  return `v1.${fnv1a(stableStringify(inputs))}`;
}

// ── Garde-fous d'accès ──────────────────────────────────────────────────────

async function requireOwnedProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
): Promise<{ user: any; project: any }> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Non authentifié");
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Projet introuvable");
  if (project.userId !== user._id && user.role !== "admin") {
    throw new Error("Non autorisé");
  }
  return { user, project };
}

function ensureModule(module: string): asserts module is JourneyModule {
  if (!JOURNEY_MODULE_SET.has(module)) {
    throw new Error(`Étape de parcours inconnue : ${module}`);
  }
}

// ── Queries ─────────────────────────────────────────────────────────────────

/**
 * État complet du parcours pour un projet : pour chaque étape, statut réel,
 * date, référence de résultat et obsolescence éventuelle (⚠ à actualiser).
 * Les étapes jamais analysées renvoient `status: "none"`.
 */
export const getJourneyState = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<JourneyState> => {
    const { project } = await requireOwnedProject(ctx, args.projectId);
    const dataVersion = projectDataVersion(project);

    const rows = await ctx.db
      .query("journeyAnalyses")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const byModule = new Map<string, any>();
    for (const row of rows) byModule.set(row.module, row);

    const modules = {} as Record<JourneyModule, JourneyStepState>;
    for (const key of JOURNEY_MODULES) {
      const row = byModule.get(key);
      let status: JourneyStepStatus = "none";
      if (row?.status === "running") status = "running";
      else if (row?.status === "done") {
        status = row.dataVersion === dataVersion ? "done" : "stale";
      }
      modules[key] = {
        module: key,
        status,
        analyzedAt: row?.analyzedAt ?? 0,
        resultRef: row?.resultRef,
      };
    }

    return { projectId: args.projectId, dataVersion, modules };
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

/**
 * Marque une étape comme « analyse en cours ». Idempotent : réutilise la ligne
 * existante du couple (projet, étape) au lieu d'en créer une nouvelle.
 */
export const markJourneyRunning = mutation({
  args: {
    projectId: v.id("projects"),
    module: v.string(),
  },
  handler: async (ctx, args) => {
    ensureModule(args.module);
    const { user, project } = await requireOwnedProject(ctx, args.projectId);
    const now = Date.now();
    const existing = await ctx.db
      .query("journeyAnalyses")
      .withIndex("by_project_module", (q) =>
        q.eq("projectId", args.projectId).eq("module", args.module),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "running",
        dataVersion: projectDataVersion(project),
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("journeyAnalyses", {
      userId: user._id,
      projectId: args.projectId,
      module: args.module,
      status: "running",
      dataVersion: projectDataVersion(project),
      analyzedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Enregistre une étape comme « terminée » avec la version actuelle des données
 * du projet et, le cas échéant, la référence du résultat persisté. Aucun
 * résultat n'est écrit ici (il vit dans sa table dédiée).
 */
export const recordJourneyAnalysis = mutation({
  args: {
    projectId: v.id("projects"),
    module: v.string(),
    resultRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    ensureModule(args.module);
    const { user, project } = await requireOwnedProject(ctx, args.projectId);
    const now = Date.now();
    const dataVersion = projectDataVersion(project);
    const existing = await ctx.db
      .query("journeyAnalyses")
      .withIndex("by_project_module", (q) =>
        q.eq("projectId", args.projectId).eq("module", args.module),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "done",
        dataVersion,
        resultRef: args.resultRef ?? existing.resultRef,
        analyzedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("journeyAnalyses", {
      userId: user._id,
      projectId: args.projectId,
      module: args.module,
      status: "done",
      dataVersion,
      resultRef: args.resultRef,
      analyzedAt: now,
      updatedAt: now,
    });
  },
});
