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
  Landmark,
  Percent,
  CalendarClock,
  Gauge,
  Bot,
  Wallet,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import {
  MockImportScreen,
  MockAnalysisScreen,
  MockReportScreen,
  MockInvestProcessPanel,
  MockInvestmentScreen,
} from "@/components/LandingMockScreens";

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
    to: "/dashboard/new",
  },
  {
    icon: Cpu,
    title: "Analyse IA Automatique",
    desc: "L'IA reconnaît le type de projet, détecte les dimensions et identifie les matériaux nécessaires.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    to: "/dashboard/new",
  },
  {
    icon: TrendingUp,
    title: "Estimation Précise",
    desc: "Calcul automatique des coûts basé sur les prix actualisés du marché tunisien 2026.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    to: "/dashboard",
  },
  {
    icon: Sparkles,
    title: "Assistant Matériaux IA",
    desc: "Recommandation comparative des matériaux, fournisseurs au meilleur prix, optimisation du budget et performance énergétique.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-600 dark:text-violet-400",
    to: "/dashboard/ai-materials",
  },
  {
    icon: ClipboardList,
    title: "Guide Construction A-Z",
    desc: "Feuille de route de 10 phases : démarches tunisiennes, budget à 3 scénarios, planning Gantt, contrôle du chantier et diagnostic IA.",
    gradient: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-600 dark:text-sky-400",
    to: "/dashboard/guide",
  },
  {
    icon: ChartBar,
    title: "Analyse d'Investissement",
    desc: "Rentabilité nette, flux de trésorerie, ROI à 1/5/10 ans, score IA /100 et scénarios de simulation immobilière.",
    gradient: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    to: "/dashboard/investments",
  },
  {
    icon: Store,
    title: "Espace Fournisseur",
    desc: "Annuaire des entrepreneurs, architectes, ingénieurs et fournisseurs : profils vérifiés, spécialités et recommandations ciblées.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    to: "/dashboard/supplier",
  },
  {
    icon: Table2,
    title: "Prix des Matériaux Tunisie",
    desc: "Base de données actualisée 2026 avec historique des prix, mise à jour par l'administration.",
    gradient: "from-teal-500/20 to-cyan-500/20",
    iconColor: "text-teal-600 dark:text-teal-400",
    to: "/dashboard/materials",
  },
  {
    icon: FileText,
    title: "Rapports & Exports",
    desc: "Rapports professionnels détaillés en PDF, Excel ou CSV avec répartition complète des coûts.",
    gradient: "from-rose-500/20 to-orange-500/20",
    iconColor: "text-rose-600 dark:text-rose-400",
    to: "/dashboard",
  },
];

