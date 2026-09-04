import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Home as HomeIcon,
  Building2 as VillaIcon,
  Building as ApartmentIcon,
  DoorOpen as StudioIcon,
  Layers as DuplexIcon,
  Landmark as ImmeubleIcon,
  Store as LocalIcon,
  Briefcase as BureauIcon,
  Warehouse as EntrepotIcon,
  Map as TerrainIcon,
  Palmtree as ResidenceIcon,
  HardHat as ProjetIcon,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  resolveZoneUtility,
  estimateOccupancyRate,
  forcedRentModeFor,
  ZONE_UTILITIES,
  REGION_CASCADE,
  ALL_CITIES,
} from "@/convex/investmentTypes";

applyAutotablePlugin(jsPDF);

export { resolveZoneUtility, estimateOccupancyRate, forcedRentModeFor, ZONE_UTILITIES, REGION_CASCADE, ALL_CITIES };
export type { ZoneUtility, CascadeCity, OccupancyEstimateInput, RentMode } from "@/convex/investmentTypes";

// ============================================================================
// Types (mirror of src/convex/investmentTypes.ts)
// ============================================================================

export type InvestmentType =
  | "maison" | "villa" | "appartement" | "studio" | "duplex" | "immeuble"
  | "local_commercial" | "bureau" | "entrepot" | "terrain"
  | "residence_touristique" | "projet_neuf";

export type InvestmentInput = {
  name?: string;
  investmentType: InvestmentType;
  purchasePrice: number;
  area?: number;
  region: string;
  city?: string;
  quartier?: string;
  monthlyRent: number;
  rentMode?: "nuit" | "mensuel";
  rentAmount?: number;
  occupancyRate?: number;
  annualExpensesPct?: number;
  renovationCost?: number;
  acquisitionFeesPct?: number;
  financingFees?: number;
  agencyFees?: number;
  furnishingCost?: number;
  annualCharges?: number;
  insurance?: number;
  managementFees?: number;
  taxationPct?: number;
  annualAppreciationPct?: number;
  rentGrowthPct?: number;
  inflationPct?: number;
  horizonYears?: number;
};

export interface Indicators {
  purchasePrice: number; totalCost: number; acquisitionFees: number; renovationCost: number;
  financingFees: number; agencyFees: number; furnishingCost: number;
  annualCharges: number; insurance: number; managementFees: number; taxation: number;
  rentMode: "nuit" | "mensuel";
  monthlyRent: number; occupancyRate: number; grossAnnualRent: number; operatingExpenses: number;
  netAnnualIncome: number; monthlyCashflow: number; annualCashflow: number;
  grossYieldPct: number; netYieldPct: number; roiAnnualPct: number; roi5yPct: number; roi10yPct: number;
  paybackYears: number; paybackDate: number; paybackDateLabel: string;
  pricePerM2?: number; priceToRentRatio: number;
}
export interface ForecastPoint {
  year: number; netIncome: number; cumulativeIncome: number; propertyValue: number; cumulativeProfit: number;
  grossRent?: number; expenses?: number;
}
export interface ForecastSummary { horizon: number; label: string; netIncome: number; futureValue: number; gain: number; cumulativeProfit: number; roiPct: number; }
export interface Scenario { key: string; label: string; futureValue: number; totalIncome: number; roiPct: number; netYieldPct: number; cumulativeProfit: number; riskLevel: string; risks: string[]; }
export interface ScoreCriterion { key: string; label: string; score: number; max: number; weight: number; }
export interface Score { total: number; grade: string; label: string; criteria: ScoreCriterion[]; }
export interface ComparisonItem { type: string; label: string; totalCost: number; annualIncome: number; netYieldPct: number; roi10yPct: number; riskLevel: string; appreciationPct: number; score: number; rentMode?: "nuit" | "mensuel"; }
export interface ZoneInfo { region: string; name: string; pricePerM2: number; rentPerM2: number; demandIndex: number; appreciationPct: number; riskScore: number; rank: number; highlights: string[]; city?: string; quartier?: string; utilityIndex?: number; utilityLabel?: string; }
export interface AnalysisResults {
  indicators: Indicators; forecasts: ForecastPoint[]; forecastSummary: ForecastSummary[];
  scenarios: Scenario[]; score: Score; comparison: ComparisonItem[]; zone: ZoneInfo;
  aiConfidence: number; generatedAt: number;
}
export interface AiInsights { summary: string; verdict: string; recommendations: string[]; risks: string[]; marketNotes: string[]; usedFallback: boolean; generatedAt: number; }
export interface AnalysisRun { _id: string; input: InvestmentInput; results: AnalysisResults; aiInsights?: AiInsights; }
export interface ZoneRow { region: string; name: string; pricePerM2: number; rentPerM2: number; demandIndex: number; appreciationPct: number; riskScore: number; highlights: string[]; }
export interface ChatMsg { role: "user" | "assistant"; content: string; }

