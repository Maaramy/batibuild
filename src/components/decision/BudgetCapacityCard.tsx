import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { buildBudgetAnalysis } from '@/lib/optimizationEngine'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatTnd } from '@/lib/utils'
import { Sparkles, RefreshCw, Target } from 'lucide-react'

export function BudgetCapacityCard({
  projectId,
  userId,
  projectName,
  projectTotal,
  scenarioLabel,
}: {
  projectId: Id<'projects'>
  userId: Id<'users'>
  projectName: string
  projectTotal: number
  scenarioLabel: string
}) {
  const dqe = useQuery(api.projects.getProjectDqe, { projectId }) as any[]
  const breakdown = useQuery(api.projects.getCostBreakdown, { projectId }) as any[]
  const lastAnalysis = useQuery(api.decisionSupport.getBudgetAnalysis, {
    projectId,
    userId,
  })

  const storedBudget = lastAnalysis?.budgetAvailable ?? 0
  const [budgetValue, setBudgetValue] = useState(() =>
    storedBudget > 0 ? String(storedBudget) : ''
  )
  const [analyzing, setAnalyzing] = useState(false)

  const budgetNum = Number(budgetValue)
  const budgetAvailable = Number.isFinite(budgetNum) && budgetNum > 0 ? budgetNum : 0

  const analysis = useMemo(() => {
    if (!budgetAvailable || !breakdown?.length) return null
    return buildBudgetAnalysis({
      projectId: String(projectId),
      userId: String(userId),
      projectName,
      projectTotal,
      scenarioLabel,
      budgetAvailable,
      breakdown: breakdown as any,
      lots: dqe as any,
      surface: undefined,
    })
  }, [budgetAvailable, breakdown, dqe, projectTotal, scenarioLabel])

  const handleAnalyze = async () => {
    if (!budgetAvailable) return
    setAnalyzing(true)
    await api.decisionSupport.saveBudgetAnalysis.run({
      projectId,
      userId,
      budgetAvailable,
      result: analysis,
    })
    setAnalyzing(false)
  }

  const handleEdit = () => {
    if (lastAnalysis) {
      api.decisionSupport.deleteBudgetAnalysis.run({ projectId, userId })
    }
    setBudgetValue('')
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-tight">Quel est votre budget disponible ?</p>
            <p className="text-[11px] text-muted-foreground">
              Saisissez votre budget total disponible pour ce projet. L'analyse sera calculée automatiquement.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="sr-only">Budget total (TND)</label>
            <Input
              type="number"
              min="0.01"
              step="1000"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              placeholder="0 TND"
              className="h-10 text-base font-medium tabular-nums"
            />
          </div>
          <Button
            className="gap-1.5 whitespace-nowrap"
            disabled={!Number.isFinite(budgetNum) || budgetNum <= 0 || analyzing}
            onClick={handleAnalyze}
          >
            {analyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyser mon budget avec l'IA
          </Button>
        </div>

        {budgetAvailable > 0 && analysis && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <KPIBlock label="Budget disponible" value={formatTndInt(analysis.availableBudget)} tone="text-primary" />
              <KPIBlock label="Budget utilisé" value={formatTndInt(analysis.usedBudget)} tone="text-amber-600 dark:text-amber-400" />
              <KPIBlock label="Budget restant" value={formatTndInt(analysis.remainingBudget)} tone="text-sky-600 dark:text-sky-400" />
              <KPIBlock label="Part du projet réalisable" value={analysis.projectReachablePct.toLocaleString('fr-FR') + ' %'} tone="text-emerald-600 dark:text-emerald-400" />
              <KPIBlock label="Coût total estimé" value={formatTndInt(analysis.projectTotal)} tone="text-muted-foreground" />
              {analysis.perUnitEstimate != null && (
                <KPIBlock label="Chiffre d'affaires estimé à m²" value={formatTndInt(analysis.perUnitEstimate)} tone="text-muted-foreground" />
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Catégorie</th>
                    <th className="px-2 py-2 text-right">Coût estimé</th>
                    <th className="px-2 py-2 text-right">Budget nécessaire</th>
                    <th className="px-2 py-2 text-right">% du coût total</th>
                    <th className="px-2 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.breakdown.map((cat: any) => {
                    const status: string = cat.estimatedCost <= analysis.availableBudget ? 'realisable' : 'report'
                    return (
                      <tr key={cat.category} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {cat.category}
                            </span>
                            <span className="text-foreground font-medium">{cat.label}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{formatTndInt(cat.estimatedCost)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {status === 'realisable' ? formatTndInt(cat.estimatedCost) : '—'}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {cat.percentage.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                        </td>
                        <td className="px-2 py-2">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold', {
                            'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300': status === 'realisable',
                            'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300': status === 'report',
                          })}>
                            {status === 'realisable' ? 'Réalisable' : 'À reporter'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Que puis-je construire avec mon budget ?</p>
              {analysis.scenarios.map((sc: any) => (
                <div key={sc.scenario} className="overflow-hidden rounded-xl border border-border/40">
                  <div className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-left',
                    sc.scenario === 'actuel' && 'bg-primary/5 border-primary/30',
                    sc.scenario === 'plus_cinquantaine' && 'bg-sky-500/5 border-sky-500/30',
                    sc.scenario === 'complet' && 'bg-emerald-500/5 border-emerald-500/30',
                  )}>
                    <span className="text-[12px] font-semibold">
                      {sc.scenario === 'actuel' && 'Budget actuel'}
                      {sc.scenario === 'plus_cinquantaine' && '+ 50 000 TND'}
                      {sc.scenario === 'complet' && 'Projet complet'}
                    </span>
                    <span className="ml-auto text-[11px] font-bold tabular-nums">
                      Budget : {formatTndInt(sc.budget)} TND
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        · {sc.progressPct.toLocaleString('fr-FR')} %
                      </span>
                    </span>
                  </div>
                  {sc.scenario === 'actuel' && (
                    <div className="border-t border-border/30 px-3 py-2 text-[11px] text-muted-foreground">
                      {sc.reachableCategories.length > 0 && (
                        <span className="font-medium text-foreground">
                          Travaux réalisables : {sc.reachableCategories.map((c: string) => categoryLabel(c)).join(', ')}
                        </span>
                      )}
                      {sc.partialCategories.length > 0 && (
                        <span className="block mt-1">
                          Partiellement réalisables : {sc.partialCategories.map((c: string) => categoryLabel(c)).join(', ')}
                        </span>
                      )}
                      {sc.reportCategories.length > 0 && (
                        <span className="block mt-1 text-amber-700 dark:text-amber-300">
                          À reporter : {sc.reportCategories.map((c: string) => categoryLabel(c)).join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Progression du projet</p>
              <div className="mt-1 flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${analysis.projectReachablePct}%` }}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {analysis.projectReachablePct.toLocaleString('fr-FR')} %
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${analysis.selectedCostSharePct}%` }}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-bold tabular-nums text-primary">
                  {analysis.selectedCostSharePct.toLocaleString('fr-FR')} %
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                {budgetProgressionBlocks(analysis.projectReachablePct)}
              </p>
            </div>

            {analysis.recommendation && (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recommandation de l'IA</p>
                    <p className="mt-1 text-[11px] leading-snug text-foreground">{analysis.recommendation}</p>
                  </div>
                </div>
              </div>
            )}

            {analysis.summarySentence && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
                <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                  {analysis.summarySentence}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleEdit}>
                <RefreshCw className="h-3.5 w-3.5" />
                Modifier mon budget
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function KPIBlock({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums">{value}</p>
    </div>
  )
}

function categoryLabel(cat: string): string {
  const CAT_LABELS: Record<string, string> = {
    etudes: 'Frais préliminaires et études',
    gros_oeuvre: 'Gros œuvre',
    second_oeuvre: 'Second œuvre et finitions',
    amenagements_exterieurs: 'Aménagements extérieurs',
    main_oeuvre: "Main d'œuvre",
    equipements: 'Équipements',
    transport: 'Transport',
  }
  return CAT_LABELS[String(cat).toLowerCase()] ?? String(cat)
}

function budgetProgressionBlocks(pct: number, total = 24, max = 100): string {
  const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))
  const filled = clamp(Math.round((clamp(pct, 0, max) / max) * total), 0, total)
  return '█'.repeat(filled) + '░'.repeat(total - filled)
}

function formatTndInt(n: number) {
  return formatTnd(Math.round(n))
}
