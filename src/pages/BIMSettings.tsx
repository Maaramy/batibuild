import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import {
  RefreshCw,
  Loader2,
  CheckCheck,
  Calendar,
  Settings,
  Globe,
  DollarSign,
  Clock,
  Cpu,
  Save,
  TrendingUp,
  TrendingDown,
  PackageSearch,
  AlertTriangle,
  MapPin,
  Sparkles,
  Building2,
  Database,
  Paintbrush,
} from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_LEVEL_COST_CONFIG,
  LEVEL_COEFFICIENT_RANGES,
  computeLevelCost,
  type LevelCostConfig,
} from "@/lib/buildingLevels";
import {
  DEFAULT_PAINT_QUANTITIES,
  PAINT_QUANTITY_RANGES,
  PAINT_PRICING_NOTE,
  paintQuantityPlan,
  type PaintNumericKey,
  type PaintQuantitiesConfig,
} from "@/lib/paintQuantities";

/** Champs numériques du barème de peinture (Quantitatif détaillé). */
const PAINT_FIELDS: {
  key: PaintNumericKey;
  label: string;
  unit: string;
  step: string;
}[] = [
  { key: "interiorBuckets", label: "Quantité intérieure de référence", unit: "seaux", step: "1" },
  { key: "exteriorBuckets", label: "Quantité extérieure de référence", unit: "seaux", step: "1" },
  { key: "referenceSurface", label: "Surface de référence", unit: "m²", step: "10" },
  { key: "bucketLiters", label: "Volume du seau", unit: "litres", step: "1" },
  { key: "coats", label: "Nombre de couches", unit: "couches", step: "1" },
  { key: "interiorBucketPrice", label: "Prix du seau — intérieure", unit: "TND/seau", step: "0.5" },
  { key: "exteriorBucketPrice", label: "Prix du seau — extérieure", unit: "TND/seau", step: "0.5" },
];

/** Champs éditables des coefficients multi-niveaux (RDC, étages, frais communs, toiture). */
const LEVEL_FIELDS: {
  key: keyof LevelCostConfig;
  label: string;
  hint: string;
}[] = [
  { key: "rdc", label: "RDC", hint: "Rez-de-chaussée (référence 100 %)" },
  { key: "rPlus1", label: "R+1", hint: "Premier étage (65-80 %)" },
  { key: "rPlus2", label: "R+2", hint: "Deuxième étage (65-80 %)" },
  { key: "rPlus3AndAbove", label: "R+3 et +", hint: "Troisième étage et suivants (56-80 %)" },
  { key: "commonShare", label: "Frais communs", hint: "Part comptée une seule fois avec le RDC" },
  { key: "roofWeight", label: "Toiture", hint: "Terrasse supérieure, chiffrée une fois" },
];

/** ms epoch → valeur d'un champ <input type="date">. */
const toDateInput = (ms?: number) =>
  typeof ms === "number" && ms > 0 ? new Date(ms).toISOString().slice(0, 10) : "";
/** Valeur d'un <input type="date"> → ms epoch (UTC). */
const fromDateInput = (value: string) =>
  value ? Date.parse(`${value}T00:00:00Z`) : undefined;

