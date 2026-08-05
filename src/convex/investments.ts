import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  INVESTMENT_TYPE_META,
  INVESTMENT_TYPES,
  INVESTMENT_ZONES,
  INVESTMENT_ZONE_MAP,
  DEFAULT_ZONE,
  SCENARIO_DEFAULTS,
  FORECAST_HORIZONS,
  analysisInputValidator,
  type InvestmentAnalysisInput,
  type InvestmentAnalysisResults,
  type InvestmentAiInsights,
  type InvestmentIndicators,
  type InvestmentScenario,
  type InvestmentScore,
  type InvestmentType,
} from "./investmentTypes";

// ============================================================================
// Moteur d'analyse de la rentabilité des investissements immobiliers
// Calculs financiers déterministes basés sur le marché tunisien 2026
// (Les actions IA sont définies dans investmentAi.ts)
// ============================================================================

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => Math.round(n);

// ── Normalisation des entrées ───────────────────────────────────────────────

export type NormalizedInput = {
  name: string;
  investmentType: InvestmentType;
  purchasePrice: number;
  area?: number;
  region: string;
  city?: string;
  monthlyRent: number;
  occupancyRate: number;
  annualExpensesPct: number;
  renovationCost: number;
  acquisitionFeesPct: number;
  annualAppreciationPct: number;
  rentGrowthPct: number;
  inflationPct: number;
  horizonYears: number;
};

export function normalizeInput(input: InvestmentAnalysisInput): NormalizedInput {
  const zone = INVESTMENT_ZONE_MAP[input.region] ?? DEFAULT_ZONE;
  return {
    name: input.name?.trim() || "Analyse immobilière",
    investmentType: input.investmentType,
    purchasePrice: Math.max(1, input.purchasePrice),
    area: input.area && input.area > 0 ? input.area : undefined,
    region: input.region,
    city: input.city?.trim() || undefined,
    monthlyRent: Math.max(0, input.monthlyRent),
    occupancyRate: clamp(input.occupancyRate ?? 95, 50, 100),
    annualExpensesPct: clamp(input.annualExpensesPct ?? 18, 0, 60),
    renovationCost: Math.max(0, input.renovationCost ?? 0),
    acquisitionFeesPct: clamp(input.acquisitionFeesPct ?? 6, 0, 20),
    annualAppreciationPct:
      input.annualAppreciationPct !== undefined
        ? clamp(input.annualAppreciationPct, -5, 20)
        : zone.appreciationPct,
    rentGrowthPct: clamp(input.rentGrowthPct ?? 3, -5, 15),
    inflationPct: clamp(input.inflationPct ?? 6, 0, 25),
    horizonYears: clamp(Math.round(input.horizonYears ?? 10), 5, 30),
  };
}

// ── Projections annuelles ───────────────────────────────────────────────────

export function projectYearSeries(
  input: NormalizedInput,
  opts: { rentGrowthPct: number; appreciationPct: number; inflationPct: number; occupancyRate: number },
  years: number,
) {
  const purchasePrice = money(input.purchasePrice);
  const totalCost = money(
    purchasePrice * (1 + input.acquisitionFeesPct / 100) +
      money(input.renovationCost),
  );
  const baseGross = money(input.monthlyRent * 12 * (opts.occupancyRate / 100));
  const baseExpenses = money(baseGross * (input.annualExpensesPct / 100));

  const points: {
    year: number;
    netIncome: number;
    cumulativeIncome: number;
    propertyValue: number;
    cumulativeProfit: number;
  }[] = [];

  let rent = baseGross;
  let expenses = baseExpenses;
  let cumulativeIncome = 0;

  for (let y = 1; y <= years; y++) {
    rent *= 1 + opts.rentGrowthPct / 100;
    expenses *= 1 + opts.inflationPct / 100;
    const net = Math.max(0, money(rent) - money(expenses));
    cumulativeIncome += net;
    const propertyValue = money(purchasePrice * Math.pow(1 + opts.appreciationPct / 100, y));
    const cumulativeProfit = money(cumulativeIncome + (propertyValue - totalCost));
    points.push({ year: y, netIncome: net, cumulativeIncome: money(cumulativeIncome), propertyValue, cumulativeProfit });
  }
  return points;
}

// ── Indicateurs financiers ──────────────────────────────────────────────────

