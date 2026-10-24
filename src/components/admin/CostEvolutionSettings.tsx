import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  Loader2,
  Percent,
  RotateCcw,
  Save,
  Sliders,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtTnd } from "@/lib/projectGuideFormat";
import {
  COST_COMPONENT_LABELS,
  COST_EVOLUTION_CATEGORIES,
  COST_EVOLUTION_CATEGORY_LABELS,
  COST_EVOLUTION_DISCLAIMER,
  COST_EVOLUTION_RATE_MAX,
  COST_EVOLUTION_SCENARIOS,
  COST_EVOLUTION_SCENARIO_LABELS,
  COST_EVOLUTION_YEARS_MAX,
  buildImpactPreview,
  normalizeCostEvolutionSettings,
  validateCostEvolutionSettings,
  type CostComponentKey,
  type CostEvolutionCategory,
  type CostEvolutionCategoryKey,
  type CostEvolutionScenarioKey,
  type CostEvolutionSettings,
} from "@/lib/costEvolution";

// ============================================================================
// ADMINISTRATION — ÉVOLUTION ANNUELLE DES COÛTS DE CONSTRUCTION
// ----------------------------------------------------------------------------
// Paramètres → Barème des coûts → Évolution annuelle des coûts.
//
// • Les taux sont enregistrés en base (Convex) et versionnés : aucune
//   intervention dans le code source n'est nécessaire.
// • La prévisualisation est calculée LOCALEMENT sur le brouillon (fonction pure
//   `buildImpactPreview`) : elle n'écrit rien et permet de comparer avant
//   d'enregistrer.
// • Aucune estimation existante n'est recalculée : l'enregistrement ne modifie
//   aucun projet.
// ============================================================================

/** ms epoch → valeur d'un <input type="date">. */
const toDateInput = (ms?: number | null) =>
  typeof ms === "number" && ms > 0 ? new Date(ms).toISOString().slice(0, 10) : "";

/** Valeur d'un <input type="date"> → ms epoch (UTC). */
const fromDateInput = (value: string) =>
  value ? Date.parse(`${value}T00:00:00Z`) : undefined;

