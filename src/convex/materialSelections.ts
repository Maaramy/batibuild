import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { requireClientProAccess } from "./access";
import { readFlag } from "./featureFlags";
import {
  acceptAllRecommendations,
  buildMaterialWorkspace,
  materialsOnly,
  recalculateSelection,
  selectionScore,
  validateSelection,
  MATERIAL_SCENARIO_KEYS,
  type MaterialLine,
  type MaterialScenarioKey,
  type MaterialSelectionEntry,
} from "./materialSelectionEngine";

// ═══════════════════════════════════════════════════════════════════════════
// CHOIX MATÉRIAUX AI — API Convex.
//
// Le module est DIRECTEMENT branché sur le « Quantitatif détaillé » du projet
// (généré par le module « Coût estimatif ») : ici, aucune donnée n'est inventée
// et aucun second moteur de prix n'existe. Tout le calcul est délégué à
// `materialSelectionEngine.ts`, partagé avec la page projet — les deux modules
// affichent donc exactement le même résultat.
//
// • `getMaterialsWorkspace` construit l'espace de travail (scénario actif,
//   lignes de matériaux, variantes Éco/Std/Premium, score prix/qualité,
//   recommandations) à partir du Quantitatif réel du projet.
// • les mutations enregistrent le scénario, le brouillon puis la sélection
//   validée — toujours après un RECALCUL CÔTÉ SERVEUR (§18) : le client ne
//   peut jamais imposer un total incohérent.
// ═══════════════════════════════════════════════════════════════════════════

// ── Chargement du contexte projet (privé, propriété vérifiée) ───────────────
async function loadProjectForUser(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  user: { _id: Id<"users">; role?: string },
) {
  const project = await ctx.db.get(projectId);
  if (!project || (project.userId !== user._id && user.role !== "admin")) return null;
  return project;
}

/**
 * Quantitatif détaillé réel + correction des anciennes marges d'imprévus.
 * Reproduit exactement le calcul de la page « Coût estimatif » afin que les
 * deux modules restent synchronisés au centime près.
 */
function projectQuantitatifContext(project: any) {
  const rawLots = (project?.dqe ?? project?.costEstimate?.dqe ?? null)?.lots ?? null;
  const storedCe = project?.costEstimate ?? null;
  const legacyContingencyPct = storedCe?.contingencyPercentage ?? 0;
  const realCostFactor = legacyContingencyPct > 0 ? 1 / (1 + legacyContingencyPct / 100) : 1;

  // Scénarios corrigés (mêmes montants que ceux affichés dans « Coût estimatif »).
  let costEstimate = storedCe;
  if (storedCe && realCostFactor !== 1) {
    const real = (n: number) => Math.round((Number(n) || 0) * realCostFactor);
    const s = storedCe.budgetScenarios;
    costEstimate = {
      ...storedCe,
      totalCost: real(storedCe.totalCost),
      costPerSquareMeter:
        Number(storedCe.costPerSquareMeter) > 0 ? real(storedCe.costPerSquareMeter) : storedCe.costPerSquareMeter,
      budgetScenarios: s
        ? {
            economique: { ...s.economique, totalCost: real(s.economique.totalCost) },
            standard: { ...s.standard, totalCost: real(s.standard.totalCost) },
            premium: { ...s.premium, totalCost: real(s.premium.totalCost) },
          }
        : s,
      contingencyBuffer: 0,
      contingencyPercentage: 0,
    };
  }
  return { rawLots, costEstimate, realCostFactor };
}

const isScenario = (s: unknown): s is MaterialScenarioKey =>
  (MATERIAL_SCENARIO_KEYS as readonly string[]).includes(String(s));

// ── Queries ────────────────────────────────────────────────────────────────
/**
 * Espace de travail complet du module « Choix matériaux AI » pour un projet :
 * source unique de vérité pour l'affichage (aucun recalcul côté client).
 */
