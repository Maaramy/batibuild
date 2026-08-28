import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Globe, Activity, TrendingUp, BarChart3, MapPin } from "lucide-react";
import { useState } from "react";

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

export default function AnalyticsDashboard() {
  const [historyDays, setHistoryDays] = useState(7);
  const liveUsers = useQuery(api.analytics.getLiveUsers);
  const stats = useQuery(api.analytics.getStatsSummary);
  const history = useQuery(api.analytics.getConnectionHistory, { days: historyDays });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Analytique temps réel</h2>
            <p className="text-xs text-muted-foreground">
              Suivi des connexions utilisateurs par géolocalisation
            </p>
          </div>
        </div>
        {liveUsers && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold text-emerald-600">
              {liveUsers.total} en ligne
            </span>
          </div>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "En ligne maintenant", value: liveUsers?.total ?? 0, icon: Users, color: "text-emerald-600 bg-emerald-500/10" },
            { label: "Connexions 24h", value: stats.last24h, icon: Activity, color: "text-blue-600 bg-blue-500/10" },
            { label: "Connexions 7 jours", value: stats.last7d, icon: TrendingUp, color: "text-violet-600 bg-violet-500/10" },
            { label: "Sessions uniques", value: stats.uniqueSessions, icon: BarChart3, color: "text-amber-600 bg-amber-500/10" },
          ].map((stat) => (
            <Card key={stat.label} className="border border-border/40 bg-background/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-black tabular-nums">{stat.value.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live users table */}
        <Card className="border border-border/40 bg-background/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Utilisateurs en ligne
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveUsers === undefined ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted/20 animate-pulse" />
                ))}
              </div>
            ) : liveUsers.sessions.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucun utilisateur en ligne</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {liveUsers.sessions.map((session: { sessionId: string; country: string; city?: string; region?: string; page: string; connectedAt: number; lastSeenAt: number }) => {
                  const age = Math.floor((Date.now() - session.lastSeenAt) / 1000);
                  const ageLabel = age < 60 ? `${age}s` : `${Math.floor(age / 60)}min`;
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
                        <p className="text-[9px] text-muted-foreground truncate">{session.page}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
                        il y a {ageLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Country breakdown */}
        <Card className="border border-border/40 bg-background/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              Répartition par pays
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveUsers === undefined ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 rounded-lg bg-muted/20 animate-pulse" />
                ))}
              </div>
            ) : Object.keys(liveUsers.byCountry).length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune donnée de localisation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(liveUsers.byCountry as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([country, count]) => {
                    const pct = liveUsers.total > 0 ? Math.round((count / liveUsers.total) * 100) : 0;
                    return (
                      <div key={country} className="flex items-center gap-3">
                        <span className="text-sm">{getFlag(country)}</span>
                        <span className="text-xs font-medium flex-1">{country}</span>
                        <div className="w-24 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums w-12 text-right">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection history */}
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
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all ${
                    historyDays === opt.days
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {history === undefined ? (
            <div className="h-48 rounded-lg bg-muted/20 animate-pulse" />
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune donnée pour cette période</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-40 mb-2">
                {history.map((day: { date: string; connections: number; uniqueSessions: number; countries: Record<string, number> }) => {
                  const maxConn = Math.max(...history.map((d: { connections: number }) => d.connections), 1);
                  const height = Math.max((day.connections / maxConn) * 100, 4);
                  return (
                    <div
                      key={day.date}
                      className="flex-1 min-w-0 group relative"
                    >
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
              {/* Date labels */}
              <div className="flex gap-1">
                {history.map((day: { date: string; connections: number }) => (
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

      {/* Top countries all time */}
      {stats && stats.topCountries.length > 0 && (
        <Card className="border border-border/40 bg-background/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-500" />
              Top pays (tous les temps)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {stats.topCountries.map(([country, count]: [string, number]) => (
                <div
                  key={country}
                  className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                >
                  <span className="text-sm">{getFlag(country)}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold truncate">{country}</p>
                    <p className="text-[9px] text-muted-foreground tabular-nums">{count} visites</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
