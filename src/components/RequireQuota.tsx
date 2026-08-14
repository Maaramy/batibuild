import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Lock, LayoutDashboard, CreditCard, ArrowRight, RefreshCcw } from "lucide-react";

// ============================================================================
// Bloque l'accès direct à une page de création quand le quota du forfait est
// atteint. Un seul forfait (paiement unique) couvre tous les types :
//   - construction  → quotas de projets de construction
//   - investissement → quotas d'analyses d'investissement
//   - plans architecturaux → illimités pour tous (jamais bloqués)
// Quand le quota est épuisé, l'utilisateur renouvelle ses quotas ou passe à
// une offre supérieure (voir la page forfaits).
// ============================================================================

export type QuotaType = "construction" | "investissement" | "plans";

const QUOTA_META: Record<
  QuotaType,
  { label: string; singular: string; plural: string; icon?: typeof Lock }
> = {
  construction: { label: "projets de construction", singular: "projet", plural: "projets" },
  investissement: { label: "analyses d'investissement", singular: "analyse", plural: "analyses" },
  plans: { label: "plans architecturaux", singular: "plan", plural: "plans" },
};

const PLAN_LABELS: Record<string, string> = {
  free: "Start",
  pro: "Pro",
  expert: "Expert",
};

const NEXT_PLAN: Record<string, string | null> = { free: "pro", pro: "expert", expert: null };
const NEXT_LIMIT: Record<string, number | null> = { free: 5, pro: 20, expert: null };

export function RequireQuota({ type, children }: { type: QuotaType; children: ReactNode }) {
  const navigate = useNavigate();

  const quotas = useQuery(api.subscriptions.getMyQuotas);

  const meta = QUOTA_META[type];

  const loading = quotas === undefined;

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

  // Plans architecturaux : quota illimité pour tous les forfaits.
  if (type === "plans") {
    return <>{children}</>;
  }

  const quota =
    type === "construction"
      ? quotas?.construction
      : quotas?.investment;

  const limit = quota?.limit ?? 1;
  const used = quota?.used ?? 0;
  const plan = quota?.plan ?? "free";
  const reached = (quota?.reached ?? false) || used >= limit;

  // ── Écran de blocage ──
  if (reached) {
    const nextPlan = NEXT_PLAN[plan] ?? null;
    const nextLimit = nextPlan ? NEXT_LIMIT[nextPlan] : null;

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
                Vous avez utilisé <strong className="text-foreground">{Math.min(used, limit)}/{limit}</strong>{" "}
                {Math.min(used, limit) <= 1 ? meta.singular : meta.plural} inclus dans votre forfait{" "}
                {PLAN_LABELS[plan] ?? plan}.
                {nextPlan && nextLimit
                  ? ` Renouvelez vos quotas ou passez à l'offre ${PLAN_LABELS[nextPlan]} pour créer jusqu'à ${nextLimit} ${meta.singular}s.`
                  : " Vous avez atteint le quota maximum du forfait Expert — renouvelez vos quotas pour continuer."}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => navigate("/dashboard/pricing")}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Renouveler les quotas
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {nextPlan && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto gap-2"
                    onClick={() => navigate(`/dashboard/pricing?plan=${nextPlan}`)}
                  >
                    <CreditCard className="h-4 w-4" />
                    Passer à {PLAN_LABELS[nextPlan]}
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

  return <>{children}</>;
}
