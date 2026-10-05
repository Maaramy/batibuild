// ============================================================================
// ANALYSE DÉTAILLÉE DES MATÉRIAUX — composant autonome.
//
// Affiche l'analyse matériau-par-matériau du projet SANS intervention de
// l'utilisateur : il charge lui-même son Quantitatif, la Liste des prix, les
// historiques et les fournisseurs, puis rend le résultat dès qu'il est prêt.
// Utilisé sous la carte « Confiance » de la page « Coût de construction ».
// ============================================================================

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Info, Loader2, TriangleAlert } from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";

export interface MaterialIntelligenceSectionProps {
  projectId: string;
  /** Coût total du scénario retenu — même valeur que « Coût estimatif ». */
  projectTotal: number;
}

export function MaterialIntelligenceSection({
  projectId,
  projectTotal,
}: MaterialIntelligenceSectionProps) {
  const typedProjectId = projectId as Id<"projects">;

  const workspaceQuery = useQuery(api.materialSelections.getMaterialsWorkspace, {
    projectId: typedProjectId,
  });
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

  // Chaque matériau du Quantitatif est croisé avec la Liste des prix et son
  // propre historique ; l'agrégation projet en découle.
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

  // Chargement : aucun geste utilisateur requis, l'analyse s'affiche seule.
  if (workspaceQuery === undefined || trends === undefined) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2.5 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div>
            <p className="text-sm font-semibold">Analyse détaillée des matériaux en cours…</p>
            <p className="text-[11px] text-muted-foreground">
              Croisement automatique du Quantitatif avec la Liste des prix et l'historique.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!intel || !workspaceQuery.workspace.lines.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2.5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            L'analyse détaillée des matériaux s'affichera dès que le Quantitatif détaillé du projet sera calculé.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!intel.available) {
    return (
      <Card className="border-dashed border-amber-500/40">
        <CardContent className="flex items-start gap-2.5 p-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[11px] text-amber-800 dark:text-amber-200">
            {intel.reason ?? "Données insuffisantes pour l'analyse détaillée des matériaux."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <MaterialAnalysisSection intel={intel} />;
}