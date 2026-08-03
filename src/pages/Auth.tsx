import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { usePageSEO } from "@/hooks/use-page-seo";

interface AuthProps {
  redirectAfterAuth?: string;
}

function getRedirect(returnTo: string | null, fallback = "/dashboard") {
  return returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : fallback;
}

// Animation presets
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const slide = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
};

// Decorative circles pattern
const PatternCircles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: "var(--auth-primary)", opacity: 0.08 }} />
    <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full" style={{ background: "var(--auth-accent)", opacity: 0.06 }} />
    <div className="absolute top-1/3 -left-16 w-48 h-48 rounded-full" style={{ background: "var(--auth-gold)", opacity: 0.05 }} />
    <svg className="absolute top-1/4 right-1/4 w-32 h-32 opacity-[0.04]" viewBox="0 0 100 100" fill="none" style={{ color: "var(--auth-primary)" }}>
      <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="currentColor" />
    </svg>
    <svg className="absolute bottom-1/4 left-1/3 w-24 h-24 opacity-[0.03]" viewBox="0 0 100 100" fill="none" style={{ color: "var(--auth-accent)" }}>
      <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="currentColor" />
    </svg>
  </div>
);

// Measure marks decoration
const MeasureMarks = () => (
  <div className="absolute bottom-8 right-8 flex items-center gap-1 opacity-20">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="w-px" style={{ height: i % 5 === 0 ? 16 : 8, background: "var(--auth-accent)", opacity: 0.4 + (i % 5 === 0 ? 0.3 : 0) }} />
    ))}
    <span className="text-[10px] ml-1 font-mono" style={{ color: "var(--auth-accent)", opacity: 0.5 }}>0  5  10m</span>
  </div>
);

// Floating icon animation
const FloatingIcon = ({ icon: Icon, style, delay = 0 }: { icon: React.ElementType; style: React.CSSProperties; delay?: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={style}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 0.12, scale: 1, y: [0, -8, 0] }}
    transition={{ opacity: { duration: 1, delay }, scale: { duration: 0.5, delay }, y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay } }}
  >
    <Icon className="w-6 h-6" style={{ color: "var(--auth-primary)" }} />
  </motion.div>
);

// Reusable form field
function FormField({ label, id, name, type = "text", placeholder, icon: Icon, disabled, required, minLength, autoComplete, children, value, onChange }: {
  label: string; id: string; name?: string; type?: string; placeholder?: string;
  icon?: React.ElementType; disabled?: boolean; required?: boolean; minLength?: number;
  autoComplete?: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Label htmlFor={id} className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{label}</Label>
      <div className="auth-input-focus relative mt-1.5 rounded-lg auth-card-border bg-background/50">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2"><Icon className="h-4 w-4" style={{ color: "var(--foreground)", opacity: 0.5 }} /></div>}
        <Input id={id} name={name ?? id} type={type} placeholder={placeholder}
          className={`h-11 border-0 bg-transparent shadow-none focus-visible:ring-0 ${Icon ? "pl-9" : ""} ${children ? "pr-10" : ""}`}
          disabled={disabled} required={required} minLength={minLength} autoComplete={autoComplete}
          value={value} onChange={onChange} />
        {children}
      </div>
    </motion.div>
  );
}

// Auth card wrapper
function AuthCard({ children, topBar = true }: { children: React.ReactNode; topBar?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="w-full max-w-sm mx-auto">
      <div className="rounded-2xl shadow-xl overflow-hidden bg-card/80 backdrop-blur-xl"
        style={{ border: "1px solid color-mix(in srgb, var(--auth-primary) 15%, transparent)", boxShadow: "0 20px 60px -12px color-mix(in srgb, var(--auth-primary) 12%, transparent)" }}>
        {topBar && <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, var(--auth-primary), var(--auth-accent), var(--auth-gold))" }} />}
        <div className="p-6 sm:p-8">{children}</div>
      </div>
    </motion.div>
  );
}

