import { describe, expect, it } from 'vitest'

import type { CategoryBreakdownItem, QuantitatifLot } from '@/lib/optimizationEngine'
import { buildBudgetAnalysis } from '@/lib/optimizationEngine'

const makeBreakdown: CategoryBreakdownItem[] = [
  {
    category: 'etudes',
    label: 'Frais préliminaires et études',
    estimatedCost: 5000,
    percentage: 4.2,
    items: [],
  },
  {
    category: 'gros_oeuvre',
    label: 'Gros œuvre',
    estimatedCost: 60000,
    percentage: 50,
    items: [],
  },
  {
    category: 'second_oeuvre',
    label: 'Second œuvre et finitions',
    estimatedCost: 40000,
    percentage: 33.3,
    items: [],
  },
  {
    category: 'amenagements_exterieurs',
    label: 'Aménagements extérieurs',
    estimatedCost: 15000,
    percentage: 12.5,
    items: [],
  },
]

const makeLots: QuantitatifLot[] = [
  {
    id: 'etudes',
    name: 'Etudes',
    subtotal: 5000,
    lines: [
      { designation: 'Étude architecturale', quantity: 1, unit: 'fa', unitPrice: 5000, total: 5000, nature: 'etudes' },
    ],
  },
  {
    id: 'gros_oeuvre',
    name: 'Gros œuvre',
    subtotal: 60000,
    lines: [
      { designation: 'Ciment', quantity: 100, unit: 'sac', unitPrice: 100, total: 10000, nature: 'beton' },
    ],
  },
]

describe('buildBudgetAnalysis — déterministe et lié au projet (§3, §11)', () => {
  it('calcule les KPI du budget à partir du breakdown réel', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 60000,
      breakdown: makeBreakdown,
      lots: makeLots,
    })

    expect(analysis.available).toBe(true)
    expect(analysis.projectTotal).toBe(120000)
    expect(analysis.availableBudget).toBe(60000)
    expect(analysis.usedBudget).toBe(65000)
    expect(analysis.remainingBudget).toBe(0)
    expect(analysis.projectReachablePct).toBe(54.2)
    expect(analysis.selectedCostSharePct).toBe(54.2)
  })

  it('identifie les catégories réalisables, partiellement réalisables et à reporter', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 60000,
      breakdown: makeBreakdown,
      lots: makeLots,
    })

    expect(analysis.statusSummary.realisable.map((l) => l.categoryLabel)).toEqual([
      'Frais préliminaires et études',
      'Gros œuvre',
    ])
    expect(analysis.statusSummary.report.map((l) => l.categoryLabel)).toEqual([
      'Second œuvre et finitions',
      'Aménagements extérieurs',
    ])
  })

  it('génère trois scénarios (actuel, +50000, complet) dynamiques', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 60000,
      breakdown: makeBreakdown,
      lots: makeLots,
    })

    expect(analysis.scenarios).toHaveLength(3)
    expect(analysis.scenarios[0].scenario).toBe('actuel')
    expect(analysis.scenarios[0].budget).toBe(60000)
    expect(analysis.scenarios[1].scenario).toBe('plus_cinquantaine')
    expect(analysis.scenarios[1].budget).toBe(110000)
    expect(analysis.scenarios[2].scenario).toBe('complet')
    expect(analysis.scenarios[2].budget).toBe(120000)
  })

  it('produit une phrase récapitulative sans valeurs codées en dur', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 60000,
      breakdown: makeBreakdown,
      lots: makeLots,
    })

    expect(analysis.summarySentence).toContain('60 000 TND')
    expect(analysis.summarySentence).toContain('projet')
    expect(analysis.summarySentence).toMatch(/54,2 %/)
  })

  it('génère une recommandation IA cohérente avec la priorisation', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 60000,
      breakdown: makeBreakdown,
      lots: makeLots,
    })

    expect(analysis.recommendation).toContain('gros œuvre')
    expect(analysis.recommendation).toContain('60 000')
    expect(analysis.recommendation).toContain('finition')
  })

  it('retourne une analyse indisponible si le budget est <= 0', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 0,
      breakdown: makeBreakdown,
      lots: makeLots,
    })

    expect(analysis.available).toBe(false)
    expect(analysis.reason).toContain('0 TND')
  })

  it('retourne une analyse indisponible si le breakdown est vide', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 60000,
      breakdown: [],
      lots: [],
    })

    expect(analysis.available).toBe(false)
    expect(analysis.reason).toContain('décomposition')
  })

  it('est généré à chaque appel (horodatage)', () => {
    const before = Date.now()
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 60000,
      breakdown: makeBreakdown,
      lots: makeLots,
    })
    const after = Date.now()
    expect(analysis.generatedAt).toBeGreaterThanOrEqual(before)
    expect(analysis.generatedAt).toBeLessThanOrEqual(after)
  })
})
