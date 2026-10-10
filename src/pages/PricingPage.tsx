import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Check, ChevronRight, HardHat, Loader2, Star, Shield, Banknote, Copy, CheckCheck, Smartphone, Wallet, Landmark, UserRound, Upload, Image, X, Sparkles, RefreshCcw, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/use-page-seo";
import { MySubscriptionCard } from "@/components/MySubscriptionCard";
import { availablePaymentMethods } from "@/lib/paymentMethods";
import { CLIENT_PRO_PLAN_LABEL, FREE_PLAN_LABEL, PLAN_COMPARISON } from "@/lib/freePlan";

// Default payment config (fallback if not set in DB)
const DEFAULT_PAYMENT = {
  bankName: "Banque de Tunisie (BT)",
  bankTitulaire: "GALISKON PROJECT",
  bankRib: "07 001 1234567890123 47",
  bankIban: "TN59 0700 1123 4567 8901 2347",
  bankSwift: "BTBK TN TT",
  d17MerchantName: "GALISKON PROJECT",
  d17Phone: "+216 XX XXX XXX",
  d17Email: "paiement@batibuild.app",
  d17Notice: "Envoyez le paiement via l'application D17 de La Poste Tunisienne",
  proPrice: 80,
  supplierPrice: 120,
  expertPrice: 120,
  currency: "TND",
};

// Abonnements mensuels (30 jours) — trois offres : Client Pro, Fournisseur, Expert.
// Un prix null/0 en base signifie que le forfait est gratuit (bascule admin « Offre gratuite »).
// Client Pro est payant par défaut — plus aucun essai gratuit.
type PlanId = "pro" | "supplier" | "expert";

const PLAN_LABELS: Record<string, string> = { pro: "Client Pro", supplier: "Fournisseur", expert: "Expert" };

/**
 * Contenu marketing des trois offres — avantages spécifiques à chaque type
 * d'utilisateur (client : estimation & analyse de projets ; fournisseur :
 * visibilité, catalogue et opportunités commerciales ; expert : consultation,
 * visibilité et développement de l'activité).
 */
