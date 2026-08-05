import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useAction } from "convex/react";
import {
  Home,
  Building2,
  Building,
  DoorOpen,
  Layers,
  Landmark,
  Store,
  Briefcase,
  Warehouse,
  Map,
  Palmtree,
  HardHat,
  Sparkles,
  Download,
  Loader2,
  Trash2,
  Plus,
  Coins,
  Percent,
  Wallet,
  PiggyBank,
  CalendarClock,
  ShieldAlert,
  Bot,
  Send,
  MapPin,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Gauge,
  Star,
  FileText,
  ChevronRight,
  RefreshCw,
  Banknote,
  Layers as LayersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageSEO } from "@/hooks/use-page-seo";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
applyAutotablePlugin(jsPDF);

// ============================================================================
// Types (mirror of src/convex/investmentTypes.ts)
// ============================================================================

type InvestmentType =
  | "maison" | "villa" | "appartement" | "studio" | "duplex" | "immeuble"
  | "local_commercial" | "bureau" | "entrepot" | "terrain"
  | "residence_touristique" | "projet_neuf";

type InvestmentInput = {
  name?: string;
  investmentType: InvestmentType;
  purchasePrice: number;
  area?: number;
  region: string;
  city?: string;
  monthlyRent: number;
  occupancyRate?: number;
  annualExpensesPct?: number;
  renovationCost?: number;
  acquisitionFeesPct?: number;
  annualAppreciationPct?: number;
  rentGrowthPct?: number;
  inflationPct?: number;
  horizonYears?: number;
};

interface Indicators {
  purchasePrice: number; totalCost: number; acquisitionFees: number; renovationCost: number;
  monthlyRent: number; occupancyRate: number; grossAnnualRent: number; operatingExpenses: number;
  netAnnualIncome: number; monthlyCashflow: number; annualCashflow: number;
  grossYieldPct: number; netYieldPct: number; roiAnnualPct: number; roi5yPct: number; roi10yPct: number;
  paybackYears: number; paybackDate: number; paybackDateLabel: string;
  pricePerM2?: number; priceToRentRatio: number;
}
interface ForecastPoint { year: number; netIncome: number; cumulativeIncome: number; propertyValue: number; cumulativeProfit: number; }
interface ForecastSummary { horizon: number; label: string; netIncome: number; futureValue: number; gain: number; cumulativeProfit: number; roiPct: number; }
interface Scenario { key: string; label: string; futureValue: number; totalIncome: number; roiPct: number; netYieldPct: number; cumulativeProfit: number; riskLevel: string; risks: string[]; }
interface ScoreCriterion { key: string; label: string; score: number; max: number; weight: number; }
interface Score { total: number; grade: string; label: string; criteria: ScoreCriterion[]; }
interface ComparisonItem { type: string; label: string; totalCost: number; annualIncome: number; netYieldPct: number; roi10yPct: number; riskLevel: string; appreciationPct: number; score: number; }
interface ZoneInfo { region: string; name: string; pricePerM2: number; rentPerM2: number; demandIndex: number; appreciationPct: number; riskScore: number; rank: number; highlights: string[]; }
interface AnalysisResults {
  indicators: Indicators; forecasts: ForecastPoint[]; forecastSummary: ForecastSummary[];
  scenarios: Scenario[]; score: Score; comparison: ComparisonItem[]; zone: ZoneInfo;
  aiConfidence: number; generatedAt: number;
}
interface AiInsights { summary: string; verdict: string; recommendations: string[]; risks: string[]; marketNotes: string[]; usedFallback: boolean; generatedAt: number; }
interface AnalysisRun { _id: string; input: InvestmentInput; results: AnalysisResults; aiInsights?: AiInsights; }
interface ZoneRow { region: string; name: string; pricePerM2: number; rentPerM2: number; demandIndex: number; appreciationPct: number; riskScore: number; highlights: string[]; }
interface ChatMsg { role: "user" | "assistant"; content: string; }

// ============================================================================
// Constants
// ============================================================================

const TYPE_META: Record<InvestmentType, { label: string; icon: any; desc: string }> = {
  maison: { label: "Maison", icon: Home, desc: "Maison individuelle" },
  villa: { label: "Villa", icon: Building2, desc: "Haut standing" },
  appartement: { label: "Appartement", icon: Building, desc: "Produit locatif liquide" },
  studio: { label: "Studio", icon: DoorOpen, desc: "Petite surface" },
  duplex: { label: "Duplex", icon: Layers, desc: "Deux niveaux" },
  immeuble: { label: "Immeuble", icon: Landmark, desc: "Revenus multiples" },
  local_commercial: { label: "Local commercial", icon: Store, desc: "Rendement élevé" },
  bureau: { label: "Bureau", icon: Briefcase, desc: "Surface tertiaire" },
  entrepot: { label: "Entrepôt", icon: Warehouse, desc: "Logistique & stockage" },
  terrain: { label: "Terrain constructible", icon: Map, desc: "Plus-value long terme" },
  residence_touristique: { label: "Résidence touristique", icon: Palmtree, desc: "Location saisonnière" },
  projet_neuf: { label: "Projet immobilier neuf", icon: HardHat, desc: "Achat sur plan" },
};

