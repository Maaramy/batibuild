// ============================================================================
// FICHE DESCRIPTIVE d'un plan architectural généré par IA.
// Builder PUR (testable, sans DOM) : dérive toutes les données d'affichage de
// la fiche (chiffres clés, scores, tableau des pièces, zones extérieures,
// coût estimé, points forts/faibles) à partir d'un GeneratedPlan + PlanRequest
// + résultat BIM optionnel.
// ============================================================================

import type { GeneratedPlan, PlanRequest } from "@/convex/planEngine";
import { STYLE_LABELS, bienTypeLabel } from "@/convex/planEngine";

// ─── Types du résultat BIM (profil minimal, découplé de bimEngine) ─────────

export interface SheetCostBreakdownRow {
  category: string;
  label: string;
  estimatedCost: number;
  percentage: number;
}

/** Profil minimal du résultat de runBIMEstimation utilisé par la fiche. */
export interface PlanBimResult {
  costEstimate?: {
    totalCost?: number;
    costPerSquareMeter?: number;
    currency?: string;
    breakdown?: SheetCostBreakdownRow[];
    budgetScenarios?: { economique?: { totalCost?: number }; standard?: { totalCost?: number }; premium?: { totalCost?: number } };
  };
  aiAnalysis?: {
    confidence?: number;
    estimatedDuration?: string;
    laborEstimate?: { totalWorkers?: number; totalDays?: number; estimatedCost?: number };
  };
}

export interface PlanSheetData {
  index: number;
  key: string;
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  meta: {
    bienType: string;
    style: string;
    standing: string;
    floors: number;
    entree: string;
    orientation: string;
    facades: number;
    generatedAt: string;
  };
  dimensions: { width: number; depth: number };
  keyFigures: { label: string; value: string; hint?: string }[];
  scores: { key: string; label: string; value: number }[];
  rooms: { name: string; type: string; levelLabel: string; area: number }[];
  exteriorZones: { name: string; type: string; area: number }[];
  counts: { doors: number; windows: number; stairs: number };
  alerts: string[];
  cost: {
    totalCost: number;
    costPerSquareMeter: number;
    currency: string;
    confidence: number | null;
    duration: string | null;
    labor: { totalWorkers: number; totalDays: number; estimatedCost: number } | null;
    breakdown: SheetCostBreakdownRow[];
    scenarios: { economique: number; standard: number; premium: number };
  } | null;
}

// ─── Helpers d'affichage ────────────────────────────────────────────────────

export function levelLabel(level: number): string {
  return level <= 0 ? "RDC" : `Étage ${level}`;
}

export function standingLabel(standing?: string): string {
  if (standing === "premium") return "Premium";
  if (standing === "economique") return "Économique";
  return "Standard";
}

const DIRECTION_LABELS: Record<string, string> = {
  nord: "Nord", sud: "Sud", est: "Est", ouest: "Ouest",
  n: "Nord", s: "Sud", e: "Est", o: "Ouest", w: "Ouest",
};

export function directionLabel(dir?: string): string {
  return (dir && DIRECTION_LABELS[dir.toLowerCase()]) || (dir ? dir : "—");
}

export function formatTnd(n: number): string {
  return new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);
}

// ─── Builder principal ──────────────────────────────────────────────────────

