import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

// Tunisian region labels
const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis",
  ariana: "Ariana",
  ben_arous: "Ben Arous",
  manouba: "Manouba",
  nabeul: "Nabeul",
  zaghouan: "Zaghouan",
  bizerte: "Bizerte",
  beja: "Béja",
  jendouba: "Jendouba",
  le_kef: "Le Kef",
  siliana: "Siliana",
  kairouan: "Kairouan",
  kasserine: "Kasserine",
  sidi_bouzid: "Sidi Bouzid",
  sousse: "Sousse",
  monastir: "Monastir",
  mahdia: "Mahdia",
  sfax: "Sfax",
  gabes: "Gabès",
  medenine: "Médenine",
  tataouine: "Tataouine",
  gafsa: "Gafsa",
  tozeur: "Tozeur",
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
// Colors
// ============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  ciment: "#3b82f6",
  sable: "#f59e0b",
  gravier: "#78716c",
  briques: "#ef4444",
  parpaings: "#a855f7",
  beton: "#6366f1",
  acier: "#64748b",
  bois: "#92400e",
  peinture: "#ec4899",
  carrelage: "#14b8a6",
  marbre: "#8b5cf6",
  plomberie: "#06b6d4",
  electricite: "#f97316",
  portes: "#84cc16",
  fenetres: "#0ea5e9",
  toiture: "#d946ef",
  main_oeuvre: "#22c55e",
  location_engins: "#eab308",
  transport: "#a3e635",
  terrassement: "#d97706",
  fondations: "#7c3aed",
  finition: "#06b6d4",
  divers: "#6b7280",
};

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
  const isAnalyzing = project.status === "analyzing";

  const categoryLabels: Record<string, string> = {
    maison: "Maison",
    villa: "Villa",
    piscine: "Piscine",
    jardin: "Jardin",
    garage: "Garage",
    immeuble_residentiel: "Immeuble résidentiel",
    bureau: "Bureau",
    renovation_interieure: "Rénovation intérieure",
    terrasse: "Terrasse",
    toiture: "Toiture",
    cluture: "Clôture",
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
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
                <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden">
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
        {!isCompleted && !isAnalyzing && (              <Card className="border border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600">
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Projet en attente d'analyse</p>
                  <p className="text-xs text-muted-foreground">Lancez l'analyse IA pour obtenir une estimation</p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1.5 w-full sm:w-auto mt-2 sm:mt-0"
                onClick={async () => {
                  await startAnalysis({ projectId: project._id });
                  await simulateAnalysis({ projectId: project._id });
                }}
              >
                <Cpu className="h-4 w-4" />
                Analyser
              </Button>
            </CardContent>
          </Card>
        )}

        {isAnalyzing && (
          <Card className="border border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <div>
                <p className="text-sm font-medium">Analyse en cours...</p>
                <p className="text-xs text-muted-foreground">L'IA analyse votre projet</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {isCompleted && costEstimate && (
          <>
            {/* Cost Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Total Cost Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2"
              >
                <Card className="border border-border/50 bg-gradient-to-br from-primary/5 to-background">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Coût total estimé</p>
                        <p className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text break-words">
                          {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(costEstimate.totalCost)}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          {costEstimate.costPerSquareMeter && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Ruler className="h-4 w-4" />
                              <span>{new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(costEstimate.costPerSquareMeter)} /m²</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            <span>Confiance: {Math.round((analysis?.confidence || 0) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Exporter PDF">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Exporter Excel">
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Exporter CSV">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-3 lg:grid-cols-1 gap-3"
              >
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Surface</p>
                      <p className="text-sm font-semibold">{project.surface || '-'} m²</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Durée estimée</p>
                      <p className="text-sm font-semibold">{analysis?.estimatedDuration || '-'}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Main-d'œuvre</p>
                      <p className="text-sm font-semibold">{analysis?.laborEstimate?.totalWorkers || '-'} ouvriers</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Cost Breakdown Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm h-full">
                  <CardHeader>
                    <CardTitle className="text-base">Répartition des coûts</CardTitle>
                    <CardDescription>Par catégorie de matériaux</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={costEstimate.breakdown.filter((b: any) => b.percentage > 2)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="estimatedCost"
                            nameKey="label"
                          >
                            {costEstimate.breakdown.filter((b: any) => b.percentage > 2).map((entry: any) => (
                              <Cell key={entry.label} fill={CATEGORY_COLORS[entry.category] || "#6b7280"} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="glass-strong rounded-lg p-2 text-xs shadow-lg">
                                    <p className="font-medium">{data.label}</p>
                                    <p className="text-muted-foreground">
                                      {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(data.estimatedCost)}
                                    </p>
                                    <p className="text-muted-foreground">{data.percentage}% du total</p>
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
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                      {costEstimate.breakdown.filter((b: any) => b.percentage > 2).map((item: any) => (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[item.category] || "#6b7280" }} />
                          <span className="truncate">{item.label}</span>
                          <span className="text-muted-foreground ml-auto">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cost Breakdown List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-3"
              >
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm h-full">
                  <CardHeader>
                    <CardTitle className="text-base">Détail des coûts</CardTitle>
                    <CardDescription>Estimation par poste</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {costEstimate.breakdown
                        .sort((a: any, b: any) => b.estimatedCost - a.estimatedCost)
                        .map((item: any) => (
                        <div key={item.label} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[item.category] || "#6b7280" }} />
                              <span className="text-sm">{item.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">
                                {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(item.estimatedCost)}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">({item.percentage}%)</span>
                            </div>
                          </div>
                          <Progress value={item.percentage} className="h-1.5" />
                        </div>
                      ))}
                    </div>

                    {/* Contingency */}
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">Marge pour imprévus</span>
                        </div>
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(costEstimate.contingencyBuffer)}
                        </span>
                      </div>
                      <Progress value={costEstimate.contingencyPercentage} className="h-1.5 bg-amber-500/10" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {costEstimate.contingencyPercentage}% du coût total réservé aux imprévus
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recommendations & Technical */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Optimization Tips */}
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-base">Suggestions d'optimisation</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(project.optimizationTips || []).map((tip: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Technical Recommendations */}
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">Recommandations techniques</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(project.technicalRecommendations || []).map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Anomalies */}
              {(analysis?.anomalies && analysis.anomalies.length > 0) && (
                <Card className="border border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-base">Anomalies détectées</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysis.anomalies.map((anomaly: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <TriangleAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">{anomaly.type}</p>
                            <p className="text-muted-foreground">{anomaly.description}</p>
                            {anomaly.recommendation && (
                              <p className="text-xs text-muted-foreground mt-1">{anomaly.recommendation}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Materials List */}
            {costEstimate.breakdown.some((b: any) => b.items && b.items.length > 0) && (
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary shrink-0" />
                    <CardTitle className="text-sm sm:text-base">Liste des matériaux</CardTitle>
                    <CardDescription className="hidden sm:block">Quantités et prix unitaires</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Matériau</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Quantité</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Unité</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Prix unitaire</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costEstimate.breakdown
                          .filter((b: any) => b.items && b.items.length > 0)
                          .flatMap((b: any) => b.items)
                          .map((item: any, i: number) => (
                            <tr key={i} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-2">{item.name}</td>
                              <td className="text-right py-2 px-2">{item.quantity}</td>
                              <td className="text-right py-2 px-2 text-muted-foreground">{item.unit}</td>
                              <td className="text-right py-2 px-2">
                                {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(item.unitPrice)}
                              </td>
                              <td className="text-right py-2 px-2 font-medium">
                                {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(item.totalPrice)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Details */}
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Détails du projet</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {project.region ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Région</p>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        {REGION_LABELS[project.region] || project.region}
                      </div>
                    </div>
                  ) : null}
                  {project.surface ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Surface</p>
                      <p className="text-sm font-medium">{project.surface} m²</p>
                    </div>
                  ) : null}
                  {project.floors && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Étages</p>
                      <p className="text-sm font-medium">{project.floors}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Créé le</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(project.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  {project.description && (
                    <div className="col-span-full">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
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
