import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Eye,
  Inbox,
  Send,
  Percent,
  TrendingUp,
  ArrowLeft,
  BarChart3,
  Lock,
  Crown,
  BarChart,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// ============================================================================
// Statistiques fournisseur — données RÉELLES uniquement
//
// Aucune donnée, carte ou graphique de démonstration : tous les chiffres
// proviennent des events d'analytics, des demandes de devis et des réponses
// du fournisseur connecté (voir `src/convex/supplierStats.ts`). Quand la
// période ne contient aucune donnée réelle, l'état vide ci-dessous remplace
// les KPI et les graphiques (jamais de valeur inventée).
// ============================================================================

const PERIODS = [
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
  { key: "90d", label: "90j" },
  { key: "year", label: "Année" },
  { key: "custom", label: "Custom" },
] as const;

const PIE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899",
];

// ============================================================================
// Skeleton
// ============================================================================

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

// ============================================================================
// Upgrade Screen
// ============================================================================

function UpgradeScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          Statistiques réservées aux fournisseurs
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Souscrivez à l'abonnement Fournisseur pour accéder à vos statistiques.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Retour
          </Button>
          <Button
            size="sm"
            onClick={() => (window.location.href = "/dashboard/supplier")}
          >
            <Crown className="mr-1.5 h-3.5 w-3.5" />
            Espace fournisseur
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Empty State — aucune donnée réelle sur la période
// ============================================================================

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-dashed border-border/60 bg-muted/[0.12]">
        <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Aucune statistique disponible
          </h3>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            Vous n'avez pas encore de données réelles sur cette période. Vos
            statistiques se remplissent automatiquement dès qu'un visiteur
            consulte votre profil, s'intéresse à vos produits ou vous envoie une
            demande de devis.
          </p>
          <p className="mt-3 text-[11px] font-medium text-muted-foreground/70">
            Aucun chiffre de démonstration n'est affiché.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// KPI Card (compact)
// ============================================================================

