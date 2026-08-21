import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  MessageSquare,
  Star,
  ArrowLeft,
  Calendar,
  BarChart3,
  RefreshCw,
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
// Constants
// ============================================================================

const PERIODS = [
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
  { key: "year", label: "Année" },
  { key: "custom", label: "Personnalisé" },
] as const;

const PIE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
];

// ============================================================================
// Skeleton
// ============================================================================

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ============================================================================
// Upgrade Screen
// ============================================================================

function UpgradeScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
          <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Statistiques réservées aux fournisseurs
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Souscrivez au forfait Fournisseur pour accéder à vos statistiques de
          performance : vues, clics, taux de conversion et bien plus.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button
            onClick={() => (window.location.href = "/dashboard/supplier")}
          >
            <Crown className="mr-2 h-4 w-4" />
            Mon espace fournisseur
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
        <BarChart3 className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        Aucune donnée pour cette période
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Les statistiques apparaîtront dès que des visiteurs consulteront votre
        profil ou vos produits.
      </p>
    </div>
  );
}

// ============================================================================
// KPI Card
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
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
                {suffix && (
                  <span className="ml-0.5 text-sm font-medium text-muted-foreground">
                    {suffix}
                  </span>
                )}
              </p>
            )}
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon className="h-4.5 w-4.5" />
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
  const seedDemo = useMutation(api.supplierStats.seedDemoAnalytics);

  const [period, setPeriod] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [seeding, setSeeding] = useState(false);

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

  const kpis = useQuery(api.supplierStats.getSupplierKPIs, queryArgs);
  const viewsOverTime = useQuery(api.supplierStats.getViewsOverTime, queryArgs);
  const clicksByProduct = useQuery(
    api.supplierStats.getClicksByProduct,
    queryArgs,
  );
  const trafficSources = useQuery(api.supplierStats.getTrafficSources, queryArgs);
  const topProducts = useQuery(api.supplierStats.getTopProducts, queryArgs);
  const detailedTable = useQuery(api.supplierStats.getDetailedTable, queryArgs);

  const isLoading = profile === undefined;

  // Check supplier plan access
  const hasAccess =
    profile &&
    (profile.plan === "monthly" || profile.effectiveStatus === "active");

  const hasData =
    viewsOverTime && viewsOverTime.length > 0;

  // ── Period filter state ──
  const currentPeriod =
    PERIODS.find((p) => p.key === period) || PERIODS[1];

  // ── Handle seed demo ──
  const handleSeed = async () => {
    try {
      setSeeding(true);
      await seedDemo();
      window.location.reload();
    } catch (e) {
      console.error("Seed failed:", e);
    } finally {
      setSeeding(false);
    }
  };

  // ── Chart config ──
  const areaChartConfig = {
    views: {
      label: "Vues",
      color: "#3b82f6",
    },
    clicks: {
      label: "Clics",
      color: "#10b981",
    },
  } satisfies ChartConfig;

  const barChartConfig = {
    clicks: {
      label: "Clics",
      color: "#3b82f6",
    },
  } satisfies ChartConfig;

  // ── Render ──
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <StatsSkeleton />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <UpgradeScreen onBack={() => navigate("/dashboard/supplier")} />
      </div>
    );
  }

  // All data loaded but empty
  const totalViews = kpis?.views ?? 0;
  const totalClicks = kpis?.clicks ?? 0;
  const allEmpty =
    kpis && !hasData && totalViews === 0 && totalClicks === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/supplier")}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Statistiques
            </h1>
            <p className="text-sm text-muted-foreground">
              Performance de votre profil fournisseur
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
            className="gap-1.5"
          >
            {seeding ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Données démo
          </Button>
        </div>
      </motion.div>

      {/* ── Period Filter ── */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              period === p.key
                ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Calendar className="mr-1 inline h-3 w-3" />
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Custom Date Range ── */}
      {period === "custom" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Date de début
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
            />
          </div>
        </motion.div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Vues totales"
          value={kpis?.views ?? 0}
          icon={Eye}
          color="#3b82f6"
          loading={!kpis}
        />
        <KpiCard
          label="Clics totaux"
          value={kpis?.clicks ?? 0}
          icon={MousePointerClick}
          color="#10b981"
          loading={!kpis}
        />
        <KpiCard
          label="Taux de clics"
          value={kpis?.ctr ?? 0}
          icon={TrendingUp}
          suffix="%"
          color="#f59e0b"
          loading={!kpis}
        />
        <KpiCard
          label="Contacts reçus"
          value={kpis?.contacts ?? 0}
          icon={MessageSquare}
          color="#8b5cf6"
          loading={!kpis}
        />
        <KpiCard
          label="Note moyenne"
          value={kpis?.avgRating ?? 0}
          icon={Star}
          suffix={`/5 (${kpis?.totalRatings ?? 0})`}
          color="#ec4899"
          loading={!kpis}
        />
      </div>

      {/* ── Empty State ── */}
      {allEmpty && (
        <EmptyState />
      )}

      {/* ── Charts Row 1: Area + Pie ── */}
      {viewsOverTime && viewsOverTime.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Views & Clicks Over Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Évolution des vues & clics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={areaChartConfig} className="h-64">
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
                    className="text-[10px]"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-[10px]"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#3b82f6"
                    fill="url(#fillViews)"
                    strokeWidth={2}
                    name="Vues"
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#10b981"
                    fill="url(#fillClicks)"
                    strokeWidth={2}
                    name="Clics"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Traffic Sources Donut */}
          {trafficSources && trafficSources.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PieChartIcon className="h-4 w-4 text-emerald-500" />
                  Sources de trafic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="h-56 w-56 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={trafficSources}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
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
                            "événements",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {trafficSources.map((src, i) => (
                      <div key={src.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {src.name === "direct"
                            ? "Direct"
                            : src.name === "search"
                              ? "Recherche"
                              : src.name === "social"
                                ? "Réseau social"
                                : "Autre"}
                        </span>
                        <span className="ml-auto text-xs font-semibold tabular-nums text-foreground">
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
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PieChartIcon className="h-4 w-4 text-emerald-500" />
                  Sources de trafic
                </CardTitle>
              </CardHeader>
              <CardContent className="flex h-56 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Aucune donnée de trafic disponible
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Charts Row 2: Bar + Horizontal Bar ── */}
      {(clicksByProduct && clicksByProduct.length > 0) ||
      (topProducts && topProducts.length > 0) ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Clicks by Product */}
          {clicksByProduct && clicksByProduct.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart className="h-4 w-4 text-violet-500" />
                  Clics par produit/service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-64">
                  <RechartsBarChart
                    data={clicksByProduct}
                    layout="vertical"
                    margin={{ left: 0, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      type="number"
                      className="text-[10px]"
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="product"
                      className="text-[10px]"
                      tick={{ fontSize: 10 }}
                      width={120}
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
                    <Bar dataKey="clicks" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </RechartsBarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Top 5 Products */}
          {topProducts && topProducts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Top 5 produits les plus consultés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-64">
                  <RechartsBarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="product"
                      className="text-[10px]"
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      className="text-[10px]"
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="views"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Vues"
                    />
                    <Bar
                      dataKey="clicks"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
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
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Tableau détaillé par produit/service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">
                      Produit / Service
                    </TableHead>
                    <TableHead className="text-right">Vues</TableHead>
                    <TableHead className="text-right">Clics</TableHead>
                    <TableHead className="text-right">Contacts</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedTable.map((row) => (
                    <TableRow key={row.product}>
                      <TableCell className="font-medium">
                        {row.product}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.views.toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.clicks.toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.contacts.toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className="tabular-nums"
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
    </div>
  );
}
