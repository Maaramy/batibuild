import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2, Phone, Mail, MapPin, Globe, CheckCircle2,
  Eye, EyeOff, Loader2, Plus, Check, ArrowLeft, CreditCard,
  ShieldCheck, Trash2, AlertTriangle,
  Banknote, Smartphone, Landmark, UserRound, Clock3, Upload,
  Wallet, BarChart3, FileText, Briefcase, Ruler, HardHat, LandmarkIcon,
  X,
} from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

const EXPERT_PROFESSIONS = [
  { value: "architecte", label: "Architecte", icon: Ruler, desc: "Conception, plans, suivi de chantier" },
  { value: "bureau_etudes", label: "Bureau d'études", icon: Briefcase, desc: "Études techniques, dimensionnement" },
  { value: "ingenieur", label: "Ingénieur", icon: HardHat, desc: "Structure, génie civil, MEP" },
  { value: "promoteur_immobilier", label: "Promoteur immobilier", icon: LandmarkIcon, desc: "Développement, commercialisation" },
];

const ARCHITECTE_SPECIALTIES = [
  "conception_architecturale", "plans_2d", "plans_3d", "bim",
  "permis_construire", "decoration_interieure", "paysagisme",
  "renovation_patrimoine", "audit_energetique", "suivi_chantier",
];

const BUREAU_ETUDES_SPECIALTIES = [
  "etudes_structure", "dimensionnement", "bim_modeling",
  "assistance_technique", " controle_technique", "etudes_impact",
  "geotechnique", "topographie", "plans_executeifs",
  "dossier_consultation_entreprises",
];

const INGENIEUR_SPECIALTIES = [
  "genie_civil", "structure_beton", "structure_acier",
  "installation_thermique", "installation_sanitaire",
  "installation_electrique", "cvc", "s排水",
  "ignifugation", "etancheite", "acoustique",
];

const PROMOTEUR_SPECIALTIES = [
  "promotion_immobiliere", "viabilisation", "commercialisation",
  "gestion_projet", "finance_projet", "urbanisme",
  "permis_construire", "etudes_marche", "négociation",
  "suivi_livraison",
];

const PROFESSION_SPECIALTIES: Record<string, string[]> = {
  architecte: ARCHITECTE_SPECIALTIES,
  bureau_etudes: BUREAU_ETUDES_SPECIALTIES,
  ingenieur: INGENIEUR_SPECIALTIES,
  promoteur_immobilier: PROMOTEUR_SPECIALTIES,
};

const SPECIALTY_LABELS: Record<string, string> = {
  conception_architecturale: "Conception architecturale",
  plans_2d: "Plans 2D", plans_3d: "Plans 3D", bim: "BIM",
  permis_construire: "Permis de construire",
  decoration_interieure: "Décoration intérieure",
  paysagisme: "Paysagisme", renovation_patrimoine: "Rénovation patrimoine",
  audit_energetique: "Audit énergétique", suivi_chantier: "Suivi de chantier",
  etudes_structure: "Études de structure", dimensionnement: "Dimensionnement",
  bim_modeling: "Modélisation BIM", assistance_technique: "Assistance technique",
  controle_technique: "Contrôle technique", etudes_impact: "Études d'impact",
  geotechnique: "Géotechnique", topographie: "Topographie",
  plans_executeifs: "Plans exécutifs",
  dossier_consultation_entreprises: "DCE",
  genie_civil: "Génie civil", structure_beton: "Structure béton",
  structure_acier: "Structure acier", installation_thermique: "Installations thermiques",
  installation_sanitaire: "Installations sanitaires",
  installation_electrique: "Installations électriques",
  cvc: "CVC", s排水: "Assainissement",
  ignifugation: "Ignifugation", etancheite: "Étanchéité", acoustique: "Acoustique",
  promotion_immobiliere: "Promotion immobilière", viabilisation: "Viabilisation",
  commercialisation: "Commercialisation", gestion_projet: "Gestion de projet",
  finance_projet: "Financement", urbanisme: "Urbanisme",
  etudes_marche: "Études de marché", negociation: "Négociation",
  suivi_livraison: "Suivi de livraison",
};

