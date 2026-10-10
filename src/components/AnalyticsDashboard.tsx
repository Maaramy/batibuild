import { useEffect, useState, type ReactNode } from "react";
import * as React from "react";
import { useQuery, useConvexConnectionState } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Globe,
  Activity,
  TrendingUp,
  BarChart3,
  MapPin,
  FolderKanban,
  BrainCircuit,
  LifeBuoy,
  RefreshCw,
  AlertTriangle,
  Signal,
  SignalHigh,
  SignalLow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const COUNTRY_FLAGS: Record<string, string> = {
  Tunisia: "🇹🇳",
  France: "🇫🇷",
  Algeria: "🇩🇿",
  Morocco: "🇲🇦",
  Libya: "🇱🇾",
  Italy: "🇮🇹",
  Germany: "🇩🇪",
  Spain: "🇪🇸",
  "United States": "🇺🇸",
  Canada: "🇨🇦",
  Belgium: "🇧🇪",
  Switzerland: "🇨🇭",
  "United Kingdom": "🇬🇧",
  Netherlands: "🇳🇱",
  Turkey: "🇹🇷",
  "Saudi Arabia": "🇸🇦",
  Egypt: "🇪🇬",
  Unknown: "🌍",
};

function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] || "🌍";
}

function formatNumber(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString("fr-FR");
}

