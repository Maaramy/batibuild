import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Building2, Home, Landmark, Store, Warehouse,
  Briefcase, Building, Layers, DoorOpen, Box, LayoutGrid, Sparkles,
  Loader2, FileArchive, RefreshCw, Save, Trophy,
  Ruler, MapPin, Palette, Check, ChevronRight, Crown, Gauge, PenLine,
  BedDouble, Bath, Armchair, Utensils, CookingPot, Car, Trees, Waves,
  Shirt, Briefcase as BriefcaseIcon, Wrench, PencilRuler, HardHat,
  Info, ChevronDown, FileText, ClipboardList, LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BIEN_TYPES, STYLE_LABELS, generatePlans, regenerateVariant,
  bienTypeLabel, type PlanRequest, type GeneratedPlan,
} from "@/convex/planEngine";
import { runBIMEstimation } from "@/convex/bimEngine";
import { FloorPlan2D } from "@/components/plans/FloorPlanView";
import { PlanCompareModal } from "@/components/plans/PlanCompareModal";
import { PlanEditModal } from "@/components/plans/PlanEditModal";
import { PlanSheetModal } from "@/components/plans/PlanSheetModal";
import { PlanOptimizeModal } from "@/components/plans/PlanOptimizeModal";
import { exportPlanPdf, exportAllPlansZip } from "@/lib/planExport";
import { usePageSEO } from "@/hooks/use-page-seo";

// ============================================================================
// Générateur de plans architecturaux par IA — parcours guidé
// Design unifié avec « Nouveau projet » (estimation) et « Investissement ».
// ============================================================================

