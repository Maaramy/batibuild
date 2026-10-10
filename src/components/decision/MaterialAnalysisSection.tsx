// ============================================================================
// ANALYSE DÉTAILLÉE DES MATÉRIAUX — présentation
// ----------------------------------------------------------------------------
// Rendu de l'Intelligence prédictive MATÉRIAU PAR MATÉRIAU (et non par
// catégorie) issue de `buildMaterialIntelligence` :
//   • carte « Analyse de vos matériaux » (score global + compteurs) ;
//   • analyse détaillée (matériaux filtrables, une fiche par article).
//
// Les catégories ne servent qu'à FILTRER / REGROUPER — jamais à analyser.
// Aucune donnée n'est inventée : les matériaux absents de la Liste des prix
// affichent le message d qualidade de donnée renvoyé par le moteur.
// ============================================================================

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Info,
  Minus,
  Package,
  PiggyBank,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { scoreBand, type MaterialGroup, type ScoreTone } from "@/lib/decisionAnalysis";
import { cn, formatTnd } from "@/lib/utils";
import {
  PREDICTION_CONFIDENCE_LABELS,
  type MaterialIntelRow,
  type MaterialIntelligence,
} from "@/lib/materialIntelligence";

/** Charte visuelle des scores, alignée sur `scoreBand` (§15). */
const TONE_CLASS: Record<ScoreTone, string> = {
  excellent: "text-emerald-600 dark:text-emerald-400",
  bon: "text-sky-600 dark:text-sky-400",
  surveiller: "text-amber-600 dark:text-amber-400",
  risque: "text-red-600 dark:text-red-400",
};

const TONE_BAR: Record<ScoreTone, string> = {
  excellent: "bg-emerald-500",
  bon: "bg-sky-500",
  surveiller: "bg-amber-500",
  risque: "bg-red-500",
};

const frDec = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Pastille de tendance réelle du matériau. */
function TrendPill({ row }: { row: MaterialIntelRow }) {
  const meta = {
    hausse: { icon: TrendingUp, cls: "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    baisse: { icon: TrendingDown, cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    stable: { icon: Minus, cls: "border-border/50 bg-muted/40 text-muted-foreground" },
  }[row.trend];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.cls)}>
      <Icon className="h-2.5 w-2.5" />
      {row.trend === "hausse" ? "Hausse" : row.trend === "baisse" ? "Baisse" : "Stable"}
    </span>
  );
}

