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
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import {
  MessagingIconWithBadge,
  useMessagingUnread,
} from "@/components/MessagingBadge";
import { AvailabilityFields } from "@/components/expert/ExpertAvailabilityFields";
import {
  EXPERT_PROFESSIONS,
  PROFESSION_SPECIALTIES,
  PROFESSIONNEL_SPECIALTY_GROUPS,
  SPECIALTY_LABELS,
  TUNISIA_REGIONS,
} from "@/components/expert/expertProfileOptions";
import {
  expertProfessionLabel,
  normalizeExpertProfession,
} from "@/lib/expertProfessions";
import type { ExpertAvailability } from "@/lib/expertAvailability";
import { availablePaymentMethods } from "@/lib/paymentMethods";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2, Phone, Mail, MapPin, Globe, CheckCircle2,
  Eye, EyeOff, Loader2, Plus, Check, ArrowLeft, CreditCard,
  ShieldCheck, Trash2, AlertTriangle, Clock3, Lock,
  Banknote, Smartphone, Landmark, UserRound, Upload,
  Wallet, BarChart3, Briefcase, Ruler, HardHat, Store,
  Wrench, Zap, ImageIcon,
} from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

// Les professions, spécialités et régions sont définies dans
// `@/components/expert/expertProfileOptions` (partagées avec ProMarket).

// ============================================================================
// Spécialités — sélection (champ « Spécialité » pour la catégorie Professionnel)
// ============================================================================

