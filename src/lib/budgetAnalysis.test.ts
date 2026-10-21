import { describe, expect, it } from 'vitest'

import {
  BUDGET_SIMULATION_STEP_TND,
  BUDGET_STEP_TND,
  MAX_BUDGET_TND,
  MIN_BUDGET_TND,
  buildBudgetAnalysis,
  clampBudgetTnd,
  formatTndAmount,
  initialBudgetTnd,
  isBudgetAnalyzable,
  type CategoryBreakdownItem,
  type QuantitatifLot,
} from '@/lib/budgetEngine'

/** Quantitatif détaillé réel : sous-lots + articles rattachés au gros œuvre. */
const makeLots: QuantitatifLot[] = [
  {
    id: 'gros_oeuvre',
    name: 'Gros œuvre (fondations, structures)',
    subtotal: 60000,
    lines: [
      {
        designation: 'Fouilles, remblais, radier / semelles filantes',
        subcategory: 'Terrassement et fondations',
        quantity: 1,
        unit: 'forfait',
        unitPrice: 20000,
        total: 20000,
      },
      {
        designation: 'Hérisson, film polyane, isolant, dalle béton',
        subcategory: 'Soubassement et dallage',
        quantity: 1,
        unit: 'forfait',
        unitPrice: 40000,
        total: 40000,
      },
    ],
  },
]

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

