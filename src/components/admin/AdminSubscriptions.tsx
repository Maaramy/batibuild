import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  Timer,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ============================================================================
// Forfaits mensuels — Abonnements (refonte)
//   Client      80 TND/mois
//   Fournisseur 120 TND/mois
//   Expert      120 TND/mois
//   Essai gratuit à l'inscription (2 mois par défaut, personnalisable par l'admin),
//   puis passage au paiement obligatoire à l'issue de l'essai.
// ============================================================================

const PLAN_LABELS: Record<string, string> = {
  free: "Client",
  pro: "Client Pro",
  supplier: "Fournisseur",
  expert: "Expert",
};

const PLAN_PRICES: Record<string, string> = {
  free: "80 TND/mois",
  pro: "—",
  supplier: "120 TND/mois",
  expert: "120 TND/mois",
};

const PLAN_BADGE: Record<string, string> = {
  free: "bg-blue-500/10 text-blue-600 border-blue-200/30",
  pro: "bg-indigo-500/10 text-indigo-600 border-indigo-200/30",
  supplier: "bg-violet-500/10 text-violet-600 border-violet-200/30",
  expert: "bg-emerald-500/10 text-emerald-600 border-emerald-200/30",
};

function formatDate(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type StatusInfo = { key: string; label: string; className: string };

/** Statut métier calculé : essai, actif, en attente, renouvellement requis… */
function computeStatus(sub: any): StatusInfo {
  const now = Date.now();
  if (sub.status === "pending") {
    return { key: "pending", label: "En attente de paiement", className: "bg-amber-500/10 text-amber-600 border-amber-200/30" };
  }
  if (sub.status === "canceled") {
    return { key: "canceled", label: "Annulé", className: "bg-muted/40 text-muted-foreground border-border/40" };
  }
  const expired = !sub.endDate || sub.endDate < now;
  if (sub.isTrial) {
    return expired
      ? { key: "trial_expired", label: "Essai terminé · Paiement requis", className: "bg-red-500/10 text-red-600 border-red-200/30" }
      : { key: "trial", label: "Essai gratuit", className: "bg-sky-500/10 text-sky-600 border-sky-200/30" };
  }
  if (sub.status === "active" && !expired) {
    return { key: "active", label: "Actif", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200/30" };
  }
  return { key: "expired", label: "Renouvellement requis", className: "bg-red-500/10 text-red-600 border-red-200/30" };
}

function needsRenewal(sub: any): boolean {
  const now = Date.now();
  if (sub.status === "pending" || sub.status === "canceled") return false;
  return !sub.endDate || sub.endDate < now;
}

export default function AdminSubscriptions() {
  const allSubs = useQuery(api.subscriptions.getAllSubscriptionsWithUsers) || [];
  const pendingSubs = useQuery(api.subscriptions.getPendingSubscriptions) || [];
  const pricing = useQuery(api.payments.getPublicPricing);

  const renewMutation = useMutation(api.subscriptions.adminRenewSubscription);
  const approveMutation = useMutation(api.subscriptions.adminApproveSubscription);
  const rejectMutation = useMutation(api.subscriptions.adminRejectSubscription);
  const saveTrial = useMutation(api.subscriptions.adminUpdateTrialConfig);

  const [search, setSearch] = useState("");
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialDays, setTrialDays] = useState(60);
  const [savingTrial, setSavingTrial] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Synchronise le formulaire d'essai avec la configuration en base
  useEffect(() => {
    if (!pricing) return;
    setTrialEnabled(pricing.trialEnabled ?? false);
    setTrialDays(pricing.trialDurationDays ?? 60);
  }, [pricing?.trialEnabled, pricing?.trialDurationDays]);

  const now = Date.now();
  const stats = useMemo(() => {
    const active = allSubs.filter(
      (s: any) => !s.isTrial && s.status === "active" && s.endDate && s.endDate > now,
    ).length;
    const trials = allSubs.filter((s: any) => s.isTrial && s.endDate && s.endDate > now).length;
    const renewal = allSubs.filter(needsRenewal).length;
    return { total: allSubs.length, active, trials, renewal, pending: pendingSubs.length };
  }, [allSubs, pendingSubs, now]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allSubs;
    const q = search.toLowerCase();
    return allSubs.filter((sub: any) =>
      (sub.user?.name || "").toLowerCase().includes(q) ||
      (sub.user?.email || "").toLowerCase().includes(q) ||
      (PLAN_LABELS[sub.plan] || sub.plan || "").toLowerCase().includes(q),
    );
  }, [allSubs, search]);

  const handleRenew = async (sub: any) => {
    setBusyId(sub._id);
    try {
      await renewMutation({ subscriptionId: sub._id });
      toast.success(`Abonnement ${PLAN_LABELS[sub.plan] || sub.plan} renouvelé (30 jours)`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du renouvellement");
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (id: any) => {
    setBusyId(id);
    try {
      await approveMutation({ subscriptionId: id });
      toast.success("Abonnement approuvé et activé");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: any) => {
    if (!window.confirm("Rejeter cette demande d'abonnement ?")) return;
    setBusyId(id);
    try {
      await rejectMutation({ subscriptionId: id });
      toast.success("Demande rejetée");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveTrial = async () => {
    setSavingTrial(true);
    try {
      await saveTrial({ enabled: trialEnabled, durationDays: trialDays });
      toast.success(trialEnabled
        ? `Essai gratuit activé (${trialDays} jours) — offert à l'inscription pour tous les profils`
        : "Essai gratuit désactivé");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSavingTrial(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── En-tête + statistiques ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Abonnements mensuels</h2>
            <p className="text-xs text-muted-foreground">
              Client 80 TND · Fournisseur 120 TND · Expert 120 TND — renouvellement mensuel (30 jours)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-44 sm:w-56 pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, cls: "text-primary bg-primary/10" },
          { label: "Actifs", value: stats.active, icon: Check, cls: "text-emerald-600 bg-emerald-500/10" },
          { label: "Essais gratuits", value: stats.trials, icon: Sparkles, cls: "text-sky-600 bg-sky-500/10" },
          { label: "Renouvellements requis", value: stats.renewal, icon: RefreshCcw, cls: "text-red-600 bg-red-500/10" },
          { label: "En attente", value: stats.pending, icon: Timer, cls: "text-amber-600 bg-amber-500/10" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/50 px-3 py-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.cls}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="truncate text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Période d'essai gratuite (personnalisable) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-sky-600" />
            Période d'essai gratuite
          </CardTitle>
          <CardDescription className="text-xs">
            2 mois gratuits offerts à l'inscription (tous les profils : Client, Fournisseur, Expert), puis passage au
            paiement obligatoire à l'issue de l'essai. Durée personnalisable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Switch checked={trialEnabled} onCheckedChange={setTrialEnabled} />
              <span className="text-xs font-medium">
                {trialEnabled ? "Essai activé" : "Essai désactivé"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                className="h-9 w-24 text-sm"
                disabled={!trialEnabled}
              />
              <span className="text-xs text-muted-foreground">jours gratuits</span>
            </div>
            <Button
              size="sm"
              onClick={handleSaveTrial}
              disabled={savingTrial || trialDays < 1 || trialDays > 365}
            >
              {savingTrial && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </Button>
          </div>
          {pricing?.trialEnabled && (
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-sky-600/80">
              <Sparkles className="h-3 w-3" />
              Nouveaux inscrits : {pricing.trialDurationDays ?? 60} jours gratuits, puis paiement du forfait.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Paiements en attente de validation ── */}
      {pendingSubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4 text-amber-600" />
              Paiements en attente de validation
              <Badge className="ml-1 bg-amber-500/10 text-amber-600 border-amber-200/30 text-[9px]">
                {pendingSubs.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Virements bancaires / D17 en attente — activez l'abonnement après réception du paiement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingSubs.map((sub: any) => (
              <div
                key={sub._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/40 px-3.5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0 border border-border/40">
                    <AvatarImage src={sub.user?.image || ""} alt="Photo" className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {sub.user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{sub.user?.name || sub.user?.email || "Non renseigné"}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {PLAN_LABELS[sub.plan] || sub.plan} · {sub.amount ? `${sub.amount} TND` : "—"} ·{" "}
                      {sub.paymentMethod === "bank_transfer" ? "Virement" : sub.paymentMethod === "d17" ? "D17" : sub.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {sub.paymentProofUrl && (
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] text-muted-foreground" asChild>
                      <a href={sub.paymentProofUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3" /> Reçu
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] text-emerald-600 border-emerald-200/40 hover:bg-emerald-50"
                    onClick={() => handleApprove(sub._id)}
                    disabled={busyId === sub._id}
                  >
                    {busyId === sub._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Activer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleReject(sub._id)}
                    disabled={busyId === sub._id}
                  >
                    <X className="h-3 w-3" />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Tableau des abonnements ── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Client</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs">Forfait</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs">Statut</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Début</span>
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Échéance</span>
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Montant</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <CreditCard className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm font-semibold">Aucun abonnement</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {search ? "Aucun résultat pour cette recherche." : "Les abonnements apparaîtront ici."}
                      </p>
                    </td>
                  </tr>
                )}
                {filtered.map((sub: any) => {
                  const st = computeStatus(sub);
                  const renew = needsRenewal(sub);
                  return (
                    <tr key={sub._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/[0.04] hover:to-transparent transition-all duration-150">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                            <AvatarImage src={sub.user?.image || ""} alt="Photo" className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {sub.user?.name?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold max-w-[140px]">
                              {sub.user?.name || sub.user?.email || "Utilisateur supprimé"}
                            </p>
                            <p className="truncate text-[9px] text-muted-foreground max-w-[140px]">{sub.user?.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-[9px] ${PLAN_BADGE[sub.plan] || "bg-muted/30 text-muted-foreground"}`}>
                          {PLAN_LABELS[sub.plan] || sub.plan}
                        </Badge>
                        <p className="mt-1 text-[9px] text-muted-foreground">{PLAN_PRICES[sub.plan] || "—"}</p>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-[9px] ${st.className}`}>
                          {st.key === "expired" || st.key === "trial_expired" ? (
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                          ) : null}
                          {st.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-[10px] text-muted-foreground hidden md:table-cell">
                        {formatDate(sub.startDate)}
                      </td>
                      <td className="py-3 px-3 text-[10px] text-muted-foreground hidden md:table-cell">
                        <span className={renew ? "font-semibold text-red-600" : ""}>{formatDate(sub.endDate)}</span>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell">
                        <span className="font-mono text-[10px] font-medium">
                          {sub.amount ? `${sub.amount.toLocaleString("fr-FR")} TND` : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {renew ? (
                          <Button
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => handleRenew(sub)}
                            disabled={busyId === sub._id}
                          >
                            {busyId === sub._id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-3 w-3" />
                            )}
                            Renouveler
                          </Button>
                        ) : sub.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-[10px] text-emerald-600 border-emerald-200/40"
                              onClick={() => handleApprove(sub._id)} disabled={busyId === sub._id}>
                              <Check className="h-3 w-3 mr-0.5" /> OK
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-red-600"
                              onClick={() => handleReject(sub._id)} disabled={busyId === sub._id}>
                              <X className="h-3 w-3 mr-0.5" /> Non
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Rappel des règles de gestion ── */}
      <div className="rounded-xl border border-primary/10 bg-primary/[0.03] px-4 py-3">
        <p className="text-[10px] font-semibold text-primary mb-1.5">Règles de gestion</p>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] text-muted-foreground">
          <li className="flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 shrink-0 text-sky-500 mt-0.5" />
            Essai gratuit de {pricing?.trialEnabled ? `${pricing.trialDurationDays ?? 60} jours` : "2 mois (si activé)"} à l'inscription, puis paiement obligatoire.
          </li>
          <li className="flex items-start gap-1.5">
            <RefreshCcw className="h-3 w-3 shrink-0 text-red-500 mt-0.5" />
            Renouvellement requis dès dépassement de la date d'échéance.
          </li>
          <li className="flex items-start gap-1.5">
            <CalendarDays className="h-3 w-3 shrink-0 text-primary mt-0.5" />
            Les dates de début et d'échéance sont suivies par abonnement (30 jours / mois).
          </li>
        </ul>
      </div>
    </div>
  );
}
