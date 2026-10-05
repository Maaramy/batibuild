import { describe, expect, it } from 'vitest'

import {
  buildBudgetAnalysis,
  MIN_BUDGET_TND,
  BUDGET_SIMULATION_STEP_TND,
  type CategoryBreakdownItem,
} from '@/lib/budgetEngine'

const makeBreakdown: CategoryBreakdownItem[] = [
  { category: 'etudes', label: 'Frais préliminaires et études', estimatedCost: 5000, percentage: 4.2 },
  { category: 'gros_oeuvre', label: 'Gros œuvre', estimatedCost: 60000, percentage: 50 },
  { category: 'second_oeuvre', label: 'Second œuvre et finitions', estimatedCost: 40000, percentage: 33.3 },
  {
    category: 'amenagements_exterieurs',
    label: 'Aménagements extérieurs',
    estimatedCost: 15000,
    percentage: 12.5,
  },
]

function analyze(budgetAvailable: number) {
  return buildBudgetAnalysis({
    projectId: 'proj-1',
    userId: 'user-1',
    projectName: 'Projet test',
    projectTotal: 120000,
    scenarioLabel: 'Standard',
    budgetAvailable,
    breakdown: makeBreakdown,
  })
}

describe('buildBudgetAnalysis — déterministe et lié au projet', () => {
  it('calcule les indicateurs du budget à partir de la décomposition réelle', () => {
    const analysis = analyze(60000)

    expect(analysis.available).toBe(true)
    expect(analysis.projectTotal).toBe(120000)
    expect(analysis.availableBudget).toBe(60000)
    expect(analysis.usedBudget).toBe(60000)
    expect(analysis.remainingBudget).toBe(0)
    expect(analysis.projectReachablePct).toBe(50)
    expect(analysis.budgetUsedPct).toBe(100)
    // Part du coût total correspondant aux travaux sélectionnables.
    expect(analysis.selectedCostSharePct).toBe(50)
  })

  it("calcule l'écart avec le coût total et le chantier suivant", () => {
    const analysis = analyze(60000)

    expect(analysis.gapToProjectTotal).toBe(60000)
    expect(analysis.nextCategoryLabel).toBe('Gros œuvre')
    // 60 000 de gros œuvre, 55 000 financés → 5 000 manquants.
    expect(analysis.gapToNextCategory).toBe(5000)
  })

  it('propose une combinaison optimale de catégories pour le budget', () => {
    const analysis = analyze(60000)

    expect(analysis.optimalCombination).toContain('Frais préliminaires et études')
    expect(analysis.optimalCombination).toContain('Gros œuvre')
    expect(analysis.optimalCombination).toContain('55 000 TND')
  })

  it('classe les chantiers selon la priorité de construction et le budget', () => {
    const analysis = analyze(60000)

    expect(analysis.statusSummary.realisable.map((l) => l.categoryLabel)).toEqual([
      'Frais préliminaires et études',
    ])
    expect(analysis.statusSummary.partiel.map((l) => l.categoryLabel)).toEqual(['Gros œuvre'])
    expect(analysis.statusSummary.report.map((l) => l.categoryLabel)).toEqual([
      'Second œuvre et finitions',
      'Aménagements extérieurs',
    ])
  })

  it('indique le budget cumulé nécessaire pour chaque chantier', () => {
    const analysis = analyze(60000)
    const needed = Object.fromEntries(
      analysis.breakdown.map((l) => [l.categoryId, l.budgetNeeded]),
    )

    expect(needed.etudes).toBe(5000)
    expect(needed.gros_oeuvre).toBe(65000)
    expect(needed.second_oeuvre).toBe(105000)
    expect(needed.amenagements_exterieurs).toBe(120000)
  })

  it('tient compte de la part de chaque chantier dans le coût total', () => {
    const analysis = analyze(60000)
    const grosOeuvre = analysis.breakdown.find((l) => l.categoryId === 'gros_oeuvre')

    expect(grosOeuvre?.pctOfTotal).toBe(50)
  })

  it('génère trois scénarios dynamiques (actuel, budget augmenté, projet complet)', () => {
    const analysis = analyze(60000)

    expect(analysis.scenarios.map((s) => s.scenario)).toEqual([
      'actuel',
      'plus_palier',
      'complet',
    ])
    expect(analysis.scenarios[0].budget).toBe(60000)
    expect(analysis.scenarios[1].budget).toBe(60000 + BUDGET_SIMULATION_STEP_TND)
    expect(analysis.scenarios[2].budget).toBe(120000)
    // Le budget « projet complet » finance nécessairement 100 % du projet.
    expect(analysis.scenarios[2].progressPct).toBe(100)
    expect(analysis.scenarios[2].remaining).toBe(0)
  })

  it('indique le montant et le pourcentage restant à financer par scénario', () => {
    const analysis = analyze(60000)
    const [actuel, , complet] = analysis.scenarios

    expect(actuel.remainingToFund).toBe(60000)
    expect(actuel.remainingToFundPct).toBe(50)
    expect(complet.remainingToFund).toBe(0)
    expect(complet.remainingToFundPct).toBe(0)
  })

  it('liste les travaux supplémentaires possibles dans le scénario budget augmenté', () => {
    const analysis = analyze(60000)
    const [, boosted] = analysis.scenarios

    // 60 000 → 70 000 finance en plus 10 000 de second œuvre.
    expect(boosted.additionalCategories).toContain('Second œuvre et finitions')
    expect(boosted.progressPct).toBeGreaterThan(analysis.scenarios[0].progressPct)
  })

  it('fait progresser les scénarios avec le budget (monotonic)', () => {
    const analysis = analyze(60000)
    const [actuel, plus, complet] = analysis.scenarios

    expect(actuel.progressPct).toBeLessThan(plus.progressPct)
    expect(plus.progressPct).toBeLessThanOrEqual(complet.progressPct)
  })

  it('produit une phrase récapitulative sans montant codé en dur', () => {
    const analysis = analyze(60000)

    expect(analysis.summarySentence).toContain('60 000 TND')
    expect(analysis.summarySentence).toContain('50 %')
    expect(analysis.summarySentence).toContain('Projet test')
    expect(analysis.summarySentence).toContain('Second œuvre et finitions')
  })

  it('génère une recommandation cohérente avec la priorisation', () => {
    const analysis = analyze(60000)

    expect(analysis.recommendation.toLowerCase()).toContain('gros œuvre')
    expect(analysis.recommendation).toContain('60 000 TND')
    expect(analysis.recommendation.toLowerCase()).toContain('finition')
  })

  it('refuse un budget inférieur au minimum requis de 25 000 TND', () => {
    const analysis = analyze(MIN_BUDGET_TND - 1)

    expect(analysis.available).toBe(false)
    expect(analysis.reason).toContain('25 000 TND')
    expect(analysis.scenarios).toHaveLength(0)
  })

  it('accepte un budget exactement égal au minimum', () => {
    expect(analyze(MIN_BUDGET_TND).available).toBe(true)
  })

  it('marque tous les chantiers comme réalisables quand le budget couvre le projet', () => {
    const analysis = analyze(150000)

    expect(analysis.projectReachablePct).toBe(100)
    expect(analysis.statusSummary.realisable).toHaveLength(4)
    expect(analysis.statusSummary.partiel).toHaveLength(0)
    expect(analysis.statusSummary.report).toHaveLength(0)
    expect(analysis.remainingBudget).toBe(30000)
    expect(analysis.gapToNextCategory).toBe(0)
    expect(analysis.nextCategoryLabel).toBe('')
  })

  it('indique une indisponibilité explicite si le budget est nul', () => {
    const analysis = analyze(0)

    expect(analysis.available).toBe(false)
    expect(analysis.reason).toContain('0 TND')
    expect(analysis.scenarios).toHaveLength(0)
  })

  it('indique une indisponibilité explicite si la décomposition est vide', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      projectTotal: 120000,
      scenarioLabel: 'Standard',
      budgetAvailable: 60000,
      breakdown: [],
    })

    expect(analysis.available).toBe(false)
    expect(analysis.reason).toContain('Quantitatif détaillé')
  })

  it('est déterministe : deux appels donnent le même résultat (hors horodatage)', () => {
    const strip = ({ generatedAt, ...rest }: ReturnType<typeof analyze>) => rest
    expect(JSON.stringify(strip(analyze(60000)))).toBe(JSON.stringify(strip(analyze(60000))))
  })

  it('horodate chaque analyse', () => {
    const before = Date.now()
    const analysis = analyze(60000)
    const after = Date.now()

    expect(analysis.generatedAt).toBeGreaterThanOrEqual(before)
    expect(analysis.generatedAt).toBeLessThanOrEqual(after)
  })
})