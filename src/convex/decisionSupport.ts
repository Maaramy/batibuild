import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { getCurrentUser } from './users'

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
 * Les montants sont corrigés de l'ancienne majoration d'imprévus afin de
 * rester identiques au « Coût estimatif » affiché.
 */
export const getProjectBudgetContext = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const owned = await loadOwnedProject(ctx, projectId)
    if (!owned) return null
    const { project, user } = owned

    const stored = project.costEstimate ?? null
    const legacyPct = stored?.contingencyPercentage ?? 0
    const factor = legacyPct > 0 ? 1 / (1 + legacyPct / 100) : 1
    const real = (n: number) => Math.round((Number(n) || 0) * factor)

    const breakdown = (stored?.breakdown ?? [])
      .filter((c) => (Number(c.estimatedCost) || 0) > 0)
      .map((c) => ({
        category: String(c.category),
        label: c.label,
        estimatedCost: real(c.estimatedCost),
        percentage: Number(c.percentage) || 0,
      }))

    const lots = ((project.dqe ?? stored?.dqe ?? null)?.lots ?? [])
      .map((lot: any) => ({
        id: String(lot?.id ?? ''),
        name: String(lot?.name ?? ''),
        subtotal: real(Number(lot?.subtotal) || 0),
      }))
      .filter((lot: { id: string }) => lot.id !== '')

    return {
      userId: user._id,
      projectName: project.name,
      projectCategory: project.category,
      region: project.region ?? null,
      breakdown,
      lots,
      surface: project.surface ? project.surface * (project.floors || 1) : undefined,
      totalCost: stored ? real(stored.totalCost) : 0,
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
    return { budgetAvailable: rec.budgetAvailable, analyzedAt: rec.analyzedAt }
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