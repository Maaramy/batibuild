import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
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
  Store, ShieldCheck, Trash2, AlertTriangle,
  Banknote, Smartphone, Landmark, UserRound, Clock3, Upload, Image as ImageIcon, X,
  Wallet, BarChart3, FileText,
} from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

const SPECIALTIES = [
  "construction_maisons", "villas", "immeubles", "piscines", "jardins",
  "terrassement", "fondations", "gros_oeuvre", "second_oeuvre", "macconnerie",
  "beton", "ferraillage", "coffrage", "charpente", "toiture", "etancheite",
  "isolation", "carrelage", "marbre", "peinture", "electricite", "plomberie",
  "climatisation", "cuisine", "salle_de_bain", "aluminium", "menuserie_bois",
  "pvc", "portes", "fenetres", "energie_solaire", "domotique", "voirie",
  "demolition", "transport_materiaux", "location_engins", "architecte",
  "bureau_etudes", "ingenieur", "geometre", "promoteur_immobilier",
];

const SPECIALTY_LABELS: Record<string, string> = {
  construction_maisons: "Construction de maisons",
  villas: "Villas", immeubles: "Immeubles", piscines: "Piscines",
  jardins: "Jardins", terrassement: "Terrassement", fondations: "Fondations",
  gros_oeuvre: "Gros œuvre", second_oeuvre: "Second œuvre",
  macconnerie: "Maçonnerie", beton: "Béton", ferraillage: "Ferraillage",
  coffrage: "Coffrage", charpente: "Charpente", toiture: "Toiture",
  etancheite: "Étanchéité", isolation: "Isolation", carrelage: "Carrelage",
  marbre: "Marbre", peinture: "Peinture", electricite: "Électricité",
  plomberie: "Plomberie", climatisation: "Climatisation", cuisine: "Cuisine",
  salle_de_bain: "Salle de bain", aluminium: "Aluminium",
  menuserie_bois: "Menuiserie bois", pvc: "PVC", portes: "Portes",
  fenetres: "Fenêtres", energie_solaire: "Énergie solaire",
  domotique: "Domotique", voirie: "Voirie", demolition: "Démolition",
  transport_materiaux: "Transport de matériaux",
  location_engins: "Location d'engins", architecte: "Architecte",
  bureau_etudes: "Bureau d'études", ingenieur: "Ingénieur",
  geometre: "Géomètre", promoteur_immobilier: "Promoteur immobilier",
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
// Payment Coordinates (bank + D17) — reused in the choice card & popup
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
      {/* Bank transfer */}
      <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-muted/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{paymentConfig?.bankName || "Banque de Tunisie"}</p>
              <p className="truncate text-[10px] text-muted-foreground">Coordonnées bancaires</p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            {monthlyPrice} TND
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
                <p className="truncate text-sm font-bold">{paymentConfig?.bankTitulaire || "GALISKON PROJECT"}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">RIB</span>
            <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankRib || "TN59 0700 1123 4567 8901 2347"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">IBAN</span>
            <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankIban || "TN59 0700 1123 4567 8901 2347"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">Swift / BIC</span>
            <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankSwift || "BTBK TN TT"}</span>
          </div>
        </div>
      </div>

      {/* D17 */}
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
          <div className="flex items-center justify-between gap-3 bg-amber-500/[0.07] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
                <UserRound className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Bénéficiaire</p>
                <p className="truncate text-sm font-bold">{paymentConfig?.d17MerchantName || "GALISKON PROJECT"}</p>
              </div>
            </div>
          </div>
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
// Page Component
// ============================================================================

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const profile = useQuery(api.supplierProfiles.getMyProfile);
  const hasProfile = useQuery(api.supplierProfiles.hasSupplierProfile);
  const unreadCount = useQuery(api.quoteRequests.unreadCount);
  const paymentConfig = useQuery(api.payments.getPublicPricing);
  const createProfile = useMutation(api.supplierProfiles.createProfile);
  const updateProfile = useMutation(api.supplierProfiles.updateProfile);
  const requestSub = useMutation(api.supplierProfiles.requestSubscription);
  const uploadSupplierPaymentProof = useMutation(api.supplierProfiles.uploadSupplierPaymentProof);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const toggleVis = useMutation(api.supplierProfiles.toggleVisibility);
  const deleteProfile = useMutation(api.supplierProfiles.deleteProfile);

  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierPaymentMethod, setSupplierPaymentMethod] = useState<"bank_transfer" | "d17">("bank_transfer");
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

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
  const [isEditing, setIsEditing] = useState(false);

  // Init form when profile loads
  useMemo(() => {
    if (profile && !isEditing) {
      setCompanyName(profile.companyName || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
      setAddress(profile.address || "");
      setWebsite(profile.website || "");
      setDescription(profile.description || "");
      setLogo((profile as any).logo || undefined);
      setLogoStorageId(undefined);
      setLogoCleared(false);
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
    if (!companyName || !phone || !email || !address) {
      toast.error("Veuillez remplir tous les champs obligatoires");
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
          companyName, phone, email, address,
          website: website || undefined,
          description: description || undefined,
          logo: logoStorageId ? undefined : logo || undefined,
          logoStorageId,
          clearLogo: logoCleared ? true : undefined,
          specialties: selectedSpecialties, regions: selectedRegions,
        });
        toast.success("Profil mis à jour !");
        setIsEditing(false);
      } else {
        await createProfile({
          companyName, phone, email, address,
          website: website || undefined,
          description: description || undefined,
          logo: logoStorageId ? undefined : logo || undefined,
          logoStorageId,
          specialties: selectedSpecialties, regions: selectedRegions,
        });
        toast.success("Profil fournisseur créé !");
      }
      setLogoStorageId(undefined);
      setLogoCleared(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSubscription = async () => {
    setActivating(true);
    try {
      await requestSub({ paymentMethod: supplierPaymentMethod });
      const method = supplierPaymentMethod === "d17" ? "D17" : "virement bancaire";
      toast.success(`Demande d'abonnement envoyée ! (${MONTHLY_PRICE} TND/mois - paiement par ${method})`);
      setShowPaymentChoice(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la demande");
    } finally {
      setActivating(false);
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
      await uploadSupplierPaymentProof({
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProfile();
      toast.success("Profil fournisseur supprimé");
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  };

  // Calculs d'état AVANT le early return : tous les hooks doivent être appelés
  // de façon inconditionnelle (règle des hooks React)
  const effStatus = (profile as any)?.effectiveStatus || profile?.subscriptionStatus || "inactive";
  const remainingDays = (profile as any)?.remainingDays ?? 0;
  const plan = (profile as any)?.plan || "none";
  const MONTHLY_PRICE = paymentConfig?.supplierPrice || (profile as any)?.price || 120;

  // Dès que le paiement est validé (abonnement actif), on ferme automatiquement le popup
  // pour que les coordonnées disparaissent jusqu'à la fin de l'abonnement
  useEffect(() => {
    if (effStatus === "active") {
      setShowPaymentChoice(false);
    }
  }, [effStatus]);

  if (profile === undefined || hasProfile === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "Abonné actif", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck },
    pending: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock3 },
    inactive: { label: "Inactif", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Store },
    expired: { label: "Expiré", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  };
  const stCfg = statusConfig[effStatus] || statusConfig.inactive;
  const StatusIcon = stCfg.icon;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted/50 active:scale-95 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate">Espace Fournisseur</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                {profile ? "Profil et abonnement" : "Créez votre profil"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {effStatus === "active" && (
              <button
                onClick={() => navigate("/dashboard/supplier/quotes")}
                className="relative flex items-center gap-1.5 rounded-lg border border-border/40 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <FileText className="h-3.5 w-3.5" />
                Devis reçus
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white shadow-sm">
                    {unreadCount! > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}
            {effStatus === "active" && (
              <button
                onClick={() => navigate("/dashboard/supplier/stats")}
                className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Stats
              </button>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
            >
              <UserRound className="h-3.5 w-3.5" />
              Vue Client
            </button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {profile ? (
            <>
              {/* ═══ Status Card ═══ */}
              <Card className="border-border/40">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {logo ? (
                        <div className="h-14 w-14 shrink-0 rounded-xl border border-border/40 bg-muted/20 overflow-hidden shadow-sm">
                          <img src={logo} alt={profile.companyName} className="h-full w-full object-contain p-1" />
                        </div>
                      ) : (
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 shadow-sm`}>
                          <span className="text-lg font-black text-primary/80 tracking-wide">
                            {(profile.companyName || "?")
                              .split(/\s+/)
                              .filter(Boolean)
                              .map((w: string) => w.charAt(0).toUpperCase())
                              .slice(0, 2)
                              .join("")}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{profile.companyName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] ${stCfg.color}`}>
                            <StatusIcon className="h-2.5 w-2.5 inline mr-1" />
                            {stCfg.label}
                          </Badge>
                          {effStatus === "active" && (
                            <Badge variant="secondary" className="text-[9px] gap-1 bg-emerald-50 text-emerald-600">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              {(profile as any)?.planFree ? "Offre gratuite · Illimité" : `${remainingDays} jour${remainingDays > 1 ? 's' : ''}`}
                            </Badge>
                          )}
                          <button onClick={() => toggleVis()}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                            {profile.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            {profile.isVisible ? "Visible" : "Masqué"}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {profile.specialties?.length || 0} spécialités · {(profile as any).regions?.length || 0} régions
                          {plan === "monthly" && ` · ${MONTHLY_PRICE} TND/mois`}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:items-end gap-2">
                      <Button size="sm" variant="outline" className="h-9 text-sm gap-1.5 w-full sm:w-auto"
                        onClick={() => setShowPaymentInfo(true)}>
                        <Wallet className="h-4 w-4" />
                        Moyen de paiement
                      </Button>
                      {(effStatus === "inactive" || effStatus === "expired") && (
                        <Button size="sm" className="h-9 text-sm gap-1.5 w-full sm:w-auto"
                          onClick={() => setShowPaymentChoice(true)}>
                          <CreditCard className="h-4 w-4" />
                          {MONTHLY_PRICE} TND/mois
                        </Button>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* ═══ Plan Selection Cards ═══ */}
              {(effStatus === "inactive" || effStatus === "expired") && (
                <div className="grid grid-cols-1 gap-3">
                  {/* Monthly card */}
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-background ring-1 ring-primary/10 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => setShowPaymentChoice(true)}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">Abonnement Fournisseur</p>
                          <p className="text-lg font-black text-primary mt-1">{MONTHLY_PRICE} TND<small className="text-[9px] font-normal text-muted-foreground">/mois</small></p>
                          <p className="text-[10px] text-muted-foreground mt-1">Virement bancaire ou D17</p>
                          <ul className="mt-2 space-y-1">
                            {["Tout le profil +", "Avant-première : 1ère position", "Badge certifié", "Statistiques de visibilité", "Support prioritaire"].map((f) => (
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
                </div>
              )}

              {/* ═══ Payment Method Choice Popup ═══ */}
              {(showPaymentChoice || effStatus === "pending") && effStatus !== "active" && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.02] to-background">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Moyen de paiement</p>
                      {showPaymentChoice && (
                        <button onClick={() => setShowPaymentChoice(false)} className="text-xs text-muted-foreground hover:text-foreground">
                          Annuler
                        </button>
                      )}
                      {effStatus === "pending" && (
                        <Badge variant="outline" className="gap-1 text-[9px] border-amber-200/60 bg-amber-50/60 text-amber-700">
                          <Clock3 className="h-2.5 w-2.5" />
                          Demande envoyée
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Forfait <strong>Fournisseur</strong> · <strong className="text-primary">{MONTHLY_PRICE} TND/mois</strong>
                    </p>

                    {effStatus !== "pending" && (
                      <>
                        {/* Payment method selector */}
                        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
                          <button
                            onClick={() => setSupplierPaymentMethod("bank_transfer")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                              supplierPaymentMethod === "bank_transfer"
                                ? "border-border/40 bg-background text-primary shadow-sm"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Virement bancaire
                          </button>
                          <button
                            onClick={() => setSupplierPaymentMethod("d17")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                              supplierPaymentMethod === "d17"
                                ? "border-border/40 bg-background text-amber-600 shadow-sm"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                            D17
                          </button>
                        </div>

                        {/* Bank transfer details */}
                        {supplierPaymentMethod === "bank_transfer" ? (
                          <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-muted/10 px-4 py-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                  <Landmark className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold">{paymentConfig?.bankName || "Banque de Tunisie"}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">Coordonnées bancaires</p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                                {MONTHLY_PRICE} TND
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
                                    <p className="truncate text-sm font-bold">{paymentConfig?.bankTitulaire || "GALISKON PROJECT"}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">RIB</span>
                                <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankRib || "TN59 0700 1123 4567 8901 2347"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">IBAN</span>
                                <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankIban || "TN59 0700 1123 4567 8901 2347"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">Swift / BIC</span>
                                <span className="min-w-0 flex-1 break-all text-right text-xs font-semibold leading-snug">{paymentConfig?.bankSwift || "BTBK TN TT"}</span>
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
                                  <p className="truncate text-[10px] text-muted-foreground">Paiement marchand</p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                                {MONTHLY_PRICE} TND
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
                                    <p className="truncate text-sm font-bold">{paymentConfig?.d17MerchantName || "GALISKON PROJECT"}</p>
                                  </div>
                                </div>
                              </div>
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
                        )}
                      </>
                    )}

                    <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70">
                      <ShieldCheck className="h-3 w-3 shrink-0 mt-0.5" />
                      <p>Activation manuelle sous 24h ouvrées après réception du paiement. Joignez votre reçu pour accélérer l'activation.</p>
                    </div>

                    {effStatus === "pending" ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50/60 border border-emerald-200/50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <p className="text-xs font-semibold text-emerald-700">Demande envoyée — paiement en attente de validation</p>
                      </div>
                    ) : (
                      <Button className="w-full h-10 text-sm gap-2" onClick={handleRequestSubscription} disabled={activating}>
                        {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        {activating ? "Envoi de la demande..." : `Payer ${MONTHLY_PRICE} TND/mois`}
                      </Button>
                    )}
                  {effStatus === "pending" && (
                    <div className="px-4 py-3 rounded-xl bg-white/50 border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Upload className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold">Joindre votre reçu de paiement</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground mb-3">
                        Ajoutez une capture d'écran du {(profile as any)?.paymentMethod === "d17" ? "paiement D17" : "virement bancaire"} pour accélérer l'activation.
                      </p>
                      {(profile as any)?.paymentProofUrl || uploadedFile ? (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                          <div className="flex items-center gap-2 min-w-0">
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-xs text-emerald-700 truncate">{uploadedFile || (profile as any)?.paymentProofFileName || "Reçu envoyé"}</span>
                          </div>
                          {uploadedFile && (
                            <button onClick={() => setUploadedFile(null)} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-emerald-100 transition-colors shrink-0">
                              <X className="h-3 w-3 text-emerald-500" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          {uploading ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/20">
                              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                              <div className="flex-1">
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                                <p className="text-[9px] text-muted-foreground mt-1">Téléchargement... {uploadProgress}%</p>
                              </div>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-border/40 hover:border-primary/40 cursor-pointer transition-all hover:bg-muted/20">
                              <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">Cliquez pour ajouter un reçu</p>
                                <p className="text-[9px] text-muted-foreground">Image ou PDF · Max 5 Mo</p>
                              </div>
                              <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                              <input type="file" accept="image/*,.pdf" onChange={handleUploadReceipt} className="hidden" />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  </CardContent>
                </Card>
              )}

              {/* ═══ Profile Form ═══ */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Informations de l'entreprise</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(!isEditing)}>
                      {isEditing ? "Annuler" : "Modifier"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Nom de la société</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Logo de l'entreprise</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-xl border border-border/40 bg-muted/20 overflow-hidden flex items-center justify-center">
                        {logo ? (
                          <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <Building2 className="h-6 w-6 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={`relative inline-flex cursor-pointer items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors ${isEditing ? "border-border/40 bg-background hover:bg-muted/50 text-foreground" : "opacity-50 pointer-events-none"}`}>
                          {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploadingLogo ? "Upload..." : logo ? "Changer le logo" : "Ajouter un logo"}
                          <input type="file" accept="image/*" onChange={handleUploadLogo} disabled={!isEditing} className="hidden" />
                        </label>
                        {logo && isEditing && (
                          <button type="button" onClick={() => { setLogo(undefined); setLogoStorageId(undefined); setLogoCleared(true); }} className="text-[10px] text-destructive hover:underline text-left">
                            Supprimer le logo
                          </button>
                        )}
                        {!logo && (
                          <p className="text-[9px] text-muted-foreground">JPG, PNG ou WebP — max 5 Mo</p>
                        )}
                      </div>
                    </div>
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
                    <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Site web (optionnel)</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} disabled={!isEditing} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description (optionnelle)</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isEditing} className="text-sm min-h-[60px]" rows={2} />
                  </div>                </CardContent>
              </Card>

              {/* ═══ Specialties ═══ */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Spécialités ({selectedSpecialties.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {SPECIALTIES.map((s) => {
                      const selected = selectedSpecialties.includes(s);
                      return (
                        <button key={s} onClick={() => isEditing && toggleSpecialty(s)} disabled={!isEditing}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            selected
                              ? "bg-primary/10 border-primary/30 text-primary"
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

              {/* ═══ Regions ═══ */}
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

              {/* ═══ Actions ═══ */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <Button size="sm" className="h-9 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Enregistrer
                    </Button>
                  )}
                </div>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1 text-[10px] text-red-500/60 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3 w-3" /> Supprimer le profil
                </button>
              </div>

              {/* Delete confirmation */}
              {showDeleteConfirm && (
                <Card className="border-red-200 bg-red-50/30">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-700">Supprimer le profil ?</p>
                      <p className="text-xs text-red-600/70 mt-1">Action irréversible. Votre profil ne sera plus recommandé.</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={handleDelete} disabled={deleting}>
                          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          Confirmer
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowDeleteConfirm(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            /* ═══ No profile — Create form ═══ */
            <div className="space-y-6">
              {/* Plans overview */}
              <div className="grid grid-cols-1 gap-3">
                <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-background ring-1 ring-primary/10">
                  <CardContent className="p-5 text-center">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold">Abonnement Fournisseur</p>
                    <p className="text-sm font-bold text-primary mt-1">{MONTHLY_PRICE} TND<small className="text-[9px] font-normal text-muted-foreground">/mois</small></p>
                    <ul className="mt-3 space-y-1 text-left max-w-[200px] mx-auto">
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />Tout le profil +</li>
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />Avant-première</li>
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />Badge certifié</li>
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />Support prioritaire</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Create form */}

              {/* Payment info for new suppliers */}
              <div className="p-3 rounded-xl bg-amber-50/20 border border-amber-200/20 flex items-start gap-2">
                <Smartphone className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-muted-foreground">
                  <strong>Paiement accepté :</strong> Virement bancaire ou <strong>D17 (Poste Tunisienne)</strong> —
                  Envoyez {MONTHLY_PRICE} TND par D17 au {paymentConfig?.d17Phone || "+216 XX XXX XXX"} ou par virement RIB {paymentConfig?.bankRib || "TN59 0700 1123 4567 8901 2347"}.
                </p>
              </div>
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Créer votre profil fournisseur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Nom de la société *</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-9 text-sm" placeholder="Votre société" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Logo de l'entreprise (optionnel)</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-xl border border-border/40 bg-muted/20 overflow-hidden flex items-center justify-center">
                        {logo ? (
                          <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <span className="text-lg font-black text-muted-foreground/40">
                            {(companyName || "?")
                              .split(/\s+/)
                              .filter(Boolean)
                              .map((w: string) => w.charAt(0).toUpperCase())
                              .slice(0, 2)
                              .join("")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="relative inline-flex cursor-pointer items-center gap-1.5 h-8 px-3 rounded-lg border border-border/40 bg-background hover:bg-muted/50 text-xs font-medium transition-colors">
                          {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploadingLogo ? "Upload..." : logo ? "Changer le logo" : "Ajouter un logo"}
                          <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                        </label>
                        {logo && (
                          <button type="button" onClick={() => { setLogo(undefined); setLogoStorageId(undefined); setLogoCleared(true); }} className="text-[10px] text-destructive hover:underline text-left">
                            Supprimer le logo
                          </button>
                        )}
                        {!logo && (
                          <p className="text-[9px] text-muted-foreground">JPG, PNG ou WebP — max 5 Mo</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Téléphone *</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-sm" placeholder="+216 XX XXX XXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email *</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" placeholder="contact@societe.tn" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse *</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-9 text-sm" placeholder="Adresse complète" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Site web (optionnel)</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="h-9 text-sm" placeholder="www.monsite.tn" />
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs font-medium mb-2 block">Spécialités * ({selectedSpecialties.length})</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SPECIALTIES.map((s) => {
                        const selected = selectedSpecialties.includes(s);
                        return (
                          <button key={s} onClick={() => toggleSpecialty(s)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              selected ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border/30 text-muted-foreground hover:border-border/60"
                            } hover:scale-105 active:scale-95`}>
                            {selected && <Check className="h-2.5 w-2.5 inline mr-1" />}
                            {SPECIALTY_LABELS[s] || s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-2 block">Régions * ({selectedRegions.length})</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TUNISIA_REGIONS.map((r) => {
                        const selected = selectedRegions.includes(r.value);
                        return (
                          <button key={r.value} onClick={() => toggleRegion(r.value)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                              selected ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 text-blue-700" : "bg-background border-border/30 text-muted-foreground hover:border-border/60"
                            } hover:scale-105 active:scale-95`}>
                            {selected && <Check className="h-2.5 w-2.5 inline mr-1" />}{r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Button className="w-full h-10 text-sm gap-2" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Créer mon profil fournisseur
                  </Button>
                  <p className="text-[9px] text-muted-foreground text-center">
                    Après la création, souscrivez à l'abonnement mensuel pour être recommandé
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>

        {/* ═══ Popup : Moyen de paiement (coordonnées bancaires + D17) ═══ */}
        <Dialog open={showPaymentInfo} onOpenChange={setShowPaymentInfo}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Moyen de paiement
              </DialogTitle>
              <DialogDescription>
                Coordonnées pour régler votre abonnement fournisseur ({MONTHLY_PRICE} TND/mois)
              </DialogDescription>
            </DialogHeader>
            <PaymentCoordinates paymentConfig={paymentConfig} monthlyPrice={MONTHLY_PRICE} />
            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70">
              <ShieldCheck className="h-3 w-3 shrink-0 mt-0.5" />
              <p>Activation manuelle sous 24h ouvrées après réception du paiement. Joignez votre reçu pour accélérer l'activation.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