// ============================================================================
// Constants
// ============================================================================

export const TYPE_META: Record<InvestmentType, { label: string; icon: any; desc: string }> = {
  maison: { label: "Maison", icon: HomeIcon, desc: "Maison individuelle" },
  villa: { label: "Villa", icon: VillaIcon, desc: "Haut standing" },
  appartement: { label: "Appartement", icon: ApartmentIcon, desc: "Produit locatif liquide" },
  studio: { label: "Studio", icon: StudioIcon, desc: "Petite surface" },
  duplex: { label: "Duplex", icon: DuplexIcon, desc: "Deux niveaux" },
  immeuble: { label: "Immeuble", icon: ImmeubleIcon, desc: "Revenus multiples" },
  local_commercial: { label: "Local commercial", icon: LocalIcon, desc: "Rendement élevé" },
  bureau: { label: "Bureau", icon: BureauIcon, desc: "Surface tertiaire" },
  entrepot: { label: "Entrepôt", icon: EntrepotIcon, desc: "Logistique & stockage" },
  terrain: { label: "Terrain constructible", icon: TerrainIcon, desc: "Plus-value long terme" },
  residence_touristique: { label: "Résidence touristique", icon: ResidenceIcon, desc: "Location saisonnière" },
  projet_neuf: { label: "Projet immobilier neuf", icon: ProjetIcon, desc: "Achat sur plan" },
};

export const TYPE_ORDER: InvestmentType[] = [
  "maison", "villa", "appartement", "studio", "duplex", "immeuble",
  "local_commercial", "bureau", "entrepot", "terrain", "residence_touristique", "projet_neuf",
];

export const DEFAULT_FORM = {
  name: "",
  investmentType: "appartement" as InvestmentType,
  purchasePrice: 320000,
  area: 100,
  region: "tunis",
  city: "",
  quartier: "",
  rentMode: "mensuel" as "nuit" | "mensuel",
  rentAmount: 1500,
  monthlyRent: 1500,
  occupancyRate: 95,
  annualCharges: 1200,
  insurance: 300,
  managementFees: 0,
  taxationPct: 10,
  renovationCost: 0,
  financingFees: 0,
  agencyFees: 0,
  furnishingCost: 0,
  acquisitionFeesPct: 6,
  annualAppreciationPct: 5,
  rentGrowthPct: 5,
  inflationPct: 6,
  horizonYears: 10,
};

export type FormState = typeof DEFAULT_FORM;

// ─── Formatters ─────────────────────────────────────────────────────────────

export const fmtTND = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

export const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export const fmtPct = (n: number) => `${Number(n).toLocaleString("fr-FR")}%`;

/**
 * Libellé du mode de location, avec rappel quand le type de bien l'impose
 * (ex. « Mensuel (imposé pour ce type) » pour un local commercial).
 * `mode` absent (anciennes données) → mode imposé si connu, sinon mensuel.
 */
export const rentModeLabel = (mode: "nuit" | "mensuel" | undefined, type?: InvestmentType): string => {
  const forced = type ? forcedRentModeFor(type) : null;
  const effective = mode ?? forced ?? "mensuel";
  const base = effective === "nuit" ? "Nuitée" : "Mensuel";
  return forced === effective
    ? `${base} (${effective === "nuit" ? "imposée" : "imposé"} pour ce type)`
    : base;
};

