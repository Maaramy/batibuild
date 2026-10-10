// ============================================================================
// ANALYSE DÉTAILLÉE DES MATÉRIAUX — composant autonome.
//
// Affiche l'analyse matériau-par-matériau du projet sans aucun geste de
// l'utilisateur : il charge lui-même le Quantitatif, la Liste des prix, les
// historiques et les fournisseurs, puis rend le résultat dès qu'il est prêt.
// Utilisé sous la carte « Confiance » de la page « Coût de construction ».
// ============================================================================

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Info, Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildMaterialIntelligence,
  type CategoryTrendRow,
  type MaterialTrendRow,
  type PriceListRow,
  type SupplierMatch,
} from "@/lib/materialIntelligence";
import { MaterialAnalysisSection } from "@/components/decision/MaterialAnalysisSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface MaterialIntelligenceSectionProps {
  projectId: string;
  /** Coût total du scénario retenu — même valeur que « Coût estimatif ». */
  projectTotal: number;
}

export function MaterialIntelligenceSection({
  projectId,
  projectTotal,
}: MaterialIntelligenceSectionProps) {
  const workspaceQuery = useQuery(
    api.materialSelections.getMaterialsWorkspace,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const trends = useQuery(api.marketData.getPriceTrends, {});
  const priceList = useQuery(api.materials.getMaterialPrices, {});
  const materialTrends = useQuery(api.marketData.getMaterialPriceTrends, {});

  const supplierNames = useMemo<string[]>(() => {
    const ws = workspaceQuery?.workspace;
    if (!ws) return [];
    const set = new Set<string>();
    for (const l of ws.lines) set.add(l.catalogName || l.designation);
    return Array.from(set).filter(Boolean).slice(0, 150);
  }, [workspaceQuery]);

  const suppliers = useQuery(
    api.marketData.getCheapestSuppliers,
    supplierNames.length > 0 ? { names: supplierNames } : "skip",
  );

  const intel = useMemo(() => {
    if (!workspaceQuery) return null;
    const ws = workspaceQuery.workspace;
    return buildMaterialIntelligence({
      lines: ws.lines,
      priceList: (priceList ?? []) as unknown as PriceListRow[],
      materialTrends: (materialTrends ?? []) as unknown as MaterialTrendRow[],
      categoryTrends: (trends ?? []) as unknown as CategoryTrendRow[],
      variants: ws.variants,
      suppliers: (suppliers ?? []) as unknown as SupplierMatch[],
      scenario: ws.scenario,
      materialsBudget: ws.budget.materialsBudget,
      projectTotal,
    });
  }, [workspaceQuery, priceList, materialTrends, trends, suppliers, projectTotal]);

  // Chargement : aucun geste utilisateur requis — l'analyse se rend toute
  // seule dès que le Quantitatif + Liste des prix + historiques sont prêts.
  if (workspaceQuery === undefined || workspaceQuery === null || trends === undefined || trends === null) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Analyse détaillée des matériaux</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div>
              <p className="text-sm font-semibold">Chargement…</p>
              <p className="text-[11px] text-muted-foreground">
                Croisement automatique du Quantitatif avec la Liste des prix et l'historique.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const workspace = workspaceQuery.workspace;
  if (!intel || !workspace?.lines.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Analyse détaillée des matériaux</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              Aucun matériau détaillé n'est encore disponible pour ce projet.
              L'analyse détaillée des matériaux s'affichera dès que le Quantitatif sera calculé.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <MaterialAnalysisSection intel={intel} />;
}