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
  resolveZoneUtility,
  forcedRentModeFor,
  type ZoneUtility,
  type InvestmentZone,
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
  quartier?: string;
  // Loyer : mode (nuitée / mensuel), montant brut saisi et loyer mensuel
  // équivalent utilisé par le moteur (nuitée → montant × 365/12).
  rentMode: "nuit" | "mensuel";
  rentAmount: number;
  monthlyRent: number;
  occupancyRate: number;
  // Charges d'exploitation annuelles détaillées (TND/an)
  annualCharges: number;
  insurance: number;
  managementFees: number;
  taxationPct: number; // fiscalité (% du revenu locatif brut)
  // Frais d'acquisition (TND, sauf acquisitionFeesPct en % du prix)
  renovationCost: number;
  financingFees: number;
  agencyFees: number;
  furnishingCost: number;
  acquisitionFeesPct: number;
  annualAppreciationPct: number;
  rentGrowthPct: number;
  inflationPct: number;
  horizonYears: number;
};

/** Charge d'exploitation annuelle = charges détaillées + fiscalité sur le brut. */
function annualExpensesFor(input: NormalizedInput, grossAnnualRent: number): number {
  return money(
    input.annualCharges +
      input.insurance +
      input.managementFees +
      grossAnnualRent * (input.taxationPct / 100),
  );
}

export function normalizeInput(input: InvestmentAnalysisInput): NormalizedInput {
  const zone = applyZoneUtility(
    INVESTMENT_ZONE_MAP[input.region] ?? DEFAULT_ZONE,
    resolveZoneUtility(input.city?.trim(), input.quartier?.trim()),
  );
  // Borne basse 30 % : l'estimation IA du taux d'occupation en mode nuitée
  // (location saisonnière) peut légitimement descendre sous 50 %.
  const occupancyRate = clamp(input.occupancyRate ?? 95, 30, 100);

  // ── Loyer estimé : choix nuitée / mensuel ──
  // Certains types de bien imposent un mode de loyer unique (local commercial,
  // bureau, entrepôt, terrain → mensuel ; résidence touristique → nuitée) : le
  // mode est recalé et le montant converti pour préserver l'équivalent mensuel.
  // nuitée : l'équivalent mensuel vaut montant × 365/12 (plein tarif, le taux
  // d'occupation est appliqué ensuite par le moteur sur les nuitées).
  const inputMode: "nuit" | "mensuel" = input.rentMode === "nuit" ? "nuit" : "mensuel";
  const rentMode: "nuit" | "mensuel" = forcedRentModeFor(input.investmentType) ?? inputMode;
  const rawAmount = Math.max(0, input.rentAmount ?? 0);
  const rawMonthly = Math.max(0, input.monthlyRent ?? 0);
  // Équivalent mensuel du montant saisi, interprété dans le mode d'origine.
  const sourceMonthly =
    rawAmount > 0
      ? inputMode === "nuit"
        ? rawAmount * (365 / 12)
        : rawAmount
      : rawMonthly;
  const monthlyRent = money(sourceMonthly);
  const rentAmount =
    rentMode === "nuit"
      ? rawAmount > 0 && inputMode === "nuit"
        ? rawAmount
        : money(sourceMonthly / (365 / 12))
      : rawAmount > 0 && inputMode === "mensuel"
        ? rawAmount
        : money(sourceMonthly);

  // ── Charges d'exploitation : nouveau modèle détaillé (TND/an) ──
  // Rétro-compatibilité : les anciennes analyses ne fournissent que
  // annualExpensesPct (%) → conversion en montant annuel équivalent.
  const hasItemized = [
    input.annualCharges,
    input.insurance,
    input.managementFees,
    input.taxationPct,
  ].some((x) => typeof x === "number");
  const annualCharges = hasItemized
    ? Math.max(0, input.annualCharges ?? 0)
    : money(
        monthlyRent * 12 * (occupancyRate / 100) * (clamp(input.annualExpensesPct ?? 18, 0, 60) / 100),
      );

  return {
    name: input.name?.trim() || "Analyse immobilière",
    investmentType: input.investmentType,
    purchasePrice: Math.max(1, input.purchasePrice),
    area: input.area && input.area > 0 ? input.area : undefined,
    region: input.region,
    city: input.city?.trim() || undefined,
    quartier: input.quartier?.trim() || undefined,
    rentMode,
    rentAmount,
    monthlyRent,
    occupancyRate,
    annualCharges,
    insurance: Math.max(0, input.insurance ?? 0),
    managementFees: Math.max(0, input.managementFees ?? 0),
    taxationPct: clamp(input.taxationPct ?? 0, 0, 50),
    renovationCost: Math.max(0, input.renovationCost ?? 0),
    financingFees: Math.max(0, input.financingFees ?? 0),
    agencyFees: Math.max(0, input.agencyFees ?? 0),
    furnishingCost: Math.max(0, input.furnishingCost ?? 0),
    acquisitionFeesPct: clamp(input.acquisitionFeesPct ?? 6, 0, 20),
    // Hypothèses fixes du moteur (marché tunisien 2026) :
    // croissance des loyers 5 %/an, inflation 6 %, appréciation du bien 4-6 %.
    annualAppreciationPct:
      input.annualAppreciationPct !== undefined
        ? clamp(input.annualAppreciationPct, 4, 6)
        : clamp(zone.appreciationPct, 4, 6),
    rentGrowthPct: 5,
    inflationPct: 6,
    // Durée minimale de l'investissement : 5 ans
    horizonYears: clamp(Math.round(input.horizonYears ?? 10), 5, 30),
  };
}

