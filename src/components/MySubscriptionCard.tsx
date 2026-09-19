import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Hourglass,
  Loader2,
  Sparkles,
  Timer,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ============================================================================
// « Mon abonnement » — période d'essai gratuite (7 jours) ou abonnement
// mensuel (30 jours).
// ============================================================================
// Toute la logique vient de `api.subscriptionStatus.getMySubscriptionStatus`
// (source de vérité unique, calculée côté serveur) : l'interface ne fait que
// présenter le résultat. Les compteurs de jours restants se décrémentent donc
// automatiquement, sans intervention manuelle, et la date de l'appareil du
// visiteur n'a aucune influence.

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatDate(ts?: number | null): string {
  if (!ts) return "—";
  return dateFmt.format(new Date(ts));
}

export function MySubscriptionCard() {
  const status = useQuery(api.subscriptionStatus.getMySubscriptionStatus);
  const startTrial = useMutation(api.subscriptionStatus.startMyTrial);
  const navigate = useNavigate();

  // Rattrapage : les comptes créés avant la mise en place de l'essai gratuit
  // démarrent leurs 7 jours à la première ouverture du tableau de bord.
  // Idempotent côté serveur (`trialClaimedAt` immuable) : un seul appel aboutit.
  const trialRequested = useRef(false);
  useEffect(() => {
    if (trialRequested.current) return;
    if (status?.trialShouldStart) {
      trialRequested.current = true;
      void startTrial();
    }
  }, [status?.trialShouldStart, startTrial]);

  if (status === undefined) {
    return (
      <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
        <CardContent className="flex items-center gap-2 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Chargement de votre abonnement…</span>
        </CardContent>
      </Card>
    );
  }

  if (status === null) return null;
  // Administrateurs : pas de période d'essai ni d'abonnement à afficher.
  if (status.status === "admin") return null;

  const isTrialPhase = status.type === "trial";
  const daysTotal = isTrialPhase ? status.trialDaysTotal : status.subscriptionDaysTotal;
  const daysRemaining = isTrialPhase ? status.trialDaysRemaining : status.subscriptionDaysRemaining;
  const startDate = isTrialPhase ? status.trialStartDate : status.subscriptionStartDate;
  const endDate = isTrialPhase ? status.trialEndDate : status.subscriptionEndDate;

  // Barre de progression = part de la période déjà consommée.
  const progress = daysTotal > 0
    ? Math.min(100, Math.max(0, ((daysTotal - daysRemaining) / daysTotal) * 100))
    : 0;

  const isExpiredPhase = status.status === "trial_expired" || status.status === "expired";
  const isPending = status.status === "pending";

  const copy = isTrialPhase
    ? {
        title: "Période d'essai",
        badge: status.isActive ? "🟢 Essai actif" : "🔴 Essai expiré",
        icon: Sparkles,
        tone: status.isActive ? "emerald" : "red",
        message: status.isActive
          ? "Profitez de votre période d’essai gratuit."
          : "Votre période d’essai gratuit est terminée. Veuillez choisir une offre pour continuer à utiliser la plateforme.",
      }
    : {
        title: "Abonnement mensuel",
        badge: isPending
          ? "⏳ Paiement en attente"
          : status.isActive
            ? "🟢 Abonnement actif"
            : "🔴 Abonnement expiré",
        icon: isPending ? Hourglass : CreditCard,
        tone: isPending ? "amber" : status.isActive ? "emerald" : "red",
        message: isPending
          ? "Votre paiement est en cours de validation par l'administrateur."
          : status.isActive
            ? "Votre abonnement mensuel est actif. Renouvellement requis à l'échéance."
            : "Votre abonnement est arrivé à expiration. Veuillez renouveler votre abonnement pour continuer.",
      };

  const Icon = copy.icon;
  const toneClasses: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <Card className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${toneClasses[copy.tone]}`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold sm:text-sm">{copy.title}</p>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 border-border/40 ${toneClasses[copy.tone]}`}
                >
                  {copy.badge}
                </Badge>
                {!isTrialPhase && status.planName && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {status.planName}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">{copy.message}</p>
            </div>
          </div>

          <Button
            size="sm"
            variant={isExpiredPhase ? "default" : "outline"}
            onClick={() => navigate("/dashboard/pricing")}
            className="h-7 shrink-0 gap-1 px-2.5 text-[10px] sm:text-xs"
          >
            {isExpiredPhase ? (
              <>
                <CreditCard className="h-3 w-3" />
                {isTrialPhase ? "Choisir une offre" : "Renouveler mon abonnement"}
              </>
            ) : (
              <>
                <CreditCard className="h-3 w-3" />
                Abonnement
              </>
            )}
          </Button>
        </div>

        {!isPending && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-medium sm:text-xs">
              <span className="text-muted-foreground">Jours restants</span>
              <span className={isExpiredPhase ? "text-red-600 dark:text-red-400" : "text-foreground"}>
                {daysRemaining} / {daysTotal} jours
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-3 sm:text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>
              Début : <span className="font-medium text-foreground">{formatDate(startDate)}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Timer className="h-3.5 w-3.5 shrink-0" />
            <span>
              Expiration : <span className="font-medium text-foreground">{formatDate(endDate)}</span>
            </span>
          </div>
          {!isTrialPhase && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              <span>
                Offre :{" "}
                <span className="font-medium text-foreground">
                  {status.planName ?? "—"}
                  {status.price != null && status.price > 0 ? ` · ${status.price} ${status.currency}` : ""}
                </span>
              </span>
            </div>
          )}
        </div>

        {isExpiredPhase && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200/30 bg-red-500/5 p-2.5 text-[10px] text-red-600 dark:text-red-400 sm:text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              L'accès aux services nécessitant un abonnement est suspendu. Souscrivez à une offre pour
              retrouver l'accès complet.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MySubscriptionCard;
