import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Languages,
  Layers,
  Loader2,
  Pencil,
  Plug,
  RefreshCw,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  isEditableLot,
  quantitatifLineKey,
  type QuantitatifCustomizationEntry,
} from "@/convex/quantitatifCustomLogic";
import { formatLaborLot } from "@/lib/laborLot";
import {
  formatQuantitatifMoney,
  formatQuantitatifQuantityI18n,
  quantitatifDir,
  tq,
  translateDescription,
  translateDesignation,
  translateLaborLabel,
  translateLotName,
  translateNature,
  translateScenarioLabel,
  type QuantitatifLang,
} from "@/lib/quantitatifArabic";

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const NATURE_META: Record<string, { icon: any; color: string }> = {
  materiaux: { icon: Layers, color: "text-blue-600" },
  main_oeuvre: { icon: Users, color: "text-emerald-600" },
  equipements: { icon: Plug, color: "text-purple-600" },
  transport: { icon: Truck, color: "text-amber-600" },
  etudes: { icon: FileText, color: "text-red-600" },
};
const NATURE_ORDER = ["materiaux", "main_oeuvre", "equipements", "transport", "etudes"];

/** Taux de TVA appliqué au coût total (les montants du DQE sont TTC). */
const VAT_RATE = 0.19;

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
  /** Prix moyen par région (référence comparative du scénario affiché). */
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
  /** Nombre de postes supprimés (scénario Personnalisé). */
  removedCount?: number;
  /** Personnalisations enregistrées, indexées par clé d'article. */
  customizationByKey: Map<string, QuantitatifCustomizationEntry>;
  /** Lignes brutes du quantitatif (référentiel du moteur), par clé d'article. */
  rawLineByKey: Map<string, any>;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Ouvre le popup de modification d'un article. */
  onOpenArticle: (payload: {
    lotId: string;
    lotName: string;
    lineIndex: number;
    line: any;
  }) => void;
  /** Langue de consultation du quantitatif (FR par défaut). */
  lang: QuantitatifLang;
  onLangChange: (lang: QuantitatifLang) => void;
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
 *
 * LANGUES : le sélecteur FR / AR (au-dessus du titre) ne change QUE le texte
 * affiché — mêmes lots, mêmes quantités, mêmes prix, mêmes totaux. En arabe,
 * le bloc passe en RTL (`dir="rtl"`), les libellés sont traduits par le module
 * central `lib/quantitatifArabic`, et les nombres restent isolés en LTR pour
 * rester parfaitement lisibles.
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
  removedCount = 0,
  customizationByKey,
  rawLineByKey,
  refreshing,
  onRefresh,
  onOpenArticle,
  lang,
  onLangChange,
}: QuantitatifDetailsProps) {
  const [openCat, setOpenCat] = useState<string>("__all_expanded");

  const isAr = lang === "ar";
  const dir = quantitatifDir(lang);
  const money = (n: number) => formatQuantitatifMoney(n, lang);
  const quantity = (q: unknown, unit: unknown, nature?: unknown) =>
    formatQuantitatifQuantityI18n(q, unit, nature, lang);

  // Décomposition TTC → HT / TVA du total affiché (montants jamais modifiés :
  // le total reste la somme exacte des lots).
  const totalHT = totalBudg / (1 + VAT_RATE);
  const totalVat = totalBudg - totalHT;

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      dir={dir}
      lang={lang}
      className="rounded-xl border bg-card shadow-sm overflow-hidden"
    >
      {/* Sélecteur de langue — juste au-dessus du titre */}
      <div className="flex items-center justify-between gap-2 border-b border-border/10 bg-muted/[0.04] px-3 py-1.5">
        <div
          role="group"
          aria-label={tq("langSwitchLabel", lang)}
          className="inline-flex items-center gap-0.5 rounded-full border border-border/50 bg-card p-0.5 shadow-sm"
        >
          {(["fr", "ar"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onLangChange(code)}
              aria-pressed={lang === code}
              title={code === "fr" ? tq("french", lang) : tq("arabic", lang)}
              className={cn(
                "min-w-[2.1rem] rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide transition-colors",
                lang === code
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground/70">
          <Languages className="h-3 w-3" />
          FR / AR
        </span>
      </div>

      {/* Header */}
      <button
        onClick={() => setOpenCat(openCat ? "" : "__all")}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold">{tq("title", lang)}</h3>
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
              {translateScenarioLabel(scenarioBadge.label, lang)}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[9px]">
            {lots.length} {tq("steps", lang)}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <span
            role="button"
            tabIndex={0}
            aria-label={tq("refreshTitle", lang)}
            title={tq("refreshTitle", lang)}
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
              title={openCat === "__all_expanded" ? tq("collapseAll", lang) : tq("expandAll", lang)}
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
              {/* En-têtes de colonnes (ordre inversé automatiquement en RTL) */}
              <div className="flex items-center gap-2 border-b border-border/10 bg-muted/[0.06] px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex-1 min-w-0 truncate">{tq("columnDesignation", lang)}</span>
                <span className="w-14 shrink-0 text-end">{tq("columnQuantity", lang)}</span>
                <span className="hidden w-20 shrink-0 text-end sm:block">
                  {tq("columnUnitPrice", lang)}
                </span>
                <span className="w-20 shrink-0 text-end">{tq("columnAmount", lang)}</span>
                <span className="w-3 shrink-0" aria-hidden />
              </div>

              {/* ══════ VUE HIÉRARCHIQUE DQE (étapes / sous-étapes) ══════ */}
              <div className="divide-y divide-border/10">
                {lots.map((lot: any) => {
                  const isOpen = openCat === lot.name || openCat === "__all_expanded";
                  const canEditLot = isEditableLot(lot.id);
                  const lotLabel = translateLotName(lot.name, lang);

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
                      <div className="flex items-center gap-1 pe-2 transition-colors hover:bg-muted/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCat(isOpen ? "__all" : lot.name);
                          }}
                          className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 text-start"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-foreground">{lotLabel}</span>
                              <span className="text-[9px] text-muted-foreground/50" dir="ltr">
                                {lot.percent}%
                              </span>
                              {canEditLot && (
                                <span className="text-[9px] text-muted-foreground/50">
                                  · {tq("editableArticles", lang)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            dir="ltr"
                            className="text-xs font-bold tabular-nums text-primary shrink-0"
                          >
                            {money(lot.subtotal)}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          )}
                        </button>
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
                                    {translateNature(nature, lang)}
                                  </span>
                                  <span
                                    dir="ltr"
                                    className="text-[10px] text-muted-foreground/50 ms-auto"
                                  >
                                    {money(natureTotal)}
                                  </span>
                                </div>
                                {/* Lignes */}
                                {lines.map((entry: any) => {
                                  const line = entry.line;
                                  const lineIndex: number = entry.index;
                                  const lineKey = quantitatifLineKey(lot.id, lineIndex);
                                  const isCustomized = customizationByKey.has(lineKey);
                                  const designation = translateDesignation(line.designation, lang);
                                  const description = translateDescription(line.description, lang);
                                  const rowContent = (
                                    <>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium leading-snug flex flex-wrap items-center gap-1.5">
                                          <span>{designation}</span>
                                          {isCustomized && (
                                            <Badge
                                              variant="outline"
                                              className="text-[8px] h-3.5 px-1 border-amber-400/40 text-amber-700 bg-amber-400/10 shrink-0"
                                            >
                                              {tq("personalized", lang)}
                                            </Badge>
                                          )}
                                        </p>
                                        {/* Aucune icône : les travaux
                                            complémentaires personnalisés sont
                                            affichés comme les articles du gros
                                            œuvre et du second œuvre. */}
                                        {description && (
                                          <p className="text-[10px] text-muted-foreground/60 leading-snug">
                                            {description}
                                          </p>
                                        )}
                                      </div>
                                      <span
                                        dir="ltr"
                                        className="w-14 shrink-0 text-end text-[10px] text-muted-foreground tabular-nums"
                                      >
                                        {quantity(line.quantity, line.unit, line.nature)}
                                      </span>
                                      <span
                                        dir="ltr"
                                        className="w-20 shrink-0 text-end text-[10px] text-muted-foreground tabular-nums hidden sm:block"
                                      >
                                        {money(line.unitPrice)}
                                      </span>
                                      <span
                                        dir="ltr"
                                        className="w-20 shrink-0 text-end text-xs font-semibold tabular-nums"
                                      >
                                        {money(line.total)}
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
                                  // Main-d'œuvre correspondante, affichée SOUS le poste
                                  // (peinture intérieure / extérieure, plomberie,
                                  // électricité). Elle est déjà comprise dans le montant
                                  // du poste : elle n'est jamais recomptée dans le lot.
                                  const laborRow = line.labor ? (
                                    <div className="flex items-start gap-2 ps-7 pe-3 py-1 border-b border-border/5 bg-muted/[0.04]">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-muted-foreground leading-snug">
                                          ↳ {translateLaborLabel(line.labor.label, lang)}
                                          <span className="text-muted-foreground/60">
                                            {" "}
                                            · {tq("includedInAmount", lang)}
                                          </span>
                                        </p>
                                      </div>
                                      <span
                                        dir="ltr"
                                        className="w-14 shrink-0 text-end text-[10px] text-muted-foreground/80 tabular-nums"
                                      >
                                        {isAr
                                          ? formatQuantitatifQuantityI18n(
                                              line.labor.quantity,
                                              line.labor.unit,
                                              "main_oeuvre",
                                              lang,
                                            )
                                          : formatLaborLot(line.labor.quantity)}
                                      </span>
                                      <span
                                        dir="ltr"
                                        className="w-20 shrink-0 text-end text-[10px] text-muted-foreground/80 tabular-nums hidden sm:block"
                                      >
                                        {money(line.labor.unitPrice)}
                                      </span>
                                      <span
                                        dir="ltr"
                                        className="w-20 shrink-0 text-end text-[11px] font-medium tabular-nums text-muted-foreground"
                                      >
                                        {money(line.labor.total)}
                                      </span>
                                    </div>
                                  ) : null;
                                  const row = canEditLot ? (
                                    <button
                                      type="button"
                                      title={tq("editArticle", lang)}
                                      aria-label={`${tq("editArticle", lang)} — ${designation}`}
                                      onClick={() =>
                                        onOpenArticle({
                                          lotId: lot.id,
                                          lotName: lot.name,
                                          lineIndex,
                                          line: rawLineByKey.get(lineKey) ?? line,
                                        })
                                      }
                                      className={cn(rowClass, "w-full", isAr ? "text-right" : "text-left")}
                                    >
                                      {rowContent}
                                    </button>
                                  ) : (
                                    <div className={rowClass}>{rowContent}</div>
                                  );
                                  return (
                                    <Fragment key={lineIndex}>
                                      {row}
                                      {laborRow}
                                    </Fragment>
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

              {/* ═══ Récapitulatif : Totaux HT / TVA / TTC + Prix moyen région ═══ */}
              <div className="border-t border-border/10 bg-muted/5 px-3 py-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Total TTC */}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-primary">{tq("totalTTC", lang)}</span>
                    </div>
                    <p dir="ltr" className="text-lg font-black tabular-nums text-primary text-start">
                      {money(totalBudg)}
                    </p>
                    {builtSurface > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {tq("perM2", lang, {
                          cost: money(displayedCostM2),
                          surface: builtSurface,
                        })}
                      </p>
                    )}
                    {/* Mentions HT / TVA / TTC — mêmes montants, seuls les
                        libellés changent avec la langue. */}
                    <div className="mt-2 space-y-0.5 border-t border-primary/10 pt-1.5">
                      {(
                        [
                          ["totalHT", totalHT],
                          ["vat", totalVat],
                          ["totalTTCLabel", totalBudg],
                        ] as const
                      ).map(([key, value]) => (
                        <div key={key} className="flex items-baseline justify-between gap-2">
                          <span className="text-[9px] text-muted-foreground">{tq(key, lang)}</span>
                          <span
                            dir="ltr"
                            className={cn(
                              "text-[10px] tabular-nums",
                              key === "totalTTCLabel"
                                ? "font-bold text-primary"
                                : "font-medium text-foreground/80",
                            )}
                          >
                            {money(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {isPersonalized && modifiedCount > 0 && (
                      <p className="text-[9px] text-amber-700 mt-1">
                        {tq("personalizedModified", lang, { n: modifiedCount })}
                      </p>
                    )}
                    {isPersonalized && removedCount > 0 && (
                      <p className="text-[9px] text-amber-700 mt-0.5">
                        {tq("personalizedRemoved", lang, { n: removedCount })}
                      </p>
                    )}
                    {isPersonalized &&
                      lots.some((l: { customWorks?: boolean }) => l?.customWorks) && (
                      <p className="text-[9px] text-amber-700 mt-0.5">
                        {tq("personalizedCustomWorks", lang)}
                      </p>
                    )}
                    {dqeTotals && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                        {(
                          [
                            ["materiaux", dqeTotals.materiaux],
                            ["main_oeuvre", dqeTotals.mainOeuvre],
                            ["equipements", dqeTotals.equipements],
                            ["transport", dqeTotals.transport],
                            ["etudes", dqeTotals.etudes],
                          ] as const
                        )
                          .filter(([, v]) => v > 0)
                          .map(([key, val]) => (
                            <span key={key} className="text-[9px] text-muted-foreground">
                              {translateNature(key, lang)}:{" "}
                              <span dir="ltr" className="font-semibold text-foreground/80">
                                {money(val)}
                              </span>
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
                        {tq("avgRegionTitle", lang)}
                      </span>
                    </div>
                    <p dir="ltr" className="text-lg font-black tabular-nums text-foreground text-start">
                      {money(avgM2)}
                      <span className="text-xs font-normal text-muted-foreground">/m²</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {tq("avgRegionNote", lang)}
                    </p>
                    {regionLabel && avgM2 > 0 && displayedCostM2 !== avgM2 && (
                      <p
                        className={cn(
                          "text-[10px] font-medium mt-1",
                          displayedCostM2 > avgM2 ? "text-amber-600" : "text-emerald-600",
                        )}
                      >
                        {displayedCostM2 > avgM2 ? "▲" : "▼"}{" "}
                        {tq("vsNational", lang, {
                          pct: Math.abs(Math.round((displayedCostM2 / avgM2 - 1) * 100)),
                          region: regionLabel,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
