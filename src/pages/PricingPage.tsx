import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, ChevronRight, HardHat, Loader2, Star, Shield } from "lucide-react";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "free",
    name: "Gratuit",
    price: "0",
    period: "TND/mois",
    description: "Pour démarrer avec des projets simples",
    features: [
      "3 projets par mois",
      "Estimation de base",
      "Analyse IA standard",
      "Export PDF",
      "Support email",
    ],
    gradient: "from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30",
  },
  {
    id: "pro",
    name: "Pro",
    price: "49",
    period: "TND/mois",
    description: "Pour les professionnels de la construction",
    features: [
      "Projets illimités",
      "Analyse IA avancée",
      "Export PDF, Excel, CSV",
      "Rapports détaillés",
      "Comparaison de projets",
      "Historique complet",
      "Support prioritaire",
    ],
    popular: true,
    gradient: "from-blue-500/10 to-violet-500/10 dark:from-blue-500/20 dark:to-violet-500/20",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "149",
    period: "TND/mois",
    description: "Pour les entreprises et bureaux d'études",
    features: [
      "Tout ce qui est inclus dans Pro",
      "Utilisateurs multiples (jusqu'à 10)",
      "API dédiée",
      "Intégration personnalisée",
      "Gestion des équipes",
      "Support dédié 24/7",
      "SLA garanti",
      "Formation incluse",
    ],
    gradient: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const currentSubscription = useQuery(api.subscriptions.getMySubscription);
  const createSubscription = useMutation(api.subscriptions.createSubscription);
  const cancelSubscription = useMutation(api.subscriptions.cancelSubscription);

  const currentPlan = user?.subscriptionPlan || "free";

  const handleSelectPlan = async (planId: string) => {
    if (planId === "free") {
      if (currentPlan !== "free") {
        await cancelSubscription();
      }
      return;
    }

    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    // For paid plans, show the subscription flow
    await createSubscription({
      plan: planId as any,
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center h-16">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardHat className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm">Abonnement</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            Abonnement actuel: {currentPlan === "free" ? "Gratuit" : currentPlan === "pro" ? "Pro" : "Enterprise"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Choisissez votre offre</h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Passez à une offre supérieure pour débloquer plus de fonctionnalités.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PLANS.map((plan, index) => {
            const isCurrentPlan = currentPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`relative flex flex-col rounded-2xl border p-6 lg:p-8 transition-all duration-300 hover:shadow-xl ${
                  plan.popular
                    ? "border-primary/30 bg-gradient-to-b from-primary/5 to-background shadow-lg shadow-primary/5 scale-[1.02]"
                    : "border-border/50 bg-background/50 backdrop-blur-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Populaire
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="secondary" className="px-3 py-0.5 text-xs">
                      Actuel
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">/{plan.period}</span>
                </div>

                <ul className="mb-8 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular || isCurrentPlan ? "default" : "outline"}
                  className="w-full h-11 text-sm gap-1"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan && plan.id === "free"}
                >
                  {isCurrentPlan
                    ? "Offre actuelle"
                    : plan.id === "free"
                    ? "Rester gratuit"
                    : `Choisir ${plan.name}`}
                  {!isCurrentPlan && plan.id !== "free" && <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
