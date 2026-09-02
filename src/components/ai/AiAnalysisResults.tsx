import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Sparkles, HardHat, Loader2,
  PiggyBank, Zap, Check, Info, Layers,
  TrendingDown, TrendingUp, Minus, Wand2, Gauge, CalendarDays,
  BadgeCheck, Crown, CircleDollarSign,
  CircleDot, Store, Trophy, FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { COPILOT_CATEGORY_BY_ID, type RecommendResult, type MaterialScores } from "@/convex/aiMaterialsEngine";
import { generateMaterialReportPdf } from "@/lib/materialReportPdf";
import { CategoryUsedArticles, type UsedArticleRow } from "@/components/ai/CategoryUsedArticles";

// ── Helpers ──────────────────────────────────────────────────────────────────
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-TN", { maximumFractionDigits: digits }).format(n);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const PROFILE_META: Record<string, { label: string; color: string; icon: any; badge: string }> = {
  economique: { label: "Économique", color: "emerald", icon: TrendingDown, badge: "Meilleur prix" },
  equilibre: { label: "Équilibrée", color: "blue", icon: Minus, badge: "Meilleur rapport qualité/prix" },
  premium: { label: "Premium", color: "violet", icon: TrendingUp, badge: "Meilleure performance" },
};

const PROFILE_TEXT: Record<string, string> = {
  economique: "text-emerald-600 dark:text-emerald-400",
  equilibre: "text-blue-600 dark:text-blue-400",
  premium: "text-violet-600 dark:text-violet-400",
};

const CRITERIA: { key: keyof MaterialScores; label: string }[] = [
  { key: "prix", label: "Prix" },
  { key: "qualite", label: "Qualité" },
  { key: "durabilite", label: "Durabilité" },
  { key: "isolationThermique", label: "Isolation thermique" },
  { key: "isolationAcoustique", label: "Isolation acoustique" },
  { key: "resistance", label: "Résistance" },
  { key: "entretien", label: "Entretien" },
  { key: "disponibilite", label: "Disponibilité" },
  { key: "impactEnvironnemental", label: "Impact environnemental" },
];

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

// Articles réellement intégrés au projet pour une catégorie : on reprend les
// matériaux retenus dans les solutions, dédoublonnés par article.
function usedArticlesFor(cat: RecommendResult["categories"][number]): UsedArticleRow[] {
  const seen = new Map<string, UsedArticleRow>();
  for (const s of cat.solutions) {
    if (seen.has(s.material.id)) continue;
    seen.set(s.material.id, {
      id: s.material.id,
      name: s.material.name,
      brand: s.material.brand,
      unit: s.material.unit,
      unitPrice: s.material.band.avg,
      quantity: s.material.quantity,
      quantityUnit: s.material.quantityUnit,
      totalTTC: s.material.totalCost,
      score: s.scores.noteGlobale,
    });
  }
  return [...seen.values()];
}

