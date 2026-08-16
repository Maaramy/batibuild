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

  return (
    <Card className="border-border/40 bg-background/50">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="h-4 w-4 text-cyan-600" /> Répartition du budget — {scenario.label}
        </CardTitle>
        <CardDescription className="text-[10px] flex items-center gap-1">
          <Lock className="h-3 w-3 shrink-0" />
          Répartition fixe calculée par l'IA pour le scénario {scenario.label} — non modifiable.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2">
        {scenario.rows.map((row) => (
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
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-xs">
          <span className="font-medium text-muted-foreground">Total {scenario.label}</span>
          <span className="font-bold tabular-nums">{fmtTnd(scenario.totalCost)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
