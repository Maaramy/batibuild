import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useAction } from "convex/react";
import {
  Landmark,
  ArrowUpRight,
  Plus,
  Coins,
  MapPin,
  Sparkles,
  Loader2,
  FileText,
  Trash2,
  Gauge,
  Percent,
  PiggyBank,
  CalendarClock,
  TrendingUp,
  Layers,
  BarChart3,
  Bot,
  Wallet,
  Download,
  ShieldAlert,
  Building2,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Star,
  Lock,
  MoonStar,
  CalendarDays,
  Receipt,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePageSEO } from "@/hooks/use-page-seo";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  DEFAULT_FORM,
  TYPE_META,
  TYPE_ORDER,
  NumField,
  ScoreGauge,
  Kpi,
  fmtNum,
  resolveZoneUtility,
  REGION_CASCADE,
} from "@/components/investment/shared";
import type { FormState, InvestmentInput, InvestmentType, ZoneUtility } from "@/components/investment/shared";
import { LocationField } from "@/components/investment/location-field";

// ============================================================================
// Page d'analyse — saisie de l'investissement en 3 étapes puis navigation
// vers la page de résultats.
// ============================================================================

const STEPS = [
  { n: 1, label: "Le bien", icon: Building2 },
  { n: 2, label: "Loyer & charges", icon: Coins },
  { n: 3, label: "Coûts & hypothèses", icon: TrendingUp },
];

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -32 }),
};

// ── Persistance de la localisation (pré-remplissage de la prochaine analyse) ──

const LOCATION_STORAGE_KEY = "budgetbati.investment.location";

// ── Aperçu financier en direct (miroir des calculs du moteur) ────────────────
// Recalcule les principaux indicateurs côté client à chaque saisie pour donner
// un aperçu immédiat avant le lancement de l'analyse IA.

function previewFinance(form: FormState) {
  const purchasePrice = Math.max(0, form.purchasePrice ?? 0);
  const acquisitionFees = Math.round(purchasePrice * ((form.acquisitionFeesPct ?? 0) / 100));
  const totalCost =
    purchasePrice +
    acquisitionFees +
    Math.max(0, form.financingFees ?? 0) +
    Math.max(0, form.agencyFees ?? 0) +
    Math.max(0, form.renovationCost ?? 0) +
    Math.max(0, form.furnishingCost ?? 0);

  const monthlyRent =
    form.rentMode === "nuit"
      ? Math.round((form.rentAmount ?? 0) * (365 / 12))
      : Math.max(0, form.rentAmount ?? 0);
  const occupancyRate = Math.min(100, Math.max(50, form.occupancyRate ?? 95));
  const grossAnnualRent = Math.round(monthlyRent * 12 * (occupancyRate / 100));
  const annualCharges =
    Math.max(0, form.annualCharges ?? 0) +
    Math.max(0, form.insurance ?? 0) +
    Math.max(0, form.managementFees ?? 0);
  const taxation = Math.round(grossAnnualRent * (Math.max(0, form.taxationPct ?? 0) / 100));
  const operatingExpenses = annualCharges + taxation;
  const netAnnualIncome = grossAnnualRent - operatingExpenses;
  const monthlyCashflow = Math.round(netAnnualIncome / 12);
  const netYieldPct = totalCost > 0 ? (netAnnualIncome / totalCost) * 100 : 0;
  const paybackYears = netAnnualIncome > 0 ? totalCost / netAnnualIncome : null;
  return { totalCost, grossAnnualRent, operatingExpenses, netAnnualIncome, monthlyCashflow, netYieldPct, paybackYears };
}

/** Projection simplifiée (loyers +5 %, charges +6 %, appréciation saisie). */
function projectPreview(form: FormState, years: number) {
  const base = previewFinance(form);
  let rent = base.grossAnnualRent;
  let expenses = base.operatingExpenses;
  let cumulative = 0;
  for (let y = 1; y <= years; y++) {
    rent *= 1.05;
    expenses *= 1.06;
    cumulative += Math.max(0, Math.round(rent) - Math.round(expenses));
  }
  const propertyValue = Math.round(
    (form.purchasePrice ?? 0) * Math.pow(1 + ((form.annualAppreciationPct ?? 5) / 100), years),
  );
  const profit = cumulative + (propertyValue - base.totalCost);
  return { profit, roi: base.totalCost > 0 ? (profit / base.totalCost) * 100 : 0 };
}

function loadSavedLocation(): Pick<FormState, "region" | "city" | "quartier"> | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { region?: string; city?: string; quartier?: string };
    const region = typeof parsed.region === "string" && REGION_CASCADE[parsed.region] ? parsed.region : "";
    if (!region) return null;
    const cities = REGION_CASCADE[region];
    const city =
      typeof parsed.city === "string" && cities.some((c) => c.name === parsed.city) ? parsed.city : "";
    const quartier = typeof parsed.quartier === "string" && city ? parsed.quartier : "";
    return { region, city, quartier };
  } catch {
    return null;
  }
}