export function computeIndicators(input: NormalizedInput): InvestmentIndicators {
  const purchasePrice = money(input.purchasePrice);
  const acquisitionFees = money(purchasePrice * (input.acquisitionFeesPct / 100));
  const renovationCost = money(input.renovationCost);
  const totalCost = purchasePrice + acquisitionFees + renovationCost;

  const grossAnnualRent = money(input.monthlyRent * 12 * (input.occupancyRate / 100));
  const operatingExpenses = money(grossAnnualRent * (input.annualExpensesPct / 100));
  const netAnnualIncome = grossAnnualRent - operatingExpenses;

  const monthlyCashflow = money(netAnnualIncome / 12);
  const grossYieldPct = round2((grossAnnualRent / totalCost) * 100);
  const netYieldPct = round2((netAnnualIncome / totalCost) * 100);
  const roiAnnualPct = round2((netAnnualIncome / totalCost) * 100);
  const priceToRentRatio = round1(totalCost / (input.monthlyRent * 12));

  const roiFor = (years: number) => {
    const pts = projectYearSeries(
      input,
      {
        rentGrowthPct: input.rentGrowthPct,
        appreciationPct: input.annualAppreciationPct,
        inflationPct: input.inflationPct,
        occupancyRate: input.occupancyRate,
      },
      years,
    );
    const last = pts[pts.length - 1];
    return { roi: round2((last.cumulativeProfit / totalCost) * 100), profit: last.cumulativeProfit };
  };

  const roi5 = roiFor(5);
  const roi10 = roiFor(10);

  const paybackYears = netAnnualIncome > 0 ? round1(totalCost / netAnnualIncome) : 99;
  const paybackDate = Date.now() + paybackYears * 365.25 * 24 * 3600 * 1000;

  return {
    purchasePrice,
    totalCost,
    acquisitionFees,
    renovationCost,
    monthlyRent: input.monthlyRent,
    occupancyRate: input.occupancyRate,
    grossAnnualRent,
    operatingExpenses,
    netAnnualIncome,
    monthlyCashflow,
    annualCashflow: netAnnualIncome,
    grossYieldPct,
    netYieldPct,
    roiAnnualPct,
    roi5yPct: roi5.roi,
    roi10yPct: roi10.roi,
    paybackYears,
    paybackDate,
    paybackDateLabel: new Date(paybackDate).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
    }),
    pricePerM2: input.area ? money(purchasePrice / input.area) : undefined,
    priceToRentRatio,
  };
}

// ── Prévisions ──────────────────────────────────────────────────────────────

export function buildForecasts(input: NormalizedInput) {
  const points = projectYearSeries(
    input,
    {
      rentGrowthPct: input.rentGrowthPct,
      appreciationPct: input.annualAppreciationPct,
      inflationPct: input.inflationPct,
      occupancyRate: input.occupancyRate,
    },
    input.horizonYears,
  );

  const totalCost = computeIndicators(input).totalCost;

  const summary = FORECAST_HORIZONS.filter((h) => h <= input.horizonYears).map((h) => {
    const p = points[h - 1];
    return {
      horizon: h,
      label: h === 1 ? "1 an" : `${h} ans`,
      netIncome: p.netIncome,
      futureValue: p.propertyValue,
      gain: p.cumulativeProfit,
      cumulativeProfit: p.cumulativeProfit,
      roiPct: round2((p.cumulativeProfit / totalCost) * 100),
    };
  });

  return { points, summary };
}

// ── Scénarios ───────────────────────────────────────────────────────────────

