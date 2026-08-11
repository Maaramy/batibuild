import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Check, Loader2, AlertTriangle, Gauge, ArrowRight, Wand2, X,
} from "lucide-react";
import type { GeneratedPlan, PlanRequest, OptimizeResult } from "@/convex/planEngine";
import { optimizePlan } from "@/convex/planEngine";
import { FloorPlan2D } from "@/components/plans/FloorPlanView";
import { cn } from "@/lib/utils";

// ============================================================================
// Optimisation automatique du plan par l'IA — les améliorations sont affichées
// AVANT validation : l'utilisateur choisit d'appliquer ou non la version optimisée.
// ============================================================================

export function PlanOptimizeModal({
  plan,
  request,
  open,
  onClose,
  onApply,
}: {
  plan: GeneratedPlan;
  request: PlanRequest;
  open: boolean;
  onClose: () => void;
  onApply: (optimized: GeneratedPlan) => void;
}) {
  const [thinking, setThinking] = useState(true);
  const [result, setResult] = useState<OptimizeResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setThinking(true);
    setResult(null);
    // Petite latence « IA » pour la lisibilité de l'animation
    const t = setTimeout(() => {
      setResult(optimizePlan(plan, request));
      setThinking(false);
    }, 650);
    return () => clearTimeout(t);
  }, [open, plan, request]);

  const diff = useMemo(() => {
    if (!result) return 0;
    return result.after.score - result.before.score;
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">
          Optimisation du plan {String(plan.index).padStart(2, "0")} par l'IA
        </DialogTitle>

        {/* Cartouche */}
        <div className="shrink-0 bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Wand2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate flex items-center gap-2">
                Optimiser automatiquement le plan avec l'IA
                {result && (
                  <Badge className="bg-emerald-500/90 text-white border-0 text-[9px]">
                    <Check className="h-2.5 w-2.5" /> Analyse terminée
                  </Badge>
                )}
              </p>
              <p className="text-[10px] text-white/80 truncate">
                Plan {String(plan.index).padStart(2, "0")} — {plan.name}
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/15" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {thinking ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600"
              >
                <Sparkles className="h-6 w-6" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold">L'IA analyse le plan…</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Circulation, dimensions, éclairage naturel, mobilier, confort et coûts.
                </p>
              </div>
            </div>
          ) : result ? (
            <>
              {/* Scores avant / après */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="rounded-xl border border-border/40 bg-card/40 px-4 py-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Qualité avant</p>
                  <p className="text-2xl font-bold tabular-nums text-muted-foreground">{result.before.score}<span className="text-xs font-medium">/100</span></p>
                  <Progress value={result.before.score} className="mt-2 h-1.5 [&>div]:bg-slate-400" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {result.before.count.error} erreur(s) · {result.before.count.warning} alerte(s)
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                  <span className={cn("text-[10px] font-bold tabular-nums", diff > 0 ? "text-emerald-600" : "text-slate-500")}>
                    {diff > 0 ? `+${diff}` : diff}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Qualité après</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{result.after.score}<span className="text-xs font-medium">/100</span></p>
                  <Progress value={result.after.score} className="mt-2 h-1.5 [&>div]:bg-emerald-500" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {result.after.count.error} erreur(s) · {result.after.count.warning} alerte(s)
                  </p>
                </div>
              </div>

              {/* Améliorations appliquées */}
              <div>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  Améliorations proposées par l'IA ({result.improvements.length})
                </p>
                <ul className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {result.improvements.map((imp, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 * i, duration: 0.25 }}
                        className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white mt-0.5">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        <span className="text-[11px] leading-snug">{imp}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>

              {/* Aperçu de la version optimisée */}
              <div>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-violet-500" />
                  Aperçu de la version optimisée — score IA {result.plan.scores.global}/100
                </p>
                <div className="rounded-xl border border-border/40 bg-white dark:bg-slate-100/90 overflow-hidden">
                  <FloorPlan2D plan={result.plan} compact showDimensions={false} />
                </div>
              </div>

              {result.after.count.error > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/25 px-3 py-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-snug text-amber-800 dark:text-amber-200">
                    {result.after.count.error} problème(s) subsistent — les recommandations détaillées sont visibles dans la fiche descriptive. La version reste valable et peut être ajustée via « Modifier ».
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Actions — l'utilisateur valide AVANT application */}
        <div className="shrink-0 border-t border-border/40 px-4 py-3 flex items-center justify-end gap-2 bg-background/80">
          <Button variant="outline" size="sm" className="h-11 sm:h-9 text-xs" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            className="h-11 sm:h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
            disabled={!result || thinking}
            onClick={() => result && onApply(result.plan)}
          >
            {thinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Appliquer l'optimisation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
