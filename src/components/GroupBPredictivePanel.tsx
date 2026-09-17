// ============================================================================
// CARTE « INTELLIGENCE PRÉDICTIVE » — Groupe B
//
// Affiche l'analyse prédictive dynamique générée par
// `buildPredictiveAnalysis` (src/convex/predictiveDomains.ts) : besoins,
// risques, matériaux, impact budgétaire, délais, dépendances et
// recommandations, adaptés au type de projet sélectionné.
//
// Design : reprend la carte violette du module Intelligence prédictive du
// Groupe A (ProjectDetail), avec les sections requises :
//   🔮 Prévisions · ⚠️ Risques · 📦 Éléments à prévoir · 💰 Impact budgétaire
//   ⏱️ Impact délai · 🔗 Dépendances · 🧠 Recommandations IA
//
// Règles d'affichage respectées :
//   - prédictions IA clairement distinguées des données calculées (badges
//     « DQE » / « Prévision IA », avertissement en pied de carte) ;
//   - aucune modification du DQE ni des quantités : lecture seule ;
//   - responsive (grille 1 colonne sur mobile, 2 sur desktop).
// ============================================================================

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock,
  Coins,
  Crown,
  Lightbulb,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type {
  GroupBPrediction,
  PredictiveRisk,
} from "@/convex/predictiveDomains";

const fmtTnd = (n: number) => n.toLocaleString("fr-TN", { maximumFractionDigits: 0 });

const SEVERITY_STYLES: Record<PredictiveRisk["severity"], string> = {
  eleve: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
  moyen:
    "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  faible: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30",
};

const SEVERITY_LABEL: Record<PredictiveRisk["severity"], string> = {
  eleve: "Élevé",
  moyen: "Moyen",
  faible: "Faible",
};

/** En-tête de section réutilisé par toutes les cartes. */
function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {typeof count === "number" && (
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
          {count}
        </Badge>
      )}
    </div>
  );
}

interface GroupBPredictivePanelProps {
  prediction: GroupBPrediction | null | undefined;
  loading: boolean;
  error: string | null;
  isPremium: boolean;
  onGenerate: () => void;
}

