"use client"

import React, { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { BudgetAnalysis, MIN_BUDGET_TND } from "@/lib/budgetEngine"
import { loadOwnedProject } from "@/lib/loadedProject"
import { formatTnd } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Input } from "@/components/ui/input"

function getBudgetAnalysisResult(result: any): any {
  return result
}

export function BudgetCapacityCard({ projectId }: { projectId: string }) {
  const typedProjectId = projectId as Id<"projects">
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
  const [budgetAvailable, setBudgetAvailable] = useState("")
  const saveBudget = useMutation(api.decisionSupport.saveBudgetAnalysis)

  const budget = Number(budgetAvailable)
  const budgetAnalysis = useMemo<BudgetAnalysis | null>(() => {
    if (!budgetContext || !userId) return null
    const n = Math.max(0, budget)
    if (n < MIN_BUDGET_TND) return null
    if (n === 0) return null
    const analysis = buildBudgetAnalysis({
      projectId: "",
      userId,
      projectName: budgetContext?.projectName ?? "",
      scenarioLabel: "Standard",
      projectTotal: budgetContext?.totalCost ?? 0,
      surface: budgetContext?.surface,
      breakdown: budgetContext?.breakdown ?? [],
      budgetAvailable: n,
    })
    return analysis
  }, [budgetContext, budget, userId])

  const handleAnalyze = useCallback(() => {
    if (!budgetContext || budget < MIN_BUDGET_TND) return
    const n = Math.max(0, budget)
    const analysis = buildBudgetAnalysis({
      projectId: "",
      userId,
      projectName: budgetContext?.projectName ?? "",
      scenarioLabel: "Standard",
      projectTotal: budgetContext?.totalCost ?? 0,
      surface: budgetContext?.surface,
      breakdown: budgetContext?.breakdown ?? [],
      budgetAvailable: n,
    })
    saveBudget({ projectId: typedProjectId, budgetAvailable: n, result: { projectTotal: analysis.projectTotal, scenarioLabel: "Standard" } })
  }, [budgetContext, budget, userId, saveBudget, typedProjectId])

  const handleEdit = useCallback(() => {
    setBudgetAvailable("")
    handleAnalyze()
  }, [handleAnalyze])

  const formattedBudget = formatTnd(budget)
  const formattedAvailable = formatTnd(budgetContext?.budgetAvailable ?? 0)

  if (!allowed) {
    }
  if (!budgetContext) {
    return (
      <Card className="border-dashed">
        <CardContent>
          <div className="p-4">
            <h3 className="text-sm font-bold">Votre budget disponible</h3>
            <p className="text-[11px] text-muted-foreground">
              Saisissez votre budget total disponible.
            </p>
            <Input
              type="number"
              min="0"
              step="1"
              value={budgetAvailable}
              onChange={(e) => setBudgetAvailable(e.target.value)}
              placeholder="0 TND"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && Number(budgetAvailable) >= MIN_BUDGET_TND) {
                  e.preventDefault()
                  handleAnalyze()
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  const analysis = budgetAnalysis
  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground">
            Votre budget participant n"est pas disponible pour ce projet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <p className="text-[11px] text-muted-foreground">
          Budget analysé : {formatTnd(analysis.budget)} TND
        </p>
      </CardContent>
    </Card)
  )
}
