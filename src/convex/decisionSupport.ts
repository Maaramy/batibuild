import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { getCurrentUser } from './users'
import { scaleDqeLots } from './quantitatifCustomLogic'

// ═══════════════════════════════════════════════════════════════════════════
// AIDE À LA DÉCISION — Budget & capacité de construction.
//
// Le module ne duplique AUCUN calcul du « Coût estimatif » : il ne fait que
// LIRE la décomposition réelle du projet (`costEstimate.breakdown` + `dqe`)
// et l'utilisateur est le seul à saisir son budget disponible.
//
// Sécurité : chaque lecture / écriture vérifie que le projet appartient bien à
// l'utilisateur connecté (ou à un administrateur).
// ═══════════════════════════════════════════════════════════════════════════

async function loadOwnedProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>,
) {
  const user = await getCurrentUser(ctx)
  if (!user) return null
  const project = await ctx.db.get(projectId)
  if (!project) return null
  if (project.userId !== user._id && user.role !== 'admin') return null
  return { project, user }
}

/**
 * Contexte réel du projet nécessaire au moteur « capacité de construction ».
 *
 * SOURCE UNIQUE DE VÉRITÉ : le résultat « Estimation du coût de construction »
 * enregistré (`costEstimate` + `dqe`). Aucun montant n'est recréé, estimé ni
 * généré ici — les données subissent UNIQUEMENT les mêmes transformations
 * d'affichage que la page résultat, calculées pour le scénario enregistré du
 * projet :
 *   • Décomposition du coût × facteur du scénario (identique à
 *     `scaledBreakdown` de `ProjectDetail`) ;
 *   • Quantitatif détaillé × facteur du scénario × retrait des anciennes
 *     marges d'imprévus (identique à `scaleDqeLots(lots, scaleFactor ×
 *     realCostFactor)` de `ProjectDetail`, arrondis compris).
 */
export const getProjectBudgetContext = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const owned = await loadOwnedProject(ctx, projectId)
    if (!owned) return null
    const { project, user } = owned

    const stored = project.costEstimate ?? null
    const legacyPct = stored?.contingencyPercentage ?? 0
    const realCostFactor = legacyPct > 0 ? 1 / (1 + legacyPct / 100) : 1
    const real = (n: number) => Math.round((Number(n) || 0) * realCostFactor)

    // ── Scénario enregistré du projet — même clé et même replis que la page
    // résultat (scénario connu sinon Standard).
    const scenarios = stored?.budgetScenarios ?? null
    const persisted =
      typeof project.selectedScenario === 'string' ? project.selectedScenario : ''
    const scenarioKey: 'economique' | 'standard' | 'premium' =
      persisted === 'economique' || persisted === 'standard' || persisted === 'premium'
        ? persisted
        : 'standard'
    // Facteur du scénario affiché (scénario / Standard) — identique au
    // `scaleFactor` de `ProjectDetail`, calculé sur les montants corrigés.
    const selTotal = scenarios?.[scenarioKey]
      ? real(scenarios[scenarioKey].totalCost)
      : 0
    const stdTotal = scenarios?.standard ? real(scenarios.standard.totalCost) : 0
    const scaleFactor =
      scenarioKey !== 'standard' && selTotal > 0 && stdTotal > 0
        ? selTotal / stdTotal
        : 1

    // ── Décomposition du coût — MÊME transforme que `scaledBreakdown` de la
    // page résultat : montants enregistrés × facteur du scénario (sans
    // correction d'imprévus, exactement comme le résultat).
    const breakdown = (stored?.breakdown ?? [])
      .map((c) => ({
        category: String(c.category),
        label: c.label,
        estimatedCost:
          scaleFactor === 1
            ? Number(c.estimatedCost) || 0
            : Math.round((Number(c.estimatedCost) || 0) * scaleFactor),
        percentage: Number(c.percentage) || 0,
      }))
      .filter((c) => c.estimatedCost > 0)

    // ── Quantitatif détaillé — MÊME transforme que la page résultat :
    // `scaleDqeLots(lots, scaleFactor × realCostFactor)` (arrondis identiques,
    // prix unitaire recalculé à partir du total — exactement ce que le
    // résultat affiche).
    type CtxLine = {
      designation: string
      subcategory: string | undefined
      quantity: number
      unit: string | undefined
      unitPrice: number
      total: number
    }
    type CtxLot = { id: string; name: string; subtotal: number; lines: CtxLine[] }
    /** Ligne brute du DQE enregistré (champs lisibles tels quels). */
    type RawLine = {
      designation?: unknown
      sousLot?: unknown
      quantity?: unknown
      unit?: unknown
      unitPrice?: unknown
      total?: unknown
    }
    /** Lot brut du DQE enregistré. */
    type RawLot = {
      id?: unknown
      name?: unknown
      subtotal?: unknown
      lines?: RawLine[]
    }

    const rawLots: CtxLot[] = (((project.dqe ?? stored?.dqe ?? null)?.lots ?? []) as RawLot[])
      .map((lot) => ({
        id: String(lot?.id ?? ''),
        name: String(lot?.name ?? ''),
        subtotal: Number(lot?.subtotal) || 0,
        // Articles du Quantitatif détaillé (désignation, sous-lot, quantité,
        // prix unitaire, montant) : ce sont eux qui alimentent la
        // hiérarchie Catégorie → Sous-catégorie → Article.
        lines: (lot?.lines ?? []).map((line) => ({
          designation: String(line?.designation ?? ''),
          subcategory: line?.sousLot ? String(line.sousLot) : undefined,
          quantity: Number(line?.quantity) || 0,
          unit: line?.unit ? String(line.unit) : undefined,
          unitPrice: Number(line?.unitPrice) || 0,
          total: Number(line?.total) || (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0),
        })),
      }))
      .filter((lot) => lot.id !== '')

    const lots = scaleDqeLots(rawLots, scaleFactor * realCostFactor) as CtxLot[]

    return {
      userId: user._id,
      projectName: project.name,
      projectCategory: project.category,
      region: project.region ?? null,
      breakdown,
      lots,
      surface: project.surface ? project.surface * (project.floors || 1) : undefined,
      // Total du scénario enregistré — identique à `currentTotal` du résultat.
      totalCost: selTotal > 0 ? selTotal : stored ? real(stored.totalCost) : 0,
    }
  },
})