export function buildScenarios(input: NormalizedInput): InvestmentScenario[] {
  const base = computeIndicators(input);
  const years = input.horizonYears;

  const riskLists: Record<string, string[]> = {
    optimiste: [
      "Hypothèses de croissance optimistes (loyers +5%/an, valorisation majorée).",
      "En cas de retournement conjoncturel, les résultats réels peuvent être nettement inférieurs.",
      "La revente dépend de la liquidité du marché local.",
    ],
    realiste: [
      "Taux de vacance entre deux locataires (à prévoir chaque année).",
      "Hausse des charges, de la fiscalité et de l'entretien avec l'inflation.",
      "Travaux de gros entretien imprévus sur l'horizon.",
    ],
    prudent: [
      "Demande locative plus faible que prévu dans la zone.",
      "Stagnation voire repli des prix immobiliers en période de crise.",
      "Coût d'opportunité du capital ou du crédit élevé.",
      "Durée de revente longue, liquidité réduite.",
    ],
  };

  return (["optimiste", "realiste", "prudent"] as const).map((key) => {
    const d = SCENARIO_DEFAULTS[key];
    const rentGrowthPct =
      key === "realiste" ? input.rentGrowthPct : d.rentGrowthPct;
    const appreciationPct =
      key === "realiste"
        ? input.annualAppreciationPct
        : clamp(input.annualAppreciationPct + d.appreciationOffset, 0, 20);
    const inflationPct =
      key === "realiste" ? input.inflationPct : d.inflationPct;
    const occupancyRate = clamp(input.occupancyRate + d.occupancyOffset, 50, 100);

    const pts = projectYearSeries(
      input,
      { rentGrowthPct, appreciationPct, inflationPct, occupancyRate },
      years,
    );
    const last = pts[pts.length - 1];

    const gross = money(input.monthlyRent * 12 * (occupancyRate / 100));
    const expenses = money(gross * (input.annualExpensesPct / 100));
    const netYieldPct = round2(((gross - expenses) / base.totalCost) * 100);

    return {
      key,
      label: d.label,
      futureValue: last.propertyValue,
      totalIncome: last.cumulativeIncome,
      roiPct: round2((last.cumulativeProfit / base.totalCost) * 100),
      netYieldPct,
      cumulativeProfit: last.cumulativeProfit,
      riskLevel: key === "optimiste" ? "Faible" : key === "realiste" ? "Modéré" : "Élevé",
      risks: riskLists[key],
    };
  });
}

// ── Score IA (0-100) ────────────────────────────────────────────────────────

export function computeScore(input: NormalizedInput, indicators: InvestmentIndicators): InvestmentScore {
  const meta = INVESTMENT_TYPE_META[input.investmentType];
  const zone = INVESTMENT_ZONE_MAP[input.region] ?? DEFAULT_ZONE;

  const riskFactor = meta.riskLevel === "Faible" ? 0.9 : meta.riskLevel === "Moyen" ? 1.0 : 1.15;

  const criteria = [
    {
      key: "rentabilite",
      label: "Rentabilité",
      score: Math.round(clamp((indicators.netYieldPct / meta.yieldBenchmark) * 100, 0, 100)),
      max: 100,
      weight: 25,
    },
    {
      key: "emplacement",
      label: "Emplacement",
      score: Math.round(clamp(zone.demandIndex * 0.7 + (100 - zone.riskScore) * 0.3, 0, 100)),
      max: 100,
      weight: 15,
    },
    {
      key: "demande",
      label: "Demande locative",
      score: Math.round(clamp((zone.demandIndex + meta.demand) / 2, 0, 100)),
      max: 100,
      weight: 20,
    },
    {
      key: "risque",
      label: "Risque",
      score: Math.round(clamp(100 - zone.riskScore * riskFactor, 0, 100)),
      max: 100,
      weight: 15,
    },
    {
      key: "appreciation",
      label: "Potentiel d'appréciation",
      score: Math.round(clamp((input.annualAppreciationPct / 6) * 100, 0, 100)),
      max: 100,
      weight: 15,
    },
    {
      key: "liquidite",
      label: "Liquidité",
      score: meta.liquidity,
      max: 100,
      weight: 10,
    },
  ];

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  const total = Math.round(
    criteria.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight,
  );

  const grade =
    total >= 85
      ? "Excellent investissement"
      : total >= 70
        ? "Bon investissement"
        : total >= 55
          ? "Investissement correct"
          : "Investissement risqué";

  return { total, grade, label: grade, criteria };
}

// ── Comparaison avec d'autres types d'investissement ────────────────────────

