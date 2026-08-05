// ============================================================================
// Investment Intelligence — shared types, constants & market benchmarks
// (self-contained module: no imports from schema.ts to avoid circular deps)
// ============================================================================

import { v } from "convex/values";

// ── Investment types ─────────────────────────────────────────────────────────

export const INVESTMENT_TYPES = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "local_commercial",
  "bureau",
  "entrepot",
  "terrain",
  "residence_touristique",
  "projet_neuf",
] as const;

export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const investmentTypeValidator = v.union(
  ...INVESTMENT_TYPES.map((t) => v.literal(t)),
);

export type InvestmentTypeMeta = {
  label: string;
  icon: string;
  // Benchmark net yield (%) typical for this asset class in Tunisia
  yieldBenchmark: number;
  // Typical rent growth / appreciation profile
  appreciationBenchmark: number;
  // Risk level & liquidity (0-100, higher = more liquid)
  riskLevel: "Faible" | "Moyen" | "Élevé";
  liquidity: number;
  demand: number;
  description: string;
};

export const INVESTMENT_TYPE_META: Record<InvestmentType, InvestmentTypeMeta> = {
  maison: {
    label: "Maison",
    icon: "Home",
    yieldBenchmark: 5.2,
    appreciationBenchmark: 4.0,
    riskLevel: "Faible",
    liquidity: 72,
    demand: 78,
    description: "Maison individuelle en périphérie urbaine ou en région.",
  },
  villa: {
    label: "Villa",
    icon: "Building2",
    yieldBenchmark: 4.2,
    appreciationBenchmark: 5.0,
    riskLevel: "Moyen",
    liquidity: 62,
    demand: 70,
    description: "Villa haut standing dans les zones prisées et balnéaires.",
  },
  appartement: {
    label: "Appartement",
    icon: "Building",
    yieldBenchmark: 6.0,
    appreciationBenchmark: 4.5,
    riskLevel: "Faible",
    liquidity: 88,
    demand: 92,
    description: "Le produit locatif le plus liquide du marché tunisien.",
  },
  studio: {
    label: "Studio",
    icon: "DoorOpen",
    yieldBenchmark: 6.5,
    appreciationBenchmark: 4.0,
    riskLevel: "Moyen",
    liquidity: 82,
    demand: 85,
    description: "Petite surface à forte demande étudiante et jeune active.",
  },
  duplex: {
    label: "Duplex",
    icon: "Layers",
    yieldBenchmark: 5.4,
    appreciationBenchmark: 4.5,
    riskLevel: "Faible",
    liquidity: 75,
    demand: 80,
    description: "Appartement sur deux niveaux, très recherché en famille.",
  },
  immeuble: {
    label: "Immeuble",
    icon: "Building",
    yieldBenchmark: 6.8,
    appreciationBenchmark: 5.5,
    riskLevel: "Élevé",
    liquidity: 40,
    demand: 85,
    description: "Immeuble de rapport à revenus multiples (capital important).",
  },
  local_commercial: {
    label: "Local commercial",
    icon: "Store",
    yieldBenchmark: 8.0,
    appreciationBenchmark: 6.0,
    riskLevel: "Élevé",
    liquidity: 55,
    demand: 88,
    description: "Rendement élevé mais sensibilité forte à la conjoncture.",
  },
  bureau: {
    label: "Bureau",
    icon: "Briefcase",
    yieldBenchmark: 7.2,
    appreciationBenchmark: 5.0,
    riskLevel: "Moyen",
    liquidity: 60,
    demand: 78,
    description: "Surface tertiaire louée aux entreprises et professions libérales.",
  },
  entrepot: {
    label: "Entrepôt",
    icon: "Warehouse",
    yieldBenchmark: 8.5,
    appreciationBenchmark: 6.5,
    riskLevel: "Élevé",
    liquidity: 50,
    demand: 72,
    description: "Logistique et stockage : loyer au m² faible, durée longue.",
  },
  terrain: {
    label: "Terrain constructible",
    icon: "Map",
    yieldBenchmark: 2.0,
    appreciationBenchmark: 7.5,
    riskLevel: "Élevé",
    liquidity: 45,
    demand: 72,
    description: "Plus-value potentielle à long terme, pas de revenus immédiats.",
  },
  residence_touristique: {
    label: "Résidence touristique",
    icon: "Palmtree",
    yieldBenchmark: 7.5,
    appreciationBenchmark: 6.0,
    riskLevel: "Élevé",
    liquidity: 50,
    demand: 80,
    description: "Location saisonnière à forte rentabilité, gestion active.",
  },
  projet_neuf: {
    label: "Projet immobilier neuf",
    icon: "HardHat",
    yieldBenchmark: 6.2,
    appreciationBenchmark: 6.5,
    riskLevel: "Moyen",
    liquidity: 65,
    demand: 85,
    description: "Achat sur plan / promotion : potentiel élevé, délais à gérer.",
  },
};

