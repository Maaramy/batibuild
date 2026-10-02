import { ListOrdered, Info, PackageOpen, Percent, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TopArticle } from "@/convex/aiMaterialsEngine";

// ── Helpers (affichage uniquement — aucun calcul métier ici) ────────────────
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fmtTnd = (n: number, digits = 3) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-TN", { maximumFractionDigits: digits }).format(n);

const RANK_STYLES = [
  "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  "border-border bg-muted text-muted-foreground",
  "border-border bg-muted text-muted-foreground",
];

function rankStyle(rank: number) {
  return RANK_STYLES[rank - 1] ?? RANK_STYLES[4];
}

/** Fiabilité de la source de prix : vert ≥ 80 %, bleu ≥ 60 %, ambre ≥ 40 %, rouge sinon. */
function confidenceTone(confidence: number) {
  if (confidence >= 80) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (confidence >= 60) return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400";
  if (confidence >= 40) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
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
      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-3">
        <PackageOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          Aucun article éligible dans cette catégorie pour ce projet (données de prix insuffisantes,
          quantité non applicable, ou analyse générée avant l'activation du Top 5 — relancez une
          analyse).
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40">
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/30 bg-muted/40 px-3 py-2.5">
        <ListOrdered className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Top {articles.length} articles recommandés
        </span>
        <Badge variant="outline" className="ml-auto gap-1 text-[9px]">
          <Ruler className="h-2.5 w-2.5" /> Prix unitaire + TTC
        </Badge>
        <span
          className="cursor-help text-muted-foreground"
          title="Prix unitaire : donnée la plus fiable disponible (offres fournisseurs ou catalogue 2026). Prix TTC = prix unitaire × quantité sélectionnée × (1 + TVA 19%)."
        >
          <Info className="h-3 w-3" />
        </span>
      </div>

      {/* Tableau desktop / tablette */}
      <table className="hidden w-full text-[11px] md:table">
        <thead>
          <tr className="border-b border-border/30 bg-background text-muted-foreground">
            <th className="w-10 py-2 pl-3 pr-2 text-left font-medium">#</th>
            <th className="px-2 py-2 text-left font-medium">Article</th>
            <th className="w-28 px-2 py-2 text-left font-medium">Confiance</th>
            <th className="w-32 px-2 py-2 text-right font-medium">Prix unitaire</th>
            <th className="w-32 py-2 pl-2 pr-3 text-right font-medium">Prix TTC</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr
              key={a.id}
              className="border-b border-border/20 transition-colors last:border-0 hover:bg-muted/20"
            >
              <td className="py-2.5 pl-3 pr-2">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold",
                    rankStyle(a.rank),
                  )}
                >
                  {a.rank}
                </span>
              </td>
              <td className="px-2 py-2.5">
                <p className="font-medium leading-tight">{a.name}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  {a.priceSource}
                  {a.brand ? ` · ${a.brand}` : ""} · Qté {fmtNum(a.quantity)} {a.quantityUnit}
                </p>
              </td>
              <td className="px-2 py-2.5">
                <Badge variant="outline" className={cn("gap-1 text-[9px] tabular-nums", confidenceTone(a.confidence))}>
                  <Percent className="h-2.5 w-2.5" /> {a.confidence}
                </Badge>
              </td>
              <td
                className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums"
                title={sourceTooltip(a)}
              >
                {fmtTnd(a.unitPrice)}
                <span className="text-[9px] font-normal text-muted-foreground"> /{a.unit}</span>
              </td>
              <td className="whitespace-nowrap py-2.5 pl-2 pr-3 text-right font-bold tabular-nums text-primary">
                {fmtTnd(a.totalTTC, 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cartes mobiles (WebView) */}
      <ul className="divide-y divide-border/20 md:hidden">
        {articles.map((a) => (
          <li key={a.id} className="px-3 py-3">
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                  rankStyle(a.rank),
                )}
              >
                {a.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-snug">{a.name}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  {a.priceSource}
                  {a.brand ? ` · ${a.brand}` : ""}
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/35 bg-muted/10 px-2.5 py-1.5">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      Prix unitaire
                    </p>
                    <p className="text-[11px] font-bold tabular-nums">
                      {fmtTnd(a.unitPrice)}
                      <span className="text-[9px] font-normal text-muted-foreground"> /{a.unit}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/35 bg-muted/10 px-2.5 py-1.5">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      Quantité
                    </p>
                    <p className="text-[11px] font-bold tabular-nums">
                      {fmtNum(a.quantity)}
                      <span className="text-[9px] font-normal text-muted-foreground">
                        {" "}
                        {a.quantityUnit}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn("gap-1 text-[9px] tabular-nums", confidenceTone(a.confidence))}
                    title={sourceTooltip(a)}
                  >
                    <Percent className="h-2.5 w-2.5" /> Confiance {a.confidence} %
                  </Badge>
                  <Badge
                    className="ml-auto gap-1 border border-primary/20 bg-primary/10 text-[10px] tabular-nums text-primary"
                    variant="secondary"
                  >
                    TTC {fmtTnd(a.totalTTC, 0)}
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