function SpecialtyPicker({
  profession,
  selected,
  onToggle,
  disabled,
}: {
  profession: string;
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
}) {
  const available = PROFESSION_SPECIALTIES[profession] ?? [];
  // Spécialités déjà enregistrées hors de la liste courante (anciennes
  // professions) : affichées et conservées pour ne jamais effacer une donnée.
  const extra = selected.filter((s) => !available.includes(s));
  const groups =
    profession === "professionnel" ? PROFESSIONNEL_SPECIALTY_GROUPS : null;

  const chip = (s: string) => {
    const isSelected = selected.includes(s);
    return (
      <button
        key={s}
        type="button"
        onClick={() => onToggle(s)}
        disabled={disabled}
        aria-pressed={isSelected}
        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
          isSelected
            ? "bg-violet-50 border-violet-300 text-violet-700"
            : "bg-background border-border/30 text-muted-foreground hover:border-border/60"
        } ${disabled ? "cursor-default" : "hover:scale-105 active:scale-95"}`}
      >
        {isSelected && <Check className="h-2.5 w-2.5 inline mr-1" />}
        {SPECIALTY_LABELS[s] || s}
      </button>
    );
  };

  if (groups) {
    return (
      <div className="space-y-2.5">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.options.map(chip)}
            </div>
          </div>
        ))}
        {extra.length > 0 && (
          <div className="space-y-1 border-t border-border/30 pt-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Autres spécialités enregistrées
            </p>
            <div className="flex flex-wrap gap-1.5">{extra.map(chip)}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {available.map(chip)}
      {extra.map(chip)}
    </div>
  );
}

// ============================================================================
// Payment Coordinates (bank + D17)
// ============================================================================

function PaymentCoordinates({
  paymentConfig,
  monthlyPrice,
}: {
  paymentConfig: any;
  monthlyPrice: number;
}) {
  return (
    <div className="space-y-3">
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
            {monthlyPrice} TND
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
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">Swift / BIC</span>
            <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankSwift || "BTBK TN TT"}</span>
          </div>
        </div>
      </div>
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
            {monthlyPrice} TND
          </span>
        </div>
        <div className="divide-y divide-border/30">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">Téléphone D17</span>
            <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.d17Phone || "+216 XX XXX XXX"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">Email</span>
            <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.d17Email || "paiement@batibuild.app"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const deleteProfile = useMutation(api.expertProfiles.deleteProfile);
  // Pastille rouge de la Messagerie (source unique, temps réel) : affichée sur
  // l'icône de l'en-tête, y compris sur mobile.
  const messagingUnread = useMessagingUnread();

  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expertPaymentMethod, setExpertPaymentMethod] = useState<string>("bank_transfer");
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [_uploading, setUploading] = useState(false);
  const [_uploadProgress, setUploadProgress] = useState(0);
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
  const [logoStorageId, setLogoStorageId] = useState<Id<"_storage"> | undefined>(undefined);
  const [logoCleared, setLogoCleared] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  // ── ProMarket : prix indicatifs, disponibilité, demandes urgentes ──
  const [indicativePrice, setIndicativePrice] = useState("");
  const [availability, setAvailability] = useState<ExpertAvailability | "">("");
  const [availabilityDetails, setAvailabilityDetails] = useState("");
  const [acceptsUrgent, setAcceptsUrgent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Init form when profile loads
  useMemo(() => {
    if (profile && !isEditing) {
      // Les professions historiques « plombier » / « electricien » sont
      // rattachées à la catégorie « Professionnel » (spécialité conservée) :
      // le métier correspondant reste coché dans le champ « Spécialité ».
      const storedProfession = profile.profession;
      setProfession(normalizeExpertProfession(storedProfession));
      const storedSpecialties = profile.specialties || [];
      setSelectedSpecialties(
        (storedProfession === "plombier" || storedProfession === "electricien") &&
          !storedSpecialties.includes(storedProfession)
          ? [storedProfession, ...storedSpecialties]
          : storedSpecialties,
      );
      setDisplayName(profile.displayName || "");
      setCompanyName(profile.companyName || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
      setAddress(profile.address || "");
      setWebsite(profile.website || "");
      setDescription(profile.description || "");
      setLogo((profile as any).logo || undefined);
      setLogoStorageId(undefined);
      setLogoCleared(false);
      setSelectedRegions((profile as any).regions || []);
      setIndicativePrice((profile as any).indicativePrice || "");
      setAvailability(((profile as any).availability as ExpertAvailability) || "");
      setAvailabilityDetails((profile as any).availabilityDetails || "");
      setAcceptsUrgent((profile as any).acceptsUrgent === true);
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
      toast.error(
        profession === "professionnel"
          ? "Sélectionnez au moins une spécialité — obligatoire pour la profession « Professionnel »"
          : "Sélectionnez au moins une spécialité",
      );
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
          logo: logoStorageId ? undefined : logo || undefined,
          logoStorageId,
          clearLogo: logoCleared ? true : undefined,
          specialties: selectedSpecialties, regions: selectedRegions,
          // ProMarket : ces informations alimentent directement la fiche publique
          indicativePrice,
          availability: availability || undefined,
          availabilityDetails: availability === "appointment" ? availabilityDetails : "",
          acceptsUrgent,
        });
        toast.success("Profil mis à jour !");
        setIsEditing(false);
      } else {
        await createProfile({
          profession: profession as any,
          displayName, companyName, phone, email,
          address, website: website || undefined,
          description: description || undefined,
          logo: logoStorageId ? undefined : logo || undefined,
          logoStorageId,
          specialties: selectedSpecialties, regions: selectedRegions,
          indicativePrice,
          availability: availability || undefined,
          availabilityDetails: availability === "appointment" ? availabilityDetails : "",
          acceptsUrgent,
        });
        toast.success("Profil expert créé !");
        setIsEditing(false);
      }
      setLogoStorageId(undefined);
      setLogoCleared(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // ── Méthodes de paiement activées par l'administrateur ──
  const expertPaymentMethods = availablePaymentMethods(
    (paymentConfig as any)?.paymentMethods,
  );
  const expertPaymentMethodsSignature = expertPaymentMethods
    .map((m) => m.slug)
    .join("|");
  useEffect(() => {
    if (expertPaymentMethods.length === 0) return;
    if (!expertPaymentMethods.some((m) => m.slug === expertPaymentMethod)) {
      setExpertPaymentMethod(expertPaymentMethods[0].slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertPaymentMethodsSignature]);

  const handleRequestSubscription = async () => {
    if (expertPaymentMethods.length === 0) {
      toast.error(
        "Aucune méthode de paiement n'est disponible. Contactez le support batibuild.",
      );
      return;
    }
    setActivating(true);
    try {
      await requestSub({
        paymentMethod: expertPaymentMethod as "bank_transfer" | "d17",
      });
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
      // Keep the storage ID and preview the file locally — the real storage URL
      // is resolved server-side when the profile is saved.
      setLogoStorageId(storageId as Id<"_storage">);
      setLogoCleared(false);
      setLogo(URL.createObjectURL(file));
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
  // Prix du forfait expert : la configuration enregistrée par l'administrateur
  // fait foi (prix affiché ET facturé). `null` = « Offre gratuite » (donc 0) ;
  // configuration non chargée → 0 plutôt qu'un montant codé en dur (l'ancien
  // repli 150 TND divergeait du tarif administré de 120 TND).
  const configuredExpertPrice = (paymentConfig as any)?.expertPrice;
  const MONTHLY_PRICE =
    configuredExpertPrice === undefined || configuredExpertPrice === null
      ? 0
      : configuredExpertPrice;

  // Période d'essai : mêmes droits qu'un abonnement actif (profil visible et
  // services ouverts) jusqu'à la date de fin calculée par le serveur.
  const isTrial = effStatus === "trial";
  const hasAccess = effStatus === "active" || isTrial;
  const trialStartDate = (profile as any)?.trialStartDate as number | undefined;
  const accessEndDate = (profile as any)?.subscriptionEndDate as number | undefined;
  const formatDay = (ts?: number) =>
    ts ? new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  useEffect(() => {
    if (hasAccess) setShowPaymentChoice(false);
  }, [hasAccess]);

  if (profile === undefined || hasProfile === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "Abonné actif", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck },
    trial: { label: "Période d'essai active", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock3 },
    pending: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock3 },
    inactive: { label: "Inactif", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Briefcase },
    expired: { label: "Essai expiré", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  };
  const stCfg = statusConfig[effStatus] || statusConfig.inactive;
  const StatusIcon = stCfg.icon;

  const currentProf = EXPERT_PROFESSIONS.find((p) => p.value === profession);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <ProfileCompletionBanner />
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
          {/* Messagerie : pastille rouge sur l'icône (même source que le menu) */}
          <button
            onClick={() => navigate("/dashboard/messages")}
            title="Messagerie"
            aria-label="Messagerie"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
          >
            <MessagingIconWithBadge unread={messagingUnread} className="h-4 w-4" />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {profile ? (
            <>
              {/* Status Card */}
              <Card className="border-border/40">
                <CardContent className="p-4 sm:p-5">
                  {/* Top row: avatar + name + action buttons */}
                  <div className="flex items-start gap-3">
                    {logo ? (
                      <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl border border-border/40 bg-muted/20 overflow-hidden shadow-sm">
                        <img src={logo} alt={profile.displayName} className="h-full w-full object-contain p-1" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 shadow-sm">
                        <span className="text-base sm:text-lg font-black text-violet-600 tracking-wide">
                          {(profile.displayName || "?")
                            .split(/\s+/).filter(Boolean)
                            .map((w: string) => w.charAt(0).toUpperCase())
                            .slice(0, 2).join("")}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{profile.displayName}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] ${stCfg.color}`}>
                          <StatusIcon className="h-2.5 w-2.5 inline mr-1" />
                          {stCfg.label}
                        </Badge>
                        {hasAccess && (
                          <Badge
                            variant="secondary"
                            className={`text-[9px] gap-1 ${isTrial ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {(profile as any)?.planFree
                              ? "Offre gratuite · Illimité"
                              : isTrial
                                ? `Essai · ${remainingDays} j restant${remainingDays > 1 ? "s" : ""}`
                                : `${remainingDays} j`}
                          </Badge>
                        )}
                        {/* Visibilité gérée automatiquement (verrouillée) — clic → info */}
                        <button
                          type="button"
                          title="La visibilité est gérée automatiquement selon l'état de votre abonnement"
                          onClick={() =>
                            toast.info(
                              hasAccess
                                ? isTrial
                                  ? "Votre profil est publié pendant toute la période d'essai."
                                  : "Votre profil est publié automatiquement tant que votre abonnement est actif."
                                : "Votre profil n'est pas visible : activez votre abonnement pour être publié. La visibilité est gérée automatiquement.",
                            )
                          }
                          className="flex cursor-help items-center gap-1 text-[9px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {profile.isVisible && hasAccess ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {profile.isVisible && hasAccess ? "Visible" : "Masqué"}
                          <Lock className="h-2.5 w-2.5 opacity-60" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {expertProfessionLabel(profile.profession)}
                        {" · "}{profile.specialties?.length || 0} spécialités · {(profile as any).regions?.length || 0} régions
                      </p>
                      {isTrial && (
                        <div className="mt-2 rounded-lg border border-blue-200/50 bg-blue-50/60 px-2.5 py-1.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
                          Essai Expert du <strong>{formatDay(trialStartDate)}</strong> au{" "}
                          <strong>{formatDay(accessEndDate)}</strong> · {" "}
                          {remainingDays} jour{remainingDays > 1 ? "s" : ""} restant
                          {remainingDays > 1 ? "s" : ""} · paiement obligatoire à partir du{" "}
                          <strong>{formatDay(accessEndDate)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Action buttons row */}
                  {hasAccess && (
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <button
                        onClick={() => navigate("/dashboard/expert/stats")}
                        className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 transition-all hover:bg-violet-100"
                      >
                        <BarChart3 className="h-3 w-3" />
                        Statistiques avancées
                      </button>
                      <button
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                      >
                        <UserRound className="h-3 w-3" />
                        Vue Client
                      </button>
                      <div className="ml-auto">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                          onClick={() => setShowPaymentInfo(!showPaymentInfo)}>
                          <Wallet className="h-3 w-3" />
                          Paiement
                        </Button>
                      </div>
                    </div>
                  )}
                  {!hasAccess && (
                    <div className="flex items-center gap-1.5 mt-3">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                        onClick={() => setShowPaymentInfo(!showPaymentInfo)}>
                        <Wallet className="h-3 w-3" />
                        Paiement
                      </Button>
                      {(effStatus === "inactive" || effStatus === "expired") && (
                        <Button size="sm" className="h-7 text-[10px] gap-1"
                          onClick={() => setShowPaymentChoice(true)}>
                          <CreditCard className="h-3 w-3" />
                          {effStatus === "expired" ? "Payer pour continuer" : "Activer mon abonnement"}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Payment info inline (show on click) */}
                  {showPaymentInfo && effStatus === "active" && (
                    <div className="mt-3">
                      <PaymentCoordinates paymentConfig={paymentConfig} monthlyPrice={MONTHLY_PRICE} />
                    </div>
                  )}
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
                          {["Présentez votre expertise aux porteurs de projets", "Recevez des demandes de consultation adaptées à votre profil", "Développez votre visibilité auprès de nouveaux clients", "Gérez vos demandes et rendez-vous depuis votre espace", "Valorisez votre profil, vos services et vos tarifs"].map((f) => (
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
              {(showPaymentChoice || effStatus === "pending") && !hasAccess && (
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
                        {expertPaymentMethods.length === 0 ? (
                          <div className="rounded-xl border border-amber-200/50 bg-amber-50/60 px-4 py-3">
                            <p className="text-xs font-semibold text-amber-700">
                              Aucune méthode de paiement n'est disponible actuellement.
                            </p>
                            <p className="mt-0.5 text-[10px] text-amber-600/80">
                              Contactez le support batibuild pour activer votre abonnement.
                            </p>
                          </div>
                        ) : (
                        <div className="flex gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
                          {expertPaymentMethods.map((method) => {
                            const MethodIcon =
                              method.icon === "smartphone" ? Smartphone : method.icon === "card" ? CreditCard : Banknote;
                            const active = expertPaymentMethod === method.slug;
                            return (
                              <button
                                key={method.slug}
                                onClick={() => setExpertPaymentMethod(method.slug)}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                                  active
                                    ? `border-border/40 bg-background shadow-sm ${method.slug === "d17" ? "text-amber-600" : "text-violet-600"}`
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
                  {/* Logo upload */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Logo de l'entreprise</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
                        {logo ? (
                          <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed text-[10px] transition-all ${isEditing ? "border-border/40 hover:border-violet-300 cursor-pointer hover:bg-muted/20" : "border-border/30 opacity-60 cursor-default"}`}>
                          {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploadingLogo ? "Upload..." : logo ? "Changer le logo" : "Ajouter un logo"}
                          <input type="file" accept="image/*" onChange={handleUploadLogo} disabled={!isEditing} className="hidden" />
                        </label>
                        {logo && isEditing && (
                          <button type="button" onClick={() => { setLogo(undefined); setLogoStorageId(undefined); setLogoCleared(true); }} className="text-[10px] text-destructive hover:underline text-left">
                            Supprimer le logo
                          </button>
                        )}
                      </div>
                    </div>
                    {!logo && isEditing && (
                      <p className="text-[9px] text-muted-foreground">JPG, PNG ou WebP · Max 5 Mo</p>
                    )}
                  </div>

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

              {/* Specialties — champ obligatoire « Spécialité » pour Professionnel */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    {profession === "professionnel" ? "Spécialité" : "Spécialités"} — {currentProf?.label} ({selectedSpecialties.length})
                    {profession === "professionnel" && (
                      <span className="ml-1 text-destructive" aria-hidden>*</span>
                    )}
                  </CardTitle>
                  {profession === "professionnel" && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Sélectionnez au moins un métier (obligatoire).
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <SpecialtyPicker
                    profession={profession}
                    selected={selectedSpecialties}
                    onToggle={toggleSpecialty}
                    disabled={!isEditing}
                  />
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

              {/* ProMarket : prix indicatifs, disponibilité, urgences */}
              <AvailabilityFields
                editing={isEditing}
                indicativePrice={indicativePrice}
                setIndicativePrice={setIndicativePrice}
                availability={availability}
                setAvailability={setAvailability}
                availabilityDetails={availabilityDetails}
                setAvailabilityDetails={setAvailabilityDetails}
                acceptsUrgent={acceptsUrgent}
                setAcceptsUrgent={setAcceptsUrgent}
              />

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
          ) : isEditing ? (
            /* ═══ Create Profile Form ═══ */
            <>
              {/* Profession Selector */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Profession</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPERT_PROFESSIONS.map((p) => {
                      const Icon = p.icon;
                      const selected = profession === p.value;
                      return (
                        <button key={p.value} onClick={() => setProfession(p.value)}
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
                </CardContent>
              </Card>

              {/* Profile Fields */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Informations du profil</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                      Annuler
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo upload (create mode) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Logo de l'entreprise (optionnel)</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
                        {logo ? (
                          <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border/40 hover:border-violet-300 cursor-pointer transition-all hover:bg-muted/20 text-[10px]">
                          {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploadingLogo ? "Upload..." : logo ? "Changer le logo" : "Ajouter un logo"}
                          <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                        </label>
                        {logo && (
                          <button type="button" onClick={() => { setLogo(undefined); setLogoStorageId(undefined); setLogoCleared(true); }} className="text-[10px] text-destructive hover:underline text-left">
                            Supprimer le logo
                          </button>
                        )}
                      </div>
                    </div>
                    {!logo && (
                      <p className="text-[9px] text-muted-foreground">JPG, PNG ou WebP · Max 5 Mo</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><UserRound className="h-3 w-3" /> Nom complet *</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Votre nom complet" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Cabinet / Société (optionnel)</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nom du cabinet ou de la société" className="h-9 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Téléphone *</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email *</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse (optionnel)</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ville, Gouvernorat" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Site web (optionnel)</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description (optionnelle)</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Présentez votre expertise, vos réalisations..." className="text-sm min-h-[60px]" rows={2} />
                  </div>
                </CardContent>
              </Card>

              {/* Specialties — champ obligatoire « Spécialité » pour Professionnel */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    {profession === "professionnel" ? "Spécialité" : "Spécialités"} — {currentProf?.label} ({selectedSpecialties.length})
                    {profession === "professionnel" && (
                      <span className="ml-1 text-destructive" aria-hidden>*</span>
                    )}
                  </CardTitle>
                  {profession === "professionnel" && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Sélectionnez au moins un métier (obligatoire).
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <SpecialtyPicker
                    profession={profession}
                    selected={selectedSpecialties}
                    onToggle={toggleSpecialty}
                  />
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
                        <button key={r.value} onClick={() => toggleRegion(r.value)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95 ${
                            selected
                              ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                              : "bg-background border-border/30 text-muted-foreground hover:border-border/60"
                          }`}>
                          {selected && <Check className="h-2.5 w-2.5 inline mr-1" />}
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* ProMarket : prix indicatifs, disponibilité, urgences */}
              <AvailabilityFields
                editing
                indicativePrice={indicativePrice}
                setIndicativePrice={setIndicativePrice}
                availability={availability}
                setAvailability={setAvailability}
                availabilityDetails={availabilityDetails}
                setAvailabilityDetails={setAvailabilityDetails}
                acceptsUrgent={acceptsUrgent}
                setAcceptsUrgent={setAcceptsUrgent}
              />

              {/* Save Button */}
              <div className="flex items-center justify-between gap-2">
                <Button size="sm" className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Enregistrer le profil
                </Button>
              </div>
            </>
          ) : (
            /* No profile yet — CTA */
            <Card className="border-border/40">
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <Briefcase className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Créez votre profil expert</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Vous êtes architecte, ingénieur, bureau d'études, promoteur ou professionnel du bâtiment ? Créez votre profil pour recevoir des demandes de devis.
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