export default function BIMSettings() {
  const bimConfig = useQuery(api.bimConfig.getBIMConfig);
  const bimHistory = useQuery(api.bimConfig.getBIMRefreshHistory);
  const refreshBIM = useMutation(api.bimConfig.refreshBIMData);
  const materialPrices = useQuery(api.materials.getMaterialPrices, {}) || [];

  // ── Market intelligence ──
  const marketOverview = useQuery(api.marketData.getMarketOverview);
  const bestOffers = useQuery(api.marketData.getBestOffers, { limit: 5 });
  const stockAlerts = useQuery(api.marketData.getStockAlerts);
  const priceTrends = useQuery(api.marketData.getPriceTrends, {});
  const govPrices = useQuery(api.marketData.getGovernoratePrices, {});
  const syncMarket = useMutation(api.marketData.syncMarketData);
  const seedMarket = useMutation(api.marketData.seedMarketData);

  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [syncingMarket, setSyncingMarket] = useState(false);
  const [marketResult, setMarketResult] = useState<any>(null);

  // ── Coefficients multi-niveaux : édition par l'administrateur ──
  // Les valeurs enregistrées pilotent réellement le moteur de coûts (coût
  // estimatif, Quantitatif détaillé, aide à la décision, rapports) : aucun
  // changement du code source n'est nécessaire.
  const saveBIMConfig = useMutation(api.bimConfig.saveBIMConfig);
  const [levelCoeffs, setLevelCoeffs] = useState<LevelCostConfig | null>(null);
  const [validFromDraft, setValidFromDraft] = useState<string | null>(null);
  const [validUntilDraft, setValidUntilDraft] = useState<string | null>(null);
  const [savingLevels, setSavingLevels] = useState(false);

  const effectiveLevelCoeffs: LevelCostConfig =
    bimConfig?.parsedLevelCoefficients ?? DEFAULT_LEVEL_COST_CONFIG;
  const levelCoeffsDraft = levelCoeffs ?? effectiveLevelCoeffs;
  const levelRanges = (bimConfig?.levelCoefficientRanges ?? LEVEL_COEFFICIENT_RANGES) as Record<
    keyof LevelCostConfig,
    { min: number; max: number }
  >;
  const validFromValue =
    validFromDraft ?? toDateInput(bimConfig?.levelCoefficientsValidFrom);
  const validUntilValue =
    validUntilDraft ?? toDateInput(bimConfig?.levelCoefficientsValidUntil);

  // Contrôle immédiat : tout coefficient hors fourchette est signalé avant
  // enregistrement (le serveur refuse également une saisie incohérente).
  const outOfRangeLevels = LEVEL_FIELDS.filter(({ key }) => {
    const bounds = levelRanges[key] ?? LEVEL_COEFFICIENT_RANGES[key];
    const value = levelCoeffsDraft[key];
    return value < bounds.min || value > bounds.max;
  });

  // Aperçu du calcul sur un bâtiment de référence 100 m² en R+2 (3 niveaux) :
  // RDC + deux étages + toiture, et vérification automatique des anomalies.
  const levelPreview = computeLevelCost({
    surface: 100,
    floors: 3,
    pricePerM2: 1980,
    config: levelCoeffsDraft,
  });

  // ── Barème de peinture — Quantitatif détaillé (« Second œuvre et finitions ») ──
  // Projet de référence : 10 seaux intérieurs (200 L) et 7 seaux extérieurs
  // (140 L) pour 100 m² construits, au seau de 20 litres sur 3 couches. Les
  // quantités et le prix du seau enregistrés ici pilotent réellement le
  // Quantitatif détaillé, le devis, les scénarios et les rapports PDF.
  const [paintDraft, setPaintDraft] = useState<PaintQuantitiesConfig | null>(null);
  const [savingPaint, setSavingPaint] = useState(false);

  const effectivePaint: PaintQuantitiesConfig =
    bimConfig?.parsedPaintQuantities ?? DEFAULT_PAINT_QUANTITIES;
  const paintValues = paintDraft ?? effectivePaint;
  const paintRanges = (bimConfig?.paintQuantityRanges ??
    PAINT_QUANTITY_RANGES) as Record<PaintNumericKey, { min: number; max: number }>;
  const outOfRangePaint = PAINT_FIELDS.filter(({ key }) => {
    const bounds = paintRanges[key] ?? PAINT_QUANTITY_RANGES[key];
    const value = paintValues[key];
    return !(value >= bounds.min && value <= bounds.max);
  });

  // Aperçu du calcul sur la référence 100 m² et sur 150 m² (règle
  // proportionnelle, arrondi à l'entier supérieur).
  const paintPreview100 = paintQuantityPlan(100, paintValues);
  const paintPreview150 = paintQuantityPlan(150, paintValues);

  const handleSavePaint = async () => {
    setSavingPaint(true);
    try {
      await saveBIMConfig({ paintQuantities: JSON.stringify(paintValues) });
      toast.success("Barème de peinture enregistré");
      setPaintDraft(null);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement du barème de peinture");
    }
    setSavingPaint(false);
  };

  const handleSaveLevels = async () => {
    setSavingLevels(true);
    try {
      await saveBIMConfig({
        levelCoefficients: JSON.stringify(levelCoeffsDraft),
        levelCoefficientsValidFrom: fromDateInput(validFromValue),
        levelCoefficientsValidUntil: fromDateInput(validUntilValue),
      });
      toast.success("Coefficients multi-niveaux enregistrés");
      setLevelCoeffs(null);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement des coefficients");
    }
    setSavingLevels(false);
  };

  // Calculate next automatic update (1st of next month at 01:00)
  const getNextUpdate = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 1, 0, 0);
    if (now.getDate() === 1 && now.getHours() < 1) {
      next.setMonth(next.getMonth() - 1); // Still today's run
    }
    return next;
  };
  const nextUpdate = getNextUpdate();
  const daysUntilNext = Math.ceil((nextUpdate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const handleRefresh = async () => {
    setRefreshing(true);
    setResult(null);
    try {
      const res = await refreshBIM();
      setResult(res);
      toast.success(
        `✅ BIM mis à jour v${res.version} — ${res.updatedMaterials} matériaux actualisés`
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour BIM");
    }
    setRefreshing(false);
  };

  const handleSyncMarket = async () => {
    setSyncingMarket(true);
    setMarketResult(null);
    try {
      // Seed first if the registry is empty
      if (!marketOverview || marketOverview.totalSources === 0) {
        await seedMarket();
      }
      const res = await syncMarket();
      setMarketResult(res);
      toast.success(
        `🔁 Marché synchronisé — ${res.updatedOffers} offres actualisées, ${res.stockAlerts} ruptures détectées`
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la synchronisation du marché");
    }
    setSyncingMarket(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Update BIM Button */}
      <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:radial-gradient(ellipse_at_top,white,transparent)]" />
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <RefreshCw className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base">Moteur d'estimation BIM</CardTitle>
              <CardDescription className="text-xs">
                Met à jour les prix de référence du marché tunisien de la construction 2026
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{Object.keys(bimConfig?.parsedMarketPrices || {}).length || "—"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Types de projets</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{materialPrices.length || "—"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Matériaux suivis</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{bimConfig?.version || "—"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Version BIM</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">
                {Object.keys(bimConfig?.parsedMultipliers || {}).length || "—"}
              </p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Régions</p>
            </div>
          </div>

          {bimConfig?.refreshedAt && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Dernière mise à jour : {new Date(bimConfig.refreshedAt).toLocaleString("fr-FR")}
            </div>
          )}

          {/* Next automatic update indicator */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 rounded-xl bg-muted/30 border border-border/20">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Prochaine mise à jour automatique</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="font-mono text-[10px] px-2">
                {nextUpdate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Badge>
              <span className="font-semibold text-primary">
                {daysUntilNext === 0
                  ? "Aujourd'hui"
                  : daysUntilNext === 1
                  ? "Demain"
                  : `Dans ${daysUntilNext} jours`}
              </span>
            </div>
            <div className="text-[9px] text-muted-foreground">
              (1er du mois à 01:00) — Cron: monthly-bim-refresh
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              className="h-10 gap-2 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mise à jour en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Mettre à jour les prix
                </>
              )}
            </Button>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground self-center">
              Met à jour la base de données avec les derniers prix du marché tunisien et applique les fluctuations mensuelles réalistes.
            </p>
          </div>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 space-y-1"
            >
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCheck className="h-4 w-4" />
                Mise à jour BIM v{result.version} terminée
              </p>
              <p>• {result.categoriesCount} types de projets synchronisés</p>
              <p>• {result.materialCount} matériaux traités</p>
              <p>• {result.updatedMaterials} matériaux mis à jour avec les fluctuations du marché</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* ── Intelligence Marché ── */}
      <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:radial-gradient(ellipse_at_top,white,transparent)]" />
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/10 flex items-center justify-center ring-1 ring-violet-500/20">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base">Intelligence Marché</CardTitle>
              <CardDescription className="text-xs">
                Collecte multi-sources (fabricants, distributeurs, plateformes) — prix, ruptures, tendances et meilleures offres en Tunisie
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{marketOverview?.totalOffers ?? "—"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Offres collectées</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{marketOverview?.totalSources ?? "—"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Sources actives</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{marketOverview?.totalProducts ?? "—"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Produits suivis</p>
            </div>
            <div className={cn(
              "p-3 rounded-xl border border-border/20",
              (marketOverview?.avgChange ?? 0) >= 0 ? "bg-red-50/60" : "bg-emerald-50/60"
            )}>
              <p className={cn(
                "text-lg sm:text-2xl font-bold flex items-center gap-1",
                (marketOverview?.avgChange ?? 0) >= 0 ? "text-red-600" : "text-emerald-600"
              )}>
                {marketOverview ? `${marketOverview.avgChange > 0 ? "+" : ""}${marketOverview.avgChange}%` : "—"}
                {(marketOverview?.avgChange ?? 0) >= 0
                  ? <TrendingUp className="h-4 w-4" />
                  : <TrendingDown className="h-4 w-4" />}
              </p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Variation moyenne</p>
            </div>
          </div>

          {/* Sources breakdown + sync */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/20">
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <Building2 className="h-3.5 w-3.5 text-violet-500" />
              <span className="font-medium">Sources :</span>
              <Badge variant="secondary" className="text-[9px]">{marketOverview?.sourcesByType?.fabricant ?? 0} fabricants</Badge>
              <Badge variant="secondary" className="text-[9px]">{marketOverview?.sourcesByType?.distributeur ?? 0} distributeurs</Badge>
              <Badge variant="secondary" className="text-[9px]">{marketOverview?.sourcesByType?.plateforme ?? 0} plateformes</Badge>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {marketOverview?.lastSyncAt && (
                <span className="text-[9px] text-muted-foreground hidden sm:inline">
                  Dernier sync : {new Date(marketOverview.lastSyncAt).toLocaleDateString("fr-FR")}
                </span>
              )}
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20"
                onClick={handleSyncMarket}
                disabled={syncingMarket}
              >
                {syncingMarket ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sync en cours...</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" /> Synchroniser le marché</>
                )}
              </Button>
            </div>
          </div>

          {/* Sync result */}
          {marketResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-700 space-y-0.5"
            >
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCheck className="h-4 w-4" /> Synchronisation marché terminée
              </p>
              <p>• {marketResult.updatedOffers} offres actualisées ({marketResult.historyRows} variations historisées)</p>
              <p>• {marketResult.stockAlerts} alertes de rupture / sur-commande détectées</p>
            </motion.div>
          )}

          {!marketOverview && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
              <Database className="h-3.5 w-3.5 shrink-0" />
              La base de données marché est vide. Cliquez sur « Synchroniser le marché » pour initialiser les sources et le catalogue (ou « Mettre à jour les prix » ci-dessus).
            </div>
          )}

          {/* Best offers + stock alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Best offers */}
            <div className="rounded-xl bg-muted/30 border border-border/20 p-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                <PackageSearch className="h-3.5 w-3.5 text-emerald-600" />
                Meilleures offres du moment
              </h4>
              {(!bestOffers || bestOffers.length === 0) ? (
                <p className="text-[10px] text-muted-foreground">Aucune offre — lancez une synchronisation.</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {bestOffers.map((o: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-border/10 text-[10px]">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{o.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {o.supplier} · {o.governorate} · {o.unit}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-emerald-600">{o.price} TND</p>
                        <p className="text-[8px] text-muted-foreground">fiab. {Math.round(o.reliabilityIndex * 100)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock alerts */}
            <div className="rounded-xl bg-muted/30 border border-border/20 p-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Alertes de stock
              </h4>
              {(!stockAlerts || stockAlerts.length === 0) ? (
                <p className="text-[10px] text-muted-foreground">Aucune alerte — stocks normaux.</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {stockAlerts.slice(0, 6).map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-border/10 text-[10px]">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{a.supplier} · {a.governorate}</p>
                      </div>
                      <Badge className={cn(
                        "shrink-0 text-[8px]",
                        a.availability === "rupture"
                          ? "bg-red-500/10 text-red-600 border-red-200/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-200/30"
                      )}>
                        {a.availability === "rupture" ? "Rupture" : "Sur commande"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trends + governorates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Trends */}
            <div className="rounded-xl bg-muted/30 border border-border/20 p-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                Évolution des prix par catégorie
              </h4>
              {(!priceTrends || priceTrends.length === 0) ? (
                <p className="text-[10px] text-muted-foreground">Pas encore d'historique de prix.</p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {priceTrends.slice(0, 8).map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/10 text-[10px]">
                      <span className="capitalize truncate mr-2">{t.category.replace(/_/g, " ")}</span>
                      <span className={cn("font-semibold shrink-0", t.netPct >= 0 ? "text-red-600" : "text-emerald-600")}>
                        {t.netPct >= 0 ? "+" : ""}{t.netPct}% ({t.changes} var.)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Governorates */}
            <div className="rounded-xl bg-muted/30 border border-border/20 p-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5 text-violet-600" />
                Prix moyens par gouvernorat
              </h4>
              {(!govPrices || govPrices.rows.length === 0) ? (
                <p className="text-[10px] text-muted-foreground">Aucune donnée géographique.</p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {govPrices.rows.slice(0, 6).map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/10 text-[10px]">
                      <span className="truncate mr-2">{r.governorate}</span>
                      <span className="font-semibold shrink-0">{r.avgPrice} TND</span>
                    </div>
                  ))}
                  <p className="text-[9px] text-muted-foreground pt-1">
                    {govPrices.cheapest && <>💚 Moins cher : {govPrices.cheapest.governorate} · </>}
                    {govPrices.mostExpensive && <>🔴 Plus cher : {govPrices.mostExpensive.governorate}</>}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Coefficients multi-niveaux : RDC / R+1 / R+2 / R+3+ ── */}
      <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Coefficients multi-niveaux (RDC · R+1 · R+2 · R+3+)</CardTitle>
            <Badge variant="secondary" className="ml-auto text-[9px]">
              v{bimConfig?.version ?? "—"} · {levelCoeffs ? "modifié" : "enregistré"}
            </Badge>
          </div>
          <CardDescription className="text-xs leading-relaxed">
            Le rez-de-chaussée porte 100 % du prix au m² : il comprend les travaux communs au
            bâtiment entier (terrassement, fondations dimensionnées pour la structure totale,
            études, VRD, aménagements extérieurs), comptés <strong>une seule fois</strong>. Chaque
            étage supérieur est chiffré sur sa <strong>surface réelle</strong> × son coefficient, et
            la toiture-terrasse une seule fois. Ces valeurs pilotent le coût estimatif, le
            Quantitatif détaillé, l'aide à la décision et les rapports — sans modifier le code
            source.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {LEVEL_FIELDS.map(({ key, label, hint }) => {
              const bounds = levelRanges[key] ?? LEVEL_COEFFICIENT_RANGES[key];
              const value = levelCoeffsDraft[key];
              const invalid = value < bounds.min || value > bounds.max;
              return (
                <div key={key}>
                  <label className="text-[10px] font-semibold" htmlFor={`level-${key}`}>
                    {label}
                  </label>
                  <Input
                    id={`level-${key}`}
                    type="number"
                    step="0.01"
                    min={0}
                    value={value}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setLevelCoeffs({
                        ...levelCoeffsDraft,
                        [key]: Number.isFinite(next) ? next : 0,
                      });
                    }}
                    className={cn("mt-1 h-8 text-xs", invalid && "border-amber-500 text-amber-600")}
                  />
                  <p className="mt-1 text-[9px] leading-tight text-muted-foreground">
                    {hint} · {Math.round(bounds.min * 100)}-{Math.round(bounds.max * 100)} %
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-semibold" htmlFor="level-valid-from">
                Valable à partir du
              </label>
              <Input
                id="level-valid-from"
                type="date"
                value={validFromValue}
                onChange={(e) => setValidFromDraft(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold" htmlFor="level-valid-until">
                Valable jusqu'au
              </label>
              <Input
                id="level-valid-until"
                type="date"
                value={validUntilValue}
                onChange={(e) => setValidUntilDraft(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleSaveLevels}
                disabled={savingLevels || outOfRangeLevels.length > 0}
              >
                {savingLevels ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Enregistrer les coefficients
              </Button>
              {levelCoeffs && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setLevelCoeffs(null)}
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>

          {/* Fourchettes : hypothèses de départ à calibrer sur les DQE réels */}
          {outOfRangeLevels.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-[11px] text-amber-700">
                <p className="font-semibold">Coefficients hors fourchette recommandée</p>
                <p>
                  {outOfRangeLevels.map((f) => f.label).join(", ")} — RDC 100 % · R+1 et R+2 65-80 %
                  · R+3 et suivants 56-80 %. Ces fourchettes sont des hypothèses de départ à calibrer
                  sur les DQE et devis réels tunisiens, pas des tarifs officiels.
                </p>
              </div>
            </div>
          )}

          {/* Aperçu du calcul : bâtiment de référence 100 m² en R+2 (3 niveaux) */}
          <div className="rounded-lg border border-border/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Aperçu — bâtiment de référence 100 m² (RDC + R+1 + R+2), 1 980 TND/m²
            </p>
            <div className="mt-2 space-y-1">
              {levelPreview.levels.map((l) => (
                <div
                  key={l.index}
                  className="flex items-center justify-between gap-2 border-b border-border/10 py-0.5 text-[10px]"
                >
                  <span className="font-medium">{l.label}</span>
                  <span className="text-muted-foreground">
                    {l.area} m² × {Math.round(l.coefficient * 100)} %
                    {l.commonAmount > 0 ? " (frais communs inclus, une seule fois)" : ""}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {l.amount.toLocaleString("fr-FR")} TND
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 border-b border-border/10 py-0.5 text-[10px]">
                <span className="font-medium">{levelPreview.roof.label}</span>
                <span className="text-muted-foreground">
                  {levelPreview.roof.counted
                    ? `${levelPreview.roof.area} m² × ${Math.round(levelPreview.roof.weight * 100)} % (une seule fois)`
                    : "comprise dans le coût du RDC (plain-pied)"}
                </span>
                <span className="font-semibold tabular-nums">
                  {levelPreview.roof.amount.toLocaleString("fr-FR")} TND
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                <span className="font-semibold">Coût global TTC</span>
                <span className="text-[10px] text-muted-foreground">
                  {levelPreview.realBuiltArea} m² construits ·{" "}
                  {levelPreview.costPerM2Real.toLocaleString("fr-FR")} TND/m²
                </span>
                <span className="font-bold tabular-nums">
                  {levelPreview.total.toLocaleString("fr-FR")} TND
                </span>
              </div>
            </div>

            {/* Vérification automatique des anomalies : rien n'est masqué */}
            {levelPreview.anomalies.length === 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600">
                <CheckCheck className="h-3 w-3" />
                Aucune anomalie : aucun poste compté deux fois, frais fixes non multipliés par les
                niveaux, toiture chiffrée une seule fois, coût global = somme des niveaux.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {levelPreview.anomalies.map((a) => (
                  <li key={a.code} className="flex items-start gap-1.5 text-[10px] text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      <strong>{a.code}</strong> ({a.severity}) — {a.message} {a.recommendation}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Barème de peinture : Quantitatif détaillé (Second œuvre et finitions) ── */}
      <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Paintbrush className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              Peinture — Quantitatif détaillé (Second œuvre et finitions)
            </CardTitle>
            <Badge variant="secondary" className="ml-auto text-[9px]">
              {paintDraft ? "modifié" : "enregistré"}
            </Badge>
          </div>
          <CardDescription className="text-xs leading-relaxed">
            Projet de référence : <strong>100 m² de surface construite</strong> →{" "}
            <strong>{effectivePaint.interiorBuckets} seaux</strong> de peinture intérieure (
            {effectivePaint.interiorBuckets * effectivePaint.bucketLiters} L) et{" "}
            <strong>{effectivePaint.exteriorBuckets} seaux</strong> de peinture extérieure (
            {effectivePaint.exteriorBuckets * effectivePaint.bucketLiters} L), au seau de{" "}
            {effectivePaint.bucketLiters} litres sur {effectivePaint.coats} couches. Les deux postes du
            Quantitatif détaillé valent <strong>quantité × prix unitaire du seau</strong> : aucun
            coefficient régional ni majoration n'est appliqué aux quantités.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PAINT_FIELDS.map(({ key, label, unit, step }) => {
              const bounds = paintRanges[key] ?? PAINT_QUANTITY_RANGES[key];
              const value = paintValues[key];
              const invalid = value < bounds.min || value > bounds.max;
              return (
                <div key={key}>
                  <label className="text-[10px] font-semibold" htmlFor={`paint-${key}`}>
                    {label}
                  </label>
                  <Input
                    id={`paint-${key}`}
                    type="number"
                    step={step}
                    min={0}
                    value={value}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setPaintDraft({
                        ...paintValues,
                        [key]: Number.isFinite(next) ? next : 0,
                      });
                    }}
                    className={cn("mt-1 h-8 text-xs", invalid && "border-amber-500 text-amber-600")}
                  />
                  <p className="mt-1 text-[9px] leading-tight text-muted-foreground">
                    {unit} · {bounds.min}-{bounds.max}
                  </p>
                </div>
              );
            })}
            <div className="flex flex-col justify-end gap-1.5">
              <Label htmlFor="paint-proportional" className="text-[10px] font-semibold">
                Calcul proportionnel selon la surface
              </Label>
              <Switch
                id="paint-proportional"
                checked={paintValues.proportional}
                onCheckedChange={(checked) =>
                  setPaintDraft({ ...paintValues, proportional: checked === true })
                }
              />
              <p className="text-[9px] leading-tight text-muted-foreground">
                Activé : quantité × surface / {paintValues.referenceSurface} m², arrondie à l'entier
                supérieur. Désactivé : quantités de référence conservées.
              </p>
            </div>
          </div>

          {/* Aperçu : quantités, volumes, montants et sous-total peinture */}
          <div className="rounded-lg border border-border/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Aperçu du Quantitatif détaillé — référence 100 m² et 150 m²
            </p>
            <div className="mt-2 space-y-1">
              {[paintPreview100, paintPreview150].map((plan) => (
                <div key={plan.surface} className="space-y-0.5 border-b border-border/10 py-1">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="font-semibold">{plan.surface} m² construits</span>
                    <span className="text-muted-foreground">
                      {plan.proportional ? "proportionnel, arrondi supérieur" : "quantités de référence"}
                    </span>
                    <span className="font-semibold tabular-nums">
                      Sous-total {plan.subtotal.toLocaleString("fr-FR")} TND
                    </span>
                  </div>
                  {[plan.interior, plan.exterior].map((line) => (
                    <div
                      key={line.role}
                      className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground"
                    >
                      <span className="truncate">{line.designation}</span>
                      <span className="shrink-0">
                        {line.quantity} × {line.unit} ({line.liters} L)
                      </span>
                      <span className="shrink-0">
                        {line.unitPrice.toLocaleString("fr-FR")} TND/{line.unit}
                      </span>
                      <span className="w-24 shrink-0 text-right font-medium text-foreground tabular-nums">
                        {line.amount.toLocaleString("fr-FR")} TND
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground">{PAINT_PRICING_NOTE}</p>
          </div>

          {outOfRangePaint.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-[11px] text-amber-700">
                <p className="font-semibold">Paramètres de peinture hors fourchette recommandée</p>
                <p>
                  {outOfRangePaint.map((f) => f.label).join(", ")} — fourchettes :{" "}
                  {PAINT_FIELDS.map((f) => {
                    const b = paintRanges[f.key] ?? PAINT_QUANTITY_RANGES[f.key];
                    return `${f.label.toLowerCase()} ${b.min}-${b.max}`;
                  }).join(" · ")}
                  . Ces valeurs sont des hypothèses de paramétrage, pas des tarifs officiels.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleSavePaint}
              disabled={savingPaint || outOfRangePaint.length > 0}
            >
              {savingPaint ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Enregistrer le barème de peinture
            </Button>
            {paintDraft && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setPaintDraft(null)}
              >
                Réinitialiser
              </Button>
            )}
            <p className="text-[9px] text-muted-foreground">
              Les projets déjà estimés conservent leurs quantités jusqu'à leur prochaine estimation :
              le Quantitatif détaillé, le devis, les scénarios et les rapports PDF sont alors recalculés
              avec ces valeurs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current configuration overview */}
      {bimConfig && (
        <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Configuration actuelle du BIM</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  Prix au m² par type (TND)
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto text-[10px]">
                  {Object.entries(bimConfig.parsedMarketPrices || {}).slice(0, 15)
                    .map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between py-0.5 border-b border-border/10">
                      <span className="capitalize truncate mr-2">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium shrink-0">{val.std} TND/m²</span>
                    </div>
                  ))}
                  {Object.keys(bimConfig.parsedMarketPrices || {}).length > 15 && (
                    <p className="text-[8px] text-muted-foreground text-center pt-1">
                      +{Object.keys(bimConfig.parsedMarketPrices).length - 15} autres types
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  Coefficients régionaux
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto text-[10px]">
                  {Object.entries(bimConfig.parsedMultipliers || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between py-0.5 border-b border-border/10">
                      <span className="capitalize truncate mr-2">{key.replace(/_/g, " ")}</span>
                      <span className={cn("font-medium shrink-0", val > 1 ? "text-amber-600" : val < 1 ? "text-emerald-600" : "")}>
                        {val > 0 ? `+${Math.round((val - 1) * 100)}%` : `${Math.round(val * 100)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BIM Update History */}
      <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Historique des mises à jour BIM</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {(!bimHistory || bimHistory.length === 0) ? (
            <div className="text-center py-8">
              <Cpu className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Aucune mise à jour pour le moment</p>
              <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                Cliquez sur « Mettre à jour les prix » pour initialiser la base de données
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bimHistory.map((log: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/10 text-xs">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                    log.action === "bim_refresh"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-blue-100 text-blue-600"
                  )}>
                    {log.action === "bim_refresh" ? (
                      <RefreshCw className="h-3 w-3" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {log.details || (log.action === "bim_refresh" ? "Mise à jour BIM" : "Sauvegarde BIM")}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("fr-FR") : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