/** Champ libellé / valeur de la fiche matériau. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-[12px] font-semibold">{value}</p>
    </div>
  );
}

export function MaterialAnalysisSection({ intel }: { intel: MaterialIntelligence }) {
  const rows = useMemo(
    () => intel.rows.filter((r) => Number.isFinite(r.currentTotal) && r.currentTotal > 0),
    [intel.rows],
  );

  const [group, setGroup] = useState<MaterialGroup | "all">("all");
  const [showDetail, setShowDetail] = useState(false);

  const aggregate = intel.aggregate;
  const band = scoreBand(aggregate.globalScore);

  // Les catégories servent uniquement à filtrer l'analyse détaillée.
  const groupsPresent = useMemo(
    () => Array.from(new Set(rows.map((r) => r.group))).sort((a, b) => a.localeCompare(b, "fr")),
    [rows],
  );
  const filteredRows = group === "all" ? rows : rows.filter((r) => r.group === group);

  return (
    <Card className="border-border/60 bg-card shadow-elev-1">
      <CardContent className="p-4">
        {/* ── En-tête ── */}
        <div className="flex flex-wrap items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold tracking-tight">Analyse de vos matériaux</p>
            <p className="text-[11px] text-muted-foreground">
              Comparaison automatique de chaque article de votre projet avec la Liste des prix et son propre
              historique.
            </p>
          </div>
        </div>

        {/* ── Score global & compteurs ── */}
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            <h3 className="text-sm font-semibold">Score global du matériel</h3>
            <span className="ml-auto text-xs text-muted-foreground">{intel.analyzedCount} articles</span>
          </div>

          <div className="mb-1">
            <div className="flex items-baseline gap-1.5">
              <span className={cn("text-3xl font-black tabular-nums", TONE_CLASS[band.tone])}>
                {aggregate.globalScore}
              </span>
              <span className={cn("text-[12px] font-medium", TONE_CLASS[band.tone])}>{band.label}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
              <div
                className={cn("h-full rounded-full transition-all", TONE_BAR[band.tone])}
                style={{ width: `${Math.max(0, Math.min(100, aggregate.globalScore))}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] sm:grid-cols-4">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3 w-3 shrink-0" />
              <span>{aggregate.analyzed} matériaux analysés</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShoppingCart className="h-3 w-3 shrink-0" />
              <span>{aggregate.priorityPurchases} achats prioritaires</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{aggregate.watched} à surveiller</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <PiggyBank className="h-3 w-3 shrink-0" />
              <span>{aggregate.opportunities} opportunités</span>
            </div>
          </div>
        </div>

        {/* ── Bascule du détail ── */}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 h-8 gap-1.5"
          onClick={() => setShowDetail((v) => !v)}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          {showDetail ? "Masquer l'analyse détaillée" : "Voir l'analyse détaillée"}
          {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {/* ── Analyse détaillée ── */}
        {showDetail && (
          <div className="mt-3 space-y-3">
            {groupsPresent.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[11px] text-muted-foreground" htmlFor="material-group-filter">
                  Famille
                </label>
                <select
                  id="material-group-filter"
                  value={group}
                  onChange={(e) => setGroup(e.target.value as MaterialGroup | "all")}
                  className="h-8 rounded-lg border border-border/50 bg-background px-2 text-[11px]"
                >
                  <option value="all">Toutes les familles ({rows.length})</option>
                  {groupsPresent.map((g) => (
                    <option key={g} value={g}>
                      {g} ({rows.filter((r) => r.group === g).length})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filteredRows.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-muted-foreground">
                Aucun matériau dans cette famille.
              </div>
            ) : (
              filteredRows.map((row) => (
                <div
                  key={row.articleId}
                  className="rounded-xl border border-border/40 bg-background p-3 transition-colors hover:border-primary/30"
                >
                  {/* Désignation + montant + tendance */}
                  <div className="flex flex-wrap items-start justify-between gap-y-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">{row.designation}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.group}
                        {row.reference ? ` · ${row.reference}` : ""}
                        {row.supplier ? ` · ${row.supplier}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold tabular-nums">{formatTnd(row.currentTotal)}</span>
                      <TrendPill row={row} />
                    </div>
                  </div>

                  {/* Données projet / Liste des prix */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <Field label="Prix unitaire" value={`${frDec(row.currentUnitPrice)} TND`} />
                    <Field
                      label="Quantité"
                      value={`${frDec(row.quantity)} ${row.unit}`.trim()}
                    />
                    <Field
                      label="Évolution"
                      value={row.trend === "hausse" ? "Hausse" : row.trend === "baisse" ? "Baisse" : "Stable"}
                    />
                    <Field
                      label="Prévision"
                      value={
                        row.forecastLow !== null && row.forecastHigh !== null
                          ? `${frDec(row.forecastLow)} – ${frDec(row.forecastHigh)} TND`
                          : "Non exploitable"
                      }
                    />
                  </div>

                  {/* Décision d'achat */}
                  <div className="mt-2.5 rounded-lg border border-border/40 bg-muted/20 p-2.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span className="font-semibold">Période d'achat :</span>
                      <span className="text-foreground">{row.timingLabel}</span>
                      <span className="text-muted-foreground">
                        · Confiance {PREDICTION_CONFIDENCE_LABELS[row.confidence].toLowerCase()} ({row.confidencePct} %)
                      </span>
                      {row.horizon ? <span className="text-muted-foreground">· {row.horizon}</span> : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {row.forecastMessage ?? row.timingReason}
                    </p>
                  </div>
                </div>
              ))
            )}

            <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Quantités et prix unitaires proviennent du Quantitatif de votre projet ; les prix, références et
                disponibilités proviennent de la Liste des prix. Aucune prévision n'est affichée sans donnée
                historique exploitable.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}