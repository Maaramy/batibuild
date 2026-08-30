import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useAction } from "convex/react";
import type { InvestmentType } from "@/components/investment/shared";
import { useParams, useNavigate } from "react-router";
import { useState, useMemo, Fragment, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateProjectPdf, REGION_LABELS } from "@/lib/projectPdf";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usePageSEO } from "@/hooks/use-page-seo";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useScreenshotProtection, injectScreenshotProtectionStyles } from "@/hooks/use-screenshot-protection";
import { runBIMEstimation } from "@/convex/bimEngine";

import {
  projectTypeLabel,
  investmentTypeForProject,
  inferFloorsFromCategory,
  normalizeLegacyCategory,
} from "@/convex/projectTypes";
import {
  ArrowLeft, Building2, Calendar, CheckCircle2, Clock, Cpu, Heart,
  Hourglass, Layers, Lightbulb, Loader2, Map, MapPin, Ruler, Shield,
  Target, TrendingUp, TriangleAlert, Users, Globe,
  PiggyBank, Sparkles, Wallet, Gauge,
  ChevronDown, ChevronUp, ChevronsUpDown, Check, CheckCheck, Info,
  Truck, FileText, Paintbrush, Plug, Phone, Building, Mail, Globe as GlobeIcon,
  Percent, ChevronRight, Download,
  Brain, Crown, ArrowUpRight, ArrowDownRight, Minus, CalendarRange,
  LockKeyhole, RefreshCw, BedDouble, Rocket, LayoutGrid,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { SupplierRecommendedCard } from "@/components/SupplierRecommendedCard";

// ─── Constants ──────────────────────────────────────────────────────────────

const REGION_MULTIPLIER: Record<string, number> = {
  tunis: 1.15, ariana: 1.10, ben_arous: 1.10, manouba: 1.05,
  nabeul: 1.05, bizerte: 1.05, sousse: 1.10, monastir: 1.05, mahdia: 1.00,
  sfax: 1.05, gabes: 1.00, medenine: 0.95, tataouine: 0.95,
  gafsa: 0.95, tozeur: 0.95, kebili: 0.95, kairouan: 0.95,
  kasserine: 0.90, sidi_bouzid: 0.90, beja: 0.95, jendouba: 0.90,
  le_kef: 0.90, siliana: 0.90, zaghouan: 0.95,
};

const BIM_COLORS: Record<string, string> = {
  gros_oeuvre: "#3b82f6", second_oeuvre: "#f59e0b", equipements: "#8b5cf6",
  main_oeuvre: "#22c55e", transport: "#84cc16", etudes_imprevus: "#ef4444",
};

const BIM_ICONS: Record<string, any> = {
  gros_oeuvre: Building2, second_oeuvre: Paintbrush, equipements: Plug,
  main_oeuvre: Users, transport: Truck, etudes_imprevus: FileText,
};

const COMPARE_REGIONS = [
  { key: "tunis", name: "Tunis" }, { key: "sousse", name: "Sousse" },
  { key: "sfax", name: "Sfax" }, { key: "nabeul", name: "Nabeul" },
  { key: "kairouan", name: "Kairouan" }, { key: "kasserine", name: "Kasserine" },
];



const CONFIDENCE_STEPS = [
  { min: 80, label: "Fiable", color: "text-emerald-600", bg: "bg-emerald-100", bar: "bg-emerald-500" },
  { min: 60, label: "Moyenne", color: "text-amber-600", bg: "bg-amber-100", bar: "bg-amber-500" },
  { min: 0, label: "Indicative", color: "text-red-500", bg: "bg-red-100", bar: "bg-red-500" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("fr-TN", {
  style: "currency", currency: "TND", maximumFractionDigits: 0,
}).format(n);

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.3 } }),
};

