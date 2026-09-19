import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Hourglass,
  Loader2,
  Search,
  Shield,
  Sparkles,
  Timer,
  TrendingUp,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================================
// ADMIN — Essais & abonnements
// ============================================================================
// Vue de contrôle : pour chaque utilisateur, l'état de sa période d'essai
// gratuite (7 jours) et de son abonnement mensuel (30 jours), avec dates et
// jours restants. Les valeurs proviennent de `listUsersSubscriptionStatus`,
// donc de la même source de vérité que « Mon abonnement » et le contrôle
// d'accès Client Pro.
//
// Les deux interrupteurs « Offre gratuite » (activation/désactivation du
// forfait) restent dans l'onglet « Abonnements » du panneau d'administration.

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const formatDate = (ts?: number | null) => (ts ? dateFmt.format(new Date(ts)) : "—");

type Phase = string;

const PHASE_STYLES: Record<Phase, { label: string; className: string }> = {
  trialing: { label: "🟢 Essai actif", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200/30" },
  trial_available: { label: "🟡 Essai disponible", className: "bg-amber-500/10 text-amber-600 border-amber-200/30" },
  trial_expired: { label: "🔴 Essai expiré", className: "bg-red-500/10 text-red-600 border-red-200/30" },
  active: { label: "🟢 Abonnement actif", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200/30" },
  expired: { label: "🔴 Abonnement expiré", className: "bg-red-500/10 text-red-600 border-red-200/30" },
  pending: { label: "⏳ Paiement en attente", className: "bg-amber-500/10 text-amber-600 border-amber-200/30" },
  admin: { label: "🛡️ Administrateur", className: "bg-blue-500/10 text-blue-600 border-blue-200/30" },
  none: { label: "⚪ Aucun accès", className: "bg-muted text-muted-foreground border-border/40" },
};

export default function SubscriptionAdminPage() {
  usePageSEO({
    title: "Essais & abonnements - Administration batibuild App",
    description: "Suivi des périodes d'essai gratuites et des abonnements mensuels.",
  });

  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const rows = useQuery(api.subscriptionStatus.listUsersSubscriptionStatus);
  const [query, setQuery] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  const filtered = useMemo(() => {
    const list = rows ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (row) =>
        (row.name ?? "").toLowerCase().includes(q) || (row.email ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const counts = useMemo(() => {
    const list = rows ?? [];
    const by = (status: string) => list.filter((r) => r.snapshot.status === status).length;
    return {
      total: list.length,
      trialing: by("trialing"),
      trialAvailable: by("trial_available"),
      trialExpired: by("trial_expired"),
      active: by("active"),
      expired: by("expired"),
      pending: by("pending"),
    };
  }, [rows]);

  if (isLoading || rows === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md border border-border/40">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Shield className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-base font-bold">Accès réservé à l'administration</h1>
            <p className="text-xs text-muted-foreground">
              Cette page permet de suivre les périodes d'essai et les abonnements de tous les
              utilisateurs.
            </p>
            <Button size="sm" onClick={() => navigate("/dashboard")}>
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Essais actifs", value: counts.trialing, icon: Sparkles, tone: "text-emerald-600" },
    { label: "Essais disponibles", value: counts.trialAvailable, icon: Hourglass, tone: "text-amber-600" },
    { label: "Essais expirés", value: counts.trialExpired, icon: Timer, tone: "text-red-600" },
    { label: "Abonnements actifs", value: counts.active, icon: CreditCard, tone: "text-emerald-600" },
    { label: "Abonnements expirés", value: counts.expired, icon: TrendingUp, tone: "text-red-600" },
    { label: "Paiements en attente", value: counts.pending, icon: Hourglass, tone: "text-amber-600" },
  ];

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/dashboard/admin")}>
            <ArrowLeft className="h-4 w-4" />
            Administration
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">Essais & abonnements</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border border-border/40 bg-background/50">
              <CardContent className="flex items-center gap-2 p-3">
                <stat.icon className={`h-4 w-4 shrink-0 ${stat.tone}`} />
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">{stat.value}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-border/40 bg-background/50">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Utilisateurs ({counts.total})</CardTitle>
              <CardDescription className="text-xs">
                Essai gratuit de 7 jours puis abonnement mensuel de 30 jours. Les jours restants sont
                calculés depuis l'horloge serveur.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom ou e-mail…"
                className="h-9 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Utilisateur</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Essai — début</TableHead>
                    <TableHead className="text-xs">Essai — fin</TableHead>
                    <TableHead className="text-xs">Jours restants</TableHead>
                    <TableHead className="text-xs">Abonnement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        Aucun utilisateur trouvé.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((row) => {
                    const style = PHASE_STYLES[row.snapshot.status] ?? PHASE_STYLES.none;
                    const isTrial = row.snapshot.type === "trial";
                    const days = isTrial
                      ? row.snapshot.trialDaysRemaining
                      : row.snapshot.subscriptionDaysRemaining;
                    const total = isTrial
                      ? row.snapshot.trialDaysTotal
                      : row.snapshot.subscriptionDaysTotal;
                    return (
                      <TableRow key={row.userId}>
                        <TableCell className="text-xs">
                          <div className="font-medium">{row.name ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground">{row.email ?? "—"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${style.className}`}>
                            {style.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(row.snapshot.trialStartDate)}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.snapshot.trialEndDate)}</TableCell>
                        <TableCell className="text-xs">
                          {isTrial ? `${days} / ${total} j` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.snapshot.subscriptionEndDate ? (
                            <div>
                              <div className="font-medium">
                                {row.snapshot.planName ?? row.snapshot.plan ?? "—"}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                expire le {formatDate(row.snapshot.subscriptionEndDate)} ·{" "}
                                {row.snapshot.subscriptionDaysRemaining} /{" "}
                                {row.snapshot.subscriptionDaysTotal} j
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-200/20 bg-amber-500/5">
          <CardContent className="p-4 text-[11px] text-amber-700 dark:text-amber-400">
            <p>
              <strong>Offre gratuite</strong> : activer le forfait Client Pro à 0 TND (onglet
              « Abonnements » du panneau d'administration) déclenche, pour chaque nouveau compte, une
              période d'essai de <strong>7 jours</strong> exactement. Passé ce délai, l'accès aux
              services est suspendu jusqu'à la souscription d'une offre payante. Un compte ne peut
              jamais bénéficier d'un second essai gratuit.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