// Error banner
function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm py-2.5 px-3.5 rounded-lg"
      style={{ color: "var(--foreground)", background: "color-mix(in srgb, var(--auth-primary) 10%, transparent)" }}>
      <AlertCircle className="h-4 w-4 shrink-0" /> <span>{message}</span>
    </motion.div>
  );
}

// Divider
function Divider({ label }: { label: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" style={{ borderColor: "color-mix(in srgb, var(--auth-primary) 10%, transparent)" }} />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card/80 px-2" style={{ color: "var(--foreground)", opacity: 0.5 }}>{label}</span>
      </div>
    </div>
  );
}

// Success check animation
function SuccessCheck({ message, subtitle, actionLabel, onAction }: {
  message: string; subtitle: string; actionLabel: string; onAction: () => void;
}) {
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="text-center py-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, -5, 0] }} transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.1 }}
        className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4" style={{ background: "color-mix(in srgb, var(--auth-primary) 12%, transparent)" }}>
        <CheckCircle2 className="h-8 w-8" style={{ color: "var(--auth-primary)" }} />
      </motion.div>
      <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>{message}</h2>
      <p className="text-sm mb-6" style={{ color: "var(--foreground)", opacity: 0.6 }}>{subtitle}</p>
      <Button type="button" className="w-full h-11 text-white border-0 shadow-lg"
        style={{ background: "linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))", boxShadow: "0 4px 14px color-mix(in srgb, var(--auth-primary) 30%, transparent)" }}
        onClick={onAction}><LogIn className="mr-2 h-4 w-4" />{actionLabel}</Button>
    </motion.div>
  );
}

// Primary gradient button
function PrimaryButton({ loading, loadingText, children, disabled }: {
  loading?: boolean; loadingText?: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Button type="submit"
        className="w-full h-11 text-white border-0 shadow-lg transition-all duration-200 hover:brightness-110"
        style={{ background: "linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))", boxShadow: "0 4px 14px color-mix(in srgb, var(--auth-primary) 30%, transparent)" }}
        disabled={disabled || loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {loadingText || "Chargement..."}</>
          : <>{children}<ArrowRight className="ml-2 h-4 w-4" /></>}
      </Button>
    </motion.div>
  );
}