// ═══════════════════════════════════════════════════════════════════════════
// RÉSULTATS DE L'ANALYSE MATÉRIAUX IA (page dédiée)
// ═══════════════════════════════════════════════════════════════════════════
export function AiAnalysisResults({ result }: { result: RecommendResult }) {
  const optimizeCopilotBudget = useAction(api.aiMaterialsActions.optimizeCopilotBudget);
  const improveCopilotPerformance = useAction(api.aiMaterialsActions.improveCopilotPerformance);
  const deleteAnalysis = useMutation(api.aiMaterials.deleteCopilotAnalysis);

  const [optimization, setOptimization] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  // Budget par défaut (85 % du total estimé)
  const [budgetInput, setBudgetInput] = useState(() =>
    Math.max(1000, Math.round(result.cost.total * 0.85)),
  );

  const runOptimize = async () => {
    if (!result || budgetInput <= 0) return;
    setBusy((b) => ({ ...b, optimize: true }));
    try {
      const res = await optimizeCopilotBudget({ result, budgetAmount: budgetInput });
      setOptimization(res);
      toast.success(`Économie potentielle : ${fmtTnd(res.savings)}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setBusy((b) => ({ ...b, optimize: false }));
  };

  const runPerformance = async () => {
    if (!result) return;
    setBusy((b) => ({ ...b, performance: true }));
    try {
      const res = await improveCopilotPerformance({ result });
      setPerformance(res);
      toast.success(res.improvements.length ? `${res.improvements.length} amélioration(s) suggérée(s)` : "Aucune amélioration nécessaire — votre sélection est déjà performante.");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setBusy((b) => ({ ...b, performance: false }));
  };

  const handlePdf = () => {
    try {
      generateMaterialReportPdf({ result, optimization: optimization || undefined, performance: performance || undefined });
      toast.success("Rapport PDF généré.");
    } catch (err: any) {
      toast.error("Erreur PDF : " + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Recommandation finale */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border border-emerald-500/30 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 overflow-hidden rounded-xl">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <Sparkles className="h-3 w-3" /> Notre recommandation
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-[10px]">
                <Gauge className="h-3 w-3" /> Score {result.recommendation.score}/100
              </Badge>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs ml-auto" onClick={handlePdf}>
                <FileDown className="h-3 w-3" />
                Rapport PDF
              </Button>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-base sm:text-xl font-extrabold tracking-tight">
                Solution {result.recommendation.solution === "economique" ? "A" : result.recommendation.solution === "equilibre" ? "B" : "C"} — {PROFILE_META[result.recommendation.solution]?.label}
              </h3>
              <span className="text-xs text-muted-foreground">· {result.recommendation.materialName} ({result.recommendation.categoryLabel})</span>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">{result.recommendation.explanation}</p>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              {result.recommendation.advantages.length > 0 && (
                <ul className="space-y-1">
                  {result.recommendation.advantages.slice(0, 3).map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3 w-3 mt-0.5 shrink-0" /> {a}
                    </li>
                  ))}
                </ul>
              )}
              {result.recommendation.limits.length > 0 && (
                <ul className="space-y-1">
                  {result.recommendation.limits.slice(0, 3).map((l, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" /> {l}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground/70 italic">
              Recommandation générée le {fmtDate(result.generatedAt)} — aide à la décision fondée sur le catalogue 2026 et les offres recensées.
              Elle ne remplace pas la validation d'un ingénieur ou d'un architecte.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Coût total */}
      <Card className="border border-border/40 overflow-hidden rounded-xl">
        <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CircleDollarSign className="h-3.5 w-3.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Coût total estimatif</CardTitle>
              <CardDescription className="text-[10px]">Matériaux · Pose · Transport · Déchets · Accessoires · Imprévus · TVA 19%</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 lg:col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total estimé (probable)</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{fmtTnd(result.cost.total)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{fmtTnd(result.cost.perM2)} / m² construit</p>
            </div>
            <div className="rounded-xl border border-border/40 p-3.5">
              <p className="text-[10px] text-muted-foreground">Fourchette</p>
              <p className="text-sm font-bold mt-1">{fmtTnd(result.cost.min)}</p>
              <p className="text-xs text-muted-foreground">— minimum —</p>
              <p className="text-sm font-bold mt-1 text-amber-600">{fmtTnd(result.cost.max)}</p>
              <p className="text-xs text-muted-foreground">— maximum —</p>
            </div>
            <div className="rounded-xl border border-border/40 p-3.5">
              <p className="text-[10px] text-muted-foreground">Prix indicatif du marché</p>
              <p className="text-sm font-bold mt-1 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {fmtDate(result.cost.priceDate || result.generatedAt)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2">Dernière mise à jour des données</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: "Matériaux", value: result.cost.materials },
              { label: "Pose", value: result.cost.pose },
              { label: "Transport", value: result.cost.transport },
              { label: "Déchets", value: result.cost.waste },
              { label: "Accessoires", value: result.cost.accessories },
              { label: "Imprévus", value: (result.cost as any).contingency ?? 0 },
              { label: "TVA", value: result.cost.tva },
              { label: "Total TTC", value: result.cost.total, strong: true },
            ].map((row, i) => (
              <div key={i} className={cn("rounded-lg border px-2.5 py-2", row.strong ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/30 bg-muted/10")}>
                <p className="text-[9px] text-muted-foreground">{row.label}</p>
                <p className={cn("text-xs font-bold", row.strong ? "text-emerald-600" : "")}>{fmtTnd(row.value)}</p>
              </div>
            ))}
          </div>
          {result.missingData.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Données non disponibles (signalées, jamais inventées)
              </p>
              <ul className="mt-1 space-y-0.5">
                {result.missingData.map((m, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground">• {m}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solutions par catégorie */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight">Recommandations par catégorie — 3 solutions comparées</h2>
        </div>
        {result.categories.map((cat) => {
          const recProfile = result.recommendation.solution;
          const cheapest = [...cat.solutions].sort((a, b) => a.material.band.avg - b.material.band.avg)[0];
          const bestPerf = [...cat.solutions].sort(
            (a, b) => b.scores.isolationThermique + b.scores.isolationAcoustique - (a.scores.isolationThermique + a.scores.isolationAcoustique),
          )[0];
          return (
            <motion.div key={cat.categoryId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-border/40 overflow-hidden rounded-xl">
                <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <HardHat className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{cat.label}</CardTitle>
                        <CardDescription className="text-[10px]">{cat.candidatesCount} matériaux analysés dans la base</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] gap-1">
                        <CircleDot className="h-2.5 w-2.5 text-emerald-600" /> Meilleur rapport qualité/prix : {PROFILE_META[cat.bestValue]?.label}
                      </Badge>
                      {cat.bestSupplier ? (
                        <Badge variant="outline" className="text-[9px] gap-1 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400">
                          <Trophy className="h-2.5 w-2.5" /> Meilleur fournisseur : {cat.bestSupplier.name} — dès {fmtTnd(cat.bestSupplier.price)}
                          {cat.bestSupplier.governorate ? ` · ${cat.bestSupplier.governorate}` : ""}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="grid md:grid-cols-3 gap-3">
                    {cat.solutions.map((s) => {
                      const meta = PROFILE_META[s.profile];
                      const isRec = s.profile === recProfile;
                      const isCheapest = cheapest && s.material.id === cheapest.material.id;
                      const isBestPerf = bestPerf && s.material.id === bestPerf.material.id;
                      return (
                        <div key={s.profile} className={cn(
                          "relative rounded-xl border p-3.5 flex flex-col transition-all",
                          isRec ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "border-border/40 bg-background",
                        )}>
                          {isRec && (
                            <Badge className="absolute -top-2 left-3 gap-1 border-emerald-500/40 bg-emerald-500 text-white text-[9px]">
                              <Sparkles className="h-2.5 w-2.5" /> Recommandé par IA
                            </Badge>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-xs font-bold uppercase tracking-wide", PROFILE_TEXT[s.profile])}>
                              {meta.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black tabular-nums">{s.scores.noteGlobale}<span className="text-[10px] text-muted-foreground">/100</span></span>
                            </div>
                          </div>
                          <p className="mt-1 text-sm font-semibold leading-snug">{s.material.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {fmtTnd(s.material.band.avg)}/{s.material.unit} · Qté {fmtNum(s.material.quantity)} {s.material.quantityUnit}
                            {s.material.brand ? ` · ${s.material.brand}` : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {isCheapest && <Badge className="text-[8px] gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30"><TrendingDown className="h-2.5 w-2.5" /> Meilleur prix</Badge>}
                            {cat.bestValue === s.profile && <Badge className="text-[8px] gap-1 bg-blue-500/10 text-blue-700 border-blue-500/30"><BadgeCheck className="h-2.5 w-2.5" /> {PROFILE_META.equilibre.badge}</Badge>}
                            {isBestPerf && s.profile !== cat.bestValue && <Badge className="text-[8px] gap-1 bg-violet-500/10 text-violet-700 border-violet-500/30"><Crown className="h-2.5 w-2.5" /> {PROFILE_META.premium.badge}</Badge>}
                          </div>
                          <div className="mt-2 grid grid-cols-5 gap-1 text-center">
                            {CRITERIA.map((c) => (
                              <div key={c.key} className="rounded bg-muted/30 py-1" title={c.label}>
                                <p className="text-[8px] text-muted-foreground truncate">{c.label.split(" ")[0]}</p>
                                <p className={cn("text-[10px] font-bold", scoreColor(s.scores[c.key]))}>{s.scores[c.key]}</p>
                              </div>
                            ))}
                          </div>
                          {(s as any).justification && (
                            <p className="mt-2 text-[10px] text-muted-foreground/80 leading-relaxed border-l-2 border-primary/30 pl-2 italic">
                              {(s as any).justification}
                            </p>
                          )}
                          <ul className="mt-2 space-y-0.5 flex-1">
                            {s.pros.slice(0, 2).map((p, i) => (
                              <li key={i} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                                <Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" /> {p}
                              </li>
                            ))}
                          </ul>
                          {s.suppliers.length > 0 && (
                            <div className="mt-2 rounded-lg border border-border/30 bg-muted/10 px-2.5 py-1.5">
                              <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                                <Store className="h-2.5 w-2.5" /> Fournisseurs dès {fmtTnd(s.suppliers[0].price)}
                              </p>
                              {s.suppliers.slice(0, 2).map((sup, i) => (
                                <p key={i} className="text-[9px] text-muted-foreground truncate">
                                  {sup.name} {sup.governorate ? `· ${sup.governorate}` : ""}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Articles réellement utilisés dans le projet ── */}
                  <CategoryUsedArticles
                    categoryLabel={cat.label}
                    rows={usedArticlesFor(cat)}
                    count={cat.candidatesCount}
                    catalogCategories={COPILOT_CATEGORY_BY_ID[cat.categoryId]?.catalogCategories ?? []}
                  />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Outils IA */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Optimiser le budget */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <PiggyBank className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Optimiser mon budget avec l'IA</CardTitle>
                <CardDescription className="text-[10px]">Réduisez le coût sans dégrader excessivement qualité, sécurité et confort</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input type="number" min={1000} value={budgetInput || ""}
                onChange={(e) => setBudgetInput(Number(e.target.value))}
                placeholder="Budget maximum (TND)" className="h-9 text-sm rounded-lg flex-1" />
              <Button size="sm" className="h-9 gap-1.5 text-xs shrink-0" disabled={busy.optimize} onClick={runOptimize}>
                {busy.optimize ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                Optimiser
              </Button>
            </div>
            {optimization && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 sm:p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border/30 px-3 py-2 text-center">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">Budget initial</p>
                    <p className="text-sm sm:text-base font-bold tabular-nums">{fmtTnd(optimization.originalTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-border/30 px-3 py-2 text-center">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">Budget optimisé</p>
                    <p className="text-sm sm:text-base font-bold tabular-nums text-emerald-600">{fmtTnd(optimization.optimizedTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-center">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">Économie</p>
                    <p className="text-sm sm:text-base font-bold tabular-nums text-emerald-600">{fmtTnd(optimization.savings)} <span className="text-[10px] sm:text-xs font-semibold">({optimization.savingsPct}%)</span></p>
                  </div>
                </div>
                {optimization.changes.length > 0 ? (
                  <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {optimization.changes.map((c: any, i: number) => (
                      <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                        <TrendingDown className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                        <span><b>{c.categoryLabel}</b> : {c.from} → {c.to} (−{fmtTnd(c.saving)})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Aucune substitution nécessaire : votre sélection est déjà au meilleur rapport valeur/prix.</p>
                )}
                {optimization.summary && <p className="text-[10px] text-muted-foreground italic">{optimization.summary}</p>}
                <p className="text-[9px] text-amber-700 dark:text-amber-400/80 italic">{optimization.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Améliorer la performance */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Améliorer la performance énergétique</CardTitle>
                <CardDescription className="text-[10px]">Réduire les pertes thermiques et le besoin de climatisation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <Button size="sm" className="h-9 gap-1.5 text-xs" disabled={busy.performance} onClick={runPerformance}>
              {busy.performance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Analyser les améliorations
            </Button>
            {performance && (
              <div className="space-y-2">
                {performance.improvements.length > 0 ? (
                  <>
                    <ul className="space-y-1.5">
                      {performance.improvements.map((imp: any, i: number) => (
                        <li key={i} className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-[10px] text-muted-foreground">
                          <b>{imp.categoryLabel}</b> : {imp.from} → {imp.to}
                          <span className="block text-sky-700 dark:text-sky-400 mt-0.5">{imp.benefit} · économie estimée {imp.estimatedSavingPct}%</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-0.5">
                      {performance.assumptions.map((a: string, i: number) => (
                        <li key={i} className="flex items-start gap-1 text-[9px] text-muted-foreground/80 italic">
                          <Info className="h-2.5 w-2.5 mt-0.5 shrink-0" /> {a}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Aucune amélioration nécessaire : votre sélection est déjà la plus performante sur le plan thermique/acoustique.</p>
                )}
                <p className="text-[9px] text-muted-foreground/70 italic">{performance.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
