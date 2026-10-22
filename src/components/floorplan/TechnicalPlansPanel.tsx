import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FileDown,
  Info,
  Layers3,
  Loader2,
  MousePointer2,
  Pencil,
  RefreshCw,
  Ruler,
  Save,
  Undo2,
  Zap,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlanZoomButtons } from "@/components/floorplan/PlanZoomButtons";
import { TechnicalPlan2D } from "@/components/floorplan/TechnicalPlan2D";
import { usePdfGate } from "@/hooks/use-pdf-gate";
import type { FloorPlanVariant } from "@/lib/floorPlanEngine";
import {
  ELECTRICAL_LEGEND,
  PLUMBING_LEGEND,
  aggregateTechnicalQuantities,
  electricalCircuitColor,
  generateElectricalPlan,
  generatePlumbingPlan,
  type Pt,
  type QuantityLine,
  type TechnicalPlan,
  type TechnicalPlanContext,
  type TechnicalPlanKind,
} from "@/lib/technicalPlanEngine";
import { priceQuantities, type DqeLotLike } from "@/lib/technicalPlanPricing";
import { downloadTechnicalPlanPdf } from "@/lib/technicalPlanPdf";
import { cn } from "@/lib/utils";

export interface SavedTechnicalPlan {
  kind: TechnicalPlanKind;
  variantId: string;
  level: number;
  version: number;
  overrides: Record<string, Pt>;
  updatedAt: number;
}

export interface TechnicalPlansPanelProps {
  projectId: string;
  projectName: string;
  project: {
    description?: string | null;
    bathrooms?: number | null;
    kitchens?: number | null;
    wcs?: number | null;
    dqe?: { lots?: DqeLotLike[] } | null;
  };
  variants: FloorPlanVariant[];
  kind: TechnicalPlanKind;
  savedPlans?: SavedTechnicalPlan[];
  initialVariantId?: string | null;
}

const ALL_LAYERS = {
  architecture: true,
  eau_froide: true,
  eau_chaude: true,
  evacuation: true,
  ventilation: true,
  appareils: true,
  accessoires: true,
  diametres: true,
  cotes: true,
  eclairage: true,
  prises: true,
  specialises: true,
  climatisation: true,
  cheminements: true,
  tableau: true,
  calibres: true,
} as const;