export const getMaterialsWorkspace = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const project = await loadProjectForUser(ctx, projectId, user);
    if (!project) return null;

    const saved = await ctx.db
      .query("materialSelections")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", projectId))
      .first();

    const { rawLots, costEstimate, realCostFactor } = projectQuantitatifContext(project);
    const workspace = buildMaterialWorkspace({
      rawLots,
      costEstimate,
      scenario: saved?.scenario ?? "standard",
      realCostFactor,
    });

    // Détection d'obsolescence : le Quantitatif ou les prix ont-ils changé
    // depuis l'enregistrement de la sélection (§18.17) ?
    const stale = !!saved && (
      (saved.quantitativeVersion ?? "") !== workspace.quantitativeVersion ||
      (saved.priceVersion ?? "") !== workspace.priceVersion
    );

    return {
      workspace,
      saved: saved
        ? {
            id: saved._id,
            scenario: saved.scenario,
            entries: saved.entries,
            totals: saved.totals,
            status: saved.status,
            quantitativeVersion: saved.quantitativeVersion,
            priceVersion: saved.priceVersion,
            updatedAt: saved.updatedAt,
            stale,
          }
        : null,
      hasPool: Number((project as any).pools) > 0,
    };
  },
});

/** Historique des versions validées de la sélection (plus récentes d'abord). */
export const getSelectionVersions = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const project = await loadProjectForUser(ctx, projectId, user);
    if (!project) return [];
    const versions = await ctx.db
      .query("materialSelectionVersions")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", projectId))
      .collect();
    return versions.sort((a, b) => b.version - a.version);
  },
});

/**
 * AUTO-LANCEMENT (§9) — déclenché dès que le « Coût estimatif » se termine.
 *
 * Le module « Choix matériaux AI » s'initialise tout seul à partir du
 * Quantitatif détaillé fraîchement calculé : scénario de référence, sélection
 * proposée par l'IA, versions des données — SANS aucune redirection :
 * l'utilisateur reste sur la page où il se trouve, le résultat est simplement
 * prêt lorsqu'il ouvre le module.
 *
 * Appelé en « best effort » par le moteur de coût : une erreur ici ne doit
 * jamais faire échouer le calcul des coûts. Un brouillon en cours dont le
 * Quantitatif n'a pas changé n'est pas écrasé (aucune perte de travail).
 */
export async function autoLaunchMaterialSelection(
  ctx: MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
): Promise<{ launched: boolean }> {
  try {
    if (!(await readFlag(ctx, "ai_materials"))) return { launched: false };
    const project = await ctx.db.get(projectId);
    if (!project) return { launched: false };

    const { rawLots, costEstimate, realCostFactor } = projectQuantitatifContext(project);
    const ws = buildMaterialWorkspace({
      rawLots,
      costEstimate,
      scenario: "standard",
      realCostFactor,
    });
    if (!ws.hasQuantitatif || ws.lines.length === 0) return { launched: false };

    // Ne pas écraser un brouillon en cours tant que le Quantitatif / les prix
    // n'ont pas changé (protection du travail de l'utilisateur).
    const existing = await ctx.db
      .query("materialSelections")
      .withIndex("by_user_project", (q) => q.eq("userId", userId).eq("projectId", projectId))
      .first();
    const dataChanged =
      !existing ||
      (existing.quantitativeVersion ?? "") !== ws.quantitativeVersion ||
      (existing.priceVersion ?? "") !== ws.priceVersion;
    if (!dataChanged) return { launched: false };

    const entries = acceptAllRecommendations(ws.lines, ws.scenario);
    const recalculated = recalculateSelection(ws.lines, entries, ws.scenario);
    await upsertDraft(ctx, userId, projectId, {
      scenario: ws.scenario,
      entries,
      totals: {
        materialsTotal: recalculated.materialsTotal,
        referenceTotal: recalculated.referenceTotal,
        impact: recalculated.impact,
        selectedCount: recalculated.selectedCount,
        requiredCount: recalculated.requiredCount,
      },
      quantitativeVersion: ws.quantitativeVersion,
      priceVersion: ws.priceVersion,
      status: "en_cours",
    });
    return { launched: true };
  } catch {
    // Auto-lancement best-effort : jamais bloquant pour le Coût estimatif.
    return { launched: false };
  }
}

