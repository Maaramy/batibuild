import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, X, Trophy } from "lucide-react";
import type { GeneratedPlan } from "@/convex/planEngine";

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-12 sm:w-16 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] sm:text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function PlanCompareModal({
  plans,
  open,
  onClose,
  onSelect,
}: {
  plans: GeneratedPlan[];
  open: boolean;
  onClose: () => void;
  onSelect?: (plan: GeneratedPlan) => void;
}) {
  const [sortBy, setSortBy] = useState<"global" | "optimisation" | "confort">("global");
  const sorted = [...plans].sort((a, b) => b.scores[sortBy] - a.scores[sortBy]);
  const bestGlobal = Math.max(...plans.map((p) => p.scores.global));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trophy className="h-4.5 w-4.5 text-amber-500" />
            Comparer les 10 propositions
          </DialogTitle>
          <DialogDescription className="text-xs">
            Score global sur 100 — le meilleur plan est mis en avant.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Trier par :</span>
          <div className="flex gap-1">
            {([
              ["global", "Score global"],
              ["optimisation", "Optimisation"],
              ["confort", "Confort"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-2 min-h-10 rounded-md text-[10px] sm:text-xs font-medium transition-colors active:scale-[0.97] ${sortBy === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto flex-1 rounded-lg border border-border/40">
          <table className="w-full text-left text-[10px] sm:text-xs min-w-[640px]">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr className="text-muted-foreground">
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Global</th>
                <th className="px-3 py-2 font-medium hidden sm:table-cell">Optimisation</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Fonctionnalité</th>
                <th className="px-3 py-2 font-medium hidden sm:table-cell">Confort</th>
                <th className="px-3 py-2 font-medium hidden lg:table-cell">Architecture</th>
                <th className="px-3 py-2 font-medium">Surface utile</th>
                <th className="px-3 py-2 font-medium">Pièces</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Taux util.</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const isBest = p.scores.global === bestGlobal;
                return (
                  <tr key={p.index} className={`border-t border-border/30 ${isBest ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">P{String(p.index).padStart(2, "0")}</span>
                        <span className="text-muted-foreground truncate max-w-[140px] hidden sm:inline">{p.name}</span>
                        {isBest && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <ScoreBar value={p.scores.global} color="bg-primary" />
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <ScoreBar value={p.scores.optimisation} color="bg-emerald-500" />
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <ScoreBar value={p.scores.fonctionnalite} color="bg-sky-500" />
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <ScoreBar value={p.scores.confort} color="bg-violet-500" />
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <ScoreBar value={p.scores.architectural} color="bg-rose-500" />
                    </td>
                    <td className="px-3 py-2 font-semibold tabular-nums">{p.stats.utile.toFixed(0)} m²</td>
                    <td className="px-3 py-2 tabular-nums">{p.stats.nbPieces}</td>
                    <td className="px-3 py-2 hidden md:table-cell tabular-nums">{p.stats.tauxUtilisation}%</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant={isBest ? "default" : "outline"} className="h-9 sm:h-8 text-[10px]" onClick={() => onSelect?.(p)}>
                        Voir
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-3">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onClose}>
            <X className="h-3.5 w-3.5" /> Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
