import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import {
  Sparkles,
  Lock,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShoppingCart,
  Wallet,
  Recycle,
  Info,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  INSUFFICIENT_DATA_MESSAGE,
  LOSS_RISK_LABELS,
  PREDICTION_CONFIDENCE_LABELS,
  PRICE_FORECAST_BASIS_LABELS,
  PRICE_TREND_FULL_LABELS,
  PRICE_TREND_LABELS,
  PURCHASE_TIMING_LABELS,
  predictiveIntelligence,
  type LossRiskKind,
  type MaterialSelectionEntry,
  type MaterialWorkspace,
  type PredictionConfidence,
  type PriceTrendDirection,
  type PurchaseTiming,
} from "@/convex/materialSelectionEngine";

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number.isFinite(n) ? n : 0);

const fmtQty = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

const TREND_STYLE: Record<PriceTrendDirection, { cls: string; icon: typeof TrendingUp }> = {
  hausse: { cls: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400", icon: TrendingUp },
  baisse: { cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: TrendingDown },
  stable: { cls: "border-border/40 bg-muted/20 text-muted-foreground", icon: ArrowRight },
};

const TIMING_STYLE: Record<PurchaseTiming, string> = {
  acheter_maintenant: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  acheter_prochainement: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  attendre: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  surveiller: "border-border/40 bg-muted/20 text-muted-foreground",
};

const CONFIDENCE_LEVEL: Record<PredictionConfidence, number> = { faible: 1, moyenne: 2, elevee: 3 };

/** Indicateur visuel de niveau de confiance (1 à 3 barres). */
function ConfidenceMeter({ confidence }: { confidence: PredictionConfidence }) {
  const level = CONFIDENCE_LEVEL[confidence];
  return (
    <span className="inline-flex items-center gap-1" title={PREDICTION_CONFIDENCE_LABELS[confidence]}>
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "w-1 rounded-sm",
              i === 1 ? "h-1.5" : i === 2 ? "h-2.5" : "h-3.5",
              i <= level ? "bg-violet-500" : "bg-muted-foreground/25",
            )}
          />
        ))}
      </span>
      <span className="text-[9px] text-muted-foreground">{PREDICTION_CONFIDENCE_LABELS[confidence]}</span>
    </span>
  );
}

/** Sous-bloc de section homogène (icône teintée + titre + contenu). */
function SubSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-violet-600">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-xs font-semibold">{title}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InsufficientData({ text = INSUFFICIENT_DATA_MESSAGE }: { text?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {text}
    </div>
  );
}

/**
 * Module « Intelligence prédictive » — bloc FINAL des résultats du Choix
 * matériaux. Réservé au forfait Client Pro : un utilisateur non autorisé voit
 * un bloc verrouillé avec un bouton « Passer à Client Pro » (page Mon
 * abonnement). Ne s'exécute jamais avant l'ouverture des résultats et ne
 * modifie jamais les quantités ni les matériaux sélectionnés.
 */
