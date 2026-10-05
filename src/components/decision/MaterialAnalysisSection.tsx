// ============================================================================
// AIDE À LA DÉCISION — « ANALYSE DE VOS MATÉRIAUX »
// ----------------------------------------------------------------------------
// Affiche l'Intelligence prédictive MATÉRIAU PAR MATÉRIAU (et non par catégorie) :
//   • carte principale « Analyse de vos matériaux » (compteurs + score global) ;
//   • classement « Matériaux à surveiller » (risque, impact, quantité, priorité) ;
//   • tableau détaillé (desktop) → cartes (mobile) ;
//   • fiche individuelle par matériau (prix, tendance, prévision, scores, achat).
// Les catégories ne servent qu'à FILTRER / REGROUPER — jamais à analyser.
// ============================================================================

import { useMemo, useState } from "react";
import {
  AlertTriangle,
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
import { Input } from "@/components/ui/input";
import { cn, formatTnd } from "@/lib/utils";
import { MATERIAL_GROUP_LABELS, scoreBand, type MaterialGroup } from "@/lib/decisionAnalysis";
import {
  MATERIAL_INSUFFICIENT_DATA_MESSAGE,
  type MaterialIntelRow,
  type MaterialIntelligence,
} from "@/lib/materialIntelligence";
import { projectCategoryLabels, type ProjectCategory } from "@/convex/projectTypes";

type TrendFilter = "all" | "hausse" | "baisse" | "surveiller";
type BudgetScenario = "actuel" | "plus_cinquantaine" | "complet";

const WORK_CATEGORY_PRIORITY: { key: string; label: string; qlabel: string }[] = [
  { key: "etudes", label: "Frais préliminaires et études", qlabel: "Frais préliminaires et études" },
  { key: "fondations", label: "Fondations", qlabel: "Fondations" },
  { key: "gros_oeuvre", label: "Gros œuvre", qlabel: "Gros œuvre" },
  { key: "second_oeuvre", label: "Second œuvre", qlabel: "Second œuvre et finitions" },
  { key: "finitions", label: "Finitions", qlabel: "Finitions" },
  { key: "exterieurs", label: "Aménagements extérieurs", qlabel: "Aménagements extérieurs" },
];

const formatTndInt = (n: number) => formatTnd(Math.round(n));


function TrendPill({ row }: { row: MaterialIntelRow }) {
  const map = {
    hausse: { icon: TrendingUp, cls: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" },
    baisse: {
      icon: TrendingDown,
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    stable: { icon: Minus, cls: "border-border/50 bg-muted/40 text-muted-foreground" },
  } as const;
  const Icon = map[row.trend].icon;
  const label = row.trend === "hausse" ? "Hausse" : row.trend === "baisse" ? "Baisse" : "Stable";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", map[row.trend].cls)}>
      <Icon className="h-3 w-3" />
      {label}
      {row.trendPct !== 0 && (
        <span className="tabular-nums">
          {row.trendPct > 0 ? "+" : ""}
          {row.trendPct.toLocaleString("fr-FR")} %
        </span>
      )}
    </span>
  );
}

/** Pastille de période d'achat par matériau (§8) — couleur + libellé, jamais la couleur seule. */
function timingDot(row: MaterialIntelRow): string {
  if (row.timing === "acheter_maintenant") return "🟢";
  if (row.timing === "acheter_prochainement") return "🟠";
  if (row.timing === "attendre") return "🔵";
  return row.timingLabel === "Achat non prioritaire" ? "🟡" : "🔵";
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{value}/100</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function DataQualityTags({ row }: { row: MaterialIntelRow }) {
  const tags = [
    { on: row.dataQuality.project, label: "Données du projet", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    { on: row.dataQuality.priceList, label: "Liste des prix", cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
    { on: row.dataQuality.computed, label: "Calculs", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    { on: row.dataQuality.forecast, label: "Prévision IA", cls: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t.label}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-medium",
            t.on ? t.cls : "border-border/40 bg-muted/30 text-muted-foreground/60 line-through",
          )}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

/** Fiche individuelle complète d'un matériau. */
function MaterialFiche({ row }: { row: MaterialIntelRow }) {
  const f = (n: number | null | undefined, unit?: string) =>
    n === null || n === undefined ? "—" : `${formatTnd(n)}${unit ? ` / ${unit}` : ""}`;
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-border/30 bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Besoin du projet</p>
        <Info2 label="Quantité" value={`${row.quantity.toLocaleString("fr-FR")} ${row.unit}`} />
        <Info2 label="Prix unitaire projet" value={f(row.projectUnitPrice, row.unit)} />
        <Info2 label="Coût projet" value={formatTnd(row.projectTotal)} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Liste des prix</p>
        <Info2 label="Référence" value={row.reference ?? "—"} />
        <Info2 label="Prix actuel (TTC)" value={f(row.priceListUnitPrice ?? row.currentUnitPrice, row.unit)} />
        <Info2
          label="Fourchette"
          value={
            row.priceListMin !== null && row.priceListMax !== null
              ? `${formatTnd(row.priceListMin)} – ${formatTnd(row.priceListMax)}`
              : "—"
          }
        />
        <Info2 label="Disponibilité" value={row.availability ?? "—"} />
        <Info2 label="Fournisseur / source" value={row.supplier ?? "—"} />
        <Info2 label="Région" value={row.region ?? "—"} />
        <Info2
          label="Mise à jour"
          value={row.priceUpdatedAt ? new Date(row.priceUpdatedAt).toLocaleDateString("fr-FR") : "—"}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Prévision IA</p>
        <Info2
          label="Prévision"
          value={
            row.forecastLow !== null && row.forecastHigh !== null
              ? `${formatTnd(row.forecastLow)} – ${formatTnd(row.forecastHigh)}`
              : MATERIAL_INSUFFICIENT_DATA_MESSAGE
          }
        />
        <Info2 label="Horizon" value={row.horizon ?? "—"} />
        <Info2 label="Confiance" value={`${row.confidencePct} % (${row.observations} obs.)`} />
        <Info2 label="Base" value={row.basisLabel ?? "—"} />
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Scores</p>
        <ScoreBar label="Risque prix" value={row.riskScore} tone="bg-red-500" />
        <ScoreBar label="Impact financier" value={row.impactScore} tone="bg-amber-500" />
        <ScoreBar label="Priorité d'achat" value={row.priorityScore} tone="bg-primary" />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Budget matériau</p>
        <Info2 label="Coût actuel" value={formatTnd(row.budgetCurrent)} />
        <Info2 label="Coût prévisionnel" value={formatTnd(row.budgetProjected)} />
        <Info2
          label="Écart potentiel"
          value={`${row.budgetGap >= 0 ? "+" : ""}${formatTnd(row.budgetGap)}`}
          tone={row.budgetGap > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
        />
        <Info2 label="Économie potentielle" value={formatTnd(row.potentialSaving)} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pertes & achat</p>
        <Info2 label="Période d'achat" value={`${timingDot(row)} ${row.timingLabel}`} />
        <Info2
          label="Perte estimée"
          value={row.lossValue > 0 ? `${formatTnd(row.lossValue)} (${row.lossQty} ${row.lossUnit})` : "—"}
        />
        <p className="text-[10px] leading-snug text-muted-foreground">{row.timingReason}</p>
      </div>

      <div className="sm:col-span-2 lg:col-span-3 space-y-2">
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-2.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-[11px] leading-snug">{row.recommendation}</p>
        </div>
        <DataQualityTags row={row} />
      </div>
    </div>
  );
}

function Info2({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("truncate text-right font-medium text-foreground", tone)}>{value}</span>
    </div>
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
  const { rows, aggregate } = intel;
  const [showDetail, setShowDetail] = useState(false);
  const [group, setGroup] = useState<MaterialGroup | "all">("all");
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.priorityScore - a.priorityScore), [rows]);
  // « Matériaux à surveiller » (§11) : classement par score de surveillance, qui
  // agrège dans l'ordre — risque de hausse · impact financier · quantité ·
  // priorité d'achat · risque de perte · confiance.
  const watchlist = useMemo(
    () =>
      [...rows]
        .filter((r) => r.trend === "hausse" || r.riskScore >= 60)
        .sort((a, b) => b.watchScore - a.watchScore)
        .slice(0, 6),
    [rows],
  );
  const groupsPresent = useMemo<MaterialGroup[]>(() => {
    const set = new Set<MaterialGroup>();
    for (const r of rows) set.add(r.group);
    return MATERIAL_GROUP_LABELS.filter((g) => set.has(g));
  }, [rows]);

  const filtered = useMemo(
    () =>
      sorted.filter((r) => {
        if (group !== "all" && r.group !== group) return false;
        if (trendFilter === "hausse") return r.trend === "hausse";
        if (trendFilter === "baisse") return r.trend === "baisse";
        if (trendFilter === "surveiller") return r.trend === "hausse" || r.riskScore >= 60;
        return true;
      }),
    [sorted, group, trendFilter],
  );

  const band = scoreBand(aggregate.globalScore);

  return (
    <div className="space-y-3">
      {/* ── Carte principale « Analyse de vos matériaux » ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-background">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Analyse de vos matériaux</h3>
                <p className="text-[11px] text-muted-foreground">
                  Chaque matériau analysé individuellement à partir de la Liste des prix.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score global</p>
              <p className="text-2xl font-black tabular-nums">
                <span
                  className={cn(
                    band.tone === "excellent" && "text-emerald-600 dark:text-emerald-400",
                    band.tone === "bon" && "text-sky-600 dark:text-sky-400",
                    band.tone === "surveiller" && "text-amber-600 dark:text-amber-400",
                    band.tone === "risque" && "text-red-600 dark:text-red-400",
                  )}
                >
                  {aggregate.globalScore}
                </span>
                <span className="text-xs font-medium text-muted-foreground">/100</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Fiabilité {aggregate.confidencePct} %</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={Package} label="Matériaux analysés" value={aggregate.analyzed} />
            <Stat icon={AlertTriangle} label="À surveiller" value={aggregate.watched} tone="amber" />
            <Stat icon={ShoppingCart} label="Achats prioritaires" value={aggregate.priorityPurchases} tone="sky" />
            <Stat icon={PiggyBank} label="Opportunités" value={aggregate.opportunities} tone="emerald" />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Exposition aux hausses :{" "}
              <span className="font-semibold text-red-600 dark:text-red-400">{formatTnd(aggregate.totalExposure)}</span>
            </span>
            <span>
              Économie potentielle :{" "}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatTnd(aggregate.totalPotentialSaving)}
              </span>
            </span>
            {aggregate.notFound > 0 && (
              <span className="inline-flex items-center gap-1">
                <Info className="h-3 w-3" />
                {aggregate.notFound} matériau(x) sans correspondance dans la Liste des prix
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-8 gap-1.5"
            onClick={() => setShowDetail((v) => !v)}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {showDetail ? "Masquer l'analyse détaillée des matériaux" : "Voir l'analyse détaillée des matériaux"}
            {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </CardContent>
      </Card>

      {/* ── Priorité projet (§6) ── */}
      {projectCategory && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent">
          <CardContent className="p-4">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold tracking-tight">Priorité du projet</p>
                <p className="text-[11px] text-muted-foreground">
                  Ce projet est classé comme « {projectCategoryLabels[projectCategory] ?? String(projectCategory)} » et sera traité avec les paramètres associés.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Classement « Matériaux à surveiller » ── */}
      {watchlist.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold tracking-tight">Matériaux à surveiller</h3>
              <span className="text-[10px] text-muted-foreground">
                risque de hausse · impact financier · quantité · priorité d'achat · pertes · confiance
              </span>
            </div>
            <div className="space-y-1.5">
              {watchlist.map((row) => (
                <button
                  key={row.articleId}
                  type="button"
                  onClick={() => {
                    setShowDetail(true);
                    setExpanded(row.articleId);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/40 bg-background px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-muted/30"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-[11px] font-black tabular-nums text-amber-700 dark:text-amber-300"
                    title={`Score de surveillance ${row.watchScore}/100`}
                  >
                    {row.watchScore}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">{row.designation}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {row.group} · {row.quantity.toLocaleString("fr-FR")} {row.unit} · {formatTnd(row.currentTotal)} ·
                      priorité {row.priorityScore} · risque {row.riskScore}
                    </span>
                  </span>
                  <TrendPill row={row} />
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tableau détaillé / cartes mobiles ── */}
      {showDetail && (
        <Card>
          <CardContent className="p-4">
            {/* Filtres — les catégories servent uniquement à filtrer (§14). */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
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
              <div className="flex overflow-hidden rounded-lg border border-border/50">
                {([
                  ["all", "Tous"],
                  ["hausse", "Hausse"],
                  ["baisse", "Baisse"],
                  ["surveiller", "À surveiller"],
                ] as [TrendFilter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTrendFilter(key)}
                    className={cn(
                      "px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                      trendFilter === key ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {filtered.length} matériau(x) affiché(s)
              </span>
            </div>

            {/* Tableau (desktop) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Matériau</th>
                    <th className="px-2 py-2 text-right">Quantité</th>
                    <th className="px-2 py-2 text-right">Prix actuel</th>
                    <th className="px-2 py-2">Tendance</th>
                    <th className="px-2 py-2 text-right">Prévision</th>
                    <th className="px-2 py-2 text-right">Impact</th>
                    <th className="px-2 py-2 text-right">Priorité</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <FragmentRow
                      key={row.articleId}
                      row={row}
                      expanded={expanded === row.articleId}
                      onToggle={() => setExpanded((v) => (v === row.articleId ? null : row.articleId))}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cartes (mobile) */}
            <div className="space-y-2 md:hidden">
              {filtered.map((row) => (
                <div key={row.articleId} className="rounded-xl border border-border/40">
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => (v === row.articleId ? null : row.articleId))}
                    className="flex w-full items-start gap-2 p-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold">{row.designation}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {row.quantity.toLocaleString("fr-FR")} {row.unit} · {formatTnd(row.currentUnitPrice)}/{row.unit}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <TrendPill row={row} />
                        <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold">
                          Priorité {row.priorityScore}
                        </span>
                        <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold">
                          Impact {row.impactScore}
                        </span>
                      </span>
                    </span>
                    {expanded === row.articleId ? (
                      <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {expanded === row.articleId && <MaterialFiche row={row} />}
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="py-6 text-center text-[11px] text-muted-foreground">Aucun matériau pour ce filtre.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FragmentRow({
  row,
  expanded,
  onToggle,
}: {
  row: MaterialIntelRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-border/20 hover:bg-muted/20">
        <td className="max-w-[220px] px-2 py-2">
          <span className="block truncate font-medium">{row.designation}</span>
          <span className="block truncate text-[9px] text-muted-foreground">
            {row.group}
            {row.reference ? ` · ${row.reference}` : ""}
          </span>
        </td>
        <td className="px-2 py-2 text-right tabular-nums">
          {row.quantity.toLocaleString("fr-FR")} {row.unit}
        </td>
        <td className="px-2 py-2 text-right tabular-nums">
          {formatTnd(row.currentUnitPrice)}
          {row.priceListUnitPrice !== null && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] text-sky-600 dark:text-sky-400">
              <CircleCheck className="h-2.5 w-2.5" />
              LP
            </span>
          )}
        </td>
        <td className="px-2 py-2">
          <TrendPill row={row} />
        </td>
        <td className="px-2 py-2 text-right tabular-nums">
          {row.forecastLow !== null && row.forecastHigh !== null
            ? `${formatTnd(row.forecastLow)}–${formatTnd(row.forecastHigh)}`
            : <span className="text-[9px] text-muted-foreground">{MATERIAL_INSUFFICIENT_DATA_MESSAGE}</span>}
        </td>
        <td className="px-2 py-2 text-right">
          <span className={cn("font-semibold tabular-nums", row.impactScore >= 60 ? "text-red-600 dark:text-red-400" : row.impactScore >= 35 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {row.impactScore}
          </span>
        </td>
        <td className="px-2 py-2 text-right">
          <span className={cn("font-black tabular-nums", row.priorityScore >= 70 ? "text-red-600 dark:text-red-400" : row.priorityScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {row.priorityScore}
          </span>
        </td>
        <td className="px-2 py-2 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/50 hover:bg-muted/50"
            aria-label="Voir la fiche"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/20 bg-muted/5">
          <td colSpan={8} className="p-0">
            <MaterialFiche row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Package;
  label: string;
  value: number;
  tone?: "primary" | "amber" | "sky" | "emerald";
}) {
  const tones = {
    primary: "text-primary",
    amber: "text-amber-600 dark:text-amber-400",
    sky: "text-sky-600 dark:text-sky-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  } as const;
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", tones[tone])} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-0.5 text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}