/** Indicateur "● Temps réel" reflétant l'état réel de la connexion Convex. */
function RealtimeIndicator() {
  const conn = useConvexConnectionState();
  const connected = conn.isWebSocketConnected;
  const syncing = conn.hasInflightRequests;
  const everConnected = conn.hasEverConnected;

  let state: { label: string; color: string; ping: boolean } = {
    label: "Connecté",
    color: "text-emerald-600",
    ping: true,
  };
  if (!everConnected) {
    state = { label: "Connexion…", color: "text-amber-500", ping: true };
  } else if (!connected) {
    state = { label: "Erreur de connexion", color: "text-red-500", ping: false };
  } else if (syncing) {
    state = { label: "Synchronisation…", color: "text-blue-500", ping: true };
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1.5"
      data-state={state.label}
      title={`WebSocket: ${connected ? "connecté" : "déconnecté"} · requêtes en cours: ${conn.inflightMutations + conn.inflightActions}`}
    >
      {state.ping ? (
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              connected ? "bg-emerald-400" : "bg-amber-400",
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2.5 w-2.5",
              connected ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
        </span>
      ) : (
        <span className="relative flex h-2.5 w-2.5">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}
      <span className={cn("text-xs font-semibold", state.color)}>
        Temps réel · {state.label}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value?: number | string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="border border-border/40 bg-background/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
              color,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">
              {label}
            </p>
            {loading || value === undefined ? (
              <Skeleton className="h-6 w-14 my-0.5" />
            ) : (
              <p className="text-xl font-black tabular-nums leading-tight">
                {typeof value === "number" ? formatNumber(value) : value}
              </p>
            )}
            {sub && !loading ? (
              <p className="text-[9px] text-muted-foreground truncate">{sub}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Mini bar chart (SVG-free, réutilise le style existant). */
function DaySeriesChart({
  data,
  color = "bg-primary",
  label,
}: {
  data: { date: string; count: number }[];
  color?: string;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end gap-[3px] h-24 mb-1">
        {data.map((d) => (
          <div key={d.date} className="flex-1 min-w-0 group relative">
            <div
              className={cn(
                "w-full rounded-t transition-colors",
                d.count === 0 ? "bg-muted/40" : color,
              )}
              style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
              <div className="bg-foreground text-background text-[9px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
                {d.date.slice(5)} — {d.count} {d.count === 1 ? "jour actif" : label.toLowerCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <AlertTriangle className="h-6 w-6 text-amber-500" />
      <p className="text-xs text-muted-foreground">
        Impossible de charger les statistiques en temps réel.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1 text-[11px] font-medium hover:bg-muted/40 transition-colors"
      >
        <RefreshCw className="h-3 w-3" />
        Réessayer
      </button>
    </div>
  );
}

function BarList({
  entries,
  icon: Icon,
  emptyLabel,
  colorClass = "bg-primary",
}: {
  entries: [string, number][];
  icon: React.ComponentType<{ className?: string }>;
  emptyLabel: string;
  colorClass?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-6">
        <Icon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="space-y-2">
      {entries.map(([label, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs font-medium flex-1 truncate">{label}</span>
            <div className="w-24 h-1.5 rounded-full bg-muted/40 overflow-hidden shrink-0">
              <div
                className={cn("h-full rounded-full", colorClass)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold tabular-nums w-12 text-right shrink-0">
              {count} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Boundary autour des useQuery : une erreur serveur/réseau dans une query
 * lève pendant le rendu — on l'attrape ici pour ne jamais faire planter la
 * page Admin entière, et on propose de réessayer (remontage propre).
 */
class AnalyticsErrorBoundary extends React.Component<
  { onRetry: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="border border-border/40 bg-background/50">
          <CardContent className="p-4">
            <SectionError onRetry={this.props.onRetry} />
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// Composant principal
// ============================================================================

export default function AnalyticsDashboard() {
  const [historyDays, setHistoryDays] = useState(7);
  const [retryKey, setRetryKey] = useState(0);

  const overview = useQuery(api.adminAnalytics.getOverviewStats, {});
  const userStats = useQuery(api.adminAnalytics.getUserStats, {});
  const projectStats = useQuery(api.adminAnalytics.getProjectStats, {});
  const activityStats = useQuery(api.adminAnalytics.getActivityStats, {});
  const supportStats = useQuery(api.adminAnalytics.getSupportStats, {});
  const connStats = useQuery(api.adminAnalytics.getConnectionStats, {});
  const history = useQuery(api.adminAnalytics.getConnectionHistory, {
    days: historyDays,
  });

  // Horloge « il y a X » pour les sessions en ligne (rafraîchissement léger)
  const [, setClockTick] = useState(0);
  // (le tick ne déclenche que le re-rendu des libellés d'âge)
  useEffect(() => {
    const t = window.setInterval(() => setClockTick((n) => n + 1), 10_000);
    return () => window.clearInterval(t);
  }, []);

  const queries = [overview, userStats, projectStats, activityStats, supportStats, connStats, history];
  const loading = queries.some((q) => q === undefined);
  // Toutes les queries renvoient null → garde admin refusé côté serveur
  const denied = queries.every((q) => q === null);

  const showSkeletons = loading && !denied;

  return (
    <div className="space-y-6">
      {/* Header + indicateur temps réel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Analytique temps réel</h2>
            <p className="text-xs text-muted-foreground">
              Données Convex en direct — utilisateurs, projets, activité, support
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeIndicator />
          {overview && overview.usersOnline > 0 && (
            <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap">
              {overview.usersOnline} en ligne
            </span>
          )}
        </div>
      </div>

      {denied ? (
        <Card className="border border-border/40 bg-background/50">
          <CardContent className="p-4">
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                Accès aux statistiques réservé aux administrateurs.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AnalyticsErrorBoundary onRetry={() => setRetryKey((k) => k + 1)} key={retryKey}>
        <>
          {/* ── Vue d'ensemble (indicateurs clés) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Utilisateurs"
              value={overview?.usersTotal}
              sub={overview ? `+${overview.usersNew7d} cette semaine` : undefined}
              icon={Users}
              color="text-emerald-600 bg-emerald-500/10"
              loading={showSkeletons}
            />
            <StatCard
              label="Projets"
              value={overview?.projectsTotal}
              sub={overview ? `+${overview.projectsNew7d} cette semaine` : undefined}
              icon={FolderKanban}
              color="text-blue-600 bg-blue-500/10"
              loading={showSkeletons}
            />
            <StatCard
              label="Analyses & calculs"
              value={overview?.analysesTotal}
              sub={overview ? `${overview.analyses24h} dernières 24h` : undefined}
              icon={BrainCircuit}
              color="text-violet-600 bg-violet-500/10"
              loading={showSkeletons}
            />
            <StatCard
              label="Tickets support ouverts"
              value={overview?.supportOpen}
              sub={overview ? `${overview.supportInProgress} en cours` : undefined}
              icon={LifeBuoy}
              color="text-amber-600 bg-amber-500/10"
              loading={showSkeletons}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── Utilisateurs ── */}
            <Card className="border border-border/40 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userStats === undefined ? (
                  <Skeleton className="h-28 w-full rounded-lg" />
                ) : userStats === null ? null : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: "Total", v: userStats.total },
                        { l: "Actifs", v: userStats.active },
                        { l: "Nouveaux (24h)", v: userStats.newLast24h },
                        { l: "Nouveaux (7j)", v: userStats.newLast7d },
                        { l: "En ligne", v: userStats.onlineNow },
                        { l: "Sessions 24h", v: userStats.recentSessions },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                        >
                          <span className="text-[10px] text-muted-foreground">{s.l}</span>
                          <span className="text-sm font-bold tabular-nums">
                            {formatNumber(s.v)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <BarList
                      entries={Object.entries(userStats.byUserRole)
                        .filter(([, v]) => v > 0)
                        .sort(([, a], [, b]) => b - a) as [string, number][]}
                      icon={Users}
                      emptyLabel="Aucun utilisateur par rôle"
                      colorClass="bg-emerald-500"
                    />
                    <DaySeriesChart
                      data={userStats.signupSeries}
                      label="Inscriptions (30 jours)"
                      color="bg-emerald-500"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Projets ── */}
            <Card className="border border-border/40 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-blue-500" />
                  Projets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectStats === undefined ? (
                  <Skeleton className="h-28 w-full rounded-lg" />
                ) : projectStats === null ? null : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: "Total", v: projectStats.total },
                        { l: "Actifs", v: projectStats.active },
                        { l: "Créés (24h)", v: projectStats.createdLast24h },
                        { l: "Créés (7j)", v: projectStats.createdLast7d },
                        { l: "Terminés", v: projectStats.completed },
                        { l: "Archivés", v: projectStats.archived },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                        >
                          <span className="text-[10px] text-muted-foreground">{s.l}</span>
                          <span className="text-sm font-bold tabular-nums">
                            {formatNumber(s.v)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <BarList
                      entries={Object.entries(projectStats.byCategory)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6) as [string, number][]}
                      icon={FolderKanban}
                      emptyLabel="Aucun projet par catégorie"
                      colorClass="bg-blue-500"
                    />
                    <DaySeriesChart
                      data={projectStats.creationSeries}
                      label="Créations de projets (30 jours)"
                      color="bg-blue-500"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Activité plateforme ── */}
            <Card className="border border-border/40 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-violet-500" />
                  Activité plateforme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityStats === undefined ? (
                  <Skeleton className="h-28 w-full rounded-lg" />
                ) : activityStats === null ? null : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: "Analyses ROI", v: activityStats.investmentAnalyses.total },
                        { l: "Feuilles de route", v: activityStats.roadmaps.total },
                        { l: "Rapports générés", v: activityStats.reports.total },
                        { l: "Demandes de devis", v: activityStats.quoteRequests.total },
                        { l: "Demandes expert", v: activityStats.expertServiceRequests.total },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                        >
                          <span className="text-[10px] text-muted-foreground">{s.l}</span>
                          <span className="text-sm font-bold tabular-nums">
                            {formatNumber(s.v)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <DaySeriesChart
                      data={activityStats.activitySeries}
                      label="Activité quotidienne — analyses, calculs, AI (30 jours)"
                      color="bg-violet-500"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Support ── */}
            <Card className="border border-border/40 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-amber-500" />
                  Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supportStats === undefined ? (
                  <Skeleton className="h-28 w-full rounded-lg" />
                ) : supportStats === null ? null : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: "Total tickets", v: supportStats.total },
                        { l: "Ouverts", v: supportStats.open },
                        { l: "En cours", v: supportStats.inProgress },
                        { l: "Résolus / fermés", v: supportStats.resolved },
                        { l: "Créés (7j)", v: supportStats.createdLast7d },
                        { l: "Résolus (7j)", v: supportStats.resolvedLast7d },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                        >
                          <span className="text-[10px] text-muted-foreground">{s.l}</span>
                          <span className="text-sm font-bold tabular-nums">
                            {formatNumber(s.v)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <BarList
                      entries={Object.entries(supportStats.byStatus).sort(
                        ([, a], [, b]) => b - a,
                      ) as [string, number][]}
                      icon={LifeBuoy}
                      emptyLabel="Aucun ticket"
                      colorClass="bg-amber-500"
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Connexions en direct + répartition par pays ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border/40 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Utilisateurs en ligne
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connStats === undefined ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 rounded-lg" />
                    ))}
                  </div>
                ) : connStats === null ? null : connStats.live.sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Aucun utilisateur en ligne
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {connStats.live.sessions.map(
                      (session: {
                        sessionId: string;
                        country: string;
                        city?: string;
                        region?: string;
                        page: string;
                        lastSeenAt: number;
                      }) => {
                        const age = Math.floor((Date.now() - session.lastSeenAt) / 1000);
                        const ageLabel =
                          age < 60 ? `${age}s` : `${Math.floor(age / 60)}min`;
                        return (
                          <div
                            key={session.sessionId}
                            className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                          >
                            <span className="text-lg">{getFlag(session.country)}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">
                                {session.city || session.region || session.country}
                              </p>
                              <p className="text-[9px] text-muted-foreground truncate">
                                {session.page}
                              </p>
                            </div>
                            <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
                              il y a {ageLabel}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/40 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  Répartition par pays (en ligne)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connStats === undefined ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-8 rounded-lg" />
                    ))}
                  </div>
                ) : connStats === null ? null : (
                  <BarList
                    entries={Object.entries(connStats.live.byCountry).sort(
                      ([, a], [, b]) => b - a,
                    ) as [string, number][]}
                    icon={Globe}
                    emptyLabel="Aucune donnée de localisation"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Historique des connexions ── */}
          <Card className="border border-border/40 bg-background/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                  Historique des connexions
                </CardTitle>
                <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-muted/20 p-0.5">
                  {[
                    { days: 7, label: "7j" },
                    { days: 15, label: "15j" },
                    { days: 30, label: "30j" },
                    { days: 90, label: "3m" },
                    { days: 180, label: "6m" },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      onClick={() => setHistoryDays(opt.days)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all",
                        historyDays === opt.days
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {history === undefined ? (
                <Skeleton className="h-48 rounded-lg" />
              ) : history === null ? null : history.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Aucune donnée pour cette période
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-1 h-40 mb-2">
                    {history.map((day) => {
                      const maxConn = Math.max(
                        ...history.map((d) => d.connections),
                        1,
                      );
                      const height = Math.max(
                        (day.connections / maxConn) * 100,
                        4,
                      );
                      return (
                        <div key={day.date} className="flex-1 min-w-0 group relative">
                          <div
                            className="w-full rounded-t bg-primary/80 hover:bg-primary transition-colors"
                            style={{ height: `${height}%` }}
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                            <div className="bg-foreground text-background text-[9px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
                              {day.date.slice(5)} — {day.connections} connexions
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1">
                    {history.map((day) => (
                      <div key={day.date} className="flex-1 min-w-0 text-center">
                        <span className="text-[7px] text-muted-foreground truncate block">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Top pays (tous les temps) ── */}
          {connStats && connStats !== null && connStats.topCountries.length > 0 && (
            <Card className="border border-border/40 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-amber-500" />
                  Top pays (tous les temps)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {connStats.topCountries.map(([country, count]) => (
                    <div
                      key={country}
                      className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                    >
                      <span className="text-sm">{getFlag(country)}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold truncate">{country}</p>
                        <p className="text-[9px] text-muted-foreground tabular-nums">
                          {count} visites
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Synthèse de l'activité récente ── */}
          {activityStats && activityStats !== null && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {activityStats.lastActivityAt ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                  Dernière action enregistrée :{" "}
                  {new Date(activityStats.lastActivityAt).toLocaleString("fr-FR")}
                </>
              ) : (
                <>
                  <SignalHigh className="h-3.5 w-3.5 text-muted-foreground" />
                  Aucune action enregistrée pour le moment
                </>
              )}
              {connStats && connStats !== null ? (
                <span className="inline-flex items-center gap-1">
                  <SignalHigh className="h-3.5 w-3.5 text-emerald-500" />
                  Synchronisation automatique active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <SignalLow className="h-3.5 w-3.5 text-amber-500" />
                  Reconnexion en cours…
                </span>
              )}
              <span className="ml-auto inline-flex items-center gap-1">
                <Signal className="h-3.5 w-3.5" />
                Mise à jour automatique — aucun rechargement nécessaire
              </span>
            </div>
          )}
        </>
        </AnalyticsErrorBoundary>
      )}
    </div>
  );
}
