import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Check, ChevronRight, HardHat, Loader2, Star, Shield, FileText, Banknote, Copy, CheckCheck, Smartphone, Wallet, Landmark, UserRound, Upload, Image, X, Sparkles, Download, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/use-page-seo";

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
  startPrice: 79,
  proPrice: 120,
  supplierPrice: 120,
  expertPrice: 320,
  currency: "TND",
  // Prix par type de projet — forfaits indépendants (paiement unique)
  constructionStartPrice: 40,
  constructionProPrice: 120,
  constructionExpertPrice: 320,
  investmentStartPrice: 79,
  investmentProPrice: 120,
  investmentExpertPrice: 320,
};

// Forfaits à paiement unique, vendus indépendamment par type de projet :
//   Construction   : Start 40 TND (1 projet · 1 PDF) | Pro 120 (10) | Expert 320 (30)
//   Investissement : Start 79 TND (1 analyse · 1 PDF) | Pro 120 (10) | Expert 320 (30)
//   Plans architecturaux : Gratuit — illimité.
type PlanId = "free" | "pro" | "expert";
type ForfaitType = "construction" | "investment";

const PLAN_LABELS: Record<string, string> = { free: "Start", pro: "Pro", expert: "Expert" };

const CONSTRUCTION_PLANS: { id: PlanId; quota: number; description: string; popular?: boolean }[] = [
  { id: "free", quota: 1, description: "Pour démarrer un premier projet de construction" },
  { id: "pro", quota: 10, description: "Pour les professionnels de la construction" },
  { id: "expert", quota: 30, description: "Pour les entreprises et les grands projets", popular: true },
];

