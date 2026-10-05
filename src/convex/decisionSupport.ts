import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getBudgetAnalysis = query({
  args: { projectId: v.id('projects'), userId: v.id('users') },
  handler: async (ctx, { projectId, userId }) => {
    const rec = await ctx.db
      .query('budgetAnalyses')
      .withIndex('by_project_user', (q) => q.eq('projectId', projectId).eq('userId', userId))
      .first()
    if (!rec) return null
    return {
      budgetAvailable: rec.budgetAvailable,
      analyzedAt: rec.analyzedAt,
      result: rec.result,
    }
  },
})

export const saveBudgetAnalysis = mutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
    budgetAvailable: v.number(),
    result: v.object({
      available: v.boolean(),
      reason: v.optional(v.string()),
      breakdown: v.array(
        v.object({
          category: v.string(),
          label: v.string(),
          estimatedCost: v.number(),
          percentage: v.number(),
          items: v.optional(
            v.array(
              v.object({
                name: v.string(),
                quantity: v.number(),
                unit: v.string(),
                unitPrice: v.number(),
                totalPrice: v.number(),
              }),
            ),
          ),
        }),
      ),
      projectTotal: v.number(),
      scenarioLabel: v.string(),
      availableBudget: v.number(),
      usedBudget: v.number(),
      remainingBudget: v.number(),
      projectReachablePct: v.number(),
      selectedCostSharePct: v.number(),
      statusSummary: v.object({
        realisable: v.array(
          v.object({
            categoryId: v.string(),
            categoryLabel: v.string(),
            nature: v.string(),
            estimatedCost: v.number(),
            budgetNeeded: v.number(),
            pctOfTotal: v.number(),
            shareOfBreakdown: v.number(),
            workPriority: v.number(),
            status: v.string(),
            fundedByBudget: v.boolean(),
            partialNote: v.optional(v.string()),
          }),
        ),
        partiel: v.array(
          v.object({
            categoryId: v.string(),
            categoryLabel: v.string(),
            nature: v.string(),
            estimatedCost: v.number(),
            budgetNeeded: v.number(),
            pctOfTotal: v.number(),
            shareOfBreakdown: v.number(),
            workPriority: v.number(),
            status: v.string(),
            fundedByBudget: v.boolean(),
            partialNote: v.optional(v.string()),
          }),
        ),
        report: v.array(
          v.object({
            categoryId: v.string(),
            categoryLabel: v.string(),
            nature: v.string(),
            estimatedCost: v.number(),
            budgetNeeded: v.number(),
            pctOfTotal: v.number(),
            shareOfBreakdown: v.number(),
            workPriority: v.number(),
            status: v.string(),
            fundedByBudget: v.boolean(),
            partialNote: v.optional(v.string()),
          }),
        ),
      }),
      scenarios: v.array(
        v.object({
          scenario: v.string(),
          budget: v.number(),
          reachableCategories: v.array(v.string()),
          partialCategories: v.array(v.string()),
          reportCategories: v.array(v.string()),
          consumption: v.number(),
          remaining: v.number(),
          progressPct: v.number(),
          costSharePct: v.number(),
          headline: v.string(),
        }),
      ),
      recommendation: v.string(),
      summarySentence: v.string(),
      perUnitEstimate: v.optional(v.number()),
      surface: v.optional(v.number()),
      generatedAt: v.number(),
    }),
  },
  handler: async (ctx, { projectId, userId, budgetAvailable, result }) => {
    const existing = await ctx.db
      .query('budgetAnalyses')
      .withIndex('by_project_user', (q) => q.eq('projectId', projectId).eq('userId', userId))
      .first()
    if (existing) {
      await ctx.db.delete(existing._id)
    }
    await ctx.db.insert('budgetAnalyses', {
      projectId,
      userId,
      budgetAvailable,
      analyzedAt: Date.now(),
      result,
    })
  },
})

export const deleteBudgetAnalysis = mutation({
  args: { projectId: v.id('projects'), userId: v.id('users') },
  handler: async (ctx, { projectId, userId }) => {
    const rec = await ctx.db
      .query('budgetAnalyses')
      .withIndex('by_project_user', (q) => q.eq('projectId', projectId).eq('userId', userId))
      .first()
    if (rec) await ctx.db.delete(rec._id)
  },
})