export const stripEmojis = (text: string) =>
  text.replace(/[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu, "").trim();

export const fmtPdf = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const parts = Math.floor(Math.abs(n)).toString().split("");
  let result = "";
  for (let i = parts.length - 1, j = 1; i >= 0; i--, j++) {
    result = parts[i] + (j > 1 && (j - 1) % 3 === 0 ? "." : "") + result;
  }
  return `${sign}${result} TND`;
};

export const scoreTone = (s: number) =>
  s >= 85
    ? { label: "Excellent investissement", text: "text-emerald-600 dark:text-emerald-400", ring: "#10b981", bg: "from-emerald-500/15 to-teal-500/10" }
    : s >= 70
      ? { label: "Bon investissement", text: "text-blue-600 dark:text-blue-400", ring: "#3b82f6", bg: "from-blue-500/15 to-indigo-500/10" }
      : s >= 55
        ? { label: "Investissement correct", text: "text-amber-600 dark:text-amber-400", ring: "#f59e0b", bg: "from-amber-500/15 to-orange-500/10" }
        : { label: "Investissement risqué", text: "text-red-600 dark:text-red-400", ring: "#ef4444", bg: "from-red-500/15 to-rose-500/10" };

// ============================================================================
// Small UI pieces
// ============================================================================

export function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const tone = scoreTone(score);
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="11" className="stroke-muted/40" />
          <circle
            cx="64" cy="64" r={r} fill="none" strokeWidth="11" strokeLinecap="round"
            stroke={tone.ring} strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tabular-nums">{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <div>
        <p className={cn("text-lg font-bold", tone.text)}>{tone.label}</p>
        <p className="text-xs text-muted-foreground mt-1">{grade}</p>
        <Badge variant="outline" className="mt-2 gap-1 text-[10px] border-primary/20 bg-primary/5 text-primary">
          <Sparkles className="h-3 w-3" /> Score IA
        </Badge>
      </div>
    </div>
  );
}

export function Kpi({ icon: Icon, label, value, sub, tone = "text-foreground" }: {
  icon: any; label: string; value: string; sub?: string; tone?: string;
}) {
  return (
    <Card className="group border border-border/40 bg-background/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[0.03]">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border border-border/30 bg-muted/30 transition-transform duration-200 group-hover:scale-110", tone)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
        </div>
        <p className={cn("text-base sm:text-lg font-bold tabular-nums truncate", tone)}>{value}</p>
        {sub && <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function NumField({ label, value, onChange, suffix, hint, valid, required, labelExtra }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  suffix?: string; step?: number; hint?: ReactNode; valid?: boolean; required?: boolean; labelExtra?: ReactNode;
}) {
  // Saisie libre (texte) : l'état local permet de taper des décimales et de
  // vider le champ sans blocage — le type "number" natif cassait la saisie
  // (e.target.value = "" sur les valeurs partielles comme "12.").
  const [text, setText] = useState(value != null ? String(value) : "");
  const lastEmitted = useRef<number | undefined>(value);

  // Synchronisation uniquement quand la valeur change depuis l'extérieur
  // (prefill, réinitialisation) — jamais pendant la frappe de l'utilisateur.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value != null ? String(value) : "");
    }
  }, [value]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </label>
          {labelExtra}
        </div>
        {valid && (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="Champ rempli" />
        )}
      </div>
      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const raw = e.target.value.replace(",", ".");
            setText(raw);
            if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
              lastEmitted.current = undefined;
              onChange(undefined);
            } else {
              const n = Number(raw);
              if (!Number.isNaN(n)) {
                lastEmitted.current = n;
                onChange(n);
              }
            }
          }}
          className="h-9 sm:h-10 text-sm tabular-nums pr-12"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

