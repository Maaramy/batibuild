import { Wallet, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Roadmap } from "@/convex/roadmapEngine";

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

// Répartition du budget (Phase 05) — affichage en lecture seule.
// Les pourcentages sont calculés par l'IA selon le scénario sélectionné
// (Économique / Standard / Premium) et ne sont pas modifiables par l'utilisateur.
export default function BudgetAllocation({ roadmap }: { roadmap: Roadmap }) {
  const scenario = roadmap.budget.scenarios.find((s) => s.key === roadmap.budget.selected) ?? roadmap.budget.scenarios[1];
  // Postes réels du Quantitatif détaillé, catégorie par catégorie : ce sont les
  // mêmes lignes (désignation, quantité, unité, P.U., montant) que le
  // quantitatif du résultat — aucun prix propre à la feuille de route.
  const linesByLot = new Map(
    (roadmap.quantitatif?.scenario === roadmap.budget.selected ? roadmap.quantitatif.lots : []).map(
      (lot) => [lot.id, lot.lines] as const,
    ),
  );

  return (
    <Card className="border-border/40 bg-background/50">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="h-4 w-4 text-cyan-600" /> Répartition du budget — {scenario.label}
        </CardTitle>
        <CardDescription className="text-[10px] flex items-start gap-1">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Répartition fixe du scénario {scenario.label}, reprise à l'identique des catégories du
            Quantitatif détaillé du projet — non modifiable.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2">
        {scenario.rows.map((row) => {
          const lines = linesByLot.get(row.key) ?? [];
          return (
          <div key={row.key} className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-xs font-medium truncate">{row.label}</p>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold tabular-nums text-foreground/70 hidden sm:inline">{fmtTnd(row.amount)}</span>
                <span className="h-7 min-w-12 inline-flex items-center justify-center rounded-md border border-border/50 bg-background px-1.5 text-[11px] font-bold tabular-nums text-cyan-600">
                  {row.pct}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted/60 overflow-hidden">
                <div className="h-full rounded-full bg-cyan-500/70 transition-all" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
            {lines.length > 0 && (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-[10px] text-muted-foreground">
                  {lines.length} poste(s) du Quantitatif détaillé — quantité × prix unitaire
                </summary>
                <div className="mt-1 space-y-1">
                  {lines.map((line) => (
                    <div key={line.key} className="flex items-start justify-between gap-2 text-[10px]">
                      <span className="min-w-0 flex-1 leading-snug">{line.designation}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {line.quantity} {line.unit} × {fmtTnd(line.unitPrice)}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{fmtTnd(line.total)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
          );
        })}
        <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-xs">
          <span className="font-medium text-muted-foreground">Total {scenario.label}</span>
          <span className="font-bold tabular-nums">{fmtTnd(scenario.totalCost)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