// ─── Components ─────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, badge, children, defaultOpen = true }: {
  icon: any; title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate"
      className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge && <Badge variant="secondary" className="text-[9px]">{badge}</Badge>}
        <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="content" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useQuery(api.projects.getProject, { projectId: id as any });
  usePageSEO({
    title: project ? `Devis ${project.name} - batibuild App` : "Détail du projet - batibuild App",
    description: project ? `Devis estimatif pour ${project.name}. Coût total, matériaux et analyse IA.` : "Consultez le détail de votre projet de construction.",
  });
  const { user: currentUser } = useAuth();
  const allProjects = useQuery(api.projects.getUserProjects, {});
  
  // Calculate project counter: index of current project in all user projects
  const projectCounter = useMemo(() => {
    if (!allProjects || !project) return null;
    const idx = allProjects.findIndex((p: any) => p._id === project._id);
    if (idx === -1) return null;
    return { current: idx + 1, total: allProjects.length };
  }, [allProjects, project]);
  const toggleFav = useMutation(api.projects.toggleFavorite);
  const startAnalysis = useMutation(api.projects.startAnalysis);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);
  const checkDownloadAllowed = useQuery(api.subscriptions.checkDownloadAllowed);
  const consumeDownload = useMutation(api.subscriptions.consumeDownload);
  const generatePredictive = useAction(api.predictive.generatePredictiveInsights);
  const [predictiveLoading, setPredictiveLoading] = useState(false);
  const [predictiveError, setPredictiveError] = useState<string | null>(null);

  const PROGRESS_STEPS = [
    "Préparation des données...",
    "Génération du tableau des matériaux...",
    "Création du PDF...",
    "Téléchargement...",
  ];

  const [analyzing, setAnalyzing] = useState(false);
  const [refreshingQuantitatif, setRefreshingQuantitatif] = useState(false);
  const [openCat, setOpenCat] = useState<string>("__all_expanded");
  const [selectedScenario, setSelectedScenario] = useState<string>("standard");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState("");
  const [exportStep, setExportStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showPdfPicker, setShowPdfPicker] = useState(false);
  const [pdfPickerScenario, setPdfPickerScenario] = useState("standard");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showAllProviders, setShowAllProviders] = useState(false);
  
  // Fetch supplier profile when one is selected
  const selectedProfileId = selectedSupplierId?.startsWith('registered_') 
    ? selectedSupplierId.replace('registered_', '') as any
    : null;
  const selectedProfile = useQuery(
    api.supplierProfiles.getSupplierById,
    selectedProfileId ? { supplierId: selectedProfileId } : 'skip'
  );
  const reportRef = useScreenshotProtection<HTMLDivElement>();

  // Inject screenshot protection CSS once
  useEffect(() => {
    injectScreenshotProtectionStyles();
  }, []);

  // ── Progress steps with icons ──────────────────────────────────
  const PROGRESS_ICONS = ["FileText", "Layers", "File", "Download"];

  // ── Progress helper ──────────────────────────────────────────────────

  const advanceProgress = (step: number) => {
    setExportProgress(Math.round((step / (PROGRESS_STEPS.length - 1)) * 100));
    setExportLabel(PROGRESS_STEPS[step] ?? "");
    setExportStep(Math.min(step, PROGRESS_ICONS.length - 1));
  };

  // ── PDF Export ────────────────────────────────────────────────────────

  const handleDownloadClick = () => {
    if (exporting) return;
    // Quotas removed — always open scenario picker
    setPdfPickerScenario(selectedScenario);
    setShowPdfPicker(true);
  };

  const confirmPdfDownload = () => {
    setShowPdfPicker(false);
    generatePDF(pdfPickerScenario);
  };

  

  const generatePDF = async (scenario: string) => {
    if (!project || !ce || !ai) {
      toast.error("Le rapport n'est pas prêt");
      return;
    }
    // Compute scale factor for the requested scenario
    const sf = (() => {
      if (!scenarios || !scenarios.standard || scenario === "standard") return 1;
      const sel = scenarios[scenario as keyof typeof scenarios];
      return sel ? sel.totalCost / (scenarios.standard.totalCost || 1) : 1;
    })();
    const dqeData = (project as any)?.dqe;
    await generateProjectPdf({
      project,
      ce,
      ai,
      scenarios,
      scenario,
      dqe: dqeData,
      dqeScaleFactor: sf,
      onStart: () => {
        setExporting(true);
      },
      onProgress: advanceProgress,
      onSuccess: () => {
        setShowSuccess(true);
        setExportLabel("Devis prêt !");
      },
      onFinish: () => {
        setExporting(false);
        setShowSuccess(false);
      },
      consumeDownload,
    });
  };

  // ── Memos ───────────────────────────────────────────────────────────────

  const ce = project?.costEstimate;
  const ai = project?.aiAnalysis;
  const done = project?.status === "completed";
  const busy = project?.status === "analyzing" || analyzing;

  // Predictive intelligence module (Pro/Expert only)
  const insights = project?.predictiveInsights;
  const isPremium =
    currentUser?.subscriptionPlan === "pro" ||
    currentUser?.subscriptionPlan === "expert" ||
    currentUser?.role === "admin";

  const handleGeneratePredictive = async () => {
    if (!project || predictiveLoading) return;
    setPredictiveLoading(true);
    setPredictiveError(null);
    try {
      await generatePredictive({ projectId: project._id });
      toast.success("Analyse prédictive générée !");
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la génération de l'analyse";
      const gated = msg.includes("OFFRE_GRATUITE");
      setPredictiveError(
        gated
          ? "Le module Intelligence prédictive est réservé aux abonnements Fournisseur et Expert."
          : msg,
      );
      toast.error(gated ? "Réservé aux abonnements Fournisseur et Expert" : msg);
    } finally {
      setPredictiveLoading(false);
    }
  };

  // ── Recalculer le « Quantitatif détaillé » avec le catalogue officiel 2026 ──
  // Le moteur BIM résout chaque poste matériau vers le catalogue (nom, unité,
  // prix unitaire). Cette action relance l'analyse pour que les projets déjà
  // estimés reprennent les libellés/prix de la dernière liste des prix.
  const refreshQuantitatif = async () => {
    if (!project || refreshingQuantitatif) return;
    setRefreshingQuantitatif(true);
    try {
      await simulateAnalysis({ projectId: project._id });
      toast.success("Quantitatif mis à jour selon le catalogue 2026");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la mise à jour du quantitatif");
    } finally {
      setRefreshingQuantitatif(false);
    }
  };

  const confInfo = useMemo(() => {
    if (!ai) return { pct: 0, info: CONFIDENCE_STEPS[2] };
    const pct = Math.round(ai.confidence * 100);
    return { pct, info: CONFIDENCE_STEPS.find((s) => pct >= s.min) ?? CONFIDENCE_STEPS[2] };
  }, [ai]);

  // Impact du nombre de pièces sur le coût estimé (vs composition standard)
  const roomsImpact = useMemo(() => {
    if (!project || !ce) return null;
    const hasRooms =
      project.bedrooms != null || project.bathrooms != null ||
      project.kitchens != null || project.livingRooms != null || project.garages != null;
    if (!hasRooms) return null;
    const finishLevel = (project as any).finish_level || "standard";
    const surface = project.surface ?? 150;
    // Cohérent avec simulateAnalysis : niveaux déduits du type si non saisis.
    const floors = project.floors ?? inferFloorsFromCategory(project.category);
    const region = project.region ?? "tunis";
    // Anciens slugs supprimés « Maison R+1 » / « Maison R+2 » → maison / villa.
    const category = normalizeLegacyCategory(project.category);
    const withRooms = runBIMEstimation(category, surface, floors, region, finishLevel, {
      bedrooms: project.bedrooms,
      bathrooms: project.bathrooms,
      kitchens: project.kitchens,
      livingRooms: project.livingRooms,
      garages: project.garages,
    });
    const ref = runBIMEstimation(category, surface, floors, region, finishLevel);
    const refTotal = ref.costEstimate.totalCost || 1;
    const diffPct = Math.round(
      ((withRooms.costEstimate.totalCost - refTotal) / refTotal) * 100,
    );
    const parts: string[] = [];
    if (project.bedrooms) parts.push(`${project.bedrooms} ch`);
    if (project.bathrooms) parts.push(`${project.bathrooms} sdb`);
    if (project.kitchens) parts.push(`${project.kitchens} cuis`);
    if (project.livingRooms) parts.push(`${project.livingRooms} salon`);
    if (project.garages) parts.push(`${project.garages} gar`);
    return { parts: parts.join(" · "), diffPct };
  }, [project, ce]);

  const scenarios = ce?.budgetScenarios;

  // Scale factor based on selected scenario vs standard
  const scaleFactor = useMemo(() => {
    if (!scenarios || !scenarios.standard) return 1;
    const sel = scenarios[selectedScenario as keyof typeof scenarios];
    if (!sel || selectedScenario === "standard") return 1;
    return sel.totalCost / scenarios.standard.totalCost;
  }, [scenarios, selectedScenario]);

  // Scaled breakdown for current scenario
  const scaledBreakdown = useMemo(() => {
    if (!ce?.breakdown) return [] as any[];
    if (scaleFactor === 1) return ce.breakdown;
    return ce.breakdown.map((cat: any) => ({
      ...cat,
      estimatedCost: Math.round(cat.estimatedCost * scaleFactor),
      items: cat.items?.map((item: any) => ({
        ...item,
        totalPrice: Math.round(item.totalPrice * scaleFactor),
      })),
    }));
  }, [ce?.breakdown, scaleFactor]);

  // Current total cost for selected scenario
  const currentTotal = useMemo(() => {
    if (!scenarios) return ce?.totalCost || 0;
    const sel = scenarios[selectedScenario as keyof typeof scenarios];
    return sel?.totalCost || ce?.totalCost || 0;
  }, [scenarios, selectedScenario, ce?.totalCost]);

  // Current cost per m²
  const currentCostM2 = useMemo(() => {
    if (!scenarios) return ce?.costPerSquareMeter || 0;
    const sel = scenarios[selectedScenario as keyof typeof scenarios];
    return sel?.costPerM2 || ce?.costPerSquareMeter || 0;
  }, [scenarios, selectedScenario, ce?.costPerSquareMeter]);

  // Main-d'œuvre : 1 lot affiché sur la page de résultat.

  const totalItems = useMemo(
    () => scaledBreakdown?.reduce((s: number, b: any) => s + (b.items?.length || 0), 0) ?? 0,
    [scaledBreakdown],
  );

  // ── Meilleur fournisseur (prix minimum) par désignation du quantitatif ──
  // Résolu en direct depuis les offres fournisseurs (materialOffers) : le nom
  // du fournisseur le moins cher est affiché pour chaque poste matériau.
  const quantitatifNames = useMemo(() => {
    const set = new Set<string>();
    for (const b of scaledBreakdown ?? []) {
      for (const it of b.items ?? []) {
        if (it.name) set.add(it.name);
      }
    }
    return Array.from(set);
  }, [scaledBreakdown]);
  const cheapestSuppliers = useQuery(
    api.marketData.getCheapestSuppliers,
    quantitatifNames.length ? { names: quantitatifNames } : "skip",
  );
  const supplierByItem = useMemo(() => {
    const map: Record<string, any> = {};
    for (const s of cheapestSuppliers ?? []) map[s.name] = s;
    return map;
  }, [cheapestSuppliers]);

  const { rMult, impactPct, baseCost, diff } = useMemo(() => {
    const r = project?.region ? (REGION_MULTIPLIER[project.region] ?? 1) : 1;
    const i = Math.round((r - 1) * 100);
    const total = ce?.totalCost ?? 0;
    const b = total > 0 ? Math.round(total / r) : 0;
    const d = total > 0 ? total - b : 0;
    return { rMult: r, impactPct: i, baseCost: b, diff: d };
  }, [project?.region, ce]);

  // ── Loading / Skeleton ──────────────────────────────────────────────────

  if (!project) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

    </main>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.02] via-background to-background pb-24">
      {/* Sticky Header */}
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-12 sm:h-14">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate("/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/50" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate max-w-[160px] sm:max-w-xs">{project.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {project.surface ? `${project.surface}m² couv.` : "Surface couverte —"}
                {project.surfaceTotale ? ` · ${project.surfaceTotale}m² totale` : ""}
                {project.region ? ` • ${REGION_LABELS[project.region] ?? project.region}` : ""}
                {projectCounter && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10 text-[8px] font-medium">
                    #<span className="tabular-nums">{projectCounter.current}</span>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="tabular-nums">{projectCounter.total}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleDownloadClick} disabled={exporting}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
              title="Télécharger le devis PDF">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </button>
            <button onClick={() => toggleFav({ projectId: project._id })}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all">
              <Heart className={cn("h-4 w-4 transition-all", project.isFavorite && "fill-red-400 text-red-400 scale-110")} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Bottom Navigation Bar ── */}
      {done && (() => {
        const cat = (project.category ?? "") as string;
        const EXPERT_ONLY_TYPES = new Set([
          "renovation_complete", "extension_batiment", "renovation_cuisine",
          "renovation_salle_de_bain", "peinture_interieure", "piscine",
          "restaurant", "cafe", "electricite_complete", "plomberie_complete",
        ]);
        const isExpertOnly = EXPERT_ONLY_TYPES.has(cat);

        const investmentPrefill = (() => {
          const type = investmentTypeForProject(project.category ?? "appartement");
          const ce = project.costEstimate as any;
          const scenarios = ce?.budgetScenarios as Record<string, { totalCost: number }> | undefined;
          const std = scenarios?.standard;
          const scenarioParam = "standard";
          const sel = scenarios?.[scenarioParam] ?? std;
          const region = project.region ?? "";
          const regionLabelMap: Record<string, string> = {
            tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
            nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
            sousse: "Sousse", monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax",
            gabes: "Gabès", medenine: "Médenine", tozeur: "Tozeur", kebili: "Kébili",
            gafsa: "Gafsa", sidi_bouzid: "Sidi Bouzid", kasserine: "Kasserine",
            le_kef: "Le Kef", jendouba: "Jendouba", siliana: "Siliana", tataouine: "Tataouine",
          };
          const projectName = project.name ?? `${regionLabelMap[region] ?? region} — ${project.surface ?? ""} m²`;
          return {
            name: projectName,
            investmentType: type,
            purchasePrice: sel ? Math.round(sel.totalCost) : 0,
            area: project.surface ?? undefined,
            region,
            city: regionLabelMap[region] ?? "",
            quartier: "",
            rentMode: "mensuel" as const,
            rentAmount: 0,
            monthlyRent: 0,
            occupancyRate: 95,
            annualCharges: 0,
            insurance: 0,
            managementFees: 0,
            taxationPct: 10,
            renovationCost: 0,
            financingFees: 0,
            agencyFees: 0,
            furnishingCost: 0,
            acquisitionFeesPct: 6,
            annualAppreciationPct: 5,
            rentGrowthPct: 5,
            inflationPct: 6,
            horizonYears: 10,
          };
        })();

        const investUrl = `/dashboard/investments/analysis`;

        const navActions = isExpertOnly
          ? [
              { icon: <Sparkles className="h-4 w-4" />, label: "Matériaux AI", onClick: () => navigate(`/dashboard/ai-materials?project=${project._id}`), color: "text-emerald-500" },
              { icon: <Users className="h-4 w-4" />, label: "Consulter expert / entreprise", onClick: () => navigate(`/dashboard/professionals-directory?project=${project._id}`), color: "text-amber-500" },
            ]
          : [
              { icon: <Sparkles className="h-4 w-4" />, label: "Matériaux AI", onClick: () => navigate(`/dashboard/ai-materials?project=${project._id}`), color: "text-emerald-500" },
              { icon: <LayoutGrid className="h-4 w-4" />, label: "Plans IA", onClick: () => navigate(`/dashboard/plans/${project._id}`), color: "text-violet-500" },
              { icon: <Rocket className="h-4 w-4" />, label: "Guide A-Z", onClick: () => navigate(`/dashboard/guide?project=${project._id}`), color: "text-cyan-500" },
              { icon: <TrendingUp className="h-4 w-4" />, label: "ROI", onClick: () => navigate(investUrl, { state: { prefill: investmentPrefill, projectId: project._id } }), color: "text-emerald-500" },
              { icon: <Users className="h-4 w-4" />, label: "Expert", onClick: () => navigate(`/dashboard/professionals-directory?project=${project._id}`), color: "text-amber-500" },
            ];
        return <BottomNavBar actions={navActions} />;
      })()}

      {/* ── Export Progress Overlay ── */}
      {exporting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              transition: { type: "spring", stiffness: 350, damping: 22 },
            }}
            className="relative w-[340px] sm:w-[380px] rounded-2xl border bg-card p-7 shadow-2xl overflow-hidden"
          >
            {/* Animated background gradient */}
            <motion.div
              className="absolute inset-0 opacity-[0.04]"
              animate={{
                background: [
                  "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%)",
                  "radial-gradient(circle at 80% 50%, #3b82f6 0%, transparent 50%)",
                  "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative flex flex-col items-center gap-5 text-center">
              {/* Animated icon */}
              <motion.div
                key={exportStep}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-700",
                  showSuccess
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-primary/10 text-primary",
                )}
              >
                {showSuccess ? (
                  <motion.svg
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewBox="0 0 24 24"
                    className="h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M20 6L9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    />
                  </motion.svg>
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <FileText className="h-6 w-6" />
                  </motion.div>
                )}
              </motion.div>

              {/* Title + label */}
              <div>
                <motion.p
                  className="text-sm font-semibold"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {showSuccess ? "Devis prêt !" : "Génération du devis"}
                </motion.p>
                <motion.p
                  key={exportLabel}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] text-muted-foreground mt-1"
                >
                  {showSuccess ? "Téléchargement en cours..." : exportLabel}
                </motion.p>
              </div>

              {/* Animated progress bar */}
              <div className="w-full space-y-2">
                <div className="relative h-2.5 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-colors duration-500",
                      showSuccess ? "bg-emerald-500" : "bg-primary",
                    )}
                    initial={{ width: "0%" }}
                    animate={{ width: `${exportProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  {!showSuccess && (
                    <motion.div
                      className="absolute inset-y-0 left-0 w-8 rounded-full bg-white/30"
                      animate={{ x: ["-20px", "calc(100% + 20px)"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatDelay: 0.5,
                      }}
                      style={{ width: exportProgress > 5 ? "6%" : "0%" }}
                    />
        )}
      </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                    {exportProgress}%
                  </p>
                  {/* Animated dots */}
                  <div className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          exportStep > dot
                            ? "bg-primary"
                            : exportStep === dot
                              ? "bg-primary/60"
                              : "bg-muted-300",
                        )}
                        animate={
                          exportStep === dot
                            ? { scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }
                            : {}
                        }
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-muted-foreground/40">
                {showSuccess
                  ? ""
                  : "Veuillez patienter pendant la génération..."}
              </p>
            </div>            </motion.div>
          </motion.div>
        )}

      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-4">
{/* ── Pending Banner ─────────────────────────────────────────── */}
        {!done && !busy && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-dashed border-amber-300/50 bg-gradient-to-br from-amber-50/80 to-background p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Projet en attente d'analyse</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lancez l'analyse BIM pour obtenir une estimation complète</p>
                </div>
              </div>
              <Button size="sm" className="h-9 w-full sm:w-auto shadow-xs gap-1.5" disabled={analyzing}
                onClick={async () => {
                  setAnalyzing(true);
                  await startAnalysis({ projectId: project._id });
                  await simulateAnalysis({ projectId: project._id });
                  setAnalyzing(false);
                }}>
                {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
                {analyzing ? "Analyse..." : "Lancer l'analyse"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Analyzing Banner ───────────────────────────────────────── */}
        {busy && !done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl border border-blue-200/40 bg-gradient-to-br from-blue-50/60 to-background p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Analyse en cours...</p>
              <p className="text-xs text-muted-foreground">Calcul selon les prix Tunisie 2026</p>
            </div>
          </motion.div>
        )}

        {/* ── REPORT ──────────────────────────────────────────── */}
        {done && ce && ai && (
          <motion.div ref={reportRef} initial="initial" animate="animate" className="space-y-4 bb-protected-content bb-protected-watermark relative">
            {/* ═══ Hero Total ═══ */}
            <motion.div variants={fadeUp} custom={0}
              className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-green-950 shadow-soft-lg">
              <div className="absolute inset-0 dotted-watermark opacity-50" aria-hidden />
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="relative p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <Badge className="rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20 text-[9px] gap-1">
                    <Target className="h-3 w-3" /> Devis Tunisie 2026
                  </Badge>
                  <Badge className="rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20 text-[9px] gap-1">
                    <Shield className="h-3 w-3" /> {confInfo.pct}%
                  </Badge>
                  {roomsImpact && (
                    <Badge className="rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20 text-[9px] gap-1" title={`Composition déclarée : ${roomsImpact.parts} — écart vs composition standard de ${roomsImpact.diffPct >= 0 ? "+" : ""}${roomsImpact.diffPct}%`}>
                      <LayoutGrid className="h-3 w-3" /> {roomsImpact.parts}
                      <span className={cn("font-bold", roomsImpact.diffPct >= 0 ? "text-amber-300" : "text-emerald-300")}>
                        {roomsImpact.diffPct >= 0 ? "+" : ""}{roomsImpact.diffPct}%
                      </span>
                    </Badge>
        )}
      </div>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 mb-1">
                      Coût total estimé TTC
                      {selectedScenario !== "standard" && scenarios && (
                        <span className="ml-1.5 text-white/80">({scenarios[selectedScenario as keyof typeof scenarios]?.label})</span>
                      )}
                    </p>
                    <p className="text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums">
                      {fmt(currentTotal)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {currentCostM2 > 0 && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-[10px] text-white">
                        <Ruler className="h-3 w-3 text-white/70" />
                        <span className="font-semibold">{fmt(currentCostM2)}</span>
                        <span className="text-white/60">/m²</span>
                      </div>
                    )}
                    {ai.estimatedDuration && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-[10px] text-white">
                        <Hourglass className="h-3 w-3 text-white/70" />
                        <span className="font-semibold">{ai.estimatedDuration}</span>
                      </div>
                    )}

                    <button onClick={handleDownloadClick} disabled={exporting}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border",
                        exporting
                          ? "opacity-50 cursor-not-allowed bg-white/10 border-white/15"
                          : "bg-white text-emerald-900 border-white hover:bg-emerald-50 active:scale-95 shadow-lg shadow-black/20"
                      )}>
                      {exporting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Télécharger le devis
                    </button>
                    <button
                      onClick={() => {
                        const type = investmentTypeForProject(project.category ?? "appartement");
                        const ce = project.costEstimate as any;
                        const scenarios = ce?.budgetScenarios as Record<string, { totalCost: number }> | undefined;
                        const sel = scenarios?.standard;
                        const regionLabelMap: Record<string, string> = {
                          tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
                          nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
                          sousse: "Sousse", monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax",
                          gabes: "Gabès", medenine: "Médenine", tozeur: "Tozeur", kebili: "Kébili",
                          gafsa: "Gafsa", sidi_bouzid: "Sidi Bouzid", kasserine: "Kasserine",
                          le_kef: "Le Kef", jendouba: "Jendouba", siliana: "Siliana", tataouine: "Tataouine",
                        };
                        const r = project.region ?? "";
                        navigate(`/dashboard/investments/analysis`, {
                          state: {
                            prefill: {
                              name: project.name ?? `${regionLabelMap[r] ?? r} — ${project.surface ?? ""} m²`,
                              investmentType: type,
                              purchasePrice: sel ? Math.round(sel.totalCost) : 0,
                              area: project.surface ?? undefined,
                              region: r,
                              city: regionLabelMap[r] ?? "",
                              quartier: "",
                              rentMode: "mensuel",
                              rentAmount: 0,
                              monthlyRent: 0,
                              occupancyRate: 95,
                              annualCharges: 0,
                              insurance: 0,
                              managementFees: 0,
                              taxationPct: 10,
                              renovationCost: 0,
                              financingFees: 0,
                              agencyFees: 0,
                              furnishingCost: 0,
                              acquisitionFeesPct: 6,
                              annualAppreciationPct: 5,
                              rentGrowthPct: 5,
                              inflationPct: 6,
                              horizonYears: 10,
                            },
                            projectId: project._id,
                          },
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border bg-emerald-500/20 text-emerald-100 border-emerald-400/30 hover:bg-emerald-500/30 active:scale-95"
                    >
                      <TrendingUp className="h-3 w-3" />
                      Return on Investment
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center gap-2 text-[10px] text-white/80">
                  <Percent className="h-3 w-3 text-amber-300" />
                  <span>{ce.contingencyPercentage}% réservé aux imprévus</span>
                  <span className="font-semibold text-amber-200">({fmt(ce.contingencyBuffer)})</span>
                </div>
              </div>
            </motion.div>

            {/* ═══ Quick Stats ═══ */}
            <motion.div variants={fadeUp} custom={1}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { icon: Building2, label: "Surface couverte", value: project.surface ? `${project.surface} m²` : "Non définie", color: "from-blue-500/10 to-blue-500/5 text-blue-600" },
                { icon: Globe, label: "Région", value: project.region ? (REGION_LABELS[project.region] ?? project.region) : "Non définie", color: "from-rose-500/10 to-rose-500/5 text-rose-600" },
                { icon: Users, label: "Main-d'œuvre", value: "1 lot", color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600" },
                { icon: Clock, label: "Durée estimée", value: ai.estimatedDuration ?? "Non estimée", color: "from-amber-500/10 to-amber-500/5 text-amber-600" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-br from-background to-muted/20 border border-border/30 shadow-xs">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", s.color)}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-muted-foreground/60 leading-tight">{s.label}</p>
                    <p className="text-[11px] sm:text-xs font-semibold truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ═══ Region Impact ═══ */}
            {project.region && (
              <SectionCard icon={Map} title={`Impact région : ${REGION_LABELS[project.region] ?? project.region}`}
                badge={`×${rMult}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", impactPct > 0 ? "bg-amber-100" : "bg-emerald-100")}>
                        <TrendingUp className={cn("h-4 w-4", impactPct > 0 ? "text-amber-600" : "text-emerald-600")} />
                      </div>
                      <p className="text-xs font-semibold">
                        {impactPct > 0 ? `${impactPct}% plus cher` : `${Math.abs(impactPct)}% moins cher`}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Moyenne nationale</span><span className="font-medium">{fmt(baseCost)}</span></div>
                      <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Ajustement</span><span className={cn("font-medium", impactPct > 0 ? "text-amber-600" : "text-emerald-600")}>{impactPct > 0 ? "+" : ""}{fmt(diff)}</span></div>
                      <div className="flex justify-between py-1 mt-1 border-t border-border/20"><span className="font-bold">Total avec région</span><span className="font-bold text-primary">{fmt(ce.totalCost)}</span></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2">Comparatif par région</p>
                    <div className="space-y-1.5">
                      {COMPARE_REGIONS.map((r) => {
                        const rm = REGION_MULTIPLIER[r.key] ?? 1;
                        const rc = Math.round(baseCost * rm);
                        const maxRc = Math.round(baseCost * Math.max(...COMPARE_REGIONS.map((cr) => REGION_MULTIPLIER[cr.key] ?? 1)));
                        const barW = (rc / maxRc) * 100;
                        const sel = r.key === project.region;
                        return (
                          <div key={r.key} className={cn("flex items-center gap-2 px-2 py-1 rounded-md transition-colors", sel && "bg-primary/5")}>
                            <span className={cn("text-[11px] w-16 shrink-0", sel && "font-semibold text-primary")}>{r.name}</span>
                            <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", sel ? "bg-primary" : "bg-primary/20")} style={{ width: `${barW}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground w-[60px] text-right">{fmt(rc)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ═══ Budget Scenarios ═══ */}
            {scenarios && (
              <SectionCard icon={PiggyBank} title="Scénarios budgétaires" badge="cliquez pour appliquer">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["economique", "standard", "premium"] as const).map((key) => {
                    const s = scenarios[key];
                    if (!s) return null;
                    const isActive = key === selectedScenario;
                    const isStd = key === "standard";
                    const Icon = key === "economique" ? Wallet : key === "standard" ? Gauge : Sparkles;
                    return (
                      <button key={key} onClick={() => setSelectedScenario(key)}
                        className={cn("relative rounded-xl border-2 p-4 transition-all text-left w-full",
                          isActive
                            ? "border-primary/50 bg-gradient-to-br from-primary/[0.08] to-background shadow-md ring-1 ring-primary/20 scale-[1.02]"
                            : "border-border/40 bg-card hover:shadow-md hover:border-border/60 active:scale-[0.98]"
                        )}>
                        {isStd && !isActive && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground text-[9px] h-4.5 px-2 shadow">Recommandé</Badge>
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground text-[9px] h-4.5 px-2 shadow ring-1 ring-primary/30">Sélectionné</Badge>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("font-semibold text-sm", isActive && "text-primary")}>{s.label}</span>
                        </div>
                        <p className={cn("text-xl font-extrabold", isActive && "text-primary")}>{fmt(s.totalCost)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(s.costPerM2)} /m²</p>
                        <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <div className={cn("h-full rounded-full", key === "economique" ? "bg-emerald-400" : key === "standard" ? "bg-blue-400" : "bg-violet-400")}
                            style={{ width: `${key === "economique" ? 60 : key === "standard" ? 80 : 100}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* ═══ CTA — Assistant Matériaux IA ═══ */}
            {done && project && (
              <motion.div
                variants={fadeUp}
                custom={6.5}
                className="rounded-xl border border-violet-200/40 bg-gradient-to-r from-violet-500/[0.06] to-background overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Assistant Matériaux IA</p>
                    <p className="text-[11px] text-muted-foreground">
                      Recommandations comparatives (qualité, prix, durabilité, performance) selon votre projet et votre budget.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => navigate(`/dashboard/ai-materials?project=${project._id}`)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Assistant Matériaux IA
                  </Button>
                </div>
              </motion.div>
            )}


            {/* ═══ Quantitatif détaillé — Vue par étapes de construction ═══ */}
            {(() => {
              const dqe = (project as any)?.dqe as any;
              const hasDqeLots = dqe?.lots?.length > 0;
              const flatHasItems = scaledBreakdown?.some((b: any) => b.items?.length);
              if (!hasDqeLots && !flatHasItems) return null;

              // ── Helpers d'affichage ──
              const NATURE_META: Record<string, { label: string; icon: any; color: string }> = {
                materiaux: { label: "Matériaux", icon: Layers, color: "text-blue-600" },
                main_oeuvre: { label: "Main-d'œuvre", icon: Users, color: "text-emerald-600" },
                equipements: { label: "Outillage & Équipements", icon: Plug, color: "text-purple-600" },
                transport: { label: "Transport", icon: Truck, color: "text-amber-600" },
                etudes: { label: "Études & Permis", icon: FileText, color: "text-red-600" },
              };
              const NATURE_ORDER = ["materiaux", "main_oeuvre", "equipements", "transport", "etudes"];
              const LOT_ICONS: Record<string, any> = {
                frais_preliminaires: FileText,
                gros_oeuvre: Building2,
                second_oeuvre: Paintbrush,
                amenagements_exterieurs: Map,
                vrd: Truck,
                depose_demolition: TriangleAlert,
                depose: TriangleAlert,
                maconnerie: Building2,
                revetements: Layers,
                plan_travail: Layers,
                plomberie: Plug,
                electricite: Plug,
                etancheite: Layers,
                carrelage: Layers,
                sanitaires: Plug,
                robinetterie: Plug,
                preparation: Layers,
                peinture: Paintbrush,
                finition: Layers,
                nettoyage: Layers,
                meubles: Layers,
                equipements: Plug,
                ventilation: Plug,
                structure: Building2,
                filtration: Plug,
                amenagements: Map,
                main_oeuvre: Users,
                terrassement: Building2,
                charpente: Building2,
                portes: Layers,
                divers: Truck,
                tableau: Plug,
                cablage: Plug,
                appareillage: Plug,
                eclairage: Layers,
                terre: Plug,
                essais: Layers,
                alimentation: Plug,
                evacuation: Plug,
                chauffe_eau: Plug,
                cuisine_pro: Layers,
                froid: Plug,
                cvc: Plug,
                facade: Layers,
                cloisons: Layers,
                menuiserie: Layers,
                enseignes: Layers,
              };

              // ── Données DQE (lots hiérarchiques) — calés sur le scénario ──
              const dqeLots: any[] = hasDqeLots
                ? dqe.lots.map((lot: any) => ({
                    ...lot,
                    subtotal: Math.round(lot.subtotal * scaleFactor),
                    lines: lot.lines?.map((line: any) => ({
                      ...line,
                      total: Math.round(line.total * scaleFactor),
                      unitPrice: Math.round((line.total * scaleFactor) / Math.max(1, line.quantity) * 100) / 100,
                    })),
                  }))
                : [];
              // Totaux DQE recalculés à partir des lots scalés
              const dqeTotals = dqe?.totals ? {
                materiaux: Math.round(dqe.totals.materiaux * scaleFactor),
                mainOeuvre: Math.round(dqe.totals.mainOeuvre * scaleFactor),
                equipements: Math.round(dqe.totals.equipements * scaleFactor),
                transport: Math.round(dqe.totals.transport * scaleFactor),
                etudes: Math.round(dqe.totals.etudes * scaleFactor),
                total: Math.round(dqe.totals.total * scaleFactor),
                costPerM2: Math.round(dqe.totals.costPerM2 * scaleFactor),
              } : undefined;

              // ── Données BIM (fallback plat) ──
              const flatBreakdown = scaledBreakdown ?? [];

              // Prix moyen par région (référence comparative)
              const avgM2 = (ce as any)?.avgRegionPriceM2 ?? currentCostM2;
              const totalBudg = currentTotal;
              const surfaceTot = project?.surface ? project.surface * (project.floors || 1) : 0;

              return (
                <motion.div variants={fadeUp} custom={7}
                  className="rounded-xl border bg-card shadow-sm overflow-hidden">

                  {/* Header */}
                  <button onClick={() => setOpenCat(openCat ? "" : "__all")}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-sm font-semibold">Quantitatif détaillé</h3>
                      {selectedScenario !== "standard" && scenarios && (
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/30">
                          {scenarios[selectedScenario as keyof typeof scenarios]?.label}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[9px]">
                        {hasDqeLots ? `${dqeLots.length} étapes` : `${totalItems} postes`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span role="button" tabIndex={0}
                        aria-label="Mettre à jour le quantitatif selon le catalogue 2026"
                        title="Mettre à jour le quantitatif selon le catalogue 2026"
                        onClick={(e) => { e.stopPropagation(); refreshQuantitatif(); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); refreshQuantitatif(); } }}
                        className={cn("flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors cursor-pointer", refreshingQuantitatif ? "opacity-60" : "hover:bg-muted/30 hover:text-primary")}
                      >
                        {refreshingQuantitatif ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      </span>
                      {openCat !== "" && (
                        <span onClick={(e) => { e.stopPropagation(); setOpenCat(openCat === "__all_expanded" ? "__all" : "__all_expanded"); }}
                          className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/30 text-muted-foreground transition-colors"
                          title={openCat === "__all_expanded" ? "Tout replier" : "Tout déplier"}>
                          {openCat === "__all_expanded" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </span>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openCat && "rotate-180")} />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {openCat !== "" && (
                      <motion.div key="dqe-table" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="border-t border-border/10">

                          {hasDqeLots ? (
                            /* ══════ VUE HIÉRARCHIQUE DQE (étapes / sous-étapes) ══════ */
                            <div className="divide-y divide-border/10">
                              {dqeLots.map((lot: any) => {
                                const LotIcon = LOT_ICONS[lot.id] || Building2;
                                const isOpen = openCat === lot.name || openCat === "__all_expanded";

                                // Grouper les lignes par nature
                                const byNature: Record<string, any[]> = {};
                                for (const line of lot.lines ?? []) {
                                  const n = line.nature || "materiaux";
                                  if (!byNature[n]) byNature[n] = [];
                                  byNature[n].push(line);
                                }
                                const activeNatures = NATURE_ORDER.filter(n => byNature[n]?.length > 0);

                                return (
                                  <div key={lot.id}>
                                    {/* Ligne de l'étape (lot) */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setOpenCat(isOpen ? "__all" : lot.name); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/10 transition-colors text-left"
                                    >

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-bold text-foreground">{lot.name}</span>
                                          <span className="text-[9px] text-muted-foreground/50">{lot.percent}%</span>
                                        </div>
        
                                      </div>
                                      <span className="text-xs font-bold tabular-nums text-primary shrink-0">{fmt(lot.subtotal)}</span>
                                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground/50 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                                    </button>

                                    {/* Sous-étapes (lignes du lot) */}
                                    {isOpen && (
                                      <div className="bg-muted/5 border-t border-border/5">
                                        {activeNatures.map(nature => {
                                          const meta = NATURE_META[nature];
                                          const lines = byNature[nature];
                                          const natureTotal = lines.reduce((s: number, l: any) => s + (l.total || 0), 0);
                                          return (
                                            <div key={nature}>
                                              {/* Header nature */}
                                              <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/10 border-b border-border/5">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{meta.label}</span>
                                                <span className="text-[10px] text-muted-foreground/50 ml-auto">{fmt(natureTotal)}</span>
                                              </div>
                                              {/* Lignes */}
                                              {lines.map((line: any, idx: number) => (
                                                <div key={idx} className="flex items-start gap-2 px-3 py-1.5 border-b border-border/5 hover:bg-muted/10 transition-colors">
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-medium leading-snug">{line.designation}</p>
                                                    {line.description && (
                                                      <p className="text-[10px] text-muted-foreground/60 leading-snug">{line.description}</p>
                                                    )}
                                                  </div>
                                                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{line.quantity} {line.unit}</span>
                                                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 hidden sm:block">{fmt(line.unitPrice)}</span>
                                                  <span className="text-xs font-semibold tabular-nums shrink-0">{fmt(line.total)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* ══════ FALLBACK : ancien tableau plat BIM ══════ */
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/30">
                                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Matériau / Prestation</th>
                                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Qté</th>
                                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground hidden sm:table-cell">P.U.</th>
                                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Total</th>
                                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground hidden lg:table-cell">Fournisseur</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {flatBreakdown.filter((b: any) => b.items?.length).map((cat: any) => (
                                    <Fragment key={cat.label}>
                                      <tr className="border-b border-border/5 bg-muted/10">
                                        <td colSpan={5} className="py-2 px-3">
                                          <button onClick={(e) => { e.stopPropagation(); setOpenCat(openCat === cat.label ? "__all" : cat.label); }}
                                            className="flex items-center gap-1.5 w-full text-left">
                                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BIM_COLORS[cat.category] ?? "#888" }} />
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                                            <span className="text-[9px] text-muted-foreground/50 ml-auto">{cat.items.length} postes — {fmt(cat.estimatedCost)}</span>
                                            {openCat === cat.label || openCat === "__all_expanded" ? <ChevronUp className="h-3 w-3 text-muted-foreground/50" /> : <ChevronDown className="h-3 w-3 text-muted-foreground/50" />}
                                          </button>
                                        </td>
                                      </tr>
                                      {(openCat === cat.label || openCat === "__all_expanded") && cat.items.map((item: any, i: number) => (
                                        <motion.tr key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                          className="border-b border-border/5 hover:bg-muted/10 transition-colors">
                                          <td className="py-2 px-3 font-medium whitespace-normal break-words min-w-[160px]">{item.name}</td>
                                          <td className="text-right py-2 px-3 font-mono text-muted-foreground">{cat.category === "main_oeuvre" ? "1 lot" : `${item.quantity} ${item.unit}`}</td>
                                          <td className="text-right py-2 px-3 text-muted-foreground font-mono hidden sm:table-cell">{fmt(item.unitPrice)}</td>
                                          <td className="text-right py-2 px-3 font-semibold font-mono">{fmt(item.totalPrice)}</td>
                                          <td className="py-2 px-3 hidden lg:table-cell">
                                            {(() => {
                                              const sup = supplierByItem[item.name];
                                              if (!sup) return <span className="text-muted-foreground/40">—</span>;
                                              const cheaper = sup.minPrice < item.unitPrice;
                                              return (
                                                <div className="flex items-center justify-end gap-1.5"
                                                  title={`${sup.supplier}${sup.governorate ? ` · ${sup.governorate}` : ""} · prix min ${sup.minPrice.toFixed(2)} TND${sup.unit ? "/" + sup.unit : ""}`}>
                                                  <span className="text-[10px] font-medium text-foreground/80">{sup.supplier}</span>
                                                  <span className={cn("text-[9px] font-semibold tabular-nums shrink-0 rounded px-1 py-px", cheaper ? "text-emerald-600 bg-emerald-500/10 border border-emerald-500/20" : "text-muted-foreground/70")}
                                                    title={cheaper ? `Meilleur que le P.U. estimé (${fmt(item.unitPrice)})` : ""}>
                                                    {fmt(sup.minPrice)}
                                                  </span>
                                                </div>
                                              );
                                            })()}
                                          </td>
                                        </motion.tr>
                                      ))}
                                    </Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* ═══ Récapitulatif : Total TTC + Prix moyen par région ═══ */}
                          <div className="border-t border-border/10 bg-muted/5 px-3 py-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Total TTC */}
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                                <div className="flex items-center gap-2 mb-1">
                                  <Wallet className="h-4 w-4 text-primary" />
                                  <span className="text-xs font-bold text-primary">Coût total estimé TTC</span>
                                </div>
                                <p className="text-lg font-black tabular-nums text-primary">{fmt(totalBudg)}</p>
                                {surfaceTot > 0 && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    soit {fmt(currentCostM2)}/m² · {surfaceTot} m² · TVA 19% incluse
                                  </p>
                                )}
                                {/* Ventilation par nature (DQE) */}
                                {dqeTotals && (
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                                    {([
                                      ["materiaux", "Matériaux", dqeTotals.materiaux],
                                      ["main_oeuvre", "Main-d'œuvre", dqeTotals.mainOeuvre],
                                      ["equipements", "Outillage", dqeTotals.equipements],
                                      ["transport", "Transport", dqeTotals.transport],
                                      ["etudes", "Études", dqeTotals.etudes],
                                    ] as const).filter(([, , v]) => v > 0).map(([key, label, val]) => (
                                      <span key={key} className="text-[9px] text-muted-foreground">
                                        {label}: <span className="font-semibold text-foreground/80">{fmt(val)}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Prix moyen par région */}
                              <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                                <div className="flex items-center gap-2 mb-1">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs font-bold text-muted-foreground">Prix moyen par région</span>
                                </div>
                                <p className="text-lg font-black tabular-nums text-foreground">{fmt(avgM2)}<span className="text-xs font-normal text-muted-foreground">/m²</span></p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Moyenne nationale 24 gouvernorats · Base marché Tunisie 2026
                                </p>
                                {project?.region && currentCostM2 !== avgM2 && (
                                  <p className={cn("text-[10px] font-medium mt-1", currentCostM2 > avgM2 ? "text-amber-600" : "text-emerald-600")}>
                                    {currentCostM2 > avgM2 ? "▲" : "▼"} {Math.abs(Math.round((currentCostM2 / avgM2 - 1) * 100))}% vs moyenne nationale ({REGION_LABELS[project.region] ?? project.region})
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })()}
{/* ═══ CTA — Guide construction A-Z ═══ */}
            {done && project && (
              <motion.div
                variants={fadeUp}
                custom={6.7}
                className="rounded-xl border border-cyan-200/40 bg-gradient-to-r from-cyan-500/[0.06] to-background overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
                    <Rocket className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Suivez les démarches de construction de vos projets</p>
                    <p className="text-[11px] text-muted-foreground">
                      Feuille de route personnalisée de A à Z : démarches administratives, budget, planning, chantier et contrôle.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => navigate(`/dashboard/guide?project=${project._id}`)}
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Mon projet de A à Z
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══ Pie + Detail ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <motion.div variants={fadeUp} custom={3} className="lg:col-span-2 rounded-xl border bg-card shadow-sm p-4">
                <h3 className="text-sm font-semibold mb-1">Répartition</h3>
                <p className="text-[10px] text-muted-foreground mb-3">Par catégorie de coût</p>
                <div className="h-[180px] sm:h-[210px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={scaledBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3} dataKey="estimatedCost" nameKey="label">
                        {scaledBreakdown.map((e: any) => <Cell key={e.label} fill={BIM_COLORS[e.category] ?? "#888"} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background/95 backdrop-blur border border-border/40 rounded-lg p-2.5 text-xs shadow-lg">
                            <p className="font-semibold">{d.label}</p>
                            <p className="text-muted-foreground">{fmt(d.estimatedCost)}</p>
                            <p className="text-muted-foreground">{d.percentage}% du total</p>
                          </div>
                        );
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-2 pt-3 border-t border-border/10">
                  {scaledBreakdown.map((item: any) => {
                    const Icon = BIM_ICONS[item.category] ?? Layers;
                    return (
                      <div key={item.label} className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BIM_COLORS[item.category] ?? "#888" }} />
                        <Icon className="h-3 w-3 text-muted-foreground/50 shrink-0 hidden sm:block" />
                        <span className="truncate">{item.label}</span>
                        <span className="font-semibold ml-auto">{item.percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="lg:col-span-3 rounded-xl border bg-card shadow-sm p-4">
                <h3 className="text-sm font-semibold mb-1">Détail par catégorie</h3>
                <p className="text-[10px] text-muted-foreground mb-3">Postes de travaux</p>
                <div className="space-y-3">
                  {[...scaledBreakdown].sort((a: any, b: any) => b.estimatedCost - a.estimatedCost).map((item: any, i: number) => {
                    const Icon = BIM_ICONS[item.category] ?? Layers;
                    const color = BIM_COLORS[item.category] ?? "#888";
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="flex h-5 w-5 items-center justify-center rounded shrink-0" style={{ backgroundColor: color + "18" }}>
                              <Icon className="h-3 w-3" style={{ color }} />
                            </div>
                            <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-bold shrink-0 ml-2">{fmt(item.estimatedCost)} <span className="text-[9px] text-muted-foreground font-normal">({item.percentage}%)</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
                            className="h-full rounded-full" style={{ backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-border/10">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-medium">Imprévus</span>
                    </div>
                    <span className="font-bold">{fmt(Math.round(ce.contingencyBuffer * scaleFactor))}</span>
                  </div>
                  <Progress value={ce.contingencyPercentage} className="h-1.5 bg-amber-500/10 [&>div]:bg-amber-500" />
                </div>
              </motion.div>
            </div>
            {/* ═══ Confidence + Anomalies ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div variants={fadeUp} custom={5} className="rounded-xl border bg-card shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Confiance</h3>
                    <p className="text-[10px] text-muted-foreground">Fiabilité de l'estimation</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-muted/30 border border-border/20">
                  <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold", confInfo.info.bg, confInfo.info.color)}>
                    {confInfo.pct}
                    <span className="text-[9px] ml-0.5">%</span>
                  </div>
                  <div>
                    <p className={cn("text-sm font-bold", confInfo.info.color)}>{confInfo.info.label}</p>
                    <p className="text-[9px] text-muted-foreground">Basée sur {totalItems} postes</p>
                  </div>
                </div>
                <Progress value={confInfo.pct} className={cn("h-1.5", "[&>div]:transition-all", confInfo.info.bar.replace("bg-", "[&>div]:bg-"))} />
                <div className="space-y-1 text-[10px] text-muted-foreground mt-3">
                  {project.surface && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Surface couverte : {project.surface}m²</div>}
                  {project.region && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Région : {REGION_LABELS[project.region]}</div>}
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />{totalItems} postes détaillés</div>
                </div>
              </motion.div>

              {ai.anomalies && ai.anomalies.length > 0 && (
                <motion.div variants={fadeUp} custom={6} className="lg:col-span-2 rounded-xl border-2 border-amber-200/30 bg-gradient-to-br from-amber-50/30 to-background p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <TriangleAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Anomalies détectées</h3>
                      <p className="text-[10px] text-muted-foreground">{ai.anomalies.length} point(s) d'attention</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ai.anomalies.map((a: any, i: number) => {
                      const sevColor = a.severity === "élevée" ? "border-red-200/40 bg-red-50/20" :
                        a.severity === "moyenne" ? "border-amber-200/40 bg-amber-50/20" : "border-yellow-200/40 bg-yellow-50/20";
                      const sevBadge = a.severity === "élevée" ? "border-red-300/40 text-red-600" :
                        a.severity === "moyenne" ? "border-amber-300/40 text-amber-600" : "border-yellow-300/40 text-yellow-600";
                      return (
                        <div key={i} className={cn("flex items-start gap-2.5 p-3 rounded-lg border", sevColor)}>
                          <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-medium">{a.type}</p>
                              <Badge variant="outline" className={cn("text-[8px] h-4 px-1", sevBadge)}>{a.severity}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground/80 mt-0.5">{a.description}</p>
                            {a.recommendation && (
                              <p className="text-[9px] text-muted-foreground/60 mt-1 italic flex items-start gap-1">
                                <ChevronRight className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                                {a.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ═══ Intelligence prédictive (Pro/Expert) ═══ */}
            <motion.div variants={fadeUp} custom={7}>
              {isPremium ? (
                <div className="relative rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-500/[0.06] via-background to-background shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-violet-500/[0.06] border-b border-violet-200/40">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shrink-0">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[15px] font-semibold">Intelligence prédictive</h3>
                        <Badge className="text-[9px] gap-0.5 bg-violet-100 text-violet-600 border-violet-200">
                          <Crown className="h-2.5 w-2.5" /> PRO / EXPERT
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Prévision des prix · périodes d'achat · optimisation du budget</p>
                    </div>
                    {insights && insights.overallSavingsPct > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/[0.1] border border-emerald-200/40 shrink-0" title="Économie potentielle">
                        <PiggyBank className="h-3 w-3 text-emerald-600" />
                        <p className="text-[11px] font-semibold text-emerald-600 tabular-nums leading-none">≈ {insights.overallSavingsPct}%</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    {insights ? (
                      <>
                        {/* Summary */}
                        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-violet-500/[0.04] border border-violet-200/30">
                          <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground leading-snug">{insights.summary}</p>
                        </div>

                        {/* Price predictions */}
                        {insights.pricePredictions?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Prévision des prix des matériaux</p>
                            </div>
                            <div className="space-y-1.5">
                              {insights.pricePredictions.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/10">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-medium truncate">{p.material}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{p.reasoning}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={cn(
                                      "flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                                      p.trend === "hausse" ? "bg-red-50 text-red-600"
                                        : p.trend === "baisse" ? "bg-emerald-50 text-emerald-600"
                                          : "bg-slate-100 text-slate-500",
                                    )}>
                                      {p.trend === "hausse" ? <ArrowUpRight className="h-3 w-3" /> : p.trend === "baisse" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                      {p.predictedChangePct > 0 ? "+" : ""}{p.predictedChangePct}%
                                    </span>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{p.horizon}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Best buying periods */}
                        {insights.bestBuyingPeriods?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <CalendarRange className="h-3.5 w-3.5 text-violet-500" />
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Meilleures périodes d'achat</p>
                            </div>
                            <div className="space-y-1.5">
                              {insights.bestBuyingPeriods.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/10">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-medium truncate">{p.material}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{p.reason}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-violet-600 font-medium bg-violet-50 border border-violet-200/50 px-1.5 py-0.5 rounded-md whitespace-nowrap">{p.period}</span>
                                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">-{p.savingPct}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Budget optimizations + loss reductions */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          {insights.budgetOptimizations?.length > 0 && (
                            <div className="p-3 rounded-lg bg-background border border-border/10">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-600 shrink-0">
                                  <Wallet className="h-3.5 w-3.5" />
                                </div>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Optimisation du budget</p>
                              </div>
                              <div className="space-y-2">
                                {insights.budgetOptimizations.map((o, i) => (
                                  <div key={i} className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-[12px] font-medium">{o.title}</p>
                                      <p className="text-[10px] text-muted-foreground leading-relaxed">{o.description}</p>
                                    </div>
                                    {o.potentialSaving > 0 && (
                                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">-{fmt(o.potentialSaving)}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {insights.lossReductions?.length > 0 && (
                            <div className="p-3 rounded-lg bg-background border border-border/10">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-600 shrink-0">
                                  <Lightbulb className="h-3.5 w-3.5" />
                                </div>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Réduction des pertes</p>
                              </div>
                              <div className="space-y-2">
                                {insights.lossReductions.map((r, i) => (
                                  <div key={i} className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-[12px] font-medium">{r.title}</p>
                                      <p className="text-[10px] text-muted-foreground leading-relaxed">{r.description}</p>
                                    </div>
                                    {r.estimatedSavingPct > 0 && (
                                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">-{r.estimatedSavingPct}%</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border/10">
                          <p className="text-[10px] text-muted-foreground/60">
                            Analyse générée le {new Date(insights.generatedAt).toLocaleDateString("fr-FR")} · Données indicatives basées sur les prix du marché tunisien
                          </p>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2" disabled={predictiveLoading}
                            onClick={handleGeneratePredictive}>
                            {predictiveLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Régénérer l'analyse
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <div className="flex justify-center mb-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                            <Brain className="h-6 w-6 text-violet-600" />
                          </div>
                        </div>
                        <p className="text-[15px] font-semibold">Anticipez l'évolution de votre budget</p>
                        <p className="text-[13px] text-muted-foreground mt-1 max-w-sm mx-auto">
                          L'IA prévoit l'évolution des prix des matériaux, identifie les meilleures périodes d'achat, optimise votre budget et réduit les pertes sur chantier.
                        </p>
                        {predictiveError && (
                          <p className="text-[12px] text-red-500 mt-2">{predictiveError}</p>
                        )}
                        <Button size="sm" className="mt-4 gap-1.5" disabled={predictiveLoading}
                          onClick={handleGeneratePredictive}>
                          {predictiveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {predictiveLoading ? "Analyse en cours..." : "Générer l'analyse prédictive"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Locked teaser for Free users */
                <div className="relative rounded-xl border border-dashed border-violet-300/40 bg-gradient-to-br from-violet-500/[0.03] to-background p-4 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shrink-0">
                      <Brain className="h-4 w-4" />
                    </div>
                    <h3 className="text-[15px] font-semibold">Intelligence prédictive</h3>
                    <Badge className="text-[9px] bg-slate-100 text-slate-500 border-slate-200/60">Start</Badge>
                    <Badge className="text-[9px] gap-0.5 bg-violet-100 text-violet-600 border-violet-200 ml-auto">
                      <Crown className="h-2.5 w-2.5" /> PRO / EXPERT
                    </Badge>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-2 max-w-md">
                    Le module Intelligence prédictive est réservé aux abonnements <strong>Pro</strong> et <strong>Expert</strong>.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {["Prévision des prix", "Meilleures périodes d'achat", "Optimisation du budget", "Réduction des pertes"].map((f) => (
                      <span key={f} className="text-[11px] px-2 py-1 rounded-full bg-violet-500/[0.06] text-violet-600 border border-violet-200/40 flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" /> {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Button size="sm" className="h-8 text-[12px] gap-1.5" onClick={() => navigate("/dashboard/pricing")}>
                      <LockKeyhole className="h-3 w-3" /> Passer à Pro
                    </Button>
                    <span className="text-[11px] text-muted-foreground/60">Débloquez l'analyse prédictive IA</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ═══ Fournisseurs & Prestataires ═══ */}
            {project.providerRecommendations && (
              <div className="col-span-full mb-2">
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-[16px] font-semibold">Prestataires recommandés par l’IA</h3>
                    <Badge variant="secondary" className="text-[11px]">{project.providerRecommendations.stats.total} prestataires</Badge>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[12px] sm:text-[14px] text-primary/80 flex items-start gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{project.providerRecommendations.regionInfo.advice}</span>
                      </p>
                    </div>
                    {(() => {
                      let shown = 0;
                      return ["essentiel", "recommande", "optionnel"].map((priority) => {
                      const items = project.providerRecommendations!.providers.filter((p: any) => p.priority === priority);
                      if (items.length === 0) return null;
                      const visibleCount = showAllProviders ? items.length : Math.max(0, Math.min(items.length, 3 - shown));
                      shown += visibleCount;
                      const cfg = priority === "essentiel"
                        ? { label: "Essentiel", bg: "bg-red-100", txt: "text-red-700", dot: "bg-red-500", iconBg: "bg-red-50", iconTxt: "text-red-600" }
                        : priority === "recommande"
                          ? { label: "Recommandé", bg: "bg-blue-100", txt: "text-blue-700", dot: "bg-blue-500", iconBg: "bg-blue-50", iconTxt: "text-blue-600" }
                          : { label: "Optionnel", bg: "bg-slate-100", txt: "text-slate-600", dot: "bg-slate-400", iconBg: "bg-slate-50", iconTxt: "text-slate-500" };
                      return (
                        <div key={priority}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className={`flex h-4 w-4 items-center justify-center rounded-full ${cfg.bg}`}>
                              <span className={`text-[9px] font-bold ${cfg.txt}`}>{priority === "essentiel" ? "!" : priority === "recommande" ? "i" : "?"}</span>
                            </div>
                            <p className={`text-[12px] font-semibold ${cfg.txt}`}>{cfg.label} ({items.length})</p>
                          </div>
                          <div className="space-y-1">
                            <AnimatePresence initial={false}>
                            {items.slice(0, visibleCount).map((p: any, i: number) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                              >
                              <div className="p-2.5 rounded-lg hover:bg-muted/20 transition-colors border border-border/10">
                                <div className="flex items-start gap-2">
                                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${cfg.iconBg} ${cfg.iconTxt}`}>
                                    <Users className="h-3 w-3" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-[13px] font-medium">{p.label}</span>
                                      <span className={`text-[9px] px-1 py-0.5 rounded-full ${cfg.bg} ${cfg.txt}`}>{p.priority}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.reason}</p>
                                    {p.suppliers && p.suppliers.length > 0 ? (
                                      <div className="mt-2 space-y-2">
                                        {p.suppliers.map((s: any, si: number) => (
                                          <div 
                                            key={si} 
                                            className={`p-2 rounded-lg border transition-all ${s.id && s.id.startsWith('registered_') ? 'cursor-pointer hover:bg-primary/[0.03] hover:border-primary/20 hover:shadow-sm active:scale-[0.99]' : 'bg-background/80 border-border/20'}`}
                                            onClick={s.id && s.id.startsWith('registered_') ? () => { setSelectedSupplierId(s.id); setShowSupplierDialog(true); } : undefined}
                                            role={s.id && s.id.startsWith('registered_') ? 'button' : undefined}
                                            tabIndex={s.id && s.id.startsWith('registered_') ? 0 : undefined}
                                            onKeyDown={s.id && s.id.startsWith('registered_') ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSupplierId(s.id); setShowSupplierDialog(true); } } : undefined}
                                          >
                                            <p className="text-[12px] font-semibold text-foreground leading-tight flex items-center gap-1.5 flex-wrap">
                                                {s.name}
                                                {s.id && s.id.startsWith('registered_') && (
                                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-full shadow-xs">
                                                    <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                      <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    Vérifié
                                                  </span>
                                                )}
                                              </p>
                                            <div className="mt-1 space-y-0.5">
                                              <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                                <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                {s.phone}
                                              </p>
                                              {s.email && (
                                                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                                  {s.email}
                                                </p>
                                              )}
                                              <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                                <span className="truncate">{s.address}</span>
                                              </p>
                                              {s.website && (
                                                <p className="text-[10px] text-blue-600/80 flex items-center gap-1">
                                                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                                  {s.website}
                                                </p>
                                              )}
                                            </div>
                                            {/* Contact button */}
                                            <a
                                              href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}
                                              className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-primary/20 bg-primary/[0.04] px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98] transition-all"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                              </svg>
                                              Contacter
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {p.regionProximity}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              </motion.div>
                            ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {(() => {
                    const total = project.providerRecommendations!.stats.total;
                    if (total <= 3) return null;
                    return (
                      <button
                        onClick={() => setShowAllProviders((v) => !v)}
                        className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 rounded-lg border border-primary/15 bg-primary/[0.03] text-[12px] font-medium text-primary hover:bg-primary/[0.07] hover:border-primary/25 active:scale-[0.99] transition-all"
                      >
                        {showAllProviders ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Voir moins
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Voir plus ({total - 3})
                          </>
                        )}
                      </button>
                    );
                  })()}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ Recommendations ═══ */}
            {/* Fournisseur recommandé pour la catégorie du projet */}
            {ai.category && (
              <div className="mb-2">
                <SupplierRecommendedCard
                  categoryKey={ai.category}
                  categoryLabel={ai.category}
                  materials={[]}
                  projectId={project._id}
                  projectName={ai.category}
                  currentUserId={currentUser?._id as string | undefined}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.optimizationTips && project.optimizationTips.length > 0 && (
                <motion.div variants={fadeUp} custom={8}
                  className="rounded-xl border border-emerald-200/30 bg-gradient-to-br from-emerald-50/20 to-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold">Optimisation</h3>
                  </div>
                  <div className="space-y-1.5">
                    {project.optimizationTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              {project.technicalRecommendations && project.technicalRecommendations.length > 0 && (
                <motion.div variants={fadeUp} custom={9}
                  className="rounded-xl border border-blue-200/30 bg-gradient-to-br from-blue-50/20 to-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold">Recommandations techniques</h3>
                  </div>
                  <div className="space-y-1.5">
                    {project.technicalRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ═══ Project Info ═══ */}

            <SectionCard icon={Info} title="Informations projet">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { label: "Catégorie", value: ai.category, icon: Building2 },
                  { label: "Région", value: project.region ? (REGION_LABELS[project.region] ?? project.region) : "Non définie", icon: MapPin },
                  { label: "Surface couverte", value: project.surface ? `${project.surface} m²` : "Non définie", icon: Ruler },
                  { label: "Étages", value: String(project.floors ?? 1), icon: Building2 },

                  { label: "Créé le", value: new Date(project.createdAt).toLocaleDateString("fr-FR"), icon: Calendar },
                  { label: "Statut", value: "Terminé", icon: CheckCircle2 },
                ].map((info, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/10">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-background/50 text-muted-foreground/60">
                      <info.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] text-muted-foreground/60">{info.label}</p>
                      <p className="text-[10px] font-medium truncate">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {project.description && (
                <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-3 pt-3 border-t border-border/10">{project.description}</p>
              )}
            </SectionCard>

            {/* ══ Contact ══ */}
            <motion.div variants={fadeUp} custom={8}
              className="rounded-xl border bg-card shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Pour plus d'informations contactez :</p>
                  <p className="text-sm font-semibold mt-0.5">Maatougui Seifeddine</p>
                  <p className="text-[11px] text-muted-foreground">Consultant &amp; Directeur régional (SAFI)</p>
                  <a href="mailto:Maatougui.Seifeddine@batibuild.app" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" /> Maatougui.Seifeddine@batibuild.app
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
      {/* ── Supplier Profile Dialog ── */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              {selectedProfile?.companyName || 'Profil fournisseur'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fournisseur inscrit et vérifié sur batibuild App
            </DialogDescription>
          </DialogHeader>
          {selectedProfile ? (
            <div className="space-y-4 pt-2">
              {/* Description */}
              {selectedProfile.description && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedProfile.description}</p>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Coordonnées</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/20">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Téléphone</p>
                      <p className="text-xs font-medium">{selectedProfile.phone}</p>
                    </div>
                  </div>
                  {selectedProfile.email && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/20">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Email</p>
                        <p className="text-xs font-medium">{selectedProfile.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/20">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Adresse</p>
                      <p className="text-xs font-medium">{selectedProfile.address}</p>
                    </div>
                  </div>
                  {selectedProfile.website && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/20">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <GlobeIcon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Site web</p>
                        <p className="text-xs font-medium text-blue-600">{selectedProfile.website}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Spécialités */}
              {selectedProfile.specialtiesLabels && selectedProfile.specialtiesLabels.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Spécialités</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProfile.specialtiesLabels.map((spec: string, idx: number) => (
                      <span key={idx} className="text-[10px] px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => {
                  window.open(`tel:${selectedProfile.phone}`, '_blank');
                }}
              >
                <Phone className="h-3 w-3" />
                Appeler le fournisseur
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Abonnement requis</DialogTitle>
            <DialogDescription className="text-xs">
              Le téléchargement de devis PDF nécessite un abonnement actif.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1 text-xs" onClick={() => { setShowUpgradeDialog(false); navigate("/dashboard/pricing"); }}>
              Voir les offres
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowUpgradeDialog(false)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scenario Picker Dialog for PDF Export */}
      <Dialog open={showPdfPicker} onOpenChange={setShowPdfPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Choisir le scénario du devis</DialogTitle>
            <DialogDescription className="text-xs">
              Sélectionnez le scénario budgétaire pour générer le PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {(["economique", "standard", "premium"] as const).map((key) => {
              const s = scenarios?.[key];
              const labels: Record<string, { label: string; color: string; desc: string }> = {
                economique: { label: "Économique", color: "text-emerald-600", desc: "Coût le plus bas — qualité standard" },
                standard:   { label: "Standard",   color: "text-blue-600",   desc: "Recommandé — meilleur rapport qualité/prix" },
                premium:    { label: "Premium",     color: "text-purple-600", desc: "Haute performance — matériaux premium" },
              };
              const meta = labels[key];
              return (
                <button key={key}
                  onClick={() => setPdfPickerScenario(key)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                    pdfPickerScenario === key
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/50 hover:border-border hover:bg-muted/30"
                  )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-bold", meta.color)}>{meta.label}</span>
                      {s && <span className="text-[9px] text-muted-foreground">{fmt(s.totalCost)} TTC</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{meta.desc}</p>
                  </div>
                  {pdfPickerScenario === key && <CheckCheck className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1 text-xs gap-1.5" onClick={confirmPdfDownload} disabled={exporting}>
              {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Générer le devis PDF
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowPdfPicker(false)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
