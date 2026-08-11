import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Lock, LayoutDashboard, CreditCard, ArrowRight } from "lucide-react";

// ============================================================================
// Bloque l'accès direct à une page de création quand le quota du forfait
// (projets construction / analyses investissement / plans architecturaux)
// est atteint. Redirige vers les forfaits pour racheter une formule.
// ============================================================================

export type QuotaType = "construction" | "investissement" | "plans";

const QUOTA_META: Record<
  QuotaType,
  { label: string; singular: string; singularDemo: string; plural: string }
> = {
  construction: { label: "projets de construction", singular: "projet", singularDemo: "projet", plural: "projets" },
  investissement: { label: "analyses d'investissement", singular: "analyse", singularDemo: "analyse", plural: "analyses" },
  plans: { label: "plans architecturaux", singular: "plan", singularDemo: "plan", plural: "plans" },
};

const PLAN_LABELS: Record<string, string> = {
  free: "Start",
  pro: "Pro",
  expert: "Expert",
};

export function RequireQuota({ type, children }: { type: QuotaType; children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const planLimits = useQuery(api.projects.getPlanLimits);
  const stats = useQuery(api.projects.getProjectStats);
  const analyses = useQuery(api.investments.listAnalyses);
  const plans = useQuery(api.architecturalPlans.getMyPlans);

  const meta = QUOTA_META[type];
  const userPlan = (user as any)?.subscriptionPlan ?? "free";

  const loading = planLimits === undefined || stats === undefined || analyses === undefined || plans === undefined;

  // Limite du forfait pour ce type de quota
  const limit =
    type === "construction"
      ? userPlan === "free"
        ? planLimits?.free ?? 1
        : userPlan === "pro"
        ? planLimits?.pro ?? 5
        : planLimits?.expert ?? 20
      : type === "investissement"
      ? userPlan === "free"
        ? planLimits?.freeInvestments ?? 1
        : userPlan === "pro"
        ? planLimits?.proInvestments ?? 5
        : planLimits?.expertInvestments ?? 20
      : userPlan === "free"
      ? planLimits?.freePlans ?? 1
      : userPlan === "pro"
      ? planLimits?.proPlans ?? 5
      : planLimits?.expertPlans ?? 20;

  // Utilisation actuelle pour ce type de quota
  const used =
    type === "construction"
      ? stats?.totalProjects ?? 0
      : type === "investissement"
      ? analyses?.length ?? 0
      : plans?.length ?? 0;

  const reached = used >= limit;

  // ── Écran de blocage ──
  if (!loading && reached) {
    const nextPlan = userPlan === "free" ? "pro" : userPlan === "pro" ? "expert" : null;
    const nextLimit =
      nextPlan === "pro"
        ? type === "construction"
          ? planLimits?.pro ?? 5
          : type === "investissement"
          ? planLimits?.proInvestments ?? 5
          : planLimits?.proPlans ?? 5
        : nextPlan === "expert"
        ? type === "construction"
          ? planLimits?.expert ?? 20
          : type === "investissement"
          ? planLimits?.expertInvestments ?? 20
          : planLimits?.expertPlans ?? 20
        : 0;

    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <Card className="border border-amber-200/70 dark:border-amber-800/50 bg-background/80 backdrop-blur-sm overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />
            <div className="p-6 sm:p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Lock className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-lg sm:text-xl font-bold">Limite de {meta.label} atteinte</h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Vous avez utilisé <strong className="text-foreground">{used}/{limit}</strong> {used <= 1 ? meta.singular : meta.plural}{" "}
                inclus dans votre forfait {PLAN_LABELS[userPlan] ?? userPlan}.
                {nextPlan
                  ? ` Passez à l'offre ${PLAN_LABELS[nextPlan]} pour créer jusqu'à ${nextLimit} ${meta.singularDemo}${nextLimit > 1 ? "s" : ""}.`
                  : " Vous avez atteint le quota maximum du forfait Expert."}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                {nextPlan ? (
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate("/dashboard/pricing")}>
                    <CreditCard className="h-4 w-4" />
                    Voir les forfaits
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate("/dashboard/pricing")}>
                    <CreditCard className="h-4 w-4" />
                    Payer une nouvelle formule
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4" />
                  Retour au tableau de bord
                </Button>
              </div>

              <p className="mt-5 text-[11px] text-muted-foreground">
                Votre historique reste disponible depuis votre tableau de bord.
              </p>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  // ── Chargement ──
  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Spinner className="h-5 w-5" />
          <p className="text-sm font-medium">Vérification de votre quota…</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
