import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const user = useQuery(api.users.currentUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already authenticated as admin
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === "admin") {
        navigate("/dashboard/admin");
      } else {
        // User is logged in but not admin - still try to redirect
        setError("Votre compte n'a pas les droits d'administration.");
      }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("flow", "signIn");
      await signIn("password", formData);

      // Wait a moment for the auth to propagate and check
      setTimeout(async () => {
        // The RequireAuth + role check in AdminPanel will handle redirection
        navigate("/dashboard/admin");
      }, 500);
    } catch (err: any) {
      const message =
        err?.message?.includes("Invalid") || err?.message?.includes("incorrect")
          ? "Email ou mot de passe incorrect."
          : "Erreur de connexion. Vérifiez vos identifiants.";
      setError(message);
    }
    setIsLoading(false);
  };

  if (authLoading) {
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
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />

        {/* Animated shield icon */}
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
          <p className="text-lg text-slate-400 mb-6">Panneau d'administration</p>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MapPin className="h-3.5 w-3.5" />
            Accès réservé aux administrateurs
          </div>

          <div className="mt-12 space-y-4 text-left max-w-sm mx-auto">
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

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-xl shadow-2xl">
            {/* Top bar */}
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

              <div className="mb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 mx-auto bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/10">
                  <Lock className="h-6 w-6 text-emerald-400" />
                </div>
                <CardTitle className="text-white text-lg">Accès administrateur</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Connectez-vous avec vos identifiants
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Label htmlFor="admin-email" className="text-sm font-medium text-slate-300">
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
                  <Label htmlFor="admin-password" className="text-sm font-medium text-slate-300">
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
                        Connexion...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Accéder à l'administration
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-700/30">
                <Link to="/auth" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour à l'accueil
                </Link>
              </div>
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
