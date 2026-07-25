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
  Lock,
  Mail,
  MapPin,
  Phone,
  Ruler,
  User,
  UserPlus,
  UserX,
  LogIn,
  DraftingCompass,
  Shield,
  Star,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

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

const slideFromRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
};

// Tunisian-inspired decorative patterns
const PatternCircles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Large decorative circles with warm tones */}
    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'var(--auth-primary)', opacity: 0.08 }} />
    <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full" style={{ background: 'var(--auth-accent)', opacity: 0.06 }} />
    <div className="absolute top-1/3 -left-16 w-48 h-48 rounded-full" style={{ background: 'var(--auth-gold)', opacity: 0.05 }} />
    
    {/* Moroccan/Tunisian geometric star motif */}
    <svg className="absolute top-1/4 right-1/4 w-32 h-32 opacity-[0.04]" viewBox="0 0 100 100" fill="none" style={{ color: 'var(--auth-primary)' }}>
      <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="currentColor" />
    </svg>
    <svg className="absolute bottom-1/4 left-1/3 w-24 h-24 opacity-[0.03]" viewBox="0 0 100 100" fill="none" style={{ color: 'var(--auth-accent)' }}>
      <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="currentColor" />
    </svg>
  </div>
);

// Animated measurement marks
const MeasureMarks = () => (
  <div className="absolute bottom-8 right-8 flex items-center gap-1 opacity-20">
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="w-px"
        style={{
          height: i % 5 === 0 ? 16 : 8,
          background: 'var(--auth-accent)',
          opacity: 0.4 + (i % 5 === 0 ? 0.3 : 0),
        }}
      />
    ))}
    <span className="text-[10px] ml-1 font-mono" style={{ color: 'var(--auth-accent)', opacity: 0.5 }}>
      0  5  10m
    </span>
  </div>
);