/** Applique les modulations d'utilité de la ville / du quartier au gouvernorat. */
function applyZoneUtility(base: InvestmentZone, utility: ZoneUtility | null): InvestmentZone {
  if (!utility) return base;
  return {
    ...base,
    pricePerM2: Math.max(400, Math.round(base.pricePerM2 * utility.priceFactor)),
    rentPerM2: Math.round(base.rentPerM2 * utility.rentFactor * 10) / 10,
    demandIndex: clamp(base.demandIndex + utility.demandOffset, 30, 99),
    appreciationPct: round1(clamp(base.appreciationPct + utility.appreciationOffset, 1, 12)),
    riskScore: clamp(base.riskScore + utility.riskOffset, 5, 85),
  };
}

/** Résout la zone effective (gouvernorat modulé par ville/quartier) + utilité. */
export function resolveZoneInfo(input: NormalizedInput): { zone: InvestmentZone; utility: ZoneUtility | null } {
  const base = INVESTMENT_ZONE_MAP[input.region] ?? DEFAULT_ZONE;
  const utility = resolveZoneUtility(input.city, input.quartier);
  return { zone: applyZoneUtility(base, utility), utility };
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
      money(input.renovationCost) +
      money(input.financingFees) +
      money(input.agencyFees) +
      money(input.furnishingCost),
  );
  const baseGross = money(input.monthlyRent * 12 * (opts.occupancyRate / 100));
  const baseExpenses = annualExpensesFor(input, baseGross);

  const points: {
    year: number;
    netIncome: number;
    cumulativeIncome: number;
    propertyValue: number;
    cumulativeProfit: number;
    grossRent?: number;
    expenses?: number;
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
    points.push({
      year: y,
      netIncome: net,
      cumulativeIncome: money(cumulativeIncome),
      propertyValue,
      cumulativeProfit,
      grossRent: money(rent),
      expenses: money(expenses),
    });
  }
  return points;
}

// ── Indicateurs financiers ──────────────────────────────────────────────────

export function computeIndicators(input: NormalizedInput): InvestmentIndicators {
  const purchasePrice = money(input.purchasePrice);
  const acquisitionFees = money(purchasePrice * (input.acquisitionFeesPct / 100));
  const renovationCost = money(input.renovationCost);
  const financingFees = money(input.financingFees);
  const agencyFees = money(input.agencyFees);
  const furnishingCost = money(input.furnishingCost);
  const totalCost = purchasePrice + acquisitionFees + renovationCost + financingFees + agencyFees + furnishingCost;

  const grossAnnualRent = money(input.monthlyRent * 12 * (input.occupancyRate / 100));
  const taxation = money(grossAnnualRent * (input.taxationPct / 100));
  const operatingExpenses = annualExpensesFor(input, grossAnnualRent);
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
    financingFees,
    agencyFees,
    furnishingCost,
    annualCharges: money(input.annualCharges),
    insurance: money(input.insurance),
    managementFees: money(input.managementFees),
    taxation,
    rentMode: input.rentMode,
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
    const occupancyRate = clamp(input.occupancyRate + d.occupancyOffset, 30, 100);

    const pts = projectYearSeries(
      input,
      { rentGrowthPct, appreciationPct, inflationPct, occupancyRate },
      years,
    );
    const last = pts[pts.length - 1];

    const gross = money(input.monthlyRent * 12 * (occupancyRate / 100));
    const expenses = annualExpensesFor(input, gross);
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
  const zone = resolveZoneInfo(input).zone;

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
  const zone = resolveZoneInfo(input).zone;
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
      { rentGrowthPct: 5, appreciationPct, inflationPct: input.inflationPct, occupancyRate: input.occupancyRate },
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
  const { zone, utility } = resolveZoneInfo(input);
  const zoneScore = (z: { demandIndex: number; riskScore: number }) =>
    z.demandIndex * 0.6 + (100 - z.riskScore) * 0.4;
  const baseScore = zoneScore(zone);
  const rank =
    1 + INVESTMENT_ZONES.filter((z) => zoneScore(z) > baseScore).length;
  const highlights = utility
    ? [...zone.highlights, `${utility.label} : quartier reconnu, attractivité ${utility.utilityIndex}/100`]
    : zone.highlights;
  return {
    ...zone,
    region: zone.region,
    name: zone.name,
    rank,
    highlights,
    city: input.city,
    quartier: input.quartier,
    utilityIndex: utility?.utilityIndex,
    utilityLabel: utility?.label,
  };
}

