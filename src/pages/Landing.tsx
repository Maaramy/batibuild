import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ChartBar,
  ChevronRight,
  Cpu,
  FileText,
  HardHat,
  Home,
  Layers,
  Menu,
  Moon,
  PaintBucket,
  Ruler,
  Sun,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
  Check,
  Star,
  Shield,
  BarChart3,
  Download,
  Globe,
  CreditCard,
  MessageSquare,
  Sparkles,
  Play,
  Calculator,
  MapPin,
  Search,
  DollarSign,
  ClipboardList,
  Loader2,
  Phone,
  Mail,
  Store,
  Truck,
  Wrench,
  PhoneCall,
  Building,
  Factory,
  Briefcase,
  BadgeCheck,
  Printer,
  Table2,
  ScrollText,
  Stamp,
  ChevronDown,
  ChevronUp,
  Eye,
  Hammer,
  Package,
  Warehouse,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";

// ============================================================================
// Constants
// ============================================================================

const FEATURES = [
  {
    icon: Upload,
    title: "Import Multi-Format",
    desc: "Importez des photos, plans PDF, images satellite ou croquis dessinés à la main en un clic.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Cpu,
    title: "Analyse IA Automatique",
    desc: "L'IA reconnaît le type de projet, détecte les dimensions et identifie les matériaux nécessaires.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: TrendingUp,
    title: "Estimation Précise",
    desc: "Calcul automatique des coûts basé sur les prix actualisés du marché tunisien.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: FileText,
    title: "Rapports Professionnels",
    desc: "Générez des rapports détaillés en PDF, Excel ou CSV avec répartition complète des coûts.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: Ruler,
    title: "40+ Types de Projets",
    desc: "Maisons, villas, piscines, immeubles, rénovations et bien plus encore.",
    gradient: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    icon: Layers,
    title: "Gestion des Matériaux",
    desc: "Base de données des prix des matériaux actualisée avec historique des changements.",
    gradient: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
];

const BENEFITS = [
  {
    number: "50%",
    label: "Gain de temps",
    desc: "Réduisez de moitié le temps d'estimation grâce à l'IA",
  },
  {
    number: "40+",
    label: "Types de projets",
    desc: "Catégories de construction prises en charge",
  },
  {
    number: "95%",
    label: "Précision",
    desc: "Taux de confiance moyen des estimations IA",
  },
  {
    number: "500+",
    label: "Matériaux",
    desc: "Prix actualisés dans la base de données",
  },
];

const TESTIMONIALS = [
  {
    name: "Ahmed Ben Salah",
    role: "Architecte, Tunis",
    content:
      "Cet outil a révolutionné ma façon d'estimer les projets. L'IA est impressionnante de précision.",
    avatar: "AB",
    rating: 5,
  },
  {
    name: "Sarra Mejri",
    role: "Promotrice Immobilière, Sfax",
    content:
      "Gain de temps considérable. Je peux maintenant fournir des devis détaillés en quelques minutes.",
    avatar: "SM",
    rating: 5,
  },
  {
    name: "Karim Bouaziz",
    role: "Ingénieur Civil, Sousse",
    content:
      "La base de données des prix tunisiens est très complète et régulièrement mise à jour.",
    avatar: "KB",
    rating: 5,
  },
];

const PROJECT_CATEGORIES_DISPLAY = [
  "Maison", "Villa", "Piscine", "Jardin", "Garage", "Immeuble",
  "Bureau", "Restaurant", "Rénovation", "Terrasse", "Ferme", "Mosquée",
];

// ============================================================================
// Components
// ============================================================================

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm text-foreground/80 hover:text-foreground transition-all hover:border-border"
    >
      <Sun className={`h-4 w-4 transition-all ${theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"}`} />
      <Moon className={`absolute h-4 w-4 transition-all ${theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`} />
    </button>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass-strong shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HardHat className="h-4.5 w-4.5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">BudgetBati</span>
          <span className="hidden sm:inline-block ml-1 text-xs font-medium text-muted-foreground/60">Tunisia</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
          <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Avis</a>
          <a href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex text-sm"
            onClick={() => navigate("/auth")}
          >
            Connexion
          </Button>
          <Button
            size="sm"
            className="hidden sm:inline-flex text-sm gap-1"
            onClick={() => navigate("/auth")}
          >
            Commencer
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-strong border-t border-border/50 md:hidden"
        >
          <div className="px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Fonctionnalités</a>
            <a href="#testimonials" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Avis</a>
            <div className="flex gap-2 pt-2 border-t border-border/50">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { navigate("/auth"); setMobileOpen(false); }}>Connexion</Button>
              <Button size="sm" className="flex-1" onClick={() => { navigate("/auth"); setMobileOpen(false); }}>Commencer</Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

