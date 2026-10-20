import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { buildLivePriceMap, withLivePrices } from "./bimEngine";
import {
  isComplementaryWorkEligible,
  normalizeCustomWorkKeys,
  normalizeSolarPanelCount,
  type CustomWorkProjectContext,
} from "../lib/customWorksCatalog";
import { normalizeLegacyCategory } from "./projectTypes";
import {
  estimateSelectedCustomWorks,
  type CustomWorksRollup,
} from "./customWorksEngine";

// ═══════════════════════════════════════════════════════════════════════════
// TRAVAUX PERSONNALISÉS — travaux complémentaires choisis dans une liste
// PRÉDÉFINIE (Piscine, Garage, Jardin, Panneaux solaires).
//
// • Aucun montant saisi à la main : le coût de chaque travail est calculé
//   automatiquement par `customWorksEngine` à partir des données réelles du
//   projet et du SCÉNARIO budgétaire actif, avec les mêmes prix que le reste
//   de l'estimation (moteur BIM + base `materialPrices`).
// • Les doublons sont impossibles : la sélection est dédoublonnée côté serveur
//   (un travail déjà ajouté ne peut pas l'être une seconde fois).
// • Seules les clés et le NOMBRE DE PANNEAUX solaires choisi sont stockés : tout
//   est recalculé à la lecture, donc un changement de scénario, de nombre de
//   panneaux ou de paramètres projet met les coûts à jour.
// • Les panneaux solaires ne sont jamais chiffrés au m² : coût = nombre de
//   panneaux × prix unitaire système d'un panneau.
//
// Sécurité : chaque lecture / écriture vérifie que le projet appartient bien à
// l'utilisateur connecté (ou à un administrateur).
// ═══════════════════════════════════════════════════════════════════════════

async function loadOwnedProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const user = await getCurrentUser(ctx);
  if (!user) return null;
  const project = await ctx.db.get(projectId);
  if (!project) return null;
  if (project.userId !== user._id && user.role !== "admin") return null;
  return { project, user };
}

/** Contexte du projet utilisé pour déduire les quantités des travaux. */
function projectContext(project: {
  surface?: number;
  floors?: number;
  surfaceTotale?: number;
  pools?: number;
  garages?: number;
}): CustomWorkProjectContext {
  return {
    surface: project.surface ?? 150,
    floors: project.floors ?? 1,
    surfaceTotale: project.surfaceTotale,
    pools: project.pools,
    garages: project.garages,
  };
}

/**
 * Le projet accepte-t-il les travaux complémentaires personnalisés ?
 *
 * Même règle que l'interface (`isComplementaryWorkEligible`) : les SEPT types de
 * projet autorisés (résidentiel / immobilier neuf, surface couverte ≥ 120 m²).
 * C'est le contrôle d'API : un accès direct à une requête ne peut ni activer ni
 * chiffrer les travaux d'un projet non éligible (studio, local, local
 * commercial, bureau, entrepôt et tous les autres types).
 *
 * Un projet devenu non éligible (changement de type) n'est plus chiffré ni
 * modifiable, mais sa sélection reste stockée : rien n'est effacé et rien n'est
 * appliqué silencieusement. Elle redevient active si le projet redevient
 * éligible.
 */
function supportsCustomWorks(project: {
  category?: string | null;
  surface?: number | null;
}): boolean {
  return isComplementaryWorkEligible(
    normalizeLegacyCategory(project.category),
    project.surface ?? undefined,
  );
}

/** Lit la base de prix officielle (materialPrices) — même source que l'estimation. */
async function loadLivePrices(ctx: QueryCtx | MutationCtx) {
  const rows = await ctx.db.query("materialPrices").collect();
  return buildLivePriceMap(
    rows.map((m) => ({ name: m.name, unit: m.unit, unitPrice: m.unitPrice })),
  );
}

