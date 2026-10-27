import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Coins,
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
import { projectsLabel } from "@/lib/clientProCredits";

// ============================================================================
// « Mon abonnement » — deux droits INDÉPENDANTS
//   1. Cotisation Client Pro : crédits de projets (gratuité initiale unique,
//      puis packs payants). Aucun renouvellement mensuel.
//   2. Abonnement mensuel professionnel Expert / Fournisseur : essai gratuit
//      configurable, puis paiement mensuel. À l'expiration, le profil devient
//      invisible mais les données sont conservées.
//
// Toutes les décisions viennent du serveur (`getMyClientProCredits` et
// `getMySubscriptionStatus`) : cette carte ne fait qu'afficher.
// ============================================================================

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
  const credits = useQuery(api.clientProCredits.getMyClientProCredits);
  const startTrial = useMutation(api.subscriptionStatus.startMyTrial);
  const navigate = useNavigate();

  // Rattrapage de l'essai professionnel : idempotent côté serveur.
  const trialRequested = useRef(false);
  useEffect(() => {
    if (trialRequested.current) return;
    if (status?.trialShouldStart) {
      trialRequested.current = true;
      void startTrial();
    }
  }, [status?.trialShouldStart, startTrial]);

  if (status === undefined || credits === undefined) {
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
  if (status.status === "admin") return null;
  if (credits === null) return null;

  const balance = credits.balance;
  const creditProgress =
    balance.granted > 0 ? Math.min(100, (balance.used / balance.granted) * 100) : 100;
  const creditsExhausted = balance.remaining <= 0;
  const entitled = credits.entitled;

  const professionalRole =
    status.profileRole === "expert" || status.profileRole === "supplier"
      ? status.profileRole
      : null;
  const showProfessional = professionalRole != null;
  const isProfessionalTrial = status.type === "trial" && status.status === "trialing";
  const professionalDaysTotal = isProfessionalTrial
    ? status.trialDaysTotal
    : status.subscriptionDaysTotal;
  const professionalDaysRemaining = isProfessionalTrial
    ? status.trialDaysRemaining
    : status.subscriptionDaysRemaining;
  const professionalEndDate = isProfessionalTrial
    ? status.trialEndDate
    : status.subscriptionEndDate;
  const professionalProgress =
    professionalDaysTotal > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((professionalDaysTotal - professionalDaysRemaining) / professionalDaysTotal) * 100,
          ),
        )
      : 0;
  const professionalLabel = professionalRole === "expert" ? "Expert" : "Fournisseur";

  return (
    <Card className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="space-y-4 p-3 sm:p-4">
        {/* ── 1. Cotisation Client Pro ─────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
                  entitled
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold sm:text-sm">Cotisation Client Pro</p>
                  <Badge
                    variant="outline"
                    className={`border-border/40 text-[9px] px-1.5 py-0 ${
                      creditsExhausted
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {creditsExhausted ? "Crédits épuisés" : `${balance.remaining} restant${balance.remaining > 1 ? "s" : ""}`}
                  </Badge>
                  {credits.legacyMonthlyActive && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      Mensuel historique actif
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                  {credits.freeGranted
                    ? `${projectsLabel(balance.granted)} au total, ${balance.used} utilisé${balance.used > 1 ? "s" : ""}.`
                    : `Gratuité initiale ${credits.config.freeGrantEnabled ? "en cours d'activation" : "désactivée"} — ${projectsLabel(balance.granted)} au total.`}{" "}
                  Chaque nouveau projet consomme un crédit. Aucun renouvellement mensuel.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant={creditsExhausted ? "default" : "outline"}
              onClick={() => navigate("/dashboard/pricing")}
              className="h-7 shrink-0 gap-1 px-2.5 text-[10px] sm:text-xs"
            >
              <CreditCard className="h-3 w-3" />
              {creditPackageCta(creditsExhausted)}
            </Button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-medium sm:text-xs">
              <span className="text-muted-foreground">Projets utilisés / restants</span>
              <span className={creditsExhausted ? "text-amber-600" : "text-foreground"}>
                {balance.used} utilisés · {balance.remaining} restants / {balance.granted}
              </span>
            </div>
            <Progress value={creditProgress} className="h-2" />
          </div>

          {creditsExhausted &&
            (credits.canCreateProject ? (
              // Période d'accès en cours (essai / abonnement payé) : la création
              // reste ouverte, mais le quota de cotisation est bien épuisé.
              <div className="flex items-start gap-2 rounded-lg border border-blue-200/40 bg-blue-500/5 p-2.5 text-[10px] text-blue-700 dark:text-blue-400 sm:text-xs">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Votre quota de projets est épuisé. Votre période d'accès en cours couvre encore
                  la création de projets ; achetez des projets supplémentaires pour continuer
                  après son terme.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200/40 bg-amber-500/5 p-2.5 text-[10px] text-amber-700 dark:text-amber-400 sm:text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Votre quota de projets est épuisé. Achetez des projets supplémentaires pour
                  continuer. Les projets existants restent accessibles et modifiables.
                </span>
              </div>
            ))}
        </div>

        {/* ── 2. Abonnement professionnel (Expert / Fournisseur) ───────── */}
        {showProfessional && (
          <div className="space-y-3 border-t border-border/20 pt-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
                    isProfessionalTrial
                      ? "bg-blue-500/10 text-blue-600"
                      : status.isActive
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {status.status === "pending" ? (
                    <Hourglass className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : isProfessionalTrial ? (
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <BriefcaseBusiness className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold sm:text-sm">
                      Abonnement mensuel {professionalLabel}
                    </p>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {status.status === "pending"
                        ? "Paiement en attente"
                        : isProfessionalTrial
                          ? `Essai ${professionalLabel}`
                          : status.isActive
                            ? "Actif"
                            : status.status === "none"
                              ? "Aucun abonnement"
                              : "Expiré"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                    {isProfessionalTrial
                      ? `Essai ${professionalLabel} : votre profil est visible. À l'expiration, un abonnement mensuel payant est requis — aucun prélèvement automatique.`
                      : status.isActive
                        ? "Abonnement professionnel actif : votre profil est visible dans l'annuaire. Renouvellement mensuel après paiement confirmé."
                        : status.status === "pending"
                          ? "Votre paiement professionnel est en cours de validation. Votre profil sera rétabli dès confirmation."
                          : "Votre profil est temporairement invisible. Souscrivez ou renouvelez votre abonnement pour rétablir vos services — vos données sont conservées."}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant={status.isActive ? "outline" : "default"}
                onClick={() => navigate("/dashboard/pricing")}
                className="h-7 shrink-0 gap-1 px-2.5 text-[10px] sm:text-xs"
              >
                <CreditCard className="h-3 w-3" />
                {status.isActive ? "Abonnement" : "Souscrire"}
              </Button>
            </div>

            {!status.status.startsWith("none") && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-medium sm:text-xs">
                  <span className="text-muted-foreground">
                    {isProfessionalTrial ? "Jours d'essai restants" : "Jours restants"}
                  </span>
                  <span className={status.isActive ? "text-foreground" : "text-red-600"}>
                    {professionalDaysRemaining} / {professionalDaysTotal} jours
                  </span>
                </div>
                <Progress value={professionalProgress} className="h-2" />
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
              <Timer className="h-3.5 w-3.5 shrink-0" />
              <span>
                {isProfessionalTrial ? "Fin de l'essai" : "Expiration"} :{" "}
                <span className="font-medium text-foreground">{formatDate(professionalEndDate)}</span>
              </span>
            </div>

            {status.planCompatible === false && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200/40 bg-amber-500/5 p-2.5 text-[10px] text-amber-600 dark:text-amber-400 sm:text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Abonnement incompatible avec le profil « {status.profileRoleLabel ?? status.profileRole} ».
                  Souscrivez à l'offre {status.expectedPlanLabel ?? status.expectedPlan} pour régulariser.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function creditPackageCta(_exhausted: boolean): string {
  return "Acheter des crédits";
}

export default MySubscriptionCard;