function HeroSection() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-32 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
      
      <motion.div style={{ y, opacity }} className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Estimation par IA pour le marché tunisien</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight"
          >
            Estimez vos projets de{" "}
            <span className="gradient-text">construction</span>{" "}
            en Tunisie avec l'IA
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Importez une photo, un plan ou des dimensions. L'intelligence artificielle analyse, 
            calcule et génère un devis complet basé sur les prix actualisés du marché tunisien.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="h-12 px-8 text-base gap-2 w-full sm:w-auto shadow-lg shadow-primary/20"
              onClick={() => navigate("/auth")}
            >
              Commencer un devis gratuit
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base w-full sm:w-auto"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              En savoir plus
            </Button>
          </motion.div>

          {/* Categories bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-12"
          >
            <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider font-medium">
              Plus de 40 types de projets pris en charge
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {PROJECT_CATEGORIES_DISPLAY.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="px-3 py-1.5 text-xs font-medium bg-secondary/70 hover:bg-secondary transition-colors"
                >
                  {cat}
                </Badge>
              ))}
              <Badge variant="outline" className="px-3 py-1.5 text-xs text-muted-foreground">
                + 28 autres
              </Badge>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef(null);

  const steps = [
    {
      step: "01",
      icon: Upload,
      title: "Importez votre projet",
      shortTitle: "Import",
      desc: "Importez une photo, un plan PDF, une image satellite ou saisissez les dimensions manuellement.",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20",
      border: "border-blue-200/50 dark:border-blue-800/30",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      step: "02",
      icon: Cpu,
      title: "L'IA analyse",
      shortTitle: "Analyse",
      desc: "L'intelligence artificielle identifie le type de projet, calcule les surfaces et détecte les matériaux.",
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20",
      border: "border-violet-200/50 dark:border-violet-800/30",
      textColor: "text-violet-600 dark:text-violet-400",
    },
    {
      step: "03",
      icon: FileText,
      title: "Recevez votre estimation",
      shortTitle: "Rapport",
      desc: "Obtenez un devis complet avec coût total, répartition détaillée, et recommandations personnalisées.",
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20",
      border: "border-emerald-200/50 dark:border-emerald-800/30",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
  ] as const;

  // Auto-play
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, steps.length]);

  const current = steps[activeStep];
  const StepIcon = current.icon;
  const navigate = useNavigate();

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background decorations */}
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-blue-400/3 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            Comment ça marche
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            De l'import au rapport en{" "}
            <span className="gradient-text">3 étapes</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Un processus simple et rapide pour estimer vos projets de construction en Tunisie.
          </p>
        </motion.div>

        {/* Main demo area */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
          {/* Left side: Step list */}
          <div className="lg:col-span-2 space-y-4">
            {steps.map((s, i) => {
              const SIcon = s.icon;
              const isActive = i === activeStep;
              return (
                <motion.button
                  key={s.step}
                  onClick={() => { setActiveStep(i); setIsPaused(true); setTimeout(() => setIsPaused(false), 5000); }}
                  whileHover={{ x: 4 }}
                  className={`relative w-full text-left rounded-xl border p-4 sm:p-5 transition-all duration-300 ${
                    isActive
                      ? `border-primary/30 bg-primary/5 shadow-md shadow-primary/5`
                      : "border-border/30 bg-background/40 hover:bg-muted/30 hover:border-border/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-br ${s.gradient} text-white shadow-lg`
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <SIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-mono font-semibold ${isActive ? s.textColor : "text-muted-foreground"}`}>
                          {s.step}
                        </span>
                        <h3 className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {s.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Right side: Mock screen */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className={`relative overflow-hidden rounded-2xl border-2 ${current.border} ${current.bgGradient} shadow-xl`}
            >
              {/* Mock browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-background/80">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                    <HardHat className="h-3 w-3" />
                    <span>app.budgetbati.tn / nouveau-projet</span>
                  </div>
                </div>
              </div>

              {/* Mock screen content */}
              <div className="p-4 sm:p-6">
                {activeStep === 0 && <MockImportScreen />}
                {activeStep === 1 && <MockAnalysisScreen />}
                {activeStep === 2 && <MockReportScreen />}
              </div>

              {/* Step indicator overlay */}
              <div className="flex items-center justify-center gap-2 pb-4">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveStep(i); setIsPaused(true); setTimeout(() => setIsPaused(false), 5000); }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === activeStep
                        ? `w-8 bg-gradient-to-r ${current.gradient}`
                        : "w-2 bg-border hover:bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 text-center"
        >
          <Button
            size="lg"
            className="h-12 px-8 text-base gap-2"
            onClick={() => navigate("/auth")}
          >
            Essayer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Mock Screens ── */

function MockImportScreen() {
  return (
    <div className="space-y-4">
      {/* Project type selector */}
      <div className="flex gap-2 flex-wrap">
        {["Maison", "Villa", "Appartement", "Piscine"].map((t) => (
          <div
            key={t}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
              t === "Maison"
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-300"
                : "border-border/40 text-muted-foreground hover:border-border/70"
            }`}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Main input area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload zone */}
        <div className="rounded-xl border-2 border-dashed border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20 p-4 text-center">
          <Upload className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <div className="text-xs font-medium text-foreground mb-1">Importez vos documents</div>
          <div className="text-[10px] text-muted-foreground">Photo, plan PDF, image satellite</div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] text-blue-600">
            <Check className="h-3 w-3" />
            Plan_maison.pdf
          </div>
        </div>

        {/* Manual input */}
        <div className="space-y-2">
          <div className="rounded-lg border border-border/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium">Région</span>
            </div>
            <div className="rounded-md border border-border/30 bg-background px-3 py-2 text-xs text-foreground">
              Tunis
            </div>
          </div>
          <div className="rounded-lg border border-border/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium">Surface (m²)</span>
            </div>
            <div className="rounded-md border border-border/30 bg-background px-3 py-2 text-xs text-foreground">
              150
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-xs font-medium text-white shadow-sm">
          <Cpu className="h-3.5 w-3.5" />
          Analyser mon projet
        </div>
      </div>
    </div>
  );
}

function MockAnalysisScreen() {
  return (
    <div className="space-y-4">
      {/* Analysis progress */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold">Analyse en cours...</div>
          <div className="text-[10px] text-muted-foreground">Reconnaissance du projet par l'IA</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
        />
      </div>

      {/* Detection results appearing */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Type de projet", value: "Maison R+1", icon: Building2, done: true },
          { label: "Surface détectée", value: "150 m²", icon: Ruler, done: true },
          { label: "Matériaux", value: "24 identifiés", icon: Layers, done: true },
          { label: "Qualité", value: "Standard", icon: Sparkles, done: true },
        ].map((item) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-violet-200/40 dark:border-violet-800/30 bg-background/60 p-2.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
              <item.icon className="h-3 w-3 text-violet-500" />
              {item.label}
            </div>
            <div className="text-xs font-semibold">{item.value}</div>
          </motion.div>
        ))}
      </div>

      {/* IA badge */}
      <div className="flex items-center gap-2 rounded-lg bg-violet-500/5 border border-violet-200/40 dark:border-violet-800/30 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        <span className="text-[10px] text-muted-foreground">
          IA : <span className="font-medium text-foreground">Projet détecté avec 92% de confiance</span>
        </span>
      </div>
    </div>
  );
}

