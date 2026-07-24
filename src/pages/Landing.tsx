import { motion, useScroll, useTransform } from "framer-motion";
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
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
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

const PRICING_PLANS = [
  {
    name: "Gratuit",
    price: "0",
    period: "TND/mois",
    description: "Pour démarrer avec des projets simples",
    features: [
      "3 projets par mois",
      "Estimation de base",
      "Export PDF",
      "Support email",
    ],
    cta: "Commencer gratuitement",
    popular: false,
    gradient: "from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30",
  },
  {
    name: "Pro",
    price: "49",
    period: "TND/mois",
    description: "Pour les professionnels de la construction",
    features: [
      "Projets illimités",
      "Analyse IA avancée",
      "Export PDF, Excel, CSV",
      "Rapports détaillés",
      "Comparaison de projets",
      "Support prioritaire",
    ],
    cta: "Essayer Pro",
    popular: true,
    gradient: "from-blue-500/10 to-violet-500/10 dark:from-blue-500/20 dark:to-violet-500/20",
  },
  {
    name: "Enterprise",
    price: "149",
    period: "TND/mois",
    description: "Pour les entreprises et bureaux d'études",
    features: [
      "Tout ce qui est inclus dans Pro",
      "Utilisateurs multiples",
      "API dédiée",
      "Intégration personnalisée",
      "Gestion des équipes",
      "Support dédié 24/7",
      "SLA garanti",
    ],
    cta: "Contacter les ventes",
    popular: false,
    gradient: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
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
          <span className="text-lg font-semibold tracking-tight">BuildEase</span>
          <span className="hidden sm:inline-block ml-1 text-xs font-medium text-muted-foreground/60">Tunisia</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
          <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Avis</a>
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
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2">Tarifs</a>
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
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
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

        {/* How it works */}
        <div className="mt-24">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
              Comment ça marche
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              De l'import au rapport en 3 étapes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: Upload, title: "Importez vos documents", desc: "Photo du terrain, plan architectural, image satellite ou croquis. Ou saisissez manuellement les dimensions." },
              { step: "02", icon: Cpu, title: "L'IA analyse", desc: "Reconnaissance automatique du type de projet, détection des dimensions, identification des matériaux." },
              { step: "03", icon: FileText, title: "Recevez votre estimation", desc: "Rapport complet avec coût total, répartition détaillée, planning et recommandations." },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-mono text-primary mb-2 block">{item.step}</span>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
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

function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium">
            Tarifs
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Des offres adaptées à vos besoins
          </h2>
          <p className="mt-4 text-muted-foreground">
            Commencez gratuitement et passez à une offre supérieure quand vous êtes prêt.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`relative flex flex-col rounded-2xl border p-6 lg:p-8 transition-all duration-300 hover:shadow-xl ${
                plan.popular
                  ? "border-primary/30 bg-gradient-to-b from-primary/5 to-background shadow-lg shadow-primary/5 scale-[1.02]"
                  : "border-border/50 bg-background/50 backdrop-blur-sm"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Populaire
                  </Badge>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="ml-1 text-sm text-muted-foreground">/{plan.period}</span>
              </div>
              <ul className="mb-8 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? "default" : "outline"}
                className="w-full h-11 text-sm gap-1"
                onClick={() => navigate("/auth")}
              >
                {plan.cta}
                {plan.popular && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
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
              <span className="text-base font-semibold">BuildEase</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Solution IA pour l'estimation des coûts de construction en Tunisie.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Produit</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a></li>
              <li><a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Tarifs</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Légal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Confidentialité</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Conditions</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} BuildEase Tunisia. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Main Landing Component
// ============================================================================

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />
      <HeroSection />
      <BenefitsSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </motion.div>
  );
}
