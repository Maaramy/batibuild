import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Cpu,
  FileText,
  HardHat,
  Menu,
  TrendingUp,
  Upload,
  X,
  Check,
  Star,
  Sparkles,
  Calculator,
  ClipboardList,
  Landmark,
  Store,
  Table2,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { Logo } from "@/components/Logo";
import { M3Icon } from "@/components/ui/material3";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import {
  MockImportScreen,
  MockAnalysisScreen,
  MockReportScreen,
} from "@/components/LandingMockScreens";
import { ProjectLifecycleSection } from "@/components/ProjectLifecycle";
import { AppDownloadFooterBanner } from "@/components/AppDownloadFooterBanner";
import { AppDownloadBanner } from "@/components/AppDownloadBanner";
import { useAppDownloadBannerVisible } from "@/hooks/use-app-download-banner";

// ============================================================================
// Constants
// ============================================================================

const FEATURES = [
  {
    icon: Upload,
    title: "Gagnez 3 jours par devis",
    desc: "Importez une photo, un plan PDF, une image satellite ou un croquis à la main — l'IA fait le reste en quelques minutes.",
    gradient: "from-primary/18 via-primary/8 to-transparent",
    iconColor: "text-primary",
    to: "/dashboard/new",
  },
  {
    icon: Cpu,
    title: "Evitez les surcoûts",
    desc: "L'IA détecte automatiquement les surfaces, les matériaux et les quantités — plus d'oublis, plus de mauvaises surprises en chantier.",
    gradient: "from-secondary/18 via-secondary/8 to-transparent",
    iconColor: "text-secondary",
    to: "/dashboard/new",
  },
  {
    icon: TrendingUp,
    title: "Prix marché 2026 inclus",
    desc: "Calcul automatique basé sur les tarifs actualisés du marché tunisien — fini les devis basés sur des prix de 2022.",
    gradient: "from-tertiary/18 via-tertiary/8 to-transparent",
    iconColor: "text-tertiary",
    to: "/dashboard",
  },
  {
    icon: ClipboardList,
    title: "Ne perdez plus une seule étape",
    desc: "Guide complet de 10 phases : démarches tunisiennes, budget, planning, contrôle de chantier — rien n'est oublié.",
    gradient: "from-primary/18 via-primary/8 to-transparent",
    iconColor: "text-primary",
    to: "/dashboard/guide",
  },
  {
    icon: Store,
    title: "Trouvez les bons prestataires",
    desc: "Annuaire vérifié d'architectes, ingénieurs et fournisseurs : spécialités, régions et recommandations ciblées.",
    gradient: "from-tertiary/18 via-tertiary/8 to-transparent",
    iconColor: "text-tertiary",
    to: "/dashboard/supplier",
  },
  {
    icon: Table2,
    title: "Suivez l'évolution des prix",
    desc: "Base de 500+ matériaux actualisée en temps réel — anticipez les hausses et optimisez votre timing d'achat.",
    gradient: "from-secondary/18 via-secondary/8 to-transparent",
    iconColor: "text-secondary",
    to: "/dashboard/materials",
  },
  {
    icon: Landmark,
    title: "Investissez sans risque",
    desc: "ROI à 1, 5 et 10 ans, cash-flow, score IA sur 100 et scénarios prudent / réaliste / optimiste pour chaque bien.",
    gradient: "from-primary/18 via-secondary/8 to-transparent",
    iconColor: "text-primary",
    to: "/dashboard/investments",
  },
  {
    icon: FileText,
    title: "Envoyez un devis pro en 1 clic",
    desc: "Exportez des rapports PDF, Excel ou CSV professionnels — prêts à envoyer à vos clients ou à votre banquier.",
    gradient: "from-tertiary/18 via-primary/8 to-transparent",
    iconColor: "text-tertiary",
    to: "/dashboard",
  },
];

const BENEFITS = [
  {
    number: "5 min",
    label: "Au lieu de 5 jours",
    desc: "Un devis complet en quelques minutes, pas en semaines",
  },
  {
    number: "95%",
    label: "De précision IA",
    desc: "Estimations fiables basées sur les prix marché 2026",
  },
  {
    number: "500+",
    label: "Matériaux suivis",
    desc: "Prix actualisés de la CNAM au carrelage — Tunisie",
  },
  {
    number: "0 TND",
    label: "Pour démarrer",
    desc: "Inscrivez-vous et testez — sans engagement, sans CB",
  },
];

