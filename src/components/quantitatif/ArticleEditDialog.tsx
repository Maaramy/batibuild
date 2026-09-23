import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Check,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  BUDGET_SCENARIO_KEYS,
  BUDGET_SCENARIO_LABELS,
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
  standardLevelFromPrice,
  unitPriceForScenario,
  type BudgetScenarioKey,
  type QuantitatifCustomizationEntry,
} from "@/convex/quantitatifCustomLogic";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type ArticleScenarioChoice = BudgetScenarioKey | typeof PERSONALIZED_SCENARIO_KEY;

interface SelectedArticle {
  name: string;
  unit: string;
  unitPrice: number;
  replaced: boolean;
}

export interface ArticleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  lotId: string;
  lotName: string;
  lineIndex: number;
  /** Ligne d'origine du quantitatif (niveau de référence du moteur). */
  line: any;
  /** Scénarios budgétaires du moteur (`costEstimate.budgetScenarios`). */
  scenarios: any;
  /** Scénario de référence du scénario Personnalisé. */
  baseScenario: BudgetScenarioKey;
  /** Scénario affiché actuellement dans le quantitatif. */
  displayedScenario: BudgetScenarioKey;
  /** Facteur du scénario affiché (scénario / Standard). */
  scaleFactor: number;
  /** Facteur de correction des anciennes marges d'imprévus. */
  realCostFactor: number;
  /** Personnalisation déjà enregistrée pour cet article. */
  existing?: QuantitatifCustomizationEntry;
  /** Total actuellement affiché du quantitatif (scénario affiché). */
  quantitatifTotal: number;
  /** Surface construite (m²) pour le coût au m². */
  builtSurface: number;
  /** Appelé après un enregistrement effectif (bascule sur « Personnalisé »). */
  onSaved?: () => void;
}

