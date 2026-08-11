P = "/home/daytona/codebase/src/pages/PlanGenerator.tsx"
src = open(P, encoding="utf-8").read()

def rep(old, new, count=1):
    global src
    n = src.count(old)
    if n < count:
        raise SystemExit(f"NOT FOUND ({n}): {old[:100]!r}")
    src = src.replace(old, new, count)

# 1. Grille 4 boutons
rep(
"""      <CardContent className="p-3 mt-auto">
        <div className="grid grid-cols-3 gap-1.5">""",
"""      <CardContent className="p-3 mt-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">""")

# 2. Bouton Optimiser IA après « Modifier »
rep(
"""            <PenLine className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Modifier</span>
          </Button>
          <Button size="sm" className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1" onClick={onFiche} title="Fiche technique" aria-label={`Fiche technique du plan ${plan.index}`}>""",
"""            <PenLine className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Modifier</span>
          </Button>
          <Button
            size="sm"
            className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1 bg-violet-600 hover:bg-violet-500 text-white"
            onClick={onOptimize}
            title="Optimiser automatiquement le plan avec l'IA"
            aria-label={`Optimiser le plan ${plan.index} avec l'IA`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Optimiser IA</span>
          </Button>
          <Button size="sm" variant="outline" className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1" onClick={onFiche} title="Fiche technique" aria-label={`Fiche technique du plan ${plan.index}`}>""")

open(P, "w", encoding="utf-8").write(src)
print("OK")