export function buildComparison(input: NormalizedInput, indicators: InvestmentIndicators) {
  const zone = INVESTMENT_ZONE_MAP[input.region] ?? DEFAULT_ZONE;
  const budget = indicators.totalCost;
  const compareTypes = ["appartement", "villa", "local_commercial", "bureau", "terrain"] as const;

  return compareTypes.map((type) => {
    const meta = INVESTMENT_TYPE_META[type];
    const appreciationPct = round1((zone.appreciationPct + meta.appreciationBenchmark) / 2);
    const annualIncome = money(budget * (meta.yieldBenchmark / 100));
    const netYieldPct = round2((annualIncome / budget) * 100);

    const pts = projectYearSeries(
      {
        ...input,
        investmentType: type,
        monthlyRent: money(annualIncome / 12 / (input.occupancyRate / 100)),
        annualAppreciationPct: appreciationPct,
      },
      { rentGrowthPct: 3, appreciationPct, inflationPct: input.inflationPct, occupancyRate: input.occupancyRate },
      input.horizonYears,
    );
    const last = pts[pts.length - 1];
    const roi10yPct = round2((last.cumulativeProfit / budget) * 100);

    const score = Math.round(
      clamp(
        (meta.yieldBenchmark / 8) * 40 + (zone.demandIndex / 100) * 25 + (meta.liquidity / 100) * 20 + ((100 - zone.riskScore) / 100) * 15,
        0,
        100,
      ),
    );

    return {
      type,
      label: meta.label,
      totalCost: budget,
      annualIncome,
      netYieldPct,
      roi10yPct,
      riskLevel: meta.riskLevel,
      appreciationPct,
      score,
    };
  });
}

// ── Zone & confiance ────────────────────────────────────────────────────────

export function buildZoneInfo(input: NormalizedInput) {
  const zone = INVESTMENT_ZONE_MAP[input.region] ?? DEFAULT_ZONE;
  const ranked = [...INVESTMENT_ZONES].sort(
    (a, b) => b.demandIndex * 0.6 + (100 - b.riskScore) * 0.4 - (a.demandIndex * 0.6 + (100 - a.riskScore) * 0.4),
  );
  const rank = ranked.findIndex((z) => z.region === zone.region) + 1;
  return { ...zone, rank, highlights: zone.highlights };
}

export function computeConfidence(input: NormalizedInput): number {
  const zone = INVESTMENT_ZONE_MAP[input.region] ?? DEFAULT_ZONE;
  let c = 88;
  if (input.annualExpensesPct > 25) c -= 6;
  if (input.occupancyRate >= 95) c += 3;
  if (input.occupancyRate < 85) c -= 4;
  if (!input.area) c -= 4;
  if (zone.demandIndex >= 85) c += 3;
  if (zone.demandIndex < 60) c -= 5;
  return Math.round(clamp(c, 60, 97));
}

// ── Moteur complet ──────────────────────────────────────────────────────────

export function runEngine(input: InvestmentAnalysisInput): InvestmentAnalysisResults {
  const normalized = normalizeInput(input);
  const indicators = computeIndicators(normalized);
  const { points, summary } = buildForecasts(normalized);
  const scenarios = buildScenarios(normalized);
  const score = computeScore(normalized, indicators);
  const comparison = buildComparison(normalized, indicators);
  const zone = buildZoneInfo(normalized);
  const aiConfidence = computeConfidence(normalized);

  return {
    indicators,
    forecasts: points,
    forecastSummary: summary,
    scenarios,
    score,
    comparison,
    zone,
    aiConfidence,
    generatedAt: Date.now(),
  };
}

// ── Insights IA déterministes (fallback) ────────────────────────────────────