const INVESTMENT_PLANS: { id: PlanId; quota: number; description: string; popular?: boolean }[] = [
  { id: "free", quota: 1, description: "Pour analyser une première opportunité" },
  { id: "pro", quota: 10, description: "Pour les investisseurs actifs" },
  { id: "expert", quota: 30, description: "Pour les promoteurs et les portefeuilles importants", popular: true },
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
  usePageSEO({ title: "Abonnements - batibuild App", description: "Choisissez le forfait batibuild App adapté à vos besoins : Start, Pro ou Expert — paiement unique, par type de projet." });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const currentSubscription = useQuery(api.subscriptions.getMySubscription);
  const quotas = useQuery(api.subscriptions.getMyQuotas);
  const createSubscription = useMutation(api.subscriptions.createSubscription);
  const [copying, setCopying] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "d17">("bank_transfer");
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const paymentConfig = useQuery(api.payments.getPublicPricing);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const uploadPaymentProof = useMutation(api.subscriptions.uploadPaymentProof);

  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchParams] = useSearchParams();
  const [selectedType, setSelectedType] = useState<ForfaitType>(() => {
    const t = searchParams.get("type");
    return t === "investment" ? "investment" : "construction";
  });
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(() => {
    const p = searchParams.get("plan");
    return p === "expert" ? "expert" : p === "pro" ? "pro" : "free";
  });

  // Prix par type + forfait
  const priceFor = (type: ForfaitType, plan: PlanId): number => {
    const c = paymentConfig as any;
    if (type === "construction") {
      if (plan === "free") return c?.constructionStartPrice ?? DEFAULT_PAYMENT.constructionStartPrice;
      if (plan === "pro") return c?.constructionProPrice ?? DEFAULT_PAYMENT.constructionProPrice;
      return c?.constructionExpertPrice ?? DEFAULT_PAYMENT.constructionExpertPrice;
    }
    if (plan === "free") return c?.investmentStartPrice ?? DEFAULT_PAYMENT.investmentStartPrice;
    if (plan === "pro") return c?.investmentProPrice ?? DEFAULT_PAYMENT.investmentProPrice;
    return c?.investmentExpertPrice ?? DEFAULT_PAYMENT.investmentExpertPrice;
  };

  const currentPrice = priceFor(selectedType, selectedPlan);
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
  const construction = quotas?.construction;
  const investment = quotas?.investment;
  const constructionPlan = construction?.plan ?? "free";
  const investmentPlan = investment?.plan ?? "free";

  const isCurrentPlan = (type: ForfaitType, plan: PlanId) => {
    const current = type === "construction" ? constructionPlan : investmentPlan;
    return current === plan && !isPending;
  };

  const handleSelectPlan = async (type: ForfaitType, planId: PlanId) => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    setSelectedType(type);
    setSelectedPlan(planId);

    // Scroll to payment method section smoothly
    setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    const planAmount = priceFor(type, planId);

    // Forfaits à paiement unique — création de l'abonnement pour ce type
    await createSubscription({
      plan: planId,
      kind: type,
      paymentMethod: paymentMethod,
      amount: planAmount,
      currency: paymentConfig?.currency ?? DEFAULT_PAYMENT.currency,
    });

    toast.success(
      paymentMethod === "d17"
        ? "Demande d'abonnement envoyée ! En attente de validation du paiement D17."
        : "Demande d'abonnement envoyée ! En attente de validation du virement."
    );
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
    type: ForfaitType,
    plan: PlanId,
    price: number,
    quota: number,
    description: string,
    popular?: boolean,
    index = 0,
  ) => {
    const isCurrent = isCurrentPlan(type, plan);
    const reached = type === "construction"
      ? (construction?.reached ?? false)
      : (investment?.reached ?? false);

    return (
      <motion.div
        key={`${type}-${plan}`}
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
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="mb-5">
          <span className="text-4xl font-bold">{price}</span>
          <span className="ml-1 text-sm text-muted-foreground">TND · paiement unique</span>
        </div>

        <ul className="mb-8 space-y-3 flex-1">
          <li className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              {quota} {type === "construction" ? "projet" : "analyse"}
              {quota > 1 ? "s" : ""} de {type === "construction" ? "construction" : "rentabilité immobilière"}
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{quota} téléchargement{quota > 1 ? "s" : ""} PDF</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>Estimation IA aux prix tunisiens</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>Plans architecturaux illimités inclus</span>
          </li>
        </ul>

        <Button
          variant={popular && !isCurrent ? "default" : "outline"}
          className="w-full h-11 text-sm gap-1"
          onClick={() => handleSelectPlan(type, plan)}
          disabled={(!reached && isCurrent) || (isPending && plan === currentSubscription?.plan)}
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
            <span className="font-semibold text-sm">Forfaits</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            Construction : {PLAN_LABELS[constructionPlan]} · Investissement : {PLAN_LABELS[investmentPlan]}
            {isPending && " (En attente de validation)"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Choisissez vos forfaits</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
            Paiement unique — aucune reconduction mensuelle. Les forfaits de construction et d'investissement sont
            indépendants : quand vos quotas sont épuisés, vous renouvelez ou passez à une offre supérieure.
            Les plans architecturaux sont gratuits et illimités.
          </p>
        </div>

        {/* ═══ Projets de construction ═══ */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <HardHat className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Projets de construction</h2>
            <p className="text-xs text-muted-foreground">Estimation du coût de vos projets de construction, aménagement et rénovation</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {CONSTRUCTION_PLANS.map((p, i) =>
            renderPlanCard("construction", p.id, priceFor("construction", p.id), p.quota, p.description, p.popular, i),
          )}
        </div>

        {/* ═══ Projets d'investissement ═══ */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
            <Landmark className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Projets d'investissement</h2>
            <p className="text-xs text-muted-foreground">Analyse de la rentabilité de vos investissements immobiliers</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {INVESTMENT_PLANS.map((p, i) =>
            renderPlanCard("investment", p.id, priceFor("investment", p.id), p.quota, p.description, p.popular, i),
          )}
        </div>

        {/* ═══ Plans architecturaux — gratuit ═══ */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <Sparkles className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Plans architecturaux</h2>
            <p className="text-xs text-muted-foreground">Générateur de plans 2D / 3D par IA</p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative flex flex-col sm:flex-row sm:items-center gap-5 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-background p-6 sm:p-8 mb-10"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
            <Sparkles className="h-6 w-6 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold">Gratuit</h3>
              <Badge className="bg-violet-500/10 text-violet-700 border-violet-300/40">
                <Download className="h-3 w-3 mr-1" /> Téléchargements illimités
              </Badge>
              <Badge className="bg-violet-500/10 text-violet-700 border-violet-300/40">
                <FileText className="h-3 w-3 mr-1" /> PDF haute résolution
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Générez autant de plans architecturaux que vous voulez — plans 2D et 3D cotés, meublés et optimisés par IA.
              Aucun quota, aucune limite de téléchargement.
            </p>
          </div>
          <Button
            size="lg"
            className="shrink-0 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => navigate("/dashboard/plans/new")}
          >
            Générer mes plans
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>

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
                {selectedType === "construction" ? "Projets de construction" : "Projets d'investissement"} ·{" "}
                <strong>{PLAN_LABELS[selectedPlan]} · {currentPrice} {currency}</strong> (paiement unique)
              </p>
            </div>
          </div>

          {/* Type selector */}
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
            <button
              onClick={() => setSelectedType("construction")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                selectedType === "construction"
                  ? "border-border/40 bg-background text-blue-600 shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <HardHat className="h-3.5 w-3.5" />
              Construction
            </button>
            <button
              onClick={() => setSelectedType("investment")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                selectedType === "investment"
                  ? "border-border/40 bg-background text-indigo-600 shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Landmark className="h-3.5 w-3.5" />
              Investissement
            </button>
          </div>

          {/* Forfait selector */}
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
            {(["free", "pro", "expert"] as PlanId[]).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlan(p)}
                className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                  selectedPlan === p
                    ? "border-border/40 bg-background text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {PLAN_LABELS[p]}
                <span className="text-[9px] opacity-70">{priceFor(selectedType, p)}</span>
              </button>
            ))}
          </div>

          {/* Payment method selector — compact segmented control */}
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
            <button
              onClick={() => setPaymentMethod("bank_transfer")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                paymentMethod === "bank_transfer"
                  ? "border-border/40 bg-background text-primary shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Banknote className="h-3.5 w-3.5" />
              Virement bancaire
            </button>
            <button
              onClick={() => setPaymentMethod("d17")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                paymentMethod === "d17"
                  ? "border-border/40 bg-background text-amber-600 shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              D17
            </button>
          </div>

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
                  {D17_INFO.notice}. Activation manuelle sous 24h ouvrées.
                </p>
              </div>

              <div className="mt-2.5 rounded-lg border border-amber-200/50 bg-amber-50/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-amber-700">Comment payer avec D17 ?</p>
                <ol className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[10px] leading-relaxed text-amber-700/90 sm:grid-cols-2">
                  <li>1. Ouvrez l'application D17</li>
                  <li>2. Sélectionnez « Paiement marchand »</li>
                  <li>3. Entrez le téléphone et le montant de {currentPrice} {currency}</li>
                  <li>4. Envoyez la confirmation par email</li>
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
                      Votre abonnement sera activé dès réception du {paymentMethod === "d17" ? "paiement D17" : "virement"}.
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
                  Ajoutez une capture d'écran du {paymentMethod === "d17" ? "paiement D17" : "virement bancaire"} pour accélérer l'activation.
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

          {(construction?.reached || investment?.reached) && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
              <div className="flex items-start gap-2">
                <RefreshCcw className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">
                    Quotas épuisés ? Renouvelez votre forfait.
                  </p>
                  <p className="text-[10px] text-emerald-700/70 mt-0.5">
                    {construction?.reached && "Vos quotas de construction sont épuisés. "}
                    {investment?.reached && "Vos quotas d'investissement sont épuisés. "}
                    Renouvelez le même forfait ou passez à une offre supérieure — paiement unique, sans abonnement mensuel.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