/** Dernier budget analysé pour ce projet (restauration au rechargement). */
export const getBudgetAnalysis = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const owned = await loadOwnedProject(ctx, projectId)
    if (!owned) return null
    const rec = await ctx.db
      .query('budgetAnalyses')
      .withIndex('by_project_user', (q) =>
        q.eq('projectId', projectId).eq('userId', owned.user._id),
      )
      .first()
    if (!rec) return null
    return {
      budgetAvailable: rec.budgetAvailable,
      analyzedAt: rec.analyzedAt,
    }
  },
})

/** Mémorise le budget saisi et le résultat de la simulation (1 ligne / projet). */
export const saveBudgetAnalysis = mutation({
  args: {
    projectId: v.id('projects'),
    budgetAvailable: v.number(),
    result: v.any(),
  },
  handler: async (ctx, { projectId, budgetAvailable, result }) => {
    const owned = await loadOwnedProject(ctx, projectId)
    if (!owned) throw new Error('Accès refusé')
    const existing = await ctx.db
      .query('budgetAnalyses')
      .withIndex('by_project_user', (q) =>
        q.eq('projectId', projectId).eq('userId', owned.user._id),
      )
      .first()
    if (existing) await ctx.db.delete(existing._id)
    await ctx.db.insert('budgetAnalyses', {
      projectId,
      userId: owned.user._id,
      budgetAvailable: Math.max(0, budgetAvailable),
      analyzedAt: Date.now(),
      result,
    })
    return null
  },
})

/** Oublie le budget analysé (l'utilisateur recommence la saisie). */
export const clearBudgetAnalysis = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const owned = await loadOwnedProject(ctx, projectId)
    if (!owned) return null
    const rec = await ctx.db
      .query('budgetAnalyses')
      .withIndex('by_project_user', (q) =>
        q.eq('projectId', projectId).eq('userId', owned.user._id),
      )
      .first()
    if (rec) await ctx.db.delete(rec._id)
    return null
  },
})