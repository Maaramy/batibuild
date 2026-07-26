import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2, Phone, Mail, MapPin, Globe, CheckCircle2,
  Eye, EyeOff, Loader2, Plus, Check, ArrowLeft, CreditCard,
  Store, ShieldCheck, Trash2, AlertTriangle,
  Sparkles, Timer, Gift,
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
// Page Component
// ============================================================================

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const profile = useQuery(api.supplierProfiles.getMyProfile);
  const hasProfile = useQuery(api.supplierProfiles.hasSupplierProfile);
  const createProfile = useMutation(api.supplierProfiles.createProfile);
  const updateProfile = useMutation(api.supplierProfiles.updateProfile);
  const startTrial = useMutation(api.supplierProfiles.startTrial);
  const activateSub = useMutation(api.supplierProfiles.activateSubscription);
  const toggleVis = useMutation(api.supplierProfiles.toggleVisibility);
  const deleteProfile = useMutation(api.supplierProfiles.deleteProfile);

  const [saving, setSaving] = useState(false);
  const [trialStarting, setTrialStarting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
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
          specialties: selectedSpecialties, regions: selectedRegions,
        });
        toast.success("Profil mis à jour !");
        setIsEditing(false);
      } else {
        await createProfile({
          companyName, phone, email, address,
          website: website || undefined,
          description: description || undefined,
          specialties: selectedSpecialties, regions: selectedRegions,
        });
        toast.success("Profil fournisseur créé !");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleStartTrial = async () => {
    setTrialStarting(true);
    try {
      await startTrial();
      toast.success("Essai gratuit activé ! 7 jours offerts.");
    } catch (err: any) {
      toast.error(err.message || "Erreur d'activation");
    } finally {
      setTrialStarting(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await activateSub();
      toast.success("Abonnement mensuel activé ! (120 TND/mois - virement)");
    } catch (err: any) {
      toast.error(err.message || "Erreur d'activation");
    } finally {
      setActivating(false);
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

  if (profile === undefined || hasProfile === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const effStatus = (profile as any)?.effectiveStatus || profile?.subscriptionStatus || "inactive";
  const remainingDays = (profile as any)?.remainingDays ?? 0;
  const plan = (profile as any)?.plan || "none";
  const MONTHLY_PRICE = (profile as any)?.MONTHLY_PRICE || 120;
  const TRIAL_DAYS = (profile as any)?.TRIAL_DAYS || 7;

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "Abonné Pro", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck },
    trial: { label: "Essai gratuit", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Gift },
    inactive: { label: "Inactif", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Store },
    expired: { label: "Expiré", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  };
  const stCfg = statusConfig[effStatus] || statusConfig.inactive;
  const StatusIcon = stCfg.icon;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Espace Fournisseur</h1>
            <p className="text-xs text-muted-foreground">
              {profile ? "Gérez votre profil et abonnement" : "Créez votre profil pour être recommandé"}
            </p>
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
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stCfg.color.replace('text-', 'text-').replace('border-', 'bg-').split(' ')[0] || 'bg-slate-100'} ${stCfg.color.split(' ')[1] || 'text-slate-600'}`}>
                        <StatusIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{profile.companyName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] ${stCfg.color}`}>
                            <StatusIcon className="h-2.5 w-2.5 inline mr-1" />
                            {stCfg.label}
                          </Badge>
                          {effStatus === "trial" && (
                            <Badge variant="secondary" className="text-[9px] gap-1">
                              <Timer className="h-2.5 w-2.5" />
                              {remainingDays} jour{remainingDays > 1 ? 's' : ''} restant{remainingDays > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {effStatus === "active" && (
                            <Badge variant="secondary" className="text-[9px] gap-1 bg-emerald-50 text-emerald-600">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              {remainingDays} jour{remainingDays > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <button onClick={() => toggleVis()}
                            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
                            {profile.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {profile.isVisible ? "Visible" : "Masqué"}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {profile.specialties?.length || 0} spécialités · {(profile as any).regions?.length || 0} régions
                          {plan === "monthly" && " · 120 TND/mois"}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:items-end gap-2">
                      {(effStatus === "inactive" || effStatus === "expired") && (
                        <>
                          <Button size="sm" className="h-8 text-xs gap-1.5 w-full sm:w-auto"
                            onClick={handleStartTrial} disabled={trialStarting}>
                            {trialStarting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Essai gratuit {TRIAL_DAYS} jours
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 w-full sm:w-auto"
                            onClick={handleActivate} disabled={activating}>
                            {activating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                            120 TND/mois (virement)
                          </Button>
                        </>
                      )}
                      {effStatus === "trial" && (
                        <Button size="sm" className="h-8 text-xs gap-1.5 w-full sm:w-auto"
                          onClick={handleActivate} disabled={activating}>
                          {activating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                          Passer à 120 TND/mois
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Trial banner */}
                  {effStatus === "trial" && (
                    <div className="mt-3 p-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-blue-50/30 border border-blue-100 flex items-center gap-2">
                      <Gift className="h-4 w-4 text-blue-500 shrink-0" />
                      <p className="text-[10px] text-blue-700">
                        Période d'essai gratuite — {remainingDays} jour{remainingDays > 1 ? 's' : ''} restant{remainingDays > 1 ? 's' : ''}.
                        Passez à l'abonnement mensuel pour continuer après l'essai.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ═══ Plan Selection Cards ═══ */}
              {(effStatus === "inactive" || effStatus === "expired") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Trial card */}
                  <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/20 to-background hover:shadow-sm transition-all cursor-pointer"
                    onClick={handleStartTrial}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          <Gift className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">Essai gratuit</p>
                          <p className="text-lg font-black text-blue-600 mt-1">0 TND</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{TRIAL_DAYS} jours · Sans engagement</p>
                          <ul className="mt-2 space-y-1">
                            {["Profil visible dans les recherches", "Recommandé aux porteurs de projet", "Sélection de spécialités", "Toutes régions"].map((f) => (
                              <li key={f} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                <Check className="h-2.5 w-2.5 text-blue-500 shrink-0" />{f}
                              </li>
                            ))}
                          </ul>
                          {trialStarting && <Loader2 className="h-4 w-4 animate-spin mx-auto mt-2" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly card */}
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-background ring-1 ring-primary/10 hover:shadow-sm transition-all cursor-pointer"
                    onClick={handleActivate}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">Abonnement Pro</p>
                          <p className="text-lg font-black text-primary mt-1">{MONTHLY_PRICE} TND<small className="text-[9px] font-normal text-muted-foreground">/mois</small></p>
                          <p className="text-[10px] text-muted-foreground mt-1">Paiement par virement bancaire</p>
                          <ul className="mt-2 space-y-1">
                            {["Tout l'essai gratuit +", "Avant-première : 1ère position", "Badge certifié", "Statistiques de visibilité", "Support prioritaire"].map((f) => (
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
                  </div>
                </CardContent>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/20 to-background">
                  <CardContent className="p-5 text-center">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <Gift className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold">Essai gratuit</p>
                    <p className="text-xs text-muted-foreground mt-1">{TRIAL_DAYS} jours offerts</p>
                    <ul className="mt-3 space-y-1 text-left max-w-[200px] mx-auto">
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-blue-500 shrink-0" />Profil visible</li>
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-blue-500 shrink-0" />Recommandations IA</li>
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-blue-500 shrink-0" />Sans carte bancaire</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-background ring-1 ring-primary/10">
                  <CardContent className="p-5 text-center">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold">Abonnement Pro</p>
                    <p className="text-sm font-bold text-primary mt-1">{MONTHLY_PRICE} TND<small className="text-[9px] font-normal text-muted-foreground">/mois</small></p>
                    <ul className="mt-3 space-y-1 text-left max-w-[200px] mx-auto">
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />Tout l'essai +</li>
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />Avant-première</li>
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />Badge certifié</li>
                      <li className="flex items-center gap-1 text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />Support prioritaire</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Create form */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Créer votre profil fournisseur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Nom de la société *</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-9 text-sm" placeholder="Votre société" />
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
                    Après la création, choisissez l'essai gratuit ou l'abonnement mensuel
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