/**
 * Calcule le chiffrage des travaux personnalisés sélectionnés pour un projet.
 * Les prix sont lus « en direct » dans la base `materialPrices` (priorité au
 * catalogue officiel 2026), exactement comme l'estimation du coût.
 */
async function computeRollupAsync(
  ctx: QueryCtx | MutationCtx,
  project: {
    surface?: number;
    floors?: number;
    surfaceTotale?: number;
    pools?: number;
    garages?: number;
    region?: string;
    selectedScenario?: string;
  },
  keys: string[],
  solarPanels?: number,
): Promise<CustomWorksRollup> {
  const normalized = normalizeCustomWorkKeys(keys);
  const livePrices = await loadLivePrices(ctx);
  const ctxWork = projectContext(project);
  return withLivePrices(livePrices, () =>
    estimateSelectedCustomWorks(
      normalized,
      ctxWork,
      project.region,
      project.selectedScenario,
      normalizeSolarPanelCount(solarPanels),
    ),
  );
}

/** Travaux personnalisés sélectionnés + coûts recalculés pour le projet. */
export const getProjectCustomWorks = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const owned = await loadOwnedProject(ctx, projectId);
    if (!owned) return null;
    const { project, user } = owned;
    const rec = await ctx.db
      .query("projectCustomWorks")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", projectId).eq("userId", user._id),
      )
      .first();
    const keys = normalizeCustomWorkKeys(rec?.keys ?? []);
    const solarPanels = normalizeSolarPanelCount(rec?.solarPanels);
    const rollup = await computeRollupAsync(ctx, project, keys, solarPanels);
    // Projet non éligible : AUCUN poste ni montant n'est renvoyé (la sélection
    // enregistrée est conservée en base, jamais supprimée).
    const eligible = supportsCustomWorks(project);
    return {
      keys: eligible ? rollup.works.map((w) => w.key) : [],
      works: eligible ? rollup.works : [],
      total: eligible ? rollup.total : 0,
      solarPanels,
      scenario: project.selectedScenario ?? "standard",
      finishLevel: rollup.works[0]?.finishLevel ?? "standard",
    };
  },
});

/**
 * Remplace la sélection de travaux personnalisés du projet. Les clés inconnues
 * sont ignorées et les doublons supprimés (un travail ne peut être ajouté deux
 * fois). Renvoie le récapitulatif chiffré.
 */
export const setProjectCustomWorks = mutation({
  args: {
    projectId: v.id("projects"),
    keys: v.array(v.string()),
    /** Nombre de panneaux solaires choisi (1-5) — ignoré si le poste n'est pas retenu. */
    solarPanels: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, keys, solarPanels }) => {
    const owned = await loadOwnedProject(ctx, projectId);
    if (!owned) throw new Error("Accès refusé");
    const { project, user } = owned;

    // Contrôle backend : un projet non éligible (type ou surface hors des sept
    // types autorisés) ne peut ACTIVER aucun travail, même par appel direct.
    if (!supportsCustomWorks(project)) {
      throw new Error(
        "Les travaux complémentaires personnalisés ne sont pas disponibles pour ce type de projet.",
      );
    }

    const normalized = normalizeCustomWorkKeys(keys);
    const existing = await ctx.db
      .query("projectCustomWorks")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", projectId).eq("userId", user._id),
      )
      .first();

    // Le nombre de panneaux est conservé d'une écriture à l'autre s'il n'est pas
    // transmis (changement de sélection sans toucher au sélecteur solaire).
    const panelCount = normalizeSolarPanelCount(
      solarPanels ?? existing?.solarPanels,
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        keys: normalized,
        solarPanels: panelCount,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("projectCustomWorks", {
        projectId,
        userId: user._id,
        keys: normalized,
        solarPanels: panelCount,
        updatedAt: Date.now(),
      });
    }

    const rollup = await computeRollupAsync(ctx, project, normalized, panelCount);
    return {
      keys: rollup.works.map((w) => w.key),
      works: rollup.works,
      total: rollup.total,
      solarPanels: panelCount,
    };
  },
});
