import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  Coins,
  Copy,
  CreditCard,
  HardHat,
  Image,
  Landmark,
  Loader2,
  Shield,
  Smartphone,
  Sparkles,
  Truck,
  Upload,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MySubscriptionCard } from "@/components/MySubscriptionCard";
import { availablePaymentMethods } from "@/lib/paymentMethods";
import { planPriceLabel } from "@/lib/planPricing";
import {
  PROFESSIONAL_SERVICES,
  trialDurationLabel,
} from "@/lib/subscriptionPlans";
import {
  projectsLabel,
  type ClientProCreditPackage,
} from "@/lib/clientProCredits";

// ============================================================================
// PAGE ABONNEMENTS
// ----------------------------------------------------------------------------
// Deux dispositifs totalement séparés :
//
//   1. COTISATION CLIENT PRO — crédits de projets.
//      Gratuité initiale unique (réglée par l'admin), puis packs de projets.
//      Aucun abonnement mensuel, aucun renouvellement automatique.
//
//   2. ABONNEMENT MENSUEL EXPERT / FOURNISSEUR.
//      Essai gratuit configurable, puis paiement mensuel confirmé. À l'expiration
//      le profil devient invisible ; les données sont conservées.
//
//   Un professionnel peut cumuler les deux : l'achat Client Pro n'active jamais
//   l'abonnement professionnel, et inversement.
//
// Aucun prix n'est codé en dur : tout vient de Convex (`getPublicPricing`,
// `getMyClientProCredits`). Tant que la configuration charge, aucun montant
// n'est envoyé.
// ============================================================================

type PlanId = "expert" | "supplier";
type Intent = { kind: "credits"; pack: ClientProCreditPackage } | { kind: "plan"; plan: PlanId } | null;

const PAYMENT_FALLBACK = {
  bankName: "Banque de Tunisie (BT)",
  bankTitulaire: "GALISKON PROJECT",
  bankRib: "07 001 1234567890123 47",
  bankIban: "TN59 0700 1123 4567 8901 2347",
  bankSwift: "BTBK TN TT",
  d17MerchantName: "GALISKON PROJECT",
  d17Phone: "+216 XX XXX XXX",
  d17Email: "paiement@batibuild.app",
  d17Notice: "Envoyez le paiement via l'application D17 de La Poste Tunisienne",
  currency: "TND",
};

