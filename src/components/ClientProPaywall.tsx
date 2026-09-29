import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { CreditCard, Hourglass, Loader2, Lock, Sparkles } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ============================================================================
// ClientProPaywall — accès aux services Client Pro
// ============================================================================
// Règle : les services de la plateforme (projets de construction, projets
// d'investissement, matériaux IA, plans architecturaux, suivi de A à Z)
// nécessitent un abonnement Client Pro PAYANT actif. En cas d'expiration, le
// renouvellement est obligatoire. Exception : l'administrateur peut activer le
// « switch gratuit » sur le forfait Client Pro (accès sans paiement).

const REASON_COPY: Record<
  string,
  { icon: typeof Lock; title: string; desc: string; cta?: string }
> = {
  not_client_pro: {
    icon: Lock,
    title: "Offre Client Pro requise",
    desc: "Cet espace est réservé aux clients titulaires de l'offre Client Pro. Souscrivez à un abonnement payant actif pour accéder à l'ensemble des services : projets de construction, projets d'investissement, matériaux IA, plans architecturaux et suivi de A à Z.",
    cta: "Voir les offres",
  },
  plan_not_allowed_for_profile: {
    icon: Lock,
    title: "Abonnement incompatible avec votre profil",
    desc: "Votre type d'abonnement ne correspond pas à votre type de profil. Seule l'offre correspondant exactement à votre profil actif peut être souscrite : Client Pro → offre Client Pro, Expert → offre Expert, Fournisseur → offre Fournisseur. Régularisez votre abonnement pour retrouver l'accès.",
    cta: "Régulariser mon abonnement",
  },
  no_subscription: {
    icon: CreditCard,
    title: "Abonnement requis",
    desc: "Pour accéder aux services de la plateforme (projets de construction, projets d'investissement, matériaux IA, plans architecturaux et suivi de A à Z), passez au paiement : votre abonnement Client Pro doit être payant et actif.",
    cta: "Passer au paiement",
  },
  expired: {
    icon: CreditCard,
    title: "Abonnement expiré",
    desc: "Votre abonnement Client Pro a expiré. Le renouvellement est obligatoire pour maintenir l'accès à vos projets et à l'ensemble des services de la plateforme.",
    cta: "Renouveler mon abonnement",
  },
  trial_expired: {
    icon: Sparkles,
    title: "Votre période d'essai est terminée",
    desc: "Votre période d'essai gratuit est terminée. Veuillez choisir une offre pour continuer à utiliser la plateforme.",
    cta: "Choisir une offre",
  },
  pending: {
    icon: Hourglass,
    title: "Paiement en attente de validation",
    desc: "Votre paiement est en cours de validation par l'administrateur. L'accès à vos services sera activé dès confirmation.",
    // Sans cette action, l'utilisateur dont le paiement est en cours restait
    // bloqué sur cet écran : il peut désormais ouvrir la page Abonnements
    // (suivi de l'abonnement, moyen de paiement, envoi du reçu).
    cta: "Paiement",
  },
};

export function ClientProPaywall({ children }: { children: ReactNode }) {
  const access = useQuery(api.access.checkClientProAccess);
  const navigate = useNavigate();

  if (access === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (access.allowed) return <>{children}</>;

  const copy = REASON_COPY[access.reason] ?? REASON_COPY.no_subscription;
  const Icon = copy.icon;

  return (
    <Card className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-10">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold tracking-tight sm:text-lg">{copy.title}</h3>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {copy.desc}
        </p>
        {copy.cta && (
          <Button className="mt-2 gap-1.5" onClick={() => navigate("/dashboard/pricing")}>
            <CreditCard className="h-4 w-4" />
            {copy.cta}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