const TUNISIA_REGIONS = [
  { value: "tunis", label: "Tunis" }, { value: "ariana", label: "Ariana" },
  { value: "ben_arous", label: "Ben Arous" }, { value: "manouba", label: "Manouba" },
  { value: "nabeul", label: "Nabeul" }, { value: "zaghouan", label: "Zaghouan" },
  { value: "bizerte", label: "Bizerte" }, { value: "beja", label: "Béja" },
  { value: "jendouba", label: "Jendouba" }, { value: "le_kef", label: "Le Kef" },
  { value: "siliana", label: "Siliana" }, { value: "kairouan", label: "Kairouan" },
  { value: "kasserine", label: "Kasserine" }, { value: "sidi_bouzid", label: "Sidi Bouzid" },
  { value: "sousse", label: "Sousse" }, { value: "monastir", label: "Monastir" },
  { value: "mahdia", label: "Mahdia" }, { value: "sfax", label: "Sfax" },
  { value: "gabes", label: "Gabès" }, { value: "medenine", label: "Médenine" },
  { value: "tataouine", label: "Tataouine" }, { value: "gafsa", label: "Gafsa" },
  { value: "tozeur", label: "Tozeur" }, { value: "kebili", label: "Kébili" },
];

// ============================================================================
// Component
// ============================================================================

