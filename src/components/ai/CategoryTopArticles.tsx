import { ListOrdered, Info, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TopArticle } from "@/convex/aiMaterialsEngine";

// ── Helpers (affichage uniquement — aucun calcul métier ici) ────────────────
const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-TN", { maximumFractionDigits: digits }).format(n);

const RANK_STYLES = [
  "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30",
  "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
  "bg-muted text-muted-foreground border-border",
  "bg-muted text-muted-foreground border-border",
];

function rankStyle(rank: number) {
  return RANK_STYLES[rank - 1] ?? RANK_STYLES[4];
}

function sourceTooltip(a: TopArticle) {
  return `Source : ${a.priceSource} · Confiance ${a.confidence}% · Quantité sélectionnée : ${fmtNum(a.quantity)} ${a.quantityUnit}`;
}

/**
 * Top 5 des articles recommandés pour une catégorie — données produites par le
 * moteur déterministe (aiMaterialsEngine.buildTopArticles). Le composant
 * n'applique AUCUNE logique de calcul : il affiche les valeurs renvoyées par
 * le backend, et signale l'absence de données au lieu de les inventer.
 */
export function CategoryTopArticles({ articles }: { articles: TopArticle[] }) {
  if (!Array.isArray(articles) || articles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-3 flex items-center gap-2.5">
        <PackageOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Aucun article éligible dans cette catégorie pour ce projet (données de prix insuffisantes, quantité non applicable, ou analyse générée avant l'activation du Top 5 — relancez une analyse).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      {/* En-tête */}
      <div className="px-3 py-2 bg-muted/40 border-b border-border/30 flex items-center gap-1.5">
        <ListOrdered className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Top 5 articles recommandés
        </span>
        <span
          className="ml-auto text-muted-foreground cursor-help"
          title="Prix unitaire : donnée la plus fiable disponible (offres fournisseurs ou catalogue 2026). Prix TTC = prix unitaire × quantité sélectionnée × (1 + TVA 19%)."
        >
          <Info className="h-3 w-3" />
        </span>
      </div>

      {/* Tableau desktop / tablette */}
      <table className="hidden md:table w-full text-[11px]">
        <thead>
          <tr className="bg-background border-b border-border/30 text-muted-foreground">
            <th className="text-left py-2 pl-3 pr-2 font-medium w-10">#</th>
            <th className="text-left py-2 px-2 font-medium">Article</th>
            <th className="text-right py-2 px-2 font-medium w-28">Prix unitaire</th>
            <th className="text-right py-2 pl-2 pr-3 font-medium w-32">Prix TTC</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
              <td className="py-2 pl-3 pr-2">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold ${rankStyle(a.rank)}`}>
                  {a.rank}
                </span>
              </td>
              <td className="py-2 px-2">
                <p className="font-medium leading-tight">{a.name}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {a.priceSource} · confiance {a.confidence}%{a.brand ? ` · ${a.brand}` : ""} · Qté {fmtNum(a.quantity)} {a.quantityUnit}
                </p>
              </td>
              <td className="py-2 px-2 text-right tabular-nums font-semibold whitespace-nowrap" title={sourceTooltip(a)}>
                {fmtTnd(a.unitPrice)}
                <span className="text-[9px] text-muted-foreground font-normal"> /{a.unit}</span>
              </td>
              <td className="py-2 pl-2 pr-3 text-right tabular-nums font-bold text-primary whitespace-nowrap">
                {fmtTnd(a.totalTTC)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cartes mobiles */}
      <ul className="md:hidden divide-y divide-border/20">
        {articles.map((a) => (
          <li key={a.id} className="px-3 py-2.5">
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${rankStyle(a.rank)}`}>
                {a.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug">{a.name}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {a.priceSource} · confiance {a.confidence}% · Qté {fmtNum(a.quantity)} {a.quantityUnit}
                </p>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[11px] tabular-nums" title={sourceTooltip(a)}>
                    {fmtTnd(a.unitPrice)}<span className="text-[9px] text-muted-foreground"> /{a.unit}</span>
                  </span>
                  <Badge className="text-[10px] tabular-nums bg-primary/10 text-primary border border-primary/20" variant="secondary">
                    TTC {fmtTnd(a.totalTTC)}
                  </Badge>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