// ── Tunisia zones (governorates) — market benchmarks ────────────────────────

export type InvestmentZone = {
  region: string;
  name: string;
  pricePerM2: number; // avg purchase price TND / m² (apartment)
  rentPerM2: number; // avg monthly rent TND / m²
  demandIndex: number; // 0-100 rental demand
  appreciationPct: number; // expected annual appreciation %
  riskScore: number; // 0-100 (higher = riskier)
  highlights: string[];
};

export const INVESTMENT_ZONES: InvestmentZone[] = [
  { region: "tunis", name: "Tunis", pricePerM2: 3200, rentPerM2: 14, demandIndex: 92, appreciationPct: 5.5, riskScore: 22, highlights: ["Cœur économique du pays", "Demande locative la plus forte", "Prix au m² les plus élevés"] },
  { region: "ariana", name: "Ariana", pricePerM2: 2900, rentPerM2: 12, demandIndex: 88, appreciationPct: 5.0, riskScore: 25, highlights: ["Zone d'expansion de Tunis", "Étudiants & jeunes actifs", "Bon équilibre prix/rendement"] },
  { region: "ben_arous", name: "Ben Arous", pricePerM2: 2700, rentPerM2: 11.5, demandIndex: 85, appreciationPct: 5.0, riskScore: 24, highlights: ["Zones industrielles en croissance", "Accès rapide à Tunis", "Demande stable"] },
  { region: "manouba", name: "Manouba", pricePerM2: 2300, rentPerM2: 10, demandIndex: 76, appreciationPct: 4.5, riskScore: 28, highlights: ["Prix d'entrée abordables", "Marché secondaire en développement"] },
  { region: "nabeul", name: "Nabeul", pricePerM2: 2400, rentPerM2: 11, demandIndex: 82, appreciationPct: 5.5, riskScore: 26, highlights: ["Riviera tunisienne", "Location saisonnière dynamique", "Cap Bon : tourisme & agriculture"] },
  { region: "bizerte", name: "Bizerte", pricePerM2: 2100, rentPerM2: 9.5, demandIndex: 74, appreciationPct: 4.5, riskScore: 30, highlights: ["Port & industries", "Potentiel touristique émergent"] },
  { region: "sousse", name: "Sousse", pricePerM2: 2600, rentPerM2: 12, demandIndex: 87, appreciationPct: 5.2, riskScore: 24, highlights: ["Premier pôle touristique", "Université : demande étudiante", "Marché très actif"] },
  { region: "monastir", name: "Monastir", pricePerM2: 2400, rentPerM2: 11, demandIndex: 82, appreciationPct: 5.0, riskScore: 26, highlights: ["Aéroport & tourisme balnéaire", "Zone côtière prisée"] },
  { region: "mahdia", name: "Mahdia", pricePerM2: 1900, rentPerM2: 9, demandIndex: 72, appreciationPct: 4.2, riskScore: 31, highlights: ["Prix attractifs en bord de mer", "Tourisme en développement"] },
  { region: "sfax", name: "Sfax", pricePerM2: 2400, rentPerM2: 10.5, demandIndex: 84, appreciationPct: 4.8, riskScore: 26, highlights: ["Capitale économique du Sud", "Fort tissu industriel", "Demande locative soutenue"] },
  { region: "gabes", name: "Gabès", pricePerM2: 1700, rentPerM2: 8, demandIndex: 64, appreciationPct: 3.8, riskScore: 36, highlights: ["Industrie chimique", "Prix d'entrée modérés"] },
  { region: "medenine", name: "Médenine", pricePerM2: 1500, rentPerM2: 7, demandIndex: 60, appreciationPct: 3.5, riskScore: 38, highlights: ["Djerba : potentiel touristique", "Prix très attractifs"] },
  { region: "kairouan", name: "Kairouan", pricePerM2: 1500, rentPerM2: 7, demandIndex: 62, appreciationPct: 3.6, riskScore: 37, highlights: ["Cité religieuse & artisanat", "Marché abordable"] },
  { region: "kasserine", name: "Kasserine", pricePerM2: 1100, rentPerM2: 5, demandIndex: 50, appreciationPct: 2.9, riskScore: 45, highlights: ["Très faible prix d'entrée", "Rendements locatifs faibles"] },
  { region: "sidi_bouzid", name: "Sidi Bouzid", pricePerM2: 1200, rentPerM2: 6, demandIndex: 55, appreciationPct: 3.2, riskScore: 42, highlights: ["Marché intérieur", "Agriculture dominante"] },
  { region: "gafsa", name: "Gafsa", pricePerM2: 1300, rentPerM2: 6, demandIndex: 56, appreciationPct: 3.2, riskScore: 41, highlights: ["Bassin minier", "Rentabilité locative moyenne"] },
  { region: "tozeur", name: "Tozeur", pricePerM2: 1400, rentPerM2: 6.5, demandIndex: 58, appreciationPct: 3.4, riskScore: 40, highlights: ["Oasis & tourisme saharien", "Marché de niche"] },
  { region: "kebili", name: "Kébili", pricePerM2: 1200, rentPerM2: 5.5, demandIndex: 52, appreciationPct: 3.0, riskScore: 44, highlights: ["Sud saharien", "Liquidité faible"] },
  { region: "tataouine", name: "Tataouine", pricePerM2: 1000, rentPerM2: 5, demandIndex: 48, appreciationPct: 2.8, riskScore: 46, highlights: ["Prix parmi les plus bas", "Marché très restreint"] },
  { region: "le_kef", name: "Le Kef", pricePerM2: 1200, rentPerM2: 5.5, demandIndex: 52, appreciationPct: 3.0, riskScore: 43, highlights: ["Nord-ouest agricole", "Rendement modéré"] },
  { region: "jendouba", name: "Jendouba", pricePerM2: 1100, rentPerM2: 5.5, demandIndex: 51, appreciationPct: 3.0, riskScore: 44, highlights: ["Forêts & agriculture", "Demande limitée"] },
  { region: "beja", name: "Béja", pricePerM2: 1300, rentPerM2: 6, demandIndex: 54, appreciationPct: 3.2, riskScore: 42, highlights: ["Grenier de la Tunisie", "Prix stables"] },
  { region: "siliana", name: "Siliana", pricePerM2: 1100, rentPerM2: 5, demandIndex: 50, appreciationPct: 2.9, riskScore: 45, highlights: ["Marché rural", "Faible liquidité"] },
  { region: "zaghouan", name: "Zaghouan", pricePerM2: 1600, rentPerM2: 7, demandIndex: 60, appreciationPct: 3.6, riskScore: 39, highlights: ["Proximité de Tunis", "Mountain & agrotourisme"] },
];

