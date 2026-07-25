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
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { useState, useMemo, Fragment, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft, Building2, Calendar, CheckCircle2, Clock, Cpu, Heart,
  Hourglass, Layers, Lightbulb, Loader2, Map, MapPin, Ruler, Shield,
  Target, TrendingUp, TriangleAlert, Users, Globe,
  PiggyBank, Sparkles, Wallet, Gauge,
  ChevronDown, ChevronUp, ChevronsUpDown, Check, CheckCheck, Info,
  Truck, FileText, Paintbrush, Plug,
  Percent, ChevronRight, Download,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Constants ──────────────────────────────────────────────────────────────

const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
  jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana", kairouan: "Kairouan",
  kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid", sousse: "Sousse",
  monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès",
  medenine: "Médenine", tataouine: "Tataouine", gafsa: "Gafsa", tozeur: "Tozeur",
  kebili: "Kébili",
};

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
  const { user: currentUser } = useAuth();
  const toggleFav = useMutation(api.projects.toggleFavorite);
  const startAnalysis = useMutation(api.projects.startAnalysis);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);
  const checkDownloadAllowed = useQuery(api.subscriptions.checkDownloadAllowed);
  const consumeDownload = useMutation(api.subscriptions.consumeDownload);

  const PROGRESS_STEPS = [
    "Préparation du rapport...",
    "Correction des couleurs...",
    "Capture de l'écran...",
    "Génération du PDF...",
    "Téléchargement...",
  ];

  const [analyzing, setAnalyzing] = useState(false);
  const [openCat, setOpenCat] = useState<string>("__all_expanded");
  const [selectedScenario, setSelectedScenario] = useState<string>("standard");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // ── Helper: replace oklch() in ALL document stylesheets before html2canvas ──

  const fixOklchInAllStylesheets = async (): Promise<() => void> => {
    const restoreFns: Array<() => void> = [];

    // 1. Fix inline <style> elements — just replace oklch() in textContent
    const styleEls = document.querySelectorAll('style');
    styleEls.forEach((style) => {
      const orig = style.textContent;
      if (orig && orig.includes('oklch(')) {
        style.textContent = orig.replace(/oklch\([^)]+\)/g, '#888888');
        restoreFns.push(() => { style.textContent = orig; });
      }
    });

    // 2. Fix <link rel="stylesheet"> — fetch content, replace, convert to <style>
    const linkEls = document.querySelectorAll('link[rel="stylesheet"]');
    const linkPromises: Array<Promise<void>> = [];

    linkEls.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      const p = (async () => {
        try {
          const res = await fetch(href);
          const cssText = await res.text();
          if (!cssText.includes('oklch(')) return;

          const fixed = cssText.replace(/oklch\([^)]+\)/g, '#888888');
          const style = document.createElement('style');
          style.textContent = fixed;
          link.parentNode?.insertBefore(style, link);
          link.remove();

          restoreFns.push(() => {
            style.remove();
            link.parentNode?.insertBefore(link, style);
          });
        } catch {
          // Can't fetch cross-origin — skip silently
        }
      })();

      linkPromises.push(p);
    });

    await Promise.all(linkPromises);

    return () => {
      for (let i = restoreFns.length - 1; i >= 0; i--) {
        restoreFns[i]();
      }
    };
  };

  // ── Helper: inline computed colors to preserve correct appearance in PDF ──

  const fixColorsBeforeCapture = (root: HTMLElement): (() => void) => {
    const allElements = root.querySelectorAll('*') as any;
    const styleOrigins: Array<{ el: any; orig: string | null }> = [];

    const colorProps: string[] = [
      'color', 'backgroundColor', 'borderTopColor', 'borderRightColor',
      'borderBottomColor', 'borderLeftColor', 'outlineColor',
      'textDecorationColor', 'fill', 'stroke', 'stopColor',
      'borderColor',
    ];

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement;
      const cs = getComputedStyle(el);
      const overrides: string[] = [];

      for (let j = 0; j < colorProps.length; j++) {
        const prop = colorProps[j];
        const value = (cs as any)[prop];
        if (
          value &&
          value !== 'transparent' &&
          value !== 'currentcolor' &&
          value !== 'rgba(0, 0, 0, 0)'
        ) {
          const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          overrides.push(cssProp + ': ' + value + ' !important');
        }
      }

      if (overrides.length > 0) {
        const orig = el.getAttribute('style');
        styleOrigins.push({ el, orig });
        el.setAttribute('style', (orig ? orig + '; ' : '') + overrides.join('; '));
      }
    }

    return () => {
      for (let i = 0; i < styleOrigins.length; i++) {
        const { el, orig } = styleOrigins[i];
        if (orig) el.setAttribute('style', orig);
        else el.removeAttribute('style');
      }
    };
  };

  // ── Progress helper ──────────────────────────────────────────────────

  const advanceProgress = (step: number) => {
    setExportProgress(Math.round((step / (PROGRESS_STEPS.length - 1)) * 100));
    setExportLabel(PROGRESS_STEPS[step] ?? "");
  };

  // ── PDF Export ────────────────────────────────────────────────────────

  const handleDownloadClick = () => {
    if (checkDownloadAllowed?.allowed) {
      setShowPicker(true);
    } else if (checkDownloadAllowed?.reason === "limite_atteinte") {
      toast.error("Vous avez atteint votre limite de 10 téléchargements pour ce mois");
    } else {
      setShowUpgradeDialog(true);
    }
  };

  const generatePDF = async (scenario: string) => {
    if (!reportRef.current || !project) {
      toast.error("Le rapport n'est pas prêt");
      return;
    }

    setShowPicker(false);
    setExporting(true);
    advanceProgress(0);

    const prevScenario = selectedScenario;
    const prevOpenCat = openCat;

    // Force all categories expanded for the PDF
    setOpenCat("__all_expanded");

    // Only switch scenario if different from current
    const scenarioChanged = scenario !== prevScenario;
    if (scenarioChanged) {
      setSelectedScenario(scenario);
    }

    // Wait for React to re-render with new data
    await new Promise((r) => setTimeout(r, 600));

    // Double-check the ref is still attached to the DOM
    if (!reportRef.current || !document.body.contains(reportRef.current)) {
      toast.error("Le rapport n'est plus visible, veuillez réessayer");
      setExporting(false);
      if (scenarioChanged) setSelectedScenario(prevScenario);
      setOpenCat(prevOpenCat);
      return;
    }

    // ── STEP 1: Remove oklch() from ALL document stylesheets ──
    advanceProgress(1);
    const restoreStylesheets = await fixOklchInAllStylesheets();

    // ── STEP 2: Inline computed RGB colors on report elements ──
    const restoreColors = fixColorsBeforeCapture(reportRef.current);

    try {
      // ── STEP 3: Capture screen with html2canvas ──
      advanceProgress(2);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Le canvas généré est vide");
      }

      const imgData = canvas.toDataURL("image/png");
      if (imgData === "data:," || !imgData.startsWith("data:image")) {
        throw new Error("L'image générée est invalide");
      }

      // ── STEP 4: Generate PDF from captured image ──
      advanceProgress(3);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      let position = 0;
      let remainingHeight = pdfHeight;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        remainingHeight -= pageHeight;
      }

      const scenarioLabel =
        scenario === "economique"
          ? "Economique"
          : scenario === "premium"
            ? "Premium"
            : "Standard";

      const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, "_");
      const filename = `Devis-${scenarioLabel}-${safeName}.pdf`;

      advanceProgress(4);
      try {
        pdf.save(filename);
      } catch (saveErr) {
        console.warn("pdf.save() failed, trying blob download:", saveErr);
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = filename;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success(`Devis ${scenarioLabel} téléchargé avec succès`);

      // Consume download for Pro users
      try {
        await consumeDownload();
      } catch {
        // Silently fail — the PDF was already downloaded
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur inconnue lors de la génération du PDF";
      console.error("PDF generation error:", err);
      toast.error(`Échec du téléchargement : ${msg}`);
    } finally {
      // Restore in reverse order
      restoreColors();
      restoreStylesheets();

      if (scenarioChanged) setSelectedScenario(prevScenario);
      setOpenCat(prevOpenCat);
      setExporting(false);
    }
  };

  // ── Memos ───────────────────────────────────────────────────────────────

  const ce = project?.costEstimate;
  const ai = project?.aiAnalysis;
  const done = project?.status === "completed";
  const busy = project?.status === "analyzing" || analyzing;

  const confInfo = useMemo(() => {
    if (!ai) return { pct: 0, info: CONFIDENCE_STEPS[2] };
    const pct = Math.round(ai.confidence * 100);
    return { pct, info: CONFIDENCE_STEPS.find((s) => pct >= s.min) ?? CONFIDENCE_STEPS[2] };
  }, [ai]);

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

  const totalItems = useMemo(
    () => scaledBreakdown?.reduce((s: number, b: any) => s + (b.items?.length || 0), 0) ?? 0,
    [scaledBreakdown],
  );

  const { rMult, impactPct, baseCost, diff } = useMemo(() => {
    const r = project?.region ? (REGION_MULTIPLIER[project.region] ?? 1) : 1;
    const i = Math.round((r - 1) * 100);
    const b = ce ? Math.round(ce.totalCost / r) : 0;
    const d = ce ? ce.totalCost - b : 0;
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
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.02] via-background to-background pb-8">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/60">
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
                {project.surface ? `${project.surface}m²` : "Surface —"}
                {project.region ? ` • ${REGION_LABELS[project.region] ?? project.region}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {done && (
              <>
                <button onClick={handleDownloadClick} disabled={exporting}
                  className={cn("flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all border border-border/30",
                    exporting
                      ? "opacity-50 cursor-not-allowed bg-muted/30"
                      : "hover:bg-primary/10 hover:text-primary hover:border-primary/30 active:scale-95 bg-background"
                  )}>
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Télécharger le devis</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                {/* Scenario picker modal */}
                <Dialog open={showPicker} onOpenChange={setShowPicker}>
                  <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-base">Choisir un scénario</DialogTitle>
                      <DialogDescription className="text-xs">
                        Sélectionnez le scénario budgétaire à exporter en PDF
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 pt-2">
                      {(["economique", "standard", "premium"] as const).map((key) => {
                        const s = scenarios?.[key];
                        if (!s) return null;
                        const icons: Record<string, any> = { economique: Wallet, standard: Gauge, premium: Sparkles };
                        const Icon = icons[key];
                        const colors: Record<string, string> = {
                          economique: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/30 from-emerald-500/10",
                          standard: "border-primary/20 hover:border-primary/40 hover:bg-primary/5 from-primary/10",
                          premium: "border-violet-200 hover:border-violet-400 hover:bg-violet-50/30 from-violet-500/10",
                        };
                        const txtColors: Record<string, string> = {
                          economique: "text-emerald-600",
                          standard: "text-primary",
                          premium: "text-violet-600",
                        };
                        return (
                          <button
                            key={key}
                            onClick={() => generatePDF(key)}
                            className={cn(
                              "w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm active:scale-[0.98] bg-gradient-to-br",
                              colors[key]
                            )}
                          >
                            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", txtColors[key], "from-current/10 to-current/5")}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={cn("font-semibold text-sm", txtColors[key])}>{s.label}</span>
                              <span className="block text-[11px] text-muted-foreground mt-0.5">
                                Total: {fmt(s.totalCost)}
                              </span>
                            </div>
                            <Badge variant="secondary" className={cn("text-[9px] shrink-0", txtColors[key])}>
                              {fmt(s.costPerM2)}/m²
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-center text-[9px] text-muted-foreground/50 pt-1">
                      Le rapport sera généré avec les données du scénario choisi
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Upgrade dialog for Free users */}
                <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                  <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-base">Offre Gratuite</DialogTitle>
                      <DialogDescription className="text-xs">
                        Le téléchargement de devis en PDF est réservé aux abonnés Pro
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                          <Download className="h-7 w-7 text-amber-600" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Passez à l'offre <strong>Pro à 79 TND/mois</strong> pour télécharger vos devis en PDF.
                      </p>
                      <div className="text-xs text-muted-foreground/60 space-y-1 mb-4">
                        <p className="flex items-center justify-center gap-1"><Check className="h-3 w-3 text-emerald-500" />10 téléchargements de devis / mois</p>
                        <p className="flex items-center justify-center gap-1"><Check className="h-3 w-3 text-emerald-500" />Projets illimités</p>
                        <p className="flex items-center justify-center gap-1"><Check className="h-3 w-3 text-emerald-500" />Paiement par virement bancaire</p>
                      </div>
                      <Button className="w-full" onClick={() => { setShowUpgradeDialog(false); navigate("/dashboard/pricing"); }}>
                        Passer à Pro
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <button onClick={() => setShowUpgradeDialog(false)}
                        className="mt-2 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                        Rester gratuit
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <button onClick={() => toggleFav({ projectId: project._id })}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all">
              <Heart className={cn("h-4 w-4 transition-all", project.isFavorite && "fill-red-400 text-red-400 scale-110")} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Export Progress Overlay ── */}
      {exporting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-[320px] sm:w-[360px] rounded-2xl border bg-card p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Spinner className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Génération du devis</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{exportLabel}</p>
              </div>
              <div className="w-full space-y-1.5">
                <Progress value={exportProgress} className="h-2 [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-500" />
                <p className="text-[10px] text-muted-foreground/60 tabular-nums">{exportProgress}%</p>
              </div>
              <p className="text-[9px] text-muted-foreground/40">Veuillez patienter pendant la génération...</p>
            </div>
          </motion.div>
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
          <motion.div ref={reportRef} initial="initial" animate="animate" className="space-y-4">
            {/* ═══ Hero Total ═══ */}
            <motion.div variants={fadeUp} custom={0}
              className="rounded-2xl bg-gradient-to-br from-primary/[0.05] via-background to-background border border-primary/10 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] gap-1">
                    <Target className="h-3 w-3" /> Devis Tunisie 2026
                  </Badge>
                  <Badge variant="outline" className={cn("text-[9px] gap-1", confInfo.info.color, "border-current/20")}>
                    <Shield className="h-3 w-3" /> {confInfo.pct}%
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-0.5">
                      Coût total estimé TTC
                      {selectedScenario !== "standard" && scenarios && (
                        <span className="ml-1.5 text-primary">({scenarios[selectedScenario as keyof typeof scenarios]?.label})</span>
                      )}
                    </p>
                    <p className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                      {fmt(currentTotal)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {currentCostM2 > 0 && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/30 text-[10px]">
                        <Ruler className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold">{fmt(currentCostM2)}</span>
                        <span className="text-muted-foreground">/m²</span>
                      </div>
                    )}
                    {ai.estimatedDuration && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/30 text-[10px]">
                        <Hourglass className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold">{ai.estimatedDuration}</span>
                      </div>
                    )}
                    <button onClick={handleDownloadClick} disabled={exporting}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border",
                        exporting
                          ? "opacity-50 cursor-not-allowed bg-muted/30 border-border/20"
                          : "bg-primary text-primary-foreground border-primary hover:bg-primary/90 active:scale-95 shadow-xs"
                      )}>
                      {exporting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Télécharger le devis
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/20 flex flex-wrap items-center gap-2 text-[10px]">
                  <Percent className="h-3 w-3 text-amber-500" />
                  <span className="text-muted-foreground">{ce.contingencyPercentage}% réservé aux imprévus</span>
                  <span className="font-semibold text-amber-600">({fmt(ce.contingencyBuffer)})</span>
                </div>
              </div>
            </motion.div>

            {/* ═══ Quick Stats ═══ */}
            <motion.div variants={fadeUp} custom={1}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { icon: Building2, label: "Surface", value: project.surface ? `${project.surface} m²` : "Non définie", color: "from-blue-500/10 to-blue-500/5 text-blue-600" },
                { icon: Globe, label: "Région", value: project.region ? (REGION_LABELS[project.region] ?? project.region) : "Non définie", color: "from-rose-500/10 to-rose-500/5 text-rose-600" },
                { icon: Users, label: "Main-d'œuvre", value: ai.laborEstimate ? `${ai.laborEstimate.totalWorkers ?? "?"} ouvriers` : "Non estimée", color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600" },
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

            {/* ═══ Materials Table ═══ */}
            {scaledBreakdown?.some((b: any) => b.items?.length) && (
              <motion.div variants={fadeUp} custom={7}
                className="rounded-xl border bg-card shadow-sm overflow-hidden">                  <button onClick={() => setOpenCat(openCat ? "" : "__all")}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors">
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
                    <Badge variant="secondary" className="text-[9px]">{totalItems} postes</Badge>
                  </div>
                  <div className="flex items-center gap-1">
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
                    <motion.div key="table" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="overflow-x-auto border-t border-border/10">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/30">
                              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Matériau / Prestation</th>
                              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Qté</th>
                              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground hidden sm:table-cell">P.U.</th>
                              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scaledBreakdown.filter((b: any) => b.items?.length).map((cat: any) => (
                              <Fragment key={cat.label}>
                                <tr className="border-b border-border/5 bg-muted/10">
                                  <td colSpan={4} className="py-2 px-3">
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
                                  <motion.tr key={i}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="border-b border-border/5 hover:bg-muted/10 transition-colors">
                                    <td className="py-2 px-3 font-medium truncate max-w-[140px] sm:max-w-none">{item.name}</td>
                                    <td className="text-right py-2 px-3 font-mono text-muted-foreground">{item.quantity} {item.unit}</td>
                                    <td className="text-right py-2 px-3 text-muted-foreground font-mono hidden sm:table-cell">{fmt(item.unitPrice)}</td>
                                    <td className="text-right py-2 px-3 font-semibold font-mono">{fmt(item.totalPrice)}</td>
                                  </motion.tr>
                                ))}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                  {project.surface && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Surface : {project.surface}m²</div>}
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

            {/* ═══ Recommendations ═══ */}
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
                  { label: "Surface", value: project.surface ? `${project.surface} m²` : "Non définie", icon: Ruler },
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
          </motion.div>
        )}
      </div>
    </main>
  );
}
