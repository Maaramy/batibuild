"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { buildBudgetAnalysis, type BudgetAnalysis, MIN_BUDGET_TND } from "@/lib/budgetEngine"
import { loadOwnedProject } from "@/lib/loadOwnedProject"
import { useTypedQuery } from "@/lib/useTypedQuery"

type OptimizationState = {
  projectId: string
  allowed: boolean
  budgetAvailable: string
  budgetAnalysis: BudgetAnalysis | null
  refetchBudget: () => void
}

type OptimizationContextValue = {
  state: OptimizationState
  setBudgetAvailable: (value: string) => void
}

const emptyContext: OptimizationContextValue = {
  state: {
    projectId: "",
    allowed: false,
    budgetAvailable: "",
    budgetAnalysis: null,
    refetchBudget: () => {},
  },
  setBudgetAvailable: () => {},
}

const OptimizationContext = createContext<OptimizationContextValue>(emptyContext)

export function OptimizationProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  const typedProjectId = projectId as Id<"projects">
  const [budgetAvailable, setBudgetAvailable] = useState("")

  const access = useQuery(api.access.checkClientProAccess, {})
  const allowed = access?.allowed === true

  const budgetContext = useQuery(
    api.decisionSupport.getProjectBudgetContext,
    allowed ? { projectId: typedProjectId } : "skip",
  )

  const savedBudget = useQuery(
    api.decisionSupport.getBudgetAnalysis,
    allowed ? { projectId: typedProjectId } : "skip",
  )

  const saveBudget = useMutation(api.decisionSupport.saveBudgetAnalysis)
  const clearBudget = useMutation(api.decisionSupport.clearBudgetAnalysis)

  const { budgetAnalysis, refetchBudget } = useBudgetAnalysisSync({
    projectId: typedProjectId,
    userId: budgetContext?.userId,
    projectName: budgetContext?.projectName ?? "",
    scenarioLabel: "Standard",
    projectTotal: budgetContext?.totalCost ?? 0,
    surface: budgetContext?.surface,
    breakdown: budgetContext?.breakdown ?? [],
    budgetAvailable,
    onSave: saveBudget,
    onClear: clearBudget,
    savedBudget,
  })

  const state: OptimizationState = useMemo(
    () => ({
      projectId,
      allowed,
      budgetAvailable,
      budgetAnalysis,
      refetchBudget,
    }),
    [projectId, allowed, budgetAvailable, budgetAnalysis, refetchBudget],
  )

  const stateValue: OptimizationContextValue = useMemo(
    () => ({ state, setBudgetAvailable }),
    [state, setBudgetAvailable],
  )

  return (
    <OptimizationContext.Provider value={stateValue}>{children}</OptimizationContext.Provider>
  )
}

export function useOptimizationContext() {
  return useContext(OptimizationContext)
}

function useBudgetAnalysisSync({
  projectId,
  userId,
  projectName,
  scenarioLabel,
  projectTotal,
  surface,
  breakdown,
  budgetAvailable,
  onSave,
  onClear,
  savedBudget,
}: {
  projectId: Id<"projects">
  userId: string | undefined
  projectName: string
  scenarioLabel: string
  projectTotal: number
  surface?: number
  breakdown: { category: string; label: string; estimatedCost: number; percentage: number }[]
  budgetAvailable: string
  onSave: (args: { projectId: Id<"projects">; budgetAvailable: number; result: Record<string, unknown> }) => undefined
  onClear: (args: { projectId: Id<"projects"> }) => undefined
  savedBudget: { budgetAvailable: number } | undefined
}) {
  const [budgetAnalysis, setBudgetAnalysis] = useState<BudgetAnalysis | null>(null)
  const [lastBudget, setLastBudget] = useState<string>("")

  const recompute = useCallback(
    (available: string) => {
      if (!userId) return
      const n = Math.max(0, Number(available))
      if (n < MIN_BUDGET_TND) {
        const analysis = buildBudgetAnalysis({
          projectId: "",
          userId,
          projectName,
          scenarioLabel,
          projectTotal,
          surface,
          breakdown: [],
          budgetAvailable: 0,
        })
        setBudgetAnalysis(analysis)
        return
      }
      if (Number(available) === 0) {
        const analysis = buildBudgetAnalysis({
          projectId: "",
          userId,
          projectName,
          scenarioLabel,
          projectTotal,
          surface,
          breakdown: breakdown,
          budgetAvailable: 0,
        })
        setBudgetAnalysis(analysis)
        return
      }
      const analysis = buildBudgetAnalysis({
        projectId: "",
        userId,
        projectName,
        scenarioLabel,
        projectTotal,
        surface,
        breakdown,
        budgetAvailable: n,
      })
      setBudgetAnalysis(analysis)
      onSave({ projectId, budgetAvailable: n, result: { projectTotal, scenarioLabel } })
    },
    [userId, projectName, scenarioLabel, projectTotal, surface, breakdown, onSave, onClear],
  )

  const refetchBudget = useCallback(() => {
    const saved = savedBudget?.budgetAvailable
    if (saved && saved > 0) {
      const str = String(saved)
      setLastBudget(str)
      recompute(str)
    } else {
      setBudgetAnalysis(null)
    }
  }, [savedBudget, recompute])

  useMemo(() => {
    if (budgetAnalysis === null && savedBudget?.budgetAvailable > 0) {
      const saved = savedBudget?.budgetAvailable
      const str = String(saved)
      setLastBudget(str)
      recompute(str)
    }
  }, [budgetAnalysis, savedBudget, recompute])

  return { budgetAnalysis, refetchBudget }
}
