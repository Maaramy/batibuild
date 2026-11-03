// ============================================================================
// CATÉGORIES DU RÉSULTAT « COÛT DE CONSTRUCTION » SUIVIES — Exécution & suivi
// ----------------------------------------------------------------------------
// Une ligne par lot réellement chiffré dans le résultat : montant exact,
// part du budget, tâches de la trame qui la réalisent et avancement calculé.
// Aucune catégorie n'est inventée : la liste vient du quantitatif du projet.
// ============================================================================

import { Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EXECUTION_STATUS_CLASSES, EXECUTION_STATUS_LABELS } from "@/lib/projectGuideStatus";
import type { ExecutionCategorySummary } from "@/convex/roadmapEngine";
import { fmtTnd } from "@/lib/projectGuideFormat";

export function ProjectExecutionCategories({
  categories,
}: {
  categories: ExecutionCategorySummary[];
}) {
  if (categories.length === 0) return null;
  const total = categories.reduce((acc, c) => acc + c.amount, 0);
  const covered = categories.filter((c) => c.taskIds.length > 0).length;

  return (
    <Card className="border-border/40 bg-background/50">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600" /> Catégories du résultat suivies
        </CardTitle>
        <CardDescription className="text-[10px]">
          Montants du « Coût de construction » ({fmtTnd(total)}) rattachés aux tâches d'exécution —{" "}
          {covered} catégorie(s) couverte(s) sur {categories.length}.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-1.5">
        {categories.map((category) => (
          <div key={category.id} className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-xs font-semibold leading-tight">{category.name}</p>
              <div className="flex shrink-0 items-center gap-2">
                {category.taskIds.length > 0 && (
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold ${EXECUTION_STATUS_CLASSES[category.status]}`}
                  >
                    {EXECUTION_STATUS_LABELS[category.status]}
                  </span>
                )}
                <span className="text-[11px] font-bold tabular-nums">{fmtTnd(category.amount)}</span>
              </div>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {category.pctOfTotal}% du budget du projet ·{" "}
              {category.taskIds.length > 0
                ? `${category.taskIds.length} tâche(s) d'exécution`
                : "aucune tâche de la trame ne couvre ce lot"}
            </p>
            {category.taskIds.length > 0 && (
              <Progress value={category.progress} className="mt-2 h-1 [&>div]:bg-emerald-500" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