const STEPS = [
  { key: "bien", label: "Type de bien", desc: "Choisissez le type de projet" },
  { key: "surface", label: "Surfaces", desc: "Dimensions & niveaux" },
  { key: "pieces", label: "Pièces", desc: "Composition intérieure" },
  { key: "exterieur", label: "Extérieurs", desc: "Garage, terrasse, jardin…" },
  { key: "style", label: "Style & contraintes", desc: "Standing, style, exigences" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

// Légende des abréviations affichées sur les plans
const PLAN_LEGEND: { abbr: string; label: string }[] = [
  { abbr: "S", label: "Salon" },
  { abbr: "SàM", label: "Salle à manger" },
  { abbr: "Cui", label: "Cuisine" },
  { abbr: "Ch", label: "Chambre" },
  { abbr: "Ch. prin.", label: "Chambre principale" },
  { abbr: "SDB", label: "Salle de bain" },
  { abbr: "WC", label: "WC" },
  { abbr: "Buan", label: "Buanderie" },
  { abbr: "Séch", label: "Espace séchage" },
  { abbr: "Bur", label: "Bureau" },
  { abbr: "Loc. tech", label: "Local technique" },
  { abbr: "Esc", label: "Escalier" },
  { abbr: "Circ", label: "Circulation / entrée" },
  { abbr: "Gar.", label: "Garage" },
  { abbr: "Park.", label: "Parking" },
  { abbr: "Ter.", label: "Terrasse" },
  { abbr: "Balc.", label: "Balcon" },
  { abbr: "Jard.", label: "Jardin" },
  { abbr: "Pisc.", label: "Piscine" },
  { abbr: "N", label: "Nord (boussole)" },
];

const DEFAULT_REQUEST: PlanRequest = {
  bienType: "maison",
  surfaceTotale: 400,
  surfaceCouverte: 150,
  floors: 1,
  bedrooms: 3,
  bathrooms: 2,
  wcs: 1,
  hasSalon: true,
  hasSalleAManger: true,
  hasCuisine: true,
  hasBuanderie: true,
  hasDressing: true,
  hasBureau: true,
  hasLocalTechnique: false,
  hasGarage: true,
  hasParking: false,
  hasTerrasse: true,
  hasBalcon: false,
  hasJardin: true,
  hasPiscine: false,
  orientation: "sud",
  entreePosition: "sud",
  facades: 2,
  standing: "standard",
  style: "moderne",
};

const BIEN_ICONS: Record<string, LucideIcon> = {
  maison: Home, villa: Landmark, appartement: Building2, studio: DoorOpen,
  duplex: Layers, immeuble: Building2, local_commercial: Store,
  bureau: Briefcase, entrepot: Warehouse, residence_touristique: Building,
  projet_neuf: HardHat,
};

const ROOM_TOGGLES = [
  { key: "hasSalon", label: "Salon", icon: Armchair },
  { key: "hasSalleAManger", label: "Salle à manger", icon: Utensils },
  { key: "hasCuisine", label: "Cuisine", icon: CookingPot },
  { key: "hasBuanderie", label: "Buanderie", icon: Wrench },
  { key: "hasDressing", label: "Espace séchage", icon: Shirt },
  { key: "hasBureau", label: "Bureau", icon: BriefcaseIcon },
  { key: "hasLocalTechnique", label: "Local technique", icon: PencilRuler },
] as const;

const EXT_TOGGLES = [
  { key: "hasGarage", label: "Garage", icon: Car },
  { key: "hasParking", label: "Parking", icon: Car },
  { key: "hasTerrasse", label: "Terrasse", icon: Trees },
  { key: "hasBalcon", label: "Balcon", icon: DoorOpen },
  { key: "hasJardin", label: "Jardin", icon: Trees },
  { key: "hasPiscine", label: "Piscine", icon: Waves },
] as const;

const COUNT_FIELDS = [
  { key: "bedrooms", label: "Chambres", icon: BedDouble, min: 1, max: 10, hint: "Nombre de chambres" },
  { key: "bathrooms", label: "Salles de bain", icon: Bath, min: 1, max: 6, hint: "SDB" },
  { key: "wcs", label: "WC", icon: Bath, min: 0, max: 6, hint: "WC séparés" },
] as const;

const STANDINGS = [
  { value: "economique", label: "Économique", desc: "Optimisation du budget", icon: Box },
  { value: "standard", label: "Standard", desc: "Bon compromis", icon: LayoutGrid },
  { value: "premium", label: "Premium", desc: "Finitions haut de gamme", icon: Crown },
] as const;

/** Mapping bienType → catégorie moteur BIM pour l'estimation de coût. */
function bimCategoryFor(bienType: string): string {
  const map: Record<string, string> = {
    maison: "maison", villa: "villa", appartement: "appartement",
    studio: "studio", duplex: "duplex", immeuble: "immeuble",
    local_commercial: "local_commercial", bureau: "bureau",
    entrepot: "entrepot", residence_touristique: "residence_touristique",
    projet_neuf: "projet_neuf",
  };
  return map[bienType] ?? "maison";
}

// ─── Stepper vertical (design unifié « Nouveau projet ») ─────────────────────

function VerticalStepper({ current, onSelect }: { current: StepKey; onSelect: (k: StepKey) => void }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <nav className="flex flex-col gap-0" aria-label="Progression du plan">
      {STEPS.map((st, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={st.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={() => (done || active) && onSelect(st.key)}
                disabled={!done && !active}
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                  done && "border-emerald-500 bg-emerald-500 cursor-pointer hover:shadow-md hover:shadow-emerald-500/20",
                  active && "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20",
                  !done && !active && "border-muted-foreground/25 bg-muted/10 text-muted-foreground/40",
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : active ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="h-2.5 w-2.5 rounded-full bg-primary"
                  />
                ) : (
                  <span className="text-[10px] font-semibold">{i + 1}</span>
                )}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("w-0.5 h-10 sm:h-12 transition-colors duration-500", done ? "bg-emerald-400" : "bg-border/40")} />
              )}
            </div>
            <div
              className={cn(
                "flex flex-col justify-start pb-6 sm:pb-7 transition-all duration-300 min-w-0",
                active && "translate-x-0",
                !done && !active && "opacity-40",
                done && "opacity-70 hover:opacity-100 cursor-pointer",
              )}
              onClick={() => (done || active) && onSelect(st.key)}
            >
              <span
                className={cn(
                  "text-xs sm:text-sm font-semibold leading-tight transition-colors",
                  done && "text-emerald-600",
                  active && "text-foreground",
                  !done && !active && "text-muted-foreground/60",
                )}
              >
                {st.label}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground/60 mt-0.5 leading-tight">
                {active ? st.desc : done ? "Terminé" : "À venir"}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ─── Légende des abréviations ────────────────────────────────────────────────

function PlanLegend() {
  return (
    <details className="group rounded-xl border border-border/40 bg-card/40 px-4 py-3">
      <summary className="cursor-pointer flex items-center gap-2 text-xs font-semibold list-none select-none">
        <Info className="h-3.5 w-3.5 text-primary shrink-0" />
        Légende des abréviations du plan
        <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PLAN_LEGEND.map((l) => (
          <span
            key={l.abbr}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/60 px-2.5 py-1 text-[10px]"
          >
            <span className="font-bold text-primary">{l.abbr}</span>
            <span className="text-muted-foreground">{l.label}</span>
          </span>
        ))}
      </div>
    </details>
  );
}

// ─── Petits composants du formulaire ─────────────────────────────────────────

function CountStepper({ label, value, onChange, min, max, icon: Icon }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 p-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          aria-label={`Réduire ${label}`}
          className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-border/40 text-base hover:bg-muted transition-colors disabled:opacity-40 active:scale-95"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Augmenter ${label}`}
          className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-border/40 text-base hover:bg-muted transition-colors disabled:opacity-40 active:scale-95"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ToggleChip({ label, icon: Icon, checked, onChange }: { label: string; icon: LucideIcon; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 px-3 py-3 sm:py-2.5 min-h-11 rounded-xl border-2 transition-all text-xs font-medium active:scale-[0.97]",
        checked ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/30",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      {checked && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
    </button>
  );
}

// ============================================================================
// Page principale
// ============================================================================