const TYPE_ORDER: InvestmentType[] = [
  "maison", "villa", "appartement", "studio", "duplex", "immeuble",
  "local_commercial", "bureau", "entrepot", "terrain", "residence_touristique", "projet_neuf",
];

const DEFAULT_FORM = {
  name: "",
  investmentType: "appartement" as InvestmentType,
  purchasePrice: 320000,
  area: 100,
  region: "tunis",
  city: "",
  monthlyRent: 1500,
  occupancyRate: 95,
  annualExpensesPct: 18,
  renovationCost: 0,
  acquisitionFeesPct: 6,
  annualAppreciationPct: undefined as number | undefined,
  rentGrowthPct: 3,
  inflationPct: 6,
  horizonYears: 10,
};

// ─── Formatters ─────────────────────────────────────────────────────────────

const fmtTND = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

const fmtPct = (n: number) => `${Number(n).toLocaleString("fr-FR")}%`;

const stripEmojis = (text: string) =>
  text.replace(/[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu, "").trim();

const fmtPdf = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const parts = Math.floor(Math.abs(n)).toString().split("");
  let result = "";
  for (let i = parts.length - 1, j = 1; i >= 0; i--, j++) {
    result = parts[i] + (j > 1 && (j - 1) % 3 === 0 ? "." : "") + result;
  }
  return `${sign}${result} TND`;
};

const scoreTone = (s: number) =>
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

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
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

