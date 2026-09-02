import { useNavigate } from "react-router";
import { Package, CheckCircle2, List } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-TN", { maximumFractionDigits: digits }).format(n);

/** Article réellement intégré au projet dans une catégorie (dédoublonné par matériau). */
export type UsedArticleRow = {
  id: string;
  name: string;
  brand?: string;
  unit: string;
  /** Prix unitaire probable (TND / unité). */
  unitPrice: number;
  quantity: number;
  quantityUnit: string;
  /** Coût total TTC (quantité × prix + pose, transport, déchets, accessoires, TVA). */
  totalTTC: number;
  score: number;
};

interface CategoryUsedArticlesProps {
  /** Libellé humain de la catégorie. */
  categoryLabel: string;
  /** Articles effectivement utilisés dans le projet pour cette catégorie. */
  rows: UsedArticleRow[];
  /** Nombre de matériaux analysés dans la base pour cette catégorie. */
  count: number;
  /** Catégories officielles 2026 couvertes par la catégorie (pour la liste complète). */
  catalogCategories?: string[];
}

export function CategoryUsedArticles({
  categoryLabel,
  rows,
  count,
  catalogCategories = [],
}: CategoryUsedArticlesProps) {
  const navigate = useNavigate();
  if (!rows || rows.length === 0) return null;

  const listUrl =
    catalogCategories.length > 0
      ? `/dashboard/materials?cat=${encodeURIComponent(catalogCategories.join(","))}`
      : "/dashboard/materials";

  return (
    <div className="mt-3">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <Package className="h-3 w-3 text-primary" />
          Articles réellement utilisés dans le projet — {categoryLabel}
          <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/25 rounded-full px-1.5">
            {rows.length}
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-[10px] font-medium rounded-md"
          onClick={() => navigate(listUrl)}
          title={`Consulter la liste complète des matériaux de la catégorie ${categoryLabel}`}
        >
          <List className="h-3 w-3" />
          Liste complète — {count} matériaux
        </Button>
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border/30 text-[10px] text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-3 py-2 font-semibold">Article</th>
                <th className="text-right px-3 py-2 font-semibold">Prix unitaire</th>
                <th className="text-right px-3 py-2 font-semibold">Prix TTC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-border/10 last:border-0">
                  <td className="px-3 py-2.5 min-w-0">
                    <p className="font-semibold text-[11px] sm:text-xs leading-snug">{a.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      Qté {fmtNum(a.quantity)} {a.quantityUnit}
                      {a.brand ? ` · ${a.brand}` : ""} · Score {a.score}/100
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums align-top">
                    <span className="text-[11px] font-semibold">{fmtTnd(a.unitPrice)}</span>
                    <span className="text-[9px] text-muted-foreground"> / {a.unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums align-top">
                    <span className="text-[11px] font-bold">{fmtTnd(a.totalTTC)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/80">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Liste exacte des articles intégrés au projet (aucune estimation hors projet).
        Consultez la liste complète des {count} matériaux référencés de la catégorie dans la page Prix des matériaux.
      </p>
    </div>
  );
}