// Tab Switcher
function TabSwitcher({ tab, setTab }: {
  tab: "login" | "register"; setTab: (t: "login" | "register") => void;
}) {
  return (
    <div className="flex rounded-xl p-1 mb-6" style={{ background: "color-mix(in srgb, var(--auth-primary) 8%, transparent)" }}>
      {[{ key: "login" as const, icon: LogIn, label: "Connexion" }, { key: "register" as const, icon: UserPlus, label: "Inscription" }].map((item) => (
        <button key={item.key} type="button"
          onClick={() => setTab(item.key)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${tab === item.key ? "bg-white dark:bg-card shadow-sm" : "hover:opacity-80"}`}
          style={tab === item.key ? { color: "var(--foreground)" } : { color: "var(--foreground)", opacity: 0.6 }}>
          <item.icon className="h-4 w-4" /> {item.label}
        </button>
      ))}
    </div>
  );
}

// Left decorative panel
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12"
      style={{ background: "linear-gradient(160deg, var(--auth-primary-dark), var(--auth-primary) 40%, var(--auth-accent) 100%)" }}>
      <div className="absolute inset-0 blueprint-grid" />
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
      <FloatingIcon icon={HardHat} style={{ top: "15%", left: "12%" }} delay={0} />
      <FloatingIcon icon={Ruler} style={{ top: "25%", right: "15%" }} delay={0.5} />
      <FloatingIcon icon={DraftingCompass} style={{ bottom: "30%", left: "15%" }} delay={1} />
      <FloatingIcon icon={Shield} style={{ bottom: "20%", right: "12%" }} delay={1.5} />
      <div className="relative z-10 text-center max-w-md">
        <Link to="/">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8 mx-auto"
            style={{ background: "color-mix(in srgb, white 12%, transparent)", backdropFilter: "blur(8px)" }}>
            <img src={logo} alt="BudgetBati" width={56} height={56} className="rounded-xl brightness-0 invert" />
          </motion.div>
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-4xl font-bold mb-3 text-white">BudgetBati</h1>
          <p className="text-lg mb-4" style={{ color: "color-mix(in srgb, white 70%, transparent)" }}>Estimation de coÃ»ts de construction</p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ background: "color-mix(in srgb, var(--auth-gold) 20%, transparent)", color: "var(--auth-gold)", backdropFilter: "blur(4px)" }}>
            <MapPin className="h-3.5 w-3.5" /> Tunisie 2026
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-12 space-y-5 text-left">
          {[{ icon: HardHat, text: "Plans, photos, croquis ou dimensions - l'IA les analyse" },
            { icon: Building2, text: "Plus de 40 types de projets de construction" },
            { icon: MapPin, text: "Prix actualisÃ©s par rÃ©gion tunisienne" },
            { icon: Star, text: "Devis PDF dÃ©taillÃ© avec scÃ©narios budget" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.12 }} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, white 10%, transparent)", backdropFilter: "blur(4px)" }}>
                <item.icon className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-sm" style={{ color: "color-mix(in srgb, white 80%, transparent)" }}>{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
        <MeasureMarks />
      </div>
    </div>
  );
}

// Mobile logo
function MobileLogo() {
  return (
    <div className="lg:hidden flex justify-center pt-6 pb-2">
      <Link to="/">
        <div className="flex items-center gap-2">
          <img src={logo} alt="BudgetBati" width={36} height={36} className="rounded-lg" />
          <span className="font-bold text-lg" style={{ color: "var(--foreground)" }}>BudgetBati</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "color-mix(in srgb, var(--auth-accent) 12%, transparent)", color: "var(--auth-accent)" }}>Tunisie</span>
        </div>
      </Link>
    </div>
  );
}
// ===================== MAIN AUTH COMPONENT =====================

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = getRedirect(searchParams.get("returnTo"), redirectAfterAuth);

  const [tab, setTab] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"email" | { email: string }>("email");
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Separate visibility per field
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [regShowPw, setRegShowPw] = useState(false);
  const [regShowConfirmPw, setRegShowConfirmPw] = useState(false);

  // Forgot password
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "otp" | "password" | "success">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const updateProfile = useMutation(api.users.updateProfile);
  const resetPasswordMutation = useMutation(api.users.resetPassword);
  const pendingProfileRef = useRef<{name: string; phone: string} | null>(null);

  // Save profile after auth is confirmed (avoids race condition with signIn)
  useEffect(() => {
    if (isAuthenticated && pendingProfileRef.current) {
      const data = pendingProfileRef.current;
      pendingProfileRef.current = null;
      updateProfile({ name: data.name || undefined, phone: data.phone || undefined });
    }
  }, [isAuthenticated, updateProfile]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(redirect);
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const resetError = () => setError(null);

  // -- OTP: send email --
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsLoading(true); resetError();
    if (tab === "register" && !acceptedTerms) {
      setError("Vous devez accepter les conditions d'utilisation et la politique de confidentialité.");
      setIsLoading(false);
      return;
    }
    try {
      const fd = new FormData(e.currentTarget);
      await signIn("email-otp", fd);
      setStep({ email: fd.get("email") as string });
    } catch { setError("Échec d'envoi du code."); }
    setIsLoading(false);
  };

  // -- OTP: verify --
  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsLoading(true); resetError();
    try {
      const fd = new FormData(e.currentTarget);
      await signIn("email-otp", fd);
      navigate(redirect);
    } catch { setError("Le code est incorrect."); setOtp(""); }
    setIsLoading(false);
  };

  // -- Password login --
  const handlePasswordLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsLoading(true); resetError();
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("flow", "signIn");
      await signIn("password", fd);
      navigate(redirect);
    } catch { setError("Email ou mot de passe incorrect."); }
    setIsLoading(false);
  };

  // -- Password register --
  const handlePasswordRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsLoading(true); resetError();
    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions d'utilisation et la politique de confidentialité.");
      setIsLoading(false);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const pw = fd.get("password") as string;
    const cpw = fd.get("confirmPassword") as string;
    if (pw !== cpw) { setError("Les mots de passe ne correspondent pas."); setIsLoading(false); return; }
    if (pw.length < 8) { setError("8 caractères minimum."); setIsLoading(false); return; }
    try {
      fd.set("flow", "signUp");
      await signIn("password", fd);
      // Store profile data for useEffect to save once auth is confirmed
      const phone = fd.get("phone") as string;
      const name = fd.get("name") as string;
      if (phone || name) {
        pendingProfileRef.current = { name: name || "", phone: phone || "" };
      }
      navigate(redirect);
    }
    catch { setError("Erreur lors de l'inscription."); }
    setIsLoading(false);
  };

  // -- Guest --
  const handleGuestLogin = async () => {
    setIsLoading(true); resetError();
    try { await signIn("anonymous"); navigate(redirect); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur inconnue"); }
    setIsLoading(false);
  };

  // -- Forgot: send email --
  const handleForgotEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsLoading(true); resetError();
    try {
      const fd = new FormData(e.currentTarget);
      const email = fd.get("email") as string;
      setResetEmail(email);
      await signIn("email-otp", fd);
      setResetStep("otp");
    } catch { setError("Échec d'envoi du code."); }
    setIsLoading(false);
  };

  // -- Forgot: submit new password --
  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPw !== confirmNewPw) { setError("Les mots de passe ne correspondent pas."); return; }
    if (newPw.length < 8) { setError("8 caractères minimum."); return; }
    setIsLoading(true); resetError();
    try { await resetPasswordMutation({ email: resetEmail, newPassword: newPw }); setResetStep("success"); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur."); }
    setIsLoading(false);
  };

  const switchToOtp = () => { setAuthMode("otp"); setStep("email"); resetError(); setForgotPassword(false); };
  const switchToPassword = () => { setAuthMode("password"); setStep("email"); resetError(); setForgotPassword(false); };

  // -- Loading state --
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center auth-bg-pattern">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--auth-primary)" }} />
    </div>;
  }

  // -- OTP Verify Screen --
  if (typeof step === "object" && "email" in step) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 auth-bg-pattern relative">
        <PatternCircles />
        <div className="relative z-10 w-full max-w-sm mx-auto">
          <AuthCard topBar>
            <div className="flex justify-center mb-6">
              <Link to="/"><img src={logo} alt="BudgetBati" width={48} height={48} className="rounded-xl" style={{ boxShadow: "0 0 0 2px color-mix(in srgb, var(--auth-primary) 20%, transparent)" }} /></Link>
            </div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto" style={{ background: "color-mix(in srgb, var(--auth-accent) 12%, transparent)" }}>
                <Mail className="h-5 w-5" style={{ color: "var(--auth-accent)" }} />
              </div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Vérifiez votre email</h1>
              <p className="text-sm mt-1" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                Un code a été envoyé à<br /><strong>{step.email}</strong>
              </p>
            </div>
            <form onSubmit={handleOtpSubmit}>
              <input type="hidden" name="email" value={step.email} />
              <input type="hidden" name="code" value={otp} />
              <div className="flex justify-center mb-5">
                <InputOTP value={otp} onChange={setOtp} maxLength={6} disabled={isLoading}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <ErrorBanner message={error} />}
              <Button type="submit" className="w-full h-11 text-white border-0 mt-4" style={{ background: "linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))" }}
                disabled={isLoading || otp.length !== 6}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification...</>
                  : <>Vérifier le code<ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
              <div className="mt-4 text-center space-y-2">
                <button type="button" onClick={() => setStep("email")} className="text-sm hover:underline font-medium" style={{ color: "var(--foreground)" }}>Renvoyer le code</button>
                <br />
                <button type="button" onClick={() => { switchToPassword(); setStep("email"); }} className="text-sm hover:underline" style={{ color: "var(--foreground)", opacity: 0.6 }}>← Mot de passe</button>
              </div>
            </form>
          </AuthCard>
        </div>
      </div>
    );
  }

  // ===================== MAIN AUTH PAGE =====================
  return (
    <div className="min-h-screen flex auth-bg-pattern">
      <PatternCircles />
      <LeftPanel />
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <AuthCard topBar>
          <MobileLogo />
          <TabSwitcher tab={tab} setTab={(t) => { setTab(t); resetError(); }} />
          <AnimatePresence mode="popLayout">
            {forgotPassword ? (
              // -- FORGOT PASSWORD --
              <motion.div key={`forgot-${resetStep}`} {...slide}>
                {resetStep === "success" ? (
                  <SuccessCheck message="Mot de passe réinitialisé" subtitle="Votre mot de passe a été mis à jour." actionLabel="Se connecter"
                    onAction={() => { setForgotPassword(false); setResetStep("email"); setTab("login"); }} />
                ) : resetStep === "email" ? (
                  <motion.div variants={stagger} initial="hidden" animate="visible">
                    <div className="text-center mb-5">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 mx-auto" style={{ background: "color-mix(in srgb, var(--auth-primary) 12%, transparent)" }}>
                        <Lock className="h-5 w-5" style={{ color: "var(--auth-primary)" }} />
                      </div>
                      <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Mot de passe oublié</h2>
                      <p className="text-sm mt-1" style={{ color: "var(--foreground)", opacity: 0.6 }}>Entrez votre email pour recevoir un code</p>
                    </div>
                    <form onSubmit={handleForgotEmail} className="space-y-4">
                      <FormField label="Email" id="forgot-email" name="email" type="email" placeholder="exemple@email.com" icon={Mail} disabled={isLoading} required />
                      {error && <ErrorBanner message={error} />}
                      <PrimaryButton loading={isLoading} loadingText="Envoi...">Envoyer le code</PrimaryButton>
                    </form>
                    <button type="button" onClick={() => { setForgotPassword(false); resetError(); }} className="w-full text-sm text-center mt-5 hover:underline" style={{ color: "var(--foreground)", opacity: 0.6 }}>← Retour</button>
                  </motion.div>
                ) : resetStep === "otp" ? (
                  <motion.div variants={stagger} initial="hidden" animate="visible">
                    <div className="text-center mb-5">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 mx-auto" style={{ background: "color-mix(in srgb, var(--auth-accent) 12%, transparent)" }}>
                        <Mail className="h-5 w-5" style={{ color: "var(--auth-accent)" }} />
                      </div>
                      <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Vérifiez votre email</h2>
                      <p className="text-sm mt-1" style={{ color: "var(--foreground)", opacity: 0.6 }}>Un code a été envoyé à <strong>{resetEmail}</strong></p>
                    </div>
                    <div className="flex justify-center mb-4">
                      <InputOTP value={resetOtp} onChange={(v) => { setResetOtp(v); if (v.length === 6) setTimeout(() => setResetStep("password"), 300); }} maxLength={6} disabled={isLoading}>
                        <InputOTPGroup>{Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && <ErrorBanner message={error} />}
                    <button type="button" onClick={() => setResetStep("email")} className="w-full text-sm text-center mt-2 hover:underline" style={{ color: "var(--foreground)", opacity: 0.6 }}>← Modifier l'email</button>
                  </motion.div>
                ) : (
                  // NEW PASSWORD
                  <motion.div variants={stagger} initial="hidden" animate="visible">
                    <div className="text-center mb-5">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 mx-auto" style={{ background: "color-mix(in srgb, var(--auth-primary) 12%, transparent)" }}>
                        <KeyRound className="h-5 w-5" style={{ color: "var(--auth-primary)" }} />
                      </div>
                      <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Nouveau mot de passe</h2>
                      <p className="text-sm mt-1" style={{ color: "var(--foreground)", opacity: 0.6 }}>Choisissez un mot de passe sécurisé</p>
                    </div>
                    <form onSubmit={handleResetSubmit} className="space-y-4">
                      <FormField label="Nouveau mot de passe" id="new-pw" type="password" placeholder="Min. 8 caractères" icon={Lock} value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} />
                      <FormField label="Confirmer" id="confirm-new-pw" type="password" placeholder="Répéter" icon={Lock} value={confirmNewPw} onChange={(e) => setConfirmNewPw(e.target.value)} required minLength={8} />
                      {error && <ErrorBanner message={error} />}
                      <PrimaryButton loading={isLoading} loadingText="Réinitialisation...">Réinitialiser</PrimaryButton>
                    </form>
                  </motion.div>
                )}
              </motion.div>
            ) : authMode === "password" ? (
              tab === "login" ? (
                // -- LOGIN --
                <motion.div key="login-pw" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }}>
                  <div className="mb-5">
                    <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Bon retour parmi nous</h2>
                    <p className="text-sm mt-1" style={{ color: "var(--foreground)", opacity: 0.6 }}>Connectez-vous à votre compte</p>
                  </div>
                  <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <FormField label="Email" id="login-email" name="email" type="email" placeholder="exemple@email.com" icon={Mail} disabled={isLoading} required autoComplete="email" />
                    <FormField label="Mot de passe" id="login-password" name="password" type={loginShowPw ? "text" : "password"} placeholder="Votre mot de passe" icon={Lock} disabled={isLoading} required minLength={8} autoComplete="current-password">
                      <button type="button" onClick={() => setLoginShowPw(!loginShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80" style={{ color: "var(--foreground)", opacity: 0.5 }} tabIndex={-1}>
                        {loginShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </FormField>
                    <div className="flex justify-end -mt-1">
                      <button type="button" onClick={() => { setForgotPassword(true); resetError(); setResetStep("email"); }}
                        className="text-xs hover:underline transition-colors" style={{ color: "var(--foreground)", opacity: 0.7 }}>Mot de passe oublié ?</button>
                    </div>
                    {error && <ErrorBanner message={error} />}
                    <PrimaryButton loading={isLoading} loadingText="Connexion...">Se connecter</PrimaryButton>
                  </form>

                </motion.div>
              ) : (
                // -- REGISTER --
                <motion.div key="register-pw" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }}>
                  <div className="mb-5">
                    <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Créer un compte</h2>
                    <p className="text-sm mt-1" style={{ color: "var(--foreground)", opacity: 0.6 }}>Rejoignez BudgetBati et estimez vos projets</p>
                  </div>
                  <form onSubmit={handlePasswordRegister} className="space-y-4">
                    <FormField label="Nom complet" id="reg-name" name="name" placeholder="Votre nom" icon={User} disabled={isLoading} required autoComplete="name" />
                    <FormField label="Téléphone" id="reg-phone" name="phone" type="tel" placeholder="+216 XX XXX XXX" icon={Phone} disabled={isLoading} autoComplete="tel" />
                    <FormField label="Email" id="reg-email" name="email" type="email" placeholder="exemple@email.com" icon={Mail} disabled={isLoading} required autoComplete="email" />
                    <FormField label="Mot de passe" id="reg-password" name="password" type={regShowPw ? "text" : "password"} placeholder="Min. 8 caractères" icon={Lock} disabled={isLoading} required minLength={8} autoComplete="new-password">
                      <button type="button" onClick={() => setRegShowPw(!regShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80" style={{ color: "var(--foreground)", opacity: 0.5 }} tabIndex={-1}>
                        {regShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </FormField>
                    <FormField label="Confirmer le mot de passe" id="reg-confirm-password" name="confirmPassword" type={regShowConfirmPw ? "text" : "password"} placeholder="Répéter" icon={Lock} disabled={isLoading} required minLength={8} autoComplete="new-password">
                      <button type="button" onClick={() => setRegShowConfirmPw(!regShowConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80" style={{ color: "var(--foreground)", opacity: 0.5 }} tabIndex={-1}>
                        {regShowConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </FormField>
                    {error && <ErrorBanner message={error} />}
                    <motion.div variants={fadeUp}>
                      <label htmlFor="accept-terms" className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl p-3 transition-all hover:opacity-95"
                        style={{ border: "1px solid color-mix(in srgb, var(--auth-primary) 14%, transparent)", background: "color-mix(in srgb, var(--auth-primary) 4%, transparent)" }}>
                        <Checkbox id="accept-terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(!!v)} disabled={isLoading} className="mt-0.5 shrink-0" />
                        <span className="text-xs leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.72 }}>
                          En créant un compte, j'accepte les <Link to="/terms" className="font-medium hover:underline" style={{ color: "var(--auth-primary)" }}>conditions d'utilisation</Link> et la <Link to="/privacy" className="font-medium hover:underline" style={{ color: "var(--auth-primary)" }}>politique de confidentialité</Link>.
                        </span>
                      </label>
                    </motion.div>
                    <PrimaryButton loading={isLoading} loadingText="Inscription...">Créer mon compte</PrimaryButton>
                  </form>

                </motion.div>
              )
            ) : (
              // -- OTP MODE --
              <motion.div key="otp-mode" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -8 }}>
                <div className="text-center mb-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 mx-auto" style={{ background: "color-mix(in srgb, var(--auth-accent) 12%, transparent)" }}>
                    <Mail className="h-5 w-5" style={{ color: "var(--auth-accent)" }} />
                  </div>
                  <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>{tab === "login" ? "Connexion rapide" : "Inscription rapide"}</h2>
                  <p className="text-sm mt-1" style={{ color: "var(--foreground)", opacity: 0.6 }}>Entrez votre email pour recevoir un code</p>
                </div>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <FormField label="Email" id="otp-email" name="email" type="email" placeholder="exemple@email.com" icon={Mail} disabled={isLoading} required />
                  {error && <ErrorBanner message={error} />}
                  {tab === "register" && (
                    <motion.div variants={fadeUp}>
                      <label htmlFor="otp-accept-terms" className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl p-3 transition-all hover:opacity-95"
                        style={{ border: "1px solid color-mix(in srgb, var(--auth-primary) 14%, transparent)", background: "color-mix(in srgb, var(--auth-primary) 4%, transparent)" }}>
                        <Checkbox id="otp-accept-terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(!!v)} disabled={isLoading} className="mt-0.5 shrink-0" />
                        <span className="text-xs leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.72 }}>
                          En créant un compte, j'accepte les <Link to="/terms" className="font-medium hover:underline" style={{ color: "var(--auth-primary)" }}>conditions d'utilisation</Link> et la <Link to="/privacy" className="font-medium hover:underline" style={{ color: "var(--auth-primary)" }}>politique de confidentialité</Link>.
                        </span>
                      </label>
                    </motion.div>
                  )}
                  <PrimaryButton loading={isLoading} loadingText="Envoi...">Envoyer le code</PrimaryButton>
                </form>                  <div className="space-y-2.5">
                    <Button type="button" variant="outline" className="w-full h-10" style={{ borderColor: "color-mix(in srgb, var(--auth-primary) 15%, transparent)", color: "var(--foreground)" }}
                      onClick={switchToPassword} disabled={isLoading}><Lock className="mr-2 h-4 w-4" /> Utiliser mot de passe</Button>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </AuthCard>
      </div>
    </div>
  );
}

// ===================== EXPORT =====================
export default function AuthPage(props: AuthProps) {
  usePageSEO({ title: "Connexion - BudgetBati", description: "Connectez-vous ou créez un compte BudgetBati pour estimer vos projets de construction." });
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}