export const INVESTMENT_ZONE_MAP: Record<string, InvestmentZone> = Object.fromEntries(
  INVESTMENT_ZONES.map((z) => [z.region, z]),
);

export const REGION_LABELS: Record<string, string> = Object.fromEntries(
  INVESTMENT_ZONES.map((z) => [z.region, z.name]),
);

export const DEFAULT_ZONE: InvestmentZone = {
  region: "tunis",
  name: "Tunis",
  pricePerM2: 3200,
  rentPerM2: 14,
  demandIndex: 92,
  appreciationPct: 5.5,
  riskScore: 22,
  highlights: ["Cœur économique du pays", "Demande locative la plus forte"],
};

// ── Ville & quartier — utilité de la zone ───────────────────────────────────
// Indice d'attractivité (0-100) des villes / quartiers tunisiens connus.
// L'indice module la demande, les prix, la valorisation et le risque du
// gouvernorat de rattachement (voir resolveZoneUtility ci-dessous).

export type ZoneUtility = {
  label: string;
  utilityIndex: number; // 0-100 attractivité
  demandOffset: number; // pts sur l'indice de demande
  appreciationOffset: number; // pts sur l'appréciation annuelle
  riskOffset: number; // pts sur l'indice de risque
  priceFactor: number; // multiplicateur prix au m²
  rentFactor: number; // multiplicateur loyer au m²
};

