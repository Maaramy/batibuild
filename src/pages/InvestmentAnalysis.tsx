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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePageSEO } from "@/hooks/use-page-seo";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  DEFAULT_FORM,
  TYPE_META,
  TYPE_ORDER,
  NumField,
  ScoreGauge,
  fmtNum,
} from "@/components/investment/shared";
import type { FormState, InvestmentInput, InvestmentType } from "@/components/investment/shared";

// ============================================================================
// Page d'analyse — saisie de l'investissement en 3 étapes puis navigation
// vers la page de résultats.
// ============================================================================

const STEPS = [
  { n: 1, label: "Le bien", icon: Building2 },
  { n: 2, label: "Revenus & charges", icon: Coins },
  { n: 3, label: "Hypothèses", icon: TrendingUp },
];

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -32 }),
};

export default function InvestmentAnalysis() {
  usePageSEO({
    title: "Analyse de rentabilité immobilière - BudgetBati",
    description: "Évaluez la rentabilité de vos investissements immobiliers en Tunisie avec l'IA : ROI, cash-flow, prévisions, scénarios et score d'investissement.",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<FormState>(() => {
    const prefill = (location.state as any)?.prefill as FormState | undefined;
    return (prefill ? { ...DEFAULT_FORM, ...prefill } : DEFAULT_FORM) as FormState;
  });
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [running, setRunning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const zones = useQuery(api.investments.getInvestmentZones) || [];
  const saved = useQuery(api.investments.listAnalyses) || [];
  const runAnalysisAction = useAction(api.investmentAi.runAnalysis);
  const deleteAnalysis = useMutation(api.investments.deleteAnalysis);

  const set = (k: keyof typeof form, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const buildInput = (): InvestmentInput => ({
    name: form.name || undefined,
    investmentType: form.investmentType,
    purchasePrice: form.purchasePrice,
    area: form.area || undefined,
    region: form.region,
    city: form.city || undefined,
    monthlyRent: form.monthlyRent,
    occupancyRate: form.occupancyRate,
    annualExpensesPct: form.annualExpensesPct,
    renovationCost: form.renovationCost,
    acquisitionFeesPct: form.acquisitionFeesPct,
    annualAppreciationPct: form.annualAppreciationPct,
    rentGrowthPct: form.rentGrowthPct,
    inflationPct: form.inflationPct,
    horizonYears: form.horizonYears,
  });

  const goStep = (s: number) => {
    if (s < 1 || s > STEPS.length) return;
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const goNext = () => {
    if (step === 1 && form.purchasePrice <= 0) { toast.error("Renseignez un prix d'achat valide."); return; }
    if (step === 2 && form.monthlyRent < 0) { toast.error("Renseignez un loyer mensuel valide."); return; }
    goStep(step + 1);
  };

  const handleAnalyze = async () => {
    if (form.purchasePrice <= 0) { toast.error("Renseignez un prix d'achat valide."); return; }
    if (form.monthlyRent < 0) { toast.error("Renseignez un loyer mensuel valide."); return; }
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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold">Analyse de la rentabilité immobilière</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Étape {step}/3 — {STEPS[step - 1].label} · marché tunisien 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => navigate("/dashboard")}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              Retour
            </Button>
            <Button size="sm" className="gap-1.5 h-8 text-xs" variant="outline" onClick={handleReset}>
              <Plus className="h-3.5 w-3.5" />
              Nouvelle analyse
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-4 sm:gap-6 items-start">
          <div className="space-y-4 lg:sticky lg:top-4">
            <Card id="investment-form" className="scroll-mt-4 border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="p-3 sm:p-4 pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  Informations de l'investissement
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Remplissez les 3 étapes puis lancez l'analyse
                </CardDescription>
              </CardHeader>

              {/* ═══ Stepper ═══ */}
              <div className="px-3 sm:px-4 pb-2">
                <div className="flex items-center gap-1.5">
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
                          "group flex flex-1 items-center gap-2 rounded-lg border px-2 py-1.5 transition-all",
                          active
                            ? "border-primary/30 bg-primary/10"
                            : done
                              ? "border-border/30 hover:border-emerald-500/30 hover:bg-emerald-500/5 cursor-pointer"
                              : "border-border/20 opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                            active ? "bg-indigo-600 text-white" : done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                        </span>
                        <span
                          className={cn(
                            "hidden sm:block text-[10px] font-medium truncate",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {s.label}
                        </span>
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
                          <NumField label="Prix d'achat" value={form.purchasePrice} suffix="TND" onChange={(v) => set("purchasePrice", v ?? 0)} />
                          <NumField label="Surface (m²)" value={form.area} suffix="m²" onChange={(v) => set("area", v)} />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Gouvernorat</label>
                          <select
                            value={form.region}
                            onChange={(e) => set("region", e.target.value)}
                            className="h-9 w-full rounded-lg border border-border/50 bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                          >
                            {zones.map((z: any) => (
                              <option key={z.region} value={z.region}>{z.name}</option>
                            ))}
                          </select>
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
                          </div>
                        )}
                      </>
                    )}

                    {/* ── ÉTAPE 2 : REVENUS & CHARGES ── */}
                    {step === 2 && (
                      <>
                        <div className="grid grid-cols-2 gap-2.5">
                          <NumField label="Loyer mensuel" value={form.monthlyRent} suffix="TND" onChange={(v) => set("monthlyRent", v ?? 0)} />
                          <NumField label="Taux d'occupation" value={form.occupancyRate} suffix="%" step={1} onChange={(v) => set("occupancyRate", v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <NumField label="Charges annuelles" value={form.annualExpensesPct} suffix="%" step={0.5} onChange={(v) => set("annualExpensesPct", v)} />
                          <NumField label="Frais d'acquisition" value={form.acquisitionFeesPct} suffix="%" step={0.5} onChange={(v) => set("acquisitionFeesPct", v)} />
                        </div>
                        <div className="col-span-2">
                          <NumField label="Travaux de rénovation" value={form.renovationCost} suffix="TND" onChange={(v) => set("renovationCost", v ?? 0)} />
                        </div>
                        <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
                          <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <PiggyBank className="h-3 w-3" />
                            Estimation rapide
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                            Revenus locatifs bruts estimés :{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {fmtNum(Math.round(form.monthlyRent * 12 * (form.occupancyRate ?? 100) / 100))} TND/an
                            </span>
                          </p>
                        </div>
                      </>
                    )}

                    {/* ── ÉTAPE 3 : HYPOTHÈSES ── */}
                    {step === 3 && (
                      <>
                        <div className="grid grid-cols-2 gap-2.5">
                          <NumField
                            label="Appréciation annuelle"
                            value={form.annualAppreciationPct}
                            suffix="%"
                            step={0.5}
                            hint="Vide = moyenne de la zone"
                            onChange={(v) => set("annualAppreciationPct", v)}
                          />
                          <NumField label="Croissance des loyers" value={form.rentGrowthPct} suffix="%" step={0.5} onChange={(v) => set("rentGrowthPct", v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <NumField label="Inflation" value={form.inflationPct} suffix="%" step={0.5} onChange={(v) => set("inflationPct", v)} />
                          <NumField label="Horizon (années)" value={form.horizonYears} suffix="ans" step={1} onChange={(v) => set("horizonYears", v)} />
                        </div>

                        <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5">
                          <p className="text-[10px] font-semibold text-primary mb-1.5 flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            Récapitulatif
                          </p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                            <span className="text-muted-foreground">Bien</span>
                            <span className="font-semibold text-right truncate">{TYPE_META[form.investmentType]?.label}</span>
                            <span className="text-muted-foreground">Zone</span>
                            <span className="font-semibold text-right truncate">{selectedZone?.name ?? "—"}</span>
                            <span className="text-muted-foreground">Prix d'achat</span>
                            <span className="font-semibold text-right tabular-nums">{fmtNum(form.purchasePrice)} TND</span>
                            <span className="text-muted-foreground">Surface</span>
                            <span className="font-semibold text-right tabular-nums">{form.area ? `${fmtNum(form.area)} m²` : "—"}</span>
                            <span className="text-muted-foreground">Loyer / mois</span>
                            <span className="font-semibold text-right tabular-nums">{fmtNum(form.monthlyRent)} TND</span>
                            <span className="text-muted-foreground">Taux d'occupation</span>
                            <span className="font-semibold text-right tabular-nums">{form.occupancyRate ?? "—"}%</span>
                          </div>
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
                      className="ml-auto gap-1.5 h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={goNext}
                    >
                      Suivant
                      <ArrowRight className="h-3.5 w-3.5" />
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

            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Analyses enregistrées
                  <Badge variant="secondary" className="text-[9px] ml-auto">{saved.length}</Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Ouvrez une analyse précédente pour revoir ses résultats
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-1.5 max-h-72 overflow-y-auto">
                {saved.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/70 py-2">
                    Aucune analyse enregistrée. Lancez une analyse pour la sauvegarder automatiquement.
                  </p>
                ) : (
                  saved.map((doc: any) => (
                    <div
                      key={doc._id}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-border/30 px-2.5 py-2 transition-all cursor-pointer hover:border-primary/25 hover:bg-muted/30"
                      onClick={() => handleOpen(doc)}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {doc.input?.name || TYPE_META[doc.input?.investmentType as InvestmentType]?.label || "Analyse"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {doc.results?.zone?.name} · Score {doc.results?.score?.total ?? "—"}/100 ·{" "}
                          {new Date(doc.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
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
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 via-background to-background p-6 sm:p-10">
              <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="relative">
                <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] mb-4">
                  <Sparkles className="h-3 w-3" /> Conseiller financier & immobilier par IA
                </Badge>
                <h2 className="text-xl sm:text-2xl font-extrabold max-w-xl leading-tight">
                  Analysez la rentabilité de votre investissement{" "}
                  <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">en quelques secondes</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mt-2 leading-relaxed">
                  Renseignez les informations du bien à gauche puis lancez l'analyse. Le moteur IA calcule
                  automatiquement les indicateurs financiers, le ROI, la durée de récupération du capital,
                  les prévisions de bénéfices et le score d'investissement, puis génère un rapport PDF complet.
                </p>
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 mb-2 transition-transform group-hover:scale-110">
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
                  <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-500 text-[9px]">
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
                    <MockKpi icon={Coins} label="Coût total" value="338 240 TND" tone="text-indigo-600 dark:text-indigo-400" />
                    <MockKpi icon={Percent} label="Rentabilité nette" value="6,2 %" tone="text-emerald-600 dark:text-emerald-400" />
                    <MockKpi icon={Wallet} label="Cash-flow mensuel" value="+980 TND" tone="text-blue-600 dark:text-blue-400" />
                    <MockKpi icon={CalendarClock} label="Récupération" value="9,5 ans" tone="text-amber-600 dark:text-amber-400" />
                    <MockKpi icon={TrendingUp} label="ROI 10 ans" value="82 %" tone="text-violet-600 dark:text-violet-400" />
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

function MockKpi({ icon: Icon, label, value, tone = "text-foreground" }: {
  icon: any; label: string; value: string; tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-muted/10 p-2.5 sm:p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg bg-muted/30 border border-border/30", tone)}>
          <Icon className="h-3 w-3" />
        </div>
        <p className="text-[10px] text-muted-foreground font-medium truncate">{label}</p>
      </div>
      <p className="text-sm font-bold tabular-nums truncate">{value}</p>
    </div>
  );
}
