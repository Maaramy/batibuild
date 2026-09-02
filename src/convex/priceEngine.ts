// ═══════════════════════════════════════════════════════════════════════════
// MOTEUR DE PRIX — validation & résolution de source (spécification §20-21)
// Module PUR, déterministe. Il ne change AUCUN prix : il qualifie les prix
// existants (source, confiance, anomalie) pour la transparence et le Top 5.
//
// Priorité de source : DQE > Fournisseur > Marché > Historique > Estimation IA
// ═══════════════════════════════════════════════════════════════════════════

export type PriceSource = "DQE" | "SUPPLIER" | "MARKET" | "HISTORICAL" | "AI_ESTIMATED";

export const PRICE_SOURCE_PRIORITY: Record<PriceSource, number> = {
  DQE: 1,
  SUPPLIER: 2,
  MARKET: 3,
  HISTORICAL: 4,
  AI_ESTIMATED: 5,
};

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  DQE: "DQE",
  SUPPLIER: "Fournisseur",
  MARKET: "Marché 2026",
  HISTORICAL: "Historique",
  AI_ESTIMATED: "Estimation",
};

/** Signaux disponibles pour qualifier le prix d'un matériau. */
export type PriceInput = {
  /** true si au moins une offre fournisseur recensée existe pour ce matériau. */
  hasOffers?: boolean;
  /** Qualité déclarée du prix catalogue (« verified », « estimate », « market »…). */
  quality?: string | null;
  /** Indice de confiance du prix catalogue (0-100). */
  confidenceIndex?: number | null;
  /** true si un prix marché/catalogue est renseigné (unitPrice/avgPrice > 0). */
  hasMarketPrice?: boolean;
};

/** Source la plus fiable disponible selon la priorité §21. */
export function resolvePriceSource(input: PriceInput): PriceSource {
  if (input.hasOffers) return "SUPPLIER";
  if (!input.hasMarketPrice) return "AI_ESTIMATED";
  const q = String(input.quality || "").toLowerCase();
  if (q.includes("estimate") || q.includes("estimé") || q.includes("ia")) return "AI_ESTIMATED";
  if (q.includes("historique") || q.includes("history")) return "HISTORICAL";
  if (q.includes("dqe")) return "DQE";
  return "MARKET";
}

const clamp01 = (n: number) => Math.min(100, Math.max(0, n));

/** Score de confiance du prix (0-100) selon la source et les indices disponibles. */
export function priceConfidence(source: PriceSource, input: PriceInput): number {
  switch (source) {
    case "SUPPLIER":
      return Math.round(clamp01(input.confidenceIndex ?? 85));
    case "DQE":
      return Math.round(clamp01(input.confidenceIndex ?? 85));
    case "MARKET":
      return Math.round(clamp01(input.confidenceIndex ?? 75));
    case "HISTORICAL":
      return Math.round(clamp01(input.confidenceIndex ?? 60));
    case "AI_ESTIMATED":
      return Math.round(clamp01(input.confidenceIndex ?? 45));
  }
}

export type PriceValidationResult = {
  isValid: boolean;
  isAnomaly: boolean;
  deviation: number; // 0-1 (part du prix de référence)
  confidence: number; // 0-100
};

/**
 * Détecte les prix anormaux par rapport à une référence (moyenne marché,
 * prix historique). Un écart > 30 % est signalé comme anomalie (§20).
 */
export function validatePrice(currentPrice: number, referencePrice: number): PriceValidationResult {
  if (!isFinite(currentPrice) || !isFinite(referencePrice) || referencePrice <= 0) {
    return { isValid: false, isAnomaly: true, deviation: 1, confidence: 30 };
  }
  const deviation = Math.abs(currentPrice - referencePrice) / referencePrice;
  const isAnomaly = deviation > 0.3;
  return {
    isValid: !isAnomaly,
    isAnomaly,
    deviation: round4(deviation),
    confidence: isAnomaly ? 50 : 90,
  };
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;