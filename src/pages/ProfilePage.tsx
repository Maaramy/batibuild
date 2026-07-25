import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  Crown,
  Database,
  HardHat,
  Loader2,
  Save,
  Shield,
  User,
  Building2,
  Phone,
  Mail,
  Sparkles,
  Camera,
  ImageUp,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [company, setCompany] = useState(user?.company || "");
  const [phone, setPhone] = useState(user?.phone || "");
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
      await updateProfile({ name, company, phone });
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
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex items-center h-14">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm">Mon profil</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-16 w-16 border-2 border-border/40">
                    <AvatarImage src={user?.image || ""} alt="Photo" className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                      {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
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
                <div>
                  <CardTitle className="text-base">{user?.name || "Mon profil"}</CardTitle>
                  <CardDescription className="text-xs">
                    Gérez vos informations personnelles
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <User className="h-3 w-3" /> Nom complet
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="h-10 bg-muted/30 text-muted-foreground"
                  />
                  <p className="text-[9px] text-muted-foreground/50">Non modifiable</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Entreprise
                  </label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Votre société"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Téléphone
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    className="h-10"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6">
              <CardTitle className="text-sm">Statut du compte</CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-3">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-center gap-2">
                  <Crown className={cn("h-4 w-4", isPro || isAdmin ? "text-amber-500" : "text-muted-foreground/40")} />
                  <span className="text-xs">Abonnement</span>
                </div>
                <Badge variant={isPro ? "default" : "secondary"} className="text-[9px]">
                  {isPro ? "Pro" : "Gratuit"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-center gap-2">
                  <Shield className={cn("h-4 w-4", isAdmin ? "text-primary" : "text-muted-foreground/40")} />
                  <span className="text-xs">Rôle</span>
                </div>
                <Badge variant={isAdmin ? "default" : "secondary"} className="text-[9px]">
                  {isAdmin ? "Administrateur" : "Utilisateur"}
                </Badge>
              </div>

            </CardContent>
          </Card>
        </motion.div>

      </div>
    </main>
  );
}

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