// Floating construction icons
const FloatingIcon = ({ icon: Icon, style, delay = 0 }: { icon: React.ElementType; style: React.CSSProperties; delay?: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={style}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 0.12, scale: 1, y: [0, -8, 0] }}
    transition={{
      opacity: { duration: 1, delay },
      scale: { duration: 0.5, delay },
      y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
    }}
  >
    <Icon className="w-6 h-6" style={{ color: 'var(--auth-primary)' }} />
  </motion.div>
);

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [tab, setTab] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"email" | { email: string; name?: string }>("email");
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [regShowPw, setRegShowPw] = useState(false);
  const [regShowConfirmPw, setRegShowConfirmPw] = useState(false);
  const [regPassword, setRegPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  
  // Forgot password state
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "otp" | "password" | "success">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const resetPasswordMutation = useMutation(api.users.resetPassword);

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
      setError("Échec d'envoi du code. Veuillez réessayer.");
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
      setError("Email ou mot de passe incorrect.");
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
      await signIn("password", formData);
      navigate(redirect);
    } catch (error) {
      console.error("Password register error:", error);
      setError("Erreur lors de l'inscription.");
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
      setError(`Échec de connexion invité: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
      setIsLoading(false);
    }
  };

  const switchToOtp = () => {
    setAuthMode("otp");
    setStep("email");
    setError(null);
    setForgotPassword(false);
  };

  const switchToPassword = () => {
    setAuthMode("password");
    setStep("email");
    setError(null);
    setForgotPassword(false);
  };

  // ========== FORGOT PASSWORD FLOW ==========
  const handleForgotPasswordEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get("email") as string;
      setResetEmail(email);
      await signIn("email-otp", formData);
      setResetStep("otp");
      setIsLoading(false);
    } catch (error) {
      setError("Échec d'envoi du code. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await resetPasswordMutation({ email: resetEmail, newPassword });
      setResetStep("success");
      setIsLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de la réinitialisation.");
      setIsLoading(false);
    }
  };

  // ========== LOADING STATE ==========
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center auth-bg-pattern">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--auth-primary)' }} />
          </div>
          <p className="text-sm animate-pulse" style={{ color: 'var(--auth-primary)', opacity: 0.7 }}>
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  // ========== OTP VERIFICATION STEP ==========
  if (typeof step === "object" && "email" in step) {
    return (
      <div className="min-h-screen flex flex-col auth-bg-pattern">
        <PatternCircles />
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <div
              className="rounded-2xl shadow-2xl overflow-hidden bg-card backdrop-blur-xl"
              style={{
                border: '1px solid color-mix(in srgb, var(--auth-primary) 20%, transparent)',
                boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--auth-primary) 20%, transparent)',
              }}
            >
              <div className="relative">
                {/* Decorative top bar */}
                <div className="h-1.5 w-full" style={{
                  background: 'linear-gradient(90deg, var(--auth-primary), var(--auth-accent), var(--auth-gold))',
                }} />
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex justify-center mb-6">
                  <Link to="/">
                    <img
                      src={logo}
                      alt="BudgetBati"
                      width={52}
                      height={52}
                      className="rounded-xl"
                      style={{
                        boxShadow: '0 0 0 2px color-mix(in srgb, var(--auth-primary) 20%, transparent)',
                      }}
                    />
                  </Link>
                </div>

                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 mx-auto"
                    style={{ background: 'color-mix(in srgb, var(--auth-accent) 12%, transparent)' }}
                  >
                    <Mail className="h-6 w-6" style={{ color: 'var(--auth-accent)' }} />
                  </motion.div>
                  <h1 className="text-xl font-semibold" style={{ color: 'var(--auth-primary-dark)' }}>
                    Vérifiez votre email
                  </h1>
                  <p className="text-sm mt-2" style={{ color: 'var(--auth-primary)', opacity: 0.7 }}>
                    Un code à 6 chiffres a été envoyé à<br />
                    <span className="font-medium" style={{ color: 'var(--auth-primary-dark)' }}>{step.email}</span>
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
                      className="text-sm text-center mb-4 py-2 px-3 rounded-lg"
                      style={{ color: 'var(--auth-primary)', background: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }}
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 text-white border-0"
                    style={{
                      background: 'linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))',
                    }}
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
                    <p className="text-sm" style={{ color: 'var(--auth-primary)', opacity: 0.7 }}>
                      Vous n'avez pas reçu de code ?{" "}
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="hover:underline font-medium inline"
                        style={{ color: 'var(--auth-primary)' }}
                      >
                        Renvoyer
                      </button>
                    </p>
                    <button
                      type="button"
                      onClick={() => { switchToPassword(); setStep("email"); }}
                      className="text-sm hover:underline transition-colors"
                      style={{ color: 'var(--auth-primary)', opacity: 0.6 }}
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

  // ========== MAIN AUTH PAGE ==========
  return (
    <div className="min-h-screen flex auth-bg-pattern">
      <PatternCircles />

      {/* LEFT: Decorative Brand Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12"
        style={{
          background: 'linear-gradient(160deg, var(--auth-primary-dark), var(--auth-primary) 40%, var(--auth-accent) 100%)',
        }}
      >
        {/* Blueprint grid overlay */}
        <div className="absolute inset-0 blueprint-grid" />

        {/* Decorative geometric patterns */}
        <svg className="absolute top-10 left-10 w-48 h-48 opacity-[0.06]" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="0.5" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="0.5" />
          <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="0.5" />
        </svg>
        <svg className="absolute bottom-10 right-10 w-36 h-36 opacity-[0.06]" viewBox="0 0 100 100" fill="none" transform="rotate(45)">
          <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" stroke="currentColor" strokeWidth="1" />
        </svg>

        {/* Floating icons */}
        <FloatingIcon icon={HardHat} style={{ top: '15%', left: '12%' }} delay={0} />
        <FloatingIcon icon={Ruler} style={{ top: '25%', right: '15%' }} delay={0.5} />
        <FloatingIcon icon={DraftingCompass} style={{ bottom: '30%', left: '15%' }} delay={1} />
        <FloatingIcon icon={Shield} style={{ bottom: '20%', right: '12%' }} delay={1.5} />

        {/* Content */}
        <div className="relative z-10 text-center max-w-md">
          <Link to="/">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8 mx-auto"
              style={{ background: 'color-mix(in srgb, white 12%, transparent)', backdropFilter: 'blur(8px)' }}
            >
              <img src={logo} alt="BudgetBati" width={56} height={56} className="rounded-xl brightness-0 invert" />
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold mb-3 text-white">BudgetBati</h1>
            <p className="text-lg mb-4" style={{ color: 'color-mix(in srgb, white 70%, transparent)' }}>
              Estimation de coûts de construction
            </p>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: 'color-mix(in srgb, var(--auth-gold) 20%, transparent)',
                color: 'var(--auth-gold)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <MapPin className="h-3.5 w-3.5" />
              Tunisie 2026
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 space-y-5 text-left"
          >
            {[
              { icon: HardHat, text: "Plans, photos, croquis ou dimensions — l'IA les analyse" },
              { icon: Building2, text: "Plus de 40 types de projets de construction" },
              { icon: MapPin, text: "Prix actualisés par région tunisienne" },
              { icon: Star, text: "Devis PDF détaillé avec scénarios budget" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, white 10%, transparent)', backdropFilter: 'blur(4px)' }}
                >
                  <item.icon className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="text-sm" style={{ color: 'color-mix(in srgb, white 80%, transparent)' }}>
                  {item.text}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <MeasureMarks />
        </div>
      </div>

      {/* RIGHT: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div
            className="rounded-2xl shadow-2xl overflow-hidden bg-card backdrop-blur-xl"
            style={{
              border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)',
              boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--auth-primary) 15%, transparent)',
            }}
          >
            {/* Decorative top bar */}
            <div className="h-1.5 w-full" style={{
              background: 'linear-gradient(90deg, var(--auth-primary), var(--auth-accent), var(--auth-gold))',
            }} />

            {/* Logo mobile */}
            <div className="lg:hidden flex justify-center pt-6 pb-2">
              <Link to="/">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="BudgetBati" width={36} height={36} className="rounded-lg" />
                  <span className="font-bold text-lg" style={{ color: 'var(--auth-primary-dark)' }}>
                    BudgetBati
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
                    background: 'color-mix(in srgb, var(--auth-accent) 12%, transparent)',
                    color: 'var(--auth-accent)',
                  }}>
                    Tunisie
                  </span>
                </div>
              </Link>
            </div>

            {/* Tab switcher */}
            <div className="px-6 pt-4">
              <div
                className="flex rounded-xl p-1"
                style={{ background: 'color-mix(in srgb, var(--auth-primary) 8%, transparent)' }}
              >
                <button
                  type="button"
                  onClick={() => { setTab("login"); setError(null); }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    tab === "login"
                      ? "bg-white dark:bg-card shadow-sm"
                      : "hover:opacity-80"
                  }`}
                  style={tab === "login" ? { color: 'var(--auth-primary-dark)' } : { color: 'var(--auth-primary)', opacity: 0.6 }}
                >
                  <LogIn className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("register"); setError(null); }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    tab === "register"
                      ? "bg-white dark:bg-card shadow-sm"
                      : "hover:opacity-80"
                  }`}
                  style={tab === "register" ? { color: 'var(--auth-primary-dark)' } : { color: 'var(--auth-primary)', opacity: 0.6 }}
                >
                  <UserPlus className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  Inscription
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 pt-6">
              <AnimatePresence mode="popLayout">
                {forgotPassword ? (
                  /* ========== FORGOT PASSWORD ========== */
                  <motion.div
                    key={`forgot-${resetStep}`}
                    {...slideFromRight}
                  >
                    {resetStep === "success" ? (
                      /* SUCCESS STATE */
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="text-center py-4"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: [0, 10, -5, 0] }}
                          transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.1 }}
                          className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4"
                          style={{ background: 'color-mix(in srgb, var(--auth-primary) 12%, transparent)' }}
                        >
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                          >
                            <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--auth-primary)' }} />
                          </motion.div>
                        </motion.div>
                        <motion.h2 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-xl font-semibold mb-2" style={{ color: 'var(--auth-primary-dark)' }}
                        >
                          Mot de passe réinitialisé
                        </motion.h2>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-sm mb-6" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}
                        >
                          Votre mot de passe a été mis à jour avec succès.
                        </motion.p>
                        <Button
                          type="button"
                          className="w-full h-11 text-white border-0 shadow-lg"
                          style={{ 
                            background: 'linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))',
                            boxShadow: '0 4px 14px color-mix(in srgb, var(--auth-primary) 30%, transparent)',
                          }}
                          onClick={() => { setForgotPassword(false); setResetStep("email"); setTab("login"); }}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Se connecter
                        </Button>
                      </motion.div>
                    ) : resetStep === "otp" || resetStep === "password" ? (
                      /* OTP / NEW PASSWORD */
                      resetStep === "otp" ? (
                        <motion.div
                          variants={stagger}
                          initial="hidden"
                          animate="visible"
                        >
                          <motion.div variants={fadeUp} className="text-center mb-6">
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 200, damping: 15 }}
                              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto"
                              style={{ background: 'color-mix(in srgb, var(--auth-accent) 12%, transparent)' }}
                            >
                              <Mail className="h-5 w-5" style={{ color: 'var(--auth-accent)' }} />
                            </motion.div>
                            <h2 className="text-xl font-semibold" style={{ color: 'var(--auth-primary-dark)' }}>
                              Vérifiez votre email
                            </h2>
                            <p className="text-sm mt-2" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}>
                              Un code a été envoyé à <strong>{resetEmail}</strong>
                            </p>
                          </motion.div>
                          <div className="flex justify-center mb-6">
                            <InputOTP
                              value={resetOtp}
                              onChange={(v) => {
                                setResetOtp(v);
                                if (v.length === 6) {
                                  setTimeout(() => {
                                    setResetStep("password");
                                  }, 300);
                                }
                              }}
                              maxLength={6}
                              disabled={isLoading}
                            >
                              <InputOTPGroup>
                                {Array.from({ length: 6 }).map((_, i) => (
                                  <InputOTPSlot key={i} index={i} />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          {error && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-sm text-center mb-4 py-2 px-3 rounded-lg"
                              style={{ color: 'var(--auth-primary)', background: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }}
                            >{error}</motion.p>
                          )}
                          <p className="text-sm text-center" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}>
                            <button
                              type="button"
                              onClick={() => setResetStep("email")}
                              className="hover:underline"
                              style={{ color: 'var(--auth-primary)' }}
                            >
                              ← Modifier l'email
                            </button>
                          </p>
                        </motion.div>
                      ) : (
                        /* NEW PASSWORD FORM */
                        <motion.div
                          variants={stagger}
                          initial="hidden"
                          animate="visible"
                        >
                          <motion.div variants={fadeUp} className="text-center mb-6">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 200, damping: 15 }}
                              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto"
                              style={{ background: 'color-mix(in srgb, var(--auth-primary) 12%, transparent)' }}
                            >
                              <KeyRound className="h-5 w-5" style={{ color: 'var(--auth-primary)' }} />
                            </motion.div>
                            <h2 className="text-xl font-semibold" style={{ color: 'var(--auth-primary-dark)' }}>
                              Nouveau mot de passe
                            </h2>
                            <p className="text-sm mt-2" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}>
                              Choisissez un nouveau mot de passe sécurisé
                            </p>
                          </motion.div>
                          <form onSubmit={handleResetPassword} className="space-y-4">
                            <motion.div variants={fadeUp}>
                              <Label className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                                Nouveau mot de passe
                              </Label>
                              <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                                <Input
                                  type="password"
                                  placeholder="Min. 8 caractères"
                                  className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  required
                                  minLength={8}
                                />
                              </div>
                            </motion.div>
                            <motion.div variants={fadeUp}>
                              <Label className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                                Confirmer le mot de passe
                              </Label>
                              <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                                <Input
                                  type="password"
                                  placeholder="Répéter le mot de passe"
                                  className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                  value={confirmNewPassword}
                                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                                  required
                                  minLength={8}
                                />
                              </div>
                            </motion.div>
                            {error && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm py-2 px-3 rounded-lg"
                                style={{ color: 'var(--auth-primary)', background: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }}
                              >{error}</motion.p>
                            )}
                            <motion.div variants={fadeUp}>
                              <Button
                                type="submit"
                                className="w-full h-11 text-white border-0 shadow-lg"
                                style={{
                                  background: 'linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))',
                                  boxShadow: '0 4px 14px color-mix(in srgb, var(--auth-primary) 30%, transparent)',
                                }}
                                disabled={isLoading || !newPassword || !confirmNewPassword}
                              >
                                {isLoading ? (
                                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Réinitialisation...</>
                                ) : (
                                  <>Réinitialiser <ArrowRight className="ml-2 h-4 w-4" /></>
                                )}
                              </Button>
                            </motion.div>
                          </form>
                        </motion.div>
                      )
                    ) : (
                      /* INITIAL EMAIL FORM */
                      <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="visible"
                      >
                        <motion.div variants={fadeUp} className="text-center mb-6">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto"
                            style={{ background: 'color-mix(in srgb, var(--auth-primary) 12%, transparent)' }}
                          >
                            <Lock className="h-5 w-5" style={{ color: 'var(--auth-primary)' }} />
                          </motion.div>
                          <h2 className="text-xl font-semibold" style={{ color: 'var(--auth-primary-dark)' }}>
                            Mot de passe oublié
                          </h2>
                          <p className="text-sm mt-2" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}>
                            Entrez votre email pour recevoir un code
                          </p>
                        </motion.div>
                        <form onSubmit={handleForgotPasswordEmail} className="space-y-4">
                          <motion.div variants={fadeUp}>
                            <Label className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                              Email
                            </Label>
                            <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                              <Input
                                name="email"
                                type="email"
                                placeholder="exemple@email.com"
                                className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                required
                              />
                            </div>
                          </motion.div>
                          {error && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-sm py-2 px-3 rounded-lg"
                              style={{ color: 'var(--auth-primary)', background: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }}
                            >{error}</motion.p>
                          )}
                          <motion.div variants={fadeUp}>
                            <Button
                              type="submit"
                              className="w-full h-11 text-white border-0 shadow-lg"
                              style={{
                                background: 'linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))',
                                boxShadow: '0 4px 14px color-mix(in srgb, var(--auth-primary) 30%, transparent)',
                              }}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...</>
                              ) : (
                                <>Envoyer le code <ArrowRight className="ml-2 h-4 w-4" /></>
                              )}
                            </Button>
                          </motion.div>
                        </form>
                        <p className="text-sm text-center mt-6" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}>
                          <button
                            type="button"
                            onClick={() => { setForgotPassword(false); setError(null); }}
                            className="hover:underline"
                            style={{ color: 'var(--auth-primary)' }}
                          >
                            ← Retour à la connexion
                          </button>
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                ) : authMode === "password" ? (
                  tab === "login" ? (
                    /* ========== LOGIN ========== */
                    <motion.div
                      key="login-pw"
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div variants={fadeUp} className="mb-6">
                        <h2 className="text-xl font-semibold" style={{ color: 'var(--auth-primary-dark)' }}>
                          Bon retour parmi nous
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}>
                          Connectez-vous à votre compte BudgetBati
                        </p>
                      </motion.div>

                      <form onSubmit={handlePasswordLogin} className="space-y-4">
                        <motion.div variants={fadeUp}>
                          <Label htmlFor="login-email" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                            Email
                          </Label>
                          <div
                            className="relative mt-1.5 rounded-lg transition-all duration-200"
                            style={{
                              border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = 'var(--auth-primary)';
                              e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--auth-primary) 12%, transparent)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--auth-primary) 15%, transparent)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                            <Input
                              id="login-email"
                              name="email"
                              type="email"
                              placeholder="exemple@email.com"
                              className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </motion.div>

                        <motion.div variants={fadeUp}>
                          <Label htmlFor="login-password" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                            Mot de passe
                          </Label>
                          <button type="button" onClick={() => { setForgotPassword(true); setError(null); }} className="text-xs hover:underline font-medium" style={{ color: 'var(--auth-primary)', opacity: 0.7 }}>
                            Mot de passe oublié ?
                          </button>
                          <div
                            className="relative mt-1.5 rounded-lg transition-all duration-200"
                            style={{
                              border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = 'var(--auth-primary)';
                              e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--auth-primary) 12%, transparent)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--auth-primary) 15%, transparent)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--auth-primary)', opacity: 0.5 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <Input
                              id="login-password"
                              name="password"
                              type={loginShowPw ? "text" : "password"}
                              placeholder="Votre mot de passe"
                              className="pl-9 pr-10 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                              disabled={isLoading}
                              required
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => setLoginShowPw(!loginShowPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                              style={{ color: 'var(--auth-primary)', opacity: 0.5 }}
                              tabIndex={-1}
                            >
                              {loginShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </motion.div>

                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm py-2 px-3 rounded-lg"
                            style={{ color: 'var(--auth-primary)', background: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }}
                          >
                            {error}
                          </motion.p>
                        )}

                        <motion.div variants={fadeUp}>
                          <Button
                            type="submit"
                            className="w-full h-11 text-white border-0 shadow-lg"
                            style={{
                              background: 'linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))',
                              boxShadow: '0 4px 14px color-mix(in srgb, var(--auth-primary) 30%, transparent)',
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion...</>
                            ) : (
                              <>Se connecter <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                          </Button>
                        </motion.div>
                      </form>

                      {/* Divider */}
                      <motion.div variants={fadeUp} className="mt-6 space-y-3">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" style={{ borderColor: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }} />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2" style={{ color: 'var(--auth-primary)', opacity: 0.5 }}>
                              Autres options
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--auth-primary) 15%, transparent)',
                            color: 'var(--auth-primary)',
                          }}
                          onClick={switchToOtp}
                          disabled={isLoading}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Connexion rapide par email
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full h-10"
                          style={{ color: 'var(--auth-primary)', opacity: 0.6 }}
                          onClick={handleGuestLogin}
                          disabled={isLoading}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Continuer en invité
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    /* ========== REGISTER ========== */
                    <motion.div
                      key="register-pw"
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div variants={fadeUp} className="mb-6">
                        <h2 className="text-xl font-semibold" style={{ color: 'var(--auth-primary-dark)' }}>
                          Créer un compte
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}>
                          Rejoignez BudgetBati et estimez vos projets
                        </p>
                      </motion.div>

                      <form onSubmit={handlePasswordRegister} className="space-y-4">
                        <motion.div variants={fadeUp}>
                          <Label htmlFor="reg-name" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                            Nom complet
                          </Label>
                          <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                            <Input
                              id="reg-name"
                              name="name"
                              type="text"
                              placeholder="Votre nom"
                              className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <motion.div variants={fadeUp}>
                            <Label htmlFor="reg-phone" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                              Téléphone <span className="opacity-50">(opt.)</span>
                            </Label>
                            <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                              <Input
                                id="reg-phone"
                                name="phone"
                                type="tel"
                                placeholder="+216 XX XXX XXX"
                                className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                disabled={isLoading}
                              />
                            </div>
                          </motion.div>

                          <motion.div variants={fadeUp}>
                            <Label htmlFor="reg-company" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                              Entreprise <span className="opacity-50">(opt.)</span>
                            </Label>
                            <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                              <Input
                                id="reg-company"
                                name="company"
                                type="text"
                                placeholder="Votre société"
                                className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                disabled={isLoading}
                              />
                            </div>
                          </motion.div>
                        </div>

                        <motion.div variants={fadeUp}>
                          <Label htmlFor="reg-email" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                            Email
                          </Label>
                          <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                            <Input
                              id="reg-email"
                              name="email"
                              type="email"
                              placeholder="exemple@email.com"
                              className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </motion.div>

                        <motion.div variants={fadeUp}>
                          <Label htmlFor="reg-password" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                            Mot de passe
                          </Label>
                          <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--auth-primary)', opacity: 0.5 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <Input
                              id="reg-password"
                              name="password"
                              type={regShowPw ? "text" : "password"}
                              placeholder="Min. 8 caractères"
                              className="pl-9 pr-10 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                              disabled={isLoading}
                              required
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => setRegShowPw(!regShowPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                              style={{ color: 'var(--auth-primary)', opacity: 0.5 }}
                              tabIndex={-1}
                            >
                              {regShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </motion.div>

                        <motion.div variants={fadeUp}>
                          <Label htmlFor="reg-confirm-password" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                            Confirmer le mot de passe
                          </Label>
                          <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--auth-primary)', opacity: 0.5 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <Input
                              id="reg-confirm-password"
                              name="confirmPassword"
                              type={regShowConfirmPw ? "text" : "password"}
                              placeholder="Répéter le mot de passe"
                              className="pl-9 pr-10 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                              disabled={isLoading}
                              required
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => setRegShowConfirmPw(!regShowConfirmPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                              style={{ color: 'var(--auth-primary)', opacity: 0.5 }}
                              tabIndex={-1}
                            >
                              {regShowConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </motion.div>

                        <motion.div variants={fadeUp}>
                          <p className="text-xs" style={{ color: 'var(--auth-primary)', opacity: 0.5 }}>
                            En créant un compte, vous acceptez nos{" "}
                            <a href="#" className="hover:underline font-medium" style={{ color: 'var(--auth-primary)' }}>
                              conditions d'utilisation
                            </a>{" "}
                            et notre{" "}
                            <a href="#" className="hover:underline font-medium" style={{ color: 'var(--auth-primary)' }}>
                              politique de confidentialité
                            </a>.
                          </p>
                        </motion.div>

                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm py-2 px-3 rounded-lg"
                            style={{ color: 'var(--auth-primary)', background: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }}
                          >
                            {error}
                          </motion.p>
                        )}

                        <motion.div variants={fadeUp}>
                          <Button
                            type="submit"
                            className="w-full h-11 text-white border-0 shadow-lg"
                            style={{
                              background: 'linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))',
                              boxShadow: '0 4px 14px color-mix(in srgb, var(--auth-primary) 30%, transparent)',
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inscription...</>
                            ) : (
                              <>Créer mon compte <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                          </Button>
                        </motion.div>
                      </form>

                      <motion.div variants={fadeUp} className="mt-6 space-y-3">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" style={{ borderColor: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }} />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2" style={{ color: 'var(--auth-primary)', opacity: 0.5 }}>
                              Ou
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--auth-primary) 15%, transparent)',
                            color: 'var(--auth-primary)',
                          }}
                          onClick={switchToOtp}
                          disabled={isLoading}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Inscription rapide par email
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full h-10"
                          style={{ color: 'var(--auth-primary)', opacity: 0.6 }}
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
                    key="otp-mode"
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div variants={fadeUp} className="text-center mb-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto"
                        style={{ background: 'color-mix(in srgb, var(--auth-accent) 12%, transparent)' }}
                      >
                        <Mail className="h-5 w-5" style={{ color: 'var(--auth-accent)' }} />
                      </motion.div>
                      <h2 className="text-xl font-semibold" style={{ color: 'var(--auth-primary-dark)' }}>
                        {tab === "login" ? "Connexion rapide" : "Inscription rapide"}
                      </h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--auth-primary)', opacity: 0.6 }}>
                        Entrez votre email pour recevoir un code
                      </p>
                    </motion.div>

                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <motion.div variants={fadeUp}>
                        <Label htmlFor="otp-email" className="text-sm font-medium" style={{ color: 'var(--auth-primary-dark)' }}>
                          Email
                        </Label>
                        <div className="relative mt-1.5 rounded-lg" style={{ border: '1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)' }}>
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--auth-primary)', opacity: 0.5 }} />
                          <Input
                            id="otp-email"
                            name="email"
                            placeholder="exemple@email.com"
                            type="email"
                            className="pl-9 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                            disabled={isLoading}
                            required
                          />
                        </div>
                      </motion.div>

                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm py-2 px-3 rounded-lg"
                          style={{ color: 'var(--auth-primary)', background: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }}
                        >
                          {error}
                        </motion.p>
                      )}

                      <motion.div variants={fadeUp}>
                        <Button
                          type="submit"
                          className="w-full h-11 text-white border-0 shadow-lg"
                          style={{
                            background: 'linear-gradient(135deg, var(--auth-accent), var(--auth-accent-light))',
                            boxShadow: '0 4px 14px color-mix(in srgb, var(--auth-accent) 30%, transparent)',
                          }}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi du code...</>
                          ) : (
                            <>Envoyer le code <ArrowRight className="ml-2 h-4 w-4" /></>
                          )}
                        </Button>
                      </motion.div>
                    </form>

                    <motion.div variants={fadeUp} className="mt-6 space-y-3">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" style={{ borderColor: 'color-mix(in srgb, var(--auth-primary) 10%, transparent)' }} />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2" style={{ color: 'var(--auth-primary)', opacity: 0.5 }}>
                            Ou
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--auth-primary) 15%, transparent)',
                          color: 'var(--auth-primary)',
                        }}
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
                        className="w-full h-10"
                        style={{ color: 'var(--auth-primary)', opacity: 0.6 }}
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
            <div
              className="py-4 px-6 text-xs text-center border-t"
              style={{
                color: 'var(--auth-primary)', opacity: 0.5,
                background: 'color-mix(in srgb, var(--auth-primary) 3%, transparent)',
                borderColor: 'color-mix(in srgb, var(--auth-primary) 8%, transparent)',
              }}
            >
              <span className="inline-flex items-center gap-2">
                <HardHat className="h-3 w-3" />
                BudgetBati — Estimation de construction Tunisie
              </span>
            </div>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--auth-primary)', opacity: 0.5 }}>
            <Link to="/" className="hover:underline transition-colors" style={{ color: 'var(--auth-primary)' }}>
              ← Retour à l'accueil
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Auth;