const fmtPct = (n: number) =>
  `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

/** Champ numérique éditable : la valeur brute est conservée pour la saisie. */
function RateInput({
  value,
  onChange,
  label,
  id,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  id?: string;
  className?: string;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const shown = raw ?? String(value);
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      step="0.1"
      min={0}
      max={COST_EVOLUTION_RATE_MAX}
      value={shown}
      aria-label={label}
      className={cn("h-9 text-sm tabular-nums", className)}
      onChange={(e) => {
        const next = e.target.value;
        setRaw(next);
        const parsed = Number(next.replace(",", "."));
        if (next.trim() !== "" && Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={() => setRaw(null)}
    />
  );
}

export default function CostEvolutionSettings() {
  const config = useQuery(api.costEvolution.getConfig);
  const history = useQuery(api.costEvolution.getHistory, { limit: 12 }) ?? [];
  const saveConfig = useMutation(api.costEvolution.saveConfig);
  const resetDefaults = useMutation(api.costEvolution.resetDefaults);
  const setEnabledMutation = useMutation(api.costEvolution.setEnabled);

  // ── Brouillon : valeurs en cours d'édition (non enregistrées) ──
  const [draft, setDraft] = useState<CostEvolutionSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [detailOpen, setDetailOpen] = useState<CostEvolutionCategoryKey[]>([]);

  // ── Aperçu d'impact (lecture seule) ──
  const [showPreview, setShowPreview] = useState(false);
  const [previewCost, setPreviewCost] = useState("200000");
  const [previewYears, setPreviewYears] = useState("1");
  const [previewScenario, setPreviewScenario] = useState<CostEvolutionScenarioKey | null>(null);

  const stored: CostEvolutionSettings = useMemo(
    () => normalizeCostEvolutionSettings(config ?? undefined),
    [config],
  );
  const settings = draft ?? stored;
  const dirty = draft !== null;

  const errors = useMemo(() => validateCostEvolutionSettings(settings), [settings]);

  const preview = useMemo(() => {
    if (!showPreview) return null;
    const reference = Number(previewCost.replace(",", "."));
    const years = Number(previewYears.replace(",", "."));
    return buildImpactPreview({
      settings,
      referenceCost: Number.isFinite(reference) && reference > 0 ? reference : 0,
      years: Number.isFinite(years) ? years : 1,
      scenario: previewScenario ?? settings.defaultScenario,
    });
  }, [showPreview, previewCost, previewYears, previewScenario, settings]);

  const patch = (next: Partial<CostEvolutionSettings>) =>
    setDraft({ ...settings, ...next });

  const patchCategory = (key: CostEvolutionCategoryKey, next: Partial<CostEvolutionCategory>) =>
    patch({
      categories: settings.categories.map((c) => (c.key === key ? { ...c, ...next } : c)),
    });

  const toggleDetail = (key: CostEvolutionCategoryKey) =>
    setDetailOpen((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const handleSave = async () => {
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setSaving(true);
    try {
      await saveConfig({
        referenceYear: settings.referenceYear,
        effectiveFrom: settings.effectiveFrom,
        defaultScenario: settings.defaultScenario,
        customRate: settings.customRate,
        enabled: settings.enabled,
        scenarioRates: settings.scenarioRates,
        categories: settings.categories.map((c) => ({
          key: c.key,
          rate: c.rate,
          useComponents: c.useComponents,
          components: { ...c.components },
        })),
      });
      toast.success(
        settings.enabled
          ? "Barème d'évolution enregistré et activé"
          : "Barème d'évolution enregistré (mécanisme inactif)",
      );
      setDraft(null);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement du barème");
    }
    setSaving(false);
  };

  const handleToggle = async (enabled: boolean) => {
    // Des modifications sont en cours : le statut fait partie du brouillon et
    // sera enregistré avec le reste (aucune saisie perdue par le basculement).
    if (dirty) {
      setDraft({ ...settings, enabled });
      return;
    }
    setDraft({ ...settings, enabled });
    try {
      await setEnabledMutation({ enabled });
      toast.success(enabled ? "Mécanisme activé" : "Mécanisme désactivé (paramètres conservés)");
      setDraft(null);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du changement de statut");
      setDraft(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDefaults({});
      setDraft(null);
      toast.success("Valeurs par défaut restaurées (3 / 5 / 8 %, tous les postes à 3 %)");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la réinitialisation");
    }
    setResetting(false);
  };

  const globalRate = settings.scenarioRates[settings.defaultScenario];
  const isActive = settings.enabled;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Paramètres généraux ─────────────────────────────────────────── */}
      <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 flex items-center justify-center ring-1 ring-cyan-500/20">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Paramètres → Barème des coûts
                </p>
                <CardTitle className="text-sm sm:text-base">
                  Évolution annuelle des coûts de construction
                </CardTitle>
                <CardDescription className="text-xs leading-snug">
                  Taux d'évolution paramétrables par poste, projections transparentes et
                  historique versionné. Aucune estimation existante n'est recalculée.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] gap-1",
                  isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-muted-foreground/60",
                  )}
                />
                {isActive ? "Actif" : "Inactif"}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <BadgeCheck className="h-3 w-3" />v{config?.version ?? 0}
              </Badge>
              {dirty && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  Modifications non enregistrées
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {/* Mention obligatoire : hypothèses, jamais des taux officiels. */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">
              3 % · 5 % · 8 % sont des <strong>hypothèses de simulation</strong> modifiables. Elles
              ne sont jamais présentées comme des taux officiels garantis du marché tunisien.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ce-year" className="text-[11px] text-muted-foreground">
                Année de référence
              </Label>
              <Input
                id="ce-year"
                type="number"
                inputMode="numeric"
                className="h-9 text-sm tabular-nums"
                value={String(settings.referenceYear)}
                onChange={(e) => patch({ referenceYear: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ce-date" className="text-[11px] text-muted-foreground">
                Date d'application
              </Label>
              <Input
                id="ce-date"
                type="date"
                className="h-9 text-sm"
                value={toDateInput(settings.effectiveFrom)}
                onChange={(e) =>
                  patch({ effectiveFrom: fromDateInput(e.target.value) ?? settings.effectiveFrom })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ce-global" className="text-[11px] text-muted-foreground">
                Taux annuel global (%)
              </Label>
              <div className="relative">
                <RateInput
                  id="ce-global"
                  label="Taux annuel global"
                  value={globalRate}
                  onChange={(rate) =>
                    patch({
                      scenarioRates: { ...settings.scenarioRates, [settings.defaultScenario]: rate },
                    })
                  }
                  className="pr-7"
                />
                <Percent className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Taux du scénario « {COST_EVOLUTION_SCENARIO_LABELS[settings.defaultScenario]} »
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Scénario par défaut</Label>
              <Select
                value={settings.defaultScenario}
                onValueChange={(value) =>
                  patch({ defaultScenario: value as CostEvolutionScenarioKey })
                }
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_EVOLUTION_SCENARIOS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label} — {settings.scenarioRates[s.key]} %
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <Switch
                id="ce-enabled"
                checked={isActive}
                onCheckedChange={handleToggle}
                aria-label="Activer l'évolution annuelle des coûts"
              />
              <div className="min-w-0">
                <Label htmlFor="ce-enabled" className="text-xs cursor-pointer">
                  Mécanisme {isActive ? "actif" : "inactif"}
                </Label>
                <p className="text-[10px] text-muted-foreground/70 leading-snug">
                  {isActive
                    ? "Les taux s'appliquent aux nouvelles estimations et aux projections demandées."
                    : "Aucun taux n'est appliqué. Les paramètres restent enregistrés."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowPreview((v) => !v)}
              >
                <Sliders className="h-3.5 w-3.5" />
                {showPreview ? "Masquer l'aperçu" : "Prévisualiser l'impact"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Réinitialiser
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleSave}
                disabled={saving || errors.length > 0}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Enregistrer les paramètres
              </Button>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 space-y-1">
              {errors.slice(0, 4).map((error) => (
                <p key={error} className="text-[11px] text-destructive leading-snug">
                  {error}
                </p>
              ))}
            </div>
          )}

          {config?.updatedAt && (
            <p className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <CalendarClock className="h-3 w-3" />
              Dernière mise à jour : {new Date(config.updatedAt).toLocaleString("fr-FR")}
              {config.updatedByName ? ` · ${config.updatedByName}` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Trois scénarios ─────────────────────────────────────────────── */}
      <Card className="border border-border/40">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            Scénarios d'évolution
          </CardTitle>
          <CardDescription className="text-[11px]">
            Chaque taux est modifiable ; le scénario sélectionné est utilisé par défaut dans les
            projections.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COST_EVOLUTION_SCENARIOS.map((scenario) => {
              const selected = settings.defaultScenario === scenario.key;
              return (
                <div
                  key={scenario.key}
                  className={cn(
                    "rounded-xl border p-3 space-y-2 transition-colors",
                    selected
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-border/40 bg-muted/10",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{scenario.label}</span>
                    {selected && (
                      <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                        Par défaut
                      </Badge>
                    )}
                  </div>
                  <div className="relative">
                    <RateInput
                      label={`Taux ${scenario.label}`}
                      value={settings.scenarioRates[scenario.key]}
                      onChange={(rate) =>
                        patch({ scenarioRates: { ...settings.scenarioRates, [scenario.key]: rate } })
                      }
                      className="pr-7"
                    />
                    <Percent className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Button
                    size="sm"
                    variant={selected ? "default" : "ghost"}
                    className="h-7 w-full text-[11px]"
                    onClick={() => patch({ defaultScenario: scenario.key })}
                    disabled={selected}
                  >
                    {selected ? "Sélectionné" : "Utiliser par défaut"}
                  </Button>
                </div>
              );
            })}

            <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-3 space-y-2">
              <span className="text-xs font-medium">Taux personnalisé</span>
              <div className="relative">
                <RateInput
                  label="Taux personnalisé"
                  value={settings.customRate}
                  onChange={(rate) => patch({ customRate: rate })}
                  className="pr-7"
                />
                <Percent className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground/70">
                Saisie libre pour une projection ponctuelle — n'écrase aucun scénario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Taux par poste ──────────────────────────────────────────────── */}
      <Card className="border border-border/40">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Taux par poste de construction
          </CardTitle>
          <CardDescription className="text-[11px]">
            Chaque poste possède son propre taux. Le détail permet de distinguer matériaux,
            main-d'œuvre, transport et équipements.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-1.5">
          {settings.categories.map((category) => {
            const expanded = detailOpen.includes(category.key);
            return (
              <div
                key={category.key}
                className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs font-medium truncate">
                      {COST_EVOLUTION_CATEGORY_LABELS[category.key]}
                    </p>
                    {category.useComponents && (
                      <p className="text-[9px] text-cyan-600 dark:text-cyan-400">
                        Calcul par composantes
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <RateInput
                        label={`Taux ${COST_EVOLUTION_CATEGORY_LABELS[category.key]}`}
                        value={category.rate}
                        onChange={(rate) => patchCategory(category.key, { rate })}
                        className="w-20 pr-6"
                      />
                      <Percent className="pointer-events-none absolute right-1.5 top-2.5 h-3 w-3 text-muted-foreground" />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-[10px] gap-1"
                      onClick={() => toggleDetail(category.key)}
                      aria-expanded={expanded}
                    >
                      {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      Détail
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-2 space-y-2 rounded-md bg-muted/20 p-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`ce-components-${category.key}`}
                        checked={category.useComponents}
                        onCheckedChange={(checked) =>
                          patchCategory(category.key, { useComponents: checked })
                        }
                      />
                      <Label
                        htmlFor={`ce-components-${category.key}`}
                        className="text-[10px] cursor-pointer leading-snug"
                      >
                        Calculer à partir des composantes (matériaux, main-d'œuvre, transport,
                        équipements)
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {(Object.keys(COST_COMPONENT_LABELS) as CostComponentKey[]).map((component) => (
                        <div key={component} className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            {COST_COMPONENT_LABELS[component]} (%)
                          </Label>
                          <RateInput
                            label={`${COST_COMPONENT_LABELS[component]} — ${COST_EVOLUTION_CATEGORY_LABELS[category.key]}`}
                            value={category.components[component]}
                            onChange={(rate) =>
                              patchCategory(category.key, {
                                components: { ...category.components, [component]: rate },
                              })
                            }
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Prévisualisation d'impact ───────────────────────────────────── */}
      {showPreview && preview && (
        <Card className="border border-cyan-500/25 bg-cyan-500/[0.03]">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-600" />
              Prévisualisation de l'impact
            </CardTitle>
            <CardDescription className="text-[11px]">
              Comparaison des trois scénarios — aucune donnée n'est modifiée avant confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ce-preview-cost" className="text-[11px] text-muted-foreground">
                  Coût de référence (TND)
                </Label>
                <Input
                  id="ce-preview-cost"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="h-9 text-sm tabular-nums"
                  value={previewCost}
                  onChange={(e) => setPreviewCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ce-preview-years" className="text-[11px] text-muted-foreground">
                  Horizon (années)
                </Label>
                <Input
                  id="ce-preview-years"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={COST_EVOLUTION_YEARS_MAX}
                  className="h-9 text-sm tabular-nums"
                  value={previewYears}
                  onChange={(e) => setPreviewYears(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Scénario comparé</Label>
                <Select
                  value={previewScenario ?? settings.defaultScenario}
                  onValueChange={(value) =>
                    setPreviewScenario(value as CostEvolutionScenarioKey)
                  }
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_EVOLUTION_SCENARIOS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {preview.scenarios.map((scenario) => (
                <div
                  key={scenario.key}
                  className={cn(
                    "rounded-lg border p-2.5",
                    scenario.key === preview.projection.scenario
                      ? "border-primary/40 bg-primary/[0.05]"
                      : "border-border/40",
                  )}
                >
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {scenario.label} · {fmtPct(scenario.rate)}
                  </p>
                  <p className="text-sm sm:text-base font-bold tabular-nums">
                    {fmtTnd(scenario.projectedCost)}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    +{fmtTnd(scenario.increase)} · +
                    {scenario.increasePct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] sm:text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/40">
                    <th className="py-1.5 pr-2 font-medium">Poste</th>
                    <th className="py-1.5 px-2 font-medium text-right">Taux</th>
                    <th className="py-1.5 px-2 font-medium text-right">Référence</th>
                    <th className="py-1.5 px-2 font-medium text-right">Projeté</th>
                    <th className="py-1.5 pl-2 font-medium text-right">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.projection.lines.map((line) => (
                    <tr key={line.key} className="border-b border-border/20 last:border-0">
                      <td className="py-1.5 pr-2">{line.label}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{fmtPct(line.rateApplied)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">
                        {fmtTnd(line.referenceCost)}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-medium">
                        {fmtTnd(line.projectedCost)}
                      </td>
                      <td className="py-1.5 pl-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                        +{fmtTnd(line.increase)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-1.5 pr-2">Total</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtPct(preview.projection.rate)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtTnd(preview.projection.referenceCost)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtTnd(preview.projection.projectedCost)}
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">
                      +{fmtTnd(preview.projection.increase)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground/80">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              {COST_EVOLUTION_DISCLAIMER}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Source de référence & historique ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border/40">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Source de référence
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2 text-[11px] leading-snug">
            <p className="text-muted-foreground">
              Le barème est <strong>saisi et validé par l'administrateur</strong>. Aucun taux
              officiel n'est inventé ni importé automatiquement.
            </p>
            <ul className="space-y-1 text-muted-foreground/80">
              <li>
                <strong>Taux administrateur</strong> : {fmtPct(globalRate)} (
                {COST_EVOLUTION_SCENARIO_LABELS[settings.defaultScenario]})
              </li>
              <li>
                <strong>Taux personnalisé</strong> : {fmtPct(settings.customRate)}
              </li>
              <li>
                <strong>Source officielle</strong> : non connectée — les publications de l'INS
                peuvent être reportées manuellement dans ce barème.
              </li>
              <li>
                <strong>Dernière mise à jour</strong> :{" "}
                {config?.updatedAt
                  ? new Date(config.updatedAt).toLocaleDateString("fr-FR")
                  : "valeurs par défaut"}
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Historique des versions
            </CardTitle>
            <CardDescription className="text-[11px]">
              Auteur, date et valeurs précédentes conservés pour chaque modification.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {history.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/70">
                Aucune modification enregistrée — le barème par défaut est en vigueur.
              </p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.map((entry: any) => (
                  <li key={entry._id} className="rounded-md border border-border/30 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium">v{entry.version}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(entry.changedAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {entry.details} · {entry.changedByName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[10px] text-muted-foreground/60 leading-snug">
        Barème par défaut : {COST_EVOLUTION_CATEGORIES.length} postes ·{" "}
        {COST_EVOLUTION_SCENARIOS.map((s) => s.label).join(" · ")}. Les nouveaux taux s'appliquent
        aux nouvelles estimations et aux projections explicitement demandées ; les estimations
        historiques ne sont jamais recalculées silencieusement.
      </p>
    </div>
  );
}