export const ZONE_UTILITIES: { label: string; utilityIndex: number }[] = [
  // Zones premium du Grand Tunis
  { label: "Les Berges du Lac", utilityIndex: 96 },
  { label: "Lac 2", utilityIndex: 95 },
  { label: "Lac 1", utilityIndex: 94 },
  { label: "La Marsa", utilityIndex: 93 },
  { label: "Gammarth", utilityIndex: 92 },
  { label: "Carthage", utilityIndex: 91 },
  { label: "Sidi Bou Saïd", utilityIndex: 90 },
  { label: "Jardins de Carthage", utilityIndex: 90 },
  { label: "Mutuelleville", utilityIndex: 88 },
  { label: "Les Jardins d'El Menzah", utilityIndex: 87 },
  { label: "Ennasr", utilityIndex: 86 },
  { label: "El Menzah", utilityIndex: 85 },
  { label: "Lafayette", utilityIndex: 84 },
  { label: "La Soukra", utilityIndex: 82 },
  { label: "Charguia", utilityIndex: 78 },
  { label: "Cité El Khadra", utilityIndex: 77 },
  { label: "Borj Louzir", utilityIndex: 76 },
  { label: "El Ghazela", utilityIndex: 75 },
  { label: "Le Kram", utilityIndex: 75 },
  { label: "La Goulette", utilityIndex: 73 },
  { label: "El Omrane", utilityIndex: 73 },
  { label: "Centre Ville", utilityIndex: 72 },
  // Côtes & villes balnéaires
  { label: "Yasmine Hammamet", utilityIndex: 86 },
  { label: "Sahloul", utilityIndex: 85 },
  { label: "Hammamet", utilityIndex: 84 },
  { label: "Khezama", utilityIndex: 82 },
  { label: "Sousse", utilityIndex: 82 },
  { label: "Monastir", utilityIndex: 78 },
  { label: "Nabeul", utilityIndex: 76 },
  { label: "Djerba Midoun", utilityIndex: 76 },
  { label: "Mahdia", utilityIndex: 72 },
  { label: "Djerba Houmt Souk", utilityIndex: 72 },
  { label: "Tabarka", utilityIndex: 72 },
  { label: "Kélibia", utilityIndex: 70 },
  { label: "Zarzis", utilityIndex: 68 },
  // Grandes villes économiques
  { label: "Ariana", utilityIndex: 80 },
  { label: "Sfax", utilityIndex: 78 },
  { label: "Sfax El Jadida", utilityIndex: 76 },
  { label: "Bizerte", utilityIndex: 73 },
  { label: "Gabès", utilityIndex: 66 },
  { label: "Tozeur", utilityIndex: 66 },
  { label: "Médenine", utilityIndex: 64 },
  { label: "Gafsa", utilityIndex: 62 },
  { label: "Kairouan", utilityIndex: 62 },
  { label: "Le Kef", utilityIndex: 60 },
  { label: "Béja", utilityIndex: 60 },
  { label: "Jendouba", utilityIndex: 58 },
  { label: "Kébili", utilityIndex: 57 },
  { label: "Sidi Bouzid", utilityIndex: 56 },
  { label: "Siliana", utilityIndex: 56 },
  { label: "Tataouine", utilityIndex: 55 },
  { label: "Kasserine", utilityIndex: 55 },
];

const uClamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Normalise une saisie libre (minuscules, sans accents ni ponctuation). */
export const normalizeZoneKey = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’\-.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Résout l'utilité de la zone à partir de la ville / du quartier saisis.
 * Retourne null si aucun quartier ou ville reconnus. L'écart à la moyenne
 * (indice 72) pilote les modulations appliquées au gouvernorat.
 */
export function resolveZoneUtility(city?: string, quartier?: string): ZoneUtility | null {
  const keys = [city, quartier].filter((x): x is string => !!x).map(normalizeZoneKey);
  if (keys.length === 0) return null;
  for (const u of ZONE_UTILITIES) {
    const k = normalizeZoneKey(u.label);
    if (keys.some((x) => x === k || x.includes(k) || k.includes(x))) {
      const delta = u.utilityIndex - 72;
      return {
        label: u.label,
        utilityIndex: u.utilityIndex,
        demandOffset: Math.round(uClamp(delta * 0.45, -12, 8)),
        appreciationOffset: Math.round(uClamp(delta * 0.12, -1.5, 1.8) * 10) / 10,
        riskOffset: Math.round(uClamp(-delta * 0.4, -10, 12)),
        priceFactor: Math.round((1 + delta * 0.008) * 1000) / 1000,
        rentFactor: Math.round((1 + delta * 0.01) * 1000) / 1000,
      };
    }
  }
  return null;
}

// ── Analysis input ──────────────────────────────────────────────────────────