const TESTIMONIALS = [
  {
    name: "Ahmed Ben Salah",
    role: "Architecte, Tunis",
    content:
      "Avant, mes devis prenaient 2 à 3 jours. Avec batibuild, je les livre en 30 minutes — et mes clients me font plus confiance grâce aux détails IA.",
    avatar: "AB",
    rating: 5,
    metric: "Devis en 30 min au lieu de 3 jours",
  },
  {
    name: "Sarra Mejri",
    role: "Promotrice Immobilière, Sfax",
    content:
      "J'ai analysé 4 projets de construction en une matinée. L'outil m'a évité une erreur qui m'aurait coûté 40 000 TND.",
    avatar: "SM",
    rating: 5,
    metric: "40 000 TND d'erreur évitée",
  },
  {
    name: "Karim Bouaziz",
    role: "Ingénieur Civil, Sousse",
    content:
      "La base de prix tunisiens est la seule à jour sur le marché. Mes concurrents utilisent encore des tarifs de 2022.",
    avatar: "KB",
    rating: 5,
    metric: "Prix 2026 vs tarifs 2022",
  },
];

const PROJECT_CATEGORIES_DISPLAY = [
  "Maison", "Villa", "Appartement", "Studio", "Duplex", "Immeuble",
  "Résidence touristique", "Local commercial", "Bureau", "Entrepôt", "Projet neuf",
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
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-all hover:bg-surface-container-highest hover:text-foreground active:scale-95"
    >
      <M3Icon name="light_mode" className={`text-[20px] transition-all ${theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"}`} />
      <M3Icon name="dark_mode" className={`absolute text-[20px] transition-all ${theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`} />
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
        mobileOpen
          ? "bg-surface/95 shadow-m3-1 backdrop-blur-xl"
          : scrolled
            ? "glass-strong shadow-m3-1"
            : "bg-transparent"
      }`}
    >
      {/* Bandeau ÉPINGLÉ en haut de la page : `fixed top-0` sur la barre de
          navigation, donc visible même en défilant. Le ✕ le referme pour la
          session, sans rechargement. */}
      <AppDownloadBanner />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="hidden sm:inline-block ml-1 text-xs font-medium text-muted-foreground/60">Tunisia</span>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          <a href="#features" className="rounded-full px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-foreground">Fonctionnalités</a>
          <a href="/dashboard/guide" className="rounded-full px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-foreground">Guide A-Z</a>
          <a href="/dashboard/pricing" className="rounded-full px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-foreground">Tarifs</a>
          <a href="#testimonials" className="rounded-full px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-foreground">Avis</a>
          <a href="/blog" className="rounded-full px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-foreground">Blog</a>
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors active:scale-95 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
          className="border-t border-outline-variant/50 bg-surface-container-low shadow-m3-2 md:hidden"
        >
          <div className="px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Fonctionnalités</a>
            <a href="/dashboard/guide" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Guide Construction A-Z</a>
            <a href="/dashboard/pricing" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Tarifs & abonnements</a>
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
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();
  // Le bandeau épinglé (`h-10`) s'ajoute à la hauteur de la barre de navigation
  // fixe (`h-16`) : le haut de page doit rester entièrement visible.
  const downloadBannerVisible = useAppDownloadBannerVisible();

  return (
    <section
      className={`relative overflow-hidden ${downloadBannerVisible ? "pt-26" : "pt-16"}`}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-background" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      <div className="absolute left-1/2 top-2/3 h-40 w-[560px] -translate-x-1/2 rounded-full bg-tertiary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 w-full">
        <div className="mx-auto max-w-5xl text-center">
          {/* Overline + badge IA (violet) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="mb-4 flex justify-center"
                      >              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-container px-4 py-2 text-[11px] font-semibold text-on-primary-container shadow-sm sm:text-xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-3 w-3" />
              </span>
              Plateforme IA de construction & de rénovation
            </span>
          </motion.div>

          {/* Title — benefit-driven H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
            className="type-display mx-auto max-w-5xl text-balance"
          >
            Votre <span className="gradient-text">copilote IA</span> pour
            construire et rénover.
          </motion.h1>

          {/* Tagline — pill badges with gradient backgrounds */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
          >
            {[
              { icon: Calculator, label: "Estimez", bg: "bg-primary-container", border: "border-primary/15", hover: "hover:bg-primary-container/80 hover:border-primary/30", color: "text-on-primary-container", ring: "ring-primary/20" },
              { icon: Sparkles, label: "Optimisez", bg: "bg-secondary-container", border: "border-secondary/15", hover: "hover:bg-secondary-container/80 hover:border-secondary/30", color: "text-on-secondary-container", ring: "ring-secondary/20" },
              { icon: Building2, label: "Construisez", bg: "bg-tertiary-container", border: "border-tertiary/15", hover: "hover:bg-tertiary-container/80 hover:border-tertiary/30", color: "text-on-tertiary-container", ring: "ring-tertiary/20" },
            ].map((item, i) => (
              <motion.span
                key={item.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.35, ease: "easeOut" }}
                className={`inline-flex items-center gap-2 rounded-full border ${item.bg} ${item.border} ${item.hover} px-4 py-2 text-sm sm:text-[15px] font-semibold tracking-tight transition-all duration-200 cursor-default focus-visible:outline-none focus-visible:ring-2 ${item.ring} ${item.color}`}
              >
                <item.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                {item.label}
              </motion.span>
            ))}
          </motion.div>

          {/* Subtitle — benefit-oriented with structured layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            className="mt-7 max-w-2xl mx-auto"
          >
            <p className="text-base sm:text-lg text-muted-foreground/80 leading-relaxed text-center">
              <span className="font-medium text-foreground/90">Analysez vos projets</span>,
              <span className="text-muted-foreground/60"> </span>
              <span className="font-medium text-foreground/90">optimisez vos coûts</span>,
              <span className="text-muted-foreground/60"> </span>
              <span className="font-medium text-foreground/90">choisissez vos matériaux</span>
              <span className="text-muted-foreground/50"> et </span>
              <span className="font-medium text-foreground/90">prenez de meilleures décisions immobilières</span>
              <span className="text-muted-foreground/50"> grâce à </span>
              <span className="inline-flex items-center gap-1 font-semibold bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                l'IA
              </span>.
            </p>
          </motion.div>

          {/* CTA principal — démarrer son affaire */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="group h-12 gap-2 px-7 text-sm font-semibold sm:px-9 sm:text-base"
              onClick={() => navigate("/auth")}
            >
              <Sparkles className="h-4 w-4" />
              Commencez votre Affaire
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </motion.div>

          {/* Signature hero card — modern glassmorphism dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
            className="relative mt-12 sm:mt-14"
          >
            {/* Glow behind card */}
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/15 via-secondary/5 to-tertiary/15 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-low shadow-m3-3 backdrop-blur-xl">
              {/* Browser chrome bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-muted/20">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-[9px] text-muted-foreground">
                    <HardHat className="h-2.5 w-2.5" />
                    <span>app.batibuild.app / estimation</span>
                  </div>
                </div>
                <div className="w-14" />
              </div>

              {/* Dashboard mockup content */}
              <div className="p-5 sm:p-7">
                {/* Top row: title + badge */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container">
                        <HardHat className="h-4 w-4 text-on-primary-container" />
                      </div>
                      <h3 className="text-sm font-bold tracking-tight">Estimation Maison à Étage</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground ml-10">150 m² · Sousse · Scénario Standard</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-container px-2.5 py-1 text-[9px] font-semibold text-on-primary-container">
                    <Check className="h-2.5 w-2.5" />
                    IA Validé
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Coût total TTC", value: "253 590", unit: "TND", accent: true },
                    { label: "Prix / m²", value: "1 691", unit: "TND" },
                    { label: "Confiance IA", value: "95", unit: "%" },
                    { label: "Durée chantier", value: "6", unit: "mois" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`rounded-xl border p-3 ${
                        stat.accent
                          ? "border-primary/20 bg-primary-container/70"
                          : "border-outline-variant/50 bg-surface-container"
                      }`}
                    >
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-lg sm:text-xl font-black tabular-nums">
                        {stat.value}
                        <span className="text-xs font-semibold text-muted-foreground ml-0.5">{stat.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>

                {/* Cost breakdown mini bars */}
                <div className="rounded-xl border border-border/30 bg-muted/10 p-4 mb-5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-3">Répartition des coûts</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Gros œuvre", pct: 35, color: "bg-primary" },
                      { label: "Second œuvre", pct: 25, color: "bg-secondary" },
                      { label: "Équipements", pct: 22, color: "bg-tertiary" },
                      { label: "Finitions", pct: 18, color: "bg-primary/50" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground w-24 shrink-0">{item.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.pct}%` }}
                            transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${item.color}`}
                          />
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums w-8 text-right">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copilot flow pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { icon: Calculator, label: "Estimer" },
                    { icon: Sparkles, label: "Optimiser" },
                    { icon: Building2, label: "Construire" },
                  ].map((step, i) => (
                    <span
                      key={step.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-3 py-1.5 text-[10px] font-semibold text-foreground/80"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-black">
                        {i + 1}
                      </span>
                      <step.icon className="h-3 w-3 text-muted-foreground" />
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
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
                      ? "border-primary/25 bg-primary-container text-on-primary-container"
                      : "border-outline-variant/70 bg-surface-container-low text-on-surface-variant hover:border-primary/35 hover:text-foreground"
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
                ...(isFeatureEnabled("ai_materials") ? [{ label: "Prix des matériaux", icon: Table2, to: "/dashboard/materials" }] : []),
                { label: "Guide Construction A-Z", icon: ClipboardList, to: "/dashboard/guide" },
                { label: "Espace fournisseur", icon: Store, to: "/dashboard/supplier" },
              ].map((mod: any) => (
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

  const steps = CONSTRUCTION_STEPS;

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
          <p className="label-overline mb-3">Comment ça marche</p>
          <h2 className="type-headline">
            Du croquis au devis en{" "}
            <span className="gradient-text">3 clics</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Importez, laissez l'IA analyser, recevez votre devis détaillé — en moins de 5 minutes.
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
                    <span>app.batibuild.app / nouveau-projet</span>
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

      </div>
    </section>
  );
}

function FeaturesSection() {
  const ref = useRef(null);
  const navigate = useNavigate();
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();
  const visibleFeatures = FEATURES.filter(
    (f) => f.to !== "/dashboard/materials" || isFeatureEnabled("ai_materials")
  );

  return (
    <section id="features" ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-overline mb-3">Votre copilote IA</p>
          <h2 className="type-headline">
            Tout ce dont vous avez besoin pour{' '}
            <span className="gradient-text">construire sereinement</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            8 modules qui couvrent chaque étape : de l'estimation au suivi de chantier, en passant par le choix des matériaux et le guide construction.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleFeatures.map((feature, index) => (
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
                <div className={`absolute inset-0 rounded-[1.75rem] bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
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
          <p className="label-overline mb-3">Ils nous font confiance</p>
          <h2 className="type-headline">
            Des résultats concrets, pas des promesses
          </h2>
          <p className="mt-4 text-muted-foreground">
            Architectes, promoteurs et ingénieurs en Tunisie utilisent batibuild au quotidien.
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
          className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-primary-container p-8 text-center shadow-m3-2 sm:p-12 lg:p-16"
        >
          <div className="dotted-watermark absolute inset-0 opacity-30" />
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-tertiary/20 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-on-primary-container" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-on-primary-container/90">Rejoignez les professionnels tunisiens</span>
            </div>
            <h2 className="type-headline mb-4 text-on-primary-container">
              Votre premier devis est à 5 minutes.
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-on-primary-container/75">
              Importez une photo, un plan ou saisissez vos dimensions. L'IA calcule tout — matériaux, coûts, planning — et vous recevez un devis PDF professionnel.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-12 gap-2 px-8 text-base shadow-m3-2"
                onClick={() => navigate("/auth")}
              >
                <Upload className="h-4 w-4" />
                Commencez maintenant
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" className="mb-4" wordmarkClassName="text-base" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Plateforme IA complète : estimation de construction, prix des matériaux, guide A-Z et fournisseurs — prix actualisés du marché tunisien.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Produit</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a></li>
              <li><a href="/dashboard/guide" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Guide Construction A-Z</a></li>
              {isFeatureEnabled("ai_materials") && <li><a href="/dashboard/materials" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Prix des matériaux</a></li>}
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
        {/* Petite bannière de téléchargement de l'application Android, à côté
            de la mention de copyright pour rester compacte. */}
        <div className="mt-10 pt-6 border-t border-border/50 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <AppDownloadFooterBanner className="w-full sm:w-auto" />
          <div className="text-center text-xs text-muted-foreground sm:text-right">
            &copy; {new Date().getFullYear()} GALISKON PROJECT. Tous droits réservés.
          </div>
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
    title: "batibuild - Votre copilote IA pour construire et rénover",
    description: "Estimez. Optimisez. Construisez. Estimation de construction par IA, assistant de choix des matériaux, guide de construction A-Z et annuaire de fournisseurs — prix actualisés du marché tunisien 2026.",
  });
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />
      <HeroSection />
      <ProjectLifecycleSection />
      <BenefitsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </motion.div>
  );
}
