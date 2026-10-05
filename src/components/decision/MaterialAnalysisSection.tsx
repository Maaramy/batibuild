// ============================================================================
// AIDE À LA DÉCISION — « ANALYSE DE VOS MATÉRIAUX »
// ----------------------------------------------------------------------------
// Affiche l'Intelligence prédictive MATÉRIAU PAR MATÉRIAU (et non par catégorie) :
//   • carte principale « Analyse de vos matériaux » (compteurs + score global) ;
//   • sauts « Matériaux à surveiller » supprimés (§11) ;
//   • tableau détaillé (desktop) → cartes (mobile) ;
//   • fiche individuelle par matériau (prix, tendance, prévision, scores, achat).
// Les catégories ne servent qu'à FILTRER / REGROUPER — jamais à analyser.
// ============================================================================

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Filter,
  Info,
  Minus,
  Package,
  PiggyBank,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildIntelAggregates,
  formatTnd,
  formatTndInt,
  INTEL_EXPOSURE_TONE,
  INTEL_SCORE_BANDS,
  INTEL_SCORE_LABEL,
  type MaterialIntelRow,
  type MaterialIntelligence,
} from "@/lib/materialIntelligence";
import { projectCategoryLabels, type ProjectCategory } from "@/convex/projectTypes";

type TrendFilter = "all" | "hausse" | "baisse" | "surveiller";

const WORK_CATEGORY_PRIORITY: { key: string; label: string; qlabel: string }[] = [
  { key: "etudes", label: "Frais préliminaires et études", qlabel: "Frais préliminaires et études" },
  { key: "main_oeuvre", label: "Main d'œuvre", qlabel: "Main d'œuvre" },
  { key: "gros_oeuvre", label: "Gros œuvre", qlabel: "Gros œuvre" },
  { key: "second_oeuvre", label: "Second œuvre", qlabel: "Second œuvre et finitions" },
  { key: "finitions", label: "Finitions", qlabel: "Finitions" },
  { key: "exterieurs", label: "Aménagements extérieurs", qlabel: "Aménagements extérieurs" },
];

const formatTndInt = (n: number) => formatTnd(Math.round(n));

