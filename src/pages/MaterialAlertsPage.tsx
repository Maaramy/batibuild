import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Database,
  History,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingDown,
  TrendingUp,
  Target,
} from "lucide-react";

type Direction = "below" | "above" | "change";

const DIRECTION_META: Record<
  Direction,
  { label: string; icon: typeof TrendingDown; cls: string }
> = {
  below: {
    label: "Sous un seuil",
    icon: TrendingDown,
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  above: {
    label: "Dépassement de seuil",
    icon: TrendingUp,
    cls: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  change: {
    label: "Variation en %",
    icon: Target,
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

function fmt(value: number, currency = "TND"): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MaterialAlertsPage() {
  usePageSEO({
    title: "Alertes prix matériaux — BatiBuild",
    description:
      "Suivez les prix des matériaux de construction et recevez une notification dès qu'un seuil ou une variation est atteint.",
  });
  const navigate = useNavigate();
  const alerts = useQuery(api.materialAlerts.getMyAlerts, {});
  const toggleAlert = useMutation(api.materialAlerts.toggleAlert);
  const deleteAlert = useMutation(api.materialAlerts.deleteAlert);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => alerts ?? [], [alerts]);
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active).length;
    const triggered = rows.filter((r) => r.triggerCount > 0).length;
    return { total: rows.length, active, triggered };
  }, [rows]);

  const onToggle = async (id: string) => {
    setBusy(id);
    try {
      await toggleAlert({ alertId: id as never });
    } catch {
      toast.error("Impossible de modifier l'alerte");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    setBusy(id);
    try {
      await deleteAlert({ alertId: id as never });
      toast.success("Alerte supprimée");
    } catch {
      toast.error("Impossible de supprimer l'alerte");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.02] via-background to-background pb-12">
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => navigate("/dashboard/materials")}
              aria-label="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground leading-tight">BatiBuild · Matériaux</p>
              <h1 className="text-xs sm:text-sm font-semibold leading-tight">Alertes prix</h1>
            </div>
          </div>
          <Button asChild size="sm" className="h-8 gap-1.5 shrink-0">
            <Link to="/dashboard/materials">
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Parcourir les matériaux</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Alertes", value: stats.total, icon: Bell },
            { label: "Actives", value: stats.active, icon: ToggleRight },
            { label: "Déclenchées", value: stats.triggered, icon: History },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-background to-muted/20 border border-border/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-extrabold tabular-nums leading-tight">{s.value}</p>
                <p className="text-[9px] text-muted-foreground/70 leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {alerts === undefined ? (
          <Card className="border border-border/40 rounded-xl">
            <CardContent className="p-10 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="border border-border/40 rounded-xl">
            <CardContent className="p-10 text-center space-y-3">
              <BellOff className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium">Aucune alerte configurée</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ouvrez la fiche d'un matériau et créez une alerte pour être notifié lorsqu'un prix
                baisse, dépasse un seuil ou varie fortement.
              </p>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/dashboard/materials">
                  <Database className="h-3.5 w-3.5" />
                  Explorer la base matériaux
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((a, idx) => {
              const meta = DIRECTION_META[a.direction as Direction] ?? DIRECTION_META.change;
              const Icon = meta.icon;
              const rule =
                a.direction === "change"
                  ? `Variation ≥ ${a.thresholdPercent ?? 5} %`
                  : `${a.direction === "below" ? "Sous" : "Au-dessus de"} ${fmt(
                      a.targetPrice ?? 0,
                      a.currency,
                    )}`;
              return (
                <motion.div
                  key={a._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="rounded-xl border border-border/40 bg-background/70 p-3 sm:p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={`text-[10px] border gap-1 ${meta.cls}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                        {!a.active && (
                          <Badge variant="outline" className="text-[10px]">
                            Désactivée
                          </Badge>
                        )}
                        {a.triggerCount > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {a.triggerCount} déclenchement(s)
                          </Badge>
                        )}
                      </div>
                      <Link
                        to={`/dashboard/materials/${a.materialId}`}
                        className="mt-1.5 block text-sm font-semibold hover:text-emerald-700 dark:hover:text-emerald-400 truncate"
                      >
                        {a.materialName}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {rule} · Prix actuel {fmt(a.materialPrice, a.currency)} / {a.materialUnit}
                      </p>
                      {a.note && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground/80">{a.note}</p>
                      )}
                      <p className="mt-0.5 text-[9px] text-muted-foreground/60">
                        Créée le {fmtDate(a.createdAt)}
                        {a.lastTriggeredAt ? ` · dernière alerte ${fmtDate(a.lastTriggeredAt)}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={a.active ? "Désactiver" : "Activer"}
                        disabled={busy === a._id}
                        onClick={() => onToggle(a._id)}
                      >
                        {busy === a._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : a.active ? (
                          <ToggleRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        aria-label="Supprimer"
                        disabled={busy === a._id}
                        onClick={() => onDelete(a._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