// ── Mutations ──────────────────────────────────────────────────────────────
async function assertEnabled(ctx: MutationCtx, user: any) {
  if (!(await readFlag(ctx, "ai_materials"))) {
    throw new Error("Cette fonctionnalité n'est actuellement pas disponible.");
  }
  await requireClientProAccess(ctx, user, "Choix matériaux AI");
}

async function upsertDraft(
  ctx: MutationCtx,
  userId: any,
  projectId: any,
  patch: {
    scenario: MaterialScenarioKey;
    entries: any;
    totals: any;
    quantitativeVersion?: string;
    priceVersion?: string;
    status: string;
  },
) {
  const existing = await ctx.db
    .query("materialSelections")
    .withIndex("by_user_project", (q) => q.eq("userId", userId).eq("projectId", projectId))
    .first();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, { ...patch, updatedAt: now });
    return existing._id;
  }
  return await ctx.db.insert("materialSelections", {
    userId,
    projectId,
    scenario: patch.scenario,
    entries: patch.entries,
    totals: patch.totals,
    quantitativeVersion: patch.quantitativeVersion,
    priceVersion: patch.priceVersion,
    status: patch.status,
    updatedAt: now,
  });
}

/** Persiste le scénario actif (synchronisé avec le Coût estimatif). */
export const setSelectionScenario = mutation({
  args: { projectId: v.id("projects"), scenario: v.string() },
  handler: async (ctx, { projectId, scenario }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    await assertEnabled(ctx, user);
    const project = await loadProjectForUser(ctx, projectId, user);
    if (!project) throw new Error("Projet introuvable");
    if (!isScenario(scenario)) throw new Error("Scénario invalide");

    const { realCostFactor, costEstimate, rawLots } = projectQuantitatifContext(project);
    const ws = buildMaterialWorkspace({ rawLots, costEstimate, scenario, realCostFactor });
    if (!ws.scenarios.find((s) => s.key === scenario)?.available) {
      throw new Error("Ce scénario n'est pas disponible pour ce projet.");
    }
    await upsertDraft(ctx, user._id, projectId, {
      scenario,
      entries: {},
      totals: { materialsTotal: ws.materialsTotal, referenceTotal: ws.referenceTotal },
      quantitativeVersion: ws.quantitativeVersion,
      priceVersion: ws.priceVersion,
      status: "en_cours",
    });
    return { scenario };
  },
});

/** Enregistre le brouillon de sélection (sans validation). */
export const saveSelectionDraft = mutation({
  args: {
    projectId: v.id("projects"),
    scenario: v.string(),
    entries: v.any(),
  },
  handler: async (ctx, { projectId, scenario, entries }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    await assertEnabled(ctx, user);
    const project = await loadProjectForUser(ctx, projectId, user);
    if (!project) throw new Error("Projet introuvable");
    if (!isScenario(scenario)) throw new Error("Scénario invalide");

    const { realCostFactor, costEstimate, rawLots } = projectQuantitatifContext(project);
    const ws = buildMaterialWorkspace({ rawLots, costEstimate, scenario, realCostFactor });
    // Recalcul côté serveur : le total enregistré est TOUJOURS celui du moteur.
    const reference = materialsOnly(ws.lines);
    const recalculated = recalculateSelection(reference, entries ?? {}, scenario);
    const id = await upsertDraft(ctx, user._id, projectId, {
      scenario,
      entries: entries ?? {},
      totals: {
        materialsTotal: recalculated.materialsTotal,
        referenceTotal: recalculated.referenceTotal,
        impact: recalculated.impact,
        selectedCount: recalculated.selectedCount,
        requiredCount: recalculated.requiredCount,
      },
      quantitativeVersion: ws.quantitativeVersion,
      priceVersion: ws.priceVersion,
      status: "en_cours",
    });
    return { id, totals: recalculated };
  },
});

