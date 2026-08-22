import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Eye, MousePointerClick, TrendingUp, MessageSquare, Star,
  ArrowLeft, Calendar, BarChart3, Lock, Crown,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart as RechartsBarChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Spinner } from "@/components/ui/spinner";

// ============================================================================
// Constants
// ============================================================================

const PERIODS = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "year", label: "Année" },
] as const;

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

function getStartTs(period: string): number {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (period) {
    case "7d": return now - 7 * day;
    case "30d": return now - 30 * day;
    case "90d": return now - 90 * day;
    case "year": return now - 365 * day;
    default: return now - 30 * day;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function ExpertStats() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "year">("30d");

  const expertProfile = useQuery(api.expertProfiles.getMyProfile);
  const isSubscribed = expertProfile?.subscriptionStatus === "active";

  // For now, show upgrade screen if not subscribed
  if (expertProfile === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  if (!isSubscribed) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard/expert")}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Statistiques</h1>
            </div>
          </div>
          <Card className="border-border/40">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Lock className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold">Statistiques réservées aux abonnés</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Souscrivez à l'abonnement Expert pour accéder à vos statistiques détaillées.
                </p>
              </div>
              <Button
                className="gap-1.5 text-sm bg-violet-600 hover:bg-violet-700"
                onClick={() => navigate("/dashboard/expert")}
              >
                <Crown className="h-4 w-4" />
                Voir l'abonnement
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Stats display for subscribed experts (placeholder data for now)
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/expert")}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Statistiques Expert</h1>
            <p className="text-xs text-muted-foreground">
              Suivez vos performances et votre visibilité
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1.5 bg-muted/30 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Vues du profil", value: "—", icon: Eye, color: "text-blue-600 bg-blue-50" },
            { label: "Demandes reçues", value: "—", icon: MessageSquare, color: "text-violet-600 bg-violet-50" },
            { label: "Réponses envoyées", value: "—", icon: MousePointerClick, color: "text-emerald-600 bg-emerald-50" },
            { label: "Taux de réponse", value: "—", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-border/40">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.color}`}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold">{kpi.value}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        <Card className="border-border/40">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Données en cours de collecte</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Les statistiques seront disponibles après avoir reçu des demandes de services.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