function TrendPill({ row }: { row: MaterialIntelRow }) {
  const map = {
    stable: { icon: Minus, tone: "border-border/50 bg-muted/40 text-muted-foreground" },
    hausse: { icon: TrendingUp, tone: "border-amber-300/30 bg-amber-50/30 text-amber-700 dark:text-amber-300" },
    baisse: { icon: TrendingDown, tone: "border-emerald-300/30 bg-emerald-50/30 text-emerald-700 dark:text-emerald-300" },
  };
  const entry = map[
    row.trend === "stable"
      ? "stable"
      : row.directionalConfidence >= 50
      ? row.priceDelta > 0
        ? "hausse"
        : "baisse"
      : "stable"
  ] as { icon: typeof Minus; tone: string };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${entry.tone}`}>
      <entry.icon className="h-2.5 w-2.5 inline mr-0.5" />
      {row.trend === "stable" ? "Stable" : row.priceDelta > 0 ? "Hausse" : "Baisse"}
    </span>
  );
}

export function MaterialAnalysisSection({
  intel,
  projectCategory,
  projectName,
  regionLabel,
  surface,
  projectTotal,
  scenarioLabel,
  onCategoryChange,
}: {
  intel: MaterialIntelligence;
  projectCategory?: ProjectCategory;
  projectName?: string;
  regionLabel?: string;
  surface?: number;
  projectTotal?: number;
  scenarioLabel?: string;
  onCategoryChange?: (cat: ProjectCategory) => void;
}) {
  const rows = intel.rows.filter((r) => r.currentTotal > 0);
  const aggregate = buildIntelAggregates(intel);

  const [group, setGroup] = useState<MaterialGroup | "all">("all");
  const [showDetail, setShowDetail] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── Filtres (les catégories servent uniquement à filtrer (§14)) ──────────────
  const groupsPresent = Array.from(new Set(rows.map((r) => r.group).filter(Boolean))).sort();
  const filteredRows = group === "all" ? rows : rows.filter((r) => r.group === group);

  

  // ── Fiche de surveillance — card centrale ────────────────────────────────────
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent">
      <CardContent className="p-4">
        {/* ── En-tête ── */}
        <div className="flex flex-wrap items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold tracking-tight">Analyse de vos matériaux</p>
            <p className="text-[11px] text-muted-foreground">
              Comparaison automatique de chaque article de votre projet avec la Liste des prix et son propre
              historique.*
            </p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5 leading-relaxed">
              * Les matériaux sans correspondance dans la Liste des prix sont exclués de l'analyse et listés
              dans la section « Matériaux sans correspondance ».
            </p>
          </div>
        </div>

        {/* ── Score & compteurs ── */}
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            <h3 className="text-sm font-semibold">Score global du matériel</h3>
            <span className="ml-auto text-xs text-muted-foreground">{aggregate.analyzedCount} articles</span>
          </div>
          <div className="mb-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tabular-nums" style={{ color: INTEL_SCORE_BANDS[aggregate.globalScore]?.color }}>
                {aggregate.globalScore}
              </span>
              <span className="text-[12px] font-medium" style={{ color: INTEL_SCORE_BANDS[aggregate.globalScore]?.color }}>
                {INTEL_SCORE_LABEL[aggregate.globalScore]}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-primary/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "0%", background: "var(--primary)" }} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-4 text-[11px]">
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

        {/* ── Exposition / économie / matériaux sans correspondance — supprimés (§11) ── */}
        {/* Expositions et économies potentielles retirées. */}

        {/* ── Bouton bascule détail ── */}
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

        {/* ── Tableau détaillé / cartes mobiles ── */}
        {showDetail && (
          <div className="mt-3 space-y-4">
            {/* Filtres — les catégories servent uniquement à filtrer (§14). */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as MaterialGroup | "all")}
                className="h-8 rounded-lg border border-border/50 bg-background px-2 text-[11px]"
              >
                <option value="all">Toutes les catégories ({rows.length})</option>
                {groupsPresent.map((g) => (
                  <option key={g} value={g}>
                    {g} ({rows.filter((r) => r.group === g).length})
                  </option>
                ))}
              </select>
            </div>

            {/* ── Line items dépliés (desktop : tableau, mobile : cartes) ── */}
            {filteredRows.length > 0 ? (
              <div className="space-y-3">
                {filteredRows.map((row) => (
                  <div
                    key={row.articleId}
                    className="rounded-xl border border-border/40 bg-background p-4 transition-colors hover:border-primary/30"
                  >
                    {/* ligne étiquette / identifiant — étendue sur mobile */}
                    <div className="flex flex-wrap items-start justify-between gap-y-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{row.designation}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.group && <>Équipement : {row.group} · </>}
                          {surface ? `${surface} m² · ` : ""}
                          {row.group === "second_oeuvre" ? "Second œuvre" : "Matériau"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-bold tabular-nums">{formatTnd(row.currentTotal)}</span>
                        <span className="text-[9.5px] text-muted-foreground">TND</span>
                        <TrendPill row={row} />
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px]">
                      {/* Catégorie / sous-catégorie */}
                      <div>
                        <span className="text-muted-foreground">Catégorie :</span>
                        <span className="font-semibold">{row.group}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sous-catégorie :</span>
                        <span className="font-semibold">{row.subcategory ?? row.group}</span>
                      </div>
                      {/* Prix */}
                      <div>
                        <span className="text-muted-foreground">Prix unitaire (TND) :</span>
                        <span className="font-semibold">{formatTnd(row.unitPrice)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantité (unité) :</span>
                        <span className="font-semibold">{row.quantity.toLocaleString("fr-FR")}</span>
                        <span className="text-muted-foreground">{row.unit}</span>
                      </div>
                    </div>

                    {/* Prévision — suppression (§11). */}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-[11px] text-muted-foreground">
                Aucun matériau dans cette catégorie.
              </div>
            )}
          </div>
        )}          </CardContent>
    </Card>
  );
}