export function computeConfidence(input: NormalizedInput): number {
  const zone = resolveZoneInfo(input).zone;
  let c = 88;
  const gross = money(input.monthlyRent * 12 * (input.occupancyRate / 100));
  const expenseRatio = gross > 0 ? annualExpensesFor(input, gross) / gross : 0;
  if (expenseRatio > 0.3) c -= 6;
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

  recs.push("Intégrez les frais d'acquisition (enregistrement + notaire), les frais de financement et d'agence le cas échéant, et conservez une réserve de 5% du budget pour l'imprévu.");
  recs.push("Faites vérifier le titre foncier, le certificat de conformité et la situation fiscale avant tout engagement.");

  const risks: string[] = [
    `Vacance locative potentielle (taux retenu : ${100 - input.occupancyRate}%).`,
    "Évolution de la fiscalité immobilière et des charges de copropriété.",
    zone.riskScore >= 40 ? `Marché local peu liquide à ${zone.name} : revente potentiellement longue.` : `Liquidité correcte à ${zone.name}, mais dépendante de la conjoncture nationale.`,
    "Inflation et coût de l'entretien (hypothèse d'indexation des charges retenue).",
  ];

  const marketNotes: string[] = [];
  const location = [input.city, input.quartier].filter(Boolean).join(" / ");
  if (location) {
    marketNotes.push(
      zone.utilityLabel
        ? `Localisation saisie : ${location} — quartier reconnu « ${zone.utilityLabel} » (attractivité ${zone.utilityIndex}/100) : demande, prix, valorisation et risque ajustés.`
        : `Localisation saisie : ${location} — quartier non référencé, profils du gouvernorat ${zone.name} appliqués par défaut.`,
    );
  }
  marketNotes.push(
    `Prix moyen à ${zone.name} : ${zone.pricePerM2.toLocaleString("fr-FR")} TND/m² · loyer moyen ${zone.rentPerM2} TND/m²/mois.`,
    `Appréciation annuelle du bien retenue : ${input.annualAppreciationPct}% (fourchette fixe 4-6%).`,
    `Hypothèses fixes du moteur : inflation ${input.inflationPct}% · croissance des loyers ${input.rentGrowthPct}%/an.`,
    `Fiscalité retenue : ${input.taxationPct}% du revenu locatif brut${input.taxationPct > 0 ? ", intégrée aux charges d'exploitation" : ""}.`,
    `Score d'attractivité de la zone : ${zone.rank}/${INVESTMENT_ZONES.length} en Tunisie.`,
  );

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
      rentGrowthPct: 5,
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

export const toggleFavorite = mutation({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== user._id) throw new Error("Analyse introuvable");
    const isFavorite = !doc.isFavorite;
    await ctx.db.patch(args.analysisId, { isFavorite, updatedAt: Date.now() });
    return { isFavorite };
  },
});

// ============================================================================
// Partage public (lecture seule)
// ============================================================================

const genShareToken = () =>
  Array.from({ length: 24 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");

export const shareAnalysis = mutation({
  args: {
    analysisId: v.id("investmentAnalyses"),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== user._id) throw new Error("Analyse introuvable");
    const days = Math.max(1, Math.min(365, args.expiresInDays ?? 30));
    const expiresAt = Date.now() + days * 86400000;
    const token = genShareToken();
    await ctx.db.patch(args.analysisId, { shareToken: token, shareExpiresAt: expiresAt });
    return { token, expiresAt };
  },
});

export const unshareAnalysis = mutation({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== user._id) throw new Error("Analyse introuvable");
    await ctx.db.patch(args.analysisId, { shareToken: undefined, shareExpiresAt: undefined });
    return { success: true };
  },
});

export const getSharedAnalysis = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("investmentAnalyses")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.token))
      .first();
    if (!doc || !doc.shareToken || !doc.shareExpiresAt || doc.shareExpiresAt < Date.now()) return null;
    return {
      _id: doc._id,
      input: doc.input,
      results: doc.results,
      aiInsights: doc.aiInsights ?? undefined,
      shareExpiresAt: doc.shareExpiresAt,
    };
  },
});

// ============================================================================
// Analyse de démonstration (page publique /investments/demo)
// ============================================================================

export const getDemoAnalysis = query({
  args: {},
  handler: () => {
    const normalized = normalizeInput({
      name: "Local commercial — Av. Habib Bourguiba",
      investmentType: "local_commercial",
      purchasePrice: 260000,
      area: 40,
      region: "tunis",
      city: "Tunis",
      rentMode: "mensuel",
      rentAmount: 2600,
      monthlyRent: 2600,
      occupancyRate: 95,
      annualCharges: 2400,
      insurance: 400,
      managementFees: 0,
      taxationPct: 10,
      renovationCost: 8000,
      financingFees: 0,
      agencyFees: 0,
      furnishingCost: 12000,
      acquisitionFeesPct: 6,
      rentGrowthPct: 5,
      inflationPct: 6,
      annualAppreciationPct: 5,
      horizonYears: 10,
    });
    const results = runEngine(normalized);
    return { input: normalized, results, aiInsights: fallbackInsights(normalized, results) };
  },
});
