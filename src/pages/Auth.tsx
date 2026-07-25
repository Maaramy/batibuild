import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  HardHat,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  UserPlus,
  UserX,
  Check,
  LogIn,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  // Tab state
  const [tab, setTab] = useState<"login" | "register">("login");

  // OTP flow state
  const [step, setStep] = useState<"email" | { email: string; name?: string }>("email");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Use OTP mode or Password mode
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  // ========== OTP FLOW ==========
  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Échec d'envoi du code. Veuillez réessayer.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Le code de vérification est incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  // ========== PASSWORD FLOW ==========
  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", "signIn");
      await signIn("password", formData);
      navigate(redirect);
    } catch (error) {
      console.error("Password login error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Email ou mot de passe incorrect.",
      );
      setIsLoading(false);
    }
  };

  const handlePasswordRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setIsLoading(false);
      return;
    }

    try {
      formData.set("flow", "signUp");
      // The Password provider stores name as a profile field
      await signIn("password", formData);
      navigate(redirect);
    } catch (error) {
      console.error("Password register error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'inscription.",
      );
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Échec de connexion invité: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
      setIsLoading(false);
    }
  };

  const switchToOtp = () => {
    setAuthMode("otp");
    setStep("email");
    setError(null);
  };

  const switchToPassword = () => {
    setAuthMode("password");
    setStep("email");
    setError(null);
  };

  // Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Chargement...</p>
        </div>
      </div>
    );
  }

  // OTP Step - code verification
  if (typeof step === "object" && "email" in step) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <div className="rounded-2xl border shadow-xl bg-card overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex justify-center mb-6">
                  <Link to="/">
                    <img
                      src={logo}
                      alt="BudgetBati"
                      width={56}
                      height={56}
                      className="rounded-xl"
                    />
                  </Link>
                </div>

                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-xl font-semibold">Vérifiez votre email</h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Un code à 6 chiffres a été envoyé à<br />
                    <span className="font-medium text-foreground">{step.email}</span>
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit}>
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />

                  <div className="flex justify-center mb-6">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          const form = (e.target as HTMLElement).closest("form");
                          if (form) form.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive text-center mb-4 bg-destructive/10 py-2 px-3 rounded-lg"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        Vérifier le code
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="mt-4 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Vous n'avez pas reçu de code ?{" "}
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="text-primary hover:underline font-medium inline"
                      >
                        Renvoyer
                      </button>
                    </p>
                    <button
                      type="button"
                      onClick={switchToPassword}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Utiliser mot de passe
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5">
      {/* Left: Decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background items-center justify-center p-12">
        <div className="absolute inset-0">
          {/* Decorative grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* Decorative circles */}
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-md">
          <Link to="/">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-8 mx-auto"
            >
              <img src={logo} alt="BudgetBati" width={56} height={56} className="rounded-xl" />
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold mb-4">BudgetBati</h1>
            <p className="text-xl text-muted-foreground mb-3">
              Estimation de coûts de construction
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <MapPin className="h-3.5 w-3.5" />
              Tunisie 2026
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 space-y-4 text-left"
          >
            {[
              { icon: HardHat, text: "Plans, photos, croquis ou dimensions" },
              { icon: Building2, text: "Plus de 40 types de projets" },
              { icon: MapPin, text: "Prix adaptés par région tunisienne" },
              { icon: Check, text: "Devis PDF détaillé en un clic" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border shadow-xl bg-card overflow-hidden">
            {/* Logo + Brand (mobile) */}
            <div className="lg:hidden flex justify-center pt-6 pb-2">
              <Link to="/">
                <div className="flex items-center gap-2">
                  <img
                    src={logo}
                    alt="BudgetBati"
                    width={40}
                    height={40}
                    className="rounded-lg"
                  />
                  <span className="font-bold text-lg">BudgetBati</span>
                </div>
              </Link>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => { setTab("login"); setError(null); }}
                  className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    tab === "login"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LogIn className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("register"); setError(null); }}
                  className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    tab === "register"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserPlus className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  Inscription
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 pt-6">
              <AnimatePresence mode="wait">
                {authMode === "password" ? (
                  tab === "login" ? (
                    /* ========== LOGIN FORM ========== */
                    <motion.div
                      key="login-password"
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div variants={fadeUp} className="mb-6">
                        <h2 className="text-xl font-semibold">Bon retour parmi nous</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Connectez-vous à votre compte BudgetBati
                        </p>
                      </motion.div>

                      <form onSubmit={handlePasswordLogin} className="space-y-4">
                        <motion.div variants={fadeUp}>
                          <Label htmlFor="login-email">Email</Label>
                          <div className="relative mt-1.5">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="login-email"
                              name="email"
                              type="email"
                              placeholder="exemple@email.com"
                              className="pl-9 h-11"
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </motion.div>

                        <motion.div variants={fadeUp}>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password">Mot de passe</Label>
                          </div>
                          <div className="relative mt-1.5">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <Input
                              id="login-password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Votre mot de passe"
                              className="pl-9 pr-10 h-11"
                              disabled={isLoading}
                              required
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-lg"
                          >
                            {error}
                          </motion.p>
                        )}

                        <motion.div variants={fadeUp}>
                          <Button
                            type="submit"
                            className="w-full h-11"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connexion...
                              </>
                            ) : (
                              <>
                                Se connecter
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </form>

                      <motion.div variants={fadeUp} className="mt-6 space-y-3">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                              Autres options
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10"
                          onClick={switchToOtp}
                          disabled={isLoading}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Connexion rapide par email
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full h-10 text-muted-foreground"
                          onClick={handleGuestLogin}
                          disabled={isLoading}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Continuer en invité
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    /* ========== REGISTER FORM ========== */
                    <motion.div
                      key="register-password"
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div variants={fadeUp} className="mb-6">
                        <h2 className="text-xl font-semibold">Créer un compte</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Rejoignez BudgetBati et estimez vos projets
                        </p>
                      </motion.div>

                      <form onSubmit={handlePasswordRegister} className="space-y-4">
                        <motion.div variants={fadeUp}>
                          <Label htmlFor="reg-name">Nom complet</Label>
                          <div className="relative mt-1.5">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reg-name"
                              name="name"
                              type="text"
                              placeholder="Votre nom"
                              className="pl-9 h-11"
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <motion.div variants={fadeUp}>
                            <Label htmlFor="reg-phone">Téléphone (optionnel)</Label>
                            <div className="relative mt-1.5">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reg-phone"
                                name="phone"
                                type="tel"
                                placeholder="+216 XX XXX XXX"
                                className="pl-9 h-11"
                                disabled={isLoading}
                              />
                            </div>
                          </motion.div>

                          <motion.div variants={fadeUp}>
                            <Label htmlFor="reg-company">Entreprise (optionnel)</Label>
                            <div className="relative mt-1.5">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reg-company"
                                name="company"
                                type="text"
                                placeholder="Votre société"
                                className="pl-9 h-11"
                                disabled={isLoading}
                              />
                            </div>
                          </motion.div>
                        </div>

                        <motion.div variants={fadeUp}>
                          <Label htmlFor="reg-email">Email</Label>
                          <div className="relative mt-1.5">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reg-email"
                              name="email"
                              type="email"
                              placeholder="exemple@email.com"
                              className="pl-9 h-11"
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </motion.div>

                        <motion.div variants={fadeUp}>
                          <Label htmlFor="reg-password">Mot de passe</Label>
                          <div className="relative mt-1.5">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <Input
                              id="reg-password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Min. 8 caractères"
                              className="pl-9 pr-10 h-11"
                              disabled={isLoading}
                              required
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

                        <motion.div variants={fadeUp}>
                          <Label htmlFor="reg-confirm-password">Confirmer le mot de passe</Label>
                          <div className="relative mt-1.5">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <Input
                              id="reg-confirm-password"
                              name="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Répéter le mot de passe"
                              className="pl-9 pr-10 h-11"
                              disabled={isLoading}
                              required
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </motion.div>

                        <motion.div variants={fadeUp}>
                          <p className="text-xs text-muted-foreground">
                            En créant un compte, vous acceptez nos{" "}
                            <a href="#" className="text-primary hover:underline">
                              conditions d'utilisation
                            </a>{" "}
                            et notre{" "}
                            <a href="#" className="text-primary hover:underline">
                              politique de confidentialité
                            </a>.
                          </p>
                        </motion.div>

                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-lg"
                          >
                            {error}
                          </motion.p>
                        )}

                        <motion.div variants={fadeUp}>
                          <Button
                            type="submit"
                            className="w-full h-11"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Inscription...
                              </>
                            ) : (
                              <>
                                Créer mon compte
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </form>

                      <motion.div variants={fadeUp} className="mt-6 space-y-3">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                              Ou
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10"
                          onClick={switchToOtp}
                          disabled={isLoading}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Inscription rapide par email
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full h-10 text-muted-foreground"
                          onClick={handleGuestLogin}
                          disabled={isLoading}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Continuer en invité
                        </Button>
                      </motion.div>
                    </motion.div>
                  )
                ) : (
                  /* ========== OTP MODE ========== */
                  <motion.div
                    key="otp"
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div variants={fadeUp} className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold">
                        {tab === "login" ? "Connexion rapide" : "Inscription rapide"}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Entrez votre email pour recevoir un code
                      </p>
                    </motion.div>

                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <motion.div variants={fadeUp}>
                        <Label htmlFor="otp-email">Email</Label>
                        <div className="relative mt-1.5">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="otp-email"
                            name="email"
                            placeholder="exemple@email.com"
                            type="email"
                            className="pl-9 h-11"
                            disabled={isLoading}
                            required
                          />
                        </div>
                      </motion.div>

                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-lg"
                        >
                          {error}
                        </motion.p>
                      )}

                      <motion.div variants={fadeUp}>
                        <Button
                          type="submit"
                          className="w-full h-11"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Envoi du code...
                            </>
                          ) : (
                            <>
                              Envoyer le code
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </form>

                    <motion.div variants={fadeUp} className="mt-6 space-y-3">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            Ou
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10"
                        onClick={switchToPassword}
                        disabled={isLoading}
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {tab === "login" ? "Connexion avec mot de passe" : "Inscription avec mot de passe"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-10 text-muted-foreground"
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Continuer en invité
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted/50 border-t">
              <span className="inline-flex items-center gap-2">
                <HardHat className="h-3 w-3" />
                BudgetBati — Estimation de construction Tunisie
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:text-foreground transition-colors">
              ← Retour à l'accueil
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