function Kpi({ icon: Icon, label, value, sub, tone = "text-foreground" }: {
  icon: any; label: string; value: string; sub?: string; tone?: string;
}) {
  return (
    <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-shadow duration-200">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border border-border/30 bg-muted/30", tone)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
        </div>
        <p className="text-base sm:text-lg font-bold tabular-nums truncate">{value}</p>
        {sub && <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function NumField({ label, value, onChange, suffix, step = 1, hint }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  suffix?: string; step?: number; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Input
          type="number"
          value={value ?? ""}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="h-9 text-sm tabular-nums pr-12"
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

function SectionHeading({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) {
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

function generatePdf(run: AnalysisRun) {
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
  doc.text("BudgetBati", ml + 17, 10);
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
      ["Prix d'achat", fmtPdf(ind.purchasePrice)],
      ["Frais d'acquisition", fmtPdf(ind.acquisitionFees)],
      ["Travaux de rénovation", fmtPdf(ind.renovationCost)],
      ["Coût total de l'investissement", fmtPdf(ind.totalCost)],
      ["Prix au m²", ind.pricePerM2 ? fmtPdf(ind.pricePerM2) : "—"],
      ["Loyer mensuel (occupation " + ind.occupancyRate + " %)", fmtPdf(ind.monthlyRent)],
    ],
    [70, 30],
  );

  h("Indicateurs financiers");
  table(
    ["Indicateur", "Valeur"],
    [
      ["Revenus locatifs bruts annuels", fmtPdf(ind.grossAnnualRent)],
      ["Charges d'exploitation annuelles", fmtPdf(ind.operatingExpenses)],
      ["Revenu net annuel", fmtPdf(ind.netAnnualIncome)],
      ["Cash-flow mensuel", fmtPdf(ind.monthlyCashflow)],
      ["Cash-flow annuel", fmtPdf(ind.annualCashflow)],
      ["Rentabilité brute", ind.grossYieldPct.toLocaleString("fr-FR") + " %"],
      ["Rentabilité nette", ind.netYieldPct.toLocaleString("fr-FR") + " %"],
      ["ROI annuel", ind.roiAnnualPct.toLocaleString("fr-FR") + " %"],
      ["ROI sur 5 ans", ind.roi5yPct.toLocaleString("fr-FR") + " %"],
      ["ROI sur 10 ans", ind.roi10yPct.toLocaleString("fr-FR") + " %"],
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
    ["Horizon", "Revenu net", "Valeur future", "Gain estimé", "ROI"],
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
    ["Scénario", "Valeur future", "Revenus totaux", "Rentabilité nette", "ROI", "Risque"],
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
    ["Type", "Revenu annuel", "Rentabilité nette", "ROI 10 ans", "Risque", "Score"],
    results.comparison.map((c) => [
      c.label,
      fmtPdf(c.annualIncome),
      c.netYieldPct.toLocaleString("fr-FR") + " %",
      c.roi10yPct.toLocaleString("fr-FR") + " %",
      c.riskLevel,
      c.score + " / 100",
    ]),
    [26, 20, 18, 16, 12, 8],
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
    "Rapport genere par le moteur d'intelligence artificielle BudgetBati. Les estimations reposent sur les prix du marche tunisien 2026 et des hypotheses saisies par l'utilisateur. Document indicatif : ne constitue pas un conseil financier ou juridique.",
    ml, y, { maxWidth: cw },
  );
  doc.setFont("helvetica", "normal");
  doc.text("BudgetBati — Analyse de rentabilite immobiliere par IA", ml, y + 6);

  doc.save(`rapport_investissement_${safeName}.pdf`);
}

// ============================================================================
// Main page
// ============================================================================

export default function InvestmentAnalysis() {
  usePageSEO({
    title: "Analyse de rentabilité immobilière - BudgetBati",
    description: "Évaluez la rentabilité de vos investissements immobiliers en Tunisie avec l'IA : ROI, cash-flow, prévisions, scénarios et score d'investissement.",
  });
  const navigate = useNavigate();

  const [form, setForm] = useState(DEFAULT_FORM);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<AnalysisRun | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("apercu");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // AI assistant chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: "assistant", content: "Bonjour ! Je suis votre conseiller en investissement immobilier pour la Tunisie. Posez-moi une question sur la rentabilité, les zones, le risque ou le financement — ou lancez d'abord une analyse." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const zones = useQuery(api.investments.getInvestmentZones) || [];
  const saved = useQuery(api.investments.listAnalyses) || [];
  const runAnalysisAction = useAction(api.investmentAi.runAnalysis);
  const askAssistant = useAction(api.investmentAi.askInvestorAssistant);
  const deleteAnalysis = useMutation(api.investments.deleteAnalysis);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMsgs, chatBusy]);

  const set = (k: keyof typeof form, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const buildInput = (): InvestmentInput => ({
    name: form.name || undefined,
    investmentType: form.investmentType,
    purchasePrice: form.purchasePrice,
    area: form.area || undefined,
    region: form.region,
    city: form.city || undefined,
    monthlyRent: form.monthlyRent,
    occupancyRate: form.occupancyRate,
    annualExpensesPct: form.annualExpensesPct,
    renovationCost: form.renovationCost,
    acquisitionFeesPct: form.acquisitionFeesPct,
    annualAppreciationPct: form.annualAppreciationPct,
    rentGrowthPct: form.rentGrowthPct,
    inflationPct: form.inflationPct,
    horizonYears: form.horizonYears,
  });

  const handleAnalyze = async () => {
    if (form.purchasePrice <= 0) { toast.error("Renseignez un prix d'achat valide."); return; }
    if (form.monthlyRent < 0) { toast.error("Renseignez un loyer mensuel valide."); return; }
    setRunning(true);
    try {
      const res = await runAnalysisAction({ input: buildInput() });
      setActive(res as any);
      setActiveId((res as any)._id ?? null);
      setActiveTab("apercu");
      toast.success("Analyse générée avec succès");
      document.getElementById("results-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse");
    } finally {
      setRunning(false);
    }
  };

  const handleLoad = (doc: any) => {
    setActive({ _id: doc._id, input: doc.input, results: doc.results, aiInsights: doc.aiInsights } as any);
    setActiveId(doc._id);
    setActiveTab("apercu");
    document.getElementById("results-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette analyse ?")) return;
    setDeletingId(id);
    try {
      await deleteAnalysis({ analysisId: id as any });
      if (activeId === id) { setActive(null); setActiveId(null); }
      toast.success("Analyse supprimée");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setDeletingId(null);
    }
  };

  const handleNew = () => {
    setForm(DEFAULT_FORM);
    setActive(null);
    setActiveId(null);
    setActiveTab("apercu");
  };

  const contextFor = (): string | undefined => {
    if (!active) return undefined;
    const ind = active.results.indicators;
    return (
      `Type: ${TYPE_META[active.input.investmentType]?.label ?? active.input.investmentType}. ` +
      `Zone: ${active.results.zone.name} (demande ${active.results.zone.demandIndex}/100, risque ${active.results.zone.riskScore}/100). ` +
      `Prix d'achat: ${ind.purchasePrice} TND. Coût total: ${ind.totalCost} TND. Loyer mensuel: ${ind.monthlyRent} TND. ` +
      `Revenu net annuel: ${ind.netAnnualIncome} TND. Rendement net: ${ind.netYieldPct}%. ROI 5 ans: ${ind.roi5yPct}%. ROI 10 ans: ${ind.roi10yPct}%. ` +
      `Récupération du capital: ${ind.paybackYears} ans. Score IA: ${active.results.score.total}/100.`
    );
  };

  const sendChat = async (text?: string) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatBusy) return;
    setChatInput("");
    setChatMsgs((m) => [...m, { role: "user", content: msg }]);
    setChatBusy(true);
    try {
      const res = await askAssistant({ message: msg, context: contextFor() });
      setChatMsgs((m) => [...m, { role: "assistant", content: (res as any).answer }]);
    } catch (err: any) {
      setChatMsgs((m) => [...m, { role: "assistant", content: "Désolé, je n'ai pas pu répondre. Réessayez." }]);
    } finally {
      setChatBusy(false);
    }
  };

  const QUICK_QUESTIONS = [
    "Cet investissement est-il rentable ?",
    "Quel est le meilleur quartier pour investir ?",
    "Combien vais-je gagner dans 10 ans ?",
    "Quel est le risque de cet investissement ?",
  ];

  const ind = active?.results.indicators;
  const results = active?.results;
  const aiInsights = active?.aiInsights;

  const forecastChartData = (results?.forecasts ?? []).map((p) => ({
    year: `An ${p.year}`,
    "Bénéfice cumulé": p.cumulativeProfit,
    "Valeur du bien": p.propertyValue,
  }));

  const comparisonChartData = (results?.comparison ?? []).map((c) => ({
    name: c.label,
    "ROI 10 ans": c.roi10yPct,
    Score: c.score,
  }));

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ═══ Header ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold">Analyse de la rentabilité immobilière</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Moteur d'intelligence artificielle — marché tunisien 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Retour
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs"
              variant="outline"
              onClick={handleNew}
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle analyse
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!active}
              onClick={() => active && generatePdf(active)}
            >
              <Download className="h-3.5 w-3.5" />
              Rapport PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-4 sm:gap-6 items-start">
          {/* ═════════════ LEFT : FORM ═════════════ */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  Informations de l'investissement
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Saisissez les caractéristiques du bien à analyser
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-3.5">
                {/* Type selector */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Type de bien</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TYPE_ORDER.map((t) => {
                      const meta = TYPE_META[t];
                      const Icon = meta.icon;
                      const selected = form.investmentType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => set("investmentType", t)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-all active:scale-[0.97]",
                            selected
                              ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                              : "border-border/40 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                          )}
                          title={meta.desc}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-[9px] leading-tight font-medium line-clamp-2">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Nom de l'analyse (optionnel)</label>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ex : Appartement La Marsa"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <NumField label="Prix d'achat" value={form.purchasePrice} suffix="TND" onChange={(v) => set("purchasePrice", v ?? 0)} />
                  <NumField label="Surface (m²)" value={form.area} suffix="m²" onChange={(v) => set("area", v)} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Gouvernorat</label>
                    <select
                      value={form.region}
                      onChange={(e) => set("region", e.target.value)}
                      className="h-9 w-full rounded-lg border border-border/50 bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      {zones.map((z: any) => (
                        <option key={z.region} value={z.region}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                  <NumField label="Loyer mensuel" value={form.monthlyRent} suffix="TND" onChange={(v) => set("monthlyRent", v ?? 0)} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <NumField label="Taux d'occupation" value={form.occupancyRate} suffix="%" step={1} onChange={(v) => set("occupancyRate", v)} />
                  <NumField label="Charges annuelles" value={form.annualExpensesPct} suffix="%" step={0.5} onChange={(v) => set("annualExpensesPct", v)} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <NumField label="Travaux de rénovation" value={form.renovationCost} suffix="TND" onChange={(v) => set("renovationCost", v ?? 0)} />
                  <NumField label="Frais d'acquisition" value={form.acquisitionFeesPct} suffix="%" step={0.5} onChange={(v) => set("acquisitionFeesPct", v)} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <NumField
                    label="Appréciation annuelle"
                    value={form.annualAppreciationPct}
                    suffix="%"
                    step={0.5}
                    hint="Vide = moyenne de la zone"
                    onChange={(v) => set("annualAppreciationPct", v)}
                  />
                  <NumField label="Croissance des loyers" value={form.rentGrowthPct} suffix="%" step={0.5} onChange={(v) => set("rentGrowthPct", v)} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <NumField label="Inflation" value={form.inflationPct} suffix="%" step={0.5} onChange={(v) => set("inflationPct", v)} />
                  <NumField label="Horizon (années)" value={form.horizonYears} suffix="ans" step={1} onChange={(v) => set("horizonYears", v)} />
                </div>

                <Button
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handleAnalyze}
                  disabled={running}
                >
                  {running ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse en cours…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyser avec l'IA
                    </>
                  )}
                </Button>

                {zones.length > 0 && (
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Zone actuelle : {zones.find((z: any) => z.region === form.region)?.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                      {zones.find((z: any) => z.region === form.region)?.highlights?.join(" · ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved analyses */}
            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Analyses enregistrées
                  <Badge variant="secondary" className="text-[9px] ml-auto">{saved.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-1.5 max-h-72 overflow-y-auto">
                {saved.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/70 py-2">
                    Aucune analyse enregistrée. Lancez une analyse pour la sauvegarder automatiquement.
                  </p>
                ) : (
                  saved.map((doc: any) => (
                    <div
                      key={doc._id}
                      className={cn(
                        "group flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-all cursor-pointer",
                        activeId === doc._id
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/30 hover:border-primary/25 hover:bg-muted/30",
                      )}
                      onClick={() => handleLoad(doc)}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {doc.input?.name || TYPE_META[doc.input?.investmentType as InvestmentType]?.label || "Analyse"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {doc.results?.zone?.name} · Score {doc.results?.score?.total ?? "—"}/100 ·{" "}
                          {new Date(doc.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-muted-foreground hover:text-destructive"
                        title="Supprimer"
                      >
                        {deletingId === doc._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═════════════ RIGHT : RESULTS ═════════════ */}
          <div id="results-anchor" className="min-w-0 space-y-4 sm:space-y-6 scroll-mt-4">
            {!active && !running && (
              <div className="rounded-2xl border border-dashed border-border/40 bg-gradient-to-br from-background/80 to-background/50 p-8 sm:p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-blue-500/10 text-indigo-500">
                  <Landmark className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Analysez la rentabilité de votre investissement</h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Renseignez les informations du bien à gauche puis lancez l'analyse. Le moteur IA calcule
                  automatiquement les indicateurs financiers, le ROI, la durée de récupération du capital,
                  les prévisions de bénéfices, les scénarios et le score d'investissement.
                </p>
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg mx-auto">
                  {[
                    { icon: Percent, label: "Rentabilité brute & nette" },
                    { icon: PiggyBank, label: "Cash-flow mensuel" },
                    { icon: CalendarClock, label: "Récupération du capital" },
                    { icon: Gauge, label: "Score IA /100" },
                  ].map((f) => (
                    <div key={f.label} className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
                      <f.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="text-[9px] text-muted-foreground leading-tight">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {running && !active && (
              <div className="rounded-2xl border border-border/40 bg-background/50 p-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm font-medium">Calcul des indicateurs financiers…</p>
                <p className="text-xs text-muted-foreground mt-1">Génération du conseil IA personnalisé</p>
              </div>
            )}

            {active && ind && results && (
              <>
                {/* ═══ Decision dashboard ═══ */}
                <Card className="border border-border/40 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-sm overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold truncate">
                            {active.input?.name || TYPE_META[active.input?.investmentType as InvestmentType]?.label}
                          </h2>
                          <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary text-[10px]">
                            <MapPin className="h-3 w-3" />
                            {results.zone.name}
                          </Badge>
                          <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                            <Sparkles className="h-3 w-3" />
                            Confiance IA : {results.aiConfidence}%
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">
                          {TYPE_META[active.input?.investmentType as InvestmentType]?.label} · {fmtTND(ind.purchasePrice)} · Loyer {fmtTND(ind.monthlyRent)}/mois
                        </p>
                        <div className="mt-3">
                          <ScoreGauge score={results.score.total} grade={results.score.grade} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 shrink-0 lg:w-[560px]">
                        <Kpi icon={Coins} label="Coût total" value={fmtTND(ind.totalCost)} sub={`${fmtNum(ind.pricePerM2 ?? 0)} TND/m²`} tone="text-indigo-600 dark:text-indigo-400" />
                        <Kpi icon={Percent} label="Rentabilité nette" value={fmtPct(ind.netYieldPct)} sub={`Brute ${fmtPct(ind.grossYieldPct)}`} tone="text-emerald-600 dark:text-emerald-400" />
                        <Kpi icon={Wallet} label="Cash-flow mensuel" value={fmtTND(ind.monthlyCashflow)} sub={`${fmtTND(ind.annualCashflow)}/an`} tone="text-blue-600 dark:text-blue-400" />
                        <Kpi icon={CalendarClock} label="Récupération" value={ind.paybackYears >= 99 ? "> 30 ans" : `${ind.paybackYears} ans`} sub={ind.paybackDateLabel} tone="text-amber-600 dark:text-amber-400" />
                        <Kpi icon={TrendingUp} label="ROI 10 ans" value={fmtPct(ind.roi10yPct)} sub={`5 ans : ${fmtPct(ind.roi5yPct)}`} tone="text-violet-600 dark:text-violet-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ═══ Tabs ═══ */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="overflow-x-auto scrollbar-none -mx-3 sm:mx-0 px-3 sm:px-0">
                    <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted/40 p-1 mb-4 min-w-max">
                      {[
                        { value: "apercu", label: "Aperçu IA", icon: Sparkles },
                        { value: "indicateurs", label: "Indicateurs", icon: Percent },
                        { value: "previsions", label: "Prévisions", icon: TrendingUp },
                        { value: "scenarios", label: "Scénarios", icon: LayersIcon },
                        { value: "comparaison", label: "Comparaison", icon: BarChart3 },
                        { value: "zones", label: "Zones", icon: MapPin },
                        { value: "assistant", label: "Assistant IA", icon: Bot },
                      ].map((t) => (
                        <TabsTrigger
                          key={t.value}
                          value={t.value}
                          className="gap-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
                        >
                          <t.icon className="h-3.5 w-3.5" />
                          <span className="hidden xs:inline sm:inline">{t.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* ── APERÇU IA ── */}
                  {activeTab === "apercu" && (
                    <div className="space-y-4">
                      {aiInsights && (
                        <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              Analyse de l'IA
                              {aiInsights.usedFallback && (
                                <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-600">
                                  Mode hors-ligne
                                </Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 space-y-3">
                            <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">{aiInsights.summary}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Recommandations
                                </p>
                                <ul className="space-y-1">
                                  {aiInsights.recommendations.slice(0, 4).map((r, i) => (
                                    <li key={i} className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
                                      <span className="text-emerald-500 mt-0.5">•</span>
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Risques
                                </p>
                                <ul className="space-y-1">
                                  {aiInsights.risks.slice(0, 4).map((r, i) => (
                                    <li key={i} className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
                                      <span className="text-amber-500 mt-0.5">•</span>
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                                <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-1">
                                  <Lightbulb className="h-3 w-3" /> Notes de marché
                                </p>
                                <ul className="space-y-1">
                                  {aiInsights.marketNotes.map((r, i) => (
                                    <li key={i} className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
                                      <span className="text-blue-500 mt-0.5">•</span>
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                          <SectionHeading icon={MapPin} title={`Zone : ${results.zone.name}`} desc={`Rang ${results.zone.rank}/24 en attractivité en Tunisie`} />
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Kpi icon={Banknote} label="Prix moyen" value={`${fmtNum(results.zone.pricePerM2)} TND/m²`} />
                            <Kpi icon={TrendingUp} label="Loyer moyen" value={`${results.zone.rentPerM2} TND/m²/mois`} />
                            <Kpi icon={Star} label="Demande locative" value={`${results.zone.demandIndex}/100`} />
                            <Kpi icon={ShieldAlert} label="Indice de risque" value={`${results.zone.riskScore}/100`} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {results.zone.highlights.map((hx, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] border-border/40 bg-muted/20">
                                {hx}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                          <SectionHeading icon={Gauge} title="Détail du score IA" desc="Critères pondérés de la note finale" />
                          <div className="space-y-2.5">
                            {results.score.criteria.map((c) => (
                              <div key={c.key}>
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="text-muted-foreground">{c.label}</span>
                                  <span className="font-semibold tabular-nums">{c.score}/100 <span className="text-muted-foreground/60 font-normal">(poids {c.weight}%)</span></span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full transition-all duration-700", scoreTone(results.score.total).ring === "#10b981" ? "bg-emerald-500" : scoreTone(results.score.total).ring === "#3b82f6" ? "bg-blue-500" : scoreTone(results.score.total).ring === "#f59e0b" ? "bg-amber-500" : "bg-red-500")}
                                    style={{ width: `${c.score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* ── INDICATEURS ── */}
                  {activeTab === "indicateurs" && (
                    <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <SectionHeading icon={Percent} title="Indicateurs financiers" desc="Calculs automatiques du moteur" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            ["Prix d'achat", fmtTND(ind.purchasePrice)],
                            ["Frais d'acquisition", fmtTND(ind.acquisitionFees)],
                            ["Travaux de rénovation", fmtTND(ind.renovationCost)],
                            ["Coût total de l'investissement", fmtTND(ind.totalCost), true],
                            ["Revenus locatifs bruts annuels", fmtTND(ind.grossAnnualRent)],
                            ["Charges d'exploitation annuelles", `- ${fmtTND(ind.operatingExpenses)}`],
                            ["Revenu net annuel", fmtTND(ind.netAnnualIncome), true],
                            ["Cash-flow mensuel", fmtTND(ind.monthlyCashflow)],
                            ["Cash-flow annuel", fmtTND(ind.annualCashflow)],
                            ["Rentabilité brute", fmtPct(ind.grossYieldPct)],
                            ["Rentabilité nette", fmtPct(ind.netYieldPct), true],
                            ["ROI annuel", fmtPct(ind.roiAnnualPct)],
                            ["ROI sur 5 ans", fmtPct(ind.roi5yPct)],
                            ["ROI sur 10 ans", fmtPct(ind.roi10yPct)],
                            ["Prix au m²", ind.pricePerM2 ? fmtTND(ind.pricePerM2) : "—"],
                            ["Rapport prix / loyer annuel", `${fmtNum(ind.priceToRentRatio)}×`],
                            ["Taux d'occupation retenu", fmtPct(ind.occupancyRate)],
                            ["Durée de récupération du capital", ind.paybackYears >= 99 ? "> 30 ans" : `${fmtNum(ind.paybackYears)} ans`],
                            ["Date estimée d'amortissement", ind.paybackDateLabel],
                            ["Indice de confiance de l'estimation", `${results.aiConfidence}%`],
                          ].map(([label, value, highlight]) => (
                            <div
                              key={label as string}
                              className={cn(
                                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5",
                                highlight ? "border-primary/25 bg-primary/5" : "border-border/30 bg-muted/10",
                              )}
                            >
                              <span className="text-[11px] sm:text-xs text-muted-foreground">{label}</span>
                              <span className={cn("text-xs sm:text-sm font-bold tabular-nums", highlight ? "text-primary" : "")}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ── PRÉVISIONS ── */}
                  {activeTab === "previsions" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        {results.forecastSummary.map((s) => (
                          <Card key={s.horizon} className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
                            <div className={cn("h-1 w-full", s.horizon === 10 ? "bg-indigo-500" : s.horizon === 5 ? "bg-blue-500" : s.horizon === 3 ? "bg-emerald-500" : "bg-amber-500")} />
                            <CardContent className="p-3 sm:p-4">
                              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Horizon {s.label}</p>
                              <p className={cn("text-lg sm:text-xl font-extrabold tabular-nums mt-1", s.gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                {fmtTND(s.gain)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Gain estimé</p>
                              <div className="mt-2 space-y-1 border-t border-border/20 pt-2 text-[10px] sm:text-[11px]">
                                <p className="flex justify-between"><span className="text-muted-foreground">Valeur future</span><span className="font-semibold tabular-nums">{fmtTND(s.futureValue)}</span></p>
                                <p className="flex justify-between"><span className="text-muted-foreground">Revenus cumulés</span><span className="font-semibold tabular-nums">{fmtTND(s.cumulativeProfit)}</span></p>
                                <p className="flex justify-between"><span className="text-muted-foreground">ROI</span><span className={cn("font-semibold tabular-nums", s.roiPct >= 0 ? "text-emerald-600" : "text-red-600")}>{fmtPct(s.roiPct)}</span></p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
                        <CardHeader className="p-4 pb-0">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Projection sur {results.forecasts.length} ans
                          </CardTitle>
                          <CardDescription className="text-[11px]">Bénéfice cumulé et valeur du bien (TND)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="h-72 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                                  </linearGradient>
                                  <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                                <YAxis
                                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toLocaleString("fr-FR")}k` : `${v}`}
                                  width={55}
                                />
                                <Tooltip
                                  formatter={(value: any, name: any) => [fmtTND(Number(value)), name]}
                                  contentStyle={{ borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", fontSize: 11, background: "rgba(255,255,255,0.96)" }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                                <Area type="monotone" dataKey="Bénéfice cumulé" stroke="#10b981" strokeWidth={2.5} fill="url(#gProfit)" />
                                <Area type="monotone" dataKey="Valeur du bien" stroke="#6366f1" strokeWidth={2.5} fill="url(#gValue)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* ── SCÉNARIOS ── */}
                  {activeTab === "scenarios" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {results.scenarios.map((s) => (
                          <Card
                            key={s.key}
                            className={cn(
                              "border bg-background/50 backdrop-blur-sm overflow-hidden transition-all hover:shadow-md",
                              s.key === "optimiste" ? "border-emerald-500/30" : s.key === "realiste" ? "border-blue-500/30" : "border-amber-500/30",
                            )}
                          >
                            <div className={cn(
                              "px-4 py-2.5 flex items-center justify-between",
                              s.key === "optimiste" ? "bg-emerald-500/10" : s.key === "realiste" ? "bg-blue-500/10" : "bg-amber-500/10",
                            )}>
                              <span className="text-xs font-bold">
                                {s.key === "optimiste" ? "📈" : s.key === "realiste" ? "📊" : "🛡️"} Scénario {s.label}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px]",
                                  s.key === "optimiste" ? "border-emerald-500/30 text-emerald-600" : s.key === "realiste" ? "border-blue-500/30 text-blue-600" : "border-amber-500/30 text-amber-600",
                                )}
                              >
                                Risque {s.riskLevel.toLowerCase()}
                              </Badge>
                            </div>
                            <CardContent className="p-4 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                                  <p className="text-[9px] text-muted-foreground">Valeur future</p>
                                  <p className="text-sm font-bold tabular-nums">{fmtTND(s.futureValue)}</p>
                                </div>
                                <div className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                                  <p className="text-[9px] text-muted-foreground">Revenus totaux</p>
                                  <p className="text-sm font-bold tabular-nums">{fmtTND(s.totalIncome)}</p>
                                </div>
                                <div className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                                  <p className="text-[9px] text-muted-foreground">Rentabilité nette</p>
                                  <p className="text-sm font-bold tabular-nums text-emerald-600">{fmtPct(s.netYieldPct)}</p>
                                </div>
                                <div className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                                  <p className="text-[9px] text-muted-foreground">ROI {results.forecasts.length} ans</p>
                                  <p className={cn("text-sm font-bold tabular-nums", s.roiPct >= 0 ? "text-emerald-600" : "text-red-600")}>{fmtPct(s.roiPct)}</p>
                                </div>
                              </div>
                              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                                <p className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Points de vigilance
                                </p>
                                <ul className="space-y-0.5">
                                  {s.risks.map((r, i) => (
                                    <li key={i} className="text-[10px] text-muted-foreground leading-relaxed flex gap-1">
                                      <span className="text-amber-500 mt-0.5">•</span>{r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── COMPARAISON ── */}
                  {activeTab === "comparaison" && (
                    <div className="space-y-4">
                      <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                          <SectionHeading
                            icon={BarChart3}
                            title="Comparaison avec d'autres investissements"
                            desc="Même budget dans la même zone — rendements benchmark du marché tunisien"
                          />
                          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                            <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
                              <thead>
                                <tr className="border-b border-border/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  <th className="py-2 pr-3 font-medium">Type</th>
                                  <th className="py-2 pr-3 font-medium">Revenu annuel</th>
                                  <th className="py-2 pr-3 font-medium">Rentabilité nette</th>
                                  <th className="py-2 pr-3 font-medium">ROI 10 ans</th>
                                  <th className="py-2 pr-3 font-medium">Appréciation</th>
                                  <th className="py-2 pr-3 font-medium">Risque</th>
                                  <th className="py-2 font-medium text-right">Score</th>
                                </tr>
                              </thead>
                              <tbody>
                                {results.comparison.map((c) => (
                                  <tr key={c.type} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="py-2.5 pr-3 font-medium">{c.label}</td>
                                    <td className="py-2.5 pr-3 tabular-nums">{fmtTND(c.annualIncome)}</td>
                                    <td className="py-2.5 pr-3 tabular-nums">
                                      <span className={c.netYieldPct >= 6 ? "text-emerald-600 font-semibold" : ""}>{fmtPct(c.netYieldPct)}</span>
                                    </td>
                                    <td className="py-2.5 pr-3 tabular-nums">{fmtPct(c.roi10yPct)}</td>
                                    <td className="py-2.5 pr-3 tabular-nums">{fmtPct(c.appreciationPct)}</td>
                                    <td className="py-2.5 pr-3">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[9px]",
                                          c.riskLevel === "Faible" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" :
                                          c.riskLevel === "Moyen" ? "border-blue-500/30 bg-blue-500/10 text-blue-600" :
                                          "border-amber-500/30 bg-amber-500/10 text-amber-600",
                                        )}
                                      >
                                        {c.riskLevel}
                                      </Badge>
                                    </td>
                                    <td className="py-2.5 text-right">
                                      <span className="font-bold tabular-nums">{c.score}</span>
                                      <span className="text-muted-foreground/50 text-[10px]">/100</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
                        <CardHeader className="p-4 pb-0">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Score comparé des types de biens
                          </CardTitle>
                          <CardDescription className="text-[11px]">Note IA sur 100 par type d'investissement</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                                <Tooltip
                                  formatter={(value: any, name: any) => [`${value}/100`, name]}
                                  contentStyle={{ borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", fontSize: 11, background: "rgba(255,255,255,0.96)" }}
                                  cursor={{ fill: "rgba(99,102,241,0.06)" }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="Score" radius={[4, 4, 0, 0]} maxBarSize={42}>
                                  {comparisonChartData.map((d, i) => (
                                    <Cell key={i} fill={d.Score >= 70 ? "#10b981" : d.Score >= 55 ? "#6366f1" : "#f59e0b"} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* ── ZONES ── */}
                  {activeTab === "zones" && (
                    <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <SectionHeading
                          icon={MapPin}
                          title="Meilleures zones d'investissement en Tunisie"
                          desc="Classement par indice de demande et de risque — les 24 gouvernorats"
                        />
                        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                          <table className="w-full min-w-[680px] text-left text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-border/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">#</th>
                                <th className="py-2 pr-3 font-medium">Zone</th>
                                <th className="py-2 pr-3 font-medium">Prix/m²</th>
                                <th className="py-2 pr-3 font-medium">Loyer/m²/mois</th>
                                <th className="py-2 pr-3 font-medium">Demande</th>
                                <th className="py-2 pr-3 font-medium">Appréciation</th>
                                <th className="py-2 font-medium text-right">Risque</th>
                              </tr>
                            </thead>
                            <tbody>
                              {zones.map((z: any, i: number) => (
                                <tr
                                  key={z.region}
                                  className={cn(
                                    "border-b border-border/20 last:border-0 transition-colors",
                                    z.region === results.zone.region ? "bg-primary/5" : "hover:bg-muted/20",
                                  )}
                                >
                                  <td className="py-2 pr-3">
                                    <span className={cn(
                                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                      i === 0 ? "bg-amber-500/20 text-amber-600" : i < 5 ? "bg-blue-500/15 text-blue-600" : "bg-muted text-muted-foreground",
                                    )}>
                                      {i + 1}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-3 font-medium">
                                    {z.name}
                                    {z.region === results.zone.region && (
                                      <Badge className="ml-1.5 text-[8px] border-indigo-500/30 bg-indigo-500/10 text-indigo-600">Votre zone</Badge>
                                    )}
                                  </td>
                                  <td className="py-2 pr-3 tabular-nums">{fmtNum(z.pricePerM2)} TND</td>
                                  <td className="py-2 pr-3 tabular-nums">{z.rentPerM2} TND</td>
                                  <td className="py-2 pr-3">
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-1.5 w-14 rounded-full bg-muted/50 overflow-hidden">
                                        <div
                                          className={cn("h-full rounded-full", z.demandIndex >= 80 ? "bg-emerald-500" : z.demandIndex >= 60 ? "bg-blue-500" : "bg-amber-500")}
                                          style={{ width: `${z.demandIndex}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] text-muted-foreground tabular-nums">{z.demandIndex}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 pr-3 tabular-nums">{fmtPct(z.appreciationPct)}</td>
                                  <td className={cn("py-2 text-right font-semibold tabular-nums", z.riskScore >= 40 ? "text-amber-600" : z.riskScore >= 30 ? "text-muted-foreground" : "text-emerald-600")}>
                                    {z.riskScore}/100
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ── ASSISTANT IA ── */}
                  {activeTab === "assistant" && (
                    <Card className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="p-4 pb-3 border-b border-border/20">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                            <Bot className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">Assistant IA Investisseur</CardTitle>
                            <CardDescription className="text-[11px]">
                              {active ? "Contexte : analyse en cours chargée" : "Conseil en investissement immobilier Tunisie"}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="h-80 overflow-y-auto p-4 space-y-3 bg-muted/10">
                          {chatMsgs.map((m, i) => (
                            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap",
                                  m.role === "user"
                                    ? "bg-indigo-600 text-white rounded-br-sm"
                                    : "bg-background border border-border/30 rounded-bl-sm shadow-sm",
                                )}
                              >
                                {m.content}
                              </div>
                            </div>
                          ))}
                          {chatBusy && (
                            <div className="flex justify-start">
                              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-background border border-border/30 px-4 py-3">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                        <div className="border-t border-border/20 p-3 space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_QUESTIONS.map((q) => (
                              <button
                                key={q}
                                onClick={() => sendChat(q)}
                                disabled={chatBusy}
                                className="rounded-full border border-border/30 bg-muted/20 px-2.5 py-1 text-[10px] text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-50"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && sendChat()}
                              placeholder="Posez votre question… (ex : quel bien offre le meilleur rendement ?)"
                              className="h-10 text-sm"
                            />
                            <Button
                              size="icon"
                              className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => sendChat()}
                              disabled={chatBusy || !chatInput.trim()}
                            >
                              {chatBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
