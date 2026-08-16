import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Minus, Plus, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Roadmap } from "@/convex/roadmapEngine";
import type { Id } from "@/convex/_generated/dataModel";

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

// Répartition du budget (Phase 05) — modifiable en temps réel.
// Quand un poste change, les autres sont renormalisés pour conserver 100 %.
export default function BudgetAllocation({ roadmap, roadmapId }: { roadmap: Roadmap; roadmapId: Id<"projectRoadmaps"> | null }) {
  const updateAllocation = useMutation(api.roadmap.updateBudgetAllocation);
  const scenario = roadmap.budget.scenarios.find((s) => s.key === roadmap.budget.selected) ?? roadmap.budget.scenarios[1];
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const currentPct = (rowKey: string) => scenario.rows.find((r) => r.key === rowKey)?.pct ?? -1;

  const commit = (rowKey: string, pct: number) => {
    setEditing(null);
    if (!roadmapId) return;
    if (!Number.isFinite(pct)) return;
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (clamped === currentPct(rowKey)) return;
    updateAllocation({ roadmapId, rowKey, pct: clamped }).catch((err: any) => toast.error(err.message || "Erreur"));
  };

  return (
    <Card className="border-border/40 bg-background/50">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="h-4 w-4 text-cyan-600" /> Répartition du budget — {scenario.label}
        </CardTitle>
        <CardDescription className="text-[10px]">
          Ajustez chaque poste en temps réel : les autres sont renormalisés pour conserver 100 %. Cliquez sur un pourcentage pour le saisir.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2">
        {scenario.rows.map((row) => (
          <div key={row.key} className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-xs font-medium truncate">{row.label}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold tabular-nums text-foreground/70 hidden sm:inline">{fmtTnd(row.amount)}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-md text-muted-foreground"
                  disabled={!roadmapId || row.pct <= 0}
                  onClick={() => commit(row.key, row.pct - 1)}
                  title="Réduire de 1 %"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                {editing === row.key ? (
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    max={100}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commit(row.key, Number(draft))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commit(row.key, Number(draft));
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="h-7 w-14 rounded-md border border-border/50 bg-background px-1.5 text-center text-[11px] font-bold tabular-nums outline-none focus:border-cyan-500"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditing(row.key);
                      setDraft(String(row.pct));
                    }}
                    className="h-7 min-w-12 rounded-md border border-border/50 bg-background px-1.5 text-[11px] font-bold tabular-nums text-cyan-600 hover:border-cyan-500/60 transition-colors cursor-pointer"
                    title="Cliquer pour modifier le pourcentage"
                  >
                    {row.pct}%
                  </button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-md text-muted-foreground"
                  disabled={!roadmapId || row.pct >= 100}
                  onClick={() => commit(row.key, row.pct + 1)}
                  title="Augmenter de 1 %"
                >
                  <Plus className="h-3 w-3" />
                </Button>
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
