import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft,
  HardHat,
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  LogIn,
  MapPin,
  UserPlus,
  Crown,
  CheckCircle2,
  Sparkles,
  Database,
  Building2,
  Ruler,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const user = useQuery(api.users.currentUser);
  const adminExists = useQuery(api.users.checkAdminExists);
  const makeMeAdmin = useMutation(api.users.makeMeAdmin);
  const seedDemoData = useMutation(api.users.seedDemoData);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<"login" | "register" | "success">("login");
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [showRegisterToggle, setShowRegisterToggle] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessages, setSeedMessages] = useState<string[]>([]);

  // Determine if this is first-time setup (no admin exists yet)
  useEffect(() => {
    if (adminExists !== undefined) {
      setIsFirstSetup(!adminExists);
      if (!adminExists) {
        setSetupMode("register");
        setShowRegisterToggle(false);
      }
    }
  }, [adminExists]);

  // Check if already authenticated as admin
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === "admin") {
        navigate("/dashboard/admin");
      } else if (setupMode === "login") {
        setError("Votre compte n'a pas les droits d'administration.");
      }
    }
  }, [authLoading, isAuthenticated, user, navigate, setupMode]);

  // Handle register + optionally promote to admin
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("flow", "signUp");
      await signIn("password", formData);

      // Wait for auth to propagate
      await new Promise((r) => setTimeout(r, 1000));

      // Try to promote to admin if no admin exists yet
      try {
        await makeMeAdmin();
      } catch (err: any) {
        console.warn("Promotion note:", err.message);
      }

      setSetupMode("success");
      setIsLoading(false);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already exists") || msg.includes("Account already")) {
        // User already exists, try to sign in instead
        try {
          const fd = new FormData();
          fd.set("email", email);
          fd.set("password", password);
          fd.set("flow", "signIn");
          await signIn("password", fd);
          await new Promise((r) => setTimeout(r, 1000));
          try {
            await makeMeAdmin();
          } catch { /* admin exists, ignore */ }
          setSetupMode("success");
        } catch {
          setError("Email déjà utilisé. Connectez-vous ou utilisez un autre email.");
        }
      } else {
        setError(msg || "Erreur lors de la création du compte.");
      }
      setIsLoading(false);
    }
  };

  // Handle normal login (admin already exists)
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("flow", "signIn");
      await signIn("password", formData);

      setTimeout(() => {
        navigate("/dashboard/admin");
      }, 500);
    } catch (err: any) {
      setError(
        err?.message?.includes("Invalid") || err?.message?.includes("incorrect")
          ? "Email ou mot de passe incorrect."
          : "Erreur de connexion. Vérifiez vos identifiants."
      );
    }
    setIsLoading(false);
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessages([]);
    try {
      const result = await seedDemoData();
      setSeedMessages(result.messages);
      toast.success("Données initialisées avec succès !");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setSeeding(false);
  };

  const handleGoToAdmin = () => {
    navigate("/dashboard/admin");
  };

  if (authLoading || adminExists === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12 bg-gradient-to-br from-emerald-900/40 via-slate-900 to-blue-900/30">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />

        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-8 mx-auto bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/10 backdrop-blur-sm"
          >
            <Shield className="h-12 w-12 text-emerald-400" />
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-3">BudgetBati</h1>
          <p className="text-lg text-slate-400 mb-6">Panneau d'administration</p>                  {isFirstSetup && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Badge className="mb-4 px-3 py-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Première configuration
                      </Badge>
                    </motion.div>
                  )}
                  {!isFirstSetup && setupMode === "register" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Badge className="mb-4 px-3 py-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                        <UserPlus className="h-3 w-3 mr-1" />
                        Nouveau compte admin
                      </Badge>
                    </motion.div>
                  )}

          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${
              isFirstSetup
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-slate-700/30 text-slate-400 border border-slate-600/30"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {isFirstSetup
              ? "Créez votre compte administrateur"
              : setupMode === "register"
              ? "Créez un compte administrateur"
              : "Accès réservé aux administrateurs"}
          </div>                        <div className="mt-12 space-y-4 text-left max-w-sm mx-auto">
            {[
              { icon: Shield, text: "Gestion des utilisateurs et rôles" },
              { icon: Lock, text: "Validation des abonnements Pro" },
              { icon: HardHat, text: "Mise à jour des prix des matériaux" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10 backdrop-blur-sm">
                  <item.icon className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm text-slate-400">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-xl shadow-2xl">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-blue-500 rounded-t-xl" />

            <CardHeader className="p-6 pb-2 text-center">
              {/* Mobile logo */}
              <div className="lg:hidden flex justify-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/10">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-white text-sm">BudgetBati</span>
                    <p className="text-[9px] text-slate-500">Administration</p>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                {setupMode === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 10, -5, 0] }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 bg-emerald-500/15 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </motion.div>
                    <CardTitle className="text-white text-lg mb-1">
                      Administration activée
                    </CardTitle>
                    <p className="text-sm text-slate-400 mb-2">
                      Compte créé et promu administrateur
                    </p>
                    {isFirstSetup && (
                      <p className="text-xs text-slate-500 mb-4">
                        Initialisez maintenant les prix des matériaux pour commencer
                      </p>
                    )}

                    {seedMessages.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 space-y-1 text-left">
                        {seedMessages.map((msg, i) => (
                          <p key={i} className="text-xs text-slate-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                            {msg}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {isFirstSetup && (
                        <Button
                          onClick={handleSeed}
                          disabled={seeding}
                          className="w-full h-10 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-lg shadow-emerald-500/20"
                        >
                          {seeding ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Initialisation...
                            </>
                          ) : (
                            <>
                              <Database className="mr-2 h-4 w-4" />
                              Initialiser les données
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={handleGoToAdmin}
                        variant="outline"
                        className="w-full h-10 border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700/50"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Accéder au panneau d'administration
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="form">
                    {isFirstSetup ? (
                      <>
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 mx-auto bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/10">
                          <UserPlus className="h-6 w-6 text-emerald-400" />
                        </div>
                        <CardTitle className="text-white text-lg">
                          {isFirstSetup ? "Configuration initiale" : "Créer un compte"}
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                          Créez votre compte administrateur
                        </p>
                        {isFirstSetup && (
                          <p className="text-xs text-slate-500 mt-1">
                            Ce sera le premier administrateur de l'application
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 mx-auto bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/10">
                          <Lock className="h-6 w-6 text-emerald-400" />
                        </div>
                        <CardTitle className="text-white text-lg">
                          Accès administrateur
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                          Connectez-vous avec vos identifiants
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardHeader>

            <CardContent className="p-6 pt-4">
              {setupMode !== "success" && (                  <form
                  onSubmit={setupMode === "register" ? handleRegister : handleLogin}
                  className="space-y-4"
                >
                  {/* Name field for register mode */}
                  {setupMode === "register" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                    >
                      <Label
                        htmlFor="admin-name"
                        className="text-sm font-medium text-slate-300"
                      >
                        Nom complet
                      </Label>
                      <div className="relative mt-1.5">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="admin-name"
                          name="name"
                          type="text"
                          placeholder="Votre nom"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-11 pl-9 bg-slate-900/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                          disabled={isLoading}
                          required
                          autoComplete="name"
                        />
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Label
                      htmlFor="admin-email"
                      className="text-sm font-medium text-slate-300"
                    >
                      Email
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="admin-email"
                        name="email"
                        type="email"
                        placeholder="admin@budgetbati.tn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-9 bg-slate-900/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                        disabled={isLoading}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Label
                      htmlFor="admin-password"
                      className="text-sm font-medium text-slate-300"
                    >
                      Mot de passe
                    </Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="admin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-9 pr-10 bg-slate-900/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                        disabled={isLoading}
                        required
                        minLength={8}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm py-2.5 px-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading || !email || !password}
                      className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all duration-200"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {setupMode === "register" ? "Création du compte..." : "Connexion..."}
                        </>
                      ) : (
                        <>
                          {setupMode === "register" ? (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              {isFirstSetup ? "Créer & configurer" : "Créer le compte"}
                            </>
                          ) : (
                            <>
                              <LogIn className="mr-2 h-4 w-4" />
                              Accéder à l'administration
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </motion.div>

                          {!isFirstSetup && setupMode === "login" && (
                    <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-2">
                      <button
                        type="button"
                        onClick={() => { setSetupMode("register"); setError(null); }}
                        className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        👤 Premier accès ? Créer un compte administrateur
                      </button>
                      <p className="text-center text-xs text-slate-600">
                        <Link
                          to="/auth"
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          ← Retour à l'accueil
                        </Link>
                      </p>
                    </div>
                  )}
                  {!isFirstSetup && setupMode === "register" && (
                    <div className="mt-4 pt-4 border-t border-slate-700/30">
                      <button
                        type="button"
                        onClick={() => { setSetupMode("login"); setError(null); }}
                        className="w-full text-center text-sm text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        ← J'ai déjà un compte
                      </button>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-slate-600 mt-6">
            BudgetBati &copy; {new Date().getFullYear()} — Administration
          </p>
        </motion.div>
      </div>
    </main>
  );
}
