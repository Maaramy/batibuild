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
  Lock,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import {
  BUDGET_SCENARIO_KEYS,
  BUDGET_SCENARIO_LABELS,
  DELETE_POSTE_CONFIRMATION,
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
  PROTECTED_POSTE_MESSAGE,
  posteProtectionReason,
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

/** Message exact affiché lorsqu'aucun article du même usage n'existe. */
export const NO_COMPATIBLE_ARTICLE_MESSAGE =
  "Aucun article compatible trouvé dans le référentiel pour cet usage.";

export type ArticleScenarioChoice = BudgetScenarioKey | typeof PERSONALIZED_SCENARIO_KEY;

interface SelectedArticle {
  name: string;
  unit: string;
  /** L'article provient de la liste prédéfinie (remplacement). */
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
  const removePoste = useMutation(api.quantitatifCustom.removeQuantitatifPoste);

  // Le popup est monté à chaque ouverture sur un article : l'état initial est
  // donc dérivé directement des props (aucune synchronisation nécessaire).
  const displayFactor = (scaleFactor || 1) * (realCostFactor || 1);

  const [scenario, setScenario] = useState<ArticleScenarioChoice>(
    existing?.priceScenario ?? displayedScenario,
  );
  const [article, setArticle] = useState<SelectedArticle | null>(() =>
    existing?.replacedArticle
      ? { name: existing.designation, unit: existing.unit, replaced: true }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Confirmation de suppression du poste : la suppression n'est enregistrée
  // qu'après validation explicite, et peut toujours être annulée.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  // ── Quantité & prix unitaire : VERROUILLÉS ──────────────────────────────
  // Ces deux valeurs proviennent exclusivement de l'article de référence du
  // quantitatif (ou de la personnalisation déjà enregistrée). Elles sont
  // affichées en lecture seule et ne peuvent être modifiées ni par saisie, ni
  // par boutons, ni au clavier, ni via le DOM. Le montant reste recalculé
  // automatiquement : montant = quantité × prix unitaire. Le serveur relit lui
  // aussi ces deux valeurs (voir `saveItemCustomization`) : la restriction
  // n'est donc pas contournable. Choisir un article compatible ne met à jour
  // que les informations autorisées de l'article (désignation, unité).
  const quantity = Number(existing?.quantity ?? line?.quantity) || 0;

  // Prix de référence (niveau « Standard » du moteur) de l'article de
  // référence : il n'est jamais remplacé par un prix saisi par l'utilisateur,
  // ni par le prix catalogue d'un article de remplacement.
  const baseStandardPrice = existing
    ? standardLevelFromPrice(existing.unitPrice, scenarios, existing.priceScenario)
    : Number(line?.unitPrice) || 0;

  // Montant affiché exprimé au niveau du scénario affiché (comme le tableau du
  // quantitatif) ; seule la valeur enregistrée est ramenée au niveau de
  // référence du moteur.
  const scenarioDisplayedPrice = useMemo(() => {
    const stdPrice =
      scenario === PERSONALIZED_SCENARIO_KEY
        ? existing
          ? existing.unitPrice
          : baseStandardPrice
        : unitPriceForScenario(baseStandardPrice, scenarios, scenario);
    return Math.round(stdPrice * displayFactor * 100) / 100;
  }, [scenario, existing, baseStandardPrice, scenarios, displayFactor]);

  const effectiveStdUnitPrice = scenarioDisplayedPrice / (displayFactor || 1);

  const oldStdTotal = existing
    ? existing.quantity * existing.unitPrice
    : (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0);

  const oldAmount = Math.round(oldStdTotal * displayFactor);
  const newAmount = Math.round(quantity * scenarioDisplayedPrice);
  const difference = newAmount - oldAmount;
  const projectedTotal = quantitatifTotal - oldAmount + newAmount;

  const unit = article?.unit || line?.unit || "";
  const designation = article?.name || line?.designation || "";

  // ── Protection du poste ────────────────────────────────────────────────
  // Évaluée sur le POSTE DE RÉFÉRENCE du quantitatif du projet (jamais sur un
  // libellé saisi par l'utilisateur) avec les identifiants stables de
  // l'architecture (catégorie, nature, clé de libellé normalisée). La mutation
  // Convex applique exactement la même règle : l'option masquée ici ne peut
  // pas être contournée par un appel direct.
  const protectionReason = posteProtectionReason({
    lotId,
    lotName,
    designation: line?.designation,
    nature: line?.nature,
  });
  const posteDeletable = protectionReason === null;

  // Les articles compatibles sont chargés dès l'ouverture du popup : leur
  // absence doit masquer complètement la barre « Choisir un article
  // compatible » (aucun champ de recherche vide, aucune liste vide, aucune
  // proposition provenant d'un autre usage).
  const compatible = useQuery(
    api.quantitatifCustom.getCompatibleArticlesForLine,
    open
      ? { projectId: projectId as any, lotId, designation: line?.designation ?? "", unit: line?.unit ?? "" }
      : "skip",
  );
  const compatibleLoaded = compatible !== undefined;
  const hasCompatible = (compatible?.articles?.length ?? 0) > 0;

  const filteredArticles = useMemo(() => {
    const list = compatible?.articles ?? [];
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a: any) => a.name.toLowerCase().includes(q));
  }, [compatible, pickerQuery]);

  const pickArticle = (a: any) => {
    // Seules les informations autorisées de l'article changent : la quantité et
    // le prix unitaire (donc le montant) restent verrouillés par le système.
    setArticle({ name: a.name, unit: a.unit, replaced: true });
    setShowPicker(false);
    toast.success(`Article remplacé par « ${a.name} » — quantité et prix unitaire inchangés`);
  };

  const revertArticle = () => {
    setArticle(null);
    setScenario(displayedScenario);
  };

  const handleSave = async () => {
    if (saving) return;
    // Quantité et prix unitaire sont verrouillés (valeurs de référence) : on
    // vérifie seulement qu'ils restent exploitables pour le calcul du montant.
    if (!(quantity > 0)) {
      toast.error("La quantité de référence de l'article doit être supérieure à 0");
      return;
    }
    if (!(scenarioDisplayedPrice > 0) || !(effectiveStdUnitPrice > 0)) {
      toast.error("Le prix unitaire de référence de l'article doit être supérieur à 0");
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

  /**
   * Supprime le poste depuis « Modifier l'article ». Un poste protégé est
   * refusé avant même l'appel réseau (et de nouveau côté serveur).
   */
  const handleDeletePoste = async () => {
    if (deleting || !posteDeletable) return;
    setDeleting(true);
    try {
      const result = await removePoste({
        projectId: projectId as any,
        lotId,
        lineIndex,
        baseDesignation: line?.designation ?? "",
        baseScenario,
      });
      toast.success(
        `Poste « ${result?.designation ?? line?.designation ?? designation} » supprimé du scénario Personnalisé`,
      );
      setConfirmDelete(false);
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression du poste");
    } finally {
      setDeleting(false);
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

        {showPicker && hasCompatible ? (
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

            <p className="text-[10px] text-muted-foreground">
              Articles du même usage que l'article actuel uniquement. Prix indicatifs du
              référentiel — la quantité et le prix unitaire de l'article restent verrouillés.
            </p>

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
              {filteredArticles.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Aucun article ne correspond à votre recherche.
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
                          même sous-famille
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
              {/* Quantité et prix unitaire : lecture seule stricte — aucun champ
                  éditable, aucun bouton +/−, donc aucune saisie possible (ni au
                  clavier, ni via le DOM). */}
              <Row label="Quantité" valueNode={<ReadOnlyValue value={String(quantity)} />} />
              <Row
                label="Prix unitaire"
                valueNode={<ReadOnlyValue value={fmt(scenarioDisplayedPrice)} />}
                hint="verrouillé"
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
                    const std = unitPriceForScenario(baseStandardPrice, scenarios, k);
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
                    raw: existing ? existing.unitPrice : baseStandardPrice,
                    hint: existing ? "valeur personnalisée" : "niveau de référence",
                  },
                ].map((opt) => {
                  const active = scenario === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setScenario(opt.key)}
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
                      Article de remplacement — unité {article.unit || "—"} · quantité et prix
                      unitaire verrouillés
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
              {/* Aucun article du même usage dans le référentiel : la barre
                  « Choisir un article compatible » est entièrement masquée
                  (pas de champ vide, pas de liste vide, aucun article d'un
                  autre usage) et l'article sélectionné est conservé. */}
              {!compatibleLoaded ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Recherche des articles compatibles…
                </div>
              ) : hasCompatible ? (
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
              ) : (
                <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[10px] leading-snug text-amber-700">
                  {NO_COMPATIBLE_ARTICLE_MESSAGE}
                </p>
              )}
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

            {/* Suppression du poste (distincte de toute suppression de
                catégorie / sous-catégorie, qui n'existe pas dans l'app) */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Supprimer ce poste
              </p>
              {!posteDeletable ? (
                <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 space-y-1">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-800">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                    {PROTECTED_POSTE_MESSAGE}
                  </p>
                  <p className="text-[9px] leading-snug text-amber-700">
                    Motif : <span className="font-medium">{protectionReason}</span>. Ce poste est
                    indispensable au DQE, aux quantités et aux calculs de coûts : il ne peut pas
                    être retiré du quantitatif.
                  </p>
                </div>
              ) : confirmDelete ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                    Supprimer ce poste ?
                  </p>
                  <p className="text-[10px] leading-snug text-foreground/80">
                    {DELETE_POSTE_CONFIRMATION}
                  </p>
                  <div className="rounded-md border border-border/40 bg-background/70 px-2 py-1.5 space-y-1">
                    <Row label="Poste" value={line?.designation ?? designation} />
                    <Row label="Montant retiré" value={fmt(oldAmount)} strong />
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    Seul le scénario Personnalisé est modifié : les scénarios Économique,
                    Standard et Premium restent inchangés, et le poste reste présent dans le DQE
                    de référence du projet.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="text-xs gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeletePoste}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Supprimer le poste
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                    >
                      Annuler la suppression
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving || resetting || deleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer ce poste
                </Button>
              )}
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

/**
 * Valeur strictement en lecture seule : aucun élément éditable n'est rendu, la
 * valeur ne peut donc pas être modifiée par saisie, au clavier ou via le DOM.
 */
function ReadOnlyValue({ value }: { value: string }) {
  return (
    <span
      aria-readonly="true"
      title="Valeur verrouillée (lecture seule)"
      className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/40 px-2 py-0.5 ml-auto select-none"
    >
      <Lock className="h-3 w-3 text-muted-foreground/60" />
      <span className="text-[11px] font-medium tabular-nums text-foreground/80">{value}</span>
    </span>
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
