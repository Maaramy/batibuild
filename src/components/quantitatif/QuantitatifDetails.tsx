import { useState } from "react";
import { useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Layers,
  Loader2,
  Pencil,
  Plug,
  RefreshCw,
  Trash2,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  isEditableLot,
  quantitatifLineKey,
  type BudgetScenarioKey,
  type QuantitatifCustomizationEntry,
} from "@/convex/quantitatifCustomLogic";

/**
 * Message exact affiché avant toute suppression d'une catégorie ou d'une
 * sous-catégorie du Quantitatif détaillé.
 */
export const DELETE_STRUCTURE_CONFIRMATION =
  "Voulez-vous vraiment supprimer cette catégorie ou sous-catégorie ? Cette action modifiera le montant total de votre projet.";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const NATURE_META: Record<string, { label: string; icon: any; color: string }> = {
  materiaux: { label: "Matériaux", icon: Layers, color: "text-blue-600" },
  main_oeuvre: { label: "Main-d'œuvre", icon: Users, color: "text-emerald-600" },
  equipements: { label: "Outillage & Équipements", icon: Plug, color: "text-purple-600" },
  transport: { label: "Transport", icon: Truck, color: "text-amber-600" },
  etudes: { label: "Études & Permis", icon: FileText, color: "text-red-600" },
};
const NATURE_ORDER = ["materiaux", "main_oeuvre", "equipements", "transport", "etudes"];

export interface QuantitatifDetailsProps {
  /** Lots du quantitatif, déjà mis à l'échelle du scénario affiché. */
  lots: any[];
  dqeTotals?: {
    materiaux: number;
    mainOeuvre: number;
    equipements: number;
    transport: number;
    etudes: number;
    total: number;
    costPerM2: number;
  };
  /** Total affiché du scénario courant (personnalisé inclus). */
  totalBudg: number;
  /** Prix moyen par région (référence comparative). */
  avgM2: number;
  /** Coût/m² du scénario affiché. */
  displayedCostM2: number;
  /** Surface construite (m²). */
  builtSurface: number;
  regionLabel?: string;
  /** Badge du scénario affiché (Économique / Premium / Personnalisé). */
  scenarioBadge?: { label: string; tone: "primary" | "amber" } | null;
  /** Scénario « Personnalisé » actif. */
  isPersonalized?: boolean;
  /** Nombre d'articles modifiés (scénario Personnalisé). */
  modifiedCount?: number;
  /** Personnalisations enregistrées, indexées par clé d'article. */
  customizationByKey: Map<string, QuantitatifCustomizationEntry>;
  /** Lignes brutes du quantitatif (référentiel du moteur), par clé d'article. */
  rawLineByKey: Map<string, any>;
  /** Identifiant du projet — requis pour enregistrer une suppression. */
  projectId?: string;
  /** Scénario de référence du scénario « Personnalisé ». */
  baseScenario?: BudgetScenarioKey;
  /**
   * Catégories dont la suppression est autorisée. Les catégories protégées
   * (Gros œuvre, Transport et autres) n'y figurent jamais : aucune icône de
   * suppression ne leur est présentée.
   */
  deletableLotIds?: Set<string>;
  /** Sous-catégories supprimables, clés `${lotId}::${nature}`. */
  deletableNatureKeys?: Set<string>;
  /** Nombre de catégories / sous-catégories supprimées (scénario Personnalisé). */
  deletedCount?: number;
  /** Appelé après une suppression effectivement enregistrée. */
  onDeleted?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Ouvre le popup de modification d'un article. */
  onOpenArticle: (payload: {
    lotId: string;
    lotName: string;
    lineIndex: number;
    line: any;
  }) => void;
}

/**
 * Bloc « Quantitatif détaillé » (modèle Google Sheets) : étapes / sous-étapes,
 * lignes par nature, totaux et comparaison régionale.
 *
 * Les articles des 4 catégories autorisées (Frais Préliminaires et Études,
 * Gros œuvre, Second œuvre et finitions, Aménagements extérieurs) sont
 * cliquables et ouvrent le popup de personnalisation. Les autres catégories
 * restent en lecture seule.
 *
 * Les travaux complémentaires personnalisés sont rendus EXACTEMENT comme les
 * autres catégories (une catégorie par travail, articles groupés par nature),
 * sans aucune icône ni style propre.
 */
