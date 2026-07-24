import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  FileText,
  HardHat,
  Heart,
  Lightbulb,
  Loader2,
  MapPin,
  Ruler,
  Shield,
  Star,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  BarChart3,
  ChevronRight,
  Home,
  FileSpreadsheet,
  Globe,
  PiggyBank,
  Sparkles,
  Wallet,
  Target,
  Gauge,
  Hourglass,
  Sandwich,
  Wrench,
  Zap,
  Layers,
  Paintbrush,
  Plug,
  TruckIcon,
  FileCheck,
} from "lucide-react";

// Tunisian region labels
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

// ============================================================================
// BIM Macro-category Colors
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

const BIM_LABELS: Record<string, string> = {
  gros_oeuvre: "Gros œuvre",
  second_oeuvre: "Second œuvre",
  equipements: "Équipements",
  main_oeuvre: "Main-d'œuvre",
  transport: "Transport",
  etudes_imprevus: "Études, permis & imprévus",
};

// ============================================================================
// Helper
// ============================================================================

function formatTND(amount: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// Project Detail Page
// ============================================================================

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useQuery(api.projects.getProject, { projectId: id as any });
  const toggleFavorite = useMutation(api.projects.toggleFavorite);
  const startAnalysis = useMutation(api.projects.startAnalysis);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);

  const [analyzing, setAnalyzing] = useState(false);

  if (!project) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 shrink-0 h-8 sm:h-9" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate max-w-[120px] xs:max-w-[200px] sm:max-w-md">{project.name}</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[120px] xs:max-w-[200px] sm:max-w-md">
                {categoryLabels[project.category] || project.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => toggleFavorite({ projectId: project._id })}
            >
              <Heart className={`h-4 w-4 ${project.isFavorite ? 'fill-red-400 text-red-400' : ''}`} />
            </Button>
            {isCompleted && (
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" title="Exporter PDF">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 h-8 sm:h-9">
                  <Download className="h-4 w-4" />
                  Exporter
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Status Banner */}
        {!isCompleted && !isAnalyzing && (
          <Card className="border border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600">
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Projet en attente d'analyse</p>
                  <p className="text-xs text-muted-foreground">Lancez l'analyse BIM pour obtenir une estimation professionnelle</p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1.5 w-full sm:w-auto mt-2 sm:mt-0"
                disabled={analyzing}
                onClick={async () => {
                  setAnalyzing(true);
                  await startAnalysis({ projectId: project._id });
                  await simulateAnalysis({ projectId: project._id });
                  setAnalyzing(false);
                }}
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                {analyzing ? "Analyse..." : "Lancer l'analyse BIM"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isAnalyzing && (
          <Card className="border border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <div>
                <p className="text-sm font-medium">Analyse BIM en cours...</p>
                <p className="text-xs text-muted-foreground">Calcul du devis estimatif selon les prix Tunisie 2026</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==================================================================== */}
        {/* COMPLETED REPORT                                                      */}
        {/* ==================================================================== */}
        {isCompleted && costEstimate && analysis && (
          <>
            {/* --- COST OVERVIEW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main cost hero */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2"
              >
                <Card className="border border-border/50 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                          <Target className="h-3.5 w-3.5" />
                          <span>Devis estimatif • Prix Tunisie 2026</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span className={`font-medium ${confidenceColor}`}>
                            {confidencePct}% de confiance
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium mb-0.5">Coût total estimé (TTC)</p>
                        <p className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text break-words leading-tight">
                          {formatTND(costEstimate.totalCost)}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
                          {costEstimate.costPerSquareMeter && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Ruler className="h-4 w-4" />
                              <span>{formatTND(costEstimate.costPerSquareMeter)} /m²</span>
                            </div>
                          )}
                          {analysis.estimatedDuration && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Hourglass className="h-4 w-4" />
                              <span>{analysis.estimatedDuration}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-sm">
                            <Shield className="h-4 w-4 text-amber-500" />
                            <span className="text-muted-foreground">
                              +{formatTND(costEstimate.contingencyBuffer)} imprévus ({costEstimate.contingencyPercentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 shrink-0">
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Exporter PDF">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Exporter Excel">
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Télécharger">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3"
              >
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Surface</p>
                      <p className="text-xs sm:text-sm font-semibold">{project.surface || '-'} m²</p>
                    </div>
                  </CardContent>
                </Card>
                {analysis.laborEstimate && (
                  <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Main-d'œuvre</p>
                        <p className="text-xs sm:text-sm font-semibold">{analysis.laborEstimate.totalWorkers || '-'} ouv.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Durée</p>
                      <p className="text-xs sm:text-sm font-semibold">{analysis.estimatedDuration || '-'}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* --- 3 BUDGET SCENARIOS --- */}
            {budgetScenarios && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <PiggyBank className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Scénarios budgétaires</h2>
                  <p className="text-xs text-muted-foreground">selon le niveau de finition</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { key: "economique" as const, icon: Wallet, color: "emerald", desc: "Matériaux standards, finitions simples" },
                    { key: "standard" as const, icon: Gauge, color: "blue", desc: "Qualité moyenne, finitions normales" },
                    { key: "premium" as const, icon: Sparkles, color: "violet", desc: "Haut de gamme, finitions luxe" },
                  ].map(({ key, icon: Icon, color, desc }) => {
                    const s = budgetScenarios[key];
                    if (!s) return null;
                    const isSelected = key === "standard";
                    const colorMap: Record<string, string> = {
                      emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 text-emerald-600",
                      blue: "from-blue-500/10 to-blue-500/5 border-blue-500/30 text-blue-600",
                      violet: "from-violet-500/10 to-violet-500/5 border-violet-500/30 text-violet-600",
                    };
                    return (
                      <Card key={key} className={`border bg-gradient-to-br ${colorMap[color]} ${isSelected ? 'ring-2 ring-primary/30' : ''}`}>
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[color].split(' ')[2]} bg-white/50 dark:bg-white/10`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-semibold text-sm">{s.label}</span>
                            {isSelected && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto">
                                Recommandé
                              </Badge>
                            )}
                          </div>
                          <p className="text-xl sm:text-2xl font-bold mb-1">{formatTND(s.totalCost)}</p>
                          <p className="text-xs text-muted-foreground mb-1">{formatTND(s.costPerM2)} /m²</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground opacity-70">{desc}</p>
                          <div className="mt-2 h-1.5 rounded-full bg-background/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-current opacity-60"
                              style={{ width: `${key === 'economique' ? 60 : key === 'standard' ? 80 : 100}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* --- MACRO BUDGET BREAKDOWN (6 categories) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              {/* Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm h-full">
                  <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                    <CardTitle className="text-sm sm:text-base">Répartition du budget</CardTitle>
                    <CardDescription>Par macro-catégorie de travaux</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="h-[220px] sm:h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={costEstimate.breakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="estimatedCost"
                            nameKey="label"
                          >
                            {costEstimate.breakdown.map((entry: any) => (
                              <Cell key={entry.label} fill={BIM_COLORS[entry.category] || "#6b7280"} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                  <div className="glass-strong rounded-lg p-2 text-xs shadow-lg">
                                    <p className="font-medium mb-1">{d.label}</p>
                                    <p className="text-muted-foreground">{formatTND(d.estimatedCost)}</p>
                                    <p className="text-muted-foreground">{d.percentage}% du total</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                      {costEstimate.breakdown.map((item: any) => {
                        const Icon = BIM_ICONS[item.category] || Layers;
                        return (
                          <div key={item.label} className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: BIM_COLORS[item.category] || "#6b7280" }}
                            />
                            <Icon className="h-3 w-3 text-muted-foreground shrink-0 hidden sm:block" />
                            <span className="truncate">{item.label}</span>
                            <span className="text-muted-foreground ml-auto font-medium">{item.percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cost detail list */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-3"
              >
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm h-full">
                  <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                    <CardTitle className="text-sm sm:text-base">Détail par catégorie</CardTitle>
                    <CardDescription>Estimation des coûts par poste de travaux</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      {costEstimate.breakdown
                        .sort((a: any, b: any) => b.estimatedCost - a.estimatedCost)
                        .map((item: any) => {
                          const Icon = BIM_ICONS[item.category] || Layers;
                          const color = BIM_COLORS[item.category] || "#6b7280";
                          return (
                            <div key={item.label}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md shrink-0" style={{ backgroundColor: color + "15" }}>
                                    <Icon className="h-3 w-3" style={{ color }} />
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <span className="text-xs sm:text-sm font-semibold">{formatTND(item.estimatedCost)}</span>
                                  <span className="text-[10px] sm:text-xs text-muted-foreground ml-1.5">({item.percentage}%)</span>
                                </div>
                              </div>
                              <div className="relative h-1.5 sm:h-2 rounded-full bg-muted/50 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.percentage}%` }}
                                  transition={{ duration: 0.8, delay: 0.3 + costEstimate.breakdown.indexOf(item) * 0.1 }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Contingency */}
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-amber-500" />
                          <span className="text-xs sm:text-sm font-medium">Marge pour imprévus</span>
                        </div>
                        <span className="text-xs sm:text-sm font-semibold">{formatTND(costEstimate.contingencyBuffer)}</span>
                      </div>
                      <Progress value={costEstimate.contingencyPercentage} className="h-1.5 sm:h-2 bg-amber-500/10" />
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                        {costEstimate.contingencyPercentage}% réservé aux aléas de chantier et variations de prix
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* --- ANOMALIES & CONFIDENCE --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Confidence Card */}
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm sm:text-base">Indice de confiance</CardTitle>
                  </div>
                  <CardDescription>Fiabilité de l'estimation</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full ${confidenceBg} ${confidenceColor} text-xl sm:text-2xl font-bold`}>
                      {confidencePct}%
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {confidence >= 0.8 ? "Estimation fiable" : confidence >= 0.6 ? "Estimation moyenne" : "Estimation indicative"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Basée sur {costEstimate.breakdown.reduce((s: number, b: any) => s + (b.items?.length || 0), 0)} matériaux
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${confidencePct}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-full rounded-full ${confidence >= 0.8 ? 'bg-emerald-500' : confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                    />
                  </div>
                  <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                    {project.surface && <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Surface connue : {project.surface}m²</li>}
                    {project.region && <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Région spécifiée : {REGION_LABELS[project.region] || project.region}</li>}
                    {!project.region && <li className="flex items-center gap-1.5"><TriangleAlert className="h-3 w-3 text-amber-500 shrink-0" />Région non spécifiée (prix moyens)</li>}
                    {project.floors && <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />{project.floors} étage(s)</li>}
                  </ul>
                </CardContent>
              </Card>

              {/* Anomalies */}
              {analysis.anomalies && analysis.anomalies.length > 0 && (
                <Card className="lg:col-span-2 border border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-sm sm:text-base">Anomalies détectées</CardTitle>
                    </div>
                    <CardDescription>Points d'attention pour ce projet</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {analysis.anomalies.map((anomaly: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-border/30">
                          <TriangleAlert className={`h-4 w-4 shrink-0 mt-0.5 ${anomaly.severity === 'élevée' ? 'text-red-500' : anomaly.severity === 'moyenne' ? 'text-amber-500' : 'text-yellow-500'}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium">{anomaly.type}</p>
                              <Badge variant="outline" className={`text-[9px] h-4 px-1 ${
                                anomaly.severity === 'élevée' ? 'border-red-500/30 text-red-500' :
                                anomaly.severity === 'moyenne' ? 'border-amber-500/30 text-amber-500' :
                                'border-yellow-500/30 text-yellow-500'
                              }`}>
                                {anomaly.severity}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{anomaly.description}</p>
                            {anomaly.recommendation && (
                              <p className="text-[10px] text-muted-foreground/70 mt-1 italic">→ {anomaly.recommendation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* --- MATERIALS TABLE --- */}
            {costEstimate.breakdown.some((b: any) => b.items && b.items.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary shrink-0" />
                      <CardTitle className="text-sm sm:text-base">Quantitatif détaillé</CardTitle>
                      <CardDescription className="hidden sm:block">Matériaux, fournitures et main-d'œuvre</CardDescription>
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {costEstimate.breakdown.reduce((s: number, b: any) => s + (b.items?.length || 0), 0)} postes
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 sm:p-6 sm:pt-0">
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <table className="w-full text-[11px] sm:text-sm">
                        <thead>
                          <tr className="border-b border-border/20 bg-muted/20">
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Matériau / Prestation</th>
                            <th className="text-right py-2.5 px-2 font-medium text-muted-foreground">Qté</th>
                            <th className="text-right py-2.5 px-2 font-medium text-muted-foreground hidden sm:table-cell">Unité</th>
                            <th className="text-right py-2.5 px-2 font-medium text-muted-foreground hidden sm:table-cell">P.U.</th>
                            <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costEstimate.breakdown
                            .filter((b: any) => b.items && b.items.length > 0)
                            .map((category: any) => (
                              <>
                                {/* Category header row */}
                                <tr className="border-b border-border/10 bg-muted/10">
                                  <td colSpan={5} className="py-1.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BIM_COLORS[category.category] || "#6b7280" }} />
                                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {category.label}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground ml-auto">
                                        {category.items.length} postes &mdash; {formatTND(category.estimatedCost)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {/* Items */}
                                {category.items.map((item: any, i: number) => (
                                  <tr key={i} className="border-b border-border/5 hover:bg-muted/20 transition-colors">
                                    <td className="py-1.5 sm:py-2 px-3 font-medium truncate max-w-[200px] sm:max-w-none">{item.name}</td>
                                    <td className="text-right py-1.5 sm:py-2 px-2 font-mono text-muted-foreground">{item.quantity}</td>
                                    <td className="text-right py-1.5 sm:py-2 px-2 text-muted-foreground hidden sm:table-cell">{item.unit}</td>
                                    <td className="text-right py-1.5 sm:py-2 px-2 text-muted-foreground hidden sm:table-cell font-mono">{formatTND(item.unitPrice)}</td>
                                    <td className="text-right py-1.5 sm:py-2 px-3 font-semibold font-mono">{formatTND(item.totalPrice)}</td>
                                  </tr>
                                ))}
                              </>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* --- RECOMMENDATIONS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Optimization Tips */}
              {project.optimizationTips && project.optimizationTips.length > 0 && (
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-sm sm:text-base">Optimisation des coûts</CardTitle>
                    </div>
                    <CardDescription>Suggestions pour réduire le budget</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <ul className="space-y-2 sm:space-y-3">
                      {project.optimizationTips.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Technical Recommendations */}
              {project.technicalRecommendations && project.technicalRecommendations.length > 0 && (
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-sm sm:text-base">Recommandations techniques</CardTitle>
                    </div>
                    <CardDescription>Normes et bonnes pratiques</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <ul className="space-y-2 sm:space-y-3">
                      {project.technicalRecommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                          <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* --- PROJECT INFO --- */}
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                <CardTitle className="text-sm sm:text-base">Informations du projet</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-3 sm:pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {project.region ? (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                      <p className="text-[10px] text-muted-foreground mb-1">Région</p>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{REGION_LABELS[project.region] || project.region}</span>
                      </div>
                    </div>
                  ) : null}
                  {project.surface ? (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                      <p className="text-[10px] text-muted-foreground mb-1">Surface</p>
                      <p className="text-xs sm:text-sm font-medium">{project.surface} m²</p>
                    </div>
                  ) : null}
                  {project.floors && (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                      <p className="text-[10px] text-muted-foreground mb-1">Étages</p>
                      <p className="text-xs sm:text-sm font-medium">{project.floors}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                    <p className="text-[10px] text-muted-foreground mb-1">Créé le</p>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{new Date(project.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                    <p className="text-[10px] text-muted-foreground mb-1">Catégorie</p>
                    <p className="text-xs sm:text-sm font-medium truncate">{analysis?.category || categoryLabels[project.category] || project.category}</p>
                  </div>
                  {project.description && (
                    <div className="col-span-full p-3 rounded-lg bg-muted/20 border border-border/20">
                      <p className="text-[10px] text-muted-foreground mb-1">Description</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{project.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