/**
 * Valide et enregistre la sélection finale (§17.20 → §17.23).
 * Le serveur recalcule et vérifie : une sélection incomplète est refusée.
 */
export const confirmSelection = mutation({
  args: {
    projectId: v.id("projects"),
    scenario: v.string(),
    entries: v.any(),
  },
  handler: async (ctx, { projectId, scenario, entries }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    await assertEnabled(ctx, user);
    const project = await loadProjectForUser(ctx, projectId, user);
    if (!project) throw new Error("Projet introuvable");
    if (!isScenario(scenario)) throw new Error("Scénario invalide");

    const { realCostFactor, costEstimate, rawLots } = projectQuantitatifContext(project);
    const ws = buildMaterialWorkspace({ rawLots, costEstimate, scenario, realCostFactor });

    const validation = validateSelection({
      lines: ws.lines,
      selections: entries ?? {},
      scenario,
      scenarioAvailable: !!ws.scenarios.find((s) => s.key === scenario)?.available,
      budgetMaterials: ws.budget.materialsBudget,
      recommendedScenario: ws.scenario,
    });
    if (!validation.canConfirm) {
      throw new Error(validation.blocking.map((i) => i.message).join(" "));
    }

    const recalculated = recalculateSelection(ws.lines, entries ?? {}, scenario);
    const scored = ws.lines.filter((l) => l.priceAvailable);
    const averagePriceQuality = scored.length
      ? scored.reduce((s, l) => s + (ws.scores[l.articleId]?.score ?? 0), 0) / scored.length
      : 0;
    const score = selectionScore({
      materialsTotal: recalculated.materialsTotal,
      budgetMaterials: ws.budget.materialsBudget,
      validation,
      averagePriceQuality,
    });

    const previous = await ctx.db
      .query("materialSelectionVersions")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", projectId))
      .collect();
    const version = previous.reduce((max, v2) => Math.max(max, v2.version), 0) + 1;
    const now = Date.now();

    const totals = {
      materialsTotal: recalculated.materialsTotal,
      referenceTotal: recalculated.referenceTotal,
      impact: recalculated.impact,
      impactPct: recalculated.impactPct,
      selectedCount: recalculated.selectedCount,
      requiredCount: recalculated.requiredCount,
      customizedCount: recalculated.customizedCount,
      acceptedRecommendations: recalculated.acceptedRecommendations,
      projectTotal: ws.budget.projectTotal,
      materialsSharePct: ws.budget.materialsSharePct,
    };

    const versionId = await ctx.db.insert("materialSelectionVersions", {
      userId: user._id,
      projectId,
      version,
      scenario,
      entries: entries ?? {},
      totals,
      score,
      status: "valides",
      quantitativeVersion: ws.quantitativeVersion,
      priceVersion: ws.priceVersion,
      createdAt: now,
    });

    await upsertDraft(ctx, user._id, projectId, {
      scenario,
      entries: entries ?? {},
      totals,
      quantitativeVersion: ws.quantitativeVersion,
      priceVersion: ws.priceVersion,
      status: "valides",
    });

    return { versionId, version, totals, score };
  },
});

/** Réinitialise la sélection courante (les versions validées sont conservées). */
export const resetSelection = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const existing = await ctx.db
      .query("materialSelections")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", projectId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

/** Supprime une version validée (propriétaire uniquement). */
export const deleteSelectionVersion = mutation({
  args: { versionId: v.id("materialSelectionVersions") },
  handler: async (ctx, { versionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(versionId);
    if (!doc || doc.userId !== user._id) throw new Error("Accès refusé");
    await ctx.db.delete(versionId);
    return { ok: true };
  },
});

// Réexport de commodité (le moteur reste la seule source de calcul).
export type { MaterialLine, MaterialSelectionEntry };