const PLANS: {
  id: PlanId;
  quota: number;
  subtitle: string;
  features: string[];
  popular?: boolean;
}[] = [
  {
    id: "pro",
    quota: -1,
    subtitle: "Votre projet. Votre budget. Vos décisions, mieux préparées.",
    features: [
      "Estimez vos projets au juste prix du marché tunisien",
      "Optimisez le budget de vos projets de construction",
      "Comparez vos scénarios avant de vous engager",
      "Générez et téléchargez vos études en PDF",
      "Accédez à vos projets et analyses sans limitation",
    ],
    popular: true,
  },
  {
    id: "supplier",
    quota: -1,
    subtitle: "Plus de visibilité. Plus d’opportunités. Plus de clients.",
    features: [
      "Présentez vos matériaux aux porteurs de projets",
      "Développez votre visibilité auprès des professionnels",
      "Recevez des opportunités adaptées à vos produits",
      "Mettez en avant votre catalogue et vos prix",
      "Gérez votre présence fournisseur simplement",
    ],
  },
  {
    id: "expert",
    quota: -1,
    subtitle: "Votre expertise. De nouvelles opportunités. Votre croissance.",
    features: [
      "Présentez votre expertise aux porteurs de projets",
      "Recevez des demandes de consultation adaptées à votre profil",
      "Développez votre visibilité auprès de nouveaux clients",
      "Gérez vos demandes et rendez-vous depuis votre espace",
      "Valorisez votre profil, vos services et vos tarifs",
    ],
  },
];

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
          {isCopied ? (
            <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

export default function PricingPage() {
  usePageSEO({ title: "Abonnements - batibuild", description: "Choisissez votre abonnement mensuel batibuild : Client, Fournisseur ou Expert — accès illimité, renouvellement mensuel." });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const currentSubscription = useQuery(api.subscriptions.getMySubscription);
  const createSubscription = useMutation(api.subscriptions.createSubscription);
  const [copying, setCopying] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const paymentConfig = useQuery(api.payments.getPublicPricing);
  // ── Forfait Free : disponible uniquement quand l'admin l'a activé
  // (`paymentConfig.freePlanEnabled`). Aucune valeur codée en dur.
  const freePlanEnabled = (paymentConfig as any)?.freePlanEnabled === true;
  const chooseFreePlan = useMutation(api.subscriptions.chooseFreePlan);
  const [freeBusy, setFreeBusy] = useState(false);

  // ── Méthodes de paiement disponibles (activées par l'administrateur) ──
  const paymentMethods = availablePaymentMethods(
    (paymentConfig as any)?.paymentMethods,
  );
  const paymentMethodsSignature = paymentMethods.map((m) => m.slug).join("|");
  useEffect(() => {
    if (paymentMethods.length === 0) return;
    if (!paymentMethods.some((m) => m.slug === paymentMethod)) {
      setPaymentMethod(paymentMethods[0].slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethodsSignature]);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const uploadPaymentProof = useMutation(api.subscriptions.uploadPaymentProof);
  // ── Règle profil ↔ abonnement : n'afficher QUE les offres du profil actif ──
  const profileRole = useQuery(api.profileSubscription.getMyProfileRole);

  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(() => {
    const p = searchParams.get("plan");
    return p === "pro" ? "pro" : p === "supplier" ? "supplier" : "expert";
  });

  // ── Offres autorisées pour le profil actif (Client Pro → pro, Fournisseur →
  // supplier, Expert → expert). Le backend refuse de toute façon tout achat
  // incompatible — ce filtrage n'est qu'un guidage d'affichage. ──
  const allowedPlans: PlanId[] =
    profileRole === "supplier" ? ["supplier"] : profileRole === "expert" ? ["expert"] : ["pro"];
  const visiblePlans = PLANS.filter((p) => allowedPlans.includes(p.id));
  // Forfait pré-sélectionné invalide pour ce profil → aligné sur l'offre autorisée.
  const effectiveSelectedPlan: PlanId = allowedPlans.includes(selectedPlan)
    ? selectedPlan
    : allowedPlans[0];

  // Prix par forfait — null/0 signifie forfait gratuit
  const priceFor = (plan: PlanId): number => {
    const c = paymentConfig as any;
    if (plan === "pro") return c?.proPrice == null ? DEFAULT_PAYMENT.proPrice : c?.proPrice;
    if (plan === "supplier") return c?.supplierPrice == null ? DEFAULT_PAYMENT.supplierPrice : c?.supplierPrice;
    return c?.expertPrice == null ? DEFAULT_PAYMENT.expertPrice : c?.expertPrice;
  };
  const isFreePlan = (plan: PlanId): boolean => {
    const c = paymentConfig as any;
    const p = plan === "pro" ? c?.proPrice : plan === "supplier" ? c?.supplierPrice : c?.expertPrice;
    return p == null || p === 0;
  };

  const currentPrice = priceFor(effectiveSelectedPlan);
  const currency = paymentConfig?.currency || DEFAULT_PAYMENT.currency;

  const BANK_INFO: Record<string, string> = paymentConfig ? {
    bank: paymentConfig.bankName,
    titulaire: paymentConfig.bankTitulaire,
    rib: paymentConfig.bankRib,
    iban: paymentConfig.bankIban,
    swift: paymentConfig.bankSwift,
    montant: `${currentPrice} ${paymentConfig.currency}`,
  } : {
    bank: DEFAULT_PAYMENT.bankName,
    titulaire: DEFAULT_PAYMENT.bankTitulaire,
    rib: DEFAULT_PAYMENT.bankRib,
    iban: DEFAULT_PAYMENT.bankIban,
    swift: DEFAULT_PAYMENT.bankSwift,
    montant: `${currentPrice} ${DEFAULT_PAYMENT.currency}`,
  };

  const D17_INFO: Record<string, string> = paymentConfig ? {
    merchantName: paymentConfig.d17MerchantName,
    phone: paymentConfig.d17Phone,
    email: paymentConfig.d17Email,
    montant: `${currentPrice} ${paymentConfig.currency}`,
    notice: paymentConfig.d17Notice,
  } : {
    merchantName: DEFAULT_PAYMENT.d17MerchantName,
    phone: DEFAULT_PAYMENT.d17Phone,
    email: DEFAULT_PAYMENT.d17Email,
    montant: `${currentPrice} ${DEFAULT_PAYMENT.currency}`,
    notice: DEFAULT_PAYMENT.d17Notice,
  };

  const isPending = currentSubscription?.status === "pending";
  // Méthode réellement rattachée à la demande en attente (et non le sélecteur
  // courant) : le justificatif attendu est celui du paiement effectué.
  const pendingPaymentMethod = isPending
    ? currentSubscription?.paymentMethod ?? paymentMethod
    : paymentMethod;
  const currentPlan: string | null = currentSubscription && !isPending ? (currentSubscription.plan as string) : null;

  const isCurrentPlan = (plan: PlanId) => currentPlan === plan && !isPending;

  const handleSelectPlan = async (planId: PlanId) => {
    // Garde-frontière : ne jamais lancer une souscription incompatible.
    if (!allowedPlans.includes(planId)) return;
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    setSelectedPlan(planId);

    // Scroll to payment method section smoothly
    setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    const planAmount = priceFor(planId);
    const free = isFreePlan(planId);

    // Aucune méthode active côté serveur → impossible de régler un forfait payant.
    if (!free && paymentMethods.length === 0) {
      toast.error(
        "Aucune méthode de paiement n'est disponible. Contactez le support batibuild.",
      );
      return;
    }

    // Forfait mensuel — activation immédiate si gratuit, sinon paiement (virement/D17)
    await createSubscription({
      plan: planId,
      paymentMethod: free ? undefined : paymentMethod,
      amount: free ? 0 : planAmount,
      currency: paymentConfig?.currency ?? DEFAULT_PAYMENT.currency,
    });

    toast.success(
      free
        ? "Forfait gratuit activé avec succès !"
        : paymentMethod === "d17"
        ? "Demande d'abonnement envoyée ! En attente de validation du paiement D17."
        : "Demande d'abonnement envoyée ! En attente de validation du virement."
    );
  };

  // ── Souscription au forfait Free (0 TND) — refusée côté serveur si désactivé ──
  const handleChooseFree = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    setFreeBusy(true);
    try {
      await chooseFreePlan({});
      toast.success("Forfait Free activé ! Vous pouvez utiliser le parcours sans paiement.");
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'activer le forfait Free.");
    } finally {
      setFreeBusy(false);
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSubscription?._id) return;

    // Validate file type
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Format accepté : image (JPG, PNG) ou PDF");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      setUploadProgress(30);

      // Upload to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setUploadProgress(70);

      if (!result.ok) throw new Error("Échec de l'upload");

      const { storageId } = await result.json();
      setUploadProgress(85);

      // Get the URL for the uploaded file
      const fileUrl = `${window.location.origin}/api/storage/${storageId}`;

      // Attach to subscription
      await uploadPaymentProof({
        subscriptionId: currentSubscription._id as any,
        storageId: storageId as any,
        url: fileUrl,
        fileName: file.name,
      });

      setUploadProgress(100);
      setUploadedFile(file.name);
      toast.success("Reçu de paiement envoyé avec succès !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload du reçu");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(label);
      toast.success(`${label} copié`);
      setTimeout(() => setCopying(null), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const renderPlanCard = (
    plan: PlanId,
    price: number,
    _quota: number,
    subtitle: string,
    features: string[],
    popular?: boolean,
    index = 0,
  ) => {
    const isCurrent = isCurrentPlan(plan);
    const reached = false;
    // Bouton désactivé (offre déjà active / en attente) : on garde le style neutre.
    const isDisabled = (!reached && isCurrent) || (isPending && plan === currentSubscription?.plan);

    return (
      <motion.div
        key={plan}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl ${
          popular
            ? "border-primary/30 bg-gradient-to-b from-primary/5 to-background shadow-lg shadow-primary/5"
            : "border-border/50 bg-background/50 backdrop-blur-sm"
        }`}
      >
        {popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Populaire
            </Badge>
          </div>
        )}

        {isCurrent && (
          <div className="absolute -top-3 right-4">
            <Badge variant="secondary" className="px-3 py-0.5 text-xs">
              Actuel
            </Badge>
          </div>
        )}

        <div className="mb-5">
          <h3 className="text-lg font-semibold">{PLAN_LABELS[plan]}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mb-5">
          {price > 0 ? (
            <>
              <span className="text-4xl font-bold">{price}</span>
              <span className="ml-1 text-sm text-muted-foreground">TND · /mois</span>
            </>
          ) : (
            <span className="text-4xl font-bold text-emerald-600">Gratuit</span>
          )}
        </div>

        <ul className="mb-8 flex-1 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="min-w-0 leading-snug">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={popular && !isCurrent ? "default" : "outline"}
          className={`mt-auto w-full h-11 text-sm gap-1 ${
            isDisabled ? "" : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
          }`}
          onClick={() => handleSelectPlan(plan)}
          disabled={isDisabled}
        >
          {isCurrent && !reached
            ? "Offre actuelle"
            : isPending && plan === currentSubscription?.plan
            ? "En attente..."
            : reached
            ? `Renouveler · ${PLAN_LABELS[plan]}`
            : `Choisir ${PLAN_LABELS[plan]}`}
          {!isCurrent && !isPending && <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </motion.div>
    );
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center h-14">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardHat className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm">Abonnements</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            Abonnement actuel : {currentPlan ? PLAN_LABELS[currentPlan] : "Aucun"}
            {isPending && " (En attente de validation)"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Choisissez votre abonnement</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
            Abonnement mensuel (30 jours) — renouvellement requis à l'échéance. Chaque forfait inclut un accès complet
            aux outils d'estimation, matériaux IA et téléchargements. Pendant la période d'essai gratuit (7 jours),
            l'accès est offert ; à son terme, la souscription à une offre devient obligatoire.
          </p>
        </div>

        {/* ═══ Mon abonnement : essai gratuit (7 j) ou abonnement mensuel (30 j) ═══ */}
        <div className="mb-8">
          <MySubscriptionCard />
        </div>

        {/* ═══ Les forfaits autorisés pour le profil actif ═══ */}
        {profileRole != null && profileRole !== "client" && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Votre profil est «{" "}
              <strong>{PLAN_LABELS[profileRole]}</strong> ». Seules les offres{" "}
              <strong>{PLAN_LABELS[profileRole]}</strong> peuvent être souscrites avec ce type de
              profil.
            </span>
          </div>
        )}

        {/* ═══ Forfait Free (gratuit) — affiché uniquement s'il est activé par l'admin ═══ */}
        {freePlanEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 rounded-2xl border border-slate-300/50 bg-gradient-to-br from-slate-500/[0.06] to-background p-5 sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {FREE_PLAN_LABEL}
                  </Badge>
                  <span className="text-2xl font-bold text-emerald-600">Gratuit</span>
                  <span className="text-xs text-muted-foreground">0 TND · /mois</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Utilisez le parcours complet (estimation, plans IA, matériaux, consultations,
                  suivi) sans paiement. Le téléchargement des rapports PDF reste réservé à{" "}
                  <strong>{CLIENT_PRO_PLAN_LABEL}</strong>.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-11 shrink-0 gap-1.5 sm:w-48"
                onClick={handleChooseFree}
                disabled={freeBusy}
              >
                {freeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Choisir {FREE_PLAN_LABEL}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══ Comparatif Free ↔ Client Pro ═══ */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-border/40">
          <div className="grid grid-cols-[1fr_5rem_6rem] items-center gap-x-3 border-b border-border/30 bg-muted/20 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[1fr_7rem_8rem]">
            <span>Fonctionnalité</span>
            <span className="text-center">{FREE_PLAN_LABEL}</span>
            <span className="text-center text-primary">{CLIENT_PRO_PLAN_LABEL}</span>
          </div>
          {PLAN_COMPARISON.map((row) => (
            <div
              key={row.feature}
              className="grid grid-cols-[1fr_5rem_6rem] items-center gap-x-3 border-b border-border/20 px-4 py-2.5 text-sm last:border-b-0 sm:grid-cols-[1fr_7rem_8rem]"
            >
              <span className="min-w-0 truncate">{row.feature}</span>
              <span className="flex justify-center">
                {row.free ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <span className="text-[11px] text-muted-foreground">🔒</span>
                )}
              </span>
              <span className="flex justify-center">
                {row.pro ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/50" />
                )}
              </span>
            </div>
          ))}
        </div>

        {/* ═══ Les 3 forfaits ═══ */}
        <div
          className={`grid grid-cols-1 ${visiblePlans.length > 1 ? "md:grid-cols-3" : "md:grid-cols-1 max-w-md mx-auto"} gap-6 mb-10 pt-2`}
        >
          {visiblePlans.map((p, i) =>
            renderPlanCard(p.id, priceFor(p.id), p.quota, p.subtitle, p.features, p.popular && visiblePlans.length > 1, i),
          )}
        </div>

        {/* ═══ Récapitulatif inclus dans chaque forfait ═══ */}
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <HardHat className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold">Projets de construction</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Estimation du coût de vos projets, aménagements et rénovations aux prix du marché tunisien.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-semibold">Assistant matériaux IA</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Recommandations comparées (économique · équilibré · premium) avec fournisseurs au meilleur prix.</p>
            </div>
          </div>
        </div>

        {/* ═══ Payment Method Section ═══ */}
        <motion.div
          ref={paymentSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.02] to-background p-5 sm:p-6 scroll-mt-24"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Moyen de paiement</h2>
              <p className="text-[11px] text-muted-foreground">
                <strong>{PLAN_LABELS[effectiveSelectedPlan]} · {currentPrice} {currency}</strong> (paiement unique)
              </p>
            </div>
          </div>

          {/* Abonnement selector — offres du profil uniquement */}
          <div
            className={`mb-4 grid ${visiblePlans.length > 1 ? "grid-cols-2" : "grid-cols-1"} gap-1 rounded-xl border border-border/40 bg-muted/20 p-1`}
          >
            {(visiblePlans.map((p) => p.id) as PlanId[]).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlan(p)}
                className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                  effectiveSelectedPlan === p
                    ? "border-border/40 bg-background text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {PLAN_LABELS[p]}
                <span className="text-[9px] opacity-70">{priceFor(p)}</span>
              </button>
            ))}
          </div>

          {currentPrice > 0 ? (
          <>
          {/* Payment method selector — méthodes activées par l'administrateur */}
          {paymentMethods.length === 0 ? (
            <div className="mb-4 rounded-xl border border-amber-200/50 bg-amber-50/60 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700">
                Aucune méthode de paiement n'est disponible actuellement.
              </p>
              <p className="mt-0.5 text-[10px] text-amber-600/80">
                Merci de contacter le support batibuild pour finaliser votre abonnement.
              </p>
            </div>
          ) : (
          <div
            className="mb-4 flex gap-1 rounded-xl border border-border/40 bg-muted/20 p-1"
          >
            {paymentMethods.map((method) => {
              const MethodIcon =
                method.icon === "smartphone" ? Smartphone : method.icon === "card" ? CreditCard : Banknote;
              const active = paymentMethod === method.slug;
              const activeColor = method.slug === "d17" ? "text-amber-600" : "text-primary";
              return (
                <button
                  key={method.slug}
                  onClick={() => setPaymentMethod(method.slug)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                    active
                      ? `border-border/40 bg-background shadow-sm ${activeColor}`
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
            <>
              <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-muted/10 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Landmark className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{BANK_INFO.bank}</p>
                      <p className="truncate text-[10px] text-muted-foreground">Coordonnées bancaires</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                    {BANK_INFO.montant}
                  </span>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex items-center justify-between gap-3 bg-primary/[0.04] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <UserRound className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Titulaire du compte</p>
                        <p className="truncate text-sm font-bold">{BANK_INFO.titulaire}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(BANK_INFO.titulaire, "Titulaire")}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      title="Copier le titulaire"
                    >
                      {copying === "Titulaire" ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <PaymentField label="RIB" value={BANK_INFO.rib} copyable onCopy={handleCopy} isCopied={copying === "RIB"} />
                  <PaymentField label="IBAN" value={BANK_INFO.iban} copyable onCopy={handleCopy} isCopied={copying === "IBAN"} />
                  <PaymentField label="Swift / BIC" value={BANK_INFO.swift} copyable onCopy={handleCopy} isCopied={copying === "Swift / BIC"} />
                </div>
              </div>

              <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-muted-foreground/70">
                <Shield className="h-3 w-3 shrink-0 mt-0.5" />
                <p>
                  Activation manuelle sous 24h ouvrées après réception du virement. Confirmation par email. Question ? support@batibuild.app
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-amber-500/[0.07] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                      <Smartphone className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">D17 · La Poste Tunisienne</p>
                      <p className="truncate text-[10px] text-muted-foreground">Paiement marchand</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                    {D17_INFO.montant}
                  </span>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex items-center justify-between gap-3 bg-amber-500/[0.07] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
                        <UserRound className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Bénéficiaire</p>
                        <p className="truncate text-sm font-bold">{D17_INFO.merchantName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(D17_INFO.merchantName, "Bénéficiaire")}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      title="Copier le bénéficiaire"
                    >
                      {copying === "Bénéficiaire" ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <PaymentField label="Téléphone D17" value={D17_INFO.phone} copyable onCopy={handleCopy} isCopied={copying === "Téléphone D17"} />
                  <PaymentField label="Email" value={D17_INFO.email} copyable onCopy={handleCopy} isCopied={copying === "Email"} />
                </div>
              </div>

              <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-muted-foreground/70">
                <Shield className="h-3 w-3 shrink-0 mt-0.5" />
                <p>
                  {D17_INFO.notice}. Activation manuelle sous 24h ouvrées après vérification du paiement
                  par l'administrateur.
                </p>
              </div>

              <div className="mt-2.5 rounded-lg border border-amber-200/50 bg-amber-50/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-amber-700">Comment payer avec D17 ?</p>
                <ol className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[10px] leading-relaxed text-amber-700/90 sm:grid-cols-2">
                  <li>1. Ouvrez l'application D17</li>
                  <li>2. Sélectionnez « Paiement marchand »</li>
                  <li>3. Entrez le téléphone et le montant de {currentPrice} {currency}</li>
                  <li>4. Joignez la capture du paiement ci-dessous</li>
                </ol>
              </div>
            </>
          )}

          {isPending && (
            <div className="mt-4 space-y-3">
              <div className="px-4 py-3 rounded-xl bg-amber-50/50 border border-amber-200/30">
                <div className="flex items-start gap-2">
                  <Loader2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700">Paiement en attente de validation</p>
                    <p className="text-[10px] text-amber-600/70 mt-0.5">
                      Votre abonnement sera activé dès validation du{" "}
                      {pendingPaymentMethod === "d17" ? "paiement D17" : "virement"} par l'administrateur.
                    </p>
                  </div>
                </div>
              </div>

              {/* ═══ Upload Receipt Section ═══ */}
              <div className="px-4 py-3 rounded-xl bg-white/50 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold">Joindre votre reçu de paiement</p>
                </div>
                <p className="text-[9px] text-muted-foreground mb-3">
                  Ajoutez une capture d'écran du{" "}
                  {pendingPaymentMethod === "d17" ? "paiement D17" : "virement bancaire"} : le
                  justificatif est joint à votre demande et accélère l'activation.
                </p>

                {uploadedFile ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs text-emerald-700 truncate">{uploadedFile}</span>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-emerald-100 transition-colors shrink-0"
                    >
                      <X className="h-3 w-3 text-emerald-500" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    {uploading ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/20">
                        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                        <div className="flex-1">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            Téléchargement... {uploadProgress}%
                          </p>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-border/40 hover:border-primary/40 cursor-pointer transition-all hover:bg-muted/20">
                        <Image className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">Cliquez pour ajouter un reçu</p>
                          <p className="text-[9px] text-muted-foreground">Image ou PDF · Max 5 Mo</p>
                        </div>
                        <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleUploadReceipt}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {false && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
              <div className="flex items-start gap-2">
                <RefreshCcw className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">
                    Abonnement expiré ? Renouvellez votre forfait mensuel.
                  </p>
                  <p className="text-[10px] text-emerald-700/70 mt-0.5">
                    Renouvelez le même forfait ou passez à une offre supérieure — abonnement mensuel renouvelable.
                  </p>
                </div>
              </div>
            </div>
          )}
            </>
          ) : (
            <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Ce forfait est gratuit — activation immédiate</p>
                  <p className="text-[10px] text-emerald-600/70 mt-0.5">Aucun paiement requis. Votre abonnement sera activé instantanément.</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