function KpiCard({
  label,
  value,
  icon: Icon,
  suffix,
  color,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  suffix?: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <span style={{ color }}><Icon className="h-4 w-4" /></span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-muted-foreground leading-tight">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-1 h-5 w-12" />
            ) : (
              <p className="text-base font-bold tabular-nums text-foreground leading-tight">
                {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
                {suffix && (
                  <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                    {suffix}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierStats() {
  const navigate = useNavigate();
  const profile = useQuery(api.supplierProfiles.getMyProfile);

  const [period, setPeriod] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");

  const queryArgs = useMemo(
    () => ({
      period,
      customStart:
        period === "custom" && customStart
          ? new Date(customStart).getTime()
          : undefined,
    }),
    [period, customStart],
  );

  // Les requêtes de détail exigent un profil fournisseur : on les met en pause
  // tant qu'il n'est pas chargé (sinon elles lèvent une erreur côté serveur).
  const chartArgs = profile ? queryArgs : ("skip" as const);

  const kpis = useQuery(api.supplierStats.getSupplierKPIs, queryArgs);
  const viewsOverTime = useQuery(api.supplierStats.getViewsOverTime, chartArgs);
  const clicksByProduct = useQuery(
    api.supplierStats.getClicksByProduct,
    chartArgs,
  );
  const trafficSources = useQuery(api.supplierStats.getTrafficSources, chartArgs);
  const topProducts = useQuery(api.supplierStats.getTopProducts, chartArgs);
  const detailedTable = useQuery(api.supplierStats.getDetailedTable, chartArgs);

  const isLoading = profile === undefined;

  const hasAccess =
    profile &&
    (profile.plan === "monthly" || profile.effectiveStatus === "active");

  const areaChartConfig = {
    views: { label: "Vues", color: "#3b82f6" },
    clicks: { label: "Clics", color: "#10b981" },
  } satisfies ChartConfig;

  const barChartConfig = {
    clicks: { label: "Clics", color: "#3b82f6" },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
        <StatsSkeleton />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
        <UpgradeScreen onBack={() => navigate("/dashboard/supplier")} />
      </div>
    );
  }

  // ── Données réelles uniquement ──
  // `kpis` est indéfini pendant le chargement ; une fois chargé, l'absence de
  // toute donnée réelle (vues, clics, contacts, demandes, réponses) déclenche
  // l'état vide au lieu de KPI et de graphiques à zéro.
  const loadingKpis = kpis === undefined;
  const hasRealData =
    !!kpis &&
    (kpis.views > 0 ||
      kpis.clicks > 0 ||
      kpis.contacts > 0 ||
      kpis.requestsReceived > 0 ||
      kpis.responsesSent > 0);
  const showEmptyState = !loadingKpis && !hasRealData;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-5">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard/supplier")}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground">
              Statistiques
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Performance de votre profil
            </p>
          </div>
        </div>
      </motion.div>

      {showEmptyState ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Period Filter (pill-style, matching ExpertStats) ── */}
          <div className="flex gap-1.5 bg-muted/30 rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* ── Custom Date Range ── */}
          {period === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2"
            >
              <label className="text-[11px] font-medium text-muted-foreground">
                Début
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px]"
              />
            </motion.div>
          )}

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KpiCard
              label="Vues du profil"
              value={kpis?.views ?? 0}
              icon={Eye}
              color="#3b82f6"
              loading={!kpis}
            />
            <KpiCard
              label="Demandes reçues"
              value={kpis?.requestsReceived ?? 0}
              icon={Inbox}
              color="#10b981"
              loading={!kpis}
            />
            <KpiCard
              label="Réponses envoyées"
              value={kpis?.responsesSent ?? 0}
              icon={Send}
              color="#8b5cf6"
              loading={!kpis}
            />
            <KpiCard
              label="Taux de réponse"
              value={kpis?.responseRate ?? 0}
              icon={Percent}
              suffix="%"
              color="#f59e0b"
              loading={!kpis}
            />
          </div>

          {/* ── Charts Row 1: Area + Pie ── */}
          {viewsOverTime && viewsOverTime.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                    Évolution vues & clics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ChartContainer config={areaChartConfig} className="h-48">
                    <AreaChart data={viewsOverTime}>
                      <defs>
                        <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => {
                          const dt = new Date(d);
                          return `${dt.getDate()}/${dt.getMonth() + 1}`;
                        }}
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        width={30}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#3b82f6"
                        fill="url(#fillViews)"
                        strokeWidth={1.5}
                        name="Vues"
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#10b981"
                        fill="url(#fillClicks)"
                        strokeWidth={1.5}
                        name="Clics"
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {trafficSources && trafficSources.length > 0 ? (
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="flex items-center gap-1.5 text-xs">
                      <PieChartIcon className="h-3.5 w-3.5 text-emerald-500" />
                      Sources de trafic
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex items-center gap-4">
                      <div className="h-44 w-44 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={trafficSources}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                              nameKey="name"
                            >
                              {trafficSources.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [
                                value.toLocaleString("fr-FR"),
                                "",
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1.5">
                        {trafficSources.map((src, i) => (
                          <div key={src.name} className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {src.name === "direct"
                                ? "Direct"
                                : src.name === "search"
                                  ? "Recherche"
                                  : src.name === "social"
                                    ? "Réseau social"
                                    : "Autre"}
                            </span>
                            <span className="ml-auto text-[10px] font-semibold tabular-nums text-foreground">
                              {src.value.toLocaleString("fr-FR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="flex items-center gap-1.5 text-xs">
                      <PieChartIcon className="h-3.5 w-3.5 text-emerald-500" />
                      Sources de trafic
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex h-44 items-center justify-center">
                    <p className="text-xs text-muted-foreground">Aucune donnée</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Charts Row 2: Bar + Horizontal Bar ── */}
          {(clicksByProduct && clicksByProduct.length > 0) ||
          (topProducts && topProducts.length > 0) ? (
            <div className="grid gap-3 md:grid-cols-2">
              {clicksByProduct && clicksByProduct.length > 0 && (
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="flex items-center gap-1.5 text-xs">
                      <BarChart className="h-3.5 w-3.5 text-violet-500" />
                      Clics par produit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <ChartContainer config={barChartConfig} className="h-48">
                      <RechartsBarChart
                        data={clicksByProduct}
                        layout="vertical"
                        margin={{ left: 0, right: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="product"
                          tick={{ fontSize: 9 }}
                          width={100}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            value.toLocaleString("fr-FR"),
                            "clics",
                          ]}
                        />
                        <Bar dataKey="clicks" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                      </RechartsBarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {topProducts && topProducts.length > 0 && (
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="flex items-center gap-1.5 text-xs">
                      <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                      Top 5 produits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <ChartContainer config={barChartConfig} className="h-48">
                      <RechartsBarChart data={topProducts}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis
                          dataKey="product"
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                          width={28}
                        />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar
                          dataKey="views"
                          fill="#3b82f6"
                          radius={[3, 3, 0, 0]}
                          name="Vues"
                        />
                        <Bar
                          dataKey="clicks"
                          fill="#10b981"
                          radius={[3, 3, 0, 0]}
                          name="Clics"
                        />
                      </RechartsBarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}

          {/* ── Detailed Table ── */}
          {detailedTable && detailedTable.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                  Détail par produit/service
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="min-w-[160px] py-1 text-[10px]">
                          Produit / Service
                        </TableHead>
                        <TableHead className="py-1 text-right text-[10px]">Vues</TableHead>
                        <TableHead className="py-1 text-right text-[10px]">Clics</TableHead>
                        <TableHead className="py-1 text-right text-[10px]">Contacts</TableHead>
                        <TableHead className="py-1 text-right text-[10px]">CTR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedTable.map((row) => (
                        <TableRow key={row.product} className="h-9">
                          <TableCell className="py-1.5 text-xs font-medium">
                            {row.product}
                          </TableCell>
                          <TableCell className="py-1.5 text-right text-xs tabular-nums">
                            {row.views.toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="py-1.5 text-right text-xs tabular-nums">
                            {row.clicks.toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="py-1.5 text-right text-xs tabular-nums">
                            {row.contacts.toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="py-1.5 text-right">
                            <Badge
                              variant="outline"
                              className="text-[10px] tabular-nums"
                            >
                              {row.ctr}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
