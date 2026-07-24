import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowLeft, ArrowUpRight, Building2, Calendar, CheckCircle2,
  Clock, Cpu, Download, FileText, HardHat, Heart, Lightbulb,
  Loader2, MapPin, Ruler, Shield, Star, TrendingUp, TriangleAlert,
  Truck, Users, BarChart3, ChevronRight, Home, FileSpreadsheet,
  Globe, PiggyBank, Sparkles, Wallet, Target, Gauge, Hourglass,
  Layers, Paintbrush, Plug, TruckIcon, FileCheck, ChevronDown,
  ChevronUp, Eye, EyeOff, Maximize2, Minimize2, RotateCcw, Info,
  AlertCircle, CheckCheck, Ban, ZapOff, DollarSign, Percent,
} from "lucide-react";

const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
  jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana", kairouan: "Kairouan",
  kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid", sousse: "Sousse",
  monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès",
  medenine: "Médenine", tataouine: "Tataouine", gafsa: "Gafsa", tozeur: "Tozeur",
  kebili: "Kébili",
};

import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// CONSTANTS
// ============================================================================

const BIM_COLORS: Record<string, string> = {
  gros_oeuvre: "#3b82f6",
  second_oeuvre: "#f59e0b",
  equipements: "#8b5cf6",
  main_oeuvre: "#22c55e",
  transport: "#a3e635",
  etudes_imprevus: "#ef4444",
};

const BIM_ICONS: Record<string, any> = {
  gros_oeuvre: Building2,
  second_oeuvre: Paintbrush,
  equipements: Plug,
  main_oeuvre: Users,
  transport: TruckIcon,
  etudes_imprevus: FileCheck,
};

