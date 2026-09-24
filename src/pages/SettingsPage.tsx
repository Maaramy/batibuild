import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Crown,
  HardHat,
  LogOut,
  Moon,
  Palette,
  Shield,
  Smartphone,
  Sun,
  Monitor,
  User,
  CreditCard,
  Info,
  Mail,
  ShieldCheck,
  Trash2,
  FileText,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ============================================================================
// Setting Row Component
// ============================================================================

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
  onClick,
  className = "",
}: {
  icon: any;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/20 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {children}
        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
      </div>
    </div>
  );
}

// ============================================================================
// Theme Selector
// ============================================================================

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const themes = [
    { value: "light", icon: Sun, label: "Clair" },
    { value: "dark", icon: Moon, label: "Sombre" },
    { value: "system", icon: Monitor, label: "Système" },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
            theme === value
              ? "border-primary/50 bg-primary/5 text-primary ring-1 ring-primary/20"
              : "border-border/40 hover:border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
          <span className="text-[10px] font-medium">{label}</span>
          {theme === value && (
            <div className="absolute top-1.5 right-1.5">
              <Check className="h-3 w-3 text-primary" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Main Settings Page
// ============================================================================

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState({
    projectUpdates: true,
    priceAlerts: true,
    newsletter: false,
    marketing: false,
  });

  const [savingNotifs, setSavingNotifs] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    // Déconnexion → page de connexion (reconnexion → Dashboard).
    navigate("/auth");
  };

  const handleToggleNotification = async (key: keyof typeof notifications) => {
    setSavingNotifs(true);
    // Simulate a short delay
    await new Promise((r) => setTimeout(r, 200));
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavingNotifs(false);
    toast.success("Préférence mise à jour");
  };

  const isAdmin = user?.role === "admin";
  const isPro = user?.subscriptionPlan === "pro";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex items-center h-14">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Palette className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm">Paramètres</span>
          </div>
        </div>
      </header>

      <motion.div
        className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Apparence */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                  <Palette className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-sm">Apparence</CardTitle>
                  <CardDescription className="text-xs">
                    Personnalisez l'affichage de l'application
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Thème
                </label>
                <ThemeSelector />
              </div>

              <Separator className="my-1" />

              <SettingRow
                icon={Smartphone}
                title="Mode adaptatif"
                description="S'adapte automatiquement à votre appareil"
              >
                <Badge variant="secondary" className="text-[9px]">
                  Actif
                </Badge>
              </SettingRow>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                  <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-sm">Notifications</CardTitle>
                  <CardDescription className="text-xs">
                    Gérez vos alertes et notifications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2 space-y-1">
              <SettingRow
                icon={HardHat}
                title="Projets terminés"
                description="Recevez une alerte quand un projet est analysé"
              >
                <Switch
                  checked={notifications.projectUpdates}
                  onCheckedChange={() => handleToggleNotification("projectUpdates")}
                  disabled={savingNotifs}
                />
              </SettingRow>
              <SettingRow
                icon={TrendingUp}
                title="Mise à jour des prix"
                description="Soyez informé des changements de prix des matériaux"
              >
                <Switch
                  checked={notifications.priceAlerts}
                  onCheckedChange={() => handleToggleNotification("priceAlerts")}
                  disabled={savingNotifs}
                />
              </SettingRow>
              <SettingRow
                icon={Mail}
                title="Newsletter"
                description="Recevez nos conseils construction et offres"
              >
                <Switch
                  checked={notifications.newsletter}
                  onCheckedChange={() => handleToggleNotification("newsletter")}
                  disabled={savingNotifs}
                />
              </SettingRow>
              <SettingRow
                icon={MessageCircle}
                title="Offres promotionnelles"
                description="Recevez nos offres spéciales et réductions"
              >
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={() => handleToggleNotification("marketing")}
                  disabled={savingNotifs}
                />
              </SettingRow>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compte */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                  <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-sm">Compte</CardTitle>
                  <CardDescription className="text-xs">
                    Gérez votre compte et votre abonnement
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2 space-y-1">
              <SettingRow
                icon={User}
                title="Mon profil"
                description="Modifiez vos informations personnelles"
                onClick={() => navigate("/dashboard/profile")}
              />
              <SettingRow
                icon={CreditCard}
                title="Abonnement"
                description={
                  isPro
                    ? "Vous êtes sur l'offre Client Pro"
                    : "Passez à l'offre Client Pro pour plus de fonctionnalités"
                }
                onClick={() => navigate("/dashboard/pricing")}
              >
                {isPro && (
                  <Badge className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                    <Crown className="h-3 w-3 mr-1" />
                    Client Pro
                  </Badge>
                )}
              </SettingRow>
              <SettingRow
                icon={FileText}
                title="Mes devis"
                description="Consultez l'historique de vos devis"
                onClick={() => navigate("/dashboard")}
              />
              {isAdmin && (
                <SettingRow
                  icon={Shield}
                  title="Administration"
                  description="Panneau d'administration"
                  onClick={() => navigate("/dashboard/admin")}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* À propos */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20">
                  <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <CardTitle className="text-sm">À propos</CardTitle>
                  <CardDescription className="text-xs">
                    Informations sur l'application
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2 space-y-1">
              <SettingRow
                icon={HardHat}
                title="batibuild"
                description="Version 1.0.0"
              >
                <Badge variant="outline" className="text-[9px]">
                  v1.0.0
                </Badge>
              </SettingRow>
              <SettingRow
                icon={BookOpen}
                title="Guide d'utilisation"
                description="Apprenez à utiliser batibuild"
                onClick={() => {}}
              />
              <SettingRow
                icon={ShieldCheck}
                title="Confidentialité"
                description="Vos données sont sécurisées"
                onClick={() => {}}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={itemVariants}>
          <Card className="border border-destructive/20 bg-destructive/5 backdrop-blur-sm">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20">
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-sm text-destructive">Zone de danger</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Actions irréversibles
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 w-full sm:w-auto"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="text-center text-[10px] text-muted-foreground/40 pb-8"
        >
          batibuild &copy; {new Date().getFullYear()} — Estimation de coûts de construction en Tunisie
        </motion.p>
      </motion.div>
    </main>
  );
}

// Helper icon component for the trend
function TrendingUp(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