export function SectionHeading({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// PDF Report generation
// ============================================================================

export function generatePdf(run: AnalysisRun) {
  const { results, input, aiInsights } = run;
  const ind = results.indicators;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 15;
  const mr = 15;
  const cw = pw - ml - mr;
  let y = ml;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > ph - ml) {
      doc.addPage();
      y = ml;
    }
  };

  const C = {
    primary: [30, 64, 175] as [number, number, number],
    accent: [16, 185, 129] as [number, number, number],
    text: [31, 41, 55] as [number, number, number],
    textSecondary: [107, 114, 128] as [number, number, number],
    border: [229, 231, 235] as [number, number, number],
    bgLight: [249, 250, 251] as [number, number, number],
  };

  const typeLabel = TYPE_META[input.investmentType]?.label ?? input.investmentType;
  const dateStr = new Date().toLocaleDateString("fr-FR");
  const safeName = (input.name || "analyse_investissement").replace(/[^a-zA-Z0-9-_]/g, "_");

  const h = (txt: string) => {
    addPageIfNeeded(12);
    doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.rect(ml, y, 1.6, 5.5, "F");
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(stripEmojis(txt), ml + 4, y + 4.5);
    y += 9;
  };

  const table = (head: string[], rows: (string | number)[][], widths?: number[]) => {
    (doc as any).autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      head: [head],
      body: rows,
      styles: { fontSize: 8, cellPadding: 1.8, textColor: C.text, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.primary, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: C.bgLight },
      columnStyles: widths
        ? Object.fromEntries(widths.map((w, i) => [i, { cellWidth: (cw * w) / 100 }]))
        : undefined,
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  };

  const body = (txt: string, fontSize = 8.5) => {
    const lines = doc.splitTextToSize(stripEmojis(txt), cw - 2);
    addPageIfNeeded(lines.length * 4 + 4);
    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.text(lines, ml, y + 3);
    y += lines.length * 4 + 5;
  };

  // ═══ HEADER ═══
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pw, 2.5, "F");
  doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.rect(0, 2.5, pw, 20, "F");

  const lx = ml, ly = 5;
  doc.setFillColor(255, 255, 255);
  doc.triangle(lx + 6, ly, lx, ly + 6, lx + 12, ly + 6, "F");
  doc.rect(lx + 1, ly + 6, 10, 9, "F");
  doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.rect(lx + 4, ly + 10, 4, 5, "F");
  doc.rect(lx + 2.5, ly + 7.5, 2, 2, "F");
  doc.rect(lx + 7.5, ly + 7.5, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("batibuild App", ml + 17, 10);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport d'analyse de rentabilite immobiliere — Marche tunisien 2026", ml + 17, 15.5);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text(`RAP-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`, pw - mr, 9, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Genere le ${dateStr}`, pw - mr, 13, { align: "right" });
  doc.text(`Analyse : ${safeName}`, pw - mr, 17, { align: "right" });

  y = 32;

  // ═══ SYNTHÈSE ═══
  h("Synthèse de l'investissement");
  table(
    ["Paramètre", "Valeur"],
    [
      ["Type de bien", typeLabel],
      ["Zone / Gouvernorat", results.zone.name],
      ["Ville / Quartier", [input.city, input.quartier].filter(Boolean).join(" / ") || "—"],
      ["Attractivité du quartier", results.zone.utilityLabel ? `${results.zone.utilityLabel} — ${results.zone.utilityIndex}/100` : "—"],
      ["Prix d'achat", fmtPdf(ind.purchasePrice)],
      ["Frais d'acquisition (" + (input.acquisitionFeesPct ?? 6) + " %)", fmtPdf(ind.acquisitionFees)],
      ["Frais de financement", fmtPdf(ind.financingFees ?? 0)],
      ["Frais d'agence", fmtPdf(ind.agencyFees ?? 0)],
      ["Coût d'aménagement", fmtPdf(ind.renovationCost ?? 0)],
      ["Ameublement", fmtPdf(ind.furnishingCost ?? 0)],
      ["Coût total de l'investissement", fmtPdf(ind.totalCost)],
      ["Prix au m²", ind.pricePerM2 ? fmtPdf(ind.pricePerM2) : "—"],
      ["Loyer estimé (occupation " + ind.occupancyRate + " %)",
        input.rentMode === "nuit"
          ? fmtPdf(ind.monthlyRent) + " /mois (" + fmtNum(input.rentAmount ?? 0) + " TND/nuit)"
          : fmtPdf(ind.monthlyRent) + " /mois"],
      ["Mode de location", rentModeLabel(ind.rentMode, input.investmentType)],
    ],
    [70, 30],
  );

  h("Indicateurs financiers");
  table(
    ["Indicateur", "Valeur"],
    [
      ["Revenus locatifs bruts annuels", fmtPdf(ind.grossAnnualRent)],
      ["Charges annuelles", fmtPdf(ind.annualCharges ?? 0)],
      ["Assurance", fmtPdf(ind.insurance ?? 0)],
      ["Frais de gestion", fmtPdf(ind.managementFees ?? 0)],
      ["Fiscalité (" + (input.taxationPct ?? 0) + " % du brut)", fmtPdf(ind.taxation ?? 0)],
      ["Total charges d'exploitation annuelles", fmtPdf(ind.operatingExpenses)],
      ["Revenu net annuel", fmtPdf(ind.netAnnualIncome)],
      ["Flux de trésorerie mensuel", fmtPdf(ind.monthlyCashflow)],
      ["Flux de trésorerie annuel", fmtPdf(ind.annualCashflow)],
      ["Rentabilité brute", ind.grossYieldPct.toLocaleString("fr-FR") + " %"],
      ["Rentabilité nette", ind.netYieldPct.toLocaleString("fr-FR") + " %"],
      ["Return on Investment annuel", ind.roiAnnualPct.toLocaleString("fr-FR") + " %"],
      ["Return on Investment sur 5 ans", ind.roi5yPct.toLocaleString("fr-FR") + " %"],
      ["Return on Investment sur 10 ans", ind.roi10yPct.toLocaleString("fr-FR") + " %"],
      ["Rapport prix / loyer annuel", ind.priceToRentRatio.toLocaleString("fr-FR")],
    ],
    [70, 30],
  );

  h("Récupération du capital");
  table(
    ["Indicateur", "Valeur"],
    [
      ["Durée estimée de récupération", ind.paybackYears >= 99 ? "Supérieure à 30 ans" : ind.paybackYears.toLocaleString("fr-FR") + " ans"],
      ["Date estimée d'amortissement complet", ind.paybackDateLabel],
    ],
    [70, 30],
  );

  h("Prévisions des bénéfices");
  table(
    ["Horizon", "Revenu net", "Valeur future", "Gain estimé", "Return on Investment"],
    results.forecastSummary.map((s) => [
      s.label,
      fmtPdf(s.netIncome),
      fmtPdf(s.futureValue),
      fmtPdf(s.gain),
      s.roiPct.toLocaleString("fr-FR") + " %",
    ]),
    [18, 26, 26, 18, 12],
  );

  h("Simulation de scénarios");
  table(
    ["Scénario", "Valeur future", "Revenus totaux", "Rentabilité nette", "Return on Investment", "Risque"],
    results.scenarios.map((s) => [
      s.label,
      fmtPdf(s.futureValue),
      fmtPdf(s.totalIncome),
      s.netYieldPct.toLocaleString("fr-FR") + " %",
      s.roiPct.toLocaleString("fr-FR") + " %",
      s.riskLevel,
    ]),
    [18, 20, 20, 16, 14, 12],
  );

  h("Comparaison avec d'autres investissements");
  table(
    ["Type", "Mode", "Revenu annuel", "Rentabilité nette", "Return on Investment 10 ans", "Risque", "Score"],
    results.comparison.map((c) => [
      c.label,
      c.rentMode === "nuit" ? "Nuitée" : "Mensuel",
      fmtPdf(c.annualIncome),
      c.netYieldPct.toLocaleString("fr-FR") + " %",
      c.roi10yPct.toLocaleString("fr-FR") + " %",
      c.riskLevel,
      c.score + " / 100",
    ]),
    [20, 10, 18, 16, 14, 12, 10],
  );

  h("Score IA — " + results.score.total + " / 100 (" + results.score.grade + ")");
  table(
    ["Critère", "Score"],
    results.score.criteria.map((c) => [c.label, c.score + " / " + c.max]),
    [80, 20],
  );

  h("Recommandations de l'IA");
  (aiInsights?.recommendations?.length
    ? aiInsights.recommendations
    : ["Consultez un expert immobilier local avant tout engagement."]
  ).forEach((r) => body("• " + r));

  h("Risques principaux");
  (aiInsights?.risks?.length
    ? aiInsights.risks
    : ["Les performances passées ne préjugent pas des résultats futurs."]
  ).forEach((r) => body("• " + r));

  h("Notes de marché");
  (aiInsights?.marketNotes?.length
    ? aiInsights.marketNotes
    : []
  ).forEach((r) => body("• " + r));

  // ═══ FOOTER ═══
  addPageIfNeeded(26);
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.line(ml, y, pw - mr, y);
  y += 5;
  doc.setFontSize(6.5);
  doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Rapport genere par le moteur d'intelligence artificielle batibuild App. Les estimations reposent sur les prix du marche tunisien 2026 et des hypotheses saisies par l'utilisateur. Document indicatif : ne constitue pas un conseil financier ou juridique.",
    ml, y, { maxWidth: cw },
  );
  doc.setFont("helvetica", "normal");
  doc.text("batibuild App — Analyse de rentabilite immobiliere par IA", ml, y + 6);

  doc.save(`rapport_investissement_${safeName}.pdf`);
}

