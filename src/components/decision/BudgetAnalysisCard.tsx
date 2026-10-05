import { useMemo } from "react"
import { type BudgetAnalysis, formatTndAmount, formatPercent } from "@/lib/budgetEngine"

export function BudgetAnalysisCard({ analysis }: { analysis: BudgetAnalysis }) {
  const breakdown = useMemo(() => analysis.breakdown, [analysis])

  return (
    <div>
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <KPI label="Budget disponible" value={formatTndAmount(analysis.availableBudget)} tone="text-primary" />
        <KPI label="Budget utilisé" value={formatTndAmount(analysis.usedBudget)} tone="text-amber-600" />
        <KPI label="Budget restant" value={formatTndAmount(analysis.remainingBudget)} tone="text-sky-600" />
        <KPI label="Part du projet réalisable" value={`${analysis.projectReachablePct} %`} tone="text-emerald-600" />
        <KPI label="Coût total estimé" value={formatTndAmount(analysis.projectTotal)} tone="text-muted-foreground" />
        {analysis.perUnitEstimate != null && (
          <KPI label="Coût estimé au m²" value={formatTndAmount(analysis.perUnitEstimate)} tone="text-muted-foreground" />
        )}
      </div>

      {/* Quantitatif détaillé adapté au budget */}
      <div className="mt-4 overflow-x-auto text-[11px]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2">Catégorie / sous-catégorie / article</th>
              <th className="px-2 py-2 text-right">Coût estimé</th>
              <th className="px-2 py-2 text-right">Budget nécessaire</th>
              <th className="px-2 py-2 text-right">% du coût total</th>
              <th className="px-2 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((cat) => (
              <tr key={cat.categoryId} className="border-b border-border/20">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat.categoryId}
                    </span>
                    <span className="font-medium text-foreground">{cat.categoryLabel}</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatTndAmount(cat.estimatedCost)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatTndAmount(cat.fundedAmount)}</td>
                <td className="px-2 py-2 text-right">{cat.pctOfTotal} %</td>
                <td className="px-2 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${STATUS_TONE[cat.status]}`}>
                    {STATUS_LABEL[cat.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KPI({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

const STATUS_TONE = {
  realisable: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partiel: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  report: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
} as const

const STATUS_LABEL = {
  realisable: "Réalisable",
  partiel: "Partiellement réalisable",
  report: "À reporter",
} as const