export function TechnicalPlansPanel({
  projectId,
  projectName,
  project,
  variants,
  kind,
  savedPlans,
  initialVariantId,
}: TechnicalPlansPanelProps) {
  const isPlumbing = kind === "plomberie";
  const pdfGate = usePdfGate();
  const savePlan = useMutation(api.technicalPlans.saveTechnicalPlan);
  const versions = useQuery(api.technicalPlans.getTechnicalPlanVersions, {
    projectId: projectId as Id<"projects">,
    kind,
  });

  const [variantId, setVariantId] = useState(initialVariantId || variants[0]?.id || "");
  const [level, setLevel] = useState(0);
  const [overridesByKey, setOverridesByKey] = useState<Record<string, Record<string, Pt>>>({});
  const [dirtyByKey, setDirtyByKey] = useState<Record<string, boolean>>({});
  const [layers, setLayers] = useState<Record<string, boolean>>({ ...ALL_LAYERS });
  const [editable, setEditable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const [revision, setRevision] = useState(0);
  const [scope, setScope] = useState<"level" | "building">("level");
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const hydratedRef = useRef<string | null>(null);

  // Équipements : valeurs déclaratives (jamais devinées silencieusement).
  // Les valeurs initiales viennent uniquement de la description saisie.
  const description = project.description ?? "";
  const [laundry, setLaundry] = useState(
    /buanderie|laundry|lave-linge|salle de linge/i.test(description),
  );
  const [dishwasher, setDishwasher] = useState(
    /lave-vaisselle|dishwasher/i.test(description),
  );
  const [waterHeater, setWaterHeater] = useState(true);
  const [airConditioning, setAirConditioning] = useState(true);

  useEffect(() => {
    if (initialVariantId && variants.some((v) => v.id === initialVariantId)) {
      setVariantId(initialVariantId);
      setLevel(0);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setSelectedId(null);
    }
  }, [initialVariantId, variants]);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const floors = variant?.floors ?? [];
  const floor = floors[Math.min(level, Math.max(0, floors.length - 1))];

  useEffect(() => {
    if (level > floors.length - 1) setLevel(Math.max(0, floors.length - 1));
  }, [floors.length, level]);

  const overrideKey = `${variant?.id ?? ""}:${level}`;
  const currentOverrides = overridesByKey[overrideKey] ?? {};
  const dirty = dirtyByKey[overrideKey] === true;

  const generationContext: TechnicalPlanContext = useMemo(
    () => ({
      description,
      laundry,
      dishwasher,
      waterHeater,
      airConditioning,
      bathrooms: project.bathrooms ?? undefined,
      kitchens: project.kitchens ?? undefined,
      wcs: project.wcs ?? undefined,
    }),
    [
      description,
      laundry,
      dishwasher,
      waterHeater,
      airConditioning,
      project.bathrooms,
      project.kitchens,
      project.wcs,
    ],
  );

  const technical: TechnicalPlan | null = useMemo(() => {
    if (!floor) return null;
    const input = {
      level: floor.level,
      floor,
      floors,
      context: generationContext,
      overrides: currentOverrides,
    };
    return isPlumbing ? generatePlumbingPlan(input) : generateElectricalPlan(input);
    // `revision` force un recalcul explicite des réseaux après modification.
  }, [floor, floors, generationContext, currentOverrides, isPlumbing, revision]);

  // Quantités de tous les niveaux : elles servent au récapitulatif « bâtiment »
  // et à la vérification des coûts (un réseau se chiffre à l'échelle du bâtiment).
  const allPlans = useMemo(() => {
    if (!variant) return [] as TechnicalPlan[];
    return variant.floors.map((f) => {
      const overrides = overridesByKey[`${variant.id}:${f.level}`] ?? {};
      const input = {
        level: f.level,
        floor: f,
        floors: variant.floors,
        context: generationContext,
        overrides,
      };
      return isPlumbing ? generatePlumbingPlan(input) : generateElectricalPlan(input);
    });
  }, [variant, overridesByKey, generationContext, isPlumbing, revision]);

  const aggregateQuantities = useMemo(
    () => aggregateTechnicalQuantities(allPlans),
    [allPlans],
  );
  const scopeQuantities: QuantityLine[] =
    scope === "building" ? aggregateQuantities : technical?.quantities ?? [];
  const lots = project.dqe?.lots ?? [];
  const priced = useMemo(() => priceQuantities(scopeQuantities, lots), [scopeQuantities, lots]);

  const saved = savedPlans?.find(
    (p) => p.kind === kind && p.variantId === variant?.id && p.level === level,
  );

  // Charge la dernière version enregistrée pour (variante, niveau) sans jamais
  // écraser des modifications en cours : la signature n'inclut que la version.
  useEffect(() => {
    const signature = `${overrideKey}:v${saved?.version ?? "none"}`;
    if (hydratedRef.current === signature) return;
    hydratedRef.current = signature;
    setOverridesByKey((prev) => ({
      ...prev,
      [overrideKey]: (saved?.overrides ?? {}) as Record<string, Pt>,
    }));
    setDirtyByKey((prev) => ({ ...prev, [overrideKey]: false }));
  }, [overrideKey, saved?.version, saved?.overrides]);

  const handleMovePoint = useCallback(
    (id: string, position: Pt) => {
      setOverridesByKey((prev) => ({
        ...prev,
        [overrideKey]: { ...(prev[overrideKey] ?? {}), [id]: position },
      }));
      setDirtyByKey((prev) => ({ ...prev, [overrideKey]: true }));
    },
    [overrideKey],
  );

  const resetPlan = (clearOverrides: boolean) => {
    if (clearOverrides) {
      setOverridesByKey((prev) => ({ ...prev, [overrideKey]: {} }));
      setDirtyByKey((prev) => ({ ...prev, [overrideKey]: false }));
      setSelectedId(null);
      toast.success("Plan réinitialisé depuis le plan architectural.");
    } else {
      toast.success("Réseaux recalculés depuis le plan architectural.");
    }
    setRevision((r) => r + 1);
  };

  const handleSave = async () => {
    if (!technical || saving) return;
    setSaving(true);
    try {
      const summary = {
        area: technical.area,
        length: technical.length,
        width: technical.width,
        itemCount:
          technical.kind === "plomberie" ? technical.fixtures.length : technical.points.length,
        pipeCount: technical.kind === "plomberie" ? technical.pipes.length : 0,
        circuitCount: technical.kind === "electricite" ? technical.circuits.length : 0,
        mainBreakerA: technical.kind === "electricite" ? technical.mainBreakerA : null,
        riser: technical.kind === "plomberie" ? technical.riser : technical.panel,
      };
      const result = await savePlan({
        projectId: projectId as Id<"projects">,
        kind,
        variantId: variant?.id ?? "",
        level,
        overrides: currentOverrides,
        quantities: technical.quantities,
        summary,
        note: `Plan ${isPlumbing ? "de plomberie" : "électrique"} — ${
          level === 0 ? "RDC" : `étage R+${level}`
        }`,
      });
      toast.success(`Plan enregistré dans le projet — version ${result.version}.`);
      setDirtyByKey((prev) => ({ ...prev, [overrideKey]: false }));
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'enregistrer le plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!variant || saving || savingAll) return;
    setSavingAll(true);
    try {
      let lastVersion = 0;
      for (let i = 0; i < variant.floors.length; i++) {
        const f = variant.floors[i];
        const plan = allPlans[i];
        if (!plan) continue;
        const overrides = overridesByKey[`${variant.id}:${f.level}`] ?? {};
        const summary = {
          area: plan.area,
          length: plan.length,
          width: plan.width,
          itemCount: plan.kind === "plomberie" ? plan.fixtures.length : plan.points.length,
          riser: plan.riser,
        };
        const result = await savePlan({
          projectId: projectId as Id<"projects">,
          kind,
          variantId: variant.id,
          level: f.level,
          overrides,
          quantities: plan.quantities,
          summary,
          note: `Plan ${isPlumbing ? "de plomberie" : "électrique"} — ${
            f.level === 0 ? "RDC" : `étage R+${f.level}`
          } (bâtiment complet)`,
        });
        lastVersion = result.version;
      }
      toast.success(`Tous les niveaux ont été enregistrés — dernière version ${lastVersion}.`);
      setDirtyByKey({});
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'enregistrer tous les niveaux.");
    } finally {
      setSavingAll(false);
    }
  };

  const handlePdf = () => {
    if (!technical || pdfBusy) return;
    pdfGate.requestPdfDownload(async () => {
      setPdfBusy(true);
      try {
        await downloadTechnicalPlanPdf({
          plan: floor,
          technical,
          projectName,
          variantName: variant?.name ?? "",
          quantities: scopeQuantities,
          lots,
        });
      } catch (err) {
        console.error("Erreur export PDF du plan technique :", err);
        toast.error("L'export PDF du plan technique a échoué.");
      } finally {
        setPdfBusy(false);
      }
    });
  };

  if (!variant || !floor) {
    return (
      <Card>
        <CardContent className="flex items-start gap-2 p-5 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Aucune variante architecturale n'est disponible : lancez d'abord la génération des plans
          architecturaux pour dériver les réseaux techniques.
        </CardContent>
      </Card>
    );
  }

  const selected =
    technical?.kind === "plomberie"
      ? technical.fixtures.find((f) => f.id === selectedId) ??
        technical.accessories.find((a) => a.id === selectedId)
      : technical?.points.find((p) => p.id === selectedId);

  const warnings = technical?.warnings ?? [];
  const legend: {
    id: string;
    label: string;
    color: string;
    dash?: boolean;
    symbol?: "line" | "dot" | "square";
  }[] = isPlumbing ? PLUMBING_LEGEND : ELECTRICAL_LEGEND;
  const layerItems = [
    { id: "architecture", label: "Fond architectural", color: "#a8a29e" },
    ...legend,
    {
      id: isPlumbing ? "diametres" : "calibres",
      label: isPlumbing ? "Diamètres et pentes" : "Calibres calculés",
      color: "#374151",
    },
    { id: "cotes", label: "Cotes et échelle graphique", color: "#78716c" },
  ];

  const toggleLayer = (id: string) =>
    setLayers((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));

  const setAllLayers = (visible: boolean) => {
    const next: Record<string, boolean> = {};
    for (const key of Object.keys(ALL_LAYERS)) next[key] = visible;
    setLayers(next);
  };

  const floorsCount = variant.floors.length;
  const itemCount =
    technical?.kind === "plomberie" ? technical.fixtures.length : technical?.points.length ?? 0;
  const allLayersVisible = layerItems.every((item) => layers[item.id] !== false);

  return (
    <div className="space-y-4">
      {pdfGate.dialog}

      <Card className="overflow-hidden border-primary/15">
        <div
          className={cn(
            "h-1 w-full bg-gradient-to-r",
            isPlumbing
              ? "from-sky-500 via-cyan-500 to-teal-500"
              : "from-amber-500 via-orange-500 to-rose-500",
          )}
        />
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isPlumbing ? "bg-sky-500/10 text-sky-600" : "bg-amber-500/10 text-amber-600",
                )}
              >
                {isPlumbing ? <Droplets className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
              </span>
              <div>
                <CardTitle className="text-base font-bold tracking-tight">
                  {isPlumbing ? "Plan de plomberie" : "Plan électrique"}
                </CardTitle>
                <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-muted-foreground">
                  {isPlumbing
                    ? "Alimentation eau froide / eau chaude, évacuations, colonnes de chute, appareils sanitaires et équipements — superposés au plan architectural réel du projet."
                    : "Éclairage, prises, circuits spécialisés, tableaux et protections — calibres et sections indiqués uniquement lorsqu'ils sont calculés."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {floor.level === 0 ? "RDC" : `Étage R+${floor.level}`}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {floor.area.toFixed(1)} m²
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {itemCount} {isPlumbing ? "appareils" : "points"}
              </Badge>
              {savedPlans === undefined ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Chargement…
                </Badge>
              ) : saved ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Version {saved.version}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Non enregistré
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4 space-y-3">
          {/* ── Sélecteurs variante / niveau ── */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={variant.id}
              onValueChange={(v) => {
                setVariantId(v);
                setLevel(0);
                setPan({ x: 0, y: 0 });
                setZoom(1);
                setSelectedId(null);
              }}
            >
              <SelectTrigger size="sm" className="h-8 max-w-full text-xs sm:max-w-xs">
                <SelectValue placeholder="Variante" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} · {v.totalArea.toFixed(0)} m²
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              {variant.floors.map((f, i) => (
                <button
                  key={f.level}
                  type="button"
                  onClick={() => {
                    setLevel(i);
                    setSelectedId(null);
                    setPan({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                  className={cn(
                    "h-7 rounded-md border px-2 text-[10px] font-medium transition-colors cursor-pointer",
                    f.level === level
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f.level === 0 ? "RDC" : `R+${f.level}`}
                </button>
              ))}
              {floorsCount > 1 && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {floorsCount} niveaux · colonnes alignées
                </span>
              )}
            </div>

            {dirty && (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700"
              >
                Modifications non enregistrées
              </Badge>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* ── Visualiseur ── */}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant={editable ? "default" : "outline"}
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setEditable((e) => !e)}
                >
                  {editable ? (
                    <MousePointer2 className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                  {editable ? "Déplacement actif" : "Modifier les points"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => resetPlan(false)}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Régénérer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => resetPlan(true)}
                  disabled={!Object.keys(currentOverrides).length}
                >
                  <Undo2 className="h-3.5 w-3.5" /> Réinitialiser
                </Button>
                <PlanZoomButtons
                  className="ml-auto"
                  canZoomIn={zoom < 3}
                  canZoomOut={zoom > 0.6}
                  onZoomIn={() =>
                    setZoom((z) => Math.min(3, Math.round((z + 0.2) * 10) / 10))
                  }
                  onZoomOut={() =>
                    setZoom((z) => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))
                  }
                  onReset={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  resetLabel="Réinitialiser le zoom"
                />
              </div>

              <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
                <TechnicalPlan2D
                  plan={floor}
                  technical={technical!}
                  layers={layers}
                  zoom={zoom}
                  pan={pan}
                  onPanChange={setPan}
                  onZoomChange={setZoom}
                  editable={editable}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onMovePoint={handleMovePoint}
                />                    <span className="pointer-events-none absolute bottom-2 left-2 rounded-md border bg-background/90 px-2 py-1 text-[9px] text-muted-foreground">
                  {editable
                    ? "Touchez un point puis déplacez-le · grille 5 cm"
                    : "Glissez le plan pour le déplacer · pincez ou boutons pour zoomer"}
                </span>
              </div>

              {selected && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-violet-500/30 bg-violet-500/[0.05] px-3 py-2">
                  <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    {selected.label}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    x {selected.x.toFixed(2)} m · y {selected.y.toFixed(2)} m
                  </span>
                  <button
                    type="button"
                    className="ml-auto text-[10px] font-medium text-violet-600 hover:underline"
                    onClick={() => setSelectedId(null)}
                  >
                    Désélectionner
                  </button>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      À compléter / vérifier
                    </span>
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] leading-snug text-amber-800 dark:text-amber-200">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Calques / légende / équipements ── */}
            <div className="space-y-2">
              <div className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Layers3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Calques & légende
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] font-medium text-primary hover:underline"
                    onClick={() => setAllLayers(!allLayersVisible)}
                  >
                    {allLayersVisible ? "Tout masquer" : "Tout afficher"}
                  </button>
                </div>
                <ul className="max-h-[300px] overflow-y-auto p-1.5">
                  {layerItems.map((item) => {
                    const on = layers[item.id] !== false;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggleLayer(item.id)}
                          aria-pressed={on}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-muted/60",
                            !on && "opacity-45",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-0.5 w-5 shrink-0 rounded-full",
                              item.symbol === "dot" && "h-2.5 w-2.5 rounded-full",
                              item.symbol === "square" && "h-2.5 w-2.5 rounded-sm",
                            )}
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="flex-1 leading-tight">{item.label}</span>
                          <span
                            className={cn(
                              "h-3.5 w-6 rounded-full border transition-colors",
                              on ? "border-primary/40 bg-primary/15" : "border-border bg-muted",
                            )}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Équipements du projet
                </p>
                <SwitchRow label="Chauffe-eau" checked={waterHeater} onChange={setWaterHeater} />
                <SwitchRow
                  label="Lave-linge / buanderie"
                  checked={laundry}
                  onChange={setLaundry}
                />
                <SwitchRow label="Lave-vaisselle" checked={dishwasher} onChange={setDishwasher} />
                {!isPlumbing && (
                  <SwitchRow
                    label="Climatiseurs (prévisionnel)"
                    checked={airConditioning}
                    onChange={setAirConditioning}
                  />
                )}
                <p className="text-[9px] leading-snug text-muted-foreground">
                  Aucun équipement n'est ajouté sans votre validation : ces interrupteurs complètent
                  le programme du projet.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 flex-1 text-[11px]"
                  onClick={handleSave}
                  disabled={saving || savingAll}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-[11px]"
                  onClick={handlePdf}
                  disabled={pdfBusy}
                >
                  {pdfBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  {pdfBusy ? "PDF…" : "Export PDF"}
                </Button>
              </div>
              {floorsCount > 1 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-full text-[11px]"
                  onClick={handleSaveAll}
                  disabled={saving || savingAll}
                >
                  {savingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {savingAll ? "Enregistrement des niveaux…" : "Enregistrer tous les niveaux"}
                </Button>
              )}
              {saved && (
                <p className="text-[9px] text-muted-foreground">
                  Dernière version {saved.version} ·{" "}
                  {new Date(saved.updatedAt).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              )}
              {!!versions?.length && (
                <details className="rounded-lg border bg-card px-2.5 py-1.5">
                  <summary className="cursor-pointer text-[10px] font-medium text-muted-foreground">
                    Historique ({versions.length} version{versions.length > 1 ? "s" : ""})
                  </summary>
                  <ul className="mt-1.5 space-y-1">
                    {versions.slice(0, 5).map((v) => (
                      <li key={v._id} className="flex items-center justify-between gap-2 text-[9px]">
                        <span className="font-medium tabular-nums">
                          v{v.version} · {v.level === 0 ? "RDC" : `R+${v.level}`}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(v.createdAt).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Circuits calculés (électricité) ── */}
      {technical?.kind === "electricite" && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
                <Zap className="h-4 w-4 text-amber-600" /> Circuits et protections
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {technical.diversifiedVA} VA foisonnés ·{" "}
                {technical.mainBreakerA
                  ? `${technical.mainBreakerA} A`
                  : "calibre à définir"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[11px]">
                <thead>
                  <tr className="border-b text-left text-[9px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-3 font-semibold">Circuit</th>
                    <th className="px-2 py-1.5 font-semibold">Protection</th>
                    <th className="px-2 py-1.5 font-semibold">Section</th>
                    <th className="px-2 py-1.5 font-semibold">Longueur</th>
                    <th className="px-2 py-1.5 font-semibold">Base de calcul</th>
                  </tr>
                </thead>
                <tbody>
                  {technical.circuits.map((c, i) => (
                    <tr key={c.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: electricalCircuitColor(i) }}
                          />
                          {c.label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">
                        {c.computed && c.breakerA ? `${c.breakerA} A` : "—"}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">
                        {c.computed && c.sectionMm2 ? `${c.sectionMm2} mm²` : "—"}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">{c.lengthM.toFixed(1)} m</td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {c.computed ? c.basis : c.basis || "Calcul incomplet"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              Sections et calibres calculés à partir de la charge, de la longueur et de la chute de
              tension admissible (3 % éclairage, 5 % autres circuits). Ils restent à valider par un
              électricien qualifié selon les règles applicables en Tunisie.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Quantitatif ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
              <Ruler className="h-4 w-4 text-primary" />
              Quantitatif du plan
            </CardTitle>
            <div className="flex items-center gap-1 rounded-lg border p-0.5">
              {(["level", "building"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={cn(
                    "h-6 rounded-md px-2 text-[10px] font-medium transition-colors",
                    scope === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {s === "level" ? "Ce niveau" : `Bâtiment (${floorsCount} niv.)`}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-[11px]">
              <thead className="bg-muted/40 text-left text-[9px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 font-semibold">Poste</th>
                  <th className="px-2 py-1.5 font-semibold">Quantité</th>
                  <th className="px-2 py-1.5 font-semibold">Unité</th>
                  <th className="px-2 py-1.5 font-semibold">P.U.</th>
                  <th className="px-2 py-1.5 font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody>
                {priced.map((q, i) => {
                  const groupStart = i === 0 || priced[i - 1].group !== q.group;
                  return (
                    <FragmentRow
                      key={`${q.id}-${q.label}`}
                      groupStart={groupStart}
                      group={q.group}
                      q={q}
                    />
                  );
                })}
                {!priced.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Aucune quantité disponible pour ce niveau.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            Les quantités sont calculées à partir des tracés réels du plan (longueurs, appareils,
            points, raccords). Les prix proviennent exclusivement du référentiel configuré dans
            BatiBuild : un prix absent est signalé, jamais inventé.
          </p>
        </CardContent>
      </Card>

      <p className="px-2 text-center text-[10px] leading-snug text-muted-foreground/70">
        Proposition technique générée automatiquement à partir du plan architectural du projet.
        Elle ne constitue pas un plan d'exécution certifié : une vérification par un professionnel
        qualifié ({isPlumbing ? "plombier" : "électricien"}) est requise avant toute réalisation
        des travaux (diamètres, pentes, ventilation, sections, protections et exigences de sécurité
        applicables en Tunisie).
      </p>
    </div>
  );
}

function FragmentRow({
  groupStart,
  group,
  q,
}: {
  groupStart: boolean;
  group: string;
  q: {
    id: string;
    label: string;
    quantity: number;
    unit: string;
    unitPrice: number | null;
    total: number | null;
  };
}) {
  return (
    <>
      {groupStart && (
        <tr className="bg-muted/25">
          <td
            colSpan={5}
            className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {group}
          </td>
        </tr>
      )}
      <tr className="border-t border-border/50">
        <td className="px-3 py-1.5">{q.label}</td>
        <td className="px-2 py-1.5 tabular-nums">{q.quantity.toLocaleString("fr-FR")}</td>
        <td className="px-2 py-1.5 text-muted-foreground">{q.unit}</td>
        <td className="px-2 py-1.5 tabular-nums">
          {q.unitPrice != null ? q.unitPrice.toLocaleString("fr-FR") : "—"}
        </td>
        <td className="px-2 py-1.5 tabular-nums">
          {q.total != null ? (
            q.total.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
          ) : (
            <span className="text-[9px] font-medium text-amber-600">Prix non configuré</span>
          )}
        </td>
      </tr>
    </>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-[11px]">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
