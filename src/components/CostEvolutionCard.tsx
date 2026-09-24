import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtTnd } from "@/lib/projectGuideFormat";
import {
  compactCostEvolutionLabel,
  compactCostValue,
  costEvolutionDeltaPct,
  sampleCostEvolutionPoints,
  type CostEvolutionPoint,
} from "@/lib/costEvolution";

/**
 * Carte « Évolution probable des coûts (24 mois) ».
 *
 * Responsive : la série (aujourd'hui + 24 mois) est échantillonnée en 13 colonnes
 * maximum, et sur mobile une colonne sur deux est masquée en CSS — 7 barres et
 * des libellés lisibles sur les écrans étroits, sans perdre de mois. Le survol
 * n'existant pas au tactile, le détail du mois est affiché en permanence au-dessus
 * du graphique et une barre est sélectionnable au doigt (ou au clavier).
 */
export function CostEvolutionCard({ points }: { points: CostEvolutionPoint[] }) {
  const shown = useMemo(() => sampleCostEvolutionPoints(points), [points]);
  const [selected, setSelected] = useState(() => Math.max(0, shown.length - 1));
  const lastIndex = Math.max(0, shown.length - 1);
  const activeIndex = Math.min(Math.max(selected, 0), lastIndex);
  const active = shown[activeIndex];

  const costs = useMemo(() => shown.map((p) => p.cost), [shown]);
  const min = costs.length > 0 ? Math.min(...costs) : 0;
  const max = costs.length > 0 ? Math.max(...costs) : 0;
  const range = Math.max(1, max - min);
  const delta = costEvolutionDeltaPct(shown, activeIndex);

  return (
    <Card className="border-border/40 bg-background/50">
      <CardHeader className="p-3 pb-2 sm:p-4">
        <CardTitle className="flex items-start gap-2 text-xs leading-snug sm:text-sm">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
          <span className="min-w-0">Évolution probable des coûts (24 mois)</span>
        </CardTitle>
        <CardDescription className="text-[10px] leading-snug">
          Base : scénario standard · inflation ≈ 6 %/an · saisonnalité du marché tunisien.
        </CardDescription>
      </CardHeader>

      {!active ? (
        <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground/70 sm:p-4 sm:pt-0">
          Aucune projection de coûts disponible pour l'instant.
        </CardContent>
      ) : (
        <CardContent className="space-y-2 p-3 pt-0 sm:p-4 sm:pt-0">
          {/* Lecture du mois sélectionné : toujours visible, pas de survol sur mobile. */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="flex min-w-0 items-baseline gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{active.label}</span>
              <span className="truncate text-sm font-bold tabular-nums text-cyan-600 dark:text-cyan-400 sm:text-base">{fmtTnd(active.cost)}</span>
            </p>
            {delta !== null && (
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] tabular-nums ${
                  delta > 0
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % vs aujourd'hui
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            {/* Axe des coûts : masqué sur mobile, l'espace est laissé aux barres. */}
            <div className="hidden h-32 shrink-0 flex-col justify-between pb-4 text-right text-[9px] tabular-nums text-muted-foreground/70 sm:flex sm:h-36">
              <span>{compactCostValue(max)}</span>
              <span>{compactCostValue(min)}</span>
            </div>

            <div className="relative min-w-0 flex-1">
              {/* Repères de lecture */}
              <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border/40" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/25" />
              <div className="pointer-events-none absolute inset-x-0 bottom-4 border-t border-border/50" />

              <div className="flex h-32 items-stretch gap-1 sm:h-36 sm:gap-1.5">
                {shown.map((p, i) => {
                  const isActive = i === activeIndex;
                  const height = Math.max(6, ((p.cost - min) / range) * 100);
                  return (
                    <button
                      key={`${p.label}-${i}`}
                      type="button"
                      onClick={() => setSelected(i)}
                      onMouseEnter={() => setSelected(i)}
                      onFocus={() => setSelected(i)}
                      title={`${p.label} : ${fmtTnd(p.cost)}`}
                      aria-label={`${p.label} : ${fmtTnd(p.cost)}`}
                      aria-pressed={isActive}
                      className={`h-full min-w-5 flex-1 cursor-pointer grid-rows-[1fr_auto] items-end gap-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/60 ${
                        i % 2 === 1 ? "hidden sm:grid" : "grid"
                      } ${isActive ? "bg-cyan-500/[0.07]" : "hover:bg-cyan-500/[0.05]"}`}
                    >
                      <div
                        className={`w-full max-w-7 justify-self-center self-end rounded-t transition-all duration-200 ${
                          isActive ? "bg-gradient-to-t from-cyan-600 to-blue-500" : "bg-gradient-to-t from-cyan-500/60 to-blue-500/60"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <span
                        className={`h-3 w-full overflow-hidden text-center text-[8px] leading-none whitespace-nowrap sm:text-[9px] ${
                          isActive ? "font-semibold text-cyan-600 dark:text-cyan-400" : "text-muted-foreground/60"
                        }`}
                      >
                        {/* Libellé complet seulement à partir de md : « Aujourd'hui »
                            ne tient pas dans une colonne de ~50 px. */}
                        <span className="md:hidden">{compactCostEvolutionLabel(p.label)}</span>
                        <span className="hidden md:inline">{p.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground/60 sm:hidden">
            Touchez une barre pour lire le coût du mois correspondant.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