const SCENARIO_STYLES = {
  economique: {
    gradient: "from-emerald-500/10 via-emerald-500/5 to-background",
    border: "border-emerald-500/25",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    badge: "border-emerald-500/25 text-emerald-600",
  },
  standard: {
    gradient: "from-blue-500/10 via-blue-500/5 to-background",
    border: "border-blue-500/25",
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    badge: "border-blue-500/25 text-blue-600",
  },
  premium: {
    gradient: "from-violet-500/10 via-violet-500/5 to-background",
    border: "border-violet-500/25",
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
    badge: "border-violet-500/25 text-violet-600",
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function formatTND(amount: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency", currency: "TND", maximumFractionDigits: 0,
  }).format(amount);
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ============================================================================
// COMPONENTS
// ============================================================================

function SummaryBadge({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-background/60 border border-border/30 shadow-sm backdrop-blur-sm">
      <div className={cn("flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg shrink-0", color)}>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-muted-foreground/80 leading-tight">{label}</p>
        <p className="text-xs sm:text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, badge, children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="text-left min-w-0">
            <span className="text-sm sm:text-base font-semibold">{title}</span>
          </div>
          {badge && <Badge variant="secondary" className="text-[10px] ml-1 shrink-0">{badge}</Badge>}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScenarioCard({ scenario, style, isRecommended }: any) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "relative rounded-xl border-2 p-4 sm:p-5 bg-gradient-to-br cursor-default transition-shadow",
        style.gradient, style.border,
        isRecommended && "ring-2 ring-primary/40 shadow-lg"
      )}
    >
      {isRecommended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-2 shadow-sm">
            Recommandé
          </Badge>
        </div>
      )}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", style.icon)}>
          <scenario.icon className="h-4 w-4" />
        </div>
        <div>
          <span className="font-bold text-sm">{scenario.label}</span>
          <p className="text-[10px] text-muted-foreground/70">{scenario.desc}</p>
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-0.5">
        {formatTND(scenario.totalCost)}
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        {formatTND(scenario.costPerM2)} /m²
      </p>
      <div className="h-2 rounded-full bg-background/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${scenario.level}%` }}
          className={cn("h-full rounded-full", style.dot.replace("bg-", "bg-").replace("500", "400"))}
          style={{ backgroundColor: isRecommended ? "var(--primary)" : undefined }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground/60">Niveau</span>
        <span className="text-[10px] font-medium">{scenario.multiplier}x</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useQuery(api.projects.getProject, { projectId: id as any });
  const toggleFavorite = useMutation(api.projects.toggleFavorite);
  const startAnalysis = useMutation(api.projects.startAnalysis);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);

  const [analyzing, setAnalyzing] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (!project) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement du projet...</p>
        </div>
      </main>
    );
  }

  const costEstimate = project.costEstimate;
  const analysis = project.aiAnalysis;
  const isCompleted = project.status === "completed";
  const isAnalyzing = project.status === "analyzing" || analyzing;

  const categoryLabels: Record<string, string> = {
    maison: "Maison", villa: "Villa", piscine: "Piscine", jardin: "Jardin",
    garage: "Garage", immeuble_residentiel: "Immeuble résidentiel",
    bureau: "Bureau", renovation_interieure: "Rénovation intérieure",
    terrasse: "Terrasse", toiture: "Toiture", cloture: "Clôture",
  };

  const confidence = analysis?.confidence || 0;
  const confidencePct = Math.round(confidence * 100);
  const confidenceColor = confidence >= 0.8 ? "text-emerald-500" : confidence >= 0.6 ? "text-amber-500" : "text-red-500";
  const confidenceBg = confidence >= 0.8 ? "bg-emerald-500/10" : confidence >= 0.6 ? "bg-amber-500/10" : "bg-red-500/10";
  const budgetScenarios = costEstimate?.budgetScenarios;

  const totalItems = costEstimate?.breakdown?.reduce((s: number, b: any) => s + (b.items?.length || 0), 0) || 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pb-8 sm:pb-12">
      {/* ================================================================ */}
      {/* HEADER */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14 lg:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl"
                onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-5 w-px bg-border/50 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate max-w-[140px] xs:max-w-[220px] sm:max-w-md">
                  {project.name}
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {categoryLabels[project.category] || project.category}
                  {project.surface && ` • ${project.surface} m²`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"
                onClick={() => toggleFavorite({ projectId: project._id })}>
                <Heart className={cn("h-4 w-4", project.isFavorite && "fill-red-400 text-red-400")} />
              </Button>
              {isCompleted && (
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl hidden sm:flex" title="PDF">
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl hidden sm:flex" title="Excel">
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" title="Télécharger">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ================================================================ */}
        {/* STATUS BANNER */}
        {/* ================================================================ */}
        {!isCompleted && !isAnalyzing && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-2 border-dashed border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-yellow-500/[0.02] to-background overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
                  <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 ring-1 ring-yellow-500/20">
                      <Cpu className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-semibold">Projet en attente d'analyse</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Lancez l'analyse BIM pour obtenir une estimation professionnelle complète basée sur les prix du marché tunisien 2026.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="default"
                    className="gap-2 w-full sm:w-auto h-10 sm:h-11 px-5 rounded-xl shadow-lg shadow-primary/20"
                    disabled={analyzing}
                    onClick={async () => {
                      setAnalyzing(true);
                      await startAnalysis({ projectId: project._id });
                      await simulateAnalysis({ projectId: project._id });
                      setAnalyzing(false);
                    }}
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Cpu className="h-4 w-4" />
                    )}
                    {analyzing ? "Analyse en cours..." : "Lancer l'analyse BIM"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isAnalyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
              <CardContent className="p-5 sm:p-6 flex items-center gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-semibold">Analyse BIM en cours...</p>
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Calcul du devis estimatif selon les prix du marché tunisien 2026
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Estimation en cours
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* REPORT */}
        {/* ================================================================ */}
        {isCompleted && costEstimate && analysis && (
          <>
            {/* --- HERO: COST OVERVIEW --- */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/[0.07] via-primary/[0.02] to-background p-5 sm:p-7 lg:p-9 shadow-lg"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-8">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/5 text-primary font-medium">
                      <Target className="h-3 w-3" />
                      Devis estimatif
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>Prix Tunisie 2026</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className={cn("inline-flex items-center gap-1 font-medium", confidenceColor)}>
                      <Shield className="h-3 w-3" />
                      {confidencePct}% confiance
                    </span>
                  </div>
                  <h2 className="text-xs sm:text-sm font-medium text-muted-foreground/80 mb-1">
                    Coût total estimé (TTC)
                  </h2>
                  <p className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black gradient-text break-words leading-[1.1] tracking-tight">
                    {formatTND(costEstimate.totalCost)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 sm:mt-4">
                    {costEstimate.costPerSquareMeter && (
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-muted/50 border border-border/30">
                        <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{formatTND(costEstimate.costPerSquareMeter)}</span>
                        <span className="text-muted-foreground">/m²</span>
                      </span>
                    )}
                    {analysis.estimatedDuration && (
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-muted/50 border border-border/30">
                        <Hourglass className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{analysis.estimatedDuration}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                      <Percent className="h-3.5 w-3.5" />
                      <span>+{formatTND(costEstimate.contingencyBuffer)} ({costEstimate.contingencyPercentage}%)</span>
                    </span>
                  </div>
                </div>
                <div className="flex lg:flex-col gap-2 shrink-0">
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" title="Exporter PDF">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" title="Exporter Excel">
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" title="Télécharger le rapport">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* --- SUMMARY BADGES ROW --- */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
            >
              <SummaryBadge icon={Building2} label="Surface" value={`${project.surface || '—'} m²`}
                color="bg-blue-500/10 text-blue-600" />
              {analysis.laborEstimate && (
                <SummaryBadge icon={Users} label="Main-d'œuvre" value={`${analysis.laborEstimate.totalWorkers || '—'} ouvriers`}
                  color="bg-emerald-500/10 text-emerald-600" />
              )}
              <SummaryBadge icon={Clock} label="Durée estimée" value={analysis.estimatedDuration || '—'}
                color="bg-amber-500/10 text-amber-600" />
              <SummaryBadge icon={Layers} label="Postes détaillés" value={`${totalItems} matériaux`}
                color="bg-violet-500/10 text-violet-600" />
            </motion.div>

            {/* --- BUDGET SCENARIOS --- */}
            {budgetScenarios && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PiggyBank className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm sm:text-lg font-bold">Scénarios budgétaires</h2>
                  <span className="text-[10px] sm:text-xs text-muted-foreground/60">selon le niveau de finition</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { key: "economique" as const, icon: Wallet, desc: "Matériaux standards, finitions simples", level: 60, multiplier: "0.8×" },
                    { key: "standard" as const, icon: Gauge, desc: "Qualité normale, finitions courantes", level: 80, multiplier: "1.0×" },
                    { key: "premium" as const, icon: Sparkles, desc: "Haut de gamme, finitions luxe", level: 100, multiplier: "1.3×" },
                  ].map(({ key, icon, desc, level, multiplier }) => {
                    const s = budgetScenarios[key];
                    if (!s) return null;
                    return (
                      <ScenarioCard
                        key={key}
                        scenario={{ ...s, icon, desc, level, multiplier }}
                        style={SCENARIO_STYLES[key]}
                        isRecommended={key === "standard"}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* --- PIE CHART + COST BREAKDOWN --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              {/* Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="lg:col-span-2"
              >
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 sm:p-6 shadow-sm h-full">
                  <h3 className="text-sm font-semibold mb-1">Répartition du budget</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">Par macro-catégorie de travaux</p>
                  <div className="h-[200px] sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costEstimate.breakdown}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={85}
                          paddingAngle={3}
                          dataKey="estimatedCost" nameKey="label"
                        >
                          {costEstimate.breakdown.map((entry: any) => (
                            <Cell key={entry.label} fill={BIM_COLORS[entry.category] || "#6b7280"} />
                          ))}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-background/95 backdrop-blur-md border border-border/40 rounded-xl p-2.5 text-xs shadow-xl">
                                <p className="font-semibold mb-1">{d.label}</p>
                                <p className="text-muted-foreground">{formatTND(d.estimatedCost)}</p>
                                <p className="text-muted-foreground/70">{d.percentage}% du budget</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-3 border-t border-border/20">
                    {costEstimate.breakdown.map((item: any) => {
                      const Icon = BIM_ICONS[item.category] || Layers;
                      return (
                        <div key={item.label}
                          className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors cursor-default">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: BIM_COLORS[item.category] || "#6b7280" }} />
                          <Icon className="h-3 w-3 text-muted-foreground/60 shrink-0 hidden sm:block" />
                          <span className="text-[10px] sm:text-xs truncate">{item.label}</span>
                          <span className="text-[10px] sm:text-xs font-semibold ml-auto">{item.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Detail List */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-3"
              >
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 sm:p-6 shadow-sm h-full">
                  <h3 className="text-sm font-semibold mb-1">Détail par catégorie</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-4">Coûts estimés par poste de travaux</p>
                  <div className="space-y-3 sm:space-y-4">
                    {costEstimate.breakdown
                      .sort((a: any, b: any) => b.estimatedCost - a.estimatedCost)
                      .map((item: any, idx: number) => {
                        const Icon = BIM_ICONS[item.category] || Layers;
                        const color = BIM_COLORS[item.category] || "#6b7280";
                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg shrink-0"
                                  style={{ backgroundColor: color + "15" }}>
                                  <Icon className="h-3 w-3" style={{ color }} />
                                </div>
                                <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs sm:text-sm font-bold">{formatTND(item.estimatedCost)}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground ml-1">({item.percentage}%)</span>
                              </div>
                            </div>
                            <div className="h-1.5 sm:h-2 rounded-full bg-muted/40 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.percentage}%` }}
                                transition={{ duration: 0.6, delay: 0.2 + idx * 0.08 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Contingency */}
                  <div className="mt-4 sm:mt-5 pt-4 border-t border-border/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500" />
                        <span className="text-xs sm:text-sm font-medium">Marge pour imprévus</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold">{formatTND(costEstimate.contingencyBuffer)}</span>
                    </div>
                    <Progress value={costEstimate.contingencyPercentage} className="h-1.5 sm:h-2 bg-amber-500/10" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-1.5">
                      {costEstimate.contingencyPercentage}% du budget réservé aux aléas de chantier et variations de prix
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* --- CONFIDENCE + ANOMALIES --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Confidence */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
              >
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 sm:p-6 shadow-sm h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Gauge className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Indice de confiance</h3>
                      <p className="text-[10px] text-muted-foreground">Fiabilité de l'estimation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-muted/20 border border-border/20">
                    <div className={cn("flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full text-xl sm:text-2xl font-black", confidenceBg, confidenceColor)}>
                      {confidencePct}%
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold">
                        {confidence >= 0.8 ? "Estimation fiable" : confidence >= 0.6 ? "Estimation moyenne" : "Estimation indicative"}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground/70">
                        Basée sur {totalItems} postes de matériaux et main-d'œuvre
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${confidencePct}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={cn("h-full rounded-full", confidence >= 0.8 ? "bg-emerald-500" : confidence >= 0.6 ? "bg-amber-500" : "bg-red-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { ok: !!project.surface, label: `Surface connue : ${project.surface || '?'} m²` },
                      { ok: !!project.region, label: project.region ? `Région : ${REGION_LABELS[project.region] || project.region}` : "Région non spécifiée (prix moyen)" },
                      { ok: true, label: `${totalItems} postes détaillés générés` },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground/80">
                        {item.ok
                          ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          : <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                        }
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Anomalies */}
              {analysis.anomalies && analysis.anomalies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="lg:col-span-2"
                >
                  <div className="rounded-xl border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-background p-4 sm:p-6 shadow-sm h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                        <TriangleAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">Anomalies détectées</h3>
                        <p className="text-[10px] text-muted-foreground">Points d'attention pour ce projet</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {analysis.anomalies.map((anomaly: any, i: number) => {
                        const severityColor = anomaly.severity === 'élevée' ? 'border-red-500/20 bg-red-500/[0.03]' :
                          anomaly.severity === 'moyenne' ? 'border-amber-500/20 bg-amber-500/[0.03]' :
                          'border-yellow-500/20 bg-yellow-500/[0.03]';
                        const severityIcon = anomaly.severity === 'élevée' ? 'text-red-500' :
                          anomaly.severity === 'moyenne' ? 'text-amber-500' : 'text-yellow-500';
                        return (
                          <div key={i} className={cn("flex items-start gap-2.5 p-3 rounded-xl border", severityColor)}>
                            <TriangleAlert className={cn("h-4 w-4 shrink-0 mt-0.5", severityIcon)} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-medium">{anomaly.type}</p>
                                <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 border", severityIcon.replace('text-', 'border-').replace('500', '500/30') + ' ' + severityIcon)}>
                                  {anomaly.severity}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground/80 mt-0.5">{anomaly.description}</p>
                              {anomaly.recommendation && (
                                <p className="text-[10px] text-muted-foreground/60 mt-1 italic flex items-start gap-1">
                                  <ArrowUpRight className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                                  {anomaly.recommendation}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* --- MATERIALS TABLE (Collapsible) --- */}
            {costEstimate.breakdown.some((b: any) => b.items && b.items.length > 0) && (
              <CollapsibleSection
                title="Quantitatif détaillé"
                icon={Layers}
                badge={`${totalItems} postes`}
                defaultOpen={true}
              >
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="w-full text-[11px] sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground/70">Matériau / Prestation</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground/70">Qté</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground/70 hidden sm:table-cell">Unité</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground/70 hidden sm:table-cell">P.U.</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground/70">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costEstimate.breakdown
                        .filter((b: any) => b.items && b.items.length > 0)
                        .map((category: any) => (
                          <Fragment key={category.label}>
                            {/* Category header */}
                            <tr className="border-b border-border/20 bg-muted/20">
                              <td colSpan={5} className="py-2 px-3">
                                <button
                                  onClick={() => setExpandedCategory(expandedCategory === category.label ? null : category.label)}
                                  className="flex items-center gap-2 w-full text-left"
                                >
                                  <div className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: BIM_COLORS[category.category] || "#6b7280" }} />
                                  <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {category.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/50 ml-auto">
                                    {category.items.length} postes — {formatTND(category.estimatedCost)}
                                  </span>
                                  {expandedCategory === category.label
                                    ? <ChevronUp className="h-3 w-3 text-muted-foreground/50" />
                                    : <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
                                  }
                                </button>
                              </td>
                            </tr>
                            {/* Items */}
                            {expandedCategory === category.label && category.items.map((item: any, i: number) => (
                              <motion.tr
                                key={i}
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="border-b border-border/5 hover:bg-muted/20 transition-colors"
                              >
                                <td className="py-1.5 sm:py-2 px-3 font-medium truncate max-w-[180px] sm:max-w-none">{item.name}</td>
                                <td className="text-right py-1.5 sm:py-2 px-2 font-mono text-muted-foreground text-[10px] sm:text-xs">
                                  {item.quantity}
                                </td>
                                <td className="text-right py-1.5 sm:py-2 px-2 text-muted-foreground text-[10px] sm:text-xs hidden sm:table-cell">
                                  {item.unit}
                                </td>
                                <td className="text-right py-1.5 sm:py-2 px-2 text-muted-foreground text-[10px] sm:text-xs hidden sm:table-cell font-mono">
                                  {formatTND(item.unitPrice)}
                                </td>
                                <td className="text-right py-1.5 sm:py-2 px-3 font-semibold font-mono text-[11px] sm:text-sm">
                                  {formatTND(item.totalPrice)}
                                </td>
                              </motion.tr>
                            ))}
                            {/* Show collapsed count */}
                            {expandedCategory !== category.label && (
                              <tr className="border-b border-border/5">
                                <td colSpan={5} className="py-2 px-3">
                                  <button
                                    onClick={() => setExpandedCategory(category.label)}
                                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Afficher les {category.items.length} postes
                                  </button>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            )}

            {/* --- RECOMMENDATIONS --- */}
            {(project.optimizationTips && project.optimizationTips.length > 0) || (project.technicalRecommendations && project.technicalRecommendations.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {project.optimizationTips && project.optimizationTips.length > 0 && (
                  <CollapsibleSection title="Optimisation des coûts" icon={Lightbulb} defaultOpen={true}>
                    <div className="space-y-2 sm:space-y-2.5">
                      {project.optimizationTips.map((tip: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 mt-0.5">
                            <CheckCheck className="h-3 w-3 text-emerald-500" />
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}
                {project.technicalRecommendations && project.technicalRecommendations.length > 0 && (
                  <CollapsibleSection title="Recommandations techniques" icon={Shield} defaultOpen={false}>
                    <div className="space-y-2 sm:space-y-2.5">
                      {project.technicalRecommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-blue-500/[0.03] border border-blue-500/10">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 mt-0.5">
                            <CheckCircle2 className="h-3 w-3 text-blue-500" />
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}
              </div>
            )}

            {/* --- PROJECT INFO --- */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Info className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold">Informations du projet</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { label: "Catégorie", value: analysis?.category || categoryLabels[project.category] || project.category, icon: Building2 },
                    ...(project.region ? [{ label: "Région", value: REGION_LABELS[project.region] || project.region, icon: Globe }] : []),
                    ...(project.surface ? [{ label: "Surface", value: `${project.surface} m²`, icon: Ruler }] : []),
                    ...(project.floors ? [{ label: "Étages", value: String(project.floors), icon: Building2 }] : []),
                    { label: "Créé le", value: new Date(project.createdAt).toLocaleDateString("fr-FR"), icon: Calendar },
                    { label: "Statut", value: project.status === "completed" ? "Terminé" : project.status === "analyzing" ? "Analyse" : "Brouillon", icon: project.status === "completed" ? CheckCircle2 : Clock },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-2.5 p-2.5 rounded-lg bg-muted/20 border border-border/10">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/50 text-muted-foreground/70">
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 leading-tight">{item.label}</p>
                        <p className="text-[11px] sm:text-xs font-medium truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {project.description && (
                  <div className="mt-3 pt-3 border-t border-border/10">
                    <p className="text-[9px] text-muted-foreground/60 mb-1">Description</p>
                    <p className="text-xs sm:text-sm text-muted-foreground/80">{project.description}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </main>
  );
}

// Need Fragment import
import { Fragment } from "react";