export function QuantitatifDetails({
  lots,
  dqeTotals,
  totalBudg,
  avgM2,
  displayedCostM2,
  builtSurface,
  regionLabel,
  scenarioBadge,
  isPersonalized,
  modifiedCount = 0,
  customizationByKey,
  rawLineByKey,
  projectId,
  baseScenario,
  deletableLotIds,
  deletableNatureKeys,
  deletedCount = 0,
  onDeleted,
  refreshing,
  onRefresh,
  onOpenArticle,
}: QuantitatifDetailsProps) {
  const [openCat, setOpenCat] = useState<string>("__all_expanded");
  const deleteStructure = useMutation(api.quantitatifCustom.deleteQuantitatifStructure);

  // Cible de la confirmation : catégorie entière ou une seule sous-catégorie.
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "lot" | "nature";
    lotId: string;
    lotName: string;
    nature?: string;
    label: string;
    /** Articles déjà personnalisés dans la cible (avertissement renforcé). */
    customCount: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Protections : une catégorie protégée (Gros œuvre, Transport et autres) et
  // TOUTES ses sous-catégories ne présentent aucune option de suppression.
  const canDeleteLot = (lot: any) => !!deletableLotIds?.has(lot?.id);
  const canDeleteNature = (lot: any, nature: string) =>
    canDeleteLot(lot) && !!deletableNatureKeys?.has(`${lot?.id}::${nature}`);

  const customCountForLines = (lot: any, lines: { index: number }[]) =>
    lines.reduce(
      (count, e) => count + (customizationByKey.has(quantitatifLineKey(lot.id, e.index)) ? 1 : 0),
      0,
    );

  /** Enregistre la suppression confirmée (mise à jour immédiate, sans rechargement). */
  const confirmDelete = async () => {
    if (!pendingDelete || !projectId || deleting) return;
    setDeleting(true);
    try {
      await deleteStructure({
        projectId: projectId as any,
        lotId: pendingDelete.lotId,
        ...(pendingDelete.nature ? { nature: pendingDelete.nature } : {}),
        baseScenario: baseScenario ?? "standard",
      });
      toast.success(
        pendingDelete.kind === "lot"
          ? `Catégorie « ${pendingDelete.label} » supprimée du scénario Personnalisé`
          : `Sous-catégorie « ${pendingDelete.label} » supprimée du scénario Personnalisé`,
      );
      setPendingDelete(null);
      onDeleted?.();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="rounded-xl border bg-card shadow-sm overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setOpenCat(openCat ? "" : "__all")}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold">Quantitatif détaillé</h3>
          {scenarioBadge && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px]",
                scenarioBadge.tone === "amber"
                  ? "text-amber-700 border-amber-400/40 bg-amber-400/10"
                  : "text-primary border-primary/30",
              )}
            >
              {scenarioBadge.label}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[9px]">
            {lots.length} étapes
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <span
            role="button"
            tabIndex={0}
            aria-label="Mettre à jour le quantitatif selon le catalogue 2026"
            title="Mettre à jour le quantitatif selon le catalogue 2026"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onRefresh?.();
              }
            }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors cursor-pointer",
              refreshing ? "opacity-60" : "hover:bg-muted/30 hover:text-primary",
            )}
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </span>
          {openCat !== "" && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setOpenCat(openCat === "__all_expanded" ? "__all" : "__all_expanded");
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/30 text-muted-foreground transition-colors cursor-pointer"
              title={openCat === "__all_expanded" ? "Tout replier" : "Tout déplier"}
            >
              {openCat === "__all_expanded" ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </span>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", openCat && "rotate-180")}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {openCat !== "" && (
          <motion.div
            key="dqe-table"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/10">
              {/* ══════ VUE HIÉRARCHIQUE DQE (étapes / sous-étapes) ══════ */}
              <div className="divide-y divide-border/10">
                {lots.map((lot: any) => {
                  const isOpen = openCat === lot.name || openCat === "__all_expanded";
                  const canEditLot = isEditableLot(lot.id);

                  // Grouper les lignes par nature en conservant l'index global
                  // de chaque ligne dans le lot (clé de personnalisation).
                  const byNature: Record<string, { line: any; index: number }[]> = {};
                  (lot.lines ?? []).forEach((line: any, index: number) => {
                    const n = line.nature || "materiaux";
                    if (!byNature[n]) byNature[n] = [];
                    byNature[n].push({ line, index });
                  });
                  const activeNatures = NATURE_ORDER.filter((n) => byNature[n]?.length > 0);

                  return (
                    <div key={lot.id}>
                      {/* Ligne de l'étape (lot) */}
                      <div className="flex items-center gap-1 pr-2 transition-colors hover:bg-muted/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCat(isOpen ? "__all" : lot.name);
                          }}
                          className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-foreground">{lot.name}</span>
                              <span className="text-[9px] text-muted-foreground/50">{lot.percent}%</span>
                              {canEditLot && (
                                <span className="text-[9px] text-muted-foreground/50">
                                  · articles modifiables
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold tabular-nums text-primary shrink-0">
                            {fmt(lot.subtotal)}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          )}
                        </button>
                        {/* Suppression d'une catégorie : jamais proposée pour
                            les catégories protégées (Gros œuvre, Transport et
                            autres) ni pour leurs sous-catégories. */}
                        {canDeleteLot(lot) && (
                          <button
                            type="button"
                            title="Supprimer cette catégorie"
                            aria-label={`Supprimer la catégorie ${lot.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDelete({
                                kind: "lot",
                                lotId: lot.id,
                                lotName: lot.name,
                                label: lot.name,
                                customCount: customCountForLines(
                                  lot,
                                  (lot.lines ?? []).map((_: any, index: number) => ({ index })),
                                ),
                              });
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 shrink-0 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Sous-étapes (lignes du lot) */}
                      {isOpen && (
                        <div className="bg-muted/5 border-t border-border/5">
                          {activeNatures.map((nature) => {
                            const meta = NATURE_META[nature];
                            const lines = byNature[nature];
                            const natureTotal = lines.reduce(
                              (s: number, e: any) => s + (e.line?.total || 0),
                              0,
                            );
                            return (
                              <div key={nature}>
                                {/* Header nature */}
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/10 border-b border-border/5">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    {meta.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/50 ml-auto">
                                    {fmt(natureTotal)}
                                  </span>
                                  {/* Suppression d'une sous-catégorie : jamais
                                      proposée dans une catégorie protégée. */}
                                  {canDeleteNature(lot, nature) && (
                                    <button
                                      type="button"
                                      title="Supprimer cette sous-catégorie"
                                      aria-label={`Supprimer la sous-catégorie ${meta.label} de ${lot.name}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingDelete({
                                          kind: "nature",
                                          lotId: lot.id,
                                          lotName: lot.name,
                                          nature,
                                          label: `${meta.label} — ${lot.name}`,
                                          customCount: customCountForLines(lot, lines),
                                        });
                                      }}
                                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 shrink-0 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                {/* Lignes */}
                                {lines.map((entry: any) => {
                                  const line = entry.line;
                                  const lineIndex: number = entry.index;
                                  const lineKey = quantitatifLineKey(lot.id, lineIndex);
                                  const isCustomized = customizationByKey.has(lineKey);
                                  const rowContent = (
                                    <>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium leading-snug flex flex-wrap items-center gap-1.5">
                                          <span>{line.designation}</span>
                                          {isCustomized && (
                                            <Badge
                                              variant="outline"
                                              className="text-[8px] h-3.5 px-1 border-amber-400/40 text-amber-700 bg-amber-400/10 shrink-0"
                                            >
                                              Personnalisé
                                            </Badge>
                                          )}
                                        </p>
                                        {/* Aucune icône : les travaux
                                            complémentaires personnalisés sont
                                            affichés comme les articles du gros
                                            œuvre et du second œuvre. */}
                                        {line.description && (
                                          <p className="text-[10px] text-muted-foreground/60 leading-snug">
                                            {line.description}
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                                        {line.quantity} {line.unit}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 hidden sm:block">
                                        {fmt(line.unitPrice)}
                                      </span>
                                      <span className="text-xs font-semibold tabular-nums shrink-0">
                                        {fmt(line.total)}
                                      </span>
                                      {canEditLot && (
                                        <Pencil className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                                      )}
                                    </>
                                  );
                                  const rowClass = cn(
                                    "flex items-start gap-2 px-3 py-1.5 border-b border-border/5 transition-colors",
                                    canEditLot
                                      ? "cursor-pointer hover:bg-primary/[0.06]"
                                      : "hover:bg-muted/10",
                                  );
                                  return canEditLot ? (
                                    <button
                                      key={lineIndex}
                                      type="button"
                                      title="Modifier cet article"
                                      aria-label={`Modifier l'article ${line.designation}`}
                                      onClick={() =>
                                        onOpenArticle({
                                          lotId: lot.id,
                                          lotName: lot.name,
                                          lineIndex,
                                          line: rawLineByKey.get(lineKey) ?? line,
                                        })
                                      }
                                      className={cn(rowClass, "w-full text-left")}
                                    >
                                      {rowContent}
                                    </button>
                                  ) : (
                                    <div key={lineIndex} className={rowClass}>
                                      {rowContent}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ═══ Récapitulatif : Total TTC + Prix moyen par région ═══ */}
              <div className="border-t border-border/10 bg-muted/5 px-3 py-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Total TTC */}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-primary">Coût total estimé TTC</span>
                    </div>
                    <p className="text-lg font-black tabular-nums text-primary">{fmt(totalBudg)}</p>
                    {builtSurface > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        soit {fmt(displayedCostM2)}/m² · {builtSurface} m² · TVA 19% incluse
                      </p>
                    )}
                    {isPersonalized && modifiedCount > 0 && (
                      <p className="text-[9px] text-amber-700 mt-1">
                        Scénario Personnalisé — {modifiedCount} article
                        {modifiedCount > 1 ? "s" : ""} modifié
                        {modifiedCount > 1 ? "s" : ""} par rapport au scénario de référence.
                      </p>
                    )}
                    {isPersonalized && deletedCount > 0 && (
                      <p className="text-[9px] text-amber-700 mt-0.5">
                        Scénario Personnalisé — {deletedCount} catégorie
                        {deletedCount > 1 ? "s" : ""} ou sous-catégorie
                        {deletedCount > 1 ? "s" : ""} supprimée
                        {deletedCount > 1 ? "s" : ""} (hors catégories protégées).
                      </p>
                    )}
                    {isPersonalized &&
                      lots.some((l: { customWorks?: boolean }) => l?.customWorks) && (
                      <p className="text-[9px] text-amber-700 mt-0.5">
                        Travaux complémentaires personnalisés inclus (une catégorie par
                        travail, juste avant « Aménagement extérieur ») — uniquement dans ce
                        scénario.
                      </p>
                    )}
                    {dqeTotals && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                        {(
                          [
                            ["materiaux", "Matériaux", dqeTotals.materiaux],
                            ["main_oeuvre", "Main-d'œuvre", dqeTotals.mainOeuvre],
                            ["equipements", "Outillage", dqeTotals.equipements],
                            ["transport", "Transport", dqeTotals.transport],
                            ["etudes", "Études", dqeTotals.etudes],
                          ] as const
                        )
                          .filter(([, , v]) => v > 0)
                          .map(([key, label, val]) => (
                            <span key={key} className="text-[9px] text-muted-foreground">
                              {label}:{" "}
                              <span className="font-semibold text-foreground/80">{fmt(val)}</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  {/* Prix moyen par région */}
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">
                        Prix moyen par région
                      </span>
                    </div>
                    <p className="text-lg font-black tabular-nums text-foreground">
                      {fmt(avgM2)}
                      <span className="text-xs font-normal text-muted-foreground">/m²</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Moyenne nationale (24 gouvernorats) · Base marché Tunisie 2026
                    </p>
                    {regionLabel && avgM2 > 0 && displayedCostM2 !== avgM2 && (
                      <p
                        className={cn(
                          "text-[10px] font-medium mt-1",
                          displayedCostM2 > avgM2 ? "text-amber-600" : "text-emerald-600",
                        )}
                      >
                        {displayedCostM2 > avgM2 ? "▲" : "▼"}{" "}
                        {Math.abs(Math.round((displayedCostM2 / avgM2 - 1) * 100))}% vs moyenne
                        nationale ({regionLabel})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation avant toute suppression : l'opération peut être annulée
          et n'est enregistrée qu'après validation explicite. */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(v) => {
          if (!v && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {pendingDelete?.kind === "lot"
                ? "Supprimer cette catégorie ?"
                : "Supprimer cette sous-catégorie ?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2">
              <span className="block">{DELETE_STRUCTURE_CONFIRMATION}</span>
              {pendingDelete && (
                <span className="block">
                  Élément concerné :{" "}
                  <span className="font-semibold text-foreground/80">{pendingDelete.label}</span>
                  {pendingDelete.kind === "lot"
                    ? " — ses sous-catégories et toutes ses lignes de travaux seront également supprimées."
                    : " — seule cette sous-catégorie et ses lignes seront supprimées."}
                </span>
              )}
              {pendingDelete && pendingDelete.customCount > 0 && (
                <span className="block text-amber-700">
                  Attention : cet élément contient {pendingDelete.customCount} article
                  {pendingDelete.customCount > 1 ? "s" : ""} personnalisé
                  {pendingDelete.customCount > 1 ? "s" : ""} : cette personnalisation sera
                  définitivement perdue.
                </span>
              )}
              <span className="block">
                Seul le scénario Personnalisé est modifié : les scénarios Économique,
                Standard et Premium restent inchangés.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs" disabled={deleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