export function ArticleEditDialog({
  open,
  onOpenChange,
  projectId,
  lotId,
  lotName,
  lineIndex,
  line,
  scenarios,
  baseScenario,
  displayedScenario,
  scaleFactor,
  realCostFactor,
  existing,
  quantitatifTotal,
  builtSurface,
  onSaved,
}: ArticleEditDialogProps) {
  const saveItem = useMutation(api.quantitatifCustom.saveItemCustomization);
  const resetItem = useMutation(api.quantitatifCustom.resetItemCustomization);

  // Le popup est monté à chaque ouverture sur un article : l'état initial est
  // donc dérivé directement des props (aucune synchronisation nécessaire).
  const displayFactor = (scaleFactor || 1) * (realCostFactor || 1);

  const [scenario, setScenario] = useState<ArticleScenarioChoice>(
    existing?.priceScenario ?? displayedScenario,
  );
  const [article, setArticle] = useState<SelectedArticle | null>(() => {
    if (!existing?.replacedArticle) return null;
    // Prix de base de l'article (niveau catalogue), indépendamment du niveau
    // de finition déjà appliqué à cet article.
    return {
      name: existing.designation,
      unit: existing.unit,
      unitPrice: standardLevelFromPrice(
        existing.unitPrice,
        scenarios,
        existing.priceScenario,
      ),
      replaced: true,
    };
  });
  const [quantity, setQuantity] = useState<number>(
    Number(existing?.quantity ?? line?.quantity) || 1,
  );
  const [unitPriceInput, setUnitPriceInput] = useState<string>(() => {
    const base = existing ? existing.unitPrice : Number(line?.unitPrice) || 0;
    return String(Math.round(base * displayFactor * 100) / 100);
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  // Prix de référence (niveau « Standard » du moteur) de l'article retenu.
  const articleStandardBase = article ? article.unitPrice : Number(line?.unitPrice) || 0;

  // Montants du popup exprimés au niveau du scénario affiché (comme le tableau
  // du quantitatif) ; seule la valeur enregistrée est ramenée au niveau de
  // référence du moteur.
  const scenarioDisplayedPrice = useMemo(() => {
    const stdPrice =
      scenario === PERSONALIZED_SCENARIO_KEY
        ? existing
          ? existing.unitPrice
          : articleStandardBase
        : unitPriceForScenario(articleStandardBase, scenarios, scenario);
    return Math.round(stdPrice * displayFactor * 100) / 100;
  }, [scenario, existing, articleStandardBase, scenarios, displayFactor]);

  const manualDisplayedPrice = useMemo(() => {
    if (!unitPriceInput.trim()) return null;
    const parsed = Number(unitPriceInput.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [unitPriceInput]);

  const effectiveDisplayedPrice = manualDisplayedPrice ?? scenarioDisplayedPrice;
  const effectiveStdUnitPrice = effectiveDisplayedPrice / (displayFactor || 1);

  const oldStdTotal = existing
    ? existing.quantity * existing.unitPrice
    : (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0);

  const oldAmount = Math.round(oldStdTotal * displayFactor);
  const newAmount = Math.round(quantity * effectiveDisplayedPrice);
  const difference = newAmount - oldAmount;
  const projectedTotal = quantitatifTotal - oldAmount + newAmount;

  const unit = article?.unit || line?.unit || "";
  const designation = article?.name || line?.designation || "";

  const compatible = useQuery(
    api.quantitatifCustom.getCompatibleArticlesForLine,
    open && showPicker
      ? { projectId: projectId as any, lotId, designation: line?.designation ?? "", unit: line?.unit ?? "" }
      : "skip",
  );

  const filteredArticles = useMemo(() => {
    const list = compatible?.articles ?? [];
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a: any) => a.name.toLowerCase().includes(q));
  }, [compatible, pickerQuery]);

  const pickArticle = (a: any) => {
    const sameUnit = a.unit === (line?.unit ?? "");
    setArticle({ name: a.name, unit: a.unit, unitPrice: a.unitPrice, replaced: true });
    setUnitPriceInput(String(Math.round(a.unitPrice * displayFactor * 100) / 100));
    if (!sameUnit) setQuantity(1);
    setShowPicker(false);
    toast.success(
      sameUnit
        ? `Article remplacé par « ${a.name} »`
        : `Article remplacé — quantité ajustée à 1 (${a.unit})`,
    );
  };

  const revertArticle = () => {
    setArticle(null);
    setUnitPriceInput(
      String(Math.round((Number(line?.unitPrice) || 0) * displayFactor * 100) / 100),
    );
    setQuantity(Number(line?.quantity) || 1);
    setScenario(displayedScenario);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!(quantity > 0)) {
      toast.error("La quantité doit être supérieure à 0");
      return;
    }
    if (!(effectiveDisplayedPrice > 0) || !(effectiveStdUnitPrice > 0)) {
      toast.error("Le prix unitaire doit être supérieur à 0");
      return;
    }
    setSaving(true);
    try {
      const storedScenario: BudgetScenarioKey =
        scenario === PERSONALIZED_SCENARIO_KEY
          ? (existing?.priceScenario ?? baseScenario)
          : scenario;
      const result = await saveItem({
        projectId: projectId as any,
        lotId,
        lotName,
        lineIndex,
        baseDesignation: line?.designation ?? "",
        designation,
        unit,
        baseUnit: line?.unit ?? "",
        quantity,
        baseQuantity: Number(line?.quantity) || 0,
        unitPrice: Math.round(effectiveStdUnitPrice * 100) / 100,
        baseUnitPrice: Math.round((Number(line?.unitPrice) || 0) * 100) / 100,
        nature: line?.nature ?? "materiaux",
        priceScenario: storedScenario,
        replacedArticle: !!article,
        baseScenario,
      });
      toast.success(
        result?.removed
          ? "Article réinitialisé (aucune modification)"
          : "Article enregistré dans le scénario Personnalisé",
      );
      if (!result?.removed) onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await resetItem({ projectId: projectId as any, lineKey: `${lotId}::${lineIndex}` });
      toast.success("Article réinitialisé selon le scénario de référence");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la réinitialisation");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Modifier l'article
          </DialogTitle>
          <DialogDescription className="text-xs">
            Personnalisation limitée aux catégories Frais Préliminaires, Gros œuvre,
            Second œuvre et Aménagements extérieurs. Les scénarios Économique, Standard
            et Premium ne sont jamais modifiés.
          </DialogDescription>
        </DialogHeader>

        {showPicker ? (
          /* ───────────── Sélection d'un article compatible ───────────── */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setShowPicker(false)}
              >
                <ArrowLeft className="h-3 w-3" />
                Retour
              </Button>
              <span className="text-xs font-semibold">Articles compatibles</span>
              <Badge variant="secondary" className="text-[9px] ml-auto">
                {filteredArticles.length}
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Rechercher un article…"
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="rounded-lg border divide-y divide-border/10 max-h-[45vh] overflow-y-auto">
              {compatible === undefined && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Recherche des articles compatibles…
                </div>
              )}
              {compatible !== undefined && filteredArticles.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Aucun article compatible trouvé dans le référentiel pour cet usage.
                </p>
              )}
              {filteredArticles.map((a: any) => (
                <button
                  key={`${a.category}-${a.name}`}
                  type="button"
                  onClick={() => pickArticle(a)}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium leading-snug">{a.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{a.unit}</span>
                      {a.unitCompatible && (
                        <Badge variant="outline" className="text-[8px] h-4 px-1 border-emerald-300/50 text-emerald-600">
                          unité compatible
                        </Badge>
                      )}
                      {a.sameSubcategory && !a.unitCompatible && (
                        <Badge variant="outline" className="text-[8px] h-4 px-1">
                          même usage
                        </Badge>
                      )}
                      {a.sku && (
                        <span className="text-[9px] font-mono text-muted-foreground/50">{a.sku}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums shrink-0">
                    {fmt(a.unitPrice * displayFactor)}
                  </span>
                </button>
              ))}
            </div>
            {compatible?.reference && (
              <p className="text-[10px] text-muted-foreground">
                Référence de l'article d'origine : {compatible.reference.name} —{" "}
                {fmt(compatible.reference.unitPrice)} / {compatible.reference.unit}
              </p>
            )}
          </div>
        ) : (
          /* ───────────── Édition de l'article ───────────── */
          <div className="space-y-3">
            {/* Informations */}
            <div className="rounded-lg border bg-muted/10 p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Informations
              </p>
              <Row label="Nom" value={designation} />
              <Row label="Catégorie" value={lotName} />
              <Row label="Unité" value={unit} />
              <Row
                label="Quantité"
                valueNode={
                  <Input
                    value={String(quantity)}
                    onChange={(e) => {
                      const parsed = Number(e.target.value.replace(",", "."));
                      setQuantity(Number.isFinite(parsed) ? parsed : 0);
                    }}
                    inputMode="decimal"
                    className="h-6 w-24 text-[11px] text-right tabular-nums ml-auto"
                  />
                }
              />
              <Row
                label="Prix unitaire"
                valueNode={
                  <Input
                    value={unitPriceInput}
                    onChange={(e) => setUnitPriceInput(e.target.value)}
                    inputMode="decimal"
                    className="h-6 w-28 text-[11px] text-right tabular-nums ml-auto"
                  />
                }
                hint={
                  manualDisplayedPrice != null &&
                  Math.abs(manualDisplayedPrice - scenarioDisplayedPrice) > 0.01
                    ? "prix personnalisé"
                    : undefined
                }
              />
              <Row label="Montant" value={fmt(newAmount)} strong />
            </div>

            {/* Scénario de budget */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Scénario de budget
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  // Valeurs déjà utilisées par le moteur de calcul : le choix
                  // d'un scénario recalcule le prix unitaire de l'article.
                  ...BUDGET_SCENARIO_KEYS.map((k) => {
                    const std = unitPriceForScenario(articleStandardBase, scenarios, k);
                    return {
                      key: k as ArticleScenarioChoice,
                      label: BUDGET_SCENARIO_LABELS[k],
                      raw: std,
                      hint: `${fmt(std * displayFactor)} / ${unit}`,
                    };
                  }),
                  {
                    key: PERSONALIZED_SCENARIO_KEY as ArticleScenarioChoice,
                    label: PERSONALIZED_SCENARIO_LABEL,
                    // Valeur personnalisée déjà enregistrée pour cet article,
                    // sinon niveau de référence (catalogue).
                    raw: existing ? existing.unitPrice : articleStandardBase,
                    hint: existing ? "valeur personnalisée" : "niveau de référence",
                  },
                ].map((opt) => {
                  const active = scenario === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setScenario(opt.key);
                        setUnitPriceInput(
                          String(Math.round(opt.raw * displayFactor * 100) / 100),
                        );
                      }}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border p-2 text-left transition-all",
                        active
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-border hover:bg-muted/20",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 h-3 w-3 shrink-0 rounded-full border-2",
                          active ? "border-primary bg-primary" : "border-muted-foreground/40",
                        )}
                      />
                      <span className="min-w-0">
                        <span className={cn("block text-[11px] font-semibold", active && "text-primary")}>
                          {opt.label}
                        </span>
                        <span className="block text-[9px] text-muted-foreground truncate">
                          {opt.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modifier l'article */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Modifier l'article
              </p>
              {article ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">{article.name}</p>
                    <p className="text-[9px] text-muted-foreground">
                      Article de remplacement — {fmt(article.unitPrice)} / {article.unit}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={revertArticle}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Article actuel : <span className="font-medium text-foreground/80">{line?.designation}</span>
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
                onClick={() => setShowPicker(true)}
              >
                <Search className="h-3.5 w-3.5" />
                Choisir un article compatible
              </Button>
            </div>

            {/* Impact */}
            <div className="rounded-lg border bg-muted/10 p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Impact
              </p>
              <Row label="Ancien montant" value={fmt(oldAmount)} />
              <Row label="Nouveau montant" value={fmt(newAmount)} strong />
              <Row
                label="Différence"
                valueNode={
                  <span
                    className={cn(
                      "text-[11px] font-bold tabular-nums ml-auto",
                      difference > 0 ? "text-amber-600" : difference < 0 ? "text-emerald-600" : "text-muted-foreground",
                    )}
                  >
                    {difference > 0 ? "+" : ""}
                    {fmt(difference)}
                  </span>
                }
              />
              <div className="border-t border-border/20 pt-1.5 mt-1">
                <Row
                  label="Total personnalisé du projet"
                  valueNode={
                    <span className="text-[11px] font-bold tabular-nums text-primary ml-auto">
                      {fmt(projectedTotal)}
                    </span>
                  }
                />
                {builtSurface > 0 && (
                  <p className="text-[9px] text-muted-foreground text-right">
                    soit {fmt(Math.round(projectedTotal / builtSurface))}/m²
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="flex-1 min-w-[120px] text-xs gap-1.5"
                onClick={handleSave}
                disabled={saving || resetting}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Enregistrer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => onOpenChange(false)}
                disabled={saving || resetting}
              >
                Annuler
              </Button>
              {existing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-amber-600 hover:text-amber-700"
                  onClick={handleReset}
                  disabled={saving || resetting}
                >
                  {resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  Réinitialiser cet article
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  valueNode,
  hint,
  strong,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
      {hint && <span className="text-[8px] text-muted-foreground/60 italic">{hint}</span>}
      <div className="ml-auto min-w-0 text-right">
        {valueNode ?? (
          <span className={cn("text-[11px] tabular-nums", strong ? "font-bold" : "font-medium")}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