const BENEFITS = [
  {
    number: "50%",
    label: "Gain de temps",
    desc: "Réduisez de moitié le temps d'estimation grâce à l'IA",
  },
  {
    number: "11",
    label: "Types de biens",
    desc: "Types de biens unifiés, alignés sur l'investissement",
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
  "Maison", "Villa", "Appartement", "Studio", "Duplex", "Immeuble",
  "Résidence touristique", "Local commercial", "Bureau", "Entrepôt", "Projet neuf",
];

const INVESTMENT_POINTS = [
  {
    icon: Percent,
    title: "Indicateurs financiers complets",
    desc: "Rentabilité brute et nette, flux de trésorerie mensuel et annuel, Return on Investment à 1, 5 et 10 ans.",
    gradient: "from-blue-500/20 to-sky-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: CalendarClock,
    title: "Récupération du capital",
    desc: "Nombre d'années et date estimée d'amortissement complet de votre investissement.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: TrendingUp,
    title: "Prévisions par IA",
    desc: "Revenus, valeur du bien et gains cumulés à 1, 3, 5 et 10 ans, en tenant compte de l'inflation.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: Layers,
    title: "3 scénarios de simulation",
    desc: "Optimiste, réaliste et prudent : anticipez chaque cas de figure avant d'investir.",
    gradient: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    icon: Gauge,
    title: "Score IA sur 100",
    desc: "Note pondérée : rentabilité, emplacement, demande, risque, appréciation et liquidité.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: Bot,
    title: "Assistant IA investisseur",
    desc: "Posez vos questions : rentabilité, meilleures zones d'investissement, risque, financement.",
    gradient: "from-teal-500/20 to-emerald-500/20",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
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
          <Logo />
          <span className="hidden sm:inline-block ml-1 text-xs font-medium text-muted-foreground/60">Tunisia</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
          <a href="/dashboard/ai-materials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Matériaux IA</a>
          <a href="/dashboard/guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Guide A-Z</a>
          <a href="/dashboard/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
          <a href="#investments" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Investissement</a>
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
            <a href="/dashboard/ai-materials" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Assistant Matériaux IA</a>
            <a href="/dashboard/guide" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Guide Construction A-Z</a>
            <a href="/dashboard/pricing" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Tarifs & abonnements</a>
            <a href="#investments" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Investissement</a>
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

  return (
    <section className="relative overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-background" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-32 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl" />
      <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[560px] h-40 bg-violet-500/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 w-full">
        <div className="mx-auto max-w-5xl text-center">
          {/* Overline + badge IA (violet) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="mb-4 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-[11px] sm:text-xs font-semibold text-violet-700 dark:text-violet-300 shadow-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-sm">
                <Sparkles className="h-3 w-3" />
              </span>
              Plateforme IA de construction & d'investissement — Tunisie 2026
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] max-w-4xl mx-auto"
          >
            Votre <span className="gradient-text">copilote IA</span> pour
            construire, rénover et investir.
          </motion.h1>

          {/* Tagline : Estimez. Optimisez. Construisez. Investissez. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
          >
            {[
              { icon: Calculator, label: "Estimez", color: "text-emerald-600 dark:text-emerald-400" },
              { icon: Sparkles, label: "Optimisez", color: "text-violet-600 dark:text-violet-400" },
              { icon: HardHat, label: "Construisez", color: "text-sky-600 dark:text-sky-400" },
              { icon: TrendingUp, label: "Investissez", color: "text-indigo-600 dark:text-indigo-400" },
            ].map((item, i) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 text-base sm:text-lg font-black tracking-tight"
              >
                <span className={`inline-flex items-center gap-1.5 ${item.color}`}>
                  <item.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  {item.label}
                </span>
                <span className="text-muted-foreground/40">.</span>
              </span>
            ))}
            <span className="sr-only">Estimez. Optimisez. Construisez. Investissez.</span>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Analysez vos projets, optimisez vos coûts, choisissez vos matériaux et prenez de meilleures décisions immobilières grâce à l'IA.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="btn-gradient h-12 px-8 text-base gap-2 w-full sm:w-auto text-white border-0"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="h-12 px-6 text-base w-full sm:w-auto gap-2">
                  <Eye className="h-4 w-4" />
                  Voir un exemple de résultats
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-72">
                <DropdownMenuLabel>Exemples de résultats</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/construction/demo")} className="cursor-pointer gap-2">
                  <HardHat className="h-4 w-4 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Projet de construction</p>
                    <p className="text-[10px] text-muted-foreground">Devis détaillé & rapport IA</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/investments/demo")} className="cursor-pointer gap-2">
                  <Landmark className="h-4 w-4 text-indigo-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Investissement immobilier</p>
                    <p className="text-[10px] text-muted-foreground">Rentabilité, ROI & scénarios</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>

          {/* Signature hero card : résultat en dégradé + watermark + chiffre clé */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
            className="relative mt-12 sm:mt-14 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-green-900 p-6 sm:p-9 text-left shadow-soft-lg"
          >
            <div className="dotted-watermark absolute inset-0 opacity-40" />
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-100" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/90">Copilote IA · Marché tunisien</span>
                </div>
                <p className="mt-4 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
                  Devis moyen — maison à étage · 150 m² · standard
                </p>
                <p className="mt-1 text-4xl sm:text-5xl font-black text-white tabular-nums">253 590 TND</p>
                <p className="mt-2 text-xs text-emerald-100/80 max-w-sm leading-relaxed">
                  Répartition IA : gros œuvre, second œuvre, équipements et finitions — prix actualisés 2026.
                </p>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                <div className="flex-1 sm:flex-none rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm border border-white/10">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-100/70">Confiance IA</p>
                  <p className="text-xl font-black text-white">95%</p>
                </div>
                <div className="flex-1 sm:flex-none rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm border border-white/10">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-100/70">Durée chantier</p>
                  <p className="text-xl font-black text-white">6 mois</p>
                </div>
              </div>
            </div>

            {/* Copilote flow */}
            <div className="relative mt-6 flex flex-wrap items-center gap-2">
              {["Estimer", "Optimiser", "Construire", "Investir"].map((stepLabel, i) => (
                <span
                  key={stepLabel}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white/90 border border-white/10 backdrop-blur-sm"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px] font-black">
                    {i + 1}
                  </span>
                  {stepLabel}
                </span>
              ))}
            </div>

            <div className="relative mt-3 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm border border-white/10">
              <Sparkles className="h-4 w-4 text-emerald-100 shrink-0" />
              <p className="text-[11px] text-emerald-50/90 leading-snug">
                Rapport complet : liste des matériaux, quantités, main-d'œuvre, planning et recommandations — export PDF / Excel / CSV.
              </p>
            </div>
          </motion.div>

          {/* Categories chips */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-10"
          >
            <p className="label-overline mb-4">11 types de biens pris en charge</p>
            <div className="flex flex-wrap justify-center gap-2">
              {PROJECT_CATEGORIES_DISPLAY.slice(0, 8).map((cat, i) => (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                    i === 0
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:border-emerald-500/40 hover:text-foreground"
                  }`}
                >
                  {i === 0 && <Check className="h-3 w-3" />}
                  {cat}
                </span>
              ))}              <span className="inline-flex items-center rounded-full border-2 border-dashed border-border/70 px-3.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
                +3 autres
              </span>
            </div>
          </motion.div>

          {/* Modules plateforme */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="mt-6"
          >
            <p className="label-overline mb-4">Toute la plateforme</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "Assistant Matériaux IA", icon: Sparkles, to: "/dashboard/ai-materials" },
                { label: "Guide Construction A-Z", icon: ClipboardList, to: "/dashboard/guide" },
                { label: "Investissement immobilier", icon: ChartBar, to: "/dashboard/investments" },
                { label: "Espace fournisseur", icon: Store, to: "/dashboard/supplier" },
                { label: "Prix des matériaux", icon: Table2, to: "/dashboard/materials" },
              ].map((mod) => (
                <button
                  key={mod.label}
                  onClick={() => navigate(mod.to)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.04] px-3.5 py-1.5 text-[11px] font-semibold text-foreground/80 hover:border-primary/50 hover:text-foreground hover:bg-primary/[0.08] transition-all cursor-pointer"
                >
                  <mod.icon className="h-3 w-3 text-primary" />
                  {mod.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


function HowItWorksSection() {
  const [mode, setMode] = useState<"construction" | "investissement">("construction");
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef(null);

  const CONSTRUCTION_STEPS = [
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
      gradient: "from-teal-500 to-cyan-500",
      bgGradient: "from-teal-50/50 to-cyan-50/50 dark:from-teal-950/20 dark:to-cyan-950/20",
      border: "border-teal-200/50 dark:border-teal-800/30",
      textColor: "text-teal-600 dark:text-teal-400",
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

  const INVEST_STEPS = [
    {
      step: "01",
      icon: Home,
      title: "Décrivez le bien",
      shortTitle: "Bien",
      desc: "Prix d'achat, loyer attendu, ville et quartier : l'IA connaît les prix du marché tunisien 2026.",
      gradient: "from-indigo-500 to-blue-600",
      bgGradient: "from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20",
      border: "border-indigo-200/50 dark:border-indigo-800/30",
      textColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      step: "02",
      icon: ChartBar,
      title: "L'IA calcule la rentabilité",
      shortTitle: "Rentabilité",
      desc: "Rendement net, flux de trésorerie, score IA /100 et prévisions sur 10 ans.",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20",
      border: "border-blue-200/50 dark:border-blue-800/30",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      step: "03",
      icon: TrendingUp,
      title: "Comparez et décidez",
      shortTitle: "Décision",
      desc: "Scénarios optimiste / prudent, meilleures zones et comparaison avec vos autres projets.",
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20",
      border: "border-emerald-200/50 dark:border-emerald-800/30",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
  ] as const;

  const steps = mode === "construction" ? CONSTRUCTION_STEPS : INVEST_STEPS;

  // Remet l'étape active au début quand on change de produit
  useEffect(() => {
    setActiveStep(0);
  }, [mode]);

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
          <p className="label-overline mb-3">Copilote IA</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            De l'import au rapport en{" "}
            <span className="gradient-text">3 étapes</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            {mode === "construction"
              ? "Un processus simple et rapide pour estimer vos projets de construction en Tunisie."
              : "Analysez la rentabilité de vos investissements immobiliers en 3 étapes — marché tunisien 2026."}
          </p>

          {/* Sélecteur de produit */}
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-border/40 bg-muted/30 p-1">
            {(
              [
                { id: "construction", label: "Construction", icon: HardHat },
                { id: "investissement", label: "Investissement", icon: Landmark },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setMode(p.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  mode === p.id
                    ? "border border-border/50 bg-background text-foreground shadow-sm"
                    : "border border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <p.icon className="h-3.5 w-3.5" />
                {p.label}
              </button>
            ))}
          </div>
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
                    <span>app.batibuild.app / nouveau-projet</span>
                  </div>
                </div>
              </div>

              {/* Mock screen content */}
              <div className="p-4 sm:p-6">
                {mode === "construction" && (
                  <>
                    {activeStep === 0 && <MockImportScreen />}
                    {activeStep === 1 && <MockAnalysisScreen />}
                    {activeStep === 2 && <MockReportScreen />}
                  </>
                )}
                {mode === "investissement" && <MockInvestProcessPanel />}
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
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            size="lg"
            className="h-12 px-8 text-base gap-2"
            onClick={() => navigate(
              mode === "construction" ? "/auth" : "/dashboard/investments"
            )}
          >
            {mode === "construction" ? "Essayer gratuitement" : "Analyser un investissement"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base gap-2"
            onClick={() => navigate(
              mode === "construction" ? "/construction/demo" : "/investments/demo"
            )}
          >
            <Eye className="h-4 w-4" />
            Voir un exemple de résultats
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const ref = useRef(null);
  const navigate = useNavigate();

  return (
    <section id="features" ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-overline mb-3">Votre copilote IA</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Un copilote IA à chaque étape, de l'estimation à l'investissement
          </h2>
          <p className="mt-4 text-muted-foreground">
            Estimation, matériaux, guide de construction, rénovation, investissement et fournisseurs : l'IA accompagne chaque étape sur le marché tunisien.
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
              <Card
                role="link"
                tabIndex={0}
                onClick={() => navigate(feature.to)}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(feature.to); }}
                className="group relative h-full p-6 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 bg-background/50 backdrop-blur-sm cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl`} />
                <div className="relative z-10 flex h-full flex-col">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-background/80 border border-border/50 ${feature.iconColor}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{feature.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                    Découvrir <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Investment Analysis section ── */

function InvestmentsSection() {
  const navigate = useNavigate();
  return (
    <section id="investments" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/3 via-transparent to-blue-500/3" />
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -left-40 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 px-3 py-1 text-xs font-medium">
            <Landmark className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Module investissement
            <span className="ml-1 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 dark:text-blue-400">Nouveau</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Analysez la rentabilité de vos{" "}
            <span className="gradient-text">investissements immobiliers</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Le moteur IA évalue automatiquement vos projets d'investissement en Tunisie : Return on Investment, flux de trésorerie,
            récupération du capital, prévisions de bénéfices et score d'investissement.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left: feature list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INVESTMENT_POINTS.map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.07, duration: 0.45 }}
                className="group flex items-start gap-3 rounded-xl border border-border/40 bg-background/50 backdrop-blur-sm p-4 transition-all duration-300 hover:border-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${point.gradient} border border-border/30 ${point.iconColor}`}>
                  <point.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold mb-1">{point.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{point.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right: mock dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="relative"
          >
            <div className="absolute -inset-3 bg-gradient-to-br from-indigo-500/10 via-transparent to-blue-500/10 rounded-3xl blur-xl" />
            <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 shadow-xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-background/80">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                    <Landmark className="h-3 w-3" />
                    <span>app.batibuild.app / analyse-investissement</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <MockInvestmentScreen />
              </div>

              {/* CTA in mock */}
              <div className="px-4 sm:px-6 pb-5">
                <button
                  onClick={() => navigate("/dashboard/investments")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:brightness-110 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Analyser mon investissement
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => navigate("/investments/demo")}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-background/60 px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-indigo-600 hover:border-indigo-500/40 transition-all"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir un exemple de résultats
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            size="lg"
            className="h-12 px-8 text-base gap-2 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => navigate("/dashboard/investments")}
          >
            <Landmark className="h-4 w-4" />
            Analyser un investissement
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            Découvrir les fonctionnalités
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base gap-2"
            onClick={() => navigate("/investments/demo")}
          >
            <Eye className="h-4 w-4" />
            Voir un exemple de résultats
          </Button>
        </motion.div>
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
              <div className="text-4xl sm:text-5xl font-black gradient-text mb-2">{benefit.number}</div>
              <div className="label-overline mb-1">{benefit.label}</div>
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
          <p className="label-overline mb-3">Social proof</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
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
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-green-900 p-8 sm:p-12 lg:p-16 text-center shadow-soft-lg"
        >
          <div className="dotted-watermark absolute inset-0 opacity-30" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-100" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/90">Prêt à commencer ?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
              Estimez. Optimisez. Construisez. Investissez.
            </h2>
            <p className="text-emerald-100/80 max-w-lg mx-auto mb-8">
              Commencez gratuitement : importez une photo, un plan ou des dimensions et recevez votre devis IA en quelques minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-12 px-8 text-base gap-2 bg-white text-emerald-800 hover:bg-emerald-50 border-0 shadow-lg shadow-black/20"
                onClick={() => navigate("/auth")}
              >
                <Upload className="h-4 w-4" />
                Commencer maintenant
              </Button>
              <Button
                size="lg"
                className="h-12 px-8 text-base bg-white/10 text-white hover:bg-white/20 border border-white/20 backdrop-blur-sm"
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
            <Logo size="sm" className="mb-4" wordmarkClassName="text-base" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Plateforme IA complète : estimation de construction, assistant de choix des matériaux, guide A-Z, investissement immobilier et fournisseurs — prix actualisés du marché tunisien.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Produit</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a></li>
              <li><a href="/dashboard/ai-materials" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Assistant Matériaux IA</a></li>
              <li><a href="/dashboard/guide" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Guide Construction A-Z</a></li>
              <li><a href="/dashboard/investments" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Investissement immobilier</a></li>
              <li><a href="/dashboard/materials" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Prix des matériaux</a></li>
              <li><a href="/dashboard/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Tarifs & abonnements</a></li>
              <li><a href="/blog" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
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
    title: "batibuild App - Votre copilote IA pour construire, rénover et investir",
    description: "Estimez. Optimisez. Construisez. Investissez. Estimation de construction par IA, assistant de choix des matériaux, guide de construction A-Z, analyse d'investissement immobilier et fournisseurs — prix actualisés du marché tunisien 2026.",
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
      <InvestmentsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </motion.div>
  );
}
