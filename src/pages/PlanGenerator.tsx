import { useState, useMemo, useCallback } from "react";
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
  Loader2, Download, FileArchive, RefreshCw, Save, Trophy,
  Ruler, MapPin, Palette, Check, ChevronRight, Crown, Gauge, PenLine,
  BedDouble, Bath, Armchair, Utensils, CookingPot, Car, Trees, Waves,
  Shirt, Briefcase as BriefcaseIcon, Wrench, PencilRuler, HardHat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BIEN_TYPES, STYLE_LABELS, generatePlans, regenerateVariant,
  bienTypeLabel, type PlanRequest, type GeneratedPlan,
} from "@/convex/planEngine";
import { runBIMEstimation } from "@/convex/bimEngine";
import { FloorPlan2D } from "@/components/plans/FloorPlanView";
import { PlanViewerModal } from "@/components/plans/PlanViewerModal";
import { PlanCompareModal } from "@/components/plans/PlanCompareModal";
import { PlanEditModal } from "@/components/plans/PlanEditModal";
import { exportPlanImage, exportAllPlansZip } from "@/lib/planExport";
import { usePageSEO } from "@/hooks/use-page-seo";

// ============================================================================
// Générateur de plans architecturaux par IA — parcours guidé
// ============================================================================

const STEPS = [
  { key: "bien", label: "Type de bien", desc: "Choisissez le type de projet" },
  { key: "surface", label: "Surfaces", desc: "Dimensions & niveaux" },
  { key: "pieces", label: "Pièces", desc: "Composition intérieure" },
  { key: "exterieur", label: "Extérieurs", desc: "Garage, terrasse, jardin…" },
  { key: "style", label: "Style & contraintes", desc: "Standing, style, exigences" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

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
  { key: "hasDressing", label: "Dressing", icon: Shirt },
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

/** Mapping bienType → type de bien investissement (prefill rentabilité). */
function investTypeFor(bienType: string): string {
  const map: Record<string, string> = {
    maison: "maison", villa: "villa", appartement: "appartement",
    studio: "studio", duplex: "duplex", immeuble: "immeuble",
    local_commercial: "local_commercial", bureau: "bureau",
    entrepot: "entrepot", residence_touristique: "residence_touristique",
    projet_neuf: "projet_neuf",
  };
  return map[bienType] ?? "maison";
}

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

export default function PlanGenerator() {
  usePageSEO({ title: "Générateur de plans architecturaux — BuildEase", description: "Générez automatiquement 10 plans d'architecture par IA selon vos contraintes." });
  const navigate = useNavigate();
  const savePlan = useMutation(api.architecturalPlans.createPlan);

  const [step, setStep] = useState<StepKey>("bien");
  const [req, setReq] = useState<PlanRequest>(DEFAULT_REQUEST);
  const [plans, setPlans] = useState<GeneratedPlan[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seed, setSeed] = useState(2026);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [formStep, setFormStep] = useState<StepKey>("bien");

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
        selectedIndex: viewerIndex ?? 1,
      });
      setSavedId(id as unknown as string);
      setSaveOpen(false);
      toast.success("Plan sauvegardé dans « Mes plans architecturaux »");
    } catch (err: any) {
      toast.error(err?.message || "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const bim = useMemo<ReturnType<typeof runBIMEstimation> | null>(() => {
    if (!plans || viewerIndex == null) return null;
    const p = plans[viewerIndex];
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
  }, [plans, viewerIndex, req.bienType, req.standing, req.surfaceCouverte]);
  const costEstimate = bim?.costEstimate ?? null;

  const openInvestAnalysis = (plan: GeneratedPlan) => {
    navigate("/dashboard/investments", {
      state: {
        prefill: {
          name: `${bienTypeLabel(req.bienType)} — ${plan.name}`,
          investmentType: investTypeFor(req.bienType),
          area: plan.stats.utile,
          region: "tunis",
          purchasePrice: Math.round((costEstimate?.totalCost ?? req.surfaceCouverte * 1400) * 0.8),
          monthlyRent: Math.round((costEstimate?.totalCost ?? req.surfaceCouverte * 1400) * 0.0055),
          rentMode: "mensuel",
          rentAmount: Math.round((costEstimate?.totalCost ?? req.surfaceCouverte * 1400) * 0.0055),
        },
      },
    });
  };

  const formatTND = (n: number) =>
    new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

  // ─── Écran résultats ───────────────────────────────────────────────────────
  if (plans) {
    return (
      <main className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b border-border/30 bg-background/85 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 sm:min-h-14 sm:py-0">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setPlans(null); setStep(formStep); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">Générateur de plans architecturaux</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {bienTypeLabel(req.bienType)} · {Math.round(req.surfaceCouverte)} m² · {req.floors} niveau{req.floors > 1 ? "x" : ""}
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
                onView={() => setViewerIndex(plan.index - 1)}
                onDownload={() => exportPlanImage(plan, { format: "png", scale: 2.5 }).then(() => toast.success(`Plan ${plan.index} téléchargé`)).catch((e: any) => toast.error(e?.message || "Erreur"))}
                onEdit={() => setEditIndex(plan.index - 1)}
                onInvest={() => openInvestAnalysis(plan)}
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
        </div>

        {/* Modales */}
        {viewerIndex != null && plans[viewerIndex] && (
          <PlanViewerModal
            plan={plans[viewerIndex]}
            plans={plans}
            index={viewerIndex}
            onIndexChange={(i) => setViewerIndex(i)}
            open={viewerIndex != null}
            onClose={() => setViewerIndex(null)}
            onOpenEdit={() => setEditIndex(viewerIndex)}
            request={req}
            bim={bim}
          />
        )}
        <PlanCompareModal
          plans={plans}
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          onSelect={(p) => { setCompareOpen(false); setViewerIndex(p.index - 1); }}
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
                      className="mt-1.5 h-9 text-xs"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-5">
                      <Button variant="outline" size="sm" className="h-9 flex-1 text-xs" onClick={() => setSaveOpen(false)}>Annuler</Button>
                      <Button size="sm" className="h-9 flex-1 text-xs gap-1" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Sauvegarder
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-9 flex-1 text-xs" onClick={() => { setSavedId(null); setSaveOpen(false); }}>Fermer</Button>
                    <Button size="sm" className="h-9 flex-1 text-xs" onClick={() => navigate("/dashboard/plans")}>Mes plans</Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  // ─── Écran formulaire (wizard) ─────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/30 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-3 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard/plans")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Générateur de plans architecturaux</p>
              <p className="text-[10px] text-muted-foreground hidden sm:block">Par IA — 10 propositions automatiques</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-6 grid lg:grid-cols-[240px_1fr] gap-6">
        {/* Stepper */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-1">
            {STEPS.map((st, i) => {
              const idx = STEPS.findIndex((s) => s.key === step);
              const done = i < idx;
              const active = i === idx;
              return (
                <button
                  key={st.key}
                  onClick={() => (done || active) && setStep(st.key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all",
                    active ? "bg-primary/10 text-primary" : done ? "text-muted-foreground hover:bg-muted/50" : "opacity-45",
                  )}
                >
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border-2",
                    active ? "border-primary bg-primary text-white" : done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border",
                  )}>
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span>
                    <span className="block text-xs font-semibold">{st.label}</span>
                    <span className="block text-[9px] text-muted-foreground">{st.desc}</span>
                  </span>
                </button>
              );
            })}
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] text-primary font-semibold flex items-center gap-1"><Sparkles className="h-3 w-3" /> 10 plans générés</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">Le moteur procédural produit 10 organisations différentes respectant vos contraintes.</p>
            </div>
          </div>
        </aside>

        {/* Contenu */}
        <div>
          {/* Stepper mobile — défilement horizontal sans scroll de page */}
          <div className="lg:hidden mb-4 flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-3 px-3">
            {STEPS.map((st, i) => {
              const idx = STEPS.findIndex((s) => s.key === step);
              const done = i < idx;
              const active = i === idx;
              return (
                <button
                  key={st.key}
                  onClick={() => (done || active) && setStep(st.key)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-10 rounded-lg text-[10px] font-medium border active:scale-[0.97]",
                    active ? "border-primary bg-primary/10 text-primary" : done ? "border-emerald-500/40 text-emerald-600" : "border-border/40 text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {st.label}
                </button>
              );
            })}
          </div>

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
                  <h2 className="text-lg font-bold mb-1">Choisissez le type de bien</h2>
                  <p className="text-xs text-muted-foreground mb-4">Le moteur adapte l'organisation des espaces au type de projet.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BIEN_TYPES.map((b) => {
                      const Icon = BIEN_ICONS[b.value] ?? Box;
                      const active = req.bienType === b.value;
                      return (
                        <button
                          key={b.value}
                          onClick={() => set("bienType", b.value)}
                          className={cn(
                            "flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all",
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
                  <h2 className="text-lg font-bold mb-1">Surfaces & niveaux</h2>
                  <p className="text-xs text-muted-foreground mb-4">Le moteur vérifie la cohérence entre la surface totale et les pièces.</p>
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
                        <p className="text-[10px] text-muted-foreground mt-1">Emprise construite totale (tous niveaux).</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-border/40 p-4">
                        <Label className="text-xs font-semibold flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Nombre de niveaux</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                          {[1, 2, 3].map((f) => (
                        <button
                          key={f}
                          onClick={() => set("floors", f)}
                          className={cn(
                            "flex-1 py-2.5 sm:py-2 min-h-11 sm:min-h-10 rounded-lg border text-xs font-semibold transition-all active:scale-[0.97]",
                            req.floors === f ? "border-primary bg-primary/10 text-primary" : "border-border/40 hover:border-primary/30",
                          )}
                        >
                          R+{f - 1}
                        </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">R+0 = plain-pied, R+1 = 2 niveaux…</p>
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
                  <h2 className="text-lg font-bold mb-1">Composition intérieure</h2>
                  <p className="text-xs text-muted-foreground mb-4">Le nombre de pièces influence la surface utile et la circulation.</p>
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
                  <h2 className="text-lg font-bold mb-1">Espaces extérieurs</h2>
                  <p className="text-xs text-muted-foreground mb-4">Garage, stationnement, terrasse, jardin et piscine sont placés sur la parcelle.</p>
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
                  <h2 className="text-lg font-bold mb-1">Style & contraintes</h2>
                  <p className="text-xs text-muted-foreground mb-4">Définissez le niveau de standing, le style architectural et vos exigences.</p>
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

              {/* Navigation — barre sticky en bas sur mobile pour un accès tactile facile */}
              <div className="sticky bottom-0 z-10 -mx-3 sm:mx-0 mt-6 flex items-center justify-between gap-3 border-t border-border/40 bg-background/95 backdrop-blur px-3 py-3 sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:p-0">
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
      </div>
    </main>
  );
}

// ============================================================================
// Carte d'un plan dans la grille de résultats
// ============================================================================

function PlanCard({ plan, onView, onDownload, onEdit, onInvest }: {
  plan: GeneratedPlan;
  onView: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onInvest: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  return (
    <Card className="group flex flex-col overflow-hidden border border-border/40 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]">
      {/* En-tête : nom du plan + score */}
      <CardContent className="flex items-start justify-between gap-2 p-3 pb-0">
        <div className="min-w-0">
          <p className="text-xs font-bold truncate">{plan.name}</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {plan.stats.construite.toFixed(0)} m²</span>
            <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {plan.stats.nbChambres} ch</span>
            <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {plan.stats.nbSdb} sdb</span>
            <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> R+{plan.levels - 1}</span>
            <span className="flex items-center gap-1 text-emerald-600"><LayoutGrid className="h-3 w-3" /> {plan.stats.tauxUtilisation}% util.</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className="bg-violet-600/90 text-white border-0 text-[9px] gap-0.5">
            <Gauge className="h-2.5 w-2.5" /> {plan.scores.global}/100
          </Badge>
          <Badge className="bg-slate-900/85 text-white border-0 text-[9px]">
            Plan {String(plan.index).padStart(2, "0")}
          </Badge>
        </div>
      </CardContent>

      {/* Image du plan — grande et nette, sous le nom */}
      <div className="relative aspect-[5/4] mx-3 mt-3 overflow-hidden rounded-xl bg-white dark:bg-slate-100/90 border border-border/30 cursor-pointer" onClick={onView}>
        <div className="absolute inset-0 flex items-center justify-center">
          <FloorPlan2D plan={plan} compact showDimensions={false} fit />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-white text-slate-900 px-3.5 py-1.5 text-[11px] font-semibold shadow-lg">
            <Sparkles className="h-3.5 w-3.5" /> Voir le plan
          </span>
        </button>
      </div>

      {/* Actions — zones tactiles généreuses sur mobile */}
      <CardContent className="p-3 mt-auto">
        <div className="flex items-center gap-1.5">
          <Button size="sm" className="h-10 sm:h-8 flex-1 text-[10px] sm:text-[11px] gap-1" onClick={onView}>
            <Sparkles className="h-3 w-3" /> Voir
          </Button>
          <Button size="sm" variant="outline" className="h-10 sm:h-8 w-10 sm:w-8 px-0 text-[10px]" onClick={onEdit} title="Modifier" aria-label="Modifier ce plan">
            <PenLine className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 sm:h-8 w-10 sm:w-8 px-0 text-[10px]"
            onClick={async () => { setDownloading(true); await onDownload(); setDownloading(false); }}
            disabled={downloading}
            title="Télécharger PNG"
            aria-label="Télécharger le plan en PNG"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-10 sm:h-8 w-10 sm:w-8 px-0 text-[10px] gap-1" onClick={onInvest} title="Analyse de rentabilité" aria-label="Lancer l'analyse de rentabilité">
            <TrendingIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
