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
//
// Mise en page : entièrement responsive (smartphone étroit → desktop). Aucun
// élément ne dépasse horizontalement : les grilles se replient, les filtres se
// répartissent sur la largeur disponible, les graphiques remplissent leur carte
// et les libellés d'axe sont tronqués / espacés intelligemment.
// ============================================================================

const PERIODS = [
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
  { key: "90d", label: "90j" },
  { key: "year", label: "Année" },
  { key: "custom", label: "Perso." },
] as const;

const PIE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899",
];

/** Tronque un libellé d'axe pour éviter que deux libellés se chevauchent ou
 *  débordent de la zone de graphique sur mobile. */
const truncateLabel = (value: unknown, max = 16) => {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

// ============================================================================
// Skeleton
// ============================================================================

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <Skeleton className="h-5 w-40 sm:w-48" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl sm:h-20" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

// ============================================================================
// Upgrade Screen
// ============================================================================

function UpgradeScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-1">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-base font-bold text-foreground sm:text-lg">
          Statistiques réservées aux fournisseurs
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Souscrivez à l'abonnement Fournisseur pour accéder à vos statistiques.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" className="h-10 flex-1 sm:h-9 sm:flex-none" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Retour
          </Button>
          <Button
            className="h-10 flex-1 sm:h-9 sm:flex-none"
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
        <CardContent className="flex flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-14">
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
// KPI Card — tuile 2 colonnes à tous les formats
//
// Disposition identique sur tous les écrans :
//
//   [Icône]  125
//   Demandes reçues
//
// L'icône et le chiffre partagent la même ligne, centrés verticalement et
// serrés l'un contre l'autre ; le libellé reste en dessous, sur toute la
// largeur de la tuile. Chiffre suffisamment grand et tuile compacte, sans
// débordement horizontal même sur smartphone étroit.
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
  const display =
    typeof value === "number" ? value.toLocaleString("fr-FR") : value;

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="flex h-full flex-col justify-center p-3 sm:p-4">
        {/* Icône + chiffre sur la même ligne, alignement vertical parfait */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10"
            style={{ backgroundColor: `${color}15` }}
          >
            <span style={{ color }}>
              <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="min-w-0 text-xl font-bold leading-none tabular-nums text-foreground sm:text-2xl">
              <span className="break-words">{display}</span>
              {suffix && (
                <span className="ml-0.5 text-xs font-medium text-muted-foreground sm:text-sm">
                  {suffix}
                </span>
              )}
            </p>
          )}
        </div>
        {/* Libellé sous la ligne icône + chiffre */}
        <p className="mt-1.5 text-[10px] font-medium leading-tight text-muted-foreground sm:mt-2 sm:text-xs">
          {label}
        </p>
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
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5">
        <StatsSkeleton />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5">
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
    <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-4 sm:space-y-4 sm:px-5">
      {/* ── En-tête ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 sm:gap-3"
      >
        <button
          onClick={() => navigate("/dashboard/supplier")}
          aria-label="Retour à l'espace fournisseur"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
            Statistiques
          </h1>
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
            Performance de votre profil
          </p>
        </div>
      </motion.div>

      {showEmptyState ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Filtre de période (occupe toute la largeur, y compris 320px) ── */}
          <div className="grid grid-cols-5 gap-1 rounded-xl bg-muted/30 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                aria-pressed={period === p.key}
                className={`min-w-0 truncate rounded-lg px-1 py-2 text-[11px] font-medium transition-all sm:px-2 sm:py-1.5 sm:text-xs ${
                  period === p.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* ── Plage personnalisée ── */}
          {period === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-wrap items-center gap-2"
            >
              <label className="text-[11px] font-medium text-muted-foreground">
                Début
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] sm:w-auto sm:py-1"
              />
            </motion.div>
          )}

          {/* ── Cartes KPI : 2 colonnes sur tous les formats ── */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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

          {/* ── Graphiques — ligne 1 : aires + sources ── */}
          {viewsOverTime && viewsOverTime.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Card>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <BarChart3 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    Évolution vues &amp; clics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0 sm:px-3 sm:pb-3">
                  <ChartContainer
                    config={areaChartConfig}
                    className="h-44 w-full sm:h-52"
                  >
                    <AreaChart data={viewsOverTime} margin={{ left: 0, right: 6, top: 4 }}>
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
                        minTickGap={18}
                        interval="preserveStartEnd"
                        tickMargin={4}
                      />
                      <YAxis
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        width={28}
                        allowDecimals={false}
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

              <Card>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <PieChartIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    Sources de trafic
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {trafficSources && trafficSources.length > 0 ? (
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                      <div className="h-40 w-40 shrink-0 sm:h-44 sm:w-44">
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
                      <div className="w-full min-w-0 space-y-1.5 sm:flex-1">
                        {trafficSources.map((src, i) => (
                          <div key={src.name} className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                            <span className="truncate text-[10px] text-muted-foreground">
                              {src.name === "direct"
                                ? "Direct"
                                : src.name === "search"
                                  ? "Recherche"
                                  : src.name === "social"
                                    ? "Réseau social"
                                    : "Autre"}
                            </span>
                            <span className="ml-auto pl-2 text-[10px] font-semibold tabular-nums text-foreground">
                              {src.value.toLocaleString("fr-FR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center">
                      <p className="text-xs text-muted-foreground">Aucune donnée</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Graphiques — ligne 2 : clics par produit + top produits ── */}
          {((clicksByProduct && clicksByProduct.length > 0) ||
            (topProducts && topProducts.length > 0)) && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {clicksByProduct && clicksByProduct.length > 0 && (
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="flex items-center gap-1.5 text-xs">
                      <BarChart className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                      Clics par produit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 sm:px-3 sm:pb-3">
                    <ChartContainer
                      config={barChartConfig}
                      className="h-44 w-full sm:h-52"
                    >
                      <RechartsBarChart
                        data={clicksByProduct}
                        layout="vertical"
                        margin={{ left: 0, right: 8, top: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="product"
                          tick={{ fontSize: 9 }}
                          tickFormatter={(v) => truncateLabel(v, 14)}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                          width={84}
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
                      <TrendingUp className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      Top 5 produits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 sm:px-3 sm:pb-3">
                    <ChartContainer
                      config={barChartConfig}
                      className="h-44 w-full sm:h-52"
                    >
                      <RechartsBarChart
                        data={topProducts}
                        margin={{ left: 0, right: 6, top: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis
                          dataKey="product"
                          tick={{ fontSize: 9 }}
                          tickFormatter={(v) => truncateLabel(v, 8)}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                          minTickGap={6}
                          tickMargin={4}
                        />
                        <YAxis
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                          width={26}
                          allowDecimals={false}
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
          )}

          {/* ── Tableau de détail (défilement latéral interne si nécessaire) ── */}
          {detailedTable && detailedTable.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <BarChart3 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                  Détail par produit/service
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="min-w-[132px] py-1 text-[10px]">
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
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
