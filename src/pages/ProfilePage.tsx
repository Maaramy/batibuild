import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { useState, useRef } from "react";
import {
  ArrowLeft,
  CheckCheck,
  ChevronRight,
  Crown,
  Database,
  Loader2,
  Save,
  Shield,
  User,
  Building2,
  Phone,
  Mail,
  Sparkles,
  Camera,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [company, setCompany] = useState(user?.company || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [emailNotifs, setEmailNotifs] = useState(user?.emailNotifications ?? true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessages, setSeedMessages] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateProfileImage = useMutation(api.users.updateProfileImage);
  const makeMeAdmin = useMutation(api.users.makeMeAdmin);
  const seedDemoData = useMutation(api.users.seedDemoData);

  const isAdmin = user?.role === "admin";
  const isPro = user?.subscriptionPlan === "pro";

  const handleUploadPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateProfileImage({ storageId });
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      toast.error("Erreur lors de l'upload");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, company, phone, emailNotifications: emailNotifs });
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
    }
    setSaving(false);
  };

  const handleMakeAdmin = async () => {
    try {
      await makeMeAdmin();
      toast.success("✅ Vous êtes maintenant administrateur !");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedMessages([]);
    try {
      const result = await seedDemoData();
      setSeedMessages(result.messages);
      toast.success("Données de démonstration générées !");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setSeeding(false);
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex items-center h-14">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-sm">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm">Mon profil</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-border/40 bg-card/60 shadow-soft">
            <CardHeader className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-16 w-16 border-2 border-border/40 shadow-sm">
                    <AvatarImage src={user?.image || ""} alt="Photo" className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                      {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Changer la photo de profil"
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadPhoto(file);
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{user?.name || "Mon profil"}</CardTitle>
                    {isPro && (
                      <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px]">
                        <Crown className="h-2.5 w-2.5" /> Pro
                      </Badge>
                    )}
                    {isAdmin && (
                      <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary text-[9px]">
                        <Shield className="h-2.5 w-2.5" /> Admin
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Gérez vos informations personnelles
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label-overline flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Nom complet
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-overline flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="h-10 rounded-xl bg-muted/30 text-muted-foreground"
                  />
                  <p className="text-[9px] text-muted-foreground/50">Non modifiable</p>
                </div>
                <div className="space-y-1.5">
                  <label className="label-overline flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Entreprise
                  </label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Votre société"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-overline flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> Téléphone
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              <Separator className="my-1" />

              <div className="flex flex-wrap items-center gap-2.5">
                <Button onClick={handleSave} disabled={saving} className="btn-gradient h-10 gap-1.5 text-xs text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                {!isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-1.5 text-xs"
                    onClick={handleMakeAdmin}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Devenir admin (démo)
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 gap-1.5 text-xs text-muted-foreground"
                  onClick={handleSeedData}
                  disabled={seeding}
                >
                  {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                  Données démo
                </Button>
              </div>

              {seedMessages.length > 0 && (
                <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-[10px] text-muted-foreground space-y-1">
                  {seedMessages.map((m, i) => (
                    <p key={i} className="flex items-center gap-1.5">
                      <CheckCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                      {m}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Statut du compte */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="border border-border/40 bg-card/60 shadow-soft">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">Statut du compte</CardTitle>
                  <CardDescription className="text-[11px]">
                    Abonnement, rôle et préférences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2 space-y-2">
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/20 border border-border/20 transition-colors hover:border-amber-500/30">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", isPro ? "bg-amber-500/15 text-amber-600" : "bg-muted/40 text-muted-foreground/60")}>
                    <Crown className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium">Abonnement</span>
                </div>
                <Badge variant={isPro ? "default" : "secondary"} className="text-[9px]">
                  {isPro ? "Pro" : "Start"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/20 border border-border/20 transition-colors hover:border-primary/30">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", isAdmin ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground/60")}>
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium">Rôle</span>
                </div>
                <Badge variant={isAdmin ? "default" : "secondary"} className="text-[9px]">
                  {isAdmin ? "Administrateur" : "Utilisateur"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/20 border border-border/20 transition-colors hover:border-primary/30">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", emailNotifs ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground/60")}>
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Notifications e-mail</p>
                    <p className="text-[9px] text-muted-foreground/60">Activation, paiements, expiration…</p>
                  </div>
                </div>
                <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
              </div>

              <Separator className="my-1" />

              <button
                onClick={() => navigate("/dashboard/pricing")}
                className="group w-full flex items-center justify-between rounded-xl border border-border/20 bg-muted/20 px-3 py-2.5 text-left transition-all hover:border-primary/30 hover:shadow-soft cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{isPro ? "Gérer mon abonnement" : "Passer à l'offre Pro"}</p>
                    <p className="text-[9px] text-muted-foreground/60">
                      {isPro ? "Paiement unique · quotas par forfait" : "Export PDF, rapports détaillés"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