function analyze(budgetAvailable: number, lots: QuantitatifLot[] = []) {
  return buildBudgetAnalysis({
    projectId: 'proj-1',
    userId: 'user-1',
    projectName: 'Projet test',
    projectTotal: 120000,
    scenarioLabel: 'Standard',
    budgetAvailable,
    breakdown: makeBreakdown,
    lots,
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

  it('refuse un budget inférieur au minimum requis de 50 000 TND', () => {
    expect(MIN_BUDGET_TND).toBe(50_000)
    const analysis = analyze(MIN_BUDGET_TND - 1)

    expect(analysis.available).toBe(false)
    expect(analysis.reason).toContain(formatTndAmount(MIN_BUDGET_TND))
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
describe('buildBudgetAnalysis — hiérarchie du Quantitatif détaillé', () => {
  it('reconstitue les sous-catégories du lot réel rattaché à la catégorie', () => {
    const analysis = analyze(60000, makeLots)
    const grosOeuvre = analysis.breakdown.find((l) => l.categoryId === 'gros_oeuvre')

    expect(grosOeuvre?.subcategories.map((s) => s.subcategoryLabel)).toEqual([
      'Soubassement et dallage',
      'Terrassement et fondations',
    ])
    expect(grosOeuvre?.subcategories[0].articles.map((a) => a.designation)).toEqual([
      'Hérisson, film polyane, isolant, dalle béton',
    ])
  })

  it('répartit le coût de la catégorie sur ses sous-catégories et articles', () => {
    const analysis = analyze(60000, makeLots)
    const grosOeuvre = analysis.breakdown.find((l) => l.categoryId === 'gros_oeuvre')

    expect(grosOeuvre?.subcategories[0].estimatedCost).toBe(40000)
    expect(grosOeuvre?.subcategories[1].estimatedCost).toBe(20000)
    expect(grosOeuvre?.subcategories[0].pctOfCategory).toBe(66.7)
    expect(grosOeuvre?.subcategories[1].pctOfCategory).toBe(33.3)
  })

  it('calcule le pourcentage de réalisation à chaque niveau', () => {
    // 60 000 de budget : 5 000 études + 55 000 de gros œuvre (partiel).
    const analysis = analyze(60000, makeLots)
    const grosOeuvre = analysis.breakdown.find((l) => l.categoryId === 'gros_oeuvre')!
    const [dallage, terrassement] = grosOeuvre.subcategories

    expect(grosOeuvre.realizationPct).toBe(91.7)
    // Le budget est engagé sous-catégorie par sous-catégorie (coût décroissant) :
    // dallage (40 000) puis terrassement, partiellement financé (15 000 sur 20 000).
    expect(dallage.status).toBe('realisable')
    expect(dallage.realizationPct).toBe(100)
    expect(terrassement.status).toBe('partiel')
    expect(terrassement.fundedAmount).toBe(15000)
    expect(terrassement.realizationPct).toBe(75)
    // Articles : 40 000 sur 40 000 terminés, puis 15 000 sur 20 000.
    expect(dallage.articles[0].realizationPct).toBe(100)
    expect(terrassement.articles[0].fundedAmount).toBe(15000)
    expect(terrassement.articles[0].realizationPct).toBe(75)
  })

  it('ne finance aucune sous-catégorie quand le budget est épuisé avant elle', () => {
    // 10 000 études + 40 000 dallage = 50 000 (le minimum analysable) : il ne
    // reste rien pour le terrassement.
    const analysis = buildBudgetAnalysis({
      projectId: 'proj-1',
      userId: 'user-1',
      projectName: 'Projet test',
      scenarioLabel: 'Standard',
      projectTotal: 125000,
      budgetAvailable: MIN_BUDGET_TND,
      breakdown: [
        { ...makeBreakdown[0], estimatedCost: 10000 },
        makeBreakdown[1],
        makeBreakdown[2],
        makeBreakdown[3],
      ],
      lots: makeLots,
    })
    const grosOeuvre = analysis.breakdown.find((l) => l.categoryId === 'gros_oeuvre')!
    const [dallage, terrassement] = grosOeuvre.subcategories

    expect(dallage.realizationPct).toBe(100)
    expect(terrassement.status).toBe('report')
    expect(terrassement.realizationPct).toBe(0)
    expect(terrassement.articles[0].fundedAmount).toBe(0)
  })

  it('agrège une catégorie sans détail Quantitatif en un seul niveau', () => {
    const analysis = analyze(60000)
    const amenagements = analysis.breakdown.find((l) => l.categoryId === 'amenagements_exterieurs')!

    expect(amenagements.subcategories).toHaveLength(1)
    expect(amenagements.subcategories[0].articles).toHaveLength(0)
    expect(amenagements.subcategories[0].realizationPct).toBe(0)
  })

  it('n’invente aucun montant : la somme des articles égale le détail du lot', () => {
    const analysis = analyze(60000, makeLots)
    const grosOeuvre = analysis.breakdown.find((l) => l.categoryId === 'gros_oeuvre')!
    const totalArticles = grosOeuvre.subcategories.flatMap((s) => s.articles)
      .reduce((sum, a) => sum + a.estimatedCost, 0)

    expect(totalArticles).toBe(60000)
    expect(grosOeuvre.subcategories.reduce((s, x) => s + x.estimatedCost, 0)).toBe(60000)
  })
})

describe('buildBudgetAnalysis — couverture du catalogue de lots réel', () => {
  /** Tous les identifiants de lots émis par le moteur de Quantitatif détaillé. */
  const REAL_LOT_IDS = [
    'alimentation', 'amenagement', 'amenagements', 'amenagements_exterieurs', 'appareillage',
    'cablage', 'carrelage', 'charpente', 'chauffe_eau', 'cloisons', 'coque', 'cuisine_pro',
    'cvc', 'depose', 'depose_demolition', 'divers', 'eclairage', 'electricite', 'enseignes',
    'equipements', 'essais', 'etancheite', 'evacuation', 'facade', 'filtration', 'finition',
    'frais_preliminaires', 'froid', 'gros_oeuvre', 'maconnerie', 'main_oeuvre', 'menuiserie',
    'meubles', 'nettoyage', 'nettoyage_finition', 'peinture', 'plan_travail', 'plomberie',
    'portes', 'preparation', 'revetements', 'robinetterie', 'sanitaires', 'second_oeuvre',
    'structure', 'tableau', 'terrassement', 'terre', 'toiture', 'ventilation', 'vrd',
  ]

  it('rattache chaque lot réel à une catégorie (aucun article perdu)', () => {
    const breakdown: CategoryBreakdownItem[] = [
      { category: 'etudes', label: 'Frais préliminaires et études', estimatedCost: 1, percentage: 0 },
      { category: 'gros_oeuvre', label: 'Gros œuvre', estimatedCost: 1, percentage: 0 },
      { category: 'second_oeuvre', label: 'Second œuvre et finitions', estimatedCost: 1, percentage: 0 },
      { category: 'equipements', label: 'Équipements', estimatedCost: 1, percentage: 0 },
      { category: 'amenagements_exterieurs', label: 'Aménagements extérieurs', estimatedCost: 1, percentage: 0 },
      { category: 'transport', label: 'Transports & autres', estimatedCost: 1, percentage: 0 },
      { category: 'main_oeuvre', label: 'Main-d’œuvre', estimatedCost: 1, percentage: 0 },
    ]
    const lots = REAL_LOT_IDS.map((id) => ({
      id,
      name: id,
      subtotal: 1,
      lines: [{ designation: `Article ${id}`, quantity: 1, unit: 'u', unitPrice: 1, total: 1 }],
    }))
    const analysis = buildBudgetAnalysis({
      projectId: 'p', userId: 'u', projectName: 'P', scenarioLabel: 'Standard',
      projectTotal: 7, budgetAvailable: MIN_BUDGET_TND, breakdown, lots,
    })

    const seen = analysis.breakdown.flatMap((c) =>
      c.subcategories.flatMap((s) => s.articles.map((a) => a.designation)),
    )
    const orphans = REAL_LOT_IDS.filter((id) => !seen.includes(`Article ${id}`))
    expect(orphans).toEqual([])
    expect(seen).toHaveLength(REAL_LOT_IDS.length)
  })

  it('rattache un lot inconnu mais explicite à sa catégorie par mots-clés', () => {
    const analysis = buildBudgetAnalysis({
      projectId: 'p', userId: 'u', projectName: 'P', scenarioLabel: 'Standard',
      projectTotal: 100000, budgetAvailable: 60000, breakdown: makeBreakdown,
      lots: [{
        id: 'maconnerie_fondations_2027',
        name: 'Maçonnerie et fondations',
        subtotal: 60000,
        lines: [{ designation: 'Béton de fondation', quantity: 1, unit: 'm³', unitPrice: 60000, total: 60000 }],
      }],
    })
    const grosOeuvre = analysis.breakdown.find((l) => l.categoryId === 'gros_oeuvre')!

    expect(grosOeuvre.subcategories[0].articles[0].designation).toBe('Béton de fondation')
  })
})

describe('curseur de budget — bornes, pas et valeur initiale', () => {
  it('applique le seuil de 50 000 TND et la borne haute de 1 000 000 TND', () => {
    expect(MIN_BUDGET_TND).toBe(50_000)
    expect(MAX_BUDGET_TND).toBe(1_000_000)
    expect(BUDGET_STEP_TND).toBe(10_000)
    expect(isBudgetAnalyzable(50_000)).toBe(true)
    expect(isBudgetAnalyzable(49_999)).toBe(false)
  })

  it('borne le curseur sans jamais sortir de la plage', () => {
    expect(clampBudgetTnd(0)).toBe(50_000)
    expect(clampBudgetTnd(-20_000)).toBe(50_000)
    expect(clampBudgetTnd(1_500_000)).toBe(1_000_000)
    expect(clampBudgetTnd(Number.NaN)).toBe(50_000)
  })

  it('aligne la valeur sur le pas de 10 000 TND', () => {
    expect(clampBudgetTnd(50_000)).toBe(50_000)
    expect(clampBudgetTnd(55_000)).toBe(60_000)
    expect(clampBudgetTnd(64_000)).toBe(60_000)
    expect(clampBudgetTnd(1_000_000)).toBe(1_000_000)
  })

  it('démarre à 50 000 TND sauf budget enregistré valide', () => {
    expect(initialBudgetTnd(null)).toBe(50_000)
    expect(initialBudgetTnd(undefined)).toBe(50_000)
    expect(initialBudgetTnd(25_000)).toBe(50_000)
    expect(initialBudgetTnd(2_000_000)).toBe(50_000)
    expect(initialBudgetTnd(500_000)).toBe(500_000)
  })
})