export default function PlanGenerator() {
  usePageSEO({ title: "Générateur de plans architecturaux — batibuild App", description: "Générez automatiquement 10 plans d'architecture par IA selon vos contraintes." });
  const navigate = useNavigate();
  const savePlan = useMutation(api.architecturalPlans.createPlan);

  const [step, setStep] = useState<StepKey>("bien");
  const [req, setReq] = useState<PlanRequest>(DEFAULT_REQUEST);
  const [plans, setPlans] = useState<GeneratedPlan[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seed, setSeed] = useState(2026);
  const [ficheIndex, setFicheIndex] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [optimizeIndex, setOptimizeIndex] = useState<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [formStep, setFormStep] = useState<StepKey>("bien");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Plans générés en R+0 (plain-pied) : le nombre de niveaux est supprimé du
  // formulaire, la valeur reste forcée à 1 pour le moteur.
  useEffect(() => {
    setReq((r) => (r.floors !== 1 ? { ...r, floors: 1 } : r));
  }, []);

  const set = useCallback(<K extends keyof PlanRequest>(key: K, value: PlanRequest[K]) => {
    setReq((r) => ({ ...r, [key]: value }));
  }, []);

  const canNext = useMemo(() => {
    if (step === "bien") return !!req.bienType;
    if (step === "surface") return req.surfaceTotale > 0 && req.surfaceCouverte > 0;
    return true;
  }, [step, req]);

  const runGeneration = useCallback(async (reqToUse: PlanRequest, s: number) => {
    setGenerating(true);
    // Légère latence pour l'effet « IA » + animation
    await new Promise((r) => setTimeout(r, 350));
    const result = generatePlans({ ...reqToUse, seed: s });
    setFormStep(step);
    setPlans(result);
    setGenerating(false);
  }, [step]);

  const handleNext = () => {
    const idx = STEPS.findIndex((st) => st.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
    else {
      runGeneration(req, seed);
    }
  };

  const handleRegenerateAll = () => {
    const newSeed = (seed * 7 + 13) % 100000;
    setSeed(newSeed);
    runGeneration(req, newSeed);
  };

  const handleEditApply = (newReq: PlanRequest, regenerateAll: boolean, index?: number) => {
    setReq(newReq);
    if (regenerateAll) {
      runGeneration(newReq, seed);
    } else if (plans && index != null) {
      const updated = [...plans];
      const current = updated[index];
      updated[index] = regenerateVariant(newReq, current?.key ?? "", index + 1, seed);
      setPlans(updated);
    }
    setEditIndex(null);
  };

  const handleSave = async () => {
    if (!plans) return;
    setSaving(true);
    try {
      const id = await savePlan({
        name: planName.trim() || `${bienTypeLabel(req.bienType)} — ${new Date().toLocaleDateString("fr-FR")}`,
        request: { ...req, seed },
        plans,
        selectedIndex: ficheIndex ?? 1,
      });
      setSavedId(id as unknown as string);
      setSaveOpen(false);
      toast.success("Plan sauvegardé dans « Mes plans architecturaux »");
    } catch (err: any) {
      const msg = err?.message || err?.toString() || "Échec de la sauvegarde";
      if (msg.includes("LIMITE_ATTEINTE")) {
        toast.error(msg.replace("LIMITE_ATTEINTE:", ""), {
          duration: 12000,
          action: {
            label: "Voir les forfaits",
            onClick: () => navigate("/dashboard/pricing"),
          },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const bim = useMemo<ReturnType<typeof runBIMEstimation> | null>(() => {
    if (!plans || ficheIndex == null) return null;
    const p = plans[ficheIndex];
    try {
      return runBIMEstimation(
        bimCategoryFor(req.bienType),
        p.stats.construite || req.surfaceCouverte,
        p.levels,
        "tunis",
        req.standing === "premium" ? "premium" : req.standing === "economique" ? "economique" : "standard",
        {
          bedrooms: p.stats.nbChambres,
          bathrooms: p.stats.nbSdb,
          kitchens: p.rooms.filter((r) => r.type === "cuisine").length,
          livingRooms: p.rooms.filter((r) => r.type === "salon").length,
          garages: p.rooms.filter((r) => r.type === "garage").length,
        },
      );
    } catch {
      return null;
    }
  }, [plans, ficheIndex, req.bienType, req.standing, req.surfaceCouverte]);

  // ─── Écran résultats ───────────────────────────────────────────────────────
  if (plans) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <header className="glass-header sticky top-0 z-30">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 sm:min-h-14 sm:py-0">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 shrink-0" onClick={() => { setPlans(null); setStep(formStep); }} aria-label="Retour au formulaire">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">Générateur de plans architecturaux</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {bienTypeLabel(req.bienType)} · {Math.round(req.surfaceCouverte)} m² · R+0 (plain-pied)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <Button variant="outline" size="sm" className="h-9 sm:h-8 px-2 sm:px-3 text-xs gap-1" onClick={handleRegenerateAll} disabled={generating} title="10 nouvelles propositions" aria-label="Générer 10 nouvelles propositions">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span className="hidden md:inline">10 nouvelles propositions</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 sm:h-8 px-2 sm:px-3 text-xs gap-1" onClick={() => setCompareOpen(true)} aria-label="Comparer les plans">
                <Trophy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Comparer</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 sm:h-8 px-2 sm:px-3 text-xs gap-1" onClick={async () => {
                try { await exportAllPlansZip(plans, `${bienTypeLabel(req.bienType)}-${req.surfaceCouverte}m2`); toast.success("Les 10 plans ont été téléchargés (ZIP)"); }
                catch (err: any) { toast.error(err?.message || "Échec du ZIP"); }
              }} title="Télécharger les 10 plans" aria-label="Télécharger les 10 plans en ZIP">
                <FileArchive className="h-3.5 w-3.5" /> <span className="hidden md:inline">Télécharger les 10</span>
              </Button>
              <Button size="sm" className="h-9 sm:h-8 px-2 sm:px-3 text-xs gap-1" onClick={() => { setSaveOpen(true); setPlanName(""); }} aria-label="Sauvegarder le plan">
                <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sauvegarder</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 sm:h-8 px-2 sm:px-3 text-xs gap-1" onClick={() => navigate("/dashboard")} aria-label="Retour au tableau de bord">
                <LayoutDashboard className="h-3.5 w-3.5" /> <span className="hidden md:inline">Tableau de bord</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-5 space-y-4">
          {/* Alertes de contraintes */}
          <AnimatePresence>
            {plans.some((p) => p.alerts.incompatible) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/25 px-4 py-3 text-[11px] sm:text-xs text-amber-800 dark:text-amber-200"
              >
                <span className="font-semibold">⚠ Contraintes de surface :</span>{" "}
                {plans.find((p) => p.alerts.incompatible)?.alerts.messages.join(" ")}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grille des 10 plans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.index}
                plan={plan}
                onFiche={() => setFicheIndex(plan.index - 1)}
                onEdit={() => setEditIndex(plan.index - 1)}
                onOptimize={() => setOptimizeIndex(plan.index - 1)}
                onDownloadPdf={() => exportPlanPdf(plan).then(() => toast.success(`Plan ${plan.index} téléchargé (PDF haute résolution)`)).catch((e: any) => toast.error(e?.message || "Erreur"))}
              />
            ))}

            {/* Carte « régénérer » */}
            <button
              onClick={handleRegenerateAll}
              disabled={generating}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/50 p-6 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all min-h-[220px]"
            >
              {generating ? <Loader2 className="h-8 w-8 animate-spin" /> : <Sparkles className="h-8 w-8 group-hover:scale-110 transition-transform" />}
              <span className="text-xs font-semibold">Générer 10 nouvelles propositions</span>
              <span className="text-[10px] text-center leading-snug">Conserve les mêmes caractéristiques mais produit des configurations différentes.</span>
            </button>
          </div>

          {/* Légende des abréviations */}
          <PlanLegend />
        </div>

        {/* Modales */}
        {ficheIndex != null && plans[ficheIndex] && (
          <PlanSheetModal
            plan={plans[ficheIndex]}
            request={req}
            bim={bim}
            open={ficheIndex != null}
            onClose={() => setFicheIndex(null)}
          />
        )}
        {optimizeIndex != null && plans[optimizeIndex] && (
          <PlanOptimizeModal
            plan={plans[optimizeIndex]}
            request={req}
            open={optimizeIndex != null}
            onClose={() => setOptimizeIndex(null)}
            onApply={(optimized) => {
              setPlans((prev) => {
                if (!prev) return prev;
                const next = [...prev];
                next[optimizeIndex] = optimized;
                return next;
              });
              setOptimizeIndex(null);
              toast.success(`Plan ${String(optimized.index).padStart(2, "0")} optimisé par l'IA`);
            }}
          />
        )}
        <PlanCompareModal
          plans={plans}
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          onSelect={(p) => { setCompareOpen(false); setFicheIndex(p.index - 1); }}
        />
        {editIndex != null && (
          <PlanEditModal
            plan={plans[editIndex]}
            request={req}
            open={editIndex != null}
            onClose={() => setEditIndex(null)}
            onApply={handleEditApply}
            index={editIndex}
          />
        )}

        {/* Sauvegarde */}
        <AnimatePresence>
          {saveOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setSaveOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 16 }}
                className="w-full max-w-sm rounded-2xl border border-border/40 bg-background p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-bold mb-1">Sauvegarder ce projet de plan</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {savedId ? "Projet déjà sauvegardé — nouvelle génération non enregistrée." : "Le plan sera ajouté à « Mes plans architecturaux » avec son historique."}
                </p>
                {!savedId ? (
                  <>
                    <Label className="text-xs font-semibold">Nom du plan</Label>
                    <Input
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder={`${bienTypeLabel(req.bienType)} — ${Math.round(req.surfaceCouverte)} m²`}
                      className="mt-1.5 h-11 sm:h-9 text-xs"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-5">
                      <Button variant="outline" size="sm" className="h-11 sm:h-9 flex-1 text-xs" onClick={() => setSaveOpen(false)}>Annuler</Button>
                      <Button size="sm" className="h-11 sm:h-9 flex-1 text-xs gap-1" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Sauvegarder
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-11 sm:h-9 flex-1 text-xs" onClick={() => { setSavedId(null); setSaveOpen(false); }}>Fermer</Button>
                    <Button size="sm" className="h-11 sm:h-9 flex-1 text-xs" onClick={() => navigate("/dashboard/plans")}>Mes plans</Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  // ─── Écran formulaire (wizard) — design unifié « Nouveau projet » ─────────
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      {/* Header */}
      <header className="glass-header sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 flex items-center h-12 sm:h-14">
          <Button variant="ghost" size="sm" className="gap-1 h-9 sm:h-8 shrink-0" onClick={() => navigate("/dashboard/plans")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Retour</span>
          </Button>
          <div className="ml-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="font-semibold text-xs sm:text-sm">Générateur de plans architecturaux</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-12">
          {/* ── Stepper ── */}
          <aside className="md:w-56 lg:w-64 shrink-0">
            <div className="hidden md:block sticky top-20">
              <VerticalStepper current={step} onSelect={(k) => setStep(k)} />
            </div>

            {/* Stepper mobile horizontal */}
            <div className="md:hidden mb-3">
              <div className="flex items-center justify-between gap-0 overflow-x-auto pb-2 scrollbar-none -mx-3 px-3">
                {STEPS.map((s, i) => {
                  const idx = STEPS.findIndex((x) => x.key === step);
                  const done = i < idx;
                  const active = i === idx;
                  return (
                    <div key={s.key} className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => (done || active) && setStep(s.key)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-medium transition-all active:scale-95",
                          done && "bg-emerald-500 text-white",
                          active && "bg-primary text-primary-foreground shadow-sm",
                          !done && !active && "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-3 w-3" /> : i + 1}
                      </button>
                      {i < STEPS.length - 1 && (
                        <div className={cn("w-4 sm:w-6 h-px", done ? "bg-emerald-400" : "bg-border")} />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[10px] font-medium text-muted-foreground mt-1">
                {STEPS.find((s) => s.key === step)?.label ?? ""}
              </p>
            </div>

            {/* Récapitulatif mobile repliable */}
            <div className="md:hidden mb-4">
              <div className="rounded-xl border border-border/40 bg-card/50 shadow-sm overflow-hidden">
                <button
                  onClick={() => setMobileSummaryOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-semibold">Récapitulatif</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
                      <motion.circle
                        cx="10" cy="10" r="8" fill="none"
                        stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 8}
                        initial={{ strokeDashoffset: 2 * Math.PI * 8 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 8 * (1 - stepProgress(step) / 100) }}
                        transition={{ duration: 0.6 }}
                      />
                    </svg>
                    <motion.div animate={{ rotate: mobileSummaryOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {mobileSummaryOpen && (
                    <motion.div
                      key="mobile-summary"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <PlanSummaryContent req={req} step={step} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </aside>

          {/* ── Contenu ── */}
          <section className="flex-1 min-w-0">
            <div className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6 lg:p-8 shadow-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {/* Étape 1 — Type de bien */}
                  {step === "bien" && (
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold mb-1">Choisissez le type de bien</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">Le moteur adapte l'organisation des espaces au type de projet.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {BIEN_TYPES.map((b) => {
                          const Icon = BIEN_ICONS[b.value] ?? Box;
                          const active = req.bienType === b.value;
                          return (
                            <button
                              key={b.value}
                              onClick={() => set("bienType", b.value)}
                              className={cn(
                                "flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                                active ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 hover:border-primary/30",
                              )}
                            >
                              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                              <span className="text-xs font-semibold leading-tight">{b.label}</span>
                              {active && <Badge className="mt-1 bg-primary text-primary-foreground text-[8px]"><Check className="h-2.5 w-2.5" /> Sélectionné</Badge>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Étape 2 — Surfaces */}
                  {step === "surface" && (
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold mb-1">Surfaces</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">Le moteur vérifie la cohérence entre la surface totale et les pièces. Les plans sont générés en R+0 (plain-pied).</p>
                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="rounded-xl border border-border/40 p-4">
                            <Label className="text-xs font-semibold flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-primary" /> Surface totale disponible (m²)</Label>
                            <Input type="number" inputMode="decimal" min={20} value={req.surfaceTotale || ""} onChange={(e) => set("surfaceTotale", parseFloat(e.target.value) || 0)} className="mt-1.5 h-11 sm:h-9 w-full text-sm" placeholder="ex : 400" />
                            <p className="text-[10px] text-muted-foreground mt-1">Terrain ou plateau complet.</p>
                          </div>
                          <div className="rounded-xl border border-border/40 p-4">
                            <Label className="text-xs font-semibold flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" /> Surface couverte (m²)</Label>
                            <Input type="number" inputMode="decimal" min={15} value={req.surfaceCouverte || ""} onChange={(e) => set("surfaceCouverte", parseFloat(e.target.value) || 0)} className="mt-1.5 h-11 sm:h-9 w-full text-sm" placeholder="ex : 150" />
                            <p className="text-[10px] text-muted-foreground mt-1">Emprise construite (R+0).</p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/40 p-4">
                          <Label className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Orientation & entrée</Label>
                          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                            {(["nord", "est", "sud", "ouest"] as const).map((dir) => (
                              <button
                                key={dir}
                                onClick={() => set("entreePosition", dir)}
                                className={cn(
                                  "py-2.5 sm:py-2 min-h-11 sm:min-h-10 rounded-lg border text-[10px] font-medium capitalize transition-all active:scale-[0.97]",
                                  req.entreePosition === dir ? "border-primary bg-primary/10 text-primary" : "border-border/40 hover:border-primary/30",
                                )}
                              >
                                {dir}
                              </button>
                            ))}
                            <button
                              onClick={() => set("entreePosition", req.entreePosition === "sud" ? "ouest" : "sud")}
                              className="py-2.5 sm:py-2 min-h-11 sm:min-h-10 rounded-lg border border-border/40 text-[10px] font-medium text-muted-foreground hover:border-primary/30 active:scale-[0.97]"
                            >
                              Auto
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">Position de l'entrée principale.</p>
                        </div>
                        <div className="rounded-xl border border-border/40 p-4">
                          <Label className="text-xs font-semibold flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" /> Nombre de façades exposées</Label>
                          <div className="flex gap-1.5 mt-1.5">
                            {[1, 2, 3, 4].map((f) => (
                              <button
                                key={f}
                                onClick={() => set("facades", f)}
                                className={cn(
                                  "flex-1 px-4 py-2.5 sm:py-2 min-h-11 sm:min-h-10 rounded-lg border text-xs font-semibold transition-all active:scale-[0.97]",
                                  req.facades === f ? "border-primary bg-primary/10 text-primary" : "border-border/40 hover:border-primary/30",
                                )}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Étape 3 — Pièces */}
                  {step === "pieces" && (
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold mb-1">Composition intérieure</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">Le nombre de pièces influence la surface utile et la circulation.</p>
                      <div className="space-y-3">
                        <div className="grid sm:grid-cols-3 gap-3">
                          {COUNT_FIELDS.map((f) => (
                            <CountStepper
                              key={f.key}
                              label={f.label}
                              icon={f.icon}
                              min={f.min}
                              max={f.max}
                              value={(req as any)[f.key] as number}
                              onChange={(v) => set(f.key as keyof PlanRequest, v as any)}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ROOM_TOGGLES.map((t) => (
                            <ToggleChip
                              key={t.key}
                              label={t.label}
                              icon={t.icon}
                              checked={(req as any)[t.key] as boolean}
                              onChange={(v) => set(t.key as keyof PlanRequest, v as any)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Étape 4 — Extérieurs */}
                  {step === "exterieur" && (
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold mb-1">Espaces extérieurs</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">Garage, stationnement, terrasse, jardin et piscine sont placés sur la parcelle.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {EXT_TOGGLES.map((t) => (
                          <ToggleChip
                            key={t.key}
                            label={t.label}
                            icon={t.icon}
                            checked={(req as any)[t.key] as boolean}
                            onChange={(v) => set(t.key as keyof PlanRequest, v as any)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Étape 5 — Style & exigences */}
                  {step === "style" && (
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold mb-1">Style & contraintes</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">Définissez le niveau de standing, le style architectural et vos exigences.</p>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-semibold flex items-center gap-1.5"><Crown className="h-3.5 w-3.5 text-primary" /> Niveau de standing</Label>
                          <div className="grid sm:grid-cols-3 gap-2 mt-1.5">
                            {STANDINGS.map((s) => (
                              <button
                                key={s.value}
                                onClick={() => set("standing", s.value)}
                                className={cn(
                                  "flex items-center gap-2 p-3 min-h-[60px] rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                                  req.standing === s.value ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30",
                                )}
                              >
                                <s.icon className={cn("h-4 w-4", req.standing === s.value ? "text-primary" : "text-muted-foreground")} />
                                <span>
                                  <span className="block text-xs font-semibold">{s.label}</span>
                                  <span className="block text-[9px] text-muted-foreground">{s.desc}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-primary" /> Style architectural</Label>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {(Object.keys(STYLE_LABELS) as Array<keyof typeof STYLE_LABELS>).map((st) => (
                              <button
                                key={st}
                                onClick={() => set("style", st as any)}
                                className={cn(
                                  "px-3.5 py-2.5 sm:py-1.5 min-h-11 sm:min-h-9 rounded-lg border text-[11px] font-medium transition-all active:scale-[0.97]",
                                  req.style === st ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/30",
                                )}
                              >
                                {STYLE_LABELS[st]}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5 text-primary" /> Exigences supplémentaires</Label>
                          <Textarea
                            value={req.exigences ?? ""}
                            onChange={(e) => set("exigences", e.target.value)}
                            placeholder="Décrivez librement vos besoins : double salon, salle de jeux, orientation du salon plein sud, cuisine fermée, etc."
                            className="mt-1.5 min-h-[100px] text-xs w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation — barre sticky en bas sur mobile */}
                  <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 sm:mx-0 mt-6 flex items-center justify-between gap-3 border-t border-border/40 bg-background/95 backdrop-blur px-4 py-3 sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:p-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 sm:h-9 flex-1 sm:flex-none text-xs gap-1"
                      onClick={() => {
                        const idx = STEPS.findIndex((st) => st.key === step);
                        if (idx > 0) setStep(STEPS[idx - 1].key);
                      }}
                      disabled={STEPS.findIndex((st) => st.key === step) === 0}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Retour
                    </Button>
                    <Button
                      size="sm"
                      className="h-11 sm:h-9 flex-1 sm:flex-none text-xs gap-1"
                      onClick={handleNext}
                      disabled={!canNext || generating}
                    >
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : step === "style" ? <Sparkles className="h-3.5 w-3.5" /> : null}
                      {generating ? "Génération…" : step === "style" ? "Générer 10 plans" : "Continuer"}
                      {!generating && step !== "style" && <ChevronRight className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </section>

          {/* ── Récapitulatif desktop ── */}
          <aside className="hidden lg:block w-64 xl:w-72 shrink-0">
            <PlanSummaryContent req={req} step={step} sticky />
          </aside>
        </div>
      </div>
    </main>
  );
}

/** Progression du wizard en fonction de l'étape courante (0-100). */
function stepProgress(s: StepKey): number {
  const idx = STEPS.findIndex((x) => x.key === s);
  return Math.min(Math.round(((idx + 1) / STEPS.length) * 100), 100);
}

/** Contenu du récapitulatif (partagé desktop / mobile). */
function PlanSummaryContent({ req, step, sticky = false }: { req: PlanRequest; step: StepKey; sticky?: boolean }) {
  const stepIdx = Math.max(0, STEPS.findIndex((s) => s.key === step));
  const items: { label: string; value: string; icon: LucideIcon; step: StepKey }[] = [
    { label: "Type de bien", value: bienTypeLabel(req.bienType), icon: Home, step: "bien" },
    { label: "Surface totale", value: `${Math.round(req.surfaceTotale)} m²`, icon: Ruler, step: "surface" },
    { label: "Surface couverte", value: `${Math.round(req.surfaceCouverte)} m²`, icon: Building2, step: "surface" },
    { label: "Composition", value: `${req.bedrooms} ch · ${req.bathrooms} sdb · ${req.wcs} wc`, icon: BedDouble, step: "pieces" },
    { label: "Équipements", value: `${ROOM_TOGGLES.filter((t) => (req as any)[t.key]).length} pièce(s)`, icon: LayoutGrid, step: "pieces" },
    { label: "Extérieurs", value: `${EXT_TOGGLES.filter((t) => (req as any)[t.key]).length} espace(s)`, icon: Trees, step: "exterieur" },
    { label: "Standing", value: STANDINGS.find((s) => s.value === req.standing)?.label ?? req.standing, icon: Crown, step: "style" },
    { label: "Style", value: STYLE_LABELS[req.style] ?? req.style, icon: Palette, step: "style" },
  ];

  // Progression fonctionnelle : dépend de l'étape courante du wizard,
  // pas du nombre d'items remplis (qui restait bloqué à 100 %).
  const progress = stepProgress(step);
  const R = 16;
  const circumference = 2 * Math.PI * R;
  const offset = circumference * (1 - progress / 100);
  const currentLabel = STEPS[stepIdx]?.label ?? "";

  const body = (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative h-11 w-11 shrink-0">
          <svg className="h-11 w-11 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
            <motion.circle
              cx="20" cy="20" r={R}
              fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.8, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </svg>
          <motion.span
            className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
            style={{ color: "hsl(var(--primary))" }}
            animate={progress > 0 && progress < 100 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
          >
            {progress}%
          </motion.span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium">
            {progress < 40 && "💭 Commencez par choisir le type de bien"}
            {progress >= 40 && progress < 60 && "🧠 Bonne progression !"}
            {progress >= 60 && progress < 100 && "⚡ Presque complet !"}
            {progress >= 100 && "✅ Prêt pour la génération"}
          </p>
          <p className="text-[9px] text-muted-foreground">
            Étape {Math.min(stepIdx + 1, STEPS.length)}/{STEPS.length} — {currentLabel}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((item, i) => {
          const itemStepIdx = STEPS.findIndex((s) => s.key === item.step);
          const done = itemStepIdx < stepIdx;
          const active = itemStepIdx === stepIdx;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded-lg border transition-colors duration-300",
                done && "border-emerald-500/25 bg-emerald-500/5",
                active && "border-primary/40 bg-primary/5 shadow-sm",
                !done && !active && "border-border/20 bg-muted/20 opacity-50",
              )}
            >
              <item.icon className={cn("h-3.5 w-3.5 shrink-0", done ? "text-emerald-600" : active ? "text-primary" : "text-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-[9px] leading-tight", done ? "text-emerald-700/80" : active ? "text-primary" : "text-muted-foreground")}>{item.label}</p>
                <p className={cn("text-[10px] font-medium truncate leading-tight", done ? "text-emerald-900" : "text-foreground")}>{item.value}</p>
              </div>
              {done ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-500" />
              ) : active ? (
                <motion.div
                  className="h-1.5 w-1.5 rounded-full shrink-0 bg-primary"
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                />
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </>
  );

  if (sticky) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="sticky top-20"
      >
        <div className="rounded-xl border border-border/40 bg-card/50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/20">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold">Récapitulatif</h3>
              <p className="text-[9px] text-muted-foreground">Étape {Math.min(stepIdx + 1, STEPS.length)}/{STEPS.length} · {currentLabel}</p>
            </div>
          </div>
          {body}
        </div>
      </motion.div>
    );
  }

  return body;
}

// ============================================================================
// Carte d'un plan dans la grille de résultats
// ============================================================================

function PlanCard({ plan, onFiche, onEdit, onOptimize, onDownloadPdf }: {
  plan: GeneratedPlan;
  onFiche: () => void;
  onEdit: () => void;
  onOptimize: () => void;
  onDownloadPdf: () => void;
}) {
  const quality = plan.quality;
  const qColor = !quality ? "bg-slate-500/80" : quality.score >= 85 ? "bg-emerald-600/90" : quality.score >= 60 ? "bg-amber-600/90" : "bg-red-600/90";
  const [downloading, setDownloading] = useState(false);
  return (
    <Card className="group flex flex-col overflow-hidden border border-border/40 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]">
      {/* En-tête : nom du plan + score */}
      <CardContent className="flex items-start justify-between gap-2 p-3 pb-2">
        <div className="min-w-0">
          <p className="text-xs font-bold truncate">{plan.name}</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {plan.stats.construite.toFixed(0)} m²</span>
            <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {plan.stats.nbChambres} ch</span>
            <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {plan.stats.nbSdb} sdb</span>
            <span className="flex items-center gap-1 text-emerald-600"><LayoutGrid className="h-3 w-3" /> {plan.stats.tauxUtilisation}% util.</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className="bg-violet-600/90 text-white border-0 text-[9px] gap-0.5">
            <Gauge className="h-2.5 w-2.5" /> {plan.scores.global}/100
          </Badge>
          <Badge className={`${qColor} text-white border-0 text-[9px] gap-0.5`} title={`Contrôle qualité : ${quality?.score ?? "—"}/100`}>
            <ClipboardList className="h-2.5 w-2.5" /> Qualité {quality ? `${quality.score}` : "—"}
          </Badge>
          <Badge className="bg-slate-900/85 text-white border-0 text-[9px]">
            Plan {String(plan.index).padStart(2, "0")}
          </Badge>
        </div>
      </CardContent>

      {/* Image du plan — pleine largeur bord à bord, ratio carré, maximisée et nette, sans popup au survol */}
      <div className="relative aspect-square w-full overflow-hidden bg-white dark:bg-slate-100/90">
        <div className="absolute inset-0 flex items-center justify-center">
          <FloorPlan2D plan={plan} compact showDimensions={false} fit />
        </div>
      </div>

      {/* Opérations directement sur la carte : Modifier / Fiche technique / Télécharger (PDF net) */}
      <CardContent className="p-3 mt-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <Button size="sm" variant="outline" className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1" onClick={onEdit} title="Modifier ce plan" aria-label={`Modifier le plan ${plan.index}`}>
            <PenLine className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Modifier</span>
          </Button>
          <Button
            size="sm"
            className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1 bg-violet-600 hover:bg-violet-500 text-white"
            onClick={onOptimize}
            title="Optimiser automatiquement le plan avec l'IA"
            aria-label={`Optimiser le plan ${plan.index} avec l'IA`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Optimiser IA</span>
          </Button>
          <Button size="sm" variant="outline" className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1" onClick={onFiche} title="Fiche technique" aria-label={`Fiche technique du plan ${plan.index}`}>
            <ClipboardList className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Fiche</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1"
            onClick={async () => { setDownloading(true); try { await onDownloadPdf(); } finally { setDownloading(false); } }}
            disabled={downloading}
            title="Télécharger en PDF (haute résolution)"
            aria-label={`Télécharger le plan ${plan.index} en PDF`}
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />} <span className="truncate">PDF</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
