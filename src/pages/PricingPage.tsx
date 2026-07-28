import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, ChevronRight, HardHat, Loader2, Star, Shield, Building2, FileText, Download, Banknote, Copy, CheckCheck, Smartphone, Wallet, Upload, Image, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
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
  d17Email: "paiement@budgetbati.tn",
  d17Notice: "Envoyez le paiement via l'application D17 de La Poste Tunisienne",
  proPrice: 79,
  supplierPrice: 120,
  expertPrice: 320,
  currency: "TND",
};

const PLANS = [
  {
    id: "free",
    name: "Gratuit",
    price: "0",
    period: "TND/mois",
    description: "Pour découvrir l'outil",
    features: [
      "3 projets par mois",
      "Estimation de base",
      "Analyse IA standard",
      "Support email",
    ],
    gradient: "from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30",
    note: "Export PDF non inclus",
  },
  {
    id: "pro",
    name: "Pro",
    priceKey: "pro",
    period: "TND/mois",
    description: "Pour les professionnels de la construction",
    features: [
      "10 projets par mois",
      "Analyse IA avancée",
      "Export PDF du devis détaillé",
      "10 téléchargements de devis / mois",
      "Rapports détaillés",
      "Comparaison de projets",
      "Historique complet",
      "Support prioritaire",
    ],
    gradient: "from-blue-500/10 to-violet-500/10 dark:from-blue-500/20 dark:to-violet-500/20",
  },
  {
    id: "expert",
    name: "Expert",
    priceKey: "expert",
    period: "TND/mois",
    description: "Pour les entreprises et les grands projets",
    features: [
      "100 projets par mois",
      "Analyse IA avancée",
      "Export PDF du devis détaillé",
      "100 téléchargements de devis / mois",
      "Rapports détaillés",
      "Comparaison de projets",
      "Historique complet",
      "Support prioritaire",
      "Accès API (bientôt)",
      "Fournisseurs vérifiés prioritaires",
    ],
    popular: true,
    gradient: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
  },
];