export default function InvestmentAnalysis() {
  usePageSEO({
    title: "Analyse de rentabilité immobilière - BudgetBati",
    description: "Évaluez la rentabilité de vos investissements immobiliers en Tunisie avec l'IA : ROI, cash-flow, prévisions, scénarios et score d'investissement.",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<FormState>(() => {
    const prefill = (location.state as any)?.prefill as FormState | undefined;
    if (prefill) return { ...DEFAULT_FORM, ...prefill } as FormState;
    const saved = loadSavedLocation();
    return (saved ? { ...DEFAULT_FORM, ...saved } : DEFAULT_FORM) as FormState;
  });

  // Mémorise la dernière localisation pour la pré-remplir à la prochaine analyse.
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify({ region: form.region, city: form.city, quartier: form.quartier }),
      );
    } catch {
      // stockage indisponible : on ignore
    }
  }, [form.region, form.city, form.quartier]);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [running, setRunning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const zones = useQuery(api.investments.getInvestmentZones) || [];
  const saved = useQuery(api.investments.listAnalyses) || [];
  const runAnalysisAction = useAction(api.investmentAi.runAnalysis);
  const deleteAnalysis = useMutation(api.investments.deleteAnalysis);
  const toggleFavorite = useMutation(api.investments.toggleFavorite);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favBusyId, setFavBusyId] = useState<string | null>(null);

  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavBusyId(id);
    try {
      await toggleFavorite({ analysisId: id as any });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setFavBusyId(null);
    }
  };

  const displayedSaved = favoritesOnly ? saved.filter((s: any) => s.isFavorite) : saved;
  const favCount = saved.filter((s: any) => s.isFavorite).length;

  const set = (k: keyof typeof form, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const buildInput = (): InvestmentInput => ({
    name: form.name || undefined,
    investmentType: form.investmentType,
    purchasePrice: form.purchasePrice,
    area: form.area || undefined,
    region: form.region,
    city: form.city || undefined,
    quartier: form.quartier || undefined,
    rentMode: form.rentMode,
    rentAmount: form.rentAmount,
    monthlyRent: form.rentMode === "nuit" ? Math.round((form.rentAmount ?? 0) * (365 / 12)) : form.rentAmount,
    occupancyRate: form.occupancyRate,
    annualCharges: form.annualCharges,
    insurance: form.insurance,
    managementFees: form.managementFees,
    taxationPct: form.taxationPct,
    renovationCost: form.renovationCost,
    financingFees: form.financingFees,
    agencyFees: form.agencyFees,
    furnishingCost: form.furnishingCost,
    acquisitionFeesPct: form.acquisitionFeesPct,
    annualAppreciationPct: form.annualAppreciationPct ?? 5,
    rentGrowthPct: 5,
    inflationPct: 6,
    horizonYears: form.horizonYears,
  });

  const goStep = (s: number) => {
    if (s < 1 || s > STEPS.length) return;
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const goNext = () => {
    if (step === 1) {
      if (form.purchasePrice <= 0) { toast.error("Renseignez un prix d'achat valide."); return; }
      if (!form.region.trim()) { toast.error("Renseignez la région — champ obligatoire."); return; }
      if (!form.city.trim()) { toast.error("Renseignez la ville — champ obligatoire."); return; }
    }
    if (step === 2 && (form.rentAmount ?? 0) <= 0) { toast.error("Renseignez un loyer estimé valide."); return; }
    if (step === 3 && (form.horizonYears ?? 0) < 5) { toast.error("La durée prévue de l'investissement doit être d'au moins 5 ans."); return; }
    goStep(step + 1);
  };

  const handleAnalyze = async () => {
    if (form.purchasePrice <= 0) { toast.error("Renseignez un prix d'achat valide."); return; }
    if (!form.region.trim()) { toast.error("Renseignez la région — champ obligatoire."); return; }
    if (!form.city.trim()) { toast.error("Renseignez la ville — champ obligatoire."); return; }
    if ((form.rentAmount ?? 0) <= 0) { toast.error("Renseignez un loyer estimé valide."); return; }
    if ((form.horizonYears ?? 0) < 5) { toast.error("La durée prévue de l'investissement doit être d'au moins 5 ans."); return; }
    setRunning(true);
    try {
      const res = await runAnalysisAction({ input: buildInput() });
      const run = res as any;
      const id = run?._id as string | undefined;
      if (!id) throw new Error("L'analyse n'a pas pu être enregistrée.");
      toast.success("Analyse générée avec succès");
      navigate(`/dashboard/investments/result/${id}`, { state: { run } });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse");
    } finally {
      setRunning(false);
    }
  };

  const handleOpen = (doc: any) => {
    navigate(`/dashboard/investments/result/${doc._id}`, {
      state: { run: { _id: doc._id, input: doc.input, results: doc.results, aiInsights: doc.aiInsights } },
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette analyse ?")) return;
    setDeletingId(id);
    try {
      await deleteAnalysis({ analysisId: id as any });
      toast.success("Analyse supprimée");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setStep(1);
    toast("Formulaire réinitialisé", { description: "Saisissez les caractéristiques d'un nouveau bien." });
  };

  const scrollToForm = () => {
    document.getElementById("investment-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectedZone = zones.find((z: any) => z.region === form.region);
  const selectedUtility: ZoneUtility | null = resolveZoneUtility(form.city, form.quartier);

  // ── Loyer estimé : équivalent mensuel selon le mode (nuitée / mensuel) ──
  const effectiveMonthlyRent =
    form.rentMode === "nuit"
      ? Math.round((form.rentAmount ?? 0) * (365 / 12))
      : form.rentAmount ?? 0;
  const grossAnnualEstimate = Math.round(
    effectiveMonthlyRent * 12 * ((form.occupancyRate ?? 100) / 100),
  );

  // ── Aperçu financier en direct, recalculé à chaque modification ──
  const preview = previewFinance(form);
  const preview5 = projectPreview(form, 5);
  const preview10 = projectPreview(form, 10);

  // ── Autocomplétion en cascade : Région → Ville → Quartier ──
  // Chaque région affiche le nombre de villes disponibles, chaque ville le
  // nombre de quartiers prédéfinis (badge discret dans la liste déroulante).
  const regionOptions = zones.map((z: any) => {
    const n = REGION_CASCADE[z.region]?.length ?? 0;
    return { label: z.name, value: z.region, meta: `${n} ville${n > 1 ? "s" : ""}` };
  });
  const cascadeCities = REGION_CASCADE[form.region] ?? [];
  const villeOptions = cascadeCities.map((c) => {
    const n = c.quartiers?.length ?? 0;
    return {
      label: c.name,
      value: c.name,
      ...(n > 0 ? { meta: `${n} quartier${n > 1 ? "s" : ""}` } : {}),
    };
  });
  const selectedCity = cascadeCities.find((c) => c.name === form.city);
  const quartierOptions = (selectedCity?.quartiers?.length
    ? selectedCity.quartiers
    : cascadeCities.flatMap((c) => c.quartiers ?? [])
  )
    .filter((q, i, a) => a.indexOf(q) === i)
    .map((q) => ({ label: q, value: q }));
  const onVilleChange = (label: string) => {
    set("city", label);
    set("quartier", "");
  };

  // ── Validation visuelle par étape ────────────────────────────────────────
  const positive = (x: number | undefined) => typeof x === "number" && x > 0;
  const filled = (x: number | undefined, min = 0) => typeof x === "number" && x >= min;

  const fieldChecks = {
    region: form.region.trim() !== "",
    city: form.city.trim() !== "" && villeOptions.some((o) => o.label === form.city),
    purchasePrice: positive(form.purchasePrice),
    area: filled(form.area, 1),
    rentAmount: positive(form.rentAmount),
    occupancyRate: filled(form.occupancyRate, 1),
    annualCharges: filled(form.annualCharges, 0),
    insurance: filled(form.insurance, 0),
    managementFees: filled(form.managementFees, 0),
    taxationPct: filled(form.taxationPct, 0),
    financingFees: filled(form.financingFees, 0),
    acquisitionFeesPct: filled(form.acquisitionFeesPct, 0),
    agencyFees: filled(form.agencyFees, 0),
    furnishingCost: filled(form.furnishingCost, 0),
    amenagementCost: filled(form.renovationCost, 0),
    annualAppreciationPct: typeof form.annualAppreciationPct === "number" && form.annualAppreciationPct >= 4 && form.annualAppreciationPct <= 6,
    inflationPct: filled(form.inflationPct, 0),
    horizonYears: positive(form.horizonYears) && (form.horizonYears ?? 0) >= 5,
  };

  const REQUIRED_FIELDS: Record<number, string[]> = {
    1: ["region", "purchasePrice", "city"],
    2: ["rentAmount"],
    3: ["horizonYears"],
  };
  const reqFields = REQUIRED_FIELDS[step] ?? [];
  const reqDone = reqFields.filter((k) => (fieldChecks as any)[k]).length;
  const stepValid = reqDone === reqFields.length;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <nav className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <button
                onClick={() => navigate("/dashboard/investments")}
                className="transition-colors hover:text-primary cursor-pointer"
              >
                Analyses immobilières
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate font-medium text-foreground/80">Nouvelle analyse</span>
            </nav>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold truncate">Analyse de la rentabilité immobilière</h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Étape {step}/3 — {STEPS[step - 1].label} · marché tunisien 2026
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 lg:pb-0">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs shrink-0" onClick={() => navigate("/dashboard")}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              Tableau de bord
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs shrink-0" onClick={handleReset}>
              <Plus className="h-3.5 w-3.5" />
              Nouvelle analyse
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-4 sm:gap-6 items-start">
          <div className="space-y-4 lg:sticky lg:top-4">
            <Card id="investment-form" className="relative scroll-mt-4 border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
              <CardHeader className="p-3 sm:p-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
                    <Coins className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm">Informations de l'investissement</CardTitle>
                    <CardDescription className="text-[11px]">
                      Remplissez les 3 étapes puis lancez l'analyse
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {/* ═══ Stepper ═══ */}
              <div className="px-3 sm:px-4 pb-2">
                <div className="flex items-center gap-1 rounded-full bg-muted/40 p-1">
                  {STEPS.map((s) => {
                    const active = step === s.n;
                    const done = step > s.n;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.n}
                        type="button"
                        onClick={() => done && goStep(s.n)}
                        disabled={!done}
                        title={done ? `Revenir à l'étape ${s.n}` : undefined}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[10px] font-medium transition-all",
                          active && stepValid
                            ? "bg-emerald-600 text-white shadow-sm"
                            : active
                              ? "bg-indigo-600 text-white shadow-sm"
                              : done
                                ? "text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-500/10"
                                : "text-muted-foreground/60",
                        )}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="hidden sm:inline truncate">{s.label}</span>
                        {(done || (active && stepValid)) && <Check className="h-3 w-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 h-1 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                    animate={{ width: `${(step / STEPS.length) * 100}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px]">
                  <span className="text-muted-foreground/70">
                    Champs requis : <span className="tabular-nums">{reqDone}/{reqFields.length}</span>
                  </span>
                  {stepValid ? (
                    <span className="flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3 w-3" />
                      Étape complète
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">Complétez les champs requis</span>
                  )}
                </div>
              </div>

              <CardContent className="p-3 sm:p-4 pt-3">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="space-y-3.5"
                  >
                    {/* ── ÉTAPE 1 : LE BIEN ── */}
                    {step === 1 && (
                      <>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Type de bien</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {TYPE_ORDER.map((t) => {
                              const meta = TYPE_META[t];
                              const Icon = meta.icon;
                              const selected = form.investmentType === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => set("investmentType", t)}
                                  className={cn(
                                    "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-all active:scale-[0.97]",
                                    selected
                                      ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                                      : "border-border/40 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                                  )}
                                  title={meta.desc}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span className="text-[9px] leading-tight font-medium line-clamp-2">{meta.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Nom de l'analyse (optionnel)</label>
                          <Input
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            placeholder="Ex : Appartement La Marsa"
                            className="h-9 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <NumField label="Prix d'achat" value={form.purchasePrice} suffix="TND" required valid={fieldChecks.purchasePrice} onChange={(v) => set("purchasePrice", v ?? 0)} />
                          <NumField label="Surface (m²)" value={form.area} suffix="m²" valid={fieldChecks.area} onChange={(v) => set("area", v)} />
                        </div>

                        {/* ── Localisation : ordre chronologique Région → Ville → Quartier ── */}
                        <div className="space-y-2.5">
                          <LocationField
                            label="Région"
                            value={form.region}
                            options={regionOptions}
                            onSelect={(o) => {
                              set("region", o.value);
                              set("city", "");
                              set("quartier", "");
                            }}
                            placeholder="Choisir une région…"
                            required
                            valid={fieldChecks.region}
                            hint="Sélectionnez la région — ses villes s'affichent ensuite"
                          />
                          <LocationField
                            label="Ville"
                            value={form.city}
                            options={villeOptions}
                            onSelect={(o) => onVilleChange(o.label)}
                            placeholder={form.region ? "Choisir une ville…" : "Choisissez d'abord une région…"}
                            required
                            valid={fieldChecks.city}
                            hint="Choisissez la ville dans la liste — champ obligatoire"
                          />
                          <LocationField
                            label="Quartier (optionnel)"
                            value={form.quartier}
                            options={quartierOptions}
                            allowCustom
                            onTyping={(t) => set("quartier", t)}
                            onSelect={(o) => set("quartier", o.label)}
                            placeholder={form.city ? "Choisir un quartier…" : "Choisissez d'abord une ville…"}
                            hint={
                              form.city
                                ? selectedCity?.quartiers?.length
                                  ? `${selectedCity.quartiers.length} quartier${selectedCity.quartiers.length > 1 ? "s" : ""} disponibles pour ${form.city} — saisie libre possible`
                                  : "Aucune liste prédéfinie pour cette ville — saisie libre autorisée"
                                : "Choisissez d'abord une ville…"
                            }
                          />
                        </div>

                        {selectedZone && (
                          <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
                            <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Zone actuelle : {selectedZone.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                              {selectedZone.highlights?.join(" · ")}
                            </p>
                            {selectedUtility && (
                              <div className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2 py-1.5">
                                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Quartier reconnu : {selectedUtility.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed">
                                  Attractivité {selectedUtility.utilityIndex}/100 — la demande, les prix au m²,
                                  la valorisation et le risque de la zone sont ajustés par l'IA.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* ── ÉTAPE 2 : LOYER & CHARGES ── */}
                    {step === 2 && (
                      <>
                        {/* Loyer estimé : choix nuitée / mensuel */}
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                            Loyer estimé<span className="text-red-500"> *</span>
                          </label>
                          <div className="mb-2 grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (form.rentMode === "nuit") set("rentAmount", Math.round((form.rentAmount ?? 0) * (365 / 12)));
                                set("rentMode", "mensuel");
                              }}
                              className={cn(
                                "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all active:scale-[0.98]",
                                form.rentMode === "mensuel"
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border/40 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                              )}
                            >
                              <CalendarDays className="h-3.5 w-3.5" />
                              Mensuel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (form.rentMode === "mensuel") set("rentAmount", Math.round((form.rentAmount ?? 0) * (12 / 365)));
                                set("rentMode", "nuit");
                              }}
                              className={cn(
                                "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all active:scale-[0.98]",
                                form.rentMode === "nuit"
                                  ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                  : "border-border/40 text-muted-foreground hover:border-indigo-500/25 hover:text-foreground",
                              )}
                            >
                              <MoonStar className="h-3.5 w-3.5" />
                              À la nuitée
                            </button>
                          </div>
                          <div className={cn("grid gap-2.5", form.rentMode === "nuit" && "grid-cols-2")}>
                            <NumField
                              label={form.rentMode === "nuit" ? "Tarif par nuit" : "Loyer mensuel"}
                              value={form.rentAmount}
                              suffix={form.rentMode === "nuit" ? "TND/nuit" : "TND/mois"}
                              required
                              valid={fieldChecks.rentAmount}
                              onChange={(v) => set("rentAmount", v ?? 0)}
                            />
                            {form.rentMode === "nuit" && (
                              <div className="flex flex-col justify-center rounded-lg border border-border/30 bg-muted/20 px-2.5 py-1.5">
                                <p className="text-[10px] text-muted-foreground">Équivalent mensuel</p>
                                <p className="text-sm font-bold tabular-nums">≈ {fmtNum(effectiveMonthlyRent)} TND</p>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground/60">
                            {form.rentMode === "nuit"
                              ? "Location saisonnière : le taux d'occupation s'applique aux nuitées louées sur l'année."
                              : "Location annuelle : le taux d'occupation s'applique sur l'année."}
                          </p>
                        </div>

                        <NumField label="Taux d'occupation estimé" value={form.occupancyRate} suffix="%" step={1} valid={fieldChecks.occupancyRate} onChange={(v) => set("occupancyRate", v)} />

                        <p className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          <Receipt className="h-3 w-3" />
                          Charges d'exploitation annuelles (TND/an)
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          <NumField label="Charges annuelles" value={form.annualCharges} suffix="TND/an" valid={fieldChecks.annualCharges} onChange={(v) => set("annualCharges", v ?? 0)} />
                          <NumField label="Assurance" value={form.insurance} suffix="TND/an" valid={fieldChecks.insurance} onChange={(v) => set("insurance", v ?? 0)} />
                        </div>
                        <NumField label="Frais de gestion" value={form.managementFees} suffix="TND/an" hint="Si existant" valid={fieldChecks.managementFees} onChange={(v) => set("managementFees", v ?? 0)} />
                        <NumField label="Fiscalité" value={form.taxationPct} suffix="%" step={0.5} hint="Impôt sur les revenus locatifs — appliqué au loyer brut" valid={fieldChecks.taxationPct} onChange={(v) => set("taxationPct", v)} />

                        <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
                          <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <PiggyBank className="h-3 w-3" />
                            Estimation rapide
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                            Revenus locatifs bruts estimés :{" "}
                            <span className="font-semibold text-foreground tabular-nums">{fmtNum(grossAnnualEstimate)} TND/an</span>
                            {form.rentMode === "nuit" && form.rentAmount > 0 && (
                              <>
                                {" "}soit <span className="font-semibold text-foreground tabular-nums">{fmtNum(Math.round(grossAnnualEstimate / 12))} TND/mois</span>
                              </>
                            )}
                          </p>
                        </div>
                      </>
                    )}

                    {/* ── ÉTAPE 3 : COÛTS & HYPOTHÈSES ── */}
                    {step === 3 && (
                      <>
                        <p className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          <Coins className="h-3 w-3" />
                          Coûts d'acquisition
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          <NumField label="Frais de financement" value={form.financingFees} suffix="TND" valid={fieldChecks.financingFees} onChange={(v) => set("financingFees", v ?? 0)} />
                          <NumField label="Frais d'acquisition" value={form.acquisitionFeesPct} suffix="%" step={0.5} hint="Enregistrement + notaire" valid={fieldChecks.acquisitionFeesPct} onChange={(v) => set("acquisitionFeesPct", v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <NumField label="Frais d'agence" value={form.agencyFees} suffix="TND" hint="Si existant" valid={fieldChecks.agencyFees} onChange={(v) => set("agencyFees", v ?? 0)} />
                          <NumField label="Ameublement" value={form.furnishingCost} suffix="TND" hint="Si existant" valid={fieldChecks.furnishingCost} onChange={(v) => set("furnishingCost", v ?? 0)} />
                        </div>
                        <NumField label="Coût d'aménagement" value={form.renovationCost} suffix="TND" hint="Travaux, rénovation, équipements fixes" valid={fieldChecks.amenagementCost} onChange={(v) => set("renovationCost", v ?? 0)} />

                        <p className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          <TrendingUp className="h-3 w-3" />
                          Hypothèses du moteur
                        </p>
                        <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
                          <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Hypothèses fixes (marché tunisien 2026)
                          </p>
                          <div className="space-y-1 text-[10px] text-muted-foreground/70">
                            <p className="flex items-center justify-between">
                              <span>Inflation</span>
                              <span className="font-semibold text-foreground tabular-nums">6 %/an</span>
                            </p>
                            <p className="flex items-center justify-between">
                              <span>Évolution annuelle estimée des loyers</span>
                              <span className="font-semibold text-foreground tabular-nums">5 %/an</span>
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <label className="text-[11px] font-medium text-muted-foreground">Évolution annuelle de la valeur du bien</label>
                            <span className="flex items-center gap-1 text-[11px] font-bold tabular-nums text-primary">
                              {form.annualAppreciationPct ?? 5} %
                            </span>
                          </div>
                          <Slider
                            min={4}
                            max={6}
                            step={0.5}
                            value={[form.annualAppreciationPct ?? 5]}
                            onValueChange={(v) => set("annualAppreciationPct", v[0])}
                          />
                          <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground/60">
                            <span>4 %</span>
                            <span className="text-muted-foreground/40">Fourchette fixe 4–6 %</span>
                            <span>6 %</span>
                          </div>
                        </div>

                        <NumField label="Durée prévue de l'investissement" value={form.horizonYears} suffix="ans" step={1} required hint="Minimum 5 ans" valid={fieldChecks.horizonYears} onChange={(v) => set("horizonYears", v)} />

                        <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5">
                          <p className="text-[10px] font-semibold text-primary mb-1.5 flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            Récapitulatif
                          </p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                            <span className="text-muted-foreground">Bien</span>
                            <span className="font-semibold text-right truncate">{TYPE_META[form.investmentType]?.label}</span>
                            <span className="text-muted-foreground">Zone</span>
                            <span className="font-semibold text-right truncate">{selectedUtility ? `${selectedUtility.label}, ${selectedZone?.name ?? ""}` : selectedZone?.name ?? "—"}</span>
                            <span className="text-muted-foreground">Ville / Quartier</span>
                            <span className="font-semibold text-right truncate">{[form.city, form.quartier].filter(Boolean).join(" / ") || "—"}</span>
                            <span className="text-muted-foreground">Prix d'achat</span>
                            <span className="font-semibold text-right tabular-nums">{fmtNum(form.purchasePrice)} TND</span>
                            <span className="text-muted-foreground">Surface</span>
                            <span className="font-semibold text-right tabular-nums">{form.area ? `${fmtNum(form.area)} m²` : "—"}</span>
                            <span className="text-muted-foreground">Loyer estimé</span>
                            <span className="font-semibold text-right tabular-nums">
                              {form.rentMode === "nuit"
                                ? `${fmtNum(form.rentAmount ?? 0)} TND/nuit`
                                : `${fmtNum(form.rentAmount ?? 0)} TND/mois`}
                            </span>
                            <span className="text-muted-foreground">Taux d'occupation</span>
                            <span className="font-semibold text-right tabular-nums">{form.occupancyRate ?? "—"}%</span>
                            <span className="text-muted-foreground">Fiscalité</span>
                            <span className="font-semibold text-right tabular-nums">{form.taxationPct ?? 0}% du brut</span>
                          </div>
                        </div>

                        {/* ── Aperçu financier en direct ── */}
                        <div className="rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 p-2.5 dark:from-indigo-500/15 dark:to-blue-500/10">
                          <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            Aperçu financier en direct
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Kpi icon={Coins} label="Coût total" value={`${fmtNum(preview.totalCost)} TND`} sub="Prix + tous frais" tone="text-indigo-600 dark:text-indigo-400" />
                            <Kpi icon={TrendingUp} label="Revenus bruts / an" value={`${fmtNum(preview.grossAnnualRent)} TND`} sub="Loyers × occupation" tone="text-blue-600 dark:text-blue-400" />
                            <Kpi icon={Wallet} label="Revenu net / an" value={`${fmtNum(preview.netAnnualIncome)} TND`} tone={preview.netAnnualIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"} />
                            <Kpi icon={PiggyBank} label="Cash-flow / mois" value={`${fmtNum(preview.monthlyCashflow)} TND`} tone={preview.monthlyCashflow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"} />
                            <Kpi icon={Percent} label="Rentabilité nette" value={`${preview.netYieldPct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`} sub="Revenu net / coût total" />
                            <Kpi icon={CalendarClock} label="Récupération" value={preview.paybackYears ? `${fmtNum(Math.round(preview.paybackYears * 10) / 10)} ans` : "—"} sub="Retour du capital investi" tone="text-amber-600 dark:text-amber-400" />
                            <Kpi icon={Gauge} label="ROI 5 ans" value={`${preview5.roi.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`} tone={preview5.roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"} />
                            <Kpi icon={BarChart3} label="ROI 10 ans" value={`${preview10.roi.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`} tone={preview10.roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"} />
                          </div>
                          <p className="mt-2 text-[9px] text-muted-foreground/70 leading-relaxed">
                            Estimation indicative recalculée en direct — le rapport IA détaillé affinera ces
                            chiffres avec les hypothèses fixes du moteur (inflation 6 %, loyers +5 %/an, appréciation {form.annualAppreciationPct ?? 5} %).
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* ═══ Navigation ═══ */}
                <div className="mt-4 flex items-center gap-2 border-t border-border/20 pt-3">
                  {step > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-9 text-xs"
                      onClick={() => goStep(step - 1)}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Retour
                    </Button>
                  )}
                  {step < STEPS.length ? (
                    <Button
                      size="sm"
                      className={cn(
                        "ml-auto gap-1.5 h-9 text-xs text-white",
                        stepValid ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700",
                      )}
                      onClick={goNext}
                    >
                      Suivant
                      {stepValid ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="ml-auto gap-1.5 h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none sm:min-w-[180px]"
                      onClick={handleAnalyze}
                      disabled={running}
                    >
                      {running ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Analyse en cours…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Analyser avec l'IA
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-border/40 bg-background/50 backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Analyses enregistrées
                  <Badge variant="secondary" className="text-[9px] ml-auto">{favoritesOnly ? favCount : saved.length}</Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Ouvrez une analyse précédente pour revoir ses résultats
                </CardDescription>
                <div className="mt-2 flex items-center gap-1 rounded-lg border border-border/30 bg-muted/20 p-0.5">
                  <button
                    type="button"
                    onClick={() => setFavoritesOnly(false)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                      !favoritesOnly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Toutes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFavoritesOnly(true)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors flex items-center justify-center gap-1",
                      favoritesOnly ? "bg-background shadow-sm text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Star className="h-3 w-3" fill={favoritesOnly ? "currentColor" : "none"} />
                    Favoris
                    {favCount > 0 && <span className="tabular-nums">({favCount})</span>}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-1.5 max-h-72 overflow-y-auto">
                {saved.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/70 py-2">
                    Aucune analyse enregistrée. Lancez une analyse pour la sauvegarder automatiquement.
                  </p>
                ) : displayedSaved.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/70 py-2">
                    Aucune analyse en favori. Cliquez sur l'étoile d'une analyse pour la retrouver ici.
                  </p>
                ) : (
                  displayedSaved.map((doc: any) => (
                    <div
                      key={doc._id}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-border/30 px-2.5 py-2 transition-all cursor-pointer hover:border-primary/25 hover:bg-muted/30"
                      onClick={() => handleOpen(doc)}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate flex items-center gap-1">
                          {doc.isFavorite && <Star className="h-3 w-3 shrink-0 text-amber-500" fill="currentColor" />}
                          <span className="truncate">
                            {doc.input?.name || TYPE_META[doc.input?.investmentType as InvestmentType]?.label || "Analyse"}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {doc.results?.zone?.name} · Score {doc.results?.score?.total ?? "—"}/100 ·{" "}
                          {new Date(doc.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => handleToggleFavorite(doc._id, e)}
                          className={cn(
                            "p-1 rounded-md transition-colors",
                            doc.isFavorite
                              ? "text-amber-500 hover:text-amber-600"
                              : "text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-amber-500",
                          )}
                          title={doc.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          {favBusyId === doc._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Star className="h-3.5 w-3.5" fill={doc.isFavorite ? "currentColor" : "none"} />
                          )}
                        </button>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-muted-foreground hover:text-destructive"
                          title="Supprimer"
                        >
                          {deletingId === doc._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-4 sm:space-y-6">
            <div className="p-6 sm:p-10">
              <div className="relative">
                <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] mb-4">
                  <Sparkles className="h-3 w-3" /> Conseiller financier & immobilier par IA
                </Badge>
                <h2 className="text-xl sm:text-2xl font-extrabold max-w-xl leading-tight">
                  Analysez la rentabilité de votre investissement{" "}
                  <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-blue-400">en quelques secondes</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mt-2 leading-relaxed">
                  Renseignez les informations du bien à gauche puis lancez l'analyse. Le moteur IA calcule
                  automatiquement les indicateurs financiers, le ROI, la durée de récupération du capital,
                  les prévisions de bénéfices et le score d'investissement, puis génère un rapport PDF complet.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px]">
                    <Gauge className="h-3 w-3" /> Score IA /100
                  </Badge>
                  <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[10px]">
                    <TrendingUp className="h-3 w-3" /> 3 scénarios
                  </Badge>
                  <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300 text-[10px]">
                    <Layers className="h-3 w-3" /> 12 types de biens
                  </Badge>
                  <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-[10px]">
                    <MapPin className="h-3 w-3" /> 24 zones analysées
                  </Badge>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={scrollToForm}>
                    <Building2 className="h-4 w-4" />
                    Saisir mon investissement
                  </Button>
                  <Button variant="outline" className="gap-1.5" onClick={() => navigate("/dashboard")}>
                    Retour au tableau de bord
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {[
                { icon: Percent, label: "Rentabilité brute & nette", desc: "Rendement locatif calculé" },
                { icon: PiggyBank, label: "Cash-flow mensuel", desc: "Revenus moins charges" },
                { icon: CalendarClock, label: "Récupération du capital", desc: "Durée + date d'amortissement" },
                { icon: TrendingUp, label: "Prévisions IA", desc: "Gains à 1, 3, 5 et 10 ans" },
                { icon: Layers, label: "3 scénarios", desc: "Optimiste, réaliste, prudent" },
                { icon: BarChart3, label: "Comparaison", desc: "5 types de biens au même budget" },
                { icon: MapPin, label: "24 zones analysées", desc: "Gouvernorats de Tunisie" },
                { icon: Bot, label: "Assistant IA", desc: "Conseil personnalisé" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="group rounded-xl border border-border/30 bg-background/50 p-3 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 mb-2 transition-transform group-hover:scale-110">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <p className="text-[11px] font-semibold leading-tight">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{f.desc}</p>
                </div>
              ))}
            </div>

            <Card className="relative border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    Exemple de tableau de bord décisionnel
                  </CardTitle>
                  <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[9px]">
                    <Sparkles className="h-3 w-3" /> Aperçu du résultat
                  </Badge>
                </div>
                <CardDescription className="text-[11px]">
                  Voici ce que le moteur génère automatiquement après votre analyse
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <ScoreGauge score={94} grade="Très forte rentabilité et demande locative" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 shrink-0 lg:w-[560px]">
                    <Kpi icon={Coins} label="Coût total" value="338 240 TND" tone="text-indigo-600 dark:text-indigo-400" />
                    <Kpi icon={Percent} label="Rentabilité nette" value="6,2 %" tone="text-emerald-600 dark:text-emerald-400" />
                    <Kpi icon={Wallet} label="Cash-flow mensuel" value="+980 TND" tone="text-blue-600 dark:text-blue-400" />
                    <Kpi icon={CalendarClock} label="Récupération" value="9,5 ans" tone="text-amber-600 dark:text-amber-400" />
                    <Kpi icon={TrendingUp} label="ROI 10 ans" value="82 %" tone="text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/30 bg-muted/20 p-3">
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                    Aperçu statique à titre d'illustration — vos indicateurs, prévisions et recommandations
                    sont calculés à partir de vos données réelles.
                  </p>
                  <Button
                    size="sm"
                    className="ml-auto gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
                    onClick={scrollToForm}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Analyser mon investissement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}