function MockReportScreen() {
  return (
    <div className="space-y-4">
      {/* Total card */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-800/30 p-4 text-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Coût total estimé</div>
        <div className="text-2xl sm:text-3xl font-bold gradient-text mt-0.5">253 590 TND</div>
        <div className="text-[10px] text-muted-foreground">Marché tunisien 2026 • Prix TTC</div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Gros œuvre", pct: 38, color: "bg-blue-500" },
          { label: "Second œuvre", pct: 29, color: "bg-violet-500" },
          { label: "Équipements", pct: 15, color: "bg-emerald-500" },
        ].map((cat) => (
          <div key={cat.label} className="rounded-lg border border-border/20 bg-background/40 p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className={`h-2 w-2 rounded-full ${cat.color}`} />
              <span className="text-[10px] text-muted-foreground">{cat.pct}%</span>
            </div>
            <div className="text-[9px] font-medium truncate">{cat.label}</div>
          </div>
        ))}
      </div>

      {/* Scenarios */}
      <div className="flex gap-2">
        {[
          { label: "Économique", value: "163 590 TND", active: false },
          { label: "Standard", value: "253 590 TND", active: true },
          { label: "Premium", value: "398 475 TND", active: false },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex-1 rounded-lg border p-2 text-center transition-all ${
              s.active ? "border-primary bg-primary/5" : "border-border/20 bg-background/40 opacity-70"
            }`}
          >
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
            <div className={`text-[10px] font-semibold ${s.active ? "text-primary" : ""}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-background/40 px-3 py-2 text-[10px] text-muted-foreground">
          <Download className="h-3.5 w-3.5" />
          Télécharger PDF
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-[10px] font-medium text-white shadow-sm">
          <FileText className="h-3.5 w-3.5" />
          Voir le rapport
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const ref = useRef(null);

  return (
    <section id="features" ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            Fonctionnalités
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Tout ce dont vous avez besoin pour estimer vos projets
          </h2>
          <p className="mt-4 text-muted-foreground">
            Une solution complète qui utilise l'intelligence artificielle pour simplifier l'estimation des coûts de construction.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="group relative h-full p-6 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 bg-background/50 backdrop-blur-sm">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl`} />
                <div className="relative z-10">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-background/80 border border-border/50 ${feature.iconColor}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {BENEFITS.map((benefit, index) => (
            <motion.div
              key={benefit.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="text-4xl sm:text-5xl font-bold gradient-text mb-2">{benefit.number}</div>
              <div className="text-sm font-semibold mb-1">{benefit.label}</div>
              <div className="text-xs text-muted-foreground">{benefit.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            Témoignages
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ce que disent nos utilisateurs
          </h2>
          <p className="mt-4 text-muted-foreground">
            Rejoignez les centaines de professionnels qui nous font confiance.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="h-full p-6 border border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <Avatar className="h-10 w-10 border border-border/50">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-blue-500/5 border border-primary/20 p-8 sm:p-12 lg:p-16 text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium bg-background/50">
              Prêt à commencer ?
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Estimez votre premier projet gratuitement
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Rejoignez les professionnels tunisiens qui utilisent l'IA pour optimiser leurs estimations de construction.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/20"
                onClick={() => navigate("/auth")}
              >
                <Upload className="h-4 w-4" />
                Commencer maintenant
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base"
                onClick={() => navigate("/auth")}
              >
                Créer un compte
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HardHat className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold">BudgetBati</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Solution IA pour l'estimation des coûts de construction en Tunisie.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Produit</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a></li>
              <li><a href="/blog" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Support</h4>
            <ul className="space-y-2">
              <li><a href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Nous contacter</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Légal</h4>
            <ul className="space-y-2">
              <li><a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Confidentialité</a></li>
              <li><a href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Conditions</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} GALISKON PROJECT. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Main Landing Component
// ============================================================================

export default function Landing() {
  usePageSEO({
    title: "BudgetBati - Estimation Construction par IA en Tunisie",
    description: "Estimez vos projets de construction en Tunisie avec l'IA. Obtenez un devis complet avec prix actualisés du marché tunisien 2026.",
  });
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </motion.div>
  );
}
