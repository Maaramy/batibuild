import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sparkles,
  Loader2,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Scale,
  TrendingDown,
  TrendingUp,
  Package,
  History,
  RotateCcw,
  Save,
  ChevronDown,
  Flame,
  Gem,
  Coins,
  Link2,
  Trash2,
} from "lucide-react";
import {
  MATERIAL_QUALITY_LABELS,
  MATERIAL_SCENARIO_LABELS,
  PROJECT_MATERIALS_STATUS_ICONS,
  PROJECT_MATERIALS_STATUS_LABELS,
  packagingForLine,
  projectMaterialsStatus,
  selectAllRecommended,
  selectVariant,
  selectionMaterialsTotal,
  selectionScore,
  validateSelection,
  type MaterialLine,
  type MaterialScenarioKey,
  type MaterialSelectionEntry,
  type MaterialVariant,
  type MaterialWorkspace,
  type PriceQualityLevel,
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

const SCENARIO_ICON: Record<MaterialScenarioKey, typeof Coins> = {
  economique: Coins,
  standard: Scale,
  premium: Gem,
};

const PQ_STYLE: Record<PriceQualityLevel, string> = {
  excellent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  bon: "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-400",
  moyen: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  a_optimiser: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

const STATUS_STYLE: Record<string, string> = {
  en_cours: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  recommandations: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  selectionnes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  valides: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  a_reviser: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-500",
  blocage: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

// ════════════════════════════════════════════════════════════════════════════
export function ChoixMateriauxWorkspace({
  projectId,
  projectName,
  onOpenCostEstimate,
}: {
  projectId: string;
  projectName?: string;
  onOpenCostEstimate?: () => void;
}) {
  const data = useQuery(api.materialSelections.getMaterialsWorkspace, { projectId: projectId as any });
  const versions = useQuery(api.materialSelections.getSelectionVersions, { projectId: projectId as any });
  const setScenario = useMutation(api.materialSelections.setSelectionScenario);
  const saveDraft = useMutation(api.materialSelections.saveSelectionDraft);
  const confirmSelectionMut = useMutation(api.materialSelections.confirmSelection);
  const resetSelectionMut = useMutation(api.materialSelections.resetSelection);
  const deleteVersion = useMutation(api.materialSelections.deleteSelectionVersion);

  const ws = (data?.workspace ?? null) as MaterialWorkspace | null;
  const activeScenario: MaterialScenarioKey = (ws?.scenario ?? "standard") as MaterialScenarioKey;

  const [entries, setEntries] = useState<Record<string, MaterialSelectionEntry | undefined>>({});
  const [busy, setBusy] = useState<null | "draft" | "confirm">(null);
  const [openReason, setOpenReason] = useState<string | null>(null);
  const [variantOpen, setVariantOpen] = useState<string | null>(null);
  const [lastVersion, setLastVersion] = useState<number | null>(null);

  // Initialisation : on reprend la sélection enregistrée si elle correspond au
  // scénario courant et n'est pas obsolète, sinon on propose les recommandations IA.
  const initRef = useRef<string | null>(null);
  const initKey = `${projectId}:${activeScenario}:${ws?.quantitativeVersion ?? ""}`;
  useEffect(() => {
    if (!ws) return;
    if (initRef.current === initKey) return;
    initRef.current = initKey;
    const saved = data?.saved;
    if (saved && saved.scenario === activeScenario && !saved.stale && saved.entries) {
      // Les lignes enregistrées restent « sélectionnées » par défaut : une
      // éventuelle proposition IA héritée est automatiquement acceptée (les
      // lignes volontairement désélectionnées sont absentes et le restent).
      const restored: Record<string, MaterialSelectionEntry> = {};
      for (const [key, entry] of Object.entries(
        saved.entries as Record<string, MaterialSelectionEntry>,
      )) {
        restored[key] = { ...entry, userSelected: true };
      }
      setEntries(restored);
    } else {
      // Par défaut, les recommandations IA sont ACCEPTÉES automatiquement en
      // arrière-plan : les matériaux apparaissent « sélectionnés » sans
      // intervention de l'utilisateur, qui peut ensuite ajuster chaque ligne.
      setEntries(selectAllRecommended(ws.lines, activeScenario));
    }
  }, [ws, data, initKey, activeScenario]);

  const total = useMemo(() => (ws ? selectionMaterialsTotal(ws.lines, entries) : 0), [ws, entries]);
  // « Sélectionnés » ne compte QUE les lignes explicitement retenues par
  // l'utilisateur ; les propositions IA sont comptées séparément.
  const selectedCount = useMemo(
    () => (ws ? ws.lines.filter((l) => entries[l.articleId]?.userSelected).length : 0),
    [ws, entries],
  );
  const proposedCount = useMemo(
    () => (ws ? ws.lines.filter((l) => entries[l.articleId] && !entries[l.articleId]?.userSelected).length : 0),
    [ws, entries],
  );
  const validation = useMemo(() => {
    if (!ws) return null;
    return validateSelection({
      lines: ws.lines,
      selections: entries,
      scenario: activeScenario,
      scenarioAvailable: !!ws.scenarios.find((s) => s.key === activeScenario)?.available,
      budgetMaterials: ws.budget.materialsBudget,
    });
  }, [ws, entries, activeScenario]);

  const averagePQ = useMemo(() => {
    if (!ws) return 0;
    const scored = ws.lines.filter((l) => l.priceAvailable);
    if (!scored.length) return 0;
    return scored.reduce((s, l) => s + (ws.scores[l.articleId]?.score ?? 0), 0) / scored.length;
  }, [ws]);

  const score = useMemo(() => {
    if (!ws || !validation) return null;
    return selectionScore({
      materialsTotal: total,
      budgetMaterials: ws.budget.materialsBudget,
      validation,
      averagePriceQuality: averagePQ,
    });
  }, [ws, validation, total, averagePQ]);

  const status = useMemo(() => {
    if (!ws || !validation) return "en_cours" as const;
    return projectMaterialsStatus({
      requiredCount: validation.requiredCount,
      selectedCount: validation.selectedCount,
      proposedCount: validation.proposedCount,
      validated: data?.saved?.status === "valides" && !data?.saved?.stale,
      stale: !!data?.saved?.stale,
      blocking: validation.blocking.length,
    });
  }, [ws, validation, data]);

  if (data === undefined) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement du Quantitatif détaillé…
        </CardContent>
      </Card>
    );
  }

  if (data === null || !ws) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-12 text-center text-xs text-muted-foreground">
          Projet introuvable ou accès refusé.
        </CardContent>
      </Card>
    );
  }

  if (!ws.hasQuantitatif) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/[0.04]">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Info className="h-8 w-8 text-amber-500" />
          <p className="text-sm font-semibold">Aucun Quantitatif détaillé pour ce projet</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Le module « Choix matériaux AI » exploite directement le Quantitatif détaillé du module
            « Coût estimatif ». Lancez d'abord le calcul des coûts pour {projectName ?? "ce projet"}.
          </p>
          {onOpenCostEstimate && (
            <Button size="sm" className="mt-2 h-8 gap-1.5 text-xs" onClick={onOpenCostEstimate}>
              <Link2 className="h-3.5 w-3.5" /> Ouvrir le Coût estimatif
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const changeScenario = async (key: MaterialScenarioKey) => {
    if (key === activeScenario) return;
    try {
      await setScenario({ projectId: projectId as any, scenario: key });
      toast.success(`Scénario « ${MATERIAL_SCENARIO_LABELS[key]} » appliqué au Quantitatif.`);
    } catch (err: any) {
      toast.error(err.message || "Scénario indisponible.");
    }
  };

  const handleSaveDraft = async () => {
    setBusy("draft");
    try {
      await saveDraft({ projectId: projectId as any, scenario: activeScenario, entries });
      toast.success("Brouillon de sélection enregistré.");
    } catch (err: any) {
      toast.error(err.message || "Enregistrement impossible.");
    }
    setBusy(null);
  };

  const handleConfirm = async () => {
    setBusy("confirm");
    try {
      const res = await confirmSelectionMut({
        projectId: projectId as any,
        scenario: activeScenario,
        entries,
      });
      setLastVersion(res.version);
      toast.success(`Sélection validée (version ${res.version}).`);
    } catch (err: any) {
      toast.error(err.message || "Validation impossible.");
    }
    setBusy(null);
  };

  const handleReset = async () => {
    try {
      await resetSelectionMut({ projectId: projectId as any });
      initRef.current = null;
      toast.success("Sélection réinitialisée.");
    } catch (err: any) {
      toast.error(err.message || "Réinitialisation impossible.");
    }
  };

  // Acceptation EXPLICITE : c'est ce geste (et lui seul) qui transfère les
  // recommandations IA dans « Matériaux sélectionnés ».
  const setAll = () => {
    setEntries(selectAllRecommended(ws.lines, activeScenario));
    toast.success("Recommandations IA acceptées : matériaux sélectionnés.");
  };

  // Cycle : aucune → accepte la proposition IA (sélection) → désélectionne.
  const toggleLine = (line: MaterialLine) => {
    setEntries((prev) => {
      const next = { ...prev };
      const current = next[line.articleId];
      if (current?.userSelected) {
        // Déjà retenu explicitement → désélectionner.
        delete next[line.articleId];
        return next;
      }
      if (current) {
        // Proposition IA → acceptation EXPLICITE (transfert vers la sélection).
        next[line.articleId] = { ...current, userSelected: true };
        return next;
      } else {
        const variant = ws.variants[line.articleId]?.find((v) => v.scenario === activeScenario);
        next[line.articleId] = variant
          ? selectVariant(line, variant, true)
          : {
              articleId: line.articleId,
              materialId: line.materialId,
              designation: line.designation,
              quantity: line.quantity,
              selectedQuantity: line.quantity,
              unit: line.unit,
              scenario: activeScenario,
              quality: line.quality,
              unitPrice: line.unitPrice,
              totalPrice: line.quantity * line.unitPrice,
              userSelected: true,
              selectedAt: Date.now(),
            };
      }
      return next;
    });
  };

  const chooseVariant = (line: MaterialLine, variant: MaterialVariant) => {
    setEntries((prev) => ({ ...prev, [line.articleId]: selectVariant(line, variant, true) }));
    setVariantOpen(null);
    toast.success(`« ${line.designation} » → ${variant.label}.`);
  };

  const selectedStatusIcon = PROJECT_MATERIALS_STATUS_ICONS[status];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Bandeau de liaison + statut ─────────────────────────────────── */}
      <Card className="overflow-hidden rounded-2xl border-border/40">
        <CardHeader className="border-b border-border/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600">
                <Link2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Choix des matériaux</CardTitle>
                <CardDescription className="text-[10px]">
                  Directement relié au Quantitatif détaillé de « Coût estimatif » — mêmes désignations,
                  unités, quantités et prix.
                </CardDescription>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                STATUS_STYLE[status],
              )}
            >
              <span aria-hidden>{selectedStatusIcon}</span>
              {PROJECT_MATERIALS_STATUS_LABELS[status]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Sélecteur de scénario */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ws.scenarios.map((s) => {
              const Icon = SCENARIO_ICON[s.key];
              const active = s.key === activeScenario;
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={!s.available}
                  onClick={() => changeScenario(s.key)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    !s.available && "cursor-not-allowed opacity-50",
                    active
                      ? "border-emerald-500/60 bg-emerald-500/[0.06] ring-1 ring-emerald-500/20"
                      : "border-border/40 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">{s.label}</span>
                    {s.reference && (
                      <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[9px]">
                        Référence
                      </Badge>
                    )}
                    {active && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </div>
                  <div className="mt-1.5 text-[10px] text-muted-foreground">
                    Coût travaux : <span className="font-semibold text-foreground">{fmtTnd(s.totalCost)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    Facteur ×{s.factor.toFixed(2)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Alerte obsolescence */}
          {data.saved?.stale && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/[0.06] px-3 py-2 text-[11px] text-orange-700 dark:text-orange-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Le Quantitatif détaillé ou les prix ont changé depuis votre dernière sélection : vérifiez les
              lignes puis validez à nouveau.
            </div>
          )}

          {/* Totaux */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: "Total global matériaux", value: fmtTnd(total), accent: true },
              { label: "Recommandations IA", value: `${proposedCount} / ${ws.lines.length}` },
              { label: "Matériaux sélectionnés", value: `${selectedCount} / ${ws.lines.length}` },
              { label: "Coût total des travaux", value: fmtTnd(ws.budget.projectTotal) },
              {
                label: "Part matériaux",
                value: `${ws.budget.materialsSharePct.toFixed(1)} %`,
              },
            ].map((k) => (
              <div
                key={k.label}
                className={cn(
                  "rounded-xl border px-3 py-2",
                  k.accent ? "border-emerald-500/30 bg-emerald-500/[0.05]" : "border-border/40",
                )}
              >
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                <div className={cn("mt-0.5 text-sm font-bold tabular-nums", k.accent && "text-emerald-700 dark:text-emerald-400")}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Intelligence prédictive IA ──────────────────────────────────── */}
      <Card className="overflow-hidden rounded-2xl border-border/40">
        <CardHeader className="border-b border-border/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-violet-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Intelligence prédictive</CardTitle>
              <CardDescription className="text-[10px]">
                Recommandations construites sur les montants réels du projet — l'IA propose, vous décidez.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {ws.recommendations.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground">
              Aucune recommandation : la sélection actuelle est optimale sur les données disponibles.
            </p>
          ) : (
            <ul className="space-y-2">
              {ws.recommendations.slice(0, 8).map((r) => {
                const Icon =
                  r.kind === "missing_data"
                    ? XCircle
                    : r.kind === "economy_available"
                      ? TrendingDown
                      : r.kind === "premium_impact"
                        ? Flame
                        : TrendingUp;
                const tone =
                  r.kind === "missing_data"
                    ? "text-rose-600"
                    : r.kind === "economy_available"
                      ? "text-emerald-600"
                      : r.kind === "premium_impact"
                        ? "text-amber-600"
                        : "text-sky-600";
                return (
                  <li key={`${r.articleId}:${r.kind}`} className="rounded-xl border border-border/40 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tone)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold">{r.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{r.message}</p>
                        <p className="mt-1 text-[10px] italic text-muted-foreground/70">{r.basis}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Tableau des matériaux ───────────────────────────────────────── */}
      <Card className="overflow-hidden rounded-2xl border-border/40">
        <CardHeader className="border-b border-border/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Matériaux du Quantitatif détaillé</CardTitle>
                <CardDescription className="text-[10px]">
                  {ws.lines.length} matériau(x) · désignations, unités et quantités reprises telles quelles.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={setAll}>
                <Sparkles className="h-3 w-3" /> Accepter les recommandations IA
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-[10px]" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" /> Réinitialiser
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop : tableau */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[38%]">Matériau</TableHead>
                  <TableHead>Qualité</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Prix total</TableHead>
                  <TableHead>Rapport qualité/prix</TableHead>
                  <TableHead className="w-[90px] text-right">Variantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ws.lines.map((line) => {
                  const pq = ws.scores[line.articleId];
                  const entry = entries[line.articleId];
                  const isSelected = !!entry?.userSelected;
                  const isProposed = !!entry && !entry.userSelected;
                  const pkg = packagingForLine(line);
                  return (
                    <Fragment key={line.articleId}>
                      <TableRow className={cn(!entry && "opacity-60")}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => toggleLine(line)}
                              aria-label={
                                isSelected ? "Désélectionner" : isProposed ? "Accepter la recommandation IA" : "Sélectionner"
                              }
                              className={cn(
                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] transition-all",
                                isSelected
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : isProposed
                                    ? "border-violet-500 bg-violet-500/15 text-violet-600"
                                    : "border-border text-transparent",
                              )}
                            >
                              {isProposed ? <Sparkles className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
                            </button>
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-tight">{line.designation}</p>
                              {isProposed && (
                                <Badge
                                  variant="secondary"
                                  className="mt-0.5 border-violet-500/30 bg-violet-500/10 text-[9px] text-violet-700 dark:text-violet-400"
                                >
                                  Recommandé par AI — à valider
                                </Badge>
                              )}
                              <p className="mt-0.5 text-[9px] text-muted-foreground">
                                {line.lotName}
                                {line.subcategory ? ` · ${line.subcategory}` : ""}
                                {line.catalogName ? ` · réf. ${line.catalogName}` : ""}
                              </p>
                              {pkg && (
                                <p className="mt-0.5 text-[9px] text-muted-foreground">
                                  Conditionnement : {pkg.purchasedQty} {pkg.packageUnit}(
                                  {pkg.packageSize} {pkg.needUnit}) — {fmtTnd(pkg.purchasedCost)}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[9px]">
                            {MATERIAL_QUALITY_LABELS[line.qualityAvailable ? line.quality : "inconnue"]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{line.unit || "—"}</TableCell>
                        <TableCell className="text-right text-[11px] tabular-nums">
                          {line.priceAvailable ? fmtQty(line.quantity) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-[11px] tabular-nums">
                          {line.priceAvailable ? fmtTnd(entry?.unitPrice ?? line.unitPrice) : (
                            <span className="text-[10px] font-medium text-rose-600">Prix non disponible</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[11px] font-semibold tabular-nums">
                          {line.priceAvailable
                            ? fmtTnd((entry?.selectedQuantity ?? line.quantity) * (entry?.unitPrice ?? line.unitPrice))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {pq && (
                            <button
                              type="button"
                              onClick={() => setOpenReason(openReason === line.articleId ? null : line.articleId)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                                PQ_STYLE[pq.level],
                              )}
                            >
                              {pq.label}
                              <ChevronDown className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => setVariantOpen(variantOpen === line.articleId ? null : line.articleId)}
                          >
                            Comparer
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Pourquoi cette recommandation ? */}
                      {openReason === line.articleId && pq && (
                        <TableRow key={`${line.articleId}-reason`} className="bg-muted/20">
                          <TableCell colSpan={8} className="py-2">
                            <p className="text-[10px] font-semibold">Pourquoi cette recommandation ?</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{pq.reason}</p>
                            <ul className="mt-1 flex flex-wrap gap-1">
                              {pq.signals.map((s2, i) => (
                                <li key={i} className="rounded bg-background px-1.5 py-0.5 text-[9px] text-muted-foreground">
                                  {s2}
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Comparaison des variantes */}
                      {variantOpen === line.articleId && (
                        <TableRow key={`${line.articleId}-variants`} className="bg-muted/20">
                          <TableCell colSpan={8} className="py-2">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              {(ws.variants[line.articleId] ?? []).map((v) => (
                                <div
                                  key={v.scenario}
                                  className={cn(
                                    "rounded-lg border px-2.5 py-2 text-[10px]",
                                    entry?.scenario === v.scenario
                                      ? "border-emerald-500/50 bg-emerald-500/[0.06]"
                                      : "border-border/40",
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">{v.label}</span>
                                    {v.recommended && <span className="text-[9px] text-emerald-600">⭐</span>}
                                  </div>
                                  <div className="mt-0.5 text-muted-foreground">
                                    {v.qualityLabel} · {fmtTnd(v.unitPrice)} / {v.unit || "u"}
                                  </div>
                                  <div className="mt-0.5 font-semibold tabular-nums">{fmtTnd(v.total)}</div>
                                  <div className={cn("mt-0.5", v.budgetImpact > 0 ? "text-amber-600" : v.budgetImpact < 0 ? "text-emerald-600" : "text-muted-foreground")}>
                                    {v.budgetImpact === 0
                                      ? "Référence"
                                      : `${v.budgetImpact > 0 ? "+" : ""}${fmtTnd(v.budgetImpact)} (${v.impactPct.toFixed(1)} %)`}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!v.available}
                                    className="mt-1.5 h-6 w-full text-[9px]"
                                    onClick={() => chooseVariant(line, v)}
                                  >
                                    {entry?.scenario === v.scenario ? "Sélectionné" : "Choisir"}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile : cartes */}
          <div className="space-y-2 p-3 md:hidden">
            {ws.lines.map((line) => {
              const pq = ws.scores[line.articleId];
              const entry = entries[line.articleId];
              const isSelected = !!entry?.userSelected;
              const isProposed = !!entry && !entry.userSelected;
              return (
                <div
                  key={line.articleId}
                  className={cn(
                    "rounded-xl border p-3",
                    isSelected
                      ? "border-emerald-500/40 bg-emerald-500/[0.03]"
                      : isProposed
                        ? "border-violet-500/40 bg-violet-500/[0.03]"
                        : "border-border/40",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLine(line)}
                      aria-label={
                        isSelected ? "Désélectionner" : isProposed ? "Accepter la recommandation IA" : "Sélectionner"
                      }
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px]",
                        isSelected
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isProposed
                            ? "border-violet-500 bg-violet-500/15 text-violet-600"
                            : "border-border text-transparent",
                      )}
                    >
                      {isProposed ? <Sparkles className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-tight">{line.designation}</p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground">
                        {line.lotName}
                        {isProposed ? " · recommandé par AI — à valider" : isSelected ? " · sélectionné" : ""}
                      </p>
                    </div>
                    {pq && (
                      <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold", PQ_STYLE[pq.level])}>
                        {pq.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="text-muted-foreground">
                      Qualité : <span className="text-foreground">{MATERIAL_QUALITY_LABELS[line.qualityAvailable ? line.quality : "inconnue"]}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Unité : <span className="text-foreground">{line.unit || "—"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Quantité : <span className="tabular-nums text-foreground">{line.priceAvailable ? fmtQty(line.quantity) : "—"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      P.U. : <span className="tabular-nums text-foreground">{line.priceAvailable ? fmtTnd(entry?.unitPrice ?? line.unitPrice) : "non dispo."}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      onClick={() => setVariantOpen(variantOpen === line.articleId ? null : line.articleId)}
                    >
                      Comparer les scénarios
                    </Button>
                    <span className="text-xs font-bold tabular-nums">
                      {line.priceAvailable
                        ? fmtTnd((entry?.selectedQuantity ?? line.quantity) * (entry?.unitPrice ?? line.unitPrice))
                        : "—"}
                    </span>
                  </div>
                  {variantOpen === line.articleId && (
                    <div className="mt-2 grid grid-cols-1 gap-1.5">
                      {(ws.variants[line.articleId] ?? []).map((v) => (
                        <button
                          key={v.scenario}
                          type="button"
                          disabled={!v.available}
                          onClick={() => chooseVariant(line, v)}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[10px]",
                            entry?.scenario === v.scenario ? "border-emerald-500/50 bg-emerald-500/[0.06]" : "border-border/40",
                          )}
                        >
                          <span className="font-semibold">{v.label}</span>
                          <span className="tabular-nums">{fmtTnd(v.total)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total global */}
          <div className="flex items-center justify-between border-t border-border/30 bg-muted/20 px-4 py-3 sm:px-6">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <Coins className="h-3.5 w-3.5 text-emerald-600" /> Total global des matériaux
            </span>
            <span className="text-base font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
              {fmtTnd(total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Vérification & validation ───────────────────────────────────── */}
      <Card className="overflow-hidden rounded-2xl border-border/40">
        <CardHeader className="border-b border-border/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/15 to-cyan-500/10 text-sky-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Vérification & validation</CardTitle>
              <CardDescription className="text-[10px]">
                La sélection doit couvrir 100 % des matériaux du Quantitatif détaillé avant validation.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-5">
          {score && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="col-span-2 rounded-xl border border-border/40 px-3 py-2 sm:col-span-1">
                <div className="text-[9px] uppercase text-muted-foreground">Score sélection</div>
                <div className="mt-0.5 text-lg font-extrabold tabular-nums">{score.total}/100</div>
                <div className="text-[9px] text-muted-foreground">{score.label}</div>
              </div>
              {[
                { label: "Budget", value: score.budget },
                { label: "Qualité", value: score.quality },
                { label: "Cohérence", value: score.coherence },
                { label: "Prix/Qualité", value: score.priceQuality },
              ].map((s2) => (
                <div key={s2.label} className="rounded-xl border border-border/40 px-3 py-2">
                  <div className="text-[9px] uppercase text-muted-foreground">{s2.label}</div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums">{s2.value}</div>
                </div>
              ))}
            </div>
          )}

          {validation && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-violet-700 dark:text-violet-400">
                {validation.proposedCount} recommandation(s) IA en attente
              </span>
              <span className="rounded-full border border-border/40 bg-muted/20 px-2 py-0.5">
                {validation.selectedCount} / {validation.requiredCount} sélectionnés
              </span>
              <span className="rounded-full border border-border/40 bg-muted/20 px-2 py-0.5">
                {validation.acceptedRecommendations} conformes au scénario retenu
              </span>
              <span className="rounded-full border border-border/40 bg-muted/20 px-2 py-0.5">
                {validation.customizedCount} choix personnalisés
              </span>
            </div>
          )}

          {validation && validation.blocking.length > 0 && (
            <ul className="space-y-1.5">
              {validation.blocking.map((b) => (
                <li
                  key={`${b.code}:${b.articleId ?? ""}`}
                  className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/[0.05] px-3 py-2 text-[11px] text-rose-700 dark:text-rose-400"
                >
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {b.message}
                </li>
              ))}
            </ul>
          )}

          {validation && validation.warnings.length > 0 && (
            <ul className="space-y-1.5">
              {validation.warnings.slice(0, 6).map((w) => (
                <li
                  key={`${w.code}:${w.articleId ?? ""}`}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-[11px] text-amber-700 dark:text-amber-500"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {w.message}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              disabled={busy !== null}
              onClick={handleSaveDraft}
            >
              {busy === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Enregistrer le brouillon
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs sm:ml-auto"
              disabled={busy !== null || !validation?.canConfirm}
              onClick={handleConfirm}
            >
              {busy === "confirm" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Valider la sélection
            </Button>
          </div>

          {lastVersion !== null && (
            <p className="text-[10px] text-muted-foreground">
              Dernière version validée : v{lastVersion}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Versions validées ───────────────────────────────────────────── */}
      {(versions?.length ?? 0) > 0 && (
        <Card className="overflow-hidden rounded-2xl border-border/40">
          <CardHeader className="border-b border-border/20 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/15 to-slate-500/10 text-slate-600">
                <History className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Versions validées</CardTitle>
                <CardDescription className="text-[10px]">
                  Historique traçable des sélections confirmées (scénario, matériaux, prix).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-5">
            {(versions as any[]).map((v) => (
              <div key={v._id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 px-3 py-2 text-[11px]">
                <span className="font-bold">v{v.version}</span>
                <Badge variant="secondary" className="text-[9px]">
                  {MATERIAL_SCENARIO_LABELS[v.scenario as MaterialScenarioKey] ?? v.scenario}
                </Badge>
                <span className="tabular-nums">
                  {v.totals?.selectedCount ?? 0} matériaux · {fmtTnd(v.totals?.materialsTotal ?? 0)}
                </span>
                <span className="text-muted-foreground">
                  {new Date(v.createdAt).toLocaleDateString("fr-FR")}
                </span>
                <span className="text-muted-foreground">Score {v.score?.total ?? "—"}/100</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 gap-1 text-[10px] text-destructive hover:text-destructive"
                  onClick={async () => {
                    await deleteVersion({ versionId: v._id });
                    toast.success("Version supprimée.");
                  }}
                >
                  <Trash2 className="h-3 w-3" /> Supprimer
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground/70">
        <Info className="h-3 w-3 shrink-0" />
        Aucun prix n'est inventé : les quantités viennent du Quantitatif détaillé et les prix du même
        moteur que « Coût estimatif ». Toute modification déclenche un recalcul officiel côté serveur.
      </p>
    </div>
  );
}