export function PredictiveIntelligenceCard({
  workspace,
  selections,
}: {
  workspace: MaterialWorkspace;
  selections: Record<string, MaterialSelectionEntry | undefined>;
}) {
  const navigate = useNavigate();
  const access = useQuery(api.access.checkClientProAccess);
  const allowed = access?.allowed === true;

  // L'historique de prix n'est interrogé que pour un accès autorisé.
  const marketTrends = useQuery(api.marketData.getPriceTrends, allowed ? {} : "skip");

  const analysis = useMemo(
    () =>
      predictiveIntelligence({
        lines: workspace.lines,
        selections,
        variants: workspace.variants,
        scenario: workspace.scenario,
        materialsBudget: workspace.budget.materialsBudget,
        marketTrends: marketTrends ?? null,
      }),
    [workspace, selections, marketTrends],
  );

  // Accès inconnu : rien n'est affiché (évite de révéler le module complet à
  // un compte potentiellement non autorisé).
  if (access === undefined) return null;

  if (!allowed) {
    return (
      <Card className="overflow-hidden rounded-2xl border-border/40">
        <CardHeader className="border-b border-border/20 bg-gradient-to-r from-violet-500/[0.07] to-indigo-500/[0.04] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-violet-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Intelligence prédictive</CardTitle>
              <CardDescription className="text-[10px]">
                Prévisions de prix, période d'achat optimale, optimisation du budget et réduction des pertes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold tracking-tight sm:text-lg">
            Fonctionnalité réservée au forfait Client Pro
          </h3>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
            L'Intelligence prédictive analyse vos matériaux présélectionnés et le Quantitatif détaillé
            pour anticiper l'évolution des prix, recommander la meilleure période d'achat, optimiser
            votre budget et réduire les pertes. Souscrivez au forfait Client Pro pour y accéder.
          </p>
          <Button className="mt-2 gap-1.5" onClick={() => navigate("/dashboard/pricing")}>
            <CreditCard className="h-4 w-4" />
            Passer à Client Pro
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { budget, priceForecasts, purchasePlan, lossReduction, totals } = analysis;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/40">
      <CardHeader className="border-b border-border/20 bg-gradient-to-r from-violet-500/[0.07] to-indigo-500/[0.04] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-violet-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Intelligence prédictive</CardTitle>
              <CardDescription className="text-[10px]">
                Analyse de vos {analysis.analyzedLines} matériau(x) présélectionné(s) — données réelles du
                projet, aucune prévision inventée.
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="border-violet-500/30 bg-violet-500/10 text-[9px] text-violet-700 dark:text-violet-400"
          >
            <Sparkles className="mr-1 h-2.5 w-2.5" /> Client Pro
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-6">
        {!analysis.available && <InsufficientData />}

        {/* 1. Évolution prévisionnelle des prix */}
        <SubSection
          icon={TrendingUp}
          title="Évolution prévisionnelle des prix"
          description="Tendance issue de l'historique marché ou, à défaut, comparaison des prix réels des scénarios disponibles."
        >
          {priceForecasts.length === 0 ? (
            <InsufficientData />
          ) : (
            priceForecasts.slice(0, 8).map((f) => {
              const style = TREND_STYLE[f.trend];
              const Icon = style.icon;
              return (
                <div key={f.articleId} className="rounded-xl border border-border/40 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight">{f.designation}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {f.unit ? `unité ${f.unit} · ` : ""}besoin {fmtTnd(f.currentTotal)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                        style.cls,
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {PRICE_TREND_LABELS[f.trend]}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] sm:grid-cols-4">
                    <div className="text-muted-foreground">
                      Prix actuel :{" "}
                      <span className="font-semibold text-foreground tabular-nums">{fmtTnd(f.currentUnitPrice)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Tendance :{" "}
                      <span className="text-foreground">
                        {PRICE_TREND_FULL_LABELS[f.trend]} ({f.trendPct > 0 ? "+" : ""}
                        {fmtQty(f.trendPct)} %)
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Horizon : <span className="text-foreground">{f.horizon}</span>
                    </div>
                    <ConfidenceMeter confidence={f.confidence} />
                  </div>
                  <div className="mt-1">
                    <span className="rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[9px] text-muted-foreground">
                      Source : {PRICE_FORECAST_BASIS_LABELS[f.basis]}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Recommandation : <span className="text-foreground">{f.recommendation}</span>
                  </p>
                </div>
              );
            })
          )}
        </SubSection>

        {/* 2. Meilleure période d'achat */}
        <SubSection
          icon={ShoppingCart}
          title="Meilleure période d'achat"
          description="Acheter maintenant, prochainement, attendre ou surveiller le prix — selon les données disponibles."
        >
          {purchasePlan.length === 0 ? (
            <InsufficientData />
          ) : (
            purchasePlan.slice(0, 8).map((a) => (
              <div
                key={a.articleId}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 px-3 py-2 text-[11px]"
              >
                <span className="min-w-0 flex-1 font-medium">{a.designation}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                    TIMING_STYLE[a.timing],
                  )}
                >
                  {PURCHASE_TIMING_LABELS[a.timing]}
                </span>
                <span className="rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[9px] text-muted-foreground">
                  {PRICE_FORECAST_BASIS_LABELS[a.basis]}
                </span>
                <span className="basis-full text-[10px] text-muted-foreground sm:basis-auto sm:flex-1">
                  {a.reason}
                </span>
              </div>
            ))
          )}
        </SubSection>

        {/* 3. Optimisation du budget */}
        <SubSection
          icon={Wallet}
          title="Optimisation du budget"
          description="Économies calculées sur les écarts de prix réels entre scénarios et postes à risque."
        >
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Économie potentielle estimée
            </div>
            <div className="mt-0.5 text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
              {fmtTnd(budget.potentialSaving)}
            </div>
          </div>

          {budget.items.length === 0 ? (
            <p className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
              Aucune économie identifiée : vos matériaux présélectionnés sont déjà au meilleur coût
              disponible pour le scénario retenu.
            </p>
          ) : (
            budget.items.slice(0, 6).map((i) => (
              <div
                key={i.articleId}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 px-3 py-2 text-[11px]"
              >
                <span className="min-w-0 flex-1 font-medium">{i.designation}</span>
                <span className="tabular-nums text-muted-foreground">
                  {fmtTnd(i.currentTotal)} → {fmtTnd(i.alternativeTotal)}
                </span>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  −{fmtTnd(i.saving)}
                </span>
                <span className="basis-full text-[10px] text-muted-foreground">{i.note}</span>
              </div>
            ))
          )}

          {budget.riskItems.length > 0 && (
            <div className="space-y-1.5">
              {budget.riskItems.map((r) => (
                <div
                  key={r.articleId}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-[11px] text-amber-700 dark:text-amber-500"
                >
                  <span className="min-w-0 flex-1 font-medium">{r.designation}</span>
                  <span className="tabular-nums">
                    {fmtTnd(r.total)} · {fmtQty(r.sharePct)} % du budget
                  </span>
                  <span className="basis-full text-[10px]">{r.note}</span>
                </div>
              ))}
            </div>
          )}
        </SubSection>

        {/* 4. Réduction des pertes */}
        <SubSection
          icon={Recycle}
          title="Réduction des pertes"
          description="Détection des surplus de conditionnement et des postes nécessitant une meilleure planification."
        >
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-full border border-border/40 bg-muted/20 px-2 py-0.5">
              Risque de perte identifié :{" "}
              <span className="font-semibold tabular-nums text-foreground">{fmtTnd(totals.lossRisk)}</span>
            </span>
          </div>

          {lossReduction.length === 0 ? (
            <p className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
              Aucun risque de surachat identifié sur les matériaux présélectionnés.
            </p>
          ) : (
            lossReduction.slice(0, 8).map((l) => (
              <div key={`${l.articleId}:${l.kind}`} className="rounded-xl border border-border/40 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 text-xs font-medium">{l.designation}</span>
                  <Badge variant="secondary" className="text-[9px]">
                    {LOSS_RISK_LABELS[l.kind as LossRiskKind]}
                  </Badge>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{l.recommendation}</p>
                {l.surplusCost > 0 && (
                  <p className="mt-0.5 text-[10px] text-rose-700 dark:text-rose-400">
                    Surplus : {fmtQty(l.surplusQty)} {l.surplusUnit} · coût estimé {fmtTnd(l.surplusCost)}
                  </p>
                )}
              </div>
            ))
          )}
        </SubSection>

        <p className="flex items-start gap-1.5 border-t border-border/20 pt-3 text-[10px] text-muted-foreground/70">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Ces analyses sont indicatives et ne garantissent pas les prix futurs. Elles ne modifient ni les
          quantités ni les matériaux sélectionnés : la décision finale d'achat vous appartient.
        </p>
      </CardContent>
    </Card>
  );
}