export function fallbackInsights(input: NormalizedInput, results: InvestmentAnalysisResults): InvestmentAiInsights {
  const ind = results.indicators;
  const meta = INVESTMENT_TYPE_META[input.investmentType];
  const zone = results.zone;

  const yieldGap = round1(ind.netYieldPct - meta.yieldBenchmark);
  const recs: string[] = [];

  if (yieldGap < -0.5) {
    recs.push(`Rendement net (${ind.netYieldPct}%) en dessous du benchmark ${meta.label} (${meta.yieldBenchmark}%). Négociez le prix d'achat de 5 à 10% pour améliorer la rentabilité.`);
  } else if (yieldGap > 1) {
    recs.push(`Excellent rendement net (${ind.netYieldPct}%) par rapport au benchmark (${meta.yieldBenchmark}%) : l'opération est bien positionnée.`);
  } else {
    recs.push(`Rendement net de ${ind.netYieldPct}% dans la moyenne du marché pour un ${meta.label.toLowerCase()} (benchmark ${meta.yieldBenchmark}%).`);
  }

  if (ind.paybackYears <= 12) {
    recs.push(`Capital récupéré en ${ind.paybackYears} ans : rythme sain. Visez une revente après ${Math.max(10, Math.ceil(ind.paybackYears))} ans pour maximiser la plus-value cumulée.`);
  } else {
    recs.push(`La récupération du capital prend ${ind.paybackYears} ans : vérifiez le potentiel de plus-value (${input.annualAppreciationPct}%/an supposés) ou envisagez une renégociation du prix.`);
  }

  if (zone.demandIndex >= 85) {
    recs.push(`${zone.name} est une zone à très forte demande locative (indice ${zone.demandIndex}/100) : la vacance devrait rester faible.`);
  } else if (zone.demandIndex < 60) {
    recs.push(`La demande locative à ${zone.name} est limitée (indice ${zone.demandIndex}/100) : prévoyez des périodes de vacance et un rendement plus volatile.`);
  }

  recs.push("Intégrez 6% de frais d'acquisition (enregistrement + notaire) et une réserve de 5% du budget pour l'imprévu.");
  recs.push("Faites vérifier le titre foncier, le certificat de conformité et la situation fiscale avant tout engagement.");

  const risks: string[] = [
    `Vacance locative potentielle (taux retenu : ${100 - input.occupancyRate}%).`,
    "Évolution de la fiscalité immobilière et des charges de copropriété.",
    zone.riskScore >= 40 ? `Marché local peu liquide à ${zone.name} : revente potentiellement longue.` : `Liquidité correcte à ${zone.name}, mais dépendante de la conjoncture nationale.`,
    "Inflation et coût de l'entretien (hypothèse d'indexation des charges retenue).",
  ];

  const marketNotes: string[] = [
    `Prix moyen à ${zone.name} : ${zone.pricePerM2.toLocaleString("fr-FR")} TND/m² · loyer moyen ${zone.rentPerM2} TND/m²/mois.`,
    `Appréciation annuelle attendue : ${input.annualAppreciationPct}% (moyenne nationale ~4-5%).`,
    `Inflation retenue : ${input.inflationPct}% · croissance des loyers : ${input.rentGrowthPct}%/an.`,
    `Score d'attractivité de la zone : ${zone.rank}/${INVESTMENT_ZONES.length} en Tunisie.`,
  ];

  return {
    summary:
      `Analyse d'un ${meta.label.toLowerCase()} à ${zone.name} d'un coût total de ${ind.totalCost.toLocaleString("fr-FR")} TND. ` +
      `Rendement net de ${ind.netYieldPct}%, capital récupéré en ${ind.paybackYears} ans, score IA de ${results.score.total}/100 (${results.score.grade.toLowerCase()}).`,
    verdict: results.score.grade,
    recommendations: recs,
    risks,
    marketNotes,
    usedFallback: true,
    generatedAt: Date.now(),
  };
}

// ============================================================================
// Queries (public data & own analyses)
// ============================================================================

export const getInvestmentZones = query({
  args: {},
  handler: () => {
    return [...INVESTMENT_ZONES].sort(
      (a, b) => b.demandIndex * 0.6 + (100 - b.riskScore) * 0.4 - (a.demandIndex * 0.6 + (100 - a.riskScore) * 0.4),
    );
  },
});

export const getComparisonBenchmarks = query({
  args: {},
  handler: () =>
    INVESTMENT_TYPES.map((t) => ({
      type: t,
      ...INVESTMENT_TYPE_META[t],
    })),
});

export const getComparison = query({
  args: {
    budget: v.number(),
    region: v.string(),
    horizonYears: v.optional(v.number()),
  },
  handler: (ctx, args) => {
    const input = normalizeInput({
      investmentType: "appartement",
      purchasePrice: Math.max(1, args.budget),
      region: args.region,
      monthlyRent: 1,
      horizonYears: args.horizonYears ?? 10,
    });
    const ind = computeIndicators(input);
    return buildComparison(input, ind);
  },
});

export const listAnalyses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("investmentAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getAnalysis = query({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== user._id) return null;
    return doc;
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const saveAnalysis = mutation({
  args: {
    input: analysisInputValidator,
    results: v.optional(v.any()),
    aiInsights: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const now = Date.now();
    const id = await ctx.db.insert("investmentAnalyses", {
      userId: user._id,
      input: normalizeInput(args.input),
      results: (args.results ?? runEngine(args.input)) as any,
      aiInsights: args.aiInsights as any,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const deleteAnalysis = mutation({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== user._id) throw new Error("Analyse introuvable");
    await ctx.db.delete(args.analysisId);
    return { success: true };
  },
});
