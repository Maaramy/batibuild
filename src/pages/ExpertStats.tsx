import { useMemo, useState } from "react";
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
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Crown,
  Eye,
  FileText,
  Filter,
  Inbox,
  Lock,
  MapPin,
  MessageSquare,
  Percent,
  PhoneCall,
  PieChart as PieChartIcon,
  Sparkles,
  Star,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import {
  kindLabel,
  ratePercent,
  sourceLabel,
  statusMeta,
} from "@/lib/expertStatsLabels";
import { regionLabel } from "@/lib/providerRegions";

// ============================================================================
// STATISTIQUES EXPERT
//
// « Suivez vos performances et votre visibilité » : toutes les valeurs
// proviennent des données réellement collectées par la plateforme (vues et
// contacts du profil, demandes de devis/prestations, réponses envoyées,
// rendez-vous, urgences, avis clients). Aucune donnée de démonstration.
// ============================================================================

const PERIODS = [
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
  { key: "90d", label: "90j" },
  { key: "year", label: "Année" },
  { key: "custom", label: "Perso." },
] as const;

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

/** Tronque un libellé d'axe ou de légende pour éviter que deux libellés se
 *  chevauchent ou débordent de la zone de graphique sur mobile. */
const truncateLabel = (value: unknown, max = 16) => {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/** Icône et teinte de chaque nature de demande (les libellés viennent de
 *  `src/lib/expertStatsLabels.ts`, partagés et testés). */
const KIND_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  devis: { icon: FileText, color: "text-emerald-600 bg-emerald-50" },
  service: { icon: Wrench, color: "text-blue-600 bg-blue-50" },
  appointment: { icon: CalendarClock, color: "text-blue-600 bg-blue-50" },
  urgent: { icon: Zap, color: "text-amber-600 bg-amber-50" },
  rating: { icon: Star, color: "text-amber-600 bg-amber-50" },
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtRelative = (ts: number) => {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return minutes <= 1 ? "à l'instant" : `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `il y a ${days} j`;
  return fmtDate(ts);
};

const pct = ratePercent;

// ============================================================================
// Sous-composants
// ============================================================================

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-5 w-52" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  suffix,
  color,
  hint,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  suffix?: string;
  color: string;
  hint?: string;
  loading?: boolean;
}) {
  const display =
    typeof value === "number" ? value.toLocaleString("fr-FR") : value;

  return (
    // `py-0` : la tuile n'utilise pas le rembourrage vertical par défaut des
    // cartes (24px en haut et en bas) qui la rendait inutilement haute.
    <Card className="overflow-hidden border-border/40 py-0">
      <CardContent className="flex h-full flex-col justify-center p-3 sm:p-4">
        {/* Icône + chiffre sur la même ligne, alignés verticalement */}
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
            <Skeleton className="h-7 w-14" />
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
        {/* Libellé puis précision, sur toute la largeur de la tuile : plus de
            texte coupé, même sur un écran de 320px. */}
        <p className="mt-1.5 text-[10px] font-medium leading-tight text-muted-foreground sm:mt-2 sm:text-xs">
          {label}
        </p>
        {hint && !loading && (
          <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground/70 sm:text-[10px]">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Étape de l'entonnoir de visibilité (vues → clics → contacts → demandes). */
function FunnelStep({
  label,
  value,
  total,
  color,
  rate,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  rate?: number;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-[10px] font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-bold tabular-nums text-foreground">
          {value.toLocaleString("fr-FR")}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${total > 0 ? Math.max(4, (value / total) * 100) : 0}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {rate !== undefined && (
        <p className="text-[9px] text-muted-foreground/70">
          {rate}% de l'étape précédente
        </p>
      )}
    </div>
  );
}

function UpgradeScreen({ onBack }: { onBack: () => void }) {
  return (
    <Card className="border-border/40">
      <CardContent className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <Lock className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-semibold">Statistiques réservées aux abonnés</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Souscrivez à l'abonnement Expert pour accéder à vos statistiques
            détaillées.
          </p>
        </div>
        <Button
          className="gap-1.5 bg-violet-600 text-sm hover:bg-violet-700"
          onClick={onBack}
        >
          <Crown className="h-4 w-4" />
          Voir l'abonnement
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-border/40">
      <CardContent className="flex flex-col items-center p-8 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Aucune donnée sur cette période
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Vos statistiques se remplissent automatiquement dès qu'un client
          consulte votre profil, vous contacte ou vous envoie une demande.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function ExpertStats() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");

  const profile = useQuery(api.expertProfiles.getMyProfile);

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

  const kpis = useQuery(api.expertStats.getExpertKPIs, queryArgs);
  const viewsOverTime = useQuery(api.expertStats.getExpertViewsOverTime, queryArgs);
  const trafficSources = useQuery(api.expertStats.getExpertTrafficSources, queryArgs);
  const demandBreakdown = useQuery(api.expertStats.getExpertDemandBreakdown, queryArgs);
  const regions = useQuery(api.expertStats.getExpertRegions, queryArgs);
  const demandTable = useQuery(api.expertStats.getExpertDemandTable, queryArgs);
  const activity = useQuery(api.expertStats.getExpertRecentActivity, queryArgs);
  const visibility = useQuery(api.expertStats.getExpertVisibility);
  const completeness = useQuery(api.expertStats.getExpertProfileCompleteness);

  // effectiveStatus tient compte de l'« Offre gratuite » (switch admin).
  const hasAccess =
    !!profile &&
    (profile.plan === "monthly" || profile.effectiveStatus === "active");

  if (profile === undefined) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5">
        <StatsSkeleton />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => navigate("/dashboard/expert")}
            aria-label="Retour à l'espace expert"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
            Statistiques
          </h1>
        </div>
        <UpgradeScreen onBack={() => navigate("/dashboard/expert")} />
      </div>
    );
  }

  const loading = kpis === undefined;
  const views = kpis?.views ?? 0;
  const clicks = kpis?.clicks ?? 0;
  const contacts = kpis?.contacts ?? 0;
  const requests = kpis?.requestsReceived ?? 0;
  const responses = kpis?.responsesSent ?? 0;

  const hasAnyData =
    views + contacts + requests + responses > 0;

  const trendData = viewsOverTime ?? [];
  // Régions triées par volume de demandes (le backend renvoie déjà le top 8).
  const regionData = [...(regions ?? [])]
    .sort((a, b) => b.value - a.value)
    .map((r) => ({ ...r, label: regionLabel(r.name) }));

  const areaConfig = {
    views: { label: "Vues", color: "#3b82f6" },
    contacts: { label: "Contacts", color: "#10b981" },
  } satisfies ChartConfig;

  const demandConfig = {
    value: { label: "Demandes", color: "#8b5cf6" },
  } satisfies ChartConfig;

  const regionConfig = {
    value: { label: "Demandes", color: "#f59e0b" },
  } satisfies ChartConfig;

  const visibleDemandRows = (demandTable ?? []).filter((r) => r.requests > 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-4 sm:space-y-4 sm:px-5">
      {/* ── En-tête ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 sm:gap-3"
      >
        <button
          onClick={() => navigate("/dashboard/expert")}
          aria-label="Retour à l'espace expert"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
            Statistiques Expert
          </h1>
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
            Suivez vos performances et votre visibilité
          </p>
        </div>
      </motion.div>

      {/* ── Sélecteur de période (occupe toute la largeur, 320px inclus) ── */}
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

      {period === "custom" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-wrap items-center gap-2"
        >
          <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <label className="text-[11px] font-medium text-muted-foreground">
            Début
          </label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] sm:w-auto sm:py-1"
          />
          <span className="text-[10px] text-muted-foreground/70">
            jusqu'à aujourd'hui
          </span>
        </motion.div>
      )}

      {/* ── Cartes KPI : 2 colonnes à tous les formats ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <KpiCard
          label="Vues du profil"
          value={views}
          icon={Eye}
          color="#3b82f6"
          loading={loading}
        />
        <KpiCard
          label="Contacts engagés"
          value={contacts}
          icon={PhoneCall}
          color="#10b981"
          hint={views > 0 ? `${kpis?.contactRate ?? 0}% des visiteurs` : undefined}
          loading={loading}
        />
        <KpiCard
          label="Demandes reçues"
          value={requests}
          icon={Inbox}
          color="#8b5cf6"
          hint={
            (kpis?.pendingRequests ?? 0) > 0
              ? `${kpis?.pendingRequests} en attente`
              : undefined
          }
          loading={loading}
        />
        <KpiCard
          label="Taux de réponse"
          value={kpis?.responseRate ?? 0}
          icon={Percent}
          suffix="%"
          color="#f59e0b"
          hint={`${responses} réponse${responses > 1 ? "s" : ""} envoyée${responses > 1 ? "s" : ""}`}
          loading={loading}
        />
        <KpiCard
          label="Note moyenne"
          value={kpis?.avgRating ?? 0}
          icon={Star}
          suffix="/5"
          color="#f59e0b"
          hint={`${kpis?.totalRatings ?? 0} avis`}
          loading={loading}
        />
        <KpiCard
          label="Rendez-vous"
          value={kpis?.appointments ?? 0}
          icon={CalendarClock}
          color="#3b82f6"
          hint={`${kpis?.appointmentsApproved ?? 0} confirmé(s)`}
          loading={loading}
        />
        <KpiCard
          label="Urgences"
          value={kpis?.urgentRequests ?? 0}
          icon={Zap}
          color="#ef4444"
          hint={`${kpis?.urgentAccepted ?? 0} acceptée(s)`}
          loading={loading}
        />
        <KpiCard
          label="Position annuaire"
          value={
            visibility?.rank
              ? `${visibility.rank}/${visibility.total}`
              : "—"
          }
          icon={TrendingUp}
          color="#06b6d4"
          hint={
            visibility
              ? visibility.isVisible
                ? "Profil publié"
                : "Profil masqué"
              : undefined
          }
          loading={loading}
        />
      </div>

      {!loading && !hasAnyData && <EmptyState />}

      {/* ── Entonnoir de visibilité ── */}
      {hasAnyData && (
        <Card className="border-border/40">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              De la visite à la demande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 pt-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <FunnelStep label="Vues du profil" value={views} total={views} color="#3b82f6" />
              <FunnelStep
                label="Clics (annuaire)"
                value={clicks}
                total={views}
                color="#06b6d4"
                rate={pct(clicks, views)}
              />
              <FunnelStep
                label="Contacts"
                value={contacts}
                total={views}
                color="#10b981"
                rate={pct(contacts, views)}
              />
              <FunnelStep
                label="Demandes reçues"
                value={requests}
                total={views}
                color="#8b5cf6"
                rate={pct(requests, views)}
              />
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground/70">
              Les vues sont comptées à l'ouverture de votre fiche publique, les
              contacts lorsqu'un client lance un appel, un e-mail, une demande de
              devis, un rendez-vous ou une urgence.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Courbe d'audience + sources de trafic ── */}
      {hasAnyData && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="border-border/40">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                Vues et contacts par jour
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 sm:px-3 sm:pb-3">
              <ChartContainer config={areaConfig} className="h-44 w-full sm:h-52">
                <AreaChart data={trendData} margin={{ left: 0, right: 6, top: 4 }}>
                  <defs>
                    <linearGradient id="expertFillViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expertFillContacts" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#expertFillViews)"
                    strokeWidth={1.5}
                    name="Vues"
                  />
                  <Area
                    type="monotone"
                    dataKey="contacts"
                    stroke="#10b981"
                    fill="url(#expertFillContacts)"
                    strokeWidth={1.5}
                    name="Contacts"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <PieChartIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Sources de trafic
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 sm:px-3 sm:pb-3">
              {trafficSources && trafficSources.length > 0 ? (
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                  <div className="h-40 w-40 shrink-0 sm:h-44 sm:w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={trafficSources}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={62}
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
                          {sourceLabel(src.name)}
                        </span>
                        <span className="ml-auto pl-2 text-[10px] font-semibold tabular-nums text-foreground">
                          {src.value.toLocaleString("fr-FR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center px-2 text-center sm:h-44">
                  <p className="text-xs text-muted-foreground">
                    Les sources apparaîtront avec vos premières visites.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Répartition des demandes + régions ── */}
      {hasAnyData && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="border-border/40">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                Demandes par nature
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 sm:px-3 sm:pb-3">
              {(demandBreakdown ?? []).some((d) => d.value > 0) ? (
                <ChartContainer config={demandConfig} className="h-44 w-full sm:h-52">
                  <RechartsBarChart
                    data={demandBreakdown ?? []}
                    margin={{ left: 0, right: 6, top: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => truncateLabel(v, 9)}
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
                      width={24}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Demandes" />
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-44 items-center justify-center px-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Aucune demande reçue sur cette période.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                Régions d'où viennent les demandes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 sm:px-3 sm:pb-3">
              {regionData.length > 0 ? (
                <ChartContainer config={regionConfig} className="h-44 w-full sm:h-52">
                  <RechartsBarChart
                    data={regionData}
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
                      dataKey="label"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => truncateLabel(v, 13)}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Demandes" />
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-44 items-center justify-center px-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Les régions s'affichent dès que des demandes précisent une
                    zone.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tableau de détail ── */}
      {hasAnyData && (
        <Card className="overflow-hidden border-border/40">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              Détail par type de demande
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {visibleDemandRows.length > 0 ? (
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 min-w-[120px] text-[10px]">Type</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Demandes</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Réponses</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Taux</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">En attente</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Dernier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleDemandRows.map((row) => {
                      const meta = KIND_META[row.key] ?? KIND_META.devis;
                      const Icon = meta.icon;
                      return (
                        <TableRow key={row.key}>
                          <TableCell className="py-2">
                            <span className="flex items-center gap-1.5 text-[11px] font-medium">
                              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {row.name}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 text-right text-[11px] tabular-nums">
                            {row.requests}
                          </TableCell>
                          <TableCell className="py-2 text-right text-[11px] tabular-nums">
                            {row.responses}
                          </TableCell>
                          <TableCell className="py-2 text-right text-[11px] tabular-nums">
                            {row.rate}%
                          </TableCell>
                          <TableCell className="py-2 text-right text-[11px] tabular-nums">
                            {row.pending}
                          </TableCell>
                          <TableCell className="py-2 text-right text-[10px] text-muted-foreground">
                            {row.lastAt ? fmtRelative(row.lastAt) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="p-6 text-center text-xs text-muted-foreground">
                Aucune demande reçue sur cette période.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Activité récente ── */}
      {hasAnyData && (
        <Card className="border-border/40">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            {activity && activity.length > 0 ? (
              <div className="space-y-1.5">
                {activity.map((item) => {
                  const meta = KIND_META[item.kind] ?? KIND_META.devis;
                  const status = statusMeta(item.status);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5"
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] font-semibold">
                            {kindLabel(item.kind)} · {item.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`ml-auto shrink-0 px-1.5 py-0 text-[9px] ${status.className}`}
                          >
                            {status.label}
                          </Badge>
                        </div>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {item.subtitle || "—"}
                        </p>
                        <p className="text-[9px] text-muted-foreground/70">
                          {fmtRelative(item.at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Votre activité s'affichera ici dès la première interaction.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Visibilité & complétude du profil ── */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-border/40">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
              Visibilité dans l'annuaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-2">
            {visibility ? (
              <>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {visibility.rank ? `${visibility.rank}` : "—"}
                  <span className="text-sm font-medium text-muted-foreground">
                    {" "}
                    / {visibility.total} professionnels
                  </span>
                </p>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Classement de votre profil parmi les professionnels publiés de
                  votre métier, d'après votre note, le nombre d'avis et vos vues.
                </p>
                <Badge
                  variant="outline"
                  className={
                    visibility.isVisible
                      ? "h-auto max-w-full whitespace-normal border-emerald-200/40 bg-emerald-500/10 text-left text-[10px] text-emerald-700"
                      : "h-auto max-w-full whitespace-normal border-amber-200/40 bg-amber-500/10 text-left text-[10px] text-amber-700"
                  }
                >
                  {visibility.isVisible ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Profil visible
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-1 h-3 w-3" /> Profil masqué — non
                      proposé aux clients
                    </>
                  )}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 h-7 w-full text-[11px]"
                  onClick={() => navigate("/dashboard/professionals-directory")}
                >
                  Voir l'annuaire
                </Button>
              </>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Visibilité indisponible.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              Complétude du profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-2">
            {completeness ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {completeness.score}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {completeness.filled}/{completeness.total} informations
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completeness.score}%` }}
                  />
                </div>
                {completeness.missing.length > 0 ? (
                  <>
                    <p className="text-[10px] text-muted-foreground">
                      À compléter pour gagner en visibilité :
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {completeness.missing.map((m) => (
                        <span
                          key={m.key}
                          className="rounded-full border border-amber-200/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-700"
                        >
                          {m.label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="flex items-center gap-1 text-[10px] text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Profil complet, bravo !
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-1 h-7 w-full text-[11px]"
                  onClick={() => navigate("/dashboard/expert")}
                >
                  Compléter mon profil
                </Button>
              </>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Complétude indisponible.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="px-1 pb-2 text-[9px] leading-relaxed text-muted-foreground/60">
        Données collectées en temps réel à partir de votre fiche publique, de vos
        échanges et de vos demandes. Elles ne sont visibles que par vous.
      </p>
    </div>
  );
}