function PaymentField({
  label,
  value,
  copyable,
  onCopy,
  isCopied,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy: (value: string, label: string) => void;
  isCopied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{value}</span>
      {copyable && (
        <button
          onClick={() => onCopy(value, label)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          title={`Copier ${label}`}
        >
          {isCopied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

export default function PricingPage() {
  usePageSEO({
    title: "Abonnements et cotisations - batibuild",
    description:
      "Cotisation Client Pro par projets, abonnements mensuels Expert et Fournisseur : choisissez le dispositif adapté à votre profil.",
  });

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const paymentConfig = useQuery(api.payments.getPublicPricing);
  const credits = useQuery(api.clientProCredits.getMyClientProCredits);
  const myOrders = useQuery(api.clientProCredits.getMyClientProOrders) ?? [];
  const subscription = useQuery(api.subscriptions.getMySubscription);
  const profileRole = useQuery(api.profileSubscription.getMyProfileRole);
  const status = useQuery(api.subscriptionStatus.getMySubscriptionStatus);

  const requestCotisation = useMutation(api.clientProCredits.requestClientProCotisation);
  const cancelOrder = useMutation(api.clientProCredits.cancelClientProOrder);
  const uploadCotisationProof = useMutation(api.clientProCredits.uploadClientProPaymentProof);
  const createSubscription = useMutation(api.subscriptions.createSubscription);
  const uploadPaymentProof = useMutation(api.subscriptions.uploadPaymentProof);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [intent, setIntent] = useState<Intent>(null);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const paymentRef = useRef<HTMLDivElement>(null);

  const config = paymentConfig as any;
  const currency = config?.currency ?? PAYMENT_FALLBACK.currency;
  const paymentMethods = availablePaymentMethods(config?.paymentMethods);
  const paymentMethodsSignature = paymentMethods.map((m) => m.slug).join("|");

  useEffect(() => {
    if (paymentMethods.length === 0) return;
    if (!paymentMethods.some((m) => m.slug === paymentMethod)) {
      setPaymentMethod(paymentMethods[0].slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethodsSignature]);

  const pendingOrder = myOrders.find((order: any) => order.status === "pending");
  const isPendingSubscription = subscription?.status === "pending";

  const professionalRole: PlanId | null =
    profileRole === "expert" ? "expert" : profileRole === "supplier" ? "supplier" : null;

  const rolePlan = professionalRole
    ? config
      ? {
          expert: {
            price: config.expertPrice,
            trialEnabled: config.expertTrialEnabled === true,
            trialDays: config.expertTrialDays ?? 7,
            services: config.expertIncludedServices,
            autoRenew: config.expertAutoRenew !== false,
          },
          supplier: {
            price: config.supplierPrice,
            trialEnabled: config.supplierTrialEnabled === true,
            trialDays: config.supplierTrialDays ?? 7,
            services: config.supplierIncludedServices,
            autoRenew: config.supplierAutoRenew !== false,
          },
        }[professionalRole]
      : null
    : null;

  const selectedAmount = useMemo(() => {
    if (!intent) return null;
    if (intent.kind === "credits") return intent.pack.price;
    const plan = professionalRole ? rolePlan : null;
    if (!plan) return null;
    return plan.price;
  }, [intent, professionalRole, rolePlan]);

  const amountLabel =
    selectedAmount === null
      ? "—"
      : selectedAmount === 0
        ? "Gratuit"
        : `${selectedAmount} ${currency}`;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const scrollToPayment = () =>
    setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

  const requireAuth = (): boolean => {
    if (isAuthenticated) return true;
    navigate("/auth?returnTo=/dashboard/pricing");
    return false;
  };

  const handleSelectPack = (pack: ClientProCreditPackage) => {
    if (!requireAuth()) return;
    setIntent({ kind: "credits", pack });
    scrollToPayment();
  };

  const handleSelectPlan = () => {
    if (!requireAuth() || !professionalRole) return;
    setIntent({ kind: "plan", plan: professionalRole });
    scrollToPayment();
  };

  const handleConfirm = async () => {
    if (!intent) return;
    if (selectedAmount === null) {
      toast.error("La configuration des tarifs est en cours de chargement. Réessayez dans un instant.");
      return;
    }
    if (selectedAmount > 0 && paymentMethods.length === 0) {
      toast.error("Aucune méthode de paiement n'est disponible. Contactez le support batibuild.");
      return;
    }

    setBusy(true);
    try {
      if (intent.kind === "credits") {
        await requestCotisation({
          projects: intent.pack.projects,
          paymentMethod: selectedAmount > 0 ? paymentMethod : undefined,
        });
        toast.success(
          "Demande de cotisation envoyée. Les projets seront ajoutés après confirmation du paiement.",
        );
        setIntent(null);
      } else {
        const plan = rolePlan;
        if (!plan) return;
        const free = plan.price === null || plan.price === 0;
        await createSubscription({
          plan: intent.plan,
          paymentMethod: free ? undefined : paymentMethod,
          amount: free ? 0 : plan.price,
          currency,
        });
        toast.success(
          free
            ? "Abonnement professionnel gratuit activé."
            : paymentMethod === "d17"
              ? "Demande envoyée. En attente de validation du paiement D17."
              : "Demande envoyée. En attente de validation du virement.",
        );
        setIntent(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'enregistrer la demande.");
    } finally {
      setBusy(false);
    }
  };

  const uploadProof = async (
    file: File,
    kind: "credits" | "plan",
    targetId: string,
  ) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Format accepté : image (JPG, PNG) ou PDF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Échec de l'upload");
      const { storageId } = await res.json();
      const url = `${window.location.origin}/api/storage/${storageId}`;
      if (kind === "credits") {
        await uploadCotisationProof({
          orderId: targetId as any,
          storageId: storageId as any,
          url,
          fileName: file.name,
        });
      } else {
        await uploadPaymentProof({
          subscriptionId: targetId as any,
          storageId: storageId as any,
          url,
          fileName: file.name,
        });
      }
      toast.success("Justificatif joint à votre demande.");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi du justificatif.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!pendingOrder) return;
    if (!window.confirm("Annuler cette demande de cotisation ? Aucun crédit n'a été attribué.")) return;
    try {
      await cancelOrder({ orderId: pendingOrder._id });
      toast.success("Demande annulée.");
    } catch (err: any) {
      toast.error(err?.message || "Annulation impossible.");
    }
  };

  const bankInfo = {
    bank: config?.bankName || PAYMENT_FALLBACK.bankName,
    titulaire: config?.bankTitulaire || PAYMENT_FALLBACK.bankTitulaire,
    rib: config?.bankRib || PAYMENT_FALLBACK.bankRib,
    iban: config?.bankIban || PAYMENT_FALLBACK.bankIban,
    swift: config?.bankSwift || PAYMENT_FALLBACK.bankSwift,
  };
  const d17Info = {
    merchantName: config?.d17MerchantName || PAYMENT_FALLBACK.d17MerchantName,
    phone: config?.d17Phone || PAYMENT_FALLBACK.d17Phone,
    email: config?.d17Email || PAYMENT_FALLBACK.d17Email,
    notice: config?.d17Notice || PAYMENT_FALLBACK.d17Notice,
  };

  const loading = paymentConfig === undefined || credits === undefined;
  const balance = credits?.balance;
  const exhausted = (balance?.remaining ?? 0) <= 0;
  const canStack = credits?.config.allowStacking !== false;
  const purchasesDisabled = !!pendingOrder || (exhausted === false && !canStack);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardHat className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">Abonnements & cotisations</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          {/* Libellé long : sur mobile il occupe toute la largeur disponible,
              passe à la ligne et reste centré (zone tactile ≥ 44 px) ; à partir
              de `sm` il reprend exactement l'aspect d'origine (une seule ligne,
              largeur ajustée au contenu). */}
          <Badge
            variant="outline"
            className="mx-auto mb-3 flex min-h-11 w-full max-w-full flex-wrap items-center justify-center gap-1.5 whitespace-normal px-3 py-2.5 text-center text-xs leading-snug font-medium sm:inline-flex sm:min-h-0 sm:w-fit sm:flex-nowrap sm:gap-1 sm:px-3 sm:py-1 sm:whitespace-nowrap"
          >
            Cotisation Client Pro · abonnements mensuels Expert / Fournisseur
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Vos droits, séparés et maîtrisés</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Client Pro fonctionne par crédits de projets : un quota gratuit une seule fois, puis des
            packs achetés sans renouvellement automatique. Expert et Fournisseur disposent d'un
            abonnement mensuel avec essai gratuit, indépendant de Client Pro.
          </p>
        </div>

        <div className="mb-8">
          <MySubscriptionCard />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/10 p-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des tarifs enregistrés…
          </div>
        ) : (
          <div className="space-y-10">
            {/* ═══ A. COTISATION CLIENT PRO ═══ */}
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Coins className="h-5 w-5 text-blue-600" /> Cotisation Client Pro
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chaque nouveau projet consomme un crédit. Payez uniquement les projets dont vous
                    avez besoin — aucun abonnement mensuel.
                  </p>
                </div>
                {balance && (
                  <Badge
                    variant="outline"
                    className={
                      exhausted
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                    }
                  >
                    {balance.remaining} restant{balance.remaining > 1 ? "s" : ""} · {balance.used} utilisé
                    {balance.used > 1 ? "s" : ""} / {balance.granted}
                  </Badge>
                )}
              </div>

              {credits?.config.freeGrantEnabled && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {credits.freeGranted
                      ? `Votre gratuité initiale (${projectsLabel(credits.config.freeProjects)}, une seule fois) est déjà appliquée.`
                      : `À votre première inscription, ${projectsLabel(credits.config.freeProjects)} vous sont offerts une seule fois.`}{" "}
                    Le premier projet est accessible immédiatement ; la cotisation n'est demandée
                    qu'une fois tous les crédits consommés.
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(credits?.packages ?? []).map((pack) => (
                  <PackCard
                    key={pack.projects}
                    pack={pack}
                    currency={currency}
                    disabled={purchasesDisabled || pack.projects === 0}
                    onSelect={() => handleSelectPack(pack)}
                  />
                ))}
              </div>

              {purchasesDisabled && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {pendingOrder
                    ? "Une cotisation est déjà en attente de validation : joignez votre justificatif ci-dessous."
                    : "Utilisez d'abord vos crédits restants avant d'acheter un nouveau pack."}
                </p>
              )}
            </section>

            {/* ═══ B/C. ABONNEMENT MENSUEL PROFESSIONNEL ═══ */}
            {professionalRole && rolePlan && (
              <section>
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    {professionalRole === "expert" ? (
                      <BriefcaseBusiness className="h-5 w-5 text-violet-600" />
                    ) : (
                      <Truck className="h-5 w-5 text-amber-600" />
                    )}
                    Abonnement mensuel {professionalRole === "expert" ? "Expert" : "Fournisseur"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Indépendant de la cotisation Client Pro. À l'expiration sans paiement, votre
                    profil devient invisible dans l'annuaire ; vos données sont conservées.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/5 to-background p-6"
                  >
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">
                        {professionalRole === "expert" ? "Expert" : "Fournisseur"}
                      </h3>
                      {rolePlan.trialEnabled && (
                        <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-700">
                          Essai {trialDurationLabel(rolePlan.trialDays)} inclus
                        </Badge>
                      )}
                    </div>

                    <div className="mb-4">
                      {rolePlan.price === null ? (
                        <span className="text-3xl font-bold text-emerald-600">Gratuit</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold">{rolePlan.price}</span>
                          <span className="ml-1 text-sm text-muted-foreground">TND / mois</span>
                        </>
                      )}
                    </div>

                    <ul className="mb-6 flex-1 space-y-2.5">
                      {(
                        rolePlan.services && rolePlan.services.length > 0
                          ? PROFESSIONAL_SERVICES[professionalRole].filter((s) =>
                              rolePlan.services!.includes(s.key),
                            )
                          : PROFESSIONAL_SERVICES[professionalRole]
                      ).map((service) => (
                        <li key={service.key} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="leading-snug">{service.label}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
                      {rolePlan.trialEnabled
                        ? `Essai gratuit de ${trialDurationLabel(rolePlan.trialDays)} pour les nouveaux profils, puis abonnement mensuel.`
                        : "Aucun essai gratuit : l'abonnement mensuel est requis pour publier votre profil."}{" "}
                      {rolePlan.autoRenew
                        ? "Un rappel est envoyé avant l'échéance ; aucun prélèvement automatique."
                        : "Renouvellement manuel à l'échéance."}
                    </p>

                    <Button
                      className="h-11 w-full gap-1"
                      disabled={isPendingSubscription || rolePlan.price === undefined}
                      onClick={handleSelectPlan}
                    >
                      {isPendingSubscription
                        ? "Paiement en attente…"
                        : status?.type === "trial" && status.isActive
                          ? "Souscrire l'abonnement mensuel"
                          : status?.isActive
                            ? "Renouveler mon abonnement"
                            : "Choisir cet abonnement"}
                    </Button>
                  </motion.div>

                  <div className="space-y-3 rounded-2xl border border-border/40 bg-background/50 p-5">
                    <p className="text-sm font-semibold">Ce que votre abonnement couvre</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Le forfait professionnel donne accès aux services Expert ou Fournisseur :
                      visibilité dans l'annuaire, demandes de devis / consultation et messagerie.
                      Il n'ouvre PAS les services Client Pro (estimation, rapports PDF, aide à la
                      décision) : ceux-ci nécessitent une cotisation Client Pro séparée.
                    </p>
                    <div className="rounded-lg border border-border/30 bg-muted/10 p-3 text-[11px] text-muted-foreground">
                      <p className="font-medium text-foreground">À l'expiration</p>
                      <ul className="mt-1 space-y-1">
                        <li>• Profil masqué des recherches et recommandations</li>
                        <li>• Nouvelles demandes professionnelles bloquées</li>
                        <li>• Compte, projets et documents conservés</li>
                        <li>• Rétablissement automatique après paiement confirmé</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ═══ Paiement sélectionné ═══ */}
            {intent && (
              <motion.div
                ref={paymentRef}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="scroll-mt-24 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] to-background p-5 sm:p-6"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold leading-tight">Moyen de paiement</h2>
                      <p className="text-[11px] text-muted-foreground">
                        {intent.kind === "credits"
                          ? `Cotisation Client Pro — ${projectsLabel(intent.pack.projects)} · ${amountLabel}`
                          : `Abonnement mensuel ${professionalRole === "expert" ? "Expert" : "Fournisseur"} · ${amountLabel}`}{" "}
                        (paiement unique, sans reconduction automatique)
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1 text-[11px]" onClick={() => setIntent(null)}>
                    <X className="h-3.5 w-3.5" /> Annuler
                  </Button>
                </div>

                {selectedAmount !== null && selectedAmount > 0 ? (
                  <>
                    {paymentMethods.length === 0 ? (
                      <div className="rounded-xl border border-amber-200/50 bg-amber-50/60 px-4 py-3 text-xs text-amber-700">
                        Aucune méthode de paiement n'est disponible. Contactez le support batibuild.
                      </div>
                    ) : (
                      <div className="mb-4 flex gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
                        {paymentMethods.map((method) => {
                          const MethodIcon =
                            method.icon === "smartphone" ? Smartphone : method.icon === "card" ? CreditCard : Banknote;
                          const active = paymentMethod === method.slug;
                          return (
                            <button
                              key={method.slug}
                              onClick={() => setPaymentMethod(method.slug)}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                                active
                                  ? "border-border/40 bg-background text-primary shadow-sm"
                                  : "border-transparent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <MethodIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{method.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {paymentMethod === "bank_transfer" ? (
                      <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-muted/10 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <Landmark className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">{bankInfo.bank}</p>
                              <p className="truncate text-[10px] text-muted-foreground">Coordonnées bancaires</p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                            {amountLabel}
                          </span>
                        </div>
                        <div className="divide-y divide-border/30">
                          <div className="flex items-center justify-between gap-3 bg-primary/[0.04] px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                                <UserRound className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Titulaire du compte
                                </p>
                                <p className="truncate text-sm font-bold">{bankInfo.titulaire}</p>
                              </div>
                            </div>
                          </div>
                          <PaymentField label="RIB" value={bankInfo.rib} copyable onCopy={handleCopy} />
                          <PaymentField label="IBAN" value={bankInfo.iban} copyable onCopy={handleCopy} />
                          <PaymentField label="Swift / BIC" value={bankInfo.swift} copyable onCopy={handleCopy} />
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-amber-500/[0.07] px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                              <Smartphone className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">D17 · La Poste Tunisienne</p>
                              <p className="truncate text-[10px] text-muted-foreground">Paiement marchand</p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                            {amountLabel}
                          </span>
                        </div>
                        <div className="divide-y divide-border/30">
                          <PaymentField label="Bénéficiaire" value={d17Info.merchantName} copyable onCopy={handleCopy} />
                          <PaymentField label="Téléphone" value={d17Info.phone} copyable onCopy={handleCopy} />
                          <PaymentField label="Email" value={d17Info.email} copyable onCopy={handleCopy} />
                        </div>
                        <div className="border-t border-border/30 bg-amber-50/50 px-4 py-2.5 text-[10px] text-amber-700">
                          {d17Info.notice}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground">
                      <Shield className="mt-0.5 h-3 w-3 shrink-0" />
                      <p>
                        Activation après vérification du paiement par l'administrateur. Aucun prélèvement
                        automatique. Joignez votre justificatif ci-dessous pour accélérer la validation.
                      </p>
                    </div>

                    <Button className="mt-4 h-11 w-full gap-2" onClick={handleConfirm} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Envoyer ma demande · {amountLabel}
                    </Button>
                  </>
                ) : (
                  <div className="rounded-xl border border-emerald-200/40 bg-emerald-50/50 px-4 py-3 text-xs text-emerald-700">
                    Ce forfait est gratuit : l'activation est immédiate.
                    <Button className="mt-3 w-full" onClick={handleConfirm} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Activer
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ Demandes en attente ═══ */}
            {pendingOrder && (
              <PendingPanel
                title="Cotisation Client Pro en attente de validation"
                lines={[
                  `${projectsLabel(pendingOrder.projects)} · ${pendingOrder.price} ${pendingOrder.currency}`,
                  `Paiement : ${paymentMethodLabel(pendingOrder.paymentMethod)}`,
                  `Demande du ${new Date(pendingOrder.createdAt).toLocaleString("fr-FR")}`,
                ]}
                onCancel={handleCancelOrder}
                uploadDisabled={uploading}
                onUpload={(file) => uploadProof(file, "credits", pendingOrder._id)}
              />
            )}

            {isPendingSubscription && subscription && (
              <PendingPanel
                title="Abonnement professionnel en attente de validation"
                lines={[
                  `Forfait ${subscription.plan} · ${planPriceLabel(subscription.amount ?? null)}`,
                  `Paiement : ${paymentMethodLabel(subscription.paymentMethod)}`,
                  `Demande du ${new Date(subscription.startDate).toLocaleString("fr-FR")}`,
                ]}
                uploadDisabled={uploading}
                onUpload={(file) => uploadProof(file, "plan", subscription._id)}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function PackCard({
  pack,
  currency,
  disabled,
  onSelect,
}: {
  pack: ClientProCreditPackage;
  currency: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-2xl border border-border/50 bg-background/50 p-5 backdrop-blur-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
          <Coins className="h-4 w-4 text-blue-600" />
        </div>
        <p className="text-sm font-semibold">{projectsLabel(pack.projects)}</p>
      </div>
      <div className="mb-4">
        <span className="text-3xl font-bold">{pack.price}</span>
        <span className="ml-1 text-sm text-muted-foreground">{currency}</span>
      </div>
      <p className="mb-4 flex-1 text-[11px] leading-relaxed text-muted-foreground">
        Paiement unique. Les crédits achetés s'ajoutent à votre solde et n'expirent pas.
        Aucun renouvellement automatique.
      </p>
      <Button variant="outline" className="h-10 w-full" onClick={onSelect} disabled={disabled}>
        Payer cette cotisation
      </Button>
    </motion.div>
  );
}

function PendingPanel({
  title,
  lines,
  onUpload,
  onCancel,
  uploadDisabled,
}: {
  title: string;
  lines: string[];
  onUpload: (file: File) => void;
  onCancel?: () => void;
  uploadDisabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-amber-200/50 bg-amber-50/40 p-5">
      <div className="flex items-start gap-2">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-800">{title}</p>
          {lines.map((line) => (
            <p key={line} className="text-[11px] text-amber-700/80">
              {line}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-amber-300/70 px-3 py-2 text-[11px] text-amber-800 hover:bg-amber-100/40">
          {uploadDisabled ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Joindre votre reçu
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            disabled={uploadDisabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        <span className="flex items-center gap-1 text-[10px] text-amber-700/70">
          <Image className="h-3 w-3" /> Image ou PDF · max 5 Mo
        </span>
        {onCancel && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onCancel}>
            Annuler la demande
          </Button>
        )}
      </div>
    </div>
  );
}

function paymentMethodLabel(method: string | undefined): string {
  if (method === "d17") return "D17";
  if (method === "bank_transfer") return "Virement bancaire";
  return method || "—";
}
