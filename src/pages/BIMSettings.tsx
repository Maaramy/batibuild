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
} from "lucide-react";
import { motion } from "framer-motion";

export default function BIMSettings() {
  const bimConfig = useQuery(api.bimConfig.getBIMConfig);
  const bimHistory = useQuery(api.bimConfig.getBIMRefreshHistory);
  const refreshBIM = useMutation(api.bimConfig.refreshBIMData);
  const materialPrices = useQuery(api.materials.getMaterialPrices, {}) || [];

  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setResult(null);
    try {
      const res = await refreshBIM();
      setResult(res);
      toast.success(`✅ BIM mis à jour v${res.version} — ${res.updatedMaterials} mat\u00e9riaux actualis\u00e9s`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour BIM");
    }
    setRefreshing(false);
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
                Met à jour les prix de r\u00e9f\u00e9rence du march\u00e9 tunisien de la construction 2026
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{Object.keys(bimConfig?.parsedMarketPrices || {}).length || "\u2014"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Types de projets</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{materialPrices.length || "\u2014"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Mat\u00e9riaux suivis</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">{bimConfig?.version || "\u2014"}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">Version BIM</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
              <p className="text-lg sm:text-2xl font-bold">
                {Object.keys(bimConfig?.parsedMultipliers || {}).length || "\u2014"}
              </p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">R\u00e9gions</p>
            </div>
          </div>

          {bimConfig?.refreshedAt && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Derni\u00e8re mise à jour : {new Date(bimConfig.refreshedAt).toLocaleString("fr-FR")}
            </div>
          )}

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
                  Update BIM \u2014 Mettre à jour les prix
                </>
              )}
            </Button>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground self-center">
              Met à jour la base de donn\u00e9es avec les derniers prix du march\u00e9 tunisien et applique les fluctuations mensuelles r\u00e9alistes.
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
                Mise à jour BIM v{result.version} termin\u00e9e
              </p>
              <p>\u2022 {result.categoriesCount} types de projets synchronis\u00e9s</p>
              <p>\u2022 {result.materialCount} mat\u00e9riaux trait\u00e9s</p>
              <p>\u2022 {result.updatedMaterials} mat\u00e9riaux mis à jour avec les fluctuations du march\u00e9</p>
            </motion.div>
          )}
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
                  Prix au m\u00b2 par type (TND)
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto text-[10px]">
                  {Object.entries(bimConfig.parsedMarketPrices || {}).slice(0, 15)
                    .map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between py-0.5 border-b border-border/10">
                      <span className="capitalize truncate mr-2">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium shrink-0">{val.std} TND/m\u00b2</span>
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
                  Coefficients r\u00e9gionaux
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
                Cliquez sur "Update BIM" pour initialiser la base de donn\u00e9es
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
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("fr-FR") : "\u2014"}
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