export const analysisInputValidator = v.object({
  name: v.optional(v.string()),
  investmentType: investmentTypeValidator,
  purchasePrice: v.number(),
  area: v.optional(v.number()),
  region: v.string(),
  city: v.optional(v.string()),
  quartier: v.optional(v.string()),
  monthlyRent: v.number(),
  occupancyRate: v.optional(v.number()),
  annualExpensesPct: v.optional(v.number()),
  renovationCost: v.optional(v.number()),
  agencyFees: v.optional(v.number()),
  financingCost: v.optional(v.number()),
  insurance: v.optional(v.number()),
  taxes: v.optional(v.number()),
  managementFeesPct: v.optional(v.number()),
  acquisitionFeesPct: v.optional(v.number()),
  annualAppreciationPct: v.optional(v.number()),
  rentGrowthPct: v.optional(v.number()),
  inflationPct: v.optional(v.number()),
  horizonYears: v.optional(v.number()),
});

export type InvestmentAnalysisInput = {
  name?: string;
  investmentType: InvestmentType;
  purchasePrice: number;
  area?: number;
  region: string;
  city?: string;
  quartier?: string;
  monthlyRent: number;
  occupancyRate?: number;
  annualExpensesPct?: number;
  renovationCost?: number;
  agencyFees?: number;
  financingCost?: number;
  insurance?: number;
  taxes?: number;
  managementFeesPct?: number;
  acquisitionFeesPct?: number;
  annualAppreciationPct?: number;
  rentGrowthPct?: number;
  inflationPct?: number;
  horizonYears?: number;
};

// ── Results (computed) ──────────────────────────────────────────────────────

export const forecastPointValidator = v.object({
  year: v.number(),
  netIncome: v.number(),
  cumulativeIncome: v.number(),
  propertyValue: v.number(),
  cumulativeProfit: v.number(),
});

export const forecastSummaryItemValidator = v.object({
  horizon: v.number(),
  label: v.string(),
  netIncome: v.number(),
  futureValue: v.number(),
  gain: v.number(),
  cumulativeProfit: v.number(),
  roiPct: v.number(),
});

export const scenarioValidator = v.object({
  key: v.union(v.literal("optimiste"), v.literal("realiste"), v.literal("prudent")),
  label: v.string(),
  futureValue: v.number(),
  totalIncome: v.number(),
  roiPct: v.number(),
  netYieldPct: v.number(),
  cumulativeProfit: v.number(),
  riskLevel: v.string(),
  risks: v.array(v.string()),
});

export const scoreCriterionValidator = v.object({
  key: v.string(),
  label: v.string(),
  score: v.number(),
  max: v.number(),
  weight: v.number(),
});

export const scoreValidator = v.object({
  total: v.number(),
  grade: v.string(),
  label: v.string(),
  criteria: v.array(scoreCriterionValidator),
});

export const comparisonItemValidator = v.object({
  type: v.string(),
  label: v.string(),
  totalCost: v.number(),
  annualIncome: v.number(),
  netYieldPct: v.number(),
  roi10yPct: v.number(),
  riskLevel: v.string(),
  appreciationPct: v.number(),
  score: v.number(),
});

export const zoneInfoValidator = v.object({
  region: v.string(),
  name: v.string(),
  pricePerM2: v.number(),
  rentPerM2: v.number(),
  demandIndex: v.number(),
  appreciationPct: v.number(),
  riskScore: v.number(),
  rank: v.number(),
  highlights: v.array(v.string()),
  city: v.optional(v.string()),
  quartier: v.optional(v.string()),
  utilityIndex: v.optional(v.number()),
  utilityLabel: v.optional(v.string()),
});

export const indicatorsValidator = v.object({
  purchasePrice: v.number(),
  totalCost: v.number(),
  acquisitionFees: v.number(),
  agencyFees: v.optional(v.number()),
  renovationCost: v.number(),
  monthlyRent: v.number(),
  occupancyRate: v.number(),
  grossAnnualRent: v.number(),
  operatingExpenses: v.number(),
  managementFees: v.optional(v.number()),
  insurance: v.optional(v.number()),
  taxes: v.optional(v.number()),
  financingCost: v.optional(v.number()),
  netAnnualIncome: v.number(),
  monthlyCashflow: v.number(),
  annualCashflow: v.number(),
  grossYieldPct: v.number(),
  netYieldPct: v.number(),
  roiAnnualPct: v.number(),
  roi5yPct: v.number(),
  roi10yPct: v.number(),
  paybackYears: v.number(),
  paybackDate: v.number(),
  paybackDateLabel: v.string(),
  pricePerM2: v.optional(v.number()),
  priceToRentRatio: v.number(),
});