export default function PricingPage() {
  usePageSEO({ title: "Abonnements - BudgetBati", description: "Choisissez l'abonnement BudgetBati adapté à vos besoins : Gratuit, Pro ou Expert." });
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const currentSubscription = useQuery(api.subscriptions.getMySubscription);
  const createSubscription = useMutation(api.subscriptions.createSubscription);
  const cancelSubscription = useMutation(api.subscriptions.cancelSubscription);
  const [copying, setCopying] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "d17">("bank_transfer");
  const paymentConfig = useQuery(api.payments.getPaymentConfig);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const uploadPaymentProof = useMutation(api.subscriptions.uploadPaymentProof);
  
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  
  // Get the correct price based on selected plan
  const getSelectedPrice = () => {
    if (selectedPlan === "expert") return paymentConfig?.expertPrice ?? DEFAULT_PAYMENT.expertPrice ?? 320;
    return paymentConfig?.proPrice ?? DEFAULT_PAYMENT.proPrice;
  };
  
  // Build dynamic BANK_INFO and D17_INFO from config with correct price
  const currentPrice = getSelectedPrice();
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
  
  const proPrice = paymentConfig?.proPrice || DEFAULT_PAYMENT.proPrice;
  const expertPrice = paymentConfig?.expertPrice || DEFAULT_PAYMENT.expertPrice || 320;
  const currency = paymentConfig?.currency || DEFAULT_PAYMENT.currency;

  const currentPlan = user?.subscriptionPlan || "free";
  const isPro = currentPlan === "pro";
  const isPending = currentSubscription?.status === "pending";
  const downloadLimit = currentSubscription?.downloadLimit ?? (currentSubscription?.plan === 'expert' ? 100 : 10);
  const remainingDownloads = currentSubscription?.monthlyDownloadCount != null
    ? downloadLimit - currentSubscription.monthlyDownloadCount
    : null;

  const handleSelectPlan = async (planId: string) => {
    if (planId === "free") {
      if (currentPlan !== "free") {
        await cancelSubscription();
        toast.success("Abonnement gratuit activé");
      }
      return;
    }

    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    // Set selected plan for correct payment info display
    setSelectedPlan(planId);

    // Calculate the correct amount based on selected plan
    const planAmount = planId === "expert"
      ? (paymentConfig?.expertPrice ?? DEFAULT_PAYMENT.expertPrice ?? 320)
      : (paymentConfig?.proPrice ?? DEFAULT_PAYMENT.proPrice);

    // For paid plans, create subscription with virement bancaire
    await createSubscription({
      plan: planId as any,
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

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex items-center h-14">
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

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            Offre actuelle : {currentPlan === "free" ? "Gratuit" : "Pro"}
            {isPending && " (En attente de validation)"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Choisissez votre offre</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Passez à l'offre Pro pour télécharger vos devis en PDF.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-10">
          {PLANS.map((plan, index) => {
            const isCurrentPlan = currentPlan === plan.id && !isPending;

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

                {isPending && plan.id === "pro" && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="px-3 py-0.5 text-xs border-amber-300 text-amber-600 bg-amber-50">
                      En attente
                    </Badge>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-5">
                  <span className="text-4xl font-bold">{plan.priceKey === "expert" ? expertPrice : plan.priceKey === "pro" ? proPrice : plan.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">/{plan.period}</span>
                </div>

                {plan.note && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-muted/30 border border-border/20">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3 w-3 text-amber-500 shrink-0" />
                      {plan.note}
                    </p>
                  </div>
                )}

                <ul className="mb-8 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular && !isCurrentPlan ? "default" : "outline"}
                  className="w-full h-11 text-sm gap-1"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan || (isPending && plan.id === "pro")}
                >
                  {isCurrentPlan
                    ? "Offre actuelle"
                    : isPending && plan.id === "pro"
                    ? "En attente..."
                    : plan.id === "free"
                    ? "Rester gratuit"
                    : `Choisir ${plan.name}`}
                  {!isCurrentPlan && plan.id !== "free" && !isPending && <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* ═══ Payment Method Section ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-primary/[0.02] to-background p-6 sm:p-8"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Moyen de paiement</h2>
              <p className="text-xs text-muted-foreground">
                Choisissez votre méthode de paiement pour l'abonnement <strong>{selectedPlan === "expert" ? "Expert" : "Pro"} à {currentPrice} {currency}/mois</strong>.
              </p>
            </div>
          </div>

          {/* Payment method tabs */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setPaymentMethod("bank_transfer")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border transition-all ${
                paymentMethod === "bank_transfer"
                  ? "border-primary/40 bg-primary/5 text-primary shadow-sm"
                  : "border-border/30 bg-background text-muted-foreground hover:border-border/60"
              }`}
            >
              <Banknote className="h-4 w-4" />
              Virement bancaire
            </button>
            <button
              onClick={() => setPaymentMethod("d17")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border transition-all ${
                paymentMethod === "d17"
                  ? "border-primary/40 bg-primary/5 text-primary shadow-sm"
                  : "border-border/30 bg-background text-muted-foreground hover:border-border/60"
              }`}
            >
              <Smartphone className="h-4 w-4" />
              D17 (Poste Tunisienne)
            </button>
          </div>

          {paymentMethod === "bank_transfer" ? (
            <>
              <Card className="border-border/30 bg-muted/20">
                <CardContent className="p-4 sm:p-6 space-y-3">
                  {[
                    { label: "Banque", value: BANK_INFO.bank },
                    { label: "Titulaire", value: BANK_INFO.titulaire },
                    { label: "RIB", value: BANK_INFO.rib, copyable: true },
                    { label: "IBAN", value: BANK_INFO.iban, copyable: true },
                    { label: "Swift/BIC", value: BANK_INFO.swift, copyable: true },
                    { label: "Montant", value: BANK_INFO.montant, highlight: true },
                    { label: "Motif", value: "Abonnement BudgetBati Pro - [Votre email]", copyable: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/5 last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold text-right ${item.highlight ? "text-primary text-sm" : ""}`}>
                          {item.value}
                        </span>
                        {item.copyable && (
                          <button
                            onClick={() => handleCopy(item.value, item.label)}
                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/50 transition-colors"
                            title={`Copier ${item.label}`}
                          >
                            {copying === item.label ? (
                              <CheckCheck className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="mt-4 flex items-start gap-2 text-[10px] text-muted-foreground/60">
                <Shield className="h-3 w-3 shrink-0 mt-0.5" />
                <p>
                  Une fois le virement effectué, votre abonnement sera activé manuellement sous 24h ouvrées.
                  Vous recevrez une confirmation par email. Pour toute question : support@budgetbati.tn
                </p>
              </div>
            </>
          ) : (
            <>
              <Card className="border-border/30 bg-muted/20">
                <CardContent className="p-4 sm:p-6 space-y-3">
                  {[
                    { label: "Bénéficiaire", value: D17_INFO.merchantName },
                    { label: "Téléphone D17", value: D17_INFO.phone, copyable: true },
                    { label: "Email", value: D17_INFO.email, copyable: true },
                    { label: "Montant", value: D17_INFO.montant, highlight: true },
                    { label: "Motif", value: "Abonnement BudgetBati Pro - [Votre email]", copyable: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/5 last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold text-right ${item.highlight ? "text-primary text-sm" : ""}`}>
                          {item.value}
                        </span>
                        {item.copyable && (
                          <button
                            onClick={() => handleCopy(item.value, item.label)}
                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/50 transition-colors"
                            title={`Copier ${item.label}`}
                          >
                            {copying === item.label ? (
                              <CheckCheck className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-[10px] text-muted-foreground/60">
                  <Shield className="h-3 w-3 shrink-0 mt-0.5" />
                  <p>
                    {D17_INFO.notice}. Votre abonnement sera activé manuellement sous 24h ouvrées.
                    Vous recevrez une confirmation par email.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/50 flex items-start gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700">
                    <strong>Comment payer avec D17 ?</strong> Ouvrez l'application D17 sur votre téléphone,
                    sélectionnez "Paiement marchand", entrez le téléphone ci-dessus et le montant de {proPrice} {currency}.
                    Envoyez-nous la confirmation par email.
                  </p>
                </div>
              </div>
            </>
          )}

          {isPro && (
            <div className="mt-4 px-4 py-3 sm:py-3 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-1.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-xs sm:text-xs text-emerald-700 leading-relaxed">
                    Vous êtes déjà abonné Pro.
                  </span>
                </div>
                <span className="text-xs sm:text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full sm:rounded-md whitespace-nowrap">
                  {remainingDownloads ?? 10} téléchargement{remainingDownloads && remainingDownloads > 1 ? "s" : ""} restant{remainingDownloads && remainingDownloads > 1 ? "s" : ""}
                </span>
              </div>
            </div>
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
        </motion.div>
      </div>
    </main>
  );
}
