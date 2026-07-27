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
// Demo Modal — Animated Estimation Simulation
// ============================================================================

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setProgress(0);
    }
  }, [open]);

  // Auto-advance animation
  useEffect(() => {
    if (!open) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setStep((s) => Math.min(s + 1, 3));
          return 0;
        }
        return p + 2;
      });
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, step]);

  const handleRestart = () => {
    setStep(0);
    setProgress(0);
  };

  const navigate = useNavigate();

  const steps = [
    {
      icon: Upload,
      title: "Import",
      label: "Import de votre projet",
      desc: "L'utilisateur importe une photo, un plan ou saisit les dimensions",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-200/50 dark:border-blue-800/30",
    },
    {
      icon: Cpu,
      title: "Analyse IA",
      label: "Analyse intelligente",
      desc: "L'IA reconnaît le type de projet, calcule les surfaces et identifie les matériaux",
      color: "from-violet-500 to-purple-500",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-200/50 dark:border-violet-800/30",
    },
    {
      icon: Calculator,
      title: "Calcul",
      label: "Calcul des coûts",
      desc: "Estimation basée sur les prix actualisés du marché tunisien 2026",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
    },
    {
      icon: FileText,
      title: "Rapport",
      label: "Rapport complet",
      desc: "Devis détaillé, quantitatif, scénarios budgétaires et recommandations",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-200/50 dark:border-amber-800/30",
    },
  ];

  const currentStep = steps[step] || steps[0];
  const StepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/30 bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/30 bg-background/90 backdrop-blur-md px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Démonstration de l'estimation</h3>
                  <p className="text-xs text-muted-foreground">Simulation en direct du processus d'estimation IA</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Timeline steps */}
              <div className="flex items-center gap-2">
                {steps.map((s, i) => {
                  const SIcon = s.icon;
                  const isActive = i === step;
                  const isDone = i < step;
                  return (
                    <div key={s.title} className="flex-1 flex flex-col items-center gap-1.5">
                      <div
                        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all duration-300 ${
                          isDone
                            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"
                            : isActive
                            ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20"
                            : "border-border/50 bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <SIcon className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium leading-tight text-center ${
                          isActive ? "text-primary" : isDone ? "text-emerald-600" : "text-muted-foreground"
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Main demo content */}
              <div
                className={`relative overflow-hidden rounded-xl border ${currentStep.borderColor} ${currentStep.bgColor} p-5 sm:p-6 min-h-[280px]`}
              >
                {/* Background decoration */}
                <div
                  className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${currentStep.color} opacity-5 blur-3xl`}
                />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="relative"
                  >
                    {/* Step header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${currentStep.color} text-white shadow-lg`}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{currentStep.label}</h4>
                        <p className="text-xs text-muted-foreground">{currentStep.desc}</p>
                      </div>
                      <div className="ml-auto">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r ${currentStep.color} text-white`}
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
                          {step === 0
                            ? "Importation..."
                            : step === 1
                            ? "Analyse..."
                            : step === 2
                            ? "Calcul..."
                            : "Finalisation"}
                        </div>
                      </div>
                    </div>

                    {/* Animated step content */}
                    {step === 0 && <ImportStepContent progress={progress} />}
                    {step === 1 && <AnalysisStepContent progress={progress} />}
                    {step === 2 && <CalculationStepContent progress={progress} />}
                    {step === 3 && <ReportStepContent progress={progress} />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {step < 3 ? `Étape ${step + 1} sur 4` : "Terminé !"}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {step < 3 ? `${Math.round(progress)}%` : "100%"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${currentStep.color}`}
                    style={{ width: step < 3 ? `${progress}%` : "100%" }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <button
                  onClick={handleRestart}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Play className="h-3 w-3" />
                  Revoir la démo
                </button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={onClose}
                  >
                    Fermer
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-8 gap-1"
                    onClick={() => {
                      onClose();
                      navigate("/auth");
                    }}
                  >
                    Essayer maintenant
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Step sub-content components ── */

function ImportStepContent({ progress }: { progress: number }) {
  const showed = progress > 20;
  const filled = progress > 60;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Upload, label: "Photo terrain", done: showed },
          { icon: MapPin, label: "Image satellite", done: showed },
          { icon: FileText, label: "Plan PDF", done: filled },
        ].map((item, i) => {
          const I = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: item.done ? 1 : 0.3, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all duration-300 ${
                item.done
                  ? "border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-border/30 opacity-40"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  item.done ? "bg-blue-500/20 text-blue-600" : "bg-muted text-muted-foreground"
                }`}
              >
                <I className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.done && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-[10px] text-emerald-600"
                >
                  <Check className="h-3 w-3" />
                  Importé
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {showed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-lg border border-border/30 bg-background/60 p-3"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Ruler className="h-3.5 w-3.5 text-blue-500" />
            <span>Dimensions détectées :</span>
            <span className="font-medium text-foreground">150 m²</span>
            <span className="text-border">|</span>
            <span>Type :</span>
            <span className="font-medium text-foreground">Maison individuelle</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function AnalysisStepContent({ progress }: { progress: number }) {
  const items = [
    { label: "Reconnaissance du type de projet", done: progress > 20, icon: Building2 },
    { label: "Calcul de la surface construite", done: progress > 40, icon: Ruler },
    { label: "Identification des matériaux", done: progress > 60, icon: Layers },
    { label: "Analyse des contraintes", done: progress > 80, icon: Search },
  ];
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const I = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: item.done ? 1 : 0.4, x: 0 }}
            transition={{ delay: 0 }}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-500 ${
              item.done
                ? "border-violet-200/50 dark:border-violet-800/30 bg-violet-50/50 dark:bg-violet-950/20"
                : "border-border/20"
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                item.done ? "bg-violet-500/20 text-violet-600" : "bg-muted text-muted-foreground"
              }`}
            >
              {item.done ? <Check className="h-3.5 w-3.5" /> : <I className="h-3.5 w-3.5" />}
            </div>
            <span className="text-xs font-medium flex-1">{item.label}</span>
            {item.done && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-semibold text-emerald-600"
              >
                ✓
              </motion.span>
            )}
          </motion.div>
        );
      })}

      {progress > 50 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-violet-200/50 dark:border-violet-800/30 bg-violet-500/5 p-3"
        >
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-muted-foreground">IA : </span>
            <span className="font-medium text-foreground">Projet détecté : Maison R+1 à Tunis</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CalculationStepContent({ progress }: { progress: number }) {
  const categories = [
    { label: "Gros œuvre", pct: 38, amount: "96 360", color: "bg-blue-500", done: progress > 20 },
    { label: "Second œuvre", pct: 29, amount: "73 540", color: "bg-violet-500", done: progress > 35 },
    { label: "Équipements", pct: 15, amount: "38 040", color: "bg-emerald-500", done: progress > 50 },
    { label: "Main-d'œuvre", pct: 10, amount: "25 360", color: "bg-amber-500", done: progress > 65 },
    { label: "Transport", pct: 3, amount: "7 610", color: "bg-rose-500", done: progress > 80 },
    { label: "Études & imprévus", pct: 5, amount: "12 680", color: "bg-orange-500", done: progress > 90 },
  ];

  return (
    <div className="space-y-2.5">
      {/* Total animated */}
      {progress > 10 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-800/30 p-3 text-center"
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Coût total estimé</span>
          <div className="text-2xl font-bold gradient-text mt-0.5">
            {progress < 30 ? "Calcul..." : "253 590 TND"}
          </div>
          <span className="text-[10px] text-muted-foreground">Marché tunisien 2026 • Prix TTC</span>
        </motion.div>
      )}

      {/* Category breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => (
          <motion.div
            key={cat.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: cat.done ? 1 : 0.2, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 rounded-lg border border-border/20 px-3 py-2"
          >
            <div className={`h-2 w-2 rounded-full ${cat.color}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium truncate">{cat.label}</div>
              <div className="text-[10px] text-muted-foreground">{cat.pct}%</div>
            </div>
            {cat.done && (
              <span className="text-[11px] font-semibold">{cat.amount} TND</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ReportStepContent({ progress: _p }: { progress: number }) {
  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/50 dark:border-amber-800/30 p-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Rapport prêt</div>
          <div className="text-lg font-bold gradient-text">Devis estimatif complet</div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span>✓ 53 postes détaillés</span>
            <span>✓ 3 scénarios budgétaires</span>
            <span>✓ Recommandations</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Coût total", value: "253 590 TND", icon: DollarSign, done: true },
          { label: "Surface", value: "150 m²", icon: Ruler, done: true },
          { label: "Prix/m²", value: "1 691 TND", icon: TrendingUp, done: true },
          { label: "Durée", value: "4-6 mois", icon: CalendarDaysAlt, done: true },
        ].map((item) => {
          const I = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border/20 bg-background/60 p-2.5 text-center"
            >
              <I className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground">{item.label}</div>
              <div className="text-xs font-semibold">{item.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Scenarios */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2"
      >
        {[
          { label: "Économique", value: "163 590 TND", active: false },
          { label: "Standard", value: "253 590 TND", active: true },
          { label: "Premium", value: "398 475 TND", active: false },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex-1 rounded-lg border p-2 text-center transition-all ${
              s.active
                ? "border-primary bg-primary/5"
                : "border-border/20 bg-background/40 opacity-70"
            }`}
          >
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className={`text-xs font-semibold ${s.active ? "text-primary" : ""}`}>
              {s.value}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Download buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-2"
      >
        {[
          { icon: FileText, label: "Télécharger PDF" },
          { icon: Download, label: "Export Excel" },
        ].map((btn) => {
          const BIcon = btn.icon;
          return (
            <div
              key={btn.label}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground cursor-default"
            >
              <BIcon className="h-3.5 w-3.5" />
              {btn.label}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

const CalendarDaysAlt = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

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

function HeroSection({ onShowDemo }: { onShowDemo: () => void }) {
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
              className="h-12 px-8 text-base w-full sm:w-auto gap-2"
              onClick={onShowDemo}
            >
              <Play className="h-4 w-4" />
              Voir la démo
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="h-12 px-6 text-base w-full sm:w-auto text-muted-foreground hover:text-foreground"
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
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Confidentialité</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Conditions</a></li>
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
  const [showDemo, setShowDemo] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DemoModal open={showDemo} onClose={() => setShowDemo(false)} />
      <Navbar />
      <HeroSection onShowDemo={() => setShowDemo(true)} />
      <BenefitsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </motion.div>
  );
}