export function GroupBPredictivePanel({
  prediction,
  loading,
  error,
  isPremium,
  onGenerate,
}: GroupBPredictivePanelProps) {
  const [expanded, setExpanded] = useState(false);

  const needs = prediction?.needs ?? [];
  const visibleNeeds = expanded ? needs : needs.slice(0, 4);
  const hiddenNeeds = needs.length - Math.min(needs.length, 4);

  return (
    <div className="relative rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-500/[0.06] via-background to-background shadow-sm overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center gap-2 px-4 py-3 bg-violet-500/[0.06] border-b border-violet-200/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shrink-0">
          <Brain className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[15px] font-semibold">Intelligence prédictive</h3>
            {!isPremium && (
              <Badge className="text-[9px] gap-0.5 bg-slate-100 text-slate-500 border-slate-200/60">
                <Crown className="h-2.5 w-2.5" /> Client Pro
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Analyse automatique des besoins, risques, coûts, matériaux et étapes
            susceptibles d'être nécessaires pour votre projet
            {prediction?.domainLabel ? ` — ${prediction.domainLabel}` : ""}.
          </p>
        </div>
        {prediction && prediction.totalPotentialImpactTnd > 0 && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/[0.1] border border-amber-200/40 shrink-0"
            title="Impact financier potentiel"
          >
            <Coins className="h-3 w-3 text-amber-600" />
            <p className="text-[11px] font-semibold text-amber-600 tabular-nums leading-none whitespace-nowrap">
              ≈ {fmtTnd(prediction.totalPotentialImpactTnd)} TND
            </p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!isPremium ? (
          /* Teaser verrouillé pour les comptes sans Client Pro actif */
          <div className="text-center py-4">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                <Brain className="h-6 w-6 text-violet-600" />
              </div>
            </div>
            <p className="text-[15px] font-semibold">
              Analysez les besoins et risques de votre projet
            </p>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-sm mx-auto">
              L'IA identifie automatiquement les éléments, matériaux, risques,
              coûts et étapes spécifiques à votre type de projet, à partir de vos
              données réelles (DQE, quantitatif, surfaces).
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {[
                "Besoins prévisibles",
                "Risques détectés",
                "Matériaux à prévoir",
                "Impact budgétaire et délais",
                "Dépendances",
              ].map((f) => (
                <span
                  key={f}
                  className="text-[11px] px-2 py-1 rounded-full bg-violet-500/[0.06] text-violet-600 border border-violet-200/40 flex items-center gap-1"
                >
                  <Sparkles className="h-2.5 w-2.5" /> {f}
                </span>
              ))}
            </div>
            {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
            <Button size="sm" className="mt-4 gap-1.5" disabled={loading} onClick={onGenerate}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {loading ? "Analyse en cours..." : "Générer l'analyse prédictive"}
            </Button>
          </div>
        ) : !prediction ? (
          /* Aucune analyse générée */
          <div className="text-center py-4">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                <Brain className="h-6 w-6 text-violet-600" />
              </div>
            </div>
            <p className="text-[15px] font-semibold">
              Anticipez les besoins de votre chantier
            </p>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-sm mx-auto">
              L'IA croise le type de projet avec votre DQE et votre quantitatif
              pour prédire besoins, risques, matériaux, coûts et délais — sans
              jamais modifier vos données.
            </p>
            {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
            <Button size="sm" className="mt-4 gap-1.5" disabled={loading} onClick={onGenerate}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {loading ? "Analyse en cours..." : "Générer l'analyse prédictive"}
            </Button>
          </div>
        ) : (
          <>
            {/* Résumé */}
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-violet-500/[0.04] border border-violet-200/30">
              <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-snug">
                {prediction.summary}
              </p>
            </div>

            {/* 🔮 Prévisions (besoins) */}
            {needs.length > 0 && (
              <div>
                <SectionHeader
                  icon={<TrendingUp className="h-3.5 w-3.5 text-violet-500" />}
                  title="Prévisions — besoins identifiés"
                  count={needs.length}
                />
                <div className="space-y-1.5">
                  {visibleNeeds.map((n, i) => (
                    <div
                      key={`${n.label}-${i}`}
                      className="flex items-start gap-2 p-2 rounded-lg bg-background border border-border/10"
                    >
                      {n.covered ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <CircleAlert className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[12px] font-medium">{n.label}</p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0",
                              n.covered
                                ? "text-emerald-600 border-emerald-200/60 dark:text-emerald-400 dark:border-emerald-500/30"
                                : "text-violet-600 border-violet-200/60 dark:text-violet-400 dark:border-violet-500/30",
                            )}
                          >
                            {n.covered ? "DQE" : "Prévision IA"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {n.why}
                        </p>
                      </div>
                    </div>
                  ))}
                  {hiddenNeeds > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded(true)}
                      className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 dark:text-violet-400 px-1 py-0.5"
                    >
                      <ChevronDown className="h-3 w-3" />
                      Voir les {hiddenNeeds} autres besoins
                    </button>
                  )}
                  {expanded && needs.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setExpanded(false)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-1 py-0.5"
                    >
                      <ChevronUp className="h-3 w-3" />
                      Réduire
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ⚠️ Risques détectés */}
            {prediction.risks.length > 0 && (
              <div>
                <SectionHeader
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  title="Risques détectés"
                  count={prediction.risks.length}
                />
                <div className="space-y-1.5">
                  {prediction.risks.map((r, i) => (
                    <div
                      key={`${r.label}-${i}`}
                      className="flex items-start gap-2 p-2 rounded-lg bg-background border border-border/10"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[12px] font-medium">{r.label}</p>
                          <Badge
                            variant="outline"
                            className={cn("text-[9px] px-1.5 py-0", SEVERITY_STYLES[r.severity])}
                          >
                            {SEVERITY_LABEL[r.severity]}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {r.why}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 📦 Éléments à prévoir + 💰 Impact budgétaire */}
            <div className="grid sm:grid-cols-2 gap-3">
              {prediction.materials.length > 0 && (
                <div className="p-3 rounded-lg bg-background border border-border/10">
                  <SectionHeader
                    icon={<Package className="h-3.5 w-3.5 text-violet-500" />}
                    title="Éléments à prévoir"
                  />
                  <div className="space-y-1.5">
                    {prediction.materials.map((m, i) => (
                      <div key={`${m.name}-${i}`} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1 w-1 rounded-full bg-violet-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] leading-snug">{m.name}</p>
                          {m.note && (
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {m.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {prediction.financial.length > 0 && (
                <div className="p-3 rounded-lg bg-background border border-border/10">
                  <SectionHeader
                    icon={<Coins className="h-3.5 w-3.5 text-amber-500" />}
                    title="Impact budgétaire prévisible"
                  />
                  <div className="space-y-2">
                    {prediction.financial.map((f, i) => (
                      <div key={`${f.label}-${i}`} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {f.why}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                          +{fmtTnd(f.impactTnd)} TND
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ⏱️ Impact délai + 🔗 Dépendances */}
            <div className="grid sm:grid-cols-2 gap-3">
              {prediction.delays.length > 0 && (
                <div className="p-3 rounded-lg bg-background border border-border/10">
                  <SectionHeader
                    icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
                    title="Impact délai"
                  />
                  <div className="space-y-2">
                    {prediction.delays.map((d, i) => (
                      <div key={`${d.label}-${i}`} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium">{d.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {d.why}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                          +{d.impactDays} j
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {prediction.dependencies.length > 0 && (
                <div className="p-3 rounded-lg bg-background border border-border/10">
                  <SectionHeader
                    icon={<Link2 className="h-3.5 w-3.5 text-cyan-500" />}
                    title="Dépendances"
                  />
                  <div className="space-y-1.5">
                    {prediction.dependencies.map((dep, i) => (
                      <div key={`${dep.type}-${dep.label}-${i}`} className="flex items-start gap-1.5">
                        <span
                          className={cn(
                            "text-[9px] font-semibold px-1 py-0.5 rounded shrink-0 mt-0.5 border",
                            dep.type === "avant"
                              ? "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30"
                              : "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30",
                          )}
                        >
                          {dep.type === "avant" ? "Avant" : "Après"}
                        </span>
                        <p className="text-[12px] leading-snug">{dep.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 🧠 Recommandations IA */}
            {prediction.recommendations.length > 0 && (
              <div className="p-3 rounded-lg bg-violet-500/[0.04] border border-violet-200/30">
                <SectionHeader
                  icon={<Lightbulb className="h-3.5 w-3.5 text-violet-500" />}
                  title="Recommandations IA"
                />
                <ul className="space-y-1.5">
                  {prediction.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Sparkles className="h-3 w-3 text-violet-500 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{r}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pied : source des données + avertissement + régénération */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border/10">
              <p className="text-[10px] text-muted-foreground/60 text-center sm:text-left">
                {prediction.disclaimer}
                {prediction.dataSource.dqeLines > 0 &&
                  ` · ${prediction.dataSource.dqeLines} poste(s) du DQE/quantitatif analysé(s)`}
                {` · Généré le ${new Date(prediction.dataSource.generatedAt).toLocaleDateString("fr-FR")}`}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1 px-2 shrink-0"
                disabled={loading}
                onClick={onGenerate}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Régénérer l'analyse
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