export default function ExpertDashboard() {
  const navigate = useNavigate();
  const profile = useQuery(api.expertProfiles.getMyProfile);
  const hasProfile = useQuery(api.expertProfiles.hasExpertProfile);
  const paymentConfig = useQuery(api.payments.getPublicPricing);
  const createProfile = useMutation(api.expertProfiles.createProfile);
  const updateProfile = useMutation(api.expertProfiles.updateProfile);
  const requestSub = useMutation(api.expertProfiles.requestSubscription);
  const uploadExpertPaymentProof = useMutation(api.expertProfiles.uploadExpertPaymentProof);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const toggleVis = useMutation(api.expertProfiles.toggleVisibility);
  const deleteProfile = useMutation(api.expertProfiles.deleteProfile);

  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expertPaymentMethod, setExpertPaymentMethod] = useState<"bank_transfer" | "d17">("bank_transfer");
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const [profession, setProfession] = useState<string>("architecte");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Init form when profile loads
  useMemo(() => {
    if (profile && !isEditing) {
      setProfession(profile.profession || "architecte");
      setDisplayName(profile.displayName || "");
      setCompanyName(profile.companyName || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
      setAddress(profile.address || "");
      setWebsite(profile.website || "");
      setDescription(profile.description || "");
      setLogo((profile as any).logo || undefined);
      setSelectedSpecialties(profile.specialties || []);
      setSelectedRegions((profile as any).regions || []);
    }
  }, [profile]);

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const toggleRegion = (r: string) => {
    setSelectedRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const handleSave = async () => {
    if (!displayName || !phone || !email) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    if (selectedSpecialties.length === 0) {
      toast.error("Sélectionnez au moins une spécialité");
      return;
    }
    if (selectedRegions.length === 0) {
      toast.error("Sélectionnez au moins une région");
      return;
    }
    setSaving(true);
    try {
      if (profile) {
        await updateProfile({
          profession: profession as any,
          displayName, companyName, phone, email,
          address, website: website || undefined,
          description: description || undefined,
          logo: logo || undefined,
          specialties: selectedSpecialties, regions: selectedRegions,
        });
        toast.success("Profil mis à jour !");
        setIsEditing(false);
      } else {
        await createProfile({
          profession: profession as any,
          displayName, companyName, phone, email,
          address, website: website || undefined,
          description: description || undefined,
          logo: logo || undefined,
          specialties: selectedSpecialties, regions: selectedRegions,
        });
        toast.success("Profil expert créé !");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSubscription = async () => {
    setActivating(true);
    try {
      await requestSub({ paymentMethod: expertPaymentMethod });
      toast.success("Demande d'abonnement envoyée !");
      setShowPaymentChoice(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la demande");
    } finally {
      setActivating(false);
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Format accepté : image (JPG, PNG) ou PDF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    setUploading(true);
    setUploadProgress(10);
    try {
      const uploadUrl = await generateUploadUrl();
      setUploadProgress(30);
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setUploadProgress(70);
      if (!result.ok) throw new Error("Échec de l'upload");
      const { storageId } = await result.json();
      setUploadProgress(85);
      const fileUrl = `${window.location.origin}/api/storage/${storageId}`;
      await uploadExpertPaymentProof({
        storageId: storageId as any,
        url: fileUrl,
        fileName: file.name,
      });
      setUploadProgress(100);
      setUploadedFile(file.name);
      toast.success("Reçu de paiement envoyé !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Format accepté : image (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    setUploadingLogo(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Échec de l'upload");
      const { storageId } = await result.json();
      const fileUrl = `${window.location.origin}/api/storage/${storageId}`;
      setLogo(fileUrl);
      toast.success("Logo ajouté ! Enregistrez pour confirmer.");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload du logo");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProfile();
      toast.success("Profil expert supprimé");
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  };

  const effStatus = (profile as any)?.effectiveStatus || profile?.subscriptionStatus || "inactive";
  const remainingDays = (profile as any)?.remainingDays ?? 0;
  const MONTHLY_PRICE = paymentConfig?.expertPrice || 150;

  useEffect(() => {
    if (effStatus === "active") setShowPaymentChoice(false);
  }, [effStatus]);

  if (profile === undefined || hasProfile === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "Abonné Pro", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck },
    pending: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock3 },
    inactive: { label: "Inactif", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Briefcase },
    expired: { label: "Expiré", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  };
  const stCfg = statusConfig[effStatus] || statusConfig.inactive;
  const StatusIcon = stCfg.icon;

  const currentProf = EXPERT_PROFESSIONS.find((p) => p.value === profession);
  const availableSpecialties = PROFESSION_SPECIALTIES[profession] || [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/dashboard")}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted/50 active:scale-95 transition-all">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">Espace Expert</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {profile ? "Profil et abonnement" : "Créez votre profil"}
            </p>
          </div>
          {effStatus === "active" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate("/dashboard/expert/services")}
                className="flex items-center gap-1 rounded-md border border-border/40 bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <FileText className="h-3 w-3" />
                Demandes reçues
              </button>
              <button
                onClick={() => navigate("/dashboard/expert/stats")}
                className="flex items-center gap-1 rounded-md border border-border/40 bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <BarChart3 className="h-3 w-3" />
                Stats
              </button>
            </div>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {profile ? (
            <>
              {/* Status Card */}
              <Card className="border-border/40">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {logo ? (
                        <div className="h-14 w-14 shrink-0 rounded-xl border border-border/40 bg-muted/20 overflow-hidden shadow-sm">
                          <img src={logo} alt={profile.displayName} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 shadow-sm">
                          <span className="text-lg font-black text-violet-600 tracking-wide">
                            {(profile.displayName || "?")
                              .split(/\s+/).filter(Boolean)
                              .map((w: string) => w.charAt(0).toUpperCase())
                              .slice(0, 2).join("")}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{profile.displayName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] ${stCfg.color}`}>
                            <StatusIcon className="h-2.5 w-2.5 inline mr-1" />
                            {stCfg.label}
                          </Badge>
                          {effStatus === "active" && (
                            <Badge variant="secondary" className="text-[9px] gap-1 bg-emerald-50 text-emerald-600">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              {remainingDays} jour{remainingDays > 1 ? "s" : ""}
                            </Badge>
                          )}
                          <button onClick={() => toggleVis()}
                            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
                            {profile.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {profile.isVisible ? "Visible" : "Masqué"}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {EXPERT_PROFESSIONS.find((p) => p.value === profile.profession)?.label || profile.profession}
                          {" · "}
                          {profile.specialties?.length || 0} spécialités · {(profile as any).regions?.length || 0} régions
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 w-full sm:w-auto"
                        onClick={() => setShowPaymentChoice(true)}>
                        <Wallet className="h-3 w-3" />
                        Moyen de paiement
                      </Button>
                      {(effStatus === "inactive" || effStatus === "expired") && (
                        <Button size="sm" className="h-8 text-xs gap-1.5 w-full sm:w-auto"
                          onClick={() => setShowPaymentChoice(true)}>
                          <CreditCard className="h-3 w-3" />
                          {MONTHLY_PRICE} TND/mois
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plan Selection */}
              {(effStatus === "inactive" || effStatus === "expired") && (
                <Card className="border-violet-200 bg-gradient-to-br from-violet-50/50 to-background ring-1 ring-violet-100 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setShowPaymentChoice(true)}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Abonnement Expert</p>
                        <p className="text-lg font-black text-violet-600 mt-1">{MONTHLY_PRICE} TND<small className="text-[9px] font-normal text-muted-foreground">/mois</small></p>
                        <ul className="mt-2 space-y-1">
                          {["Profil expert complet", "Badge certifié", "Demandes de services", "Statistiques avancées", "Support prioritaire"].map((f) => (
                            <li key={f} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                              <Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />{f}
                            </li>
                          ))}
                        </ul>
                        {activating && <Loader2 className="h-4 w-4 animate-spin mx-auto mt-2" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Choice */}
              {(showPaymentChoice || effStatus === "pending") && effStatus !== "active" && (
                <Card className="border-violet-200 bg-gradient-to-br from-violet-50/30 to-background">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Moyen de paiement</p>
                      {showPaymentChoice && (
                        <button onClick={() => setShowPaymentChoice(false)} className="text-xs text-muted-foreground hover:text-foreground">
                          Annuler
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Forfait <strong>Expert</strong> · <strong className="text-violet-600">{MONTHLY_PRICE} TND/mois</strong>
                    </p>
                    {effStatus !== "pending" && (
                      <>
                        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
                          <button onClick={() => setExpertPaymentMethod("bank_transfer")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                              expertPaymentMethod === "bank_transfer"
                                ? "border-border/40 bg-background text-violet-600 shadow-sm"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}>
                            <Banknote className="h-3.5 w-3.5" />
                            Virement bancaire
                          </button>
                          <button onClick={() => setExpertPaymentMethod("d17")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                              expertPaymentMethod === "d17"
                                ? "border-border/40 bg-background text-amber-600 shadow-sm"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}>
                            <Smartphone className="h-3.5 w-3.5" />
                            D17
                          </button>
                        </div>
                        {expertPaymentMethod === "bank_transfer" ? (
                          <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-muted/10 px-4 py-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                                  <Landmark className="h-4 w-4 text-violet-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold">{paymentConfig?.bankName || "Banque de Tunisie"}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">Coordonnées bancaires</p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-bold text-white">
                                {MONTHLY_PRICE} TND
                              </span>
                            </div>
                            <div className="divide-y divide-border/30">
                              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">RIB</span>
                                <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankRib || "—"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">IBAN</span>
                                <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankIban || "—"}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-amber-500/[0.07] px-4 py-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                                  <Smartphone className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold">D17 · La Poste Tunisienne</p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                                {MONTHLY_PRICE} TND
                              </span>
                            </div>
                            <div className="divide-y divide-border/30">
                              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">Téléphone D17</span>
                                <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.d17Phone || "—"}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70">
                      <ShieldCheck className="h-3 w-3 shrink-0 mt-0.5" />
                      <p>Activation manuelle sous 24h ouvrées après réception du paiement.</p>
                    </div>
                    {effStatus === "pending" ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50/60 border border-emerald-200/50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <p className="text-xs font-semibold text-emerald-700">Demande envoyée — paiement en attente</p>
                      </div>
                    ) : (
                      <Button className="w-full h-10 text-sm gap-2 bg-violet-600 hover:bg-violet-700" onClick={handleRequestSubscription} disabled={activating}>
                        {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        {activating ? "Envoi..." : `Payer ${MONTHLY_PRICE} TND/mois`}
                      </Button>
                    )}
                    {effStatus === "pending" && (
                      <div className="px-4 py-3 rounded-xl bg-white/50 border border-border/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Upload className="h-3.5 w-3.5 text-violet-600" />
                          <p className="text-xs font-semibold">Joindre votre reçu</p>
                        </div>
                        {(profile as any)?.paymentProofUrl || uploadedFile ? (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-xs text-emerald-700 truncate">{uploadedFile || "Reçu envoyé"}</span>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-border/40 hover:border-violet-300 cursor-pointer transition-all hover:bg-muted/20">
                            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-[10px]">Image ou PDF · Max 5 Mo</span>
                            <input type="file" accept="image/*,.pdf" onChange={handleUploadReceipt} className="hidden" />
                          </label>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Profile Form */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Informations du profil</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(!isEditing)}>
                      {isEditing ? "Annuler" : "Modifier"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profession Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Briefcase className="h-3 w-3" /> Profession</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {EXPERT_PROFESSIONS.map((p) => {
                        const Icon = p.icon;
                        const selected = profession === p.value;
                        return (
                          <button key={p.value} onClick={() => isEditing && setProfession(p.value)}
                            disabled={!isEditing}
                            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                              selected
                                ? "border-violet-400 dark:border-violet-500 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-800/20 text-violet-700 dark:text-violet-300 shadow-sm"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                            }`}>
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              selected ? "bg-violet-500 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                            }`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{p.label}</p>
                              <p className="text-[9px] text-muted-foreground truncate">{p.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><UserRound className="h-3 w-3" /> Nom complet</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Cabinet / Société (optionnel)</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Téléphone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse (optionnel)</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Site web (optionnel)</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description (optionnelle)</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isEditing} className="text-sm min-h-[60px]" rows={2} />
                  </div>
                </CardContent>
              </Card>

              {/* Specialties */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Spécialités — {currentProf?.label} ({selectedSpecialties.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSpecialties.map((s) => {
                      const selected = selectedSpecialties.includes(s);
                      return (
                        <button key={s} onClick={() => isEditing && toggleSpecialty(s)} disabled={!isEditing}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            selected
                              ? "bg-violet-50 border-violet-300 text-violet-700"
                              : "bg-background border-border/30 text-muted-foreground hover:border-border/60"
                          } ${!isEditing ? "cursor-default" : "hover:scale-105 active:scale-95"}`}>
                          {selected && <Check className="h-2.5 w-2.5 inline mr-1" />}
                          {SPECIALTY_LABELS[s] || s}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Regions */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Régions d'intervention ({selectedRegions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {TUNISIA_REGIONS.map((r) => {
                      const selected = selectedRegions.includes(r.value);
                      return (
                        <button key={r.value} onClick={() => isEditing && toggleRegion(r.value)} disabled={!isEditing}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            selected
                              ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                              : "bg-background border-border/30 text-muted-foreground hover:border-border/60"
                          } ${!isEditing ? "cursor-default" : "hover:scale-105 active:scale-95"}`}>
                          {selected && <Check className="h-2.5 w-2.5 inline mr-1" />}
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <Button size="sm" className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Enregistrer
                    </Button>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive/80"
                  onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Supprimer le profil
                </Button>
              </div>
            </>
          ) : (
            /* No profile yet — creation form */
            <Card className="border-border/40">
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <Briefcase className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Créez votre profil expert</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Vous êtes architecte, ingénieur, bureau d'études ou promoteur ? Créez votre profil pour recevoir des demandes de services.
                  </p>
                </div>
                <Button className="gap-1.5 text-sm bg-violet-600 hover:bg-violet-700" onClick={() => setIsEditing(true)}>
                  <Plus className="h-4 w-4" />
                  Créer mon profil
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Supprimer le profil
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cette action est irréversible. Votre profil expert et toutes vos données seront supprimés.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowDeleteConfirm(false)}>
              Annuler
            </Button>
            <Button size="sm" variant="destructive" className="text-xs gap-1.5" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