// ============================================================================
// CSV Report generation
// ============================================================================

function csvCell(v: string | number): string {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
}

function csvRows(head: string[], rows: (string | number)[][]): string {
  const lines = [head.map(csvCell).join(";")];
  for (const r of rows) lines.push(r.map(csvCell).join(";"));
  return lines.join("\r\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCsv(run: AnalysisRun) {
  const { results, input, aiInsights } = run;
  const ind = results.indicators;
  const typeLabel = TYPE_META[input.investmentType]?.label ?? input.investmentType;
  const safeName = (input.name || "analyse_investissement").replace(/[^a-zA-Z0-9-_]/g, "_");
  const sections: string[] = [];

  // ── Synthèse ──
  sections.push(csvRows(
    ["Paramètre", "Valeur"],
    [
      ["Type de bien", typeLabel],
      ["Nom de l'analyse", input.name || "—"],
      ["Zone / Gouvernorat", results.zone.name],
      ["Ville / Quartier", [input.city, input.quartier].filter(Boolean).join(" / ") || "—"],
      ["Attractivité du quartier", results.zone.utilityLabel ? `${results.zone.utilityLabel} — ${results.zone.utilityIndex}/100` : "—"],
      ["Surface", input.area ? `${input.area} m²` : "—"],
      ["Prix d'achat", `${ind.purchasePrice} TND`],
      ["Frais d'acquisition", `${ind.acquisitionFees} TND`],
      ["Frais de financement", `${ind.financingFees ?? 0} TND`],
      ["Frais d'agence", `${ind.agencyFees ?? 0} TND`],
      ["Coût d'aménagement", `${ind.renovationCost ?? 0} TND`],
      ["Ameublement", `${ind.furnishingCost ?? 0} TND`],
      ["Coût total de l'investissement", `${ind.totalCost} TND`],
      ["Prix au m²", ind.pricePerM2 ? `${ind.pricePerM2} TND` : "—"],
      ["Loyer estimé", input.rentMode === "nuit" ? `${input.rentAmount ?? 0} TND/nuit (≈ ${ind.monthlyRent} TND/mois)` : `${ind.monthlyRent} TND/mois`],
      ["Mode de location", rentModeLabel(ind.rentMode, input.investmentType)],
      ["Taux d'occupation", `${ind.occupancyRate}%`],
      ["Charges annuelles", `${ind.annualCharges ?? 0} TND`],
      ["Assurance", `${ind.insurance ?? 0} TND`],
      ["Frais de gestion", `${ind.managementFees ?? 0} TND`],
      ["Fiscalité", `${input.taxationPct ?? 0}% du brut (${ind.taxation ?? 0} TND/an)`],
      ["Score IA", `${results.score.total}/100 — ${results.score.grade}`],
      ["Indice de confiance de l'estimation", `${results.aiConfidence}%`],
    ],
  ));

  // ── Indicateurs financiers ──
  sections.push(csvRows(
    ["Indicateur", "Valeur"],
    [
      ["Revenus locatifs bruts annuels", `${ind.grossAnnualRent} TND`],
      ["Charges d'exploitation annuelles", `${ind.operatingExpenses} TND`],
      ["Revenu net annuel", `${ind.netAnnualIncome} TND`],
      ["Flux de trésorerie mensuel", `${ind.monthlyCashflow} TND`],
      ["Flux de trésorerie annuel", `${ind.annualCashflow} TND`],
      ["Rentabilité brute", `${ind.grossYieldPct}%`],
      ["Rentabilité nette", `${ind.netYieldPct}%`],
      ["Return on Investment annuel", `${ind.roiAnnualPct}%`],
      ["Return on Investment sur 5 ans", `${ind.roi5yPct}%`],
      ["Return on Investment sur 10 ans", `${ind.roi10yPct}%`],
      ["Rapport prix / loyer annuel", `${ind.priceToRentRatio}x`],
      ["Durée de récupération du capital", ind.paybackYears >= 99 ? "> 30 ans" : `${ind.paybackYears} ans`],
      ["Date estimée d'amortissement", ind.paybackDateLabel],
    ],
  ));

  // ── Prévisions ──
  sections.push(csvRows(
    ["Horizon", "Revenu net", "Valeur future", "Gain estimé", "Return on Investment"],
    results.forecastSummary.map((s) => [
      s.label,
      `${s.netIncome} TND`,
      `${s.futureValue} TND`,
      `${s.gain} TND`,
      `${s.roiPct}%`,
    ]),
  ));

  // ── Scénarios ──
  sections.push(csvRows(
    ["Scénario", "Valeur future", "Revenus totaux", "Rentabilité nette", "Return on Investment", "Risque"],
    results.scenarios.map((s) => [
      s.label,
      `${s.futureValue} TND`,
      `${s.totalIncome} TND`,
      `${s.netYieldPct}%`,
      `${s.roiPct}%`,
      s.riskLevel,
    ]),
  ));

  // ── Comparaison ──
  sections.push(csvRows(
    ["Type", "Mode", "Revenu annuel", "Rentabilité nette", "Return on Investment 10 ans", "Appréciation", "Risque", "Score"],
    results.comparison.map((c) => [
      c.label,
      c.rentMode === "nuit" ? "Nuitée" : "Mensuel",
      `${c.annualIncome} TND`,
      `${c.netYieldPct}%`,
      `${c.roi10yPct}%`,
      `${c.appreciationPct}%`,
      c.riskLevel,
      `${c.score}/100`,
    ]),
  ));

  // ── Score IA ──
  sections.push(csvRows(
    ["Critère", "Score"],
    results.score.criteria.map((c) => [c.label, `${c.score}/100 (poids ${c.weight}%)`]),
  ));

  // ── Recommandations & risques IA ──
  sections.push(csvRows(
    ["Recommandations de l'IA"],
    (aiInsights?.recommendations ?? []).map((r) => [r]),
  ));
  sections.push(csvRows(
    ["Risques principaux"],
    (aiInsights?.risks ?? []).map((r) => [r]),
  ));
  sections.push(csvRows(
    ["Notes de marché"],
    (aiInsights?.marketNotes ?? []).map((r) => [r]),
  ));

  downloadCsv(`rapport_investissement_${safeName}.csv`, sections.join("\r\n\r\n"));
}