export const analysisResultsValidator = v.object({
  indicators: indicatorsValidator,
  forecasts: v.array(forecastPointValidator),
  forecastSummary: v.array(forecastSummaryItemValidator),
  scenarios: v.array(scenarioValidator),
  score: scoreValidator,
  comparison: v.array(comparisonItemValidator),
  zone: zoneInfoValidator,
  aiConfidence: v.number(),
  generatedAt: v.number(),
});

export type InvestmentForecastPoint = {
  year: number;
  netIncome: number;
  cumulativeIncome: number;
  propertyValue: number;
  cumulativeProfit: number;
};
export type InvestmentForecastSummaryItem = {
  horizon: number;
  label: string;
  netIncome: number;
  futureValue: number;
  gain: number;
  cumulativeProfit: number;
  roiPct: number;
};
export type InvestmentScenario = {
  key: "optimiste" | "realiste" | "prudent";
  label: string;
  futureValue: number;
  totalIncome: number;
  roiPct: number;
  netYieldPct: number;
  cumulativeProfit: number;
  riskLevel: string;
  risks: string[];
};
export type InvestmentScoreCriterion = {
  key: string;
  label: string;
  score: number;
  max: number;
  weight: number;
};
export type InvestmentScore = {
  total: number;
  grade: string;
  label: string;
  criteria: InvestmentScoreCriterion[];
};
export type InvestmentComparisonItem = {
  type: string;
  label: string;
  totalCost: number;
  annualIncome: number;
  netYieldPct: number;
  roi10yPct: number;
  riskLevel: string;
  appreciationPct: number;
  score: number;
};
export type InvestmentZoneInfo = {
  region: string;
  name: string;
  pricePerM2: number;
  rentPerM2: number;
  demandIndex: number;
  appreciationPct: number;
  riskScore: number;
  rank: number;
  highlights: string[];
  city?: string;
  quartier?: string;
  utilityIndex?: number;
  utilityLabel?: string;
};
export type InvestmentIndicators = {
  purchasePrice: number;
  totalCost: number;
  acquisitionFees: number;
  agencyFees?: number;
  renovationCost: number;
  monthlyRent: number;
  occupancyRate: number;
  grossAnnualRent: number;
  operatingExpenses: number;
  managementFees?: number;
  insurance?: number;
  taxes?: number;
  financingCost?: number;
  netAnnualIncome: number;
  monthlyCashflow: number;
  annualCashflow: number;
  grossYieldPct: number;
  netYieldPct: number;
  roiAnnualPct: number;
  roi5yPct: number;
  roi10yPct: number;
  paybackYears: number;
  paybackDate: number;
  paybackDateLabel: string;
  pricePerM2?: number;
  priceToRentRatio: number;
};
export type InvestmentAnalysisResults = {
  indicators: InvestmentIndicators;
  forecasts: InvestmentForecastPoint[];
  forecastSummary: InvestmentForecastSummaryItem[];
  scenarios: InvestmentScenario[];
  score: InvestmentScore;
  comparison: InvestmentComparisonItem[];
  zone: InvestmentZoneInfo;
  aiConfidence: number;
  generatedAt: number;
};

export const aiInsightsValidator = v.object({
  summary: v.string(),
  verdict: v.string(),
  recommendations: v.array(v.string()),
  risks: v.array(v.string()),
  marketNotes: v.array(v.string()),
  usedFallback: v.boolean(),
  generatedAt: v.number(),
});

export type InvestmentAiInsights = {
  summary: string;
  verdict: string;
  recommendations: string[];
  risks: string[];
  marketNotes: string[];
  usedFallback: boolean;
  generatedAt: number;
};

// ── Scenario defaults (annual %) ────────────────────────────────────────────

export const SCENARIO_DEFAULTS = {
  optimiste: { rentGrowthPct: 5, appreciationOffset: 2, inflationPct: 5, occupancyOffset: 2, label: "Optimiste" },
  realiste: { rentGrowthPct: 3, appreciationOffset: 0, inflationPct: 6, occupancyOffset: 0, label: "Réaliste" },
  prudent: { rentGrowthPct: 1.5, appreciationOffset: -2, inflationPct: 7, occupancyOffset: -5, label: "Prudent" },
} as const;

export const FORECAST_HORIZONS = [1, 3, 5, 10] as const;