export function buildPlanSheet(
  plan: GeneratedPlan,
  request?: PlanRequest | null,
  bim?: PlanBimResult | null,
): PlanSheetData {
  const stats = plan.stats;
  const floors = Math.max(1, plan.levels || 1);

  // Pièces couvertes (y compris circulation & escalier) triées par niveau puis position
  const covered = plan.rooms
    .filter((r) => !r.exterior)
    .sort((a, b) => (a.level - b.level) || (a.y - b.y) || (a.x - b.x));

  const rooms = covered.map((r) => ({
    name: r.name,
    type: r.type,
    levelLabel: levelLabel(r.level),
    area: Math.round(r.area * 10) / 10,
  }));

  const exteriorZones = plan.rooms
    .filter((r) => r.exterior)
    .sort((a, b) => (a.level - b.level) || (a.y - b.y))
    .map((r) => ({ name: r.name, type: r.type, area: Math.round(r.area * 10) / 10 }));

  const figures = [
    { label: "Surface construite", value: `${Math.round(stats.construite)} m²`, hint: `Emprise × ${floors} niveau${floors > 1 ? "x" : ""}` },
    { label: "Surface utile", value: `${Math.round(stats.utile)} m²`, hint: "Pièces couvertes" },
    { label: "Circulation", value: `${Math.round(stats.circulation)} m²`, hint: "Couloirs & escalier" },
    { label: "Extérieurs", value: `${Math.round(stats.exterieure)} m²`, hint: "Garage, jardin, terrasse…" },
    { label: "Taux d'utilisation", value: `${stats.tauxUtilisation}%`, hint: "Utile / construit" },
    { label: "Pièces", value: `${stats.nbPieces}`, hint: `dont ${stats.nbChambres} chambre${stats.nbChambres > 1 ? "s" : ""}` },
    { label: "Salles de bain", value: `${stats.nbSdb}` },
    { label: "WC", value: `${stats.nbWc}` },
    { label: "Portes", value: `${plan.doors.length}`, hint: `${plan.doors.filter((d) => d.exterior).length} extérieure(s)` },
    { label: "Fenêtres", value: `${plan.windows.length}` },
    { label: "Escaliers", value: `${plan.stairs.length}` },
    { label: "Emprise", value: `${Math.round(plan.width)} × ${Math.round(plan.depth)} m`, hint: "Hors-tout" },
  ];

  const scores = [
    { key: "optimisation", label: "Optimisation de l'espace", value: plan.scores.optimisation },
    { key: "fonctionnalite", label: "Fonctionnalité", value: plan.scores.fonctionnalite },
    { key: "confort", label: "Confort", value: plan.scores.confort },
    { key: "architectural", label: "Qualité architecturale", value: plan.scores.architectural },
    { key: "global", label: "Score global", value: plan.scores.global },
  ];

  const cost = bim?.costEstimate
    ? {
        totalCost: bim.costEstimate.totalCost ?? 0,
        costPerSquareMeter: bim.costEstimate.costPerSquareMeter ?? 0,
        currency: bim.costEstimate.currency ?? "TND",
        confidence: bim.aiAnalysis?.confidence != null ? Math.round(bim.aiAnalysis.confidence * 100) : null,
        duration: bim.aiAnalysis?.estimatedDuration ?? null,
        labor: bim.aiAnalysis?.laborEstimate
          ? {
              totalWorkers: bim.aiAnalysis.laborEstimate.totalWorkers ?? 0,
              totalDays: bim.aiAnalysis.laborEstimate.totalDays ?? 0,
              estimatedCost: bim.aiAnalysis.laborEstimate.estimatedCost ?? 0,
            }
          : null,
        breakdown: bim.costEstimate.breakdown ?? [],
        scenarios: {
          economique: bim.costEstimate.budgetScenarios?.economique?.totalCost ?? 0,
          standard: bim.costEstimate.budgetScenarios?.standard?.totalCost ?? 0,
          premium: bim.costEstimate.budgetScenarios?.premium?.totalCost ?? 0,
        },
      }
    : null;

  return {
    index: plan.index,
    key: plan.key,
    name: plan.name,
    description: plan.description,
    strengths: plan.strengths ?? [],
    weaknesses: plan.weaknesses ?? [],
    meta: {
      bienType: request?.bienType ? bienTypeLabel(request.bienType) : "—",
      style: request?.style ? (STYLE_LABELS[request.style] ?? request.style) : "—",
      standing: request?.standing ? standingLabel(request.standing) : "—",
      floors,
      entree: request?.entreePosition ? directionLabel(request.entreePosition) : "—",
      orientation: request?.orientation ? directionLabel(request.orientation) : "—",
      facades: request?.facades ?? 0,
      generatedAt: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    },
    dimensions: { width: Math.round(plan.width * 100) / 100, depth: Math.round(plan.depth * 100) / 100 },
    keyFigures: figures,
    scores,
    rooms,
    exteriorZones,
    counts: { doors: plan.doors.length, windows: plan.windows.length, stairs: plan.stairs.length },
    alerts: plan.alerts?.messages ?? [],
    cost,
  };
}
